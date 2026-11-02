/**
 * Printable returns report for the current filter: every return with its
 * bill, items, refund method and stock result, then totals. A PrintDoc, so
 * the shared print button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ReturnList } from '../api/returns.api';
import { methodLabel, qtyText } from './meta';
import { t as tr } from '@core/i18n';

const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' });

export function returnsDoc(list: ReturnList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: tr('Maal return (Returns)'),
    subtitle: period,
    meta: [
      [tr('Return'), String(t.count)],
      ...(filter ? [[tr('Filter'), filter] as [string, string]] : []),
      [tr('Wapas kiya'), formatPKR(t.refunded)],
      [tr('Sale ka'), `${t.rate}%`],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('Waqt') }, { label: tr('No.'), wideOnly: true }, { label: tr('Bill') }, { label: tr('Customer'), wideOnly: true },
          { label: tr('Cheezein') }, { label: tr('Amount'), align: 'right' }, { label: tr('Kaise'), wideOnly: true }, { label: tr('Stock'), wideOnly: true },
          { label: tr('Wajah'), wideOnly: true }, { label: tr('Kis ne'), wideOnly: true },
        ],
        rows: list.items.map((r) => [
          day(r.returnedAt), r.returnNumber, r.sale.saleNumber, r.sale.customer?.name ?? tr('Walk-in'),
          r.items.map((i) => `${i.name} × ${qtyText(i.quantity)}`).join(', '),
          formatPKR(r.refundAmount),
          r.khataAmount > 0 ? `${methodLabel(r.refundMethod)} + khata` : methodLabel(r.refundMethod),
          r.writtenOffQty > 0 ? (r.restockedQty > 0 ? tr('Kuch kharab') : tr('Kharab')) : tr('Wapas'),
          r.reason ?? '', r.createdBy?.fullName ?? '',
        ]),
      },
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Cheezein wapas'), value: qtyText(t.qty) },
          { label: tr('Stock me wapas'), value: qtyText(t.restockedQty) },
          { label: tr('Kharab (stock me nahi)'), value: qtyText(t.writtenOffQty) },
          ...(t.khata > 0 ? [{ label: tr('Khate se kam'), value: formatPKR(t.khata) }, { label: tr('Haath me diye'), value: formatPKR(t.payout) }] : []),
          { label: tr('Kul wapas'), value: formatPKR(t.refunded), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? tr('Pehli {{count}} return dikhayi gayi hain (kul {{total}})', { count: list.items.length, total: list.total }) : undefined,
  };
}
