import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Calendar, Package, Store, Plus } from 'lucide-react';
import { Header } from '@/components/Header';

interface Profile {
  id: string;
  user_type: string;
  display_name: string;
}

interface Barbershop {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  rating?: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user is a barbershop owner, fetch barbershop data
      if (profileData.user_type === 'barbershop_owner') {
        const { data: barbershopData } = await supabase
          .from('barbershops')
          .select('*')
          .eq('owner_id', user?.id)
          .single();

        setBarbershop(barbershopData);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.user_type !== 'barbershop_owner') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard da Barbearia</h1>
          <p className="text-muted-foreground">
            Gerencie sua barbearia, agendamentos e produtos
          </p>
        </div>

        {!barbershop ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Configure sua Barbearia
              </CardTitle>
              <CardDescription>
                Você precisa configurar os dados da sua barbearia para começar a receber agendamentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Configurar Barbearia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agendamentos
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produtos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Agendamentos Hoje
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Receita do Mês
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">R$ 0,00</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Clientes
                    </CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avaliação Média
                    </CardTitle>
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{barbershop.rating || '0.0'}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações da Barbearia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Nome:</strong> {barbershop.name}</p>
                  <p><strong>Endereço:</strong> {barbershop.address}</p>
                  <p><strong>Telefone:</strong> {barbershop.phone}</p>
                  <p><strong>Descrição:</strong> {barbershop.description}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Agendamentos</CardTitle>
                  <CardDescription>
                    Visualize e gerencie todos os agendamentos da sua barbearia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento encontrado. Os agendamentos aparecerão aqui quando os clientes começarem a agendar.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Serviços</CardTitle>
                    <CardDescription>
                      Gerencie os serviços oferecidos pela sua barbearia
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Serviço
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum serviço cadastrado. Adicione serviços para que os clientes possam agendar.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Produtos</CardTitle>
                    <CardDescription>
                      Gerencie os produtos vendidos pela sua barbearia
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado. Adicione produtos para venda aos clientes.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Dashboard;