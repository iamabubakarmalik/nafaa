/**
 * Shared helpers for the garments API: the shop's business day (Pakistan
 * time, not the server's UTC), paging, document numbers that survive two
 * saves at once, product/variant checks and finding the bill of a record.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, startOfBusinessDayTz, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

type Db = Prisma.TransactionClient;

export const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export interface DayRange { gte: Date; lt: Date }

/** The shop's clock: today, day keys and `yyyy-mm-dd` ranges in its own timezone. */
export async function garmentClock(tz: TenantTimezoneService, tenantId: string) {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const start = safeDayStart(dayStartHour);
  const dayStart = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, start, 0, 0, zone);
  };
  const today = (now = new Date()): DayRange => {
    const gte = startOfBusinessDayTz(now, zone, start);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  };
  const range = (from?: string, to?: string): DayRange | undefined => {
    const f = from && KEY.test(from) ? from : undefined;
    const t = to && KEY.test(to) ? to : undefined;
    if (!f && !t) return undefined;
    return {
      gte: f ? dayStart(f) : new Date(0),
      lt: t ? new Date(dayStart(t).getTime() + DAY_MS) : new Date(Date.now() + 3650 * DAY_MS),
    };
  };
  const keyOf = (d: Date) => businessDayKey(d, zone, start);
  const year = () => tzParts(new Date(), zone).year;
  return { zone, today, range, keyOf, year, dayStart };
}

export type GarmentClock = Awaited<ReturnType<typeof garmentClock>>;

/** Page and limit from a query, kept within sane bounds. */
export function paging(q: { page?: string | number; limit?: string | number }, max = 100) {
  const limit = Math.min(Math.max(Number(q.limit) || 30, 1), max);
  const page = Math.max(Math.floor(Number(q.page) || 1), 1);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Creates a row with the next free `PREFIX-0001` number. Two saves at the
 * same moment read the same last number; the unique index rejects the
 * second, which then retries with the next one.
 */
export async function withNextNumber<T>(
  last: (prefix: string) => Promise<string | null | undefined>,
  prefix: string,
  create: (number: string) => Promise<T>,
  pad = 4,
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

/** Optional text from a form: blank becomes undefined. */
export const opt = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** A product (and variant) of this shop, active or not; throws when it is someone else's. */
export async function ownProduct(db: Db, user: AuthenticatedUser, productId: string, variantId?: string | null) {
  const product = await db.product.findFirst({
    where: { id: productId, tenantId: user.tenantId },
    select: { id: true, name: true, price: true, costPrice: true, unit: true, hasVariants: true, isActive: true },
  });
  if (!product) throw new NotFoundException('Product nahi mila');
  let variant: { id: string; name: string; price: number | null; costPrice: number } | null = null;
  if (variantId) {
    variant = await db.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, name: true, price: true, costPrice: true },
    });
    if (!variant) throw new BadRequestException('Ye size/rang is product ka nahi');
  }
  return { product, variant };
}

/** A customer of this shop; throws for another shop's id. */
export async function ownCustomer(db: Db, user: AuthenticatedUser, customerId?: string | null) {
  if (!customerId) return null;
  const c = await db.customer.findFirst({
    where: { id: customerId, tenantId: user.tenantId },
    select: { id: true, name: true, phone: true },
  });
  if (!c) throw new NotFoundException('Customer nahi mila');
  return c;
}

/** The bill made for an industry record (tailoring order, ticket, plan), voided bills left out. */
export function findBill(db: Db, tenantId: string, ref: string) {
  return db.sale.findFirst({
    where: { tenantId, OR: [{ sourceRef: ref }, { saleNumber: ref }], status: { not: 'VOIDED' } },
    select: { id: true, saleNumber: true, total: true, paidAmount: true, creditAmount: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

/** Payment status from what is paid against the total. */
export const payStatus = (paid: number, total: number) =>
  (paid >= total - 0.01 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID') as 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

/** Maps unique-index errors to a readable message. */
export function duplicateName(e: unknown, message: string): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException(message);
  throw e;
}

/** Names of tailors (staff records or logins) by id, for lists and slips. */
export async function personNames(db: Db, tenantId: string, ids: Array<string | null | undefined>) {
  const wanted = [...new Set(ids.filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (!wanted.length) return names;
  const [staff, users] = await Promise.all([
    db.staff.findMany({ where: { tenantId, id: { in: wanted } }, select: { id: true, fullName: true } }),
    db.user.findMany({ where: { tenantId, id: { in: wanted } }, select: { id: true, fullName: true } }),
  ]);
  for (const s of staff) names.set(s.id, s.fullName);
  for (const u of users) names.set(u.id, u.fullName);
  return names;
}

/** A `yyyy-mm-dd` key is the start of that business day; anything else must be a valid date. */
export function parseDay(clock: GarmentClock, v?: string | null): Date | null {
  if (!v) return null;
  if (KEY.test(v)) return clock.dayStart(v);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi nahi');
  return d;
}
