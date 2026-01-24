import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  ServiceResponse,
  ValidationResult,
  ErrorCodes,
  success,
  failure,
  zodToValidationResult,
  uuidSchema,
  dateSchema,
  timeSchema,
} from './types';
import { createLogger } from './logger';
import { rateLimiterService } from './rate-limiter.service';
import { isRateLimitError } from '@/lib/errors';
import { sanitizeFormData, sanitizeString } from '@/lib/sanitizer';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBookingDTO {
  barbershopId: string;
  serviceId: string;
  barberId?: string;
  clientId?: string;
  clientName?: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  totalPrice: number;
  isExternalBooking?: boolean;
  productIds?: Array<{ id: string; quantity: number; price: number }>;
}

export interface CancelBookingDTO {
  bookingId: string;
  reason?: string;
}

export interface Booking {
  id: string;
  barbershopId: string;
  serviceId: string;
  barberId?: string;
  clientId?: string;
  clientName?: string;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime?: string;
  status: string;
  totalPrice: number;
  notes?: string;
  isExternalBooking: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface AvailableSlotsDTO {
  barbershopId: string;
  barberId?: string;
  date: string;
  serviceDuration: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBookingSchema = z.object({
  barbershopId: uuidSchema,
  serviceId: uuidSchema,
  barberId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  clientName: z.string().optional(),
  bookingDate: dateSchema,
  bookingTime: timeSchema,
  notes: z.string().max(500).optional(),
  totalPrice: z.number().min(0),
  isExternalBooking: z.boolean().optional(),
  productIds: z.array(z.object({
    id: uuidSchema,
    quantity: z.number().min(1),
    price: z.number().min(0),
  })).optional(),
});

const cancelBookingSchema = z.object({
  bookingId: uuidSchema,
  reason: z.string().max(500).optional(),
});

const availableSlotsSchema = z.object({
  barbershopId: uuidSchema,
  barberId: uuidSchema.optional(),
  date: dateSchema,
  serviceDuration: z.number().min(15).max(480),
});

// ============================================================================
// BOOKING SERVICE
// ============================================================================

const logger = createLogger('BookingService');

export class BookingService {
  /**
   * Validates booking creation data
   */
  validateCreate(data: CreateBookingDTO): ValidationResult {
    const result = createBookingSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Validates booking cancellation data
   */
  validateCancel(data: CancelBookingDTO): ValidationResult {
    const result = cancelBookingSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Create a new booking
   */
  async create(data: CreateBookingDTO): Promise<ServiceResponse<Booking>> {
    // Sanitizar dados de entrada - criar cópia sanitizada
    const sanitizedData: CreateBookingDTO = {
      ...data,
      notes: data.notes ? sanitizeString(data.notes, { maxLength: 500 }) : undefined,
      clientName: data.clientName ? sanitizeString(data.clientName, { maxLength: 100 }) : undefined,
    };

    const timer = logger.startTimer();
    logger.info('create', 'Creating booking', {
      barbershopId: sanitizedData.barbershopId,
      date: sanitizedData.bookingDate,
      time: sanitizedData.bookingTime,
    });

    // Rate limit check
    try {
      await rateLimiterService.checkRateLimit('booking_create', sanitizedData.clientId);
    } catch (error) {
      if (isRateLimitError(error)) {
        return failure(
          'RATE_LIMIT_BOOKING',
          'Limite de agendamentos atingido. Aguarde 1 hora para tentar novamente.'
        );
      }
    }

    // Validate input
    const validation = this.validateCreate(sanitizedData);
    if (!validation.valid) {
      logger.warn('create', 'Validation failed', { errors: validation.errors });
      return failure(
        ErrorCodes.VALIDATION_ERROR,
        'Dados inválidos',
        { errors: validation.errors }
      );
    }

    try {
      // Check for date in the past
      const bookingDateTime = new Date(`${sanitizedData.bookingDate}T${sanitizedData.bookingTime}`);
      if (bookingDateTime < new Date()) {
        return failure(ErrorCodes.BOOKING_PAST_DATE, 'Não é possível agendar para uma data passada');
      }

      // Check for conflicts if barber is specified
      if (sanitizedData.barberId) {
        const conflictCheck = await this.checkConflicts(
          sanitizedData.barberId,
          sanitizedData.bookingDate,
          sanitizedData.bookingTime
        );
        if (!conflictCheck.success && conflictCheck.error) {
          return failure(conflictCheck.error.code, conflictCheck.error.message, conflictCheck.error.details);
        }

        // Check for barber blocks
        const blockCheck = await this.checkBarberBlocks(
          sanitizedData.barberId,
          sanitizedData.bookingDate,
          sanitizedData.bookingTime
        );
        if (!blockCheck.success && blockCheck.error) {
          return failure(blockCheck.error.code, blockCheck.error.message, blockCheck.error.details);
        }
      }

      // Get service duration for end time calculation
      const { data: serviceData } = await supabase
        .from('services')
        .select('duration')
        .eq('id', sanitizedData.serviceId)
        .single();

      // Calculate end time
      let bookingEndTime: string | undefined;
      if (serviceData?.duration) {
        const { data: endTimeData } = await supabase.rpc('calculate_booking_end_time', {
          p_duration_minutes: serviceData.duration,
          p_start_time: data.bookingTime,
        });
        bookingEndTime = endTimeData;
      }

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          barbershop_id: data.barbershopId,
          service_id: data.serviceId,
          barber_id: data.barberId,
          client_id: data.clientId,
          client_name: data.clientName,
          booking_date: data.bookingDate,
          booking_time: data.bookingTime,
          booking_end_time: bookingEndTime,
          total_price: data.totalPrice,
          notes: data.notes,
          is_external_booking: data.isExternalBooking || false,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('create', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao criar agendamento');
      }

      // Add products if any
      if (data.productIds && data.productIds.length > 0) {
        const productInserts = data.productIds.map((p) => ({
          booking_id: booking.id,
          product_id: p.id,
          quantity: p.quantity,
          unit_price: p.price,
        }));

        const { error: productError } = await supabase
          .from('booking_products')
          .insert(productInserts);

        if (productError) {
          logger.warn('create', 'Error adding products', { error: productError });
        }
      }

      const result: Booking = this.mapBookingFromDb(booking);

      const duration = timer();
      logger.logWithDuration('info', 'create', 'Booking created successfully', duration, {
        bookingId: result.id,
      });

      return success(result);
    } catch (err) {
      logger.error('create', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar agendamento');
    }
  }

  /**
   * Cancel a booking
   */
  async cancel(data: CancelBookingDTO): Promise<ServiceResponse<void>> {
    const timer = logger.startTimer();
    logger.info('cancel', 'Cancelling booking', { bookingId: data.bookingId });

    const validation = this.validateCancel(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      // Get booking
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', data.bookingId)
        .single();

      if (fetchError || !booking) {
        return failure(ErrorCodes.BOOKING_NOT_FOUND, 'Agendamento não encontrado');
      }

      // Check if can cancel
      if (booking.status === 'cancelled') {
        return failure(ErrorCodes.BOOKING_CANNOT_CANCEL, 'Agendamento já está cancelado');
      }

      if (booking.status === 'completed') {
        return failure(ErrorCodes.BOOKING_CANNOT_CANCEL, 'Não é possível cancelar agendamento concluído');
      }

      // Update status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          notes: data.reason ? `${booking.notes || ''}\n[Cancelado: ${data.reason}]` : booking.notes,
        })
        .eq('id', data.bookingId);

      if (updateError) {
        logger.error('cancel', 'Database error', updateError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao cancelar agendamento');
      }

      const duration = timer();
      logger.logWithDuration('info', 'cancel', 'Booking cancelled successfully', duration, {
        bookingId: data.bookingId,
      });

      return success(undefined);
    } catch (err) {
      logger.error('cancel', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao cancelar agendamento');
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS FOR TIME CALCULATIONS
  // ============================================================================

  /**
   * Normaliza tempo de HH:MM:SS para HH:MM
   */
  private normalizeTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5); // "09:00:00" → "09:00"
  }

  /**
   * Converte HH:MM para minutos desde meia-noite
   * Exemplo: "09:30" → 570
   */
  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const normalized = this.normalizeTime(time);
    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Verifica se dois intervalos de tempo se sobrepõem
   */
  private hasTimeOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    // Casos de sobreposição:
    // 1. start1 está dentro do intervalo 2
    // 2. end1 está dentro do intervalo 2  
    // 3. intervalo 1 engloba completamente intervalo 2
    return (
      (start1 >= start2 && start1 < end2) ||  // início de 1 dentro de 2
      (end1 > start2 && end1 <= end2) ||      // fim de 1 dentro de 2
      (start1 <= start2 && end1 >= end2)      // 1 engloba 2 completamente
    );
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(data: AvailableSlotsDTO): Promise<ServiceResponse<TimeSlot[]>> {
    const timer = logger.startTimer();
    
    const validation = availableSlotsSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      const { barberId, barbershopId, date, serviceDuration = 30 } = data;

      // Não permitir agendamento em datas passadas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date + 'T12:00:00'); // Use noon to avoid timezone issues
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        logger.debug('getAvailableSlots', 'Date in the past', { date });
        return success([]);
      }

      // Verificar se é hoje para filtrar horários passados
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const isToday = selectedDate.getTime() === today.getTime();

      // Determinar dia da semana (0=Domingo, 6=Sábado)
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();

      logger.debug('getAvailableSlots', 'Processing request', { 
        barberId, 
        date, 
        dayOfWeek, 
        serviceDuration,
        isToday 
      });

      // ========== PASSO 1: VERIFICAR BLOQUEIOS DO DIA ==========
      
      let dayBlocks: Array<{ start_time: string; end_time: string; reason: string | null }> = [];
      
      if (barberId) {
        const { data: barberBlocks, error: blocksError } = await supabase
          .from('barber_blocks')
          .select('start_time, end_time, reason')
          .eq('barber_id', barberId)
          .eq('block_date', date);

        if (blocksError) {
          logger.error('getAvailableSlots', 'Error fetching blocks', blocksError);
          return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar disponibilidade');
        }

        dayBlocks = barberBlocks || [];

        // Verificar se existe bloqueio que cobre período de trabalho inteiro
        // (ex: 08:00-20:00 que cobre o dia inteiro)
        const hasDayBlocker = dayBlocks.some(block => {
          const blockStart = this.timeToMinutes(block.start_time);
          const blockEnd = this.timeToMinutes(block.end_time);
          // Se bloqueio dura mais de 10 horas, considera dia bloqueado
          return (blockEnd - blockStart) >= 600; // 10 horas = 600 minutos
        });

        if (hasDayBlocker) {
          logger.debug('getAvailableSlots', 'Day completely blocked', { date });
          return success([]);
        }
      }

      // ========== PASSO 2: OBTER HORÁRIOS DE TRABALHO ==========
      
      if (!barberId) {
        logger.debug('getAvailableSlots', 'No barber specified');
        return success([]);
      }

      // 2.1 Verificar se há override (exceção temporária) para esta data
      const { data: overrides, error: overrideError } = await supabase
        .from('barber_schedule_overrides')
        .select('*')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .lte('start_date', date)
        .gte('end_date', date);

      if (overrideError) {
        logger.warn('getAvailableSlots', 'Error fetching overrides', { message: overrideError.message });
      }

      let workingHoursData: {
        is_day_off: boolean;
        period1_start: string | null;
        period1_end: string | null;
        period2_start: string | null;
        period2_end: string | null;
      } | null = null;
      let isDayOff = false;

      // Se tem override válido, usa ele
      if (overrides && overrides.length > 0) {
        workingHoursData = overrides[0];
        isDayOff = workingHoursData.is_day_off;
        logger.debug('getAvailableSlots', 'Using schedule override');
      } else {
        // Senão, busca horário regular
        const { data: regularHours, error: hoursError } = await supabase
          .from('barber_working_hours')
          .select('*')
          .eq('barber_id', barberId)
          .eq('day_of_week', dayOfWeek)
          .single();

        if (hoursError || !regularHours) {
          logger.debug('getAvailableSlots', 'No working hours configured');
          return success([]);
        }

        workingHoursData = regularHours;
        isDayOff = regularHours.is_day_off;
        logger.debug('getAvailableSlots', 'Using regular working hours');
      }

      // Se é dia de folga, retorna vazio
      if (isDayOff) {
        logger.debug('getAvailableSlots', 'Day off (is_day_off=true)');
        return success([]);
      }

      // Extrair períodos de trabalho
      const workingPeriods: Array<{ start: string; end: string }> = [];

      if (workingHoursData?.period1_start && workingHoursData?.period1_end) {
        workingPeriods.push({
          start: this.normalizeTime(workingHoursData.period1_start),
          end: this.normalizeTime(workingHoursData.period1_end),
        });
      }

      if (workingHoursData?.period2_start && workingHoursData?.period2_end) {
        workingPeriods.push({
          start: this.normalizeTime(workingHoursData.period2_start),
          end: this.normalizeTime(workingHoursData.period2_end),
        });
      }

      if (workingPeriods.length === 0) {
        logger.debug('getAvailableSlots', 'No working periods defined');
        return success([]);
      }

      logger.debug('getAvailableSlots', 'Working periods', { workingPeriods });

      // ========== PASSO 3: GERAR TODOS OS SLOTS POSSÍVEIS (15 MIN) ==========
      
      const allSlots: TimeSlot[] = [];
      const slotInterval = 15; // minutos

      for (const period of workingPeriods) {
        const periodStart = this.timeToMinutes(period.start);
        const periodEnd = this.timeToMinutes(period.end);

        // Gerar slots de 15 em 15 minutos
        for (let minutes = periodStart; minutes < periodEnd; minutes += slotInterval) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

          // IMPORTANTE: Só adiciona slot se o SERVIÇO INTEIRO couber no período
          const serviceEnd = minutes + serviceDuration;
          if (serviceEnd <= periodEnd) {
            allSlots.push({
              time: timeString,
              available: true,
            });
          }
        }
      }

      logger.debug('getAvailableSlots', 'Slots generated', { count: allSlots.length });

      // ========== PASSO 4: BUSCAR AGENDAMENTOS EXISTENTES ==========
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_time, booking_end_time, status')
        .eq('barbershop_id', barbershopId)
        .eq('barber_id', barberId)
        .eq('booking_date', date)
        .neq('status', 'cancelled');

      if (bookingsError) {
        logger.error('getAvailableSlots', 'Error fetching bookings', bookingsError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar agendamentos');
      }

      logger.debug('getAvailableSlots', 'Bookings found', { count: bookings?.length || 0 });
      logger.debug('getAvailableSlots', 'Blocks found', { count: dayBlocks.length });

      // ========== PASSO 5: FILTRAR SLOTS DISPONÍVEIS ==========
      
      const availableSlots = allSlots.filter(slot => {
        const slotStart = this.timeToMinutes(slot.time);
        const slotEnd = slotStart + serviceDuration;

        // 5.0 Se for hoje, não mostrar horários que já passaram
        if (isToday && slotStart <= currentMinutes) {
          return false;
        }

        // 5.1 Verificar conflito com bookings
        const hasBookingConflict = bookings?.some(booking => {
          const bookingStart = this.timeToMinutes(booking.booking_time);
          const bookingEnd = booking.booking_end_time 
            ? this.timeToMinutes(booking.booking_end_time)
            : bookingStart + 30; // Default 30 min if no end time
          
          return this.hasTimeOverlap(slotStart, slotEnd, bookingStart, bookingEnd);
        }) || false;

        if (hasBookingConflict) {
          return false;
        }

        // 5.2 Verificar conflito com bloqueios
        const hasBlockConflict = dayBlocks.some(block => {
          const blockStart = this.timeToMinutes(block.start_time);
          const blockEnd = this.timeToMinutes(block.end_time);
          
          return this.hasTimeOverlap(slotStart, slotEnd, blockStart, blockEnd);
        });

        if (hasBlockConflict) {
          return false;
        }

        // 5.3 Verificar se slot está dentro de algum período de trabalho
        const isInWorkingPeriod = workingPeriods.some(period => {
          const periodStart = this.timeToMinutes(period.start);
          const periodEnd = this.timeToMinutes(period.end);
          
          // Slot E serviço completo devem caber no período
          return slotStart >= periodStart && slotEnd <= periodEnd;
        });

        if (!isInWorkingPeriod) {
          return false;
        }

        // ✅ Slot disponível!
        return true;
      });

      const duration = timer();
      logger.logWithDuration('debug', 'getAvailableSlots', 'Slots fetched', duration, {
        totalSlots: allSlots.length,
        availableSlots: availableSlots.length,
      });

      return success(availableSlots);
    } catch (err) {
      logger.error('getAvailableSlots', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar horários disponíveis');
    }
  }

  /**
   * Get booking by ID
   */
  async getById(bookingId: string): Promise<ServiceResponse<Booking>> {
    logger.debug('getById', 'Fetching booking', { bookingId });

    if (!uuidSchema.safeParse(bookingId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        return failure(ErrorCodes.BOOKING_NOT_FOUND, 'Agendamento não encontrado');
      }

      return success(this.mapBookingFromDb(booking));
    } catch (err) {
      logger.error('getById', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar agendamento');
    }
  }

  /**
   * Update booking status
   */
  async updateStatus(bookingId: string, status: string): Promise<ServiceResponse<Booking>> {
    logger.info('updateStatus', 'Updating booking status', { bookingId, status });

    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select()
        .single();

      if (error || !booking) {
        return failure(ErrorCodes.BOOKING_NOT_FOUND, 'Agendamento não encontrado');
      }

      return success(this.mapBookingFromDb(booking));
    } catch (err) {
      logger.error('updateStatus', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao atualizar status');
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async checkConflicts(
    barberId: string,
    date: string,
    time: string
  ): Promise<ServiceResponse<void>> {
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id, booking_time, booking_end_time')
      .eq('barber_id', barberId)
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    if (existingBookings && existingBookings.length > 0) {
      const hasConflict = existingBookings.some((b) => {
        const bookingStart = b.booking_time.substring(0, 5);
        const bookingEnd = b.booking_end_time?.substring(0, 5) || bookingStart;
        return time >= bookingStart && time < bookingEnd;
      });

      if (hasConflict) {
        return failure(ErrorCodes.BOOKING_CONFLICT, 'Já existe um agendamento neste horário');
      }
    }

    return success(undefined);
  }

  private async checkBarberBlocks(
    barberId: string,
    date: string,
    time: string
  ): Promise<ServiceResponse<void>> {
    const { data: blocks } = await supabase
      .from('barber_blocks')
      .select('start_time, end_time')
      .eq('barber_id', barberId)
      .eq('block_date', date);

    if (blocks && blocks.length > 0) {
      const isBlocked = blocks.some((block) => {
        const blockStart = block.start_time.substring(0, 5);
        const blockEnd = block.end_time.substring(0, 5);
        return time >= blockStart && time < blockEnd;
      });

      if (isBlocked) {
        return failure(ErrorCodes.BOOKING_BARBER_BLOCKED, 'O barbeiro está bloqueado neste horário');
      }
    }

    return success(undefined);
  }

  private mapBookingFromDb(db: Record<string, unknown>): Booking {
    return {
      id: db.id as string,
      barbershopId: db.barbershop_id as string,
      serviceId: db.service_id as string,
      barberId: db.barber_id as string | undefined,
      clientId: db.client_id as string | undefined,
      clientName: db.client_name as string | undefined,
      bookingDate: db.booking_date as string,
      bookingTime: db.booking_time as string,
      bookingEndTime: db.booking_end_time as string | undefined,
      status: db.status as string,
      totalPrice: db.total_price as number,
      notes: db.notes as string | undefined,
      isExternalBooking: db.is_external_booking as boolean,
      createdAt: db.created_at as string,
      updatedAt: db.updated_at as string,
    };
  }
}

// Export singleton instance
export const bookingService = new BookingService();
