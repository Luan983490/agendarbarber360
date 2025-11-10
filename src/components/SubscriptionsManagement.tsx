import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Users, TrendingUp, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientSubscription {
  id: string;
  client_id: string;
  plan_name: string;
  plan_description: string | null;
  price_monthly: number;
  status: string;
  start_date: string;
  next_billing_date: string;
  profiles?: {
    display_name: string;
    phone: string;
  };
}

interface SubscriptionsManagementProps {
  barbershopId: string;
}

export const SubscriptionsManagement = ({ barbershopId }: SubscriptionsManagementProps) => {
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, [barbershopId]);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados dos perfis separadamente
      if (data && data.length > 0) {
        const clientIds = data.map(s => s.client_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, phone')
          .in('user_id', clientIds);

        // Mapear perfis aos subscriptions
        const subscriptionsWithProfiles = data.map(sub => ({
          ...sub,
          profiles: profilesData?.find(p => p.user_id === sub.client_id),
        }));

        setSubscriptions(subscriptionsWithProfiles as any);

        // Calculate stats
        const total = data?.length || 0;
        const active = data?.filter(s => s.status === 'active').length || 0;
        const revenue = data
          ?.filter(s => s.status === 'active')
          .reduce((sum, s) => sum + Number(s.price_monthly), 0) || 0;

        setStats({
          totalSubscriptions: total,
          activeSubscriptions: active,
          monthlyRevenue: revenue,
        });
      } else {
        setSubscriptions([]);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar assinaturas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativa' },
      cancelled: { variant: 'destructive', label: 'Cancelada' },
      suspended: { variant: 'secondary', label: 'Suspensa' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CreditCard className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Assinaturas</h2>
        <p className="text-muted-foreground">
          Acompanhe as assinaturas dos seus clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Assinaturas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assinaturas Ativas
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Mensal Recorrente
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.monthlyRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinaturas de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma assinatura cadastrada ainda.</p>
              <p className="text-sm">
                As assinaturas serão criadas quando os clientes contratarem planos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Próxima Cobrança</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {subscription.profiles?.display_name || 'Cliente'}
                          </p>
                          {subscription.profiles?.phone && (
                            <p className="text-sm text-muted-foreground">
                              {subscription.profiles.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{subscription.plan_name}</p>
                          {subscription.plan_description && (
                            <p className="text-sm text-muted-foreground">
                              {subscription.plan_description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(subscription.price_monthly).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>
                        {format(new Date(subscription.start_date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(
                            new Date(subscription.next_billing_date),
                            'dd/MM/yyyy',
                            { locale: ptBR }
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
