/**
 * Batch quantities follow branch stock.
 *
 * A ProductBatch belongs to one branch. Stock taken out of a branch comes
 * out of its batches (a named batch first, then the earliest expiry; no
 * expiry last), stock coming back goes into the batch it came from, and
 * purchases create or top up a batch. Batches never go below zero: stock
 * that no batch covers (old stock entered before batches) is simply
 * unbatched, so the batches of an item never add up to more than its stock.
 */

/** Same rounding as branch stock (4 decimals). */
const round4 = (n: number) => Math.round((Number(n) || 0) * 10_000) / 10_000;
const EPS = 0.0001;

/** Quantity taken from one batch. */
export interface BatchTake {
  batchId: string;
  quantity: number;
}

export interface TakeFromBatches {
  shopId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  /** Taken from this batch first. */
  batchId?: string | null;
  /** Sales: expired batches are used only when valid ones run out. */
  sellable?: boolean;
}

/**
 * Takes `quantity` out of the item's batches in one branch and returns what
 * came from which batch. Takes only what the batches hold; the rest is
 * unbatched stock. Each decrement is guarded, so two counters at once can
 * never take a batch below zero.
 */
export async function takeFromBatches(tx: any, input: TakeFromBatches): Promise<BatchTake[]> {
  let left = round4(input.quantity);
  if (left <= EPS) return [];
  const rows: Array<{ id: string; quantity: number; expiryDate: Date | null }> = await tx.productBatch.findMany({
    where: { shopId: input.shopId, productId: input.productId, variantId: input.variantId ?? null, isActive: true, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    select: { id: true, quantity: true, expiryDate: true },
  });
  if (!rows.length) return [];

  const now = Date.now();
  const rank = (b: (typeof rows)[number]) =>
    b.id === input.batchId ? 0 : input.sellable && b.expiryDate && b.expiryDate.getTime() < now ? 2 : 1;
  // Stable sort keeps the expiry order inside each group.
  const ordered = rows.map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i).map((x) => x.b);

  const takes: BatchTake[] = [];
  for (const batch of ordered) {
    if (left <= EPS) break;
    let have = Number(batch.quantity);
    // A concurrent sale may have taken some since the read; retry with what is left.
    for (let attempt = 0; attempt < 3 && have > EPS; attempt++) {
      const take = round4(Math.min(have, left));
      const done = await tx.productBatch.updateMany({
        where: { id: batch.id, quantity: { gte: take - EPS } },
        data: { quantity: { decrement: take } },
      });
      if (done.count) {
        await tidyBatch(tx, batch.id);
        takes.push({ batchId: batch.id, quantity: take });
        left = round4(left - take);
        break;
      }
      const fresh = await tx.productBatch.findUnique({ where: { id: batch.id }, select: { quantity: true } });
      have = Number(fresh?.quantity ?? 0);
    }
  }
  return takes;
}

/**
 * Takes out only what the branch stock no longer covers: when the item's
 * batches add up to more than `stock`, the excess comes off, earliest
 * expiry first. For stock leaving that was never batched (an unbatched
 * purchase line sent back).
 */
