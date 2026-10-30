import { applySchemes, type SchemeLine, type SchemeRule } from './helpers/scheme-resolver';
import { countVariance, vanDayLines } from './helpers/van-day';
import { orderNeeds, releaseOrder, reserveOrder } from './helpers/reservation';
import { ChequesService } from './services/cheques.service';
import { ClaimsService } from './services/claims.service';
import { TargetsService, monthKeys, monthPace } from './services/targets.service';

const clock = { clock: async () => ({ tz: 'Asia/Karachi', dayStartHour: 0 }) } as never;
const user = { id: 'u1', tenantId: 't1', role: 'OWNER', permissions: [] } as never;

describe('van day reconciliation', () => {
  it('opening + loaded − sold + returns − written off = expected, and the count gives the variance', () => {
    const lines = vanDayLines(
      [{ productId: 'ghee', variantId: null, qty: 4 }],
      [
        { productId: 'ghee', variantId: null, type: 'TRANSFER_IN', qty: 48 },
        { productId: 'ghee', variantId: null, type: 'SALE_OUT', qty: -30 },
        { productId: 'ghee', variantId: null, type: 'RETURN_IN', qty: 2 },
        { productId: 'ghee', variantId: null, type: 'DAMAGE', qty: -1 },
        { productId: 'tea', variantId: null, type: 'TRANSFER_IN', qty: 12 },
        { productId: 'tea', variantId: null, type: 'SALE_OUT', qty: -12 },
      ],
      [{ productId: 'ghee', variantId: null, stock: 23 }, { productId: 'tea', variantId: null, stock: 0 }, { productId: 'old', variantId: null, stock: 0 }],
    );
    const ghee = lines.find((l) => l.productId === 'ghee')!;
    expect(ghee).toMatchObject({ opening: 4, loaded: 48, sold: 30, returnsIn: 2, writtenOff: 1, expected: 23 });
    expect(ghee.opening + ghee.loaded - ghee.sold + ghee.returnsIn - ghee.writtenOff).toBe(ghee.expected);
    expect(lines.some((l) => l.productId === 'old')).toBe(false);

    const counted = countVariance(lines, [{ productId: 'ghee', counted: 21 }]);
    expect(counted.find((l) => l.productId === 'ghee')).toMatchObject({ counted: 21, variance: -2 });
    // Not counted: taken as expected, no variance.
    expect(counted.find((l) => l.productId === 'tea')).toMatchObject({ counted: 0, variance: 0 });
  });
});

describe('mix schemes', () => {
  const line = (productId: string, cartons: number): SchemeLine => ({ productId, brandId: 'juice', baseQty: cartons * 12, unitPrice: 100, packs: { pcs: 1, Carton: 12 } });
  const mix = (over: Partial<SchemeRule>): SchemeRule => ({ id: 'm', name: 'Juice mix', type: 'PERCENT_OFF', isActive: true, isMix: true, brandIds: ['juice'], buyQty: 3, buyUnitName: 'Carton', value: 5, ...over });

  it('counts covered lines together toward the threshold', () => {
    const r = applySchemes([line('apple', 2), line('mango', 1)], [mix({})]);
    expect(r.map((x) => x.schemeId)).toEqual(['m', 'm']);
    expect(r[0].discount).toBe(120); // 5% of 2 cartons × 12 × 100
    expect(r[1].discount).toBe(60);
    // The same rule without isMix needs 3 cartons on one line.
    expect(applySchemes([line('apple', 2), line('mango', 1)], [mix({ isMix: false })]).every((x) => x.schemeId === null)).toBe(true);
  });

  it('puts the group\'s free goods on the line with the most packs', () => {
    const r = applySchemes([line('apple', 2), line('mango', 4)], [mix({ type: 'FREE_QTY', freeQty: 1, value: 0 })]);
    expect(r[0].schemeId).toBeNull();
    expect(r[1]).toMatchObject({ schemeId: 'm', freeBaseQty: 24 }); // 6 cartons → 2 sets → 2 cartons of mango
  });

  it('picks the slab from the group and sizes rupees off per line', () => {
    const s = mix({ type: 'SLAB', value: 0, slabs: [{ minQty: 3, amountPerUnit: 10 }, { minQty: 6, amountPerUnit: 25 }] });
    const r = applySchemes([line('apple', 2), line('mango', 4)], [s]);
    expect(r.map((x) => x.discount)).toEqual([50, 100]);
  });
});

