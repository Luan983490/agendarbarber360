import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserAccess } from './useUserAccess';

interface PermissionsResult {
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  permissions: string[] | 'all';
  isLoading: boolean;
  isOwner: boolean;
}

export const usePermissions = (): PermissionsResult => {
  const { user } = useAuth();
  const { role, barberId } = useUserAccess();

  const isOwner = role === 'owner';

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['barber-permissions', user?.id, barberId, role],
    queryFn: async (): Promise<string[] | 'all'> => {
      if (!user) return [];
      
      // Owner always has full access
      if (isOwner) return 'all';

      if (!barberId) return [];

      const { data, error } = await supabase
        .from('barber_permissions')
        .select(`
          granted,
          permissions!inner(code)
        `)
        .eq('barber_id', barberId)
        .eq('granted', true);

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      return (data || []).map((p: any) => p.permissions?.code).filter(Boolean);
    },
    enabled: !!user && role !== null,
    staleTime: 60000, // 1 min cache
    gcTime: 300000,
  });

  const hasPermission = (code: string): boolean => {
    if (permissions === 'all') return true;
    return permissions.includes(code);
  };

  const hasAnyPermission = (codes: string[]): boolean => {
    if (permissions === 'all') return true;
    return codes.some(code => permissions.includes(code));
  };

  const hasAllPermissions = (codes: string[]): boolean => {
    if (permissions === 'all') return true;
    return codes.every(code => permissions.includes(code));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    isLoading,
    isOwner,
  };
};
