/**
 * Auto parts sales history: the shared history, with a mark under each
 * workshop bill (made when a vehicle was handed back) linking to its job.
 */

import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

/** WSJ-JOB-2026-0001 or WSJ-JOB-2026-0001-2 → JOB-2026-0001 */
const jobOf = (saleNumber: string) => {
  if (!saleNumber.startsWith('WSJ-')) return null;
  const raw = saleNumber.slice(4);
  return /^JOB-\d{4}-\d+-\d+$/.test(raw) ? raw.replace(/-\d+$/, '') : raw;
};

function useJobExtras(_sales: HistorySale[]) {
  return (sale: HistorySale) => {
    const job = jobOf(sale.saleNumber);
    if (!job) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Link to={`/autoparts/jobs?q=${encodeURIComponent(job)}&view=all`}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-violet-700 hover:bg-violet-100">
          <Wrench className="h-3 w-3" />Workshop job {job}
        </Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Auto Parts', useBillExtras: useJobExtras };

export default function AutoPartsSalesPage() {
  return <SalesHistoryPage config={config} />;
}
