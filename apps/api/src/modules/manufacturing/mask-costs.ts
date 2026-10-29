/**
 * Removes cost, margin and profit figures (any key naming them, such as
 * unitCost or materialCost) for staff who may not see costs. The global
 * cost mask only knows fixed key names; manufacturing has many more.
 */
export function stripCostFigures<T>(value: T): T {
  const strip = (v: unknown, depth: number): unknown => {
    if (depth > 10 || v === null || typeof v !== 'object' || v instanceof Date) return v;
    if (Array.isArray(v)) return v.map((x) => strip(x, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (/cost|margin|profit/i.test(k)) continue;
      out[k] = strip(x, depth + 1);
    }
    return out;
  };
  return strip(value, 0) as T;
}
