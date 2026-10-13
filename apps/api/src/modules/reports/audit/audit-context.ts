/**
 * Request context for the audit report: the business-day period in the
 * tenant's timezone, the branch and staff it covers, shop hours and the
 * limits that decide when an event counts as unusual.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { businessDayKey, safeDayStart, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import type { AuditFilterDto, AuditType, Severity } from './dto/audit.dto';

export const DAY = 24 * 3600_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface Window { gte: Date | null; lt: Date }

export interface AuditContext extends Window {
  tenantId: string;
  tz: string;
  dayStartHour: number;
  fromKey: string | null;
  toKey: string;
  /** Same length of time just before; null for all time. */
  prev: { gte: Date; lt: Date } | null;
  /** Buckets by month when the span is longer than about three months. */
  monthly: boolean;
  shopId: string | null;
  staffId: string | null;
  /** Users of the branch, for logs that carry no branch; null = everyone. */
  branchUsers: string[] | null;
  showCost: boolean;
  /**
   * The owner's account (OWNER / SUPER_ADMIN users) when the viewer is not
   * the owner: their logins, devices, PIN and settings changes are left out.
   * Other events by the owner (a void, a refund) still show. null for the owner.
   */
  privateUsers: string[] | null;
  discountPct: number;
  big: number;
  /** Shop hours in minutes after midnight, local time. */
  open: number;
  close: number;
  /** Highest hand discount the counter allows without the owner's PIN. */
  maxDiscountPct: number;
}

export interface AuditEvent {
  id: string;
  type: AuditType;
  at: Date;
  userId: string | null;
  shopId: string | null;
  title: string;
  detail: string | null;
  /** Money at sale value. */
  amount: number;
  /** Loss at cost; removed from the response for users without cost access. */
  cost?: number;
  flags: string[];
  severity: Severity;
  afterHours: boolean;
  ref: { kind: string; id: string | null; code: string | null };
}

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const within = (w: Window) => ({ ...(w.gte && { gte: w.gte }), lt: w.lt });

const minutes = (hhmm: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : null;
};

export async function auditContext(
  prisma: PrismaService,
  tzs: TenantTimezoneService,
  user: AuthenticatedUser,
  scope: ShopScope,
  q: AuditFilterDto,
): Promise<AuditContext> {
  const tenantId = user.tenantId;
  const [{ tz, dayStartHour }, settings] = await Promise.all([
    tzs.clock(tenantId),
    prisma.tenantSettings.findUnique({ where: { tenantId }, select: { openTime: true, closeTime: true, maxDiscountPercent: true } }),
  ]);
  const start = safeDayStart(dayStartHour);
  const today = businessDayKey(new Date(), tz, start);
  const fromKey = q.from === 'all' ? null : q.from && KEY.test(q.from) ? q.from : today;
  const toKey = q.to && KEY.test(q.to) ? q.to : today;
  if (fromKey && fromKey > toKey) throw new BadRequestException('Shuru ki date aakhri date ke baad hai');
  const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, start, 0, 0, tz); };
  const gte = fromKey ? at(fromKey) : null;
  const lt = new Date(at(toKey).getTime() + DAY);
  const span = gte ? lt.getTime() - gte.getTime() : 0;

  // Staff are locked to their branch by the scope; owners on "all" may pick one here.
  let shopId = scope.shopId;
  if (!shopId && q.branch) {
    const shop = await prisma.shop.findFirst({ where: { id: q.branch, tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    shopId = shop.id;
  }
  const viewerIsOwner = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
  const owners = viewerIsOwner
    ? null
    : await prisma.user.findMany({ where: { tenantId, role: { in: ['OWNER', 'SUPER_ADMIN'] } }, select: { id: true } });
  const branchUsers = shopId
    ? (await prisma.user.findMany({ where: { tenantId, shopId }, select: { id: true } })).map((u) => u.id)
    : null;

  const open = minutes(q.open) ?? minutes(settings?.openTime) ?? 7 * 60;
  const close = minutes(q.close) ?? minutes(settings?.closeTime) ?? 23 * 60;

  return {
    tenantId, tz, dayStartHour: start, gte, lt, fromKey, toKey,
    prev: gte ? { gte: new Date(gte.getTime() - span), lt: gte } : null,
    monthly: !gte || span > 92 * DAY,
    shopId,
    staffId: q.staffId || null,
    branchUsers,
    showCost: hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW),
    privateUsers: owners ? owners.map((o) => o.id) : null,
    discountPct: q.discountPct ?? 10,
    big: q.big ?? 5000,
    open, close,
    maxDiscountPct: num(settings?.maxDiscountPercent) || 100,
  };
}

/** Same context over another window (the previous period). */
export const shifted = (c: AuditContext, w: { gte: Date; lt: Date }): AuditContext => ({ ...c, gte: w.gte, lt: w.lt, prev: null });

/** True when the moment falls outside shop hours (local time). */
export function isAfterHours(c: AuditContext, date: Date): boolean {
  if (c.open === c.close) return false;
  const p = tzParts(date, c.tz);
  const m = p.hour * 60 + p.minute;
  return c.open < c.close ? m < c.open || m >= c.close : m >= c.close && m < c.open;
}

/** Local hour (0–23) of a moment. */
export const localHour = (c: AuditContext, date: Date) => tzParts(date, c.tz).hour;

/** Trend bucket of a moment: business day, or month for long spans. */
export function bucketOf(c: AuditContext, date: Date): string {
  const key = businessDayKey(date, c.tz, c.dayStartHour);
  return c.monthly ? key.slice(0, 7) : key;
}

/** Every bucket of the period, so charts show quiet days too. */
export function bucketKeys(c: AuditContext, firstKey: string | null): string[] {
  const from = c.fromKey ?? firstKey ?? c.toKey;
  const keys: string[] = [];
  if (c.monthly) {
    let [y, m] = from.slice(0, 7).split('-').map(Number);
    const [ty, tm] = c.toKey.slice(0, 7).split('-').map(Number);
    while ((y < ty || (y === ty && m <= tm)) && keys.length < 240) {
      keys.push(`${y}-${String(m).padStart(2, '0')}`);
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return keys;
  }
  const end = new Date(`${c.toKey}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end && keys.length < 400; t += DAY) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

export const hoursText = (c: AuditContext) => {
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return `${f(c.open)}–${f(c.close)}`;
};
