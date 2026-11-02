/**
 * Printable staff report (A4 / PDF / thermal through the shared print
 * button) and CSV files of the staff table and the shift list.
 */

import type { PrintDoc } from '@core/print';
import type { ShiftList, StaffOverview } from '../api';
import { ALERT_TITLE, ROLE_LABEL, alertText, pct, qtyText } from './meta';
import { t as tr } from '@core/i18n';

const galla = (r: { shifts: number; short: number; over: number }, money: (n: number) => string, hidden?: boolean) =>
  !r.shifts ? '' : hidden ? tr('Chhupa') : r.short > 0.5 ? `-${money(r.short)}` : r.over > 0.5 ? `+${money(r.over)}` : tr('Theek');

export function staffDoc(d: StaffOverview, period: string, shop: string, money: (n: number) => string): PrintDoc {
  const t = d.totals;
  const rows = d.staff.filter((r) => r.bills > 0 || r.shifts > 0 || r.returnsDone > 0);
  return {
    title: tr('Staff report'),
    subtitle: period,
    meta: [[tr('Dukaan'), shop], [tr('Sale'), money(t.net)], [tr('Bill'), String(t.bills)], [tr('Staff'), String(t.staff)]],
    sections: [
      {
        kind: 'table',
        title: tr('Har banda'),
        columns: [
          { label: '#' }, { label: tr('Naam') }, { label: tr('Bill'), align: 'right' }, { label: tr('Sale'), align: 'right' },
          { label: tr('Ausat'), align: 'right', wideOnly: true }, { label: tr('Discount'), align: 'right', wideOnly: true },
          { label: tr('Cancel'), align: 'right', wideOnly: true }, { label: tr('Return'), align: 'right', wideOnly: true }, { label: tr('Galla'), align: 'right', wideOnly: true },
        ],
        rows: rows.map((r) => [
          r.rank ? String(r.rank) : '', r.name, String(r.bills), money(r.net), money(r.average),
          r.manualDiscount ? `${money(r.manualDiscount)} (${pct(r.discountPct)})` : '', r.voided ? String(r.voided) : '',
          r.returnedBills ? money(r.refunds) : '', galla(r, money, d.drawerHidden),
        ]),
        footer: ['', tr('Kul'), String(t.bills), money(t.net), d.team.average ? money(d.team.average) : '', money(t.manualDiscount), String(t.voided), money(t.refunds), ''],
      },
      {
        kind: 'rows',
        title: tr('Counter ka hisab'),
        rows: [
          { label: tr('Haath se discount'), value: `${money(t.manualDiscount)} · ${pct(d.team.discountPct)}` },
          { label: tr('Cancel bill'), value: `${t.voided} · ${money(t.voidedValue)}` },
          { label: tr('Return ki'), value: `${t.returnsDone} · ${money(t.returnsDoneValue)}` },
          { label: tr('Udhaar par'), value: money(t.credit) },
          { label: tr('Shifts'), value: String(t.shifts) },
          ...(d.drawerHidden ? [] : [
            { label: tr('Galla kam'), value: `${t.shortCount} dafa · ${money(t.short)}` },
            { label: tr('Galla zyada'), value: `${t.overCount} dafa · ${money(t.over)}` },
            { label: tr('Cash daala / nikala'), value: `${money(t.cashIn)} / ${money(t.cashOut)}` },
          ]),
        ],
      },
      ...(d.alerts.length ? [{
        kind: 'rows' as const,
        title: tr('Nazar rakhein'),
        rows: d.alerts.map((a) => ({ label: `${a.name} · ${ALERT_TITLE[a.kind]}`, value: alertText(a, money) })),
      }] : []),
    ],
  };
}

export function shiftsDoc(d: ShiftList, period: string, money: (n: number) => string): PrintDoc {
  const t = d.totals;
  const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return {
    title: tr('Galla shifts'),
    subtitle: period,
    meta: [[tr('Shifts'), String(t.shifts)], [tr('Kam'), money(t.short)], [tr('Zyada'), money(t.over)]],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Khuli') }, { label: tr('Kis ne') }, { label: tr('Band ki'), wideOnly: true }, { label: tr('Hisab'), align: 'right', wideOnly: true },
        { label: tr('Gina'), align: 'right', wideOnly: true }, { label: tr('Farq'), align: 'right' },
      ],
      rows: d.items.map((s) => [
        day(s.openedAt), s.openedBy.fullName, s.closedBy?.fullName ?? tr('Khuli'), money(s.expected),
        s.counted != null ? money(s.counted) : '', s.difference != null ? money(s.difference) : '',
      ]),
    }],
  };
}

