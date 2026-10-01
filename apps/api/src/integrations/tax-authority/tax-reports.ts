/* Tax ke hisaab — pure functions (test ho sakein). Raqam PKT din ke hisaab se. */

export interface InvRow {
  status: string; kind: string; authority: string; shopId: string | null;
  saleValue: number; taxAmount: number; totalAmount: number; taxRate: number;
  /** Bill ka asal din (PKT, YYYY-MM-DD) */
  day: string;
  createdAt: Date; submittedAt: Date | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface DayTotals { day: string; bills: number; returns: number; saleValue: number; tax: number; total: number }

/** Mahine ki report: sirf SUCCESS (authority ne maana) — returns minus */
export function monthlyReport(rows: InvRow[], days: string[]) {
  const map = new Map<string, DayTotals>(days.map((d) => [d, { day: d, bills: 0, returns: 0, saleValue: 0, tax: 0, total: 0 }]));
  const byRate = new Map<number, { rate: number; bills: number; saleValue: number; tax: number }>();
  const byShop = new Map<string, { shopId: string | null; bills: number; saleValue: number; tax: number }>();
  for (const r of rows) {
    if (r.status !== 'SUCCESS') continue;
    const d = map.get(r.day);
    if (!d) continue;
    const sign = r.kind === 'RETURN' ? -1 : 1;
    if (sign > 0) d.bills++; else d.returns++;
    d.saleValue = r2(d.saleValue + sign * r.saleValue);
    d.tax = r2(d.tax + sign * r.taxAmount);
    d.total = r2(d.total + sign * r.totalAmount);
    const br = byRate.get(r.taxRate) ?? { rate: r.taxRate, bills: 0, saleValue: 0, tax: 0 };
    if (sign > 0) br.bills++;
    br.saleValue = r2(br.saleValue + sign * r.saleValue); br.tax = r2(br.tax + sign * r.taxAmount);
    byRate.set(r.taxRate, br);
    const k = r.shopId ?? '-';
    const bs = byShop.get(k) ?? { shopId: r.shopId, bills: 0, saleValue: 0, tax: 0 };
    if (sign > 0) bs.bills++;
    bs.saleValue = r2(bs.saleValue + sign * r.saleValue); bs.tax = r2(bs.tax + sign * r.taxAmount);
    byShop.set(k, bs);
  }
  const daily = [...map.values()];
  const totals = daily.reduce((t, d) => ({ bills: t.bills + d.bills, returns: t.returns + d.returns, saleValue: r2(t.saleValue + d.saleValue), tax: r2(t.tax + d.tax), total: r2(t.total + d.total) }), { bills: 0, returns: 0, saleValue: 0, tax: 0, total: 0 });
  return { daily, totals, byRate: [...byRate.values()].sort((a, b) => b.rate - a.rate), byShop: [...byShop.values()] };
}

/** Sehat: kitne pohnche, kitne atke, kitni der me */
export function health(rows: InvRow[]) {
  const c = { success: 0, failed: 0, pending: 0, skipped: 0 };
  let delaySum = 0, delayN = 0;
  for (const r of rows) {
    if (r.status === 'SUCCESS') {
      c.success++;
      if (r.submittedAt) { delaySum += Math.max(0, r.submittedAt.getTime() - r.createdAt.getTime()); delayN++; }
    } else if (r.status === 'FAILED') c.failed++;
    else if (r.status === 'PENDING') c.pending++;
    else c.skipped++;
  }
  const sent = c.success + c.failed;
  return { ...c, successRate: sent ? Math.round((c.success / sent) * 1000) / 10 : null, avgSeconds: delayN ? Math.round(delaySum / delayN / 1000) : null };
}

export function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

export function reportCsv(rep: ReturnType<typeof monthlyReport>, meta: { authority: string; month: string; business: string }) {
  const lines = [
    `"${meta.authority} sales tax report","${meta.month}","${meta.business.replace(/"/g, '""')}"`,
    'Date,Bills,Returns,Value excl. tax,Tax,Total incl. tax',
    ...rep.daily.map((d) => [d.day, d.bills, d.returns, d.saleValue.toFixed(2), d.tax.toFixed(2), d.total.toFixed(2)].join(',')),
    ['TOTAL', rep.totals.bills, rep.totals.returns, rep.totals.saleValue.toFixed(2), rep.totals.tax.toFixed(2), rep.totals.total.toFixed(2)].join(','),
  ];
  return '﻿' + lines.join('\r\n');
}
