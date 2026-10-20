/**
 * Toy shop sales history: the shared history, with each bill's toys, Eid
 * gifts and gift wrapping shown under it.
 */

import { Baby, Gift, Moon } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import type { ToyFact } from '../api/products.api';
import { useToyFacts } from '../hooks/useToyFacts';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

function Extras({ sale, facts }: { sale: HistorySale; facts: Map<string, ToyFact> }) {
  let toys = 0;
  let eid = 0;
  let wrap = 0;
  for (const it of sale.items) {
    const f = it.productId ? facts.get(it.productId) : undefined;
    if (!f && /wrap/i.test(it.name)) wrap += it.quantity;
    else if (f) { toys += it.quantity; if (f.isEidGift) eid += it.quantity; }
  }
  if (!toys && !wrap) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {toys > 0 && <span className={`${chip} bg-pink-50 text-pink-700`}><Baby className="h-3 w-3" /> {toys} khilone</span>}
      {eid > 0 && <span className={`${chip} bg-emerald-50 text-emerald-700`}><Moon className="h-3 w-3" /> {eid} Eid gift</span>}
      {wrap > 0 && <span className={`${chip} bg-violet-50 text-violet-700`}><Gift className="h-3 w-3" /> Gift wrap × {wrap}</span>}
    </div>
  );
}

function useToyExtras() {
  const facts = useToyFacts();
  return (sale: HistorySale) => <Extras sale={sale} facts={facts} />;
}

const config: SalesHistoryConfig = { label: 'Toy shop', useBillExtras: useToyExtras };

export default function ToystoreSalesPage() {
  return <SalesHistoryPage config={config} />;
}
