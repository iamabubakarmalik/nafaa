/**
 * Restaurant menu management: recipe units and plate cost with wastage,
 * food cost bands, add-on group rules, happy-hour time windows and the
 * rider cash hand-over. Same rules as apps/web/src/industries/restaurant
 * (lib/recipeUnits.ts, components/RecipeLinesEditor.tsx, pages/*); the API
 * checks them again.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Recipe units ───────────────────────────────────────────────

const MASS: Record<string, number> = {
  kg: 1000, kgs: 1000, kilo: 1000, kilogram: 1000, kilograms: 1000,
  g: 1, gm: 1, gms: 1, gram: 1, grams: 1, mg: 0.001, lb: 453.592, lbs: 453.592, oz: 28.3495,
};
const VOLUME: Record<string, number> = { l: 1000, ltr: 1000, litre: 1000, liter: 1000, liters: 1000, litres: 1000, ml: 1, millilitre: 1, milliliter: 1 };
const COUNT: Record<string, number> = { pc: 1, pcs: 1, piece: 1, pieces: 1, nos: 1, dozen: 12, dz: 12 };

const norm = (u?: string | null) => (u ?? '').trim().toLowerCase();

/** Quantity expressed in `toUnit`; unrelated or unknown units are returned unchanged (same as the API). */
export function convertQty(qty: number, fromUnit?: string | null, toUnit?: string | null): number {
  const from = norm(fromUnit);
  const to = norm(toUnit);
  if (!from || !to || from === to) return qty;
  if (MASS[from] && MASS[to]) return (qty * MASS[from]) / MASS[to];
  if (VOLUME[from] && VOLUME[to]) return (qty * VOLUME[from]) / VOLUME[to];
  if (COUNT[from] && COUNT[to]) return (qty * COUNT[from]) / COUNT[to];
  return qty;
}

/** Units a recipe line may use for an ingredient stocked in `stockUnit` (the API refuses others). */
export function unitChoices(stockUnit?: string | null): string[] {
  const u = norm(stockUnit);
  if (!u) return ['pcs'];
  if (MASS[u]) return [...new Set([u, 'kg', 'gram'])];
  if (VOLUME[u]) return [...new Set([u, 'liter', 'ml'])];
  if (COUNT[u]) return [...new Set([u, 'pcs', 'dozen'])];
  return [u];
}

/** The smaller unit a cook writes in: grams for kg, ml for litres. */
export function cookUnit(stockUnit?: string | null): string {
  const u = norm(stockUnit);
  if (MASS[u] && MASS[u] >= 1000) return 'gram';
  if (VOLUME[u] && VOLUME[u] >= 1000) return 'ml';
  return u || 'pcs';
}

// ── Recipe cost ────────────────────────────────────────────────

export interface RecipeLineDraft {
  ingredientProductId: string;
  name: string;
  /** Unit the ingredient is stocked and costed in. */
  stockUnit: string;
  /** Today's cost per stock unit. */
  rate: number;
  stock: number | null;
  quantity: number;
  unit: string;
  wastagePercent: number;
  isOptional: boolean;
  notes: string;
}

export interface RecipeDraft {
  lines: RecipeLineDraft[];
  yieldQuantity: number;
  preparationSteps: string;
  cookingTime: number | null;
  /** Size name (lower case) → share of the recipe one plate of it uses. */
  sizeFactors: Record<string, number>;
}

export const emptyRecipe = (): RecipeDraft => ({ lines: [], yieldQuantity: 1, preparationSteps: '', cookingTime: null, sizeFactors: {} });
export const sizeKey = (name: string) => name.trim().toLowerCase();

/** Quantity the store gives out for a line: the recipe quantity plus wastage. */
export const grossQty = (l: Pick<RecipeLineDraft, 'quantity' | 'wastagePercent'>) => l.quantity * (1 + (l.wastagePercent || 0) / 100);

/** Stock units one line takes out for the whole batch. */
export const lineStockQty = (l: Pick<RecipeLineDraft, 'quantity' | 'wastagePercent' | 'unit' | 'stockUnit'>) => convertQty(grossQty(l), l.unit, l.stockUnit);

