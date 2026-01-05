import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { barberService, CreateBarberDTO, UpdateBarberDTO, CreateBlockDTO } from '@/services';

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
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateBarberDTO) => barberService.create(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.list(variables.barbershopId) });
        toast({
          title: 'Barbeiro cadastrado',
          description: 'O barbeiro foi adicionado com sucesso!',
        });
      } else {
        toast({
          title: 'Erro ao cadastrar',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a barber
 */
export function useUpdateBarber() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ barberId, data }: { barberId: string; data: UpdateBarberDTO }) =>
      barberService.update(barberId, data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.detail(variables.barberId) });
        queryClient.invalidateQueries({ queryKey: barberKeys.lists() });
        toast({
          title: 'Barbeiro atualizado',
          description: 'Os dados do barbeiro foram atualizados.',
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
 * Hook to get a barber by ID
 */
export function useBarber(barberId: string | undefined) {
  return useQuery({
    queryKey: barberKeys.detail(barberId || ''),
    queryFn: async () => {
      if (!barberId) return null;
      const result = await barberService.getById(barberId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar barbeiro');
      }
      return result.data;
    },
    enabled: !!barberId,
  });
}

/**
 * Hook to get barbers by barbershop
 */
export function useBarbersByBarbershop(barbershopId: string | undefined, activeOnly = true) {
  return useQuery({
    queryKey: barberKeys.list(barbershopId || ''),
    queryFn: async () => {
      if (!barbershopId) return [];
      const result = await barberService.getByBarbershop(barbershopId, activeOnly);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar barbeiros');
      }
      return result.data;
    },
    enabled: !!barbershopId,
  });
}

/**
 * Hook to get barber working hours
 */
export function useBarberWorkingHours(barberId: string | undefined) {
  return useQuery({
    queryKey: barberKeys.workingHours(barberId || ''),
    queryFn: async () => {
      if (!barberId) return [];
      const result = await barberService.getWorkingHours(barberId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar horários');
      }
      return result.data;
    },
    enabled: !!barberId,
  });
}

/**
 * Hook to create a block for a barber
 */
export function useCreateBarberBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateBlockDTO) => barberService.createBlock(data),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.blocks(variables.barberId) });
        toast({
          title: 'Bloqueio criado',
          description: 'O horário foi bloqueado com sucesso.',
        });
      } else {
        toast({
          title: 'Erro ao bloquear',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao bloquear',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a block
 */
export function useDeleteBarberBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (blockId: string) => barberService.deleteBlock(blockId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: barberKeys.all });
        toast({
          title: 'Bloqueio removido',
          description: 'O bloqueio foi removido com sucesso.',
        });
      } else {
        toast({
          title: 'Erro ao remover',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
