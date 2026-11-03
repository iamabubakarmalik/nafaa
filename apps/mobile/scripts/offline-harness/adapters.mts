/**
 * Node adapters for the offline engine: node:sqlite for the database and
 * fetch for the API, plus switches to simulate no internet and a lost answer.
 */

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { HttpError, type Db, type Http, type HttpRequest, type HttpResponse, type SqlValue } from '../../src/core/offline/engine/types.ts';
import { lockedDb, type RawDb } from '../../src/core/offline/engine/lockedDb.ts';

export function nodeDb(file = ':memory:'): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(file);
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  const stmts = new Map<string, ReturnType<DatabaseSync['prepare']>>();
  const prep = (sql: string) => {
    let s = stmts.get(sql);
    if (!s) { s = raw.prepare(sql); stmts.set(sql, s); }
    return s;
  };
  const conn: RawDb = {
    exec: async (sql) => { raw.exec(sql); },
    run: async (sql, params: SqlValue[] = []) => { prep(sql).run(...params); },
    all: async <T,>(sql: string, params: SqlValue[] = []) => prep(sql).all(...params) as T[],
    first: async <T,>(sql: string, params: SqlValue[] = []) => (prep(sql).get(...params) as T | undefined) ?? null,
    many: async (sql, rows) => { const s = prep(sql); for (const r of rows) s.run(...r); },
  };
  return Object.assign(lockedDb(conn), { raw });
}

export interface TestHttp extends Http {
  offline: boolean;
  /** Paths (method + path prefix) whose next answers are dropped after the server handled them. */
  dropAnswers: Array<{ method: string; path: string; times: number }>;
  calls: Array<{ method: string; path: string; status: number; replayed: boolean; key?: string }>;
  token: string | null;
  shopId: string | null;
  login(email: string, password: string): Promise<void>;
  raw<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

export function fetchHttp(base = 'http://localhost:4000/api'): TestHttp {
  const http: TestHttp = {
    offline: false,
    dropAnswers: [],
    calls: [],
    token: null,
    shopId: null,
    async login(email, password) {
      const res = await http.raw<{ accessToken: string }>({ method: 'POST', path: '/auth/login', body: { email, password } });
      http.token = res.data.accessToken;
    },
    async raw<T>(req: HttpRequest): Promise<HttpResponse<T>> {
      const qs = req.params ? `?${new URLSearchParams(Object.entries(req.params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}` : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (http.token) headers.Authorization = `Bearer ${http.token}`;
      const shop = req.shopId ?? http.shopId;
      if (shop) headers['x-shop-id'] = shop;
      if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;
      let res: Response;
      try {
        res = await fetch(`${base}${req.path}${qs}`, { method: req.method, headers, body: req.body === undefined ? undefined : JSON.stringify(req.body) });
      } catch (e) {
        throw new HttpError(0, (e as Error).message);
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      const replayed = res.headers.get('idempotent-replayed') === 'true';
      http.calls.push({ method: req.method, path: req.path, status: res.status, replayed, key: req.idempotencyKey });
      if (!res.ok) throw new HttpError(res.status, json?.message ?? res.statusText, json);
      return { status: res.status, data: (json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json) as T, replayed };
    },
    async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
      if (http.offline) throw new HttpError(0, 'Network request failed');
      const res = await http.raw<T>(req);
      const drop = http.dropAnswers.find((d) => d.times > 0 && d.method === req.method && req.path.startsWith(d.path));
      if (drop) {
        drop.times--;
        // The server did the work; the phone never hears back.
        throw new HttpError(0, 'timeout of 30000ms exceeded');
      }
      return res;
    },
  };
  return http;
}

export const uuid = () => randomUUID();
