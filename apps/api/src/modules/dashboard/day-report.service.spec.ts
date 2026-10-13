import { DayReportService } from './day-report.service';

const agg = (sum: Record<string, number>, count = 0) => ({ _sum: sum, _count: { _all: count } });

function setup() {
  const prisma = {
    sale: {
      aggregate: jest.fn()
        .mockResolvedValueOnce(agg({ total: 14460, paidAmount: 14460, changeAmount: 0, creditAmount: 0, discount: 0 }, 12))
        .mockResolvedValueOnce(agg({ total: 12000 }, 10)),
      groupBy: jest.fn()
        .mockResolvedValueOnce([
          { paymentMethod: 'CASH', ...agg({ total: 9760, paidAmount: 9760 }, 8) },
          { paymentMethod: 'JAZZCASH', ...agg({ total: 4700, paidAmount: 4700 }, 4) },
        ])
        .mockResolvedValueOnce([{ soldById: 'u1', createdById: 'u2', ...agg({ total: 14460 }, 12) }]),
    },
    saleItem: {
      groupBy: jest.fn().mockResolvedValue([
        { productId: 'p1', ...agg({ quantity: 11, returnedQty: 0, total: 5500 }, 5) },
        { productId: 'p2', ...agg({ quantity: 13, returnedQty: 0, total: 3900 }, 6) },
        { productId: 'p3', ...agg({ quantity: 4, returnedQty: 0, total: 5060 }, 2) },
      ]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', name: 'Kinder cookie', sku: null, unit: 'pcs', category: { id: 'c1', name: 'Cookies', color: null } },
        { id: 'p2', name: 'Pistachio cookie', sku: null, unit: 'pcs', category: { id: 'c1', name: 'Cookies', color: null } },
        { id: 'p3', name: 'Classic tin', sku: null, unit: 'pcs', category: { id: 'c2', name: 'Tins', color: null } },
      ]),
    },
    expense: { findMany: jest.fn().mockResolvedValue([{ id: 'e1', title: 'Milk', amount: 2300, paymentMethod: 'CASH', category: null }]) },
    saleReturn: { groupBy: jest.fn().mockResolvedValue([]) },
    cashRegister: {
      findMany: jest.fn().mockResolvedValue([{ status: 'OPEN', openingBalance: 30000, closingBalance: 0, difference: 0, totalCashIn: 0, totalCashOut: 0 }]),
    },
    purchase: { aggregate: jest.fn().mockResolvedValue(agg({ paidAmount: 0 })) },
    supplierLedger: { aggregate: jest.fn().mockResolvedValue(agg({ amount: 0 })) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', fullName: 'Ali' }]) },
    // Day-close cost: the day's bills, then goods returned in the day.
    $queryRaw: jest.fn().mockResolvedValueOnce([{ cost: 8000 }]).mockResolvedValueOnce([{ cost: 0 }]),
  };
  const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
  return new DayReportService(prisma as never, tz as never);
}

describe('DayReportService', () => {
  const user = { tenantId: 't1' } as never;

  it('builds the end-of-day sheet', async () => {
    const r = await setup().report(user, undefined, '2026-10-10');
    expect(r.cashCollected).toBe(9760);
    expect(r.onlineCollected).toBe(4700);
    expect(r.cash.opening).toBe(30000);
    // 30,000 opening + 9,760 cash sales − 2,300 cash expense
    expect(r.cash.expectedClosing).toBe(37460);
    expect(r.cash.countedClosing).toBeNull();
    expect(r.categories.map((c) => [c.name, c.qty])).toEqual([['Cookies', 24], ['Tins', 4]]);
    expect(r.sales.itemsSold).toBe(28);
    expect(r.sales.grossProfit).toBe(6460);
    expect(r.staff).toEqual([{ userId: 'u1', name: 'Ali', total: 14460, bills: 12 }]);
  });

  it('rejects bad and future dates', async () => {
    await expect(setup().report(user, undefined, '10-10-2026')).rejects.toThrow('YYYY-MM-DD');
    await expect(setup().report(user, undefined, '2999-01-01')).rejects.toThrow('Future');
  });
});
