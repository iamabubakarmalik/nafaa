import { differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * The contractor's real udhaar, read from the customer khata.
 *
 * POS credit sales, khata payments and returns all move `Customer.balance`
 * and write `CustomerLedger` rows. Hardware credit accounts linked to a
 * customer show these figures, so the hardware screens and the khata, day
 * book and reports always agree.
 */
export interface KhataFigures {
  balance: number;
  creditLimit: number;
  age0To30Days: number;
  age31To60Days: number;
  age61To90Days: number;
  ageOver90Days: number;
  lastPurchaseDate: Date | null;
  lastPaymentDate: Date | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ledger rows that raise what the customer owes. */
const DEBIT_TYPES = ['SALE_CREDIT', 'OPENING_BALANCE', 'ADJUSTMENT'] as const;

export async function loadKhata(
  prisma: PrismaService,
  tenantId: string,
  customerIds: string[],
): Promise<Map<string, KhataFigures>> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  const out = new Map<string, KhataFigures>();
  if (!ids.length) return out;

  const [customers, debits, lastPayments] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, balance: true, creditLimit: true },
    }),
    prisma.customerLedger.findMany({
      where: { tenantId, customerId: { in: ids }, type: { in: [...DEBIT_TYPES] }, amount: { gt: 0 } },
      select: { customerId: true, amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customerLedger.groupBy({
      by: ['customerId'],
      where: { tenantId, customerId: { in: ids }, type: 'PAYMENT_RECEIVED' },
      _max: { createdAt: true },
    }),
  ]);

  const debitsBy = new Map<string, { amount: number; createdAt: Date }[]>();
  for (const d of debits) {
    const list = debitsBy.get(d.customerId) ?? [];
    list.push(d);
    debitsBy.set(d.customerId, list);
  }
  const paidAt = new Map(lastPayments.map((p) => [p.customerId, p._max.createdAt]));

  const now = new Date();
  for (const c of customers) {
    const rows = debitsBy.get(c.id) ?? [];
    // Payments clear the oldest udhaar first, so what is still owed is the newest entries.
    const age = [0, 0, 0, 0];
    let remaining = Math.max(c.balance, 0);
    for (const row of rows) {
      if (remaining <= 0.009) break;
      const part = Math.min(row.amount, remaining);
      const days = differenceInDays(now, row.createdAt);
      age[days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3] += part;
      remaining -= part;
    }
    // Balance with no ledger row behind it (old data) counts as oldest.
    if (remaining > 0.009) age[3] += remaining;

    out.set(c.id, {
      balance: r2(c.balance),
      creditLimit: c.creditLimit,
      age0To30Days: r2(age[0]),
      age31To60Days: r2(age[1]),
      age61To90Days: r2(age[2]),
      ageOver90Days: r2(age[3]),
      lastPurchaseDate: rows[0]?.createdAt ?? null,
      lastPaymentDate: paidAt.get(c.id) ?? null,
    });
  }
  return out;
}

/** Credit account with the live khata figures laid over it. */
export function withKhata<T extends {
  customerId: string | null;
  currentBalance: number;
  creditLimit: number;
  status: string;
}>(account: T, khata: Map<string, KhataFigures>): T & { khataLinked: boolean } {
  const k = account.customerId ? khata.get(account.customerId) : undefined;
  if (!k) return { ...account, khataLinked: false };
  const overLimit = account.creditLimit > 0 && k.balance > account.creditLimit;
  const status = account.status === 'ACTIVE' && overLimit
    ? 'OVERDUE'
    : account.status === 'OVERDUE' && !overLimit ? 'ACTIVE' : account.status;
  return {
    ...account,
    currentBalance: k.balance,
    age0To30Days: k.age0To30Days,
    age31To60Days: k.age31To60Days,
    age61To90Days: k.age61To90Days,
    ageOver90Days: k.ageOver90Days,
    lastPurchaseDate: k.lastPurchaseDate,
    lastPaymentDate: k.lastPaymentDate,
    status,
    khataLinked: true,
  };
}
