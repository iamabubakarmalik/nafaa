/** Printable documents for the billing pages: one Nafaa bill and the full billing record. */

import type { PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import type { Invoice, Payment } from '../api/billing.api';
import { INTERVAL, INVOICE_STATUS, PAYMENT_STATUS, PROVIDER, formatDate, formatDateTime } from './helpers';
import { t } from '@core/i18n';

export function invoiceDoc(inv: Invoice): PrintDoc {
  const st = INVOICE_STATUS[inv.status];
  const paid = inv.status === 'PAID';
  return {
    title: t('Nafaa subscription bill'),
    subtitle: inv.invoiceNumber,
    meta: [
      [t('Haal'), st.label],
      [t('Date'), formatDate(inv.createdAt)],
      [t('Due'), formatDate(inv.dueDate)],
      ...(inv.paidAt ? [[t('Ada hua'), formatDate(inv.paidAt)] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'rows',
        title: t('Details'),
        rows: [
          { label: t('Plan'), value: inv.subscription?.plan?.name || inv.description || 'Subscription' },
          ...(inv.subscription?.interval ? [{ label: t('Period'), value: INTERVAL[inv.subscription.interval].label }] : []),
          ...(inv.periodStart && inv.periodEnd ? [{ label: t('Kab se kab tak'), value: `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}` }] : []),
          { label: t('Amount'), value: formatPKR(inv.subtotal ?? inv.total) },
          ...(inv.tax ? [{ label: t('Tax'), value: formatPKR(inv.tax) }] : []),
          { label: t('Kul'), value: formatPKR(inv.total), strong: true },
          { label: t('Ada kiya'), value: formatPKR(inv.amountPaid) },
          { label: paid ? t('Baqi') : t('Abhi dena hai'), value: formatPKR(paid ? 0 : inv.amountDue), strong: true },
        ],
      },
      ...(inv.payments?.length ? [{
        kind: 'table' as const,
        title: t('Payments'),
        columns: [{ label: t('Date') }, { label: t('Tareeqa') }, { label: t('Ref'), wideOnly: true }, { label: t('Haal') }, { label: t('Amount'), align: 'right' as const }],
        rows: inv.payments.map((p) => [formatDate(p.createdAt), PROVIDER[p.provider]?.label ?? p.provider, p.transactionId ?? '—', PAYMENT_STATUS[p.status].label, formatPKR(p.amount)]),
      }] : []),
    ],
    footer: t('Ye bill Nafaa POS subscription ka hai — apne record ke liye rakhein.'),
  };
}

export function billingDoc(invoices: Invoice[], payments: Payment[], totals: { paidTotal: number; due: number }, planName?: string): PrintDoc {
  return {
    title: t('Billing ka record'),
    subtitle: planName ? t('Plan: {{planName}}', { planName }) : undefined,
    meta: [[t('Ada kiya'), formatPKR(totals.paidTotal)], [t('Baqi'), formatPKR(totals.due)], [t('Bill'), String(invoices.length)]],
    sections: [
      {
        kind: 'table',
        title: t('Bill'),
        columns: [{ label: t('Bill #') }, { label: t('Date') }, { label: t('Plan'), wideOnly: true }, { label: t('Haal') }, { label: t('Kul'), align: 'right' }, { label: t('Baqi'), align: 'right' }],
        rows: invoices.map((i) => [i.invoiceNumber, formatDate(i.createdAt), i.subscription?.plan?.name || i.description || '—', INVOICE_STATUS[i.status].label, formatPKR(i.total), i.status === 'PAID' ? '—' : formatPKR(i.amountDue)]),
      },
      ...(payments.length ? [{
        kind: 'table' as const,
        title: t('Payments'),
        columns: [{ label: t('Date') }, { label: t('Tareeqa') }, { label: t('Bill #'), wideOnly: true }, { label: t('Haal') }, { label: t('Amount'), align: 'right' as const }],
        rows: payments.map((p) => [formatDateTime(p.createdAt), PROVIDER[p.provider]?.label ?? p.provider, p.invoice?.invoiceNumber ?? '—', PAYMENT_STATUS[p.status].label, formatPKR(p.amount)]),
      }] : []),
    ],
  };
}
