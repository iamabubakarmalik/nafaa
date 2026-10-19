/**
 * Garments sales history: the shared history, and under each bill the sizes
 * and colours that left with it plus the record the bill closed (silai order,
 * alteration, qist plan or hold).
 */

import { Link } from 'react-router-dom';
import { Bookmark, CreditCard, Ruler, Scissors, Tag } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

/** Bill made by a garments record; the record number is the bill's sourceRef. */
const RECORDS = [
  { prefix: 'TO-', label: 'Silai order', to: '/garments/tailoring', icon: Scissors, tone: 'bg-pink-50 text-pink-700' },
  { prefix: 'ALT-', label: 'Alteration', to: '/garments/alterations', icon: Ruler, tone: 'bg-violet-50 text-violet-700' },
  { prefix: 'LAY-', label: 'Qist plan', to: '/garments/layaway', icon: CreditCard, tone: 'bg-blue-50 text-blue-700' },
  { prefix: 'RES-', label: 'Hold', to: '/garments/reservations', icon: Bookmark, tone: 'bg-amber-50 text-amber-800' },
] as const;

function recordOf(sale: HistorySale) {
  const ref = sale.sourceRef ?? sale.saleNumber;
  const rec = RECORDS.find((r) => ref.startsWith(r.prefix));
  return rec ? { ...rec, ref } : null;
}

function GarmentExtras({ sale }: { sale: HistorySale }) {
  const rec = recordOf(sale);
  const variants = [...new Set(sale.items.map((it) => it.variant?.trim()).filter((v): v is string => !!v))];
  if (!rec && !variants.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {rec && (
        <Link to={rec.to} className={`${chip} ${rec.tone} hover:underline`} onClick={(e) => e.stopPropagation()}>
          <rec.icon className="h-3 w-3" /> {rec.label} · {rec.ref}
        </Link>
      )}
      {variants.slice(0, 6).map((v) => (
        <span key={v} className={`${chip} bg-slate-100 text-slate-600`}>
          <Tag className="h-3 w-3" /> {v}
        </span>
      ))}
      {variants.length > 6 && <span className={`${chip} bg-slate-100 text-slate-500`}>+{variants.length - 6}</span>}
    </div>
  );
}

const useGarmentExtras = () => (sale: HistorySale) => <GarmentExtras sale={sale} />;

const config: SalesHistoryConfig = { label: 'Garments', useBillExtras: useGarmentExtras };

export default function GarmentSalesPage() {
  return <SalesHistoryPage config={config} />;
}
