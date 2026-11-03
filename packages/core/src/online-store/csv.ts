/**
 * CSV text with a BOM so Excel reads Urdu and Roman text; guards against
 * formula injection. The apps save or share the text themselves.
 */

export function toCsv(rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

/** First sheet rows → header row (first with three or more filled cells) and data rows. */
export function sheetTable(all: unknown[][]): { headers: string[]; rows: string[][] } | null {
  const filled = (r: unknown[]) => r.filter((c) => String(c ?? '').trim() !== '').length;
  const h = all.findIndex((r) => filled(r) >= 3);
  if (h < 0) return null;
  return {
    headers: all[h].map((c) => String(c ?? '').trim()),
    rows: all.slice(h + 1).filter((r) => filled(r) > 0).map((r) => r.map((c) => String(c ?? '').trim())),
  };
}
