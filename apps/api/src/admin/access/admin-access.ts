/**
 * Resolves what an admin user may do: SUPER_ADMIN → every permission;
 * ADMIN_STAFF → their role's keys plus extra keys, only while the member row
 * is ACTIVE. Results are cached for 30 seconds per user; staff changes call
 * invalidateAdminAccess() so they apply at once on this server.
 */

import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_ADMIN_PERMISSIONS, cleanPermissions } from './admin-permissions';

export interface AdminAccess {
  isSuperAdmin: boolean;
  permissions: string[];
  roleName: string | null;
  memberId: string | null;
}

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; access: AdminAccess | null }>();

export function invalidateAdminAccess(userId?: string) {
  if (userId) cache.delete(userId); else cache.clear();
}

export async function resolveAdminAccess(prisma: PrismaService, userId: string, role?: string): Promise<AdminAccess | null> {
  if (role === UserRole.SUPER_ADMIN) {
    return { isSuperAdmin: true, permissions: ALL_ADMIN_PERMISSIONS, roleName: 'Super admin', memberId: null };
  }
  if (role !== UserRole.ADMIN_STAFF) return null;

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.access;

  const member = await prisma.adminMember.findUnique({
    where: { userId },
    select: { id: true, status: true, extraPermissions: true, role: { select: { name: true, permissions: true } } },
  });
  const access: AdminAccess | null = member && member.status === 'ACTIVE'
    ? {
        isSuperAdmin: false,
        permissions: cleanPermissions([...(member.role?.permissions ?? []), ...member.extraPermissions]),
        roleName: member.role?.name ?? null,
        memberId: member.id,
      }
    : null;
  cache.set(userId, { at: Date.now(), access });
  return access;
}
