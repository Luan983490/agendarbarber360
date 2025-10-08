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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Ban, Calendar, CalendarDays } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  date: Date;
  onBlock: (type: 'single' | 'day' | 'week', reason: string) => void;
}

export const BlockOptionsDialog = ({
  open,
  onOpenChange,
  time,
  date,
  onBlock,
}: BlockOptionsDialogProps) => {
  const [blockType, setBlockType] = useState<'single' | 'day' | 'week'>('single');
  const [reason, setReason] = useState('');

  const handleBlock = () => {
    onBlock(blockType, reason);
    setReason('');
    setBlockType('single');
    onOpenChange(false);
  };

  const getBlockDescription = () => {
    switch (blockType) {
      case 'single':
        return `${format(date, "dd/MM/yyyy")} às ${time}`;
      case 'day':
        return `Dia inteiro: ${format(date, "dd/MM/yyyy")}`;
      case 'week':
        const weekStart = startOfWeek(date, { locale: ptBR });
        const weekEnd = endOfWeek(date, { locale: ptBR });
        return `Semana inteira: ${format(weekStart, "dd/MM")} a ${format(weekEnd, "dd/MM/yyyy")}`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Bloquear Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de Bloqueio</Label>
            <RadioGroup value={blockType} onValueChange={(value: any) => setBlockType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Ban className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Horário Específico</p>
                    <p className="text-xs text-muted-foreground">Bloquear apenas este horário</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="day" id="day" />
                <Label htmlFor="day" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Dia Inteiro</p>
                    <p className="text-xs text-muted-foreground">Bloquear todos os horários do dia</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="week" id="week" />
                <Label htmlFor="week" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CalendarDays className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Semana Inteira</p>
                    <p className="text-xs text-muted-foreground">Bloquear todos os horários da semana</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Será bloqueado:</p>
            <p className="text-sm text-muted-foreground">{getBlockDescription()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Almoço, consulta médica, férias..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleBlock}>
            <Ban className="mr-2 h-4 w-4" />
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
