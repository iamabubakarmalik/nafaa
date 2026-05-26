import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  hasAnyPermission,
  hasPermission,
  type PermissionKey,
} from '@/lib/permissions';

export function usePermission(permission: PermissionKey) {
  const user = useAuthStore((s) => s.user);

  return useMemo(
    () => hasPermission(user?.role as any, user?.permissions, permission),
    [user, permission],
  );
}

export function useAnyPermission(permissions: PermissionKey[]) {
  const user = useAuthStore((s) => s.user);

  return useMemo(
    () => hasAnyPermission(user?.role as any, user?.permissions, permissions),
    [user, permissions],
  );
}
