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

        // First, try to get the code from URL (PKCE flow)
        const code = searchParams.get('code');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('[AuthCallback] URL params - code:', !!code, 'access_token:', !!accessToken, 'type:', type);

        // Check if this is a password recovery flow - redirect to reset-password page
        if (type === 'recovery') {
          console.log('[AuthCallback] Recovery flow detected, redirecting to /reset-password');
          // Pass the hash params to the reset-password page
          navigate(`/reset-password${window.location.hash}`, { replace: true });
          return;
        }

        // If we have tokens in the hash (implicit flow), set the session
        if (accessToken) {
          console.log('[AuthCallback] Setting session from hash tokens');
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (setSessionError) {
            console.error('[AuthCallback] Set session error:', setSessionError);
            setErrorMessage('Erro ao estabelecer sessão.');
            setStatus('error');
            return;
          }

          if (data.session) {
            await handleSuccessfulAuth(data.session);
            return;
          }
        }

        // If we have a code (PKCE flow), we need to check if it's for password recovery
        // by looking at the referer or checking after exchange
        if (code) {
          console.log('[AuthCallback] Exchanging code for session');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[AuthCallback] Code exchange error:', exchangeError);
            
            // If exchange fails, try getting existing session
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
              console.log('[AuthCallback] Found existing session after exchange error');
              await handleSuccessfulAuth(existingSession);
              return;
            }
            
            setErrorMessage('Link de confirmação inválido ou expirado.');
            setStatus('resend');
            return;
          }

          if (data.session) {
            // Check if user came from recovery flow by checking recovery_sent_at timestamp
            const userRecoverySentAt = (data.session.user as any)?.recovery_sent_at;
            const recentRecovery = userRecoverySentAt && 
              (new Date().getTime() - new Date(userRecoverySentAt).getTime()) < 3600000; // 1 hour
            
            if (recentRecovery) {
              console.log('[AuthCallback] Recovery session detected, redirecting to /reset-password');
              // Set the recovery flag so Auth.tsx doesn't redirect away
              sessionStorage.setItem('password_recovery_flow', 'true');
              // DO NOT sign out - user needs the session to update their password
              // Just redirect to reset-password, the session is already established
              navigate('/reset-password', { replace: true });
              return;
            }
            
            await handleSuccessfulAuth(data.session);
            return;
          }
        }

        // If no code or tokens, check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setErrorMessage('Erro ao verificar sessão. Tente fazer login novamente.');
          setStatus('error');
          return;
        }

        if (session) {
          console.log('[AuthCallback] Found existing session');
          await handleSuccessfulAuth(session);
          return;
        }

        // No session found at all
        console.log('[AuthCallback] No session found');
        setErrorMessage('Link de confirmação inválido.');
        setStatus('error');
      } catch (err) {
        console.error('[AuthCallback] Callback error:', err);
        setErrorMessage('Erro inesperado. Tente novamente.');
        setStatus('error');
      }
    };

    const handleSuccessfulAuth = async (session: any) => {
      console.log('[AuthCallback] Session established, user id:', session.user.id);
      setStatus('success');
      
      // Get user profile to redirect to correct dashboard
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('[AuthCallback] Profile error:', profileError);
      }

      const userType = profile?.user_type || session.user.user_metadata?.user_type;
      console.log('[AuthCallback] User type:', userType);

      toast({
        title: 'Email confirmado com sucesso!',
        description: userType === 'barbershop_owner' 
          ? 'Você será redirecionado para configurar sua barbearia.' 
          : 'Você está logado automaticamente.',
      });

      // Redirect after showing success message
      setTimeout(() => {
        if (userType === 'barbershop_owner') {
          console.log('[AuthCallback] -> /dashboard (owner)');
          navigate('/dashboard', { replace: true });
        } else if (userType === 'barber') {
          console.log('[AuthCallback] -> /barber/hoje');
          navigate('/barber/hoje', { replace: true });
        } else {
          console.log('[AuthCallback] -> / (client)');
          navigate('/', { replace: true });
        }
      }, 2000);
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
