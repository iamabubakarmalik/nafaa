import { Body, CallHandler, Controller, ExecutionContext, Get, INestApplication, Injectable, NestInterceptor, Post } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import request from 'supertest';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { IdempotencyInterceptor, requestHash, stableJson } from './idempotency.interceptor';
import { IdempotencyService, type IdempotencyClaim, type IdempotencyClaimInput, type IdempotencyStore } from './idempotency.service';

/** Same rules as IdempotencyService, kept in memory. */
class MemoryStore implements IdempotencyStore {
  rows = new Map<string, { id: string; hash: string; status: 'IN_PROGRESS' | 'DONE'; statusCode?: number; body?: unknown }>();
  private seq = 0;

  async claim(i: IdempotencyClaimInput): Promise<IdempotencyClaim> {
    const k = `${i.tenantId}|${i.userId}|${i.key}`;
    const row = this.rows.get(k);
    if (!row) {
      const id = `r${++this.seq}`;
      this.rows.set(k, { id, hash: i.requestHash, status: 'IN_PROGRESS' });
      return { kind: 'claimed', id };
    }
    if (row.hash !== i.requestHash) return { kind: 'mismatch' };
    if (row.status === 'DONE') return { kind: 'replay', statusCode: row.statusCode ?? 200, body: row.body };
    return { kind: 'busy' };
  }

  async complete(id: string, statusCode: number, body: unknown) {
    for (const r of this.rows.values()) if (r.id === id) Object.assign(r, { status: 'DONE', statusCode, body: JSON.parse(JSON.stringify(body ?? null)) });
  }

  async release(id: string) {
    for (const [k, r] of this.rows) if (r.id === id && r.status === 'IN_PROGRESS') this.rows.delete(k);
  }
}

function httpContext(req: Record<string, unknown>) {
  const res = { statusCode: 201, headers: {} as Record<string, string>, status(c: number) { this.statusCode = c; return this; }, setHeader(k: string, v: string) { this.headers[k] = v; } };
  const ctx = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { ctx, res };
}

const user = { id: 'u1', tenantId: 't1' };
const KEY = 'sale-0001-abcdef';

async function run(i: IdempotencyInterceptor, req: Record<string, unknown>, handler: () => unknown) {
  const { ctx, res } = httpContext(req);
  const next: CallHandler = { handle: () => { try { return of(handler()); } catch (e) { return throwError(() => e); } } };
  const out = await i.intercept(ctx, next);
  return { body: await lastValueFrom(out), res };
}

describe('IdempotencyInterceptor', () => {
  let store: MemoryStore;
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    store = new MemoryStore();
    interceptor = new IdempotencyInterceptor(store);
  });

  it('leaves requests without the header untouched', async () => {
    const claim = jest.spyOn(store, 'claim');
    const { body } = await run(interceptor, { method: 'POST', headers: {}, user, body: { a: 1 } }, () => ({ ok: 1 }));
    expect(body).toEqual({ ok: 1 });
    expect(claim).not.toHaveBeenCalled();
  });

  it('ignores the header on reads and before sign-in', async () => {
    const claim = jest.spyOn(store, 'claim');
    await run(interceptor, { method: 'GET', headers: { 'idempotency-key': KEY }, user }, () => 1);
    await run(interceptor, { method: 'POST', headers: { 'idempotency-key': KEY }, body: {} }, () => 1);
    expect(claim).not.toHaveBeenCalled();
  });

  it('refuses a malformed key', async () => {
    const { ctx } = httpContext({ method: 'POST', headers: { 'idempotency-key': 'x' }, user, body: {} });
    expect(() => interceptor.intercept(ctx, { handle: () => of(1) })).toThrow(/Idempotency-Key/);
  });

  it('runs once and replays the stored answer for the same key and body', async () => {
    let calls = 0;
    const req = () => ({ method: 'POST', originalUrl: '/api/sales', headers: { 'idempotency-key': KEY }, user, body: { total: 100, items: [{ q: 1 }] } });
    const first = await run(interceptor, req(), () => ({ id: `s${++calls}` }));
    const second = await run(interceptor, req(), () => ({ id: `s${++calls}` }));
    expect(calls).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(second.res.headers['Idempotent-Replayed']).toBe('true');
    expect(second.res.statusCode).toBe(201);
  });

  it('treats the body with keys in another order as the same request', async () => {
    let calls = 0;
    await run(interceptor, { method: 'POST', originalUrl: '/api/x', headers: { 'idempotency-key': KEY }, user, body: { a: 1, b: 2 } }, () => ++calls);
    await run(interceptor, { method: 'POST', originalUrl: '/api/x', headers: { 'idempotency-key': KEY }, user, body: { b: 2, a: 1 } }, () => ++calls);
    expect(calls).toBe(1);
  });

  it('refuses the same key with a different body (422)', async () => {
    await run(interceptor, { method: 'POST', originalUrl: '/api/sales', headers: { 'idempotency-key': KEY }, user, body: { total: 100 } }, () => 1);
    await expect(run(interceptor, { method: 'POST', originalUrl: '/api/sales', headers: { 'idempotency-key': KEY }, user, body: { total: 200 } }, () => 2))
      .rejects.toMatchObject({ status: 422 });
  });

  it('keeps keys apart per user and per business', async () => {
    let calls = 0;
    const body = { total: 1 };
    await run(interceptor, { method: 'POST', originalUrl: '/api/x', headers: { 'idempotency-key': KEY }, user, body }, () => ++calls);
    await run(interceptor, { method: 'POST', originalUrl: '/api/x', headers: { 'idempotency-key': KEY }, user: { id: 'u2', tenantId: 't1' }, body }, () => ++calls);
    await run(interceptor, { method: 'POST', originalUrl: '/api/x', headers: { 'idempotency-key': KEY }, user: { id: 'u1', tenantId: 't2' }, body }, () => ++calls);
    expect(calls).toBe(3);
  });

  it('answers 409 while the first request is still running', async () => {
    await store.claim({ tenantId: 't1', userId: 'u1', key: KEY, method: 'POST', path: '/api/sales', requestHash: requestHash('POST', '/api/sales', undefined, { a: 1 }) });
    await expect(run(interceptor, { method: 'POST', originalUrl: '/api/sales', headers: { 'idempotency-key': KEY }, user, body: { a: 1 } }, () => 1))
      .rejects.toMatchObject({ status: 409 });
  });

  it('releases the key when the request fails, so a retry runs again', async () => {
    let calls = 0;
    const req = () => ({ method: 'POST', originalUrl: '/api/sales', headers: { 'idempotency-key': KEY }, user, body: { a: 1 } });
    await expect(run(interceptor, req(), () => { calls++; throw new Error('db down'); })).rejects.toThrow('db down');
    const retry = await run(interceptor, req(), () => ({ n: ++calls }));
    expect(retry.body).toEqual({ n: 2 });
    expect(store.rows.size).toBe(1);
  });

  it('includes the branch header in the request hash', () => {
    expect(requestHash('POST', '/x', 'shop-a', {})).not.toBe(requestHash('POST', '/x', 'shop-b', {}));
    expect(stableJson({ b: [1, { d: 1, c: 2 }], a: undefined })).toBe('{"b":[1,{"c":2,"d":1}]}');
  });
});

