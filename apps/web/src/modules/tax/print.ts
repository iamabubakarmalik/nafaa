/** Printable tax documents: the monthly return sheet (A4/PDF) and the invoice list. */

import type { PrintDoc, PrintSection } from '@core/print';
import type { TaxInvoiceRow, TaxReport } from './api';
import { STATUS, authLabel, dayShort, dayTime, monthName } from './meta';
import { t as tr } from '@core/i18n';

type Money = (n: number | null | undefined) => string;

/** Figures an accountant copies into the PRA / SRB / KPRA / FBR return for one month. */
export function monthlyReturnDoc(r: TaxReport, money: Money): PrintDoc {
  const sections: PrintSection[] = [];
  for (const a of r.byAuthority) {
    const t = a.totals;
    sections.push({
      kind: 'rows',
      title: tr('{{authority}} — return ke figures', { authority: authLabel(a.authority) }),
      rows: [
        { label: tr('Sale, tax ke baghair ({{bills}} bill)', { bills: t.bills }), value: money(t.grossValue) },
        { label: tr('Output tax (bills par)'), value: money(t.grossTax) },
        { label: tr('- Credit notes / return ({{returns}})', { returns: t.returns }), value: money(t.returnValue), sub: true },
        { label: tr('- Credit notes ka tax'), value: money(t.returnTax), sub: true },
        { label: tr('Net taxable sale'), value: money(t.saleValue), strong: true },
        { label: tr('Net tax (jama karna hai)'), value: money(t.tax), strong: true },
        ...(a.notSent.bills ? [{ label: tr('Abhi authority ne nahi liye ({{bills}})', { bills: a.notSent.bills }), value: money(a.notSent.tax) }] : []),
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
      kind: 'table', title: tr('Rate ke hisaab se'),
      columns: [{ label: tr('Rate') }, { label: tr('Bill'), align: 'right' }, { label: tr('Sale (tax ke baghair)'), align: 'right' }, { label: tr('Tax'), align: 'right' }],
      rows: r.byRate.map((x) => [`${x.rate}%`, String(x.bills), money(x.saleValue), money(x.tax)]),
    });
  }
  if (r.byShop.length > 1) {
    sections.push({
      kind: 'table', title: tr('Branch ke hisaab se'),
      columns: [{ label: tr('Branch') }, { label: tr('Bill'), align: 'right' }, { label: tr('Sale'), align: 'right' }, { label: tr('Tax'), align: 'right' }],
      rows: r.byShop.map((x) => [x.name, String(x.bills), money(x.saleValue), money(x.tax)]),
    });
  }
  const busy = r.daily.filter((d) => d.bills || d.returns);
  if (busy.length) {
    sections.push({
      kind: 'table', title: tr('Roz ka hisaab'),
      columns: [{ label: tr('Din') }, { label: tr('Bill'), align: 'right' }, { label: tr('Return'), align: 'right', wideOnly: true }, { label: tr('Sale'), align: 'right', wideOnly: true }, { label: tr('Tax'), align: 'right' }, { label: tr('Kul'), align: 'right' }],
      rows: busy.map((d) => [dayShort(d.day), String(d.bills), String(d.returns), money(d.saleValue), money(d.tax), money(d.total)]),
      footer: [tr('Kul'), String(r.totals.bills), String(r.totals.returns), money(r.totals.saleValue), money(r.totals.tax), money(r.totals.total)],
    });
  }
  if (r.notSent.bills) {
    sections.push({ kind: 'text', title: tr('Dhyan dein'), text: tr('{{bills}} bill abhi authority ne nahi liye (tax {{tax}}). Yeh upar ke figures me shamil nahi. Tax → Invoices me dekh kar dobara bhejein.', { bills: r.notSent.bills, tax: money(r.notSent.tax) }) });
  }
  return {
    title: tr('Sales tax — {{month}}', { month: monthName(r.month) }),
    subtitle: r.business || undefined,
    meta: [
      [tr('Authority'), r.authority ? authLabel(r.authority) : tr('Sab authorities')],
      [tr('Branch'), r.shopName ?? tr('Sab branches')],
      [tr('Period'), `${dayShort(r.period.from)} – ${dayShort(r.period.to)}`],
    ],
    sections,
    footer: tr('Sirf woh bill shamil hain jo authority ne qabool kiye. Qeemat tax samet maani gayi hai.'),
  };
}

export function invoicesDoc(rows: TaxInvoiceRow[], money: Money, period: string, filters: string, branchOf: (id: string | null) => string): PrintDoc {
  return {
    title: tr('Tax invoices'),
    meta: [[tr('Period'), period], ...(filters ? [[tr('Filter'), filters] as [string, string]] : [])],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Waqt'), wideOnly: true }, { label: tr('Bill') }, { label: tr('Authority'), wideOnly: true }, { label: tr('Branch'), wideOnly: true },
        { label: tr('Kul'), align: 'right' }, { label: tr('Tax'), align: 'right' }, { label: tr('Haal / number') },
      ],
      rows: rows.map((r) => [
        dayTime(r.createdAt), `${r.kind === 'RETURN' ? tr('Return ') : ''}${r.usin}`, r.authority, branchOf(r.shopId),
        money(r.kind === 'RETURN' ? -r.totalAmount : r.totalAmount), money(r.taxAmount),
        r.status === 'SUCCESS' ? r.fiscalNumber ?? '' : STATUS[r.status].label,
      ]),
    }],
  };
}
