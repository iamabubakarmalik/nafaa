/**
 * Printable damage report for the current filter: every report with its
 * status and value, then totals. A PrintDoc, so the shared print button
 * prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { DamageList } from '../api/damage.api';
import { STATUS, itemLabel, qtyLabel, reasonOf } from './meta';

const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' });

export function damageDoc(list: DamageList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: 'Kharab maal (Damage & wastage)',
    subtitle: period,
    meta: [['Reports', String(list.total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Nuqsan', formatPKR(t.lost)], ['Baqi', formatPKR(t.pendingValue)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Waqt' }, { label: 'No.', wideOnly: true }, { label: 'Cheez' }, { label: 'Miqdar', align: 'right' }, { label: 'Raqam', align: 'right' }, { label: 'Wajah', wideOnly: true }, { label: 'Haal' }, { label: 'Kis ne', wideOnly: true }],
        rows: list.items.map((d) => [
          day(d.createdAt), d.damageNumber, itemLabel(d), qtyLabel(d), formatPKR(d.netLoss),
          reasonOf(d.reasonCode, d.reason).label, STATUS[d.status].label, d.reportedBy?.fullName ?? '',
        ]),
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Manzoori baqi', value: `${t.reported} · ${formatPKR(t.pendingValue)}` },
          { label: 'Manzoor', value: String(t.approved) },
          { label: 'Rad', value: String(t.rejected) },
          { label: 'Asal nuqsan', value: `−${formatPKR(t.lost)}`, strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} reports dikhayi gayi hain (kul ${list.total})` : undefined,
  };
}
