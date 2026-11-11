/**
 * Conversion funnel: how many visitors reach each step (visit, sign up, ask,
 * book, convert) for the chosen period, and where they drop off.
 */

import { useQuery } from '@tanstack/react-query';
import { Filter, Globe, TrendingDown, TrendingUp, UserCheck } from 'lucide-react';
import { Card, DateRangeMenu, EmptyState, FilterBar, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { conversionsApi } from '@/api/marketing/marketing-conversions.api';
import { useListParams } from '@/ui';
import { periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, num } from '../../lib/kit';

const DEFAULTS = { period: 'month', from: '', to: '' };

export function FunnelPage() {
  const guide = usePageGuide();
  const list = useListParams(DEFAULTS);
  const q = periodQuery(list.filters);
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['mkt', 'funnel', q], queryFn: () => conversionsApi.funnel(q.from, q.to), placeholderData: (p) => p });
  const steps: any[] = data?.funnel ?? [];
  const max = Math.max(1, ...steps.map((s) => s.count));
  const top = steps[0]?.count ?? 0;
  const last = steps[steps.length - 1]?.count ?? 0;

  return (
    <PageShell>
      <PageHero
        title="Conversion funnel"
        chip={periodChip(list.filters) ?? undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={data ? [
          { label: 'Overall conversion', value: data.overallConversion },
          { label: 'Top of funnel', value: num(top), hint: steps[0]?.step },
          { label: 'Reached the end', value: num(last), hint: steps[steps.length - 1]?.step },
          { label: 'Steps', value: steps.length },
        ] : undefined}
      />

      <FilterBar>
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      <Card title="Steps" description="Each bar is compared with the biggest step.">
        {isLoading ? <Skeleton className="h-48 rounded-2xl" /> : steps.length === 0 ? (
          <EmptyState icon={<Filter className="h-6 w-6" />} title="No funnel data" description="Try a longer period." />
        ) : (
          <ol className="space-y-4">
            {steps.map((step, i) => {
              const w = (step.count / max) * 100;
              return (
                <li key={step.step}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[0.8125rem]">
                    <span className="font-medium text-slate-800">{i + 1}. {step.step}</span>
                    <span className="flex flex-wrap items-center gap-x-4 tabular-nums">
                      <b className="text-slate-900">{num(step.count)}</b>
                      {step.conversionFromPrev !== '—' && <span className="text-[0.75rem] text-slate-500">{step.conversionFromPrev} from previous</span>}
                      {step.dropoff !== '—' && <span className="inline-flex items-center gap-1 text-[0.75rem] text-rose-600"><TrendingDown className="h-3 w-3" /> {step.dropoff} dropped</span>}
                    </span>
                  </div>
                  <div className="h-7 overflow-hidden rounded-lg bg-slate-100">
                    <div className="h-full rounded-lg bg-brand-500 transition-[width] duration-500" style={{ width: `${Math.max(w, 1)}%`, opacity: 1 - i * 0.1 }} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {guide.isOpen && (
        <PageGuide
          title="Conversion funnel"
          description="Shows where visitors are lost on the way to becoming customers."
          flowTitle="The funnel"
          flow={[
            { label: 'Visit', hint: 'Website', icon: Globe, color: '#0284c7' },
            { label: 'Engage', hint: 'Sign up, ask, chat', icon: Filter, color: '#4f46e5' },
            { label: 'Book a demo', hint: 'Interest', icon: TrendingUp, color: '#d97706' },
            { label: 'Convert', hint: 'Becomes a shop', icon: UserCheck, color: '#059669' },
          ]}
          steps={[
            { icon: TrendingDown, color: '#e11d48', title: 'Find the biggest drop', text: 'The step with the largest drop-off is where improving the website pays most.' },
            { icon: TrendingUp, color: '#059669', title: 'Compare periods', text: 'Change the period to see whether a change helped.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