/** A tiny in-memory ShopStock / SalesOrder pair for the reservation helper. */
function fakeTx(stock: Record<string, { id: string; stock: number; reserved: number }>) {
  const orders: Record<string, { reservation: unknown; reservedAt: Date | null }> = {};
  const rowOf = (w: { productId: string; variantId: string | null }) => stock[`${w.productId}:${w.variantId ?? ''}`];
  const byId = (id: string) => Object.values(stock).find((r) => r.id === id)!;
  const tx = {
    shopStock: {
      findFirst: async ({ where }: any) => rowOf(where) ?? null,
      updateMany: async ({ where, data }: any) => {
        const r = byId(where.id);
        if (where.reserved?.lte != null && r.reserved > where.reserved.lte) return { count: 0 };
        if (where.reserved?.gte != null && r.reserved < where.reserved.gte) return { count: 0 };
        if (data.reserved.increment) r.reserved += data.reserved.increment;
        if (data.reserved.decrement) r.reserved -= data.reserved.decrement;
        return { count: 1 };
      },
      update: async ({ where, data }: any) => { byId(where.id).reserved = data.reserved; },
    },
    salesOrder: {
      update: async ({ where, data }: any) => { orders[where.id] = { reservation: data.reservation, reservedAt: data.reservedAt }; },
      updateMany: async ({ where }: any) => {
        if (!orders[where.id]?.reservedAt) return { count: 0 };
        orders[where.id] = { reservation: null, reservedAt: null };
        return { count: 1 };
      },
    },
  };
  return { tx: tx as never, orders };
}

describe('stock reservation', () => {
  const items = [
    { productId: 'ghee', variantId: null, baseQty: 30, freeBaseQty: 2, freeProductId: null },
    { productId: 'tea', variantId: null, baseQty: 10, freeBaseQty: 0, freeProductId: null },
  ];

  it('sums paid and free goods per item', () => {
    expect([...orderNeeds(items).values()]).toEqual([
      { productId: 'ghee', variantId: null, qty: 32 },
      { productId: 'tea', variantId: null, qty: 10 },
    ]);
  });

  it('holds only what is free and gives back exactly that', async () => {
    const stock = { 'ghee:': { id: 's1', stock: 50, reserved: 0 }, 'tea:': { id: 's2', stock: 8, reserved: 5 } };
    const { tx, orders } = fakeTx(stock);
    const holds = await reserveOrder(tx, 't1', { id: 'o1', shopId: 'g1', reservation: null, items });
    expect(holds).toEqual([
      { shopId: 'g1', productId: 'ghee', variantId: null, qty: 32 },
      { shopId: 'g1', productId: 'tea', variantId: null, qty: 3 }, // only 3 of tea were free
    ]);
    expect(stock['ghee:'].reserved).toBe(32);
    expect(stock['tea:'].reserved).toBe(8);

    await releaseOrder(tx, 't1', { id: 'o1', reservation: orders.o1.reservation as never });
    expect(stock['ghee:'].reserved).toBe(0);
    expect(stock['tea:'].reserved).toBe(5); // another hold stays
    // A second release gives nothing back twice.
    await releaseOrder(tx, 't1', { id: 'o1', reservation: holds as never });
    expect(stock['tea:'].reserved).toBe(5);
  });
});

