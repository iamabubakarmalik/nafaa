/**
 * Profit and loss math shared by the web and mobile apps. The server works
 * out every statement; these helpers only compare and add statements.
 */

import type { ExpenseCategoryRef, PnlStatement } from './types';

/** Percentage change; null when there is nothing to compare with. */
export function change(now: number | null, before: number | null): number | null {
  if (now == null || before == null || Math.abs(before) < 0.005) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

export const pctText = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

/** First and last business day of a month key (yyyy-mm), the last capped at today. */
export function monthRange(key: string, today: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from: `${key}-01`, to: last > today ? today : last };
}

/** Expense categories across several statements, biggest first. */
export function unionCategories(list: PnlStatement[]): ExpenseCategoryRef[] {
  const map = new Map<string, ExpenseCategoryRef & { amount: number }>();
  for (const s of list) {
    for (const c of s.expenses.categories) {
      const cur = map.get(c.id) ?? { id: c.id, name: c.name, color: c.color, amount: 0 };
      cur.amount += c.amount;
      map.set(c.id, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** Several statements added together (months into a year, branches into a total); margins worked out again. */
export function sumStatements(list: PnlStatement[]): PnlStatement {
  const add = <T extends Record<string, number>>(rows: Array<T | null>): T | null => {
    const present = rows.filter((x): x is T => x != null);
    if (!present.length || present.length < rows.length) return null;
    const out: Record<string, number> = {};
    for (const k of Object.keys(present[0])) out[k] = present.reduce((a, x) => a + (x as Record<string, number>)[k], 0);
    return out as T;
  };
  const sum = (f: (s: PnlStatement) => number | null) => (list.some((s) => f(s) == null) ? null : list.reduce((a, s) => a + (f(s) ?? 0), 0));
  const revenue = add(list.map((s) => s.revenue))!;
  revenue.avgBill = revenue.bills ? revenue.sales / revenue.bills : 0;
  const cats = new Map<string, PnlStatement['expenses']['categories'][number]>();
  for (const s of list) for (const c of s.expenses.categories) {
    const cur = cats.get(c.id) ?? { ...c, amount: 0, count: 0 };
    cur.amount += c.amount; cur.count += c.count;
    cats.set(c.id, cur);
  }
  const totals = add(list.map((s) => ({
    paid: s.expenses.paid, count: s.expenses.count, salaries: s.expenses.salaries, salaryCount: s.expenses.salaryCount,
    commission: s.expenses.commission, commissionCount: s.expenses.commissionCount, total: s.expenses.total,
  })))!;
  const expenses = { ...totals, categories: [...cats.values()].sort((a, b) => b.amount - a.amount) };
  const gross = sum((s) => s.grossProfit);
  const net = sum((s) => s.netProfit);
  const splits = list.map((s) => s.profitSplit ?? null);
  const profitSplit = splits.length && splits.every((x) => x != null)
    ? (() => {
      const keys = ['billProfit', 'realised', 'fromOlderBills', 'pending', 'writtenOff', 'headline'] as const;
      const out = { basis: splits[0]!.basis } as NonNullable<PnlStatement['profitSplit']>;
      for (const k of keys) out[k] = splits.reduce((a, x) => a + x![k], 0);
      return out;
    })()
    : null;
  const margin = (v: number | null) => (v == null ? null : Math.abs(revenue.net) < 0.005 ? 0 : (v / revenue.net) * 100);
  return {
    revenue,
    cogs: add(list.map((s) => s.cogs)),
    grossProfit: gross,
    grossMargin: margin(gross),
    profitSplit,
    expenses,
    writeOffs: add(list.map((s) => s.writeOffs)),
    otherIncome: add(list.map((s) => s.otherIncome))!,
    operatingProfit: sum((s) => s.operatingProfit),
    netProfit: net,
    netMargin: margin(net),
  };
}

/**
 * The net profit rule in one place: gross profit (khata basis) minus
 * expenses, minus the stock loss net of stock gain, plus other income.
 * Used to check a statement adds up; the server stays the source.
 */
export function netProfitOf(s: PnlStatement): number | null {
  if (s.grossProfit == null) return null;
  return s.grossProfit - s.expenses.total - (s.writeOffs?.net ?? 0) + s.otherIncome.total;
}

/** Profit of a sale line from its cost; null when cost is hidden. */
export const lineMargin = (revenue: number, profit: number | null | undefined): number | null =>
  profit == null || Math.abs(revenue) < 0.005 ? null : (profit / revenue) * 100;
