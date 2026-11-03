/**
 * The outbox: an ordered, durable queue of writes for the server.
 *
 * - Every change has an id and an Idempotency-Key, so sending it twice
 *   (lost answer, app killed mid-send) never does the work twice.
 * - Things made offline get temp ids (tmp_customer_<uuid>). A later change
 *   that mentions a temp id depends on the change that creates it; it is
 *   sent only after that one landed, with the temp id replaced by the
 *   server id.
 * - Local effects (stock and khata deltas) are written with the change and
 *   laid over the mirror until a download includes the server's result.
 * - Answers are sorted by classify(): retry later, or an issue the user
 *   fixes, retries or discards. Nothing is dropped silently.
 */

import { backoffMs, classify, explainIssue, MAX_SERVER_RETRIES } from './issues';
import type { ChangeKind, Db, EngineConfig, HttpMethod, IssueCode, OpKind, OpStatus, OutboxItem, SqlValue, Translate } from './types';

export interface Ctx {
  db: Db;
  http: EngineConfig['http'];
  uuid: () => string;
  now: () => number;
  t: Translate;
  session: EngineConfig['session'];
  emit: (what: ChangeKind) => void;
  log: (msg: string, extra?: unknown) => void;
}

export type EffectInput = { kind: 'stock' | 'balance' | 'loyalty'; k1: string; k2?: string; k3?: string; delta: number };

export interface EnqueueInput {
  kind: OpKind;
  method: HttpMethod;
  path: string;
  body?: unknown;
  title: string;
  amount?: number | null;
  shopId?: string | null;
  /** Temp id this change creates. */
  tempId?: string;
  entity?: 'customer' | 'product' | 'sale' | 'register' | 'expense' | 'income' | 'purchase';
  /** Changes that must land first (temp ids found in path and body are added automatically). */
  after?: string[];
  effects?: EffectInput[];
  meta?: unknown;
  id?: string;
}

export const TEMP_ID = /tmp_[a-z]+_[0-9a-f-]{36}/g;
export const newTempId = (ctx: Pick<Ctx, 'uuid'>, entity: string) => `tmp_${entity}_${ctx.uuid()}`;
export const isTempId = (id: string | null | undefined) => !!id && /^tmp_[a-z]+_/.test(id);

interface Row {
  id: string; ikey: string; seq: number; kind: OpKind; method: HttpMethod; path: string; body: string | null; title: string;
  amount: number | null; shopId: string | null; status: OpStatus; attempts: number; nextAttemptAt: number; lastStatus: number | null;
  issue: IssueCode | null; serverMessage: string | null; dependsOn: string; tempId: string | null; entity: string | null;
  meta: string | null; result: string | null; tenantId: string | null; userId: string | null; createdAt: number; doneAt: number | null;
}

