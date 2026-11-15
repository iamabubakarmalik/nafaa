/**
 * Market messages: customer conversations on the left, the open chat on the
 * right. Opening a chat marks it read; replies go to the customer's Market
 * app; a finished chat can be closed.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CheckCheck, Inbox, MessageCircle, Send } from 'lucide-react';
import {
  Avatar, Badge, Button, EmptyState, PageHero, PageShell, Skeleton, Textarea, ViewTabs,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatRelative, formatTime } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { errorText, marketApi } from '../api/market.api';
import { GuideButton, Pager, TONE } from '../components/parts';

type Tab = 'OPEN' | 'CLOSED';

export default function MarketMessagesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canReply = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const [tab, setTab] = useState<Tab>('OPEN');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(1); }, [tab]);
  const listQ = useQuery({ queryKey: ['market', 'messages', tab, page], queryFn: () => marketApi.messages.list({ status: tab, page, limit: 30 }), refetchInterval: 30_000, placeholderData: (prev) => prev });
  const threadQ = useQuery({ queryKey: ['market', 'messages', 'thread', openId], queryFn: () => marketApi.messages.get(openId!), enabled: !!openId, refetchInterval: 15_000 });
  const items = listQ.data?.items ?? [];
  const counts = listQ.data?.counts;
  const thread = threadQ.data;

  useEffect(() => {
    if (!openId) return;
    const c = items.find((x) => x.id === openId);
    if (c && c.unreadCount > 0) marketApi.messages.markRead(openId).then(() => qc.invalidateQueries({ queryKey: ['market', 'messages'] })).catch(() => undefined);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages.length]);

  const send = useMutation({
    mutationFn: () => marketApi.messages.reply(openId!, text.trim()),
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['market', 'messages'] }); },
    onError: (e) => toast.error(errorText(e, t('Message nahi gaya'))),
  });
  const close = useMutation({
    mutationFn: () => marketApi.messages.close(openId!),
    onSuccess: () => { toast.success(t('Baat khatam mark kar di')); setOpenId(null); qc.invalidateQueries({ queryKey: ['market', 'messages'] }); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const current = thread?.conversation ?? items.find((x) => x.id === openId);

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Messages')}
        chip={<><MessageCircle /> {t('Market customers se baat')}</>}
        loading={listQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={counts ? [
          { label: t('Khuli baatein'), value: counts.open },
          { label: t('Naye messages'), value: counts.unread },
          { label: t('Khatam'), value: counts.closed },
        ] : undefined}
      />

      <ViewTabs value={tab} onChange={(v) => { setTab(v); setOpenId(null); }} tabs={[
        { id: 'OPEN', label: t('Khuli'), icon: Inbox, count: counts?.open ?? null },
        { id: 'CLOSED', label: t('Khatam'), icon: CheckCheck, count: counts?.closed ?? null },
      ]} />

      <div className="grid min-h-[28rem] gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className={cn('overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80', openId && 'hidden lg:block')}>
          {listQ.isLoading ? <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : !items.length ? <EmptyState icon={<Inbox className="h-6 w-6" />} title={tab === 'OPEN' ? t('Koi khuli baat nahi') : t('Koi khatam baat nahi')} />
              : (
                <ul className="divide-y divide-slate-100">
                  {items.map((c) => (
                    <li key={c.id} data-nav-row>
                      <button type="button" data-nav-open onClick={() => setOpenId(c.id)}
                        className={cn('flex w-full items-center gap-3 px-3 py-3 text-start transition hover:bg-slate-50', openId === c.id && 'bg-brand-50/60')}>
                        <Avatar name={c.customer?.fullName ?? '?'} url={c.customer?.avatarUrl ?? undefined} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn('truncate text-sm text-slate-900', c.unreadCount > 0 ? 'font-bold' : 'font-medium')}>{c.customer?.fullName || t('Customer')}</span>
                            <span className="ms-auto shrink-0 text-[0.6875rem] text-slate-400">{formatRelative(c.lastMessageAt)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[0.75rem] text-slate-500">{c.lastMessagePreview || '—'}</span>
                            {c.unreadCount > 0 && <Badge size="xs" variant="brand" className="ms-auto">{c.unreadCount}</Badge>}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
        </div>

        <div className={cn('flex min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80', !openId && 'hidden lg:flex')}>
          {!openId ? (
            <div className="flex flex-1 items-center justify-center"><EmptyState icon={<MessageCircle className="h-6 w-6" />} title={t('Baat chunein')} description={t('Baen taraf se customer chunein.')} /></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button type="button" onClick={() => setOpenId(null)} className="lg:hidden" aria-label={t('Wapas')}><ArrowLeft className="h-5 w-5 rtl:rotate-180" /></button>
                <Avatar name={current?.customer?.fullName ?? '?'} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{current?.customer?.fullName || t('Customer')}</p>
                  {current?.customer?.phone && <p className="dir-ltr truncate text-[0.75rem] text-slate-500">{current.customer.phone}</p>}
                </div>
                {current?.status === 'OPEN' && canReply && <Button size="sm" variant="secondary" onClick={() => close.mutate()} loading={close.isPending} leftIcon={<CheckCheck className="h-4 w-4" />}>{t('Khatam karein')}</Button>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-4 py-3">
                {threadQ.isLoading ? <Skeleton className="h-24 rounded-xl" /> : (thread?.messages ?? []).map((m) => {
                  const mine = m.direction === 'OUTBOUND' || m.senderType === 'BUSINESS' || m.senderType === 'STAFF' || m.senderType === 'SHOP';
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm', mine ? 'bg-brand-600 text-brand-fg' : 'bg-white text-slate-800 ring-1 ring-slate-200')}>
                        <p className="whitespace-pre-line">{m.body}</p>
                        {m.attachments.map((u) => <img key={u} src={u} alt="" className="mt-1 max-h-48 rounded-lg" />)}
                        <p className={cn('mt-0.5 text-end text-[0.625rem]', mine ? 'text-brand-fg/70' : 'text-slate-400')}>{formatTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {canReply && current?.status === 'OPEN' && (
                <form className="flex items-end gap-2 border-t border-slate-100 p-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
                  <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Jawab likhein… (Enter se bhejein)')} wrapperClassName="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate(); } }} />
                  <Button type="submit" disabled={!text.trim()} loading={send.isPending} leftIcon={<Send className="h-4 w-4 rtl:rotate-180" />}>{t('Bhejein')}</Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {listQ.data?.meta && <Pager page={page} totalPages={listQ.data.meta.totalPages} onPage={setPage} />}

      {guide.isOpen && (
        <PageGuide title={t('Messages')} onClose={guide.close}
          flow={[
            { label: t('Customer ka sawal'), icon: MessageCircle, color: TONE.blue },
            { label: t('Aap ka jawab'), hint: 'Enter', icon: Send, color: TONE.green },
            { label: t('Khatam karein'), icon: CheckCheck, color: TONE.slate },
          ]}
          steps={[
            { icon: Inbox, color: TONE.blue, title: t('Khuli baatein'), text: t('Mote naam wali baaton me naye message hain. Click karte hi parhi hui ho jati hain.') },
            { icon: Send, color: TONE.green, title: t('Jaldi jawab'), text: t('Enter se bhejein, Shift+Enter se nayi line. Jaldi jawab se order zyada aate hain.') },
            { icon: CheckCheck, color: TONE.slate, title: t('Khatam karein'), text: t('Masla hal ho jaye to "Khatam karein" — customer naya message bheje to dobara khul jati hai.') },
          ]}
          shortcuts={[['Enter', t('bhejein')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
