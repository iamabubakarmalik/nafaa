import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Determine which shopId a user can access for filtering data.
 *
 * Rules:
 * - OWNER/SUPER_ADMIN: Can pass any shopId, or none (sees all)
 * - MANAGER/CASHIER/STAFF: Locked to their assignedShop; ignore any requested shopId
 *
 * @param user Authenticated user from JWT
 * @param requestedShopId Optional shopId from query/body
 * @returns shopId to filter by (or undefined for "all shops")
 */
export function resolveShopScope(
  user: AuthenticatedUser,
  requestedShopId?: string,
): string | undefined {
  // Owner & SuperAdmin can scope to any shop or see all
  if (user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN) {
    return requestedShopId || undefined;
  }

  // Non-owner: must have an assigned shop
  if (!user.shopId) {
    throw new ForbiddenException(
      'Aap kisi shop se assigned nahi hain. Owner se contact karein.',
    );
  }

  // Non-owner: always locked to their shop
  return user.shopId;
}

/**
 * Strict version — throws if non-owner tries to access different shop
 */
export function enforceShopAccess(
  user: AuthenticatedUser,
  shopId: string,
): void {
  if (user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN) {
    return; // Owner can access any shop
  }

  if (user.shopId !== shopId) {
    throw new ForbiddenException('Aap is shop ko access nahi kar sakte');
  }
}
