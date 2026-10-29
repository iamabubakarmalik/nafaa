/**
 * Settlement of khata bills: which part of each bill has been paid, and when.
 * Profit on a khata bill counts when its money comes in (business-math.helper,
 * "Khata profit"); this file keeps the SaleSettlement rows that say when.
 *
 * Rows are derived from the customer's khata (CustomerLedger) and rebuilt for
 * one customer at a time, so they never drift from the khata:
 *
 *   Debts     OPENING_BALANCE lines (paid first), SALE_CREDIT lines (one debt
 *             per bill, by reference = sale number) and any other line that
 *             raises the balance (manual udhaar, advance applied, booking
 *             refunds), in date order.
 *   Bill      A return to khata (REFUND line with the return number) and a
 *   cuts      void (negative ADJUSTMENT with the sale number) reduce that
 *             bill's own debt. Any other negative line with the reference of
 *             an open debt (e.g. an instalment forgiven) settles that debt.
 *   Credits   PAYMENT_RECEIVED lines pay the debt they name first, then open
 *             debts FIFO: opening balance first, then by date. Negative
 *             ADJUSTMENT and LOYALTY_REDEEMED lines settle debts without money
 *             (WRITE_OFF). Credit left over (an advance, an overpayment, a
 *             return after the bill was paid) waits for the next debt.
 *
 * For every live bill with a khata debt the rows are:
 *   UPFRONT    bill net − khata part, on the bill day (paid at the counter)
 *   PAYMENT    khata money allocated to the bill, on the day it settled it
 *   WRITE_OFF  khata reduced without money
 * and their sum never exceeds the bill net. Bills with no khata part have no
 * rows and count all their profit on the bill day.
 *
 * Every write path that touches the khata calls rebuildCustomerSettlements
 * after it commits. Reports also call syncTenantSettlements, which rebuilds
 * any customer whose khata or khata bills changed since the last build (a
 * fingerprint check), so a path that forgets the call is caught up anyway.
 */

import { Prisma } from '@prisma/client';
import { billMathCte } from './business-math.helper';

type Db = Prisma.TransactionClient;

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const EPS = 0.005;

/* ───────────────────────── allocation (pure) ───────────────────────── */

export type SettlementKindName = 'UPFRONT' | 'PAYMENT' | 'WRITE_OFF';

export interface LedgerLine {
  id: string;
  type: string;
  amount: number;
  reference: string | null;
  createdAt: Date;
}

export interface BillInfo {
  id: string;
  saleNumber: string;
  shopId: string | null;
  soldAt: Date;
  /** total − refundedAmount */
  net: number;
  live: boolean;
}

export interface AllocationInput {
  lines: LedgerLine[];
  /** Bills by sale number (live or voided). */
  bills: Map<string, BillInfo>;
  /** Sale number of each return number. */
  returns: Map<string, string>;
}

export interface SettlementRowOut {
  saleId: string;
  shopId: string | null;
  customerLedgerId: string | null;
  kind: SettlementKindName;
  amount: number;
  settledAt: Date;
}

interface Debt {
  key: string;
  ref: string | null;
  bill: BillInfo | null;
  opening: boolean;
  at: Date;
  order: number;
  amount: number;
  /** Cut by returns to khata (bills) or voids. */
  cut: number;
  open: number;
  rows: SettlementRowOut[];
}

interface PoolItem { kind: 'PAYMENT' | 'WRITE_OFF'; amount: number; at: Date; ledgerId: string }

const later = (a: Date, b: Date) => (a.getTime() >= b.getTime() ? a : b);

