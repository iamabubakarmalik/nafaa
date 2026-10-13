/**
 * Printable documents for the online store pages (orders list, report,
 * COD money and customers). PrintDocs, so the shared print button prints
 * them on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { CodHistory, CodSummary, CustomersResult, OnlineOrder, OnlineReport } from '../api/online-orders.api';
import { sourceOf } from './labels';
import { isClosed, orderNo, statusShort } from './orders';

const day = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const keyDay = (k: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${k}T12:00:00`));

export function ordersDoc(orders: OnlineOrder[], list: string, period: string, filter: string, total: number): PrintDoc {
  const live = orders.filter((o) => !isClosed(o));
  const value = live.reduce((a, o) => a + Number(o.total || 0), 0);
  return {
    title: `Online orders — ${list}`,
    subtitle: period,
    meta: [['Orders', String(total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Kul (cancel ke bagair)', formatPKR(value)]],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Order' }, { label: 'Date', wideOnly: true }, { label: 'Customer' }, { label: 'Shehar', wideOnly: true },
        { label: 'Channel', wideOnly: true }, { label: 'Halat', wideOnly: true }, { label: 'Amount', align: 'right' },
      ],
      rows: orders.map((o) => [
        `#${orderNo(o)}`, day(o.receivedAt), o.customerName, o.customerCity ?? '', o.integration?.displayName ?? sourceOf(o).label,
        `${statusShort(o.orderStatus)}${o.isCod && o.paymentStatus !== 'PAID' ? ' · COD' : ''}`,
        isClosed(o) ? `(${formatPKR(o.total)})` : formatPKR(o.total),
      ]),
      footer: ['', '', 'Kul', '', '', '', formatPKR(value)],
    }],
    footer: total > orders.length ? `Pehle ${orders.length} orders dikhaye gaye hain (kul ${total})` : undefined,
  };
}

export function reportDoc(r: OnlineReport, period: string, channel: string): PrintDoc {
  const t = r.totals;
  return {
    title: 'Online sale report',
    subtitle: period,
    meta: [['Channel', channel], ['Orders', String(t.orders)], ['Sale (cancel/wapas ke bagair)', formatPKR(t.netValue)]],
    sections: [
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: `Orders aaye (${t.orders})`, value: formatPKR(t.value) },
          { label: `Cancel / reject (${t.cancelled})`, value: `${t.cancelRate}%` },
          { label: `Wapas — RTO (${t.returned})`, value: formatPKR(t.returnedValue) },
          { label: `Deliver hue (${t.delivered})`, value: formatPKR(t.deliveredValue) },
          { label: 'Ausat order', value: formatPKR(t.avgOrderValue) },
          { label: 'RTO rate', value: `${t.rtoRate}%` },
          { label: 'COD baqi (is period)', value: formatPKR(r.payment.cod.pending) },
          { label: 'Sale', value: formatPKR(t.netValue), strong: true },
        ],
      },
      {
        kind: 'table', title: 'Channel',
        columns: [{ label: 'Channel' }, { label: 'Orders', align: 'right' }, { label: 'Sale', align: 'right' }, { label: 'RTO', align: 'right', wideOnly: true }],
        rows: r.byChannel.map((c) => [c.name, String(c.orders), formatPKR(c.value), `${c.rtoRate}%`]),
      },
      {
        kind: 'table', title: 'Shehar',
        columns: [{ label: 'Shehar' }, { label: 'Orders', align: 'right' }, { label: 'Sale', align: 'right' }, { label: 'RTO', align: 'right', wideOnly: true }],
        rows: r.byCity.map((c) => [c.city, String(c.orders), formatPKR(c.value), `${c.rtoRate}%`]),
      },
      ...(r.byCourier.length ? [{
        kind: 'table' as const, title: 'Courier',
        columns: [{ label: 'Courier' }, { label: 'Bheje', align: 'right' as const }, { label: 'Deliver', align: 'right' as const }, { label: 'RTO', align: 'right' as const }],
        rows: r.byCourier.map((c) => [c.name, String(c.dispatched), `${c.deliveryRate}%`, `${c.rtoRate}%`]),
      }] : []),
      {
        kind: 'table', title: 'Sab se zyada bika',
        columns: [{ label: 'Cheez' }, { label: 'Qty', align: 'right' }, { label: 'Sale', align: 'right' }],
        rows: r.topProducts.map((p) => [p.name, String(Number(p.qty.toFixed(2))), formatPKR(p.value)]),
      },
    ],
  };
}

export function codDoc(s: CodSummary, h: CodHistory | undefined, period: string): PrintDoc {
  return {
    title: 'COD & courier hisaab',
    subtitle: period,
    meta: [
      ['Courier ke paas', formatPKR(s.totals.withCourierValue)], ['Raste me', formatPKR(s.totals.inTransitValue)],
      ['Is mahine mila', formatPKR(s.totals.settledMonthValue)], ['RTO (30 din)', `${s.totals.rtoRate}%`],
    ],
    sections: [
      {
        kind: 'table', title: 'Courier-wise',
        columns: [{ label: 'Courier' }, { label: 'Raste me', align: 'right' }, { label: 'Courier ke paas', align: 'right' }, { label: 'Mila', align: 'right', wideOnly: true }, { label: 'RTO', align: 'right' }],
        rows: s.couriers.map((c) => [c.name, formatPKR(c.inTransitValue), formatPKR(c.withCourierValue), formatPKR(c.settledMonthValue), `${c.rtoRate}%`]),
      },
      {
        kind: 'table', title: 'Courier ke paas — settlement ka intezar',
        columns: [{ label: 'Order' }, { label: 'Customer' }, { label: 'Courier', wideOnly: true }, { label: 'CN', wideOnly: true }, { label: 'Din', align: 'right', wideOnly: true }, { label: 'Amount', align: 'right' }],
        rows: s.withCourier.map((o) => [`#${o.externalOrderNumber ?? o.externalOrderId}`, o.customerName, o.courier ?? '', o.trackingNumber ?? '', o.daysWaiting == null ? '' : String(o.daysWaiting), formatPKR(o.total)]),
        footer: ['', 'Kul', '', '', '', formatPKR(s.totals.withCourierValue)],
      },
      ...(h?.settlements.length ? [{
        kind: 'table' as const, title: 'Settlements (paisa mila)',
        columns: [{ label: 'Date' }, { label: 'Ref' }, { label: 'Orders', align: 'right' as const }, { label: 'Amount', align: 'right' as const }],
        rows: h.settlements.map((b) => [keyDay(b.day), b.ref ?? '—', String(b.count), formatPKR(b.value)]),
        footer: ['Kul', '', String(h.totals.settled), formatPKR(h.totals.settledValue)],
      }] : []),
      ...(h?.returns.length ? [{
        kind: 'table' as const, title: 'Wapas aaye parcels (RTO)',
        columns: [{ label: 'Order' }, { label: 'Customer' }, { label: 'Courier', wideOnly: true }, { label: 'Wajah', wideOnly: true }, { label: 'Amount', align: 'right' as const }],
        rows: h.returns.map((r) => [`#${r.number}`, r.customerName, r.courier, r.reason ?? '', formatPKR(r.total)]),
        footer: ['', 'Kul', '', '', formatPKR(h.totals.returnedValue)],
      }] : []),
    ],
  };
}

export function customersDoc(c: CustomersResult, segment: string): PrintDoc {
  return {
    title: 'Online customers',
    subtitle: segment,
    meta: [['Customers', String(c.total)], ['Dobara lene wale', `${c.totals.repeatRate}%`]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Naam' }, { label: 'Phone' }, { label: 'Shehar', wideOnly: true }, { label: 'Orders', align: 'right', wideOnly: true }, { label: 'Kharch', align: 'right' }],
      rows: c.rows.map((r) => [r.name, r.phone, r.city ?? '', `${r.delivered}/${r.orders}`, formatPKR(r.spent)]),
    }],
    footer: c.total > c.rows.length ? `Pehle ${c.rows.length} customers dikhaye gaye hain (kul ${c.total})` : undefined,
  };
}
