import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { userService } from '@/services';

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
        // Get user profile using UserService
        const profileResult = await userService.getProfile(user.id);

        if (!profileResult.success || !profileResult.data) {
          setRole({ userType: null, loading: false });
          return;
        }

        const userType = profileResult.data.userType as 'client' | 'barbershop_owner' | 'barber';

        // If user is a barber, get barber record
        if (userType === 'barber') {
          const barberResult = await userService.getBarberRecord(user.id);

          setRole({
            userType,
            barberId: barberResult.data?.barberId,
            barbershopId: barberResult.data?.barbershopId,
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
