import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useMFA } from '@/hooks/useMFA';
import { Shield, ShieldCheck, ShieldOff, Smartphone, Key, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { MFAEnrollmentModal } from './MFAEnrollmentModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MFASettings() {
  const { toast } = useToast();
  const {
    isLoading,
    isMFARequired,
    isMFAEnabled,
    factors,
    currentAAL,
    unenrollFactor,
    refreshMFAStatus,
  } = useMFA();

  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const verifiedFactor = factors.find(f => f.status === 'verified');

  const handleDisableMFA = async () => {
    if (!verifiedFactor) return;

    setIsDisabling(true);
    const result = await unenrollFactor(verifiedFactor.id);
    
    if (result.success) {
      toast({
        title: 'MFA Desativado',
        description: 'A autenticação de dois fatores foi removida da sua conta.',
      });
    } else {
      toast({
        title: 'Erro ao desativar',
        description: result.error,
        variant: 'destructive',
      });
    }
    
    setIsDisabling(false);
  };

  const handleEnrollmentComplete = async (isOpen: boolean) => {
    setShowEnrollment(isOpen);
    if (!isOpen) {
      await refreshMFAStatus();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMFAEnabled ? (
                <ShieldCheck className="h-6 w-6 text-green-500" strokeWidth={1.5} />
              ) : (
                <Shield className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              )}
              <div>
                <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
            <Badge variant={isMFAEnabled ? 'default' : 'secondary'}>
              {isMFAEnabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isMFARequired && !isMFAEnabled && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                MFA é obrigatório para sua conta. Configure agora para acessar todas as funcionalidades.
              </AlertDescription>
            </Alert>
          )}

          {isMFAEnabled && verifiedFactor ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-sm">App Autenticador</p>
                      <p className="text-xs text-muted-foreground">
                        {verifiedFactor.friendly_name || 'Authenticator App'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Verificado
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Configurado em {format(new Date(verifiedFactor.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>Nível de segurança atual: {currentAAL === 'aal2' ? 'Verificado (AAL2)' : 'Básico (AAL1)'}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEnrollment(true)}
                  className="flex-1"
                >
                  Reconfigurar
                </Button>

                {!isMFARequired && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex-1" disabled={isDisabling}>
                        {isDisabling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desativar MFA?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá a autenticação de dois fatores da sua conta. 
                          Sua conta ficará menos protegida contra acessos não autorizados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisableMFA}>
                          Sim, desativar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {isMFARequired && (
                <p className="text-xs text-muted-foreground text-center">
                  MFA é obrigatório para sua conta e não pode ser desativado.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A autenticação de dois fatores adiciona uma camada extra de segurança, 
                  exigindo um código do seu celular além da senha.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Use Google Authenticator, Authy ou similar</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-primary" />
                    <span>Códigos de recuperação para emergências</span>
                  </div>
                </div>
              </div>

              <Button onClick={() => setShowEnrollment(true)} className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Configurar MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MFAEnrollmentModal
        open={showEnrollment}
        onOpenChange={handleEnrollmentComplete}
        required={isMFARequired}
      />
    </>
  );
}
