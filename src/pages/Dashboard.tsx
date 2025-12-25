import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import { PackagesManagement } from '@/components/PackagesManagement';
import { SubscriptionsManagement } from '@/components/SubscriptionsManagement';
import { LoyaltyManagement } from '@/components/LoyaltyManagement';
import { StaffManagement } from '@/components/StaffManagement';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';

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
  user_id?: string | null;
}

interface DashboardStats {
  todayBookings: number;
  monthlyRevenue: number;
  totalClients: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { userType, loading: roleLoading } = useUserRole();
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
  const [currentTab, setCurrentTab] = useState('bookings');
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

  if (authLoading || loading || roleLoading) {
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

  // Acesso ao Dashboard já é garantido pelo <ProtectedRoute allowedRoles={['owner']}> em App.tsx.
  // Evitamos redirecionamentos extras aqui para não criar loops/travamentos em produção.

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Agend. Hoje
                  </CardTitle>
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-lg sm:text-2xl font-bold">{stats.todayBookings}</div>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Receita Mês
                  </CardTitle>
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-sm sm:text-2xl font-bold truncate">R$ {stats.monthlyRevenue.toFixed(0)}</div>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Clientes
                  </CardTitle>
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-lg sm:text-2xl font-bold">{stats.totalClients}</div>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Avaliação
                  </CardTitle>
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-lg sm:text-2xl font-bold">{barbershop?.rating?.toFixed(1) || '0.0'}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{barbershop?.total_reviews} avaliações</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Informações da Barbearia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                {barbershop?.image_url && (
                  <div className="w-full">
                    <img
                      src={barbershop.image_url}
                      alt={barbershop.name}
                      className="w-full h-32 sm:h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <p className="truncate"><strong>Nome:</strong> {barbershop?.name}</p>
                  <p className="truncate"><strong>Endereço:</strong> {barbershop?.address}</p>
                  <p><strong>Telefone:</strong> {barbershop?.phone}</p>
                  <p className="line-clamp-2"><strong>Descrição:</strong> {barbershop?.description}</p>
                  <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm">
                    <div className="bg-muted px-2 py-1 rounded">
                      <strong>Serviços:</strong> {services.length}
                    </div>
                    <div className="bg-muted px-2 py-1 rounded">
                      <strong>Barbeiros:</strong> {barbers.length}
                    </div>
                    <div className="bg-muted px-2 py-1 rounded">
                      <strong>Produtos:</strong> {products.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'edit':
        return (
          <BarbershopEdit 
            barbershop={{
              ...barbershop!,
              email: barbershop?.email || '',
              amenities: barbershop?.amenities || []
            }} 
            onBarbershopUpdated={fetchUserProfile}
          />
        );
      case 'bookings':
        return <div className="h-full"><BarberScheduleCalendar barbershopId={barbershop!.id} /></div>;
      case 'schedule':
        return <BookingsManagement barbershopId={barbershop!.id} />;
      case 'services':
        return (
          <ServiceForm
            barbershopId={barbershop!.id}
            services={services}
            onServicesChange={fetchServices}
          />
        );
      case 'barbers':
        return (
          <BarberForm
            barbershopId={barbershop!.id}
            barbers={barbers}
            onBarbersChange={fetchBarbers}
          />
        );
      case 'products':
        return (
          <ProductForm
            barbershopId={barbershop!.id}
            products={products}
            onProductsChange={fetchProducts}
          />
        );
      case 'packages':
        return <PackagesManagement barbershopId={barbershop!.id} />;
      case 'subscriptions':
        return <SubscriptionsManagement barbershopId={barbershop!.id} />;
      case 'loyalty':
        return <LoyaltyManagement />;
      case 'staff':
        return <StaffManagement barbershopId={barbershop!.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      
      {!barbershop ? (
        <main className="container mx-auto px-4 py-8 mt-16 overflow-y-auto flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard da Barbearia</h1>
            <p className="text-muted-foreground">
              Gerencie sua barbearia, agendamentos e produtos
            </p>
          </div>
          <BarbershopSetup onBarbershopCreated={handleBarbershopCreated} />
        </main>
      ) : (
        <SidebarProvider>
          <div className="flex flex-1 w-full mt-16 h-[calc(100vh-64px)] overflow-hidden">
            <DashboardSidebar currentTab={currentTab} onTabChange={setCurrentTab} />
            
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <div className="shrink-0 bg-background border-b px-3 py-2 sm:px-4 sm:py-3 lg:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl lg:text-3xl font-bold truncate">Dashboard</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                      Gerencie sua barbearia
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
                {subscription && subscription.plan_type === 'teste_gratis' && subscription.days_remaining <= 2 && (
                  <Alert variant="destructive" className="mb-4 sm:mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">Teste Gratuito Encerrando</AlertTitle>
                    <AlertDescription className="text-xs sm:text-sm">
                      Seu teste gratuito termina em {subscription.days_remaining} dia(s). 
                      Faça upgrade para continuar usando todas as funcionalidades.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="h-full">
                  {renderContent()}
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
};

export default Dashboard;