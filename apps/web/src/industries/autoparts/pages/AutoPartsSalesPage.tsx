/**
 * Auto parts sales history: the shared history, with a mark under each
 * workshop bill (made when a vehicle was handed back) linking to its job.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import { JOB_KEY } from '../components/meta';

function useJobExtras(sales: HistorySale[]) {
  const ids = sales.map((s) => s.id);
  const jobs = useQuery({
    queryKey: [JOB_KEY, 'by-sales', ids],
    queryFn: () => workshopJobsApi.bySales(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  const bySale = new Map((jobs.data ?? []).map((j) => [j.saleId, j]));
  return (sale: HistorySale) => {
    const job = bySale.get(sale.id);
    if (!job) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Link to={`/autoparts/jobs/${job.jobId}`}
          className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-violet-700 hover:bg-violet-100">
          <Wrench className="h-3 w-3" />Workshop job {job.jobNumber}
        </Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Auto Parts', useBillExtras: useJobExtras };

export default function AutoPartsSalesPage() {
  return <SalesHistoryPage config={config} />;
}
