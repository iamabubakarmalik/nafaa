/**
 * Florist sales history (SalesGate opens this page): the shared history,
 * and under each bill the delivery order it carries (recipient, day,
 * status), or the wedding contract / subscription delivery it billed.
 */

import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Repeat, Truck } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { floristOrdersApi } from '../api/orders.api';
import { FLORIST_KEYS, ORDER_STATUS, shortDate } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';
const stop = (e: MouseEvent) => e.stopPropagation();

function useFloristExtras(sales: HistorySale[]) {
  const bills = sales.filter((s) => !s.pending && !/^(FLW-|FS-)/.test(s.saleNumber)).map((s) => s.saleNumber);
  const q = useQuery({
    queryKey: [FLORIST_KEYS.orders, 'by-bills', bills.join(',')],
    queryFn: () => floristOrdersApi.list({ bills: bills.join(',') }),
    enabled: bills.length > 0,
    staleTime: 60_000,
  });
  const byBill = new Map((q.data ?? []).map((o) => [o.notes?.replace(/^Bill /, ''), o]));

  return (sale: HistorySale) => {
    if (sale.saleNumber.startsWith('FLW-')) {
      return <div className="mt-1.5"><Link to="/florist/weddings" onClick={stop} className={`${chip} bg-pink-50 text-pink-700 hover:underline`}><Heart className="h-3 w-3" /> Shaadi {sale.sourceRef}</Link></div>;
    }
    if (sale.saleNumber.startsWith('FS-')) {
      return <div className="mt-1.5"><Link to="/florist/subscriptions" onClick={stop} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}><Repeat className="h-3 w-3" /> Subscription {sale.sourceRef}</Link></div>;
    }
    const o = byBill.get(sale.saleNumber);
    if (!o) return null;
    return (
      <div className="mt-1.5">
        <Link to="/florist/orders" onClick={stop} className={`${chip} bg-sky-50 text-sky-700 hover:underline`}>
          <Truck className="h-3 w-3" /> {o.orderNumber} · {o.recipientName ?? o.customerName} · {shortDate(o.scheduledDeliveryDate)} · {ORDER_STATUS[o.status]?.label}
        </Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Florist', useBillExtras: useFloristExtras };

export default function FloristSalesPage() {
  return <SalesHistoryPage config={config} />;
}
