/**
 * Sends the queued orders, visits and recoveries to POST /distribution/booker/sync.
 *
 * Each request carries at most `batchSize` (≤ 200) of each kind; the server
 * handles orders, then visits, then collections. A visit made with an order
 * waits until that order has an answer, so its salesOrderClientRef always
 * finds the saved order. Per item:
 * - ok / duplicate: saved; the server id, order number, total and warnings are kept.
 * - conflict: will never be accepted as sent; it goes to the Sync issues list.
 * - error: server trouble; it stays queued and is tried again on the next run.
 */

import { bookerApi, HttpError, isOffline, type Http } from './api';
import { kvSet, type Db } from './db';
import { KV } from './bootstrap';
import type { CollectionPayload, OrderPayload, QueuedCollectionRow, QueuedOrderRow, QueuedVisitRow, SyncResult, VisitPayload } from './types';

export const SYNC_MAX = 200;

export interface SyncRun {
  requests: number;
  sent: number;
  ok: number;
  duplicate: number;
  conflict: number;
  error: number;
  offline: boolean;
  results: SyncResult[];
}

const money = (v: number) => `Rs ${Math.round(v).toLocaleString('en-US')}`;

let running: Promise<SyncRun> | null = null;

/** One sync at a time; a second call while one runs gets the same result. */
export function syncNow(db: Db, http: Http, opts: { batchSize?: number } = {}): Promise<SyncRun> {
  if (!running) running = run(db, http, opts).finally(() => { running = null; });
  return running;
}

async function run(db: Db, http: Http, opts: { batchSize?: number }): Promise<SyncRun> {
  const api = bookerApi(http);
  const size = Math.min(SYNC_MAX, Math.max(1, opts.batchSize ?? SYNC_MAX));
  const out: SyncRun = { requests: 0, sent: 0, ok: 0, duplicate: 0, conflict: 0, error: 0, offline: false, results: [] };
  // Items that failed with a server error are not sent again in the same run.
  const skip = new Set<string>();

  for (let round = 0; round < 100; round++) {
    const notIn = (col: string) => (skip.size ? `AND ${col} NOT IN (${[...skip].map(() => '?').join(',')})` : '');
    const skipParams = [...skip];
    const orders = await db.all<QueuedOrderRow>(
      `SELECT * FROM q_orders WHERE status = 'PENDING' ${notIn('clientRef')} ORDER BY createdAt LIMIT ?`, [...skipParams, size]);
    const visits = await db.all<QueuedVisitRow>(
      `SELECT * FROM q_visits WHERE status = 'PENDING' ${notIn('clientRef')}
         AND (orderClientRef IS NULL
           OR orderClientRef NOT IN (SELECT clientRef FROM q_orders WHERE status = 'PENDING'))
       ORDER BY createdAt LIMIT ?`, [...skipParams, size]);
    const collections = await db.all<QueuedCollectionRow>(
      `SELECT * FROM q_collections WHERE status = 'PENDING' ${notIn('clientRef')} ORDER BY createdAt LIMIT ?`, [...skipParams, size]);
    if (!orders.length && !visits.length && !collections.length) break;

    const body: { orders?: OrderPayload[]; visits?: VisitPayload[]; collections?: CollectionPayload[] } = {};
    if (orders.length) body.orders = orders.map((o) => JSON.parse(o.payload) as OrderPayload);
    if (visits.length) body.visits = visits.map((v) => JSON.parse(v.payload) as VisitPayload);
    if (collections.length) body.collections = collections.map((c) => JSON.parse(c.payload) as CollectionPayload);

    let res;
    try {
      res = await api.sync(body);
    } catch (e) {
      if (isOffline(e)) { out.offline = true; break; }
      throw e instanceof HttpError ? e : new HttpError(500, (e as Error)?.message ?? 'Sync nahi hua');
    }
    out.requests++;
    out.sent += orders.length + visits.length + collections.length;

    const byKey = new Map(res.results.map((r) => [`${r.kind}:${r.clientRef}`, r]));
    const now = new Date().toISOString();
    await db.tx(async () => {
      for (const o of orders) {
        const r = byKey.get(`order:${o.clientRef}`);
        if (!r || r.status === 'error') { skip.add(o.clientRef); await failed(db, 'q_orders', o.clientRef, r?.reason); continue; }
        if (r.status === 'conflict') {
          await conflict(db, 'q_orders', 'order', o.clientRef, o.customerId, `Order (${money(o.localTotal)})`, r.reason, now);
          continue;
        }
        await db.run(
          `UPDATE q_orders SET status = 'SYNCED', serverId = ?, number = ?, serverTotal = ?, orderStatus = ?, warnings = ?, reason = NULL, syncedAt = ?
           WHERE clientRef = ?`,
          [r.id ?? null, r.number ?? null, r.total ?? null, r.orderStatus ?? null, r.warnings?.length ? JSON.stringify(r.warnings) : null, now, o.clientRef],
        );
      }
      for (const v of visits) {
        const r = byKey.get(`visit:${v.clientRef}`);
        if (!r || r.status === 'error') { skip.add(v.clientRef); await failed(db, 'q_visits', v.clientRef, r?.reason); continue; }
        if (r.status === 'conflict') {
          await conflict(db, 'q_visits', 'visit', v.clientRef, v.customerId, 'Visit', r.reason, now);
          continue;
        }
        await db.run(`UPDATE q_visits SET status = 'SYNCED', serverId = ?, warnings = ?, reason = NULL WHERE clientRef = ?`,
          [r.id ?? null, r.warnings?.length ? JSON.stringify(r.warnings) : null, v.clientRef]);
      }
      for (const c of collections) {
        const r = byKey.get(`collection:${c.clientRef}`);
        if (!r || r.status === 'error') { skip.add(c.clientRef); await failed(db, 'q_collections', c.clientRef, r?.reason); continue; }
        if (r.status === 'conflict') {
          await conflict(db, 'q_collections', 'collection', c.clientRef, c.customerId, `Recovery (${money(c.amount)})`, r.reason, now);
          continue;
        }
        await db.run(`UPDATE q_collections SET status = 'SYNCED', serverId = ?, reason = NULL WHERE clientRef = ?`, [r.id ?? null, c.clientRef]);
      }
    });

    for (const r of res.results) {
      out.results.push(r);
      if (r.status === 'ok') out.ok++;
      else if (r.status === 'duplicate') out.duplicate++;
      else if (r.status === 'conflict') out.conflict++;
      else out.error++;
    }
  }

  if (out.requests) await kvSet(db, KV.lastSyncAt, new Date().toISOString());
  return out;
}

type Table = 'q_orders' | 'q_visits' | 'q_collections';

async function failed(db: Db, table: Table, clientRef: string, reason?: string) {
  await db.run(`UPDATE ${table} SET attempts = attempts + 1, reason = ? WHERE clientRef = ?`, [reason ?? null, clientRef]);
}

async function conflict(db: Db, table: Table, kind: 'order' | 'visit' | 'collection', clientRef: string, customerId: string, title: string, reason: string | undefined, now: string) {
  const text = reason || 'Server ne ye entry nahi li';
  await db.run(`UPDATE ${table} SET status = 'CONFLICT', reason = ? WHERE clientRef = ?`, [text, clientRef]);
  await db.run('INSERT INTO sync_issues (kind, clientRef, customerId, title, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [kind, clientRef, customerId, title, text, now]);
}
