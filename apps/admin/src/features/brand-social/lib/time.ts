/**
 * Pakistan time (Asia/Karachi, UTC+5, no daylight saving) for Nafaa Social.
 * Every day key, calendar cell and schedule picker works in PKT, whatever the
 * browser's own time zone is.
 */

export const PK_TZ = 'Asia/Karachi';
const PK_OFFSET_MS = 5 * 3_600_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock parts of a moment in PKT. */
export function pkParts(d: Date | string) {
  const t = new Date(typeof d === 'string' ? d : d.getTime()).getTime() + PK_OFFSET_MS;
  const x = new Date(t);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), min: x.getUTCMinutes(), dow: x.getUTCDay() };
}

/** "2026-11-13" in PKT. */
export const pkDayKey = (d: Date | string) => { const p = pkParts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };

/** "14:30" in PKT. */
export const pkTime = (d: Date | string) => { const p = pkParts(d); return `${pad(p.h)}:${pad(p.min)}`; };

/** ISO instant for a PKT day and "HH:mm". */
export const pkToIso = (day: string, time = '00:00') => new Date(`${day}T${time.length === 5 ? `${time}:00` : time}+05:00`).toISOString();

/** Today in PKT. */
export const pkToday = () => pkDayKey(new Date());

/** Day key arithmetic on calendar days. */
export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6 for a day key. */
export const weekdayIndex = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;

export const startOfWeek = (key: string) => addDays(key, -weekdayIndex(key));
export const startOfMonth = (key: string) => `${key.slice(0, 7)}-01`;
export function endOfMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${key.slice(0, 7)}-${pad(last)}`;
}
export function addMonths(key: string, n: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

/** Whole days between two keys (b − a). */
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: PK_TZ, ...opts });
const FMT = {
  time: fmt({ hour: 'numeric', minute: '2-digit', hour12: true }),
  dayShort: fmt({ weekday: 'short', day: 'numeric', month: 'short' }),
  dayLong: fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  dateTime: fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }),
  month: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
  keyShort: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }),
  keyDay: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
};

/** "4:30 pm" PKT. */
export const fmtTime = (d: string | Date) => FMT.time.format(new Date(d)).replace(' ', ' ');
/** "Fri 13 Nov, 4:30 pm" PKT. */
export const fmtDateTime = (d: string | Date | null | undefined) => (d ? FMT.dateTime.format(new Date(d)) : 'Not scheduled');
/** "Friday 13 November 2026" PKT. */
export const fmtDayLong = (d: string | Date) => FMT.dayLong.format(new Date(d));
/** "November 2026" for a day key. */
export const fmtMonth = (key: string) => FMT.month.format(new Date(`${key}T12:00:00Z`));
/** "Fri 13 Nov" for a day key. */
export const fmtKeyShort = (key: string) => FMT.keyShort.format(new Date(`${key}T12:00:00Z`));
/** "13 Nov" for a day key. */
export const fmtKeyDay = (key: string) => FMT.keyDay.format(new Date(`${key}T12:00:00Z`));

/** "in 3 h", "2 days ago". */
export function relative(d: string | Date) {
  const ms = new Date(d).getTime() - Date.now();
  const abs = Math.abs(ms);
  const word = abs < 60_000 ? 'now'
    : abs < 3_600_000 ? `${Math.round(abs / 60_000)} min`
      : abs < 86_400_000 ? `${Math.round(abs / 3_600_000)} h`
        : `${Math.round(abs / 86_400_000)} day${Math.round(abs / 86_400_000) === 1 ? '' : 's'}`;
  if (word === 'now') return 'now';
  return ms >= 0 ? `in ${word}` : `${word} ago`;
}

/** "14:30" → "2:30 pm". */
export function hhmmLabel(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${pad(m)} ${suffix}`;
}
