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

/* ───────────────────────── cash drawer ───────────────────────── */

type Db = Prisma.TransactionClient;

/** True when a payment method means notes in the drawer (blank counts as cash). */
export function isCashMethod(method?: string | null): boolean {
  const m = String(method ?? '').trim().toUpperCase();
  return m === '' || m === 'CASH';
}

/**
 * Cash taken or paid out on this industry's own screens (khata collections,
 * farmer payments) goes through the open drawer as a cash-in / cash-out
 * entry, so the closing count and the day book include it. Card and bank
 * payments, and shops with no open drawer, are left alone.
 *
 * Returns the register used, or null when nothing was posted.
 */
export async function drawerCash(
  db: Db,
  user: AuthenticatedUser,
  input: { direction: 'IN' | 'OUT'; amount: number; method?: string | null; reason: string; reference?: string | null; shopId?: string | null },
): Promise<string | null> {
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (amount <= 0 || !isCashMethod(input.method)) return null;

  const wanted = input.shopId || user.shopId || null;
  let register = wanted
    ? await db.cashRegister.findFirst({ where: { tenantId: user.tenantId, shopId: wanted, status: 'OPEN' }, select: { id: true } })
    : null;
  if (!register) {
    // No branch given: use the drawer this person opened, else the only open one.
    const open = await db.cashRegister.findMany({
      where: { tenantId: user.tenantId, status: 'OPEN' },
      select: { id: true, openedById: true },
      take: 20,
    });
    register = open.find((r) => r.openedById === user.id) ?? (open.length === 1 ? open[0] : null);
  }
  if (!register) return null;

  const isIn = input.direction === 'IN';
  await db.cashRegister.update({
    where: { id: register.id },
    data: isIn
      ? { expectedBalance: { increment: amount }, totalCashIn: { increment: amount } }
      : { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } },
  });
  await db.cashTransaction.create({
    data: {
      tenantId: user.tenantId,
      cashRegisterId: register.id,
      createdById: user.id,
      type: isIn ? 'CASH_IN' : 'CASH_OUT',
      amount,
      reason: input.reason.slice(0, 200),
      reference: input.reference ?? null,
    },
  });
  return register.id;
}

/* ───────────────────────── money and khata ───────────────────────── */

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Product types that are plain milk; the default product for deliveries and collections. */
export const MILK_TYPES = ['FRESH_MILK', 'BUFFALO_MILK', 'COW_MILK', 'MIXED_MILK', 'RAW_MILK', 'BOILED_MILK'] as const;

/**
 * The catalog product a delivery or a milk collection moves: the one asked
 * for (checked against the tenant), else the shop's main milk product (its
 * dairy profile marked featured, then by display order). Null when the shop
 * has no milk product yet.
 */
export async function milkProduct(db: Db, tenantId: string, productId?: string | null) {
  const select = { id: true, name: true, unit: true, price: true, costPrice: true, hasVariants: true } as const;
  if (productId) {
    const p = await db.product.findFirst({ where: { id: productId, tenantId, isActive: true }, select });
    if (p) return p;
  }
  const profile = await db.dairyProduct.findFirst({
    where: { tenantId, productType: { in: [...MILK_TYPES] } },
    orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
    select: { productId: true },
  });
  if (!profile) return null;
  return db.product.findFirst({ where: { id: profile.productId, tenantId, isActive: true }, select });
}

/**
 * Makes sure a delivery customer has a customer khata (the shared one that
 * Khata, day book and reports read). A customer with the same phone is used,
 * else a new one is opened. On the first link, whatever the dairy record
 * still showed as owed (or paid ahead) is carried over once as the khata's
 * opening balance, so nothing owed before this change is lost.
 */