/** Settlement rows for one customer's khata. Deterministic for the same input. */
export function allocateSettlements(input: AllocationInput): SettlementRowOut[] {
  const lines = [...input.lines].sort((a, b) =>
    a.createdAt.getTime() - b.createdAt.getTime()
    // At the same moment, debts first, so a payment made with the bill finds it.
    || (b.amount > 0 ? 1 : 0) - (a.amount > 0 ? 1 : 0)
    || a.id.localeCompare(b.id));

  const debts: Debt[] = [];
  const byRef = new Map<string, Debt>();
  const pool: PoolItem[] = [];
  let order = 0;

  const settle = (d: Debt, amount: number, kind: 'PAYMENT' | 'WRITE_OFF', at: Date, ledgerId: string) => {
    const take = Math.min(amount, d.open);
    if (take <= EPS) return 0;
    d.open = r2(d.open - take);
    if (d.bill?.live) {
      d.rows.push({
        saleId: d.bill.id, shopId: d.bill.shopId, customerLedgerId: ledgerId, kind,
        amount: r2(take), settledAt: later(later(at, d.at), d.bill.soldAt),
      });
    }
    return take;
  };

  /** Opening balance first, then by date. */
  const fifo = () => debts.filter((d) => d.open > EPS).sort((a, b) => Number(b.opening) - Number(a.opening) || a.order - b.order);

  const spend = (amount: number, kind: 'PAYMENT' | 'WRITE_OFF', at: Date, ledgerId: string) => {
    let left = amount;
    for (const d of fifo()) {
      if (left <= EPS) break;
      left -= settle(d, left, kind, at, ledgerId);
    }
    if (left > EPS) pool.push({ kind, amount: r2(left), at, ledgerId });
  };

  for (const l of lines) {
    const amt = n(l.amount);
    if (Math.abs(amt) <= EPS) continue;

    if (amt > 0) {
      // A debt. SALE_CREDIT lines of the same bill add up to one debt.
      const bill = l.type === 'SALE_CREDIT' && l.reference ? input.bills.get(l.reference) ?? null : null;
      let d = bill ? byRef.get(l.reference!) : undefined;
      if (d && d.bill) {
        d.amount = r2(d.amount + amt);
        d.open = r2(d.open + amt);
      } else {
        d = {
          key: bill ? l.reference! : l.id, ref: l.reference, bill, opening: l.type === 'OPENING_BALANCE',
          at: l.createdAt, order: order++, amount: amt, cut: 0, open: amt, rows: [],
        };
        debts.push(d);
        if (l.reference && !byRef.has(l.reference)) byRef.set(l.reference, d);
        else if (bill) byRef.set(l.reference!, d);
      }
      // Credit waiting from before (an advance or overpayment) pays it now.
      while (d.open > EPS && pool.length) {
        const p = pool[0];
        const used = settle(d, p.amount, p.kind, l.createdAt, p.ledgerId);
        p.amount = r2(p.amount - used);
        if (p.amount <= EPS) pool.shift();
        if (used <= EPS) break;
      }
      continue;
    }

    const credit = -amt;
    // Return to khata: cuts the bill it came from.
    if (l.type === 'REFUND' && l.reference && input.returns.has(l.reference)) {
      const d = byRef.get(input.returns.get(l.reference)!);
      if (d) {
        const cut = Math.min(credit, d.open);
        d.open = r2(d.open - cut);
        d.cut = r2(d.cut + cut);
        // The rest is the customer's money (the bill was already paid).
        if (credit - cut > EPS) spend(r2(credit - cut), 'PAYMENT', l.createdAt, l.id);
        continue;
      }
    }
    // A negative line naming a debt: a void cuts that bill; anything else settles it.
    if (l.type === 'ADJUSTMENT' && l.reference && byRef.has(l.reference)) {
      const d = byRef.get(l.reference)!;
      const voided = !!d.bill && !d.bill.live;
      const used = voided
        ? (() => { const c = Math.min(credit, d.open); d.open = r2(d.open - c); d.cut = r2(d.cut + c); return c; })()
        : settle(d, credit, 'WRITE_OFF', l.createdAt, l.id);
      if (credit - used > EPS) spend(r2(credit - used), voided ? 'PAYMENT' : 'WRITE_OFF', l.createdAt, l.id);
      continue;
    }
    const kind: 'PAYMENT' | 'WRITE_OFF' = l.type === 'ADJUSTMENT' || l.type === 'LOYALTY_REDEEMED' ? 'WRITE_OFF' : 'PAYMENT';
    let left = credit;
    // A payment against a named bill pays that bill first.
    if (l.type === 'PAYMENT_RECEIVED' && l.reference && byRef.has(l.reference)) {
      left -= settle(byRef.get(l.reference)!, left, kind, l.createdAt, l.id);
    }
    if (left > EPS) spend(r2(left), kind, l.createdAt, l.id);
  }

  // Rows per live bill: the counter part first, then khata money; never more than the bill net.
  const out: SettlementRowOut[] = [];
  for (const d of debts) {
    const bill = d.bill;
    if (!bill?.live) continue;
    const khataPart = Math.max(0, d.amount - d.cut);
    const net = Math.max(0, bill.net);
    const rows: SettlementRowOut[] = [{
      saleId: bill.id, shopId: bill.shopId, customerLedgerId: null, kind: 'UPFRONT',
      amount: r2(Math.max(0, net - khataPart)), settledAt: bill.soldAt,
    }];
    let room = r2(net - rows[0].amount);
    for (const row of d.rows.sort((a, b) => a.settledAt.getTime() - b.settledAt.getTime())) {
      if (room <= EPS) break;
      const amount = r2(Math.min(row.amount, room));
      rows.push({ ...row, amount });
      room = r2(room - amount);
    }
    out.push(...rows);
  }
  return out;
}

