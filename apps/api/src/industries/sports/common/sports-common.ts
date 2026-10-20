/**
 * Helpers shared by the sports services: rounding, list paging, item
 * checks for team orders and repairs, and giving back the advance of a
 * cancelled order or repair in cash.
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { paidOnKhata, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
export const DAY_MS = 86_400_000;
export const PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export function paging(q: { page?: string | number; limit?: string | number }, max = 100) {
  const limit = Math.min(Math.max(Number(q.limit) || 30, 1), max);
  const page = Math.max(Number(q.page) || 1, 1);
  return { page, limit, skip: (page - 1) * limit };
}

/** Short trimmed text or undefined; longer text is cut to `max`. */
export function text(v: unknown, max = 200): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
}

/** Advance already refunded in cash for a record (khata REFUND lines with its number). */
export async function refundedOnKhata(db: Prisma.TransactionClient | PrismaService, tenantId: string, reference: string) {
  const agg = await db.customerLedger.aggregate({ where: { tenantId, type: 'REFUND', reference }, _sum: { amount: true } });
  return r2(Number(agg._sum.amount) || 0);
}

/** Customer whose khata holds the advance of a record (first advance line with its number), if any. */
export async function khataCustomerOf(db: Prisma.TransactionClient | PrismaService, tenantId: string, reference: string) {
  const line = await db.customerLedger.findFirst({
    where: { tenantId, reference, type: 'PAYMENT_RECEIVED' }, orderBy: { createdAt: 'asc' }, select: { customerId: true },
  });
  return line?.customerId ?? null;
}

/** Refunds follow the shop's refund PIN setting, as returns do. */
export async function checkRefundPin(prisma: PrismaService, user: AuthenticatedUser, managerPin?: string) {
  const rules = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForRefund: true } });
  if (rules?.requirePinForRefund) await requireManagerPin(prisma, user, managerPin, 'Advance wapsi', false, PIN_NEEDS.refund);
}

/**
 * Gives back in cash the advance of a cancelled team order or repair. Only
 * money held on the customer's khata for this record (and still unused
 * there) goes back: the khata gets a REFUND line with the record number and
 * the cash leaves the branch's open drawer as a cash-out with that number.
 * Returns the amount given back.
 */
export async function refundAdvance(
  tx: Prisma.TransactionClient,
  user: AuthenticatedUser,
  input: { reference: string; label: string; customerId: string | null; shopId?: string | null },
) {
  const paid = await paidOnKhata(tx, user.tenantId, input.reference);
  const refunded = await refundedOnKhata(tx, user.tenantId, input.reference);
  const customer = input.customerId
    ? await tx.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true, balance: true } })
    : null;
  const held = customer ? Math.max(-Number(customer.balance), 0) : 0;
  const amount = r2(Math.min(paid - refunded, held));
  if (!customer || !(amount > 0)) {
    // The advance can be used up by older udhaar on the same khata.
    const owes = customer ? r2(Math.max(Number(customer.balance), 0)) : 0;
    throw new BadRequestException(paid - refunded > 0.009 && owes > 0
      ? `Advance customer ke purane udhaar me lag chuka hai (khata par abhi Rs ${owes} baqi) — wapas karne ko kuch nahi`
      : 'Is ka koi advance khata par baqi nahi — wapas karne ko kuch nahi');
  }

  const shopId = await resolveIndustryShopId(tx, user, input.shopId);
  const register = await tx.cashRegister.findFirst({ where: { tenantId: user.tenantId, shopId, status: 'OPEN' }, orderBy: { openedAt: 'desc' }, select: { id: true } });
  const claimed = register
    ? await tx.cashRegister.updateMany({ where: { id: register.id, status: 'OPEN' }, data: { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } } })
    : { count: 0 };
  if (!register || !claimed.count) throw new BadRequestException('Is branch ka cash register band hai — pehle register kholein, phir advance wapas karein');

  const { balance } = await tx.customer.update({ where: { id: customer.id }, data: { balance: { increment: amount } }, select: { balance: true } });
  await tx.customerLedger.create({
    data: {
      tenantId: user.tenantId, shopId, customerId: customer.id, createdById: user.id,
      type: 'REFUND', amount, balanceAfter: balance, reference: input.reference, paymentMethod: 'CASH',
      note: `${input.label} cancel — advance wapas: ${input.reference}`,
    },
  });
  await tx.cashTransaction.create({
    data: {
      tenantId: user.tenantId, cashRegisterId: register.id, createdById: user.id,
      type: 'CASH_OUT', amount, reason: `Advance wapas: ${input.reference}`, note: `${input.label} cancel`, reference: input.reference,
    },
  });
  return amount;
}
