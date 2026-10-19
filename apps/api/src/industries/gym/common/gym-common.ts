/**
 * Shared helpers for the gym API: money rounding, the shop's calendar day
 * (the server runs in UTC, shops in their own zone), numbering that
 * survives two saves at once, paging, and permission checks for actions
 * that accept more than one right.
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, dateKeyTz, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

type Db = Prisma.TransactionClient;

export const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Optional text from a form: blank becomes undefined. */
export const opt = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Throws unless the user holds at least one of the rights. */
export function assertCan(user: AuthenticatedUser, perms: PermissionKey[], action: string) {
  if (!perms.some((p) => hasPermission(user.role, user.permissions, p))) {
    throw new ForbiddenException(`${action} ki permission nahi (${perms.join(' / ')})`);
  }
}

export function can(user: AuthenticatedUser, perm: PermissionKey) {
  return hasPermission(user.role, user.permissions, perm);
}

export interface DayRange { gte: Date; lt: Date }

/** The shop's calendar: calendar days for membership dates, business days for money and visits. */
export async function gymClock(tz: TenantTimezoneService, tenantId: string) {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const midnight = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, 0, 0, 0, zone);
  };
  const businessStart = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, dayStartHour, 0, 0, zone);
  };
  const todayKey = (now = new Date()) => businessDayKey(now, zone, dayStartHour);
  /** Business-day range from `yyyy-mm-dd` keys (as the web's period picker sends). */
  const range = (from?: string, to?: string): DayRange | undefined => {
    const f = from && KEY.test(from) ? from : undefined;
    const t = to && KEY.test(to) ? to : undefined;
    if (!f && !t) return undefined;
    return {
      gte: f ? businessStart(f) : new Date(0),
      lt: t ? new Date(businessStart(t).getTime() + DAY_MS) : new Date(Date.now() + 3650 * DAY_MS),
    };
  };
  const today = (now = new Date()): DayRange => range(todayKey(now), todayKey(now))!;
  /** Start of a calendar day; accepts `yyyy-mm-dd` or any date string. */
  const dayStart = (value?: string | Date | null) => {
    if (!value) return midnight(dateKeyTz(new Date(), zone));
    if (typeof value === 'string' && KEY.test(value)) return midnight(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Date sahi likhein');
    return midnight(dateKeyTz(d, zone));
  };
  /** Last moment of the calendar day `days` after `start` (a 30-day plan from 1st ends on the 30th). */
  const periodEnd = (start: Date, days: number) => {
    const p = tzParts(start, zone);
    return new Date(zonedToUtc(p.year, p.month, p.day + Math.max(days, 1), 0, 0, 0, zone).getTime() - 1);
  };
  const keyOf = (d: Date) => dateKeyTz(d, zone);
  const year = (d = new Date()) => tzParts(d, zone).year;
  const hour = (d: Date) => tzParts(d, zone).hour;
  return { zone, dayStartHour, range, today, todayKey, dayStart, periodEnd, keyOf, year, hour };
}

export type GymClock = Awaited<ReturnType<typeof gymClock>>;

/**
 * Next running number under a prefix (`PT-2026-00012`). Holds a
 * transaction lock per tenant and prefix, so two saves at once never get
 * the same number.
 */
export async function nextNumber(
  tx: Db,
  tenantId: string,
  prefix: string,
  latest: () => Promise<string | null | undefined>,
  width = 5,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`gym:${tenantId}:${prefix}`}))::text`;
  const last = await latest();
  const n = last && last.startsWith(prefix) ? Number(last.slice(prefix.length)) || 0 : 0;
  return prefix + String(n + 1).padStart(width, '0');
}

export function paging(page?: string | number, limit?: string | number, max = 100) {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const l = Math.min(max, Math.max(1, Math.floor(Number(limit) || 25)));
  return { page: p, limit: l, skip: (p - 1) * l };
}

/** Every gym bill number starts with this, so voids and reports can find them. */
export const GYM_SALE = 'GYM-';
