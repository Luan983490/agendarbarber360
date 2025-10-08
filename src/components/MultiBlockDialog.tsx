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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface MultiBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  onBlock: (startDate: Date, endDate: Date, reason: string) => void;
}

export const MultiBlockDialog = ({
  open,
  onOpenChange,
  barberId,
  onBlock,
}: MultiBlockDialogProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');

  const handleBlock = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }
    onBlock(dateRange.from, dateRange.to, reason);
    setDateRange(undefined);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Bloquear Múltiplos Dias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Selecione o período</Label>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              locale={ptBR}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {dateRange?.from && dateRange?.to && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Período selecionado:</p>
              <p className="text-sm text-muted-foreground">
                {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até{' '}
                {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Férias, viagem, etc..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleBlock} disabled={!dateRange?.from || !dateRange?.to}>
            <Ban className="mr-2 h-4 w-4" />
            Bloquear Período
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
