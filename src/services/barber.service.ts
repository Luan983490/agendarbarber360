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
  phoneSchema,
} from './types';
import { createLogger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBarberDTO {
  barbershopId: string;
  name: string;
  phone?: string;
  specialty?: string;
  imageUrl?: string;
}

export interface UpdateBarberDTO {
  name?: string;
  phone?: string;
  specialty?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface Barber {
  id: string;
  barbershopId: string;
  name: string;
  phone?: string;
  specialty?: string;
  imageUrl?: string;
  isActive: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BarberWorkingHours {
  id: string;
  barberId: string;
  dayOfWeek: number;
  period1Start?: string;
  period1End?: string;
  period2Start?: string;
  period2End?: string;
  isDayOff: boolean;
}

export interface CreateBlockDTO {
  barberId: string;
  blockDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBarberSchema = z.object({
  barbershopId: uuidSchema,
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  phone: phoneSchema,
  specialty: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
});

const updateBarberSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
  specialty: z.string().max(100).optional(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createBlockSchema = z.object({
  barberId: uuidSchema,
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}/),
  endTime: z.string().regex(/^\d{2}:\d{2}/),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// BARBER SERVICE
// ============================================================================

const logger = createLogger('BarberService');

export class BarberService {
  /**
   * Validates barber creation data
   */
  validateCreate(data: CreateBarberDTO): ValidationResult {
    const result = createBarberSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Validates barber update data
   */
  validateUpdate(data: UpdateBarberDTO): ValidationResult {
    const result = updateBarberSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Create a new barber
   */
  async create(data: CreateBarberDTO): Promise<ServiceResponse<Barber>> {
    const timer = logger.startTimer();
    logger.info('create', 'Creating barber', { name: data.name, barbershopId: data.barbershopId });

    const validation = this.validateCreate(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      const { data: barber, error } = await supabase
        .from('barbers')
        .insert({
          barbershop_id: data.barbershopId,
          name: data.name,
          phone: data.phone,
          specialty: data.specialty,
          image_url: data.imageUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('create', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao criar barbeiro');
      }

      // Create default working hours
      await this.createDefaultWorkingHours(barber.id);

      const result = this.mapBarberFromDb(barber);
      const duration = timer();
      logger.logWithDuration('info', 'create', 'Barber created successfully', duration, { barberId: result.id });

      return success(result);
    } catch (err) {
      logger.error('create', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar barbeiro');
    }
  }

  /**
   * Update a barber
   */
  async update(barberId: string, data: UpdateBarberDTO): Promise<ServiceResponse<Barber>> {
    logger.info('update', 'Updating barber', { barberId });

    if (!uuidSchema.safeParse(barberId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    const validation = this.validateUpdate(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.specialty !== undefined) updateData.specialty = data.specialty;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { data: barber, error } = await supabase
        .from('barbers')
        .update(updateData)
        .eq('id', barberId)
        .select()
        .single();

      if (error) {
        logger.error('update', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao atualizar barbeiro');
      }

      return success(this.mapBarberFromDb(barber));
    } catch (err) {
      logger.error('update', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao atualizar barbeiro');
    }
  }

  /**
   * Get barber by ID
   */
  async getById(barberId: string): Promise<ServiceResponse<Barber>> {
    logger.debug('getById', 'Fetching barber', { barberId });

    try {
      const { data: barber, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('id', barberId)
        .single();

      if (error || !barber) {
        return failure(ErrorCodes.BARBER_NOT_FOUND, 'Barbeiro não encontrado');
      }

      return success(this.mapBarberFromDb(barber));
    } catch (err) {
      logger.error('getById', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbeiro');
    }
  }

  /**
   * Get barbers by barbershop
   */
  async getByBarbershop(barbershopId: string, activeOnly = true): Promise<ServiceResponse<Barber[]>> {
    logger.debug('getByBarbershop', 'Fetching barbers', { barbershopId, activeOnly });

    try {
      let query = supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data: barbers, error } = await query;

      if (error) {
        logger.error('getByBarbershop', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar barbeiros');
      }

      return success(barbers.map((b) => this.mapBarberFromDb(b)));
    } catch (err) {
      logger.error('getByBarbershop', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbeiros');
    }
  }

  /**
   * Create a time block for a barber
   */
  async createBlock(data: CreateBlockDTO): Promise<ServiceResponse<void>> {
    logger.info('createBlock', 'Creating barber block', { 
      barberId: data.barberId, 
      blockDate: data.blockDate 
    });

    const validation = createBlockSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      const { error } = await supabase
        .from('barber_blocks')
        .insert({
          barber_id: data.barberId,
          block_date: data.blockDate,
          start_time: data.startTime,
          end_time: data.endTime,
          reason: data.reason,
        });

      if (error) {
        logger.error('createBlock', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao criar bloqueio');
      }

      return success(undefined);
    } catch (err) {
      logger.error('createBlock', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar bloqueio');
    }
  }

  /**
   * Delete a time block
   */
  async deleteBlock(blockId: string): Promise<ServiceResponse<void>> {
    logger.info('deleteBlock', 'Deleting barber block', { blockId });

    try {
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', blockId);

      if (error) {
        logger.error('deleteBlock', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueio');
      }

      return success(undefined);
    } catch (err) {
      logger.error('deleteBlock', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueio');
    }
  }

  /**
   * Get working hours for a barber
   */
  async getWorkingHours(barberId: string): Promise<ServiceResponse<BarberWorkingHours[]>> {
    logger.debug('getWorkingHours', 'Fetching working hours', { barberId });

    try {
      const { data: hours, error } = await supabase
        .from('barber_working_hours')
        .select('*')
        .eq('barber_id', barberId)
        .order('day_of_week');

      if (error) {
        logger.error('getWorkingHours', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar horários');
      }

      const result: BarberWorkingHours[] = hours.map((h) => ({
        id: h.id,
        barberId: h.barber_id,
        dayOfWeek: h.day_of_week,
        period1Start: h.period1_start || undefined,
        period1End: h.period1_end || undefined,
        period2Start: h.period2_start || undefined,
        period2End: h.period2_end || undefined,
        isDayOff: h.is_day_off,
      }));

      return success(result);
    } catch (err) {
      logger.error('getWorkingHours', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar horários');
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async createDefaultWorkingHours(barberId: string): Promise<void> {
    const defaultHours = [];
    for (let day = 0; day <= 6; day++) {
      defaultHours.push({
        barber_id: barberId,
        day_of_week: day,
        is_day_off: day === 0, // Sunday off by default
        period1_start: day === 0 ? null : '09:00',
        period1_end: day === 0 ? null : '12:00',
        period2_start: day === 0 ? null : '14:00',
        period2_end: day === 0 ? null : '18:00',
      });
    }

    try {
      await supabase.from('barber_working_hours').insert(defaultHours);
    } catch (err) {
      logger.warn('createDefaultWorkingHours', 'Failed to create default hours', undefined, err);
    }
  }

  private mapBarberFromDb(db: Record<string, unknown>): Barber {
    return {
      id: db.id as string,
      barbershopId: db.barbershop_id as string,
      name: db.name as string,
      phone: db.phone as string | undefined,
      specialty: db.specialty as string | undefined,
      imageUrl: db.image_url as string | undefined,
      isActive: db.is_active as boolean,
      userId: db.user_id as string | undefined,
      createdAt: db.created_at as string,
      updatedAt: db.updated_at as string,
    };
  }
}

// Export singleton instance
export const barberService = new BarberService();
