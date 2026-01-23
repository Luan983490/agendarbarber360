import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

type PageStatus = 'loading' | 'ready' | 'error' | 'success';

interface RecoveryTokens {
  accessToken: string;
  refreshToken: string;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [recoveryTokens, setRecoveryTokens] = useState<RecoveryTokens | null>(null);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PASSO 7-8: Validação dos tokens ao montar o componente
  useEffect(() => {
    const validateRecoveryToken = async () => {
      try {
        // PASSO 8A: Extrai tokens do hash da URL
        const hash = window.location.hash;
        
        // Validação: Hash existe?
        if (!hash || hash.length < 10) {
          setStatus('error');
          setErrorMessage('Link inválido. Solicite um novo link de recuperação.');
          return;
        }

        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token') || '';
        const type = params.get('type');

        // PASSO 8B: Validações básicas
        // Validação: type === 'recovery'?
        if (type !== 'recovery') {
          setStatus('error');
          setErrorMessage('Este não é um link de recuperação válido.');
          return;
        }

        // Validação: accessToken válido (>20 chars)?
        if (!accessToken || accessToken.length < 20) {
          setStatus('error');
          setErrorMessage('Link inválido ou corrompido.');
          return;
        }

        // PASSO 8C: Armazena tokens em estado
        setRecoveryTokens({ accessToken, refreshToken });

        // PASSO 8D: Tenta estabelecer sessão temporária para validar tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Erro ao validar tokens:', error);
          
          // Verifica tipo de erro
          if (error.message.includes('expired') || error.message.includes('invalid')) {
            setStatus('error');
            setErrorMessage('Este link expirou. Solicite um novo link de recuperação.');
          } else {
            setStatus('error');
            setErrorMessage('Erro ao validar link. Tente novamente ou solicite um novo.');
          }
          
          // Sempre faz signOut em caso de erro
          await supabase.auth.signOut();
          return;
        }

        // Verifica se realmente tem sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setStatus('error');
          setErrorMessage('Não foi possível estabelecer sessão. Solicite um novo link.');
          await supabase.auth.signOut();
          return;
        }

        // PASSO 8E: Tudo OK - pronto para redefinir senha
        setStatus('ready');

      } catch (err) {
        console.error('Erro inesperado na validação:', err);
        setStatus('error');
        setErrorMessage('Erro ao processar link de recuperação.');
        await supabase.auth.signOut();
      }
    };

    validateRecoveryToken();
  }, []); // Roda apenas uma vez ao montar

  // PASSO 10a: Handler do botão Cancelar
  const handleCancel = async () => {
    try {
      // CRÍTICO: Sempre faz signOut antes de sair
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    // Redireciona para login SEM estar logado
    window.location.href = '/auth';
  };

  // PASSO 10b: Handler do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações: Campos preenchidos?
    if (!formData.password || !formData.confirmPassword) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ambos os campos de senha.',
        variant: 'destructive',
      });
      return;
    }

    // Validações: Coincidem?
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas são diferentes.',
        variant: 'destructive',
      });
      return;
    }

    // Validações: Min 8 chars?
    if (formData.password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Re-estabelece sessão com os tokens salvos
      if (recoveryTokens) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });

        if (sessionError) {
          throw new Error('Erro ao restabelecer sessão. Token pode ter expirado.');
        }
      }

      // Atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        throw updateError;
      }

      // PASSO 11: Sucesso!
      setStatus('success');
      
      toast({
        title: 'Senha alterada com sucesso! ✅',
        description: 'Você será redirecionado para o login.',
      });

      // CRÍTICO: Sempre faz signOut após trocar senha
      await supabase.auth.signOut();

      // Aguarda 2 segundos e redireciona (PASSO 12)
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);

    } catch (error: unknown) {
      console.error('Erro ao redefinir senha:', error);
      
      const errorMsg = error instanceof Error ? error.message : 'Tente novamente ou solicite um novo link.';
      
      toast({
        title: 'Erro ao alterar senha',
        description: errorMsg,
        variant: 'destructive',
      });
      
      // Em caso de erro, também faz signOut
      await supabase.auth.signOut();
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // RENDERIZAÇÃO - PASSO 7: Estado de Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={b360Logo} alt="B360" className="h-16" />
            </div>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Validando link de recuperação...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO - TELA DE ERRO
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={b360Logo} alt="B360" className="h-16" />
            </div>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Link Inválido ou Expirado</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => window.location.href = '/auth'} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/auth'}
                className="w-full"
              >
                Solicitar Novo Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO - PASSO 11: Estado de Sucesso
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={b360Logo} alt="B360" className="h-16" />
            </div>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-green-600 mb-2">Senha Alterada! ✅</h2>
                  <p className="text-muted-foreground">Redirecionando para o login...</p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // RENDERIZAÇÃO - TELA DE FORMULÁRIO (PASSO 9)
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={b360Logo} alt="B360" className="h-16" />
          </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <KeyRound className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Criar Nova Senha</CardTitle>
            <CardDescription>Escolha uma senha forte para sua conta</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    disabled={isSubmitting}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && formData.password.length < 8 && (
                  <p className="text-xs text-destructive">
                    A senha deve ter no mínimo 8 caracteres
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Digite a senha novamente"
                    disabled={isSubmitting}
                    required
                    className={`pr-10 ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? 'border-destructive focus-visible:ring-destructive' 
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-destructive">
                    As senhas não coincidem
                  </p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 8 && (
                  <p className="text-xs text-green-600">
                    ✓ Senhas coincidem
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isSubmitting ||
                    formData.password.length < 8 || 
                    formData.password !== formData.confirmPassword
                  }
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Redefinir Senha'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
