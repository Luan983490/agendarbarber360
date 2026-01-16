import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Loader2, Check, X, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import b360Logo from '@/assets/b360-logo.png';

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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const passwordStrength = checkPasswordStrength(password);

  // Armazenar tokens para uso posterior (NÃO fazer login automático)
  const [storedTokens, setStoredTokens] = useState<{
    accessToken: string;
    refreshToken: string;
    code?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Marcar que estamos no fluxo de reset de senha para impedir login automático
    sessionStorage.setItem('password_reset_in_progress', 'true');

    const validateRecoveryToken = async () => {
      try {
        console.log('[ResetPassword] Validando presença de tokens (SEM fazer login)...');
        console.log('[ResetPassword] Full URL:', window.location.href);
        
        // Get URL components
        const code = searchParams.get('code');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('[ResetPassword] code:', !!code, 'type:', type, 'accessToken:', !!accessToken);

        // OPÇÃO 1: PKCE flow - código nos query params
        // NÃO trocar código aqui! Apenas validar que existe
        if (code) {
          console.log('[ResetPassword] Código PKCE encontrado - NÃO fazendo login automático');
          if (isMounted) {
            setStoredTokens({ accessToken: '', refreshToken: '', code });
            setIsValidSession(true);
            setCheckingSession(false);
          }
          return;
        }

        // OPÇÃO 2: Implicit flow - tokens no hash
        // NÃO estabelecer sessão aqui! Apenas validar que existem
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('[ResetPassword] Tokens de recovery encontrados - NÃO fazendo login automático');
          if (isMounted) {
            setStoredTokens({ accessToken, refreshToken });
            setIsValidSession(true);
            setCheckingSession(false);
          }
          return;
        }

        // Se não encontrou tokens válidos, redirecionar
        if (isMounted) {
          console.log('[ResetPassword] Nenhum token válido encontrado, redirecionando...');
          toast.error('Link inválido ou expirado. Solicite um novo link.');
          navigate('/auth');
        }
      } catch (error) {
        console.error('[ResetPassword] Validation error:', error);
        if (isMounted) {
          toast.error('Erro ao validar link. Tente novamente.');
          navigate('/auth');
        }
      }
    };

    validateRecoveryToken();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchParams]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'bg-destructive';
      case 'fair': return 'bg-orange-500';
      case 'good': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Fraca';
      case 'fair': return 'Regular';
      case 'good': return 'Boa';
      case 'strong': return 'Forte';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Sua senha deve atender pelo menos 3 critérios de segurança.');
      return;
    }

    setLoading(true);

    try {
      // AGORA SIM estabelecer sessão temporária APENAS para trocar a senha
      if (storedTokens) {
        if (storedTokens.code) {
          // PKCE flow - trocar código por sessão
          console.log('[ResetPassword] Estabelecendo sessão via PKCE para trocar senha...');
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(storedTokens.code);
          if (codeError) {
            console.error('[ResetPassword] PKCE exchange error:', codeError);
            toast.error('Link expirado. Solicite um novo link de recuperação.');
            navigate('/auth');
            return;
          }
        } else if (storedTokens.accessToken && storedTokens.refreshToken) {
          // Implicit flow - estabelecer sessão com tokens
          console.log('[ResetPassword] Estabelecendo sessão via tokens para trocar senha...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: storedTokens.accessToken,
            refresh_token: storedTokens.refreshToken,
          });
          if (sessionError) {
            console.error('[ResetPassword] Set session error:', sessionError);
            toast.error('Link expirado. Solicite um novo link de recuperação.');
            navigate('/auth');
            return;
          }
        }
      }

      // Atualizar senha
      console.log('[ResetPassword] Atualizando senha...');
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('[ResetPassword] Update password error:', error);
        toast.error(error.message || 'Erro ao atualizar senha.');
        return;
      }

      // Sucesso!
      console.log('[ResetPassword] Senha atualizada com sucesso!');
      toast.success('Senha alterada com sucesso!');
      
      // Marcar ANTES do signOut para evitar que o listener do useAuth capture a sessão
      sessionStorage.setItem('password_just_reset', 'true');
      sessionStorage.removeItem('password_reset_in_progress');
      
      // Deslogar COMPLETAMENTE - usar scope: 'global' para garantir
      console.log('[ResetPassword] Deslogando usuário completamente...');
      await supabase.auth.signOut({ scope: 'global' });
      
      // Limpar COMPLETAMENTE a URL de qualquer token/hash
      window.history.replaceState({}, '', '/');
      
      setSuccess(true);
      
      // Redirecionar via window.location.replace para evitar histórico
      setTimeout(() => {
        // Usar replace para não manter no histórico
        window.location.replace('/auth?password_reset=success');
      }, 2000);
      
    } catch (error) {
      console.error('[ResetPassword] Unexpected error:', error);
      toast.error('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Senha Alterada!</h2>
              <p className="text-muted-foreground mb-6">
                Sua senha foi atualizada com sucesso. Você será redirecionado para o login.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Ir para Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={b360Logo} alt="B360" className="h-16" />
          </div>
          <p className="text-muted-foreground">Defina sua nova senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Nova Senha
            </CardTitle>
            <CardDescription>
              Crie uma nova senha segura para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Força da senha:</span>
                    <span className={`font-medium ${
                      passwordStrength.strength === 'strong' ? 'text-green-600' :
                      passwordStrength.strength === 'good' ? 'text-yellow-600' :
                      passwordStrength.strength === 'fair' ? 'text-orange-600' :
                      'text-destructive'
                    }`}>
                      {getStrengthLabel(passwordStrength.strength)}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength.percentage} 
                    className={`h-2 ${getStrengthColor(passwordStrength.strength)}`}
                  />
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Letra maiúscula
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passwordStrength.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      Letra minúscula
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" />
                    As senhas não coincidem
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Senhas coincidem
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || password !== confirmPassword || passwordStrength.score < 3}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Voltar para o login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
