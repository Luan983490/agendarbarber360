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
import { Calendar as CalendarIcon, Clock, Plus, HelpCircle, Ban, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateClientDialog } from './CreateClientDialog';

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
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
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
  const [blocks, setBlocks] = useState<any[]>([]);
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

  useEffect(() => {
    if (open) {
      setDate(initialDate);
      setTime(initialTime);
      setSelectedBarber(barberId);
      setIsExternalBooking(true);
      setBlockStartTime(initialTime);
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

  const handleCreate = async () => {
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
      
      const bookingData: any = {
        barbershop_id: barbershopId,
        barber_id: selectedBarber,
        service_id: serviceToUse,
        booking_date: format(date, 'yyyy-MM-dd'),
        booking_time: time,
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
      
      const { error } = await supabase
        .from('bookings')
        .insert(bookingData);

      if (error) throw error;

      toast({
        title: 'Agendamento criado',
        description: 'Agendamento criado com sucesso'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message,
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

    if (blockStartDate > blockEndDate) {
      toast({
        title: 'Erro',
        description: 'A data de fim deve ser maior ou igual à data de início',
        variant: 'destructive'
      });
      return;
    }

    try {
      const blocks = [];
      let currentDate = new Date(blockStartDate);
      
      while (currentDate <= blockEndDate) {
        blocks.push({
          barber_id: selectedBarber,
          block_date: format(currentDate, 'yyyy-MM-dd'),
          start_time: blockStartTime,
          end_time: blockEndTime,
          reason: blockReason || null
        });
        currentDate = addDays(currentDate, 1);
      }

      const { error } = await supabase
        .from('barber_blocks')
        .insert(blocks);

      if (error) throw error;

      toast({
        title: 'Horário bloqueado',
        description: `${blocks.length} bloqueio(s) criado(s) com sucesso`
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao bloquear horário',
        description: error.message,
        variant: 'destructive'
      });
    }
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
      
      while (currentDate <= unblockEndDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const { error } = await supabase
          .from('barber_blocks')
          .delete()
          .eq('barber_id', selectedBarber)
          .eq('block_date', dateStr)
          .gte('start_time', unblockStartTime)
          .lte('start_time', unblockEndTime);

        if (error) throw error;
        currentDate = addDays(currentDate, 1);
      }

      toast({
        title: 'Horário desbloqueado',
        description: 'Horários desbloqueados com sucesso'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao desbloquear',
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: 'Erro ao criar bloqueios',
        description: error.message,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-base font-normal text-foreground">
            <CalendarIcon className="h-5 w-5" />
            Agendar novo horário
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none h-auto p-0 gap-0">
            <TabsTrigger 
              value="schedule"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-sm"
            >
              Agendar Horário
            </TabsTrigger>
            <TabsTrigger 
              value="block"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-sm flex items-center gap-1"
            >
              Bloquear Horário
              <HelpCircle className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger 
              value="unblock"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-sm"
            >
              Desbloquear Horário
            </TabsTrigger>
            <TabsTrigger 
              value="recurring"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-sm"
            >
              Agenda Recorrente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4 mt-6 px-1">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia:</Label>
                <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-10 bg-muted/30" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm text-muted-foreground">Hora Início:</Label>
                <Input
                  id="time"
                  type="text"
                  value={time}
                  readOnly
                  className="h-10 bg-muted/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barber" className="text-sm text-muted-foreground">Profissional:</Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger id="barber" className="h-10 bg-muted/30 border-input">
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
                <Label htmlFor="service" className="text-sm text-muted-foreground">Serviço:</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger id="service" className="h-10 bg-muted/30 border-input">
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
                  <HelpCircle className="h-3 w-3" />
                </Label>
                <Input 
                  value={services.find(s => s.id === selectedService)?.duration ? `${services.find(s => s.id === selectedService)?.duration} min` : ''} 
                  readOnly 
                  className="h-10 bg-muted/30" 
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
              onClick={handleCreate} 
              disabled={loading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm mt-2"
            >
              {loading ? 'AGENDANDO...' : 'AGENDAR'}
            </Button>
          </TabsContent>

          <TabsContent value="block" className="space-y-4 mt-6 px-1">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tipo:</Label>
              <Select value={blockType} onValueChange={setBlockType}>
                <SelectTrigger className="h-10 bg-muted/30 border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Horário único</SelectItem>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {blockType === 'recurring' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Quantidade de Dias:</Label>
                    <Input
                      type="number"
                      placeholder="Quantidade de Dias (máximo: 180)"
                      value={blockRecurringDays}
                      onChange={(e) => setBlockRecurringDays(e.target.value)}
                      max={180}
                      className="h-10 bg-muted/30 border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Periodicidade</Label>
                    <Input
                      type="number"
                      placeholder="Periodicidade(máximo: 30)"
                      value={blockRecurringPeriodicity}
                      onChange={(e) => setBlockRecurringPeriodicity(e.target.value)}
                      max={30}
                      className="h-10 bg-muted/30 border-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Dia Início:</Label>
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
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2).toString().padStart(2, '0');
                          const minute = (i % 2) * 30;
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
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2).toString().padStart(2, '0');
                          const minute = (i % 2) * 30;
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

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Observações</Label>
                  <Textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Digite observações..."
                    rows={3}
                    className="resize-none bg-muted/30 border-input"
                  />
                </div>

                <Button 
                  onClick={async () => {
                    if (!blockRecurringDays || !blockRecurringPeriodicity) {
                      toast({
                        title: 'Erro',
                        description: 'Preencha quantidade de dias e periodicidade',
                        variant: 'destructive'
                      });
                      return;
                    }
                    
                    if (!blockStartTime || !blockEndTime) {
                      toast({
                        title: 'Erro',
                        description: 'Informe os horários',
                        variant: 'destructive'
                      });
                      return;
                    }

                    try {
                      const blocks = [];
                      const days = parseInt(blockRecurringDays);
                      const periodicity = parseInt(blockRecurringPeriodicity);
                      let currentDate = new Date(date);
                      
                      for (let i = 0; i < days; i += periodicity) {
                        blocks.push({
                          barber_id: selectedBarber,
                          block_date: format(addDays(currentDate, i), 'yyyy-MM-dd'),
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
                    } catch (error: any) {
                      toast({
                        title: 'Erro',
                        description: error.message,
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm mt-2"
                  disabled={!blockStartTime || !blockEndTime || !selectedBarber}
                >
                  BLOQUEAR
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Dia Início:</Label>
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
                    <Label htmlFor="block-start" className="text-sm text-muted-foreground">Hora Início:</Label>
                    <Select value={blockStartTime} onValueChange={setBlockStartTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2).toString().padStart(2, '0');
                          const minute = (i % 2) * 30;
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

                  <div className="space-y-2">
                    <Label htmlFor="block-end" className="text-sm text-muted-foreground">Hora Fim:</Label>
                    <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                      <SelectTrigger className="h-10 bg-muted/30 border-input">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50 max-h-60">
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2).toString().padStart(2, '0');
                          const minute = (i % 2) * 30;
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
                  <Label htmlFor="block-barber" className="text-sm text-muted-foreground">Profissional:</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="block-reason" className="text-sm text-muted-foreground">Observações</Label>
                  <Textarea
                    id="block-reason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Digite observações..."
                    rows={3}
                    className="resize-none bg-muted/30 border-input"
                  />
                </div>

                <Button 
                  onClick={handleBlockTime}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm mt-2"
                  disabled={!blockStartTime || !blockEndTime || !selectedBarber}
                >
                  BLOQUEAR
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
                    {Array.from({ length: 48 }, (_, i) => {
                      const hour = Math.floor(i / 2).toString().padStart(2, '0');
                      const minute = (i % 2) * 30;
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
                    {Array.from({ length: 48 }, (_, i) => {
                      const hour = Math.floor(i / 2).toString().padStart(2, '0');
                      const minute = (i % 2) * 30;
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
                  onClick={handleCreate}
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