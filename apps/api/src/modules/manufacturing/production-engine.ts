/**
 * Production engine shared by the production page, the counter (items made
 * when sold) and Nafaa AI. Everything here runs inside the caller's
 * transaction and moves stock only through `applyStockDelta`, so ShopStock,
 * the product totals, batches and the movement log stay in step.
 *
 * One production:
 *  1. takes each raw material out of the branch (PRODUCTION_OUT, earliest
 *     expiry first for batch-tracked items) at its cost today,
 *  2. puts the finished goods in (PRODUCTION_IN) at the cost worked out from
 *     the raw materials plus the recipe's fixed costs, and moves the
 *     product's cost to the weighted average, the same way a purchase does,
 *  3. optionally files what was made under a batch number / expiry,
 *  4. records the run and its lines for history, reports and reversal.
 */

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addToBatch, applyStockDelta, putIntoBatches, type BatchTake } from '../../common/shop-scope';
import { tzParts } from '../../common/helpers/business-time.helper';
import { blendCost, costRecipe, lineUnitOk, r2, r4, unblendCost, type RecipeCost, type RecipeCostInput } from './manufacturing-cost';

type Db = Prisma.TransactionClient | { [k: string]: any };

export const RECIPE_INCLUDE = {
  product: {
    select: {
      id: true, name: true, unit: true, price: true, wholesalePrice: true, creditPrice: true, costPrice: true,
      stock: true, lowStockAlert: true, hasVariants: true, isActive: true, sku: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' as const }, select: { url: true } },
      category: { select: { name: true } },
    },
  },
  lines: {
    orderBy: { sortOrder: 'asc' as const },
    include: { product: { select: { id: true, name: true, unit: true, costPrice: true, stock: true, lowStockAlert: true, isActive: true, expiryTracked: true } } },
  },
} satisfies Prisma.ProductionRecipeInclude;

export type RecipeRow = Prisma.ProductionRecipeGetPayload<{ include: typeof RECIPE_INCLUDE }>;

/** A recipe with the pack sizes its lines are written in. */
export interface LoadedRecipe {
  recipe: RecipeRow;
  packRates: Map<string, number>;
}

