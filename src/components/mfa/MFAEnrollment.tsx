import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldAlert, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const MFAEnrollment = () => {
  const {
    status,
    isLoading,
    error,
    enrollmentData,
    enroll,
    verifyEnrollment,
    unenroll,
    cancelEnrollment,
    clearError,
  } = useMFA();

  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleEnroll = async () => {
    const result = await enroll();
    if (result) {
      toast({
        title: 'QR Code gerado',
        description: 'Escaneie o código com seu aplicativo autenticador.',
      });
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'O código deve ter 6 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    const success = await verifyEnrollment(code);
    setIsVerifying(false);

    if (success) {
      setCode('');
      toast({
        title: 'MFA ativado!',
        description: 'Sua conta agora está protegida com autenticação de dois fatores.',
      });
    }
  };

  const handleDisable = async () => {
    const success = await unenroll();
    setShowDisableConfirm(false);

    if (success) {
      toast({
        title: 'MFA desativado',
        description: 'A autenticação de dois fatores foi removida da sua conta.',
      });
    }
  };

  const handleCopySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Código secreto copiado para a área de transferência.',
      });
    }
  };

  const handleCancel = () => {
    cancelEnrollment();
    setCode('');
  };

  // MFA already enabled
  if (status === 'enabled' && !enrollmentData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-green-500" />
              <div>
                <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
                <CardDescription>Sua conta está protegida</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-500">
              Ativo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Proteção ativa</AlertTitle>
            <AlertDescription>
              Sua conta está protegida com autenticação de dois fatores via TOTP.
              Você precisará do seu aplicativo autenticador para fazer login.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={() => setShowDisableConfirm(true)}
            disabled={isLoading}
          >
            Desativar MFA
          </Button>

          <Dialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Desativar Autenticação de Dois Fatores?</DialogTitle>
                <DialogDescription>
                  Isso removerá a proteção adicional da sua conta. Você poderá reativar a qualquer momento.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="outline" onClick={() => setShowDisableConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDisable} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Desativação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Enrollment in progress (showing QR code)
  if (enrollmentData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Configurar Autenticação de Dois Fatores</CardTitle>
              <CardDescription>Escaneie o código QR com seu aplicativo autenticador</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div
              className="bg-white p-4 rounded-lg shadow-md"
              dangerouslySetInnerHTML={{ __html: enrollmentData.qrCode }}
            />
            <p className="text-sm text-muted-foreground text-center">
              Use o Google Authenticator, Authy ou outro app compatível
            </p>
          </div>

          {/* Manual entry secret */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Ou digite o código manualmente:
            </Label>
            <div className="flex gap-2">
              <Input
                value={enrollmentData.secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopySecret}>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Verification code input */}
          <div className="space-y-2">
            <Label htmlFor="totp-code">Digite o código de 6 dígitos do app:</Label>
            <Input
              id="totp-code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                clearError();
              }}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              autoComplete="one-time-code"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="flex-1"
            >
              {isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verificar e Ativar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // MFA not enabled - show enrollment button
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-yellow-500" />
          <div>
            <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
            <CardDescription>Adicione uma camada extra de segurança</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Proteção recomendada</AlertTitle>
          <AlertDescription>
            A autenticação de dois fatores (MFA) protege sua conta mesmo que sua senha seja comprometida.
            Você usará um aplicativo autenticador como Google Authenticator ou Authy.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleEnroll} disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Shield className="h-4 w-4 mr-2" />
          Ativar Proteção de Conta
        </Button>
      </CardContent>
    </Card>
  );
};
