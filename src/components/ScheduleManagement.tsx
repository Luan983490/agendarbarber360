import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScheduleCalendar } from './ScheduleCalendar';
import { Loader2, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  barber_id: string | null;
  client: { display_name: string };
  service: { name: string; duration: number; price: number };
  barber: { name: string } | null;
}

interface Barber {
  id: string;
  name: string;
}

interface ScheduleManagementProps {
  barbershopId: string;
}

export const ScheduleManagement = ({ barbershopId }: ScheduleManagementProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
    fetchBookings();

    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_date, booking_time, status, barber_id, service_id, client_id, client_name, is_external_booking')
        .eq('barbershop_id', barbershopId)
        .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (bookingsError) throw bookingsError;

      const serviceIds = [...new Set(bookingsData?.map(b => b.service_id))];
      const barberIds = [...new Set(bookingsData?.map(b => b.barber_id).filter(Boolean))] as string[];
      const clientIds = [...new Set(bookingsData?.map(b => b.client_id).filter(Boolean))] as string[];

      const servicesPromise = supabase.from('services').select('id, name, duration, price').in('id', serviceIds);
      const barbersPromise = barberIds.length > 0 
        ? supabase.from('barbers').select('id, name').in('id', barberIds)
        : Promise.resolve({ data: [], error: null });
      const profilesPromise = clientIds.length > 0
        ? supabase.from('profiles').select('user_id, display_name').in('user_id', clientIds)
        : Promise.resolve({ data: [], error: null });

      const [servicesData, barbersData, profilesData] = await Promise.all([
        servicesPromise,
        barbersPromise,
        profilesPromise
      ]);

      const servicesMap = new Map<string, { id: string; name: string; duration: number; price: number }>();
      servicesData.data?.forEach(s => servicesMap.set(s.id, s));
      
      const barbersMap = new Map<string, { id: string; name: string }>();
      barbersData.data?.forEach(b => barbersMap.set(b.id, b));
      
      const profilesMap = new Map<string, { user_id: string; display_name: string }>();
      profilesData.data?.forEach(p => profilesMap.set(p.user_id, p));

      const mappedBookings: Booking[] = bookingsData?.map(booking => {
        const profile = booking.client_id ? profilesMap.get(booking.client_id) : null;
        
        let clientDisplayName = 'Cliente';
        if (booking.is_external_booking) {
          clientDisplayName = booking.client_name ? `${booking.client_name} (Externo)` : 'Reserva Externa';
        } else {
          clientDisplayName = booking.client_name || profile?.display_name || 'Cliente';
        }
        
        return {
          ...booking,
          service: servicesMap.get(booking.service_id) || { id: '', name: 'N/A', duration: 0, price: 0 },
          barber: booking.barber_id ? (barbersMap.get(booking.barber_id) || null) : null,
          client: {
            user_id: booking.client_id || '',
            display_name: clientDisplayName
          }
        };
      }) || [];

      setBookings(mappedBookings);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar agendamentos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O agendamento foi atualizado com sucesso.'
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredBookings = selectedBarber === 'all'
    ? bookings
    : bookings.filter(b => b.barber_id === selectedBarber);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Controle de Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filtrar por barbeiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os barbeiros</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScheduleCalendar
            bookings={filteredBookings}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />

          {selectedDate && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Ações de Agendamento</h3>
              <div className="space-y-4">
                {filteredBookings
                  .filter(b => new Date(b.booking_date).toDateString() === selectedDate.toDateString())
                  .map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-lg">{booking.booking_time}</p>
                              <Badge className={cn(getStatusColor(booking.status), "text-white")}>
                                {getStatusText(booking.status)}
                              </Badge>
                            </div>
                            <p className="text-sm">Cliente: {booking.client?.display_name || 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">
                              Serviço: {booking.service?.name || 'N/A'}
                            </p>
                            {booking.barber && (
                              <p className="text-sm text-muted-foreground">
                                Barbeiro: {booking.barber.name}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {booking.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  className="gap-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  className="gap-2"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                                  className="gap-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Concluir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  className="gap-2"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleManagement;
