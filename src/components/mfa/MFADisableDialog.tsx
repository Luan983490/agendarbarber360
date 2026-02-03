import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export const MFADisableDialog = ({ open, onOpenChange, onConfirm }: MFADisableDialogProps) => {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setConfirmation('');
  };

  const isConfirmed = confirmation.toLowerCase() === 'desativar';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Desativar Autenticação de Dois Fatores
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja desativar o MFA? Sua conta ficará menos segura.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ao desativar o MFA, qualquer pessoa com sua senha poderá acessar sua conta.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm">Digite "desativar" para confirmar</Label>
            <Input
              id="confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="desativar"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Desativar MFA
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
