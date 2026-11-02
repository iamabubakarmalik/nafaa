/** CSV and printable list of every customer in the current filter (all pages). */

import type { PrintDoc } from '@core/print';
import { directoryApi, type DirectoryCustomer, type DirectoryFilters, type DirectoryPage } from './api';
import { t } from '@core/i18n';

export async function fetchAllCustomers(filters: DirectoryFilters, max = 20_000): Promise<{ items: DirectoryCustomer[]; stats?: DirectoryPage['stats'] }> {
  const items: DirectoryCustomer[] = [];
  let page = 1;
  let stats: DirectoryPage['stats'] | undefined;
  for (;;) {
    const res = await directoryApi.list(filters, page, 200);
    stats ??= res.stats;
    items.push(...res.items);
    if (!res.hasMore || items.length >= max) break;
    page += 1;
  }
  return { items, stats };
}

const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-PK') : '');

export function customersCsv(items: DirectoryCustomer[], header: string[], name = 'customers') {
  const head = [t('Naam'), t('Phone'), t('Email'), 'CNIC', t('Sheher'), t('Ilaqa'), 'VIP', t('Chalu'), t('Kitni dafa aaye'), t('Kul khareedari'), t('Ausat bill'),
    t('Pehli dafa'), t('Aakhri dafa'), t('Baqi (+) / Advance (-)'), t('Kitne din purana'), t('Had'), t('Points'), t('Kab jore')];
  const rows = items.map((c) => [
    c.name, c.phone ?? '', c.email ?? '', c.cnic ?? '', c.city ?? '', c.area ?? '', c.isVip ? t('Haan') : '', c.isActive ? t('Haan') : t('Nahi'),
    c.visits, c.spent.toFixed(2), c.average.toFixed(2), date(c.firstSaleAt), date(c.lastSaleAt), c.balance.toFixed(2), c.dueDays ?? '',
    c.creditLimit || '', c.loyaltyPoints || '', date(c.createdAt),
  ]);
  const csv = [...header.map((h) => [h]), [''], head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function customersDoc(items: DirectoryCustomer[], title: string, money: (n: number) => string, khata = false): PrintDoc {
  const owed = items.reduce((s, c) => s + Math.max(0, c.balance), 0);
  return {
    title,
    subtitle: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    meta: [[t('Customers'), String(items.length)], [t('Kul baqi'), money(owed)]],
    sections: [{
      kind: 'table', title: khata ? t('Udhaar ki list') : t('Customers'),
      columns: khata
        ? [{ label: t('Naam') }, { label: t('Phone') }, { label: t('Kitne din'), align: 'right', wideOnly: true }, { label: t('Baqi'), align: 'right' }]
        : [{ label: t('Naam') }, { label: t('Phone') }, { label: t('Khareedari'), align: 'right', wideOnly: true }, { label: t('Baqi'), align: 'right' }],
      rows: items.map((c) => [c.name, c.phone ?? '', khata ? String(c.dueDays ?? '') : money(c.spent), c.balance ? money(c.balance) : '—']),
      footer: [t('Kul'), '', '', money(owed)],
    }],
  };
}
