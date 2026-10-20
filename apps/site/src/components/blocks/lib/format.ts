/**
 * Formatting helpers for blocks: PKR amounts, counts and dates.
 *
 * Dates are shown in Asia/Karachi (the server runs in UTC). A date-only
 * value ("2026-10-01") is a calendar day and is formatted as-is, never shifted
 * by a time zone.
 */

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "Rs 1,500", the same shape as the `{{price:...}}` token. */
export function formatPkr(amount: number): string {
  return `Rs ${NUMBER.format(amount)}`;
}

export function formatCount(value: number): string {
  return NUMBER.format(value);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "12 Oct 2026". Returns the input unchanged when it is not a date. */
export function formatDate(value: string | null | undefined, locale = 'en'): string {
  if (!value) return '';
  const dateOnly = DATE_ONLY.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'ur' ? 'en-PK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : 'Asia/Karachi',
  }).format(date);
}

/** ISO date for <time dateTime>. */
export function isoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (DATE_ONLY.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** "#047857" → "4 120 87" for `--accent` (Tailwind's rgb(var(--accent) / a)). Null when not a 6-digit hex. */
export function hexToChannels(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!match) return null;
  return [match[1], match[2], match[3]].map((part) => parseInt(part as string, 16)).join(' ');
}

/** "food-grocery" → "Food grocery" (fallback label when a group has no settings label). */
export function humanizeKey(key: string): string {
  const words = key.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