/* ───────────────────────── database ───────────────────────── */

/** Fingerprint of each customer's khata and khata bills (one customer, or all of the tenant). */
async function fingerprints(db: Db, tenantId: string, customerId?: string) {
  const one = customerId ? Prisma.sql`AND "customerId" = ${customerId}` : Prisma.empty;
  return db.$queryRaw<Array<{ c: string; fp: string; built: string | null }>>`
    WITH l AS (
      SELECT "customerId" AS c, COUNT(*) AS cnt, ROUND(SUM(amount)::numeric, 2) AS total,
        (EXTRACT(EPOCH FROM MAX("createdAt")) * 1000)::bigint AS last
      FROM "CustomerLedger" WHERE "tenantId" = ${tenantId} ${one} GROUP BY 1),
    b AS (
      SELECT "customerId" AS c, ROUND(SUM("refundedAmount")::numeric, 2) AS refunds,
        COUNT(*) FILTER (WHERE status::text = 'VOIDED') AS voids
      FROM "Sale" WHERE "tenantId" = ${tenantId} AND "creditAmount" > 0 AND "customerId" IS NOT NULL ${one} GROUP BY 1)
    SELECT l.c, concat_ws('|', l.cnt, l.total, l.last, COALESCE(b.refunds, 0), COALESCE(b.voids, 0)) AS fp, y.fingerprint AS built
    FROM l LEFT JOIN b ON b.c = l.c
    LEFT JOIN "SaleSettlementSync" y ON y."customerId" = l.c`;
}

/** Bill net and gross profit by the shared rules, for the profit snapshot on each row. */
export async function billProfits(db: Db, saleIds: string[]): Promise<Map<string, { net: number; profit: number }>> {
  if (!saleIds.length) return new Map();
  const where = Prisma.sql`s.id IN (${Prisma.join(saleIds)})`;
  const rows = await db.$queryRaw<Array<{ id: string; net: number; profit: number }>>`
    WITH ${billMathCte(where)}
    SELECT s.id, (s.total - s."refundedAmount")::float8 AS net, (s.total - s."refundedAmount" - bm.cost)::float8 AS profit
    FROM "Sale" s JOIN bm ON bm.id = s.id`;
  return new Map(rows.map((x) => [x.id, { net: n(x.net), profit: n(x.profit) }]));
}

/** Reads one customer's khata and the bills and returns it names. */
export async function loadAllocationInput(db: Db, tenantId: string, customerId: string): Promise<AllocationInput> {
  const lines = await db.customerLedger.findMany({
    where: { tenantId, customerId },
    select: { id: true, type: true, amount: true, reference: true, createdAt: true },
  });
  const refs = [...new Set(lines.filter((l) => l.reference).map((l) => l.reference!))];
  const [sales, returns] = refs.length
    ? await Promise.all([
      db.sale.findMany({
        where: { tenantId, saleNumber: { in: refs } },
        select: { id: true, saleNumber: true, shopId: true, soldAt: true, total: true, refundedAmount: true, status: true },
      }),
      db.saleReturn.findMany({ where: { tenantId, returnNumber: { in: refs } }, select: { returnNumber: true, sale: { select: { saleNumber: true } } } }),
    ])
    : [[], []];
  return {
    lines: lines.map((l) => ({ ...l, type: String(l.type) })),
    bills: new Map(sales.map((s) => [s.saleNumber, {
      id: s.id, saleNumber: s.saleNumber, shopId: s.shopId, soldAt: s.soldAt,
      net: r2(n(s.total) - n(s.refundedAmount)), live: s.status !== 'VOIDED',
    }])),
    returns: new Map(returns.map((x) => [x.returnNumber, x.sale.saleNumber])),
  };
}

