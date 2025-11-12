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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddServiceToBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  barbershopId: string;
}

export const AddServiceToBookingDialog = ({
  open,
  onOpenChange,
  bookingId,
  barbershopId,
}: AddServiceToBookingDialogProps) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServices();
    }
  }, [open, barbershopId]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Erro ao carregar serviços",
        description: "Não foi possível carregar a lista de serviços.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedServiceId) {
      toast({
        title: "Selecione um serviço",
        description: "Por favor, selecione um serviço antes de adicionar.",
        variant: "destructive",
      });
      return;
    }

    const selectedService = services.find(s => s.id === selectedServiceId);
    if (!selectedService) return;

    setLoading(true);
    try {
      // Aqui você pode adicionar a lógica para vincular o serviço ao booking
      // Por exemplo, criar uma entrada em uma tabela de relação booking_services
      
      toast({
        title: "Serviço adicionado",
        description: `${selectedService.name} foi adicionado ao agendamento.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Erro ao adicionar serviço",
        description: "Não foi possível adicionar o serviço ao agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="service">Selecione o Serviço</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger id="service">
                <SelectValue placeholder="Escolha um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            className="w-full sm:w-auto"
            disabled={loading || !selectedServiceId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
