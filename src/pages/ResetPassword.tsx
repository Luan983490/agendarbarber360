import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

type PageStatus = 'loading' | 'ready' | 'error';

const ResetPassword = () => {
  const { toast } = useToast();
  
  // Estados principais
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('Link inválido ou expirado. Solicite um novo link de recuperação.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Tokens de recovery armazenados em state
  const [recoveryTokens, setRecoveryTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Validação do token - roda UMA vez ao montar o componente
  useEffect(() => {
    const validateRecoveryToken = async () => {
      try {
        const currentHash = window.location.hash;
        
        // Se não tem hash ou é muito curto, é inválido
        if (!currentHash || currentHash.length < 50) {
          console.log('[ResetPassword] Hash ausente ou inválido');
          setErrorMessage('Link inválido ou expirado. Solicite um novo link de recuperação.');
          setStatus('error');
          return;
        }
        
        // Parse do hash
        const hashParams = new URLSearchParams(currentHash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || '';
        const type = hashParams.get('type');
        
        // Deve ser tipo recovery
        if (type !== 'recovery') {
          console.log('[ResetPassword] Tipo inválido:', type);
          setErrorMessage('Este não é um link de recuperação de senha válido.');
          setStatus('error');
          return;
        }
        
        // Token deve existir e ter tamanho mínimo
        if (!accessToken || accessToken.length < 20) {
          console.log('[ResetPassword] Token ausente ou inválido');
          setErrorMessage('Link expirado. Solicite um novo link de recuperação.');
          setStatus('error');
          return;
        }
        
        // Armazena tokens para uso posterior
        setRecoveryTokens({ accessToken, refreshToken });
        
        // Tenta estabelecer sessão para validar tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error('[ResetPassword] Erro ao validar sessão:', error.message);
          setErrorMessage('Link expirado ou inválido. Solicite um novo link de recuperação.');
          setStatus('error');
          return;
        }
        
        // Tokens válidos - mostra formulário
        console.log('[ResetPassword] Tokens válidos, pronto para redefinir senha');
        setStatus('ready');
        
      } catch (err) {
        console.error('[ResetPassword] Erro inesperado na validação:', err);
        setErrorMessage('Erro ao processar link. Tente novamente.');
        setStatus('error');
      }
    };
    
    validateRecoveryToken();
  }, []);

  // Handler do botão Cancelar - SEMPRE faz signOut antes de sair
  const handleCancel = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[ResetPassword] Erro ao fazer signOut no cancelar:', error);
    }
    window.location.href = '/auth';
  };

  // Handler do botão Voltar para Login (na tela de erro)
  const handleBackToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[ResetPassword] Erro ao fazer signOut:', error);
    }
    window.location.href = '/auth';
  };

  // Handler do submit - atualiza senha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: senhas coincidem
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas não são iguais.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validação: mínimo 8 caracteres
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
      // Re-estabelece sessão com os tokens armazenados
      if (recoveryTokens) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });
        
        if (sessionError) {
          console.error('[ResetPassword] Erro ao re-estabelecer sessão:', sessionError);
          toast({
            title: 'Link expirado',
            description: 'Solicite um novo link de recuperação.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (updateError) {
        console.error('[ResetPassword] Erro ao atualizar senha:', updateError);
        toast({
          title: 'Erro ao atualizar senha',
          description: updateError.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // SUCESSO!
      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Você será redirecionado para o login.',
      });
      
      // CRÍTICO: Sempre faz signOut após trocar senha
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('[ResetPassword] Erro no signOut após sucesso:', signOutError);
      }
      
      // Limpa tokens da memória
      setRecoveryTokens(null);
      
      // Aguarda 2 segundos e redireciona
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
      
    } catch (error) {
      console.error('[ResetPassword] Erro inesperado:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={b360Logo} alt="B360" className="h-16" />
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            {/* Estado: Loading */}
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Validando link...</CardTitle>
                <CardDescription>
                  Por favor, aguarde enquanto verificamos seu link de recuperação.
                </CardDescription>
              </>
            )}

            {/* Estado: Ready - Formulário de nova senha */}
            {status === 'ready' && !isSubmitting && (
              <>
                <div className="flex justify-center mb-4">
                  <KeyRound className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Redefinir Senha</CardTitle>
                <CardDescription>
                  Digite sua nova senha abaixo.
                </CardDescription>
              </>
            )}

            {/* Estado: Submitting */}
            {status === 'ready' && isSubmitting && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-green-600">Senha Atualizada!</CardTitle>
                <CardDescription>
                  Sua senha foi alterada com sucesso. Redirecionando para o login...
                </CardDescription>
              </>
            )}

            {/* Estado: Error */}
            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Link Inválido</CardTitle>
                <CardDescription>
                  {errorMessage}
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Formulário de nova senha */}
            {status === 'ready' && !isSubmitting && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo: Nova Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="pr-10"
                      placeholder="Mínimo 8 caracteres"
                      disabled={isSubmitting}
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
                
                {/* Campo: Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      className={`pr-10 ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword 
                          ? 'border-destructive focus-visible:ring-destructive' 
                          : ''
                      }`}
                      placeholder="Repita a nova senha"
                      disabled={isSubmitting}
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
                
                {/* Botão: Redefinir Senha */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    isSubmitting ||
                    formData.password.length < 8 || 
                    formData.password !== formData.confirmPassword
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Redefinir Senha'
                  )}
                </Button>
                
                {/* Botão: Cancelar */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </form>
            )}

            {/* Tela de sucesso - loading de redirecionamento */}
            {status === 'ready' && isSubmitting && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">
                  Redirecionando para o login...
                </p>
              </div>
            )}

            {/* Tela de erro - botão voltar */}
            {status === 'error' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Solicite um novo link de recuperação na página de login.
                </p>
                <Button onClick={handleBackToLogin} className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
