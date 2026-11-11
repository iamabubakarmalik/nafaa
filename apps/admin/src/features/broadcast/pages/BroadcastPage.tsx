/**
 * In-app broadcast: send a notice to every shop, or only active, trial or
 * suspended ones, and see what was sent before. History is searched and paged
 * on the server.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, History, Lightbulb, Megaphone, Send, Tag, Users } from 'lucide-react';
import { Button, Card, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, Textarea, ViewTabs, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminBroadcastApi, type Broadcast, type BroadcastTarget } from '@/api/admin-broadcast.api';
import { ListCard, useListParams } from '@/ui';
import { errMsg, num, Pill } from '@/features/shared/kit';
import { Badge } from '@/design-system/components';

const dateTime = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const TARGETS: Record<BroadcastTarget, { label: string; hint: string }> = {
  ALL: { label: 'All shops', hint: 'Every shop on Nafaa' },
  ACTIVE: { label: 'Active shops', hint: 'Paying shops' },
  TRIAL: { label: 'Trial shops', hint: 'Shops on a free trial' },
  SUSPENDED: { label: 'Suspended shops', hint: 'Shops that cannot sign in' },
  SPECIFIC: { label: 'Chosen shops', hint: 'Picked one by one' },
};
type Tab = 'send' | 'history';

export default function BroadcastPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('send');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [targetType, setTargetType] = useState<BroadcastTarget>('ALL');
  const list = useListParams({ target: 'ALL' });
  const target = list.filters.target;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-broadcasts', list.debouncedSearch, target, list.page, list.limit],
    queryFn: () => adminBroadcastApi.paged({ search: list.debouncedSearch || undefined, targetType: target === 'ALL' ? undefined : target, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const send = useMutation({
    mutationFn: adminBroadcastApi.send,
    onSuccess: (b) => {
      toast.success(`Sent to ${num(b.recipientCount)} shops`);
      setTitle(''); setMessage(''); setLink('');
      qc.invalidateQueries({ queryKey: ['admin-broadcasts'] });
      setTab('history');
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows: Broadcast[] = data?.items ?? [];
  const st = data?.stats;
  const valid = !!title.trim() && !!message.trim();

  const submit = async () => {
    if (!(await confirmDialog({ title: 'Send this broadcast?', text: `It goes to ${TARGETS[targetType].label.toLowerCase()} and cannot be recalled.`, yes: 'Send broadcast' }))) return;
    send.mutate({ title: title.trim(), message: message.trim(), link: link.trim() || undefined, targetType });
  };

  return (
    <PageShell>
      <PageHero
        title="Broadcast"
        chip={st ? `${num(st.total)} sent so far` : undefined}
        busy={isFetching || send.isPending}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={st ? [
          { label: 'Broadcasts sent', value: num(st.total) },
          { label: 'Last 30 days', value: num(st.last30d) },
          { label: 'Shops reached', value: num(st.recipients), hint: 'All broadcasts together' },
        ] : undefined}
      />

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'send', label: 'New broadcast', icon: Send }, { id: 'history', label: 'History', icon: History, count: st?.total ?? null }]} />

      {tab === 'send' && (
        <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <Card title="Write the notice" description="Shops see it in their notification bell.">
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-600">Who gets it</span>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {(['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'] as BroadcastTarget[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTargetType(t)} aria-pressed={targetType === t}
                      className={`rounded-xl border-2 p-3 text-start transition ${targetType === t ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-[0.875rem] font-semibold text-slate-900">{TARGETS[t].label}</div>
                      <div className="text-[0.6875rem] text-slate-500">{TARGETS[t].hint}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Important update" maxLength={120} />
              <Textarea label="Message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What should shops know?" />
              <Input label="Link (optional)" hint="A page in the app, for example /billing" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/billing" />
              <Button leftIcon={<Send className="h-4 w-4" />} loading={send.isPending} disabled={!valid} onClick={submit}>Send broadcast</Button>
            </div>
          </Card>
          <Card title="Preview" description="How it looks in the bell">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><Bell className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="text-[0.875rem] font-semibold text-slate-900">{title || 'Title'}</div>
                  <div className="whitespace-pre-line text-[0.8125rem] text-slate-600">{message || 'Message'}</div>
                  {link && <div className="mt-1 text-[0.75rem] font-semibold text-brand-700">Opens {link}</div>}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[0.75rem] text-slate-500">Goes to: {TARGETS[targetType].label.toLowerCase()}</p>
          </Card>
        </section>
      )}

      {tab === 'history' && (
        <>
          <FilterBar
            search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search title or message" />}
            chips={target !== 'ALL' ? [<FilterChip key="t" onRemove={() => list.setFilter('target', 'ALL')}>{TARGETS[target as BroadcastTarget]?.label ?? target}</FilterChip>] : undefined}
            onClear={list.clear}
          >
            <FilterMenu icon={Tag} label="Audience" value={target} active={target !== 'ALL'} onChange={(v) => list.setFilter('target', v)} align="right"
              options={[{ value: 'ALL', label: 'All audiences' }, ...(Object.keys(TARGETS) as BroadcastTarget[]).map((k) => ({ value: k, label: TARGETS[k].label }))]} />
          </FilterBar>
          <ListCard
            loading={isLoading}
            empty={!!error || !rows.length}
            emptyIcon={<Megaphone className="h-6 w-6" />}
            emptyTitle={error ? 'Could not load broadcasts' : 'No broadcasts yet'}
            emptyText={error ? 'Try again in a moment.' : 'Broadcasts you send appear here.'}
            page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
          >
            <ul className="divide-y divide-slate-100">
              {rows.map((b) => (
                <li key={b.id} className="px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{b.title}</span>
                    <Badge variant="brand">{TARGETS[b.targetType]?.label ?? b.targetType}</Badge>
                    {b.link && <Pill>{b.link}</Pill>}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[0.8125rem] text-slate-600">{b.message}</p>
                  <div className="mt-1 flex items-center gap-1 text-[0.75rem] text-slate-500"><Users className="h-3 w-3" />Sent to {num(b.recipientCount)} shops · {b.author.fullName} · {dateTime(b.sentAt)}</div>
                </li>
              ))}
            </ul>
          </ListCard>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Broadcast"
          description="Send an in-app notice to many shops at once."
          flowTitle="How a broadcast reaches shops"
          flow={[
            { label: 'Write', hint: 'Title and message', icon: Megaphone, color: '#4f46e5' },
            { label: 'Choose who', hint: 'All, active, trial…', icon: Users, color: '#0284c7' },
            { label: 'Send', hint: 'Cannot be recalled', icon: Send, color: '#d97706' },
            { label: 'Shops see it', hint: 'In their bell', icon: Bell, color: '#059669' },
          ]}
          steps={[
            { icon: Users, color: '#0284c7', title: 'Pick the audience', text: 'Everyone, or only active, trial or suspended shops.' },
            { icon: Megaphone, color: '#4f46e5', title: 'Keep it short', text: 'A clear title and one or two lines. Add a link to send them straight to a page.' },
            { icon: History, color: '#059669', title: 'Check history', text: 'History shows every broadcast, who sent it and how many shops got it.' },
          ]}
          tips={['A sent broadcast cannot be recalled.', 'For phone alerts, use Push in Mobile apps instead.']}
          shortcuts={[['/', 'Search history'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
