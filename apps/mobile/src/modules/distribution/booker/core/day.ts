/**
 * Business-day helpers. The server sends the shop's time zone in the
 * manifest; the phone keeps counting days in that zone while offline.
 */

/** 'YYYY-MM-DD' for `at` in `timeZone` (falls back to the phone's own zone). */
export function dayKeyIn(timeZone: string | null | undefined, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const key = `${get('year')}-${get('month')}-${get('day')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  } catch {
    // Older Intl builds without time zone data: fall through to the phone's clock.
  }
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday for a day key. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
