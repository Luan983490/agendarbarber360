import { useEffect, useState, useRef, useCallback } from 'react';
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

// Cache global para evitar chamadas duplicadas
let accessCache: { userId: string; access: UserAccess; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 segundos

const defaultAccess: UserAccess = {
  role: null,
  loading: true,
  canManageBarbershop: false,
  canManageBarbers: false,
  canManageServices: false,
  canManageProducts: false,
  canManageBookings: false,
  canViewAllBookings: false,
  canManageSchedule: false,
};

export const useUserAccess = (): UserAccess => {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<UserAccess>(defaultAccess);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchUserAccess = useCallback(async (userId: string) => {
    // Verificar cache
    if (
      accessCache &&
      accessCache.userId === userId &&
      Date.now() - accessCache.timestamp < CACHE_DURATION
    ) {
      setAccess(accessCache.access);
      return;
    }

    // Evitar chamadas duplicadas simultâneas
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Check if user is a barbershop owner
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (barbershopData) {
        const ownerAccess: UserAccess = {
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
        };
        accessCache = { userId, access: ownerAccess, timestamp: Date.now() };
        setAccess(ownerAccess);
        fetchingRef.current = false;
        return;
      }

      // Check if user has a role in any barbershop
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, barbershop_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        const isAttendant = roleData.role === 'attendant';
        const isBarber = roleData.role === 'barber';

        let barberId: string | undefined;
        if (isBarber) {
          const { data: barberData } = await supabase
            .from('barbers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          barberId = barberData?.id;
        }

        const roleAccess: UserAccess = {
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
        };
        accessCache = { userId, access: roleAccess, timestamp: Date.now() };
        setAccess(roleAccess);
        fetchingRef.current = false;
        return;
      }

      // If no barbershop or role, user is a client
      const clientAccess: UserAccess = {
        role: 'client',
        loading: false,
        canManageBarbershop: false,
        canManageBarbers: false,
        canManageServices: false,
        canManageProducts: false,
        canManageBookings: false,
        canViewAllBookings: false,
        canManageSchedule: false,
      };
      accessCache = { userId, access: clientAccess, timestamp: Date.now() };
      setAccess(clientAccess);
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
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Se ainda está carregando auth, aguardar
    if (authLoading) {
      return;
    }

    if (!user) {
      // Limpar cache ao fazer logout
      if (lastUserIdRef.current) {
        accessCache = null;
        lastUserIdRef.current = null;
      }
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

    // Só buscar se o usuário mudou
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;
      fetchUserAccess(user.id);
    }
  }, [user, authLoading, fetchUserAccess]);

  return access;
};
