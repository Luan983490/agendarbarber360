import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import b360Logo from '@/assets/b360-logo.png';

// Check if MFA verification is pending
const hasMFAPending = () => {
  const mfaChallenge = sessionStorage.getItem('mfa_challenge');
  return !!mfaChallenge;
};

type AllowedRole = 'owner' | 'barber' | 'attendant' | 'client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: accessLoading } = useUserAccess();

  // Show loading while checking authentication
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: If MFA is pending, redirect to verification page
  if (hasMFAPending()) {
    console.log('[ProtectedRoute] MFA pending - redirecting to /verify-mfa');
    return <Navigate to="/verify-mfa" replace />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If no specific roles are required, just check if logged in
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has one of the allowed roles
  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  // Redirect based on user's role if not authorized
  if (role === 'owner') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  if (role === 'barber') {
    return <Navigate to="/barber/hoje" replace />;
  }

  // Default redirect to home
  return <Navigate to="/" replace />;
};
