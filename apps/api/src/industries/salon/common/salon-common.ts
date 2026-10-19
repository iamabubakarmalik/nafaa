/**
 * Shared helpers for the salon API: the shop's calendar day (appointment
 * times are wall-clock times in the shop's time zone, the server runs in
 * UTC), paging, numbers that survive two saves at once, the service
 * product each salon service is billed against, where an appointment came
 * from, and permission checks for routes no shared rule covers yet.
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, type SalonAppointmentSource, type SalonService } from '@prisma/client';
import { hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { dateKeyTz, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';

type Db = Prisma.TransactionClient;

export const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Optional text from a form: blank becomes undefined. */
export const opt = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export interface DayRange { gte: Date; lt: Date }

/** The shop's calendar: today, `yyyy-mm-dd` ranges and day keys in its own time zone. */
export async function salonClock(tz: TenantTimezoneService, tenantId: string) {
  const zone = await tz.resolve(tenantId);
  const dayStart = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, 0, 0, 0, zone);
  };
  const keyOf = (d: Date) => dateKeyTz(d, zone);
  const today = (now = new Date()): DayRange => {
    const gte = dayStart(keyOf(now));
    return { gte, lt: dayStart(keyOf(new Date(gte.getTime() + DAY_MS + 3_600_000))) };
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
  const hour = (d: Date) => tzParts(d, zone).hour;
  const weekday = (d: Date) => new Date(`${keyOf(d)}T00:00:00Z`).getUTCDay();
  const year = () => tzParts(new Date(), zone).year;
  return { zone, today, range, keyOf, hour, weekday, year };
}

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
): Promise<T> {
  const latest = await last(prefix);
  const base = Number(String(latest ?? '').slice(prefix.length)) || 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = `${prefix}${String(base + 1 + attempt).padStart(4, '0')}`;
    try {
      return await create(number);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new BadRequestException('Number nahi bana — dobara koshish karein');
}

/** SKU of the product a salon service is billed against (the link before `productId`). */
export const serviceSku = (serviceId: string) => `SALON-SVC-${serviceId}`;
export const SERVICE_PRODUCT_TYPE = 'SERVICE';

const PRODUCT_FIELDS = { id: true, name: true, price: true, costPrice: true, isActive: true, unit: true } as const;

/**
 * The service product behind a salon service: a product with unit
 * "service" (no stock) that carries the bill line, so receipts, returns
 * and every sales report see the service by name. Found by the service's
 * `productId`; a service saved before that link existed is found by its
 * SKU and linked now. Created on first need and kept in step with the
 * service's name, price and cost.
 */
export async function ensureServiceProduct(
  db: Db,
  tenantId: string,
  svc: Pick<SalonService, 'id' | 'name' | 'price' | 'discountPrice' | 'costPrice' | 'isActive' | 'productId'>,
): Promise<string> {
  const sku = serviceSku(svc.id);
  const data = {
    name: svc.name,
    price: r2(svc.discountPrice ?? svc.price),
    costPrice: r2(svc.costPrice ?? 0),
    unit: 'service',
    productType: SERVICE_PRODUCT_TYPE,
  };
  const found = (svc.productId ? await db.product.findFirst({ where: { id: svc.productId, tenantId }, select: PRODUCT_FIELDS }) : null)
    ?? await db.product.findFirst({ where: { tenantId, sku }, select: PRODUCT_FIELDS });
  if (!found) {
    const created = await db.product.create({
      data: { tenantId, sku, ...data, stock: 0, lowStockAlert: 0, isActive: svc.isActive, description: 'Salon service — Services page se badlein' },
      select: { id: true },
    });
    await db.salonService.update({ where: { id: svc.id }, data: { productId: created.id } });
    return created.id;
  }
  if (svc.productId !== found.id) await db.salonService.update({ where: { id: svc.id }, data: { productId: found.id } });
  if (found.name !== data.name || found.price !== data.price || found.costPrice !== data.costPrice || found.unit !== 'service' || found.isActive !== svc.isActive) {
    await db.product.update({ where: { id: found.id }, data: { ...data, isActive: svc.isActive } });
  }
  return found.id;
}

/**
 * Fills `productId` on services saved before the link existed, from the
 * SKU product, and saves the link. Never creates a product.
 */
export async function linkServiceProducts<T extends { id: string; productId: string | null }>(db: Db, tenantId: string, rows: T[]): Promise<T[]> {
  const missing = rows.filter((r) => !r.productId);
  if (!missing.length) return rows;
  const products = await db.product.findMany({
    where: { tenantId, sku: { in: missing.map((r) => serviceSku(r.id)) } },
    select: { id: true, sku: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p.id]));
  for (const r of missing) {
    const productId = bySku.get(serviceSku(r.id));
    if (!productId) continue;
    await db.salonService.updateMany({ where: { id: r.id, tenantId, productId: null }, data: { productId } });
    r.productId = productId;
  }
  return rows;
}

/** Service id → its service product id, for services that have one. */
export async function serviceProductIds(db: Db, tenantId: string, serviceIds: string[]): Promise<Map<string, string>> {
  if (!serviceIds.length) return new Map();
  const rows = await db.salonService.findMany({ where: { tenantId, id: { in: serviceIds } }, select: { id: true, productId: true } });
  await linkServiceProducts(db, tenantId, rows);
  return new Map(rows.filter((r) => r.productId).map((r) => [r.id, r.productId!]));
}

/* ─── Where an appointment came from ─── */

/**
 * Before `source` existed every row was saved as BOOKED and a walk-in was
 * marked by the start of its internal note; counter bills wrote
 * "Walk-in — counter bill". Those rows are read by their note.
 */
const WALK_IN_NOTE = 'Walk-in';
const COUNTER_NOTE = 'Walk-in — counter bill';

export function sourceOf(a: { source: SalonAppointmentSource; internalNotes?: string | null }): SalonAppointmentSource {
  if (a.source !== 'BOOKED') return a.source;
  const note = a.internalNotes ?? '';
  if (note.startsWith(COUNTER_NOTE)) return 'COUNTER';
  if (note.startsWith(WALK_IN_NOTE)) return 'WALK_IN';
  return 'BOOKED';
}

/** The same rule as `sourceOf`, as a database filter. */
export function sourceWhere(source: SalonAppointmentSource): Prisma.SalonAppointmentWhereInput {
  if (source === 'COUNTER') return { OR: [{ source: 'COUNTER' }, { source: 'BOOKED', internalNotes: { startsWith: COUNTER_NOTE } }] };
  if (source === 'WALK_IN') {
    return {
      OR: [
        { source: 'WALK_IN' },
        { source: 'BOOKED', internalNotes: { startsWith: WALK_IN_NOTE }, NOT: { internalNotes: { startsWith: COUNTER_NOTE } } },
      ],
    };
  }
  return { source: 'BOOKED', OR: [{ internalNotes: null }, { NOT: { internalNotes: { startsWith: WALK_IN_NOTE } } }] };
}

/** Rows as the screens read them: old rows carry the source their note implies. */
export function withSource<T extends { source: SalonAppointmentSource; internalNotes?: string | null }>(a: T): T {
  const source = sourceOf(a);
  return source === a.source ? a : { ...a, source };
}

/** Refuses the request unless the person holds one of the permissions. */
export function assertCan(user: AuthenticatedUser, perms: PermissionKey[], action: string) {
  if (!perms.some((p) => hasPermission(user.role, user.permissions, p))) {
    throw new ForbiddenException(`${action} ki permission nahi (${perms.join(' / ')})`);
  }
}
