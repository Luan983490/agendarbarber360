import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import { Scissors } from 'lucide-react';

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
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
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
