import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Check, X, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

type PageStatus = 'validating' | 'ready' | 'submitting' | 'success' | 'error';

// Password strength checker
const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const percentage = (score / 5) * 100;
  
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return { checks, score, percentage, strength };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<PageStatus>('validating');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // CRITICAL FIX: Store tokens in state to persist across the entire flow
  const [recoveryTokens, setRecoveryTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const passwordStrength = checkPasswordStrength(formData.password);

  // CRITICAL: First useEffect - Check for valid recovery hash on mount
  useEffect(() => {
    const currentHash = window.location.hash;
    
    if (!currentHash || !currentHash.includes('type=recovery')) {
      // Se não tem hash de recovery, força logout e volta pro login
      const clearAndRedirect = async () => {
        console.log('[ResetPassword] No recovery hash found, signing out and redirecting...');
        await supabase.auth.signOut();
        window.location.href = '/auth';
      };
      clearAndRedirect();
    }
  }, []); // Roda apenas uma vez ao montar

  // Protection against page reload - prevents accidental login
  useEffect(() => {
    const preventAccidentalLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Se tem sessão mas não tem tokens de recovery, faz logout
      if (session && !recoveryTokens) {
        console.log('[ResetPassword] Session exists but no recovery tokens, signing out to prevent accidental login...');
        await supabase.auth.signOut();
      }
    };
    
    preventAccidentalLogin();
  }, [recoveryTokens]);

  // Validate token on mount with enhanced expiration checks
  useEffect(() => {
    const validateToken = async () => {
      try {
        const currentHash = window.location.hash;
        
        // Se não tem hash, não tenta nada
        if (!currentHash || currentHash.length < 10) {
          console.log('[ResetPassword] No hash found or hash too short');
          setErrorMessage('Link de recuperação inválido ou expirado. Solicite um novo link na página de login.');
          setStatus('error');
          return;
        }
        
        const hashParams = new URLSearchParams(currentHash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || '';
        const type = hashParams.get('type');
        
        console.log('[ResetPassword] Hash captured:', currentHash ? 'EXISTS' : 'EMPTY');
        console.log('[ResetPassword] Type:', type, 'Has access_token:', !!accessToken, 'Has refresh_token:', !!refreshToken);
        
        // CRÍTICO: Só prossegue se for realmente recovery
        if (type !== 'recovery') {
          console.log('[ResetPassword] Invalid type, not a recovery link');
          setErrorMessage('Este não é um link de recuperação de senha válido.');
          setStatus('error');
          toast({
            title: 'Link inválido',
            description: 'Este não é um link de recuperação de senha válido.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          return;
        }
        
        // CRÍTICO: Tokens devem existir e ter tamanho mínimo
        if (!accessToken || accessToken.length < 20) {
          console.log('[ResetPassword] Invalid or missing access token');
          setErrorMessage('Este link de recuperação expirou. Solicite um novo.');
          setStatus('error');
          toast({
            title: 'Link expirado',
            description: 'Este link de recuperação expirou. Solicite um novo.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          return;
        }
        
        console.log('[ResetPassword] Storing tokens in state for later use...');
        setRecoveryTokens({ accessToken, refreshToken });
        
        // NOVO: Tenta estabelecer sessão e verifica se está válida
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          // Token expirado ou inválido
          console.error('[ResetPassword] Set session error:', error);
          setStatus('error');
          setErrorMessage('Link de recuperação expirado ou inválido. Solicite um novo link.');
          toast({
            title: 'Link expirado ou inválido',
            description: 'Por favor, solicite um novo link de recuperação.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          
          // Após 3 segundos, redireciona para login
          setTimeout(() => {
            window.location.href = '/auth';
          }, 3000);
          return;
        }
        
        // Verifica se o token está realmente ativo
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[ResetPassword] Session not valid after setSession');
          setStatus('error');
          setErrorMessage('Não foi possível validar o link. Tente novamente.');
          toast({
            title: 'Sessão inválida',
            description: 'Não foi possível validar o link. Tente novamente.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          return;
        }
        
        console.log('[ResetPassword] Session established successfully!');
        setStatus('ready');
      } catch (err) {
        console.error('[ResetPassword] Validation error:', err);
        setErrorMessage('Erro ao validar link de recuperação. Tente novamente.');
        setStatus('error');
      }
    };

    validateToken();
  }, [toast]);

  // CRITICAL: handleCancel with proper signOut
  const handleCancel = async () => {
    // CRÍTICO: Sempre fazer signOut antes de sair
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    // Limpa o hash da URL
    window.location.hash = '';
    
    // Redireciona para login
    window.location.href = '/auth';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'As senhas não coincidem.',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate password strength
    if (formData.password.length < 8) {
      toast({
        title: 'Erro de validação',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive'
      });
      return;
    }
    
    setStatus('submitting');
    let passwordUpdated = false;
    
    try {
      // Re-establish session before updateUser()
      if (recoveryTokens) {
        console.log('[ResetPassword] Re-establishing session from stored tokens before updateUser...');
        const { error: reSessionError } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });
        
        if (reSessionError) {
          console.error('[ResetPassword] Re-session error:', reSessionError);
          toast({
            title: 'Sessão expirada',
            description: 'O link de recuperação expirou. Solicite um novo link.',
            variant: 'destructive'
          });
          setStatus('error');
          setErrorMessage('O link de recuperação expirou. Solicite um novo link na página de login.');
          await supabase.auth.signOut();
          window.location.href = '/auth';
          return;
        }
        console.log('[ResetPassword] Session re-established successfully!');
      } else {
        console.log('[ResetPassword] No stored tokens, checking current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('[ResetPassword] No valid session for updateUser:', sessionError);
          toast({
            title: 'Sessão inválida',
            description: 'Sua sessão expirou. Solicite um novo link de recuperação.',
            variant: 'destructive'
          });
          setStatus('error');
          setErrorMessage('Sessão expirada. Solicite um novo link na página de login.');
          await supabase.auth.signOut();
          window.location.href = '/auth';
          return;
        }
        console.log('[ResetPassword] Current session is valid');
      }
      
      // Now update the password
      console.log('[ResetPassword] Calling updateUser with new password...');
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (updateError) {
        console.error('[ResetPassword] Update error:', updateError.message, updateError);
        
        let errorMsg = updateError.message || 'Tente novamente.';
        if (updateError.message?.includes('session') || updateError.message?.includes('token')) {
          errorMsg = 'Sua sessão expirou. Solicite um novo link de recuperação.';
        } else if (updateError.message?.includes('password')) {
          errorMsg = 'A senha não atende aos requisitos de segurança.';
        }
        
        toast({
          title: 'Erro ao atualizar senha',
          description: errorMsg,
          variant: 'destructive'
        });
        await supabase.auth.signOut();
        window.location.href = '/auth';
        return;
      }
      
      console.log('[ResetPassword] Password updated successfully!', data);
      passwordUpdated = true;
      setStatus('success');
      
      // Clear tokens and hash after successful password change
      setRecoveryTokens(null);
      window.history.replaceState(null, '', window.location.pathname);
      
      toast({
        title: 'Senha atualizada com sucesso!',
        description: 'Você será redirecionado para fazer login.',
      });
      
    } catch (err: any) {
      console.error('[ResetPassword] Submit error:', err?.message || err);
      toast({
        title: 'Erro inesperado',
        description: err?.message || 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      // CRITICAL: ALWAYS sign out and redirect
      console.log('[ResetPassword] Forcing signOut to prevent auto-login...');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('[ResetPassword] SignOut error (ignoring):', signOutError);
      }
      
      setTimeout(() => {
        if (passwordUpdated) {
          window.location.href = '/auth?password_reset=success';
        } else {
          window.location.href = '/auth';
        }
      }, passwordUpdated ? 2000 : 500);
    }
  };

  const goToLogin = () => {
    navigate('/auth', { replace: true });
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'strong': return 'Forte';
      case 'good': return 'Boa';
      case 'fair': return 'Regular';
      default: return 'Fraca';
    }
  };

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
            {status === 'validating' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Validando link...</CardTitle>
                <CardDescription>Por favor, aguarde enquanto verificamos seu link de recuperação.</CardDescription>
              </>
            )}

            {status === 'ready' && (
              <>
                <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="shrink-0">🔒</span>
                    <span>Por segurança, este link só funciona neste navegador e expira em 1 hora.</span>
                  </p>
                </div>
                <div className="flex justify-center mb-4">
                  <KeyRound className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Redefinir Senha</CardTitle>
                <CardDescription>Digite sua nova senha abaixo.</CardDescription>
              </>
            )}

            {status === 'submitting' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Atualizando senha...</CardTitle>
                <CardDescription>Por favor, aguarde.</CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-green-600">Senha Atualizada!</CardTitle>
                <CardDescription>Sua senha foi alterada com sucesso. Redirecionando...</CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Link Inválido</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={passwordStrength.percentage} 
                          className="h-2 flex-1"
                        />
                        <span className={`text-xs font-medium ${
                          passwordStrength.strength === 'strong' ? 'text-green-500' :
                          passwordStrength.strength === 'good' ? 'text-blue-500' :
                          passwordStrength.strength === 'fair' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {getStrengthLabel(passwordStrength.strength)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          8+ caracteres
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Maiúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Minúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Número
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          Caractere especial
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
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
                          ? 'border-destructive' 
                          : ''
                      }`}
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="h-3 w-3" />
                      As senhas não coincidem
                    </p>
                  )}
                  
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Senhas coincidem
                    </p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    formData.password.length < 8 || 
                    formData.password !== formData.confirmPassword
                  }
                >
                  Atualizar Senha
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </form>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Solicite um novo link de recuperação na página de login.
                </p>
                <Button onClick={handleCancel} className="w-full">
                  Voltar para Login
                </Button>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Redirecionando para login...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
