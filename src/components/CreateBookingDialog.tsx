import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Plus, HelpCircle, Ban, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateClientDialog } from './CreateClientDialog';
import { useCreateBlocksForPeriod } from '@/hooks/useBarber';
import { sanitizeString } from '@/lib/sanitizer';
import { getErrorMessage } from '@/lib/error-handler';

// Types for local state
interface ClientOption {
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BarberOption {
  id: string;
  name: string;
}

interface BlockRecord {
  id: string;
  barber_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barbershopId: string;
  date: Date;
  time: string;
  onSuccess: () => void;
}

export const CreateBookingDialog = ({
  open,
  onOpenChange,
  barberId,
  barbershopId,
  date: initialDate,
  time: initialTime,
  onSuccess,
}: CreateBookingDialogProps) => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState(barberId);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState(initialTime);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExternalBooking, setIsExternalBooking] = useState(true);
  const [externalClientName, setExternalClientName] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockStartTime, setBlockStartTime] = useState(initialTime);
  const [blockEndTime, setBlockEndTime] = useState('');
  const [blockStartDate, setBlockStartDate] = useState<Date>(initialDate);
  const [blockEndDate, setBlockEndDate] = useState<Date>(initialDate);
  const [unblockStartDate, setUnblockStartDate] = useState<Date>(initialDate);
  const [unblockEndDate, setUnblockEndDate] = useState<Date>(initialDate);
  const [unblockStartTime, setUnblockStartTime] = useState('');
  const [unblockEndTime, setUnblockEndTime] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [recurringType, setRecurringType] = useState('single');
  const [recurringPeriodicity, setRecurringPeriodicity] = useState('weekly');
  const [recurringQuantity, setRecurringQuantity] = useState('1');
  const [blockType, setBlockType] = useState('single');
  const [blockRecurringDays, setBlockRecurringDays] = useState('');
  const [blockRecurringPeriodicity, setBlockRecurringPeriodicity] = useState('');
  const [recurringStartDate, setRecurringStartDate] = useState<Date>(initialDate);
  const [recurringEndDate, setRecurringEndDate] = useState<Date>(initialDate);
  const { toast } = useToast();
  const createBlocksForPeriod = useCreateBlocksForPeriod();

  // Calcular próximo horário padrão (30 min depois do inicial)
  const getDefaultEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 30;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      setDate(initialDate);
      setTime(initialTime);
      setSelectedBarber(barberId);
      setIsExternalBooking(true);
      setBlockStartTime(initialTime);
      // Normalizar datas para não carregar hora/minuto e evitar bugs no range
      const normalizedInitialDate = startOfDay(initialDate);
      setBlockStartDate(normalizedInitialDate);
      setBlockEndDate(normalizedInitialDate);
      // Inicializar blockEndTime com 30 min após o horário inicial
      const defaultEndTime = getDefaultEndTime(initialTime);
      setBlockEndTime(defaultEndTime);
      fetchServices();
      fetchBarbers();
      fetchClients();
      fetchBlocks();
    }
  }, [open, barbershopId, initialDate, initialTime, barberId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    
    setServices(data || []);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    
    setBarbers(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone')
      .eq('user_type', 'client')
      .limit(50);
    
    setClients(data || []);
  };

  const fetchBlocks = async () => {
    const { data } = await supabase
      .from('barber_blocks')
      .select('*')
      .eq('barber_id', barberId)
      .gte('block_date', format(initialDate, 'yyyy-MM-dd'))
      .lte('block_date', format(addDays(initialDate, 7), 'yyyy-MM-dd'))
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    setBlocks(data || []);
  };

  const addService = () => {
    if (selectedService && !selectedServices.includes(selectedService)) {
      setSelectedServices([...selectedServices, selectedService]);
      setSelectedService('');
    }
  };

  const calculateTotalDuration = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.duration || 0);
    }, 0);
  };

  const calculateTotalPrice = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const handleCreate = async (isRecurring = false) => {
    if (!selectedService && selectedServices.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um serviço',
        variant: 'destructive'
      });
      return;
    }

    if (!isExternalBooking && !selectedClient) {
      toast({
        title: 'Erro',
        description: 'Selecione um cliente',
        variant: 'destructive'
      });
      return;
    }

    if (isExternalBooking && !externalClientName.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome do cliente',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const serviceToUse = selectedService || selectedServices[0];
      const service = services.find(s => s.id === serviceToUse);
      
      // Determine how many bookings to create and with what interval
      let bookingsToCreate: { date: Date; time: string }[] = [];
      
      if (isRecurring) {
        const quantity = parseInt(recurringQuantity) || 1;
        let intervalDays = 7; // weekly default
        if (recurringPeriodicity === 'biweekly') intervalDays = 14;
        else if (recurringPeriodicity === 'monthly') intervalDays = 30;
        
        for (let i = 0; i < quantity; i++) {
          bookingsToCreate.push({
            date: addDays(date, i * intervalDays),
            time: time
          });
        }
      } else {
        bookingsToCreate.push({ date, time });
      }

      const bookingsData = bookingsToCreate.map(b => {
        const bookingData: any = {
          barbershop_id: barbershopId,
          barber_id: selectedBarber,
          service_id: serviceToUse,
          booking_date: format(b.date, 'yyyy-MM-dd'),
          booking_time: b.time,
          total_price: service?.price || 0,
          status: 'confirmed',
          notes: notes || null,
          is_external_booking: isExternalBooking
        };

        if (isExternalBooking) {
          bookingData.client_name = externalClientName;
        } else {
          bookingData.client_id = selectedClient;
          const selectedClientData = clients.find(c => c.user_id === selectedClient);
          bookingData.client_name = selectedClientData?.display_name || 'Cliente';
        }
        
        return bookingData;
      });
      
      const { error } = await supabase
        .from('bookings')
        .insert(bookingsData);

      if (error) throw error;

      toast({
        title: 'Agendamento criado',
        description: isRecurring 
          ? `${bookingsData.length} agendamento(s) criado(s) com sucesso`
          : 'Agendamento criado com sucesso'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao criar agendamento',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setSelectedService('');
    setSelectedServices([]);
    setNotes('');
    setIsExternalBooking(true);
    setExternalClientName('');
    setBlockReason('');
    setDateRange(undefined);
    setRecurringDays([]);
  };

  const handleBlockTime = async () => {
    if (!blockStartTime || !blockEndTime) {
      toast({
        title: 'Erro',
        description: 'Informe o horário de início e fim',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedBarber) {
      toast({
        title: 'Erro',
        description: 'Selecione um profissional',
        variant: 'destructive'
      });
      return;
    }

    const startDateStr = format(startOfDay(blockStartDate), 'yyyy-MM-dd');
    const endDateStr = format(startOfDay(blockEndDate), 'yyyy-MM-dd');

    // Sanitize reason before sending
    const sanitizedReason = blockReason ? sanitizeString(blockReason, { maxLength: 500 }) : undefined;

    createBlocksForPeriod.mutate({
      barberId: selectedBarber,
      startDate: startDateStr,
      endDate: endDateStr,
      startTime: blockStartTime,
      endTime: blockEndTime,
      reason: sanitizedReason,
    }, {
      onSuccess: (result) => {
        if (result.success) {
          onSuccess();
          onOpenChange(false);
          resetForm();
        }
      }
    });
  };

  const handleUnblock = async () => {
    if (!unblockStartTime || !unblockEndTime) {
      toast({
        title: 'Erro',
        description: 'Informe o horário de início e fim',
        variant: 'destructive'
      });
      return;
    }

    if (unblockStartDate > unblockEndDate) {
      toast({
        title: 'Erro',
        description: 'A data de fim deve ser maior ou igual à data de início',
        variant: 'destructive'
      });
      return;
    }

    try {
      let currentDate = new Date(unblockStartDate);
      let deletedCount = 0;
      
      while (currentDate <= unblockEndDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Delete blocks that overlap with the specified time range
        // A block overlaps if: block.start_time < unblockEndTime AND block.end_time > unblockStartTime
        const { data, error } = await supabase
          .from('barber_blocks')
          .delete()
          .eq('barber_id', selectedBarber)
          .eq('block_date', dateStr)
          .gte('start_time', unblockStartTime)
          .lt('start_time', unblockEndTime)
          .select();

        if (error) throw error;
        deletedCount += (data?.length || 0);
        currentDate = addDays(currentDate, 1);
      }

      toast({
        title: 'Horário desbloqueado',
        description: `${deletedCount} bloqueio(s) removido(s) com sucesso`
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao desbloquear',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    }
  };

  const handleRecurringBlock = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Erro',
        description: 'Selecione um período',
        variant: 'destructive'
      });
      return;
    }

    if (recurringDays.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um dia da semana',
        variant: 'destructive'
      });
      return;
    }

    if (!blockStartTime || !blockEndTime) {
      toast({
        title: 'Erro',
        description: 'Informe o horário de início e fim',
        variant: 'destructive'
      });
      return;
    }

    try {
      const blocks = [];
      let currentDate = dateRange.from;
      
      while (currentDate <= dateRange.to) {
        const dayOfWeek = currentDate.getDay();
        if (recurringDays.includes(dayOfWeek)) {
          blocks.push({
            barber_id: selectedBarber,
            block_date: format(currentDate, 'yyyy-MM-dd'),
            start_time: blockStartTime,
            end_time: blockEndTime,
            reason: blockReason || null
          });
        }
        currentDate = addDays(currentDate, 1);
      }

      const { error } = await supabase
        .from('barber_blocks')
        .insert(blocks);

      if (error) throw error;

      toast({
        title: 'Bloqueios criados',
        description: `${blocks.length} bloqueios criados com sucesso`
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro ao criar bloqueios',
        description: getErrorMessage(error),
        variant: 'destructive'
      });
    }
  };

  const toggleRecurringDay = (day: number) => {
    if (recurringDays.includes(day)) {
      setRecurringDays(recurringDays.filter(d => d !== day));
    } else {
      setRecurringDays([...recurringDays, day]);
    }
  };

  const weekDays = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto bg-background p-4 sm:p-6">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-normal text-foreground">
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Agendar novo horário
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="flex flex-wrap sm:grid sm:grid-cols-3 w-full bg-transparent border-b rounded-none h-auto p-0 gap-0">
            <TabsTrigger 
              value="schedule"
              className="flex-1 sm:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Agendar Horário</span>
              <span className="sm:hidden">Agendar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="block"
              className="flex-1 sm:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm flex items-center justify-center gap-1"
            >
              <span className="hidden sm:inline">Bloquear Horário</span>
              <span className="sm:hidden">Bloquear</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recurring"
              className="flex-1 sm:flex-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Agenda Recorrente</span>
              <span className="sm:hidden">Recorrente</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4 mt-4 sm:mt-6 px-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm text-muted-foreground">Dia:</Label>
                <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-9 sm:h-10 bg-muted/30 text-sm" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-xs sm:text-sm text-muted-foreground">Hora Início:</Label>
                <Input
                  id="time"
                  type="text"
                  value={time}
                  readOnly
                  className="h-9 sm:h-10 bg-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="barber" className="text-xs sm:text-sm text-muted-foreground">Profissional:</Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger id="barber" className="h-9 sm:h-10 bg-muted/30 border-input text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="service" className="text-xs sm:text-sm text-muted-foreground">Serviço:</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger id="service" className="h-9 sm:h-10 bg-muted/30 border-input text-sm">
                    <SelectValue placeholder="Selecione um Serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  Duração:
                  <HelpCircle className="h-3 w-3" />
                </Label>
                <Input 
                  value={services.find(s => s.id === selectedService)?.duration ? `${services.find(s => s.id === selectedService)?.duration} min` : ''} 
                  readOnly 
                  className="h-9 sm:h-10 bg-muted/30 text-sm" 
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addService}
              disabled={!selectedService}
              className="w-full text-sm text-primary flex items-center justify-center gap-1 py-2 hover:underline disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar serviço
            </button>

            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm text-muted-foreground">Cliente:</Label>
              <div className="flex gap-2">
                <Select 
                  value={isExternalBooking ? 'sem-cadastro' : selectedClient} 
                  onValueChange={(value) => {
                    if (value === 'sem-cadastro') {
                      setIsExternalBooking(true);
                      setSelectedClient('');
                    } else {
                      setIsExternalBooking(false);
                      setSelectedClient(value);
                      const client = clients.find(c => c.user_id === value);
                      if (client) {
                        setExternalClientName(client.display_name);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-1 h-10 bg-muted/30 border-input">
                    <SelectValue placeholder="Sem Cadastro" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="sem-cadastro">Sem Cadastro</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.user_id} value={client.user_id}>
                        {client.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  size="icon" 
                  className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700 shrink-0"
                  onClick={() => setCreateClientOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isExternalBooking && (
              <div className="space-y-2">
                <Input
                  id="external-name"
                  placeholder="Digite o nome do cliente"
                  value={externalClientName}
                  onChange={(e) => setExternalClientName(e.target.value)}
                  className="h-10 bg-muted/30 border-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm text-muted-foreground">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite observações..."
                rows={3}
                className="resize-none bg-muted/30 border-input"
              />
            </div>

            <Button 
              onClick={() => handleCreate(false)} 
              disabled={loading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm mt-2"
            >
              {loading ? 'AGENDANDO...' : 'AGENDAR'}
            </Button>
          </TabsContent>

          <TabsContent value="block" className="space-y-4 mt-6 px-1">
            {/* Dica de uso */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs">
              <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <strong>Período único:</strong> selecione datas e horários para bloquear.
                <br />
                <strong>Recorrente:</strong> bloqueia o mesmo horário a cada X dias.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Bloqueio:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={blockType === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBlockType('single')}
                  className="text-sm"
                >
                  Período Único
                </Button>
                <Button
                  type="button"
                  variant={blockType === 'recurring' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBlockType('recurring')}
                  className="text-sm"
                >
                  Recorrente
                </Button>
              </div>
            </div>

            {blockType === 'recurring' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Profissional:</Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger className="h-10 bg-muted/30 border-input">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Data de Início:</Label>
                  <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-10 bg-muted/30" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hora Início:</Label>
                    <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const hour = Math.floor(i / 4).toString().padStart(2, '0');
                          const minute = (i % 4) * 15;
                          const minuteStr = minute.toString().padStart(2, '0');
                          return `${hour}:${minuteStr}`;
                        }).map(timeOption => (
                          <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hora Fim:</Label>
                    <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const hour = Math.floor(i / 4).toString().padStart(2, '0');
                          const minute = (i % 4) * 15;
                          const minuteStr = minute.toString().padStart(2, '0');
                          return `${hour}:${minuteStr}`;
                        }).map(timeOption => (
                          <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Repetir a cada:</Label>
                    <Select value={blockRecurringPeriodicity || '1'} onValueChange={setBlockRecurringPeriodicity}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 30 }, (_, i) => (i + 1).toString()).map(num => (
                          <SelectItem key={num} value={num}>{num} dia{num !== '1' ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Qtd. de bloqueios:</Label>
                    <Select value={blockRecurringDays || '1'} onValueChange={setBlockRecurringDays}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 60 }, (_, i) => (i + 1).toString()).map(num => (
                          <SelectItem key={num} value={num}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Motivo (opcional)</Label>
                  <Textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: Almoço, folga..."
                    rows={2}
                    className="resize-none bg-muted/30 border-input"
                  />
                </div>

                <Button 
                  onClick={async () => {
                    const days = parseInt(blockRecurringDays || '1');
                    const periodicity = parseInt(blockRecurringPeriodicity || '1');
                    
                    if (!blockStartTime || !blockEndTime) {
                      toast({
                        title: 'Erro',
                        description: 'Informe os horários',
                        variant: 'destructive'
                      });
                      return;
                    }

                    if (blockStartTime >= blockEndTime) {
                      toast({
                        title: 'Erro',
                        description: 'O horário de início deve ser menor que o de fim',
                        variant: 'destructive'
                      });
                      return;
                    }

                    try {
                      const blocks = [];
                      let currentDate = new Date(date);
                      
                      for (let i = 0; i < days; i++) {
                        blocks.push({
                          barber_id: selectedBarber,
                          block_date: format(addDays(currentDate, i * periodicity), 'yyyy-MM-dd'),
                          start_time: blockStartTime,
                          end_time: blockEndTime,
                          reason: blockReason || null
                        });
                      }

                      const { error } = await supabase
                        .from('barber_blocks')
                        .insert(blocks);

                      if (error) throw error;

                      toast({
                        title: 'Horários bloqueados',
                        description: `${blocks.length} bloqueio(s) criado(s)`
                      });

                      onSuccess();
                      onOpenChange(false);
                      resetForm();
                    } catch (error) {
                      toast({
                        title: 'Erro',
                        description: getErrorMessage(error),
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="w-full h-11 bg-destructive hover:bg-destructive/90 text-white font-semibold text-sm mt-2"
                  disabled={!blockStartTime || !blockEndTime || !selectedBarber}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  BLOQUEAR RECORRENTE
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Profissional:</Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger id="block-barber" className="h-10 bg-muted/30 border-input">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Data Início:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {blockStartDate ? format(blockStartDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={blockStartDate}
                          onSelect={(date) => date && setBlockStartDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Data Fim:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {blockEndDate ? format(blockEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={blockEndDate}
                          onSelect={(date) => date && setBlockEndDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="block-start" className="text-sm text-muted-foreground">Hora Início:</Label>
                    <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const hour = Math.floor(i / 4).toString().padStart(2, '0');
                          const minute = (i % 4) * 15;
                          const minuteStr = minute.toString().padStart(2, '0');
                          return `${hour}:${minuteStr}`;
                        }).map(timeOption => (
                          <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="block-end" className="text-sm text-muted-foreground">Hora Fim:</Label>
                    <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 96 }, (_, i) => {
                          const hour = Math.floor(i / 4).toString().padStart(2, '0');
                          const minute = (i % 4) * 15;
                          const minuteStr = minute.toString().padStart(2, '0');
                          return `${hour}:${minuteStr}`;
                        }).map(timeOption => (
                          <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="block-reason" className="text-sm text-muted-foreground">Motivo (opcional)</Label>
                  <Textarea
                    id="block-reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: Férias, consulta médica..."
                    rows={2}
                    className="resize-none bg-muted/30 border-input"
                  />
                </div>

                <Button 
                  onClick={handleBlockTime}
                  className="w-full h-11 bg-destructive hover:bg-destructive/90 text-white font-semibold text-sm mt-2"
                  disabled={!blockStartTime || !blockEndTime || !selectedBarber || createBlocksForPeriod.isPending}
                >
                  {createBlocksForPeriod.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  {createBlocksForPeriod.isPending ? 'BLOQUEANDO...' : 'BLOQUEAR PERÍODO'}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="unblock" className="space-y-4 mt-6 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia Início:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {unblockStartDate ? format(unblockStartDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={unblockStartDate}
                      onSelect={(date) => date && setUnblockStartDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Hora Início:</Label>
                <Select value={unblockStartTime} onValueChange={setUnblockStartTime}>
                  <SelectTrigger className="h-10 bg-muted/30 border-input">
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 max-h-60">
                    {Array.from({ length: 96 }, (_, i) => {
                      const hour = Math.floor(i / 4).toString().padStart(2, '0');
                      const minute = (i % 4) * 15;
                      const minuteStr = minute.toString().padStart(2, '0');
                      return `${hour}:${minuteStr}`;
                    }).map(timeOption => (
                      <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia Fim:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {unblockEndDate ? format(unblockEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={unblockEndDate}
                      onSelect={(date) => date && setUnblockEndDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Hora Fim:</Label>
                <Select value={unblockEndTime} onValueChange={setUnblockEndTime}>
                  <SelectTrigger className="h-10 bg-muted/30 border-input">
                    <SelectValue placeholder="Hora" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50 max-h-60">
                    {Array.from({ length: 96 }, (_, i) => {
                      const hour = Math.floor(i / 4).toString().padStart(2, '0');
                      const minute = (i % 4) * 15;
                      const minuteStr = minute.toString().padStart(2, '0');
                      return `${hour}:${minuteStr}`;
                    }).map(timeOption => (
                      <SelectItem key={timeOption} value={timeOption}>{timeOption}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Profissional:</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="h-10 bg-muted/30 border-input">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleUnblock}
              disabled={!unblockStartTime || !unblockEndTime || !selectedBarber}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm mt-2"
            >
              DESBLOQUEAR
            </Button>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4 mt-6 px-1">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tipo</Label>
              <Select value={recurringType} onValueChange={setRecurringType}>
                <SelectTrigger className="h-10 bg-muted/30 border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Agendar</SelectItem>
                  <SelectItem value="cancel">Cancelar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurringType === 'cancel' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Profissional:</Label>
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                    <SelectTrigger className="h-10 bg-muted/30 border-input">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Serviço:</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Selecione um Serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Duração:</Label>
                    <Input 
                      value={services.find(s => s.id === selectedService)?.duration ? `${services.find(s => s.id === selectedService)?.duration} Minutos` : ''} 
                      readOnly 
                      className="h-10 bg-muted/30" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Cliente:</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={isExternalBooking ? 'sem-cadastro' : selectedClient} 
                      onValueChange={(value) => {
                        if (value === 'sem-cadastro') {
                          setIsExternalBooking(true);
                          setSelectedClient('');
                        } else {
                          setIsExternalBooking(false);
                          setSelectedClient(value);
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1 h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Sem Cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="sem-cadastro">Sem Cliente</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.user_id} value={client.user_id}>
                            {client.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="icon" 
                      className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700 shrink-0"
                      onClick={() => setCreateClientOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Dia Início:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurringStartDate ? format(recurringStartDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurringStartDate}
                          onSelect={(date) => date && setRecurringStartDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Dia Fim:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 bg-muted/30 border-input justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {recurringEndDate ? format(recurringEndDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurringEndDate}
                          onSelect={(date) => date && setRecurringEndDate(date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button 
                  onClick={async () => {
                    if (recurringStartDate > recurringEndDate) {
                      toast({
                        title: 'Erro',
                        description: 'Data fim deve ser maior ou igual à data início',
                        variant: 'destructive'
                      });
                      return;
                    }

                    try {
                      const query = supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('barber_id', selectedBarber)
                        .gte('booking_date', format(recurringStartDate, 'yyyy-MM-dd'))
                        .lte('booking_date', format(recurringEndDate, 'yyyy-MM-dd'))
                        .neq('status', 'cancelled');

                      if (selectedService) {
                        query.eq('service_id', selectedService);
                      }

                      if (!isExternalBooking && selectedClient) {
                        query.eq('client_id', selectedClient);
                      }

                      const { error } = await query;
                      if (error) throw error;

                      toast({
                        title: 'Agendamentos cancelados',
                        description: 'Agendamentos recorrentes cancelados com sucesso'
                      });

                      onSuccess();
                      onOpenChange(false);
                      resetForm();
                    } catch (error: any) {
                      toast({
                        title: 'Erro',
                        description: error.message,
                        variant: 'destructive'
                      });
                    }
                  }}
                  disabled={loading}
                  className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm mt-2"
                >
                  Cancelar Agendamentos Recorrentes do Período
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Dia Início:</Label>
                    <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-10 bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Hora:</Label>
                    <Input type="text" value={time} readOnly className="h-10 bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Profissional:</Label>
                    <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {barbers.map((barber) => (
                          <SelectItem key={barber.id} value={barber.id}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Serviço:</Label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Selecione um Serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm text-muted-foreground">
                      Duração:
                    </Label>
                    <Input 
                      value={services.find(s => s.id === selectedService)?.duration ? `${services.find(s => s.id === selectedService)?.duration} min` : ''} 
                      readOnly 
                      className="h-10 bg-muted/30" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Cliente:</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={isExternalBooking ? 'sem-cadastro' : selectedClient} 
                      onValueChange={(value) => {
                        if (value === 'sem-cadastro') {
                          setIsExternalBooking(true);
                          setSelectedClient('');
                        } else {
                          setIsExternalBooking(false);
                          setSelectedClient(value);
                          const client = clients.find(c => c.user_id === value);
                          if (client) {
                            setExternalClientName(client.display_name);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="flex-1 h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Sem Cadastro" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        <SelectItem value="sem-cadastro">Sem Cadastro</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.user_id} value={client.user_id}>
                            {client.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="icon" 
                      className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700 shrink-0"
                      onClick={() => setCreateClientOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExternalBooking && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Digite o nome do cliente"
                      value={externalClientName}
                      onChange={(e) => setExternalClientName(e.target.value)}
                      className="h-10 bg-muted/30 border-input"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Periodicidade:</Label>
                    <Select value={recurringPeriodicity} onValueChange={setRecurringPeriodicity}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Quantidade de agendamentos:</Label>
                    <Select value={recurringQuantity} onValueChange={setRecurringQuantity}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 40 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={() => handleCreate(true)}
                  disabled={loading}
                  className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm mt-2"
                >
                  {loading ? 'AGENDANDO...' : 'AGENDAR'}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      <CreateClientDialog 
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSuccess={async (newClientId) => {
          await fetchClients();
          if (newClientId) {
            setSelectedClient(newClientId);
            setIsExternalBooking(false);
            const newClient = clients.find(c => c.user_id === newClientId);
            if (newClient) {
              setExternalClientName(newClient.display_name);
            }
          }
        }}
      />
    </Dialog>
  );
};