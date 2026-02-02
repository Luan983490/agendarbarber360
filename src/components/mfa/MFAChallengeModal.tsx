import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useAuth } from '@/hooks/useAuth';
import b360Logo from '@/assets/b360-logo.png';

interface MFAChallengeModalProps {
  onSuccess?: () => void;
}

export const MFAChallengeModal = ({ onSuccess }: MFAChallengeModalProps) => {
  const { needsChallenge, challenge, error, isLoading, clearError, refreshStatus } = useMFA();
  const { signOut } = useAuth();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Refresh MFA status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    const success = await challenge(code);
    setIsVerifying(false);

    if (success) {
      setCode('');
      onSuccess?.();
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isVerifying) {
      handleVerify();
    }
  };

  // Don't render if MFA challenge is not needed
  if (!needsChallenge) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={b360Logo} alt="B360" className="h-16" />
        </div>

        {/* Card */}
        <div className="bg-card border rounded-lg shadow-lg p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-semibold">Verificação de Segurança</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta está protegida com autenticação de dois fatores.
              Digite o código do seu aplicativo autenticador para continuar.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Código inválido</AlertTitle>
              <AlertDescription>
                O código digitado está incorreto ou expirou. Tente novamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                clearError();
              }}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              maxLength={6}
              className="text-center text-3xl tracking-[0.5em] font-mono h-14"
              autoComplete="one-time-code"
              autoFocus
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground text-center">
              Use o Google Authenticator, Authy ou similar
            </p>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="w-full h-12"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>

          {/* Logout option */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair e usar outra conta
            </Button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground">
          Não consegue acessar o código? Entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
};
