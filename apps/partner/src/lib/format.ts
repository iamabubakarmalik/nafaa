/**
 * Number, money and date formatting. Dates are shown in Pakistan time.
 */

const TZ = 'Asia/Karachi';

export const pkr = (n: number | null | undefined) => `PKR ${Math.round(Number(n ?? 0)).toLocaleString('en-PK')}`;
export const num = (n: number | null | undefined) => Number(n ?? 0).toLocaleString('en-PK');

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const dayFmt = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const dayShortFmt = fmt({ day: 'numeric', month: 'short' });
const timeFmt = fmt({ hour: 'numeric', minute: '2-digit', hour12: true });
const monthFmt = fmt({ month: 'long', year: 'numeric' });

const toDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));

export const day = (v?: string | Date | null) => (v ? dayFmt.format(toDate(v)) : '—');
export const dayShort = (v?: string | Date | null) => (v ? dayShortFmt.format(toDate(v)) : '—');
export const time = (v?: string | Date | null) => (v ? timeFmt.format(toDate(v)).toLowerCase() : '');
export const dayTime = (v?: string | Date | null) => (v ? `${dayShort(v)}, ${time(v)}` : '—');

/** "2026-11" → "November 2026". */
export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 15)));
};

/** "2026-11" for a date in Pakistan time. */
export function pkMonth(d = new Date()) {
  const pk = new Date(d.getTime() + 5 * 3_600_000);
  return `${pk.getUTCFullYear()}-${String(pk.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The last `count` months, newest first. */
export function recentMonths(count = 12) {
  const out: string[] = [];
  let m = pkMonth();
  for (let i = 0; i < count; i++) {
    out.push(m);
    const [y, mm] = m.split('-').map(Number);
    m = mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, '0')}`;
  }
  return out;
}

/** "YYYY-MM-DD" of today in Pakistan time, for <input type="date">. */
export const todayInput = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);

/** A date-only value from <input type="date"> as 10:00 Pakistan time, sent as ISO. */
export const dateInputToIso = (v: string) => (v ? new Date(`${v}T10:00:00+05:00`).toISOString() : null);
export const isoToDateInput = (v?: string | null) => (v ? new Date(new Date(v).getTime() + 5 * 3_600_000).toISOString().slice(0, 10) : '');

/** "Aaj", "Kal", "3 din pehle" style relative day. */
export function relativeDay(v?: string | null) {
  if (!v) return '';
  const a = isoToDateInput(v);
  const today = todayInput();
  const diff = Math.round((Date.parse(a) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return 'Aaj';
  if (diff === -1) return 'Kal (guzra)';
  if (diff === 1) return 'Kal';
  if (diff < 0) return `${-diff} din pehle`;
  return `${diff} din baad`;
}

/** "Abhi", "5 min pehle", "2 ghante pehle", else the date. */
export function ago(v?: string | null) {
  if (!v) return 'Kabhi nahi';
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60_000);
  if (mins < 2) return 'Abhi';
  if (mins < 60) return `${mins} min pehle`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} ghante pehle`;
  return day(v);
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
