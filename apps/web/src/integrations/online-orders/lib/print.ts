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
import { t as tr } from '@core/i18n';

const day = (iso: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const keyDay = (k: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${k}T12:00:00`));

export function ordersDoc(orders: OnlineOrder[], list: string, period: string, filter: string, total: number): PrintDoc {
  const live = orders.filter((o) => !isClosed(o));
  const value = live.reduce((a, o) => a + Number(o.total || 0), 0);
  return {
    title: tr('Online orders — {{list}}', { list }),
    subtitle: period,
    meta: [[tr('Orders'), String(total)], ...(filter ? [[tr('Filter'), filter] as [string, string]] : []), [tr('Kul (cancel ke bagair)'), formatPKR(value)]],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Order') }, { label: tr('Date'), wideOnly: true }, { label: tr('Customer') }, { label: tr('Shehar'), wideOnly: true },
        { label: tr('Channel'), wideOnly: true }, { label: tr('Halat'), wideOnly: true }, { label: tr('Amount'), align: 'right' },
      ],
      rows: orders.map((o) => [
        `#${orderNo(o)}`, day(o.receivedAt), o.customerName, o.customerCity ?? '', o.integration?.displayName ?? sourceOf(o).label,
        `${statusShort(o.orderStatus)}${o.isCod && o.paymentStatus !== 'PAID' ? ' · COD' : ''}`,
        isClosed(o) ? `(${formatPKR(o.total)})` : formatPKR(o.total),
      ]),
      footer: ['', '', tr('Kul'), '', '', '', formatPKR(value)],
    }],
    footer: total > orders.length ? tr('Pehle {{count}} orders dikhaye gaye hain (kul {{total}})', { count: orders.length, total }) : undefined,
  };
}

export function reportDoc(r: OnlineReport, period: string, channel: string): PrintDoc {
  const t = r.totals;
  return {
    title: tr('Online sale report'),
    subtitle: period,
    meta: [[tr('Channel'), channel], [tr('Orders'), String(t.orders)], [tr('Sale (cancel/wapas ke bagair)'), formatPKR(t.netValue)]],
    sections: [
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Orders aaye ({{orders}})', { orders: t.orders }), value: formatPKR(t.value) },
          { label: tr('Cancel / reject ({{cancelled}})', { cancelled: t.cancelled }), value: `${t.cancelRate}%` },
          { label: tr('Wapas — RTO ({{returned}})', { returned: t.returned }), value: formatPKR(t.returnedValue) },
          { label: tr('Deliver hue ({{delivered}})', { delivered: t.delivered }), value: formatPKR(t.deliveredValue) },
          { label: tr('Ausat order'), value: formatPKR(t.avgOrderValue) },
          { label: tr('RTO rate'), value: `${t.rtoRate}%` },
          { label: tr('COD baqi (is period)'), value: formatPKR(r.payment.cod.pending) },
          { label: tr('Sale'), value: formatPKR(t.netValue), strong: true },
        ],
      },
      {
        kind: 'table', title: tr('Channel'),
        columns: [{ label: tr('Channel') }, { label: tr('Orders'), align: 'right' }, { label: tr('Sale'), align: 'right' }, { label: tr('RTO'), align: 'right', wideOnly: true }],
        rows: r.byChannel.map((c) => [c.name, String(c.orders), formatPKR(c.value), `${c.rtoRate}%`]),
      },
      {
        kind: 'table', title: tr('Shehar'),
        columns: [{ label: tr('Shehar') }, { label: tr('Orders'), align: 'right' }, { label: tr('Sale'), align: 'right' }, { label: tr('RTO'), align: 'right', wideOnly: true }],
        rows: r.byCity.map((c) => [c.city, String(c.orders), formatPKR(c.value), `${c.rtoRate}%`]),
      },
      ...(r.byCourier.length ? [{
        kind: 'table' as const, title: tr('Courier'),
        columns: [{ label: tr('Courier') }, { label: tr('Bheje'), align: 'right' as const }, { label: tr('Deliver hue'), align: 'right' as const }, { label: tr('RTO'), align: 'right' as const }],
        rows: r.byCourier.map((c) => [c.name, String(c.dispatched), `${c.deliveryRate}%`, `${c.rtoRate}%`]),
      }] : []),
      {
        kind: 'table', title: tr('Sab se zyada bika'),
        columns: [{ label: tr('Cheez') }, { label: tr('Qty'), align: 'right' }, { label: tr('Sale'), align: 'right' }],
        rows: r.topProducts.map((p) => [p.name, String(Number(p.qty.toFixed(2))), formatPKR(p.value)]),
      },
    ],
  };
}

