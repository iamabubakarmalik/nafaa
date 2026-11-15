/**
 * Support inbox: chats with shops in one place. Left, the conversation list
 * with filters and waiting timers; middle, the open chat; right, the shop's
 * details and ways to reach them. Updates live over the support socket.
 *
 * Links from other pages:
 *   ?c=<conversationId>   open that chat
 *   ?tenant=<id>          open the shop's latest chat, or start one
 *   ?tenants=a,b,c        list only those shops' chats, with "Message all"
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Bot, Flag, Headphones, Lightbulb, MessageCircle, MessagesSquare, Settings, Tag, UserRound, Users } from 'lucide-react';
import { EmptyState, FilterMenu, PageHero, PageShell, SearchField, Segmented, Skeleton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSupportApi } from '@/api/admin-support.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { useSupportEvent } from '../lib/socket';
import { SUPPORT_EVENTS } from '../lib/support.types';
import { SUPPORT_KEYS } from '../components/SupportLive';
import { ConversationList } from '../components/ConversationList';
import { ChatPane } from '../components/ChatPane';
import { ContextPanel } from '../components/ContextPanel';
import { PresenceToggle } from '../components/PresenceToggle';
import { BulkMessageBar } from '../components/BulkMessageBar';
import { toast } from 'sonner';
import { apiError } from '@/lib/errors';

const STATUS_OPTIONS = [
  { value: 'active', label: 'All open' },
  { value: 'needs_reply', label: 'Needs a reply' },
  { value: 'WAITING', label: 'Waiting for the team' },
  { value: 'OPEN', label: 'Needs reply (assigned)' },
  { value: 'PENDING_MERCHANT', label: 'Waiting on the shop' },
  { value: 'BOT', label: 'With Nafaa AI' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'all', label: 'Everything' },
];
const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Any priority' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

export default function SupportInboxPage() {
  const can = useCan();
  const me = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const selected = params.get('c');
  const view = (params.get('view') as 'mine' | 'unassigned' | 'all') || 'all';
  const tenantParam = params.get('tenant');
  const tenantIds = useMemo(() => [...new Set((params.get('tenants') ?? '').split(',').map((x) => x.trim()).filter(Boolean))], [params]);
  // Several shops: show every chat of theirs unless a status is picked.
  const status = params.get('status') || (tenantIds.length ? 'all' : 'active');
  const priority = params.get('priority') || 'all';
  const tag = params.get('tag') || 'all';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [showContext, setShowContext] = useState(true);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v == null || v === '' || v === 'all' && k !== 'status') next.delete(k); else next.set(k, v);
    setParams(next, { replace: k !== 'c' });
  };

  useEffect(() => {
    const t = window.setTimeout(() => { if ((params.get('q') ?? '') !== search) setParam('q', search || null); }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filters = {
    view, status: status === 'all' ? undefined : status, priority: priority === 'all' ? undefined : priority, tag: tag === 'all' ? undefined : tag, search: params.get('q') || undefined,
    tenantIds: tenantIds.length ? tenantIds.join(',') : undefined,
  };

  // ?tenant=<id>: open that shop's latest chat, or start one (needs support.reply).
  const opening = useRef<string | null>(null);
  useEffect(() => {
    if (!tenantParam || opening.current === tenantParam) return;
    opening.current = tenantParam;
    const go = (conversationId: string | null) => {
      const next = new URLSearchParams(params);
      next.delete('tenant');
      if (conversationId) next.set('c', conversationId);
      else next.set('tenants', tenantParam);
      setParams(next, { replace: true });
    };
    void (async () => {
      try {
        const latest = await adminSupportApi.list({ tenantId: tenantParam, limit: 1 });
        if (latest.items[0]) return go(latest.items[0].id);
        if (!can('support.reply')) { toast.message('This shop has no chat yet.'); return go(null); }
        const c = await adminSupportApi.start({ tenantId: tenantParam });
        void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.list });
        go(c.id);
      } catch (e) {
        toast.error(apiError(e));
        go(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantParam]);
  const list = useInfiniteQuery({
    queryKey: [...SUPPORT_KEYS.list, filters],
    queryFn: ({ pageParam }) => adminSupportApi.list({ ...filters, cursor: pageParam ?? undefined, limit: 30 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 60_000,
  });
  const counts = useQuery({ queryKey: SUPPORT_KEYS.counts, queryFn: adminSupportApi.counts, refetchInterval: 60_000 });
  const tags = useQuery({ queryKey: ['support', 'tags'], queryFn: adminSupportApi.tags, staleTime: 60_000 });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  // Live: refresh the list (throttled) when any conversation changes.
  const pending = useRef<number | null>(null);
  const refresh = () => {
    if (pending.current) return;
    pending.current = window.setTimeout(() => { pending.current = null; void qc.invalidateQueries({ queryKey: SUPPORT_KEYS.list }); }, 800);
  };
  useSupportEvent(SUPPORT_EVENTS.conversation, refresh);
  useSupportEvent(SUPPORT_EVENTS.message, refresh);

  const selectedRow = items.find((c) => c.id === selected);
  const cachedConv = selected ? qc.getQueryData<{ tenantId: string }>(SUPPORT_KEYS.conversation(selected)) : undefined;
  const tenantId = selectedRow?.tenantId ?? cachedConv?.tenantId ?? null;
  const ctx = counts.data;

  return (
    <PageShell>
      <PageHero
        title="Support"
        chip="Live chat with shops"
        busy={list.isFetching}
        actions={
          <>
            <PresenceToggle />
            <Link to="/support/reports" className={heroButton}><BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Reports</span></Link>
            {can('support.manage') && <Link to="/support/settings" className={heroButton} aria-label="Support settings"><Settings className="h-4 w-4" /></Link>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Need a reply', value: ctx ? num(ctx.needsReply) : '—', hint: ctx ? `${num(ctx.waiting)} waiting for anyone` : undefined },
          { label: 'Unassigned', value: ctx ? num(ctx.unassigned) : '—' },
          { label: 'Mine', value: ctx ? num(ctx.mine) : '—', hint: 'open chats assigned to you' },
          { label: 'Unread', value: ctx ? num(ctx.unread) : '—' },
        ]}
      />

      <div className="flex h-[calc(100dvh-14rem)] min-h-[32rem] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {/* List */}
        <div className={cn('flex w-full flex-col border-e border-slate-200 lg:w-[22rem] lg:shrink-0', selected && 'hidden lg:flex')}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            {tenantIds.length > 0 && (
              <BulkMessageBar
                tenantIds={tenantIds}
                withChat={new Set(items.map((c) => c.tenantId)).size}
                canReply={can('support.reply')}
                onClear={() => { const next = new URLSearchParams(params); next.delete('tenants'); setParams(next, { replace: true }); }}
              />
            )}
            <SearchField value={search} onChange={setSearch} placeholder="Search shop, phone or message" />
            <Segmented value={view} onChange={(v) => setParam('view', v)} label="Whose chats" items={[
              { value: 'all', label: <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> All</span> },
              { value: 'mine', label: <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> Mine</span> },
              { value: 'unassigned', label: 'Unassigned' },
            ]} />
            <div className="flex flex-wrap gap-2">
              <FilterMenu icon={MessagesSquare} label="Status" value={status} active={status !== 'active'} onChange={(v) => setParam('status', v)} options={STATUS_OPTIONS} />
              <FilterMenu icon={Flag} label="Priority" value={priority} active={priority !== 'all'} onChange={(v) => setParam('priority', v)} options={PRIORITY_OPTIONS} />
              {!!tags.data?.length && <FilterMenu icon={Tag} label="Tag" value={tag} active={tag !== 'all'} onChange={(v) => setParam('tag', v)} options={[{ value: 'all', label: 'Any tag' }, ...tags.data.map((t) => ({ value: t, label: `#${t}` }))]} />}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isLoading ? <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              : items.length ? (
                <>
                  <ConversationList items={items} selectedId={selected} onSelect={(id) => setParam('c', id)} me={me} />
                  {list.hasNextPage && <div className="p-3 text-center"><button type="button" onClick={() => void list.fetchNextPage()} className="text-[0.8125rem] font-medium text-brand-700 hover:underline">{list.isFetchingNextPage ? 'Loading…' : 'Load more'}</button></div>}
                </>
              ) : <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="No chats here" description="Change the filters, or start a chat from a shop's page (Message)." />}
          </div>
        </div>

        {/* Chat */}
        {selected ? (
          <ChatPane key={selected} id={selected} onBack={() => setParam('c', null)} showContext={showContext} onToggleContext={() => setShowContext((v) => !v)} />
        ) : (
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <EmptyState icon={<Headphones className="h-6 w-6" />} title="Pick a chat" description="New messages and calls also reach you here while this tab is open." />
          </div>
        )}

        {/* Shop details */}
        {selected && showContext && tenantId && (
          <aside className="hidden w-[20rem] shrink-0 overflow-y-auto border-s border-slate-200 xl:block">
            <ContextPanel tenantId={tenantId} />
          </aside>
        )}
      </div>

      {guide.isOpen && (
        <PageGuide
          title="How Support works"
          description="Shops chat with Nafaa AI first. When they ask for the team, or the AI cannot help, the chat comes here."
          flow={[
            { label: 'Shop writes', icon: MessageCircle, color: '#0ea5e9' },
            { label: 'Nafaa AI answers', icon: Bot, color: '#7c3aed' },
            { label: 'Team replies', icon: Headphones, color: '#16a34a' },
            { label: 'Resolved', icon: Flag, color: '#64748b' },
          ]}
          steps={[
            { icon: MessagesSquare, color: '#e11d48', title: 'Answer what waits longest', text: 'The red timer shows how long a shop has waited for a reply. "Needs a reply" lists them.' },
            { icon: UserRound, color: '#0ea5e9', title: 'Take or pass a chat', text: 'Assign a chat to yourself or a teammate. With auto-assign on, new chats go round robin to agents who are online.' },
            { icon: Settings, color: '#d97706', title: 'Notes, saved replies, AI drafts', text: 'Internal notes are yellow and never reach the shop. Type / for saved replies, or ask for three AI drafts.' },
            { icon: Headphones, color: '#16a34a', title: 'Call or see their screen', text: 'Start a voice call from the chat header; the shop can share their screen during it.' },
          ]}
          tips={['Set yourself to Away when you step out, so shops see the right status.', 'Resolve a chat when it is done; the shop can rate it.']}
          shortcuts={[['Enter', 'Send'], ['Shift+Enter', 'New line'], ['/', 'Saved replies'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
