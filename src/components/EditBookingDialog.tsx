import { useState } from 'react';
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
import { cn } from '@/lib/utils';

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_date: string;
    booking_time: string;
    service_name: string;
    client_name: string;
  };
  onSave: (data: { tipo: string }) => void;
}

const editTypes = [
  { value: 'tipo', label: 'Tipo' },
  { value: 'apenas_horario', label: 'Apenas Horário' },
  { value: 'apenas_servico', label: 'Apenas Serviço' },
  { value: 'apenas_profissional', label: 'Apenas Profissional' },
  { value: 'horario_profissional', label: 'Horário e Profissional' },
  { value: 'horario_servico', label: 'Horário e Serviço' },
  { value: 'profissional_servico', label: 'Profissional e Serviço' },
  { value: 'servico_profissional_horario', label: 'Serviço, Profissional e Horário' },
  { value: 'duracao', label: 'Duração' },
];

export const EditBookingDialog = ({
  open,
  onOpenChange,
  booking,
  onSave,
}: EditBookingDialogProps) => {
  const [tipo, setTipo] = useState('tipo');

  const handleSave = () => {
    onSave({ tipo });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>✏️ Editor Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
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
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
