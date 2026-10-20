/**
 * Pet shop sales history (SalesGate opens this page): the shared history,
 * and under each bill the grooming visit it closed or the animals it sold.
 */

import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Scissors } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';
const stop = (e: MouseEvent) => e.stopPropagation();
/** An animal's counter line ends with its number, e.g. "Persian (CAT-0004)". */
const ANIMAL = /\(([A-Z]{3}-\d{4,})\)$/;

function usePetshopExtras() {
  return (sale: HistorySale) => {
    if (sale.saleNumber.startsWith('PGR-')) {
      return <div className="mt-1.5"><Link to="/petshop/grooming" onClick={stop} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}><Scissors className="h-3 w-3" /> Grooming {sale.sourceRef}</Link></div>;
    }
    const animals = sale.items.map((i) => ANIMAL.exec(i.name)?.[1]).filter((n): n is string => !!n);
    if (!animals.length) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        {animals.map((n) => <Link key={n} to="/petshop/live-animals" onClick={stop} className={`${chip} bg-amber-50 text-amber-800 hover:underline`}><PawPrint className="h-3 w-3" /> Janwar {n}</Link>)}
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Pet shop', useBillExtras: usePetshopExtras };

export default function PetshopSalesPage() {
  return <SalesHistoryPage config={config} />;
}