describe('cheque bounce', () => {
  function prismaWith(collectionStatus: 'VERIFIED' | 'PENDING') {
    const calls: Record<string, any[]> = { ledger: [], customer: [], collection: [] };
    const cheque = { id: 'c1', tenantId: 't1', customerId: 'cu1', collectionId: 'col1', status: 'DEPOSITED', chequeNo: '123', bankName: 'HBL', amount: 5000 };
    const tx = {
      distCheque: { updateMany: async () => ({ count: 1 }), update: async () => ({}) },
      distCollection: {
        findUnique: async () => ({ id: 'col1', status: collectionStatus, shopId: 'g1' }),
        update: async (a: any) => { calls.collection.push(a); },
      },
      customer: {
        update: async (a: any) => { calls.customer.push(a); return { balance: 5000 }; },
        findUnique: async () => ({ balance: 5000 }),
      },
      customerLedger: { create: async (a: any) => { calls.ledger.push(a); return { id: 'l1' }; } },
    };
    const prisma = {
      distCheque: { findFirst: async () => cheque },
      $transaction: async (fn: any) => fn(tx),
      customerLedger: { findMany: async () => [] },
      saleSettlement: { deleteMany: async () => ({}) },
    };
    return { prisma, calls };
  }

  it('takes a verified payment back off the khata with a note', async () => {
    const { prisma, calls } = prismaWith('VERIFIED');
    const svc = new ChequesService(prisma as never, clock);
    await svc.bounce(user, 'c1', { reason: 'Funds nahi' }).catch(() => undefined);
    expect(calls.customer[0].data).toEqual({ balance: { increment: 5000 } });
    expect(calls.ledger[0].data).toMatchObject({ type: 'ADJUSTMENT', amount: 5000, reference: 'Cheque #123' });
    expect(calls.ledger[0].data.note).toContain('Cheque bounce');
  });

  it('rejects an unverified collection instead of touching the khata', async () => {
    const { prisma, calls } = prismaWith('PENDING');
    const svc = new ChequesService(prisma as never, clock);
    await svc.bounce(user, 'c1', {}).catch(() => undefined);
    expect(calls.ledger).toHaveLength(0);
    expect(calls.collection[0].data.status).toBe('REJECTED');
  });
});

describe('principal claims', () => {
  it('claims rupees off for the delivered share and free goods at cost', async () => {
    const prisma = {
      tradeScheme: { findMany: async () => [{ id: 's1', name: '10+1', supplierId: 'p1' }] },
      salesOrderItem: {
        findMany: async () => [{
          id: 'i1', productId: 'ghee', freeProductId: null, schemeId: 's1', baseQty: 240, deliveredBaseQty: 180, schemeDiscount: 400,
          freeBaseQty: 24, deliveredFreeQty: 12, freeSaleItemId: 'fs1',
          salesOrder: { id: 'o1', orderNumber: 'SO-1', saleId: 'sa1', customerId: 'cu1', invoicedAt: new Date('2026-10-10') },
        }],
      },
      distMarketReturnItem: {
        findMany: async () => [{ id: 'r1', productId: 'tea', supplierId: 'p1', baseQty: 6, costValue: 1200, condition: 'EXPIRED', marketReturn: { id: 'm1', number: 'MR-1', customerId: 'cu1', approvedAt: new Date('2026-10-12') } }],
      },
      product: { findMany: async () => [{ id: 'ghee', name: 'Ghee', costPrice: 400 }, { id: 'tea', name: 'Tea', costPrice: 200 }] },
      saleItem: { findMany: async () => [{ id: 'fs1', costPrice: 380 }] },
      sale: { findMany: async () => [{ id: 'sa1', saleNumber: 'NF-1' }] },
      customer: { findMany: async () => [{ id: 'cu1', name: 'Shop', businessName: 'Madina Store' }] },
    };
    const svc = new ClaimsService(prisma as never, clock, {} as never, {} as never);
    const lines = await svc.unclaimed('t1', { gte: new Date('2026-10-01'), lt: new Date('2026-11-01') }, 'p1');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ kind: 'SCHEME', discount: 300, freeQty: 12, freeValue: 4560, total: 4860, customerName: 'Madina Store', invoiceNumber: 'NF-1' });
    expect(lines[1]).toMatchObject({ kind: 'RETURN', returnValue: 1200, total: 1200 });
  });
});

