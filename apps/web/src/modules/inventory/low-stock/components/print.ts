/**
 * Low-stock print-outs and export: the reorder sheet (one table per
 * supplier, ready to hand over or send), the alerts list for the current
 * filter, and the same list as CSV.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintSection } from '@core/print';
import type { LowList, LowRow } from '../api';
import { STATUS, daysText, qty, type OrderGroup } from './meta';

export function reorderSheetDoc(groups: OrderGroup[], qtyOf: (r: LowRow) => number, shop: string, showCost: boolean): PrintDoc {
  let grand = 0;
  const sections: PrintSection[] = groups.map((g) => {
    const rows = g.rows.filter((r) => qtyOf(r) > 0);
    const total = rows.reduce((s, r) => s + qtyOf(r) * r.lastCost, 0);
    grand += total;
    return {
      kind: 'table',
      title: `${g.supplier?.name ?? 'Supplier chunna hai'}${g.supplier?.phone ? ` · ${g.supplier.phone}` : ''}${groups.some((x) => x.shopId !== g.shopId) ? ` · ${g.shopName}` : ''}`,
      columns: [
        { label: '#' }, { label: 'Cheez' }, { label: 'Abhi', align: 'right', wideOnly: true }, { label: 'Roz', align: 'right', wideOnly: true },
        { label: 'Mangwana', align: 'right' },
        ...(showCost ? [{ label: 'Rate', align: 'right' as const, wideOnly: true }, { label: 'Amount', align: 'right' as const }] : []),
      ],
      rows: rows.map((r, i) => [
        String(i + 1), r.name, `${qty(r.stock)} ${r.unit}`, qty(r.perDay), `${qty(qtyOf(r))} ${r.unit}`,
        ...(showCost ? [formatPKR(r.lastCost), formatPKR(qtyOf(r) * r.lastCost)] : []),
      ]),
      footer: showCost ? ['', 'Kul', '', '', '', '', formatPKR(total)] : undefined,
    };
  });
  return {
    title: 'Reorder sheet',
    subtitle: shop,
    meta: [
      ['Date', new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })],
      ['Suppliers', String(groups.length)],
      ['Lines', String(groups.reduce((s, g) => s + g.rows.filter((r) => qtyOf(r) > 0).length, 0))],
      ...(showCost ? [['Andazan expense', formatPKR(grand)] as [string, string]] : []),
    ],
    sections,
    footer: 'Quantity pichhli sale ke hisaab se andaza hai — order se pehle shelf dekh lein.',
  };
}

export function alertsDoc(list: LowList, filter: string, showCost: boolean): PrintDoc {
  return {
    title: 'Low stock',
    subtitle: filter || 'Sab lines',
    meta: [
      ['Khatam', String(list.counts.out)], ['Kam', String(list.counts.low)], ['Jaldi khatam', String(list.counts.soon)],
      ...(showCost ? [['Order ki qeemat', formatPKR(list.totals.orderValue)] as [string, string]] : []),
    ],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Cheez' }, { label: 'Halat' }, { label: 'Stock', align: 'right' }, { label: 'Alert', align: 'right', wideOnly: true },
        { label: 'Kitne din', align: 'right', wideOnly: true }, { label: 'Mangwana', align: 'right' }, { label: 'Supplier', wideOnly: true },
      ],
      rows: list.items.map((r) => [
        `${r.name}${r.shopName && list.facets.shops.length > 1 ? ` (${r.shopName})` : ''}`, STATUS[r.status].short,
        `${qty(r.stock)} ${r.unit}`, qty(r.alert), daysText(r.daysLeft), r.suggestQty ? `${qty(r.suggestQty)} ${r.unit}` : '—', r.supplier?.name ?? '',
      ]),
    }],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} lines (kul ${list.total})` : undefined,
  };
}

export function alertsCsv(items: LowRow[], header: string[], withCost: boolean) {
  const head = ['Cheez', 'SKU', 'Branch', 'Category', 'Halat', 'Unit', 'Stock', 'Alert', 'Roz sale', 'Kitne din', 'Order me', 'Mangwana',
    ...(withCost ? ['Aakhri cost', 'Order ki amount'] : []), 'Supplier', 'Supplier phone', 'Expiry'];
  const rows = items.map((r) => [
    r.name, r.sku ?? '', r.shopName, r.category?.name ?? '', r.flags.map((f) => STATUS[f].short).join(' + '), r.unit,
    r.stock, r.alert, r.perDay, r.daysLeft ?? '', r.onOrder, r.suggestQty,
    ...(withCost ? [r.lastCost.toFixed(2), r.orderValue.toFixed(2)] : []),
    r.supplier?.name ?? '', r.supplier?.phone ?? '', r.expiry ? new Date(r.expiry.date).toLocaleDateString('en-PK') : '',
  ]);
  const csv = [...header.map((h) => [h]), [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
