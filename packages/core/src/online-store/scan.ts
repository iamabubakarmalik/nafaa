/**
 * Scan to pack: checks on each scan, the same rules as the API
 * (order-scan.ts), which checks the final counts again.
 */

export interface PackLine { index: number; name: string; quantity: number; codes: string[] }
export type ScanResult = { kind: 'OK'; index: number; done: boolean } | { kind: 'EXTRA'; index: number } | { kind: 'WRONG' };

export const normCode = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, '');

export function matchScan(lines: PackLine[], counts: Record<number, number>, scanned: string): ScanResult {
  const c = normCode(scanned);
  const hits = lines.filter((l) => l.codes.includes(c));
  if (!hits.length) return { kind: 'WRONG' };
  const open = hits.find((l) => (counts[l.index] ?? 0) < l.quantity);
  if (!open) return { kind: 'EXTRA', index: hits[0].index };
  return { kind: 'OK', index: open.index, done: (counts[open.index] ?? 0) + 1 >= open.quantity };
}

/** A line is done when fully scanned, or ticked by hand when it has no code. */
export const lineDone = (l: PackLine, counts: Record<number, number>, manual: number[]) =>
  (!l.codes.length && manual.includes(l.index)) || (counts[l.index] ?? 0) === l.quantity;

export function packProgress(lines: PackLine[], counts: Record<number, number>, manual: number[]) {
  const total = lines.reduce((t, l) => t + l.quantity, 0);
  const done = lines.reduce((t, l) => t + Math.min(l.quantity, !l.codes.length && manual.includes(l.index) ? l.quantity : counts[l.index] ?? 0), 0);
  return { total, done, complete: lines.length > 0 && lines.every((l) => lineDone(l, counts, manual)) };
}
