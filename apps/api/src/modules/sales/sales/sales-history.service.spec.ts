import { SalesHistoryService } from './sales-history.service';

function setup() {
  const calls: Record<string, any[]> = {};
  const rec = (name: string, value: unknown) => jest.fn((args: unknown) => { (calls[name] ??= []).push(args); return Promise.resolve(value); });
  const prisma = {
    sale: {
      findMany: rec('findMany', []),
      count: rec('count', 0),
      aggregate: rec('aggregate', { _sum: { total: 1000, paidAmount: 800, creditAmount: 200, costOfGoods: 600 }, _count: { _all: 4 } }),
      findFirst: rec('findFirst', null),
    },
    saleItem: { aggregate: rec('itemAgg', { _sum: { quantity: 10, returnedQty: 1 }, _count: { _all: 6 } }) },
  };
  const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
  return { svc: new SalesHistoryService(prisma as never, tz as never), calls };
}

const user = { tenantId: 't1' } as never;

describe('SalesHistoryService.list', () => {
  it('uses Karachi business-day bounds and leaves voided bills out of totals', async () => {
    const { svc, calls } = setup();
    const res = await svc.list(user, 'shop1', { from: '2026-10-01', to: '2026-10-10', status: 'all' });
    const where = calls.findMany[0].where;
    // Karachi is UTC+5: 1 Oct 00:00 local = 30 Sep 19:00 UTC; end is 11 Oct 00:00 local.
    expect(where.soldAt.gte.toISOString()).toBe('2026-09-30T19:00:00.000Z');
    expect(where.soldAt.lt.toISOString()).toBe('2026-10-10T19:00:00.000Z');
    expect(where.shopId).toBe('shop1');
    expect(calls.aggregate[0].where.AND[1]).toEqual({ status: { in: ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] } });
    expect(res.stats).toMatchObject({ bills: 4, total: 1000, profit: 400, average: 250, qty: 9 });
  });

  it('"all" has no lower bound; credit filter needs a balance and excludes voided', async () => {
    const { svc, calls } = setup();
    await svc.list(user, undefined, { from: 'all', status: 'credit', search: 'NF-123' });
    const where = calls.findMany[0].where;
    expect(where.soldAt.gte).toBeUndefined();
    expect(where.creditAmount).toEqual({ gt: 0 });
    expect(where.status).toEqual({ not: 'VOIDED' });
    expect(JSON.stringify(where.AND)).toContain('NF-123');
  });

  it('rejects a range that ends before it starts', async () => {
    const { svc } = setup();
    await expect(svc.list(user, undefined, { from: '2026-10-10', to: '2026-10-01' })).rejects.toThrow('from is after to');
  });
});
