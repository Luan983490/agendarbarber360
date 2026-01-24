import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService, CreateBookingDTO, CancelBookingDTO, AvailableSlotsDTO } from '@/services';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { getErrorMessage } from '@/lib/error-handler';
import { specificQueryConfig } from '@/lib/query-config';

// Query keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  availableSlots: (params: AvailableSlotsDTO) => ['availableSlots', params.barbershopId, params.barberId, params.date, params.serviceDuration] as const,
};

/**
 * Hook to create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useCreateBooking' });

  return useMutation({
    mutationFn: (data: CreateBookingDTO) => bookingService.create(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      } else if (result.error) {
        showErrorWithTitle('Erro ao agendar', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao agendar', error);
    },
  });
}

/**
 * Hook to cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useCancelBooking' });

  return useMutation({
    mutationFn: (data: CancelBookingDTO) => bookingService.cancel(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      } else if (result.error) {
        showErrorWithTitle('Erro ao cancelar', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao cancelar', error);
    },
  });
}

/**
 * Hook to update booking status
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  const { showErrorWithTitle } = useErrorHandler({ context: 'useUpdateBookingStatus' });

  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: string }) =>
      bookingService.updateStatus(bookingId, status),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      } else if (result.error) {
        showErrorWithTitle('Erro ao atualizar', result.error);
      }
    },
    onError: (error) => {
      showErrorWithTitle('Erro ao atualizar', error);
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
        throw new Error(getErrorMessage(result.error));
      }
      return result.data;
    },
    enabled: !!bookingId,
    ...specificQueryConfig.bookings,
  });
}

/**
 * Hook to get available time slots
 * CACHE INVALIDATION: Query key inclui barberId, date e serviceDuration
 * para garantir que mudanças nesses parâmetros forçam nova busca
 */
export function useAvailableSlots(params: AvailableSlotsDTO | null) {
  return useQuery({
    // Query key completa com todos os parâmetros que afetam o resultado
    queryKey: params 
      ? ['availableSlots', params.barbershopId, params.barberId, params.date, params.serviceDuration] 
      : ['availableSlots', 'disabled'],
    queryFn: async () => {
      if (!params) return [];
      
      // Log para debug: mostra quando a query é executada
      console.log('🔄 useAvailableSlots: Executando query com params:', {
        barbershopId: params.barbershopId,
        barberId: params.barberId,
        date: params.date,
        serviceDuration: params.serviceDuration
      });
      
      const result = await bookingService.getAvailableSlots(params);
      if (!result.success) {
        throw new Error(getErrorMessage(result.error));
      }
      
      console.log('✅ useAvailableSlots: Resultado:', {
        slotsCount: result.data?.length || 0,
        firstSlot: result.data?.[0]?.time,
        lastSlot: result.data?.[result.data.length - 1]?.time
      });
      
      return result.data;
    },
    enabled: !!params?.barbershopId && !!params?.barberId && !!params?.date,
    // IMPORTANTE: staleTime: 0 força nova busca sempre que os parâmetros mudam
    // Isso é necessário para refletir bloqueios e bookings recém-criados
    staleTime: 0,
    gcTime: 2 * 60 * 1000, // 2 minutos no garbage collector
    refetchOnWindowFocus: true,
  });
}