export async function linkKhata(db: Db, user: AuthenticatedUser, dairyCustomerId: string, shopId: string): Promise<string> {
  const c = await db.dairyCustomer.findFirst({ where: { id: dairyCustomerId, tenantId: user.tenantId } });
  if (!c) throw new NotFoundException('Customer nahi mila');
  if (c.customerId) {
    const ok = await db.customer.findFirst({ where: { id: c.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (ok) return ok.id;
  }
  const phone = c.phone?.trim() || null;
  const existing = phone ? await db.customer.findFirst({ where: { tenantId: user.tenantId, phone }, select: { id: true } }) : null;
  const customerId = existing?.id ?? (await db.customer.create({
    data: { tenantId: user.tenantId, shopId, name: c.name, phone, address: c.address ?? null },
    select: { id: true },
  })).id;
  // Another dairy record may already hold this customer (unique link); then leave it unlinked by phone.
  const taken = await db.dairyCustomer.findFirst({ where: { customerId, id: { not: c.id } }, select: { id: true } });
  if (taken) {
    const own = await db.customer.create({ data: { tenantId: user.tenantId, shopId, name: c.name, phone: null, address: c.address ?? null }, select: { id: true } });
    return finishLink(db, user, c, own.id, shopId);
  }
  return finishLink(db, user, c, customerId, shopId);
}

async function finishLink(
  db: Db, user: AuthenticatedUser,
  c: { id: string; currentBalance: number; customerNumber: string }, customerId: string, shopId: string,
): Promise<string> {
  await db.dairyCustomer.update({ where: { id: c.id }, data: { customerId } });
  const carry = r2(c.currentBalance);
  if (Math.abs(carry) > 0.009) {
    const { balance } = await db.customer.update({ where: { id: customerId }, data: { balance: { increment: carry } }, select: { balance: true } });
    await db.customerLedger.create({
      data: {
        tenantId: user.tenantId, shopId, customerId, createdById: user.id,
        type: 'OPENING_BALANCE', amount: carry, balanceAfter: balance, reference: c.customerNumber,
        note: carry > 0 ? `Doodh delivery ka purana baqi (${c.customerNumber})` : `Doodh delivery ka purana advance (${c.customerNumber})`,
      },
    });
  }
  return customerId;
}

/** Live khata balance per linked customer id. */
export async function khataBalances(db: Db, tenantId: string, customerIds: Array<string | null | undefined>) {
  const ids = [...new Set(customerIds.filter((x): x is string => !!x))];
  if (!ids.length) return new Map<string, number>();
  const rows = await db.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, balance: true } });
  return new Map(rows.map((r) => [r.id, r2(Number(r.balance) || 0)]));
}

/** A dairy customer with its balance read from the khata when linked. */
export function withLiveBalance<T extends { customerId: string | null; currentBalance: number }>(row: T, live: Map<string, number>): T & { khataLinked: boolean } {
  const linked = !!row.customerId && live.has(row.customerId);
  return { ...row, currentBalance: linked ? live.get(row.customerId!)! : row.currentBalance, khataLinked: linked };
}

/**
 * Creates a row with the next free `PREFIX-0001` style number; a clash on the
 * unique index (two saves at once) retries with the next one.
 */
export async function nextNumbered<T>(count: () => Promise<number>, prefix: string, pad: number, create: (n: string) => Promise<T>): Promise<T> {
  const base = await count();
  for (let i = 1; i <= 6; i++) {
    try {
      return await create(`${prefix}${String(base + i).padStart(pad, '0')}`);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new BadRequestException('Number nahi bana — dobara koshish karein');
}

/** Shop-time year of now. */
export const shopYear = () => tzParts(new Date()).year;

/**
 * Brings a customer's monthly bills in line with the khata. Payments are
 * taken anywhere (this screen, the Khata page, the counter), so what each
 * bill still shows as due is worked out from the live balance: the oldest
 * bills count as paid first, and what is owed sits on the newest bills.
 * Deliveries after the last bill are owed but not billed yet.
 */
export async function settleBills(db: Db, tenantId: string, dairyCustomerId: string) {
  const c = await db.dairyCustomer.findFirst({ where: { id: dairyCustomerId, tenantId }, select: { customerId: true, currentBalance: true } });
  if (!c) return;
  const bills = await db.dairyMonthlyBill.findMany({
    where: { tenantId, dairyCustomerId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: { id: true, totalAmount: true, discount: true, paidAmount: true, remainingAmount: true, isPaid: true, cycleEndDate: true },
  });
  if (!bills.length) return;
  const live = c.customerId ? (await khataBalances(db, tenantId, [c.customerId])).get(c.customerId) : undefined;
  const balance = live ?? c.currentBalance;
  const unbilled = await db.dairyDelivery.aggregate({
    where: { tenantId, dairyCustomerId, status: 'DELIVERED', deliveryDate: { gt: bills[0].cycleEndDate } },
    _sum: { totalAmount: true },
  });
  let owed = r2(Math.max(balance - (unbilled._sum.totalAmount ?? 0), 0));
  for (const b of bills) {
    const due = r2(Math.max(b.totalAmount - b.discount, 0));
    const remaining = r2(Math.min(due, owed));
    owed = r2(owed - remaining);
    const paid = remaining <= 0.009;
    if (Math.abs(remaining - b.remainingAmount) > 0.009 || paid !== b.isPaid) {
      await db.dairyMonthlyBill.update({
        where: { id: b.id },
        data: { remainingAmount: remaining, paidAmount: r2(due - remaining), isPaid: paid, paidAt: paid ? (b.isPaid ? undefined : new Date()) : null },
      });
    }
  }
}
