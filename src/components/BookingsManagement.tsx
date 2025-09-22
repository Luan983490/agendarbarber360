import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, Scissors, Package, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  notes?: string;
  service: {
    name: string;
    duration: number;
  };
  barber?: {
    name: string;
  };
  client: {
    display_name: string;
    phone?: string;
  };
  booking_products?: {
    quantity: number;
    unit_price: number;
    product: {
      name: string;
    };
  }[];
}

interface BookingsManagementProps {
  barbershopId: string;
}

const BookingsManagement = ({ barbershopId }: BookingsManagementProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, [barbershopId]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, duration),
          barber:barbers(name),
          client:profiles!bookings_client_id_fkey(display_name, phone),
          booking_products(
            quantity,
            unit_price,
            product:products(name)
          )
        `)
        .eq('barbershop_id', barbershopId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

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

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status } : booking
      ));

      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando agendamentos...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Agendamentos</CardTitle>
        <CardDescription>
          Visualize e gerencie todos os agendamentos da sua barbearia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum agendamento encontrado. Os agendamentos aparecerão aqui quando os clientes começarem a agendar.
          </p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusText(booking.status)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          #{booking.id.slice(0, 8)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{booking.client.display_name}</span>
                          {booking.client.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {booking.client.phone}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                          <span>{booking.booking_time}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.service.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({booking.service.duration}min)
                          </span>
                        </div>
                        
                        {booking.barber && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Barbeiro: {booking.barber.name}</span>
                          </div>
                        )}
                      </div>
                      
                      {booking.booking_products && booking.booking_products.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Produtos:</span>
                          </div>
                          <div className="ml-6 space-y-1">
                            {booking.booking_products.map((item, index) => (
                              <div key={index} className="text-sm text-muted-foreground">
                                {item.quantity}x {item.product.name} - R$ {item.unit_price.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {booking.notes && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Observações:</strong> {booking.notes}
                        </div>
                      )}
                      
                      <div className="font-bold text-lg">
                        Total: R$ {booking.total_price.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Confirmar
                        </Button>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Concluir
                        </Button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingsManagement;