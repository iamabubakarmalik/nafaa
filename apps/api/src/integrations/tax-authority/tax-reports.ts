/* Tax figures as pure functions. `day` is the bill's business day in the shop's timezone. */

export interface InvRow {
  status: string; kind: string; authority: string; shopId: string | null;
  saleValue: number; taxAmount: number; totalAmount: number; taxRate: number;
  /** Business day of the bill (YYYY-MM-DD) */
  day: string;
  createdAt: Date; submittedAt: Date | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface DayTotals { day: string; bills: number; returns: number; saleValue: number; tax: number; total: number }

/** Accepted (SUCCESS) bills only; returns are subtracted. `days` are bucket keys matched against `row.day`. */
export function monthlyReport(rows: InvRow[], days: string[]) {
  const map = new Map<string, DayTotals>(days.map((d) => [d, { day: d, bills: 0, returns: 0, saleValue: 0, tax: 0, total: 0 }]));
  const byRate = new Map<number, { rate: number; bills: number; saleValue: number; tax: number }>();
  const byShop = new Map<string, { shopId: string | null; bills: number; saleValue: number; tax: number }>();
  const credit = { value: 0, tax: 0, total: 0 };
  for (const r of rows) {
    if (r.status !== 'SUCCESS') continue;
    const d = map.get(r.day);
    if (!d) continue;
    const sign = r.kind === 'RETURN' ? -1 : 1;
    if (sign > 0) d.bills++;
    else {
      d.returns++;
      credit.value = r2(credit.value + r.saleValue); credit.tax = r2(credit.tax + r.taxAmount); credit.total = r2(credit.total + r.totalAmount);
    }
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
  const net = daily.reduce((t, d) => ({ bills: t.bills + d.bills, returns: t.returns + d.returns, saleValue: r2(t.saleValue + d.saleValue), tax: r2(t.tax + d.tax), total: r2(t.total + d.total) }), { bills: 0, returns: 0, saleValue: 0, tax: 0, total: 0 });
  const totals = {
    ...net,
    /** Before credit notes */
    grossValue: r2(net.saleValue + credit.value), grossTax: r2(net.tax + credit.tax),
    returnValue: credit.value, returnTax: credit.tax, returnTotal: credit.total,
  };
  return { daily, totals, byRate: [...byRate.values()].sort((a, b) => b.rate - a.rate), byShop: [...byShop.values()] };
}

/** Delivery health: accepted, failed, waiting, and how fast numbers came back. */
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

/** Bills the authority has not accepted yet: count and the tax on them. */
export function notSent(rows: InvRow[]) {
  const out = { bills: 0, value: 0, tax: 0 };
  for (const r of rows) {
    if (r.status !== 'FAILED' && r.status !== 'PENDING') continue;
    const sign = r.kind === 'RETURN' ? -1 : 1;
    out.bills++;
    out.value = r2(out.value + sign * r.saleValue);
    out.tax = r2(out.tax + sign * r.taxAmount);
  }
  return out;
}

/** Return figures and delivery health for each authority in `rows`, plus any listed in `include`. */
export function byAuthority(rows: InvRow[], days: string[], include: string[] = []) {
  const groups = new Map<string, InvRow[]>(include.map((a) => [a, []]));
  for (const r of rows) {
    const list = groups.get(r.authority);
    if (list) list.push(r);
    else groups.set(r.authority, [r]);
  }
  return [...groups.entries()].map(([authority, list]) => {
    const rep = monthlyReport(list, days);
    return { authority, totals: rep.totals, byRate: rep.byRate, health: health(list), notSent: notSent(list) };
  });
}

export function monthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Every day key from `from` to `to`, both included. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`).getTime();
  while (d.getTime() <= end && out.length < 3700) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const AUTH_LABEL: Record<string, string> = { PRA: 'PRA Punjab', SRB: 'SRB Sindh', KPRA: 'KPRA KP', FBR: 'FBR POS' };
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function reportCsv(
  rep: ReturnType<typeof monthlyReport> & { byAuthority?: ReturnType<typeof byAuthority> },
  meta: { authority: string; month: string; business: string },
) {
  const money = (n: number) => n.toFixed(2);
  const lines = [
    `${q(`${AUTH_LABEL[meta.authority] ?? meta.authority} sales tax report`)},${q(meta.month)},${q(meta.business)}`,
    'Date,Bills,Returns,Value excl. tax,Tax,Total incl. tax',
    ...rep.daily.map((d) => [d.day, d.bills, d.returns, money(d.saleValue), money(d.tax), money(d.total)].join(',')),
    ['TOTAL', rep.totals.bills, rep.totals.returns, money(rep.totals.saleValue), money(rep.totals.tax), money(rep.totals.total)].join(','),
  ];
  if (rep.byAuthority?.length) {
    lines.push('', 'Return summary', 'Authority,Bills,Sales excl. tax,Output tax,Credit notes,Credit note value,Credit note tax,Net value,Net tax,Not accepted bills,Tax on not accepted');
    for (const a of rep.byAuthority) {
      const t = a.totals;
      lines.push([q(AUTH_LABEL[a.authority] ?? a.authority), t.bills, money(t.grossValue), money(t.grossTax), t.returns, money(t.returnValue), money(t.returnTax), money(t.saleValue), money(t.tax), a.notSent.bills, money(a.notSent.tax)].join(','));
    }
  }
  if (rep.byRate.length) {
    lines.push('', 'Rate,Bills,Value excl. tax,Tax');
    for (const r of rep.byRate) lines.push([`${r.rate}%`, r.bills, money(r.saleValue), money(r.tax)].join(','));
  }
  return '﻿' + lines.join('\r\n');
}
