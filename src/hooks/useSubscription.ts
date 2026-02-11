import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface TrialStatus {
  days_left: number;
  is_expired: boolean;
  trial_end_date: string;
  has_active_subscription: boolean;
}

export interface SubscriptionPlanDetails {
  plan_name: string;
  billing_period: string;
  price_monthly: number;
  max_professionals: number;
  price_total: number;
}

export interface SubscriptionData {
  id: string;
  plan_type: string;
  status: string;
  stripe_plan: SubscriptionPlanDetails | null;
  current_period_end: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
}

interface SubscriptionResponse {
  trial: TrialStatus | null;
  subscription: SubscriptionData | null;
}

export interface UseSubscriptionReturn {
  isLoading: boolean;
  trial: TrialStatus | null;
  subscription: SubscriptionData | null;
  hasAccess: boolean;
  refetch: () => Promise<unknown>;
}

// ============================================================================
// HOOK
// ============================================================================

export const useSubscription = (barbershopId: string | null): UseSubscriptionReturn => {
  const query = useQuery({
    queryKey: ['subscription-status', barbershopId],
    queryFn: async (): Promise<SubscriptionResponse> => {
      const { data, error } = await supabase.functions.invoke('get-subscription-status', {
        body: { barbershopId },
      });

      if (error) throw error;
      return data as SubscriptionResponse;
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  const trial = query.data?.trial ?? null;
  const subscription = query.data?.subscription ?? null;

  // hasAccess = trial not expired OR active subscription OR canceled but still in period
  const hasAccess = !barbershopId
    ? true
    : (trial && !trial.is_expired) ||
      subscription?.status === 'ativo' ||
      (subscription?.status === 'cancelado' &&
        subscription?.current_period_end &&
        new Date(subscription.current_period_end) > new Date()) ||
      false;

  return {
    isLoading: query.isLoading,
    trial,
    subscription,
    hasAccess: !!hasAccess,
    refetch: query.refetch,
  };
};
