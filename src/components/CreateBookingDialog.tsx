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
  const [isExternalBooking, setIsExternalBooking] = useState(false);
  const [externalClientName, setExternalClientName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServices();
      // Só buscar clientes se NÃO for reserva externa
      if (!isExternalBooking) {
        fetchClients();
      }
    }
  }, [open, barbershopId, isExternalBooking]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    
    setServices(data || []);
  };

  const fetchClients = async () => {
    // Não buscar se for reserva externa
    if (isExternalBooking) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone')
      .eq('user_type', 'client')
      .ilike('display_name', `%${searchTerm}%`)
      .limit(20);
    
    setClients(data || []);
  };

  useEffect(() => {
    if (searchTerm && !isExternalBooking) {
      const timer = setTimeout(fetchClients, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, isExternalBooking]);

  const handleCreate = async () => {
    if (!selectedService) {
      toast({
        title: 'Erro',
        description: 'Selecione um serviço',
        variant: 'destructive'
      });
      return;
    }

    // Para reservas externas, exigir apenas o nome
    if (isExternalBooking && !externalClientName.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome do cliente para reserva externa',
        variant: 'destructive'
      });
      return;
    }

    // Para reservas pela plataforma, exigir cliente selecionado
    if (!isExternalBooking && !selectedClient) {
      toast({
        title: 'Erro',
        description: 'Selecione um cliente',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const service = services.find(s => s.id === selectedService);
      
      const bookingData: any = {
        barbershop_id: barbershopId,
        barber_id: barberId,
        service_id: selectedService,
        booking_date: date.toISOString().split('T')[0],
        booking_time: time,
        total_price: service.price,
        status: 'confirmed',
        notes: notes || null,
        is_external_booking: isExternalBooking
      };

      // Se for reserva externa, usar client_name
      if (isExternalBooking) {
        bookingData.client_name = externalClientName;
      } 
      // Senão, usar client_id
      else {
        bookingData.client_id = selectedClient;
      }
      
      const { error } = await supabase
        .from('bookings')
        .insert(bookingData);

      if (error) throw error;

      toast({
        title: 'Agendamento criado',
        description: isExternalBooking 
          ? 'Reserva externa criada com sucesso'
          : 'Agendamento criado com sucesso'
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
    setIsExternalBooking(false);
    setExternalClientName('');
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

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
              <input
                type="checkbox"
                id="external-booking"
                checked={isExternalBooking}
                onChange={(e) => {
                  setIsExternalBooking(e.target.checked);
                  setSelectedClient('');
                  setSearchTerm('');
                  setExternalClientName('');
                  setClients([]); // Limpar clientes ao alternar
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <Label htmlFor="external-booking" className="cursor-pointer flex-1">
                <span className="font-medium">Reserva Externa</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Para agendamentos feitos por telefone, WhatsApp ou presencialmente
                </p>
              </Label>
            </div>

            {isExternalBooking ? (
              <div className="space-y-2">
                <Label htmlFor="external-name">Nome do Cliente *</Label>
                <Input
                  id="external-name"
                  placeholder="Ex: João Silva"
                  value={externalClientName}
                  onChange={(e) => setExternalClientName(e.target.value)}
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="client-search">Buscar Cliente Cadastrado *</Label>
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
                {searchTerm && clients.length === 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    Nenhum cliente encontrado. Marque "Reserva Externa" acima para agendar sem cadastro.
                  </p>
                )}
              </div>
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
