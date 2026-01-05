import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { barbershopService, CreateBarbershopDTO, UpdateBarbershopDTO } from '@/services';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { getErrorMessage } from '@/lib/error-handler';
import { specificQueryConfig } from '@/lib/query-config';

// Query keys
export const barbershopKeys = {
  all: ['barbershops'] as const,
  lists: () => [...barbershopKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...barbershopKeys.lists(), filters] as const,
  details: () => [...barbershopKeys.all, 'detail'] as const,
  detail: (id: string) => [...barbershopKeys.details(), id] as const,
  byOwner: (ownerId: string) => [...barbershopKeys.all, 'byOwner', ownerId] as const,
  stats: (id: string) => [...barbershopKeys.all, 'stats', id] as const,
};

/**
 * Hook to create a new barbershop
 */
export function useCreateBarbershop() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useCreateBarbershop' });

  return useMutation({
    mutationFn: (data: CreateBarbershopDTO) => barbershopService.create(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barbershopKeys.all });
      } else if (result.error) {
        showErrorWithTitle('Erro ao criar barbearia', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao criar barbearia', error);
    },
  });
}

/**
 * Hook to update a barbershop
 */
export function useUpdateBarbershop() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useUpdateBarbershop' });

  return useMutation({
    mutationFn: ({ barbershopId, data }: { barbershopId: string; data: UpdateBarbershopDTO }) =>
      barbershopService.update(barbershopId, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barbershopKeys.detail(variables.barbershopId) });
        queryClient.invalidateQueries({ queryKey: barbershopKeys.lists() });
      } else if (result.error) {
        showErrorWithTitle('Erro ao atualizar barbearia', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao atualizar barbearia', error);
    },
  });
}

/**
 * Hook to get a barbershop by ID
 * Optimized: 10-minute cache, rarely changes during session
 */
export function useBarbershop(barbershopId: string | undefined) {
  return useQuery({
    queryKey: barbershopKeys.detail(barbershopId || ''),
    queryFn: async () => {
      if (!barbershopId) return null;
      const result = await barbershopService.getById(barbershopId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!barbershopId,
    ...specificQueryConfig.barbershop,
  });
}

/**
 * Hook to get barbershop by owner
 * Optimized: 10-minute cache
 */
export function useBarbershopByOwner(ownerId: string | undefined) {
  return useQuery({
    queryKey: barbershopKeys.byOwner(ownerId || ''),
    queryFn: async () => {
      if (!ownerId) return null;
      const result = await barbershopService.getByOwner(ownerId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!ownerId,
    ...specificQueryConfig.barbershop,
  });
}

/**
 * Hook to search barbershops
 * Optimized: 2-minute cache for search results
 */
export function useSearchBarbershops(query: string, limit = 20) {
  return useQuery({
    queryKey: barbershopKeys.list({ query, limit }),
    queryFn: async () => {
      const result = await barbershopService.search(query, limit);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: query.length >= 2 || query === '',
    ...specificQueryConfig.search,
  });
}

/**
 * Hook to get barbershop stats
 * Optimized: 10-minute cache
 */
export function useBarbershopStats(barbershopId: string | undefined) {
  return useQuery({
    queryKey: barbershopKeys.stats(barbershopId || ''),
    queryFn: async () => {
      if (!barbershopId) return null;
      const result = await barbershopService.getStats(barbershopId);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!barbershopId,
    ...specificQueryConfig.stats,
  });
}
