/**
 * Furniture sales history (SalesGate opens this page): the shared history,
 * with a mark under bills made outside the counter — a custom order's bill
 * or a delivery's charges — linking to its page.
 */

import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Truck } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { BILL_PREFIX } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold hover:underline';
const stop = (e: MouseEvent) => e.stopPropagation();

const MARKS = [
  { prefix: BILL_PREFIX.order, to: '/furniture/custom-orders', icon: ClipboardList, label: 'Custom order', tone: 'bg-amber-50 text-amber-800' },
  { prefix: BILL_PREFIX.delivery, to: '/furniture/deliveries', icon: Truck, label: 'Delivery charges', tone: 'bg-sky-50 text-sky-700' },
];

function useFurnitureExtras() {
  return (sale: HistorySale) => {
    const m = MARKS.find((x) => sale.saleNumber.startsWith(x.prefix));
    if (!m) return null;
    const Icon = m.icon;
    return (
      <div className="mt-1.5">
        <Link to={m.to} onClick={stop} className={`${chip} ${m.tone}`}><Icon className="h-3 w-3" />{m.label} {sale.sourceRef}</Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Furniture', useBillExtras: useFurnitureExtras };

export default function FurnitureSalesPage() {
  return <SalesHistoryPage config={config} />;
}
