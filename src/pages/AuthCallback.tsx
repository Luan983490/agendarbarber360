import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import b360Logo from '@/assets/b360-logo.png';

type CallbackStatus = 'loading' | 'success' | 'error' | 'resend';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resendEmail, setResendEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          
          if (error === 'access_denied' || errorDescription?.includes('expired')) {
            setErrorMessage('O link de confirmação expirou ou já foi utilizado.');
            setStatus('resend');
            return;
          }
          
          setErrorMessage(errorDescription || 'Erro na confirmação do email.');
          setStatus('error');
          return;
        }

        // Get the session - Supabase automatically handles the token exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setErrorMessage('Erro ao verificar sessão. Tente fazer login novamente.');
          setStatus('error');
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session found, user id:', session.user.id);
          setStatus('success');
          
          // Get user profile to redirect to correct dashboard
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('user_id', session.user.id)
            .single();

          if (profileError) {
            console.error('[AuthCallback] Profile error:', profileError);
            // Fallback to user metadata
            const userType = session.user.user_metadata?.user_type;
            console.log('[AuthCallback] Fallback to user_metadata:', userType);
          }

          console.log('[AuthCallback] Profile user_type:', profile?.user_type);

          toast({
            title: 'Email confirmado!',
            description: 'Seu cadastro foi confirmado com sucesso.',
          });

          // Delay redirect to show success message
          setTimeout(() => {
            const userType = profile?.user_type || session.user.user_metadata?.user_type;
            console.log('[AuthCallback] Redirecting based on user_type:', userType);
            
            if (userType === 'barbershop_owner') {
              console.log('[AuthCallback] -> /dashboard');
              navigate('/dashboard', { replace: true });
            } else if (userType === 'barber') {
              console.log('[AuthCallback] -> /barber/hoje');
              navigate('/barber/hoje', { replace: true });
            } else {
              console.log('[AuthCallback] -> /');
              navigate('/', { replace: true });
            }
          }, 2000);
        } else {
          // No session found - might need to exchange code
          const code = searchParams.get('code');
          
          if (code) {
            // Exchange code for session (PKCE flow)
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              setErrorMessage('Link de confirmação inválido ou expirado.');
              setStatus('resend');
              return;
            }

            if (data.session) {
              console.log('[AuthCallback] Session from code exchange, user id:', data.session.user.id);
              setStatus('success');
              
              toast({
                title: 'Email confirmado!',
                description: 'Seu cadastro foi confirmado com sucesso.',
              });

              // Get user profile
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('user_id', data.session.user.id)
                .single();

              if (profileError) {
                console.error('[AuthCallback] Profile error:', profileError);
              }
              
              console.log('[AuthCallback] Profile user_type:', profile?.user_type);

              setTimeout(() => {
                const userType = profile?.user_type || data.session!.user.user_metadata?.user_type;
                console.log('[AuthCallback] Redirecting based on user_type:', userType);
                
                if (userType === 'barbershop_owner') {
                  console.log('[AuthCallback] -> /dashboard');
                  navigate('/dashboard', { replace: true });
                } else if (userType === 'barber') {
                  console.log('[AuthCallback] -> /barber/hoje');
                  navigate('/barber/hoje', { replace: true });
                } else {
                  console.log('[AuthCallback] -> /');
                  navigate('/', { replace: true });
                }
              }, 2000);
            }
          } else {
            setErrorMessage('Link de confirmação inválido.');
            setStatus('error');
          }
        }
      } catch (err) {
        console.error('Callback error:', err);
        setErrorMessage('Erro inesperado. Tente novamente.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast]);

  const handleResendConfirmation = async () => {
    if (!resendEmail) {
      toast({
        title: 'Email necessário',
        description: 'Digite seu email para reenviar a confirmação.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Email reenviado!',
        description: 'Verifique sua caixa de entrada e spam.',
      });
      
      setStatus('loading');
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: 'Erro ao reenviar',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const goToLogin = () => {
    navigate('/auth', { replace: true });
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
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Confirmando seu email...</CardTitle>
                <CardDescription>Por favor, aguarde enquanto verificamos sua conta.</CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle className="text-green-600">Email Confirmado!</CardTitle>
                <CardDescription>Sua conta foi verificada com sucesso. Redirecionando...</CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Erro na Confirmação</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </>
            )}

            {status === 'resend' && (
              <>
                <div className="flex justify-center mb-4">
                  <Mail className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle>Link Expirado</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {status === 'error' && (
              <Button onClick={goToLogin} className="w-full">
                Voltar para Login
              </Button>
            )}

            {status === 'resend' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="resend-email" className="text-sm font-medium">
                    Digite seu email para reenviar a confirmação:
                  </label>
                  <input
                    id="resend-email"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="seu@email.com"
                  />
                </div>
                <Button 
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
                <Button variant="outline" onClick={goToLogin} className="w-full">
                  Voltar para Login
                </Button>
              </>
            )}

            {status === 'success' && (
              <div className="text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Redirecionando...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthCallback;
