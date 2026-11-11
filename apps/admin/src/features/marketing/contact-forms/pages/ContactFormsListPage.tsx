/**
 * Contact forms: messages and support tickets sent from the website. Search,
 * status, priority, period and paging run on the server; the page checks for
 * new messages every few seconds and tells you when one arrives.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ban, CheckCircle, Download, Flag, MessageSquare, Reply, Tag } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { contactFormsApi, type ContactForm } from '@/api/marketing/marketing-contact-forms.api';
import { formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, exportList, num } from '../../lib/kit';

const STATUSES = ['NEW', 'IN_PROGRESS', 'REPLIED', 'RESOLVED', 'SPAM', 'ARCHIVED'];
const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = { URGENT: 'danger', HIGH: 'warning', NORMAL: 'default', LOW: 'default' };

export function ContactFormsListPage() {
  const prevNew = useRef<number | null>(null);
  const nav = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', priority: 'ALL', ...PERIOD_DEFAULTS });
  const { status, priority } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    priority: priority === 'ALL' ? undefined : priority,
    ...periodQuery(list.filters),
  };

  const stats = useQuery({ queryKey: ['mkt', 'contact-forms', 'stats'], queryFn: contactFormsApi.stats, refetchInterval: 15_000 });
  useEffect(() => {
    const current = stats.data?.new ?? null;
    if (current !== null && prevNew.current !== null && current > prevNew.current) toast.success(`New contact form received (${current} waiting)`);
    if (current !== null) prevNew.current = current;
  }, [stats.data]);

  const forms = useQuery({
    queryKey: ['mkt', 'contact-forms', query, list.page, list.limit],
    queryFn: () => contactFormsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  });
  const s = stats.data;
  const rows: ContactForm[] = forms.data?.items ?? [];
  const chip = periodChip(list.filters);
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    priority !== 'ALL' && <FilterChip key="r" onRemove={() => list.setFilter('priority', 'ALL')}>{statusLabel(priority)} priority</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Contact forms"
        chip={s ? `${num(s.total)} total` : undefined}
        busy={forms.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<ContactForm>('contact-forms', (page) => contactFormsApi.list({ ...query, page, limit: 100 }), [
              { label: 'Ticket', value: (f) => f.ticketNumber },
              { label: 'Name', value: (f) => f.fullName },
              { label: 'Email', value: (f) => f.email },
              { label: 'Phone', value: (f) => f.phone },
              { label: 'Company', value: (f) => f.companyName },
              { label: 'Subject', value: (f) => f.subject },
              { label: 'Message', value: (f) => f.message },
              { label: 'Status', value: (f) => f.status },
              { label: 'Priority', value: (f) => f.priority },
              { label: 'Received', value: (f) => f.createdAt.slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'New', value: num(s.new), hint: `${num(s.total)} in total` },
          { label: 'Urgent and open', value: num(s.urgentOpen), hint: s.urgentOpen ? 'Answer these first' : 'All caught up' },
          { label: 'Average response', value: `${s.avgResponseMinutes} min` },
          { label: 'Resolved', value: num(s.resolved), hint: s.resolvedRate },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, email, phone or message" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <FilterMenu icon={Flag} label="Priority" value={priority} active={priority !== 'ALL'} onChange={(v) => list.setFilter('priority', v)}
          options={[{ value: 'ALL', label: 'All priorities' }, ...PRIORITIES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Received" />
      </FilterBar>

      <ListCard
        loading={forms.isLoading}
        empty={!rows.length}
        emptyIcon={<MessageSquare className="h-6 w-6" />}
        emptyTitle="No contact forms match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={forms.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="56rem">
          <THead>
            <Tr><Th>Ticket</Th><Th>From</Th><Th>Subject</Th><Th>Priority</Th><Th>Status</Th><Th align="right">Received</Th></Tr>
          </THead>
          <TBody>
            {rows.map((f) => (
              <Tr key={f.id} interactive onClick={() => nav(`/marketing/contact-forms/${f.id}`)}>
                <Td className="font-mono text-[0.75rem] text-slate-600">{f.ticketNumber}</Td>
                <Td>
                  <div className="font-semibold text-slate-900">{f.fullName}</div>
                  <div className="text-[0.75rem] text-slate-500">{f.email}</div>
                </Td>
                <Td>
                  <div className="max-w-md truncate font-medium text-slate-900">{f.subject}</div>
                  <div className="max-w-md truncate text-[0.75rem] text-slate-500">{f.message}</div>
                </Td>
                <Td><StatusBadge value={f.priority} variant={PRIORITY_VARIANT[f.priority]} /></Td>
                <Td><StatusBadge value={f.status} /></Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatRelative(f.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Contact forms"
          description="Messages visitors send from the website contact page."
          flowTitle="A message from arrival to answer"
          flow={[
            { label: 'Visitor writes', hint: 'Contact page', icon: MessageSquare, color: '#4f46e5' },
            { label: 'New ticket', hint: 'Appears here', icon: AlertTriangle, color: '#d97706' },
            { label: 'You reply', hint: 'Email, optional SMS', icon: Reply, color: '#0284c7' },
            { label: 'Resolved', hint: 'Closed', icon: CheckCircle, color: '#059669' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#e11d48', title: 'Urgent first', text: 'Filter by Urgent priority to see what cannot wait.' },
            { icon: Reply, color: '#0284c7', title: 'Open and reply', text: 'Click a row to read the message and send a reply.' },
            { icon: Ban, color: '#64748b', title: 'Mark spam', text: 'Spam is hidden from the working list but kept under the Spam status.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every ticket that matches the filters.' },
          ]}
          tips={['The page checks for new messages every 15 seconds.', 'Press / to jump to the search box.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
