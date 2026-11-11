/**
 * What the signed-in admin may do, from /admin/auth/me. Super admins can do
 * everything. The API checks every request anyway; the admin app uses this
 * only to hide menus and buttons a person cannot use.
 */

import { useAuthStore, type AdminUser } from '@/store/auth.store';

export function canDo(user: AdminUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) return true;
  return !!user.adminPermissions?.includes(permission);
}

/** `const can = useCan(); can('tenants.manage')` */
export function useCan() {
  const user = useAuthStore((s) => s.user);
  return (permission: string) => canDo(user, permission);
}
