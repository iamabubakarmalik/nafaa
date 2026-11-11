/**
 * Chatbot conversations: visitors talking to the website bot, and the ones
 * waiting for a person. Search, status, period and paging run on the server.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle, Clock, Download, MessageCircle, Tag, UserCheck } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { chatbotApi } from '@/api/marketing/marketing-chatbot.api';
import { formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, exportList, num } from '../../lib/kit';

const STATUSES = ['WAITING_HUMAN', 'HUMAN_HANDLING', 'BOT_HANDLING', 'ACTIVE', 'RESOLVED', 'ABANDONED', 'ARCHIVED'];

export function ChatbotConversationsPage() {
  const nav = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', ...PERIOD_DEFAULTS });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, ...periodQuery(list.filters) };

  const stats = useQuery({ queryKey: ['mkt', 'chatbot', 'stats'], queryFn: chatbotApi.stats, refetchInterval: 15_000 });
  const chats = useQuery({
    queryKey: ['mkt', 'chatbot', query, list.page, list.limit],
    queryFn: () => chatbotApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  });
  const s = stats.data;
  const rows: any[] = chats.data?.items ?? [];
  const chip = periodChip(list.filters);
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Chatbot conversations"
        chip={chats.data ? `${num(chats.data.meta.total)} shown` : undefined}
        busy={chats.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<any>('chatbot-conversations', (page) => chatbotApi.list({ ...query, page, limit: 100 }), [
              { label: 'Conversation', value: (c) => c.conversationNumber },
              { label: 'Visitor', value: (c) => c.visitorName },
              { label: 'Email', value: (c) => c.visitorEmail },
              { label: 'Phone', value: (c) => c.visitorPhone },
              { label: 'Status', value: (c) => c.status },
              { label: 'Messages', value: (c) => c.messageCount },
              { label: 'Started', value: (c) => String(c.startedAt ?? c.createdAt ?? '').slice(0, 10) },
              { label: 'Last activity', value: (c) => String(c.lastActivityAt ?? '').slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Waiting for a person', value: num(s.waiting), hint: s.waiting ? 'Visitors are waiting' : 'Nobody waiting' },
          { label: 'Bot handling', value: num(s.bot) },
          { label: 'Active', value: num(s.active) },
          { label: 'Resolved', value: num(s.resolved), hint: s.resolvedRate },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search visitor name, email, phone or chat number" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Started" />
      </FilterBar>

      <ListCard
        loading={chats.isLoading}
        empty={!rows.length}
        emptyIcon={<Bot className="h-6 w-6" />}
        emptyTitle="No conversations match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={chats.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead>
            <Tr><Th>Chat</Th><Th>Visitor</Th><Th>Last message</Th><Th>Status</Th><Th align="right">Last activity</Th></Tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id} interactive onClick={() => nav(`/marketing/chatbot/${c.id}`)}>
                <Td className="font-mono text-[0.75rem] text-slate-600">{c.conversationNumber}</Td>
                <Td>
                  <div className="font-semibold text-slate-900">{c.visitorName ?? 'Anonymous'}</div>
                  <div className="text-[0.75rem] text-slate-500">{c.visitorEmail ?? c.visitorId?.slice(0, 12)}</div>
                </Td>
                <Td>
                  <div className="text-[0.75rem] text-slate-500">{num(c.messageCount)} messages</div>
                  {c.messages?.[0] && <div className="max-w-xs truncate text-slate-700">{c.messages[0].content}</div>}
                </Td>
                <Td><StatusBadge value={c.status} /></Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatRelative(c.lastActivityAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Chatbot conversations"
          description="The website bot answers visitors. When it cannot help, a person takes over here."
          flowTitle="A chat from visitor to answer"
          flow={[
            { label: 'Visitor asks', hint: 'Website chat', icon: MessageCircle, color: '#4f46e5' },
            { label: 'Bot answers', hint: 'Handles most', icon: Bot, color: '#0284c7' },
            { label: 'Waiting for a person', hint: 'Needs you', icon: Clock, color: '#d97706' },
            { label: 'Resolved', hint: 'Closed', icon: CheckCircle, color: '#059669' },
          ]}
          steps={[
            { icon: Clock, color: '#d97706', title: 'Answer waiting chats', text: 'Filter by Waiting human to see visitors who asked for a person.' },
            { icon: UserCheck, color: '#4f46e5', title: 'Take over', text: 'Open a chat and take it over to talk to the visitor yourself.' },
            { icon: CheckCircle, color: '#059669', title: 'Resolve', text: 'Mark the chat resolved when the visitor has what they need.' },
          ]}
          tips={['The list refreshes every 15 seconds.', 'Press / to jump to the search box.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
