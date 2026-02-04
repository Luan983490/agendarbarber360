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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatRecoveryCode, isValidRecoveryCodeFormat } from '@/lib/recovery-codes';

interface RecoveryCodeLoginProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export const RecoveryCodeLogin = ({
  open,
  onOpenChange,
  userId,
  onSuccess
}: RecoveryCodeLoginProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleCodeChange = (value: string) => {
    // Auto-format as user types
    const cleaned = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (cleaned.length <= 14) { // 12 chars + 2 dashes
      setCode(cleaned);
    }
    setError('');
  };

  const handleSubmit = async () => {
    const formattedCode = formatRecoveryCode(code);
    
    if (!isValidRecoveryCodeFormat(formattedCode)) {
      setError('Formato de código inválido. Use o formato XXXX-XXXX-XXXX.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if code exists and is not used
      const { data: recoveryCode, error: fetchError } = await supabase
        .from('mfa_recovery_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', formattedCode)
        .eq('used', false)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!recoveryCode) {
        setError('Código inválido ou já utilizado.');
        setLoading(false);
        return;
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from('mfa_recovery_codes')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', recoveryCode.id);

      if (updateError) throw updateError;

      toast({
        title: 'Login realizado!',
        description: 'Recovery code usado com sucesso. Recomendamos reconfigurar o MFA.'
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error using recovery code:', err);
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Código de Recuperação
          </DialogTitle>
          <DialogDescription>
            Digite um dos seus códigos de recuperação para fazer login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-500 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
              Cada código só pode ser usado uma vez. Após usar, recomendamos 
              reconfigurar o MFA e gerar novos códigos de recuperação.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Input
              placeholder="XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="font-mono text-center text-lg tracking-wider"
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || code.replace(/-/g, '').length < 12}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Verificar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
