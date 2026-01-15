import { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Store, Check, X, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { loginSchema, signUpSchema, validateWithSchema, formatValidationErrors } from '@/lib/validation-schemas';
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

  useEffect(() => {
    if (user) {
      checkUserProfileAndRedirect();
    }
  }, [user]);

  const checkUserProfileAndRedirect = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();
    
    if (profile?.user_type === 'barbershop_owner') {
      navigate('/dashboard');
    } else if (profile?.user_type === 'barber') {
      navigate('/barber/hoje');
    } else {
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    const { error } = await signIn(loginData.email.trim().toLowerCase(), loginData.password);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    if (!error) {
      setSignupEmail(signupData.email);
      setSignupSuccess(true);
    }
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
              <CardTitle className="text-green-600">Cadastro Realizado!</CardTitle>
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
          <Tabs defaultValue="login">
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
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
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
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
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
                      <p className="text-xs text-green-600 flex items-center gap-1">
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
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;