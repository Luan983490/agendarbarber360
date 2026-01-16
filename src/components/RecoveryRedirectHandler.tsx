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

      // Check for recovery type in hash (implicit flow) - this is the reliable way to detect recovery
      if (type === 'recovery') {
        console.log('[RecoveryHandler] Recovery detected in hash, redirecting to /reset-password');
        // Set the recovery flag before redirecting
        sessionStorage.setItem('password_recovery_flow', 'true');
        // Pass the full URL (search + hash) to reset-password
        navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
        return;
      }

      // For PKCE flow with code but no type indicator, we cannot determine if it's recovery
      // without consuming the code. Let the normal AuthCallback or ResetPassword handle it.
      // The user should access /reset-password directly from the email link.
      
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
