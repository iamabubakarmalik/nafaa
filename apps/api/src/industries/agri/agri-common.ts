/**
 * Small helpers shared by this industry's services.
 *
 * Shop-day boundaries: the API server runs in UTC while shops run on
 * Pakistan time, so a bare `new Date('2026-10-13')` or `setHours(0)` puts
 * the day five hours off. Every day boundary here goes through the shared
 * business-time helper.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import {
  addDaysTz, dateKeyTz, endOfDayTz, startOfDayTz, tzParts, weekdayInTz, zonedToUtc,
} from '../../common/helpers/business-time.helper';
import { toPaymentMethod } from '../_shared/industry-sale.helper';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function parse(value?: string | Date | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (DAY_KEY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return zonedToUtc(y, m, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Start of the shop day that `value` falls on (today when empty). */
export function dayStart(value?: string | Date | null): Date {
  return startOfDayTz(parse(value) ?? new Date());
}

/** Last moment of the shop day that `value` falls on (today when empty). */
export function dayEnd(value?: string | Date | null): Date {
  return endOfDayTz(parse(value) ?? new Date());
}

/**
 * Prisma range for a `from`/`to` filter. A `yyyy-mm-dd` key covers the
 * whole shop day; a full timestamp is used as given.
 */
export function dayRange(from?: string | null, to?: string | null): { gte?: Date; lte?: Date } | undefined {
  const f = parse(from);
  const t = parse(to);
  if (!f && !t) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (f) range.gte = typeof from === 'string' && DAY_KEY.test(from) ? startOfDayTz(f) : f;
  if (t) range.lte = typeof to === 'string' && DAY_KEY.test(to) ? endOfDayTz(t) : t;
  return range;
}

/** First and last moment of a calendar month (1-12) on shop time. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = zonedToUtc(year, month, 1);
  const end = new Date(zonedToUtc(year, month + 1, 1).getTime() - 1);
  return { start, end };
}

/** Parse a date field from a request; a `yyyy-mm-dd` key means that shop day. */
export function parseDay(value?: string | Date | null): Date | null {
  return parse(value);
}

/** `yyyy-mm-dd` of the shop day a moment falls on (today when empty). */
export function dayKey(value?: string | Date | null): string {
  return dateKeyTz(parse(value) ?? new Date());
}

/** Whole days since 1970 on shop time; steady parity for "every other day". */
export function dayNumber(value?: string | Date | null): number {
  const [y, m, d] = dayKey(value).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export { addDaysTz, tzParts, weekdayInTz };

/** Fields a request body may never set: ownership and bookkeeping columns. */
const RESERVED = ['id', 'tenantId', 'createdAt', 'updatedAt', 'createdById'] as const;

/**
 * Copy of a loosely typed request body without ownership fields, so a
 * spread into Prisma `data` can never move a record to another tenant.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
export function cleanInput(dto: any): any {
  const out: Record<string, unknown> = { ...(dto ?? {}) };
  for (const key of RESERVED) delete out[key];
  return out;
}

/* ───────────────────────── khata ───────────────────────── */

type Db = Prisma.TransactionClient;

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Branch for a khata line: the one given, the user's own, else the main shop. */
export async function resolveShopId(db: Db, user: AuthenticatedUser, shopId?: string | null): Promise<string> {
  const wanted = shopId || user.shopId;
  if (wanted) {
    const shop = await db.shop.findFirst({ where: { id: wanted, tenantId: user.tenantId }, select: { id: true } });
    if (shop) return shop.id;
  }
  const main = await db.shop.findFirst({
    where: { tenantId: user.tenantId, isActive: true },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  });
  if (!main) throw new BadRequestException('Koi active shop nahi hai');
  return main.id;
}

/**
 * The customer whose khata an order's money lands on: the linked one, else
 * the farmer's, else a customer found by phone, else a new one by name.
 */
export async function ensureKhataCustomer(
  db: Db,
  user: AuthenticatedUser,
  input: { customerId?: string | null; farmerId?: string | null; name?: string | null; phone?: string | null; shopId?: string | null },
): Promise<string> {
  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    return c.id;
  }
  if (input.farmerId) {
    const f = await db.agriFarmer.findFirst({ where: { id: input.farmerId, tenantId: user.tenantId }, select: { customerId: true } });
    if (f?.customerId) return f.customerId;
  }
  const phone = input.phone?.trim();
  if (phone) {
    const byPhone = await db.customer.findFirst({ where: { tenantId: user.tenantId, phone, isActive: true }, select: { id: true } });
    if (byPhone) return byPhone.id;
  }
  const name = input.name?.trim();
  if (!name) throw new BadRequestException('Amount khate me likhne ke liye farmer ya customer ka naam zaroori hai');
  const created = await db.customer.create({
    data: { tenantId: user.tenantId, shopId: input.shopId ?? null, name, phone: phone || null },
    select: { id: true },
  });
  return created.id;
}

/**
 * Money received against an order, written on the customer's khata. The
 * day book and the drawer count read khata collections, so the cash is
 * seen the day it comes in; the bill made later uses it up.
 */
export async function khataPayment(
  db: Db,
  user: AuthenticatedUser,
  input: { customerId: string; shopId: string; amount: number; reference: string; note: string; method?: string | null },
) {
  const amount = r2(input.amount);
  if (amount <= 0) throw new BadRequestException('Amount sahi likhein');
  const { balance } = await db.customer.update({
    where: { id: input.customerId },
    data: { balance: { decrement: amount } },
    select: { balance: true },
  });
  return db.customerLedger.create({
    data: {
      tenantId: user.tenantId,
      shopId: input.shopId,
      customerId: input.customerId,
      createdById: user.id,
      type: 'PAYMENT_RECEIVED',
      amount: -amount,
      balanceAfter: balance,
      reference: input.reference,
      note: input.note,
      paymentMethod: toPaymentMethod(input.method),
    },
  });
}
