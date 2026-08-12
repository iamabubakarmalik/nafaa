import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp } from 'lucide-react';
import { seoApi } from '../../../../api/marketing/marketing-seo.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';

export function SeoPagesPage() {
  const { data: score } = useQuery({ queryKey: ['seo-score'], queryFn: seoApi.score });
  const { data, isLoading } = useQuery({ queryKey: ['seo-pages'], queryFn: () => seoApi.pages({ limit: 50 }) });
  const { data: keywords } = useQuery({ queryKey: ['seo-keywords'], queryFn: seoApi.keywords });

  return (
    <div className="space-y-6">
      <PageHeader title="SEO Manager" subtitle="Pages, meta, keywords" />

      {score && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="SEO Score" value={`${score.score}/100`} icon={TrendingUp} deltaColor={score.score >= 70 ? 'up' : 'down'} />
          <StatCard label="Total Pages" value={score.totalPages} icon={Search} />
          <StatCard label="Missing Meta" value={score.missing} deltaColor={score.missing > 0 ? 'down' : 'neutral'} />
          <StatCard label="Weak Meta" value={score.weak} />
        </div>
      )}

      <DataTable
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(p: any) => p.id}
        columns={[
          { key: 'path', header: 'Path', render: (p: any) => <code className="text-xs">{p.path}</code> },
          { key: 'title', header: 'Title', render: (p: any) => p.title ?? <span className="text-rose-500">Missing</span> },
          { key: 'meta', header: 'Meta Description', render: (p: any) => <span className="text-xs text-neutral-500">{p.metaDescription?.slice(0, 80) ?? <span className="text-rose-500">Missing</span>}</span> },
          { key: 'clicks', header: 'Clicks', render: (p: any) => p.totalClicks.toLocaleString() },
          { key: 'position', header: 'Avg Position', render: (p: any) => p.avgPosition?.toFixed(1) ?? '—' },
          { key: 'status', header: 'Status', render: (p: any) => <StatusBadge status={p.status} /> },
        ]}
      />

      {keywords && keywords.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Top Keywords</h3>
          <ul className="space-y-2">
            {keywords.slice(0, 20).map((k: any) => (
              <li key={k.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-800">{k.keyword}</span>
                <div className="flex items-center gap-4 text-xs text-neutral-600">
                  <span>Pos: {k.currentPosition ?? '—'}</span>
                  <span>{k.clicks} clicks</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
