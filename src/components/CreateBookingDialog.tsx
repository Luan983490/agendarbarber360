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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
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
    if (selectedServices.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um serviço',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedClient && !isExternalBooking) {
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
      const totalPrice = calculateTotalPrice();
      
      const bookingData: any = {
        barbershop_id: barbershopId,
        barber_id: selectedBarber,
        service_id: selectedServices[0],
        booking_date: format(date, 'yyyy-MM-dd'),
        booking_time: time,
        total_price: totalPrice,
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

    try {
      const { error } = await supabase
        .from('barber_blocks')
        .insert({
          barber_id: selectedBarber,
          block_date: format(date, 'yyyy-MM-dd'),
          start_time: blockStartTime,
          end_time: blockEndTime,
          reason: blockReason || null
        });

      if (error) throw error;

      toast({
        title: 'Horário bloqueado',
        description: 'Horário bloqueado com sucesso'
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

  const handleUnblock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: 'Horário desbloqueado',
        description: 'Horário desbloqueado com sucesso'
      });

      fetchBlocks();
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
                <Button type="button" size="icon" className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700 shrink-0">
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
              <Select defaultValue="single">
                <SelectTrigger className="h-10 bg-muted/30 border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Horário único</SelectItem>
                  <SelectItem value="range">Período</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia Início:</Label>
                <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-10 bg-muted/30" />
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
                <Input type="text" value={date ? format(date, 'dd/MM/yyyy') : ''} readOnly className="h-10 bg-muted/30" />
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
          </TabsContent>

          <TabsContent value="unblock" className="space-y-4 mt-6 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia Início:</Label>
                <Input type="date" className="h-10 bg-muted/30 border-input" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Hora Início:</Label>
                <Input type="time" className="h-10 bg-muted/30 border-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dia Fim:</Label>
                <Input type="date" className="h-10 bg-muted/30 border-input" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Hora Fim:</Label>
                <Input type="time" className="h-10 bg-muted/30 border-input" />
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
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm mt-2"
            >
              DESBLOQUEAR
            </Button>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4 mt-6 px-1">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Selecione o período</Label>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ptBR}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {dateRange?.from && dateRange?.to && (
              <div className="p-3 bg-muted/20 rounded-md border">
                <p className="text-sm font-medium">Período selecionado:</p>
                <p className="text-sm text-muted-foreground">
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até{' '}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Dias da semana</Label>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={recurringDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRecurringDay(day.value)}
                    className="h-10"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurring-start" className="text-sm text-muted-foreground">Hora Início:</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="recurring-start"
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="pl-10 h-10 bg-muted/30 border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring-end" className="text-sm text-muted-foreground">Hora Fim:</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="recurring-end"
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="pl-10 h-10 bg-muted/30 border-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-reason" className="text-sm text-muted-foreground">Motivo (opcional)</Label>
              <Textarea
                id="recurring-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Férias, viagem, etc."
                rows={3}
                className="resize-none bg-muted/30 border-input"
              />
            </div>

            <Button 
              onClick={handleRecurringBlock}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm mt-2"
            >
              <Ban className="mr-2 h-4 w-4" />
              CRIAR BLOQUEIOS RECORRENTES
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};