/**
 * Reads and writes of the delivery database. The phone shows, per invoice,
 * its own latest report when there is one (sent or waiting), otherwise the
 * report the server already holds.
 */

import { kvSet, type Db } from '../../booker/core/db';
import { DKV } from './db';
import type {
  DeliveryIssue, Invoice, QueuedRecovery, QueuedReport, RecoveryPayload, ReportPayload, ReturnLine, Sheet, Today,
} from './types';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Replaces the stored sheets with a fresh download. */
export async function saveToday(db: Db, t: Today): Promise<void> {
  await db.tx(async () => {
    await db.run('DELETE FROM sheets');
    let i = 0;
    for (const s of t.sheets) await db.run('INSERT INTO sheets (id, sortIndex, data) VALUES (?, ?, ?)', [s.id, i++, JSON.stringify(s)]);
    const live = t.sheets.flatMap((s) => s.invoices.map((x) => x.orderId));
    // Sent reports of invoices no longer on a trip are history; waiting ones stay until the server answers.
    if (live.length) await db.run(`DELETE FROM q_reports WHERE status = 'SYNCED' AND orderId NOT IN (${live.map(() => '?').join(',')})`, live);
    else await db.run(`DELETE FROM q_reports WHERE status = 'SYNCED'`);
    const sheetIds = t.sheets.map((s) => s.id);
    if (sheetIds.length) await db.run(`DELETE FROM q_recoveries WHERE status = 'SYNCED' AND sheetId NOT IN (${sheetIds.map(() => '?').join(',')})`, sheetIds);
    else await db.run(`DELETE FROM q_recoveries WHERE status = 'SYNCED'`);
  });
  await kvSet(db, DKV.me, t.me);
  await kvSet(db, DKV.today, t.today);
  await kvSet(db, DKV.lastDownloadAt, new Date().toISOString());
}

export async function listSheets(db: Db): Promise<Sheet[]> {
  const rows = await db.all<{ data: string }>('SELECT data FROM sheets ORDER BY sortIndex');
  return rows.map((r) => JSON.parse(r.data) as Sheet);
}

export async function getInvoice(db: Db, orderId: string): Promise<{ sheet: Sheet; invoice: Invoice } | null> {
  for (const sheet of await listSheets(db)) {
    const invoice = sheet.invoices.find((x) => x.orderId === orderId);
    if (invoice) return { sheet, invoice };
  }
  return null;
}

/** What the phone shows for an invoice. */
export interface LocalReport {
  outcome: ReportPayload['outcome'];
  lines: ReturnLine[];
  cashCollected: number;
  method: NonNullable<ReportPayload['method']>;
  returnReason: string | null;
  note: string | null;
  reportedAt: string;
  /** waiting: on the phone; sent: the server has it; office: the office settled the invoice; issue: refused. */
  state: 'waiting' | 'sent' | 'office' | 'issue';
  issue?: string | null;
}

export async function reportsByOrder(db: Db): Promise<Map<string, QueuedReport>> {
  const rows = await db.all<QueuedReport>('SELECT * FROM q_reports ORDER BY createdAt');
  const m = new Map<string, QueuedReport>();
  for (const r of rows) m.set(r.orderId, r);
  return m;
}

export function effectiveReport(inv: Invoice, local: QueuedReport | undefined): LocalReport | null {
  if (inv.settled) {
    const r = inv.report;
    return {
      outcome: inv.deliveryStatus ?? r?.outcome ?? 'DELIVERED', lines: r?.lines ?? [], cashCollected: r?.cashCollected ?? 0,
      method: r?.method ?? 'CASH', returnReason: r?.returnReason ?? null, note: r?.note ?? null, reportedAt: r?.reportedAt ?? '', state: 'office',
    };
  }
  if (local && local.status !== 'CONFLICT') {
    const p = JSON.parse(local.payload) as ReportPayload;
    return {
      outcome: p.outcome, lines: p.lines ?? [], cashCollected: p.cashCollected ?? 0, method: p.method ?? 'CASH',
      returnReason: p.returnReason ?? null, note: p.note ?? null, reportedAt: p.reportedAt, state: local.status === 'PENDING' ? 'waiting' : 'sent',
    };
  }
  const r = inv.report;
  if (r) {
    return {
      outcome: r.outcome, lines: r.lines, cashCollected: r.cashCollected, method: r.method, returnReason: r.returnReason, note: r.note,
      reportedAt: r.reportedAt, state: local?.status === 'CONFLICT' ? 'issue' : 'sent', issue: local?.status === 'CONFLICT' ? local.reason : null,
    };
  }
  if (local?.status === 'CONFLICT') {
    const p = JSON.parse(local.payload) as ReportPayload;
    return {
      outcome: p.outcome, lines: p.lines ?? [], cashCollected: p.cashCollected ?? 0, method: p.method ?? 'CASH',
      returnReason: p.returnReason ?? null, note: p.note ?? null, reportedAt: p.reportedAt, state: 'issue', issue: local.reason,
    };
  }
  return null;
}

