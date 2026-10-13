/**
 * The lines of the statement, in order, with how to read each one. The
 * screen table, the monthly and branch columns, the print and the CSV all
 * walk this one list, so they always agree.
 */

import type { ExpenseCategoryRef, PnlDetailKind, PnlStatement } from './api';
import type { PnlConfig } from './config';

export type LineKind = 'head' | 'item' | 'sub' | 'total' | 'grand' | 'ratio';

export interface PnlLine {
  id: string;
  label: string;
  hint?: string;
  kind: LineKind;
  value: (s: PnlStatement) => number | null;
  /** Taken away from the line above it (shown with a minus). */
  minus?: boolean;
  /** Worked out from cost; hidden while cost is locked. */
  cost?: boolean;
  /** A rise is good (true) or bad (false); undefined for neutral lines. */
  upIsGood?: boolean;
  /** Opens the records behind the line. */
  drill?: { kind: PnlDetailKind; categoryId?: string };
  /** Goes to the page that owns the records. */
  to?: string;
}

const head = (id: string, label: string): PnlLine => ({ id, label, kind: 'head', value: () => null });

/** Statement lines for these expense categories (the union of every column shown). */
export function buildLines(cfg: PnlConfig, categories: ExpenseCategoryRef[], staff: boolean): PnlLine[] {
  const cat = (id: string) => (s: PnlStatement) => s.expenses.categories.find((c) => c.id === id)?.amount ?? 0;
  return [
    head('h-rev', 'Sale (revenue)'),
    { id: 'gross', label: 'Total sale (list rate par)', hint: 'Har cheez ka poora rate × quantity, discount se pehle', kind: 'item', value: (s) => s.revenue.gross, upIsGood: true },
    { id: 'discount', label: 'Discount', hint: 'Item, bill, code aur loyalty points ka discount', kind: 'item', minus: true, value: (s) => s.revenue.discount, upIsGood: false },
    { id: 'd-manual', label: 'Haath se diya (item + bill)', kind: 'sub', value: (s) => s.revenue.manualDiscount },
    { id: 'd-code', label: 'Discount code', kind: 'sub', value: (s) => s.revenue.codeDiscount },
    { id: 'd-loyalty', label: 'Loyalty points', kind: 'sub', value: (s) => s.revenue.loyaltyDiscount },
    { id: 'service', label: 'Service / delivery charges', hint: 'Bill par lage charges jo dukaan ke paas rahe', kind: 'item', value: (s) => s.revenue.serviceCharges, upIsGood: true },
    { id: 'sales', label: 'Bills ki kul amount', hint: 'Void ke ilawa saare bill', kind: 'total', value: (s) => s.revenue.sales, upIsGood: true },
    { id: 'returns', label: 'Maal wapas (returns)', hint: 'Is period me wapas hua maal, chahe bill pehle ka ho', kind: 'item', minus: true, value: (s) => s.revenue.returns, upIsGood: false, to: '/returns' },
    { id: 'net', label: 'Net sale', hint: 'Asal kamai: bills minus return', kind: 'grand', value: (s) => s.revenue.net, upIsGood: true },

    head('h-cogs', cfg.cogs),
    { id: 'c-saved', label: 'Sale par likhi cost', hint: 'Har bill par bikte waqt save hui cost', kind: 'item', cost: true, value: (s) => s.cogs?.saved ?? null, upIsGood: false },
    { id: 'c-est', label: 'Andaza (cost nahi likhi thi)', hint: 'Jin lines par cost 0 thi, un ki product ki aaj ki cost', kind: 'item', cost: true, value: (s) => s.cogs?.estimated ?? null, upIsGood: false },
    { id: 'c-ret', label: 'Wapas aaye maal ki cost', hint: 'Return par maal ki cost cost se nikal jati hai', kind: 'item', cost: true, minus: true, value: (s) => s.cogs?.returned ?? null },
    { id: 'cogs', label: cfg.cogs, hint: cfg.cogsHint, kind: 'total', cost: true, minus: true, value: (s) => s.cogs?.total ?? null, upIsGood: false },
    { id: 'gross-profit', label: 'Gross profit', hint: 'Net sale minus maal ki cost', kind: 'grand', cost: true, value: (s) => s.grossProfit, upIsGood: true },
    { id: 'gross-margin', label: 'Gross margin', hint: 'Har 100 ki sale me maal ke baad kitna bacha', kind: 'ratio', cost: true, value: (s) => s.grossMargin, upIsGood: true },

    head('h-exp', 'Kharchay (operating)'),
    ...categories.map((c): PnlLine => ({ id: `e-${c.id}`, label: c.name, kind: 'item', value: cat(c.id), upIsGood: false, drill: { kind: 'expense', categoryId: c.id } })),
    ...(staff ? [
      { id: 'salaries', label: 'Tankhwah (salary)', hint: 'Staff ko di gayi tankhwah', kind: 'item', value: (s) => s.expenses.salaries, upIsGood: false, drill: { kind: 'staff' } },
      { id: 'commission', label: 'Commission', hint: 'Staff ko diya gaya commission', kind: 'item', value: (s) => s.expenses.commission, upIsGood: false, drill: { kind: 'staff' } },
    ] as PnlLine[] : []),
    { id: 'opex', label: 'Kul kharchay', kind: 'total', minus: true, value: (s) => s.expenses.total, upIsGood: false, to: '/expenses' },
    { id: 'operating', label: 'Kaarobari profit', hint: 'Gross profit minus kharchay', kind: 'total', cost: true, value: (s) => s.operatingProfit, upIsGood: true },

    head('h-stock', 'Stock ka nuqsan'),
    { id: 'w-damage', label: 'Kharab maal', hint: 'Damage likha gaya, return par kharab nikla maal bhi', kind: 'item', cost: true, value: (s) => s.writeOffs?.damage ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'w-loss', label: 'Gum / chori', kind: 'item', cost: true, value: (s) => s.writeOffs?.loss ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'w-short', label: 'Ginti me kam nikla', kind: 'item', cost: true, value: (s) => s.writeOffs?.countedShort ?? null, upIsGood: false, drill: { kind: 'writeoff' } },
    { id: 'w-found', label: 'Ginti me zyada nikla', hint: 'Ye nuqsan kam karta hai', kind: 'item', cost: true, minus: true, value: (s) => s.writeOffs?.found ?? null, drill: { kind: 'writeoff' } },
    { id: 'writeoffs', label: 'Kul stock nuqsan', kind: 'total', cost: true, minus: true, value: (s) => s.writeOffs?.net ?? null, upIsGood: false, to: '/stock-adjustments' },

    head('h-other', 'Doosri aamdani'),
    { id: 'booking', label: 'Booking advance jo wapas nahi hua', hint: 'Cancel ya waqt guzri booking ka rakha gaya advance', kind: 'item', value: (s) => s.otherIncome.bookingKept, upIsGood: true, drill: { kind: 'booking' } },

    { id: 'net-profit', label: 'Net profit', hint: 'Sab kuch ghata kar jo bacha', kind: 'grand', cost: true, value: (s) => s.netProfit, upIsGood: true },
    { id: 'net-margin', label: 'Net margin', hint: 'Har 100 ki sale me aakhir me kitna bacha', kind: 'ratio', cost: true, value: (s) => s.netMargin, upIsGood: true },
  ];
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

/** Percentage change; null when there is nothing to compare with. */
export function change(now: number | null, before: number | null): number | null {
  if (now == null || before == null || Math.abs(before) < 0.005) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

export const pctText = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

export const monthLabel = (key: string, long = false) =>
  new Intl.DateTimeFormat('en-PK', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' }).format(new Date(`${key}-15T12:00:00`));

/** First and last business day of a month key (yyyy-mm). */
export function monthRange(key: string, today: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from: `${key}-01`, to: last > today ? today : last };
}

export const CHANNELS: Record<string, { label: string; color: string }> = {
  POS: { label: 'Counter (POS)', color: '#0f766e' },
  WEBSITE: { label: 'Website', color: '#2563eb' },
  DARAZ: { label: 'Daraz', color: '#f97316' },
  FOODPANDA: { label: 'Foodpanda', color: '#e21b70' },
  SHOPIFY: { label: 'Shopify', color: '#16a34a' },
  MARKETPLACE: { label: 'Nafaa marketplace', color: '#7c3aed' },
};

/** Fixed colours for the statement's parts, so every chart reads the same way. */
export const PART_COLORS = {
  revenue: '#2563eb',
  cogs: '#64748b',
  expenses: '#d97706',
  writeOffs: '#e11d48',
  other: '#0891b2',
  profit: '#16a34a',
  loss: '#e11d48',
};

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
  const margin = (v: number | null) => (v == null ? null : Math.abs(revenue.net) < 0.005 ? 0 : (v / revenue.net) * 100);
  return {
    revenue,
    cogs: add(list.map((s) => s.cogs)),
    grossProfit: gross,
    grossMargin: margin(gross),
    expenses,
    writeOffs: add(list.map((s) => s.writeOffs)),
    otherIncome: add(list.map((s) => s.otherIncome))!,
    operatingProfit: sum((s) => s.operatingProfit),
    netProfit: net,
    netMargin: margin(net),
  };
}
