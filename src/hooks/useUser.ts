import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { userService, UpdateProfileDTO } from '@/services';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  roles: (userId: string) => [...userKeys.all, 'roles', userId] as const,
  barberRecord: (userId: string) => [...userKeys.all, 'barberRecord', userId] as const,
};

/**
 * Hook to get user profile
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.profile(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const result = await userService.getProfile(userId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar perfil');
      }
      return result.data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProfileDTO }) =>
      userService.updateProfile(userId, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(variables.userId) });
        toast({
          title: 'Perfil atualizado',
          description: 'Seus dados foram atualizados com sucesso.',
        });
      } else {
        toast({
          title: 'Erro ao atualizar',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get user roles
 */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.roles(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const result = await userService.getUserRoles(userId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar roles');
      }
      return result.data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to check if user has a specific role in a barbershop
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
  });
}

/**
 * Hook to check if user is barbershop owner
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
  });
}

/**
 * Hook to get barber record for a user
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
  });
}
