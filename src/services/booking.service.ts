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

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(data: AvailableSlotsDTO): Promise<ServiceResponse<TimeSlot[]>> {
    const timer = logger.startTimer();
    logger.debug('getAvailableSlots', 'Fetching available slots', { 
      barbershopId: data.barbershopId, 
      barberId: data.barberId,
      date: data.date 
    });

    const validation = availableSlotsSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      // Generate time slots (every 30 minutes from 08:00 to 20:00)
      const slots: TimeSlot[] = [];
      const startHour = 8;
      const endHour = 20;

      for (let hour = startHour; hour < endHour; hour++) {
        for (const minutes of [0, 30]) {
          const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          slots.push({ time, available: true });
        }
      }

      // Get existing bookings for the date
      let bookingsQuery = supabase
        .from('bookings')
        .select('booking_time, booking_end_time, status')
        .eq('barbershop_id', data.barbershopId)
        .eq('booking_date', data.date)
        .neq('status', 'cancelled');

      if (data.barberId) {
        bookingsQuery = bookingsQuery.eq('barber_id', data.barberId);
      }

      const { data: bookings } = await bookingsQuery;

      // Get barber blocks if barber specified
      let blocks: Array<{ start_time: string; end_time: string; reason: string | null }> = [];
      if (data.barberId) {
        const { data: barberBlocks } = await supabase
          .from('barber_blocks')
          .select('start_time, end_time, reason')
          .eq('barber_id', data.barberId)
          .eq('block_date', data.date);
        
        blocks = barberBlocks || [];
      }

      // Mark unavailable slots
      for (const slot of slots) {
        const slotTime = slot.time;

        // Check bookings
        if (bookings) {
          const hasConflict = bookings.some((b) => {
            const bookingStart = b.booking_time.substring(0, 5);
            const bookingEnd = b.booking_end_time?.substring(0, 5) || bookingStart;
            return slotTime >= bookingStart && slotTime < bookingEnd;
          });

          if (hasConflict) {
            slot.available = false;
            slot.reason = 'Horário ocupado';
          }
        }

        // Check blocks
        if (slot.available && blocks.length > 0) {
          const isBlocked = blocks.some((block) => {
            const blockStart = block.start_time.substring(0, 5);
            const blockEnd = block.end_time.substring(0, 5);
            return slotTime >= blockStart && slotTime < blockEnd;
          });

          if (isBlocked) {
            slot.available = false;
            slot.reason = 'Barbeiro bloqueado';
          }
        }
      }

      const duration = timer();
      logger.logWithDuration('debug', 'getAvailableSlots', 'Slots fetched', duration, {
        totalSlots: slots.length,
        availableSlots: slots.filter((s) => s.available).length,
      });

      return success(slots);
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