/**
 * Rebuilds one customer's settlement rows from their khata. Safe to call at
 * any time and more than once; concurrent calls for a customer queue up.
 */
export async function rebuildCustomerSettlements(prisma: { $transaction: Function } & Db, tenantId: string, customerId: string): Promise<number> {
  return (prisma.$transaction as (fn: (tx: Db) => Promise<number>, o?: object) => Promise<number>)(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`settle:${customerId}`}))::text`;
    const [fp] = await fingerprints(tx, tenantId, customerId);
    const input = await loadAllocationInput(tx, tenantId, customerId);
    const rows = allocateSettlements(input);
    const profits = await billProfits(tx, [...new Set(rows.map((r) => r.saleId))]);
    await tx.saleSettlement.deleteMany({ where: { tenantId, customerId } });
    if (rows.length) {
      await tx.saleSettlement.createMany({
        data: rows.map((r) => {
          const b = profits.get(r.saleId);
          return {
            tenantId, customerId, saleId: r.saleId, shopId: r.shopId, customerLedgerId: r.customerLedgerId,
            kind: r.kind, amount: r.amount, settledAt: r.settledAt,
            profitRealised: b && b.net > EPS ? r2((r.amount * b.profit) / b.net) : 0,
          };
        }),
      });
    }
    const fingerprint = fp?.fp ?? 'empty';
    await tx.saleSettlementSync.upsert({
      where: { customerId },
      create: { customerId, tenantId, fingerprint },
      update: { fingerprint, builtAt: new Date() },
    });
    return rows.length;
  }, { timeout: 60_000 });
}

/**
 * Rebuild after a khata change, without holding up the caller: errors are
 * logged and the next report catches up (syncTenantSettlements).
 */
export function refreshSettlements(prisma: unknown, tenantId: string, customerId: string | null | undefined): void {
  if (!customerId) return;
  rebuildCustomerSettlements(prisma as never, tenantId, customerId).catch((e) => {
    console.warn(`[settlements] rebuild failed for customer ${customerId}: ${e?.message ?? e}`);
  });
}

/** How often one server re-checks a tenant's fingerprints from report reads. */
const SYNC_INTERVAL_MS = 15_000;
const lastSync = new Map<string, number>();
const running = new Map<string, Promise<number>>();

/** Customers whose khata changed since their rows were built. */
export async function staleCustomers(db: Db, tenantId: string): Promise<string[]> {
  const rows = await fingerprints(db, tenantId);
  return rows.filter((r) => r.built !== r.fp).map((r) => r.c);
}

/**
 * Brings a tenant's settlement rows up to date before a report reads them.
 * Cheap when nothing changed (one grouped read, at most every few seconds
 * per tenant). Inside a transaction client it does nothing; the next plain
 * read does it.
 */
export async function syncTenantSettlements(db: Db, tenantId: string, opts: { force?: boolean } = {}): Promise<number> {
  if (typeof (db as unknown as { $transaction?: unknown }).$transaction !== 'function') return 0;
  const now = Date.now();
  if (!opts.force && now - (lastSync.get(tenantId) ?? 0) < SYNC_INTERVAL_MS) return running.get(tenantId) ?? 0;
  lastSync.set(tenantId, now);
  const job = (async () => {
    let done = 0;
    for (const id of await staleCustomers(db, tenantId)) {
      await rebuildCustomerSettlements(db as never, tenantId, id);
      done++;
    }
    return done;
  })();
  running.set(tenantId, job);
  try {
    return await job;
  } catch (e) {
    lastSync.delete(tenantId);
    console.warn(`[settlements] sync failed for tenant ${tenantId}: ${(e as Error)?.message ?? e}`);
    return 0;
  } finally {
    if (running.get(tenantId) === job) running.delete(tenantId);
  }
}
