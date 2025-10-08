import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  days_remaining: number;
}

export const useSubscription = (barbershopId: string | null) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!barbershopId) {
      setLoading(false);
      return;
    }

    checkSubscription();
  }, [barbershopId]);

  const checkSubscription = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .rpc('check_subscription_status', { barbershop_uuid: barbershopId });

      if (error) throw error;

      if (data && data.length > 0) {
        const sub = data[0];
        
        // Get full subscription data
        const { data: fullSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fullSub) {
          setSubscription({
            ...fullSub,
            is_active: sub.is_active,
            days_remaining: sub.days_remaining
          });

          // Show warning if trial is ending soon
          if (sub.plan_type === 'teste_gratis' && sub.days_remaining <= 2 && sub.days_remaining >= 0) {
            toast({
              title: "Teste gratuito encerrando",
              description: `Seu teste gratuito termina em ${sub.days_remaining} dia(s). Faça upgrade para continuar usando o sistema.`,
              variant: "destructive"
            });
          }

          // Update status if expired
          if (!sub.is_active && fullSub.status === 'ativo') {
            await supabase
              .from('subscriptions')
              .update({ status: 'inativo' })
              .eq('barbershop_id', barbershopId);
          }
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  return { subscription, loading, checkSubscription };
};
