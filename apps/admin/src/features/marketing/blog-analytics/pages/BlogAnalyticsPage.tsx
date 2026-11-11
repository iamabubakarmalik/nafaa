/**
 * Blog analytics: how the blog performs and which posts bring the most
 * views, email signups and organic clicks.
 */

import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText, TrendingUp, Users } from 'lucide-react';
import { FilterBar, FilterMenu, PageHero, PageShell, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { blogAnalyticsApi } from '@/api/marketing/marketing-blog.api';
import { downloadCsv, ListCard, useListParams } from '@/ui';
import { GuideButton, num } from '../../lib/kit';

export function BlogAnalyticsPage() {
  const guide = usePageGuide();
  const list = useListParams({ top: '20' });
  const top = Number(list.filters.top);
  const overview = useQuery({ queryKey: ['mkt', 'blog', 'overview'], queryFn: () => blogAnalyticsApi.overview(), staleTime: 60_000 });
  const posts = useQuery({ queryKey: ['mkt', 'blog', 'top', top], queryFn: () => blogAnalyticsApi.topPosts(undefined, undefined, top), placeholderData: (p) => p });
  const o = overview.data;
  const rows: any[] = posts.data ?? [];

  return (
    <PageShell>
      <PageHero
        title="Blog analytics"
        chip={`Top ${top} posts`}
        busy={posts.isFetching}
        loading={overview.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={!rows.length} onClick={() => downloadCsv<any>('blog-top-posts', rows, [
              { label: 'Post', value: (p) => p.title }, { label: 'Slug', value: (p) => p.slug }, { label: 'Category', value: (p) => p.category },
              { label: 'Views', value: (p) => p.views }, { label: 'Signups', value: (p) => p.emailSignups }, { label: 'Organic clicks', value: (p) => p.organicClicks },
            ])}>
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={o ? [
          { label: 'Published posts', value: num(o.publishedPosts) },
          { label: 'Total views', value: num(o.totalViews) },
          { label: 'Email signups', value: num(o.emailSignups), hint: o.signupRate },
          { label: 'Organic clicks', value: num(o.organicClicks) },
        ] : undefined}
      />

      <FilterBar>
        <FilterMenu icon={FileText} label="Show" value={list.filters.top} onChange={(v) => list.setFilter('top', v)}
          options={[{ value: '10', label: 'Top 10 posts' }, { value: '20', label: 'Top 20 posts' }, { value: '50', label: 'Top 50 posts' }, { value: '100', label: 'Top 100 posts' }]} />
      </FilterBar>

      <ListCard loading={posts.isLoading} empty={!rows.length} emptyIcon={<FileText className="h-6 w-6" />} emptyTitle="No posts yet" emptyText="Posts appear here once they get views.">
        <Table minWidth="44rem">
          <THead><Tr><Th>Post</Th><Th>Category</Th><Th align="right">Views</Th><Th align="right">Signups</Th><Th align="right">Organic clicks</Th></Tr></THead>
          <TBody>
            {rows.map((p) => (
              <Tr key={p.postId}>
                <Td><div className="font-semibold text-slate-900">{p.title}</div><code className="text-[0.75rem] text-slate-500">/{p.slug}</code></Td>
                <Td className="text-slate-600">{p.category ?? '—'}</Td>
                <Td align="right" className="tabular-nums">{num(p.views)}</Td>
                <Td align="right" className="tabular-nums">{num(p.emailSignups)}</Td>
                <Td align="right" className="tabular-nums">{num(p.organicClicks)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Blog analytics"
          description="Which posts bring readers, signups and search traffic."
          flowTitle="What a post earns"
          flow={[
            { label: 'Post published', hint: 'Website CMS', icon: FileText, color: '#4f46e5' },
            { label: 'Readers arrive', hint: 'Views', icon: Eye, color: '#0284c7' },
            { label: 'Some sign up', hint: 'Email list', icon: Users, color: '#d97706' },
            { label: 'Search brings more', hint: 'Organic clicks', icon: TrendingUp, color: '#059669' },
          ]}
          steps={[
            { icon: Eye, color: '#0284c7', title: 'Sort by views', text: 'The list starts with the most viewed posts.' },
            { icon: Users, color: '#d97706', title: 'Look at signups', text: 'A post with many views but few signups may need a better call to action.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads the posts shown.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
