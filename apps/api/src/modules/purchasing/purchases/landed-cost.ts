/**
 * Landed cost: freight, customs/duty, clearing agent, local transport and
 * other costs of bringing a purchase in, paid to people other than the
 * supplier. Pure functions, shared by PurchasesService and the tests.
 *
 *   amount in Rs    typed in Rs, or foreign amount × exchange rate
 *   spread          over the lines by value (line total), quantity (base
 *                   units) or weight (kg); rounded to paisa with the
 *                   remainder on the biggest line, so the parts add up exactly
 *   per unit        a line's share ÷ its base quantity, added to the unit cost
 *                   the goods go into stock at
 *
 * Added after the goods arrived: only units still in stock take the extra
 * cost (their average cost goes up); the share of units already sold is not
 * put on any past sale and is reported back as `soldShare`.
 */

export const LANDED_KINDS = ['FREIGHT', 'CUSTOMS', 'CLEARING', 'TRANSPORT', 'OTHER'] as const;
export type LandedKind = (typeof LANDED_KINDS)[number];
export const LANDED_METHODS = ['VALUE', 'QTY', 'WEIGHT'] as const;
export type LandedMethod = (typeof LANDED_METHODS)[number];

export interface LandedCostInput {
  kind?: string;
  label?: string | null;
  /** Rs; ignored when a foreign amount and rate are given. */
  amount?: number | string | null;
  currency?: string | null;
  foreignAmount?: number | string | null;
  exchangeRate?: number | string | null;
  paidTo?: string | null;
}

export interface LandedCostRow {
  kind: LandedKind;
  label: string | null;
  amount: number;
  currency: string | null;
  foreignAmount: number | null;
  exchangeRate: number | null;
  paidTo: string | null;
}

export interface AllocLine { id: string; value: number; qty: number; weightKg: number | null }

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/** Cleans one cost; throws a short Roman Urdu message when it is not usable. */
export function cleanLandedCost(c: LandedCostInput): LandedCostRow {
  const kind = (LANDED_KINDS as readonly string[]).includes(String(c.kind)) ? (c.kind as LandedKind) : 'OTHER';
  const currency = c.currency ? String(c.currency).trim().toUpperCase().slice(0, 6) : null;
  const foreign = num(c.foreignAmount);
  const rate = num(c.exchangeRate);
  let amount: number;
  if (currency && currency !== 'PKR' && foreign !== null) {
    if (Number.isNaN(foreign) || foreign <= 0) throw new Error('Foreign amount sahi likhein');
    if (rate === null || Number.isNaN(rate) || rate <= 0) throw new Error(`${currency} ka rate (Rs me) likhein`);
    amount = r2(foreign * rate);
  } else {
    const a = num(c.amount);
    if (a === null || Number.isNaN(a) || a <= 0) throw new Error('Amount sahi likhein');
    amount = r2(a);
  }
  if (amount > 1_000_000_000) throw new Error('Amount bohat zyada hai');
  const foreignUsed = !!currency && currency !== 'PKR' && foreign !== null;
  return {
    kind,
    label: c.label ? String(c.label).trim().slice(0, 80) || null : null,
    amount,
    currency: foreignUsed ? currency : null,
    foreignAmount: foreignUsed ? r2(foreign!) : null,
    exchangeRate: foreignUsed ? Math.round(rate! * 10000) / 10000 : null,
    paidTo: c.paidTo ? String(c.paidTo).trim().slice(0, 80) || null : null,
  };
}

/**
 * Splits `total` over the lines by the method. Lines with no basis (no
 * weight on the WEIGHT method) get nothing; when no line has a basis the
 * split falls back to value. The parts add up to `total` to the paisa.
 */
export function allocate(lines: AllocLine[], total: number, method: LandedMethod): Map<string, number> {
  const out = new Map<string, number>(lines.map((l) => [l.id, 0]));
  if (!(total > 0) || !lines.length) return out;
  const basisOf = (m: LandedMethod) => (l: AllocLine) => Math.max(0, m === 'QTY' ? l.qty : m === 'WEIGHT' ? Number(l.weightKg) || 0 : l.value);
  let basis = lines.map(basisOf(method));
  if (!basis.some((b) => b > 0)) basis = lines.map(basisOf('VALUE'));
  if (!basis.some((b) => b > 0)) basis = lines.map(basisOf('QTY'));
  if (!basis.some((b) => b > 0)) basis = lines.map(() => 1);
  const sum = basis.reduce((s, b) => s + b, 0);
  let given = 0;
  let biggest = 0;
  lines.forEach((l, i) => {
    const part = r2((total * basis[i]) / sum);
    out.set(l.id, part);
    given += part;
    if (basis[i] > basis[biggest]) biggest = i;
  });
  const left = r2(total - given);
  if (left !== 0) out.set(lines[biggest].id, r2(out.get(lines[biggest].id)! + left));
  return out;
}

/** Extra cost per base unit for a line's share. */
export const perUnit = (share: number, baseQty: number) => (baseQty > 0 ? Math.round((share / baseQty) * 10000) / 10000 : 0);

/**
 * Re-costing stock already received: the units of the line still in stock
 * (never more than this purchase brought in and kept) take the extra cost.
 * Units not received yet take theirs when they arrive. The rest of the share
 * fell on units already sold or sent back (`soldShare`).
 */
export function recostRemaining(p: { share: number; baseQty: number; receivedQty: number; keptQty: number; stockNow: number; avgCost: number }) {
  const unit = perUnit(p.share, p.baseQty);
  const onHand = Math.max(0, Math.min(p.keptQty, p.stockNow));
  const stock = Math.max(0, p.stockNow);
  const added = r2(unit * onHand);
  const newAvg = stock > 0 ? Math.round(((stock * p.avgCost + added) / stock) * 10000) / 10000 : p.avgCost;
  const notArrived = r2(unit * Math.max(0, p.baseQty - p.receivedQty));
  return { unit, onHand, added, newAvg, soldShare: r2(Math.max(0, p.share - added - notArrived)) };
}
