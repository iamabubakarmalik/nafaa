import { useQuery } from '@tanstack/react-query';
import { MousePointer2 } from 'lucide-react';
import { heatmapsApi } from '../../../../api/marketing/marketing-heatmaps.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { DataTable } from '../../_shared/components/DataTable';
import { EmptyState } from '../../_shared/components/EmptyState';

export function HeatmapsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['heatmap-pages'], queryFn: heatmapsApi.pages });

  return (
    <div className="space-y-6">
      <PageHeader title="Heatmaps" subtitle="Click + scroll behaviour per page" />

      <DataTable
        loading={isLoading}
        data={data ?? []}
        keyExtractor={(p: any) => p.path}
        empty={<EmptyState icon={MousePointer2} title="No heatmap data yet" message="Install the tracker snippet on your site to collect click data" />}
        columns={[
          { key: 'path', header: 'Page', render: (p: any) => <code className="text-xs">{p.path}</code> },
          { key: 'sessions', header: 'Sessions', render: (p: any) => p.sessions.toLocaleString() },
          {
            key: 'avgScroll',
            header: 'Avg Scroll Depth',
            render: (p: any) => (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-neutral-200">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${p.avgScrollDepth}%` }} />
                </div>
                <span className="text-xs">{p.avgScrollDepth}%</span>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
