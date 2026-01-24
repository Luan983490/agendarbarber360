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
   * Lógica matemática universal de colisão de intervalos:
   * Dois intervalos [start1, end1) e [start2, end2) se sobrepõem se e somente se:
   * start1 < end2 AND end1 > start2
   */
  private hasTimeOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get available time slots for a date
   * 
   * NOVA IMPLEMENTAÇÃO: Usa função SQL get_available_slots no PostgreSQL
   * para garantir precisão na detecção de conflitos usando OVERLAPS.
   * 
   * A função SQL considera:
   * - Horários de trabalho (period1 e period2)
   * - Schedule overrides (têm prioridade sobre working_hours)
   * - Agendamentos existentes (exceto cancelados)
   * - Bloqueios manuais (barber_blocks)
   */
  async getAvailableSlots(data: AvailableSlotsDTO): Promise<ServiceResponse<TimeSlot[]>> {
    const timer = logger.startTimer();
    
    const validation = availableSlotsSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      const { barberId, date, serviceDuration = 30 } = data;

      // Validação básica
      if (!barberId) {
        logger.debug('getAvailableSlots', 'No barber specified');
        return success([]);
      }

      // Validação de data passada (com timezone local)
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (date < todayStr) {
        logger.debug('getAvailableSlots', 'Date in the past', { date, todayStr });
        return success([]);
      }

      logger.debug('getAvailableSlots', 'Calling RPC get_available_slots', { 
        barberId, 
        date, 
        serviceDuration
      });

      // ========== CHAMAR FUNÇÃO SQL DO POSTGRESQL ==========
      // A função get_available_slots faz todo o trabalho pesado:
      // - Busca horários de trabalho (com prioridade para overrides)
      // - Gera slots de 15 em 15 minutos
      // - Verifica conflitos com bookings usando OVERLAPS
      // - Verifica conflitos com blocks usando OVERLAPS
      // - Filtra horários passados (se for hoje)
      
      const { data: slotsFromDb, error: rpcError } = await supabase
        .rpc('get_available_slots', {
          p_barber_id: barberId,
          p_date: date,
          p_duration: serviceDuration
        });

      if (rpcError) {
        logger.error('getAvailableSlots', 'RPC error', rpcError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar horários disponíveis');
      }

      // DEBUG CRÍTICO: Log da resposta RAW do Supabase
      // Verificar EXATAMENTE o que o banco retorna
      const rawSlots = slotsFromDb || [];
      const unavailableRaw = rawSlots.filter((s: { is_available: boolean }) => s.is_available === false);
      const availableRaw = rawSlots.filter((s: { is_available: boolean }) => s.is_available === true);
      
      console.log('🔴🔴🔴 DEBUG CRÍTICO - RAW DATA FROM SUPABASE 🔴🔴🔴');
      console.log('📊 Total slots recebidos:', rawSlots.length);
      console.log('✅ Slots com is_available=TRUE:', availableRaw.length);
      console.log('❌ Slots com is_available=FALSE:', unavailableRaw.length);
      
      if (unavailableRaw.length > 0) {
        console.log('⚠️ HORÁRIOS INDISPONÍVEIS (serão filtrados):', 
          unavailableRaw.map((s: { slot_time: string }) => s.slot_time)
        );
      } else {
        console.log('⚠️⚠️⚠️ ATENÇÃO: Banco retornou ZERO slots indisponíveis!');
        console.log('Primeiros 10 slots RAW:', rawSlots.slice(0, 10));
      }
      
      // Log COMPLETO para debug
      const totalFromDb = rawSlots.length;
      const availableFromDb = availableRaw.length;
      const unavailableFromDb = unavailableRaw.length;

      // CRÍTICO: Verificar se existem slots indisponíveis
      const unavailableSlotTimes = slotsFromDb?.filter((s: { is_available: boolean }) => s.is_available === false)
        .map((s: { slot_time: string }) => s.slot_time) || [];
      
      if (unavailableSlotTimes.length > 0) {
        console.log('⚠️ SLOTS INDISPONÍVEIS ENCONTRADOS:', unavailableSlotTimes);
      } else {
        console.log('⚠️ NENHUM SLOT INDISPONÍVEL ENCONTRADO - Verificar se o banco está retornando corretamente');
      }

      // FILTRAR APENAS os slots onde is_available === true
      // CRÍTICO: Usar verificação estrita e logar cada slot filtrado
      console.log('🔄 Iniciando filtragem de slots...');
      
      const availableSlots: TimeSlot[] = [];
      let filteredCount = 0;
      
      for (const slot of rawSlots) {
        // Verificação explícita - aceitar apenas booleano true
        const isAvailable = slot.is_available === true;
        
        if (isAvailable) {
          availableSlots.push({
            time: this.normalizeTime(slot.slot_time),
            available: true
          });
        } else {
          filteredCount++;
          console.log(`❌ FILTRADO: ${slot.slot_time} (is_available=${slot.is_available}, tipo=${typeof slot.is_available})`);
        }
      }
      
      console.log('✅ RESULTADO DA FILTRAGEM:');
      console.log(`   - Total recebido do banco: ${rawSlots.length}`);
      console.log(`   - Filtrados (indisponíveis): ${filteredCount}`);
      console.log(`   - Disponíveis (retornados): ${availableSlots.length}`);
      
      if (filteredCount === 0 && rawSlots.length > 0) {
        console.log('⚠️⚠️⚠️ ALERTA: Nenhum slot foi filtrado! Verificar se banco retorna is_available corretamente.');
      }

      const duration = timer();
      logger.logWithDuration('debug', 'getAvailableSlots', 'Available slots from RPC', duration, {
        date,
        barberId,
        serviceDuration,
        totalFromDb: slotsFromDb?.length || 0,
        availableCount: availableSlots.length,
      });

      return success(availableSlots);
    } catch (err) {
      logger.error('getAvailableSlots', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar horários disponíveis');
    }
  }

  /**
   * Converte minutos para string HH:MM (helper para logs)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
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
