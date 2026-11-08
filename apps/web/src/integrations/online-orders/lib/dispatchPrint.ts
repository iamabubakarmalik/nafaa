/**
 * Printable dispatch documents (PrintDocs for the shared print button) and
 * their CSV rows: the courier loadsheet, the Pakistan Post booking list and
 * the dispatch report.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { DispatchReport, DispatchReportRow, LoadsheetGroup, PostOrder } from '../api/dispatch.api';
import { t as tr } from '@core/i18n';

const keyDay = (k: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${k}T12:00:00`));
const SIGN = '______________________';

export function loadsheetDoc(g: LoadsheetGroup, day: string): PrintDoc {
  return {
    title: tr('Loadsheet — {{courier}}', { courier: g.courierName ?? g.courierCode }),
    subtitle: keyDay(day),
    meta: [
      [tr('Parcels'), String(g.totals.parcels)], [tr('Pieces'), String(g.totals.pieces)],
      [tr('Wazan'), `${g.totals.weightKg} kg`], [tr('Kul COD'), formatPKR(g.totals.cod)],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: '#' }, { label: 'CN' }, { label: tr('Order') }, { label: tr('Customer'), wideOnly: true }, { label: tr('Shehar') },
          { label: tr('Pcs'), align: 'right' }, { label: tr('Kg'), align: 'right', wideOnly: true }, { label: 'COD', align: 'right' },
        ],
        rows: g.rows.map((r, i) => [String(i + 1), r.trackingNumber, `#${r.number}`, r.customerName, r.city ?? '', String(r.pieces), r.weightKg ? String(r.weightKg) : '', formatPKR(r.cod)]),
        footer: ['', tr('Kul'), '', '', '', String(g.totals.pieces), String(g.totals.weightKg), formatPKR(g.totals.cod)],
      },
      {
        kind: 'rows',
        title: tr('Dastkhat'),
        rows: [
          { label: tr('Dukaan (de diye)'), value: SIGN },
          { label: tr('Courier rider (le liye) — naam aur dastkhat'), value: SIGN },
          { label: tr('Waqt'), value: SIGN },
        ],
      },
    ],
  };
}

export const loadsheetCsv = (g: LoadsheetGroup) => [
  ['CN', 'Order', 'Customer', 'City', 'Pieces', 'Weight kg', 'COD'],
  ...g.rows.map((r) => [r.trackingNumber, r.number, r.customerName, r.city ?? '', r.pieces, r.weightKg ?? '', r.cod]),
  ['Total', '', '', '', g.totals.pieces, g.totals.weightKg, g.totals.cod],
];

/** Pakistan Post booking list (VPP for COD): what the counter clerk needs per parcel. */
export function postOfficeDoc(list: PostOrder[], shop: { name: string; phone: string; address: string }): PrintDoc {
  const cod = list.reduce((s, o) => s + o.cod, 0);
  return {
    title: tr('Pakistan Post — booking list'),
    subtitle: new Date().toLocaleDateString('en-PK'),
    meta: [[tr('Bhejne wala'), `${shop.name}${shop.phone ? ` · ${shop.phone}` : ''}`], [tr('Parcels'), String(list.length)], [tr('VPP / COD kul'), formatPKR(cod)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: '#' }, { label: tr('Order') }, { label: tr('Paane wala') }, { label: tr('Address') }, { label: tr('Shehar') },
          { label: tr('Phone'), wideOnly: true }, { label: 'VPP', align: 'right' }, { label: tr('Article no.') },
        ],
        rows: list.map((o, i) => [String(i + 1), `#${o.number}`, o.customerName, o.address ?? '', o.city ?? '', o.customerPhone ?? '', o.cod ? formatPKR(o.cod) : tr('Paid'), o.article ?? '']),
        footer: ['', '', tr('Kul'), '', '', '', formatPKR(cod), ''],
      },
      { kind: 'text', title: tr('Note'), text: tr('VPP parcel par paane wale se raqam post office leta hai aur money order se dukaan ko bhejta hai. Article number receipt se Nafaa me likh dein.') },
    ],
  };
}

export const REPORT_TAB_LABEL: Record<string, string> = {
  all: tr('Sab'), open: tr('Abhi raste me'), delivered: 'Delivered', returns: tr('Returns'), rto_wh: tr('RTO warehouse me'), pending_rto: tr('RTO aana baqi'),
  ofd: 'Out for delivery', issue: tr('Issue'), stuck: tr('Stuck 5+ din'), claims: tr('Claims'), redispatched: tr('Re-dispatched'), replacement: tr('Replacement'),
  cancelled: tr('Cancelled'),
};

export function dispatchReportDoc(r: DispatchReport, period: string, tab: string, rows: DispatchReportRow[]): PrintDoc {
  const t = r.totals;
  return {
    title: tr('Dispatch report'),
    subtitle: period,
    meta: [[tr('Bheje'), String(t.dispatched)], ['Delivered', String(t.delivered)], [tr('Returns'), String(t.returned)], [tr('Kamyabi'), t.successRate == null ? '—' : `${t.successRate}%`]],
    sections: [
      {
        kind: 'rows', title: tr('Khulasa'),
        rows: [
          { label: tr('Raste me'), value: String(t.inProcess) }, { label: tr('RTO warehouse me'), value: String(t.rtoInWarehouse) },
          { label: tr('Cancelled'), value: String(t.cancelled) }, { label: tr('Claims'), value: String(t.claims) },
          { label: tr('Re-dispatched'), value: String(t.redispatched) }, { label: tr('Replacement'), value: String(t.replacement) },
          { label: tr('Delivered COD'), value: formatPKR(t.deliveredCod), strong: true },
        ],
      },
      {
        kind: 'table', title: tr('Courier'),
        columns: [{ label: tr('Courier') }, { label: tr('Bheje'), align: 'right' }, { label: 'Delivered', align: 'right' }, { label: tr('Returns'), align: 'right' }, { label: tr('Kamyabi'), align: 'right' }],
        rows: r.couriers.map((c) => [c.name ?? c.code, String(c.dispatched), String(c.delivered), String(c.returned), c.successRate == null ? '—' : `${c.successRate}%`]),
      },
      {
        kind: 'table', title: REPORT_TAB_LABEL[tab] ?? tab,
        columns: [{ label: tr('Order') }, { label: 'CN' }, { label: tr('Customer'), wideOnly: true }, { label: tr('Shehar'), wideOnly: true }, { label: 'Status' }, { label: 'COD', align: 'right' }],
        rows: rows.slice(0, 500).map((x) => [`#${x.number}`, x.trackingNumber ?? '', x.customerName, x.city ?? '', x.lastEvent ?? x.orderStatus, formatPKR(x.cod)]),
      },
    ],
    footer: rows.length > 500 ? tr('Pehle 500 dikhaye gaye hain (kul {{total}})', { total: rows.length }) : undefined,
  };
}

export const reportCsv = (rows: DispatchReportRow[]) => [
  ['Order', 'CN', 'Courier', 'Customer', 'Phone', 'City', 'Dispatched', 'Status', 'Courier status', 'Last event', 'COD', 'Settled'],
  ...rows.map((x) => [x.number, x.trackingNumber ?? '', x.courierName ?? '', x.customerName, x.customerPhone ?? '', x.city ?? '', x.day, x.orderStatus, x.courierStatus ?? '', x.lastEvent ?? '', x.cod, x.settled ? 'yes' : 'no']),
];
