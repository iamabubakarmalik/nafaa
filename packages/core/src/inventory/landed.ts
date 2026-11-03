/**
 * Landed cost (import cost): freight, duty, clearing and transport added to a
 * purchase and spread over its lines by value, quantity or weight. The split
 * matches the API (purchases/landed-cost.ts): rounded to paisa, the remainder
 * on the line with the biggest basis. The API's figure is the one saved.
 */

export type LandedKind = 'FREIGHT' | 'CUSTOMS' | 'CLEARING' | 'TRANSPORT' | 'OTHER';
export type LandedMethod = 'VALUE' | 'QTY' | 'WEIGHT';

export const LANDED_KIND_IDS: LandedKind[] = ['FREIGHT', 'CUSTOMS', 'CLEARING', 'TRANSPORT', 'OTHER'];
export const LANDED_CURRENCIES = ['PKR', 'USD', 'CNY', 'AED', 'EUR', 'GBP'] as const;

export interface LandedDraft {
  key: string;
  kind: LandedKind;
  label: string;
  /** PKR, or a foreign currency code. */
  currency: string;
  /** Rs, or the foreign amount. */
  amount: number;
  /** Rs for one unit of the currency. */
  rate: number;
}

export interface LandedLine { id: string; value: number; qty: number; weightKg: number | null }

export interface LandedCostPayload {
  kind: LandedKind;
  label?: string;
  amount?: number;
  currency?: string;
  foreignAmount?: number;
  exchangeRate?: number;
  paidTo?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const newLandedDraft = (seed = Math.random()): LandedDraft => ({
  key: `c${Date.now().toString(36)}${seed.toString(36).slice(2, 5)}`, kind: 'FREIGHT', label: '', currency: 'PKR', amount: 0, rate: 0,
});

/** One cost in rupees. */
export const landedRs = (c: Pick<LandedDraft, 'currency' | 'amount' | 'rate'>) => (c.currency === 'PKR' ? Number(c.amount) || 0 : r2((Number(c.amount) || 0) * (Number(c.rate) || 0)));

export const landedTotal = (list: ReadonlyArray<Pick<LandedDraft, 'currency' | 'amount' | 'rate'>>) => r2(list.reduce((s, c) => s + landedRs(c), 0));

/** Body for the API: costs with no rupee value are left out. */
export const landedPayload = (list: ReadonlyArray<LandedDraft>): LandedCostPayload[] => list.filter((c) => landedRs(c) > 0).map((c) => (c.currency === 'PKR'
  ? { kind: c.kind, label: c.label.trim() || undefined, amount: c.amount }
  : { kind: c.kind, label: c.label.trim() || undefined, currency: c.currency, foreignAmount: c.amount, exchangeRate: c.rate }));

/** Splits `total` over the lines by the basis; falls back to value, then equal parts, when the basis is all zero. */
export function allocateLanded(lines: ReadonlyArray<LandedLine>, total: number, method: LandedMethod): Map<string, number> {
  const out = new Map(lines.map((l) => [l.id, 0]));
  if (!(total > 0) || !lines.length) return out;
  const basisOf = (m: LandedMethod) => (l: LandedLine) => Math.max(0, m === 'QTY' ? l.qty : m === 'WEIGHT' ? Number(l.weightKg) || 0 : l.value);
  let basis = lines.map(basisOf(method));
  if (!basis.some((b) => b > 0)) basis = lines.map(basisOf('VALUE'));
  if (!basis.some((b) => b > 0)) basis = lines.map(() => 1);
  const sum = basis.reduce((s, b) => s + b, 0);
  let given = 0;
  let big = 0;
  lines.forEach((l, i) => {
    const part = r2((total * basis[i]) / sum);
    out.set(l.id, part);
    given += part;
    if (basis[i] > basis[big]) big = i;
  });
  const left = r2(total - given);
  if (left) out.set(lines[big].id, r2(out.get(lines[big].id)! + left));
  return out;
}

/** Cost of one unit after its share of the landed cost. */
export const landedUnitCost = (unitCost: number, qty: number, share: number) => (qty > 0 ? r2((Number(unitCost) || 0) + share / qty) : Number(unitCost) || 0);
