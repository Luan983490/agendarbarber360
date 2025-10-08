import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Calendar, Package, Store, Users, DollarSign, Star, Edit, CalendarDays, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import BarbershopSetup from '@/components/BarbershopSetup';
import BarbershopEdit from '@/components/BarbershopEdit';
import ServiceForm from '@/components/ServiceForm';
import ProductForm from '@/components/ProductForm';
import BarberForm from '@/components/BarberForm';
import BookingsManagement from '@/components/BookingsManagement';
import ScheduleManagement from '@/components/ScheduleManagement';
import { BarberBlocksManagement } from '@/components/BarberBlocksManagement';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  email?: string;
  image_url?: string;
  rating?: number;
  total_reviews: number;
  amenities?: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
  is_active: boolean;
}

interface DashboardStats {
  todayBookings: number;
  monthlyRevenue: number;
  totalClients: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    monthlyRevenue: 0,
    totalClients: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { subscription } = useSubscription(barbershop?.id || null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (barbershop) {
      fetchServices();
      fetchProducts();
      fetchBarbers();
      fetchStats();
    }
  }, [barbershop]);

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

  const fetchServices = async () => {
    if (!barbershop) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar serviços",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchBarbers = async () => {
    if (!barbershop) return;

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar barbeiros",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchProducts = async () => {
    if (!barbershop) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchStats = async () => {
    if (!barbershop) return;

    try {
      // Fetch today's bookings
      const today = new Date().toISOString().split('T')[0];
      const { data: todayBookingsData } = await supabase
        .from('bookings')
        .select('id')
        .eq('barbershop_id', barbershop.id)
        .eq('booking_date', today);

      // Fetch monthly revenue
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: monthlyBookingsData } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('barbershop_id', barbershop.id)
        .gte('booking_date', `${currentMonth}-01`)
        .eq('status', 'completed');

      // Fetch total unique clients
      const { data: clientsData } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('barbershop_id', barbershop.id);

      const uniqueClients = new Set(clientsData?.map(booking => booking.client_id)).size;
      const monthlyRevenue = monthlyBookingsData?.reduce((sum, booking) => sum + booking.total_price, 0) || 0;

      setStats({
        todayBookings: todayBookingsData?.length || 0,
        monthlyRevenue,
        totalClients: uniqueClients
      });
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleBarbershopCreated = () => {
    fetchUserProfile(); // Refresh to get the new barbershop data
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
          <BarbershopSetup onBarbershopCreated={handleBarbershopCreated} />
        ) : (
          <>
            {subscription && subscription.plan_type === 'teste_gratis' && subscription.days_remaining <= 2 && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Teste Gratuito Encerrando</AlertTitle>
                <AlertDescription>
                  Seu teste gratuito termina em {subscription.days_remaining} dia(s). 
                  Faça upgrade para continuar usando todas as funcionalidades.
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Agenda
              </TabsTrigger>
              <TabsTrigger value="blocks" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Bloqueios
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="barbers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Barbeiros
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
                    <div className="text-2xl font-bold">{stats.todayBookings}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Receita do Mês
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">R$ {stats.monthlyRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Clientes
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avaliação Média
                    </CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{barbershop.rating?.toFixed(1) || '0.0'}</div>
                    <p className="text-xs text-muted-foreground">{barbershop.total_reviews} avaliações</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações da Barbearia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {barbershop.image_url && (
                    <div className="w-full max-w-md">
                      <img
                        src={barbershop.image_url}
                        alt={barbershop.name}
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p><strong>Nome:</strong> {barbershop.name}</p>
                    <p><strong>Endereço:</strong> {barbershop.address}</p>
                    <p><strong>Telefone:</strong> {barbershop.phone}</p>
                    <p><strong>Descrição:</strong> {barbershop.description}</p>
                    <div className="flex gap-4 mt-4">
                      <div>
                        <strong>Serviços:</strong> {services.length}
                      </div>
                      <div>
                        <strong>Barbeiros:</strong> {barbers.length}
                      </div>
                      <div>
                        <strong>Produtos:</strong> {products.length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit">
              <BarbershopEdit 
                barbershop={{
                  ...barbershop,
                  email: barbershop.email || '',
                  amenities: barbershop.amenities || []
                }} 
                onBarbershopUpdated={fetchUserProfile}
              />
            </TabsContent>

            <TabsContent value="schedule">
              <ScheduleManagement barbershopId={barbershop.id} />
            </TabsContent>

            <TabsContent value="blocks">
              <BarberBlocksManagement barbershopId={barbershop.id} />
            </TabsContent>

            <TabsContent value="bookings">
              <BookingsManagement barbershopId={barbershop.id} />
            </TabsContent>

            <TabsContent value="services">
              <ServiceForm
                barbershopId={barbershop.id}
                services={services}
                onServicesChange={fetchServices}
              />
            </TabsContent>

            <TabsContent value="barbers">
              <BarberForm
                barbershopId={barbershop.id}
                barbers={barbers}
                onBarbersChange={fetchBarbers}
              />
            </TabsContent>

            <TabsContent value="products">
              <ProductForm
                barbershopId={barbershop.id}
                products={products}
                onProductsChange={fetchProducts}
              />
            </TabsContent>
          </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;