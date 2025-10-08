import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserRole {
  userType: 'client' | 'barbershop_owner' | 'barber' | null;
  barberId?: string;
  barbershopId?: string;
  loading: boolean;
}

export const useUserRole = (): UserRole => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>({
    userType: null,
    loading: true
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole({ userType: null, loading: false });
        return;
      }

      try {
        // Buscar perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        const userType = profileData.user_type as 'client' | 'barbershop_owner' | 'barber';

        // Se for barbeiro, buscar o ID do barbeiro e barbearia
        if (userType === 'barber') {
          const { data: barberData } = await supabase
            .from('barbers')
            .select('id, barbershop_id')
            .eq('user_id', user.id)
            .single();

          setRole({
            userType,
            barberId: barberData?.id,
            barbershopId: barberData?.barbershop_id,
            loading: false
          });
        } else {
          setRole({
            userType,
            loading: false
          });
        }
      } catch (error: any) {
        console.error('Erro ao buscar role do usuário:', error);
        setRole({ userType: null, loading: false });
      }
    };

    fetchUserRole();
  }, [user]);

  return role;
};
