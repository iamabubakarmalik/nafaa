/**
 * Ledger output: a PrintDoc for the shared print button and a CSV file of
 * the rows on screen.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { MovementList, StockMovement } from '../api/stock-movements.api';
import { fmtQty, movementMeta } from './movementMeta';

const when = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const productName = (m: StockMovement) => `${m.product.name}${m.variant ? ` (${m.variant.name})` : ''}`;
const signed = (n: number) => `${n > 0 ? '+' : ''}${fmtQty(n)}`;

export function movementsDoc(list: MovementList, period: string, filters: string[]): PrintDoc {
  const value = list.items.reduce((s, m) => s + m.value, 0);
  return {
    title: 'Stock ka hisaab',
    subtitle: period,
    meta: [
      ['Entries', String(list.total)],
      ['Aaya', fmtQty(list.totals.qtyIn)],
      ['Gaya', fmtQty(list.totals.qtyOut)],
      ...(filters.length ? [['Filter', filters.join(' · ')] as [string, string]] : []),
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Tareekh' }, { label: 'Cheez' }, { label: 'Qism', wideOnly: true }, { label: 'Miqdar', align: 'right' },
          { label: 'Baqi', align: 'right', wideOnly: true }, { label: 'Value', align: 'right', wideOnly: true },
        ],
        rows: list.items.map((m) => [
          when(m.createdAt), productName(m), movementMeta(m.type).label, `${signed(m.quantity)} ${m.product.unit}`,
          fmtQty(m.balanceAfter), formatPKR(m.value),
        ]),
        footer: ['', 'Kul', '', '', '', formatPKR(value)],
      },
      ...(list.total > list.items.length ? [{ kind: 'text' as const, text: `Pehli ${list.items.length} entries — baqi ke liye filter chhota karein.` }] : []),
    ],
  };
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadMovementsCsv(items: StockMovement[], filename: string) {
  const head = ['Tareekh', 'Cheez', 'Variant', 'SKU', 'Branch', 'Qism', 'Miqdar', 'Unit', 'Baqi', 'Value', 'Reference', 'Note', 'Kis ne'];
  const rows = items.map((m) => [
    when(m.createdAt), m.product.name, m.variant?.name ?? '', m.product.sku ?? '', m.shop?.name ?? '', movementMeta(m.type).label,
    m.quantity, m.product.unit, m.balanceAfter, m.value, m.reference ?? '', m.note ?? '', m.createdBy?.fullName ?? '',
  ]);
  // BOM so Excel reads the file as UTF-8.
  const text = '\uFEFF' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