const parse = <T>(s: string | null): T | null => {
  if (s === null || s === undefined) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

export function toItem(r: Row, t: Translate): OutboxItem {
  return {
    id: r.id, seq: r.seq, kind: r.kind, method: r.method, path: r.path, body: parse(r.body), title: r.title, amount: r.amount,
    status: r.status, attempts: r.attempts, nextAttemptAt: r.nextAttemptAt, lastStatus: r.lastStatus, issue: r.issue,
    serverMessage: r.serverMessage, explanation: r.issue ? explainIssue(r.issue, t) : null,
    dependsOn: parse<string[]>(r.dependsOn) ?? [], createdAt: r.createdAt, doneAt: r.doneAt, tempId: r.tempId,
    result: parse(r.result), shopId: r.shopId,
  };
}

/* ───────────── per-kind hooks (set by ops.ts) ───────────── */

export interface OpHooks {
  /** The server took the change; `data` is its answer. Runs inside a transaction. */
  done?: (ctx: Ctx, op: OutboxItem & { meta: unknown }, data: unknown) => Promise<void>;
  /** The server refused the change; return a new body to send again at once (e.g. drop a refused discount code). */
  refused?: (ctx: Ctx, op: OutboxItem & { meta: unknown }, code: IssueCode, message: string | null) => Promise<unknown | undefined>;
  /** The user discarded the change: undo what it did on the phone. Runs inside a transaction. */
  discarded?: (ctx: Ctx, op: OutboxItem & { meta: unknown }) => Promise<void>;
}

const hooks = new Map<OpKind, OpHooks>();
export function registerHooks(kind: OpKind, h: OpHooks) {
  hooks.set(kind, h);
}

/* ───────────── enqueue ───────────── */

function tempIdsIn(path: string, body: unknown): string[] {
  const text = `${path} ${body === undefined ? '' : JSON.stringify(body)}`;
  return [...new Set(text.match(TEMP_ID) ?? [])];
}

/** Replaces temp ids that already have a server id. Returns null when one is still unknown. */
async function resolveTemp(db: Db, text: string): Promise<string | null> {
  const temps = [...new Set(text.match(TEMP_ID) ?? [])];
  if (!temps.length) return text;
  const rows = await db.all<{ tempId: string; serverId: string }>(
    `SELECT tempId, serverId FROM idmap WHERE tempId IN (${temps.map(() => '?').join(',')})`, temps,
  );
  if (rows.length < temps.length) return null;
  let out = text;
  for (const r of rows) out = out.split(r.tempId).join(r.serverId);
  return out;
}

/** Adds a change to the outbox (and its local effects) in one transaction. Returns its id. */
export async function enqueue(ctx: Ctx, input: EnqueueInput): Promise<string> {
  const id = input.id ?? ctx.uuid();
  const s = ctx.session();
  // Temp ids that already have a server id are written as server ids straight away.
  const path = (await resolveTemp(ctx.db, input.path)) ?? input.path;
  const bodyText = input.body === undefined ? null : JSON.stringify(input.body);
  const body = bodyText === null ? null : (await resolveTemp(ctx.db, bodyText)) ?? bodyText;
  const deps = new Set(input.after ?? []);
  const temps = tempIdsIn(path, body === null ? undefined : JSON.parse(body));
  if (temps.length) {
    const creators = await ctx.db.all<{ id: string }>(
      `SELECT id FROM outbox WHERE tempId IN (${temps.map(() => '?').join(',')}) AND status <> 'done'`, temps,
    );
    creators.forEach((c) => deps.add(c.id));
  }
  deps.delete(id);
  await ctx.db.tx(async (db) => {
    const seq = ((await db.first<{ m: number | null }>('SELECT MAX(seq) AS m FROM outbox'))?.m ?? 0) + 1;
    await db.run(
      `INSERT INTO outbox (id, ikey, seq, kind, method, path, body, title, amount, shopId, status, attempts, nextAttemptAt,
         dependsOn, tempId, entity, meta, tenantId, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.uuid(), seq, input.kind, input.method, path, body, input.title, input.amount ?? null, input.shopId ?? null,
        JSON.stringify([...deps]), input.tempId ?? null, input.entity ?? null, input.meta === undefined ? null : JSON.stringify(input.meta),
        s?.tenantId ?? null, s?.userId ?? null, ctx.now()],
    );
    for (const e of input.effects ?? []) {
      if (!e.delta) continue;
      await db.run('INSERT INTO effects (opId, kind, k1, k2, k3, delta) VALUES (?, ?, ?, ?, ?, ?)', [id, e.kind, e.k1, e.k2 ?? '', e.k3 ?? '', e.delta]);
    }
  });
  ctx.emit('outbox');
  return id;
}

/* ───────────── reading ───────────── */

export async function getOp(ctx: Ctx, id: string): Promise<(OutboxItem & { meta: unknown }) | null> {
  const r = await ctx.db.first<Row>('SELECT * FROM outbox WHERE id = ?', [id]);
  return r ? { ...toItem(r, ctx.t), meta: parse(r.meta) } : null;
}

export async function listOps(ctx: Ctx, filter: { status?: OpStatus[]; kind?: OpKind[]; limit?: number } = {}): Promise<OutboxItem[]> {
  const where: string[] = [];
  const params: SqlValue[] = [];
  if (filter.status?.length) { where.push(`status IN (${filter.status.map(() => '?').join(',')})`); params.push(...filter.status); }
  if (filter.kind?.length) { where.push(`kind IN (${filter.kind.map(() => '?').join(',')})`); params.push(...filter.kind); }
  const rows = await ctx.db.all<Row>(
    `SELECT * FROM outbox ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY seq LIMIT ?`, [...params, filter.limit ?? 500],
  );
  return rows.map((r) => toItem(r, ctx.t));
}

export async function counts(ctx: Ctx): Promise<{ pending: number; issues: number; sending: number }> {
  const s = ctx.session();
  const rows = await ctx.db.all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM outbox WHERE status IN ('pending', 'sending', 'issue')
       AND (tenantId IS NULL OR tenantId = ?) GROUP BY status`, [s?.tenantId ?? ''],
  );
  const c = (k: string) => rows.find((r) => r.status === k)?.n ?? 0;
  return { pending: c('pending') + c('sending'), issues: c('issue'), sending: c('sending') };
}

/* ───────────── sending ───────────── */

export interface FlushResult {
  sent: number;
  done: number;
  issues: number;
  retried: number;
  offline: boolean;
  halted: 'session' | 'plan' | null;
}

let flushing: Promise<FlushResult> | null = null;

/** Sends due changes in order. One run at a time; a second call joins the running one. */
export function flush(ctx: Ctx): Promise<FlushResult> {
  if (!flushing) flushing = run(ctx).finally(() => { flushing = null; });
  return flushing;
}

export const isFlushing = () => !!flushing;

async function run(ctx: Ctx): Promise<FlushResult> {
  const out: FlushResult = { sent: 0, done: 0, issues: 0, retried: 0, offline: false, halted: null };
  const s = ctx.session();
  if (!s) return out;
  // A send cut off by the app closing goes again (the Idempotency-Key makes that safe).
  await ctx.db.run("UPDATE outbox SET status = 'pending' WHERE status = 'sending'");
  const skipped = new Set<string>();

  for (let guard = 0; guard < 10_000; guard++) {
    const rows = await ctx.db.all<Row>(
      `SELECT * FROM outbox WHERE status = 'pending' AND nextAttemptAt <= ? AND tenantId = ? AND userId = ?
       ORDER BY seq LIMIT 100`, [ctx.now(), s.tenantId, s.userId],
    );
    const ready = rows.filter((r) => !skipped.has(r.id));
    if (!ready.length) break;
    let progressed = false;
    for (const r of ready) {
      const verdict = await sendOne(ctx, r, out);
      if (verdict === 'stop') return finish(ctx, out);
      if (verdict === 'skip') skipped.add(r.id);
      else progressed = true;
    }
    if (!progressed) break;
  }
  return finish(ctx, out);
}

function finish(ctx: Ctx, out: FlushResult): FlushResult {
  ctx.emit('outbox');
  if (out.issues) ctx.emit('issues');
  if (out.done) ctx.emit('synced');
  return out;
}

type StepResult = 'sent' | 'skip' | 'stop';

async function sendOne(ctx: Ctx, r: Row, out: FlushResult): Promise<StepResult> {
  // Wait for the changes this one depends on.
  const deps = parse<string[]>(r.dependsOn) ?? [];
  if (deps.length) {
    const states = await ctx.db.all<{ id: string; status: OpStatus }>(
      `SELECT id, status FROM outbox WHERE id IN (${deps.map(() => '?').join(',')})`, deps,
    );
    if (states.some((d) => d.status === 'issue' || d.status === 'cancelled')) {
      await markIssue(ctx, r, 'waiting', null, r.lastStatus);
      out.issues++;
      return 'skip';
    }
    if (states.some((d) => d.status !== 'done')) return 'skip';
  }
  const path = await resolveTemp(ctx.db, r.path);
  const bodyText = r.body === null ? null : await resolveTemp(ctx.db, r.body);
  if (path === null || (r.body !== null && bodyText === null)) return 'skip';

  await ctx.db.run("UPDATE outbox SET status = 'sending', attempts = attempts + 1 WHERE id = ?", [r.id]);
  out.sent++;
  const op = { ...toItem(r, ctx.t), meta: parse(r.meta) };
  let body: unknown = bodyText === null ? undefined : JSON.parse(bodyText);
  let ikey = r.ikey;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ctx.http.request({ method: r.method, path, body, idempotencyKey: ikey, shopId: r.shopId });
      await ctx.db.tx(async (db) => {
        const tc: Ctx = { ...ctx, db };
        await db.run(
          "UPDATE outbox SET status = 'done', doneAt = ?, result = ?, lastStatus = ?, issue = NULL, serverMessage = NULL, path = ?, body = ? WHERE id = ?",
          [ctx.now(), JSON.stringify(res.data ?? null), res.status, path, body === undefined ? null : JSON.stringify(body), r.id],
        );
        await db.run('UPDATE effects SET doneAt = ? WHERE opId = ?', [ctx.now(), r.id]);
        await hooks.get(r.kind)?.done?.(tc, { ...op, body }, res.data);
      });
      out.done++;
      ctx.log(`[outbox] ${r.kind} done${res.replayed ? ' (replayed)' : ''}`);
      return 'sent';
    } catch (err) {
      const v = classify(err);
      const status = (err as { status?: number })?.status ?? null;
      if (v.kind === 'offline') {
        await backoff(ctx, r, status, 0);
        out.offline = true;
        return 'stop';
      }
      if (v.kind === 'halt') {
        await ctx.db.run("UPDATE outbox SET status = 'pending', lastStatus = ? WHERE id = ?", [status, r.id]);
        out.halted = v.reason;
        return 'stop';
      }
      if (v.kind === 'retry') {
        const attempts = r.attempts + 1;
        if (attempts >= MAX_SERVER_RETRIES && !v.afterMs) {
          await markIssue(ctx, r, 'unknown', null, status);
          out.issues++;
          return 'skip';
        }
        await backoff(ctx, r, status, v.afterMs ?? backoffMs(attempts));
        out.retried++;
        return v.throttled ? 'stop' : 'skip';
      }
      // 409 "already exists" can be a number clash between two counters saving at the same moment:
      // the request failed as a whole, so sending it again twice is safe before calling it an issue.
      if (status === 409 && r.attempts + 1 < 3) {
        await backoff(ctx, r, status, 1500);
        out.retried++;
        return 'skip';
      }
      // A refused change may be sent again once in another form (see OpHooks.refused).
      const again = attempt === 0 ? await hooks.get(r.kind)?.refused?.(ctx, { ...op, body }, v.code, v.message) : undefined;
      if (again !== undefined) {
        body = again;
        ikey = ctx.uuid();
        await ctx.db.run('UPDATE outbox SET ikey = ?, body = ? WHERE id = ?', [ikey, JSON.stringify(body), r.id]);
        continue;
      }
      await markIssue(ctx, r, v.code, v.message, status);
      out.issues++;
      return 'skip';
    }
  }
  return 'skip';
}

async function backoff(ctx: Ctx, r: Row, status: number | null, ms: number) {
  await ctx.db.run("UPDATE outbox SET status = 'pending', nextAttemptAt = ?, lastStatus = ? WHERE id = ?", [ctx.now() + ms, status, r.id]);
}

async function markIssue(ctx: Ctx, r: Row, code: IssueCode, message: string | null, status: number | null) {
  await ctx.db.run("UPDATE outbox SET status = 'issue', issue = ?, serverMessage = ?, lastStatus = ? WHERE id = ?", [code, message, status, r.id]);
  ctx.log(`[outbox] ${r.kind} issue: ${code} ${message ?? ''}`);
}

/* ───────────── user actions on issues ───────────── */

/**
 * Sends an issue again. With `body`, the change is edited first (for example
 * a manager PIN added); an edited change gets a new Idempotency-Key.
 */
export async function retryOp(ctx: Ctx, id: string, patch?: { body?: unknown }): Promise<void> {
  const r = await ctx.db.first<Row>('SELECT * FROM outbox WHERE id = ?', [id]);
  if (!r || r.status === 'done' || r.status === 'cancelled') return;
  if (patch?.body !== undefined) {
    await ctx.db.run('UPDATE outbox SET body = ?, ikey = ? WHERE id = ?', [JSON.stringify(patch.body), ctx.uuid(), id]);
  }
  await ctx.db.run("UPDATE outbox SET status = 'pending', attempts = 0, nextAttemptAt = 0, issue = NULL, serverMessage = NULL WHERE id = ?", [id]);
  // Changes that waited for this one wait again instead of showing as issues.
  await ctx.db.run(
    `UPDATE outbox SET status = 'pending', issue = NULL, nextAttemptAt = 0
     WHERE status = 'issue' AND issue = 'waiting' AND EXISTS (SELECT 1 FROM json_each(outbox.dependsOn) WHERE value = ?)`, [id],
  );
  ctx.emit('outbox');
  ctx.emit('issues');
}

/**
 * Removes a change that will not be sent, and undoes what it did on the
 * phone (stock and khata effects, a customer or bill made offline). Changes
 * that depend on it are discarded with it.
 */
export async function discardOp(ctx: Ctx, id: string): Promise<string[]> {
  const removed: string[] = [];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const r = await ctx.db.first<Row>('SELECT * FROM outbox WHERE id = ?', [cur]);
    if (!r || r.status === 'done' || r.status === 'cancelled' || r.status === 'sending') continue;
    await ctx.db.tx(async (db) => {
      const tc: Ctx = { ...ctx, db };
      await db.run("UPDATE outbox SET status = 'cancelled', doneAt = ? WHERE id = ?", [ctx.now(), cur]);
      await db.run('DELETE FROM effects WHERE opId = ?', [cur]);
      await hooks.get(r.kind)?.discarded?.(tc, { ...toItem(r, ctx.t), meta: parse(r.meta) });
    });
    removed.push(cur);
    const dependents = await ctx.db.all<{ id: string }>(
      "SELECT id FROM outbox WHERE status IN ('pending', 'issue') AND EXISTS (SELECT 1 FROM json_each(outbox.dependsOn) WHERE value = ?)", [cur],
    );
    queue.push(...dependents.map((d) => d.id));
  }
  ctx.emit('outbox');
  ctx.emit('issues');
  return removed;
}

