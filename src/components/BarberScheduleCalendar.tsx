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
import { SlotActionMenu } from './SlotActionMenu';
import { MultiBlockDialog } from './MultiBlockDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Ban } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month';

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  service_id: string;
  client_id: string | null;
  client_name?: string;
  is_external_booking?: boolean;
  client_display_name?: string;
  service_display_name?: string;
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
  const { userType, barberId: currentBarberId } = useUserRole();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [multiBlockOpen, setMultiBlockOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Array<{ date: Date; time: string }>>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarber) {
      fetchScheduleData();
    }
  }, [selectedBarber, currentWeekStart, currentDate, viewMode]);

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
      // Se for barbeiro, apenas buscar seus próprios dados
      if (userType === 'barber' && currentBarberId) {
        const { data, error } = await supabase
          .from('barbers')
          .select('id, name')
          .eq('id', currentBarberId)
          .single();

        if (error) throw error;
        setBarbers([data]);
        setSelectedBarber(data.id);
      } else {
        // Se for dono, buscar todos os barbeiros da barbearia
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
      }
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const fetchScheduleData = async () => {
    if (!selectedBarber) return;

    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === 'day') {
        startDate = currentDate;
        endDate = currentDate;
      } else if (viewMode === 'week') {
        startDate = currentWeekStart;
        endDate = addDays(currentWeekStart, 6);
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Buscar tudo em paralelo
      const [bookingsResult, servicesResult, blocksResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('barber_id', selectedBarber)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr),
        
        supabase
          .from('services')
          .select('id, name')
          .eq('barbershop_id', barbershopId),
        
        supabase
          .from('barber_blocks')
          .select('*')
          .eq('barber_id', selectedBarber)
          .gte('block_date', startDateStr)
          .lte('block_date', endDateStr)
      ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (blocksResult.error) throw blocksResult.error;

      const rawBookings = bookingsResult.data || [];
      const allServices = servicesResult.data || [];
      const blocksData = blocksResult.data || [];

      // Buscar perfis apenas dos bookings que têm client_id
      const clientIds = rawBookings
        .filter(b => b.client_id)
        .map(b => b.client_id);
      
      let allProfiles: any[] = [];
      if (clientIds.length > 0) {
        const profilesResult = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', clientIds);
        
        allProfiles = profilesResult.data || [];
      }

      // Criar maps
      const servicesMap = new Map<string, string>();
      allServices.forEach(s => servicesMap.set(s.id, s.name));

      const profilesMap = new Map<string, string>();
      allProfiles.forEach(p => profilesMap.set(p.user_id, p.display_name));

      // Processar bookings
      const processed = rawBookings.map(b => {
        const serviceName = servicesMap.get(b.service_id) || 'Serviço';
        
        let clientName = 'Cliente';
        if (b.is_external_booking) {
          clientName = b.client_name || 'Cliente Externo';
        } else if (b.client_id) {
          clientName = profilesMap.get(b.client_id) || 'Cliente';
        }

        return {
          ...b,
          client_display_name: clientName,
          service_display_name: serviceName
        };
      });

      setBookings(processed);
      setBlocks(blocksData);

    } catch (error: any) {
      console.error('Erro geral:', error);
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
    type: 'available' | 'booked' | 'booked-external' | 'blocked';
    booking?: any;
    block?: any;
  } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = time.substring(0, 5); // Normalizar para "HH:MM"

    // Verificar se há agendamento (ignorar cancelados)
    const booking = bookings.find((b: any) => {
      const bookingTime = b.booking_time.substring(0, 5); // Normalizar para "HH:MM"
      return b.booking_date === dateStr && bookingTime === timeStr && b.status !== 'cancelled';
    });
    
    if (booking) {
      return {
        type: booking.is_external_booking ? 'booked-external' : 'booked',
        booking: {
          client_name: booking.client_display_name || 'Cliente',
          service_name: booking.service_display_name || 'Serviço',
          status: booking.status
        }
      };
    }

    // Verificar se há bloqueio
    const block = blocks.find(b => {
      if (b.block_date !== dateStr) return false;
      
      // Normalizar os horários removendo segundos para comparação
      const slotTime = timeStr;
      const blockStart = b.start_time.substring(0, 5);
      const blockEnd = b.end_time.substring(0, 5);
      
      // Verificar se o horário está dentro do intervalo do bloqueio
      return slotTime >= blockStart && slotTime < blockEnd;
    });
    
    if (block) {
      return {
        type: 'blocked',
        block: { reason: block.reason, id: block.id }
      };
    }

    return { type: 'available' };
  };

  const handleSlotClick = (date: Date, time: string, event: React.MouseEvent) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = time.substring(0, 5);
    const slotInfo = getSlotType(date, time);

    // Se for agendado, abrir detalhes
    if (slotInfo.type === 'booked' || slotInfo.type === 'booked-external') {
      const booking = bookings.find((b: any) => {
        const bookingTime = b.booking_time.substring(0, 5);
        return b.booking_date === dateStr && bookingTime === timeStr && b.status !== 'cancelled';
      });
      
      if (booking) {
        setSelectedBooking({
          ...booking,
          client_name: booking.client_display_name || 'Cliente',
          service_name: booking.service_display_name || 'Serviço'
        });
        setBookingDetailsOpen(true);
      }
      return;
    }

    // Se for bloqueado, desbloquear
    if (slotInfo.type === 'blocked') {
      const block = blocks.find(b => {
        if (b.block_date !== dateStr) return false;
        const slotTime = time.substring(0, 5);
        const blockStart = b.start_time.substring(0, 5);
        const blockEnd = b.end_time.substring(0, 5);
        return slotTime >= blockStart && slotTime < blockEnd;
      });
      
      if (block) {
        setSelectedSlot({
          time,
          date,
          isBlocked: true,
          blockId: block.id
        });
        setDialogOpen(true);
      }
      return;
    }

    // Se for disponível, abrir dialog de agendamento
    setSelectedSlot({
      time,
      date,
      isBlocked: false
    });
    setCreateBookingOpen(true);
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

  const handleMultiDayBlock = async (startDate: Date, endDate: Date, reason: string) => {
    if (!selectedBarber) return;

    try {
      const blocksToInsert = [];
      let currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        for (let i = 0; i < WORK_HOURS.length - 1; i++) {
          blocksToInsert.push({
            barber_id: selectedBarber,
            block_date: format(currentDate, 'yyyy-MM-dd'),
            start_time: WORK_HOURS[i],
            end_time: WORK_HOURS[i + 1],
            reason: reason || null
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      const { error } = await supabase
        .from('barber_blocks')
        .insert(blocksToInsert);

      if (error) throw error;

      toast({
        title: 'Período bloqueado',
        description: `${blocksToInsert.length} horários foram bloqueados`
      });

      fetchScheduleData();
    } catch (error: any) {
      toast({
        title: 'Erro ao bloquear período',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleUnblock = async () => {
    if (!selectedSlot?.blockId) return;

    try {
      // Atualização otimista - remove do estado local imediatamente
      setBlocks(prev => prev.filter(b => b.id !== selectedSlot.blockId));
      
      // Fecha o dialog imediatamente
      setDialogOpen(false);
      
      // Mostra o toast
      toast({
        title: 'Horário desbloqueado',
        description: 'O horário foi desbloqueado com sucesso'
      });

      // Deleta no banco de dados em segundo plano
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', selectedSlot.blockId);

      if (error) {
        // Se houver erro, reverte e mostra mensagem
        fetchScheduleData();
        throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao desbloquear horário',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const displayDays = viewMode === 'day' 
    ? [currentDate] 
    : viewMode === 'week' 
    ? weekDays 
    : weekDays;

  // Para visualização mensal, obter todos os dias do mês
  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = [];
    let current = startOfWeek(start, { locale: ptBR });
    const endDate = endOfWeek(end, { locale: ptBR });
    
    while (current <= endDate) {
      days.push(current);
      current = addDays(current, 1);
    }
    
    return days;
  };

  const monthDays = viewMode === 'month' ? getMonthDays() : [];

  const getBookingsCountForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return bookings.filter(b => b.booking_date === dateStr).length;
  };

  const getBlocksCountForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayBlocks = blocks.filter(b => b.block_date === dateStr);
    return dayBlocks.length;
  };

  const handlePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentWeekStart(startOfWeek(today, { locale: ptBR }));
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'day') {
      return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } else if (viewMode === 'week') {
      return `${format(currentWeekStart, "dd 'de' MMM", { locale: ptBR })} - ${format(addDays(currentWeekStart, 6), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

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
          {/* Seletor de Barbeiro - apenas para donos */}
          {userType !== 'barber' && barbers.length > 1 && (
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
          )}
          
          {userType === 'barber' && barbers.length > 0 && (
            <div className="text-lg font-semibold">
              {barbers[0].name}
            </div>
          )}

          {/* Botões de Visualização e Navegação */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex gap-1 bg-muted p-1 rounded-md w-full sm:w-auto">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="flex-1 sm:flex-initial"
              >
                Dia
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="flex-1 sm:flex-initial"
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="flex-1 sm:flex-initial"
              >
                Mês
              </Button>
            </div>
            
            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="hidden sm:inline-flex"
              >
                Hoje
              </Button>
              <span className="font-semibold text-xs sm:text-sm text-center min-w-[200px]">
                {getDateRangeLabel()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="w-full sm:w-auto" />
          </div>

          {/* Ações e Legenda */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-success/10 border-2 border-success/30" />
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary/10 border-2 border-primary/30" />
                <span>Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-amber-500/10 border-2 border-amber-500/30" />
                <span>Agendado sem Cadastro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-destructive/10 border-2 border-destructive/30" />
                <span>Bloqueado</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMultiBlockOpen(true)}
              className="w-full sm:w-auto"
            >
              <Ban className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Bloquear Múltiplos Dias</span>
              <span className="sm:hidden">Bloquear Dias</span>
            </Button>
          </div>

          {/* Grade de Horários ou Calendário Mensal */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewMode === 'month' ? (
            /* Visualização Mensal - Calendário */
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
                    <div key={i} className="text-center font-semibold text-sm py-2 border-b">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grade de dias do mês */}
                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const bookingsCount = getBookingsCountForDay(day);
                    const blocksCount = getBlocksCountForDay(day);
                    
                    return (
                      <div
                        key={i}
                        className={cn(
                          "min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                          isCurrentMonth ? "bg-background" : "bg-muted/30",
                          isToday && "ring-2 ring-primary"
                        )}
                        onClick={() => {
                          setCurrentDate(day);
                          setViewMode('day');
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "text-sm font-medium",
                            !isCurrentMonth && "text-muted-foreground",
                            isToday && "text-primary font-bold"
                          )}>
                            {format(day, 'd')}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          {bookingsCount > 0 && (
                            <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {bookingsCount} agendamento{bookingsCount > 1 ? 's' : ''}
                            </div>
                          )}
                          {blocksCount > 0 && (
                            <div className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                              {blocksCount} bloqueio{blocksCount > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Visualização Dia/Semana - Grade de Horários */
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Cabeçalho dos dias */}
                <div className={`grid gap-2 mb-2`} style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
                  <div className="font-semibold text-sm"></div>
                  {displayDays.map((day, i) => (
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
                  <div key={time} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `80px repeat(${displayDays.length}, 1fr)` }}>
                    <div className="text-xs font-medium text-muted-foreground flex items-center">
                      {time}
                    </div>
                    {displayDays.map((day, i) => {
                      const slotInfo = getSlotType(day, time);
                      return (
                        <TimeSlot
                          key={i}
                          time={time}
                          type={slotInfo.type}
                          booking={slotInfo.booking}
                          block={slotInfo.block}
                          onClick={(e) => handleSlotClick(day, time, e)}
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

      {/* Menu de Ações */}
      {selectedSlot && !selectedSlot.isBlocked && (
        <SlotActionMenu
          open={actionMenuOpen}
          onOpenChange={setActionMenuOpen}
          position={actionMenuPosition}
          onCreateBooking={() => {
            setActionMenuOpen(false);
            setCreateBookingOpen(true);
          }}
          onBlockTime={() => {
            setActionMenuOpen(false);
            setBlockOptionsOpen(true);
          }}
        />
      )}

      {/* Dialog de Opções de Bloqueio */}
      {selectedSlot && !selectedSlot.isBlocked && (
        <BlockOptionsDialog
          open={blockOptionsOpen}
          onOpenChange={setBlockOptionsOpen}
          time={selectedSlot.time}
          date={selectedSlot.date}
          onBlock={handleBlock}
        />
      )}

      {/* Dialog de Bloqueio de Múltiplos Dias */}
      <MultiBlockDialog
        open={multiBlockOpen}
        onOpenChange={setMultiBlockOpen}
        barberId={selectedBarber}
        onBlock={handleMultiDayBlock}
      />

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
