import * as crypto from 'crypto';
import { ApiKeysService } from './api-keys.service';
import { WebhooksService } from './webhooks.service';

/** SystemSetting ka chhota sa in-memory nakal + khali business tables */
function fakePrisma(data: { sales?: any[] } = {}) {
  const kv = new Map<string, string>();
  const systemSetting = {
    findUnique: async ({ where }: any) => (kv.has(where.key) ? { key: where.key, value: kv.get(where.key) } : null),
    findMany: async ({ where }: any) => [...kv.entries()]
      .filter(([k]) => (where.key.in ? where.key.in.includes(k) : k.startsWith(where.key.startsWith)))
      .map(([key, value]) => ({ key, value })),
    upsert: async ({ where, create, update }: any) => { kv.set(where.key, (kv.has(where.key) ? update : create).value); },
    deleteMany: async ({ where }: any) => { kv.delete(where.key); },
  };
  const inWin = (t: Date, w: any) => t > w.gt && t <= w.lte;
  return {
    kv,
    systemSetting,
    shop: { findFirst: async () => ({ id: 'shop1' }) },
    sale: { findMany: async ({ where }: any) => (data.sales ?? []).filter((s) => inWin(s.createdAt, where.createdAt)) },
    customer: { findMany: async () => [] },
    channelOrder: { findMany: async () => [] },
    shopStock: { findMany: async () => [], fields: { lowStockAlert: 'lowStockAlert' } },
  } as any;
}

const owner = { id: 'u1', tenantId: 't1', role: 'OWNER', shopId: null, permissions: [] } as any;
const req = (key: string) => ({ headers: { authorization: `Bearer ${key}` } }) as any;

describe('ApiKeysService', () => {
  it('bani hui key se pehchan, ghalat / hatayi hui key se inkaar', async () => {
    const prisma = fakePrisma();
    const svc = new ApiKeysService(prisma);
    const { key, id } = await svc.create(owner, { name: 'Zapier' });
    expect(key).toMatch(/^nfk_[a-f0-9]{12}_/);
    // Sirf hash mehfooz — asli secret DB me nahi
    expect([...prisma.kv.values()].join()).not.toContain(key.split('_').slice(2).join('_'));

    await expect(svc.authenticate(req(key))).resolves.toMatchObject({ tenantId: 't1', scope: 'read' });
    await expect(svc.authenticate(req(key.slice(0, -2) + 'xx'))).rejects.toThrow();
    await expect(svc.authenticate(req(key), 'write')).rejects.toThrow(/read/);

    await svc.revoke(owner, id);
    await expect(svc.authenticate(req(key))).rejects.toThrow();
    expect(await svc.list('t1')).toEqual([]);
  });

  it('cashier key nahi bana sakta', async () => {
    const svc = new ApiKeysService(fakePrisma());
    await expect(svc.create({ ...owner, role: 'CASHIER' }, { name: 'x' })).rejects.toThrow(/malik/);
  });
});

describe('WebhooksService', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('nayi sale ek hi dafa, sahi signature ke saath; fail par retry qatar', async () => {
    const sale = { id: 's1', saleNumber: 'S-1', createdAt: new Date(Date.now() - 10_000), soldAt: new Date(), total: 500, items: [] };
    const prisma = fakePrisma({ sales: [sale] });
    const svc = new WebhooksService(prisma);
    const { secret, id } = await svc.create('t1', { url: 'https://example.com/hook', events: ['sale.created'] });
    // Cursor sale se pehle ka
    prisma.kv.set('webhooks_cursor:t1', JSON.stringify({ at: new Date(Date.now() - 60_000).toISOString(), seen: {} }));

    const calls: Array<{ headers: any; body: string }> = [];
    global.fetch = (async (_u: string, o: any) => { calls.push({ headers: o.headers, body: o.body }); return { ok: true, status: 200 }; }) as any;

    await svc.tick();
    await svc.tick();
    expect(calls).toHaveLength(1); // dobara nahi
    const { headers, body } = calls[0];
    expect(JSON.parse(body)).toMatchObject({ id: 'sale.created:s1', type: 'sale.created', data: { number: 'S-1' } });
    const [, t, v1] = headers['X-Nafaa-Signature'].match(/^t=(\d+),v1=([a-f0-9]+)$/);
    expect(v1).toBe(crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex'));

    // Ab server band — naya waqia retry me jaye
    const sale2 = { ...sale, id: 's2', saleNumber: 'S-2', createdAt: new Date(Date.now() - 5_000) };
    const p2 = fakePrisma({ sales: [sale2] });
    for (const [k, v] of prisma.kv) p2.kv.set(k, v);
    const svc2 = new WebhooksService(p2);
    global.fetch = (async () => ({ ok: false, status: 500 })) as any;
    await svc2.tick();
    const retry = JSON.parse(p2.kv.get('webhooks_retry:t1')!);
    expect(retry).toHaveLength(1);
    expect(retry[0]).toMatchObject({ endpointId: id, attempts: 1 });
    const ep = JSON.parse(p2.kv.get('webhooks:t1')!)[0];
    expect(ep.failCount).toBe(1);
  });

  it('andar ka / http URL nahi leta (production)', async () => {
    const svc = new WebhooksService(fakePrisma());
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(svc.create('t1', { url: 'http://example.com' })).rejects.toThrow(/https/);
      await expect(svc.create('t1', { url: 'https://169.254.169.254/x' })).rejects.toThrow(/private/);
      await expect(svc.create('t1', { url: 'https://example.com', events: ['nope'] })).rejects.toThrow(/nahi hote/);
    } finally { process.env.NODE_ENV = env; }
  });
});
