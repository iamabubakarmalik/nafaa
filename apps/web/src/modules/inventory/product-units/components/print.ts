/**
 * Printable pack list for the current filter: every product with its packs,
 * rate, price, saving against loose and barcode. A rate card for the
 * counter or the wholesale customer. A PrintDoc for the shared print button.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { UnitsOverview } from '../api/units-page.api';
import { qtyText } from './meta';
import { t } from '@core/i18n';

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
    title: t('Packs aur rate'),
    subtitle: branch,
    meta: [[t('Products'), String(data.items.length)], ...(filter ? [[t('Filter'), filter] as [string, string]] : [])],
    sections: [{
      kind: 'table',
      columns: [{ label: t('Cheez / pack') }, { label: t('Quantity'), align: 'right' }, { label: t('Qeemat'), align: 'right' }, { label: t('Bachat'), align: 'right', wideOnly: true }, { label: t('Barcode'), wideOnly: true }],
      rows,
      groupRows,
    }],
    footer: data.total > data.items.length ? t('Pehle {{count}} products dikhaye gaye hain (kul {{total}})', { count: data.items.length, total: data.total }) : undefined,
  };
}
