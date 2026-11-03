/**
 * Baking plans, recipes and raw materials: plan progress, a recipe's cost at
 * today's rates and how many can be made from the store, what a plan needs
 * from the store (and what is short), raw material levels and shelf batches.
 */

/** Units sold by weight; their quantities take decimals (12.5 kg). Same list as the API. */
const MEASURED = new Set(['kg', 'kilogram', 'g', 'gm', 'gram', 'pound', 'lb', 'l', 'liter', 'litre', 'ml']);
export const byWeight = (unit?: string | null) => MEASURED.has((unit ?? '').trim().toLowerCase());

/** A typed quantity as stored: three decimals by weight, whole pieces otherwise. */
export const qtyValue = (v: string | number | null | undefined, weight: boolean) => {
  const n = Number(v) || 0;
  return weight ? Math.round(n * 1000) / 1000 : Math.round(n);
};

/** Cleans typed text for a quantity field. */
export const qtyInput = (v: string, weight: boolean) =>
  weight ? (v.replace(/[^\d.]/g, '').match(/^\d*(\.\d{0,3})?/)?.[0] ?? '') : v.replace(/\D/g, '');

export const fmtQty = (q: number | null | undefined) => {
  const n = Number(q || 0);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
};

/* ───────────────────────── plans ───────────────────────── */

export interface PlanItemLike { status: string; plannedQty: number; producedQty: number; failedQty: number }

export function planStats(items: PlanItemLike[]) {
  const open = items.filter((i) => i.status !== 'COMPLETED');
  const planned = items.reduce((s, i) => s + Number(i.plannedQty || 0), 0);
  const produced = items.reduce((s, i) => s + Number(i.producedQty || 0), 0);
  const failed = items.reduce((s, i) => s + Number(i.failedQty || 0), 0);
  const done = items.filter((i) => i.status === 'COMPLETED').length;
  return {
    planned, produced, failed, done, lines: items.length,
    toMake: open.reduce((s, i) => s + Number(i.plannedQty || 0), 0),
    openLines: open.length,
    inOven: items.filter((i) => i.status === 'BAKING').length,
    pending: items.filter((i) => i.status === 'PLANNED').length,
    /** Share of the planned quantity made, 0–100. */
    donePct: planned ? Math.round((produced / planned) * 100) : 0,
    /** Share of the lines finished, 0–100. */
    linePct: items.length ? Math.round((done / items.length) * 100) : 0,
    /** Failed out of everything that came out of the oven, one decimal. */
    failRate: produced + failed ? Math.round((failed / (produced + failed)) * 1000) / 10 : 0,
  };
}

/* ───────────────────────── recipes ───────────────────────── */

export interface RecipeLine { ingredientId: string; name: string; qty: number; unit: string; costPerUnit: number }
export interface StoreItem { id: string; currentStock: number; costPerUnit: number }

/**
 * A recipe priced at today's rates: cost of one batch and of one unit, and
 * how many units the store can still make (the ingredient that runs out
 * first limits it).
 */
export function recipeCost(lines: RecipeLine[], yieldQty: number, store: StoreItem[] = []) {
  const byId = new Map(store.map((i) => [i.id, i]));
  const rows = lines.map((l) => {
    const now = byId.get(l.ingredientId);
    const rate = now ? Number(now.costPerUnit) : Number(l.costPerUnit);
    const batches = now && l.qty > 0 ? Math.floor(Number(now.currentStock) / l.qty) : null;
    return { ...l, rate, cost: l.qty * rate, stock: now ? Number(now.currentStock) : null, batches, changed: !!now && Math.abs(rate - Number(l.costPerUnit)) > 0.001 };
  });
  const y = yieldQty > 0 ? yieldQty : 1;
  const batchCost = rows.reduce((s, r) => s + r.cost, 0);
  const capacity = rows.length && rows.every((r) => r.batches !== null) ? Math.min(...rows.map((r) => r.batches!)) : null;
  const limiting = capacity !== null ? rows.find((r) => r.batches === capacity) ?? null : null;
  return { rows, batchCost, perUnit: batchCost / y, canMake: capacity !== null ? capacity * y : null, limiting };
}

