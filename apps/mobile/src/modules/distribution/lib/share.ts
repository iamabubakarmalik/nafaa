/** Plain-text summaries for the share sheet (WhatsApp, Messages). */

import { t } from '@/core/i18n';
import { dayYearLabel, rs, trim } from './meta';
import type { InvoicePrint, LoadSheetPrint, RecoverySheet } from '../api/distribution.api';

export function invoiceText(p: InvoicePrint): string {
  return p.invoices.map((inv) => {
    const lines = [
      p.business.name ?? '',
      `${t('Invoice')} ${inv.invoiceNumber ?? inv.orderNumber} · ${dayYearLabel(inv.date)}`,
      inv.customer ? `${inv.customer.businessName ?? inv.customer.name}` : '',
      '',
      ...inv.lines.map((l) => `${l.no}. ${l.name} — ${trim(l.qty)} ${l.unitName ?? ''} × ${rs(l.rate)} = ${rs(l.net)}`),
      ...inv.free.map((f) => `+ ${f.name} — ${f.text} (${t('Free')})`),
      '',
      `${t('Total')}: ${rs(inv.totals.total)}`,
      ...(inv.totals.paid > 0 ? [`${t('Paid')}: ${rs(inv.totals.paid)}`] : []),
      ...(inv.totals.balanceAfterInvoice != null ? [`${t('Khata')}: ${rs(inv.totals.balanceAfterInvoice)}`] : []),
      p.business.footer ?? '',
    ];
    return lines.filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n');
  }).join('\n\n----------\n\n');
}

export function loadSheetText(p: LoadSheetPrint): string {
  const s = p.sheet;
  const lines = [
    `${p.business.name ?? ''} — ${t('Load sheet')} ${s.number}`,
    `${dayYearLabel(s.date)} · ${s.routeName ?? t('Mili juli')}${s.vehicleNo ? ` · ${s.vehicleNo}` : ''}`,
    '',
    ...s.goods.map((g) => `• ${g.name}${g.variantName ? ` · ${g.variantName}` : ''}: ${g.text}`),
    ...(s.freeGoods.length ? ['', `${t('Free maal (scheme)')}:`, ...s.freeGoods.map((g) => `• ${g.name}: ${g.text}`)] : []),
    '',
    `${t('Invoices')}: ${s.invoiceCount} · ${rs(s.totalValue)}`,
  ];
  return lines.join('\n');
}

export function recoverySheetText(r: RecoverySheet): string {
  return [
    `${r.business?.shopName ?? ''} — ${t('Recovery sheet')}`,
    `${r.route.name}${r.route.bookerName ? ` · ${r.route.bookerName}` : ''} · ${dayYearLabel(r.date)}`,
    '',
    ...r.rows.map((x, i) => `${i + 1}. ${x.customer.businessName ?? x.customer.name} — ${rs(x.balance)}${x.overdue && x.dueDays ? ` (${t('{{dueDays}} din', { dueDays: x.dueDays })})` : ''}`),
    '',
    `${t('Customers')}: ${r.totals.customers} · ${t('Kul udhaar')}: ${rs(r.totals.balance)}`,
  ].join('\n');
}
