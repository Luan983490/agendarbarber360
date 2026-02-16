import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useLoginRateLimit } from '@/hooks/useLoginRateLimit';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, User, Check, X, Eye, EyeOff, Loader2, Mail, AlertCircle, LogIn, Shield, Clock, Lock, Phone, ArrowLeft } from 'lucide-react';
import { loginSchema, signUpSchema, validateWithSchema, formatValidationErrors } from '@/lib/validation-schemas';
import { TurnstileCaptcha } from '@/components/TurnstileCaptcha';
import b360Logo from '@/assets/b360-logo.png';
import authHero from '@/assets/auth-hero.jpg';

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

const BarbershopAuth = () => {
  const location = useLocation();
  const isSignupRoute = location.pathname === '/signup/barbershop';
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
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(isSignupRoute ? 'signup' : 'login');
  const [isRecovering, setIsRecovering] = useState(false);
  const [serverRateLimited, setServerRateLimited] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [mfaPending, setMfaPending] = useState(false);

  const { failedAttempts, isBlocked, remainingSeconds, requiresCaptcha, captchaVerified, recordFailedAttempt, resetOnSuccess, setCaptchaVerified, canAttemptLogin } = useLoginRateLimit();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    email: '', password: '', confirmPassword: '',
    userType: 'barbershop_owner' as const,
    barbershopName: '', contactName: '', contactPhone: '',
    acceptedTerms: false,
  });

  const passwordStrength = useMemo(() => checkPasswordStrength(signupData.password), [signupData.password]);

  const formatRemainingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `00:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleCaptchaVerify = useCallback((token: string) => { setCaptchaVerified(true); }, [setCaptchaVerified]);
  const handleCaptchaError = useCallback((error: Error) => {
    toast({ title: 'Erro na verificação', description: 'Não foi possível verificar o captcha.', variant: 'destructive' });
  }, [toast]);
  const handleCaptchaExpire = useCallback(() => { setCaptchaVerified(false); }, [setCaptchaVerified]);

  const logAuthEvent = async (eventType: 'auth_success' | 'auth_failure', email: string) => {
    try {
      await supabase.from('app_logs').insert({ level: eventType === 'auth_success' ? 'info' : 'warn', service: 'Auth', method: 'handleLogin', message: eventType === 'auth_success' ? 'Login bem-sucedido' : 'Tentativa de login falhou', context: { email, event: eventType } });
    } catch {}
  };

  useEffect(() => {
    const mfaChallenge = sessionStorage.getItem('mfa_challenge');
    if (mfaChallenge) { navigate('/verify-mfa', { replace: true }); return; }
    if (mfaPending) return;
    if (user && !authLoading) { checkUserProfileAndRedirect(); }
  }, [user, authLoading, mfaPending, navigate]);

  const checkUserProfileAndRedirect = async () => {
    if (!user) return;
    try {
      const { data: profile, error } = await supabase.from('profiles').select('user_type').eq('user_id', user.id).single();
      const userType = error ? user.user_metadata?.user_type : profile?.user_type;
      if (userType === 'barbershop_owner') {
        let barbershopId: string | null = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
          const { data } = await supabase.from('barbershops').select('id').eq('owner_id', user.id).maybeSingle();
          if (data?.id) { barbershopId = data.id; break; }
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        if (barbershopId) {
          const meta = user.user_metadata;
          if (meta?.barbershop_name || meta?.phone) {
            const updates: Record<string, string> = {};
            if (meta.barbershop_name) updates.name = meta.barbershop_name;
            if (meta.phone) updates.phone = meta.phone;
            await supabase.from('barbershops').update(updates).eq('id', barbershopId);
          }
          const { data: onboardingStatus } = await supabase.rpc('get_barbershop_onboarding_status', { p_barbershop_id: barbershopId });
          const status = (onboardingStatus as any)?.[0];
          if (status && !status.is_completed) { navigate(`/onboarding/${barbershopId}`, { replace: true }); return; }
        }
        navigate('/dashboard', { replace: true });
      } else if (userType === 'barber') {
        navigate('/barber/hoje', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch { navigate('/'); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerRateLimited(false);
    const emailUsed = loginData.email.trim().toLowerCase();
    const attempts = Number(localStorage.getItem('auth_failures') || '0');
    const blockedUntil = Number(localStorage.getItem('auth_blocked_until') || '0');
    if (attempts >= 3) {
      if (Date.now() < blockedUntil) {
        const remainingSecs = Math.ceil((blockedUntil - Date.now()) / 1000);
        toast({ title: 'Muitas tentativas', description: `Tente novamente em ${remainingSecs > 60 ? '1 minuto' : remainingSecs + ' segundos'}.`, variant: 'destructive' });
        return;
      } else { localStorage.setItem('auth_failures', '0'); localStorage.removeItem('auth_blocked_until'); }
    }
    const validation = validateWithSchema(loginSchema, loginData);
    if (!validation.success) { toast({ title: 'Erro de validação', description: formatValidationErrors(validation.errors), variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailUsed, password: loginData.password });
      if (error) throw error;

      // Verificar tipo de usuário - bloquear cliente na tela de barbearia
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('user_id', data.user.id).single();
      const userType = profile?.user_type || data.user.user_metadata?.user_type;
      if (userType === 'client') {
        await supabase.auth.signOut();
        setLoading(false);
        toast({
          title: 'Acesso incorreto',
          description: 'Esta conta é de cliente. Use a tela de login para clientes.',
          variant: 'destructive',
        });
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const allFactors = factorsData?.all || factorsData?.totp || [];
      const activeMFAFactor = allFactors.find((factor: any) => factor.status === 'verified' && factor.factor_type === 'totp');
      if (activeMFAFactor) {
        sessionStorage.setItem('mfa_challenge', JSON.stringify({ factorId: activeMFAFactor.id, userId: data.user.id }));
        setLoading(false);
        navigate('/verify-mfa', { replace: true });
        return;
      }
      logAuthEvent('auth_success', emailUsed);
      localStorage.setItem('auth_failures', '0');
      localStorage.removeItem('auth_blocked_until');
      resetOnSuccess();
      toast({ title: 'Login realizado!', description: 'Bem-vindo de volta.' });
    } catch (err: any) {
      logAuthEvent('auth_failure', emailUsed);
      const currentCount = Number(localStorage.getItem('auth_failures') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('auth_failures', newCount.toString());
      if (newCount >= 3) { localStorage.setItem('auth_blocked_until', (Date.now() + 60000).toString()); }
      setForceUpdate(prev => prev + 1);
      const errorMessage = err?.message?.toLowerCase() || '';
      if (err?.status === 429 || errorMessage.includes('too many requests')) {
        setServerRateLimited(true);
        toast({ title: 'Sistema protegido', description: 'Muitas tentativas. Aguarde.', variant: 'destructive' });
      } else if (newCount >= 3) {
        toast({ title: 'Muitas tentativas', description: 'Tente novamente em 1 minuto.', variant: 'destructive' });
      } else {
        toast({ title: 'Credenciais inválidas', description: `Tentativa ${newCount}/3. Email ou senha incorretos.`, variant: 'destructive' });
      }
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);
    if (signupData.barbershopName.trim().length < 3) { toast({ title: 'Erro', description: 'Nome da barbearia deve ter no mínimo 3 caracteres', variant: 'destructive' }); return; }
    if (signupData.contactName.trim().length < 3) { toast({ title: 'Erro', description: 'Nome do contato deve ter no mínimo 3 caracteres', variant: 'destructive' }); return; }
    if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(signupData.contactPhone)) { toast({ title: 'Erro', description: 'Telefone inválido. Use (00) 00000-0000', variant: 'destructive' }); return; }
    if (!signupData.acceptedTerms) { toast({ title: 'Erro', description: 'Você deve aceitar os termos de uso', variant: 'destructive' }); return; }
    if (signupData.password.length > 15) { toast({ title: 'Erro', description: 'Senha deve ter no máximo 15 caracteres', variant: 'destructive' }); return; }
    const validation = validateWithSchema(signUpSchema, signupData);
    if (!validation.success) { toast({ title: 'Erro de validação', description: formatValidationErrors(validation.errors), variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await signUp(signupData.email.trim().toLowerCase(), signupData.password, 'barbershop_owner', {
      barbershopName: signupData.barbershopName.trim(),
      contactName: signupData.contactName.trim(),
      contactPhone: signupData.contactPhone,
    });
    setLoading(false);
    if (error) {
      if (error.code === 'AUTH_EMAIL_IN_USE' || error.message?.includes('already registered') || error.message?.includes('já está cadastrado')) {
        setEmailAlreadyExists(true);
        toast({ title: 'Email já cadastrado', description: 'Este email já possui uma conta. Se for de cliente, use a tela de login para clientes.', variant: 'destructive' });
        return;
      }
    } else {
      setSignupEmail(signupData.email);
      setSignupSuccess(true);
    }
  };

  const handleForgotPassword = async (email?: string) => {
    const emailToUse = email || loginData.email.trim().toLowerCase();
    if (!emailToUse) { toast({ title: 'Email necessário', description: 'Digite seu email.', variant: 'destructive' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) { toast({ title: 'Email inválido', variant: 'destructive' }); return; }
    setIsRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Email enviado!', description: `Verifique em ${emailToUse}` });
    } catch { toast({ title: 'Erro inesperado', variant: 'destructive' }); } finally { setIsRecovering(false); }
  };

  const handleResendConfirmation = async () => {
    if (!signupEmail) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: signupEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      toast({ title: 'Email reenviado!', description: 'Verifique caixa de entrada e spam.' });
    } catch (error: any) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); } finally { setIsResending(false); }
  };

  const getStrengthColor = (s: string) => s === 'strong' ? 'bg-green-500' : s === 'good' ? 'bg-blue-500' : s === 'fair' ? 'bg-yellow-500' : 'bg-red-500';
  const getStrengthLabel = (s: string) => s === 'strong' ? 'Forte' : s === 'good' ? 'Boa' : s === 'fair' ? 'Regular' : 'Fraca';

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-6" />
          <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
            <Mail className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">Cadastro Realizado!</h2>
            <p className="text-muted-foreground text-sm">Enviamos um email para <strong>{signupEmail}</strong></p>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2 text-left">
              <p>✉️ Verifique sua caixa de entrada</p>
              <p>📁 Confira a pasta de spam</p>
              <p>⏰ O link expira em 24 horas</p>
            </div>
            <Button variant="outline" onClick={handleResendConfirmation} className="w-full" disabled={isResending}>
              {isResending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reenviando...</> : 'Reenviar Email'}
            </Button>
            <Button variant="ghost" onClick={() => setSignupSuccess(false)} className="w-full">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left - Branding */}
      <div
        className="hidden lg:flex lg:w-5/12 relative items-center justify-center p-12"
        style={{ backgroundImage: `url(${authHero})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center space-y-6">
          <img src={b360Logo} alt="B360" className="h-14 mx-auto drop-shadow-lg" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {activeTab === 'login' ? 'Gerencie sua barbearia' : 'Comece agora!'}
          </h1>
          <p className="text-white/70 text-lg max-w-sm mx-auto">
            {activeTab === 'login' ? 'Acesse o painel da sua barbearia' : '30 dias grátis para testar a plataforma'}
          </p>
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === 'login' ? 'signup' : 'login')}
            className="border-white text-white hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-full px-8"
          >
            {activeTab === 'login' ? 'Criar Conta' : 'Já tenho conta'}
          </Button>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 md:p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <img src={b360Logo} alt="B360" className="h-12 mx-auto mb-2" />
          </div>

          {activeTab === 'login' ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">Login - Barbearia</h1>
                <p className="text-muted-foreground text-sm">Entre com sua conta de barbearia</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {serverRateLimited && (
                  <Alert variant="destructive"><Shield className="h-4 w-4" /><AlertDescription>Sistema protegido. Aguarde.</AlertDescription></Alert>
                )}
                {isBlocked && (
                  <Alert className="border-warning bg-warning/10"><Clock className="h-4 w-4 text-warning" /><AlertDescription>Muitas tentativas. Tente em <span className="font-mono font-bold">{formatRemainingTime(remainingSeconds)}</span></AlertDescription></Alert>
                )}
                {failedAttempts > 0 && failedAttempts < 3 && !isBlocked && (
                  <div className="text-sm text-muted-foreground text-center">Tentativas: {failedAttempts}/3</div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="Email" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} required disabled={isBlocked} className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} required disabled={isBlocked} className="pl-10 pr-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {requiresCaptcha && !isBlocked && (
                  <div className="py-2">
                    <TurnstileCaptcha onVerify={handleCaptchaVerify} onError={handleCaptchaError} onExpire={handleCaptchaExpire} />
                    {captchaVerified && <div className="flex items-center justify-center gap-2 text-sm text-success mt-2"><Check className="h-4 w-4" />Verificação concluída</div>}
                  </div>
                )}

                <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/85 text-primary-foreground" disabled={loading || isBlocked || (requiresCaptcha && !captchaVerified) || serverRateLimited}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : isBlocked ? <><Clock className="mr-2 h-4 w-4" />Aguarde {formatRemainingTime(remainingSeconds)}</> : 'Entrar'}
                </Button>

                <div className="flex flex-col gap-2 text-center text-sm">
                  <button type="button" onClick={() => handleForgotPassword()} disabled={isRecovering} className="text-primary hover:underline font-medium disabled:opacity-50">
                    {isRecovering ? <><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Enviando...</> : 'Esqueceu a senha?'}
                  </button>
                  <p className="text-muted-foreground">
                    Não tem conta?{' '}
                    <button type="button" onClick={() => setActiveTab('signup')} className="text-primary hover:underline font-medium">Cadastrar barbearia</button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-foreground">Cadastro - Barbearia</h1>
                <p className="text-muted-foreground text-sm">Cadastre sua barbearia e comece a receber agendamentos</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Nome da Barbearia" value={signupData.barbershopName} onChange={(e) => setSignupData(prev => ({ ...prev, barbershopName: e.target.value }))} required className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Nome do Contato" value={signupData.contactName} onChange={(e) => setSignupData(prev => ({ ...prev, contactName: e.target.value }))} required className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" placeholder="(00) 00000-0000" value={signupData.contactPhone} onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let masked = raw;
                    if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                    else if (raw.length > 0) masked = `(${raw}`;
                    if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                    setSignupData(prev => ({ ...prev, contactPhone: masked }));
                  }} required className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="E-mail Para Acesso" value={signupData.email} onChange={(e) => { setSignupData(prev => ({ ...prev, email: e.target.value })); setEmailAlreadyExists(false); }} required className={`pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary ${emailAlreadyExists ? 'border-destructive' : ''}`} />
                </div>
                {emailAlreadyExists && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" /><span className="font-medium">Email já cadastrado</span></div>
                    <p className="text-xs text-muted-foreground">Este email já possui uma conta. Para criar uma conta diferente, use outro email.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { setActiveTab('login'); setLoginData(prev => ({ ...prev, email: signupData.email })); }} className="flex-1"><LogIn className="h-3 w-3 mr-1" />Login Barbearia</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => navigate('/login/client')} className="flex-1"><User className="h-3 w-3 mr-1" />Login Cliente</Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleForgotPassword(signupData.email)} disabled={isRecovering} className="w-full text-muted-foreground">
                      {isRecovering ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Enviando...</> : 'Recuperar Senha'}
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={signupData.password} onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))} required maxLength={15} className="pl-10 pr-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 8 e máximo de 15 caracteres</p>
                {signupData.password && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Força:</span><span className={`font-medium ${passwordStrength.strength === 'strong' ? 'text-green-600' : passwordStrength.strength === 'good' ? 'text-blue-600' : passwordStrength.strength === 'fair' ? 'text-yellow-600' : 'text-red-600'}`}>{getStrengthLabel(passwordStrength.strength)}</span></div>
                    <Progress value={passwordStrength.percentage} className={`h-2 ${getStrengthColor(passwordStrength.strength)}`} />
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-muted-foreground'}`}>{passwordStrength.checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}8+ caracteres</div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>{passwordStrength.checks.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}Maiúscula</div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>{passwordStrength.checks.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}Minúscula</div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-muted-foreground'}`}>{passwordStrength.checks.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}Número</div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.special ? 'text-green-600' : 'text-muted-foreground'}`}>{passwordStrength.checks.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}Especial</div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirmar Senha" value={signupData.confirmPassword} onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))} required className="pl-10 pr-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3" />Senhas não conferem</p>}
                {signupData.confirmPassword && signupData.password === signupData.confirmPassword && <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" />Senhas conferem</p>}

                <div className="flex items-start space-x-2">
                  <Checkbox id="terms-barbershop" checked={signupData.acceptedTerms} onCheckedChange={(checked) => setSignupData(prev => ({ ...prev, acceptedTerms: checked === true }))} className="mt-0.5" />
                  <Label htmlFor="terms-barbershop" className="text-sm font-normal leading-snug cursor-pointer">
                    Li e aceito o{' '}<Link to="/terms" className="text-primary hover:underline" target="_blank">Termo de Condição de Uso</Link> *
                  </Label>
                </div>

                <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/85 text-primary-foreground" disabled={loading || passwordStrength.strength === 'weak' || !signupData.acceptedTerms}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cadastrando...</> : 'Criar Conta'}
                </Button>

                {passwordStrength.strength === 'weak' && signupData.password && (
                  <p className="text-xs text-center text-muted-foreground">A senha precisa atender aos requisitos acima</p>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{' '}<button type="button" onClick={() => setActiveTab('login')} className="text-primary hover:underline font-medium">Fazer login</button>
                </p>
              </form>
            </div>
          )}

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate('/choose-type')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarbershopAuth;
