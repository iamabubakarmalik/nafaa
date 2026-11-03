/**
 * Permission checks for screens.
 *
 *   const can = usePermission();
 *   if (can('products.create')) …
 *
 *   <Can do="sales.void">…</Can>
 *   <Can any={['reports.view', 'dashboard.view']} fallback={<NoAccess />}>…</Can>
 *
 * Owners and super admins can do everything (same rule as web and API).
 * Hiding a control is for convenience only; the API enforces every rule.
 */

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useAuthStore } from '../auth/store';
import { hasAllPermissions, hasAnyPermission, hasPermission, isOwner, type PermissionKey } from './permissions';

type Key = PermissionKey | string;

export function usePermission() {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.user?.permissions);
  return useCallback((key: Key) => hasPermission(role, permissions, key), [role, permissions]);
}

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.user?.permissions);
  return {
    role,
    permissions,
    isOwner: isOwner(role),
    can: (key: Key) => hasPermission(role, permissions, key),
    canAny: (keys: Key[]) => hasAnyPermission(role, permissions, keys),
    canAll: (keys: Key[]) => hasAllPermissions(role, permissions, keys),
  };
}

interface CanProps {
  do?: Key;
  any?: Key[];
  all?: Key[];
  /** Owners only. */
  owner?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ do: one, any, all, owner, fallback = null, children }: CanProps) {
  const p = usePermissions();
  const allowed =
    (!owner || p.isOwner) &&
    (!one || p.can(one)) &&
    (!any || p.canAny(any)) &&
    (!all || p.canAll(all));
  return <>{allowed ? children : fallback}</>;
}
