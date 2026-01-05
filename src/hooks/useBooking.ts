import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { bookingService, CreateBookingDTO, CancelBookingDTO, AvailableSlotsDTO } from '@/services';

// Query keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  availableSlots: (params: AvailableSlotsDTO) => ['availableSlots', params] as const,
};

/**
 * Hook to create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateBookingDTO) => bookingService.create(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
        toast({
          title: 'Agendamento criado',
          description: 'Seu agendamento foi realizado com sucesso!',
        });
      } else {
        toast({
          title: 'Erro ao agendar',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao agendar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CancelBookingDTO) => bookingService.cancel(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
        toast({
          title: 'Agendamento cancelado',
          description: 'O agendamento foi cancelado com sucesso.',
        });
      } else {
        toast({
          title: 'Erro ao cancelar',
          description: result.error?.message || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update booking status
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      bookingService.updateStatus(bookingId, status),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
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
 * Hook to get a booking by ID
 */
export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(bookingId || ''),
    queryFn: async () => {
      if (!bookingId) return null;
      const result = await bookingService.getById(bookingId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar agendamento');
      }
      return result.data;
    },
    enabled: !!bookingId,
  });
}

/**
 * Hook to get available time slots
 */
export function useAvailableSlots(params: AvailableSlotsDTO | null) {
  return useQuery({
    queryKey: params ? bookingKeys.availableSlots(params) : ['availableSlots', 'disabled'],
    queryFn: async () => {
      if (!params) return [];
      const result = await bookingService.getAvailableSlots(params);
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro ao buscar horários');
      }
      return result.data;
    },
    enabled: !!params?.barbershopId && !!params?.barberId && !!params?.date,
  });
}
