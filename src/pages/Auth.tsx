import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useLoginRateLimit } from '@/hooks/useLoginRateLimit';
import { useMFA } from '@/hooks/useMFA';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Store, Check, X, Eye, EyeOff, Loader2, Mail, AlertCircle, LogIn, Shield, Clock } from 'lucide-react';
import { loginSchema, signUpSchema, validateWithSchema, formatValidationErrors } from '@/lib/validation-schemas';
import { TurnstileCaptcha } from '@/components/TurnstileCaptcha';
import { MFAVerificationModal } from '@/components/MFAVerificationModal';
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

const Auth = () => {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [isRecovering, setIsRecovering] = useState(false);
  const [serverRateLimited, setServerRateLimited] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // Para forçar re-render
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [pendingMFAUser, setPendingMFAUser] = useState<any>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  
  // Rate Limiting Hook
  const {
    failedAttempts,
    isBlocked,
    remainingSeconds,
    requiresCaptcha,
    captchaVerified,
    recordFailedAttempt,
    resetOnSuccess,
    setCaptchaVerified,
    canAttemptLogin,
  } = useLoginRateLimit();

  // Função auxiliar para gravar log de auditoria (resiliente)
  const logAuthEvent = async (eventType: 'auth_success' | 'auth_failure', email: string) => {
    try {
      await supabase.from('app_logs').insert({
        level: eventType === 'auth_success' ? 'info' : 'warn',
        service: 'Auth',
        method: 'handleLogin',
        message: eventType === 'auth_success' ? 'Login bem-sucedido' : 'Tentativa de login falhou',
        context: { email, event: eventType },
      });
    } catch {
      // Log silencioso - não bloqueia o fluxo de login
    }
  };
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'client' as 'client' | 'barbershop_owner'
  });

  const passwordStrength = useMemo(() => 
    checkPasswordStrength(signupData.password),
    [signupData.password]
  );
  
  // Formatar tempo restante do bloqueio
  const formatRemainingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 
      ? `${mins}:${secs.toString().padStart(2, '0')}`
      : `00:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Handler para verificação do captcha
  const handleCaptchaVerify = useCallback((token: string) => {
    console.log('[Auth] Captcha verified with token');
    setCaptchaVerified(true);
  }, [setCaptchaVerified]);
  
  const handleCaptchaError = useCallback((error: Error) => {
    console.error('[Auth] Captcha error:', error);
    toast({
      title: 'Erro na verificação',
      description: 'Não foi possível verificar o captcha. Tente novamente.',
      variant: 'destructive',
    });
  }, [toast]);
  
  const handleCaptchaExpire = useCallback(() => {
    console.log('[Auth] Captcha expired');
    setCaptchaVerified(false);
  }, [setCaptchaVerified]);

  useEffect(() => {
    if (user && !authLoading) {
      checkUserProfileAndRedirect();
    }
  }, [user, authLoading]);

  const checkUserProfileAndRedirect = async () => {
    if (!user) return;
    
    try {
      console.log('[Auth] Checking profile for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('[Auth] Error fetching profile:', error);
        // If profile doesn't exist yet, check user metadata
        const userType = user.user_metadata?.user_type;
        console.log('[Auth] Fallback to user_metadata.user_type:', userType);
        
        if (userType === 'barbershop_owner') {
          navigate('/dashboard');
        } else if (userType === 'barber') {
          navigate('/barber/hoje');
        } else {
          navigate('/');
        }
        return;
      }
      
      console.log('[Auth] Profile found, user_type:', profile?.user_type);
      
      if (profile?.user_type === 'barbershop_owner') {
        console.log('[Auth] Redirecting to /dashboard');
        navigate('/dashboard');
      } else if (profile?.user_type === 'barber') {
        console.log('[Auth] Redirecting to /barber/hoje');
        navigate('/barber/hoje');
      } else {
        console.log('[Auth] Redirecting to /');
        navigate('/');
      }
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerRateLimited(false);
    
    const emailUsed = loginData.email.trim().toLowerCase();
    
    // Verificar bloqueio ativo
    const attempts = Number(localStorage.getItem('auth_failures') || '0');
    const blockedUntil = Number(localStorage.getItem('auth_blocked_until') || '0');
    
    if (attempts >= 3) {
      if (Date.now() < blockedUntil) {
        const remainingSecs = Math.ceil((blockedUntil - Date.now()) / 1000);
        toast({
          title: 'Muitas tentativas',
          description: `Tente novamente em ${remainingSecs > 60 ? '1 minuto' : remainingSecs + ' segundos'}.`,
          variant: 'destructive',
        });
        return;
      } else {
        // Tempo de bloqueio expirou - resetar contador
        localStorage.setItem('auth_failures', '0');
        localStorage.removeItem('auth_blocked_until');
      }
    }
    
    // Validação com Zod
    const validation = validateWithSchema(loginSchema, loginData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailUsed,
        password: loginData.password,
      });
      
      if (error) {
        throw error;
      }
      
      // Verificar se usuário tem MFA habilitado
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      
      if (verifiedFactors.length > 0) {
        // Usuário tem MFA - verificar AAL
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
          // Precisa verificar MFA
          setPendingMFAUser(data.user);
          setShowMFAVerification(true);
          setLoading(false);
          return; // Não continuar - aguardar verificação MFA
        }
      }
      
      // Login bem-sucedido (sem MFA ou já verificado) - gravar log de auditoria
      logAuthEvent('auth_success', emailUsed);
      
      localStorage.setItem('auth_failures', '0');
      localStorage.removeItem('auth_blocked_until');
      resetOnSuccess();
      
      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta.',
      });
      
    } catch (err: any) {
      // Gravar log de auditoria de falha
      logAuthEvent('auth_failure', emailUsed);
      
      // Incrementar contador no localStorage
      const currentCount = Number(localStorage.getItem('auth_failures') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('auth_failures', newCount.toString());
      
      // Aplicar bloqueio se atingiu 3 tentativas
      if (newCount >= 3) {
        const blockTime = Date.now() + 60000; // 60 segundos
        localStorage.setItem('auth_blocked_until', blockTime.toString());
      }
      
      // Forçar re-render para atualizar UI
      setForceUpdate(prev => prev + 1);
      
      // Feedback visual baseado no tipo de erro
      const errorMessage = err?.message?.toLowerCase() || '';
      
      if (err?.status === 429 || errorMessage.includes('too many requests')) {
        setServerRateLimited(true);
        toast({
          title: 'Sistema protegido',
          description: 'Muitas tentativas detectadas. Aguarde alguns minutos.',
          variant: 'destructive',
        });
      } else if (newCount >= 3) {
        toast({
          title: 'Muitas tentativas',
          description: 'Tente novamente em 1 minuto.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Credenciais inválidas',
          description: `Tentativa ${newCount}/3. Email ou senha incorretos.`,
          variant: 'destructive',
        });
      }
      
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);
    
    // Validação com Zod
    const validation = validateWithSchema(signUpSchema, signupData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    const { error } = await signUp(
      signupData.email.trim().toLowerCase(), 
      signupData.password, 
      signupData.userType
    );
    setLoading(false);
    
    if (error) {
      // Check if it's an email already exists error
      if (error.code === 'AUTH_EMAIL_IN_USE' || 
          error.message?.includes('already registered') ||
          error.message?.includes('já está cadastrado')) {
        setEmailAlreadyExists(true);
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já possui uma conta. Faça login ou recupere sua senha.',
          variant: 'destructive'
        });
        return;
      }
    } else {
      setSignupEmail(signupData.email);
      setSignupSuccess(true);
    }
  };

  const switchToLogin = () => {
    setActiveTab('login');
    setLoginData(prev => ({ ...prev, email: signupData.email }));
    setEmailAlreadyExists(false);
  };

  const handleResendConfirmation = async () => {
    if (!signupEmail) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Email reenviado!',
        description: 'Verifique sua caixa de entrada e pasta de spam.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao reenviar',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async (email?: string) => {
    const emailToUse = email || loginData.email.trim().toLowerCase();
    
    if (!emailToUse) {
      toast({
        title: 'Email necessário',
        description: 'Digite seu email para recuperar a senha.',
        variant: 'destructive'
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      toast({
        title: 'Email inválido',
        description: 'Digite um email válido para recuperar a senha.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsRecovering(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('[Auth] Password reset error:', error);
        toast({
          title: 'Erro ao enviar email',
          description: error.message || 'Tente novamente mais tarde.',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Email de recuperação enviado!',
        description: `Verifique sua caixa de entrada em ${emailToUse}`,
      });
    } catch (err) {
      console.error('[Auth] Unexpected error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setIsRecovering(false);
    }
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

  // Show success message after signup
  if (signupSuccess) {
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
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-success">Cadastro Realizado!</CardTitle>
              <CardDescription>
                Enviamos um email de confirmação para <strong>{signupEmail}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p>✉️ Verifique sua caixa de entrada</p>
                <p>📁 Confira também a pasta de spam</p>
                <p>⏰ O link expira em 24 horas</p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleResendConfirmation} 
                className="w-full"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  'Reenviar Email de Confirmação'
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setSignupSuccess(false)} 
                className="w-full"
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={b360Logo} alt="B360" className="h-16" />
          </div>
          <p className="text-muted-foreground">Acesse sua conta ou cadastre-se</p>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} ref={tabsRef}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Entrar</CardTitle>
                <CardDescription>Digite suas credenciais para acessar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Alerta de Rate Limit do Servidor (429) */}
                  {serverRateLimited && (
                    <Alert variant="destructive">
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Sistema protegido contra ataques. Aguarde alguns minutos antes de tentar novamente.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Alerta de Bloqueio Temporário */}
                  {isBlocked && (
                    <Alert className="border-warning bg-warning/10">
                      <Clock className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning-foreground">
                        Muitas tentativas. Tente novamente em{' '}
                        <span className="font-mono font-bold">{formatRemainingTime(remainingSeconds)}</span>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Indicador de tentativas falhas */}
                  {failedAttempts > 0 && failedAttempts < 3 && !isBlocked && (
                    <div className="text-sm text-muted-foreground text-center">
                      Tentativas: {failedAttempts}/3
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isBlocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="pr-10"
                        disabled={isBlocked}
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
                  
                  {/* Captcha após 5 tentativas */}
                  {requiresCaptcha && !isBlocked && (
                    <div className="py-2">
                      <TurnstileCaptcha
                        onVerify={handleCaptchaVerify}
                        onError={handleCaptchaError}
                        onExpire={handleCaptchaExpire}
                      />
                      {captchaVerified && (
                        <div className="flex items-center justify-center gap-2 text-sm text-success mt-2">
                          <Check className="h-4 w-4" />
                          Verificação concluída
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || isBlocked || (requiresCaptcha && !captchaVerified) || serverRateLimited}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : isBlocked ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Aguarde {formatRemainingTime(remainingSeconds)}
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                  
                  <div className="flex flex-col gap-2 text-center text-sm">
                    <button
                      type="button"
                      onClick={() => handleForgotPassword()}
                      disabled={isRecovering}
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      {isRecovering ? (
                        <>
                          <Loader2 className="inline mr-1 h-3 w-3 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Esqueceu a senha?'
                      )}
                    </button>
                    
                    <div className="text-muted-foreground">
                      Não tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-primary hover:underline font-medium"
                      >
                        Cadastre-se
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader>
                <CardTitle>Cadastrar</CardTitle>
                <CardDescription>Crie sua conta gratuita</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de conta</Label>
                    <RadioGroup
                      value={signupData.userType}
                      onValueChange={(value: 'client' | 'barbershop_owner') => 
                        setSignupData(prev => ({ ...prev, userType: value }))
                      }
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          Cliente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                        <RadioGroupItem value="barbershop_owner" id="barbershop_owner" />
                        <Label htmlFor="barbershop_owner" className="flex items-center gap-2 cursor-pointer">
                          <Store className="h-4 w-4" />
                          Barbearia
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => {
                        setSignupData(prev => ({ ...prev, email: e.target.value }));
                        setEmailAlreadyExists(false);
                      }}
                      required
                      className={emailAlreadyExists ? 'border-destructive' : ''}
                    />
                    
                    {/* Email already exists warning */}
                    {emailAlreadyExists && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Este email já está cadastrado</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={switchToLogin}
                            className="flex-1"
                          >
                            <LogIn className="h-3 w-3 mr-1" />
                            Fazer Login
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleForgotPassword(signupData.email)}
                            disabled={isRecovering}
                            className="flex-1 text-muted-foreground"
                          >
                            {isRecovering ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              'Recuperar Senha'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={signupData.password}
                        onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="pr-10"
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
                    {signupData.password && (
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Força da senha:</span>
                          <span className={`font-medium ${
                            passwordStrength.strength === 'strong' ? 'text-green-600' :
                            passwordStrength.strength === 'good' ? 'text-blue-600' :
                            passwordStrength.strength === 'fair' ? 'text-yellow-600' :
                            'text-red-600'
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
                            8+ caracteres
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" />
                        As senhas não conferem
                      </p>
                    )}
                    {signupData.confirmPassword && signupData.password === signupData.confirmPassword && (
                      <p className="text-xs text-success flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Senhas conferem
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || passwordStrength.strength === 'weak'}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      'Cadastrar'
                    )}
                  </Button>
                  
                  {passwordStrength.strength === 'weak' && signupData.password && (
                    <p className="text-xs text-center text-muted-foreground">
                      A senha precisa atender aos requisitos acima para continuar
                    </p>
                  )}
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Já tem uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-primary hover:underline font-medium"
                    >
                      Fazer login
                    </button>
                  </div>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {/* MFA Verification Modal */}
      <MFAVerificationModal
        open={showMFAVerification}
        onOpenChange={(open) => {
          setShowMFAVerification(open);
          if (!open && !pendingMFAUser) {
            // Usuário cancelou - fazer logout parcial
            supabase.auth.signOut();
          }
        }}
        onSuccess={() => {
          // MFA verificado com sucesso
          logAuthEvent('auth_success', loginData.email);
          localStorage.setItem('auth_failures', '0');
          localStorage.removeItem('auth_blocked_until');
          resetOnSuccess();
          setShowMFAVerification(false);
          setPendingMFAUser(null);
          toast({
            title: 'Login realizado!',
            description: 'Verificação de segurança concluída.',
          });
        }}
        onCancel={() => {
          // Usuário cancelou verificação MFA
          supabase.auth.signOut();
          setPendingMFAUser(null);
          toast({
            title: 'Login cancelado',
            description: 'Verificação de segurança é necessária para acessar.',
            variant: 'destructive',
          });
        }}
      />
    </div>
  );
};

export default Auth;