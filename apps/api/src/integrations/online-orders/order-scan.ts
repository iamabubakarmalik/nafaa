/**
 * Packing checks. Pure functions; the packing screen runs the same rules on
 * each scan (apps/web …/lib/pack.ts) and the server checks the final counts.
 */

export interface PackLine { index: number; name: string; quantity: number; codes: string[] }

const norm = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, '');

export type ScanResult =
  | { kind: 'OK'; index: number; done: boolean }
  | { kind: 'EXTRA'; index: number }
  | { kind: 'WRONG' };

/** One scan against the order: the line it belongs to (first line still short), an extra piece, or a wrong item. */
export function matchScan(lines: PackLine[], counts: Record<string, number>, scanned: string): ScanResult {
  const c = norm(scanned);
  const hits = lines.filter((l) => l.codes.includes(c));
  if (!hits.length) return { kind: 'WRONG' };
  const open = hits.find((l) => (counts[l.index] ?? 0) < l.quantity);
  if (!open) return { kind: 'EXTRA', index: hits[0].index };
  return { kind: 'OK', index: open.index, done: (counts[open.index] ?? 0) + 1 >= open.quantity };
}

/**
 * The order is packed when every line was scanned exactly its quantity.
 * Lines with no barcode or SKU may be ticked by hand (`manual`).
 */
export function checkPack(lines: PackLine[], counts: Record<string, number>, manual: number[]): { ok: true } | { ok: false; message: string } {
  for (const l of lines) {
    const n = Number(counts[l.index] ?? 0);
    if (!l.codes.length && manual.includes(l.index)) continue;
    if (n > l.quantity) return { ok: false, message: `${l.name}: ${n} scan hue, order me sirf ${l.quantity} — zyada nikal dein` };
    if (n < l.quantity) return { ok: false, message: `${l.name}: ${l.quantity - n} abhi scan nahi hue` };
  }
  return { ok: true };
}
