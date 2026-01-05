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
import { Ban, Trash2 } from 'lucide-react';

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  date: Date;
  isBlocked: boolean;
  blockId?: string;
  onBlock: (reason: string) => void;
  onUnblock: () => void;
}

export const BlockTimeDialog = ({
  open,
  onOpenChange,
  time,
  date,
  isBlocked,
  blockId,
  onBlock,
  onUnblock,
}: BlockTimeDialogProps) => {
  const [reason, setReason] = useState('');

  const handleBlock = () => {
    onBlock(reason);
    setReason('');
    onOpenChange(false);
  };

  const handleUnblock = () => {
    onUnblock();
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

          {isBlocked && (
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
