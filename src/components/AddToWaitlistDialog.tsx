import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Calendar } from 'lucide-react';
import { z } from 'zod';
import { sanitizeString, sanitizePhone, sanitizeDate } from '@/lib/sanitizer';
import { VALIDATION_CONSTANTS, ERROR_MESSAGES } from '@/lib/validation-schemas';

// Zod schema for waitlist entry
const waitlistSchema = z.object({
  client_name: z.string()
    .trim()
    .min(VALIDATION_CONSTANTS.NAME_MIN_LENGTH, ERROR_MESSAGES.nameMin)
    .max(VALIDATION_CONSTANTS.NAME_MAX_LENGTH, ERROR_MESSAGES.nameMax),
  client_phone: z.string()
    .max(VALIDATION_CONSTANTS.PHONE_MAX_LENGTH, 'Telefone muito longo')
    .optional()
    .or(z.literal('')),
  service_name: z.string()
    .max(VALIDATION_CONSTANTS.NAME_MAX_LENGTH, 'Nome do serviço muito longo')
    .optional()
    .or(z.literal('')),
  desired_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MESSAGES.invalidDate),
  description: z.string()
    .max(VALIDATION_CONSTANTS.NOTES_MAX_LENGTH, `Observação deve ter no máximo ${VALIDATION_CONSTANTS.NOTES_MAX_LENGTH} caracteres`)
    .optional()
    .or(z.literal('')),
});

interface WaitlistItem {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_name: string | null;
  desired_date: string;
  description: string | null;
  status: string;
  contacted_at: string | null;
  created_at: string;
  barber_id: string | null;
}

interface AddToWaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId: string;
  selectedDate: Date;
  barberId?: string;
  editItem: WaitlistItem | null;
  onSuccess: () => void;
}

interface Client {
  id: string;
  client_name: string;
  client_phone: string;
}

interface Service {
  id: string;
  name: string;
}

export function AddToWaitlistDialog({ open, onOpenChange, barbershopId, selectedDate, barberId, editItem, onSuccess }: AddToWaitlistDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchServices();
      setErrors({});
      if (editItem) {
        setClientName(editItem.client_name);
        setClientPhone(editItem.client_phone || '');
        setSelectedService(editItem.service_name || '');
        setDate(editItem.desired_date);
        setDescription(editItem.description || '');
        setSelectedClient('');
      } else {
        setClientName('');
        setClientPhone('');
        setSelectedClient('');
        setSelectedService('');
        setDate(format(selectedDate, 'yyyy-MM-dd'));
        setDescription('');
      }
    }
  }, [open, editItem]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('barbershop_clients')
      .select('id, client_name, client_phone')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('client_name');
    setClients((data as Client[]) || []);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name');
    setServices((data as Service[]) || []);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.client_name);
      setClientPhone(client.client_phone);
    }
  };

  const handleSave = async () => {
    // Sanitize inputs
    const sanitizedData = {
      client_name: sanitizeString(clientName, { maxLength: VALIDATION_CONSTANTS.NAME_MAX_LENGTH }),
      client_phone: clientPhone ? sanitizePhone(clientPhone) : '',
      service_name: selectedService ? sanitizeString(selectedService, { maxLength: VALIDATION_CONSTANTS.NAME_MAX_LENGTH }) : '',
      desired_date: sanitizeDate(date) || '',
      description: description ? sanitizeString(description, { maxLength: VALIDATION_CONSTANTS.NOTES_MAX_LENGTH }) : '',
    };

    // Validate with Zod
    const result = waitlistSchema.safeParse(sanitizedData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        barbershop_id: barbershopId,
        barber_id: barberId || null,
        client_name: result.data.client_name,
        client_phone: result.data.client_phone || null,
        service_name: result.data.service_name || null,
        desired_date: result.data.desired_date,
        description: result.data.description || null,
        created_by: user?.id || null,
      };

      if (editItem) {
        const { error } = await supabase
          .from('waitlist')
          .update(payload as any)
          .eq('id', editItem.id);
        if (error) throw error;
        toast({ title: 'Lista de espera atualizada' });
      } else {
        const { error } = await supabase
          .from('waitlist')
          .insert(payload as any);
        if (error) throw error;
        toast({ title: 'Adicionado à lista de espera' });
      }
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Editar' : 'Adicionar na'} Lista de Espera</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Cliente*</Label>
            <Select value={selectedClient} onValueChange={handleClientSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente cadastrado" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Ou digite o nome do cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={VALIDATION_CONSTANTS.NAME_MAX_LENGTH}
            />
            {errors.client_name && <p className="text-xs text-destructive mt-1">{errors.client_name}</p>}
          </div>

          <div>
            <Label>Celular</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              maxLength={VALIDATION_CONSTANTS.PHONE_MAX_LENGTH}
            />
            {errors.client_phone && <p className="text-xs text-destructive mt-1">{errors.client_phone}</p>}
          </div>

          <div>
            <Label>Serviço*</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_name && <p className="text-xs text-destructive mt-1">{errors.service_name}</p>}
          </div>

          <div>
            <Label>Data*</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9"
              />
            </div>
            {errors.desired_date && <p className="text-xs text-destructive mt-1">{errors.desired_date}</p>}
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea
              placeholder="Observação sobre o cliente ou atendimento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={VALIDATION_CONSTANTS.NOTES_MAX_LENGTH}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/{VALIDATION_CONSTANTS.NOTES_MAX_LENGTH}</p>
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>

          <p className="text-xs text-muted-foreground">(*) Campos Obrigatórios.</p>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
