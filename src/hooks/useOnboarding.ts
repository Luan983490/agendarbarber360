import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStatus {
  barbershop_id: string;
  is_completed: boolean;
  current_step: number;
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  step4_completed: boolean;
  completion_percentage: number;
}

export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: (barbershopId: string) => [...onboardingKeys.all, 'status', barbershopId] as const,
};

export function useOnboarding(barbershopId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: onboardingKeys.status(barbershopId || ''),
    queryFn: async () => {
      if (!barbershopId) return null;
      const { data, error } = await supabase.rpc('get_barbershop_onboarding_status', {
        p_barbershop_id: barbershopId,
      });
      if (error) throw error;
      return (data as unknown as OnboardingStatus[])?.[0] || null;
    },
    enabled: !!barbershopId,
    staleTime: 30_000,
  });

  const completeStepMutation = useMutation({
    mutationFn: async (stepNumber: number) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      const { data, error } = await supabase.rpc('complete_onboarding_step', {
        p_barbershop_id: barbershopId,
        p_step_number: stepNumber,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status(barbershopId || '') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar progresso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ stepNumber, draftData }: { stepNumber: number; draftData: Record<string, any> }) => {
      if (!barbershopId) throw new Error('No barbershop ID');
      const { data, error } = await supabase.rpc('save_onboarding_draft', {
        p_barbershop_id: barbershopId,
        p_step_number: stepNumber,
        p_draft_data: draftData,
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    completeStep: completeStepMutation.mutateAsync,
    isCompletingStep: completeStepMutation.isPending,
    saveDraft: saveDraftMutation.mutateAsync,
  };
}
