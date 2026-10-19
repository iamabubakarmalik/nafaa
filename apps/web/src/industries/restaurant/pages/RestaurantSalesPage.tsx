/**
 * Restaurant sales history: the shared sales record, plus under each bill
 * the order it came from — dine-in table, takeaway token or delivery — with
 * a link to the order.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { ordersApi } from '../api/orders.api';
import { MODE_META } from '../lib/orderMeta';

function useOrderExtras(sales: HistorySale[]) {
  const ids = useMemo(() => sales.filter((s) => !s.pending).map((s) => s.id).sort(), [sales]);
  const { data = [] } = useQuery({
    queryKey: ['restaurant-orders-for-sales', ids],
    queryFn: () => ordersApi.list({ saleIds: ids.join(',') }).catch(() => []),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  const bySale = useMemo(() => new Map(data.map((o) => [o.saleId, o])), [data]);

  return (sale: HistorySale) => {
    const o = bySale.get(sale.id);
    if (!o) return null;
    const meta = MODE_META[o.mode];
    const where = o.table ? `Table ${o.table.tableNumber}` : o.token ? `Token #${o.token}` : o.customerName;
    return createElement(Link, {
      to: `/restaurant/orders/${o.id}`,
      onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
      className: 'mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-slate-700 hover:bg-slate-200',
    }, createElement(meta.icon, { className: 'h-3 w-3', style: { color: meta.color } }), [meta.label, where, o.orderNumber].filter(Boolean).join(' · '));
  };
}

const config: SalesHistoryConfig = { label: 'Restaurant', useBillExtras: useOrderExtras };

export default function RestaurantSalesPage() {
  return <SalesHistoryPage config={config} />;
}
