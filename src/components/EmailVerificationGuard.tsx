import { useEmailVerification } from '@/hooks/useEmailVerification';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Loader2, Shield, LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import b360Logo from '@/assets/b360-logo.png';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export const EmailVerificationGuard = ({ children }: EmailVerificationGuardProps) => {
  const { user, signOut } = useAuth();
  const { isVerified, isExpired, loading, resendEmail, isResending } = useEmailVerification();
  const { toast } = useToast();

  // Don't block if no user, still loading, or verified
  if (!user || loading || isVerified) {
    return <>{children}</>;
  }

  // Only block if grace period expired and email not verified
  if (!isExpired) {
    return <>{children}</>;
  }

  const handleResend = async () => {
    try {
      await resendEmail();
      toast({
        title: 'Email reenviado!',
        description: 'Verifique sua caixa de entrada e pasta de spam.',
      });
    } catch {
      toast({
        title: 'Erro ao reenviar',
        description: 'Tente novamente em alguns minutos.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50 shadow-2xl">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          {/* Logo */}
          <img src={b360Logo} alt="B360" className="h-10 mx-auto" />

          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Confirmação de Email Necessária
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para sua segurança, precisamos que confirme seu endereço de email para continuar usando o sistema.
            </p>
          </div>

          {/* Email info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span className="font-medium">{user.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Verifique sua caixa de entrada e pasta de spam
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Reenviar Email de Confirmação
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Já confirmei, verificar novamente
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>

          {/* Security note */}
          <p className="text-xs text-muted-foreground/70">
            🔒 Esta verificação protege sua conta contra uso não autorizado
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
