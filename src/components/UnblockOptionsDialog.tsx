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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type UnblockType = 'single' | 'range' | 'day';

interface UnblockOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  time: string;
  selectedRange?: { startTime: string; endTime: string } | null;
  blocksCount: number;
  onUnblock: (type: UnblockType) => void;
}

export const UnblockOptionsDialog = ({
  open,
  onOpenChange,
  date,
  time,
  selectedRange,
  blocksCount,
  onUnblock,
}: UnblockOptionsDialogProps) => {
  const [unblockType, setUnblockType] = useState<UnblockType>('single');

  const handleUnblock = () => {
    onUnblock(unblockType);
    setUnblockType('single');
    onOpenChange(false);
  };

  const getUnblockDescription = () => {
    switch (unblockType) {
      case 'single':
        return `Horário: ${time} em ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
      case 'range':
        if (selectedRange) {
          return `Faixa: ${selectedRange.startTime} até ${selectedRange.endTime} em ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
        }
        return 'Selecione uma faixa de horários';
      case 'day':
        return `Dia inteiro: ${format(date, "dd/MM/yyyy", { locale: ptBR })} (${blocksCount} bloqueio(s))`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Desbloquear Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de Desbloqueio</Label>
            <RadioGroup value={unblockType} onValueChange={(value: UnblockType) => setUnblockType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Este Horário</p>
                    <p className="text-xs text-muted-foreground">Desbloquear apenas o slot {time}</p>
                  </div>
                </Label>
              </div>

              {selectedRange && (
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Clock className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Faixa Selecionada</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRange.startTime} até {selectedRange.endTime}
                      </p>
                    </div>
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="day" id="day" />
                <Label htmlFor="day" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Calendar className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Dia Inteiro</p>
                    <p className="text-xs text-muted-foreground">
                      Remover todos os {blocksCount} bloqueio(s) do dia
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Será desbloqueado:</p>
            <p className="text-sm text-muted-foreground">{getUnblockDescription()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleUnblock}>
            <Trash2 className="mr-2 h-4 w-4" />
            Desbloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
