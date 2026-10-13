/** CSV and printable report of every bill in the current filter (all pages). */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import { salesHistoryApi, type HistoryFilters, type HistorySale, type HistoryStats } from './api';

const STATUS: Record<string, string> = { COMPLETED: 'Mukammal', PARTIALLY_RETURNED: 'Kuch wapas', FULLY_RETURNED: 'Poora wapas', VOIDED: 'Wapas li gayi' };
const dt = (v: string) => new Date(v);

/** Every bill for the filter, up to `max`. */
export async function fetchAllSales(filters: HistoryFilters, max = 5000): Promise<{ sales: HistorySale[]; stats?: HistoryStats }> {
  const sales: HistorySale[] = [];
  let page = 1;
  let stats: HistoryStats | undefined;
  for (;;) {
    const res = await salesHistoryApi.list(filters, page, 100);
    stats ??= res.stats;
    sales.push(...res.items);
    if (!res.hasMore || sales.length >= max) break;
    page += 1;
  }
  return { sales, stats };
}

export function salesCsv(sales: HistorySale[], header: string[]) {
  const head = ['Bill', 'Date', 'Waqt', 'Customer', 'Phone', 'Cheezein', 'Qty', 'Payment', 'Subtotal', 'Discount', 'Kul', 'Mila', 'Udhaar', 'Return', 'Staff', 'Halat'];
  const rows = sales.map((s) => [
    s.saleNumber, dt(s.soldAt).toLocaleDateString('en-PK'), dt(s.soldAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }),
    s.customer?.name ?? 'Walk-in', s.customer?.phone ?? '', s.items.length, s.items.reduce((a, i) => a + Number(i.quantity), 0),
    PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod, s.subtotal.toFixed(2), s.discount.toFixed(2), s.total.toFixed(2),
    s.paidAmount.toFixed(2), s.creditAmount.toFixed(2), s.changeAmount.toFixed(2), s.staff ?? '', STATUS[s.status] ?? s.status,
  ]);
  const csv = [...header.map((h) => [h]), [''], head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `sale-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function salesDoc(sales: HistorySale[], stats: HistoryStats | undefined, range: string, money: (n: number) => string, showProfit: boolean): PrintDoc {
  return {
    title: 'Sale ka record',
    subtitle: range,
    meta: [['Bill', String(stats?.bills ?? sales.length)], ['Kul', money(stats?.total ?? 0)], ['Udhaar', money(stats?.credit ?? 0)]],
    sections: [
      {
        kind: 'rows', title: 'Khulasa', rows: [
          { label: `Total sale (${stats?.bills ?? 0} bill)`, value: money(stats?.total ?? 0) },
          { label: 'Mila', value: money(stats?.paid ?? 0) },
          { label: 'Udhaar', value: money(stats?.credit ?? 0) },
          { label: 'Discount', value: money(stats?.discount ?? 0) },
          ...(showProfit ? [{ label: `Profit (${(stats?.margin ?? 0).toFixed(1)}%)`, value: formatPKR(stats?.profit ?? 0) }] : []),
          { label: 'Ausat bill', value: money(stats?.average ?? 0), strong: true },
        ],
      },
      {
        kind: 'table', title: 'Bill',
        columns: [{ label: 'Bill' }, { label: 'Waqt', wideOnly: true }, { label: 'Customer', wideOnly: true }, { label: 'Payment', wideOnly: true }, { label: 'Udhaar', align: 'right', wideOnly: true }, { label: 'Kul', align: 'right' }],
        rows: sales.map((s) => [
          s.status === 'VOIDED' ? `${s.saleNumber} (void)` : s.saleNumber,
          dt(s.soldAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
          s.customer?.name ?? 'Walk-in', PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod,
          s.creditAmount > 0 ? money(s.creditAmount) : '', money(s.total),
        ]),
        footer: ['Kul', '', '', '', money(stats?.credit ?? 0), money(stats?.total ?? 0)],
      },
    ],
  };
}
