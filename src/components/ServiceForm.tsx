import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Scissors, Edit, Trash2 } from 'lucide-react';
import { serviceFormSchema, validateWithSchema, formatValidationErrors, sanitizeString, VALIDATION_CONSTANTS } from '@/lib/validation-schemas';

// Opções de duração em intervalos de 15 minutos (15 a 360)
const DURATION_OPTIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 15);

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  is_active: boolean;
}

interface ServiceFormProps {
  barbershopId: string;
  services: Service[];
  onServicesChange: () => void;
}

const ServiceForm = ({ barbershopId, services, onServicesChange }: ServiceFormProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: ''
    });
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação com Zod
    const validation = validateWithSchema(serviceFormSchema, formData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }

    // Validar preço e duração
    const price = parseFloat(formData.price);
    const duration = parseInt(formData.duration);
    
    if (isNaN(price) || price < VALIDATION_CONSTANTS.PRICE_MIN || price > VALIDATION_CONSTANTS.PRICE_MAX) {
      toast({
        title: 'Erro de validação',
        description: `Preço deve estar entre R$ ${VALIDATION_CONSTANTS.PRICE_MIN} e R$ ${VALIDATION_CONSTANTS.PRICE_MAX.toLocaleString('pt-BR')}`,
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(duration) || duration < VALIDATION_CONSTANTS.DURATION_MIN || duration > VALIDATION_CONSTANTS.DURATION_MAX) {
      toast({
        title: 'Erro de validação',
        description: `Duração deve estar entre ${VALIDATION_CONSTANTS.DURATION_MIN} e ${VALIDATION_CONSTANTS.DURATION_MAX} minutos`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const serviceData = {
        barbershop_id: barbershopId,
        name: sanitizeString(formData.name),
        description: sanitizeString(formData.description),
        price: price,
        duration: duration,
        is_active: true
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);
        
        if (error) throw error;
        
        toast({
          title: "Serviço atualizado!",
          description: "O serviço foi atualizado com sucesso."
        });
      } else {
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);
        
        if (error) throw error;
        
        toast({
          title: "Serviço adicionado!",
          description: "O serviço foi criado com sucesso."
        });
      }

      setIsOpen(false);
      resetForm();
      onServicesChange();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar serviço",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString()
    });
    setIsOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
      
      toast({
        title: "Serviço removido!",
        description: "O serviço foi removido com sucesso."
      });
      
      onServicesChange();
    } catch (error: any) {
      toast({
        title: "Erro ao remover serviço",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Serviços</CardTitle>
          <CardDescription>
            Gerencie os serviços oferecidos pela sua barbearia
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Corte Masculino"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o serviço..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="25.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (min)</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                    required
                  >
                    <SelectTrigger id="duration">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((duration) => (
                        <SelectItem key={duration} value={duration.toString()}>
                          {duration} min ({Math.floor(duration / 60)}h{duration % 60 > 0 ? ` ${duration % 60}min` : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : (editingService ? 'Atualizar' : 'Criar')} Serviço
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum serviço cadastrado. Adicione serviços para que os clientes possam agendar.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <p className="text-sm">
                      <span className="font-medium">R$ {service.price.toFixed(2)}</span> • {service.duration} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceForm;