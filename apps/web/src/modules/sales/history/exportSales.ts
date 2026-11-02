/** CSV and printable report of every bill in the current filter (all pages). */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import { salesHistoryApi, type HistoryFilters, type HistorySale, type HistoryStats } from './api';
import { t } from '@core/i18n';

const STATUS: Record<string, string> = { COMPLETED: t('Mukammal'), PARTIALLY_RETURNED: t('Kuch wapas'), FULLY_RETURNED: t('Poora wapas'), VOIDED: t('Wapas li gayi') };
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
  const head = [t('Bill'), t('Date'), t('Waqt'), t('Customer'), t('Phone'), t('Cheezein'), t('Qty'), t('Payment'), t('Subtotal'), t('Discount'), t('Kul'), t('Mila'), t('Udhaar'), t('Return'), t('Staff'), t('Halat')];
  const rows = sales.map((s) => [
    s.saleNumber, dt(s.soldAt).toLocaleDateString('en-PK'), dt(s.soldAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }),
    s.customer?.name ?? t('Walk-in'), s.customer?.phone ?? '', s.items.length, s.items.reduce((a, i) => a + Number(i.quantity), 0),
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
    title: t('Sale ka record'),
    subtitle: range,
    meta: [[t('Bill'), String(stats?.bills ?? sales.length)], [t('Kul'), money(stats?.total ?? 0)], [t('Udhaar'), money(stats?.credit ?? 0)]],
    sections: [
      {
        kind: 'rows', title: t('Khulasa'), rows: [
          { label: t('Total sale ({{value}} bill)', { value: stats?.bills ?? 0 }), value: money(stats?.total ?? 0) },
          { label: t('Mila'), value: money(stats?.paid ?? 0) },
          { label: t('Udhaar'), value: money(stats?.credit ?? 0) },
          { label: t('Discount'), value: money(stats?.discount ?? 0) },
          ...(showProfit ? [{ label: t('Profit ({{value}}%)', { value: (stats?.margin ?? 0).toFixed(1) }), value: formatPKR(stats?.profit ?? 0) }] : []),
          { label: t('Ausat bill'), value: money(stats?.average ?? 0), strong: true },
        ],
      },
      {
        kind: 'table', title: t('Bill'),
        columns: [{ label: t('Bill') }, { label: t('Waqt'), wideOnly: true }, { label: t('Customer'), wideOnly: true }, { label: t('Payment'), wideOnly: true }, { label: t('Udhaar'), align: 'right', wideOnly: true }, { label: t('Kul'), align: 'right' }],
        rows: sales.map((s) => [
          s.status === 'VOIDED' ? `${s.saleNumber} (void)` : s.saleNumber,
          dt(s.soldAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
          s.customer?.name ?? t('Walk-in'), PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod,
          s.creditAmount > 0 ? money(s.creditAmount) : '', money(s.total),
        ]),
        footer: [t('Kul'), '', '', '', money(stats?.credit ?? 0), money(stats?.total ?? 0)],
      },
    ],
  };
}
