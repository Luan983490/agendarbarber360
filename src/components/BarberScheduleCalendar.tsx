import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TimeSlot } from './TimeSlot';
import { BlockTimeDialog } from './BlockTimeDialog';
import { BookingDetailsDialog } from './BookingDetailsDialog';
import { CreateBookingDialog } from './CreateBookingDialog';
import { BlockOptionsDialog } from './BlockOptionsDialog';
import { SlotActionMenu } from './SlotActionMenu';
import { MultiBlockDialog } from './MultiBlockDialog';
import { useUserAccess } from '@/hooks/useUserAccess';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month';

type SlotType = 'available' | 'booked' | 'booked-external' | 'blocked' | 'off-hours';

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
  service_duration?: number;
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

interface BarberWorkingHourRow {
  day_of_week: number;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
  is_day_off: boolean;
}

interface BarberScheduleOverrideRow extends BarberWorkingHourRow {
  id: string;
  barber_id: string;
  start_date: string;
  end_date: string;
}

interface BarberScheduleCalendarProps {
  barbershopId: string;
  barberIdFilter?: string;
  readOnly?: boolean;
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

const normalizeHHMM = (time: string | null | undefined) => {
  if (!time) return null;
  return time.substring(0, 5);
};

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToHHMM = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Gerar slots de horário para um intervalo específico
const generateTimeSlots = (start: string, end: string, stepMinutes = 15): string[] => {
  const slots: string[] = [];
  let current = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  while (current < endMinutes) {
    slots.push(minutesToHHMM(current));
    current += stepMinutes;
  }

  return slots;
};

const isTimeInPeriods = (time: string, periods: Array<{ start: string; end: string }>) =>
  periods.some((p) => time >= p.start && time < p.end);

const STORAGE_KEY_SELECTED_BARBER = 'barber360_selected_barber_id';

export const BarberScheduleCalendar = ({ barbershopId, barberIdFilter, readOnly = false, onRefreshRef }: BarberScheduleCalendarProps) => {
  const { role, barberId: currentBarberId } = useUserAccess();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>(barberIdFilter || '');
  const [isBarberHydrated, setIsBarberHydrated] = useState(!!barberIdFilter);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { locale: ptBR }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<BarberBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingHoursLoaded, setWorkingHoursLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    time: string;
    date: Date;
    isBlocked: boolean;
    blockId?: string;
    overlappingBlocks?: BarberBlock[];
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [multiBlockOpen, setMultiBlockOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Array<{ date: Date; time: string }>>([]);
  
  // Estado para horários de trabalho do barbeiro
  const [barberWorkingHours, setBarberWorkingHours] = useState<BarberWorkingHourRow[]>([]);
  const [barberScheduleOverrides, setBarberScheduleOverrides] = useState<BarberScheduleOverrideRow[]>([]);

  // Ref para controlar AbortController das requisições
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper para verificar se algum dialog está aberto
  const isAnyDialogOpen = dialogOpen || bookingDetailsOpen || createBookingOpen || blockOptionsOpen || actionMenuOpen || multiBlockOpen;

  const isBarberView = !!barberIdFilter;

  const isBarberEditingOwnAgenda =
    role === 'barber' && !!currentBarberId && selectedBarber === currentBarberId;

  const canEdit = !readOnly && (role === 'owner' || isBarberEditingOwnAgenda);

  const { toast } = useToast();

  // Calcular slots de tempo ESPECÍFICOS PARA CADA DIA baseado nos working hours reais
  const getTimeSlotsForDate = useCallback((date: Date): string[] => {
    if (!workingHoursLoaded || barberWorkingHours.length === 0) {
      return [];
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    
    // Verificar se há override para esta data
    const override = barberScheduleOverrides.find(o => 
      o.day_of_week === dayOfWeek &&
      dateStr >= o.start_date &&
      dateStr <= o.end_date
    );
    
    const schedule = override || barberWorkingHours.find(h => h.day_of_week === dayOfWeek);
    
    if (!schedule || schedule.is_day_off) {
      return [];
    }

    // Coletar todos os horários de início e fim do dia
    const times: number[] = [];
    
    if (schedule.period1_start && schedule.period1_end) {
      const start = normalizeHHMM(schedule.period1_start);
      const end = normalizeHHMM(schedule.period1_end);
      if (start && end) {
        times.push(timeToMinutes(start), timeToMinutes(end));
      }
    }
    
    if (schedule.period2_start && schedule.period2_end) {
      const start = normalizeHHMM(schedule.period2_start);
      const end = normalizeHHMM(schedule.period2_end);
      if (start && end) {
        times.push(timeToMinutes(start), timeToMinutes(end));
      }
    }

    if (times.length === 0) return [];

    const earliest = Math.min(...times);
    const latest = Math.max(...times);

    return generateTimeSlots(minutesToHHMM(earliest), minutesToHHMM(latest));
  }, [barberWorkingHours, barberScheduleOverrides, workingHoursLoaded]);

  // Obter todos os slots únicos para a visualização atual (união de todos os dias)
  const allTimeSlotsForView = useMemo(() => {
    if (!workingHoursLoaded) return [];

    const weekDays = viewMode === 'day' 
      ? [currentDate]
      : Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

    const allSlots = new Set<string>();
    
    weekDays.forEach(day => {
      const slotsForDay = getTimeSlotsForDate(day);
      slotsForDay.forEach(slot => allSlots.add(slot));
    });

    return Array.from(allSlots).sort();
  }, [workingHoursLoaded, viewMode, currentDate, currentWeekStart, getTimeSlotsForDate]);

  // Limpar estado completamente ao trocar barbeiro
  const clearBarberState = useCallback(() => {
    setBookings([]);
    setBlocks([]);
    setBarberWorkingHours([]);
    setBarberScheduleOverrides([]);
    setWorkingHoursLoaded(false);
    setLoading(true);
  }, []);

  // Função para trocar barbeiro com limpeza de estado e persistência
  const handleBarberChange = useCallback((newBarberId: string) => {
    if (newBarberId === selectedBarber) return;
    
    // Cancelar requisições pendentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Persistir no localStorage
    localStorage.setItem(STORAGE_KEY_SELECTED_BARBER, newBarberId);
    
    // Limpar estado antes de trocar
    clearBarberState();
    setSelectedBarber(newBarberId);
  }, [selectedBarber, clearBarberState]);

  // Reidratar barbeiro do localStorage ANTES de qualquer fetch
  useEffect(() => {
    if (barberIdFilter) {
      // Se tem filtro fixo (ex: painel do barbeiro), usar ele
      if (barberIdFilter !== selectedBarber) {
        clearBarberState();
        setSelectedBarber(barberIdFilter);
      }
      setIsBarberHydrated(true);
      return;
    }

    // PASSO 1: Ler localStorage PRIMEIRO (fonte de verdade)
    const savedBarberId = localStorage.getItem(STORAGE_KEY_SELECTED_BARBER);

    // Buscar barbeiros e validar o salvo
    const loadBarbersAndHydrate = async () => {
      try {
        let barbersData: Barber[] = [];
        
        if (role === 'barber' && currentBarberId) {
          const { data, error } = await supabase
            .from('barbers')
            .select('id, name')
            .eq('id', currentBarberId)
            .single();

          if (!error && data) {
            barbersData = [data];
          }
        } else {
          const { data, error } = await supabase
            .from('barbers')
            .select('id, name')
            .eq('barbershop_id', barbershopId)
            .eq('is_active', true);

          if (!error && data) {
            barbersData = data;
          }
        }
        
        setBarbers(barbersData);
        
        // PASSO 2: Validar e definir barbeiro (prioridade: localStorage > currentBarberId > primeiro)
        let finalBarberId: string | null = null;
        
        // Prioridade 1: localStorage (se válido)
        if (savedBarberId && barbersData.some(b => b.id === savedBarberId)) {
          finalBarberId = savedBarberId;
        }
        // Prioridade 2: barbeiro logado (se for role barber)
        else if (role === 'barber' && currentBarberId && barbersData.some(b => b.id === currentBarberId)) {
          finalBarberId = currentBarberId;
        }
        // Prioridade 3: primeiro da lista (fallback apenas se nada salvo)
        else if (barbersData.length > 0) {
          finalBarberId = barbersData[0].id;
          // Limpar localStorage inválido se existia
          if (savedBarberId) {
            localStorage.removeItem(STORAGE_KEY_SELECTED_BARBER);
          }
        }
        
        // Aplicar barbeiro selecionado
        if (finalBarberId) {
          setSelectedBarber(finalBarberId);
          // Garantir que está salvo no localStorage
          localStorage.setItem(STORAGE_KEY_SELECTED_BARBER, finalBarberId);
        }
        
        // PASSO 3: Marcar hidratação completa APENAS após tudo definido
        setIsBarberHydrated(true);
      } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        setIsBarberHydrated(true);
      }
    };
    
    loadBarbersAndHydrate();
  }, [barbershopId, barberIdFilter, role, currentBarberId]);

  useEffect(() => {
    // CRÍTICO: Só fazer fetch após hidratação completa
    if (!isBarberHydrated || !selectedBarber) return;
    
    fetchScheduleData();
    
    return () => {
      // Cancelar requisições ao desmontar ou quando dependências mudam
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isBarberHydrated, selectedBarber, currentWeekStart, currentDate, viewMode]);

  // Expor função de refresh via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = fetchScheduleData;
    }
    return () => {
      if (onRefreshRef) {
        onRefreshRef.current = null;
      }
    };
  }, [onRefreshRef, selectedBarber, currentWeekStart, currentDate, viewMode]);

