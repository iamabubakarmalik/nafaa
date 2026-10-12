/**
 * Printable pack list for the current filter: every product with its packs,
 * rate, price, saving against loose and barcode. A rate card for the
 * counter or the wholesale customer. A PrintDoc for the shared print button.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { UnitsOverview } from '../api/units-page.api';
import { qtyText } from './meta';

export function unitsDoc(data: UnitsOverview, filter: string, branch: string): PrintDoc {
  const rows: string[][] = [];
  const groupRows: number[] = [];
  for (const p of data.items) {
    groupRows.push(rows.length);
    rows.push([p.name, `1 ${p.unit}`, formatPKR(p.price), '', p.barcode ?? '']);
    for (const u of p.units.filter((x) => !x.isBase && x.isActive)) {
      rows.push([
        `  ${u.unitName}${u.variantName ? ` (${u.variantName})` : ''}`,
        `${qtyText(u.conversionRate)} ${p.unit}`,
        formatPKR(u.price),
        u.saving > 0.5 ? formatPKR(u.saving) : '—',
        u.barcode ?? '',
      ]);
    }
  }
  return {
    title: 'Packs aur rate',
    subtitle: branch,
    meta: [['Products', String(data.items.length)], ...(filter ? [['Filter', filter] as [string, string]] : [])],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Cheez / pack' }, { label: 'Miqdar', align: 'right' }, { label: 'Qeemat', align: 'right' }, { label: 'Bachat', align: 'right', wideOnly: true }, { label: 'Barcode', wideOnly: true }],
      rows,
      groupRows,
    }],
    footer: data.total > data.items.length ? `Pehle ${data.items.length} products dikhaye gaye hain (kul ${data.total})` : undefined,
  };
}
