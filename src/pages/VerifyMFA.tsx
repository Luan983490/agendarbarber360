import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Key, Loader2, ArrowLeft } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

interface MFAChallengeData {
  factorId: string;
  userId: string;
}

const VerifyMFA = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [challengeData, setChallengeData] = useState<MFAChallengeData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se tem challenge pendente
    const storedData = sessionStorage.getItem('mfa_challenge');
    
    if (!storedData) {
      console.log('[VerifyMFA] Sem challenge pendente, redirecionando para login');
      navigate('/auth', { replace: true });
      return;
    }

    try {
      const data = JSON.parse(storedData) as MFAChallengeData;
      setChallengeData(data);
      console.log('[VerifyMFA] Challenge carregado:', data.factorId);
    } catch (error) {
      console.error('[VerifyMFA] Erro ao parsear challenge:', error);
      sessionStorage.removeItem('mfa_challenge');
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleVerifyTOTP = async () => {
    if (!challengeData || code.length !== 6) return;

    setLoading(true);
    try {
      console.log('[VerifyMFA] Criando challenge TOTP...');
      
      // Criar challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: challengeData.factorId
      });

      if (challengeError) {
        console.error('[VerifyMFA] Erro ao criar challenge:', challengeError);
        throw challengeError;
      }

      console.log('[VerifyMFA] Verificando código...');
      
      // Verificar código
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: challengeData.factorId,
        challengeId: challenge.id,
        code: code
      });

      if (verifyError) {
        console.error('[VerifyMFA] Código inválido:', verifyError);
        toast({
          title: 'Código inválido',
          description: 'Verifique o código e tente novamente.',
          variant: 'destructive'
        });
        setCode('');
        return;
      }

      console.log('[VerifyMFA] ✅ MFA verificado com sucesso!');
      
      // Limpar challenge
      sessionStorage.removeItem('mfa_challenge');
      
      toast({
        title: 'Verificação concluída',
        description: 'Login realizado com sucesso!'
      });

      // Redirecionar para dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[VerifyMFA] Erro:', error);
      toast({
        title: 'Erro na verificação',
        description: error.message || 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!challengeData || code.length < 10) return;

    setLoading(true);
    try {
      console.log('[VerifyMFA] Verificando código de recuperação...');
      
      // Buscar código de recuperação válido
      const { data: recoveryCode, error: fetchError } = await supabase
        .from('mfa_recovery_codes')
        .select('*')
        .eq('user_id', challengeData.userId)
        .eq('code', code.toUpperCase())
        .eq('used', false)
        .single();

      if (fetchError || !recoveryCode) {
        console.error('[VerifyMFA] Código de recuperação inválido:', fetchError);
        toast({
          title: 'Código inválido',
          description: 'Este código de recuperação não existe ou já foi usado.',
          variant: 'destructive'
        });
        setCode('');
        return;
      }

      // Marcar como usado
      const { error: updateError } = await supabase
        .from('mfa_recovery_codes')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', recoveryCode.id);

      if (updateError) {
        console.error('[VerifyMFA] Erro ao marcar código como usado:', updateError);
      }

      console.log('[VerifyMFA] ✅ Código de recuperação verificado!');
      
      // Limpar challenge
      sessionStorage.removeItem('mfa_challenge');
      
      toast({
        title: 'Verificação concluída',
        description: 'Login realizado com código de recuperação. Considere gerar novos códigos.'
      });

      // Redirecionar para dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('[VerifyMFA] Erro:', error);
      toast({
        title: 'Erro na verificação',
        description: error.message || 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    console.log('[VerifyMFA] Cancelando verificação...');
    
    // Fazer logout
    await supabase.auth.signOut();
    
    // Limpar challenge
    sessionStorage.removeItem('mfa_challenge');
    
    // Voltar para login
    navigate('/auth', { replace: true });
  };

  if (!challengeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={b360Logo} alt="B360" className="h-12 mx-auto" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            {isRecovery ? (
              <>
                <Key className="h-5 w-5 text-primary" />
                Código de Recuperação
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-primary" />
                Verificação de Dois Fatores
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isRecovery 
              ? 'Digite um dos seus códigos de recuperação. Cada código só pode ser usado uma vez.'
              : 'Digite o código de 6 dígitos do seu app autenticador'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isRecovery ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código de verificação</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6) {
                      handleVerifyTOTP();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleVerifyTOTP}
                disabled={loading || code.length !== 6}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setIsRecovery(true);
                    setCode('');
                  }}
                  className="text-muted-foreground"
                >
                  <Key className="h-4 w-4 mr-1" />
                  Usar código de recuperação
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="recovery-code">Código de recuperação</Label>
                <Input
                  id="recovery-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="text-center font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length >= 10) {
                      handleVerifyRecovery();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleVerifyRecovery}
                disabled={loading || code.length < 10}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setIsRecovery(false);
                  setCode('');
                }}
                className="w-full text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar para código do app
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full text-muted-foreground"
          >
            Cancelar e sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyMFA;