/** Value of what came back, at the invoice's own net rates. */
export function returnsValue(inv: Invoice, outcome: ReportPayload['outcome'], lines: ReturnLine[]): number {
  if (outcome === 'DELIVERED') return 0;
  if (outcome === 'RETURNED') return inv.total;
  return r2(inv.lines.reduce((s, l) => {
    const back = lines.find((x) => x.orderItemId === l.orderItemId)?.returnBaseQty ?? 0;
    return s + Math.min(back, l.baseQty) * l.netPerBase;
  }, 0));
}

/** Queues a report; an earlier one for the same invoice that never left the phone is replaced. */
export async function queueReport(db: Db, sheetId: string, inv: Invoice, p: ReportPayload): Promise<void> {
  const now = new Date().toISOString();
  await db.tx(async () => {
    await db.run(`DELETE FROM q_reports WHERE orderId = ? AND status = 'PENDING'`, [inv.orderId]);
    await db.run(
      `INSERT INTO q_reports (clientRef, orderId, sheetId, customerId, payload, status, createdAt) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [p.clientRef, inv.orderId, sheetId, inv.customer?.id ?? null, JSON.stringify(p), now],
    );
    await db.run(`UPDATE sync_issues SET resolvedAt = ? WHERE orderId = ? AND resolvedAt IS NULL`, [now, inv.orderId]);
  });
}

export async function queueRecovery(db: Db, p: RecoveryPayload): Promise<void> {
  await db.run(
    `INSERT INTO q_recoveries (clientRef, sheetId, customerId, amount, method, payload, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [p.clientRef, p.loadSheetId, p.customerId, p.amount, p.method ?? 'CASH', JSON.stringify(p), new Date().toISOString()],
  );
}

/** Recoveries of a sheet: the server's list plus the phone's own still waiting. */
export async function sheetRecoveries(db: Db, sheet: Sheet): Promise<Array<{ key: string; customerId: string; amount: number; method: string; state: 'waiting' | 'sent' | 'issue'; reason?: string | null }>> {
  const local = await db.all<QueuedRecovery>('SELECT * FROM q_recoveries WHERE sheetId = ? ORDER BY createdAt', [sheet.id]);
  const seen = new Set(sheet.recoveries.map((r) => r.clientRef).filter(Boolean) as string[]);
  return [
    ...sheet.recoveries.map((r) => ({ key: r.id, customerId: r.customerId, amount: r.amount, method: r.method, state: 'sent' as const })),
    ...local.filter((q) => !seen.has(q.clientRef) && q.status !== 'SYNCED').map((q) => ({
      key: q.clientRef, customerId: q.customerId, amount: q.amount, method: q.method,
      state: q.status === 'CONFLICT' ? 'issue' as const : 'waiting' as const, reason: q.reason,
    })),
  ];
}

export async function pendingCount(db: Db): Promise<number> {
  const a = await db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM q_reports WHERE status = 'PENDING'`);
  const b = await db.first<{ n: number }>(`SELECT COUNT(*) AS n FROM q_recoveries WHERE status = 'PENDING'`);
  return Number(a?.n ?? 0) + Number(b?.n ?? 0);
}

export async function issueCount(db: Db): Promise<number> {
  const r = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM sync_issues WHERE resolvedAt IS NULL');
  return Number(r?.n ?? 0);
}

export function openIssues(db: Db): Promise<DeliveryIssue[]> {
  return db.all<DeliveryIssue>('SELECT * FROM sync_issues WHERE resolvedAt IS NULL ORDER BY createdAt DESC');
}

export async function dismissIssue(db: Db, id: number): Promise<void> {
  await db.run('UPDATE sync_issues SET resolvedAt = ? WHERE id = ?', [new Date().toISOString(), id]);
}
