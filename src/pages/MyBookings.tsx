import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Calendar, Clock, MapPin, User, Scissors, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  notes?: string;
  barbershop: {
    name: string;
    address: string;
    phone: string;
  };
  service: {
    name: string;
    duration: number;
  };
  barber?: {
    name: string;
    specialty?: string;
  };
  booking_products?: Array<{
    quantity: number;
    unit_price: number;
    product: {
      name: string;
    };
  }>;
}

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
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
          barbershop:barbershops(name, address, phone),
          service:services(name, duration),
          barber:barbers(name, specialty),
          booking_products(
            quantity,
            unit_price,
            product:products(name)
          )
        `)
        .eq('client_id', user?.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmado', variant: 'default' as const, icon: CheckCircle };
      case 'completed':
        return { label: 'Concluído', variant: 'secondary' as const, icon: CheckCircle };
      case 'cancelled':
        return { label: 'Cancelado', variant: 'destructive' as const, icon: XCircle };
      default:
        return { label: 'Pendente', variant: 'outline' as const, icon: AlertCircle };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const isUpcoming = (bookingDate: string) => {
    const booking = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return booking >= today;
  };

  const upcomingBookings = bookings.filter(booking => 
    isUpcoming(booking.booking_date) && booking.status !== 'cancelled'
  );

  const pastBookings = bookings.filter(booking => 
    !isUpcoming(booking.booking_date) || booking.status === 'cancelled'
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Carregando agendamentos...</p>
        </div>
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
          <h1 className="text-3xl font-bold mb-2">Meus Agendamentos</h1>
          <p className="text-muted-foreground">
            Acompanhe seus agendamentos e histórico de serviços
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximos ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Histórico ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {booking.barbershop.name}
                            <Badge variant={statusInfo.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4" />
                            {booking.barbershop.address}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            R$ {booking.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">Data:</span>
                            <span>{formatDate(booking.booking_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium">Horário:</span>
                            <span>{formatTime(booking.booking_time)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-primary" />
                            <span className="font-medium">Serviço:</span>
                            <span>{booking.service.name}</span>
                          </div>
                          {booking.barber && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium">Profissional:</span>
                              <span>{booking.barber.name}</span>
                              {booking.barber.specialty && (
                                <span className="text-sm text-muted-foreground">
                                  - {booking.barber.specialty}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-medium">Duração:</span>
                            <span>{booking.service.duration} min</span>
                          </div>
                        </div>
                      </div>
                      
                      {booking.booking_products && booking.booking_products.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="font-medium text-sm mb-2">Produtos adquiridos:</p>
                          <div className="space-y-1">
                            {booking.booking_products.map((bp, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{bp.quantity}x {bp.product.name}</span>
                                <span>R$ {(bp.quantity * bp.unit_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Observações:</span> {booking.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm">
                          Reagendar
                        </Button>
                        <Button variant="outline" size="sm">
                          Cancelar
                        </Button>
                        <Button variant="outline" size="sm">
                          Contato: {booking.barbershop.phone}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Nenhum agendamento próximo</h3>
                  <p className="text-muted-foreground mb-4">
                    Que tal agendar um serviço em uma de nossas barbearias?
                  </p>
                  <Button onClick={() => window.location.href = '/'}>
                    Encontrar Barbearias
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={booking.id} className="opacity-80">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {booking.barbershop.name}
                            <Badge variant={statusInfo.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {formatDate(booking.booking_date)} às {formatTime(booking.booking_time)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            R$ {booking.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Scissors className="h-4 w-4" />
                        <span>{booking.service.name}</span>
                        <span>•</span>
                        <span>{booking.service.duration} min</span>
                        {booking.barber && (
                          <>
                            <span>•</span>
                            <span>{booking.barber.name}</span>
                          </>
                        )}
                      </div>
                      
                      {booking.status === 'completed' && (
                        <Button variant="outline" size="sm" className="mt-3">
                          Agendar Novamente
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Nenhum histórico ainda</h3>
                  <p className="text-muted-foreground">
                    Seus agendamentos passados aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MyBookings;