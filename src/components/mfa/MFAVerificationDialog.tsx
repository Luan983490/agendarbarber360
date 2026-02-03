import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MFAVerificationDialog = ({
  open,
  onOpenChange,
  factorId,
  onSuccess,
  onCancel
}: MFAVerificationDialogProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    try {
      // Create challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // Verify code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryVerify = async () => {
    // Recovery code verification would go here
    // Supabase doesn't have built-in recovery codes, so this would need custom implementation
    toast({
      title: 'Código de recuperação',
      description: 'Verificação com código de recuperação em desenvolvimento.',
      variant: 'destructive'
    });
  };

  const handleCancel = async () => {
    // Sign out if MFA verification is cancelled
    await supabase.auth.signOut();
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {!showRecovery ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verificação de Dois Fatores
              </DialogTitle>
              <DialogDescription>
                Digite o código de 6 dígitos do seu app autenticador
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código de verificação</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6) {
                      handleVerify();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowRecovery(true)}
                  className="text-muted-foreground"
                >
                  <Key className="h-4 w-4 mr-1" />
                  Usar código de recuperação
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={handleCancel}
                className="w-full text-muted-foreground"
              >
                Cancelar e sair
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Código de Recuperação
              </DialogTitle>
              <DialogDescription>
                Digite um dos seus códigos de recuperação. Cada código só pode ser usado uma vez.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-code">Código de recuperação</Label>
                <Input
                  id="recovery-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  className="text-center font-mono"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleRecoveryVerify}
                disabled={loading || recoveryCode.length < 10}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowRecovery(false)}
                className="w-full text-muted-foreground"
              >
                Voltar para código do app
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
