/**
 * Printable combos: the list for the current filter (price, saving, parts,
 * how many can be made) and one combo's sheet with its parts. PrintDocs, so
 * the shared print button prints on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ProductCombo } from '../api/combos.api';
import { STATUS, dayText, partQty } from './meta';

const validity = (c: ProductCombo) =>
  c.validFrom || c.validTo ? `${c.validFrom ? dayText(c.validFrom) : '…'} — ${c.validTo ? dayText(c.validTo) : '…'}` : 'Hamesha';

export function combosDoc(list: ProductCombo[], filter: string, showCost: boolean, branch: string): PrintDoc {
  const saving = list.reduce((s, c) => s + Number(c.savingsAmount || 0), 0);
  return {
    title: 'Combos',
    subtitle: branch,
    meta: [['Combos', String(list.length)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Ausat bachat', list.length ? formatPKR(saving / list.length) : '—']],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Combo' }, { label: 'Cheezein', wideOnly: true }, { label: 'Qeemat', align: 'right' }, { label: 'Bachat', align: 'right', wideOnly: true },
        ...(showCost ? [{ label: 'Profit', align: 'right' as const, wideOnly: true }] : []),
        { label: 'Ban sakte', align: 'right' }, { label: 'Haal', wideOnly: true },
      ],
      rows: list.map((c) => [
        c.name,
        c.items.map((i) => `${partQty(i)} ${i.product?.name ?? ''}${i.variant ? ` (${i.variant.name})` : ''}`).join(', '),
        formatPKR(c.comboPrice),
        c.savingsAmount > 0 ? `${formatPKR(c.savingsAmount)} (${Math.round(c.savingsPercentage)}%)` : '—',
        ...(showCost ? [c.profit !== undefined ? formatPKR(c.profit) : '—'] : []),
        String(c.available ?? '—'),
        c.expired ? 'Period khatam' : STATUS[c.status].label,
      ]),
    }],
  };
}

export function comboSheet(c: ProductCombo, showCost: boolean, branch: string): PrintDoc {
  return {
    title: c.name,
    subtitle: c.tagLine ?? undefined,
    meta: [
      ['Qeemat', formatPKR(c.comboPrice)],
      ...(c.barcode ? [['Barcode', c.barcode] as [string, string]] : []),
      ['Period', validity(c)],
      ['Branch', branch],
    ],
    sections: [
      {
        kind: 'table',
        title: 'Is combo me',
        columns: [{ label: 'Cheez' }, { label: 'Quantity', align: 'right' }, { label: 'Alag qeemat', align: 'right' }, { label: 'Stock', align: 'right', wideOnly: true }],
        rows: c.items.map((i) => [
          `${i.product?.name ?? ''}${i.variant ? ` (${i.variant.name})` : ''}`,
          partQty(i),
          formatPKR(Number(i.originalPrice || 0) * Number(i.quantity)),
          i.stock !== undefined ? String(i.stock) : '—',
        ]),
      },
      {
        kind: 'rows',
        title: 'Hisaab',
        rows: [
          { label: 'Alag alag lene par', value: formatPKR(c.originalTotal) },
          { label: 'Combo ki qeemat', value: formatPKR(c.comboPrice), strong: true },
          { label: 'Customer ki bachat', value: `${formatPKR(c.savingsAmount)} (${Math.round(c.savingsPercentage)}%)` },
          ...(showCost && c.cost !== undefined ? [
            { label: 'Cost', value: formatPKR(c.cost) },
            { label: 'Profit', value: `${formatPKR(c.profit ?? 0)} (${Math.round(c.margin ?? 0)}%)` },
          ] : []),
          { label: 'Stock se ban sakte', value: String(c.available ?? '—') },
        ],
      },
      ...(c.description ? [{ kind: 'text' as const, title: 'Details', text: c.description }] : []),
    ],
  };
}