/** Plates the store's stock of one line still covers; null without stock or quantity. */
export function platesFromStock(l: RecipeLineDraft, yieldQuantity: number): number | null {
  const perPlate = lineStockQty(l) / (yieldQuantity || 1);
  return l.stock != null && perPlate > 0 ? Math.floor(l.stock / perPlate) : null;
}

/** Batch cost (optional lines left out) and the cost of one plate. */
export function recipeTotals(d: Pick<RecipeDraft, 'lines' | 'yieldQuantity'>) {
  const batch = d.lines.reduce((s, l) => s + (l.isOptional ? 0 : lineStockQty(l) * l.rate), 0);
  return { batch: r2(batch), perPlate: r2(batch / (d.yieldQuantity || 1)) };
}

export type RecipeProblem = { code: 'quantity' | 'wastage'; name: string } | { code: 'yield' } | null;

/** First thing that stops the recipe from saving, or null. */
export function recipeProblem(d: Pick<RecipeDraft, 'lines' | 'yieldQuantity'>): RecipeProblem {
  if (!d.lines.length) return null;
  const empty = d.lines.find((l) => !(l.quantity > 0));
  if (empty) return { code: 'quantity', name: empty.name };
  if (!(d.yieldQuantity > 0)) return { code: 'yield' };
  const waste = d.lines.find((l) => l.wastagePercent < 0 || l.wastagePercent > 100);
  if (waste) return { code: 'wastage', name: waste.name };
  return null;
}

/** Food cost % of a plate at a menu price; null without a price. */
export const foodCostPct = (cost: number, price: number) => (price > 0 ? (cost / price) * 100 : null);

/** Food cost band: good up to 35%, warn up to 45%, bad above. */
export function foodCostTone(pct: number | null | undefined): 'good' | 'warn' | 'bad' | null {
  if (pct == null) return null;
  return pct > 45 ? 'bad' : pct > 35 ? 'warn' : 'good';
}

export type DishClass = 'star' | 'workhorse' | 'puzzle' | 'dog';

/** Menu engineering: popular (sold at least `popularAt`) and profitable (profit per plate at least `marginAt`). */
export function dishClass(qty: number, perPlate: number, t: { popularAt: number; marginAt: number }): DishClass {
  const popular = qty >= t.popularAt;
  const profitable = perPlate >= t.marginAt;
  return popular ? (profitable ? 'star' : 'workhorse') : profitable ? 'puzzle' : 'dog';
}

// ── Add-on groups ──────────────────────────────────────────────

export type ModifierType = 'ADDON' | 'VARIATION' | 'REMOVAL' | 'SPICE_LEVEL' | 'COOKING_STYLE' | 'NOTE';
export interface GroupDraftOption { name: string; isActive?: boolean; isDefault?: boolean; ingredientProductId?: string | null; ingredientQty?: number | null }
export interface GroupDraft { name: string; type: ModifierType; isRequired: boolean; minSelections: number; maxSelections: number; options: GroupDraftOption[] }

export type GroupProblem =
  | { code: 'name' | 'optionName' | 'duplicate' | 'noOption' | 'minOverMax' | 'singleOnly' | 'tooManyDefaults' }
  | { code: 'minOverOptions'; count: number; min: number }
  | { code: 'ingredientQty'; name: string }
  | null;

/** One-choice groups: a size or a spice level. */
export const singleChoice = (type: ModifierType) => type === 'VARIATION' || type === 'SPICE_LEVEL';

