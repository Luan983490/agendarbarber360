import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

// Check if MFA verification is pending
const hasMFAPending = () => {
  const mfaChallenge = sessionStorage.getItem('mfa_challenge');
  return !!mfaChallenge;
};

type AllowedRole = 'owner' | 'barber' | 'attendant' | 'client';

// Paths exempt from subscription check
const SUBSCRIPTION_EXEMPT_PATHS = ['/planos', '/admin/assinatura', '/perfil'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
  checkSubscription?: boolean;
}

export const ProtectedRoute = ({ children, allowedRoles, checkSubscription = true }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: accessLoading, barbershopId } = useUserAccess();
  const location = useLocation();

  // Only check subscription for owners on non-exempt paths
  const isExemptPath = SUBSCRIPTION_EXEMPT_PATHS.some(p => location.pathname.startsWith(p));
  const shouldCheckSubscription = checkSubscription && role === 'owner' && !isExemptPath && !!barbershopId;

  const { hasAccess, isLoading: subLoading } = useSubscription(
    shouldCheckSubscription ? barbershopId || null : null
  );

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
    // For owners, check subscription access
    if (shouldCheckSubscription) {
      if (subLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Verificando assinatura...</p>
            </div>
          </div>
        );
      }

      if (!hasAccess) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Acesso Expirado</h2>
                <p className="text-sm text-muted-foreground">
                  Seu período de teste expirou. Para continuar usando o sistema, escolha um plano.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.location.href = '/planos'}
                >
                  Ver Planos
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }
    }

    return <>{children}</>;
  }

  // Redirect based on user's role if not authorized
  if (role === 'owner') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  if (role === 'barber') {
    return <Navigate to="/dashboard" replace />;
  }

  // Default redirect to home
  return <Navigate to="/" replace />;
};
