/**
 * A farmer's udhaar, read from the customer khata and split by crop season.
 *
 * POS credit bills, khata payments, returns and delivered bulk orders all
 * move `Customer.balance` and write `CustomerLedger` rows, so these figures
 * always match Khata, the day book and the reports. Payments clear the
 * oldest udhaar first; what is still owed belongs to the newest entries, and
 * each entry is due once its season's harvest recovery date has passed.
 */

import { Prisma } from '@prisma/client';
import { cropSeasonOf } from '../agri-common';

type Db = Prisma.TransactionClient;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ledger rows that raise what the customer owes. */
const DEBIT_TYPES = ['SALE_CREDIT', 'OPENING_BALANCE', 'ADJUSTMENT'] as const;

export interface SeasonOwed {
  key: string;
  label: string;
  owed: number;
  recoveryBy: Date;
  due: boolean;
}

export interface FarmerKhata {
  balance: number;
  creditLimit: number;
  /** Udhaar whose season's recovery date has passed. */
  dueNow: number;
  /** Udhaar still within its season. */
  notDue: number;
  seasons: SeasonOwed[];
  lastPurchaseAt: Date | null;
  lastPaymentAt: Date | null;
}

export async function loadFarmerKhata(db: Db, tenantId: string, customerIds: string[]): Promise<Map<string, FarmerKhata>> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  const out = new Map<string, FarmerKhata>();
  if (!ids.length) return out;

  const [customers, debits, payments, lastSales] = await Promise.all([
    db.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, balance: true, creditLimit: true } }),
    db.customerLedger.findMany({
      where: { tenantId, customerId: { in: ids }, type: { in: [...DEBIT_TYPES] }, amount: { gt: 0 } },
      select: { customerId: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.customerLedger.groupBy({
      by: ['customerId'],
      where: { tenantId, customerId: { in: ids }, type: 'PAYMENT_RECEIVED' },
      _max: { createdAt: true },
    }),
    db.sale.groupBy({
      by: ['customerId'],
      where: { tenantId, customerId: { in: ids }, status: { not: 'VOIDED' } },
      _max: { createdAt: true },
    }),
  ]);

  const debitsBy = new Map<string, { amount: number; createdAt: Date }[]>();
  for (const d of debits) {
    const list = debitsBy.get(d.customerId) ?? [];
    list.push(d);
    debitsBy.set(d.customerId, list);
  }
  const paidAt = new Map(payments.map((p) => [p.customerId, p._max.createdAt]));
  const soldAt = new Map(lastSales.map((s) => [s.customerId as string, s._max.createdAt]));
  const now = new Date();

  for (const c of customers) {
    const seasons = new Map<string, SeasonOwed>();
    let remaining = Math.max(c.balance, 0);
    const add = (at: Date, part: number) => {
      const s = cropSeasonOf(at);
      const row = seasons.get(s.key) ?? { key: s.key, label: s.label, owed: 0, recoveryBy: s.recoveryBy, due: s.recoveryBy < now };
      row.owed += part;
      seasons.set(s.key, row);
    };
    let oldest: Date | null = null;
    for (const row of debitsBy.get(c.id) ?? []) {
      if (remaining <= 0.009) break;
      const part = Math.min(row.amount, remaining);
      add(row.createdAt, part);
      oldest = row.createdAt;
      remaining -= part;
    }
    // Balance with no ledger row behind it (old data) counts with the oldest season seen.
    if (remaining > 0.009) add(oldest ?? new Date(0), remaining);

    const list = [...seasons.values()].map((s) => ({ ...s, owed: r2(s.owed) })).sort((a, b) => a.recoveryBy.getTime() - b.recoveryBy.getTime());
    const dueNow = r2(list.filter((s) => s.due).reduce((a, s) => a + s.owed, 0));
    out.set(c.id, {
      balance: r2(c.balance),
      creditLimit: c.creditLimit,
      dueNow,
      notDue: r2(Math.max(c.balance, 0) - dueNow),
      seasons: list,
      lastPurchaseAt: soldAt.get(c.id) ?? null,
      lastPaymentAt: paidAt.get(c.id) ?? null,
    });
  }
  return out;
}

/** One farmer's khata season by season: udhaar given, money received, and the rows. */
export async function seasonStatement(db: Db, tenantId: string, customerId: string) {
  const rows = await db.customerLedger.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, amount: true, balanceAfter: true, reference: true, note: true, paymentMethod: true, createdAt: true },
  });
  const seasons = new Map<string, { key: string; label: string; recoveryBy: Date; udhaar: number; received: number; other: number; opening: number; closing: number }>();
  let running = 0;
  for (const r of rows) {
    const s = cropSeasonOf(r.createdAt);
    const row = seasons.get(s.key) ?? { key: s.key, label: s.label, recoveryBy: s.recoveryBy, udhaar: 0, received: 0, other: 0, opening: r2(running), closing: 0 };
    if (r.type === 'PAYMENT_RECEIVED') row.received += -r.amount;
    else if ((DEBIT_TYPES as readonly string[]).includes(r.type) && r.amount > 0) row.udhaar += r.amount;
    else row.other += r.amount;
    running = r.balanceAfter;
    row.closing = r2(running);
    seasons.set(s.key, row);
  }
  return {
    seasons: [...seasons.values()].reverse().map((s) => ({ ...s, udhaar: r2(s.udhaar), received: r2(s.received), other: r2(s.other) })),
    entries: rows.slice(-300).reverse(),
  };
}