export async function capBatchesToStock(
  tx: any,
  key: { shopId: string; productId: string; variantId?: string | null },
  stock: number,
): Promise<BatchTake[]> {
  const agg = await tx.productBatch.aggregate({
    where: { shopId: key.shopId, productId: key.productId, variantId: key.variantId ?? null, isActive: true, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });
  const excess = round4(Number(agg._sum.quantity ?? 0) - Math.max(0, Number(stock) || 0));
  return excess > EPS ? takeFromBatches(tx, { ...key, quantity: excess }) : [];
}

/** Puts quantities back into the batches they came from. */
export async function putIntoBatches(tx: any, takes: BatchTake[]): Promise<void> {
  for (const t of takes) {
    if (t.quantity <= EPS) continue;
    await tx.productBatch.updateMany({ where: { id: t.batchId }, data: { quantity: { increment: round4(t.quantity) } } });
    await tidyBatch(tx, t.batchId);
  }
}

export interface AddToBatch {
  tenantId: string;
  shopId: string;
  productId: string;
  variantId?: string | null;
  batchNumber: string;
  expiryDate?: Date | null;
  manufactureDate?: Date | null;
  /** Cost of one base unit of what is added. */
  costPrice?: number | null;
  quantity: number;
  notes?: string | null;
}

/**
 * Adds stock to the branch's batch with the same number and expiry, or
 * creates it. A top-up moves the batch cost to the weighted average.
 * Returns the batch id.
 */
export async function addToBatch(tx: any, input: AddToBatch): Promise<string | null> {
  const quantity = round4(input.quantity);
  const batchNumber = input.batchNumber.trim();
  if (quantity <= EPS || !batchNumber) return null;
  const cost = Math.max(0, Number(input.costPrice) || 0);
  const found = await findBatch(tx, input);
  if (found) {
    const old = Math.max(Number(found.quantity), 0);
    const avg = old + quantity > 0 ? (old * Number(found.costPrice) + quantity * cost) / (old + quantity) : cost;
    await tx.productBatch.update({
      where: { id: found.id },
      data: { quantity: { increment: quantity }, isActive: true, ...(cost > 0 && { costPrice: round4(avg) }) },
    });
    await tidyBatch(tx, found.id);
    return found.id;
  }
  const created = await tx.productBatch.create({
    data: {
      tenantId: input.tenantId, shopId: input.shopId, productId: input.productId, variantId: input.variantId ?? null,
      batchNumber, expiryDate: input.expiryDate ?? null, manufactureDate: input.manufactureDate ?? null,
      quantity, costPrice: cost, notes: input.notes ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

/** The branch's batch of an item with this number and expiry, if any. */
export function findBatch(
  tx: any,
  key: { shopId: string; productId: string; variantId?: string | null; batchNumber: string; expiryDate?: Date | null },
): Promise<{ id: string; quantity: number; costPrice: number } | null> {
  return tx.productBatch.findFirst({
    where: {
      shopId: key.shopId, productId: key.productId, variantId: key.variantId ?? null,
      batchNumber: { equals: key.batchNumber.trim(), mode: 'insensitive' },
      expiryDate: key.expiryDate ?? null,
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, quantity: true, costPrice: true },
  });
}

/**
 * Records the batches a sale line took, so a return or void can put them back.
 */
export async function recordSaleBatches(tx: any, saleItemId: string, takes: BatchTake[]): Promise<void> {
  if (!takes.length) return;
  await tx.saleItemBatch.createMany({
    data: takes.map((t) => ({ saleItemId, batchId: t.batchId, quantity: t.quantity })),
  });
}

/**
 * A sale line comes back: marks `quantity` of its batch takes as returned,
 * the latest-expiring batch first, and with `restock` puts that quantity
 * back into those batches. Goods returned damaged are marked returned but
 * not added back. Quantity the line never took from a batch stays unbatched.
 */
export async function returnSaleBatches(tx: any, saleItemId: string, quantity: number, restock: boolean): Promise<void> {
  let left = round4(quantity);
  if (left <= EPS) return;
  const rows: Array<{ id: string; batchId: string; quantity: number; returnedQty: number; createdAt: Date; batch: { expiryDate: Date | null } }> =
    await tx.saleItemBatch.findMany({
      where: { saleItemId },
      select: { id: true, batchId: true, quantity: true, returnedQty: true, createdAt: true, batch: { select: { expiryDate: true } } },
    });
  // Reverse of the order they were taken in: latest expiry (or no expiry) first.
  const exp = (r: (typeof rows)[number]) => r.batch.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
  rows.sort((a, b) => exp(b) - exp(a) || b.createdAt.getTime() - a.createdAt.getTime());
  for (const r of rows) {
    if (left <= EPS) break;
    const open = round4(Number(r.quantity) - Number(r.returnedQty));
    if (open <= EPS) continue;
    const give = round4(Math.min(open, left));
    await tx.saleItemBatch.update({ where: { id: r.id }, data: { returnedQty: { increment: give } } });
    if (restock) await putIntoBatches(tx, [{ batchId: r.batchId, quantity: give }]);
    left = round4(left - give);
  }
}

/** Keeps a batch at 4 decimals and never below zero after float arithmetic. */
async function tidyBatch(tx: any, id: string): Promise<void> {
  const row = await tx.productBatch.findUnique({ where: { id }, select: { quantity: true } });
  if (!row) return;
  const q = Number(row.quantity);
  const clean = Math.max(0, round4(q));
  if (clean !== q) await tx.productBatch.updateMany({ where: { id, quantity: q }, data: { quantity: clean } });
}
