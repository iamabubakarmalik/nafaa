/**
 * Newsletter subscribers: the email list behind the website signup forms.
 * Search, status, source, period and paging run on the server; select rows
 * to unsubscribe, reactivate, tag or delete in bulk.
 */

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Mail, Send, Tag, Trash2, UserCheck, UserX, Users, Globe, MailX } from 'lucide-react';
import {
  Button, Checkbox, DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { newsletterApi, type Subscriber } from '@/api/marketing/marketing-newsletter.api';
import { formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, PromptModal, exportList, num } from '../../lib/kit';

const STATUSES = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'PENDING_CONFIRMATION', 'COMPLAINED'];

export function SubscribersListPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const list = useListParams({ status: 'ALL', source: 'ALL', ...PERIOD_DEFAULTS });
  const { status, source } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    source: source === 'ALL' ? undefined : source,
    ...periodQuery(list.filters),
  };

  const stats = useQuery({ queryKey: ['mkt', 'newsletter', 'stats'], queryFn: newsletterApi.stats, staleTime: 30_000 });
  const subs = useQuery({
    queryKey: ['mkt', 'newsletter', query, list.page, list.limit],
    queryFn: () => newsletterApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const s = stats.data;
  const rows: Subscriber[] = subs.data?.items ?? [];
  // A selection only makes sense for the rows being shown.
  useEffect(() => { setSelected([]); }, [list.page, list.limit, status, source, list.debouncedSearch]);

  const bulkMut = useMutation({
    mutationFn: newsletterApi.bulk,
    onSuccess: (r) => {
      toast.success(`${r.count ?? selected.length} subscribers updated`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['mkt', 'newsletter'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'The action failed'),
  });

  const sources = (s?.bySource ?? []).map((x) => x.source).filter(Boolean);
  const chip = periodChip(list.filters);
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    source !== 'ALL' && <FilterChip key="o" onRemove={() => list.setFilter('source', 'ALL')}>{statusLabel(source)}</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);
  const allOn = rows.length > 0 && selected.length === rows.length;

  return (
    <PageShell>
      <PageHero
        title="Newsletter subscribers"
        chip={s ? `${num(s.total)} total` : undefined}
        busy={subs.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<Subscriber>('subscribers', (page) => newsletterApi.list({ ...query, page, limit: 100 }), [
              { label: 'Email', value: (r) => r.email },
              { label: 'First name', value: (r) => r.firstName },
              { label: 'Last name', value: (r) => r.lastName },
              { label: 'Status', value: (r) => r.status },
              { label: 'Source', value: (r) => r.source },
              { label: 'Tags', value: (r) => (r.tags ?? []).join(' ') },
              { label: 'Engagement', value: (r) => r.engagementScore },
              { label: 'Joined', value: (r) => r.createdAt.slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <Link to="/marketing/newsletter/send" className={heroPrimaryButton}><Send className="h-4 w-4" /> Send newsletter</Link>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Active', value: num(s.active), hint: `${s.growthRate} growth` },
          { label: 'New this week', value: num(s.new7d), hint: `${num(s.new30d)} in 30 days` },
          { label: 'Unsubscribed', value: num(s.unsubscribed), hint: s.unsubscribeRate },
          { label: 'Bounced', value: num(s.bounced), hint: s.bounceRate },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search email or name" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        {sources.length > 0 && (
          <FilterMenu icon={Globe} label="Source" value={source} active={source !== 'ALL'} onChange={(v) => list.setFilter('source', v)}
            options={[{ value: 'ALL', label: 'All sources' }, ...sources.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        )}
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Joined" />
      </FilterBar>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-[0.8125rem] ring-1 ring-brand-200">
          <span className="font-semibold text-brand-800">{selected.length} selected</span>
          <Button size="xs" variant="secondary" leftIcon={<UserX className="h-3.5 w-3.5" />} onClick={() => bulkMut.mutate({ subscriberIds: selected, action: 'UNSUBSCRIBE' })}>Unsubscribe</Button>
          <Button size="xs" variant="secondary" leftIcon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => bulkMut.mutate({ subscriberIds: selected, action: 'REACTIVATE' })}>Reactivate</Button>
          <Button size="xs" variant="secondary" leftIcon={<Tag className="h-3.5 w-3.5" />} onClick={() => setTagOpen(true)}>Add tag</Button>
          <Button size="xs" variant="critical" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={async () => {
            if (await confirmDialog({ title: `Delete ${selected.length} subscribers?`, text: 'They are removed permanently.', yes: 'Delete', danger: true })) bulkMut.mutate({ subscriberIds: selected, action: 'DELETE' });
          }}>Delete</Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>
        </div>
      )}

      <ListCard
        loading={subs.isLoading}
        empty={!rows.length}
        emptyIcon={<Mail className="h-6 w-6" />}
        emptyTitle="No subscribers match"
        emptyText="Subscribers appear here when visitors sign up on the website."
        page={list.page} limit={list.limit} total={subs.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead>
            <Tr>
              <Th className="w-10"><Checkbox aria-label="Select all" checked={allOn} onChange={() => setSelected(allOn ? [] : rows.map((r) => r.id))} /></Th>
              <Th>Subscriber</Th><Th>Status</Th><Th>Source</Th><Th align="right">Engagement</Th><Th align="right">Joined</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td><Checkbox aria-label={`Select ${r.email}`} checked={selected.includes(r.id)} onChange={() => setSelected((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} /></Td>
                <Td>
                  <div className="font-semibold text-slate-900">{r.email}</div>
                  {(r.firstName || r.lastName) && <div className="text-[0.75rem] text-slate-500">{[r.firstName, r.lastName].filter(Boolean).join(' ')}</div>}
                </Td>
                <Td><StatusBadge value={r.status} /></Td>
                <Td className="text-slate-600">{r.source ? statusLabel(r.source) : '—'}</Td>
                <Td align="right">
                  <div className="font-medium tabular-nums text-slate-900">{r.engagementScore.toFixed(0)}</div>
                  <div className="text-[0.75rem] text-slate-500">{r.totalOpened} opens · {r.totalClicked} clicks</div>
                </Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatRelative(r.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <PromptModal open={tagOpen} title="Add a tag" label="Tag name" placeholder="pos-users" confirmLabel="Add tag" onSubmit={(tag) => bulkMut.mutate({ subscriberIds: selected, action: 'TAG', tag })} onClose={() => setTagOpen(false)} />

      {guide.isOpen && (
        <PageGuide
          title="Newsletter subscribers"
          description="Everyone who gave their email on the website. Keep the list clean and send them news."
          flowTitle="From signup to inbox"
          flow={[
            { label: 'Visitor signs up', hint: 'Website form', icon: Globe, color: '#4f46e5' },
            { label: 'Active subscriber', hint: 'On the list', icon: Users, color: '#059669' },
            { label: 'You send news', hint: 'Newsletter', icon: Send, color: '#0284c7' },
            { label: 'Opens or leaves', hint: 'Engagement', icon: MailX, color: '#d97706' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Tag people', text: 'Select rows and add a tag. Tags let a campaign or newsletter reach part of the list.' },
            { icon: UserX, color: '#d97706', title: 'Unsubscribe or reactivate', text: 'Use the bar that appears when rows are selected.' },
            { icon: Trash2, color: '#e11d48', title: 'Delete', text: 'Deleting removes people permanently, so you are asked to confirm.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every subscriber that matches the filters.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
