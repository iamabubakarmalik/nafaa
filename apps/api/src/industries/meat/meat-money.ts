/**
 * Money on meat orders and bookings (weight orders, qurbani shares).
 *
 * Money taken before the bill is held on the customer's khata as an advance
 * (one PAYMENT_RECEIVED line with the order number as reference), so it
 * reaches the day book and the drawer on the day it is paid. The final bill
 * is a normal sale; its unpaid part goes on the same khata, where the
 * advance cancels it. A cancelled order can give the unused advance back in
 * cash: a khata REFUND line plus a cash-out from the open drawer.
 */

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PIN_NEEDS, requireManagerPin } from '../../common/helpers/manager-pin.helper';
import { ensureCustomer, paidOnKhata, recordKhataPayment, resolveIndustryShopId } from '../_shared/industry-sale.helper';

type Db = PrismaService | Prisma.TransactionClient;

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: unknown) => Math.round((Number(n) || 0) * 1000) / 1000;
export const r4 = (n: unknown) => Math.round((Number(n) || 0) * 10000) / 10000;

/** Payment methods an advance can be taken by. */
export const PAY_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'] as const;

export function payMethod(v: unknown): string {
  const m = String(v ?? 'CASH').toUpperCase();
  if (!(PAY_METHODS as readonly string[]).includes(m)) throw new BadRequestException('Paisa lene ka tareeqa theek nahi');
  return m;
}

/** A positive number from a request, or a Roman Urdu error. */
export function positive(value: unknown, message: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(message);
  return n;
}

/** Trimmed text, or null when empty. */
export function str(v: unknown, max = 500): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/**
 * Creates a row with the next free `PREFIX0001` number. Two saves at the same
 * moment read the same last number; the unique index rejects the second,
 * which retries with the next one.
 */
export async function withNextNumber<T>(
  last: (prefix: string) => Promise<string | null | undefined>,
  prefix: string,
  pad: number,
  create: (number: string) => Promise<T>,
): Promise<T> {
  const latest = await last(prefix);
  const base = Number(String(latest ?? '').slice(prefix.length)) || 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = `${prefix}${String(base + 1 + attempt).padStart(pad, '0')}`;
    try {
      return await create(number);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new BadRequestException('Number nahi bana — dobara koshish karein');
}

/** Takes an advance onto the customer's khata (opening a khata for a walk-in). Returns the customer id. */
export async function takeAdvance(
  tx: Prisma.TransactionClient,
  user: AuthenticatedUser,
  input: { reference: string; label: string; amount: number; method?: string | null; customerId?: string | null; name?: string | null; phone?: string | null; shopId?: string | null },
): Promise<string> {
  const shopId = await resolveIndustryShopId(tx, user, input.shopId);
  const customerId = await ensureCustomer(tx, user, { customerId: input.customerId, name: input.name, phone: input.phone, shopId });
  await recordKhataPayment(tx, user, {
    customerId, shopId, amount: r2(input.amount), reference: input.reference,
    note: `${input.label} advance: ${input.reference}`, method: input.method,
  });
  return customerId;
}

/**
 * Money on a record split by where it sits: `khataPaid` is held on the
 * customer's khata; `legacyPaid` is money noted before khata posting existed
 * (or taken with the bill), which the bill counts as paid.
 */
export async function recordMoney(db: Db, tenantId: string, reference: string, paidAmount: number) {
  const khataPaid = Math.min(await paidOnKhata(db as Prisma.TransactionClient, tenantId, reference), r2(paidAmount));
  return { khataPaid, legacyPaid: r2(Math.max(paidAmount - khataPaid, 0)) };
}

/** Refunds follow the shop's refund PIN setting, as returns do. */
export async function checkRefundPin(prisma: PrismaService, user: AuthenticatedUser, managerPin?: string) {
  const rules = await prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForRefund: true } });
  if (rules?.requirePinForRefund) await requireManagerPin(prisma, user, managerPin, 'Advance wapsi', false, PIN_NEEDS.refund);
}

/**
 * Gives back in cash the unused advance of a cancelled record. Only money
 * held on the khata for this reference (and still unused there) goes back.
 * Returns the amount given back.
 */
export async function refundAdvance(
  tx: Prisma.TransactionClient,
  user: AuthenticatedUser,
  input: { reference: string; label: string; customerId: string | null; paidAmount: number; shopId?: string | null },
): Promise<number> {
  const { khataPaid } = await recordMoney(tx, user.tenantId, input.reference, input.paidAmount);
  const refunded = await tx.customerLedger.aggregate({ where: { tenantId: user.tenantId, type: 'REFUND', reference: input.reference }, _sum: { amount: true } });
  const customer = input.customerId
    ? await tx.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true, balance: true } })
    : null;
  const held = customer ? Math.max(-Number(customer.balance), 0) : 0;
  const amount = r2(Math.min(khataPaid - (Number(refunded._sum.amount) || 0), held));
  if (!customer || !(amount > 0)) throw new BadRequestException('Is ka koi advance khata par baqi nahi — wapas karne ko kuch nahi');

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

/** Bill lines of a meat order carry this note. */
export const orderNote = (orderNumber: string) => `Order ${orderNumber}`;

/** The live bill of an order, found by its line note. */
export async function findOrderBill(db: Db, tenantId: string, orderNumber: string) {
  const line = await db.saleItem.findFirst({
    where: { note: orderNote(orderNumber), sale: { tenantId, status: { not: 'VOIDED' } } },
    orderBy: { sale: { soldAt: 'desc' } },
    select: { sale: { select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, soldAt: true, status: true } } },
  });
  return line?.sale ?? null;
}

/** Stops a write when the row changed since it was read. */
export function mustChange(count: number) {
  if (!count) throw new ConflictException('Ye record abhi kisi aur ne badla — safha taaza kar ke dobara koshish karein');
}
