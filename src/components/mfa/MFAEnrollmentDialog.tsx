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
import { Loader2, Smartphone, QrCode, CheckCircle, Copy, Download, AlertTriangle, ArrowRight, ArrowLeft, Key } from 'lucide-react';
import { useMFA, EnrollmentData } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';

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
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const { startEnrollment, verifyEnrollment, cancelEnrollment } = useMFA();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setEnrollment(null);
      setVerificationCode('');
      setBackupConfirmed(false);
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
    const codes = await verifyEnrollment(enrollment.id, verificationCode);
    if (codes && codes.length > 0) {
      setRecoveryCodes(codes);
      setStep('recovery');
    } else if (codes === null) {
      // Verification failed, stay on verify step
    } else {
      // Verification succeeded but no recovery codes - show secret as fallback
      setStep('recovery');
    }
    setLoading(false);
  };

  const handleClose = async () => {
    if (step !== 'complete' && enrollment) {
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

  // Use recovery codes from verify response, fallback to enrollment data
  const hasRecoveryCodes = recoveryCodes.length > 0;

  const copyRecoveryCodes = () => {
    if (hasRecoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast({
        title: 'Códigos copiados!',
        description: 'Guarde em um local seguro.'
      });
    } else if (enrollment?.totp.secret) {
      // Fallback: copy secret if no recovery codes
      navigator.clipboard.writeText(enrollment.totp.secret);
      toast({
        title: 'Código de backup copiado!',
        description: 'Guarde em um local seguro.'
      });
    }
  };

  const downloadRecoveryCodes = () => {
    let content: string;
    
    if (hasRecoveryCodes) {
      content = `CÓDIGOS DE RECUPERAÇÃO - Barber360
=====================================

⚠️ GUARDE ESTE ARQUIVO EM LOCAL SEGURO!
⚠️ NÃO COMPARTILHE COM NINGUÉM!

Use estes códigos se perder acesso ao app autenticador.
Cada código funciona apenas UMA VEZ.

=====================================
SEUS CÓDIGOS DE RECUPERAÇÃO:

${recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

=====================================

COMO USAR:
1. Na tela de login, após digitar email e senha
2. Clique em "Usar código de recuperação"
3. Digite um dos códigos acima
4. Após usar, o código será invalidado

=====================================
Gerado em: ${new Date().toLocaleString('pt-BR')}
Conta: Barber360
`;
    } else {
      // Fallback content with secret
      content = `CÓDIGO DE BACKUP - Barber360
=====================================

⚠️ GUARDE ESTE ARQUIVO EM LOCAL SEGURO!
⚠️ NÃO COMPARTILHE COM NINGUÉM!

Este código permite recuperar o acesso ao MFA se você:
- Trocar de celular
- Perder acesso ao app autenticador
- Desinstalar o app por engano

=====================================
CÓDIGO SECRETO:
${enrollment?.totp.secret}
=====================================

COMO USAR:
1. Instale um app autenticador (Google Authenticator, Authy, etc.)
2. Escolha "Adicionar conta manualmente" ou "Inserir chave"
3. Digite o código secreto acima
4. O app começará a gerar códigos de 6 dígitos

=====================================
Gerado em: ${new Date().toLocaleString('pt-BR')}
Conta: Barber360
`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barber360-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Download iniciado',
      description: 'Guarde o arquivo em local seguro.'
    });
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
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                Códigos de Recuperação
              </DialogTitle>
              <DialogDescription>
                Use estes códigos se perder acesso ao app autenticador. Cada código funciona apenas uma vez.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  <strong>⚠️ IMPORTANTE:</strong> Guarde estes códigos em local seguro. 
                  Eles não serão mostrados novamente!
                </AlertDescription>
              </Alert>

              {hasRecoveryCodes ? (
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {recoveryCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono text-center py-1.5 px-2 bg-background rounded border">
                      {code}
                    </code>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <p className="text-sm font-medium text-center">Seu código de backup:</p>
                  <div className="p-3 bg-background rounded border">
                    <code className="text-sm font-mono break-all block text-center">
                      {enrollment?.totp.secret}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Use este código para adicionar manualmente em um novo app autenticador
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={copyRecoveryCodes} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar todos
                </Button>
                <Button variant="outline" onClick={downloadRecoveryCodes} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar .txt
                </Button>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="backup-confirm"
                  checked={backupConfirmed}
                  onChange={(e) => setBackupConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="backup-confirm" className="text-sm text-muted-foreground">
                  Confirmo que salvei os códigos de recuperação em local seguro e entendo que não poderei 
                  visualizá-los novamente.
                </label>
              </div>

              <Button 
                onClick={handleComplete} 
                className="w-full"
                disabled={!backupConfirmed}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir Configuração
              </Button>
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
