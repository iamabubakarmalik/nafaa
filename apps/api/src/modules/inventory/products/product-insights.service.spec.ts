import { ProductInsightsService } from './product-insights.service';

function setup(lines: Array<{ soldAt: string; quantity: number; returnedQty?: number; total: number; costPrice: number; saleId: string }>) {
  const prisma = {
    product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', stock: 20, costPrice: 60 }) },
    saleItem: {
      findMany: jest.fn((args: { take?: number }) => Promise.resolve(args.take ? [] : lines.map((l) => ({ ...l, returnedQty: l.returnedQty ?? 0, sale: { soldAt: new Date(l.soldAt) } })))),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 12, returnedQty: 2, total: 1200 }, _count: { _all: 5 }, _min: { createdAt: null }, _max: { createdAt: null } }),
    },
    stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
    shopStock: { findMany: jest.fn().mockResolvedValue([]) },
    sale: { groupBy: jest.fn().mockResolvedValue([]) },
    customer: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
  return { svc: new ProductInsightsService(prisma as never, tz as never), prisma };
}

describe('ProductInsightsService.get', () => {
  beforeAll(() => { jest.useFakeTimers().setSystemTime(new Date('2026-10-11T10:00:00Z')); });
  afterAll(() => jest.useRealTimers());

  it('buckets sales by Karachi business day and nets out returns', async () => {
    const { svc } = setup([
      // 11 Oct 02:00 Karachi = 10 Oct 21:00 UTC → today in Karachi.
      { soldAt: '2026-10-10T21:00:00Z', quantity: 3, returnedQty: 1, total: 200, costPrice: 60, saleId: 's1' },
      { soldAt: '2026-10-09T08:00:00Z', quantity: 1, total: 100, costPrice: 60, saleId: 's2' },
    ]);
    const res = await svc.get({ tenantId: 't1' } as never, 'p1', '7');
    expect(res.series).toHaveLength(7);
    expect(res.series[6]).toMatchObject({ key: '2026-10-11', qty: 2, revenue: 200, bills: 1 });
    expect(res.series[4]).toMatchObject({ key: '2026-10-09', qty: 1, revenue: 100 });
    expect(res.totals).toMatchObject({ qty: 3, revenue: 300, profit: 300 - 3 * 60, bills: 2 });
    // 3 sold in 7 days with 20 in stock: about 47 days left.
    expect(res.totals.daysLeft).toBe(47);
    expect(res.allTime).toMatchObject({ qty: 10, revenue: 1200 });
  });

  it('falls back to 30 days for an unknown window', async () => {
    const { svc } = setup([]);
    expect((await svc.get({ tenantId: 't1' } as never, 'p1', 'abc')).series).toHaveLength(30);
  });
});

describe('ProductInsightsService.purchases', () => {
  it('totals live lines in base units and takes the last cost per base unit', async () => {
    const recent = [
      { id: 'l2', variantId: null, unitName: 'Carton', conversionRate: 12, quantity: 2, baseQuantity: 24, costPrice: 1200, total: 2400, receivedQty: 24, returnedQty: 0, batchNo: null, expiryDate: null,
        purchase: { id: 'b2', purchaseNumber: 'PO-2', purchasedAt: new Date('2026-10-10'), status: 'RECEIVED', supplier: { id: 's1', name: 'Ali Traders' }, shop: null } },
      { id: 'l1', variantId: null, unitName: 'pcs', conversionRate: 1, quantity: 10, baseQuantity: 0, costPrice: 90, total: 900, receivedQty: 10, returnedQty: 2, batchNo: null, expiryDate: null,
        purchase: { id: 'b1', purchaseNumber: 'PO-1', purchasedAt: new Date('2026-10-01'), status: 'RECEIVED', supplier: { id: 's1', name: 'Ali Traders' }, shop: null } },
    ];
    const prisma = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      purchaseItem: {
        findMany: jest.fn((args: { take?: number }) => Promise.resolve(args.take ? recent : recent.map((l) => ({ ...l, purchaseId: l.purchase.id })))),
      },
      purchase: { groupBy: jest.fn().mockResolvedValue([{ supplierId: 's1', _count: { _all: 2 }, _max: { purchasedAt: new Date('2026-10-10') } }]) },
      supplier: { findMany: jest.fn().mockResolvedValue([{ id: 's1', name: 'Ali Traders' }]) },
    };
    const svc = new ProductInsightsService(prisma as never, {} as never);
    const res = await svc.purchases({ tenantId: 't1' } as never, 'p1');
    // 24 from the carton line, 10 from the old line without baseQuantity.
    expect(res.totals).toMatchObject({ qty: 34, amount: 3300, returned: 2, bills: 2, lastCost: 100 });
    expect(res.totals.avgCost).toBeCloseTo(3300 / 34);
    expect(res.suppliers).toEqual([{ id: 's1', name: 'Ali Traders', bills: 2, lastAt: new Date('2026-10-10') }]);
    expect(res.recent[1]).toMatchObject({ baseQuantity: 10, purchaseNumber: 'PO-1' });
  });
});
