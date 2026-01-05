import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeString } from '@/lib/sanitizer';
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

export interface DeleteBlocksDTO {
  blockIds: string[];
}

export interface DeleteBlocksByDateDTO {
  barberId: string;
  blockDate: string;
  startTime?: string;
  endTime?: string;
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

const createFullDayBlockSchema = z.object({
  barberId: uuidSchema,
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

const deleteBlockBySlotSchema = z.object({
  barberId: uuidSchema,
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

const deleteBlocksInRangeSchema = z.object({
  barberId: uuidSchema,
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

const deleteAllBlocksForDaySchema = z.object({
  barberId: uuidSchema,
  blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
      blockDate: data.blockDate,
    });

    const sanitizedReason = data.reason ? sanitizeString(data.reason, { maxLength: 255 }) : undefined;

    const validation = createBlockSchema.safeParse({
      ...data,
      reason: sanitizedReason,
    });

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
          reason: sanitizedReason || null,
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
   * Delete a single time block by ID
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
   * Delete multiple blocks by their IDs
   */
  async deleteBlocks(blockIds: string[]): Promise<ServiceResponse<{ deletedCount: number }>> {
    logger.info('deleteBlocks', 'Deleting multiple barber blocks', { count: blockIds.length });

    if (blockIds.length === 0) {
      return success({ deletedCount: 0 });
    }

    try {
      const { error, count } = await supabase
        .from('barber_blocks')
        .delete()
        .in('id', blockIds);

      if (error) {
        logger.error('deleteBlocks', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueios');
      }

      logger.info('deleteBlocks', 'Blocks deleted successfully', { deletedCount: count || blockIds.length });
      return success({ deletedCount: count || blockIds.length });
    } catch (err) {
      logger.error('deleteBlocks', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueios');
    }
  }

  /**
   * Delete all blocks for a barber on a specific date, optionally within a time range
   */
  async deleteBlocksByDate(data: DeleteBlocksByDateDTO): Promise<ServiceResponse<{ deletedCount: number }>> {
    logger.info('deleteBlocksByDate', 'Deleting blocks by date', { barberId: data.barberId, blockDate: data.blockDate });

    try {
      let query = supabase
        .from('barber_blocks')
        .delete()
        .eq('barber_id', data.barberId)
        .eq('block_date', data.blockDate);

      // If time range specified, filter by overlapping blocks
      if (data.startTime && data.endTime) {
        query = query
          .lt('start_time', data.endTime)
          .gt('end_time', data.startTime);
      }

      const { error, count } = await query;

      if (error) {
        logger.error('deleteBlocksByDate', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueios');
      }

      logger.info('deleteBlocksByDate', 'Blocks deleted successfully', { deletedCount: count });
      return success({ deletedCount: count || 0 });
    } catch (err) {
      logger.error('deleteBlocksByDate', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueios');
    }
  }

  /**
   * Create a full-day block (single block entry from first to last working hour)
   * FIXED: Uses schedule overrides when present and covers full working hours.
   */
  async createFullDayBlock(data: { barberId: string; blockDate: string; reason?: string }): Promise<ServiceResponse<void>> {
    logger.info('createFullDayBlock', 'Creating full-day block', {
      barberId: data.barberId,
      blockDate: data.blockDate,
    });

    const sanitizedReason = data.reason ? sanitizeString(data.reason, { maxLength: 255 }) : undefined;

    const validation = createFullDayBlockSchema.safeParse({
      ...data,
      reason: sanitizedReason,
    });

    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      const dayOfWeek = new Date(`${data.blockDate}T12:00:00`).getDay();

      // 1) Prefer schedule override for this date
      const { data: override, error: overrideError } = await supabase
        .from('barber_schedule_overrides')
        .select('*')
        .eq('barber_id', data.barberId)
        .eq('day_of_week', dayOfWeek)
        .lte('start_date', data.blockDate)
        .gte('end_date', data.blockDate)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (overrideError) {
        logger.error('createFullDayBlock', 'Override fetch error', overrideError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar horários especiais');
      }

      // 2) Fallback to base working hours
      const { data: workingHours, error: whError } = await supabase
        .from('barber_working_hours')
        .select('*')
        .eq('barber_id', data.barberId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      if (whError) {
        logger.error('createFullDayBlock', 'Working hours fetch error', whError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar horários de trabalho');
      }

      const schedule = override || workingHours;

      if (!schedule) {
        logger.warn('createFullDayBlock', 'No schedule found', undefined, { dayOfWeek });
        return failure(ErrorCodes.VALIDATION_ERROR, 'Horários de trabalho não configurados para este dia');
      }

      if (schedule.is_day_off) {
        return failure(ErrorCodes.VALIDATION_ERROR, 'Este dia está configurado como folga');
      }

      const startTimes: string[] = [];
      const endTimes: string[] = [];

      if (schedule.period1_start && schedule.period1_end) {
        startTimes.push(schedule.period1_start.substring(0, 5));
        endTimes.push(schedule.period1_end.substring(0, 5));
      }
      if (schedule.period2_start && schedule.period2_end) {
        startTimes.push(schedule.period2_start.substring(0, 5));
        endTimes.push(schedule.period2_end.substring(0, 5));
      }

      if (startTimes.length === 0 || endTimes.length === 0) {
        return failure(ErrorCodes.VALIDATION_ERROR, 'Horários de trabalho inválidos');
      }

      startTimes.sort();
      endTimes.sort();
      const earliestStart = startTimes[0];
      const latestEnd = endTimes[endTimes.length - 1];

      const { error: deleteError } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('barber_id', data.barberId)
        .eq('block_date', data.blockDate);

      if (deleteError) {
        logger.error('createFullDayBlock', 'Delete existing blocks error', deleteError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao limpar bloqueios existentes');
      }

      const { error: insertError } = await supabase
        .from('barber_blocks')
        .insert({
          barber_id: data.barberId,
          block_date: data.blockDate,
          start_time: earliestStart,
          end_time: latestEnd,
          reason: sanitizedReason || 'Dia bloqueado',
        });

      if (insertError) {
        logger.error('createFullDayBlock', 'Database error', insertError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao criar bloqueio');
      }

      logger.info('createFullDayBlock', 'Full-day block created', {
        startTime: earliestStart,
        endTime: latestEnd,
        usedOverride: !!override,
      });

      return success(undefined);
    } catch (err) {
      logger.error('createFullDayBlock', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar bloqueio');
    }
  }

  /**
   * Delete a single block by slot time - finds and removes the block covering this specific time
   */
  async deleteBlockBySlot(data: { barberId: string; blockDate: string; slotTime: string }): Promise<ServiceResponse<{ deletedCount: number }>> {
    logger.info('deleteBlockBySlot', 'Deleting block for specific slot', data);

    const validation = deleteBlockBySlotSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      // Find blocks that cover this specific time
      const { data: blocks, error: fetchError } = await supabase
        .from('barber_blocks')
        .select('*')
        .eq('barber_id', data.barberId)
        .eq('block_date', data.blockDate)
        .lte('start_time', data.slotTime)
        .gt('end_time', data.slotTime);

      if (fetchError) {
        logger.error('deleteBlockBySlot', 'Fetch error', fetchError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar bloqueio');
      }

      if (!blocks || blocks.length === 0) {
        return failure(ErrorCodes.VALIDATION_ERROR, 'Este horário não está bloqueado');
      }

      const blockIds = blocks.map((b) => b.id);
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .in('id', blockIds);

      if (error) {
        logger.error('deleteBlockBySlot', 'Delete error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueio');
      }

      logger.info('deleteBlockBySlot', 'Block deleted', { deletedCount: blockIds.length });
      return success({ deletedCount: blockIds.length });
    } catch (err) {
      logger.error('deleteBlockBySlot', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueio');
    }
  }

  /**
   * Delete blocks within a time range on a specific date
   */
  async deleteBlocksInRange(data: { barberId: string; blockDate: string; startTime: string; endTime: string }): Promise<ServiceResponse<{ deletedCount: number }>> {
    logger.info('deleteBlocksInRange', 'Deleting blocks in range', data);

    const validation = deleteBlocksInRangeSchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      // Find blocks that overlap with this time range
      const { data: blocks, error: fetchError } = await supabase
        .from('barber_blocks')
        .select('*')
        .eq('barber_id', data.barberId)
        .eq('block_date', data.blockDate)
        .lt('start_time', data.endTime)
        .gt('end_time', data.startTime);

      if (fetchError) {
        logger.error('deleteBlocksInRange', 'Fetch error', fetchError);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar bloqueios');
      }

      if (!blocks || blocks.length === 0) {
        return failure(ErrorCodes.VALIDATION_ERROR, 'Nenhum bloqueio encontrado nesta faixa');
      }

      const blockIds = blocks.map((b) => b.id);
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .in('id', blockIds);

      if (error) {
        logger.error('deleteBlocksInRange', 'Delete error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueios');
      }

      logger.info('deleteBlocksInRange', 'Blocks deleted in range', { deletedCount: blockIds.length });
      return success({ deletedCount: blockIds.length });
    } catch (err) {
      logger.error('deleteBlocksInRange', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueios');
    }
  }

  /**
   * Delete all blocks for a day
   */
  async deleteAllBlocksForDay(data: { barberId: string; blockDate: string }): Promise<ServiceResponse<{ deletedCount: number }>> {
    logger.info('deleteAllBlocksForDay', 'Deleting all blocks for day', data);

    const validation = deleteAllBlocksForDaySchema.safeParse(data);
    if (!validation.success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos');
    }

    try {
      const { error, count } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('barber_id', data.barberId)
        .eq('block_date', data.blockDate);

      if (error) {
        logger.error('deleteAllBlocksForDay', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao remover bloqueios');
      }

      logger.info('deleteAllBlocksForDay', 'All blocks deleted for day', { deletedCount: count });
      return success({ deletedCount: count || 0 });
    } catch (err) {
      logger.error('deleteAllBlocksForDay', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao remover bloqueios');
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
