import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import b360Logo from '@/assets/b360-logo.png';

/**
 * This component handles password recovery redirects.
 * When Supabase sends a recovery link, it may redirect to the site root with a code parameter.
 * This component intercepts that and redirects to /reset-password before any session is established.
 */
export const RecoveryRedirectHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    const checkForRecoveryFlow = async () => {
      // Skip if already on reset-password or auth/callback page
      if (location.pathname === '/reset-password' || location.pathname === '/auth/callback') {
        setIsChecking(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const code = urlParams.get('code');
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const error = urlParams.get('error');
      
      console.log('[RecoveryHandler] Checking URL - code:', !!code, 'type:', type, 'accessToken:', !!accessToken, 'error:', error);

      // If there's an error, let the normal flow handle it
      if (error) {
        setIsChecking(false);
        return;
      }

      // Check for recovery type in hash (implicit flow)
      if (type === 'recovery' && accessToken) {
        console.log('[RecoveryHandler] Recovery detected in hash, redirecting to /reset-password');
        setIsRecoveryFlow(true);
        // Set the recovery flag before redirecting
        sessionStorage.setItem('password_recovery_flow', 'true');
        navigate(`/reset-password${window.location.hash}`, { replace: true });
        return;
      }

      // If we have a code, we need to determine if it's for recovery or email confirmation
      // The only reliable way is to check what happens when we exchange it
      if (code && !accessToken) {
        console.log('[RecoveryHandler] Found code, checking if recovery...');
        setIsRecoveryFlow(true);
        
        try {
          // Exchange the code temporarily to check the session type
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.log('[RecoveryHandler] Code exchange failed, letting normal flow handle:', exchangeError.message);
            setIsChecking(false);
            setIsRecoveryFlow(false);
            return;
          }

          if (data.session) {
            // Check if this is a recovery session by looking at the session metadata
            // The provider will be 'recovery' for password reset flows
            const identities = data.session.user?.identities || [];
            const appMetadata = data.session.user?.app_metadata || {};
            const userMetadata = data.session.user?.user_metadata || {};
            
            // Check for recovery indicator in the session
            // When a user clicks a recovery link, the session is created with recovery provider
            const isRecovery = appMetadata.provider === 'recovery' || 
                              appMetadata.providers?.includes('recovery') ||
                              (data.session.user as any)?.recovery_sent_at;

            console.log('[RecoveryHandler] Session created, provider check:', {
              provider: appMetadata.provider,
              providers: appMetadata.providers,
              recoverySentAt: (data.session.user as any)?.recovery_sent_at,
              isRecovery
            });

            if (isRecovery || (data.session.user as any)?.recovery_sent_at) {
              console.log('[RecoveryHandler] Confirmed recovery session, redirecting to /reset-password');
              sessionStorage.setItem('password_recovery_flow', 'true');
              // Clear the URL and redirect to reset-password
              // The session is already established, so reset-password will detect it
              window.history.replaceState({}, '', '/reset-password');
              navigate('/reset-password', { replace: true });
              return;
            }

            // Not a recovery session - this is email confirmation
            // Let the session be used and redirect normally
            console.log('[RecoveryHandler] Not a recovery session, email confirmation flow');
            setIsChecking(false);
            setIsRecoveryFlow(false);
            return;
          }
        } catch (err) {
          console.error('[RecoveryHandler] Error checking code:', err);
        }
        
        setIsRecoveryFlow(false);
      }

      setIsChecking(false);
    };

    checkForRecoveryFlow();
  }, [location.pathname, navigate]);

  // Show loading while checking for recovery flow
  if (isChecking && isRecoveryFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
