import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, QrCode, CheckCircle, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useMFA, EnrollmentData } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateRecoveryCodes } from '@/lib/recovery-codes';
import { RecoveryCodesDisplay } from './RecoveryCodesDisplay';

interface MFAEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'qrcode' | 'verify' | 'recovery' | 'complete';

export const MFAEnrollmentDialog = ({ open, onOpenChange }: MFAEnrollmentDialogProps) => {
  const [step, setStep] = useState<Step>('intro');
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const { startEnrollment, verifyEnrollment, cancelEnrollment } = useMFA();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setEnrollment(null);
      setVerificationCode('');
      setRecoveryCodes([]);
    }
  }, [open]);

  const handleStartEnrollment = async () => {
    setLoading(true);
    const data = await startEnrollment();
    if (data) {
      setEnrollment(data);
      setStep('qrcode');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!enrollment || verificationCode.length !== 6) return;

    setLoading(true);
    const result = await verifyEnrollment(enrollment.id, verificationCode);
    
    // Only proceed if verification was successful
    if (!result.success) {
      setLoading(false);
      return;
    }

    // MFA activated successfully! Now generate and save recovery codes
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user found after MFA verification');
      setStep('recovery');
      setLoading(false);
      return;
    }

    try {
      // Delete any existing recovery codes for this user
      const { error: deleteError } = await supabase
        .from('mfa_recovery_codes')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting old recovery codes:', deleteError);
      }

      // Generate new recovery codes
      const codes = generateRecoveryCodes();
      
      // Save ALL codes to database
      const { error: insertError } = await supabase
        .from('mfa_recovery_codes')
        .insert(
          codes.map(code => ({
            user_id: user.id,
            code: code,
            used: false
          }))
        );

      if (insertError) {
        console.error('Error saving recovery codes:', insertError);
        toast({
          title: 'Aviso',
          description: 'MFA ativado, mas houve erro ao salvar códigos de recuperação.',
          variant: 'destructive'
        });
        // Still show recovery step but with empty codes
        setStep('recovery');
      } else {
        console.log('Recovery codes saved successfully:', codes.length, 'codes');
        setRecoveryCodes(codes);
        setStep('recovery');
      }
    } catch (err) {
      console.error('Error in recovery codes flow:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao gerar códigos de recuperação.',
        variant: 'destructive'
      });
      setStep('recovery');
    }
    
    setLoading(false);
  };

  const handleClose = async () => {
    if (step !== 'complete' && step !== 'recovery' && enrollment) {
      await cancelEnrollment();
    }
    onOpenChange(false);
  };

  const handleComplete = () => {
    setStep('complete');
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  const copySecret = () => {
    if (enrollment?.totp.secret) {
      navigator.clipboard.writeText(enrollment.totp.secret);
      toast({
        title: 'Código copiado!',
        description: 'Cole no seu app autenticador.'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'intro' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Configurar Autenticação de Dois Fatores
              </DialogTitle>
              <DialogDescription>
                Aumente a segurança da sua conta usando um app autenticador
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <h4 className="font-medium">O que você vai precisar:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</div>
                    <span>Um app autenticador no seu celular</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</div>
                    <span>Escanear um QR Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</div>
                    <span>Inserir um código de 6 dígitos</span>
                  </div>
                </div>
              </div>

              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Apps recomendados: Google Authenticator, Authy, Microsoft Authenticator
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleStartEnrollment} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Começar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'qrcode' && enrollment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Escaneie o QR Code
              </DialogTitle>
              <DialogDescription>
                Abra seu app autenticador e escaneie o código abaixo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={enrollment.totp.qr_code}
                    alt="QR Code para MFA"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Ou insira o código manualmente:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-1.5 bg-muted rounded font-mono text-sm break-all">
                    {enrollment.totp.secret}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={() => setStep('verify')} className="flex-1">
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'verify' && enrollment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Verificar Configuração
              </DialogTitle>
              <DialogDescription>
                Digite o código de 6 dígitos do seu app autenticador
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de verificação</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('qrcode')} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verificar
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'recovery' && (
          <>
            <DialogHeader>
              <DialogTitle>Códigos de Recuperação</DialogTitle>
              <DialogDescription>
                Salve esses códigos em local seguro. Eles permitem login caso você perca o app autenticador.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {recoveryCodes.length > 0 ? (
                <RecoveryCodesDisplay
                  codes={recoveryCodes}
                  onConfirm={handleComplete}
                />
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      MFA ativado com sucesso! Você pode gerar códigos de recuperação na página de segurança.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleComplete} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">MFA Ativado com Sucesso!</h3>
              <p className="text-sm text-muted-foreground">
                Sua conta agora está mais segura
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
