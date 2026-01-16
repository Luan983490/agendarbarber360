import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import b360Logo from '@/assets/b360-logo.png';

/**
 * This component handles password recovery redirects.
 * When Supabase sends a recovery link, it may redirect to the site root with a code parameter.
 * This component intercepts that and redirects to /reset-password before any session is established.
 * 
 * IMPORTANT: We must NOT consume the code here - let ResetPassword handle it.
 * We can only detect recovery flow from the hash params (type=recovery).
 */
export const RecoveryRedirectHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkForRecoveryFlow = () => {
      // Skip if already on reset-password page
      if (location.pathname === '/reset-password') {
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
      console.log('[RecoveryHandler] Current path:', location.pathname);

      // If there's an error, let the normal flow handle it
      if (error) {
        setIsChecking(false);
        return;
      }

      // Check for recovery type in hash (implicit flow) - this is the reliable way to detect recovery
      if (type === 'recovery') {
        console.log('[RecoveryHandler] Recovery detected in hash, redirecting to /reset-password');
        // Set the recovery flag before redirecting
        sessionStorage.setItem('password_recovery_flow', 'true');
        // Pass the full URL (search + hash) to reset-password
        navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
        return;
      }

      // For AuthCallback with code, set the flag so AuthCallback knows to check for recovery
      // This helps when the email link goes to /auth/callback with just a code
      if (location.pathname === '/auth/callback' && code) {
        console.log('[RecoveryHandler] Code found on auth/callback, checking if from recovery email...');
        // We can't know for sure if it's recovery without consuming the code
        // But we set a temporary flag that AuthCallback will use to decide
        // Don't redirect here - let AuthCallback handle it
        setIsChecking(false);
        return;
      }
      
      setIsChecking(false);
    };

    checkForRecoveryFlow();
  }, [location.pathname, navigate]);

  // Show loading briefly while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
