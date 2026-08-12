import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Beaker } from 'lucide-react';
import { abTestsApi } from '../../../../api/marketing/marketing-ab-tests.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { EmptyState } from '../../_shared/components/EmptyState';

export function AbTestsListPage() {
  const { data, isLoading } = useQuery({ queryKey: ['ab-tests'], queryFn: abTestsApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title="A/B Tests" subtitle="Optimize with data-driven experiments" />

      <DataTable
        loading={isLoading}
        data={data ?? []}
        keyExtractor={(t: any) => t.id}
        empty={<EmptyState icon={Beaker} title="No A/B tests yet" message="Create tests to compare landing page variants" />}
        columns={[
          { key: 'name', header: 'Test', render: (t: any) => <p className="font-medium">{t.name}</p> },
          { key: 'goalMetric', header: 'Goal', render: (t: any) => <span className="text-xs">{t.goalMetric}</span> },
          { key: 'status', header: 'Status', render: (t: any) => <StatusBadge status={t.status} /> },
          { key: 'visitors', header: 'Visitors', render: (t: any) => t.totalVisitors?.toLocaleString() ?? 0 },
          { key: 'conversions', header: 'Conversions', render: (t: any) => t.totalConversions?.toLocaleString() ?? 0 },
        ]}
      />
    </div>
  );
}
