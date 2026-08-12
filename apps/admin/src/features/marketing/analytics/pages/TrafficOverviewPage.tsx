import { useQuery } from '@tanstack/react-query';
import { Users, Eye, Activity, TrendingUp } from 'lucide-react';
import { analyticsApi } from '../../../../api/marketing/marketing-analytics.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { MetricChart } from '../../_shared/components/MetricChart';
import { DateRangePicker } from '../../_shared/components/DateRangePicker';
import { useMarketingDateRange } from '../../_shared/hooks/useMarketingDateRange';

export function TrafficOverviewPage() {
  const { from, to, setRange } = useMarketingDateRange(30);

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview', from, to],
    queryFn: () => analyticsApi.overview(from, to),
  });

  const { data: sources } = useQuery({
    queryKey: ['analytics-sources', from, to],
    queryFn: () => analyticsApi.sources(from, to),
  });

  const { data: pages } = useQuery({
    queryKey: ['analytics-pages', from, to],
    queryFn: () => analyticsApi.topPages(from, to),
  });

  const { data: timeseries } = useQuery({
    queryKey: ['analytics-timeseries'],
    queryFn: () => analyticsApi.timeseries(30),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic Analytics"
        subtitle="Visitors, sources, top pages"
        actions={<DateRangePicker from={from} to={to} onChange={setRange} />}
      />

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pageviews" value={overview.traffic.pageviews.toLocaleString()} icon={Eye} />
          <StatCard label="Unique Visitors" value={overview.traffic.uniqueVisitors.toLocaleString()} icon={Users} />
          <StatCard label="Sessions" value={overview.traffic.sessions.toLocaleString()} icon={Activity} />
          <StatCard label="Conversion" value={overview.conversions.conversionRate} icon={TrendingUp} deltaColor="up" />
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-neutral-800">Pageviews (Last 30 days)</h3>
        {timeseries && timeseries.length > 0 ? (
          <MetricChart data={timeseries} xKey="date" yKey="pageviews" height={280} />
        ) : (
          <p className="py-8 text-center text-sm text-neutral-500">No data yet</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-neutral-800">Top Sources</h3>
          <ul className="space-y-2">
            {sources?.slice(0, 10).map((s: any) => (
              <li key={s.source} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{s.source}</span>
                <span className="font-medium text-neutral-900">{s.pageviews.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-neutral-800">Top Pages</h3>
          <ul className="space-y-2">
            {pages?.slice(0, 10).map((p: any) => (
              <li key={p.path} className="flex items-center justify-between gap-3 text-sm">
                <code className="truncate text-xs text-neutral-700">{p.path}</code>
                <span className="shrink-0 font-medium text-neutral-900">{p.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
