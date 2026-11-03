/**
 * Dates and times in the business time zone.
 *
 * The server runs in UTC; every shop is in Pakistan (Asia/Karachi, UTC+5,
 * no daylight saving). Phones may be set to any zone, so nothing here uses
 * the device zone: values are shifted to PKT and read with UTC getters.
 * A shop's day can also start after midnight (`businessDayStartHour`, e.g. a
 * dhaba that closes at 2am) — pass it where "today" matters.
 */

import { isLayoutRtl, t } from '@/core/i18n';

export const BUSINESS_TZ = 'Asia/Karachi';
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** In right-to-left layouts, keeps digits and month names in reading order ("3 Nov", not "Nov 3"). */
const ltr = (text: string) => (isLayoutRtl() ? `\u2066${text}\u2069` : text);

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** Calendar parts of a moment as seen in Pakistan. */
export function pkParts(d: DateInput) {
  const x = new Date(toDate(d).getTime() + OFFSET_MS);
  return {
    year: x.getUTCFullYear(),
    month: x.getUTCMonth(),
    day: x.getUTCDate(),
    hour: x.getUTCHours(),
    minute: x.getUTCMinutes(),
    weekday: x.getUTCDay(),
  };
}

const plainDate = (d: DateInput, year = true) => {
  const p = pkParts(d);
  return year ? `${p.day} ${MONTHS[p.month]} ${p.year}` : `${p.day} ${MONTHS[p.month]}`;
};

/** "2 Nov 2026" */
export function formatDate(d: DateInput, opts: { year?: boolean } = {}): string {
  return ltr(plainDate(d, opts.year !== false));
}

const plainTime = (d: DateInput) => {
  const p = pkParts(d);
  const h = p.hour % 12 || 12;
  return `${h}:${String(p.minute).padStart(2, '0')} ${p.hour < 12 ? 'AM' : 'PM'}`;
};

/** "4:05 PM" */
export const formatTime = (d: DateInput): string => ltr(plainTime(d));

/** "2 Nov 2026, 4:05 PM" */
export const formatDateTime = (d: DateInput) => ltr(`${plainDate(d)}, ${plainTime(d)}`);

/** "Monday, 2 Nov" */
export function formatWeekdayDate(d: DateInput): string {
  const p = pkParts(d);
  return `${t(WEEKDAYS[p.weekday])}, ${ltr(`${p.day} ${MONTHS[p.month]}`)}`;
}

/** "Just now", "5m ago", "3h ago", "2d ago", else the date. */
export function formatRelative(d: DateInput, now: DateInput = Date.now()): string {
  const diff = toDate(now).getTime() - toDate(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('Just now');
  if (mins < 60) return t('{{count}}m ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('{{count}}h ago', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('{{count}}d ago', { count: days });
  return formatDate(d);
}

/** Start of the business day containing `d`, as a real instant (UTC Date). */
export function startOfBusinessDay(d: DateInput = Date.now(), startHour = 0): Date {
  const h = Number.isInteger(startHour) && startHour >= 0 && startHour <= 23 ? startHour : 0;
  const local = toDate(d).getTime() + OFFSET_MS;
  let dayStart = Math.floor(local / DAY_MS) * DAY_MS + h * 3_600_000;
  if (local < dayStart) dayStart -= DAY_MS;
  return new Date(dayStart - OFFSET_MS);
}

export const endOfBusinessDay = (d: DateInput = Date.now(), startHour = 0) =>
  new Date(startOfBusinessDay(d, startHour).getTime() + DAY_MS - 1);

/** "2026-11-02": the business day `d` falls in (for API date params). */
export function businessDayKey(d: DateInput = Date.now(), startHour = 0): string {
  const p = pkParts(startOfBusinessDay(d, startHour));
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** "Nov" for a "2026-11" month key (no Intl, same on every phone). */
export function formatMonthShort(monthKey: string): string {
  const m = Number(monthKey.slice(5, 7));
  return MONTHS[m - 1] ?? monthKey;
}

/** Hour of day in Pakistan (0–23), for greetings and charts. */
export const pkHour = (d: DateInput = Date.now()) => pkParts(d).hour;

export function greeting(d: DateInput = Date.now()): string {
  const h = pkHour(d);
  if (h >= 5 && h < 12) return t('Good morning');
  if (h >= 12 && h < 17) return t('Good afternoon');
  if (h >= 17 && h < 21) return t('Good evening');
  return t('Working late');
}
