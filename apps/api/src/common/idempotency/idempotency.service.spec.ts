import { IdempotencyService, IDEMPOTENCY_STALE_MS } from './idempotency.service';

const input = { tenantId: 't1', userId: 'u1', key: 'k-12345678', method: 'POST', path: '/api/sales', requestHash: 'h1' };

function prismaMock(existing: Record<string, unknown> | null, inserted: Array<{ id: string }> = []) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(inserted),
    $executeRaw: jest.fn().mockResolvedValue(0),
    idempotencyRecord: {
      findUnique: jest.fn().mockResolvedValue(existing),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1', requestHash: 'h1', status: 'DONE', statusCode: 201, responseBody: { success: true, data: { id: 's1' } },
  lockedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), ...over,
});

describe('IdempotencyService.claim', () => {
  it('claims a new key with one insert', async () => {
    const prisma = prismaMock(null, [{ id: 'new' }]);
    const svc = new IdempotencyService(prisma as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'claimed', id: 'new' });
    expect(prisma.idempotencyRecord.findUnique).not.toHaveBeenCalled();
  });

  it('replays a finished request', async () => {
    const svc = new IdempotencyService(prismaMock(row()) as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'replay', statusCode: 201, body: { success: true, data: { id: 's1' } } });
  });

  it('refuses a different body', async () => {
    const svc = new IdempotencyService(prismaMock(row({ requestHash: 'other' })) as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'mismatch' });
  });

  it('reports busy while the first request runs', async () => {
    const svc = new IdempotencyService(prismaMock(row({ status: 'IN_PROGRESS' })) as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'busy' });
  });

  it('takes over a claim abandoned by a crashed process', async () => {
    const prisma = prismaMock(row({ status: 'IN_PROGRESS', lockedAt: new Date(Date.now() - IDEMPOTENCY_STALE_MS - 1000) }));
    const svc = new IdempotencyService(prisma as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'claimed', id: 'r1' });
  });

  it('drops an expired row and claims again', async () => {
    const prisma = prismaMock(row({ expiresAt: new Date(Date.now() - 1000) }));
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'fresh' }]);
    const svc = new IdempotencyService(prisma as never);
    await expect(svc.claim(input)).resolves.toEqual({ kind: 'claimed', id: 'fresh' });
    expect(prisma.idempotencyRecord.deleteMany).toHaveBeenCalled();
  });

  it('releases instead of storing an oversized answer', async () => {
    const prisma = prismaMock(null);
    const svc = new IdempotencyService(prisma as never);
    await svc.complete('r1', 201, { blob: 'x'.repeat(3 * 1024 * 1024) });
    expect(prisma.idempotencyRecord.update).not.toHaveBeenCalled();
    expect(prisma.idempotencyRecord.deleteMany).toHaveBeenCalledWith({ where: { id: 'r1', status: 'IN_PROGRESS' } });
  });
});
