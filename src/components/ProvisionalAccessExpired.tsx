import { ShieldX, Mail, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import b360Logo from '@/assets/b360-logo.png';

interface ProvisionalAccessExpiredProps {
  email: string;
  onResend: () => void;
  onRefresh: () => void;
  isResending: boolean;
}

export const ProvisionalAccessExpired = ({
  email,
  onResend,
  onRefresh,
  isResending,
}: ProvisionalAccessExpiredProps) => {
  const { signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-destructive/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={b360Logo} alt="B360" className="h-12 mx-auto mb-2" />
          </div>
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">
            Acesso Provisório Expirado
          </CardTitle>
          <CardDescription className="text-base">
            Para continuar usando o sistema de agendamentos, você precisa confirmar seu e-mail.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Link de confirmação enviado para:
            </p>
            <p className="font-medium text-foreground break-all">
              {email}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onResend}
              disabled={isResending}
              className="w-full"
              size="lg"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isResending ? "Enviando..." : "Reenviar Link de Confirmação"}
            </Button>

            <Button
              onClick={onRefresh}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Já confirmei meu e-mail
            </Button>

            <Button
              onClick={signOut}
              variant="ghost"
              className="w-full text-muted-foreground"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair e usar outra conta
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Não recebeu o e-mail? Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
