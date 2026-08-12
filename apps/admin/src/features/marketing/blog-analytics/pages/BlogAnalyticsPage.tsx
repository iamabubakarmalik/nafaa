import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, Users, TrendingUp } from 'lucide-react';
import { blogAnalyticsApi } from '../../../../api/marketing/marketing-blog.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { DataTable } from '../../_shared/components/DataTable';

export function BlogAnalyticsPage() {
  const { data: overview } = useQuery({ queryKey: ['blog-overview'], queryFn: () => blogAnalyticsApi.overview() });
  const { data: top, isLoading } = useQuery({ queryKey: ['blog-top'], queryFn: () => blogAnalyticsApi.topPosts() });

  return (
    <div className="space-y-6">
      <PageHeader title="Blog Analytics" subtitle="Top-performing content" />

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Published Posts" value={overview.publishedPosts} icon={FileText} />
          <StatCard label="Total Views" value={overview.totalViews.toLocaleString()} icon={Eye} />
          <StatCard label="Signups" value={overview.emailSignups} icon={Users} hint={overview.signupRate} />
          <StatCard label="Organic Clicks" value={overview.organicClicks.toLocaleString()} icon={TrendingUp} />
        </div>
      )}

      <DataTable
        loading={isLoading}
        data={top ?? []}
        keyExtractor={(p: any) => p.postId}
        columns={[
          { key: 'title', header: 'Post', render: (p: any) => <div><p className="font-medium">{p.title}</p><code className="text-xs text-neutral-500">/{p.slug}</code></div> },
          { key: 'category', header: 'Category', render: (p: any) => <span className="text-xs">{p.category ?? '—'}</span> },
          { key: 'views', header: 'Views', render: (p: any) => p.views.toLocaleString() },
          { key: 'signups', header: 'Signups', render: (p: any) => p.emailSignups },
          { key: 'organic', header: 'Organic', render: (p: any) => p.organicClicks },
        ]}
      />
    </div>
  );
}
