/**
 * Pure rules of the mobile shop pack (shared by web and mobile): IMEI checks
 * and pasted lists, CNIC format, instalment (qist) dates and amounts, repair
 * balance and the shelf-versus-stock mismatch. No labels here.
 */

export const digits = (v: string) => v.replace(/\D/g, '');
export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** IMEIs are 15 digits; the last is a Luhn check digit. */
export function isLuhnValid(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let n = Number(imei[14 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

/** 13 digits typed any way become 35202-1234567-1. */
export function formatCnic(v: string) {
  const d = digits(v).slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** Lines of "IMEI 1, IMEI 2" (Excel or WhatsApp paste) as [imei1, imei2?] pairs. */
export function parseImeiPaste(text: string): string[][] {
  return text.split('\n').map((l) => l.replace(/[^\d,\s\t]/g, '').split(/[,\s\t]+/).filter(Boolean)).filter((p) => p[0]);
}

/** Problem with a list of IMEI lines, or null. `code` names the problem; the screen words it. */
export type ImeiLineProblem = { code: 'imei1' | 'imei2' | 'same' | 'variant' | 'twice'; line?: number; imei?: string };
export function imeiLineProblem(lines: Array<{ imei1: string; imei2?: string; variant?: string }>, variants: string[] = []): ImeiLineProblem | null {
  const all: string[] = [];
  for (const [i, l] of lines.entries()) {
    if (!/^\d{15}$/.test(l.imei1)) return { code: 'imei1', line: i + 1 };
    if (l.imei2 && !/^\d{15}$/.test(l.imei2)) return { code: 'imei2', line: i + 1 };
    if (l.imei2 && l.imei2 === l.imei1) return { code: 'same', line: i + 1 };
    if (variants.length && !variants.includes(l.variant ?? '')) return { code: 'variant', line: i + 1 };
    all.push(l.imei1, ...(l.imei2 ? [l.imei2] : []));
  }
  const dup = all.find((n, i) => all.indexOf(n) !== i);
  return dup ? { code: 'twice', imei: dup } : null;
}

/** Models whose branch stock is not the number of phones on the shelf. */
export const shelfMismatch = <T extends { stock: number; inStock: number }>(rows: T[]) => rows.filter((r) => Math.round(r.stock) !== r.inStock);

/** Installment counts offered for a plan. */
export const QIST_COUNTS = [2, 3, 4, 6, 9, 12];

/** yyyy-MM-dd `months` after `key`, the day clamped to the month's end. */
export function addMonths(key: string, months: number) {
  const [y, m, d] = key.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export interface QistPlanView { perInstallment: number; down: number; dates: string[] }

/** What a plan on a credit bill looks like: the udhaar split in `count` monthly parts from `start`. */
export function qistPlan(total: number, credit: number, count: number, start: string): QistPlanView {
  return {
    perInstallment: count ? r2(credit / count) : 0,
    down: Math.max(r2(total - credit), 0),
    dates: start ? Array.from({ length: count }, (_, i) => addMonths(start, i)) : [],
  };
}

/** Why a plan cannot start yet: 'start' (no date), 'before_bill' (earlier than the bill), 'past' (before today); null when fine. */
export function qistProblem(start: string, opts: { billDay?: string; today?: string }): 'start' | 'before_bill' | 'past' | null {
  if (!start) return 'start';
  if (opts.billDay && start < opts.billDay) return 'before_bill';
  if (opts.today && start < opts.today) return 'past';
  return null;
}

/** Money still due on a repair job. */
export const repairDue = (t: { totalCost?: unknown; paidAmount?: unknown }) => Math.max(r2(Number(t.totalCost || 0) - Number(t.paidAmount || 0)), 0);

/** Share of an instalment plan paid, 0..1. */
export const planProgress = (p: { financedAmount?: unknown; paidAmount?: unknown }) => {
  const f = Number(p.financedAmount || 0);
  return f > 0 ? Math.min(Number(p.paidAmount || 0) / f, 1) : 0;
};

/** Which open installments a payment settles (oldest first), and how much of each. */
export function settleInstallments<T extends { amount: unknown; paidAmount: unknown }>(open: T[], amount: number) {
  let left = amount;
  return open.map((i) => {
    const due = r2(Number(i.amount) - Number(i.paidAmount));
    const take = Math.max(Math.min(due, left), 0);
    left = r2(left - take);
    return { i, take, full: take >= due - 0.005 };
  }).filter((x) => x.take > 0);
}
