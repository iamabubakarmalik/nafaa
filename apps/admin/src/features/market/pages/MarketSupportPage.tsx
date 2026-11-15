/**
 * Market customer support tickets: status, priority, the last message and
 * the customer. Search, filters and pages run on the server; a row opens
 * the ticket conversation.
 */

import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, LifeBuoy, MessageSquareText, MousePointerClick, Search, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, TICKET_STATUSES } from '@/api/admin-market.api';
import { ListCard, StatusBadge, useListParams } from '@/ui';
import { formatRelative, num } from '@/lib/format';
import { GuideButton, MarketGuide, TicketStatusBadge, ticketStatusLabel } from '../components/MarketUi';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function MarketSupportPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const list = useListParams({ status: 'ACTIVE', priority: 'ALL' });
  const { status, priority } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, priority: priority === 'ALL' ? undefined : priority };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-support', query, list.page, list.limit],
    queryFn: () => adminMarketApi.tickets({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const rows = data?.items ?? [];
  const sm = data?.summary;
  const statusName = (v: string) => (v === 'ACTIVE' ? 'Needs work' : v === 'ALL' ? 'Any status' : ticketStatusLabel(v));

  const chips = [
    status !== 'ACTIVE' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ACTIVE')}>{statusName(status)}</FilterChip>,
    priority !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('priority', 'ALL')}>{priority.toLowerCase()} priority</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Support"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={sm ? [
          { label: 'Open', value: num(sm.open), hint: 'Not answered yet' },
          { label: 'In progress', value: num(sm.inProgress) },
          { label: 'Waiting for customer', value: num(sm.waiting) },
          { label: 'Resolved or closed', value: num(sm.resolved) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search ticket number, subject, customer or phone" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ACTIVE'} onChange={(v) => list.setFilter('status', v)}
          options={['ACTIVE', 'ALL', ...TICKET_STATUSES].map((v) => ({ value: v, label: statusName(v) }))} />
        <FilterMenu icon={Flag} label="Priority" value={priority} active={priority !== 'ALL'} onChange={(v) => list.setFilter('priority', v)} align="right"
          options={[{ value: 'ALL', label: 'Any priority' }, ...PRIORITIES.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))]} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<LifeBuoy className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load tickets' : status === 'ACTIVE' ? 'All caught up' : 'No tickets match'}
        emptyText={error ? 'Try again in a moment.' : status === 'ACTIVE' ? 'No ticket needs an answer right now.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="60rem">
          <THead>
            <Tr><Th>Ticket</Th><Th>Customer</Th><Th>Last message</Th><Th>Priority</Th><Th>Status</Th><Th align="right">Messages</Th><Th>Updated</Th></Tr>
          </THead>
          <TBody>
            {rows.map((t) => (
              <Tr key={t.id} interactive onClick={() => navigate(`/market/support/${t.id}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">{t.subject}</div>
                  <div className="text-[0.75rem] text-slate-500">#{t.ticketNumber} · {t.category}</div>
                </Td>
                <Td>
                  <div className="text-slate-800">{t.customer.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{t.customer.phone}</div>
                </Td>
                <Td className="max-w-[20rem]">
                  {t.last ? <><div className="line-clamp-2 text-[0.8125rem] text-slate-600">{t.last.text}</div><div className="text-[0.75rem] text-slate-400">{t.last.from === 'CUSTOMER' ? 'Customer' : t.last.from === 'STAFF' ? 'Nafaa' : 'System'}</div></> : '—'}
                </Td>
                <Td><StatusBadge value={t.priority} variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'danger' : 'default'} /></Td>
                <Td><TicketStatusBadge status={t.status} /></Td>
                <Td align="right">{num(t.messages)}</Td>
                <Td className="whitespace-nowrap">{formatRelative(t.updatedAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <MarketGuide
          title="Support"
          description="Help Market customers with their orders and accounts."
          flowTitle="Answer a ticket"
          flow={[
            { label: 'Open ticket', hint: 'Needs work', icon: MousePointerClick, color: '#4f46e5' },
            { label: 'Reply', hint: 'Customer is notified', icon: MessageSquareText, color: '#0284c7' },
            { label: 'Resolve', hint: 'When done', icon: CheckCircle2, color: '#16a34a' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Start with open tickets', text: 'The default view shows tickets that still need work, newest activity first.' },
            { icon: MessageSquareText, color: '#0284c7', title: 'Reply', text: 'The customer gets a notification. Internal notes stay with staff.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Resolve', text: 'Mark resolved once the problem is fixed.' },
          ]}
          tips={['The list refreshes every minute.', 'Shop owners use the separate live support chat, not these tickets.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
