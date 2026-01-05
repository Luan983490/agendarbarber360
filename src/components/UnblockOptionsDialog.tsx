import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Unlock, Calendar, Clock, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type UnblockType = 'single' | 'range' | 'day';

interface UnblockOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  date: Date;
  blockReason?: string | null;
  onUnblock: (type: UnblockType) => void;
  hasMultipleBlocks?: boolean;
}

export const UnblockOptionsDialog = ({
  open,
  onOpenChange,
  time,
  date,
  blockReason,
  onUnblock,
  hasMultipleBlocks = false,
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
        return `Apenas o horário das ${time}`;
      case 'range':
        return 'Todos os bloqueios contínuos selecionados';
      case 'day':
        return `Todos os bloqueios do dia ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Desbloquear Horário
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja desbloquear os horários
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Data:</p>
              <p className="font-semibold">{format(date, "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Horário:</p>
              <p className="font-semibold">{time}</p>
            </div>
          </div>

          {blockReason && (
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Motivo do bloqueio:</p>
              <p className="text-sm">{blockReason}</p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Tipo de Desbloqueio</Label>
            <RadioGroup value={unblockType} onValueChange={(value: UnblockType) => setUnblockType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Este Horário</p>
                    <p className="text-xs text-muted-foreground">Desbloquear apenas este slot</p>
                  </div>
                </Label>
              </div>

              {hasMultipleBlocks && (
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="range" id="range" />
                  <Label htmlFor="range" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Faixa Selecionada</p>
                      <p className="text-xs text-muted-foreground">Desbloquear todos os bloqueios contínuos</p>
                    </div>
                  </Label>
                </div>
              )}

              <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="day" id="day" />
                <Label htmlFor="day" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Dia Inteiro</p>
                    <p className="text-xs text-muted-foreground">Desbloquear todos os horários do dia</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <p className="text-sm font-medium text-amber-600">Será desbloqueado:</p>
            <p className="text-sm text-muted-foreground">{getUnblockDescription()}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="default" onClick={handleUnblock}>
            <Unlock className="mr-2 h-4 w-4" />
            Desbloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};