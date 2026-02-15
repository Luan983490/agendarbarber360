import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import b360Logo from '@/assets/b360-logo.png';

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('barbershops')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        setBarbershopId(data?.id || null);
      } catch {
        setBarbershopId(null);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBarbershop();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!barbershopId) return <Navigate to="/dashboard" replace />;

  return <OnboardingWizard barbershopId={barbershopId} />;
};

export default Onboarding;
