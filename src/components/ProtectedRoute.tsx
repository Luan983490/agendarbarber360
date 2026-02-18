import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import b360Logo from '@/assets/b360-logo.png';

// Check if MFA verification is pending
const hasMFAPending = () => {
  const mfaChallenge = sessionStorage.getItem('mfa_challenge');
  return !!mfaChallenge;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (hasMFAPending()) {
    return <Navigate to="/verify-mfa" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
