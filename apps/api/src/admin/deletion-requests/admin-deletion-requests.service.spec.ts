import { BadRequestException } from '@nestjs/common';
import { AdminDeletionRequestsService, deletionStateFromLogs } from './admin-deletion-requests.service';

const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY);

function build(logs: any[], user: any = { id: 'u1', tenantId: 't1', role: 'CASHIER', email: 'a@b.c' }) {
  const calls: string[] = [];
  const op = (name: string) => jest.fn((args: any) => { calls.push(name); return { name, args }; });
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: op('user.update'), findMany: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]) },
    tenant: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id: 't1', slug: 'shop', status: 'SUSPENDED' }), update: op('tenant.update') },
    session: { deleteMany: op('session.deleteMany') },
    mobileDevice: { updateMany: op('mobileDevice.updateMany') },
    staff: { updateMany: op('staff.updateMany') },
    activityLog: { findMany: jest.fn().mockResolvedValue(logs), create: op('activityLog.create'), updateMany: op('activityLog.updateMany') },
    adminNotification: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { svc: new AdminDeletionRequestsService(prisma), prisma, calls };
}

const req = (d: number, extra: any = {}) => ({ action: 'ACCOUNT_DELETION_REQUESTED', createdAt: ago(d), metadata: null, tenantId: 't1', entityId: 'u1', ...extra });

describe('deletion request state', () => {
  it('is in grace, then due', () => {
    expect(deletionStateFromLogs('USER', [req(5)])!.status).toBe('IN_GRACE');
    expect(deletionStateFromLogs('USER', [req(31)])!.status).toBe('DUE');
  });
  it('latest event wins (cancelled, processed)', () => {
    const c = { ...req(1), action: 'ACCOUNT_DELETION_CANCELLED' };
    expect(deletionStateFromLogs('USER', [req(40), c])!.status).toBe('CANCELLED');
    const p = { ...req(1), action: 'ACCOUNT_DELETION_PROCESSED' };
    expect(deletionStateFromLogs('USER', [req(40), p])!.status).toBe('PROCESSED');
  });
  it('tenant grace is 7 days', () => {
    const t = (d: number) => ({ action: 'TENANT_DELETION_REQUESTED', createdAt: ago(d), metadata: null, tenantId: 't1', entityId: null });
    expect(deletionStateFromLogs('TENANT', [t(3)])!.status).toBe('IN_GRACE');
    expect(deletionStateFromLogs('TENANT', [t(8)])!.status).toBe('DUE');
  });
});

describe('processing a user', () => {
  it('refuses while the grace period is not over and changes nothing', async () => {
    const { svc, prisma } = build([req(5)]);
    await expect(svc.process('admin', 'user:u1')).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('anonymizes personal fields, revokes access, and never touches sales', async () => {
    const { svc, prisma } = build([req(31)]);
    await svc.process('admin', 'user:u1', 'ok');
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      isActive: false, fullName: 'Deleted user', email: 'deleted+u1@nafaa.invalid',
      phone: null, avatarUrl: null, pushTokens: [], passwordHash: null,
    });
    expect(prisma.user.update.mock.calls[0][0].where).toEqual({ id: 'u1' });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(prisma.mobileDevice.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { pushToken: null } });
    const log = prisma.activityLog.create.mock.calls[0][0].data;
    expect(log.action).toBe('ACCOUNT_DELETION_PROCESSED');
    // the user row is updated, never deleted, and no business table is in the transaction
    expect(prisma.user.delete).toBeUndefined();
    expect(prisma.sale).toBeUndefined();
  });

  it('is idempotent once processed', async () => {
    const { svc, prisma } = build([req(40), { ...req(1), action: 'ACCOUNT_DELETION_PROCESSED' }]);
    const r: any = await svc.process('admin', 'user:u1');
    expect(r.alreadyProcessed).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a cancelled request', async () => {
    const { svc } = build([req(40), { ...req(1), action: 'ACCOUNT_DELETION_CANCELLED' }]);
    await expect(svc.process('admin', 'user:u1')).rejects.toThrow(BadRequestException);
  });
});

describe('processing a tenant', () => {
  const t = (d: number, extra: any = {}) => ({ action: 'TENANT_DELETION_REQUESTED', createdAt: ago(d), metadata: null, tenantId: 't1', entityId: null, ...extra });

  it('refuses inside the grace period', async () => {
    const { svc, prisma } = build([t(3)]);
    await expect(svc.process('admin', 'tenant:t1')).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('suspends, anonymizes all users, and marks purge without deleting data', async () => {
    const { svc, prisma } = build([t(8)]);
    const r: any = await svc.process('admin', 'tenant:t1');
    expect(r.usersAnonymized).toBe(2);
    expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'SUSPENDED' } });
    expect(prisma.tenant.delete).toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    const log = prisma.activityLog.create.mock.calls[0][0].data;
    expect(log.action).toBe('TENANT_DELETION_PROCESSED');
    const days = (new Date(log.metadata.purgeAfter).getTime() - Date.now()) / DAY;
    expect(Math.round(days)).toBe(90);
    expect(log.metadata.purgeStatus).toBe('MARKED');
  });

  it('is idempotent once processed', async () => {
    const { svc, prisma } = build([t(20), { ...t(1), action: 'TENANT_DELETION_PROCESSED' }]);
    expect(((await svc.process('admin', 'tenant:t1')) as any).alreadyProcessed).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('daily reminder', () => {
  it('notifies when something is due and never processes', async () => {
    const { svc, prisma } = build([req(31)]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', fullName: 'x', email: 'e', role: 'CASHIER', isActive: true, tenant: { id: 't1', name: 'S' } }]);
    await svc.notifyDue();
    expect(prisma.adminNotification.create).toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
