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

export interface UpdateProfileDTO {
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  birthDate?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  phone?: string;
  avatarUrl?: string;
  birthDate?: string;
  gender?: string;
  userType: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  barbershopId: string;
  role: 'owner' | 'barber' | 'attendant';
  createdAt: string;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phone: phoneSchema,
  avatarUrl: z.string().url().optional().nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    zipCode: z.string().max(20).optional(),
  }).optional(),
});

// ============================================================================
// USER SERVICE
// ============================================================================

const logger = createLogger('UserService');

export class UserService {
  /**
   * Validates profile update data
   */
  validateUpdate(data: UpdateProfileDTO): ValidationResult {
    const result = updateProfileSchema.safeParse(data);
    return zodToValidationResult(result);
  }

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<ServiceResponse<UserProfile | null>> {
    logger.debug('getProfile', 'Fetching user profile', { userId });

    if (!uuidSchema.safeParse(userId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !profile) {
        return success(null);
      }

      return success(this.mapProfileFromDb(profile));
    } catch (err) {
      logger.error('getProfile', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar perfil');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileDTO): Promise<ServiceResponse<UserProfile>> {
    logger.info('updateProfile', 'Updating user profile', { userId });

    if (!uuidSchema.safeParse(userId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    const validation = this.validateUpdate(data);
    if (!validation.valid) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'Dados inválidos', { errors: validation.errors });
    }

    try {
      const updateData: Record<string, unknown> = {};
      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
      if (data.birthDate !== undefined) updateData.birth_date = data.birthDate;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.address !== undefined) updateData.address = data.address;

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.error('updateProfile', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao atualizar perfil');
      }

      return success(this.mapProfileFromDb(profile));
    } catch (err) {
      logger.error('updateProfile', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro inesperado ao atualizar perfil');
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<ServiceResponse<UserRole[]>> {
    logger.debug('getUserRoles', 'Fetching user roles', { userId });

    if (!uuidSchema.safeParse(userId).success) {
      return failure(ErrorCodes.VALIDATION_ERROR, 'ID inválido');
    }

    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        logger.error('getUserRoles', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao buscar roles');
      }

      const result: UserRole[] = (roles || []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        barbershopId: r.barbershop_id,
        role: r.role,
        createdAt: r.created_at,
      }));

      return success(result);
    } catch (err) {
      logger.error('getUserRoles', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar roles');
    }
  }

  /**
   * Check if user has a specific role in a barbershop
   */
  async hasRole(
    userId: string,
    barbershopId: string,
    role: 'owner' | 'barber' | 'attendant'
  ): Promise<ServiceResponse<boolean>> {
    logger.debug('hasRole', 'Checking user role', { userId, barbershopId, role });

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _barbershop_id: barbershopId,
        _role: role,
      });

      if (error) {
        logger.error('hasRole', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao verificar role');
      }

      return success(data === true);
    } catch (err) {
      logger.error('hasRole', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao verificar role');
    }
  }

  /**
   * Check if user is barbershop owner
   */
  async isBarbershopOwner(userId: string, barbershopId: string): Promise<ServiceResponse<boolean>> {
    logger.debug('isBarbershopOwner', 'Checking owner status', { userId, barbershopId });

    try {
      const { data, error } = await supabase.rpc('is_barbershop_owner', {
        _user_id: userId,
        _barbershop_id: barbershopId,
      });

      if (error) {
        logger.error('isBarbershopOwner', 'Database error', error);
        return failure(ErrorCodes.DATABASE_ERROR, 'Erro ao verificar owner');
      }

      return success(data === true);
    } catch (err) {
      logger.error('isBarbershopOwner', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao verificar owner');
    }
  }

  /**
   * Get user's associated barber record (if user is a barber)
   */
  async getBarberRecord(userId: string): Promise<ServiceResponse<{ barberId: string; barbershopId: string } | null>> {
    logger.debug('getBarberRecord', 'Fetching barber record', { userId });

    try {
      const { data: barber, error } = await supabase
        .from('barbers')
        .select('id, barbershop_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !barber) {
        return success(null);
      }

      return success({
        barberId: barber.id,
        barbershopId: barber.barbershop_id,
      });
    } catch (err) {
      logger.error('getBarberRecord', 'Unexpected error', err);
      return failure(ErrorCodes.UNKNOWN_ERROR, 'Erro ao buscar barbeiro');
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private mapProfileFromDb(db: Record<string, unknown>): UserProfile {
    return {
      id: db.id as string,
      userId: db.user_id as string,
      displayName: db.display_name as string | undefined,
      phone: db.phone as string | undefined,
      avatarUrl: db.avatar_url as string | undefined,
      birthDate: db.birth_date as string | undefined,
      gender: db.gender as string | undefined,
      userType: (db.user_type as string) || 'client',
      address: db.address as { street?: string; city?: string; state?: string; zipCode?: string } | undefined,
      createdAt: db.created_at as string,
      updatedAt: db.updated_at as string,
    };
  }
}

// Export singleton instance
export const userService = new UserService();
