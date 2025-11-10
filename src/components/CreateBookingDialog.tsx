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
import { Calendar as CalendarIcon, Clock, Plus, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExternalBooking, setIsExternalBooking] = useState(false);
  const [externalClientName, setExternalClientName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setDate(initialDate);
      setTime(initialTime);
      setSelectedBarber(barberId);
      fetchServices();
      fetchBarbers();
      fetchClients();
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

  const addService = () => {
    if (selectedService && !selectedServices.includes(selectedService)) {
      setSelectedServices([...selectedServices, selectedService]);
      setSelectedService('');
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(id => id !== serviceId));
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
    setIsExternalBooking(false);
    setExternalClientName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-normal">
            <CalendarIcon className="h-5 w-5" />
            Agendar novo horário
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none h-auto p-0">
            <TabsTrigger 
              value="schedule"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Agendar Horário
            </TabsTrigger>
            <TabsTrigger 
              value="block"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1"
            >
              Bloquear Horário
              <HelpCircle className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger 
              value="unblock"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Desbloquear Horário
            </TabsTrigger>
            <TabsTrigger 
              value="recurring"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Agenda Recorrente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-5 mt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dia:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-10 bg-muted/50",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'dd/MM/yyyy') : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-medium">Hora Início:</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-10 h-10 bg-muted/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barber" className="text-sm font-medium">Profissional:</Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger id="barber" className="h-10 bg-muted/50">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
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
                <Label htmlFor="service" className="text-sm font-medium">Serviço:</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger id="service" className="h-10 bg-muted/50">
                    <SelectValue placeholder="Selecione um Serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-medium">
                  Duração:
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Select disabled>
                  <SelectTrigger className="h-10 bg-muted/50">
                    <SelectValue placeholder={calculateTotalDuration() ? `${calculateTotalDuration()} min` : "Selecione"} />
                  </SelectTrigger>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addService}
              disabled={!selectedService}
              className="w-full justify-center border border-dashed hover:bg-muted/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar serviço
            </Button>

            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium">Cliente:</Label>
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
                  <SelectTrigger className="flex-1 h-10 bg-muted/50">
                    <SelectValue placeholder="Sem Cadastro" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="sem-cadastro">Sem Cadastro</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.user_id} value={client.user_id}>
                        {client.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="icon" className="h-10 w-10 bg-cyan-600 hover:bg-cyan-700">
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
                  className="h-10 bg-muted/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder=""
                rows={3}
                className="resize-none bg-muted/50"
              />
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={loading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              {loading ? 'AGENDANDO...' : 'AGENDAR'}
            </Button>
          </TabsContent>

          <TabsContent value="block" className="mt-6 py-8">
            <p className="text-muted-foreground text-center">
              Funcionalidade de bloqueio de horário
            </p>
          </TabsContent>

          <TabsContent value="unblock" className="mt-6 py-8">
            <p className="text-muted-foreground text-center">
              Funcionalidade de desbloqueio de horário
            </p>
          </TabsContent>

          <TabsContent value="recurring" className="mt-6 py-8">
            <p className="text-muted-foreground text-center">
              Funcionalidade de agenda recorrente
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
