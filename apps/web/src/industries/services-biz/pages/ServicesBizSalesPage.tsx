/**
 * Service-business sales history (SalesGate opens this page): the shared
 * history, and under each bill the job card or AMC contract it closed.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Briefcase } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { jobsApi } from '../api/jobs.api';
import { JOB_KEY } from '../components/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

function useServiceExtras(sales: HistorySale[]) {
  const ids = sales.filter((s) => !s.pending && s.saleNumber.startsWith('SVC-')).map((s) => s.id);
  const q = useQuery({ queryKey: [JOB_KEY, 'by-sales', ids.join(',')], queryFn: () => jobsApi.bySales(ids), enabled: ids.length > 0, staleTime: 60_000 });
  const bySale = new Map((q.data ?? []).map((m) => [m.saleId, m]));
  return (sale: HistorySale) => {
    const m = bySale.get(sale.id);
    if (!m) return null;
    const amc = m.kind === 'amc';
    return (
      <div className="mt-1.5">
        <Link to={amc ? `/services-biz/amc?open=${m.id}` : `/services-biz/jobs/${m.id}`} onClick={(e) => e.stopPropagation()}
          className={`${chip} ${amc ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'} hover:underline`}>
          {amc ? <Award className="h-3 w-3" /> : <Briefcase className="h-3 w-3" />} {m.number}{!amc && ` · ${m.label}`}
        </Link>
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Services', useBillExtras: useServiceExtras };

export default function ServicesBizSalesPage() {
  return <SalesHistoryPage config={config} />;
}