/** Old finished rows are removed after a week (cancelled ones too). */
export async function pruneOutbox(ctx: Ctx): Promise<void> {
  const weekAgo = ctx.now() - 7 * 86_400_000;
  await ctx.db.run("DELETE FROM outbox WHERE status IN ('done', 'cancelled') AND doneAt < ?", [weekAgo]);
  await ctx.db.run('DELETE FROM idmap WHERE tempId NOT IN (SELECT tempId FROM outbox WHERE tempId IS NOT NULL)');
  await ctx.db.run('DELETE FROM notes WHERE seen = 1 AND createdAt < ?', [weekAgo]);
}

/** Records the server id of something made offline and moves local rows over to it. */
export async function mapTempId(ctx: Ctx, tempId: string, serverId: string, entity: string): Promise<void> {
  await ctx.db.run('INSERT OR REPLACE INTO idmap (tempId, serverId, entity) VALUES (?, ?, ?)', [tempId, serverId, entity]);
  await ctx.db.run('UPDATE effects SET k1 = ? WHERE k1 = ?', [serverId, tempId]);
  await ctx.db.run('UPDATE effects SET k2 = ? WHERE k2 = ?', [serverId, tempId]);
  await ctx.db.run('UPDATE sales SET customerId = ? WHERE customerId = ?', [serverId, tempId]);
}