/** Profit share of a selling price at a unit cost, rounded; null without a price. */
export const marginPct = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : null);

/**
 * Raw materials a set of plan lines will use, from each product's recipe,
 * against what is in the store. `recipes` maps productId to its recipe.
 */
export function ingredientNeeds(
  lines: Array<{ productId?: string | null; plannedQty: number }>,
  recipes: Record<string, { yieldQty: number; lines: RecipeLine[] }>,
  store: StoreItem[] = [],
) {
  const need = new Map<string, { ingredientId: string; name: string; unit: string; qty: number; rate: number }>();
  for (const l of lines) {
    const r = l.productId ? recipes[l.productId] : undefined;
    if (!r || !r.lines.length) continue;
    const factor = Number(l.plannedQty || 0) / (r.yieldQty > 0 ? r.yieldQty : 1);
    for (const x of r.lines) {
      const row = need.get(x.ingredientId) ?? { ingredientId: x.ingredientId, name: x.name, unit: x.unit, qty: 0, rate: Number(x.costPerUnit) };
      row.qty = Math.round((row.qty + x.qty * factor) * 1000) / 1000;
      need.set(x.ingredientId, row);
    }
  }
  const byId = new Map(store.map((i) => [i.id, i]));
  const rows = [...need.values()].map((n) => {
    const s = byId.get(n.ingredientId);
    const stock = s ? Number(s.currentStock) : null;
    const rate = s ? Number(s.costPerUnit) : n.rate;
    return { ...n, rate, cost: n.qty * rate, stock, short: stock === null ? n.qty : Math.max(Math.round((n.qty - stock) * 1000) / 1000, 0) };
  });
  return { rows, cost: rows.reduce((s, r) => s + r.cost, 0), short: rows.filter((r) => r.short > 0) };
}

/* ───────────────────────── raw materials ───────────────────────── */

export interface RawLike { currentStock: number; minStock?: number | null; reorderLevel?: number | null; costPerUnit: number; isCritical?: boolean }

export const levelOf = (i: RawLike) => Number(i.reorderLevel ?? i.minStock ?? 0);
export const isOut = (i: RawLike) => Number(i.currentStock || 0) <= 0;
export const isLow = (i: RawLike) => !isOut(i) && Number(i.currentStock || 0) <= levelOf(i);
export const shortOf = (i: RawLike) => Math.max(levelOf(i) - Number(i.currentStock || 0), 0);
/** How much to order: the shortfall, else the reorder level. */
export const orderQty = (i: RawLike) => shortOf(i) || levelOf(i) || 1;

export function rawStats<T extends RawLike>(items: T[]) {
  const need = items.filter((i) => isLow(i) || isOut(i));
  return {
    total: items.length,
    value: items.reduce((s, i) => s + Math.max(Number(i.currentStock || 0), 0) * Number(i.costPerUnit || 0), 0),
    low: items.filter(isLow).length,
    out: items.filter(isOut).length,
    critical: need.filter((i) => i.isCritical).length,
    orderCost: need.reduce((s, i) => s + (shortOf(i) || levelOf(i)) * Number(i.costPerUnit || 0), 0),
    need,
  };
}

/* ───────────────────────── shelf batches ───────────────────────── */

export interface BatchLike { status: string; currentQty: number; expiryDate?: string | null; bestBefore: string }

/** Live batches with hours left, soonest first. */
export function liveBatches<T extends BatchLike>(logs: T[], now = Date.now()): Array<T & { left: number }> {
  return logs
    .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
    .map((f) => {
      const t = new Date(f.expiryDate || f.bestBefore).getTime();
      return { ...f, left: Number.isNaN(t) ? 999 : (t - now) / 3_600_000 };
    })
    .sort((a, b) => a.left - b.left);
}

export type ShelfState = 'expired' | 'soon' | 'today' | 'fresh';
/** Expired, under 6 hours, under 24 hours, or fresh. */
export const shelfState = (left: number): ShelfState => (left <= 0 ? 'expired' : left <= 6 ? 'soon' : left <= 24 ? 'today' : 'fresh');
