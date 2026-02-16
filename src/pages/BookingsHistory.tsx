import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Calendar, Search, SlidersHorizontal, MapPin, Clock, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientBottomNav } from '@/components/ClientBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  barbershop: {
    name: string;
    address: string;
  };
  service: {
    name: string;
  };
  barber?: {
    name: string;
  };
}

const BookingsHistory = () => {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          barbershop:barbershops(name, address),
          service:services(name),
          barber:barbers(name)
        `)
        .eq('client_id', user?.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      completed: { label: 'Concluído', variant: 'secondary' },
      cancelled: { label: 'Cancelado', variant: 'destructive' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.barbershop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const bookingDate = new Date(booking.booking_date);
    const matchesStartDate = !startDate || bookingDate >= new Date(startDate);
    const matchesEndDate = !endDate || bookingDate <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Scissors className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Header />}
      
      <main className={`container mx-auto px-4 py-8 ${isMobile ? 'pb-24' : 'mt-16'}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Histórico de agendamentos</h1>
          <p className="text-muted-foreground">
            Explore seu histórico de agendamentos. Use o filtro de data para revisitar seus agendamentos anteriores e planejar seus próximos cortes com maior facilidade.
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              className="pl-10 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Filtrando de:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-muted-foreground">até:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => {
              const statusInfo = getStatusBadge(booking.status);
              return (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{booking.barbershop.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {booking.barbershop.address}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            {format(new Date(booking.booking_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            {booking.booking_time.substring(0, 5)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Scissors className="h-4 w-4 text-primary" />
                          <span>{booking.service.name}</span>
                          {booking.barber && (
                            <>
                              <span>•</span>
                              <span>{booking.barber.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        <p className="font-bold text-lg">
                          R$ {booking.total_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Nenhum agendamento encontrado no período</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros para encontrar seus agendamentos
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      {isMobile && <ClientBottomNav />}
    </div>
  );
};

export default BookingsHistory;
