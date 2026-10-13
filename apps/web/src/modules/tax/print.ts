/** Printable tax documents: the monthly return sheet (A4/PDF) and the invoice list. */

import type { PrintDoc, PrintSection } from '@core/print';
import type { TaxInvoiceRow, TaxReport } from './api';
import { STATUS, authLabel, dayShort, dayTime, monthName } from './meta';

type Money = (n: number | null | undefined) => string;

/** Figures an accountant copies into the PRA / SRB / KPRA / FBR return for one month. */
export function monthlyReturnDoc(r: TaxReport, money: Money): PrintDoc {
  const sections: PrintSection[] = [];
  for (const a of r.byAuthority) {
    const t = a.totals;
    sections.push({
      kind: 'rows',
      title: `${authLabel(a.authority)} — return ke figures`,
      rows: [
        { label: `Sale, tax ke baghair (${t.bills} bill)`, value: money(t.grossValue) },
        { label: 'Output tax (bills par)', value: money(t.grossTax) },
        { label: `- Credit notes / wapsi (${t.returns})`, value: money(t.returnValue), sub: true },
        { label: '- Credit notes ka tax', value: money(t.returnTax), sub: true },
        { label: 'Net taxable sale', value: money(t.saleValue), strong: true },
        { label: 'Net tax (jama karna hai)', value: money(t.tax), strong: true },
        ...(a.notSent.bills ? [{ label: `Abhi authority ne nahi liye (${a.notSent.bills})`, value: money(a.notSent.tax) }] : []),
      ],
    });
    const reg = [
      a.businessName && `Business: ${a.businessName}`,
      a.ntn.length && `NTN: ${a.ntn.join(', ')}`,
      a.posIds.length && `POS ID: ${a.posIds.map((p) => `${p.posId} (${p.branch})`).join(', ')}`,
    ].filter(Boolean).join('\n');
    if (reg) sections.push({ kind: 'text', text: reg });
  }
  if (r.byRate.length) {
    sections.push({
      kind: 'table', title: 'Rate ke hisaab se',
      columns: [{ label: 'Rate' }, { label: 'Bill', align: 'right' }, { label: 'Sale (tax ke baghair)', align: 'right' }, { label: 'Tax', align: 'right' }],
      rows: r.byRate.map((x) => [`${x.rate}%`, String(x.bills), money(x.saleValue), money(x.tax)]),
    });
  }
  if (r.byShop.length > 1) {
    sections.push({
      kind: 'table', title: 'Branch ke hisaab se',
      columns: [{ label: 'Branch' }, { label: 'Bill', align: 'right' }, { label: 'Sale', align: 'right' }, { label: 'Tax', align: 'right' }],
      rows: r.byShop.map((x) => [x.name, String(x.bills), money(x.saleValue), money(x.tax)]),
    });
  }
  const busy = r.daily.filter((d) => d.bills || d.returns);
  if (busy.length) {
    sections.push({
      kind: 'table', title: 'Roz ka hisaab',
      columns: [{ label: 'Din' }, { label: 'Bill', align: 'right' }, { label: 'Wapsi', align: 'right', wideOnly: true }, { label: 'Sale', align: 'right', wideOnly: true }, { label: 'Tax', align: 'right' }, { label: 'Kul', align: 'right' }],
      rows: busy.map((d) => [dayShort(d.day), String(d.bills), String(d.returns), money(d.saleValue), money(d.tax), money(d.total)]),
      footer: ['Kul', String(r.totals.bills), String(r.totals.returns), money(r.totals.saleValue), money(r.totals.tax), money(r.totals.total)],
    });
  }
  if (r.notSent.bills) {
    sections.push({ kind: 'text', title: 'Dhyan dein', text: `${r.notSent.bills} bill abhi authority ne nahi liye (tax ${money(r.notSent.tax)}). Yeh upar ke figures me shamil nahi. Tax → Invoices me dekh kar dobara bhejein.` });
  }
  return {
    title: `Sales tax — ${monthName(r.month)}`,
    subtitle: r.business || undefined,
    meta: [
      ['Authority', r.authority ? authLabel(r.authority) : 'Sab authorities'],
      ['Branch', r.shopName ?? 'Sab branches'],
      ['Muddat', `${dayShort(r.period.from)} – ${dayShort(r.period.to)}`],
    ],
    sections,
    footer: 'Sirf woh bill shamil hain jo authority ne qabool kiye. Qeemat tax samet maani gayi hai.',
  };
}

export function invoicesDoc(rows: TaxInvoiceRow[], money: Money, period: string, filters: string, branchOf: (id: string | null) => string): PrintDoc {
  return {
    title: 'Tax invoices',
    meta: [['Muddat', period], ...(filters ? [['Filter', filters] as [string, string]] : [])],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Waqt', wideOnly: true }, { label: 'Bill' }, { label: 'Authority', wideOnly: true }, { label: 'Branch', wideOnly: true },
        { label: 'Kul', align: 'right' }, { label: 'Tax', align: 'right' }, { label: 'Haal / number' },
      ],
      rows: rows.map((r) => [
        dayTime(r.createdAt), `${r.kind === 'RETURN' ? 'Wapsi ' : ''}${r.usin}`, r.authority, branchOf(r.shopId),
        money(r.kind === 'RETURN' ? -r.totalAmount : r.totalAmount), money(r.taxAmount),
        r.status === 'SUCCESS' ? r.fiscalNumber ?? '' : STATUS[r.status].label,
      ]),
    }],
  };
}
