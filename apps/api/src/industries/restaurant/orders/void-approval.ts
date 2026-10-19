import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import type { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Taking back a dish the kitchen already has is a void. Staff with the
 * "Bill void" permission may do it (with the owner's PIN when the shop asks
 * for a PIN on every void); anyone else needs the PIN of someone who holds
 * that permission. Returns who approved, for the activity log.
 */
export async function approveKitchenVoid(prisma: PrismaService, user: AuthenticatedUser, pin: string | undefined, action: string) {
  if (!hasPermission(user.role, user.permissions, PERMISSIONS.SALES_VOID)) {
    if (!pin) throw new ForbiddenException(`${action} ke liye malik ya manager ka PIN chahiye`);
    return requireManagerPin(prisma, user, pin, action, true, PIN_NEEDS.void);
  }
  const rules = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForVoid: true } });
  if (rules?.requirePinForVoid) return requireManagerPin(prisma, user, pin, action, false, PIN_NEEDS.void);
  return { by: 'permission' as const, approverId: user.id };
}
