/**
 * End-of-day arithmetic of a van, kept pure so it can be tested: from the
 * stock on the van when the day opened, the day's stock movements and the
 * stock now, each item's opening + loaded − sold + returns − written off
 * (+ anything else) = expected, and a count against it.
 */

const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;
const key = (productId: string, variantId: string | null | undefined) => `${productId}:${variantId ?? ''}`;

export interface DayLine {
  productId: string;
  variantId: string | null;
  opening: number;
  loaded: number;
  sold: number;
  returnsIn: number;
  writtenOff: number;
  other: number;
  expected: number;
}

export function vanDayLines(
  opening: Array<{ productId: string; variantId: string | null; qty: number }>,
  moves: Array<{ productId: string; variantId: string | null; type: string; qty: number }>,
  stockNow: Array<{ productId: string; variantId: string | null; stock: number }>,
): DayLine[] {
  const map = new Map<string, DayLine>();
  const line = (productId: string, variantId: string | null) => {
    const k = key(productId, variantId);
    let l = map.get(k);
    if (!l) map.set(k, (l = { productId, variantId, opening: 0, loaded: 0, sold: 0, returnsIn: 0, writtenOff: 0, other: 0, expected: 0 }));
    return l;
  };
  for (const o of opening) line(o.productId, o.variantId).opening = r4(o.qty);
  for (const m of moves) {
    const l = line(m.productId, m.variantId);
    if (m.type === 'TRANSFER_IN') l.loaded = r4(l.loaded + m.qty);
    else if (m.type === 'SALE_OUT') l.sold = r4(l.sold - m.qty);
    else if (m.type === 'RETURN_IN') l.returnsIn = r4(l.returnsIn + m.qty);
    else if (m.type === 'DAMAGE' || m.type === 'LOSS' || m.type === 'ADJUSTMENT_OUT') l.writtenOff = r4(l.writtenOff - m.qty);
    else l.other = r4(l.other + m.qty);
  }
  for (const s of stockNow) {
    const l = map.get(key(s.productId, s.variantId));
    if (l) l.expected = r4(s.stock);
    else if (Math.abs(s.stock) > 0.0001) line(s.productId, s.variantId).expected = r4(s.stock);
  }
  return [...map.values()].filter((l) => l.opening || l.loaded || l.sold || l.returnsIn || l.writtenOff || l.other || l.expected);
}

/** Counted against expected: what to book short (loss) and extra (gain). Items not counted are taken as expected. */
export function countVariance<L extends DayLine>(lines: L[], counts: Array<{ productId: string; variantId?: string | null; counted: number }>): Array<L & { counted: number; variance: number }> {
  const counted = new Map(counts.map((c) => [key(c.productId, c.variantId), r4(c.counted)]));
  return lines.map((l) => {
    const c = counted.has(key(l.productId, l.variantId)) ? counted.get(key(l.productId, l.variantId))! : Math.max(0, l.expected);
    return { ...l, counted: c, variance: r4(c - l.expected) };
  });
}
