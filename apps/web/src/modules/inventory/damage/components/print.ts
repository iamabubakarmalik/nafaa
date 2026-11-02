/**
 * Printable damage report for the current filter: every report with its
 * status and value, then totals. A PrintDoc, so the shared print button
 * prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { DamageList } from '../api/damage.api';
import { STATUS, itemLabel, qtyLabel, reasonOf } from './meta';
import { t as tr } from '@core/i18n';

const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' });

export function damageDoc(list: DamageList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title: tr('Kharab maal (Damage & wastage)'),
    subtitle: period,
    meta: [[tr('Reports'), String(list.total)], ...(filter ? [[tr('Filter'), filter] as [string, string]] : []), [tr('Nuqsan'), formatPKR(t.lost)], [tr('Baqi'), formatPKR(t.pendingValue)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: tr('Waqt') }, { label: tr('No.'), wideOnly: true }, { label: tr('Cheez') }, { label: tr('Quantity'), align: 'right' }, { label: tr('Amount'), align: 'right' }, { label: tr('Wajah'), wideOnly: true }, { label: tr('Haal') }, { label: tr('Kis ne'), wideOnly: true }],
        rows: list.items.map((d) => [
          day(d.createdAt), d.damageNumber, itemLabel(d), qtyLabel(d), formatPKR(d.netLoss),
          reasonOf(d.reasonCode, d.reason).label, STATUS[d.status].label, d.reportedBy?.fullName ?? '',
        ]),
      },
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Approval baqi'), value: `${t.reported} · ${formatPKR(t.pendingValue)}` },
          { label: tr('Approved'), value: String(t.approved) },
          { label: tr('Rad'), value: String(t.rejected) },
          { label: tr('Asal nuqsan'), value: `−${formatPKR(t.lost)}`, strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? tr('Pehli {{count}} reports dikhayi gayi hain (kul {{total}})', { count: list.items.length, total: list.total }) : undefined,
  };
}
