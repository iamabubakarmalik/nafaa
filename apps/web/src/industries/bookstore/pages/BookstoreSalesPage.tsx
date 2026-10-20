/**
 * Bookstore sales history: the shared history, with each bill's mix of
 * books and stationery under it and a link to the rental behind rental fee,
 * late fine and lost-book bills.
 */

import { Link } from 'react-router-dom';
import { BookOpen, Palette, Pencil, Timer } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import type { BookFact } from '../api/book-profiles.api';
import { useBookFacts } from '../hooks/useBookFacts';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

/** Bills made by the rentals screen: fee (BKR-) and fine or lost copy (BKF-). */
function rentalOf(sale: HistorySale): { label: string; ref: string } | null {
  if (sale.saleNumber.startsWith('BKR-')) return { label: 'Kiraya', ref: sale.sourceRef ?? sale.saleNumber.slice(4) };
  if (sale.saleNumber.startsWith('BKF-')) return { label: 'Jurmana / gum kitab', ref: sale.sourceRef ?? sale.saleNumber.slice(4) };
  return null;
}

function Extras({ sale, facts }: { sale: HistorySale; facts: Map<string, BookFact> }) {
  const rental = rentalOf(sale);
  const count = { BOOK: 0, STATIONERY: 0, ART: 0 } as Record<string, number>;
  for (const it of sale.items) {
    const k = it.productId ? facts.get(it.productId)?.kind : undefined;
    if (k) count[k] += it.quantity;
  }
  if (!rental && !count.BOOK && !count.STATIONERY && !count.ART) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {rental && (
        <Link to="/bookstore/rentals" className={`${chip} bg-amber-50 text-amber-800 hover:underline`} onClick={(e) => e.stopPropagation()}>
          <Timer className="h-3 w-3" /> {rental.label} · {rental.ref}
        </Link>
      )}
      {count.BOOK > 0 && <span className={`${chip} bg-sky-50 text-sky-700`}><BookOpen className="h-3 w-3" /> {count.BOOK} kitab</span>}
      {count.STATIONERY > 0 && <span className={`${chip} bg-violet-50 text-violet-700`}><Pencil className="h-3 w-3" /> {count.STATIONERY} stationery</span>}
      {count.ART > 0 && <span className={`${chip} bg-pink-50 text-pink-700`}><Palette className="h-3 w-3" /> {count.ART} art</span>}
    </div>
  );
}

function useBookExtras() {
  const facts = useBookFacts();
  return (sale: HistorySale) => <Extras sale={sale} facts={facts} />;
}

const config: SalesHistoryConfig = { label: 'Bookstore', useBillExtras: useBookExtras };

export default function BookstoreSalesPage() {
  return <SalesHistoryPage config={config} />;
}
