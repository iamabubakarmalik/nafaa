/**
 * A/B tests: experiments that compare two or more versions of a page.
 * Search, status and paging run on the server.
 */

import { useQuery } from '@tanstack/react-query';
import { Beaker, Flag, Play, Trophy, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { abTestsApi } from '@/api/marketing/marketing-ab-tests.api';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { GuideButton, num } from '../../lib/kit';

const STATUSES = ['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

export function AbTestsListPage() {
  const guide = usePageGuide();
  const list = useListParams({ status: 'ALL' });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status };
  const tests = useQuery({
    queryKey: ['mkt', 'ab-tests', query, list.page, list.limit],
    queryFn: () => abTestsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (p) => p,
  });
  const rows: any[] = tests.data?.items ?? [];
  const running = rows.filter((t) => t.status === 'RUNNING').length;
  const visitors = rows.reduce((n, t) => n + (t.totalVisitors ?? 0), 0);
  const conversions = rows.reduce((n, t) => n + (t.totalConversions ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        title="A/B tests"
        chip={tests.data ? `${num(tests.data.meta.total)} tests` : undefined}
        busy={tests.isFetching}
        loading={tests.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={tests.data ? [
          { label: 'Tests', value: num(tests.data.meta.total) },
          { label: 'Running (this page)', value: num(running) },
          { label: 'Visitors (this page)', value: num(visitors) },
          { label: 'Conversions (this page)', value: num(conversions) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search test name" />}
        chips={status !== 'ALL' ? <FilterChip onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip> : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
      </FilterBar>

      <ListCard
        loading={tests.isLoading}
        empty={!rows.length}
        emptyIcon={<Beaker className="h-6 w-6" />}
        emptyTitle="No A/B tests yet"
        emptyText="Tests compare versions of a page to see which one converts better."
        page={list.page} limit={list.limit} total={tests.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="42rem">
          <THead><Tr><Th>Test</Th><Th>Goal</Th><Th>Status</Th><Th align="right">Visitors</Th><Th align="right">Conversions</Th></Tr></THead>
          <TBody>
            {rows.map((t) => (
              <Tr key={t.id}>
                <Td className="font-semibold text-slate-900">{t.name}</Td>
                <Td className="text-slate-600">{t.goalMetric ? statusLabel(t.goalMetric) : '—'}</Td>
                <Td><StatusBadge value={t.status} /></Td>
                <Td align="right" className="tabular-nums">{num(t.totalVisitors)}</Td>
                <Td align="right" className="tabular-nums">{num(t.totalConversions)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="A/B tests"
          description="Show two versions of something to different visitors and keep the one that works better."
          flowTitle="An experiment"
          flow={[
            { label: 'Idea', hint: 'What to change', icon: Beaker, color: '#4f46e5' },
            { label: 'Run', hint: 'Visitors split', icon: Play, color: '#0284c7' },
            { label: 'Measure', hint: 'Goal conversions', icon: Flag, color: '#d97706' },
            { label: 'Pick a winner', hint: 'Keep the best', icon: Trophy, color: '#059669' },
          ]}
          steps={[
            { icon: Flag, color: '#d97706', title: 'Goal', text: 'Each test has one goal, such as demo bookings or signups.' },
            { icon: Play, color: '#0284c7', title: 'Status', text: 'Only running tests collect visitors and conversions.' },
            { icon: Trophy, color: '#059669', title: 'Read the result', text: 'Compare conversions against visitors before choosing a winner.' },
          ]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
