/**
 * Period and SQL helpers for the staff report: business-day keys in the
 * tenant's timezone, the previous period of the same length, and the
 * shared SQL fragments (who sold a bill, branch filter, local time).
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';

export const DAY = 24 * 3600_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface StaffRange {
  tz: string;
  dayStartHour: number;
  /** null for "all time". */
  gte: Date | null;
  lt: Date;
  fromKey: string | null;
  toKey: string;
  prev: { gte: Date; lt: Date } | null;
  /** Month buckets when the span is longer than about three months. */
  monthly: boolean;
}

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const r2 = (v: number) => Math.round(v * 100) / 100;

export async function staffRange(tzs: TenantTimezoneService, tenantId: string, q: { from?: string; to?: string }): Promise<StaffRange> {
  const { tz, dayStartHour } = await tzs.clock(tenantId);
  const start = safeDayStart(dayStartHour);
  const today = businessDayKey(new Date(), tz, start);
  const fromKey = q.from === 'all' ? null : q.from && KEY.test(q.from) ? q.from : today;
  const toKey = q.to && KEY.test(q.to) ? q.to : today;
  if (fromKey && fromKey > toKey) throw new BadRequestException('Shuru ki tareekh aakhri tareekh ke baad hai');
  const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, start, 0, 0, tz); };
  const gte = fromKey ? at(fromKey) : null;
  const lt = new Date(at(toKey).getTime() + DAY);
  const span = gte ? lt.getTime() - gte.getTime() : 0;
  return {
    tz, dayStartHour: start, gte, lt, fromKey, toKey,
    prev: gte ? { gte: new Date(gte.getTime() - span), lt: gte } : null,
    monthly: !gte || span > 92 * DAY,
  };
}

/** Prisma date filter for a window. */
export const within = (r: { gte: Date | null; lt: Date }) => ({ ...(r.gte && { gte: r.gte }), lt: r.lt });

/** The person a bill counts for: the chosen salesperson, else whoever rang it up. */
export const WHO = Prisma.sql`COALESCE(s."soldById", s."createdById")`;

/**
 * The SALE_VOIDED log row of a bill (alias `v`): who cancelled it and when.
 * Bills voided before the log existed have none.
 */
export const VOID_LOG = Prisma.sql`LEFT JOIN LATERAL (
    SELECT a."userId", a."createdAt" FROM "ActivityLog" a
    WHERE a."tenantId" = s."tenantId" AND a.action = 'SALE_VOIDED' AND a."entityId" = s.id
    ORDER BY a."createdAt" DESC LIMIT 1
  ) v ON true`;

/** The person a void counts for: who cancelled it, else (older voids) the person the bill counts for. */
export const VOIDER = Prisma.sql`COALESCE(v."userId", ${WHO})`;

/** Bills of the tenant, branch and window (alias `s`); voided bills only when asked. */
export function saleWhere(tenantId: string, scope: ShopScope, w: { gte: Date | null; lt: Date }, voided = false) {
  return Prisma.sql`s."tenantId" = ${tenantId}
    AND s.status::text ${voided ? Prisma.sql`=` : Prisma.sql`<>`} 'VOIDED'
    ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
    ${w.gte ? Prisma.sql`AND s."soldAt" >= ${w.gte}` : Prisma.empty}
    AND s."soldAt" < ${w.lt}`;
}

/** Wall-clock time shifted so the business day starts at 00:00 (for day keys and weekdays). */
export const bizTime = (col: Prisma.Sql, r: StaffRange) =>
  Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${r.tz}) - make_interval(hours => ${r.dayStartHour}::int)`;

/** Wall-clock time without the shift, for hour-of-day charts. */
export const localTime = (col: Prisma.Sql, r: StaffRange) => Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${r.tz})`;

/** Every bucket key of the period so charts show quiet days. */
export function bucketKeys(r: StaffRange, firstKey?: string | null): string[] {
  const from = r.fromKey ?? firstKey ?? r.toKey;
  const keys: string[] = [];
  if (r.monthly) {
    let [y, m] = from.slice(0, 7).split('-').map(Number);
    const [ty, tm] = r.toKey.slice(0, 7).split('-').map(Number);
    while ((y < ty || (y === ty && m <= tm)) && keys.length < 240) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return keys;
  }
  const end = new Date(`${r.toKey}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end; t += DAY) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

/** A difference smaller than this counts as a matched drawer (coin rounding). */
export const TOLERANCE = 0.5;
