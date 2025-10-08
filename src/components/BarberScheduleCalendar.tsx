import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimeSlot } from './TimeSlot';
import { BlockTimeDialog } from './BlockTimeDialog';
import { BookingDetailsDialog } from './BookingDetailsDialog';
import { CreateBookingDialog } from './CreateBookingDialog';
import { BlockOptionsDialog } from './BlockOptionsDialog';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_id: string;
  client_id: string;
}

interface BarberBlock {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

interface Barber {
  id: string;
  name: string;
}

interface BarberScheduleCalendarProps {
  barbershopId: string;
}

const WORK_HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

export const BarberScheduleCalendar = ({ barbershopId }: BarberScheduleCalendarProps) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { locale: ptBR }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BarberBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    time: string;
    date: Date;
    isBlocked: boolean;
    blockId?: string;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);

  // Maps para dados relacionados
  const [servicesMap, setServicesMap] = useState<Map<string, any>>(new Map());
  const [profilesMap, setProfilesMap] = useState<Map<string, any>>(new Map());

  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarber) {
      fetchScheduleData();
    }
  }, [selectedBarber, currentWeekStart]);

  useEffect(() => {
    const channel = supabase
      .channel('schedule-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        () => {
          if (selectedBarber) fetchScheduleData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_blocks'
        },
        () => {
          if (selectedBarber) fetchScheduleData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, selectedBarber, currentWeekStart]);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (error) throw error;
      setBarbers(data || []);
      if (data && data.length > 0) {
        setSelectedBarber(data[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const fetchScheduleData = async () => {
    if (!selectedBarber) return;

    try {
      setLoading(true);
      const weekEnd = addDays(currentWeekStart, 6);

      // Buscar agendamentos
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_date, booking_time, status, service_id, client_id')
        .eq('barber_id', selectedBarber)
        .gte('booking_date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('booking_date', format(weekEnd, 'yyyy-MM-dd'));

      if (bookingsError) throw bookingsError;

      // Buscar bloqueios
      const { data: blocksData, error: blocksError } = await supabase
        .from('barber_blocks')
        .select('id, block_date, start_time, end_time, reason')
        .eq('barber_id', selectedBarber)
        .gte('block_date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('block_date', format(weekEnd, 'yyyy-MM-dd'));

      if (blocksError) throw blocksError;

      // Buscar dados relacionados
      if (bookingsData && bookingsData.length > 0) {
        const serviceIds = [...new Set(bookingsData.map(b => b.service_id))];
        const clientIds = [...new Set(bookingsData.map(b => b.client_id))];

        const [servicesData, profilesData] = await Promise.all([
          supabase.from('services').select('id, name, duration, price').in('id', serviceIds),
          supabase.from('profiles').select('user_id, display_name').in('user_id', clientIds)
        ]);

        const newServicesMap = new Map();
        servicesData.data?.forEach(s => newServicesMap.set(s.id, s));
        setServicesMap(newServicesMap);

        const newProfilesMap = new Map();
        profilesData.data?.forEach(p => newProfilesMap.set(p.user_id, p));
        setProfilesMap(newProfilesMap);
      }

      setBookings(bookingsData || []);
      setBlocks(blocksData || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar agenda',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSlotType = (date: Date, time: string): {
    type: 'available' | 'booked' | 'blocked';
    booking?: any;
    block?: any;
  } => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Verificar se há agendamento
    const booking = bookings.find(
      b => b.booking_date === dateStr && b.booking_time === time
    );
    if (booking) {
      const service = servicesMap.get(booking.service_id);
      const profile = profilesMap.get(booking.client_id);
      return {
        type: 'booked',
        booking: {
          client_name: profile?.display_name || 'Cliente',
          service_name: service?.name || 'Serviço',
          status: booking.status
        }
      };
    }

    // Verificar se há bloqueio
    const block = blocks.find(b => {
      if (b.block_date !== dateStr) return false;
      return time >= b.start_time && time < b.end_time;
    });
    if (block) {
      return {
        type: 'blocked',
        block: { reason: block.reason }
      };
    }

    return { type: 'available' };
  };

  const handleSlotClick = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotInfo = getSlotType(date, time);

    if (slotInfo.type === 'booked') {
      // Abrir detalhes do agendamento
      const booking = bookings.find(
        b => b.booking_date === dateStr && b.booking_time === time
      );
      if (booking) {
        const service = servicesMap.get(booking.service_id);
        const profile = profilesMap.get(booking.client_id);
        setSelectedBooking({
          ...booking,
          client_name: profile?.display_name || 'Cliente',
          service_name: service?.name || 'Serviço'
        });
        setBookingDetailsOpen(true);
      }
      return;
    }

    if (slotInfo.type === 'blocked') {
      // Desbloquear
      const block = blocks.find(b => {
        if (b.block_date !== dateStr) return false;
        return time >= b.start_time && time < b.end_time;
      });
      setSelectedSlot({
        time,
        date,
        isBlocked: true,
        blockId: block?.id
      });
      setDialogOpen(true);
    } else {
      // Mostrar opções de bloqueio ou criar agendamento
      setSelectedSlot({
        time,
        date,
        isBlocked: false
      });
      setBlockOptionsOpen(true);
    }
  };

  const handleBlock = async (type: 'single' | 'day' | 'week', reason: string) => {
    if (!selectedSlot || !selectedBarber) return;

    try {
      const blocksToInsert = [];
      
      if (type === 'single') {
        const endTime = WORK_HOURS[WORK_HOURS.indexOf(selectedSlot.time) + 1] || '20:00';
        blocksToInsert.push({
          barber_id: selectedBarber,
          block_date: format(selectedSlot.date, 'yyyy-MM-dd'),
          start_time: selectedSlot.time,
          end_time: endTime,
          reason: reason || null
        });
      } else if (type === 'day') {
        // Bloquear todos os horários do dia
        for (let i = 0; i < WORK_HOURS.length - 1; i++) {
          blocksToInsert.push({
            barber_id: selectedBarber,
            block_date: format(selectedSlot.date, 'yyyy-MM-dd'),
            start_time: WORK_HOURS[i],
            end_time: WORK_HOURS[i + 1],
            reason: reason || null
          });
        }
      } else if (type === 'week') {
        // Bloquear toda a semana
        const weekStart = startOfWeek(selectedSlot.date, { locale: ptBR });
        for (let day = 0; day < 7; day++) {
          const currentDay = addDays(weekStart, day);
          for (let i = 0; i < WORK_HOURS.length - 1; i++) {
            blocksToInsert.push({
              barber_id: selectedBarber,
              block_date: format(currentDay, 'yyyy-MM-dd'),
              start_time: WORK_HOURS[i],
              end_time: WORK_HOURS[i + 1],
              reason: reason || null
            });
          }
        }
      }

      const { error } = await supabase
        .from('barber_blocks')
        .insert(blocksToInsert);

      if (error) throw error;

      toast({
        title: 'Horário bloqueado',
        description: type === 'single' ? 'O horário foi bloqueado' : 
                     type === 'day' ? 'O dia foi bloqueado' : 
                     'A semana foi bloqueada'
      });

      fetchScheduleData();
    } catch (error: any) {
      toast({
        title: 'Erro ao bloquear',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleUnblock = async () => {
    if (!selectedSlot?.blockId) return;

    try {
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', selectedSlot.blockId);

      if (error) throw error;

      toast({
        title: 'Horário desbloqueado',
        description: 'O horário foi desbloqueado com sucesso'
      });

      fetchScheduleData();
    } catch (error: any) {
      toast({
        title: 'Erro ao desbloquear horário',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  if (loading && !selectedBarber) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendário de Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Barbeiro */}
          <div className="flex items-center gap-4">
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecione o barbeiro" />
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

          {/* Navegação de Semana */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Semana Anterior
            </Button>
            <span className="font-semibold">
              {format(currentWeekStart, "dd 'de' MMMM", { locale: ptBR })} -{' '}
              {format(addDays(currentWeekStart, 6), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
            >
              Próxima Semana
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/10 border-2 border-success/30" />
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10 border-2 border-primary/30" />
              <span>Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/10 border-2 border-destructive/30" />
              <span>Bloqueado</span>
            </div>
          </div>

          {/* Grade de Horários */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-8 gap-2 mb-2">
                  <div className="font-semibold text-sm"></div>
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center">
                      <p className="font-semibold text-sm">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(day, 'dd/MM')}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Linhas de horários */}
                {WORK_HOURS.map((time) => (
                  <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                    <div className="text-xs font-medium text-muted-foreground flex items-center">
                      {time}
                    </div>
                    {weekDays.map((day, i) => {
                      const slotInfo = getSlotType(day, time);
                      return (
                        <TimeSlot
                          key={i}
                          time={time}
                          type={slotInfo.type}
                          booking={slotInfo.booking}
                          block={slotInfo.block}
                          onClick={() => handleSlotClick(day, time)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Desbloquear */}
      {selectedSlot && selectedSlot.isBlocked && (
        <BlockTimeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          time={selectedSlot.time}
          date={selectedSlot.date}
          isBlocked={selectedSlot.isBlocked}
          blockId={selectedSlot.blockId}
          onBlock={() => {}}
          onUnblock={handleUnblock}
        />
      )}

      {/* Dialog de Opções de Bloqueio */}
      {selectedSlot && !selectedSlot.isBlocked && (
        <BlockOptionsDialog
          open={blockOptionsOpen}
          onOpenChange={(open) => {
            setBlockOptionsOpen(open);
            if (!open) {
              // Quando fechar sem bloquear, mostrar opção de criar agendamento
              if (selectedSlot && !open) {
                setCreateBookingOpen(true);
              }
            }
          }}
          time={selectedSlot.time}
          date={selectedSlot.date}
          onBlock={handleBlock}
        />
      )}

      {/* Dialog de Criar Agendamento */}
      {selectedSlot && (
        <CreateBookingDialog
          open={createBookingOpen}
          onOpenChange={setCreateBookingOpen}
          barberId={selectedBarber}
          barbershopId={barbershopId}
          date={selectedSlot.date}
          time={selectedSlot.time}
          onSuccess={fetchScheduleData}
        />
      )}

      {/* Dialog de Detalhes do Agendamento */}
      <BookingDetailsDialog
        open={bookingDetailsOpen}
        onOpenChange={setBookingDetailsOpen}
        booking={selectedBooking}
        onUpdateStatus={async (bookingId, status) => {
          try {
            const { error } = await supabase
              .from('bookings')
              .update({ status })
              .eq('id', bookingId);
            
            if (error) throw error;
            
            toast({
              title: 'Status atualizado',
              description: 'O status do agendamento foi atualizado'
            });
            
            fetchScheduleData();
          } catch (error: any) {
            toast({
              title: 'Erro',
              description: error.message,
              variant: 'destructive'
            });
          }
        }}
        onUpdateNotes={async (bookingId, notes) => {
          try {
            const { error } = await supabase
              .from('bookings')
              .update({ notes })
              .eq('id', bookingId);
            
            if (error) throw error;
            
            toast({
              title: 'Observações atualizadas',
              description: 'As observações foram salvas'
            });
            
            fetchScheduleData();
          } catch (error: any) {
            toast({
              title: 'Erro',
              description: error.message,
              variant: 'destructive'
            });
          }
        }}
        onCancel={async (bookingId) => {
          try {
            const { error } = await supabase
              .from('bookings')
              .update({ status: 'cancelled' })
              .eq('id', bookingId);
            
            if (error) throw error;
            
            toast({
              title: 'Agendamento cancelado',
              description: 'O agendamento foi cancelado'
            });
            
            fetchScheduleData();
          } catch (error: any) {
            toast({
              title: 'Erro',
              description: error.message,
              variant: 'destructive'
            });
          }
        }}
      />
    </div>
  );
};
