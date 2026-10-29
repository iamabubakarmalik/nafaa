/**
 * Sends waiting invoice reports and trip recoveries to POST
 * /distribution/delivery/sync, at most 200 of each per request. Per item:
 * ok / duplicate: saved. conflict: refused for good, listed under Sync
 * issues. error: server trouble, tried again on the next run.
 */

import { HttpError, isOffline, type Http } from '../../booker/core/api';
import { kvSet, type Db } from '../../booker/core/db';
import { deliveryApi } from './api';
import { DKV } from './db';
import type { QueuedRecovery, QueuedReport, RecoveryPayload, ReportPayload } from './types';

export const SYNC_MAX = 200;

export interface DeliverySyncRun { requests: number; ok: number; conflict: number; error: number; offline: boolean }

const money = (v: number) => `Rs ${Math.round(v).toLocaleString('en-US')}`;

let running: Promise<DeliverySyncRun> | null = null;

export function syncDelivery(db: Db, http: Http): Promise<DeliverySyncRun> {
  if (!running) running = run(db, http).finally(() => { running = null; });
  return running;
}

async function run(db: Db, http: Http): Promise<DeliverySyncRun> {
  const api = deliveryApi(http);
  const out: DeliverySyncRun = { requests: 0, ok: 0, conflict: 0, error: 0, offline: false };
  const skip = new Set<string>();

  for (let round = 0; round < 50; round++) {
    const notIn = skip.size ? `AND clientRef NOT IN (${[...skip].map(() => '?').join(',')})` : '';
    const reports = await db.all<QueuedReport>(`SELECT * FROM q_reports WHERE status = 'PENDING' ${notIn} ORDER BY createdAt LIMIT ?`, [...skip, SYNC_MAX]);
    const recoveries = await db.all<QueuedRecovery>(`SELECT * FROM q_recoveries WHERE status = 'PENDING' ${notIn} ORDER BY createdAt LIMIT ?`, [...skip, SYNC_MAX]);
    if (!reports.length && !recoveries.length) break;

    let res;
    try {
      res = await api.sync({
        ...(reports.length ? { reports: reports.map((r) => JSON.parse(r.payload) as ReportPayload) } : {}),
        ...(recoveries.length ? { recoveries: recoveries.map((r) => JSON.parse(r.payload) as RecoveryPayload) } : {}),
      });
    } catch (e) {
      if (isOffline(e)) { out.offline = true; break; }
      throw e instanceof HttpError ? e : new HttpError(500, (e as Error)?.message ?? 'Sync nahi hua');
    }
    out.requests++;
    const byKey = new Map(res.results.map((r) => [`${r.kind}:${r.clientRef}`, r]));
    const now = new Date().toISOString();
    await db.tx(async () => {
      for (const q of reports) {
        const r = byKey.get(`report:${q.clientRef}`);
        if (!r || r.status === 'error') {
          skip.add(q.clientRef); out.error++;
          await db.run('UPDATE q_reports SET attempts = attempts + 1, reason = ? WHERE clientRef = ?', [r?.reason ?? null, q.clientRef]);
          continue;
        }
        if (r.status === 'conflict') {
          out.conflict++;
          const p = JSON.parse(q.payload) as ReportPayload;
          await issue(db, 'q_reports', 'report', q.clientRef, q.orderId, `Delivery report (${p.outcome === 'DELIVERED' ? 'deliver' : p.outcome === 'PARTIAL' ? 'kuch wapas' : 'sab wapas'})`, r.reason, now);
          continue;
        }
        out.ok++;
        await db.run(`UPDATE q_reports SET status = 'SYNCED', reason = NULL, syncedAt = ? WHERE clientRef = ?`, [now, q.clientRef]);
      }
      for (const q of recoveries) {
        const r = byKey.get(`recovery:${q.clientRef}`);
        if (!r || r.status === 'error') {
          skip.add(q.clientRef); out.error++;
          await db.run('UPDATE q_recoveries SET attempts = attempts + 1, reason = ? WHERE clientRef = ?', [r?.reason ?? null, q.clientRef]);
          continue;
        }
        if (r.status === 'conflict') {
          out.conflict++;
          await issue(db, 'q_recoveries', 'recovery', q.clientRef, null, `Recovery (${money(q.amount)})`, r.reason, now);
          continue;
        }
        out.ok++;
        await db.run(`UPDATE q_recoveries SET status = 'SYNCED', serverId = ?, reason = NULL WHERE clientRef = ?`, [r.id ?? null, q.clientRef]);
      }
    });
  }
  if (out.requests) await kvSet(db, DKV.lastSyncAt, new Date().toISOString());
  return out;
}

async function issue(db: Db, table: 'q_reports' | 'q_recoveries', kind: 'report' | 'recovery', clientRef: string, orderId: string | null, title: string, reason: string | undefined, now: string) {
  const text = reason || 'Server ne ye entry nahi li';
  await db.run(`UPDATE ${table} SET status = 'CONFLICT', reason = ? WHERE clientRef = ?`, [text, clientRef]);
  await db.run('INSERT INTO sync_issues (kind, clientRef, orderId, title, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [kind, clientRef, orderId, title, text, now]);
}
