/**
 * Hardware sales history: the shared history, with each bill's delivery
 * challans under it (how many, still on the way) and a link to send the
 * rest of the goods on a new challan.
 */

import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { deliveriesApi, type SaleChallans } from '../api/deliveries.api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useChallanExtras(sales: HistorySale[]) {
  const ids = sales.filter((s) => !s.pending && s.status !== 'VOIDED').map((s) => s.id);
  const { data = {} } = useQuery({
    queryKey: ['hardware-sale-challans', ids],
    queryFn: () => deliveriesApi.forSales(ids).catch(() => ({} as SaleChallans)),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
  return (sale: HistorySale) => {
    if (sale.pending || sale.status === 'VOIDED') return null;
    const c = data[sale.id];
    return createElement('div', { className: 'mt-1.5 flex flex-wrap items-center gap-1' },
      c ? createElement('span', { className: `${chip} ${c.open ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`, title: c.numbers.join(', ') },
        createElement(Truck, { className: 'h-3 w-3' }), c.open ? `${c.count} challan · ${c.open} raste me` : `${c.count} challan pohanch gaya`) : null,
      createElement(Link, {
        to: `/hardware/deliveries/new?sale=${sale.id}`,
        onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
        className: `${chip} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50`,
      }, createElement(Truck, { className: 'h-3 w-3' }), c ? 'Baqi maal ka challan' : 'Challan banayein'),
    );
  };
}

const config: SalesHistoryConfig = { label: 'Hardware', useBillExtras: useChallanExtras };

export default function HardwareSales() {
  return <SalesHistoryPage config={config} />;
}
