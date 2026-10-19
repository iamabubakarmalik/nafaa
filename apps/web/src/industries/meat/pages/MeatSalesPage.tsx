/**
 * Meat sales history (SalesGate opens this page): the shared history, with
 * the weight order (delivery, subscription) or qurbani booking behind a bill.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Beef, CalendarClock, Package, Truck } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { weightOrdersApi } from '../api/weight-orders.api';
import { KEYS } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useMeatExtras(sales: HistorySale[]) {
  const ids = sales.filter((s) => !s.pending).map((s) => s.id);
  const q = useQuery({
    queryKey: [KEYS.orders, 'by-sales', ids.join(',')],
    queryFn: () => weightOrdersApi.bySales(ids).catch(() => ({})),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  return (sale: HistorySale) => {
    if (sale.saleNumber.startsWith('QRB-')) {
      return <div className="mt-1.5"><Link to="/meat/qurbani" onClick={(e) => e.stopPropagation()} className={`${chip} bg-amber-50 text-amber-800 hover:underline`}><Beef className="h-3 w-3" /> Qurbani {sale.sourceRef}</Link></div>;
    }
    const o = (q.data as Record<string, { id: string; orderNumber: string; isDelivery: boolean; occasion: string | null }> | undefined)?.[sale.id];
    if (!o) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Link to={`/meat/weight-orders?open=${o.id}`} onClick={(e) => e.stopPropagation()} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}><Package className="h-3 w-3" /> Order {o.orderNumber}</Link>
        {o.isDelivery && <span className={`${chip} bg-sky-50 text-sky-700`}><Truck className="h-3 w-3" /> Delivery</span>}
        {o.occasion?.startsWith('Subscription ') && <span className={`${chip} bg-emerald-50 text-emerald-700`}><CalendarClock className="h-3 w-3" /> {o.occasion}</span>}
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Meat', useBillExtras: useMeatExtras };

export default function MeatSalesPage() {
  return <SalesHistoryPage config={config} />;
}
