/**
 * Lead list: stage tabs, search, "follow-up aaj" filter, loaded page by page
 * from the server. Filters live in the address so Back keeps them.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CalendarClock, MapPinPlus, Store } from 'lucide-react';
import { Button, EmptyState, PageHero, PageShell, SearchField, Skeleton, Tabs, heroPrimaryButton } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import type { LeadStage } from '@/api/types';
import { STAGES, STAGE } from '@/lib/labels';
import { num } from '@/lib/format';
import { cn } from '@/lib/cn';
import { QueryError } from '@/ui/QueryState';
import { LeadCard } from './LeadCard';

type Tab = LeadStage | 'ALL';
const PAGE = 20;

export default function LeadsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stage = (params.get('stage') as LeadStage | null) ?? '';
  const due = params.get('due') === '1';
  const [term, setTerm] = useState(params.get('q') ?? '');

  // Search is written to the address after a short pause.
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (term.trim()) next.set('q', term.trim()); else next.delete('q');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(id);
  }, [term]);
  const search = params.get('q') ?? '';

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const counts = useQuery({ queryKey: ['dashboard'], queryFn: partnerApi.dashboard, staleTime: 60_000 });
  const q = useInfiniteQuery({
    queryKey: ['leads', 'list', stage, search, due],
    queryFn: ({ pageParam }) => partnerApi.leads({ stage, search, due, page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const total = q.data?.pages[0]?.meta.total;
  const leadCounts = counts.data?.leads;
  const allCount = leadCounts ? STAGES.reduce((n, s) => n + (leadCounts[s] ?? 0), 0) : undefined;

  const tabs = [
    { value: 'ALL' as Tab, label: 'Sab', count: allCount },
    ...STAGES.map((s) => ({ value: s as Tab, label: STAGE[s].label, count: leadCounts?.[s] })),
  ];

  return (
    <PageShell>
      <PageHero title="Leads" chip={total != null ? `${num(total)} ${total === 1 ? "lead" : "leads"}` : undefined} busy={q.isFetching && !q.isFetchingNextPage}
        actions={<button type="button" className={heroPrimaryButton} onClick={() => navigate('/visit/new')}><MapPinPlus className="h-4 w-4" />Naya Visit</button>} />

      <div className="space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <SearchField value={term} onChange={setTerm} placeholder="Dukaan, malik ya number" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setParam('due', due ? null : '1')} aria-pressed={due}
            className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 transition',
              due ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-slate-700 ring-slate-200')}>
            <CalendarClock className="h-4 w-4" />Follow-up aaj
          </button>
        </div>
        <Tabs<Tab> label="Stage" value={stage || 'ALL'} onChange={(v) => setParam('stage', v === 'ALL' ? null : v)} items={tabs} />
      </div>

      {q.isPending ? (
        <div className="space-y-2.5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <EmptyState icon={<Store className="h-6 w-6" />}
            title={search || stage || due ? 'Is filter me koi lead nahi' : 'Abhi koi lead nahi'}
            description={search || stage || due ? 'Filter badal kar dekhein.' : 'Dukaan par Visit karein; har nayi dukaan yahan lead ban jati hai.'}
            action={!(search || stage || due) && <Button onClick={() => navigate('/visit/new')} leftIcon={<MapPinPlus className="h-4 w-4" />}>Naya Visit</Button>} />
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {items.map((l) => <li key={l.id}><LeadCard lead={l} /></li>)}
          </ul>
          {q.hasNextPage && (
            <Button variant="secondary" size="lg" fullWidth loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
              Aur dikhayein ({num(items.length)} / {num(total ?? 0)})
            </Button>
          )}
        </>
      )}
    </PageShell>
  );
}
