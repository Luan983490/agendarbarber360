import { useEffect, useState, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Calendar, Package, Store, Users, DollarSign, Star, Edit, CalendarDays, AlertCircle, ChevronDown, ChevronUp, User as UserIcon, Settings as SettingsIcon, LogOut as LogOutIcon, Menu } from 'lucide-react';
import BarbershopSetup from '@/components/BarbershopSetup';
import BarbershopEdit from '@/components/BarbershopEdit';
import ServiceForm from '@/components/ServiceForm';
import ProductForm from '@/components/ProductForm';
import BarberForm from '@/components/BarberForm';
import BookingsManagement from '@/components/BookingsManagement';
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import { BlockSchedulePanel } from '@/components/BlockSchedulePanel';
import { PackagesManagement } from '@/components/PackagesManagement';
import { SubscriptionsManagement } from '@/components/SubscriptionsManagement';
import { LoyaltyManagement } from '@/components/LoyaltyManagement';
import { StaffManagement } from '@/components/StaffManagement';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { useSubscription } from '@/hooks/useSubscription';
import { TrialBanner } from '@/components/TrialBanner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import b360Logo from '@/assets/b360-logo.png';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

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
  barbershop_id: string;
}

interface DashboardStats {
  todayBookings: number;
  monthlyRevenue: number;
  totalClients: number;
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { userType, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  
  // FONTE ÚNICA DE VERDADE: selectedBarberId gerenciado EXCLUSIVAMENTE no Dashboard
  const STORAGE_KEY_SELECTED_BARBER = 'barber360_selected_barber_id';
  const [selectedBarber, setSelectedBarber] = useState<string>(() => {
    // Reidratar do localStorage no mount
    return localStorage.getItem(STORAGE_KEY_SELECTED_BARBER) || '';
  });
  const [isBarberHydrated, setIsBarberHydrated] = useState(false);
  
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    monthlyRevenue: 0,
    totalClients: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('bookings');
  const [blockPanelOpen, setBlockPanelOpen] = useState(false);
  const { toast } = useToast();
  const { subscription, trial } = useSubscription(barbershop?.id || null);
  const isMobile = useIsMobile();
  
  // Ref para função de refresh do calendário
  const calendarRefreshRef = useRef<(() => void) | null>(null);

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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const barbersData = data || [];
      setBarbers(barbersData);
      
      // HIDRATAÇÃO: executar somente uma vez
      if (!isBarberHydrated) {
        const savedBarberId = selectedBarber; // Já reidratado do localStorage no useState
        
        // Se barbeiro salvo existe e está na lista, manter
        if (savedBarberId && barbersData.some(b => b.id === savedBarberId)) {
          // Já está correto, não fazer nada
        }
        // Se não existe ou não está na lista, usar o primeiro (fallback ÚNICO)
        else if (barbersData.length > 0) {
          const firstBarberId = barbersData[0].id;
          setSelectedBarber(firstBarberId);
          localStorage.setItem(STORAGE_KEY_SELECTED_BARBER, firstBarberId);
        }
        
        setIsBarberHydrated(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar barbeiros",
        description: error.message,
        variant: "destructive"
      });
      // Mesmo com erro, marcar como hidratado para não travar
      if (!isBarberHydrated) {
        setIsBarberHydrated(true);
      }
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

  const handleBlockSuccess = () => {
    // Chamar refresh do calendário
    if (calendarRefreshRef.current) {
      calendarRefreshRef.current();
    }
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
        return (
          <div className="flex flex-col xl:flex-row gap-4 h-full min-h-0" style={{ backgroundColor: '#000000' }}>
            {/* Botão Bloquear Horários - Mobile/Tablet (no topo) */}
            <div className="xl:hidden flex-shrink-0 px-1">
              <Sheet open={blockPanelOpen} onOpenChange={setBlockPanelOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 text-xs sm:text-sm">
                      <CalendarDays className="h-4 w-4" />
                      Bloquear Horários
                    </span>
                    {blockPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-3 sm:p-6">
                  <BlockSchedulePanel 
                    barbershopId={barbershop!.id} 
                    selectedBarberId={selectedBarber}
                    onBlockSuccess={() => {
                      handleBlockSuccess();
                      setBlockPanelOpen(false);
                    }}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Calendário Principal - ocupa toda altura disponível */}
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <BarberScheduleCalendar 
                barbershopId={barbershop!.id} 
                barberIdFilter={selectedBarber}
                onRefreshRef={calendarRefreshRef}
              />
            </div>
            
            {/* Painel de Bloqueio - Desktop (sem scroll próprio) */}
            <div className="hidden xl:block w-72 2xl:w-80 flex-shrink-0">
              <BlockSchedulePanel 
                barbershopId={barbershop!.id} 
                selectedBarberId={selectedBarber}
                onBlockSuccess={handleBlockSuccess}
              />
            </div>
          </div>
        );
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
      case 'reports':
        return <ReportsPage barbershopId={barbershop!.id} />;
      default:
        return null;
    }
  };

  // Componente Header que usa useSidebar
  const DashboardHeader = () => {

    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b border-gray-800">
        <div className="w-full px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <a href="/" className="flex items-center">
                <img src={b360Logo} alt="B360" className="h-12 sm:h-14" />
              </a>
            </div>

            {/* Seletor de Barbeiro no Header (quando na aba de agenda) */}
            {barbershop && currentTab === 'bookings' && barbers.length > 0 && (
              <div className="flex items-center gap-2 flex-1 justify-center max-w-xs sm:max-w-sm">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Profissionais:</span>
                <Select 
                  value={selectedBarber} 
                  onValueChange={(newBarberId) => {
                    // Persistir no localStorage e atualizar estado
                    localStorage.setItem(STORAGE_KEY_SELECTED_BARBER, newBarberId);
                    setSelectedBarber(newBarberId);
                  }}
                >
                  <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-[120px] sm:w-[160px] bg-background">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Área de Perfil com Dropdown */}
            <div className="flex items-center gap-1 sm:gap-2">
              {user && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarFallback className="text-xs sm:text-sm bg-primary text-primary-foreground">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <div className="px-2 py-1.5 text-xs sm:text-sm">
                      <p className="font-medium truncate">{profile?.display_name || 'Usuário'}</p>
                      <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        navigate('/perfil');
                      }}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                        navigate('/perfil?tab=security');
                      }}
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        signOut();
                      }}
                    >
                      <LogOutIcon className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  };

  // Header simples para quando não tem barbearia
  const SimpleHeader = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b border-gray-800">
      <div className="w-full px-2 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <a href="/" className="flex items-center shrink-0">
            <img src={b360Logo} alt="B360" className="h-10 sm:h-12" />
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="text-xs sm:text-sm bg-primary text-primary-foreground">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <div className="px-2 py-1.5 text-xs sm:text-sm">
                    <p className="font-medium truncate">{profile?.display_name || 'Usuário'}</p>
                    <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      navigate('/perfil');
                    }}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      signOut();
                    }}
                  >
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SimpleHeader />
        <main className="container mx-auto px-4 py-8 mt-14">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard da Barbearia</h1>
            <p className="text-muted-foreground">
              Gerencie sua barbearia, agendamentos e produtos
            </p>
          </div>
          <BarbershopSetup onBarbershopCreated={handleBarbershopCreated} />
        </main>
      </div>
    );
  }

  const isAgendaTab = currentTab === 'bookings';

  return (
    <SidebarProvider>
      <div className={cn("bg-background flex flex-col w-full min-h-screen", isAgendaTab && "max-lg:h-screen max-lg:overflow-hidden max-lg:min-h-0")}>
        <DashboardHeader />
        
        <div className={cn("flex flex-1 w-full pt-14", isAgendaTab && "max-lg:min-h-0")}>
          {/* Sidebar Fixo - hidden on mobile */}
          <div className="hidden lg:block sticky top-14 h-[calc(100vh-56px)] z-40">
            <DashboardSidebar currentTab={currentTab} onTabChange={setCurrentTab} />
          </div>
          
          <main className={cn("flex-1 flex flex-col w-full min-w-0", isAgendaTab && "max-lg:min-h-0")}>
            {/* Conteúdo - área principal */}
            <div className={cn(
              "flex-1 flex flex-col",
              isAgendaTab ? "p-0 lg:p-6 max-lg:min-h-0 pb-14 lg:pb-0" : "p-3 sm:p-4 lg:p-6 pb-16 lg:pb-0"
            )}>
              <TrialBanner barbershopId={barbershop?.id || null} />

              <div className={cn("flex-1 flex flex-col", isAgendaTab && "max-lg:min-h-0")}>
                {renderContent()}
              </div>
            </div>
          </main>
        </div>

        {/* Bottom Nav - mobile only */}
        <MobileBottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;