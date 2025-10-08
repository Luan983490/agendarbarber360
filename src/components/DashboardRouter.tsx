import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Scissors } from 'lucide-react';

export const DashboardRouter = () => {
  const { userType, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Scissors className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (userType === 'barber') {
    return <Navigate to="/barber-dashboard" replace />;
  }

  if (userType === 'barbershop_owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};
