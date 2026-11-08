import { addErrors, chunkCount, chunkSize, MAX_JOB_ERRORS, nextChunk, percent } from './catalog-jobs';
import { CatalogJobsService } from './catalog-jobs.service';

describe('catalog job chunking', () => {
  it('walks a 10k list chunk by chunk without missing or repeating an item', () => {
    const items = Array.from({ length: 10_237 }, (_, i) => `p${i}`);
    const size = chunkSize('PUSH', 'SHOPIFY');
    const seen: string[] = [];
    let cursor = 0;
    let rounds = 0;
    for (;;) {
      const { chunk, next, last } = nextChunk(items, cursor, size);
      seen.push(...chunk);
      cursor = next;
      rounds++;
      if (last) break;
    }
    expect(seen).toEqual(items);
    expect(rounds).toBe(chunkCount(items.length, size));
  });

  it('resumes from a saved cursor and copes with a cursor past the end', () => {
    const items = [1, 2, 3, 4, 5];
    expect(nextChunk(items, 3, 2)).toEqual({ chunk: [4, 5], next: 5, last: true });
    expect(nextChunk(items, 99, 2)).toEqual({ chunk: [], next: 5, last: true });
    expect(nextChunk([], 0, 10)).toEqual({ chunk: [], next: 0, last: true });
  });

  it('keeps chunks small for rate-limited channels', () => {
    expect(chunkSize('PUBLISH', 'SHOPIFY')).toBeLessThanOrEqual(10);
    expect(chunkSize('PUSH', 'SHOPIFY')).toBeLessThanOrEqual(chunkSize('PUSH', 'WOOCOMMERCE'));
    expect(chunkSize('LINK_ALL', null)).toBeGreaterThan(chunkSize('IMPORT_ALL', null));
  });

  it('keeps only the first errors and reports progress', () => {
    const many = Array.from({ length: 80 }, (_, i) => `e${i}`);
    expect(addErrors(['x'], many)).toHaveLength(MAX_JOB_ERRORS);
    expect(addErrors(null, ['a'])).toEqual(['a']);
    expect(percent(50, 25, 100)).toBe(75);
    expect(percent(0, 0, 0)).toBe(100);
  });
});

describe('CatalogJobsService', () => {
  /** In-memory stand-in for the catalog_jobs table (only what the service uses). */
  function fakePrisma() {
    const rows: any[] = [];
    const match = (r: any, w: any = {}) => Object.entries(w).every(([k, v]: [string, any]) => {
      if (k === 'OR') return (v as any[]).some((x) => match(r, x));
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('in' in v) return v.in.includes(r[k]);
        if ('notIn' in v) return !v.notIn.includes(r[k]);
        if ('lte' in v) return r[k] !== null && r[k] <= v.lte;
        if ('gte' in v) return r[k] !== null && r[k] >= v.gte;
      }
      return r[k] === v;
    });
    const apply = (r: any, data: any) => {
      for (const [k, v] of Object.entries(data)) r[k] = v && typeof v === 'object' && 'increment' in (v as any) ? r[k] + (v as any).increment : v;
    };
    return {
      rows,
      catalogJob: {
        findFirst: async ({ where }: any) => rows.find((r) => match(r, where)) ?? null,
        findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
        findMany: async ({ where }: any) => rows.filter((r) => match(r, where)),
        create: async ({ data }: any) => {
          const r = { id: `j${rows.length + 1}`, cursor: 0, done: 0, failed: 0, errors: null, heartbeatAt: null, startedAt: null, finishedAt: null, createdAt: new Date(), integrationId: null, ...data };
          rows.push(r);
          return r;
        },
        update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id); apply(r, data); return r; },
        updateMany: async ({ where, data }: any) => {
          const hit = rows.filter((r) => match(r, where));
          hit.forEach((r) => apply(r, data));
          return { count: hit.length };
        },
      },
    };
  }

  it('runs every chunk to the end, counting done and failed, and gives the job back between chunks', async () => {
    const prisma = fakePrisma();
    const svc = new CatalogJobsService(prisma as any);
    const calls: number[][] = [];
    svc.register('LINK_ALL', async (_job, chunk) => {
      calls.push(chunk as number[]);
      return { done: (chunk as number[]).filter((n) => n % 100 !== 0).length, failed: (chunk as number[]).filter((n) => n % 100 === 0).length, errors: ['x'] };
    });
    const items = Array.from({ length: 450 }, (_, i) => i + 1);
    const { job } = await svc.start({ tenantId: 't', kind: 'LINK_ALL', integrationId: 'ch', items });
    expect(job.status).toBe('QUEUED');

    for (let k = 0; k < 10; k++) {
      prisma.rows[0].heartbeatAt = null; // skip the pause between chunks
      await svc.tick();
    }
    const row = prisma.rows[0];
    expect(calls.map((c) => c.length)).toEqual([200, 200, 50]);
    expect(row.status).toBe('DONE');
    expect(row.done + row.failed).toBe(450);
    expect(row.failed).toBe(4);
    expect(row.cursor).toBe(450);
  });

  it('does not start a second job of the same kind on the same channel', async () => {
    const prisma = fakePrisma();
    const svc = new CatalogJobsService(prisma as any);
    const a = await svc.start({ tenantId: 't', kind: 'PUSH', integrationId: 'ch', items: [1] });
    const b = await svc.start({ tenantId: 't', kind: 'PUSH', integrationId: 'ch', items: [2] });
    expect(b.existing).toBe(true);
    expect(b.job.id).toBe(a.job.id);
  });

  it('an empty work list is done at once; a cancelled job stops', async () => {
    const prisma = fakePrisma();
    const svc = new CatalogJobsService(prisma as any);
    const empty = await svc.start({ tenantId: 't', kind: 'IMPORT_ALL', integrationId: 'a', items: [] });
    expect(empty.job.status).toBe('DONE');
    let ran = 0;
    svc.register('PUSH', async () => { ran++; return { done: 1, failed: 0 }; });
    const { job } = await svc.start({ tenantId: 't', kind: 'PUSH', integrationId: 'b', items: [1, 2, 3] });
    await svc.cancel('t', job.id);
    await svc.tick();
    expect(ran).toBe(0);
  });

  it('a chunk that throws counts as failed and the job carries on', async () => {
    const prisma = fakePrisma();
    const svc = new CatalogJobsService(prisma as any);
    let n = 0;
    svc.register('IMPORT_ALL', async (_j, chunk) => { if (n++ === 0) throw new Error('rate limit'); return { done: chunk.length, failed: 0 }; });
    await svc.start({ tenantId: 't', kind: 'IMPORT_ALL', integrationId: 'c', items: Array.from({ length: 30 }, (_, i) => i) });
    for (let k = 0; k < 3; k++) { prisma.rows[0].heartbeatAt = null; await svc.tick(); }
    expect(prisma.rows[0]).toMatchObject({ status: 'DONE', done: 5, failed: 25 });
    expect(prisma.rows[0].errors).toEqual(['rate limit']);
  });
});
