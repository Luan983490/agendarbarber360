import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Scissors, CalendarDays, User } from 'lucide-react';
import { Header } from '@/components/Header';
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';

interface BarberInfo {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  image_url?: string;
  barbershop_id: string;
  barbershop: {
    name: string;
  };
}

interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
}

const BarberDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { userType, barberId, barbershopId, loading: roleLoading } = useUserRole();
  const [barberInfo, setBarberInfo] = useState<BarberInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    weekBookings: 0,
    monthBookings: 0
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (barberId) {
      fetchBarberInfo();
      fetchStats();
      fetchBookings();
    }
  }, [barberId]);

  const fetchBarberInfo = async () => {
    if (!barberId) return;

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          barbershop:barbershops(name)
        `)
        .eq('id', barberId)
        .single();

      if (error) throw error;
      setBarberInfo(data as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar informações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!barberId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthStart = new Date().toISOString().slice(0, 7) + '-01';

      const [todayData, weekData, monthData] = await Promise.all([
        supabase
          .from('bookings')
          .select('id')
          .eq('barber_id', barberId)
          .eq('booking_date', today),
        supabase
          .from('bookings')
          .select('id')
          .eq('barber_id', barberId)
          .gte('booking_date', weekAgo),
        supabase
          .from('bookings')
          .select('id')
          .eq('barber_id', barberId)
          .gte('booking_date', monthStart)
      ]);

      setStats({
        todayBookings: todayData.data?.length || 0,
        weekBookings: weekData.data?.length || 0,
        monthBookings: monthData.data?.length || 0
      });
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const fetchBookings = async () => {
    if (!barberId) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(display_name),
          service:services(name)
        `)
        .eq('barber_id', barberId)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (authLoading || roleLoading || loading) {
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

  if (userType !== 'barber') {
    return <Navigate to="/" replace />;
  }

  if (!barberInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você não está cadastrado como barbeiro. Entre em contato com o administrador da barbearia.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel do Barbeiro</h1>
          <p className="text-muted-foreground">
            {barberInfo.name} - {barberInfo.barbershop.name}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Agenda Completa
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Hoje
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayBookings}</div>
                  <p className="text-xs text-muted-foreground">agendamentos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Esta Semana
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.weekBookings}</div>
                  <p className="text-xs text-muted-foreground">agendamentos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Este Mês
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.monthBookings}</div>
                  <p className="text-xs text-muted-foreground">agendamentos</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Barbeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {barberInfo.image_url && (
                  <div className="w-32 h-32">
                    <img
                      src={barberInfo.image_url}
                      alt={barberInfo.name}
                      className="w-full h-full object-cover rounded-full border"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {barberInfo.name}</p>
                  {barberInfo.specialty && (
                    <p><strong>Especialidade:</strong> {barberInfo.specialty}</p>
                  )}
                  {barberInfo.phone && (
                    <p><strong>Telefone:</strong> {barberInfo.phone}</p>
                  )}
                  <p><strong>Barbearia:</strong> {barberInfo.barbershop.name}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <BarberScheduleCalendar barbershopId={barbershopId!} />
          </TabsContent>

          <TabsContent value="calendar">
            <ScheduleCalendar 
              bookings={bookings}
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BarberDashboard;
