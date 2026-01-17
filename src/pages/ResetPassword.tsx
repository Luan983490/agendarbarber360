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
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const passwordStrength = checkPasswordStrength(formData.password);

  // Validate token on mount - IMMEDIATELY capture hash before it can be lost
  useEffect(() => {
    const validateToken = async () => {
      try {
        // CRITICAL: Capture hash IMMEDIATELY on page load (before any async operations)
        // Mobile browsers (Safari, Chrome) can lose the hash during navigation
        const currentHash = window.location.hash;
        const hashParams = new URLSearchParams(currentHash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || '';
        const type = hashParams.get('type');
        
        console.log('[ResetPassword] Hash captured:', currentHash ? 'EXISTS' : 'EMPTY');
        console.log('[ResetPassword] Type:', type, 'Has access_token:', !!accessToken, 'Has refresh_token:', !!refreshToken);
        
        // Priority 1: If we have tokens in the hash AND it's a recovery flow
        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('[ResetPassword] Setting session from hash tokens...');
          
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (setSessionError) {
            console.error('[ResetPassword] Set session error:', setSessionError);
            setErrorMessage('Link de recuperação inválido ou expirado. Solicite um novo link.');
            setStatus('error');
            return;
          }
          
          console.log('[ResetPassword] Session established successfully!');
          // Clear the hash from URL for security
          window.history.replaceState(null, '', window.location.pathname);
          setStatus('ready');
          return;
        }
        
        // Priority 2: Check for existing valid session (may have been set by Supabase SDK automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ResetPassword] Get session error:', sessionError);
        }
        
        if (session) {
          console.log('[ResetPassword] Found existing session, ready to reset password');
          // Clear hash if present for security
          if (currentHash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setStatus('ready');
          return;
        }
        
        // No valid session or token found
        console.log('[ResetPassword] No valid session or recovery token found');
        setErrorMessage('Link de recuperação inválido ou expirado. Solicite um novo link na página de login.');
        setStatus('error');
      } catch (err) {
        console.error('[ResetPassword] Validation error:', err);
        setErrorMessage('Erro ao validar link de recuperação. Tente novamente.');
        setStatus('error');
      }
    };

    // Execute immediately
    validateToken();
  }, []);

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
    
    try {
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (updateError) {
        console.error('[ResetPassword] Update error:', updateError);
        toast({
          title: 'Erro ao atualizar senha',
          description: updateError.message || 'Tente novamente.',
          variant: 'destructive'
        });
        setStatus('ready');
        return;
      }
      
      setStatus('success');
      
      toast({
        title: 'Senha atualizada com sucesso!',
        description: 'Você será redirecionado para fazer login.',
      });
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to auth after 2 seconds
      // Use window.location.href for full page reload - ensures clean state on mobile
      setTimeout(() => {
        window.location.href = '/auth?password_reset=success';
      }, 2000);
      
    } catch (err) {
      console.error('[ResetPassword] Submit error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
      setStatus('ready');
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
                  variant="ghost" 
                  className="w-full" 
                  onClick={goToLogin}
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
                <Button onClick={goToLogin} className="w-full">
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
