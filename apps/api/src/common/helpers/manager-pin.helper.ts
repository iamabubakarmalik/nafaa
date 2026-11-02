/**
 * PIN checks for counter actions that the shop's settings protect (void,
 * refund, discounts above the limit, credit over a customer's limit).
 *
 * The owner's PIN approves everything. A staff member the owner gave an
 * approval PIN can approve an action only when they also hold the matching
 * permission (`approverNeeds`), so a PIN never grants more than the person's
 * own rights. When the owner has not set a PIN, a plain PIN gate lets the
 * action through (the settings page warns about this) and a hard limit stays
 * closed. Every approval and every wrong PIN is written to the activity log.
 */

import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { comparePassword } from '../utils/password.util';
import { hasPermission } from '../constants/permissions.constants';
import { apiMessage, MessageText, messageText } from '../i18n/api-message';

type Db = Pick<PrismaService, 'tenantSettings' | 'activityLog' | 'user'>;

export interface PinApproval {
  /** Who approved: the owner's PIN, a staff member's PIN, or nobody (no PIN set). */
  by: 'owner' | 'staff' | 'none';
  approverId: string | null;
}

/** Permissions a staff PIN must carry for each protected action. */
export const PIN_NEEDS = {
  discount: 'pos.discount_override',
  credit: 'khata.manage',
  void: 'sales.void',
  refund: 'returns.create',
} as const;

export type PinKind = keyof typeof PIN_NEEDS;

/** The active staff member whose approval PIN this is, if any. */
export async function matchStaffPin(prisma: Pick<PrismaService, 'user'>, tenantId: string, pin: string) {
  const staff = await prisma.user.findMany({
    where: { tenantId, isActive: true, approvalPin: { not: null } },
    select: { id: true, fullName: true, role: true, permissions: true, approvalPin: true },
  });
  for (const s of staff) {
    if (await comparePassword(pin, s.approvalPin!)) return s;
  }
  return null;
}

/**
 * Throws unless a valid PIN was given. `action` names what was protected,
 * for the error message and the activity log.
 */
export async function requireManagerPin(
  prisma: Db,
  user: { tenantId: string; id: string },
  pin: string | undefined | null,
  action: MessageText,
  strict = false,
  approverNeeds?: string,
): Promise<PinApproval> {
  const row = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { managerPin: true } });
  if (!row?.managerPin) {
    if (strict) throw new ForbiddenException(apiMessage('{{action}} ki permission nahi (Settings)', { action }));
    return { by: 'none', approverId: null };
  }
  if (!pin) throw new ForbiddenException(apiMessage('{{action}} ke liye malik ya manager ka PIN chahiye', { action }));

  if (await comparePassword(pin, row.managerPin)) return { by: 'owner', approverId: null };

  if (approverNeeds) {
    const s = await matchStaffPin(prisma, user.tenantId, pin);
    if (s) {
      if (!hasPermission(s.role, s.permissions, approverNeeds as never)) {
        throw new ForbiddenException(apiMessage('{{fullName}} ka PIN "{{action}}" approve nahi kar sakta — un ke paas is kaam ki permission nahi', { fullName: s.fullName, action }));
      }
      await prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'STAFF_PIN_APPROVED',
          description: `${messageText(action)} — ${s.fullName} ke PIN se manzoor`, metadata: { approverId: s.id, approverName: s.fullName, action: messageText(action) },
        },
      });
      return { by: 'staff', approverId: s.id };
    }
  }

  await prisma.activityLog.create({
    data: { tenantId: user.tenantId, userId: user.id, action: 'PIN_VERIFY_FAILED', description: `Ghalat PIN: ${messageText(action)}` },
  });
  throw new ForbiddenException('Ghalat PIN');
}
