/**
 * SEO manager: the site's SEO score, which pages have missing or weak meta
 * tags, search clicks and position per page, and top keywords. Search,
 * status and paging run on the server.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSearch, Search, Tag, TrendingUp, Wrench } from 'lucide-react';
import {
  Card, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { seoApi } from '@/api/marketing/marketing-seo.api';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { GuideButton, exportList, num } from '../../lib/kit';

const STATUSES = ['INDEXED', 'NOT_INDEXED', 'BLOCKED', 'ERROR', 'PENDING'];
const Missing = () => <span className="text-rose-600">Missing</span>;

export function SeoPagesPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL' });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status };

  const score = useQuery({ queryKey: ['mkt', 'seo', 'score'], queryFn: seoApi.score, staleTime: 60_000 });
  const pages = useQuery({
    queryKey: ['mkt', 'seo', 'pages', query, list.page, list.limit],
    queryFn: () => seoApi.pages({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (p) => p,
  });
  const keywords = useQuery({ queryKey: ['mkt', 'seo', 'keywords'], queryFn: seoApi.keywords, staleTime: 60_000 });
  const s = score.data;
  const rows: any[] = pages.data?.items ?? [];

  return (
    <PageShell>
      <PageHero
        title="SEO"
        chip={pages.data ? `${num(pages.data.meta.total)} pages` : undefined}
        busy={pages.isFetching}
        loading={score.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<any>('seo-pages', (page) => seoApi.pages({ ...query, page, limit: 100 }), [
              { label: 'Path', value: (p) => p.path },
              { label: 'Title', value: (p) => p.title },
              { label: 'Meta description', value: (p) => p.metaDescription },
              { label: 'Clicks', value: (p) => p.totalClicks },
              { label: 'Average position', value: (p) => p.avgPosition?.toFixed(1) },
              { label: 'Status', value: (p) => p.status },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'SEO score', value: `${s.score}/100`, hint: s.score >= 70 ? 'Good' : 'Needs work' },
          { label: 'Pages', value: num(s.totalPages) },
          { label: 'Missing meta', value: num(s.missing), hint: s.missing ? 'Fix these first' : 'None' },
          { label: 'Weak meta', value: num(s.weak) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search path or title" />}
        chips={status !== 'ALL' ? <FilterChip onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip> : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
      </FilterBar>

      <ListCard
        loading={pages.isLoading}
        empty={!rows.length}
        emptyIcon={<FileSearch className="h-6 w-6" />}
        emptyTitle="No pages match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={pages.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead>
            <Tr><Th>Path</Th><Th>Title</Th><Th>Meta description</Th><Th align="right">Clicks</Th><Th align="right">Avg position</Th><Th>Status</Th></Tr>
          </THead>
          <TBody>
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td><code className="text-[0.75rem]">{p.path}</code></Td>
                <Td className="max-w-xs truncate">{p.title ?? <Missing />}</Td>
                <Td className="max-w-sm truncate text-[0.75rem] text-slate-500">{p.metaDescription ? p.metaDescription.slice(0, 90) : <Missing />}</Td>
                <Td align="right" className="tabular-nums">{num(p.totalClicks)}</Td>
                <Td align="right" className="tabular-nums">{p.avgPosition?.toFixed(1) ?? '—'}</Td>
                <Td><StatusBadge value={p.status} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {keywords.data && keywords.data.length > 0 && (
        <Card title="Top keywords" description="Search terms that bring people to the site.">
          <ul className="divide-y divide-slate-100">
            {keywords.data.slice(0, 20).map((k: any) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                <span className="min-w-0 truncate font-medium text-slate-800">{k.keyword}</span>
                <span className="flex shrink-0 gap-4 tabular-nums text-slate-500"><span>Position {k.currentPosition ?? '—'}</span><span>{num(k.clicks)} clicks</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {guide.isOpen && (
        <PageGuide
          title="SEO"
          description="How well the website shows up in Google, page by page."
          flowTitle="Improving a page"
          flow={[
            { label: 'Find a weak page', hint: 'Missing or short meta', icon: Search, color: '#e11d48' },
            { label: 'Fix its meta', hint: 'Website CMS', icon: Wrench, color: '#4f46e5' },
            { label: 'Google reads it', hint: 'Indexed', icon: FileSearch, color: '#0284c7' },
            { label: 'More clicks', hint: 'Better position', icon: TrendingUp, color: '#059669' },
          ]}
          steps={[
            { icon: Search, color: '#e11d48', title: 'Look for Missing', text: 'Pages without a title or description are the quickest wins.' },
            { icon: Wrench, color: '#4f46e5', title: 'Edit in the Website CMS', text: 'Open the page entry and fill its SEO panel.' },
            { icon: Tag, color: '#0284c7', title: 'Filter by status', text: 'Show pages that are not indexed, blocked or have errors.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
