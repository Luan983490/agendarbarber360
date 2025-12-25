import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    service_name: string;
    client_name: string;
    barber_id?: string;
    service_id?: string;
    barbershop_id?: string;
  };
  onSave: (data: { tipo: string }) => void;
}

const editTypes = [
  { value: 'apenas_horario', label: 'Apenas Horário' },
  { value: 'apenas_servico', label: 'Apenas Serviço' },
  { value: 'apenas_profissional', label: 'Apenas Profissional' },
  { value: 'horario_profissional', label: 'Horário e Profissional' },
  { value: 'horario_servico', label: 'Horário e Serviço' },
  { value: 'profissional_servico', label: 'Profissional e Serviço' },
  { value: 'servico_profissional_horario', label: 'Serviço, Profissional e Horário' },
];

const WORK_HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

export const EditBookingDialog = ({
  open,
  onOpenChange,
  booking,
  onSave,
}: EditBookingDialogProps) => {
  const [tipo, setTipo] = useState('apenas_horario');
  const [loading, setLoading] = useState(false);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  // Edit values
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState('');
  const [newBarberId, setNewBarberId] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    if (open && booking) {
      // Initialize values from booking
      setNewDate(new Date(booking.booking_date + 'T12:00:00'));
      setNewTime(booking.booking_time.substring(0, 5));
      setNewBarberId(booking.barber_id || '');
      setNewServiceId(booking.service_id || '');
      
      // Fetch barbers and services
      fetchData();
    }
  }, [open, booking]);

  const fetchData = async () => {
    if (!booking.barbershop_id) return;
    
    const [barbersRes, servicesRes] = await Promise.all([
      supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', booking.barbershop_id)
        .eq('is_active', true),
      supabase
        .from('services')
        .select('id, name, price')
        .eq('barbershop_id', booking.barbershop_id)
        .eq('is_active', true)
    ]);
    
    setBarbers(barbersRes.data || []);
    setServices(servicesRes.data || []);
  };

  const needsDate = tipo.includes('horario');
  const needsBarber = tipo.includes('profissional');
  const needsService = tipo.includes('servico');

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: any = {};
      
      if (needsDate && newDate && newTime) {
        updates.booking_date = format(newDate, 'yyyy-MM-dd');
        updates.booking_time = newTime;
      }
      
      if (needsBarber && newBarberId) {
        updates.barber_id = newBarberId;
      }
      
      if (needsService && newServiceId) {
        updates.service_id = newServiceId;
        // Update total price
        const service = services.find(s => s.id === newServiceId);
        if (service) {
          updates.total_price = service.price;
        }
      }
      
      if (Object.keys(updates).length === 0) {
        toast({
          title: 'Nenhuma alteração',
          description: 'Nenhum campo foi alterado.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: 'Agendamento atualizado',
        description: 'As alterações foram salvas com sucesso.'
      });
      
      onSave({ tipo });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>✏️ Editar Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>O que deseja alterar?</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de edição" />
              </SelectTrigger>
              <SelectContent>
                {editTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsDate && (
            <>
              <div className="space-y-2">
                <Label>Nova Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={(date) => date && setNewDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Novo Horário</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {WORK_HOURS.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {needsBarber && (
            <div className="space-y-2">
              <Label>Novo Profissional</Label>
              <Select value={newBarberId} onValueChange={setNewBarberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map(barber => (
                    <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsService && (
            <div className="space-y-2">
              <Label>Novo Serviço</Label>
              <Select value={newServiceId} onValueChange={setNewServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - R$ {service.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