/** Loads recipes (by output product) with everything costing and production need. */
export async function loadRecipes(
  db: Db,
  tenantId: string,
  where: Prisma.ProductionRecipeWhereInput = {},
): Promise<LoadedRecipe[]> {
  const recipes: RecipeRow[] = await (db as any).productionRecipe.findMany({
    where: { tenantId, ...where },
    include: RECIPE_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
  const unitIds = [...new Set(recipes.flatMap((r) => r.lines.map((l) => l.unitId)).filter((x): x is string => !!x))];
  const units: Array<{ id: string; conversionRate: number }> = unitIds.length
    ? await (db as any).productUnit.findMany({ where: { id: { in: unitIds } }, select: { id: true, conversionRate: true } })
    : [];
  const packRates = new Map(units.map((u) => [u.id, Number(u.conversionRate) || 1]));
  return recipes.map((recipe) => ({ recipe, packRates }));
}

/** Costing input for a loaded recipe; `costs` overrides raw item costs (fresh reads inside a transaction). */
export function costInput(l: LoadedRecipe, costs?: Map<string, number>): RecipeCostInput {
  const r = l.recipe;
  return {
    yieldQty: r.yieldQty,
    wastagePercent: r.wastagePercent,
    packingCost: r.packingCost,
    labourCost: r.labourCost,
    overheadCost: r.overheadCost,
    lines: r.lines.map((x) => ({
      productId: x.productId,
      quantity: x.quantity,
      unitName: x.unitName,
      packRate: x.unitId ? l.packRates.get(x.unitId) ?? null : null,
      stockUnit: x.product.unit,
      cost: costs?.get(x.productId) ?? (Number(x.product.costPrice) || 0),
    })),
  };
}

/** Cost of making `quantity` units (default: one batch) at today's raw material costs. */
export function costOf(l: LoadedRecipe, quantity?: number, costs?: Map<string, number>): RecipeCost {
  return costRecipe(costInput(l, costs), quantity);
}

/** Lines whose unit cannot be taken from the raw item's stock unit (1 cup of rice kept in kg). */
export function badUnitLines(l: LoadedRecipe): string[] {
  return l.recipe.lines
    .filter((x) => !lineUnitOk({ unitName: x.unitName, packRate: x.unitId ? l.packRates.get(x.unitId) ?? null : null, stockUnit: x.product.unit }))
    .map((x) => `${x.product.name}: ${x.unitName} → ${x.product.unit}`);
}

/** A readable, unique-enough production number: MFG-261029-K3QZ. */
export function newRunNumber(at = new Date()): string {
  const p = tzParts(at);
  const day = `${String(p.year).slice(2)}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
  return `MFG-${day}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export interface ProduceArgs {
  tenantId: string;
  userId: string;
  shopId: string;
  loaded: LoadedRecipe;
  /** Units to make, in the product's base unit. */
  quantity: number;
  /** Raw materials may go below zero (the shop's "sell below zero" setting). */
  allowNegative: boolean;
  source: 'MANUAL' | 'SALE' | 'AI';
  reference?: string | null;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  notes?: string | null;
}

export interface ProduceResult {
  runId: string;
  runNumber: string;
  /** Branch stock row of the finished product. */
  shopStockId: string;
  cost: RecipeCost;
}

/** Makes `quantity` units of a recipe's product in one branch. Call inside a transaction. */
export async function produceInTx(tx: Db, a: ProduceArgs): Promise<ProduceResult> {
  const t = tx as any;
  const r = a.loaded.recipe;
  const qty = r4(a.quantity);
  if (!(qty > 0)) throw new BadRequestException('Kitna banana hai — quantity likhein');
  if (!r.lines.length) throw new BadRequestException(`${r.product.name} ki Recipe me koi raw item nahi`);
  if (r.product.hasVariants) throw new BadRequestException(`${r.product.name} ke variants hain — Recipe sirf bina variant wale product par chalti hai`);
  const bad = badUnitLines(a.loaded);
  if (bad.length) throw new BadRequestException(`Recipe ki unit stock ki unit se nahi milti: ${bad.join(', ')}`);

  // Today's cost of each raw item, read inside the transaction.
  const raws: Array<{ id: string; name: string; costPrice: number }> = await t.product.findMany({
    where: { id: { in: r.lines.map((l) => l.productId) } },
    select: { id: true, name: true, costPrice: true },
  });
  const costs = new Map(raws.map((x) => [x.id, Number(x.costPrice) || 0]));
  const names = new Map(raws.map((x) => [x.id, x.name]));
  const cost = costOf(a.loaded, qty, costs);
  const runNumber = newRunNumber();
  const label = r.product.name;

  // 1. Raw materials out.
  const lines: Array<{ productId: string; quantity: number; unitCost: number; totalCost: number; batchTakes: BatchTake[] }> = [];
  for (const l of cost.lines) {
    if (!(l.baseQty > 0)) continue;
    const res = await applyStockDelta({
      tx, tenantId: a.tenantId, shopId: a.shopId, productId: l.productId, delta: -l.baseQty,
      movementType: 'PRODUCTION_OUT', reference: a.reference ?? runNumber,
      note: `Production: ${label}${a.source === 'SALE' ? ' (bikte waqt bana)' : ''}`,
      preventNegative: !a.allowNegative, label: names.get(l.productId) ?? 'Raw item',
      userId: a.userId, unitCost: l.unitCost,
    });
    lines.push({ productId: l.productId, quantity: l.baseQty, unitCost: l.unitCost, totalCost: l.total, batchTakes: res.batches });
  }

  // 2. Finished goods in, and the product's cost moves to the weighted average.
  const before = await t.product.findUnique({ where: { id: r.productId }, select: { stock: true, costPrice: true } });
  if (cost.unitCost > 0) {
    const avg = blendCost(Number(before?.stock ?? 0), Number(before?.costPrice ?? 0), qty, cost.unitCost);
    await setProductCost(t, r.productId, avg);
  }
  const added = await applyStockDelta({
    tx, tenantId: a.tenantId, shopId: a.shopId, productId: r.productId, delta: qty,
    movementType: 'PRODUCTION_IN', reference: a.reference ?? runNumber,
    note: `Production: ${label}${a.source === 'SALE' ? ' (bikte waqt bana)' : ''}`,
    userId: a.userId, unitCost: cost.unitCost,
  });

  // 3. Optional batch / expiry for what was made.
  let outputBatchId: string | null = null;
  if (a.batchNumber?.trim() || a.expiryDate) {
    outputBatchId = await addToBatch(tx, {
      tenantId: a.tenantId, shopId: a.shopId, productId: r.productId,
      batchNumber: a.batchNumber?.trim() || runNumber, expiryDate: a.expiryDate ?? null, manufactureDate: new Date(),
      costPrice: cost.unitCost, quantity: qty, notes: `Production ${runNumber}`,
    });
  }

  // 4. The record.
  const run = await t.productionRun.create({
    data: {
      tenantId: a.tenantId, shopId: a.shopId, runNumber, recipeId: r.id, productId: r.productId,
      batches: cost.batches, quantity: qty, materialCost: cost.materialCost, extraCost: cost.extraCost,
      totalCost: cost.totalCost, unitCost: cost.unitCost, wastagePercent: Number(r.wastagePercent) || 0,
      batchNumber: outputBatchId ? a.batchNumber?.trim() || runNumber : null, expiryDate: a.expiryDate ?? null, outputBatchId,
      source: a.source, reference: a.reference ?? null, notes: a.notes?.trim() || null, createdById: a.userId,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, totalCost: l.totalCost,
          batchTakes: l.batchTakes.length ? (l.batchTakes as unknown as Prisma.InputJsonValue) : undefined,
        })),
      },
    },
    select: { id: true, runNumber: true },
  });

  return { runId: run.id, runNumber: run.runNumber, shopStockId: added.shopStockId, cost };
}

