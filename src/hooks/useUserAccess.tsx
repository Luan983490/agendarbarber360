import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type UserRole = 'owner' | 'barber' | 'attendant' | 'client' | null;

interface UserAccess {
  role: UserRole;
  barbershopId?: string;
  barberId?: string;
  loading: boolean;
  canManageBarbershop: boolean;
  canManageBarbers: boolean;
  canManageServices: boolean;
  canManageProducts: boolean;
  canManageBookings: boolean;
  canViewAllBookings: boolean;
  canManageSchedule: boolean;
}

export const useUserAccess = (): UserAccess => {
  const { user } = useAuth();
  const [access, setAccess] = useState<UserAccess>({
    role: null,
    loading: true,
    canManageBarbershop: false,
    canManageBarbers: false,
    canManageServices: false,
    canManageProducts: false,
    canManageBookings: false,
    canViewAllBookings: false,
    canManageSchedule: false,
  });

  useEffect(() => {
    const fetchUserAccess = async () => {
      if (!user) {
        setAccess({
          role: null,
          loading: false,
          canManageBarbershop: false,
          canManageBarbers: false,
          canManageServices: false,
          canManageProducts: false,
          canManageBookings: false,
          canViewAllBookings: false,
          canManageSchedule: false,
        });
        return;
      }

      try {
        // Check if user is a barbershop owner
        const { data: barbershopData } = await supabase
          .from('barbershops')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (barbershopData) {
          setAccess({
            role: 'owner',
            barbershopId: barbershopData.id,
            loading: false,
            canManageBarbershop: true,
            canManageBarbers: true,
            canManageServices: true,
            canManageProducts: true,
            canManageBookings: true,
            canViewAllBookings: true,
            canManageSchedule: true,
          });
          return;
        }

        // Check if user has a role in any barbershop
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role, barbershop_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData) {
          const isAttendant = roleData.role === 'attendant';
          const isBarber = roleData.role === 'barber';

          let barberId: string | undefined;
          if (isBarber) {
            const { data: barberData } = await supabase
              .from('barbers')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            barberId = barberData?.id;
          }

          setAccess({
            role: roleData.role as UserRole,
            barbershopId: roleData.barbershop_id,
            barberId,
            loading: false,
            canManageBarbershop: false,
            canManageBarbers: false,
            canManageServices: false,
            canManageProducts: false,
            canManageBookings: true,
            canViewAllBookings: isAttendant,
            canManageSchedule: isBarber,
          });
          return;
        }

        // If no barbershop or role, user is a client
        setAccess({
          role: 'client',
          loading: false,
          canManageBarbershop: false,
          canManageBarbers: false,
          canManageServices: false,
          canManageProducts: false,
          canManageBookings: false,
          canViewAllBookings: false,
          canManageSchedule: false,
        });
      } catch (error) {
        console.error('Error fetching user access:', error);
        setAccess({
          role: null,
          loading: false,
          canManageBarbershop: false,
          canManageBarbers: false,
          canManageServices: false,
          canManageProducts: false,
          canManageBookings: false,
          canViewAllBookings: false,
          canManageSchedule: false,
        });
      }
    };

    fetchUserAccess();
  }, [user]);

  return access;
};
