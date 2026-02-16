import { useState, useMemo, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { User, Check, X, Eye, EyeOff, Loader2, Mail, AlertCircle, LogIn, Shield, Clock, Lock, Phone } from 'lucide-react';
import { loginSchema, signUpSchema, validateWithSchema, formatValidationErrors } from '@/lib/validation-schemas';
import b360Logo from '@/assets/b360-logo.png';

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

interface BookingAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: () => void;
}

export const BookingAuthDialog = ({ open, onOpenChange, onAuthSuccess }: BookingAuthDialogProps) => {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isRecovering, setIsRecovering] = useState(false);
  const [serverRateLimited, setServerRateLimited] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const { failedAttempts, isBlocked, remainingSeconds, requiresCaptcha, captchaVerified, resetOnSuccess, setCaptchaVerified } = useLoginRateLimit('client');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    email: '', password: '', confirmPassword: '',
    userType: 'client' as const,
    contactName: '',
    contactPhone: '',
    acceptedTerms: false,
  });

  const passwordStrength = useMemo(() => checkPasswordStrength(signupData.password), [signupData.password]);

  const formatRemainingTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `00:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getStrengthColor = (s: string) => s === 'strong' ? 'bg-green-500' : s === 'good' ? 'bg-blue-500' : s === 'fair' ? 'bg-yellow-500' : 'bg-red-500';
  const getStrengthLabel = (s: string) => s === 'strong' ? 'Forte' : s === 'good' ? 'Boa' : s === 'fair' ? 'Regular' : 'Fraca';

  // Listen for auth state changes to detect successful login/signup
  useEffect(() => {
    if (!open) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Small delay to ensure state is propagated
        setTimeout(() => {
          onAuthSuccess();
          onOpenChange(false);
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [open, onAuthSuccess, onOpenChange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerRateLimited(false);
    const emailUsed = loginData.email.trim().toLowerCase();

    // Check rate limit
    const attempts = Number(localStorage.getItem('auth_failures_client') || '0');
    const blockedUntil = Number(localStorage.getItem('auth_blocked_until_client') || '0');
    const firstFailureAt = Number(localStorage.getItem('auth_first_failure_client') || '0');
    if (firstFailureAt && Date.now() - firstFailureAt > 2 * 60 * 60 * 1000) {
      localStorage.setItem('auth_failures_client', '0');
      localStorage.removeItem('auth_blocked_until_client');
      localStorage.removeItem('auth_first_failure_client');
    }
    const currentAttempts = Number(localStorage.getItem('auth_failures_client') || '0');
    if (currentAttempts >= 3) {
      if (Date.now() < blockedUntil) {
        const remainingSecs = Math.ceil((blockedUntil - Date.now()) / 1000);
        toast({ title: 'Muitas tentativas', description: `Tente novamente em ${remainingSecs > 60 ? '1 minuto' : remainingSecs + ' segundos'}.`, variant: 'destructive' });
        return;
      } else {
        localStorage.setItem('auth_failures_client', '0');
        localStorage.removeItem('auth_blocked_until_client');
        localStorage.removeItem('auth_first_failure_client');
      }
    }

    const validation = validateWithSchema(loginSchema, loginData);
    if (!validation.success) {
      toast({ title: 'Erro de validação', description: formatValidationErrors(validation.errors), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailUsed, password: loginData.password });
      if (error) throw error;

      // Block barbershop_owner from logging in here
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('user_id', data.user.id).single();
      const userType = profile?.user_type || data.user.user_metadata?.user_type;
      if (userType === 'barbershop_owner') {
        await supabase.auth.signOut();
        setLoading(false);
        toast({ title: 'Acesso incorreto', description: 'Esta conta é de barbearia. Use a tela de login para barbearias.', variant: 'destructive' });
        return;
      }

      localStorage.setItem('auth_failures_client', '0');
      localStorage.removeItem('auth_blocked_until_client');
      resetOnSuccess();
      toast({ title: 'Login realizado!', description: 'Finalizando seu agendamento...' });
      // onAuthSuccess will be triggered by the auth state listener
    } catch (err: any) {
      const errorMessage = err?.message?.toLowerCase() || '';
      if (err?.status === 429 || errorMessage.includes('too many requests')) {
        setServerRateLimited(true);
        toast({ title: 'Sistema protegido', description: 'Muitas tentativas detectadas. Aguarde alguns minutos.', variant: 'destructive' });
      } else if (errorMessage.includes('invalid login credentials')) {
        const currentCount = Number(localStorage.getItem('auth_failures_client') || '0');
        const newCount = currentCount + 1;
        if (newCount === 1) localStorage.setItem('auth_first_failure_client', Date.now().toString());
        localStorage.setItem('auth_failures_client', newCount.toString());
        if (newCount >= 3) localStorage.setItem('auth_blocked_until_client', (Date.now() + 60000).toString());
        setForceUpdate(prev => prev + 1);
        toast({
          title: newCount >= 3 ? 'Muitas tentativas' : 'Email ou senha incorretos',
          description: newCount >= 3 ? 'Tente novamente em 1 minuto.' : `Tentativa ${newCount}/3. Verifique seus dados ou crie uma conta.`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro no login', description: err?.message || 'Erro inesperado.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);
    if (signupData.contactName.trim().length < 3) {
      toast({ title: 'Erro de validação', description: 'Nome deve ter no mínimo 3 caracteres', variant: 'destructive' });
      return;
    }
    if (!signupData.acceptedTerms) {
      toast({ title: 'Erro de validação', description: 'Você deve aceitar os termos de uso', variant: 'destructive' });
      return;
    }
    const validation = validateWithSchema(signUpSchema, { ...signupData, userType: 'client' });
    if (!validation.success) {
      toast({ title: 'Erro de validação', description: formatValidationErrors(validation.errors), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const emailUsed = signupData.email.trim().toLowerCase();
    const { error } = await signUp(emailUsed, signupData.password, 'client', { contactName: signupData.contactName, contactPhone: signupData.contactPhone || undefined });
    if (error) {
      setLoading(false);
      if (error.code === 'AUTH_EMAIL_IN_USE' || error.message?.includes('already registered') || error.message?.includes('já está cadastrado')) {
        setEmailAlreadyExists(true);
        toast({ title: 'Email já cadastrado', description: 'Este email já possui uma conta. Faça login.', variant: 'destructive' });
        return;
      }
    } else {
      // Try to auto-login right after signup
      try {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: emailUsed,
          password: signupData.password,
        });
        if (loginError) {
          // If auto-login fails (e.g. email confirmation required), show message
          toast({ title: 'Cadastro realizado!', description: 'Verifique seu email para confirmar a conta e depois tente agendar novamente.' });
          onOpenChange(false);
        } else {
          toast({ title: 'Conta criada!', description: 'Finalizando seu agendamento...' });
          // onAuthSuccess will be triggered by the auth state listener
        }
      } catch {
        toast({ title: 'Cadastro realizado!', description: 'Faça login para finalizar o agendamento.' });
        setActiveTab('login');
        setLoginData({ email: emailUsed, password: '' });
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailToUse = loginData.email.trim().toLowerCase();
    if (!emailToUse) { toast({ title: 'Email necessário', description: 'Digite seu email para recuperar a senha.', variant: 'destructive' }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) { toast({ title: 'Email inválido', description: 'Digite um email válido.', variant: 'destructive' }); return; }
    setIsRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) { toast({ title: 'Erro ao enviar email', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Email de recuperação enviado!', description: `Verifique sua caixa de entrada em ${emailToUse}` });
    } catch { toast({ title: 'Erro inesperado', description: 'Tente novamente mais tarde.', variant: 'destructive' }); } finally { setIsRecovering(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <img src={b360Logo} alt="B360" className="h-8" />
            <p className="text-sm text-muted-foreground text-center">
              Para finalizar seu agendamento, entre ou crie sua conta
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'login' ? 'default' : 'outline'}
              className="flex-1 rounded-full text-sm"
              onClick={() => setActiveTab('login')}
            >
              Entrar
            </Button>
            <Button
              variant={activeTab === 'signup' ? 'default' : 'outline'}
              className="flex-1 rounded-full text-sm"
              onClick={() => setActiveTab('signup')}
            >
              Criar Conta
            </Button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {serverRateLimited && (
                <Alert variant="destructive"><Shield className="h-4 w-4" /><AlertDescription>Sistema protegido. Aguarde alguns minutos.</AlertDescription></Alert>
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

              <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/85 text-primary-foreground" disabled={loading || isBlocked || serverRateLimited}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : isBlocked ? <><Clock className="mr-2 h-4 w-4" />Aguarde {formatRemainingTime(remainingSeconds)}</> : 'Entrar e Agendar'}
              </Button>

              <div className="flex flex-col gap-2 text-center text-sm">
                <button type="button" onClick={handleForgotPassword} disabled={isRecovering} className="text-primary hover:underline font-medium disabled:opacity-50">
                  {isRecovering ? <><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Enviando...</> : 'Esqueceu a senha?'}
                </button>
                <p className="text-muted-foreground">
                  Não tem conta?{' '}
                  <button type="button" onClick={() => setActiveTab('signup')} className="text-primary hover:underline font-medium">Criar conta</button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder="Nome completo" value={signupData.contactName} onChange={(e) => setSignupData(prev => ({ ...prev, contactName: e.target.value }))} required className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={signupData.email} onChange={(e) => { setSignupData(prev => ({ ...prev, email: e.target.value })); setEmailAlreadyExists(false); }} required className={`pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary ${emailAlreadyExists ? 'border-destructive' : ''}`} />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="tel" placeholder="Celular (ex: 11999999999)" value={signupData.contactPhone} onChange={(e) => setSignupData(prev => ({ ...prev, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} className="pl-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              {emailAlreadyExists && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" /><span className="font-medium">Email já cadastrado</span></div>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setActiveTab('login'); setLoginData(prev => ({ ...prev, email: signupData.email })); }} className="w-full"><LogIn className="h-3 w-3 mr-1" />Fazer Login</Button>
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={signupData.password} onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))} required className="pl-10 pr-10 border-0 border-b border-border rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signupData.password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Força da senha:</span><span className={`font-medium ${passwordStrength.strength === 'strong' ? 'text-green-600' : passwordStrength.strength === 'good' ? 'text-blue-600' : passwordStrength.strength === 'fair' ? 'text-yellow-600' : 'text-red-600'}`}>{getStrengthLabel(passwordStrength.strength)}</span></div>
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
              {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1"><X className="h-3 w-3" />As senhas não conferem</p>
              )}
              {signupData.confirmPassword && signupData.password === signupData.confirmPassword && (
                <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" />Senhas conferem</p>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox id="terms-booking" checked={signupData.acceptedTerms} onCheckedChange={(checked) => setSignupData(prev => ({ ...prev, acceptedTerms: checked === true }))} className="mt-0.5" />
                <Label htmlFor="terms-booking" className="text-sm font-normal leading-snug cursor-pointer">
                  Li e aceito os termos de uso *
                </Label>
              </div>

              <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/85 text-primary-foreground" disabled={loading || passwordStrength.strength === 'weak' || !signupData.acceptedTerms}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cadastrando...</> : 'Criar Conta e Agendar'}
              </Button>

              {passwordStrength.strength === 'weak' && signupData.password && (
                <p className="text-xs text-center text-muted-foreground">A senha precisa atender aos requisitos acima</p>
              )}

              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{' '}<button type="button" onClick={() => setActiveTab('login')} className="text-primary hover:underline font-medium">Fazer login</button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