export function codDoc(s: CodSummary, h: CodHistory | undefined, period: string): PrintDoc {
  return {
    title: tr('COD & courier hisaab'),
    subtitle: period,
    meta: [
      [tr('Courier ke paas'), formatPKR(s.totals.withCourierValue)], [tr('Raste me'), formatPKR(s.totals.inTransitValue)],
      [tr('Is mahine mila'), formatPKR(s.totals.settledMonthValue)], [tr('RTO (30 din)'), `${s.totals.rtoRate}%`],
    ],
    sections: [
      {
        kind: 'table', title: tr('Courier-wise'),
        columns: [{ label: tr('Courier') }, { label: tr('Raste me'), align: 'right' }, { label: tr('Courier ke paas'), align: 'right' }, { label: tr('Mila'), align: 'right', wideOnly: true }, { label: tr('RTO'), align: 'right' }],
        rows: s.couriers.map((c) => [c.name, formatPKR(c.inTransitValue), formatPKR(c.withCourierValue), formatPKR(c.settledMonthValue), `${c.rtoRate}%`]),
      },
      {
        kind: 'table', title: tr('Courier ke paas — settlement ka intezar'),
        columns: [{ label: tr('Order') }, { label: tr('Customer') }, { label: tr('Courier'), wideOnly: true }, { label: tr('CN'), wideOnly: true }, { label: tr('Din'), align: 'right', wideOnly: true }, { label: tr('Amount'), align: 'right' }],
        rows: s.withCourier.map((o) => [`#${o.externalOrderNumber ?? o.externalOrderId}`, o.customerName, o.courier ?? '', o.trackingNumber ?? '', o.daysWaiting == null ? '' : String(o.daysWaiting), formatPKR(o.total)]),
        footer: ['', tr('Kul'), '', '', '', formatPKR(s.totals.withCourierValue)],
      },
      ...(h?.settlements.length ? [{
        kind: 'table' as const, title: tr('Settlements (paisa mila)'),
        columns: [{ label: tr('Date') }, { label: tr('Ref') }, { label: tr('Orders'), align: 'right' as const }, { label: tr('Amount'), align: 'right' as const }],
        rows: h.settlements.map((b) => [keyDay(b.day), b.ref ?? '—', String(b.count), formatPKR(b.value)]),
        footer: [tr('Kul'), '', String(h.totals.settled), formatPKR(h.totals.settledValue)],
      }] : []),
      ...(h?.returns.length ? [{
        kind: 'table' as const, title: tr('Wapas aaye parcels (RTO)'),
        columns: [{ label: tr('Order') }, { label: tr('Customer') }, { label: tr('Courier'), wideOnly: true }, { label: tr('Wajah'), wideOnly: true }, { label: tr('Amount'), align: 'right' as const }],
        rows: h.returns.map((r) => [`#${r.number}`, r.customerName, r.courier, r.reason ?? '', formatPKR(r.total)]),
        footer: ['', tr('Kul'), '', '', formatPKR(h.totals.returnedValue)],
      }] : []),
    ],
  };
}

export function customersDoc(c: CustomersResult, segment: string): PrintDoc {
  return {
    title: tr('Online customers'),
    subtitle: segment,
    meta: [[tr('Customers'), String(c.total)], [tr('Dobara lene wale'), `${c.totals.repeatRate}%`]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Naam') }, { label: tr('Phone') }, { label: tr('Shehar'), wideOnly: true }, { label: tr('Orders'), align: 'right', wideOnly: true }, { label: tr('Kul kharch'), align: 'right' }],
      rows: c.rows.map((r) => [r.name, r.phone, r.city ?? '', `${r.delivered}/${r.orders}`, formatPKR(r.spent)]),
    }],
    footer: c.total > c.rows.length ? tr('Pehle {{count}} customers dikhaye gaye hain (kul {{total}})', { count: c.rows.length, total: c.total }) : undefined,
  };
}
