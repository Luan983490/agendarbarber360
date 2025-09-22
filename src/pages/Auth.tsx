import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, User, Store } from 'lucide-react';

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    userType: 'client' as 'client' | 'barbershop_owner'
  });
  const [loading, setLoading] = useState(false);

  // Check user profile and redirect accordingly
  useEffect(() => {
    if (user) {
      checkUserProfileAndRedirect();
    }
  }, [user]);

  const checkUserProfileAndRedirect = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user?.id)
        .single();

      if (profile?.user_type === 'barbershop_owner') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      navigate('/', { replace: true });
    }
  };

  // Don't render if user is already logged in
  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    if (!error) {
      // Redirect will be handled by the useEffect above
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      return;
    }
    setLoading(true);
    await signUp(signupData.email, signupData.password, signupData.userType);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scissors className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">BarberBook</h1>
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
                    <Input
                      id="password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
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
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
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