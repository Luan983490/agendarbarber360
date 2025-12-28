import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
}

interface BarberService {
  id: string;
  barber_id: string;
  service_id: string;
}

interface BarberServicesFormProps {
  barberId: string;
  barbershopId: string;
}

export const BarberServicesForm = ({ barberId, barbershopId }: BarberServicesFormProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [barberServices, setBarberServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [barberId, barbershopId]);

  const fetchData = async () => {
    try {
      // Fetch all services for this barbershop
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');

      if (servicesError) throw servicesError;

      // Fetch barber's assigned services
      const { data: assignedServices, error: assignedError } = await supabase
        .from('barber_services')
        .select('service_id')
        .eq('barber_id', barberId);

      if (assignedError) throw assignedError;

      setServices(allServices || []);
      setBarberServices(assignedServices?.map(s => s.service_id) || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar serviços",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setBarberServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const selectAll = () => {
    setBarberServices(services.map(s => s.id));
  };

  const deselectAll = () => {
    setBarberServices([]);
  };

  const saveServices = async () => {
    setSaving(true);
    try {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('barber_services')
        .delete()
        .eq('barber_id', barberId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (barberServices.length > 0) {
        const inserts = barberServices.map(serviceId => ({
          barber_id: barberId,
          service_id: serviceId,
        }));

        const { error: insertError } = await supabase
          .from('barber_services')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      toast({
        title: "Serviços salvos!",
        description: `${barberServices.length} serviço(s) vinculado(s) ao profissional.`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum serviço cadastrado</p>
            <p className="text-sm mt-1">Cadastre serviços na barbearia primeiro</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Serviços do Profissional</CardTitle>
              <CardDescription>
                Selecione os serviços que este profissional realiza
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Selecionar todos
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  barberServices.includes(service.id)
                    ? 'bg-primary/5 border-primary'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleService(service.id)}
              >
                <Checkbox
                  checked={barberServices.includes(service.id)}
                  onCheckedChange={() => toggleService(service.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {service.duration} min
                    </Badge>
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {service.description}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-primary">
                  {formatPrice(service.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">
                {barberServices.length} de {services.length} serviços selecionados
              </span>
            </div>
            <Button onClick={saveServices} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Serviços'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarberServicesForm;
