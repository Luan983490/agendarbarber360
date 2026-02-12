import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ExternalLink, ArrowLeft, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import b360Logo from '@/assets/b360-logo.png';

const periodLabels: Record<string, string> = {
  monthly: 'Mensal',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const SubscriptionSettings = () => {
  const navigate = useNavigate();
  const { barbershopId } = useUserAccess();
  const { trial, subscription, isLoading } = useSubscription(barbershopId || null);
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManagePayment = async () => {
    if (!barbershopId) return;

    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal', {
        body: { barbershopId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao abrir portal de pagamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-12 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Determine status
  const isTesteGratis = subscription?.plan_type === 'teste_gratis';
  const hasActiveSubscription = subscription?.status === 'ativo' && !isTesteGratis;
  const isCanceled =
    subscription?.status === 'cancelado' ||
    (subscription?.cancel_at_period_end && subscription?.current_period_end);
  const isExpired =
    !hasActiveSubscription &&
    !isTesteGratis &&
    !isCanceled &&
    trial?.is_expired;
  const isInTrial = (isTesteGratis && trial && !trial.is_expired) || 
                    (trial && !trial.is_expired && !hasActiveSubscription && !isCanceled);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Assinatura</h2>
          <p className="text-sm text-muted-foreground">Gerencie seu plano e pagamentos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Status da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TRIAL / TESTE GRATIS */}
          {isInTrial && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-700/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Período de Teste Gratuito
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Dias restantes</p>
                  <p className="text-lg font-bold text-foreground">
                    {trial!.days_left} {trial!.days_left === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Expira em</p>
                  <p className="text-lg font-bold text-foreground">{formatDate(trial!.trial_end_date)}</p>
                </div>
              </div>
              <Button onClick={() => navigate('/planos')} className="w-full sm:w-auto">
                Assinar um Plano
              </Button>
            </>
          )}

          {/* ACTIVE PAID SUBSCRIPTION */}
          {hasActiveSubscription && !isCanceled && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-700/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativa
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-sm font-bold text-foreground">
                    {subscription!.stripe_plan?.plan_name || subscription!.plan_type}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="text-sm font-bold text-foreground">
                    {periodLabels[subscription!.stripe_plan?.billing_period || ''] ||
                      subscription!.stripe_plan?.billing_period || '-'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-sm font-bold text-foreground">
                    R$ {Number(subscription!.stripe_plan?.price_monthly || 0).toFixed(2).replace('.', ',')}/mês
                  </p>
                </div>
              </div>
              {subscription!.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Próxima cobrança: <span className="font-medium text-foreground">{formatDate(subscription!.current_period_end)}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate('/planos')}>
                  Alterar Plano
                </Button>
                <Button variant="outline" onClick={handleManagePayment} disabled={portalLoading}>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Gerenciar Pagamento
                </Button>
              </div>
            </>
          )}

          {/* CANCELED (still has access) */}
          {isCanceled && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-amber-900/50 text-amber-400 border-amber-700/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Assinatura Cancelada
                </Badge>
              </div>
              {subscription?.current_period_end && (
                <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/30">
                  <p className="text-sm text-amber-300">
                    Acesso até:{' '}
                    <span className="font-bold">{formatDate(subscription.current_period_end)}</span>
                  </p>
                  <p className="text-xs text-amber-400/70 mt-1">
                    ⚠️ Após essa data, você perderá o acesso ao sistema.
                  </p>
                </div>
              )}
              <Button onClick={() => navigate('/planos')}>Reativar Assinatura</Button>
            </>
          )}

          {/* EXPIRED */}
          {isExpired && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Sem Assinatura Ativa
                </Badge>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">
                  ⚠️ Seu acesso ao sistema expirou. Assine um plano para continuar usando todas as funcionalidades.
                </p>
              </div>
              <Button onClick={() => navigate('/planos')}>Ver Planos</Button>
            </>
          )}

          {/* Fallback if no state matches */}
          {!isInTrial && !hasActiveSubscription && !isCanceled && !isExpired && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Sem Assinatura Ativa
                </Badge>
              </div>
              <Button onClick={() => navigate('/planos')}>Ver Planos</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSettings;