function download(lines: string[][], header: string[], file: string) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [...header.map((h) => esc(h)), '', ...lines.map((l) => l.map(esc).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  a.click();
  URL.revokeObjectURL(url);
}

export function staffCsv(d: StaffOverview, header: string[], showCost: boolean, file: string) {
  const cols = [
    tr('Rank'), tr('Naam'), tr('Role'), tr('Bill'), tr('Sale (return ke baad)'), tr('Hissa %'), tr('Ausat bill'), tr('Cheezein'), tr('Cheezein fi bill'), tr('Ghante'), tr('Ghante kahan se'),
    tr('Fi ghanta sale'), tr('Haath se discount'), tr('Discount %'), tr('Discount wale bill'), tr('Udhaar'), tr('Udhaar bill'), tr('Cancel bill'), tr('Cancel amount'),
    tr('Is ke bill par return'), tr('Return %'), tr('Return ki (khud)'), tr('Return amount (khud)'), tr('PIN approve'), tr('Ghalat PIN'), tr('Shifts'),
    ...(d.drawerHidden ? [] : [tr('Galla kam'), tr('Galla zyada'), tr('Cash daala'), tr('Cash nikala')]), tr('Customer'), ...(showCost ? [tr('Profit'), tr('Margin %')] : []),
  ];
  const lines = d.staff.map((r) => [
    String(r.rank || ''), r.name, r.role ? ROLE_LABEL[r.role] ?? r.role : '', String(r.bills), r.net.toFixed(2), r.share.toFixed(1),
    r.average.toFixed(2), qtyText(r.qty), r.itemsPerBill.toFixed(2), r.hours.toFixed(1), r.hoursSource ?? '', r.perHour.toFixed(2),
    r.manualDiscount.toFixed(2), r.discountPct.toFixed(1), String(r.discountBills), r.credit.toFixed(2), String(r.creditBills),
    String(r.voided), r.voidedValue.toFixed(2), r.refunds.toFixed(2), r.returnPct.toFixed(1), String(r.returnsDone), r.returnsDoneValue.toFixed(2),
    String(r.pinApprovals), String(r.pinFailures), String(r.shifts),
    ...(d.drawerHidden ? [] : [r.short.toFixed(2), r.over.toFixed(2), r.cashIn.toFixed(2), r.cashOut.toFixed(2)]),
    String(r.customers), ...(showCost ? [(r.profit ?? 0).toFixed(2), (r.margin ?? 0).toFixed(1)] : []),
  ]);
  download([cols, ...lines], header, file);
}

export function shiftsCsv(d: ShiftList, header: string[], file: string) {
  const cols = [tr('Shift'), tr('Branch'), tr('Kholi'), tr('Khuli'), tr('Band ki'), tr('Band hui'), tr('Ghante'), tr('Shuru ka cash'), tr('Cash sale'), tr('Bill'), tr('Cash daala'), tr('Cash nikala'), tr('Expenses'), tr('Return'), tr('Hisab'), tr('Gina'), tr('Farq'), tr('Note')];
  const lines = d.items.map((s) => [
    s.number, s.shop?.name ?? '', s.openedBy.fullName, s.openedAt, s.closedBy?.fullName ?? '', s.closedAt ?? '', s.hours?.toFixed(2) ?? '',
    s.opening.toFixed(2), s.cashSales.toFixed(2), String(s.bills), s.cashIn.toFixed(2), s.cashOut.toFixed(2), s.expenses.toFixed(2), s.refunds.toFixed(2),
    s.expected.toFixed(2), s.counted?.toFixed(2) ?? '', s.difference?.toFixed(2) ?? '', s.notes ?? '',
  ]);
  download([cols, ...lines], header, file);
}
