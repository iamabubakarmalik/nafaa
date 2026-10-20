/** Date and text helpers shared by the S5 templates. Dates show in Asia/Karachi (the server runs in UTC). */

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Karachi' });

function toDate(value: string): Date | null {
  // A bare YYYY-MM-DD is a calendar date; read it at Karachi noon so it never shifts a day.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "18 Oct 2026". Empty for a missing or invalid date. */
export function formatDate(value: string | null | undefined): string {
  const date = value ? toDate(value) : null;
  return date ? DATE.format(date) : '';
}

/** "October 2026", for grouping. */
export function formatMonth(value: string | null | undefined): string {
  const date = value ? toDate(value) : null;
  return date ? MONTH.format(date) : '';
}

/** ISO string for <time dateTime>. */
export function isoDate(value: string | null | undefined): string | undefined {
  const date = value ? toDate(value) : null;
  return date ? date.toISOString() : undefined;
}

/** Initials for an avatar placeholder: "Sample Author" → "SA". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** First letter used to file a glossary term (digits and symbols go under "#"). */
export function indexLetter(term: string): string {
  const first = term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/** Lower-case text used by the list filter island. */
export function filterText(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}
