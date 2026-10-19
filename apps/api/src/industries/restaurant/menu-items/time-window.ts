/**
 * Daily time windows in shop time (the server runs on UTC). Used for dish
 * serving hours (breakfast only, dinner only) and happy hours.
 */

import { DEFAULT_TZ, tzParts, weekdayInTz } from '../../../common/helpers/business-time.helper';

/** "HH:mm" of the moment in the shop's timezone. */
export function clockOf(at: Date, tz: string = DEFAULT_TZ): string {
  const p = tzParts(at, tz);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * True when `time` falls in [start, end). A window such as 22:00–02:00 runs
 * past midnight. A missing edge leaves that side open.
 */
export function inWindow(time: string, start?: string | null, end?: string | null): boolean {
  if (!start && !end) return true;
  if (!start) return time < end!;
  if (!end) return time >= start;
  if (start === end) return true;
  return start < end ? time >= start && time < end : time >= start || time < end;
}

/** Whether a dish with serving hours and days is served at `at`. */
export function servedAt(
  item: { availableFrom?: string | null; availableTo?: string | null; availableDays?: number[] | null },
  at: Date,
  tz: string = DEFAULT_TZ,
): boolean {
  const days = item.availableDays ?? [];
  if (days.length && !days.includes(weekdayInTz(at, tz))) return false;
  return inWindow(clockOf(at, tz), item.availableFrom || null, item.availableTo || null);
}
