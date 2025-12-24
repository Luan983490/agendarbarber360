import { useState, useEffect } from 'react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/layouts/BarberLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, User, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface TodayBooking {
  id: string;
  booking_time: string;
  client_name: string | null;
  status: string;
  service: {
    name: string;
    duration: number;
  };
  client?: {
    display_name: string | null;
  };
}

export default function BarberHoje() {
  const { barberId, barbershopId, loading: accessLoading } = useUserAccess();
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('hoje');
  const navigate = useNavigate();

  useEffect(() => {
    if (barberId) {
      fetchTodayBookings();
    }
  }, [barberId]);

  const fetchTodayBookings = async () => {
    if (!barberId) {
      setLoading(false);
      return;
    }
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_time, client_name, status, client_id, service_id')
        .eq('barber_id', barberId)
        .eq('booking_date', today)
        .neq('status', 'cancelled')
        .order('booking_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Buscar serviços e perfis separadamente
      const serviceIds = [...new Set(bookingsData?.map(b => b.service_id) || [])];
      const clientIds = [...new Set(bookingsData?.filter(b => b.client_id).map(b => b.client_id) || [])] as string[];

      const [servicesResult, profilesResult] = await Promise.all([
        serviceIds.length > 0 
          ? supabase.from('services').select('id, name, duration').in('id', serviceIds)
          : Promise.resolve({ data: [], error: null }),
        clientIds.length > 0 
          ? supabase.from('profiles').select('user_id, display_name').in('user_id', clientIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const servicesMap = new Map<string, { name: string; duration: number }>();
      servicesResult.data?.forEach(s => servicesMap.set(s.id, { name: s.name, duration: s.duration }));

      const profilesMap = new Map<string, string>();
      profilesResult.data?.forEach(p => profilesMap.set(p.user_id, p.display_name));

      // Mapear os dados
      const mappedBookings: TodayBooking[] = bookingsData?.map(b => ({
        id: b.id,
        booking_time: b.booking_time,
        client_name: b.client_name,
        status: b.status || 'pending',
        service: servicesMap.get(b.service_id) || { name: 'Serviço', duration: 30 },
        client: b.client_id ? { display_name: profilesMap.get(b.client_id) || null } : undefined
      })) || [];

      setBookings(mappedBookings);
    } catch (error: any) {
      toast.error('Erro ao carregar agendamentos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Atendimento concluído!');
      fetchTodayBookings();
    } catch (error: any) {
      toast.error('Erro ao marcar como concluído');
      console.error(error);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'agenda') {
      navigate('/barber/agenda');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getClientName = (booking: TodayBooking) => {
    return booking.client_name || booking.client?.display_name || 'Cliente não identificado';
  };

  if (accessLoading || loading) {
    return (
      <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
        <div className="flex-1 flex items-center justify-center">
          <Scissors className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BarberLayout>
    );
  }

  return (
    <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 lg:px-6">
        <h1 className="text-xl lg:text-2xl font-bold">Hoje</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum agendamento hoje</h3>
              <p className="text-muted-foreground text-center">
                Você não tem atendimentos marcados para hoje.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {bookings.length} agendamento{bookings.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 rounded-lg p-3">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold">
                            {booking.booking_time.slice(0, 5)}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{getClientName(booking)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Scissors className="h-4 w-4" />
                          <span>{booking.service?.name}</span>
                          <span className="text-xs">({booking.service?.duration} min)</span>
                        </div>
                      </div>
                    </div>

                    {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                      <Button
                        onClick={() => handleComplete(booking.id)}
                        size="sm"
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Concluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BarberLayout>
  );
}
