import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import { Header } from '@/components/Header';
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import { BarberBlocksManagement } from '@/components/BarberBlocksManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, TrendingUp, Scissors } from 'lucide-react';
import { toast } from 'sonner';

export default function BarberDashboard() {
  const { user } = useAuth();
  const access = useUserAccess();
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekBookings: 0,
    monthBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (access.barberId) {
      fetchStats();
    }
  }, [access.barberId]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('barber_id', access.barberId)
        .gte('booking_date', monthStart.toISOString().split('T')[0]);

      if (error) throw error;

      const todayStr = today.toISOString().split('T')[0];
      const weekStartStr = weekStart.toISOString().split('T')[0];

      setStats({
        todayBookings: bookings?.filter(b => b.booking_date === todayStr).length || 0,
        weekBookings: bookings?.filter(b => b.booking_date >= weekStartStr).length || 0,
        monthBookings: bookings?.length || 0
      });
    } catch (error: any) {
      toast.error('Erro ao carregar estatísticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (access.loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center h-96">
          <Scissors className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (access.role !== 'barber' || !access.barberId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie sua agenda e bloqueios de horário
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayBookings}</div>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekBookings}</div>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthBookings}</div>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule">Minha Agenda</TabsTrigger>
            <TabsTrigger value="blocks">Bloqueios</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Agenda de Atendimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <BarberScheduleCalendar barbershopId={access.barbershopId!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blocks">
            <BarberBlocksManagement barbershopId={access.barbershopId!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
