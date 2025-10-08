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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  date,
  time,
  onSuccess,
}: CreateBookingDialogProps) => {
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchClients();
    }
  }, [open, barbershopId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    
    setServices(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone')
      .eq('user_type', 'client')
      .ilike('display_name', `%${searchTerm}%`)
      .limit(20);
    
    setClients(data || []);
  };

  useEffect(() => {
    if (searchTerm) {
      const timer = setTimeout(fetchClients, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  const handleCreate = async () => {
    if (!selectedClient || !selectedService) {
      toast({
        title: 'Erro',
        description: 'Selecione um cliente e um serviço',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const service = services.find(s => s.id === selectedService);
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          barbershop_id: barbershopId,
          barber_id: barberId,
          client_id: selectedClient,
          service_id: selectedService,
          booking_date: date.toISOString().split('T')[0],
          booking_time: time,
          total_price: service.price,
          status: 'confirmed',
          notes: notes || null
        });

      if (error) throw error;

      toast({
        title: 'Agendamento criado',
        description: 'O agendamento foi criado com sucesso'
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
    setNotes('');
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Agendamento Manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data e Horário</Label>
            <div className="flex items-center gap-2 p-2 border rounded-md mt-1">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {date.toLocaleDateString('pt-BR')} às {time}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-search">Buscar Cliente</Label>
            <Input
              id="client-search"
              placeholder="Digite o nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {clients.length > 0 && (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.user_id} value={client.user_id}>
                      {client.display_name} {client.phone && `- ${client.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price} ({service.duration}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
