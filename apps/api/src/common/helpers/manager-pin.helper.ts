/**
 * Owner PIN checks for counter actions that the shop's settings protect
 * (void, refund, discounts above the limit, credit over a customer's limit).
 * When the owner has not set a PIN, a plain PIN gate lets the action through
 * (the settings page warns about this) and a hard limit stays closed.
 */

import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { comparePassword } from '../utils/password.util';

type Db = Pick<PrismaService, 'tenantSettings' | 'activityLog'>;

/**
 * Throws unless the owner's PIN was given. `action` names what was protected,
 * for the error message and the activity log. Without a PIN set, the action
 * is allowed, unless `strict` (a hard limit that only the PIN can lift).
 */
export async function requireManagerPin(
  prisma: Db,
  user: { tenantId: string; id: string },
  pin: string | undefined | null,
  action: string,
  strict = false,
): Promise<void> {
  const row = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { managerPin: true } });
  if (!row?.managerPin) {
    if (strict) throw new ForbiddenException(`${action} ki ijazat nahi (Settings)`);
    return;
  }
  if (!pin) throw new ForbiddenException(`${action} ke liye malik ka PIN chahiye`);
  if (await comparePassword(pin, row.managerPin)) return;
  await prisma.activityLog.create({
    data: { tenantId: user.tenantId, userId: user.id, action: 'PIN_VERIFY_FAILED', description: `Ghalat PIN: ${action}` },
  });
  throw new ForbiddenException('Ghalat PIN');
}
