import { Navigate } from 'react-router-dom';
import { useUserAccess } from '@/hooks/useUserAccess';
import { Scissors } from 'lucide-react';

export const DashboardRouter = () => {
  const { role, loading } = useUserAccess();

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

  if (role === 'barber') {
    return <Navigate to="/barber/hoje" replace />;
  }

  if (role === 'attendant') {
    return <Navigate to="/attendant/dashboard" replace />;
  }

  if (role === 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};
