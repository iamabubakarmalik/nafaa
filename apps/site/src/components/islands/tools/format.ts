/** Number parsing and formatting for the calculator islands (en-PK, rupees). */

/** Parses user input like "1,250.5" or "  300 ". Empty or invalid input is null. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '').replace(/^rs\.?/i, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const RUPEE_FORMAT = new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const RUPEE_FORMAT_FIXED = new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PLAIN_FORMAT = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 3 });

/** "Rs 1,250.50". `fixed` always shows two decimals (invoices). */
export function rupees(value: number, fixed = false): string {
  const formatted = (fixed ? RUPEE_FORMAT_FIXED : RUPEE_FORMAT).format(Math.abs(value));
  return `${value < 0 ? '-' : ''}Rs ${formatted}`;
}

export function plain(value: number): string {
  return PLAIN_FORMAT.format(value);
}

/** "18%" or "12.5%". */
export function percent(value: number, digits = 2): string {
  return `${new Intl.NumberFormat('en-PK', { maximumFractionDigits: digits }).format(value)}%`;
}

/** Rounds to paisa, avoiding binary float noise in totals. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** "20 Oct 2026" for an ISO date, shown under sourced figures. */
export function shortDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
