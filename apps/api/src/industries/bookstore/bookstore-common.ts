/**
 * Small helpers shared by this industry's services.
 *
 * Shop-day boundaries: the API server runs in UTC while shops run on
 * Pakistan time, so a bare `new Date('2026-10-13')` or `setHours(0)` puts
 * the day five hours off. Every day boundary here goes through the shared
 * business-time helper.
 */
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
 * Cash taken or paid out on this industry's own screens (rental deposits)
 * goes through the open drawer as a cash-in / cash-out
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
