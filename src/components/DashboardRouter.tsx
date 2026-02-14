import { Navigate } from 'react-router-dom';
import { useUserAccess } from '@/hooks/useUserAccess';
import b360Logo from '@/assets/b360-logo.png';

export const DashboardRouter = () => {
  const { role, loading } = useUserAccess();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (role === 'barber') {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'attendant') {
    return <Navigate to="/attendant/dashboard" replace />;
  }

  if (role === 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};
