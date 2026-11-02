/**
 * Printable combos: the list for the current filter (price, saving, parts,
 * how many can be made) and one combo's sheet with its parts. PrintDocs, so
 * the shared print button prints on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { ProductCombo } from '../api/combos.api';
import { STATUS, dayText, partQty } from './meta';
import { t } from '@core/i18n';

const validity = (c: ProductCombo) =>
  c.validFrom || c.validTo ? `${c.validFrom ? dayText(c.validFrom) : '…'} — ${c.validTo ? dayText(c.validTo) : '…'}` : t('Hamesha');

export function combosDoc(list: ProductCombo[], filter: string, showCost: boolean, branch: string): PrintDoc {
  const saving = list.reduce((s, c) => s + Number(c.savingsAmount || 0), 0);
  return {
    title: t('Combos'),
    subtitle: branch,
    meta: [[t('Combos'), String(list.length)], ...(filter ? [[t('Filter'), filter] as [string, string]] : []), [t('Ausat bachat'), list.length ? formatPKR(saving / list.length) : '—']],
    sections: [{
      kind: 'table',
      columns: [
        { label: t('Combo') }, { label: t('Cheezein'), wideOnly: true }, { label: t('Qeemat'), align: 'right' }, { label: t('Bachat'), align: 'right', wideOnly: true },
        ...(showCost ? [{ label: t('Profit'), align: 'right' as const, wideOnly: true }] : []),
        { label: t('Ban sakte'), align: 'right' }, { label: t('Haal'), wideOnly: true },
      ],
      rows: list.map((c) => [
        c.name,
        c.items.map((i) => `${partQty(i)} ${i.product?.name ?? ''}${i.variant ? ` (${i.variant.name})` : ''}`).join(', '),
        formatPKR(c.comboPrice),
        c.savingsAmount > 0 ? `${formatPKR(c.savingsAmount)} (${Math.round(c.savingsPercentage)}%)` : '—',
        ...(showCost ? [c.profit !== undefined ? formatPKR(c.profit) : '—'] : []),
        String(c.available ?? '—'),
        c.expired ? t('Period khatam') : STATUS[c.status].label,
      ]),
    }],
  };
}

export function comboSheet(c: ProductCombo, showCost: boolean, branch: string): PrintDoc {
  return {
    title: c.name,
    subtitle: c.tagLine ?? undefined,
    meta: [
      [t('Qeemat'), formatPKR(c.comboPrice)],
      ...(c.barcode ? [[t('Barcode'), c.barcode] as [string, string]] : []),
      [t('Period'), validity(c)],
      [t('Branch'), branch],
    ],
    sections: [
      {
        kind: 'table',
        title: t('Is combo me'),
        columns: [{ label: t('Cheez') }, { label: t('Quantity'), align: 'right' }, { label: t('Alag qeemat'), align: 'right' }, { label: t('Stock'), align: 'right', wideOnly: true }],
        rows: c.items.map((i) => [
          `${i.product?.name ?? ''}${i.variant ? ` (${i.variant.name})` : ''}`,
          partQty(i),
          formatPKR(Number(i.originalPrice || 0) * Number(i.quantity)),
          i.stock !== undefined ? String(i.stock) : '—',
        ]),
      },
      {
        kind: 'rows',
        title: t('Hisaab'),
        rows: [
          { label: t('Alag alag lene par'), value: formatPKR(c.originalTotal) },
          { label: t('Combo ki qeemat'), value: formatPKR(c.comboPrice), strong: true },
          { label: t('Customer ki bachat'), value: `${formatPKR(c.savingsAmount)} (${Math.round(c.savingsPercentage)}%)` },
          ...(showCost && c.cost !== undefined ? [
            { label: t('Cost'), value: formatPKR(c.cost) },
            { label: t('Profit'), value: `${formatPKR(c.profit ?? 0)} (${Math.round(c.margin ?? 0)}%)` },
          ] : []),
          { label: t('Stock se ban sakte'), value: String(c.available ?? '—') },
        ],
      },
      ...(c.description ? [{ kind: 'text' as const, title: t('Details'), text: c.description }] : []),
    ],
  };
}
