/** CSV and printable stock list for every product in the current filter (all pages). */

import type { PrintDoc } from '@core/print';
import { catalogApi, type CatalogFilters, type CatalogItem, type CatalogStats } from './api';

const fmt = (n: number) => String(Number(Number(n).toFixed(2)));

/** Every product for the filter, up to `max`. */
export async function fetchAllProducts(filters: CatalogFilters, max = 10_000): Promise<{ items: CatalogItem[]; stats?: CatalogStats }> {
  const items: CatalogItem[] = [];
  let page = 1;
  let stats: CatalogStats | undefined;
  for (;;) {
    const res = await catalogApi.list(filters, page, 100);
    stats ??= res.stats;
    items.push(...res.items);
    if (!res.hasMore || items.length >= max) break;
    page += 1;
  }
  return { items, stats };
}

export function productsCsv(items: CatalogItem[], header: string[], withCost: boolean) {
  const head = ['Naam', 'SKU', 'Barcode', 'Category', 'Brand', 'Unit', 'Retail price', 'Wholesale price', 'Credit price', ...(withCost ? ['Cost price', 'Stock ki cost'] : []),
    'Stock', 'Kam ki had', 'Halat', '30 din bika', 'Kitne din ka stock', 'Expiry', 'Chalu'];
  const rows = items.map((p) => [
    p.name, p.sku ?? '', p.barcode ?? '', p.category?.name ?? '', p.brand?.name ?? '', p.unit, p.price.toFixed(2), p.wholesalePrice?.toFixed(2) ?? '', p.creditPrice?.toFixed(2) ?? '',
    ...(withCost ? [p.costPrice.toFixed(2), (Math.max(0, p.stock) * p.costPrice).toFixed(2)] : []),
    fmt(p.stock), fmt(p.lowStockAlert), p.status === 'out' ? 'Khatam' : p.status === 'low' ? 'Kam' : 'Theek',
    fmt(p.sold30), p.daysLeft ?? '', p.expiry ? new Date(p.expiry).toLocaleDateString('en-PK') : '', p.isActive ? 'Haan' : 'Nahi',
  ]);
  const csv = [...header.map((h) => [h]), [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `maal-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function productsDoc(items: CatalogItem[], stats: CatalogStats | undefined, title: string, money: (n: number) => string, withCost: boolean): PrintDoc {
  return {
    title,
    subtitle: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    meta: [['Cheezein', String(items.length)], ['Kam stock', String(stats?.low ?? 0)], ['Khatam', String(stats?.out ?? 0)]],
    sections: [
      {
        kind: 'rows', title: 'Khulasa', rows: [
          { label: 'Chalu cheezein', value: String(stats?.products ?? items.length) },
          { label: 'Kul stock (units)', value: fmt(stats?.units ?? 0) },
          ...(withCost ? [{ label: 'Stock ki cost', value: money(stats?.costValue ?? 0) }] : []),
          { label: 'Bechne par milega', value: money(stats?.saleValue ?? 0), strong: true },
        ],
      },
      {
        kind: 'table', title: 'Maal ki list',
        columns: [
          { label: 'Naam' }, { label: 'Category', wideOnly: true }, { label: 'Rate', align: 'right' },
          ...(withCost ? [{ label: 'Cost', align: 'right' as const, wideOnly: true }] : []),
          { label: 'Stock', align: 'right' }, { label: '30 din', align: 'right', wideOnly: true },
        ],
        rows: items.map((p) => [
          p.name, p.category?.name ?? '—', money(p.price), ...(withCost ? [money(p.costPrice)] : []),
          `${fmt(p.stock)} ${p.unit}${p.status === 'out' ? ' ✕' : p.status === 'low' ? ' !' : ''}`, fmt(p.sold30),
        ]),
      },
    ],
    footer: '✕ = khatam · ! = kam stock',
  };
}
