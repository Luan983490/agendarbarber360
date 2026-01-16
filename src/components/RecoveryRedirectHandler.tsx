import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import b360Logo from '@/assets/b360-logo.png';

/**
 * This component handles password recovery redirects.
 * When Supabase sends a recovery link, the URL contains hash params with type=recovery.
 * This component intercepts that and redirects to /reset-password with the hash intact.
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

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      console.log('[RecoveryHandler] Checking - path:', location.pathname, 'type:', type);

      // If type=recovery in hash, redirect to reset-password with the full hash
      if (type === 'recovery') {
        console.log('[RecoveryHandler] Recovery detected, redirecting to /reset-password');
        navigate(`/reset-password${window.location.hash}`, { replace: true });
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
