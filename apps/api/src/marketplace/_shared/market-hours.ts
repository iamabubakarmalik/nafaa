/**
 * Shop opening hours and delivery slots for the Market, in Pakistan time.
 *
 * The server runs in UTC, so every wall-clock decision goes through the
 * business-time helpers. `workingHours` is the profile JSON written by the
 * POS Market settings: { mon: { open: "09:00", close: "22:00", closed?: true }, ... }.
 * A missing day means closed; a missing object means "open all day".
 */
import { DEFAULT_TZ, dateKeyTz, tzParts, weekdayInTz, zonedToUtc } from '../../common/helpers/business-time.helper';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type DayHours = { open?: string; close?: string; closed?: boolean };

const toMin = (hhmm: string | undefined, fallback: number) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''));
  if (!m) return fallback;
  return Math.min(24 * 60, Number(m[1]) * 60 + Number(m[2]));
};

function dayHours(workingHours: unknown, at: Date, tz: string): { open: number; close: number } | null {
  if (!workingHours || typeof workingHours !== 'object') return { open: 0, close: 24 * 60 };
  const d = (workingHours as Record<string, DayHours | undefined>)[DAY_KEYS[weekdayInTz(at, tz)]];
  if (!d || d.closed) return null;
  return { open: toMin(d.open, 0), close: toMin(d.close, 24 * 60) };
}

const isHoliday = (holidays: Date[] | null | undefined, at: Date, tz: string) =>
  !!holidays?.length && holidays.some((h) => h.toISOString().slice(0, 10) === dateKeyTz(at, tz));

/** Is the shop open at this moment (Pakistan time)? Handles hours past midnight. */
export function isOpenAt(workingHours: unknown, holidays: Date[] | null | undefined, at: Date = new Date(), tz: string = DEFAULT_TZ): boolean {
  if (isHoliday(holidays, at, tz)) return false;
  const p = tzParts(at, tz);
  const now = p.hour * 60 + p.minute;
  const today = dayHours(workingHours, at, tz);
  if (today) {
    if (today.close > today.open ? now >= today.open && now < today.close : now >= today.open) return true;
  }
  // Yesterday's hours that run past midnight.
  const yesterday = new Date(at.getTime() - 86_400_000);
  const y = isHoliday(holidays, yesterday, tz) ? null : dayHours(workingHours, yesterday, tz);
  return !!y && y.close <= y.open && now < y.close;
}

export interface DeliverySlot { start: string; end: string; label: string; date: string }

/**
 * One-hour delivery windows for the next `days` days inside the shop's hours.
 * Past windows, closed days and holidays are skipped; the first window starts
 * at least `leadMinutes` from now so the shop has time to prepare.
 */
export function deliverySlots(
  workingHours: unknown,
  holidays: Date[] | null | undefined,
  opts: { days?: number; leadMinutes?: number; now?: Date; tz?: string } = {},
): DeliverySlot[] {
  const tz = opts.tz ?? DEFAULT_TZ;
  const now = opts.now ?? new Date();
  const earliest = now.getTime() + (opts.leadMinutes ?? 60) * 60_000;
  const slots: DeliverySlot[] = [];
  const base = tzParts(now, tz);
  for (let d = 0; d < (opts.days ?? 3); d++) {
    const noon = zonedToUtc(base.year, base.month, base.day + d, 12, 0, 0, tz);
    if (isHoliday(holidays, noon, tz)) continue;
    const hours = dayHours(workingHours, noon, tz);
    if (!hours) continue;
    const p = tzParts(noon, tz);
    const close = hours.close > hours.open ? hours.close : 24 * 60;
    // Windows start on the hour; a 09:30 opening gives a first window at 10:00.
    for (let m = Math.ceil(hours.open / 60) * 60; m + 60 <= close; m += 60) {
      const start = zonedToUtc(p.year, p.month, p.day, Math.floor(m / 60), 0, 0, tz);
      if (start.getTime() < earliest) continue;
      const end = new Date(start.getTime() + 3_600_000);
      const fmt = (x: number) => {
        const h = Math.floor(x / 60) % 24;
        return `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
      };
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        date: dateKeyTz(start, tz),
        label: `${fmt(m)} - ${fmt(m + 60)}`,
      });
    }
  }
  return slots;
}
