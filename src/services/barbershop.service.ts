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
  emailSchema,
} from './types';
import { createLogger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBarbershopDTO {
  ownerId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  description?: string;
  imageUrl?: string;
  amenities?: string[];
}

export interface UpdateBarbershopDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  imageUrl?: string;
  amenities?: string[];
}

export interface Barbershop {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  description?: string;
  imageUrl?: string;
  amenities: string[];
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface BarbershopStats {
  totalBookings: number;
  todayBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  activeBarbers: number;
  activeServices: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBarbershopSchema = z.object({
  ownerId: uuidSchema,
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres').max(200),
  phone: phoneSchema,
  email: emailSchema.optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  amenities: z.array(z.string()).optional(),
});

const updateBarbershopSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().min(5).max(200).optional(),
  phone: phoneSchema,
  email: emailSchema.optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  amenities: z.array(z.string()).optional(),
});

// ============================================================================
// BARBERSHOP SERVICE
// ============================================================================

const logger = createLogger('BarbershopService');

export class BarbershopService {
  /**
   * Validates barbershop creation data
   */
  validateCreate(data: CreateBarbershopDTO): ValidationResult {
    const result = createBarbershopSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Validates barbershop update data
   */
  validateUpdate(data: UpdateBarbershopDTO): ValidationResult {
    const result = updateBarbershopSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Create a new barbershop
   */
  async create(data: CreateBarbershopDTO): Promise<ServiceResponse<Barbershop>> {
    const timer = logger.startTimer();
    logger.info('create', 'Creating barbershop', { name: data.name, ownerId: data.ownerId });

    const validation = this.validateCreate(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .insert({
          owner_id: data.ownerId,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          description: data.description,
          image_url: data.imageUrl,
          amenities: data.amenities || [],
        })
        .select()
        .single();

      if (error) {
        logger.error('create', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao criar barbearia');
      }

      // Create default subscription (free trial)
      await this.createDefaultSubscription(barbershop.id);

      const result = this.mapBarbershopFromDb(barbershop);
      const duration = timer();
      logger.logWithDuration('info', 'create', 'Barbershop created successfully', duration, {
        barbershopId: result.id,
      });

      return success(result);
    } catch (err) {
      logger.error('create', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao criar barbearia');
    }
  }

  /**
   * Update a barbershop
   */
  async update(barbershopId: string, data: UpdateBarbershopDTO): Promise<ServiceResponse<Barbershop>> {
    logger.info('update', 'Updating barbershop', { barbershopId });

    if (!uuidSchema.safeParse(barbershopId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    const validation = this.validateUpdate(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
      if (data.amenities !== undefined) updateData.amenities = data.amenities;

      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .update(updateData)
        .eq('id', barbershopId)
        .select()
        .single();

      if (error) {
        logger.error('update', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao atualizar barbearia');
      }

      return success(this.mapBarbershopFromDb(barbershop));
    } catch (err) {
      logger.error('update', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao atualizar barbearia');
    }
  }

  /**
   * Get barbershop by ID
   */
  async getById(barbershopId: string): Promise<ServiceResponse<Barbershop>> {
    logger.debug('getById', 'Fetching barbershop', { barbershopId });

    try {
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single();

      if (error || !barbershop) {
        return failure(ErrorCodes.BARBERSHOP_NOT_FOUND, 'Barbearia não encontrada');
      }

      return success(this.mapBarbershopFromDb(barbershop));
    } catch (err) {
      logger.error('getById', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbearia');
    }
  }

  /**
   * Get barbershop by owner ID
   */
  async getByOwner(ownerId: string): Promise<ServiceResponse<Barbershop | null>> {
    logger.debug('getByOwner', 'Fetching barbershop by owner', { ownerId });

    try {
      const { data: barbershop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error || !barbershop) {
        return success(null);
      }

      return success(this.mapBarbershopFromDb(barbershop));
    } catch (err) {
      logger.error('getByOwner', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbearia');
    }
  }

  /**
   * Search barbershops
   */
  async search(query?: string, limit = 20): Promise<ServiceResponse<Barbershop[]>> {
    logger.debug('search', 'Searching barbershops', { query, limit });

    try {
      let dbQuery = supabase
        .from('barbershops')
        .select('*')
        .order('rating', { ascending: false })
        .limit(limit);

      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
      }

      const { data: barbershops, error } = await dbQuery;

      if (error) {
        logger.error('search', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar barbearias');
      }

      return success(barbershops.map((b) => this.mapBarbershopFromDb(b)));
    } catch (err) {
      logger.error('search', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbearias');
    }
  }

  /**
   * Get barbershop statistics
   */
  async getStats(barbershopId: string): Promise<ServiceResponse<BarbershopStats>> {
    const timer = logger.startTimer();
    logger.debug('getStats', 'Fetching barbershop stats', { barbershopId });

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get total bookings and revenue
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('total_price, booking_date')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed');

      // Get today's bookings
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('barbershop_id', barbershopId)
        .eq('booking_date', today)
        .neq('status', 'cancelled');

      // Get active barbers count
      const { count: barbersCount } = await supabase
        .from('barbers')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      // Get active services count
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      const stats: BarbershopStats = {
        totalBookings: allBookings?.length || 0,
        todayBookings: todayBookings?.length || 0,
        totalRevenue: allBookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0,
        todayRevenue: todayBookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0,
        activeBarbers: barbersCount || 0,
        activeServices: servicesCount || 0,
      };

      const duration = timer();
      logger.logWithDuration('debug', 'getStats', 'Stats fetched', duration, { 
        totalBookings: stats.totalBookings,
        todayBookings: stats.todayBookings,
        totalRevenue: stats.totalRevenue,
      });

      return success(stats);
    } catch (err) {
      logger.error('getStats', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar estatísticas');
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async createDefaultSubscription(barbershopId: string): Promise<void> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // 14-day free trial

      await supabase.from('subscriptions').insert({
        barbershop_id: barbershopId,
        plan_type: 'teste_gratis',
        status: 'ativo',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
    } catch (err) {
      logger.warn('createDefaultSubscription', 'Failed to create subscription', undefined, err);
    }
  }

  private mapBarbershopFromDb(db: Record<string, unknown>): Barbershop {
    return {
      id: db.id as string,
      ownerId: db.owner_id as string,
      name: db.name as string,
      address: db.address as string,
      phone: db.phone as string | undefined,
      email: db.email as string | undefined,
      description: db.description as string | undefined,
      imageUrl: db.image_url as string | undefined,
      amenities: (db.amenities as string[]) || [],
      rating: db.rating as number,
      totalReviews: db.total_reviews as number,
      createdAt: db.created_at as string,
      updatedAt: db.updated_at as string,
    };
  }
}

// Export singleton instance
export const barbershopService = new BarbershopService();