/* ── End to end through Nest: a resent POST /sales makes one sale ── */

let sales: Array<{ id: string; total: number }> = [];
let delayMs = 0;

@Controller('sales')
class FakeSalesController {
  @Post()
  async create(@Body() body: { total: number }) {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const sale = { id: `sale-${sales.length + 1}`, total: body.total };
    sales.push(sale);
    return sale;
  }

  @Get()
  list() {
    return sales;
  }
}

/** Stands in for the JWT guard: puts the signed-in user on the request. */
@Injectable()
class FakeAuth implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: req.headers['x-user'] ?? 'u1', tenantId: 't1' };
    return next.handle();
  }
}

describe('Idempotency-Key on POST /sales (Nest app)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [FakeSalesController],
      providers: [
        { provide: IdempotencyService, useValue: new MemoryStore() },
        { provide: APP_INTERCEPTOR, useClass: FakeAuth },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      ],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => { sales = []; delayMs = 0; });

  it('a replayed POST /sales creates only one sale and returns the same answer', async () => {
    const body = { total: 450 };
    const a = await request(app.getHttpServer()).post('/sales').set('Idempotency-Key', 'offline-sale-1-aaaa').send(body).expect(201);
    const b = await request(app.getHttpServer()).post('/sales').set('Idempotency-Key', 'offline-sale-1-aaaa').send(body).expect(201);
    expect(sales).toHaveLength(1);
    expect(b.body.data).toEqual(a.body.data);
    expect(b.headers['idempotent-replayed']).toBe('true');
    expect(a.headers['idempotent-replayed']).toBeUndefined();
  });

  it('without the header every POST makes a sale, as before', async () => {
    await request(app.getHttpServer()).post('/sales').send({ total: 1 }).expect(201);
    await request(app.getHttpServer()).post('/sales').send({ total: 1 }).expect(201);
    expect(sales).toHaveLength(2);
  });

  it('two copies sent at once: one runs, the other gets 409, then the replay', async () => {
    delayMs = 150;
    const send = () => request(app.getHttpServer()).post('/sales').set('Idempotency-Key', 'offline-sale-2-bbbb').send({ total: 9 });
    const [x, y] = await Promise.all([send(), send()]);
    expect([x.status, y.status].sort()).toEqual([201, 409]);
    expect(sales).toHaveLength(1);
    const again = await send().expect(201);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(sales).toHaveLength(1);
  });

  it('a different body under a used key is refused with 422', async () => {
    await request(app.getHttpServer()).post('/sales').set('Idempotency-Key', 'offline-sale-3-cccc').send({ total: 1 }).expect(201);
    await request(app.getHttpServer()).post('/sales').set('Idempotency-Key', 'offline-sale-3-cccc').send({ total: 2 }).expect(422);
    expect(sales).toHaveLength(1);
  });
});
