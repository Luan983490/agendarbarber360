import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
  permission: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
  showLoading?: boolean;
}

export const PermissionGuard = ({
  permission,
  children,
  fallback = null,
  requireAll = false,
  showLoading = false,
}: PermissionGuardProps) => {
  const { hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading && showLoading) return <Skeleton className="h-8 w-full" />;
  if (isLoading) return null;

  const codes = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll ? hasAllPermissions(codes) : hasAnyPermission(codes);

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
};
