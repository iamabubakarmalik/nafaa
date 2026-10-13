import { capBatchesToStock, returnSaleBatches, takeFromBatches } from './batch-stock.helper';

const DAY = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * DAY);

interface Row { id: string; quantity: number; expiryDate: Date | null; createdAt: Date }

/** In-memory ProductBatch / SaleItemBatch with the guarded updates Postgres gives. */
function fakeTx(rows: Row[], takes: Array<{ id: string; batchId: string; quantity: number; returnedQty: number }> = []) {
  const byId = (id: string) => rows.find((r) => r.id === id);
  const fefo = (a: Row, b: Row) =>
    (a.expiryDate?.getTime() ?? Infinity) - (b.expiryDate?.getTime() ?? Infinity) || a.createdAt.getTime() - b.createdAt.getTime();
  return {
    rows,
    takes,
    productBatch: {
      findMany: async () => rows.filter((r) => r.quantity > 0).sort(fefo).map((r) => ({ ...r })),
      findUnique: async ({ where }: any) => (byId(where.id) ? { quantity: byId(where.id)!.quantity } : null),
      aggregate: async () => ({ _sum: { quantity: rows.reduce((s, r) => s + Math.max(r.quantity, 0), 0) } }),
      updateMany: async ({ where, data }: any) => {
        const r = byId(where.id);
        if (!r) return { count: 0 };
        if (where.quantity?.gte !== undefined && r.quantity < where.quantity.gte) return { count: 0 };
        if (typeof where.quantity === 'number' && r.quantity !== where.quantity) return { count: 0 };
        if (data.quantity?.decrement !== undefined) r.quantity -= data.quantity.decrement;
        else if (data.quantity?.increment !== undefined) r.quantity += data.quantity.increment;
        else r.quantity = data.quantity;
        return { count: 1 };
      },
    },
    saleItemBatch: {
      findMany: async () => takes.map((t) => ({ ...t, createdAt: new Date(0), batch: { expiryDate: byId(t.batchId)?.expiryDate ?? null } })),
      update: async ({ where, data }: any) => {
        const t = takes.find((x) => x.id === where.id)!;
        t.returnedQty += data.returnedQty.increment;
      },
    },
  };
}

const key = { shopId: 's1', productId: 'p1', variantId: null };

describe('Batches follow stock', () => {
  it('sale takes the earliest expiry first and spans batches; no-expiry last', async () => {
    const tx = fakeTx([
      { id: 'none', quantity: 50, expiryDate: null, createdAt: new Date(1) },
      { id: 'late', quantity: 10, expiryDate: at(200), createdAt: new Date(2) },
      { id: 'soon', quantity: 4, expiryDate: at(20), createdAt: new Date(3) },
    ]);
    const took = await takeFromBatches(tx, { ...key, quantity: 6, sellable: true });
    expect(took).toEqual([{ batchId: 'soon', quantity: 4 }, { batchId: 'late', quantity: 2 }]);
    expect(tx.rows.map((r) => r.quantity)).toEqual([50, 8, 0]);
  });

  it('a named batch goes first', async () => {
    const tx = fakeTx([
      { id: 'soon', quantity: 4, expiryDate: at(20), createdAt: new Date(1) },
      { id: 'late', quantity: 10, expiryDate: at(200), createdAt: new Date(2) },
    ]);
    expect(await takeFromBatches(tx, { ...key, quantity: 3, batchId: 'late' })).toEqual([{ batchId: 'late', quantity: 3 }]);
  });

  it('a sale skips expired batches while valid ones have stock', async () => {
    const tx = fakeTx([
      { id: 'old', quantity: 5, expiryDate: at(-10), createdAt: new Date(1) },
      { id: 'ok', quantity: 3, expiryDate: at(60), createdAt: new Date(2) },
    ]);
    const took = await takeFromBatches(tx, { ...key, quantity: 4, sellable: true });
    expect(took).toEqual([{ batchId: 'ok', quantity: 3 }, { batchId: 'old', quantity: 1 }]);
  });

  it('never below zero: what batches do not cover stays unbatched', async () => {
    const tx = fakeTx([{ id: 'a', quantity: 2, expiryDate: at(30), createdAt: new Date(1) }]);
    expect(await takeFromBatches(tx, { ...key, quantity: 5 })).toEqual([{ batchId: 'a', quantity: 2 }]);
    expect(tx.rows[0].quantity).toBe(0);
  });

  it('return with restock puts back latest expiry first; damaged only marks returned', async () => {
    const rows = [
      { id: 'soon', quantity: 0, expiryDate: at(20), createdAt: new Date(1) },
      { id: 'late', quantity: 8, expiryDate: at(200), createdAt: new Date(2) },
    ];
    const takes = [
      { id: 't1', batchId: 'soon', quantity: 4, returnedQty: 0 },
      { id: 't2', batchId: 'late', quantity: 2, returnedQty: 0 },
    ];
    const tx = fakeTx(rows, takes);
    await returnSaleBatches(tx, 'si1', 3, true);
    expect(rows.map((r) => r.quantity)).toEqual([1, 10]);
    await returnSaleBatches(tx, 'si1', 2, false);
    expect(rows.map((r) => r.quantity)).toEqual([1, 10]);
    expect(takes.map((t) => t.returnedQty)).toEqual([3, 2]);
  });

  it('cap takes only what stock no longer covers', async () => {
    const tx = fakeTx([
      { id: 'a', quantity: 6, expiryDate: at(10), createdAt: new Date(1) },
      { id: 'b', quantity: 6, expiryDate: at(90), createdAt: new Date(2) },
    ]);
    expect(await capBatchesToStock(tx, key, 10)).toEqual([{ batchId: 'a', quantity: 2 }]);
    expect(await capBatchesToStock(tx, key, 10)).toEqual([]);
  });
});
