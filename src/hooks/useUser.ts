import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService, UpdateProfileDTO } from '@/services';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { getErrorMessage } from '@/lib/error-handler';
import { specificQueryConfig } from '@/lib/query-config';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  roles: (userId: string) => [...userKeys.all, 'roles', userId] as const,
  barberRecord: (userId: string) => [...userKeys.all, 'barberRecord', userId] as const,
};

/**
 * Hook to get user profile
 * Optimized: 10-minute cache
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const result = await userService.getProfile(userId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!userId,
    ...specificQueryConfig.profile,
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useUpdateProfile' });

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileDTO }) =>
      userService.updateProfile(userId, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(variables.userId) });
      } else if (result.error) {
        showErrorWithTitle('Erro ao atualizar perfil', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao atualizar perfil', error);
    },
  });
}

/**
 * Hook to get user roles
 * Optimized: 30-minute cache, roles rarely change
 */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.roles(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const result = await userService.getUserRoles(userId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!userId,
    ...specificQueryConfig.roles,
  });
}

/**
 * Hook to check if user has a specific role in a barbershop
 * Optimized: 30-minute cache
 */
export function useHasRole(
  userId: string | undefined,
  barbershopId: string | undefined,
  role: 'owner' | 'barber' | 'attendant'
) {
  return useQuery({
    queryKey: [...userKeys.roles(userId || ''), barbershopId, role],
    queryFn: async () => {
      if (!userId || !barbershopId) return false;
      const result = await userService.hasRole(userId, barbershopId, role);
      if (!result.success) {
        return false;
      }
      return result.data;
    },
    enabled: !!userId && !!barbershopId,
    ...specificQueryConfig.roles,
  });
}

/**
 * Hook to check if user is barbershop owner
 * Optimized: 30-minute cache
 */
export function useIsBarbershopOwner(userId: string | undefined, barbershopId: string | undefined) {
  return useQuery({
    queryKey: [...userKeys.roles(userId || ''), barbershopId, 'isOwner'],
    queryFn: async () => {
      if (!userId || !barbershopId) return false;
      const result = await userService.isBarbershopOwner(userId, barbershopId);
      if (!result.success) {
        return false;
      }
      return result.data;
    },
    enabled: !!userId && !!barbershopId,
    ...specificQueryConfig.roles,
  });
}

/**
 * Hook to get barber record for a user
 * Optimized: 30-minute cache
 */
export function useBarberRecord(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.barberRecord(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const result = await userService.getBarberRecord(userId);
      if (!result.success) {
        return null;
      }
      return result.data;
    },
    enabled: !!userId,
    ...specificQueryConfig.barbers,
  });
}
