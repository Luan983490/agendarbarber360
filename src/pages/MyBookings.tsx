import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Calendar, Clock, MapPin, User, Scissors, CheckCircle, XCircle, AlertCircle, RefreshCw, CalendarPlus, Phone, MessageCircle } from 'lucide-react';
import { ClientBottomNav } from '@/components/ClientBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number;
  notes?: string;
  barbershop: {
    name: string;
    address: string;
    phone: string;
    whatsapp: string;
    slug: string;
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelledBooking, setCancelledBooking] = useState<Booking | null>(null);
  const [contactBooking, setContactBooking] = useState<Booking | null>(null);
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
          barbershop:barbershops(name, address, phone, whatsapp, slug),
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

  const handleReschedule = (booking: Booking) => {
    navigate(`/barbearia/${booking.barbershop.slug}?service=${booking.service_id}&reschedule=${booking.id}`);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', cancellingBooking.id);

      if (error) throw error;

      const cancelled = cancellingBooking;
      setCancellingBooking(null);
      setCancelledBooking(cancelled);
      await fetchBookings();
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusInfo = (status: string, notes?: string) => {
    // Check if it's a rescheduled booking (cancelled with "Reagendado" note)
    if (status === 'cancelled' && notes && notes.includes('Reagendado')) {
      return { label: 'Reagendado', variant: 'secondary' as const, icon: RefreshCw };
    }
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
    // Parse YYYY-MM-DD manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const isUpcoming = (booking: Booking) => {
    const [year, month, day] = booking.booking_date.split('-').map(Number);
    const timeParts = booking.booking_time.split(':').map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    
    const bookingStart = new Date(year, month - 1, day, hours, minutes);
    const duration = booking.service?.duration || 30;
    const bookingEnd = new Date(bookingStart.getTime() + duration * 60000);
    
    const now = new Date();
    const isFinishedStatus = ['completed', 'cancelled', 'no_show'].includes(booking.status);
    
    return bookingEnd > now && !isFinishedStatus;
  };

  const upcomingBookings = bookings
    .filter(booking => isUpcoming(booking))
    .sort((a, b) => {
      const dateA = new Date(`${a.booking_date}T${a.booking_time}`);
      const dateB = new Date(`${b.booking_date}T${b.booking_time}`);
      return dateA.getTime() - dateB.getTime();
    });

  const pastBookings = bookings
    .filter(booking => !isUpcoming(booking))
    .sort((a, b) => {
      const dateA = new Date(`${a.booking_date}T${a.booking_time}`);
      const dateB = new Date(`${b.booking_date}T${b.booking_time}`);
      return dateB.getTime() - dateA.getTime();
    });

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
      <Header hideMobileMenu={isMobile} />
      
      <main className={cn("container mx-auto px-3 sm:px-4 py-4 sm:py-8 mt-14 sm:mt-16", isMobile && "pb-24")}>
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Meus Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe seus agendamentos e histórico
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Próximos ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Histórico ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 sm:space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status, booking.notes);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={booking.id}>
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                            <span className="truncate">{booking.barbershop.name}</span>
                            <Badge variant={statusInfo.variant} className="text-[10px] sm:text-xs shrink-0">
                              <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1 text-xs sm:text-sm">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="truncate">{booking.barbershop.address}</span>
                          </CardDescription>
                        </div>
                        <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">
                          R$ {booking.total_price.toFixed(2)}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                            <span className="font-medium">Data:</span>
                            <span className="truncate">{formatDate(booking.booking_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                            <span className="font-medium">Horário:</span>
                            <span>{formatTime(booking.booking_time)}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                            <span className="font-medium">Serviço:</span>
                            <span className="truncate">{booking.service.name}</span>
                          </div>
                          {booking.barber && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                              <span className="font-medium">Prof.:</span>
                              <span className="truncate">{booking.barber.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                            <span className="font-medium">Duração:</span>
                            <span>{booking.service.duration} min</span>
                          </div>
                        </div>
                      </div>
                      
                      {booking.booking_products && booking.booking_products.length > 0 && (
                        <div className="p-2 sm:p-3 bg-muted rounded-lg">
                          <p className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">Produtos:</p>
                          <div className="space-y-0.5 sm:space-y-1">
                            {booking.booking_products.map((bp, index) => (
                              <div key={index} className="flex justify-between text-xs sm:text-sm">
                                <span className="truncate mr-2">{bp.quantity}x {bp.product.name}</span>
                                <span className="whitespace-nowrap">R$ {(bp.quantity * bp.unit_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {booking.notes && (
                        <div className="p-2 sm:p-3 bg-muted rounded-lg">
                          <p className="text-xs sm:text-sm">
                            <span className="font-medium">Obs:</span> {booking.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3" onClick={() => handleReschedule(booking)}>
                          Reagendar
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3 text-destructive hover:text-destructive" onClick={() => setCancellingBooking(booking)}>
                          Cancelar
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3" onClick={() => setContactBooking(booking)}>
                          Contato
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="text-center py-8 sm:py-12">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">Nenhum agendamento próximo</h3>
                  <p className="text-muted-foreground mb-3 sm:mb-4 text-xs sm:text-sm">
                    Que tal agendar um serviço?
                  </p>
                  <Button size="sm" onClick={() => window.location.href = '/'}>
                    Encontrar Barbearias
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 sm:space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status, booking.notes);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={booking.id} className="opacity-80">
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                            <span className="truncate">{booking.barbershop.name}</span>
                            <Badge variant={statusInfo.variant} className="text-[10px] sm:text-xs shrink-0">
                              <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-0.5 truncate">
                            {formatDate(booking.booking_date)} às {formatTime(booking.booking_time)}
                          </CardDescription>
                        </div>
                        <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">
                          R$ {booking.total_price.toFixed(2)}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{booking.service.name}</span>
                        <span>•</span>
                        <span>{booking.service.duration} min</span>
                        {booking.barber && (
                          <>
                            <span>•</span>
                            <span className="truncate">{booking.barber.name}</span>
                          </>
                        )}
                      </div>
                      
                      {booking.status === 'completed' && (
                        <Button variant="outline" size="sm" className="mt-2 sm:mt-3 text-xs sm:text-sm h-8 sm:h-9" onClick={() => handleReschedule(booking)}>
                          Agendar Novamente
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="text-center py-8 sm:py-12">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">Nenhum histórico ainda</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Seus agendamentos passados aparecerão aqui
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      {isMobile && <ClientBottomNav />}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancellingBooking} onOpenChange={(open) => !open && setCancellingBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancelar Agendamento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento?
            </DialogDescription>
          </DialogHeader>
          {cancellingBooking && (
            <div className="space-y-2 p-3 bg-muted rounded-lg text-sm">
              <p><span className="font-medium">Serviço:</span> {cancellingBooking.service.name}</p>
              <p><span className="font-medium">Data:</span> {formatDate(cancellingBooking.booking_date)}</p>
              <p><span className="font-medium">Horário:</span> {formatTime(cancellingBooking.booking_time)}</p>
              {cancellingBooking.barber && (
                <p><span className="font-medium">Profissional:</span> {cancellingBooking.barber.name}</p>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCancellingBooking(null)} disabled={cancelLoading}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={cancelLoading}>
              {cancelLoading ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Success + New Booking Suggestion Dialog */}
      <Dialog open={!!cancelledBooking} onOpenChange={(open) => !open && setCancelledBooking(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Agendamento Cancelado</h2>
              <p className="text-sm text-muted-foreground">
                Seu agendamento foi cancelado com sucesso.
              </p>
            </div>
            {cancelledBooking && (
              <div className="w-full p-3 bg-primary/5 border border-primary/20 rounded-lg text-left space-y-1">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  Que tal reagendar?
                </p>
                <p className="text-xs text-muted-foreground">
                  Você pode agendar um novo horário na mesma barbearia.
                </p>
              </div>
            )}
            <div className="flex flex-col w-full gap-2 mt-2">
              {cancelledBooking && (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    const booking = cancelledBooking;
                    setCancelledBooking(null);
                    navigate(`/barbearia/${booking.barbershop.slug}?service=${booking.service_id}`);
                  }}
                >
                  <CalendarPlus className="h-4 w-4" />
                  Fazer Novo Agendamento
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setCancelledBooking(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Options Dialog */}
      <Dialog open={!!contactBooking} onOpenChange={(open) => !open && setContactBooking(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Entrar em Contato</DialogTitle>
            <DialogDescription>
              {contactBooking?.barbershop.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {(contactBooking?.barbershop.whatsapp || contactBooking?.barbershop.phone) && (
              <Button
                className="w-full gap-2 justify-start"
                variant="outline"
                onClick={() => {
                  const rawNumber = (contactBooking.barbershop.whatsapp || contactBooking.barbershop.phone).replace(/\D/g, '');
                  const formatted = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
                  window.open(`https://wa.me/${formatted}`, '_blank');
                  setContactBooking(null);
                }}
              >
                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                WhatsApp
              </Button>
            )}
            {contactBooking?.barbershop.phone && (
              <Button
                className="w-full gap-2 justify-start"
                variant="outline"
                onClick={() => {
                  const phone = contactBooking.barbershop.phone.replace(/\D/g, '');
                  window.open(`tel:+55${phone}`, '_self');
                  setContactBooking(null);
                }}
              >
                <Phone className="h-5 w-5 text-primary" />
                Ligação
              </Button>
            )}
            {!contactBooking?.barbershop.whatsapp && !contactBooking?.barbershop.phone && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Este estabelecimento não possui telefone ou WhatsApp cadastrado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;