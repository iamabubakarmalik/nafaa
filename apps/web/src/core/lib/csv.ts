/** CSV download that Excel opens with Urdu and other Unicode text intact. */

export type CsvCell = string | number | null | undefined;

export function downloadCsv(name: string, rows: CsvCell[][]) {
  const cell = (v: CsvCell) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([`﻿${rows.map((r) => r.map(cell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
