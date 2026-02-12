import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, ArrowLeft, Loader2, Crown, Users, Building, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import b360Logo from '@/assets/b360-logo.png';

type BillingPeriod = 'monthly' | 'semiannual' | 'annual';

interface StripePlan {
  id: string;
  plan_code: string;
  plan_name: string;
  description: string | null;
  stripe_price_id: string;
  max_professionals: number;
  billing_period: string;
  price_monthly: number;
  price_total: number;
  discount_percentage: number | null;
  is_active: boolean | null;
}

interface PlanGroup {
  max_professionals: number;
  plan_name: string;
  plans: Record<string, StripePlan>;
}

const periodLabels: Record<BillingPeriod, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const planIcons: Record<number, React.ElementType> = {
  1: Crown,
  5: Users,
  15: Building,
  999: Sparkles,
};

const planFeatures: Record<number, string[]> = {
  1: ['1 profissional', 'Agendamento online', 'Gestão de clientes', 'Notificações WhatsApp'],
  5: ['Até 5 profissionais', 'Tudo do plano anterior', 'Relatórios básicos', 'Suporte por email'],
  15: ['Até 15 profissionais', 'Tudo do plano anterior', 'Relatórios avançados', 'Suporte prioritário'],
  999: ['Profissionais ilimitados', 'Tudo do plano anterior', 'Gerente dedicado', 'Personalização completa'],
};

const PlansPage = () => {
  const navigate = useNavigate();
  const { barbershopId } = useUserAccess();
  const { subscription, trial } = useSubscription(barbershopId || null);
  const { toast } = useToast();
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_plans')
        .select('*')
        .eq('is_active', true)
        .order('max_professionals', { ascending: true })
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar planos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const groupedPlans = plans.reduce<PlanGroup[]>((acc, plan) => {
    let group = acc.find((g) => g.max_professionals === plan.max_professionals);
    if (!group) {
      group = { max_professionals: plan.max_professionals, plan_name: plan.plan_name, plans: {} };
      acc.push(group);
    }
    group.plans[plan.billing_period] = plan;
    return acc;
  }, []);

  const handleSubscribe = async (stripePriceId: string) => {
    if (!barbershopId) {
      toast({ title: 'Erro', description: 'Barbearia não encontrada.', variant: 'destructive' });
      return;
    }

    setSubscribing(stripePriceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: stripePriceId, barbershopId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      toast({ title: 'Erro ao iniciar checkout', description: error.message, variant: 'destructive' });
    } finally {
      setSubscribing(null);
    }
  };

  const getMostPopularIndex = () => {
    // Second plan (5 professionals) is most popular
    return groupedPlans.findIndex((g) => g.max_professionals === 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando planos...</p>
        </div>
      </div>
    );
  }

  const popularIndex = getMostPopularIndex();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Escolha seu Plano</h1>
              <p className="text-sm text-muted-foreground">
                Selecione o plano ideal para sua barbearia
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Current subscription info */}
        {subscription?.plan_type === 'teste_gratis' && trial ? (
          <div className="mb-6 p-4 rounded-lg border border-emerald-700/30 bg-emerald-950/30">
            <p className="text-sm text-emerald-300">
              Plano atual:{' '}
              <span className="font-semibold text-emerald-400">
                Teste Grátis — {trial.days_left} {trial.days_left === 1 ? 'dia restante' : 'dias restantes'}
              </span>
            </p>
          </div>
        ) : subscription?.status === 'ativo' && subscription.stripe_plan ? (
          <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-sm text-muted-foreground">
              Plano atual:{' '}
              <span className="font-semibold text-primary">
                {subscription.stripe_plan.plan_name} - {periodLabels[subscription.stripe_plan.billing_period as BillingPeriod] || subscription.stripe_plan.billing_period}
              </span>
            </p>
          </div>
        ) : null}

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
            {(['monthly', 'semiannual', 'annual'] as BillingPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  billingPeriod === period
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {periodLabels[period]}
                {period === 'annual' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    -30%
                  </span>
                )}
                {period === 'semiannual' && (
                  <span className="absolute -top-2 -right-2 text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    -15%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {groupedPlans.map((group, index) => {
            const plan = group.plans[billingPeriod] || group.plans['monthly'];
            if (!plan) return null;

            const isPopular = index === popularIndex;
            const IconComponent = planIcons[group.max_professionals] || Crown;
            const features = planFeatures[group.max_professionals] || [];
            const isCurrentPlan =
              subscription?.status === 'ativo' &&
              subscription?.stripe_plan?.max_professionals === group.max_professionals;

            return (
              <Card
                key={group.max_professionals}
                className={cn(
                  'relative flex flex-col transition-all duration-300 hover:shadow-lg',
                  isPopular
                    ? 'border-primary shadow-glow ring-1 ring-primary/20 scale-[1.02]'
                    : 'border-border hover:border-primary/30',
                  isCurrentPlan && 'border-emerald-500/50 bg-emerald-950/10'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow-md">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-emerald-600 text-white px-3 py-1 text-xs font-bold">
                      Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2 pt-6">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground">{group.plan_name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {group.max_professionals === 999
                      ? 'Profissionais ilimitados'
                      : group.max_professionals === 1
                      ? '1 profissional'
                      : `Até ${group.max_professionals} profissionais`}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 text-center">
                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-3xl font-bold text-foreground">
                        {Number(plan.price_monthly).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    {billingPeriod !== 'monthly' && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          Total: R$ {Number(plan.price_total).toFixed(2).replace('.', ',')}
                          {billingPeriod === 'semiannual' ? ' /6 meses' : ' /ano'}
                        </p>
                        {plan.discount_percentage && plan.discount_percentage > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-900/50 text-emerald-400 border-emerald-700/30">
                            Economize {plan.discount_percentage}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 text-left">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button
                    className="w-full"
                    variant={isPopular ? 'gradient' : 'default'}
                    disabled={!!subscribing || isCurrentPlan}
                    onClick={() => handleSubscribe(plan.stripe_price_id)}
                  >
                    {subscribing === plan.stripe_price_id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : (
                      'Assinar'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ / Help */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Dúvidas? Entre em contato pelo WhatsApp ou email.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Todos os planos incluem 30 dias de garantia. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
