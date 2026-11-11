/**
 * Website traffic: pageviews, visitors and sessions for the chosen period,
 * a daily pageviews chart, top traffic sources and top pages.
 */

import { useQuery } from '@tanstack/react-query';
import { Activity, Eye, Globe, MousePointerClick, TrendingUp, Users } from 'lucide-react';
import { Card, DateRangeMenu, EmptyState, FilterBar, PageHero, PageShell } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { analyticsApi } from '@/api/marketing/marketing-analytics.api';
import { useListParams } from '@/ui';
import { periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, TrendChart, num } from '../../lib/kit';

const DEFAULTS = { period: 'month', from: '', to: '' };

function daysIn(q: { from?: string; to?: string }) {
  if (!q.from || !q.to) return 30;
  return Math.min(365, Math.max(1, Math.round((new Date(q.to).getTime() - new Date(q.from).getTime()) / 864e5) + 1));
}

export function TrafficOverviewPage() {
  const guide = usePageGuide();
  const list = useListParams(DEFAULTS);
  const q = periodQuery(list.filters);
  const days = daysIn(q);

  const overview = useQuery({ queryKey: ['mkt', 'traffic', 'overview', q], queryFn: () => analyticsApi.overview(q.from, q.to), placeholderData: (p) => p });
  const sources = useQuery({ queryKey: ['mkt', 'traffic', 'sources', q], queryFn: () => analyticsApi.sources(q.from, q.to), placeholderData: (p) => p });
  const pages = useQuery({ queryKey: ['mkt', 'traffic', 'pages', q], queryFn: () => analyticsApi.topPages(q.from, q.to), placeholderData: (p) => p });
  const series = useQuery({ queryKey: ['mkt', 'traffic', 'series', days], queryFn: () => analyticsApi.timeseries(days), placeholderData: (p) => p });
  const o = overview.data;
  const maxSource = Math.max(1, ...(sources.data ?? []).map((s: any) => s.pageviews));
  const maxPage = Math.max(1, ...(pages.data ?? []).map((p: any) => p.views));

  return (
    <PageShell>
      <PageHero
        title="Traffic"
        chip={periodChip(list.filters) ?? undefined}
        busy={overview.isFetching}
        loading={overview.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={o ? [
          { label: 'Pageviews', value: num(o.traffic.pageviews) },
          { label: 'Unique visitors', value: num(o.traffic.uniqueVisitors) },
          { label: 'Sessions', value: num(o.traffic.sessions) },
          { label: 'Conversion', value: o.conversions.conversionRate },
        ] : undefined}
      />

      <FilterBar>
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      <Card title="Pageviews per day" description={`The last ${days} days.`}>
        {series.data && series.data.length > 0
          ? <TrendChart data={series.data} xKey="date" yKey="pageviews" label="Pageviews" />
          : <EmptyState icon={<Activity className="h-6 w-6" />} title="No data yet" description="Pageviews appear once visitors browse the website." />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Top sources" description="Where visitors came from.">
          {sources.data?.length ? (
            <ul className="space-y-3">
              {sources.data.slice(0, 10).map((s: any) => (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]"><span className="font-medium text-slate-800">{s.source}</span><span className="tabular-nums font-semibold text-slate-900">{num(s.pageviews)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(s.pageviews / maxSource) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-[0.8125rem] text-slate-500">No sources in this period.</p>}
        </Card>
        <Card title="Top pages" description="The most viewed pages.">
          {pages.data?.length ? (
            <ul className="space-y-3">
              {pages.data.slice(0, 10).map((p: any) => (
                <li key={p.path}>
                  <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]"><code className="truncate text-[0.75rem] text-slate-700">{p.path}</code><span className="shrink-0 tabular-nums font-semibold text-slate-900">{num(p.views)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.views / maxPage) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-[0.8125rem] text-slate-500">No page views in this period.</p>}
        </Card>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Traffic"
          description="How many people visit the Nafaa website, and where they come from."
          flowTitle="From a click to a visit"
          flow={[
            { label: 'Source', hint: 'Search, social, direct', icon: Globe, color: '#0284c7' },
            { label: 'Pageview', hint: 'A page opens', icon: Eye, color: '#4f46e5' },
            { label: 'Session', hint: 'One visit', icon: Users, color: '#d97706' },
            { label: 'Conversion', hint: 'Form, demo, signup', icon: TrendingUp, color: '#059669' },
          ]}
          steps={[
            { icon: Eye, color: '#4f46e5', title: 'Pick a period', text: 'The numbers, sources and pages follow the period you choose.' },
            { icon: Globe, color: '#0284c7', title: 'Read the sources', text: 'See which channels bring visitors, so you know where to spend effort.' },
            { icon: MousePointerClick, color: '#059669', title: 'Check top pages', text: 'The pages people read most show what they care about.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
