/**
 * CSV export for any list. Values are quoted when needed and the file starts
 * with a BOM so Excel opens Urdu names and "Rs" amounts correctly.
 *
 *   downloadCsv('shops', rows, [
 *     { label: 'Name', value: (r) => r.name },
 *     { label: 'Joined', value: (r) => r.createdAt.slice(0, 10) },
 *   ]);
 */

export interface CsvColumn<T> { label: string; value: (row: T) => string | number | boolean | null | undefined }

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  return [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(','))].join('\r\n');
}

export function downloadCsv<T>(name: string, rows: T[], columns: CsvColumn<T>[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([`﻿${toCsv(rows, columns)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `nafaa-${name}-${stamp}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports every page of a server-side list (not only the visible one), up to
 * `max` rows. `fetchPage` receives a 1-based page number.
 */
export async function fetchAllPages<T>(fetchPage: (page: number) => Promise<{ items: T[]; meta: { totalPages: number } }>, max = 10000): Promise<T[]> {
  const first = await fetchPage(1);
  const out = [...first.items];
  for (let p = 2; p <= first.meta.totalPages && out.length < max; p++) out.push(...(await fetchPage(p)).items);
  return out.slice(0, max);
}
