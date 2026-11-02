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
import { t as tr } from '@core/i18n';

const methodLabel = (m: string) => POS_PAYMENT_METHODS.find((p) => p.id === m)?.label ?? m;

function denomSection(title: string, d: Denominations | null): PrintSection[] {
  if (!d || !Object.keys(d).length) return [];
  const rows = [...NOTES, ...COINS].filter((v) => d[v]).map((v) => [`Rs ${v}`, String(d[v]), formatPKR(v * d[v])]); // i18n-ignore
  const total = Object.entries(d).reduce((s, [k, c]) => s + Number(k) * c, 0);
  return [{ kind: 'table', title, columns: [{ label: tr('Note') }, { label: tr('Ginti'), align: 'right' }, { label: tr('Amount'), align: 'right' }], rows, footer: [tr('Kul'), '', formatPKR(total)] }];
}

/** End-of-shift report: who and when, sales by method, the drawer count and the notes counted. */
export function zReportDoc(s: ShiftDetail): PrintDoc {
  const r = s.register;
  const c = s.cash;
  const open = r.status === 'OPEN';
  const kind = s.difference == null ? null : diffKind(s.difference);
  const drawer: PrintRow[] = [
    ...ledgerRows(c).filter((x) => x.keep || x.value).map((x) => ({ label: `${x.sign} ${x.label}`, value: formatPKR(x.value) })),
    { label: tr('= Galle me hona chahiye'), value: formatPKR(s.expected), strong: true },
    ...(s.counted != null ? [
      { label: tr('Gina gaya'), value: formatPKR(s.counted), strong: true },
      { label: tr('Farak ({{value}})', { value: kind ? DIFF[kind].label : '' }), value: signed(s.difference ?? 0), strong: true },
    ] : []),
  ];
  const moves = s.entries.filter((e) => e.type === 'CASH_IN' || e.type === 'CASH_OUT' || e.type === 'REFUND');

  return {
    title: open ? tr('Shift report (X — abhi khuli)') : tr('Shift report (Z)'),
    subtitle: `${r.shop?.name ?? ''} · ${r.registerNumber}`,
    meta: [
      [tr('Khuli'), `${when(r.openedAt)}${r.openedBy ? ` · ${r.openedBy.fullName}` : ''}`],
      [tr('Band'), r.closedAt ? `${when(r.closedAt)}${r.closedBy ? ` · ${r.closedBy.fullName}` : ''}` : tr('Abhi khuli hai')],
      [tr('Waqt'), duration(r.openedAt, r.closedAt)],
    ],
    sections: [
      {
        kind: 'rows',
        title: tr('Sale'),
        rows: [
          { label: tr('Total sale'), value: `${formatPKR(c.allSalesTotal)} · ${c.billCount} bill`, strong: true },
          ...c.byMethod.map((m) => ({ label: methodLabel(m.method), value: `${formatPKR(m.paid)} · ${m.count}`, sub: true })),
          ...(c.creditGiven > 0 ? [{ label: tr('Udhaar par gaya'), value: formatPKR(c.creditGiven), sub: true }] : []),
        ],
      },
      { kind: 'rows', title: tr('Galle ka hisaab'), rows: drawer },
      ...(moves.length ? [{
        kind: 'table' as const,
        title: tr('Cash in / out'),
        columns: [{ label: tr('Waqt') }, { label: tr('Kya') }, { label: tr('Wajah'), wideOnly: true }, { label: tr('Amount'), align: 'right' as const }],
        rows: moves.map((e) => [when(e.createdAt), TX[e.type].label, `${e.reason ?? ''}${e.createdBy ? ` (${e.createdBy.fullName})` : ''}`, `${TX[e.type].sign < 0 ? '−' : '+'}${formatPKR(e.amount)}`]),
      }] : []),
      ...denomSection(tr('Kholte waqt ginti'), s.openingDenominations),
      ...denomSection(tr('Band karte waqt ginti'), s.closingDenominations),
      ...(r.notes ? [{ kind: 'text' as const, title: tr('Note'), text: r.notes }] : []),
      { kind: 'text', text: tr('Cashier ke dastkhat: ____________    Manager: ____________') },
    ],
    footer: s.recounted ? tr('Ye purani shift hai; sale ka hisaab aaj dobara gina gaya. Hona chahiye aur farak wohi hain jo band karte waqt save hue.') : undefined,
  };
}

/** The shift record for the current filter. */
export function shiftsDoc(list: ShiftList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: tr('Cash register — shifts'),
    subtitle: period,
    meta: [[tr('Shifts'), String(list.total)], ...(filter ? [[tr('Filter'), filter] as [string, string]] : []), [tr('Kam nikle'), formatPKR(t.shortAmount)], [tr('Zyada nikle'), formatPKR(t.overAmount)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('Khuli') }, { label: tr('Branch'), wideOnly: true }, { label: tr('Kis ne'), wideOnly: true }, { label: tr('Opening'), align: 'right', wideOnly: true },
          { label: tr('Cash sale'), align: 'right', wideOnly: true }, { label: tr('Hona chahiye'), align: 'right' }, { label: tr('Gina'), align: 'right' }, { label: tr('Farak'), align: 'right' },
        ],
        rows: list.items.map((r) => [
          when(r.openedAt), r.shop?.name ?? '', r.openedBy?.fullName ?? '', formatPKR(r.openingBalance), formatPKR(r.totalSales),
          formatPKR(r.expectedBalance), r.status === 'OPEN' ? tr('Khuli') : formatPKR(r.closingBalance), r.status === 'OPEN' ? '' : signed(r.difference),
        ]),
      },
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Barabar'), value: String(t.matched) },
          { label: tr('Kam nikle'), value: `${t.short} · ${formatPKR(t.shortAmount)}` },
          { label: tr('Zyada nikle'), value: `${t.over} · ${formatPKR(t.overAmount)}` },
          { label: tr('Ausat opening float'), value: formatPKR(t.avgFloat) },
          { label: tr('Kul farak'), value: signed(t.overAmount - t.shortAmount), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? tr('Pehli {{count}} shifts dikhayi gayi hain (kul {{total}})', { count: list.items.length, total: list.total }) : undefined,
  };
}
