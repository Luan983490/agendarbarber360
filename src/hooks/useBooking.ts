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
 * DEBUG VERSION: Contains extensive logging to diagnose display issues
 */
export function useAvailableSlots(params: AvailableSlotsDTO | null) {
  // Build query key - CRITICAL: include ALL parameters that affect the result
  const queryKey = params 
    ? ['availableSlots', params.barbershopId, params.barberId, params.date, params.serviceDuration] 
    : ['availableSlots', 'disabled'];
  
  // Log query configuration
  console.log('🎯 useAvailableSlots: Hook chamado', {
    enabled: !!params?.barbershopId && !!params?.barberId && !!params?.date,
    queryKey,
    params: params ? {
      barbershopId: params.barbershopId,
      barberId: params.barberId,
      date: params.date,
      dateType: typeof params.date,
      dateLength: params.date?.length,
      serviceDuration: params.serviceDuration
    } : null
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🔄 useAvailableSlots: queryFn EXECUTANDO - NOVA REQUISIÇÃO', {
        timestamp: new Date().toISOString(),
        params
      });
      
      if (!params) {
        console.log('⚠️ useAvailableSlots: Params é null, retornando array vazio');
        return [];
      }
      
      // Log exact parameters being sent to API
      console.log('📤 useAvailableSlots: Enviando para API:', {
        barbershopId: params.barbershopId,
        barberId: params.barberId,
        date: params.date,
        dateFormat: /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? 'YYYY-MM-DD ✅' : 'FORMATO INCORRETO ❌',
        serviceDuration: params.serviceDuration
      });
      
      const result = await bookingService.getAvailableSlots(params);
      
      // Log API response with FULL details
      console.log('📥 useAvailableSlots: Resposta da API:', {
        success: result.success,
        error: result.error,
        dataExists: !!result.data,
        dataLength: result.data?.length || 0,
        firstSlots: result.data?.slice(0, 5)?.map(s => ({ time: s.time, available: s.available })),
        lastSlots: result.data?.slice(-3)?.map(s => ({ time: s.time, available: s.available })),
        // CRITICAL: Check if any slot is marked as unavailable (should be filtered out)
        hasUnavailableSlots: result.data?.some(s => s.available === false)
      });
      
      if (!result.success) {
        console.error('❌ useAvailableSlots: API retornou erro', result.error);
        throw new Error(getErrorMessage(result.error));
      }
      
      console.log('✅ useAvailableSlots: Retornando', result.data?.length, 'slots disponíveis');
      return result.data;
    },
    enabled: !!params?.barbershopId && !!params?.barberId && !!params?.date,
    // CRITICAL: Force fresh data on every render
    staleTime: 0,
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnReconnect: true,
  });
}
