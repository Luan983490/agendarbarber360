import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { barberService, CreateBarberDTO, UpdateBarberDTO, CreateBlockDTO } from '@/services';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { getErrorMessage } from '@/lib/error-handler';
import { specificQueryConfig } from '@/lib/query-config';

// Query keys
export const barberKeys = {
  all: ['barbers'] as const,
  lists: () => [...barberKeys.all, 'list'] as const,
  list: (barbershopId: string) => [...barberKeys.lists(), barbershopId] as const,
  details: () => [...barberKeys.all, 'detail'] as const,
  detail: (id: string) => [...barberKeys.details(), id] as const,
  workingHours: (id: string) => [...barberKeys.all, 'workingHours', id] as const,
  blocks: (id: string, date?: string) => [...barberKeys.all, 'blocks', id, date] as const,
};

/**
 * Hook to create a new barber
 */
export function useCreateBarber() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useCreateBarber' });

  return useMutation({
    mutationFn: (data: CreateBarberDTO) => barberService.create(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.list(variables.barbershopId) });
      } else if (result.error) {
        showErrorWithTitle('Erro ao cadastrar barbeiro', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao cadastrar barbeiro', error);
    },
  });
}

/**
 * Hook to update a barber
 */
export function useUpdateBarber() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useUpdateBarber' });

  return useMutation({
    mutationFn: ({ barberId, data }: { barberId: string; data: UpdateBarberDTO }) =>
      barberService.update(barberId, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.detail(variables.barberId) });
        queryClient.invalidateQueries({ queryKey: barberKeys.lists() });
      } else if (result.error) {
        showErrorWithTitle('Erro ao atualizar barbeiro', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao atualizar barbeiro', error);
    },
  });
}

/**
 * Hook to get a barber by ID
 * Optimized: 30-minute cache, barber data rarely changes
 */
export function useBarber(barberId: string | undefined) {
  return useQuery({
    queryKey: barberKeys.detail(barberId || ''),
    queryFn: async () => {
      if (!barberId) return null;
      const result = await barberService.getById(barberId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!barberId,
    ...specificQueryConfig.barbers,
  });
}

/**
 * Hook to get barbers by barbershop
 * Optimized: 30-minute cache, barbers list rarely changes
 */
export function useBarbersByBarbershop(barbershopId: string | undefined, activeOnly = true) {
  return useQuery({
    queryKey: barberKeys.list(barbershopId || ''),
    queryFn: async () => {
      if (!barbershopId) return [];
      const result = await barberService.getByBarbershop(barbershopId, activeOnly);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!barbershopId,
    ...specificQueryConfig.barbers,
  });
}

/**
 * Hook to get barber working hours
 * Optimized: 30-minute cache, working hours almost never change
 */
export function useBarberWorkingHours(barberId: string | undefined) {
  return useQuery({
    queryKey: barberKeys.workingHours(barberId || ''),
    queryFn: async () => {
      if (!barberId) return [];
      const result = await barberService.getWorkingHours(barberId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!barberId,
    ...specificQueryConfig.workingHours,
  });
}

/**
 * Hook to create a block for a barber
 */
export function useCreateBarberBlock() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useCreateBarberBlock' });

  return useMutation({
    mutationFn: (data: CreateBlockDTO) => barberService.createBlock(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.blocks(variables.barberId) });
      } else if (result.error) {
        showErrorWithTitle('Erro ao bloquear horário', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao bloquear horário', error);
    },
  });
}

/**
 * Hook to delete a block
 */
export function useDeleteBarberBlock() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useDeleteBarberBlock' });

  return useMutation({
    mutationFn: (blockId: string) => barberService.deleteBlock(blockId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.all });
      } else if (result.error) {
        showErrorWithTitle('Erro ao remover bloqueio', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao remover bloqueio', error);
    },
  });
}