describe('targets', () => {
  it('knows the month and how far through it a day is', () => {
    expect(monthKeys('2026-02')).toEqual({ first: '2026-02-01', last: '2026-02-28', days: 28 });
    expect(monthPace('2026-10', '2026-10-15')).toBeCloseTo(15 / 31);
    expect(monthPace('2026-10', '2026-09-30')).toBe(0);
    expect(monthPace('2026-10', '2026-11-02')).toBe(1);
  });

  it('counts invoiced goods for their delivered share, by booker and by pack', async () => {
    const targets = [
      { id: 'a', period: '2026-10', userId: 'b1', routeId: null, brandId: null, supplierId: null, metric: 'VALUE', target: 1000, unitName: null },
      { id: 'b', period: '2026-10', userId: null, routeId: null, brandId: 'br', supplierId: null, metric: 'QTY', target: 10, unitName: 'Carton' },
    ];
    const prisma = {
      distTarget: { findMany: async () => targets },
      salesOrder: {
        findMany: async () => [
          { bookedById: 'b1', routeId: 'r1', items: [{ productId: 'ghee', variantId: null, baseQty: 24, total: 600, deliveredBaseQty: 12 }] },
          { bookedById: 'b2', routeId: 'r1', items: [{ productId: 'ghee', variantId: null, baseQty: 48, total: 1200, deliveredBaseQty: null }] },
        ],
      },
      product: { findMany: async () => [{ id: 'ghee', brandId: 'br' }] },
      productUnit: { findMany: async () => [{ productId: 'ghee', unitName: 'Carton', conversionRate: 12 }] },
      user: { findMany: async () => [{ id: 'b1', fullName: 'Imran' }] },
      distRoute: { findMany: async () => [] },
      brand: { findMany: async () => [{ id: 'br', name: 'Sufi' }] },
      supplier: { findMany: async () => [] },
    };
    const svc = new TargetsService(prisma as never, clock);
    const r = await svc.list(user, { period: '2026-10' });
    const a = r.targets.find((t) => t.id === 'a')!;
    const b = r.targets.find((t) => t.id === 'b')!;
    expect(a.achieved).toBe(300); // half of SO 1 delivered
    expect(a.label).toBe('Imran');
    expect(b.achieved).toBe(5); // (12 + 48) / 12 cartons
  });
});

describe('commission by brand / principal', () => {
  // Imported here so the engine's narrow buckets are covered next to the rest of phase 2.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { apply, emptyMonth, xKey } = require('../hr/commission/commission.engine');
  it('counts only the brands and principals a rule names; plain rules are unchanged', () => {
    const pm = emptyMonth();
    pm.sales.set('cat1', { sale: 1000, cost: 600, qty: 10 });
    pm.salesX = new Map([[xKey('cat1', 'br1', 'p1'), { sale: 700, cost: 400, qty: 7 }], [xKey('cat1', 'br2', null), { sale: 300, cost: 200, qty: 3 }]]);
    const base = { id: 'r', name: null, userId: null, basis: 'SALE', valueType: 'PERCENT', value: 10, categoryIds: [], minMonthlySale: null, targetAmount: null, targetBonus: null, isActive: true };
    expect(apply(pm, [{ ...base, brandIds: [], supplierIds: [] }], true).earned).toBe(100);
    expect(apply(pm, [{ ...base, brandIds: ['br1'], supplierIds: [] }], true).earned).toBe(70);
    expect(apply(pm, [{ ...base, brandIds: [], supplierIds: ['p1'] }], true).earned).toBe(70);
    expect(apply(pm, [{ ...base, brandIds: ['br2'], supplierIds: ['p1'] }], true).earned).toBe(0);
  });
});
