/**
 * Shared helpers for the salon API: the shop's calendar day (appointment
 * times are wall-clock times in the shop's time zone, the server runs in
 * UTC), paging, numbers that survive two saves at once, and the service
 * product each salon service is billed against.
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma, type SalonService } from '@prisma/client';
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

/** SKU of the product a salon service is billed against. */
export const serviceSku = (serviceId: string) => `SALON-SVC-${serviceId}`;
export const SERVICE_PRODUCT_TYPE = 'SERVICE';

/**
 * The service product behind a salon service: a product with unit
 * "service" (no stock) that carries the bill line, so receipts, returns
 * and every sales report see the service by name. Created on first need
 * and kept in step with the service's name, price and cost.
 */
export async function ensureServiceProduct(
  db: Db,
  tenantId: string,
  svc: Pick<SalonService, 'id' | 'name' | 'price' | 'discountPrice' | 'costPrice' | 'isActive'>,
): Promise<string> {
  const sku = serviceSku(svc.id);
  const data = {
    name: svc.name,
    price: r2(svc.discountPrice ?? svc.price),
    costPrice: r2(svc.costPrice ?? 0),
    unit: 'service',
    productType: SERVICE_PRODUCT_TYPE,
  };
  const found = await db.product.findFirst({ where: { tenantId, sku }, select: { id: true, name: true, price: true, costPrice: true, isActive: true, unit: true } });
  if (!found) {
    const created = await db.product.create({
      data: { tenantId, sku, ...data, stock: 0, lowStockAlert: 0, isActive: svc.isActive, description: 'Salon service — Services page se badlein' },
      select: { id: true },
    });
    return created.id;
  }
  if (found.name !== data.name || found.price !== data.price || found.costPrice !== data.costPrice || found.unit !== 'service' || found.isActive !== svc.isActive) {
    await db.product.update({ where: { id: found.id }, data: { ...data, isActive: svc.isActive } });
  }
  return found.id;
}
