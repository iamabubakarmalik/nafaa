/**
 * Printable cash register documents: the Z-report of one shift and the
 * shift record for a filter. Both are PrintDocs, so the shared print button
 * prints them on A4, as a PDF or on an 80/58 mm thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintRow, PrintSection } from '@core/print';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { Denominations, ShiftDetail, ShiftList } from '../api/cash-register.api';
import { COINS, DIFF, NOTES, TX, diffKind, duration, ledgerRows, signed, when } from './meta';

const methodLabel = (m: string) => POS_PAYMENT_METHODS.find((p) => p.id === m)?.label ?? m;

function denomSection(title: string, d: Denominations | null): PrintSection[] {
  if (!d || !Object.keys(d).length) return [];
  const rows = [...NOTES, ...COINS].filter((v) => d[v]).map((v) => [`Rs ${v}`, String(d[v]), formatPKR(v * d[v])]);
  const total = Object.entries(d).reduce((s, [k, c]) => s + Number(k) * c, 0);
  return [{ kind: 'table', title, columns: [{ label: 'Note' }, { label: 'Ginti', align: 'right' }, { label: 'Raqam', align: 'right' }], rows, footer: ['Kul', '', formatPKR(total)] }];
}

/** End-of-shift report: who and when, sales by method, the drawer count and the notes counted. */
export function zReportDoc(s: ShiftDetail): PrintDoc {
  const r = s.register;
  const c = s.cash;
  const open = r.status === 'OPEN';
  const kind = s.difference == null ? null : diffKind(s.difference);
  const drawer: PrintRow[] = [
    ...ledgerRows(c).filter((x) => x.keep || x.value).map((x) => ({ label: `${x.sign} ${x.label}`, value: formatPKR(x.value) })),
    { label: '= Galle me hona chahiye', value: formatPKR(s.expected), strong: true },
    ...(s.counted != null ? [
      { label: 'Gina gaya', value: formatPKR(s.counted), strong: true },
      { label: `Farak (${kind ? DIFF[kind].label : ''})`, value: signed(s.difference ?? 0), strong: true },
    ] : []),
  ];
  const moves = s.entries.filter((e) => e.type === 'CASH_IN' || e.type === 'CASH_OUT' || e.type === 'REFUND');

  return {
    title: open ? 'Shift report (X — abhi khuli)' : 'Shift report (Z)',
    subtitle: `${r.shop?.name ?? ''} · ${r.registerNumber}`,
    meta: [
      ['Khuli', `${when(r.openedAt)}${r.openedBy ? ` · ${r.openedBy.fullName}` : ''}`],
      ['Band', r.closedAt ? `${when(r.closedAt)}${r.closedBy ? ` · ${r.closedBy.fullName}` : ''}` : 'Abhi khuli hai'],
      ['Waqt', duration(r.openedAt, r.closedAt)],
    ],
    sections: [
      {
        kind: 'rows',
        title: 'Bikri',
        rows: [
          { label: 'Kul bikri', value: `${formatPKR(c.allSalesTotal)} · ${c.billCount} bill`, strong: true },
          ...c.byMethod.map((m) => ({ label: methodLabel(m.method), value: `${formatPKR(m.paid)} · ${m.count}`, sub: true })),
          ...(c.creditGiven > 0 ? [{ label: 'Udhaar par gaya', value: formatPKR(c.creditGiven), sub: true }] : []),
        ],
      },
      { kind: 'rows', title: 'Galle ka hisaab', rows: drawer },
      ...(moves.length ? [{
        kind: 'table' as const,
        title: 'Cash in / out',
        columns: [{ label: 'Waqt' }, { label: 'Kya' }, { label: 'Wajah', wideOnly: true }, { label: 'Raqam', align: 'right' as const }],
        rows: moves.map((e) => [when(e.createdAt), TX[e.type].label, `${e.reason ?? ''}${e.createdBy ? ` (${e.createdBy.fullName})` : ''}`, `${TX[e.type].sign < 0 ? '−' : '+'}${formatPKR(e.amount)}`]),
      }] : []),
      ...denomSection('Kholte waqt ginti', s.openingDenominations),
      ...denomSection('Band karte waqt ginti', s.closingDenominations),
      ...(r.notes ? [{ kind: 'text' as const, title: 'Note', text: r.notes }] : []),
      { kind: 'text', text: 'Cashier ke dastkhat: ____________    Manager: ____________' },
    ],
    footer: s.recounted ? 'Ye purani shift hai; bikri ka hisaab aaj dobara gina gaya. Hona chahiye aur farak wohi hain jo band karte waqt save hue.' : undefined,
  };
}

/** The shift record for the current filter. */
export function shiftsDoc(list: ShiftList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: 'Cash register — shifts',
    subtitle: period,
    meta: [['Shifts', String(list.total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Kam nikle', formatPKR(t.shortAmount)], ['Zyada nikle', formatPKR(t.overAmount)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Khuli' }, { label: 'Branch', wideOnly: true }, { label: 'Kis ne', wideOnly: true }, { label: 'Opening', align: 'right', wideOnly: true },
          { label: 'Cash bikri', align: 'right', wideOnly: true }, { label: 'Hona chahiye', align: 'right' }, { label: 'Gina', align: 'right' }, { label: 'Farak', align: 'right' },
        ],
        rows: list.items.map((r) => [
          when(r.openedAt), r.shop?.name ?? '', r.openedBy?.fullName ?? '', formatPKR(r.openingBalance), formatPKR(r.totalSales),
          formatPKR(r.expectedBalance), r.status === 'OPEN' ? 'Khuli' : formatPKR(r.closingBalance), r.status === 'OPEN' ? '' : signed(r.difference),
        ]),
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Barabar', value: String(t.matched) },
          { label: 'Kam nikle', value: `${t.short} · ${formatPKR(t.shortAmount)}` },
          { label: 'Zyada nikle', value: `${t.over} · ${formatPKR(t.overAmount)}` },
          { label: 'Ausat opening float', value: formatPKR(t.avgFloat) },
          { label: 'Kul farak', value: signed(t.overAmount - t.shortAmount), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} shifts dikhayi gayi hain (kul ${list.total})` : undefined,
  };
}
