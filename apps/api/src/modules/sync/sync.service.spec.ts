import { ForbiddenException } from '@nestjs/common';
import { ShopScope } from '../../common/shop-scope';
import { afterCursor, decodeCursor, encodeCursor, sinceOf, SyncService, SYNC_OVERLAP_MS } from './sync.service';

const tz = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };

function prismaMock() {
  return {
    product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    shopStock: { findMany: jest.fn().mockResolvedValue([]) },
    customer: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    customerLedger: { findMany: jest.fn().mockResolvedValue([]) },
    sale: { findMany: jest.fn().mockResolvedValue([]) },
    shop: { findMany: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]) },
    tenantSettings: { findUnique: jest.fn().mockResolvedValue({ managerPin: 'hash', allowNegativeStock: false }) },
    category: { findMany: jest.fn().mockResolvedValue([]) },
    brand: { findMany: jest.fn().mockResolvedValue([]) },
    expenseCategory: { findMany: jest.fn().mockResolvedValue([]) },
    otherIncomeCategory: { findMany: jest.fn().mockResolvedValue([]) },
    commissionEnrollment: { findMany: jest.fn().mockResolvedValue([]) },
    staff: { findMany: jest.fn().mockResolvedValue([]) },
    cashRegister: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

const owner = { id: 'u1', sub: 'u1', tenantId: 't1', email: 'o@x', role: 'OWNER', shopId: null, permissions: [] } as never;
const cashier = (perms: string[], shopId = 's1') => ({ id: 'u2', sub: 'u2', tenantId: 't1', email: 'c@x', role: 'CASHIER', shopId, permissions: perms }) as never;
const all = new ShopScope(null, true);

describe('sync cursors', () => {
  it('round-trips and rejects junk', () => {
    const c = { t: '2026-11-02T10:00:00.000Z', id: 'abc' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor('not-base64-json')).toBeNull();
    expect(decodeCursor(Buffer.from('{"t":"x","id":"1"}').toString('base64url'))).toBeNull();
  });

  it('pages strictly after (updatedAt, id)', () => {
    const where = afterCursor({ t: '2026-11-02T10:00:00.000Z', id: 'abc' });
    expect(where).toEqual([{ OR: [{ updatedAt: { gt: new Date('2026-11-02T10:00:00.000Z') } }, { updatedAt: new Date('2026-11-02T10:00:00.000Z'), id: { gt: 'abc' } }] }]);
  });

  it('moves updatedSince back by the overlap', () => {
    expect(sinceOf('2026-11-02T10:00:00.000Z')!.getTime()).toBe(Date.parse('2026-11-02T10:00:00.000Z') - SYNC_OVERLAP_MS);
    expect(sinceOf(undefined)).toBeNull();
  });
});

describe('SyncService.pull', () => {
  it('full product download: active only, keyset order, next cursor on a full page', async () => {
    const prisma = prismaMock();
    const t = new Date('2026-11-02T10:00:00.000Z');
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', updatedAt: t, category: { name: 'C', color: '#fff' }, brand: null, images: [], variants: [], units: [] },
      { id: 'p2', updatedAt: t, category: null, brand: { name: 'B' }, images: [{ url: 'u' }], variants: [], units: [] },
    ]);
    const svc = new SyncService(prisma as never, tz as never);
    const page = await svc.pull(owner, all, { entity: 'products', limit: 2 });
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ tenantId: 't1', isActive: true });
    expect(args.orderBy).toEqual([{ updatedAt: 'asc' }, { id: 'asc' }]);
    expect(page.items[0]).toMatchObject({ id: 'p1', categoryName: 'C', brandName: null, imageUrl: null });
    expect(page.items[1]).toMatchObject({ brandName: 'B', imageUrl: 'u' });
    expect(decodeCursor(page.nextCursor!)).toEqual({ t: t.toISOString(), id: 'p2' });
  });

  it('delta product download includes switched-off rows and variant or pack edits', async () => {
    const prisma = prismaMock();
    const svc = new SyncService(prisma as never, tz as never);
    await svc.pull(owner, all, { entity: 'products', updatedSince: '2026-11-02T10:00:00.000Z' });
    const where = prisma.product.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBeUndefined();
    expect(JSON.stringify(where.AND[0])).toContain('variants');
    expect(JSON.stringify(where.AND[0])).toContain('units');
  });

  it('a cashier gets products with pos.use but not customers without customers.view', async () => {
    const prisma = prismaMock();
    const svc = new SyncService(prisma as never, tz as never);
    await expect(svc.pull(cashier(['pos.use']), all, { entity: 'products' })).resolves.toBeTruthy();
    await expect(svc.pull(cashier(['pos.use']), all, { entity: 'customers' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.pull(cashier([]), all, { entity: 'stock' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('branch stock: staff get their own branch, owners all branches', async () => {
    const prisma = prismaMock();
    const svc = new SyncService(prisma as never, tz as never);
    await svc.pull(cashier(['pos.use'], 's2'), all, { entity: 'stock' });
    expect(prisma.shopStock.findMany.mock.calls[0][0].where.shopId).toEqual({ in: ['s2'] });
    await svc.pull(owner, all, { entity: 'stock' });
    expect(prisma.shopStock.findMany.mock.calls[1][0].where.shopId).toEqual({ in: ['s1', 's2'] });
  });

  it('customers without khata.view come without balances', async () => {
    const prisma = prismaMock();
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1', balance: 500, creditLimit: 1000, creditDays: 10, updatedAt: new Date() }]);
    const svc = new SyncService(prisma as never, tz as never);
    const page = await svc.pull(cashier(['customers.view']), all, { entity: 'customers' });
    expect(page.items[0]).toMatchObject({ id: 'c1', balance: undefined, creditLimit: undefined });
    expect(prisma.customerLedger.findMany).not.toHaveBeenCalled();
  });

  it('customers with khata.view get the oldest unpaid credit date', async () => {
    const prisma = prismaMock();
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1', balance: 300, creditLimit: 0, updatedAt: new Date() }]);
    prisma.customerLedger.findMany.mockResolvedValue([
      { customerId: 'c1', amount: 200, createdAt: new Date('2026-10-01') },
      { customerId: 'c1', amount: 300, createdAt: new Date('2026-10-05') },
      { customerId: 'c1', amount: -200, createdAt: new Date('2026-10-06') },
    ]);
    const svc = new SyncService(prisma as never, tz as never);
    const page = await svc.pull(cashier(['customers.view', 'khata.view']), all, { entity: 'customers' });
    expect(page.items[0].oldestDueAt).toEqual(new Date('2026-10-05'));
  });

  it('manifest never sends the manager PIN', async () => {
    const prisma = prismaMock();
    const svc = new SyncService(prisma as never, tz as never);
    const m = (await svc.pull(owner, all, {})) as { settings: Record<string, unknown> };
    expect(m.settings.managerPin).toBeUndefined();
    expect(m.settings.hasManagerPin).toBe(true);
  });

  it('ids: lists live ids page by page', async () => {
    const prisma = prismaMock();
    prisma.product.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const svc = new SyncService(prisma as never, tz as never);
    const page = await svc.pull(owner, all, { entity: 'ids', of: 'products', limit: 2, cursor: 'x' });
    expect(prisma.product.findMany.mock.calls[0][0].where).toMatchObject({ tenantId: 't1', isActive: true, id: { gt: 'x' } });
    expect(page).toMatchObject({ items: ['a', 'b'], nextCursor: 'b' });
  });
});
