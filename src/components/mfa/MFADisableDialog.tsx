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
import { ShieldOff, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFADisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factorId: string;
  onSuccess: () => void;
}

export const MFADisableDialog = ({ open, onOpenChange, factorId, onSuccess }: MFADisableDialogProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    setCode('');
    setLoading(false);
    onOpenChange(false);
  };

  const handleDisable = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    try {
      // 1. Criar desafio MFA
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) {
        throw challengeError;
      }

      // 2. Verificar código
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code
      });

      if (verifyError) {
        throw verifyError;
      }

      // 3. Agora sim pode desativar
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

      if (unenrollError) {
        throw unenrollError;
      }

      // Sucesso!
      toast({
        title: 'MFA desativado',
        description: 'Autenticação de dois fatores foi removida com sucesso.'
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao desativar MFA:', error);
      
      // Mensagem de erro mais amigável
      let errorMessage = 'Ocorreu um erro ao desativar o MFA.';
      if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
        errorMessage = 'Código inválido. Verifique e tente novamente.';
      }
      
      toast({
        title: 'Erro ao desativar MFA',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Desativar Autenticação de Dois Fatores
          </AlertDialogTitle>
          <AlertDialogDescription>
            Para sua segurança, confirme sua identidade antes de desativar o MFA.
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
            <Label htmlFor="mfa-code" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Digite o código de 6 dígitos do seu app autenticador
            </Label>
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
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleDisable();
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              Abra seu app autenticador e digite o código atual
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={code.length !== 6 || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Desativar MFA
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
