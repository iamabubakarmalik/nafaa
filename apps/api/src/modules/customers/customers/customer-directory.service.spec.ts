import { CustomerDirectoryService, oldestUnpaid, phoneDigits } from './customer-directory.service';

const d = (s: string) => new Date(`${s}T10:00:00Z`);

describe('oldestUnpaid', () => {
  it('settles payments against the oldest credit first', () => {
    // 500 on 1st, 300 on 5th, paid 600 on 10th → 200 of the 5th is still owed.
    expect(oldestUnpaid([
      { amount: 500, createdAt: d('2026-09-01') }, { amount: 300, createdAt: d('2026-09-05') }, { amount: -600, createdAt: d('2026-09-10') },
    ])).toEqual(d('2026-09-05'));
  });
  it('uses advance paid before the credit', () => {
    expect(oldestUnpaid([{ amount: -100, createdAt: d('2026-09-01') }, { amount: 100, createdAt: d('2026-09-02') }])).toBeNull();
  });
});

describe('phoneDigits', () => {
  it('matches saved and typed formats', () => {
    expect(phoneDigits('0300-1234567')).toBe('03001234567');
    expect(phoneDigits('+92 300 1234567')).toBe('03001234567');
  });
});

describe('CustomerDirectoryService.list', () => {
  const customers = [
    { id: 'a', name: 'Ali', phone: '0300-1234567', email: null, cnic: null, city: 'Lahore', area: null, gender: null, dateOfBirth: null, avatarUrl: null, creditLimit: 1000, balance: 1500, loyaltyPoints: 0, isActive: true, isVip: true, createdAt: d('2026-01-01'), shopId: 's1' },
    { id: 'b', name: 'Bilal', phone: null, email: null, cnic: null, city: 'Karachi', area: null, gender: null, dateOfBirth: null, avatarUrl: null, creditLimit: 0, balance: -200, loyaltyPoints: 0, isActive: true, isVip: false, createdAt: d('2026-02-01'), shopId: 's1' },
    { id: 'c', name: 'Chand', phone: null, email: null, cnic: null, city: null, area: null, gender: null, dateOfBirth: null, avatarUrl: null, creditLimit: 0, balance: 0, loyaltyPoints: 0, isActive: false, isVip: false, createdAt: d('2026-03-01'), shopId: 's1' },
  ];
  const prisma = {
    customer: { findMany: jest.fn().mockResolvedValue(customers) },
    sale: { groupBy: jest.fn().mockResolvedValue([{ customerId: 'a', _count: { _all: 4 }, _sum: { total: 4000 }, _max: { soldAt: new Date() }, _min: { soldAt: d('2026-01-02') } }]) },
    customerLedger: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([{ customerId: 'a', amount: 1500, createdAt: new Date(Date.now() - 40 * 86_400_000) }]) },
  };
  const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
  const svc = new CustomerDirectoryService(prisma as never, tz as never);
  const user = { tenantId: 't1' } as never;
  const scope = { shopId: null, where: {}, isAll: true } as never;

  it('totals receivable and advance over all active customers, with credit age', async () => {
    const res = await svc.list(user, scope, {});
    expect(res.count).toBe(2);
    expect(res.stats).toMatchObject({ total: 2, inactive: 1, receivable: 1500, owingCount: 1, advance: 200, advanceCount: 1, overLimit: 1, never: 1 });
    expect(res.stats.aging.d30).toEqual({ count: 1, amount: 1500 });
    expect(res.items.find((i) => i.id === 'a')).toMatchObject({ visits: 4, average: 1000, dueDays: 40 });
  });

  it('finds a customer by phone in any format and filters by type', async () => {
    expect((await svc.list(user, scope, { search: '+923001234567' })).items.map((i) => i.id)).toEqual(['a']);
    expect((await svc.list(user, scope, { type: 'advance' })).items.map((i) => i.id)).toEqual(['b']);
    expect((await svc.list(user, scope, { status: 'inactive' })).items.map((i) => i.id)).toEqual(['c']);
  });
});

describe('CustomerDirectoryService.list with a period', () => {
  const customers = [
    { id: 'a', name: 'Ali', phone: null, email: null, cnic: null, city: null, area: null, gender: null, dateOfBirth: null, avatarUrl: null, creditLimit: 0, balance: 500, loyaltyPoints: 0, isActive: true, isVip: false, createdAt: new Date('2026-01-01'), shopId: null },
    { id: 'b', name: 'Bilal', phone: null, email: null, cnic: null, city: null, area: null, gender: null, dateOfBirth: null, avatarUrl: null, creditLimit: 0, balance: 0, loyaltyPoints: 0, isActive: true, isVip: false, createdAt: new Date('2026-10-05T10:00:00Z'), shopId: null },
  ];
  const sale = jest.fn((args: { where: { soldAt?: unknown } }) => Promise.resolve(args.where.soldAt ? [{ customerId: 'a', _count: { _all: 2 }, _sum: { total: 900 } }] : []));
  const ledgerGroup = jest.fn((args: { by: string[] }) => Promise.resolve(args.by.includes('type')
    ? [{ customerId: 'a', type: 'SALE_CREDIT', _sum: { amount: 700 } }, { customerId: 'a', type: 'PAYMENT_RECEIVED', _sum: { amount: -200 } }]
    : []));
  const prisma = {
    customer: { findMany: jest.fn().mockResolvedValue(customers) },
    sale: { groupBy: sale },
    customerLedger: { groupBy: ledgerGroup, findMany: jest.fn().mockResolvedValue([]) },
  };
  const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
  const svc = new CustomerDirectoryService(prisma as never, tz as never);
  const user = { tenantId: 't1' } as never;
  const scope = { shopId: null, where: {}, isAll: true } as never;

  it('filters on purchases, joining or khata activity in the period and totals it', async () => {
    const q = { from: '2026-10-01', to: '2026-10-11' };
    const bought = await svc.list(user, scope, q);
    expect(bought.items.map((i) => i.id)).toEqual(['a']);
    expect(bought.period).toMatchObject({ visits: 2, spent: 900, buyers: 1, credit: 700, paid: 200, joined: 1 });
    expect((await svc.list(user, scope, { ...q, dateOn: 'joined' })).items.map((i) => i.id)).toEqual(['b']);
    expect((await svc.list(user, scope, { ...q, dateOn: 'khata' })).items[0].period).toEqual({ visits: 2, spent: 900, credit: 700, paid: 200 });
  });
});
