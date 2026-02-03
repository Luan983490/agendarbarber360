import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMFA } from '@/hooks/useMFA';
import { Shield, AlertTriangle, Smartphone, Lock } from 'lucide-react';
import { MFAEnrollmentModal } from './MFAEnrollmentModal';

interface MFARequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MFARequiredModal({ open, onOpenChange }: MFARequiredModalProps) {
  const { canDismiss, incrementDismiss, dismissCount } = useMFA();
  const [showEnrollment, setShowEnrollment] = useState(false);

  const handleSetupNow = () => {
    setShowEnrollment(true);
  };

  const handleDismiss = () => {
    if (canDismiss) {
      incrementDismiss();
      onOpenChange(false);
    }
  };

  const handleEnrollmentComplete = (isOpen: boolean) => {
    setShowEnrollment(isOpen);
    if (!isOpen) {
      onOpenChange(false);
    }
  };

  const remainingDismisses = 3 - dismissCount;

  return (
    <>
      <Dialog open={open && !showEnrollment} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-lg"
          onInteractOutside={(e) => {
            if (!canDismiss) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <Shield className="h-10 w-10 text-amber-500" strokeWidth={1.5} />
              </div>
            </div>
            <DialogTitle className="text-xl">Ative a Autenticação em Dois Fatores</DialogTitle>
            <DialogDescription>
              Sua conta de proprietário requer proteção adicional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Algumas operações sensíveis estão bloqueadas 
                até você ativar a autenticação de dois fatores (MFA).
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Por que preciso do MFA?</h4>
              <p className="text-sm text-muted-foreground">
                Como proprietário de barbearia, você tem acesso a dados sensíveis de clientes, 
                agendamentos e finanças. O MFA protege essas informações contra acessos não autorizados.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Lock className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Proteção contra invasões</p>
                    <p className="text-xs text-muted-foreground">
                      Mesmo que sua senha seja descoberta, sua conta continua protegida.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded">
                    <Smartphone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Simples e rápido</p>
                    <p className="text-xs text-muted-foreground">
                      Use Google Authenticator, Authy ou outro app de sua preferência.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSetupNow} size="lg">
              <Shield className="mr-2 h-4 w-4" />
              Configurar Agora
            </Button>
            
            {canDismiss && (
              <Button variant="ghost" onClick={handleDismiss}>
                Lembrar Depois ({remainingDismisses} {remainingDismisses === 1 ? 'vez restante' : 'vezes restantes'})
              </Button>
            )}
            
            {!canDismiss && (
              <p className="text-xs text-center text-muted-foreground">
                Você já adiou 3 vezes. Configure o MFA para continuar usando todas as funcionalidades.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MFAEnrollmentModal
        open={showEnrollment}
        onOpenChange={handleEnrollmentComplete}
        required={true}
      />
    </>
  );
}
