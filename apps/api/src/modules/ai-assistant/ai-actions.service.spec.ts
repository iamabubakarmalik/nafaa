/**
 * Nafaa AI actions: a proposal is single use, bound to its user, tenant and
 * branch view, expires after 10 minutes, and runs only with the permission.
 */

import { HttpException } from '@nestjs/common';
import { AiActionsService } from './ai-actions.service';
import { ShopScope } from '../../common/shop-scope';

const owner = { id: 'u1', sub: 'u1', email: 'o@x', tenantId: 't1', role: 'OWNER', shopId: null, permissions: [] } as any;
const cashier = { id: 'u2', sub: 'u2', email: 'c@x', tenantId: 't1', role: 'CASHIER', shopId: 's1', permissions: ['pos.use', 'ai.use'] } as any;

function setup() {
  const prisma = {
    customer: { count: jest.fn().mockResolvedValue(0) },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
  } as any;
  const customers = { create: jest.fn().mockResolvedValue({ id: 'c9' }) } as any;
  const none = {} as any;
  const service = new AiActionsService(prisma, none, none, none, customers, none, none, none, none);
  const ctx = (user: any, shopId: string | null) => ({ user, scope: new ShopScope(shopId, !shopId), tz: 'Asia/Karachi', dayStartHour: 0, weekStart: 1, today: '2026-10-26', shopName: 'Dukaan', branchName: null, canProfit: true, drawerHidden: false });
  return { service, prisma, customers, ctx };
}

const status = (p: Promise<unknown>) => p.then(() => 200, (e: HttpException) => e.getStatus());

describe('AiActionsService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('runs a confirmed proposal once through the app service and logs it', async () => {
    const { service, customers, prisma, ctx } = setup();
    const res = await service.propose('propose_create_customer', { name: 'Ali Raza' }, ctx(owner, null) as any);
    expect(res.action?.kind).toBe('create_customer');
    expect(customers.create).not.toHaveBeenCalled();

    const out = await service.confirm(owner, new ShopScope(null, true), res.action!.id, { phone: '03001234567' });
    expect(out.ok).toBe(true);
    expect(customers.create).toHaveBeenCalledTimes(1);
    expect(customers.create.mock.calls[0][2]).toMatchObject({ name: 'Ali Raza', phone: '03001234567' });
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.activityLog.create.mock.calls[0][0].data.description).toContain('via Nafaa AI');

    expect(await status(service.confirm(owner, new ShopScope(null, true), res.action!.id))).toBe(410);
    expect(customers.create).toHaveBeenCalledTimes(1);
  });

  it('rejects another user, another branch view, a cancelled and an expired proposal', async () => {
    const { service, ctx } = setup();
    const a = (await service.propose('propose_create_customer', { name: 'A' }, ctx(owner, null) as any)).action!;
    expect(await status(service.confirm(cashier, new ShopScope('s1', false), a.id))).toBe(410);
    expect(await status(service.confirm(owner, new ShopScope('s2', false), a.id))).toBe(403);

    const b = (await service.propose('propose_create_customer', { name: 'B' }, ctx(owner, null) as any)).action!;
    service.cancel(owner, new ShopScope(null, true), b.id);
    expect(await status(service.confirm(owner, new ShopScope(null, true), b.id))).toBe(410);

    const c = (await service.propose('propose_create_customer', { name: 'C' }, ctx(owner, null) as any)).action!;
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 11 * 60_000);
    expect(await status(service.confirm(owner, new ShopScope(null, true), c.id))).toBe(410);
  });

  it('refuses a proposal the user has no permission for', async () => {
    const { service, ctx } = setup();
    const res = await service.propose('propose_create_customer', { name: 'X' }, ctx(cashier, 's1') as any);
    expect(res.refused).toBe(true);
    expect(res.action).toBeUndefined();
    expect((res.data as any).error).toBe('NO_PERMISSION');
  });

  it('asks only for the missing field', async () => {
    const { service, ctx } = setup();
    const product = await service.propose('propose_create_product', { name: 'Pepsi 1.5L' }, ctx(owner, null) as any);
    expect((product.data as any).need).toEqual(['price']);
    const expense = await service.propose('propose_expense', { amount: 500 }, ctx(owner, null) as any);
    expect((expense.data as any).need).toEqual(['title']);
  });

  it('opens pages but never offers a delete', async () => {
    const { service, ctx } = setup();
    const res = await service.propose('open_page', { page: 'pos' }, ctx(owner, null) as any);
    expect(res.link).toMatchObject({ to: '/pos', primary: true });
    const bad = await service.propose('propose_delete_customer', { name: 'X' }, ctx(owner, null) as any);
    expect(bad.refused).toBe(true);
  });
});
