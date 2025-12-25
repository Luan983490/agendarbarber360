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
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddServiceToBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  barbershopId: string;
  onSuccess?: () => void;
}

export const AddServiceToBookingDialog = ({
  open,
  onOpenChange,
  bookingId,
  barbershopId,
  onSuccess,
}: AddServiceToBookingDialogProps) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServices();
      setSelectedServiceId('');
      setQuantity(1);
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
      // Insert into booking_services table
      const { error } = await supabase
        .from('booking_services')
        .insert({
          booking_id: bookingId,
          service_id: selectedServiceId,
          quantity: quantity,
          unit_price: selectedService.price,
        });

      if (error) throw error;

      // Update booking total_price
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('total_price')
        .eq('id', bookingId)
        .single();

      if (currentBooking) {
        const newTotal = (currentBooking.total_price || 0) + (selectedService.price * quantity);
        await supabase
          .from('bookings')
          .update({ total_price: newTotal })
          .eq('id', bookingId);
      }

      toast({
        title: "Serviço adicionado",
        description: `${selectedService.name} (${quantity}x) foi adicionado ao agendamento.`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding service:', error);
      toast({
        title: "Erro ao adicionar serviço",
        description: error.message || "Não foi possível adicionar o serviço ao agendamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const totalPrice = selectedService ? selectedService.price * quantity : 0;

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

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          {selectedService && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
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