/** Sets a product's cost and keeps its pack costs in step (a carton of 24 costs 24 pieces). */
async function setProductCost(t: any, productId: string, cost: number) {
  await t.product.update({ where: { id: productId }, data: { costPrice: r4(cost) } });
  const units: Array<{ id: string; conversionRate: number }> = await t.productUnit.findMany({
    where: { productId, variantId: null }, select: { id: true, conversionRate: true },
  });
  for (const u of units) await t.productUnit.update({ where: { id: u.id }, data: { costPrice: r2(cost * (Number(u.conversionRate) || 1)) } });
}

/**
 * Reverses a production: the finished goods come back out (they must still
 * be in the branch), the raw materials go back into stock and into the
 * batches they came from, and the product's cost moves back. Call inside a
 * transaction.
 */
export async function reverseInTx(tx: Db, a: { tenantId: string; userId: string; runId: string; reason?: string | null }) {
  const t = tx as any;
  const run = await t.productionRun.findFirst({
    where: { id: a.runId, tenantId: a.tenantId },
    include: { lines: true, product: { select: { name: true } } },
  });
  if (!run) throw new BadRequestException('Production nahi mili');
  if (run.source === 'SALE') throw new BadRequestException('Yeh bill ke saath bana tha — bill ko return ya void karein');
  const claimed = await t.productionRun.updateMany({
    where: { id: run.id, status: 'DONE' },
    data: { status: 'REVERSED', reversedAt: new Date(), reversedById: a.userId, reverseReason: a.reason?.trim() || null },
  });
  if (!claimed.count) throw new ConflictException('Yeh production pehle hi wapas ho chuki');

  const note = `Wapas: ${run.runNumber}${a.reason?.trim() ? ` — ${a.reason.trim()}` : ''}`;

  // Finished goods out first: refuse if they were sold or moved since.
  const before = await t.product.findUnique({ where: { id: run.productId }, select: { stock: true, costPrice: true } });
  await applyStockDelta({
    tx, tenantId: a.tenantId, shopId: run.shopId, productId: run.productId, delta: -run.quantity,
    movementType: 'PRODUCTION_IN', reference: run.runNumber, note,
    preventNegative: true, label: `${run.product.name} (bana hua maal bik ya nikal chuka)`,
    userId: a.userId, unitCost: run.unitCost,
    batchMode: run.outputBatchId ? 'fefo' : 'cap', batchId: run.outputBatchId,
  });
  if (run.unitCost > 0 && before) {
    await setProductCost(t, run.productId, unblendCost(Number(before.stock), Number(before.costPrice), run.quantity, run.unitCost));
  }

  // Raw materials back, into the batches they came from.
  for (const l of run.lines) {
    await applyStockDelta({
      tx, tenantId: a.tenantId, shopId: run.shopId, productId: l.productId, delta: l.quantity,
      movementType: 'PRODUCTION_OUT', reference: run.runNumber, note, userId: a.userId, unitCost: l.unitCost,
    });
    const takes = Array.isArray(l.batchTakes) ? (l.batchTakes as unknown as BatchTake[]) : [];
    if (takes.length) await putIntoBatches(tx, takes);
  }
  return { id: run.id, runNumber: run.runNumber };
}

/* ───────────── Items made when sold (counter) ───────────── */

/**
 * Recipes of the given products that are made when sold. One indexed query;
 * the counter calls it only when manufacturing is switched on.
 */
export async function loadMakeOnSale(db: Db, tenantId: string, productIds: string[]): Promise<Map<string, { loaded: LoadedRecipe; unitCost: number }>> {
  const out = new Map<string, { loaded: LoadedRecipe; unitCost: number }>();
  if (!productIds.length) return out;
  const loaded = await loadRecipes(db, tenantId, { productId: { in: productIds }, makeOnSale: true, isActive: true });
  for (const l of loaded) {
    if (!l.recipe.lines.length || l.recipe.product.hasVariants) continue;
    out.set(l.recipe.productId, { loaded: l, unitCost: costOf(l, 1).unitCost });
  }
  return out;
}
