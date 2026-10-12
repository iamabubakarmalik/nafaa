/**
 * Period handling shared by the report centre: business-day keys in the
 * tenant's timezone, the matching previous period for comparison, and SQL
 * fragments for live sales and local-time bucketing.
 */

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';

export const DAY = 24 * 3600_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface ReportQuery { from?: string; to?: string }

export interface ReportRange {
  tz: string;
  dayStartHour: number;
  /** null for "all time". */
  gte: Date | null;
  lt: Date;
  fromKey: string | null;
  toKey: string;
  /** Same length of time just before; null for "all time". */
  prev: { gte: Date; lt: Date } | null;
  /** Buckets by month when the span is longer than about three months. */
  monthly: boolean;
}

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const r2 = (v: number) => Math.round(v * 100) / 100;

export async function reportRange(tzs: TenantTimezoneService, tenantId: string, q: ReportQuery): Promise<ReportRange> {
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

/** Prisma date filter for the period. */
export const within = (r: { gte: Date | null; lt: Date }) => ({ ...(r.gte && { gte: r.gte }), lt: r.lt });

/** Bills that count as sales: not voided. */
export const LIVE_SALE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;

/** WHERE for live sales of the tenant, branch and period (alias `s`). */
export function saleSql(tenantId: string, scope: ShopScope, r: { gte: Date | null; lt: Date }, statuses: readonly string[] = LIVE_SALE) {
  return Prisma.sql`s."tenantId" = ${tenantId}
    AND s.status::text IN (${Prisma.join([...statuses])})
    ${scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty}
    ${r.gte ? Prisma.sql`AND s."soldAt" >= ${r.gte}` : Prisma.empty}
    AND s."soldAt" < ${r.lt}`;
}

/** Local wall-clock time of a timestamp column, shifted so the business day starts at 00:00. */
export function bizTime(col: Prisma.Sql, r: ReportRange) {
  return Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${r.tz}) - make_interval(hours => ${r.dayStartHour}::int)`;
}

/** Local wall-clock time (no business-day shift), for hour-of-day charts. */
export function localTime(col: Prisma.Sql, r: ReportRange) {
  return Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${r.tz})`;
}

/** Every bucket key of the period (days, or months for long spans), so charts show gaps. */
export function bucketKeys(r: ReportRange, firstKey?: string | null): string[] {
  const from = r.fromKey ?? firstKey ?? r.toKey;
  if (r.monthly) {
    const keys: string[] = [];
    let [y, m] = from.slice(0, 7).split('-').map(Number);
    const [ty, tm] = r.toKey.slice(0, 7).split('-').map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
      if (keys.length > 240) break;
    }
    return keys;
  }
  const keys: string[] = [];
  const end = new Date(`${r.toKey}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end; t += DAY) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

export const canSeeCost = (user: AuthenticatedUser) => hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);

/** Percentage change against the previous period; null when there is nothing to compare. */
export const change = (now: number, before: number | null | undefined) =>
  before == null || Math.abs(before) < 0.005 ? null : r2(((now - before) / Math.abs(before)) * 100);
