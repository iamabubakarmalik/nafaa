/**
 * Heatmaps: sessions recorded per page and how far visitors scroll. Search
 * and paging run on the server.
 */

import { useQuery } from '@tanstack/react-query';
import { MousePointer2, ArrowDownToLine, Eye, Search } from 'lucide-react';
import { FilterBar, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { heatmapsApi } from '@/api/marketing/marketing-heatmaps.api';
import { ListCard, useListParams } from '@/ui';
import { GuideButton, num } from '../../lib/kit';

export function HeatmapsPage() {
  const guide = usePageGuide();
  const list = useListParams({});
  const pages = useQuery({
    queryKey: ['mkt', 'heatmaps', list.debouncedSearch, list.page, list.limit],
    queryFn: () => heatmapsApi.pages({ search: list.debouncedSearch || undefined, page: list.page, limit: list.limit }),
    placeholderData: (p) => p,
  });
  const rows: any[] = pages.data?.items ?? [];
  const avg = rows.length ? Math.round(rows.reduce((n, p) => n + p.avgScrollDepth, 0) / rows.length) : 0;

  return (
    <PageShell>
      <PageHero
        title="Heatmaps"
        chip={pages.data ? `${num(pages.data.meta.total)} pages` : undefined}
        busy={pages.isFetching}
        loading={pages.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={pages.data ? [
          { label: 'Pages tracked', value: num(pages.data.meta.total) },
          { label: 'Sessions (this page)', value: num(rows.reduce((n, p) => n + p.sessions, 0)) },
          { label: 'Average scroll depth', value: `${avg}%`, hint: 'This page of the list' },
        ] : undefined}
      />

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search page path" />} onClear={list.clear} />

      <ListCard
        loading={pages.isLoading}
        empty={!rows.length}
        emptyIcon={<MousePointer2 className="h-6 w-6" />}
        emptyTitle="No heatmap data yet"
        emptyText="Data appears once visitors browse pages with tracking switched on."
        page={list.page} limit={list.limit} total={pages.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="36rem">
          <THead><Tr><Th>Page</Th><Th align="right">Sessions</Th><Th>Average scroll depth</Th></Tr></THead>
          <TBody>
            {rows.map((p) => (
              <Tr key={p.path}>
                <Td><code className="text-[0.75rem]">{p.path}</code></Td>
                <Td align="right" className="tabular-nums">{num(p.sessions)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${p.avgScrollDepth}%` }} /></div>
                    <span className="text-[0.75rem] tabular-nums">{p.avgScrollDepth}%</span>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Heatmaps"
          description="See how visitors behave on each page."
          flowTitle="From visit to insight"
          flow={[
            { label: 'Visitor browses', hint: 'Tracked page', icon: Eye, color: '#0284c7' },
            { label: 'Clicks and scroll', hint: 'Recorded', icon: MousePointer2, color: '#4f46e5' },
            { label: 'You read the page', hint: 'Scroll depth', icon: ArrowDownToLine, color: '#059669' },
          ]}
          steps={[
            { icon: ArrowDownToLine, color: '#059669', title: 'Scroll depth', text: 'A low average means most people leave before the bottom of the page.' },
            { icon: Search, color: '#4f46e5', title: 'Search a page', text: 'Type part of a path to find one page quickly.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
