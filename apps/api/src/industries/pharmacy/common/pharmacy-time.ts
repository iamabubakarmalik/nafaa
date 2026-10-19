/**
 * Day boundaries for pharmacy lists and registers, on the shop's own clock
 * (time zone and business-day start hour), never the server's UTC day.
 */

import { BadRequestException } from '@nestjs/common';
import type { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface DayRange {
  gte?: Date;
  lt?: Date;
}

/**
 * `from`/`to` business-day keys (YYYY-MM-DD, both inclusive) as a UTC range.
 * Either end may be left out; anything that is not a day key is refused.
 */
export async function dayRange(tz: TenantTimezoneService, tenantId: string, from?: string, to?: string): Promise<DayRange> {
  if (!from && !to) return {};
  for (const k of [from, to]) {
    if (k && !DAY_KEY.test(k)) throw new BadRequestException('Tareekh YYYY-MM-DD shakal me bhejein');
  }
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const at = (key: string, plusDays: number) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d + plusDays, dayStartHour, 0, 0, zone);
  };
  return {
    ...(from && { gte: at(from, 0) }),
    ...(to && { lt: at(to, 1) }),
  };
}

/** Start of today's business day for the tenant. */
export async function todayStart(tz: TenantTimezoneService, tenantId: string): Promise<Date> {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const key = businessDayKey(new Date(), zone, dayStartHour);
  const [y, m, d] = key.split('-').map(Number);
  return zonedToUtc(y, m, d, dayStartHour, 0, 0, zone);
}

/** Whole days from now until `date` (negative once it has passed). */
export function daysUntil(date: Date | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
