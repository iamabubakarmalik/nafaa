/**
 * Dairy sales history (SalesGate opens this page): the shared history, with
 * home delivery bills (DLV-) marked and linked to the delivery customer.
 */

import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

function useDairyExtras() {
  return (sale: HistorySale) => {
    if (!sale.saleNumber.startsWith('DLV-')) return null;
    const ref = sale.sourceRef;
    return (
      <div className="mt-1.5">
        <Link to={ref ? `/dairy/customers?search=${encodeURIComponent(ref)}` : '/dairy/deliveries'} onClick={(e) => e.stopPropagation()} className={`${chip} bg-sky-50 text-sky-800 hover:underline`}>
          <Truck className="h-3 w-3" /> Ghar delivery{ref ? ` · ${ref}` : ''}
        </Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Dairy', useBillExtras: useDairyExtras };

export default function DairySales() {
  return <SalesHistoryPage config={config} />;
}
