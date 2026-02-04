import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Loader2, Smartphone } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { MFAEnrollmentDialog } from './MFAEnrollmentDialog';
import { MFADisableDialog } from './MFADisableDialog';
import { RecoveryCodesManagement } from './RecoveryCodesManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export const MFASettingsCard = () => {
  const { factors, loading, isMFAEnabled, fetchFactors } = useMFA();
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const verifiedFactor = factors.find(f => f.status === 'verified');

  const handleToggle = () => {
    if (isMFAEnabled) {
      setShowDisableDialog(true);
    } else {
      setShowEnrollDialog(true);
    }
  };

  const handleDisableSuccess = () => {
    setShowDisableDialog(false);
    fetchFactors();
  };

  const handleEnrollClose = (open: boolean) => {
    setShowEnrollDialog(open);
    if (!open) {
      // Refetch factors when dialog closes
      fetchFactors();
    }
  };

  if (loading) {
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
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
              ) : (
                <div className="p-2 bg-muted rounded-lg">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">Autenticação de Dois Fatores (MFA)</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
            <Badge variant={isMFAEnabled ? 'default' : 'secondary'} className={isMFAEnabled ? 'bg-green-500' : ''}>
              {isMFAEnabled ? 'Ativo ✓' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">App Autenticador</p>
                <p className="text-sm text-muted-foreground">
                  Google Authenticator, Authy, Microsoft Authenticator
                </p>
              </div>
            </div>
            <Switch
              checked={isMFAEnabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {isMFAEnabled && verifiedFactor && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Ativado em:</span>
                  <span className="font-medium">
                    {format(new Date(verifiedFactor.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {verifiedFactor.friendly_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Dispositivo:</span>
                    <span className="font-medium">{verifiedFactor.friendly_name}</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowDisableDialog(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Desativar MFA
              </Button>
            </div>
          )}

          {!isMFAEnabled && (
            <div className="p-4 border border-dashed rounded-lg bg-muted/30">
              <div className="space-y-2">
                <p className="text-sm font-medium">Por que ativar o MFA?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Proteção extra contra acessos não autorizados</li>
                  <li>• Mesmo que alguém descubra sua senha, não conseguirá acessar</li>
                  <li>• Recomendado para contas com dados sensíveis</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Codes Management - shown when MFA is enabled */}
      {isMFAEnabled && userId && (
        <RecoveryCodesManagement
          userId={userId}
          isMFAEnabled={isMFAEnabled}
        />
      )}

      <MFAEnrollmentDialog
        open={showEnrollDialog}
        onOpenChange={handleEnrollClose}
      />

      {verifiedFactor && (
        <MFADisableDialog
          open={showDisableDialog}
          onOpenChange={setShowDisableDialog}
          factorId={verifiedFactor.id}
          onSuccess={handleDisableSuccess}
        />
      )}
    </>
  );
};
