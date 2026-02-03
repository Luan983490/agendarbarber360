import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useMFA } from '@/hooks/useMFA';
import { Shield, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';

interface MFAVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function MFAVerificationModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  onCancel 
}: MFAVerificationModalProps) {
  const { toast } = useToast();
  const { factors, createChallenge, verifyChallenge } = useMFA();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeCreated, setChallengeCreated] = useState(false);

  // Criar challenge quando modal abre
  useEffect(() => {
    if (open && factors.length > 0 && !challengeCreated) {
      const initChallenge = async () => {
        setIsLoading(true);
        const success = await createChallenge(factors[0].id);
        if (!success) {
          setError('Erro ao iniciar verificação. Tente novamente.');
        }
        setChallengeCreated(true);
        setIsLoading(false);
      };
      initChallenge();
    }
  }, [open, factors, createChallenge, challengeCreated]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCode('');
      setError(null);
      setChallengeCreated(false);
    }
  }, [open]);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    const result = await verifyChallenge(code);
    
    if (result.success) {
      toast({
        title: 'Verificação concluída',
        description: 'Login realizado com sucesso.',
      });
      onSuccess();
      onOpenChange(false);
    } else {
      setError(result.error || 'Código inválido');
      setCode('');
    }
    
    setIsLoading(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <DialogTitle>Verificação de Segurança</DialogTitle>
          <DialogDescription>
            Digite o código de 6 dígitos do seu app autenticador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 space-y-4">
          {isLoading && !challengeCreated ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Iniciando verificação...</span>
            </div>
          ) : (
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Abra seu app autenticador (Google Authenticator, Authy, etc.) e digite o código exibido.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleVerify}
            disabled={code.length !== 6 || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Verificar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
