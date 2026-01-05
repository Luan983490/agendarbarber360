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
import { Ban, Trash2, Calendar } from 'lucide-react';

type UnblockType = 'single' | 'day';

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  date: Date;
  isBlocked: boolean;
  blockId?: string;
  blockReason?: string;
  hasMultipleBlocks?: boolean;
  onBlock: (reason: string) => void;
  onUnblock: (type?: UnblockType) => void;
}

export const BlockTimeDialog = ({
  open,
  onOpenChange,
  time,
  date,
  isBlocked,
  blockId,
  blockReason,
  hasMultipleBlocks = false,
  onBlock,
  onUnblock,
}: BlockTimeDialogProps) => {
  const [reason, setReason] = useState('');
  const [unblockType, setUnblockType] = useState<UnblockType>('single');

  const handleBlock = () => {
    onBlock(reason);
    setReason('');
    onOpenChange(false);
  };

  const handleUnblock = () => {
    onUnblock(hasMultipleBlocks ? unblockType : 'single');
    setUnblockType('single');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBlocked ? (
              <>
                <Trash2 className="h-5 w-5" />
                Desbloquear Horário
              </>
            ) : (
              <>
                <Ban className="h-5 w-5" />
                Bloquear Horário
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Data:</p>
            <p className="font-semibold">{date.toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Horário:</p>
            <p className="font-semibold">{time}</p>
          </div>

          {isBlocked && blockReason && (
            <div>
              <p className="text-sm text-muted-foreground">Motivo do bloqueio:</p>
              <p className="font-medium text-sm">{blockReason}</p>
            </div>
          )}

          {!isBlocked && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Almoço, consulta médica, etc."
                rows={3}
              />
            </div>
          )}

          {isBlocked && hasMultipleBlocks && (
            <div className="space-y-3">
              <Label>Tipo de Desbloqueio</Label>
              <RadioGroup value={unblockType} onValueChange={(value: UnblockType) => setUnblockType(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Ban className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Apenas este horário</p>
                      <p className="text-xs text-muted-foreground">Desbloquear somente o slot selecionado</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="day" id="day" />
                  <Label htmlFor="day" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Dia inteiro</p>
                      <p className="text-xs text-muted-foreground">Desbloquear todos os horários do dia</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {isBlocked && !hasMultipleBlocks && (
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja desbloquear este horário?
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {isBlocked ? (
            <Button variant="destructive" onClick={handleUnblock}>
              <Trash2 className="mr-2 h-4 w-4" />
              Desbloquear
            </Button>
          ) : (
            <Button onClick={handleBlock}>
              <Ban className="mr-2 h-4 w-4" />
              Bloquear
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};