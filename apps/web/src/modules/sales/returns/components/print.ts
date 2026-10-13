/**
 * Printable returns report for the current filter: every return with its
 * bill, items, refund method and stock result, then totals. A PrintDoc, so
 * the shared print button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ReturnList } from '../api/returns.api';
import { methodLabel, qtyText } from './meta';

const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' });

export function returnsDoc(list: ReturnList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: 'Maal return (Returns)',
    subtitle: period,
    meta: [
      ['Return', String(t.count)],
      ...(filter ? [['Filter', filter] as [string, string]] : []),
      ['Wapas kiya', formatPKR(t.refunded)],
      ['Sale ka', `${t.rate}%`],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Waqt' }, { label: 'No.', wideOnly: true }, { label: 'Bill' }, { label: 'Customer', wideOnly: true },
          { label: 'Cheezein' }, { label: 'Amount', align: 'right' }, { label: 'Kaise', wideOnly: true }, { label: 'Stock', wideOnly: true },
          { label: 'Wajah', wideOnly: true }, { label: 'Kis ne', wideOnly: true },
        ],
        rows: list.items.map((r) => [
          day(r.returnedAt), r.returnNumber, r.sale.saleNumber, r.sale.customer?.name ?? 'Walk-in',
          r.items.map((i) => `${i.name} × ${qtyText(i.quantity)}`).join(', '),
          formatPKR(r.refundAmount),
          r.khataAmount > 0 ? `${methodLabel(r.refundMethod)} + khata` : methodLabel(r.refundMethod),
          r.writtenOffQty > 0 ? (r.restockedQty > 0 ? 'Kuch kharab' : 'Kharab') : 'Wapas',
          r.reason ?? '', r.createdBy?.fullName ?? '',
        ]),
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Cheezein wapas', value: qtyText(t.qty) },
          { label: 'Stock me wapas', value: qtyText(t.restockedQty) },
          { label: 'Kharab (stock me nahi)', value: qtyText(t.writtenOffQty) },
          ...(t.khata > 0 ? [{ label: 'Khate se kam', value: formatPKR(t.khata) }, { label: 'Haath me diye', value: formatPKR(t.payout) }] : []),
          { label: 'Kul wapas', value: formatPKR(t.refunded), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} return dikhayi gayi hain (kul ${list.total})` : undefined,
  };
}
