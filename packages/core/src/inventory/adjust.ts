/**
 * Stock changes by hand: the fixed reasons with their direction and profit
 * effect (mirroring the API's stock-adjustments/reason-codes.ts), and the
 * quick stock dialog's add / remove / count rule. Labels are raw source text;
 * translate at render.
 */

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'OPENING_BALANCE';
export type ReasonCode = 'DAMAGE' | 'EXPIRY' | 'THEFT' | 'SHOP_USE' | 'AUDIT_FOUND' | 'FREE_BONUS' | 'CORRECTION';
/** How a line counts in profit: stock loss, stock gain, or none (correction, opening stock). */
export type ProfitEffect = 'LOSS' | 'GAIN' | 'NONE';

export const ADJUSTMENT_TYPES: AdjustmentType[] = ['OPENING_BALANCE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS'];

/** +1 adds stock, −1 takes it off. */
export const typeSign = (t: AdjustmentType): 1 | -1 => (t === 'ADJUSTMENT_IN' || t === 'OPENING_BALANCE' ? 1 : -1);

/** Raw text saved as the reason of a line without a reason code. */
export const TYPE_TEXT: Record<AdjustmentType, string> = {
  ADJUSTMENT_IN: 'Stock barhaya', ADJUSTMENT_OUT: 'Stock kam kiya', DAMAGE: 'Kharab maal', LOSS: 'Gum gaya', OPENING_BALANCE: 'Opening stock',
};

export const REASONS: Record<ReasonCode, { label: string; effect: ProfitEffect; type: AdjustmentType | null; hint: string }> = {
  DAMAGE: { label: 'Damage', effect: 'LOSS', type: 'DAMAGE', hint: 'Toota ya kharab maal' },
  EXPIRY: { label: 'Expiry', effect: 'LOSS', type: 'DAMAGE', hint: 'Expire ho gaya, bik nahi sakta' },
  THEFT: { label: 'Chori / shortage', effect: 'LOSS', type: 'LOSS', hint: 'Chori, gum ya ginti me kam' },
  SHOP_USE: { label: 'Dukaan mein istemal', effect: 'LOSS', type: 'ADJUSTMENT_OUT', hint: 'Apne kaam me liya, sample ya free diya' },
  AUDIT_FOUND: { label: 'Audit mein zyada nikla', effect: 'GAIN', type: 'ADJUSTMENT_IN', hint: 'Ginti me system se zyada maal' },
  FREE_BONUS: { label: 'Free / bonus maal mila', effect: 'GAIN', type: 'ADJUSTMENT_IN', hint: 'Company ya supplier se muft maal' },
  CORRECTION: { label: 'Galti theek karna (data correction)', effect: 'NONE', type: null, hint: 'Sirf ghalat entry theek karni hai' },
};

export const LOSS_REASONS: ReasonCode[] = ['DAMAGE', 'EXPIRY', 'THEFT', 'SHOP_USE'];
export const GAIN_REASONS: ReasonCode[] = ['AUDIT_FOUND', 'FREE_BONUS'];

/** A row's profit effect: saved on the row, else by its type (same rule as the reports). */
export const effectOf = (row: { type: AdjustmentType; profitEffect?: ProfitEffect | null }): ProfitEffect =>
  row.profitEffect ?? (row.type === 'ADJUSTMENT_IN' ? 'GAIN' : row.type === 'OPENING_BALANCE' ? 'NONE' : 'LOSS');

export type StockMode = 'add' | 'remove' | 'set';

/** A choice in the quick stock dialog: opening stock (no code), a fixed reason, or the count's own up/down rule. */
export interface StockChoice { label: string; code: ReasonCode | 'COUNT' | null }

export const STOCK_CHOICES: Record<StockMode, StockChoice[]> = {
  add: [
    { label: 'Pehla stock', code: null }, { label: 'Dukaan me banaya', code: null },
    { label: REASONS.AUDIT_FOUND.label, code: 'AUDIT_FOUND' }, { label: REASONS.FREE_BONUS.label, code: 'FREE_BONUS' },
  ],
  remove: LOSS_REASONS.map((c) => ({ label: REASONS[c].label, code: c })),
  set: [{ label: 'Ginti ki — asal stock', code: 'COUNT' }],
};
export const CORRECTION_CHOICE: StockChoice = { label: REASONS.CORRECTION.label, code: 'CORRECTION' };

export interface StockChange {
  next: number;
  delta: number;
  /** The fixed reason sent (a count becomes AUDIT_FOUND or THEFT); null for opening stock. */
  code: ReasonCode | null;
  effect: ProfitEffect;
  type: AdjustmentType;
  /** Raw reason text to save. */
  reason: string;
  /** Problem that stops the save, as raw text; null when it can be saved. */
  problem: 'empty' | 'no_change' | 'opening_only_adds' | null;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * What the quick stock dialog saves: the new stock, the change, the reason
 * code and the adjustment type. Opening stock only adds; a count may go either
 * way and becomes "found in audit" or "shortage"; a correction keeps the
 * direction of the change.
 */
export function resolveStockChange(current: number, mode: StockMode, qtyText: string | number, choice: StockChoice): StockChange {
  const n = Number(qtyText) || 0;
  const cur = Number(current) || 0;
  const next = r3(mode === 'add' ? cur + n : mode === 'remove' ? cur - n : n);
  const delta = r3(next - cur);
  const code: ReasonCode | null = choice.code === 'COUNT' ? (delta > 0 ? 'AUDIT_FOUND' : 'THEFT') : choice.code;
  const effect: ProfitEffect = code ? REASONS[code].effect : 'NONE';
  const type: AdjustmentType = code ? REASONS[code].type ?? (delta < 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN') : 'OPENING_BALANCE';
  const empty = mode === 'set' ? String(qtyText).trim() === '' : !(n > 0);
  const problem = empty ? 'empty' : delta === 0 ? 'no_change' : code === null && delta < 0 ? 'opening_only_adds' : null;
  return { next, delta, code, effect, type, reason: code ? REASONS[code].label : choice.label, problem };
}

/** One counted line of a stock count: the change and its reason (extra found = gain, short = loss). */
export function countLine(system: number, counted: number, correction = false) {
  const delta = r3((Number(counted) || 0) - (Number(system) || 0));
  if (delta === 0) return { delta, type: null, code: null, effect: 'NONE' as ProfitEffect };
  const code: ReasonCode = correction ? 'CORRECTION' : delta > 0 ? 'AUDIT_FOUND' : 'THEFT';
  const type: AdjustmentType = correction ? (delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT') : REASONS[code].type!;
  return { delta, type, code, effect: REASONS[code].effect };
}

/** Totals of a count: lines changed, units gained and lost, and value at cost. */
export function countSummary(lines: ReadonlyArray<{ system: number; counted: number | null; cost?: number | null }>) {
  let changed = 0, gained = 0, lost = 0, gainValue = 0, lossValue = 0, counted = 0;
  for (const l of lines) {
    if (l.counted === null || l.counted === undefined) continue;
    counted++;
    const d = r3(l.counted - l.system);
    if (!d) continue;
    changed++;
    const v = Math.abs(d) * (Number(l.cost) || 0);
    if (d > 0) { gained += d; gainValue += v; } else { lost += -d; lossValue += v; }
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { counted, changed, gained: r3(gained), lost: r3(lost), gainValue: r2(gainValue), lossValue: r2(lossValue), net: r2(gainValue - lossValue) };
}