/** Mirrors the API rules so the counter never meets a group that cannot be filled. */
export function groupProblem(f: GroupDraft): GroupProblem {
  if (!f.name.trim()) return { code: 'name' };
  const live = f.options.filter((o) => o.isActive !== false);
  if (f.options.some((o) => !o.name.trim())) return { code: 'optionName' };
  const names = f.options.map((o) => o.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return { code: 'duplicate' };
  if (f.type !== 'NOTE' && !live.length) return { code: 'noOption' };
  const min = f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections ?? 0;
  const max = f.maxSelections ?? 1;
  if (min > max) return { code: 'minOverMax' };
  if (f.type !== 'NOTE' && min > live.length) return { code: 'minOverOptions', count: live.length, min };
  if (singleChoice(f.type) && max > 1) return { code: 'singleOnly' };
  if (live.filter((o) => o.isDefault).length > max) return { code: 'tooManyDefaults' };
  const noQty = f.options.find((o) => o.ingredientProductId && !(Number(o.ingredientQty) > 0));
  if (noQty) return { code: 'ingredientQty', name: noQty.name.trim() };
  return null;
}

// ── Happy hours ────────────────────────────────────────────────

export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** "07:00" → "7:00 AM". */
export function clock12(hhmm?: string | null): string {
  if (!hhmm || !/^\d{1,2}:\d{2}/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Shaded parts of a 24-hour strip as [start%, width%]; a window past midnight wraps. */
export function windowParts(start: string, end: string): Array<[number, number]> {
  const a = (toMinutes(start) / 1440) * 100;
  const b = (toMinutes(end) / 1440) * 100;
  return a < b ? [[a, b - a]] : [[a, 100 - a], [0, b]];
}

/**
 * Whether a rule runs at a shop-time minute of the day on a weekday (0 =
 * Sunday). A window past midnight counts for the day it started.
 */
export function happyLiveAt(r: { startTime: string; endTime: string; daysOfWeek: number[] }, minute: number, day: number): boolean {
  const s = toMinutes(r.startTime);
  const e = toMinutes(r.endTime);
  const dayOk = (d: number) => !r.daysOfWeek.length || r.daysOfWeek.includes(d);
  if (s < e) return minute >= s && minute < e && dayOk(day);
  if (minute >= s) return dayOk(day);
  return minute < e && dayOk((day + 6) % 7);
}

export type DaysKind = 'everyday' | 'weekdays' | 'weekend' | 'list';
/** How a day list reads: every day, Monday–Friday, the weekend or a list. */
export function daysKind(days: number[]): DaysKind {
  if (!days.length || days.length === 7) return 'everyday';
  const s = [...days].sort((a, b) => a - b).join();
  if (s === '1,2,3,4,5') return 'weekdays';
  if (s === '0,6') return 'weekend';
  return 'list';
}

export type HappyProblem = 'name' | 'time' | 'sameTime' | 'percent' | 'fixed' | 'dates' | 'scope' | null;

/** Why a happy-hour rule cannot be saved (web RuleForm). */
export function happyProblem(f: {
  name: string; startTime: string; endTime: string; discountType: 'PERCENTAGE' | 'FIXED' | 'BUY_ONE_GET_ONE'; discountValue: number;
  validFrom?: string; validTo?: string; pick: boolean; categoryIds: string[]; productIds: string[];
}): HappyProblem {
  if (!f.name.trim()) return 'name';
  if (!HHMM.test(f.startTime) || !HHMM.test(f.endTime)) return 'time';
  if (f.startTime === f.endTime) return 'sameTime';
  if (f.discountType === 'PERCENTAGE' && !(f.discountValue > 0 && f.discountValue <= 100)) return 'percent';
  if (f.discountType === 'FIXED' && !(f.discountValue > 0)) return 'fixed';
  if (f.validFrom && f.validTo && f.validFrom > f.validTo) return 'dates';
  if (f.pick && !f.categoryIds.length && !f.productIds.length) return 'scope';
  return null;
}

/** Percent a rule takes off, for the shop's discount limit; null for a fixed amount. Buy one get one is 50%. */
export const happyPercent = (r: { discountType: string; discountValue: number }) =>
  r.discountType === 'PERCENTAGE' ? r.discountValue : r.discountType === 'BUY_ONE_GET_ONE' ? 50 : null;

// ── Rider cash ─────────────────────────────────────────────────

/** Cash to take from a rider for the chosen orders, the rider's fee on them, and what reaches the drawer. */
export function settleTotals(orders: Array<{ id: string; due: number; riderFee?: number }>, picked: Set<string>, payFee: boolean) {
  const chosen = orders.filter((o) => picked.has(o.id));
  const amount = r2(chosen.reduce((n, o) => n + o.due, 0));
  const fee = r2(chosen.reduce((n, o) => n + (o.riderFee ?? 0), 0));
  return { amount, fee, drawer: r2(payFee && fee > 0 ? amount - fee : amount) };
}
