/**
 * Period and SQL helpers for the customers report: business-day ranges in
 * the tenant's timezone, the previous period of the same length, the live
 * sales filter and local-time bucketing.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';

export const DAY = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Bills that count as sales: everything except voided. */
export const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;

export interface Period {
  tz: string;
  dayStartHour: number;
  /** null for all time. */
  gte: Date | null;
  lt: Date;
  fromKey: string | null;
  toKey: string;
  prev: { gte: Date; lt: Date } | null;
  /** Month buckets for spans longer than about three months. */
  monthly: boolean;
}

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const r2 = (v: number) => Math.round(v * 100) / 100;

export async function periodOf(tzs: TenantTimezoneService, tenantId: string, from?: string, to?: string): Promise<Period> {
  const { tz, dayStartHour } = await tzs.clock(tenantId);
  const start = safeDayStart(dayStartHour);
  const today = businessDayKey(new Date(), tz, start);
  const fromKey = from === 'all' ? null : from && KEY.test(from) ? from : today;
  const toKey = to && KEY.test(to) ? to : today;
  if (fromKey && fromKey > toKey) throw new BadRequestException('Shuru ki tareekh aakhri tareekh ke baad hai');
  const gte = fromKey ? dayStart(fromKey, tz, start) : null;
  const lt = new Date(dayStart(toKey, tz, start).getTime() + DAY);
  const span = gte ? lt.getTime() - gte.getTime() : 0;
  return {
    tz, dayStartHour: start, gte, lt, fromKey, toKey,
    prev: gte ? { gte: new Date(gte.getTime() - span), lt: gte } : null,
    monthly: !gte || span > 92 * DAY,
  };
}

function dayStart(key: string, tz: string, startHour: number) {
  const [y, m, d] = key.split('-').map(Number);
  return zonedToUtc(y, m, d, startHour, 0, 0, tz);
}

/** WHERE for live sales of the tenant and branch (alias `s`), optionally inside a window. */
export function liveSql(tenantId: string, scope: ShopScope, w?: { gte: Date | null; lt: Date }) {
  return Prisma.sql`s."tenantId" = ${tenantId}
    AND s.status::text IN (${Prisma.join([...LIVE])})
    ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
    ${w?.gte ? Prisma.sql`AND s."soldAt" >= ${w.gte}` : Prisma.empty}
    ${w ? Prisma.sql`AND s."soldAt" < ${w.lt}` : Prisma.empty}`;
}

/** Local wall-clock time shifted so the business day starts at 00:00. */
export function bizTime(col: Prisma.Sql, p: Pick<Period, 'tz' | 'dayStartHour'>) {
  return Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${p.tz}) - make_interval(hours => ${p.dayStartHour}::int)`;
}

/** Bucket key of a timestamp column: YYYY-MM-DD, or YYYY-MM for long periods. */
export function bucketSql(col: Prisma.Sql, p: Period) {
  return Prisma.sql`to_char(${bizTime(col, p)}, ${p.monthly ? 'YYYY-MM' : 'YYYY-MM-DD'})`;
}

/** Every bucket key of the period so charts show empty days too. */
export function bucketKeys(p: Period, firstKey?: string | null): string[] {
  const from = p.fromKey ?? firstKey ?? p.toKey;
  const keys: string[] = [];
  if (p.monthly) {
    let [y, m] = from.slice(0, 7).split('-').map(Number);
    const [ty, tm] = p.toKey.slice(0, 7).split('-').map(Number);
    while ((y < ty || (y === ty && m <= tm)) && keys.length < 240) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return keys;
  }
  const end = new Date(`${p.toKey}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end; t += DAY) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}


/**
 * Narrows the owner's all-branches view to one branch of the same tenant.
 * A user already on a branch keeps it; the request cannot widen or move it.
 */
export async function narrowScope(prisma: PrismaService, tenantId: string, scope: ShopScope, branch?: string): Promise<ShopScope> {
  if (!branch || !scope.isAll) return scope;
  const shop = await prisma.shop.findFirst({ where: { id: branch, tenantId }, select: { id: true } });
  if (!shop) throw new NotFoundException('Branch nahi mili');
  return new ShopScope(shop.id, false);
}
