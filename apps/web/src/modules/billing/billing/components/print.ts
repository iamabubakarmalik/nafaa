/** Printable documents for the billing pages: one Nafaa bill and the full billing record. */

import type { PrintDoc } from '@core/print';
import { formatPKR } from '@core/lib/format';
import type { Invoice, Payment } from '../api/billing.api';
import { INTERVAL, INVOICE_STATUS, PAYMENT_STATUS, PROVIDER, formatDate, formatDateTime } from './helpers';

export function invoiceDoc(inv: Invoice): PrintDoc {
  const st = INVOICE_STATUS[inv.status];
  const paid = inv.status === 'PAID';
  return {
    title: 'Nafaa subscription bill',
    subtitle: inv.invoiceNumber,
    meta: [
      ['Haal', st.label],
      ['Tareekh', formatDate(inv.createdAt)],
      ['Due', formatDate(inv.dueDate)],
      ...(inv.paidAt ? [['Ada hua', formatDate(inv.paidAt)] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'rows',
        title: 'Tafseel',
        rows: [
          { label: 'Plan', value: inv.subscription?.plan?.name || inv.description || 'Subscription' },
          ...(inv.subscription?.interval ? [{ label: 'Muddat', value: INTERVAL[inv.subscription.interval].label }] : []),
          ...(inv.periodStart && inv.periodEnd ? [{ label: 'Kab se kab tak', value: `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}` }] : []),
          { label: 'Raqam', value: formatPKR(inv.subtotal ?? inv.total) },
          ...(inv.tax ? [{ label: 'Tax', value: formatPKR(inv.tax) }] : []),
          { label: 'Kul', value: formatPKR(inv.total), strong: true },
          { label: 'Ada kiya', value: formatPKR(inv.amountPaid) },
          { label: paid ? 'Baqi' : 'Abhi dena hai', value: formatPKR(paid ? 0 : inv.amountDue), strong: true },
        ],
      },
      ...(inv.payments?.length ? [{
        kind: 'table' as const,
        title: 'Payments',
        columns: [{ label: 'Tareekh' }, { label: 'Tareeqa' }, { label: 'Ref', wideOnly: true }, { label: 'Haal' }, { label: 'Raqam', align: 'right' as const }],
        rows: inv.payments.map((p) => [formatDate(p.createdAt), PROVIDER[p.provider]?.label ?? p.provider, p.transactionId ?? '—', PAYMENT_STATUS[p.status].label, formatPKR(p.amount)]),
      }] : []),
    ],
    footer: 'Ye bill Nafaa POS subscription ka hai — apne record ke liye rakhein.',
  };
}

export function billingDoc(invoices: Invoice[], payments: Payment[], totals: { paidTotal: number; due: number }, planName?: string): PrintDoc {
  return {
    title: 'Billing ka record',
    subtitle: planName ? `Plan: ${planName}` : undefined,
    meta: [['Ada kiya', formatPKR(totals.paidTotal)], ['Baqi', formatPKR(totals.due)], ['Bill', String(invoices.length)]],
    sections: [
      {
        kind: 'table',
        title: 'Bill',
        columns: [{ label: 'Bill #' }, { label: 'Tareekh' }, { label: 'Plan', wideOnly: true }, { label: 'Haal' }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: invoices.map((i) => [i.invoiceNumber, formatDate(i.createdAt), i.subscription?.plan?.name || i.description || '—', INVOICE_STATUS[i.status].label, formatPKR(i.total), i.status === 'PAID' ? '—' : formatPKR(i.amountDue)]),
      },
      ...(payments.length ? [{
        kind: 'table' as const,
        title: 'Payments',
        columns: [{ label: 'Tareekh' }, { label: 'Tareeqa' }, { label: 'Bill #', wideOnly: true }, { label: 'Haal' }, { label: 'Raqam', align: 'right' as const }],
        rows: payments.map((p) => [formatDateTime(p.createdAt), PROVIDER[p.provider]?.label ?? p.provider, p.invoice?.invoiceNumber ?? '—', PAYMENT_STATUS[p.status].label, formatPKR(p.amount)]),
      }] : []),
    ],
  };
}
