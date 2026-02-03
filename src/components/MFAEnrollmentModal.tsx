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
import { useToast } from '@/hooks/use-toast';
import { useMFA } from '@/hooks/useMFA';
import { Shield, Smartphone, Copy, Download, Check, Loader2, AlertTriangle, Key } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';

type Step = 'intro' | 'scan' | 'verify' | 'recovery' | 'complete';

interface MFAEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required?: boolean;
}

export function MFAEnrollmentModal({ open, onOpenChange, required = false }: MFAEnrollmentModalProps) {
  const { toast } = useToast();
  const {
    enrollmentData,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    recoveryCodes,
    canDismiss,
    incrementDismiss,
  } = useMFA();

  const [step, setStep] = useState<Step>('intro');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [downloadedCodes, setDownloadedCodes] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('intro');
      setCode('');
      setError(null);
      setCopiedSecret(false);
      setCopiedCodes(false);
      setDownloadedCodes(false);
    } else {
      cancelEnrollment();
    }
  }, [open, cancelEnrollment]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);

    const success = await startEnrollment();
    
    if (success) {
      setStep('scan');
    } else {
      setError('Erro ao iniciar configuração. Tente novamente.');
    }
    
    setIsLoading(false);
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6 || !enrollmentData) return;

    setIsLoading(true);
    setError(null);

    const result = await verifyEnrollment(enrollmentData.id, code);
    
    if (result.success) {
      setStep('recovery');
      toast({
        title: 'MFA Ativado!',
        description: 'Autenticação de dois fatores configurada com sucesso.',
      });
    } else {
      setError(result.error || 'Código inválido');
      setCode('');
    }
    
    setIsLoading(false);
  };

  const handleCopySecret = async () => {
    if (!enrollmentData?.totp.secret) return;
    
    await navigator.clipboard.writeText(enrollmentData.totp.secret);
    setCopiedSecret(true);
    toast({ title: 'Código copiado!' });
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = async () => {
    const codesText = recoveryCodes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({ title: 'Códigos copiados!' });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const codesText = `CÓDIGOS DE RECUPERAÇÃO - B360\n${'='.repeat(40)}\n\nGuarde estes códigos em um local seguro.\nCada código só pode ser usado uma vez.\n\n${recoveryCodes.join('\n')}\n\nGerado em: ${new Date().toLocaleString('pt-BR')}`;
    
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'b360-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setDownloadedCodes(true);
    toast({ title: 'Códigos baixados!' });
  };

  const handleDismiss = () => {
    if (canDismiss) {
      incrementDismiss();
      onOpenChange(false);
    }
  };

  const handleComplete = () => {
    onOpenChange(false);
  };

  // Prevent closing if required and not on complete step
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && required && step !== 'complete') {
      if (canDismiss) {
        handleDismiss();
      }
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
        if (required && step !== 'complete') {
          e.preventDefault();
        }
      }}>
        {/* Step: Intro */}
        {step === 'intro' && (
          <>
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Shield className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <DialogTitle className="text-xl">Segurança da Conta</DialogTitle>
              <DialogDescription className="text-center">
                {required ? (
                  <span className="text-destructive font-medium">
                    A autenticação de dois fatores é obrigatória para sua conta.
                  </span>
                ) : (
                  'Adicione uma camada extra de segurança à sua conta.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">O que é MFA?</h4>
                <p className="text-sm text-muted-foreground">
                  A autenticação de dois fatores (MFA) adiciona uma camada extra de segurança, 
                  exigindo um código do seu celular além da senha.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Smartphone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span>Use um app como Google Authenticator ou Authy</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Key className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span>Proteja suas informações de negócio</span>
                </div>
              </div>

              {required && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Algumas operações estão bloqueadas até você configurar o MFA.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleStartSetup} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Configurar Agora'
                )}
              </Button>
              
              {canDismiss && required && (
                <Button variant="ghost" onClick={handleDismiss}>
                  Lembrar Depois ({3 - (useMFA as any).dismissCount}/3)
                </Button>
              )}
              
              {!required && (
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Agora Não
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step: Scan QR Code */}
        {step === 'scan' && enrollmentData && (
          <>
            <DialogHeader>
              <DialogTitle>Escaneie o QR Code</DialogTitle>
              <DialogDescription>
                Use seu app autenticador para escanear o código abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={enrollmentData.totp.qr_code} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>

              <div className="text-center space-y-2 w-full">
                <p className="text-sm text-muted-foreground">
                  Ou insira o código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">
                    {enrollmentData.totp.secret}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => setStep('verify')}>
              Próximo
            </Button>
          </>
        )}

        {/* Step: Verify Code */}
        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Insira o Código</DialogTitle>
              <DialogDescription>
                Digite o código de 6 dígitos do seu app autenticador.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-6 space-y-4">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={handleVerifyCode}
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

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('scan')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                onClick={handleVerifyCode}
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
          </>
        )}

        {/* Step: Recovery Codes */}
        {step === 'recovery' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" strokeWidth={1.5} />
                Códigos de Recuperação
              </DialogTitle>
              <DialogDescription>
                Guarde estes códigos em um local seguro. Você pode usá-los para acessar sua conta se perder o celular.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cada código só pode ser usado uma vez. Guarde-os em um local seguro!
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, index) => (
                  <code 
                    key={index} 
                    className="text-sm font-mono text-center py-1"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCopyCodes}
                  className="flex-1"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadCodes}
                  className="flex-1"
                >
                  {downloadedCodes ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                      Baixado
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => setStep('complete')}
              disabled={!copiedCodes && !downloadedCodes}
            >
              Concluir
            </Button>
          </>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <>
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Check className="h-8 w-8 text-green-500" strokeWidth={1.5} />
                </div>
              </div>
              <DialogTitle className="text-xl text-green-600">MFA Configurado!</DialogTitle>
              <DialogDescription>
                Sua conta agora está protegida com autenticação de dois fatores.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p>✅ Autenticação de dois fatores ativada</p>
                <p>✅ Códigos de recuperação salvos</p>
                <p>✅ Sua conta está mais segura</p>
              </div>
            </div>

            <Button onClick={handleComplete}>
              Fechar
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
