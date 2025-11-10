import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Search, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientSubscription {
  id: string;
  plan_name: string;
  plan_description?: string;
  price_monthly: number;
  start_date: string;
  next_billing_date: string;
  status: string;
  benefits?: any;
  barbershop: {
    name: string;
  };
}

const Subscriptions = () => {
  const { user, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select(`
          *,
          barbershop:barbershops(name)
        `)
        .eq('client_id', user?.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar assinaturas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.barbershop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Calendar className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Minhas Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie suas assinaturas ativas aqui. Nesta tela, você pode visualizar todas as suas assinaturas e explorar detalhadamente os serviços e produtos incluídos em cada uma. Mantenha-se atualizado com suas preferências e benefícios exclusivos.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              className="pl-10 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredSubscriptions.length > 0 ? (
            filteredSubscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{subscription.plan_name}</h3>
                          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                            {subscription.status === 'active' ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{subscription.barbershop.name}</p>
                        {subscription.plan_description && (
                          <p className="text-sm text-muted-foreground mt-1">{subscription.plan_description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          R$ {subscription.price_monthly.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">por mês</p>
                      </div>
                    </div>

                    {subscription.benefits && Array.isArray(subscription.benefits) && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Benefícios incluídos:</p>
                        <div className="grid gap-2">
                          {subscription.benefits.map((benefit: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-primary" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 text-sm text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Início: {format(new Date(subscription.start_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Próxima cobrança: {format(new Date(subscription.next_billing_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhuma assinatura encontrada</h3>
                <p className="text-muted-foreground">
                  Você ainda não possui assinaturas ativas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Subscriptions;