  useEffect(() => {
    if (!isBarberHydrated) return;
    
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
  }, [barbershopId, selectedBarber, currentWeekStart, isBarberHydrated]);

  const fetchScheduleData = async () => {
    if (!selectedBarber) return;

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Capturar o barbeiro atual para verificar depois
    const currentBarberAtStart = selectedBarber;

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
      const [bookingsResult, servicesResult, blocksResult, workingHoursResult, overridesResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('barber_id', selectedBarber)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr),
        
        supabase
          .from('services')
          .select('id, name, duration')
          .eq('barbershop_id', barbershopId),
        
        supabase
          .from('barber_blocks')
          .select('*')
          .eq('barber_id', selectedBarber)
          .gte('block_date', startDateStr)
          .lte('block_date', endDateStr),
        
        supabase
          .from('barber_working_hours')
          .select('*')
          .eq('barber_id', selectedBarber)
          .order('day_of_week'),
        
        supabase
          .from('barber_schedule_overrides')
          .select('*')
          .eq('barber_id', selectedBarber)
          .lte('start_date', endDateStr)
          .gte('end_date', startDateStr)
      ]);

      // CRÍTICO: Verificar se a requisição foi abortada OU se o barbeiro mudou
      if (abortController.signal.aborted || selectedBarber !== currentBarberAtStart) {
        return; // Descartar resultados de requisição obsoleta
      }

      if (bookingsResult.error) throw bookingsResult.error;
      if (blocksResult.error) throw blocksResult.error;
      if (workingHoursResult.error) throw workingHoursResult.error;

      const rawBookings = bookingsResult.data || [];
      const allServices = servicesResult.data || [];
      const blocksData = blocksResult.data || [];
      
      // Definir horários de trabalho do banco - SEM FALLBACK
      const workingHours = workingHoursResult.data || [];
      
      // Verificar novamente antes de atualizar estado
      if (abortController.signal.aborted || selectedBarber !== currentBarberAtStart) {
        return;
      }

      setBarberWorkingHours(workingHours);
      setBarberScheduleOverrides(overridesResult.data || []);
      setWorkingHoursLoaded(true);

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
        
        // Verificar novamente após segunda requisição
        if (abortController.signal.aborted || selectedBarber !== currentBarberAtStart) {
          return;
        }
        
        allProfiles = profilesResult.data || [];
      }

      // Criar maps
      const servicesMap = new Map<string, { name: string; duration: number }>();
      allServices.forEach(s => servicesMap.set(s.id, { name: s.name, duration: s.duration || 30 }));

      const profilesMap = new Map<string, string>();
      allProfiles.forEach(p => profilesMap.set(p.user_id, p.display_name));

      // Processar bookings
      const processed = rawBookings.map(b => {
        const serviceData = servicesMap.get(b.service_id);
        const serviceName = serviceData?.name || 'Serviço';
        const serviceDuration = serviceData?.duration || 30;
        
        let clientName = 'Cliente';
        if (b.is_external_booking) {
          clientName = b.client_name || 'Cliente Externo';
        } else if (b.client_id) {
          clientName = profilesMap.get(b.client_id) || b.client_name || 'Cliente';
        } else if (b.client_name) {
          clientName = b.client_name;
        }

        return {
          ...b,
          client_display_name: clientName,
          service_display_name: serviceName,
          service_duration: serviceDuration
        };
      });

      // Verificação final antes de atualizar estado
      if (abortController.signal.aborted || selectedBarber !== currentBarberAtStart) {
        return;
      }

      setBookings(processed);
      setBlocks(blocksData);

    } catch (error: any) {
      // Ignorar erros de requisições abortadas
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      console.error('Erro geral:', error);
      toast({
        title: 'Erro ao carregar agenda',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      // Só atualizar loading se ainda for o mesmo barbeiro
      if (!abortController.signal.aborted && selectedBarber === currentBarberAtStart) {
        setLoading(false);
      }
    }
  };

  // Função para obter os horários de trabalho de um dia específico
  const getWorkingHoursForDate = (date: Date): { periods: Array<{ start: string; end: string }>; isDayOff: boolean } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    
    // Primeiro, verificar se há override para esta data
    const override = barberScheduleOverrides.find(o => 
      o.day_of_week === dayOfWeek &&
      dateStr >= o.start_date &&
      dateStr <= o.end_date
    );
    
    const schedule = override || barberWorkingHours.find(h => h.day_of_week === dayOfWeek);
    
    if (!schedule || schedule.is_day_off) {
      return { periods: [], isDayOff: true };
    }
    
    const periods: Array<{ start: string; end: string }> = [];
    
    if (schedule.period1_start && schedule.period1_end) {
      periods.push({
        start: normalizeHHMM(schedule.period1_start) || '',
        end: normalizeHHMM(schedule.period1_end) || ''
      });
    }
    
    if (schedule.period2_start && schedule.period2_end) {
      periods.push({
        start: normalizeHHMM(schedule.period2_start) || '',
        end: normalizeHHMM(schedule.period2_end) || ''
      });
    }
    
    return { periods, isDayOff: false };
  };

  // Verificar se um horário está dentro do expediente
  const isWithinWorkingHours = (date: Date, time: string): boolean => {
    const { periods, isDayOff } = getWorkingHoursForDate(date);
    
    if (isDayOff || periods.length === 0) {
      return false;
    }
    
    const timeStr = normalizeHHMM(time) || time;
    return isTimeInPeriods(timeStr, periods);
  };

  const getSlotType = (date: Date, time: string): {
    type: 'available' | 'booked' | 'booked-external' | 'blocked' | 'off-hours';
    booking?: any;
    block?: any;
    isBookingStart?: boolean;
    isBookingEnd?: boolean;
    isBookingMiddle?: boolean;
    bookingId?: string;
  } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = time.substring(0, 5);
    const slotMinutes = timeToMinutes(timeStr);

    // Primeiro verificar se está fora do horário de trabalho
    if (!isWithinWorkingHours(date, time)) {
      return { type: 'off-hours' };
    }

    // Verificar se há agendamento que cobre este slot
    const matchingBooking = bookings.find((b: Booking) => {
      if (b.booking_date !== dateStr || b.status === 'cancelled') return false;
      
      const bookingStartTime = b.booking_time.substring(0, 5);
      const bookingStartMinutes = timeToMinutes(bookingStartTime);
      const bookingDuration = b.service_duration || 30;
      const bookingEndMinutes = bookingStartMinutes + bookingDuration;
      
      return slotMinutes >= bookingStartMinutes && slotMinutes < bookingEndMinutes;
    });
    
    if (matchingBooking) {
      const bookingStartTime = matchingBooking.booking_time.substring(0, 5);
      const bookingStartMinutes = timeToMinutes(bookingStartTime);
      const bookingDuration = matchingBooking.service_duration || 30;
      const bookingEndMinutes = bookingStartMinutes + bookingDuration;
      
      const SLOT_STEP = 15;
      const totalSlots = Math.ceil(bookingDuration / SLOT_STEP);
      const slotIndex = Math.floor((slotMinutes - bookingStartMinutes) / SLOT_STEP);
      
      const isStart = slotIndex === 0;
      const isEnd = slotIndex === totalSlots - 1;
      const isMiddle = !isStart && !isEnd;
      
      return {
        type: matchingBooking.is_external_booking ? 'booked-external' : 'booked',
        booking: {
          client_name: matchingBooking.client_display_name || 'Cliente',
          service_name: matchingBooking.service_display_name || 'Serviço',
          status: matchingBooking.status,
          duration: bookingDuration,
          end_time: minutesToHHMM(bookingEndMinutes),
        },
        isBookingStart: isStart,
        isBookingMiddle: isMiddle,
        isBookingEnd: isEnd,
        bookingId: matchingBooking.id
      };
    }

    // Verificar se há bloqueio
    const block = blocks.find(b => {
      if (b.block_date !== dateStr) return false;
      
      const blockStart = b.start_time.substring(0, 5);
      const blockEnd = b.end_time.substring(0, 5);
      
      return timeStr >= blockStart && timeStr < blockEnd;
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
    if (isAnyDialogOpen) {
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = time.substring(0, 5);
    const slotInfo = getSlotType(date, time);

    if (slotInfo.type === 'off-hours') {
      return;
    }

    if (slotInfo.type === 'booked' || slotInfo.type === 'booked-external') {
      const booking = slotInfo.bookingId 
        ? bookings.find((b: Booking) => b.id === slotInfo.bookingId)
        : bookings.find((b: Booking) => {
            const bookingTime = b.booking_time.substring(0, 5);
            return b.booking_date === dateStr && bookingTime === timeStr && b.status !== 'cancelled';
          });
      
      if (booking) {
        setSelectedBooking({
          ...booking,
          client_name: booking.client_display_name || 'Cliente',
          service_name: booking.service_display_name || 'Serviço',
          barbershop_id: barbershopId,
        });
        setBookingDetailsOpen(true);
      }
      return;
    }

    if (!canEdit) {
      return;
    }

    if (slotInfo.type === 'blocked') {
      const overlappingBlocks = blocks.filter(b => {
        if (b.block_date !== dateStr) return false;
        const slotTime = time.substring(0, 5);
        const blockStart = b.start_time.substring(0, 5);
        const blockEnd = b.end_time.substring(0, 5);
        return slotTime >= blockStart && slotTime < blockEnd;
      });
      
      if (overlappingBlocks.length > 0) {
        setSelectedSlot({
          time,
          date,
          isBlocked: true,
          blockId: overlappingBlocks[0].id,
          overlappingBlocks
        });
        setDialogOpen(true);
      }
      return;
    }

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
      const daySlots = getTimeSlotsForDate(selectedSlot.date);
      
      if (type === 'single') {
        const idx = daySlots.indexOf(selectedSlot.time);
        const endTime = daySlots[idx + 1] || '20:00';
        blocksToInsert.push({
          barber_id: selectedBarber,
          block_date: format(selectedSlot.date, 'yyyy-MM-dd'),
          start_time: selectedSlot.time,
          end_time: endTime,
          reason: reason || null
        });
      } else if (type === 'day') {
        for (let i = 0; i < daySlots.length - 1; i++) {
          blocksToInsert.push({
            barber_id: selectedBarber,
            block_date: format(selectedSlot.date, 'yyyy-MM-dd'),
            start_time: daySlots[i],
            end_time: daySlots[i + 1],
            reason: reason || null
          });
        }
      } else if (type === 'week') {
        const weekStart = startOfWeek(selectedSlot.date, { locale: ptBR });
        for (let day = 0; day < 7; day++) {
          const currentDay = addDays(weekStart, day);
          const currentDaySlots = getTimeSlotsForDate(currentDay);
          for (let i = 0; i < currentDaySlots.length - 1; i++) {
            blocksToInsert.push({
              barber_id: selectedBarber,
              block_date: format(currentDay, 'yyyy-MM-dd'),
              start_time: currentDaySlots[i],
              end_time: currentDaySlots[i + 1],
              reason: reason || null
            });
          }
        }
      }

      if (blocksToInsert.length === 0) {
        toast({
          title: 'Nenhum horário para bloquear',
          description: 'Não há horários de trabalho configurados para este período',
          variant: 'destructive'
        });
        return;
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
      let currentDateIter = new Date(startDate);
      const end = new Date(endDate);

      while (currentDateIter <= end) {
        const daySlots = getTimeSlotsForDate(currentDateIter);
        for (let i = 0; i < daySlots.length - 1; i++) {
          blocksToInsert.push({
            barber_id: selectedBarber,
            block_date: format(currentDateIter, 'yyyy-MM-dd'),
            start_time: daySlots[i],
            end_time: daySlots[i + 1],
            reason: reason || null
          });
        }
        currentDateIter = addDays(currentDateIter, 1);
      }

      if (blocksToInsert.length === 0) {
        toast({
          title: 'Nenhum horário para bloquear',
          description: 'Não há horários de trabalho configurados para este período',
          variant: 'destructive'
        });
        return;
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

  const handleUnblockMultiple = async (blocksToRemove: BarberBlock[]) => {
    if (blocksToRemove.length === 0) return;

    try {
      const blockIds = blocksToRemove.map(b => b.id);
      setBlocks(prev => prev.filter(b => !blockIds.includes(b.id)));
      
      toast({
        title: 'Horário desbloqueado',
        description: 'O horário foi desbloqueado com sucesso'
      });

      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .in('id', blockIds);

      if (error) {
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

  const handleUnblock = async () => {
    if (selectedSlot?.overlappingBlocks && selectedSlot.overlappingBlocks.length > 0) {
      await handleUnblockMultiple(selectedSlot.overlappingBlocks);
      setDialogOpen(false);
      return;
    }

    if (!selectedSlot?.blockId) return;

    try {
      setBlocks(prev => prev.filter(b => b.id !== selectedSlot.blockId));
      
      setDialogOpen(false);
      
      toast({
        title: 'Horário desbloqueado',
        description: 'O horário foi desbloqueado com sucesso'
      });

      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', selectedSlot.blockId);

      if (error) {
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

  // Bloquear renderização enquanto não estiver sincronizado
  // - Não renderizar até reidratar o barbeiro do localStorage
  // - Não renderizar até ter um barbeiro selecionado (a menos que seja owner escolhendo)
  // - Não renderizar até os working hours carregarem
  if (!isBarberHydrated) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Se ainda não selecionou barbeiro (owner sem localStorage salvo), mostrar mensagem
  if (!selectedBarber && !isBarberView && role === 'owner' && barbers.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <Card className="flex flex-col h-full">
          <CardContent className="flex flex-col flex-1 space-y-4 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <span className="text-sm font-medium text-muted-foreground">Barbeiro:</span>
              <Select value={selectedBarber} onValueChange={handleBarberChange}>
                <SelectTrigger className="w-full sm:w-[280px]">
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
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Selecione um barbeiro para visualizar a agenda
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar loading enquanto carrega os dados do barbeiro selecionado
  if (loading || !workingHoursLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full">
        <CardContent className="flex flex-col flex-1 space-y-4 overflow-hidden p-3 sm:p-4 lg:p-6">
          {/* Seletor de Barbeiro - com função de troca isolada */}
          {!isBarberView && role === 'owner' && barbers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Barbeiro:</span>
              <Select value={selectedBarber} onValueChange={handleBarberChange}>
                <SelectTrigger className="w-full sm:w-[280px]">
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

          {/* Botões de Visualização e Navegação */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
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
              <span className="font-semibold text-xs sm:text-sm text-center min-w-[120px] sm:min-w-[200px]">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-foreground border border-border" />
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-success" />
                <span>Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary" />
                <span className="hidden sm:inline">Agendado sem Cadastro</span>
                <span className="sm:hidden">Externo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-destructive" />
                <span>Bloqueado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-background border border-border/60" />
                <span className="hidden sm:inline">Fora do Expediente</span>
                <span className="sm:hidden">Folga</span>
              </div>
            </div>
          </div>

          {/* Grade de Horários ou Calendário Mensal */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {viewMode === 'month' ? (
              /* Visualização Mensal - Calendário */
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="min-w-[320px]">
                  {/* Cabeçalho dos dias da semana */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                      <div key={i} className="text-center font-semibold text-[10px] sm:text-sm py-1 sm:py-2 border-b">
                        <span className="sm:hidden">{day}</span>
                        <span className="hidden sm:inline">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Grade de dias do mês */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {monthDays.map((day, i) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const bookingsCount = getBookingsCountForDay(day);
                      const blocksCount = getBlocksCountForDay(day);
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "min-h-[50px] sm:min-h-[100px] p-1 sm:p-2 border rounded-md sm:rounded-lg cursor-pointer transition-all active:scale-95 sm:hover:shadow-md",
                            isCurrentMonth ? "bg-background" : "bg-muted/30",
                            isToday && "ring-2 ring-primary"
                          )}
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode('day');
                          }}
                        >
                          <div className="flex justify-between items-start mb-0.5 sm:mb-2">
                            <span className={cn(
                              "text-xs sm:text-sm font-medium",
                              !isCurrentMonth && "text-muted-foreground",
                              isToday && "text-primary font-bold"
                            )}>
                              {format(day, 'd')}
                            </span>
                          </div>
                          
                          <div className="space-y-0.5 sm:space-y-1">
                            {bookingsCount > 0 && (
                              <div className="text-[8px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate">
                                <span className="sm:hidden">{bookingsCount}</span>
                                <span className="hidden sm:inline">{bookingsCount} agend.</span>
                              </div>
                            )}
                            {blocksCount > 0 && (
                              <div className="text-[8px] sm:text-xs bg-destructive/10 text-destructive px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate">
                                <span className="sm:hidden">{blocksCount}</span>
                                <span className="hidden sm:inline">{blocksCount} bloq.</span>
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
              <div className="relative overflow-x-auto overflow-y-auto -mx-2 px-2">
                <div
                  className="min-w-0"
                  style={{ minWidth: `${56 + displayDays.length * 112}px` }}
                >
                  {/* Cabeçalho dos dias */}
                  <div className="sticky top-0 bg-background z-20 pb-2 border-b">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `56px repeat(${displayDays.length}, minmax(112px, 1fr))`, gap: '4px' }}
                    >
                      <div className="sticky left-0 z-30 bg-background" />
                      {displayDays.map((day, i) => (
                        <div key={i} className="text-center min-w-0 px-1">
                          <p className="font-semibold text-xs sm:text-sm truncate">
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {format(day, 'dd/MM')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linhas de horários */}
                  <div className="space-y-0.5">
                    {allTimeSlotsForView.map((time) => (
                      <div
                        key={time}
                        className="grid gap-0.5"
                        style={{ gridTemplateColumns: `56px repeat(${displayDays.length}, minmax(112px, 1fr))` }}
                      >
                        <div className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center justify-end pr-2 sticky left-0 bg-background z-30">
                          {time.substring(0, 5)}
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
                              isBookingStart={slotInfo.isBookingStart}
                              isBookingMiddle={slotInfo.isBookingMiddle}
                              isBookingEnd={slotInfo.isBookingEnd}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
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
        simpleMode={!canEdit}
        onRefresh={fetchScheduleData}
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
