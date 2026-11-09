/**
 * Inbox (/online-store/inbox): Messenger and Instagram messages and comments
 * on Facebook / Instagram posts in one place. Reply, hide or delete a
 * comment, send a private message to a commenter, quick replies from the
 * shop's WhatsApp message texts, and link a thread to a customer or order by
 * phone. Messenger allows a normal reply only within 24 hours of the
 * customer's last message; outside it the reason is shown.
 *
 * Keys: R refresh · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, Clock, EyeOff, Eye, GraduationCap, Inbox, Lock, MessageCircle, MessagesSquare, Phone, RefreshCw, Send, ShoppingBag, Trash2, User,
} from 'lucide-react';
import { Alert, Button, EmptyState, Input, PageHero, PageShell, Segmented, Skeleton, Textarea, ViewTabs, confirmDialog, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { WA_TEMPLATES, fillTemplate, useWaTemplates } from '@integrations/online-orders/lib/waTemplates';
import { PlatformMark } from '@modules/growth/social/platforms';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { metaApi, type InboxComment, type InboxConversation, type InboxList } from './meta.api';

type Tab = 'messages' | 'comments';
const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const markFor = (p: string) => <PlatformMark p={p === 'INSTAGRAM' ? 'INSTAGRAM' : 'FACEBOOK'} size={16} />;

export default function InboxPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('messages');
  const [status, setStatus] = useState<'open' | 'done' | 'all' | 'unanswered'>('open');
  const [platform, setPlatform] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['meta-inbox', tab, status, platform, search],
    queryFn: () => metaApi.inbox({ tab, status, platform: platform || undefined, search: search || undefined }),
    refetchInterval: 30_000,
    placeholderData: (p) => p,
  });
  const pull = useMutation({
    mutationFn: metaApi.pull,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meta-inbox'] }); toast.success(t('Inbox taaza ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); pull.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const d = q.data;
  const s = d?.stats;
  const blocked = d && (!d.access.live || !d.connected);

  return (
    <PageShell>
      <PageHero
        title={t('Inbox')}
        chip={<><MessagesSquare />{t('Facebook · Instagram')}</>}
        meta={t('Messages aur comments ek jagah — jawab yahin se')}
        loading={q.isLoading}
        busy={q.isFetching && !q.isLoading}
        actions={<>
          {d?.connected && (
            <button type="button" className={heroButton} disabled={pull.isPending} onClick={() => pull.mutate()} title={t('Taaza karein (R)')}>
              <RefreshCw className={cn('h-4 w-4', pull.isPending && 'animate-spin')} /> <span className="hidden sm:inline">{t('Taaza karein')}</span>
            </button>
          )}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Khuli baat-cheet'), value: s ? String(s.openThreads) : '' },
          { label: t('Naye messages'), value: s ? String(s.unreadMessages) : '' },
          { label: t('Naye comments'), value: s ? String(s.unreadComments) : '' },
          { label: t('Jawab baqi'), value: s ? String(s.unanswered) : '', hint: t('comments') },
        ]}
      />

      {d?.needsReconnect && (
        <Alert tone="danger" title={t('Facebook ka jor toot gaya')} action={<Link to="/settings/facebook"><Button size="sm">{t('Dobara joren')}</Button></Link>}>
          {t('Naye messages nahi aa rahe. Dobara joren — purane messages mehfooz hain.')}
        </Alert>
      )}

      {q.isLoading ? <Skeleton className="h-[30rem] rounded-3xl" /> : blocked ? (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <EmptyState icon={<Inbox className="h-6 w-6" />}
            title={!d!.access.live ? t('Inbox jaldi aa raha hai') : t('Pehle Facebook joren')}
            description={!d!.access.live ? t('Meta (Facebook) ki manzoori ke baad Messenger, Instagram ke messages aur comments yahan aayenge.') : t('Facebook page aur Instagram jorne ke baad sab messages aur comments yahan aayenge.')}
            action={d!.access.live ? <Link to="/settings/facebook"><Button>{t('Facebook se joren')}</Button></Link> : undefined} />
        </section>
      ) : (
        <>
          <ViewTabs value={tab} onChange={(v) => { setTab(v); setOpenId(null); setStatus(v === 'comments' ? 'all' : 'open'); setPlatform(''); }}
            tabs={[
              { id: 'messages', label: t('Messages'), icon: MessageCircle, count: s?.unreadMessages || null },
              { id: 'comments', label: t('Comments'), icon: MessagesSquare, count: s?.unreadComments || null },
            ]}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Segmented value={platform} onChange={setPlatform} label={t('Platform')}
                  items={[{ value: '', label: t('Sab') }, { value: tab === 'messages' ? 'MESSENGER' : 'FACEBOOK', label: 'Facebook' }, { value: 'INSTAGRAM', label: 'Instagram' }]} />
                <Segmented value={status} onChange={setStatus} label={t('Status')}
                  items={tab === 'messages'
                    ? [{ value: 'open', label: t('Khuli') }, { value: 'done', label: t('Ho gayi') }, { value: 'all', label: t('Sab') }]
                    : [{ value: 'all', label: t('Sab') }, { value: 'unanswered', label: t('Jawab baqi') }]} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Naam, baat ya phone…')} className="h-9 w-48" aria-label={t('Dhoondein')} />
              </div>
            } />
          {tab === 'messages'
            ? <Messages list={d!} openId={openId} onOpen={setOpenId} />
            : <Comments list={d!} />}
          {!d?.webhooksAt && d?.connected && (
            <p className="text-[0.75rem] text-slate-500">{t('Naye messages khud aane me thori der lag sakti hai — "Taaza karein" dabayein.')}</p>
          )}
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('Inbox — aasaan tareeqa')}
          description={t('Har message aur comment ka jawab ek jagah se, order tak.')}
          onClose={guide.close}
          flow={[
            { label: t('Message / comment'), hint: t('Facebook, Instagram'), icon: MessageCircle, color: '#1877F2' },
            { label: t('Jawab'), hint: t('Ya tayyar message'), icon: Send, color: '#16a34a' },
            { label: t('Phone'), hint: t('Customer pehchanein'), icon: Phone, color: '#7c3aed' },
            { label: t('Order'), hint: t('Order banayein / jorein'), icon: ShoppingBag, color: '#ea580c' },
          ]}
          steps={[
            { icon: MessageCircle, color: '#1877F2', title: t('Messages'), text: t('Messenger aur Instagram DMs. Baat khol kar jawab likhein ya tayyar WhatsApp message chunein.') },
            { icon: Clock, color: '#dc2626', title: t('24 ghante'), text: t('Facebook sirf 24 ghante tak jawab bhejne deta hai jab customer ne aakhri message kiya. Us ke baad customer ke dobara message ka intezar karein.') },
            { icon: MessagesSquare, color: '#7c3aed', title: t('Comments'), text: t('Post ke comments ka jawab, "Private message" (price DM), chhupana ya mitana.') },
            { icon: Phone, color: '#0d9488', title: t('Phone se order'), text: t('Message me phone number ho to Nafaa khud pakad leta hai aur us number ke purane orders dikhata hai.') },
          ]}
          shortcuts={[['R', t('Taaza karein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

/* ───────────────────────── messages ───────────────────────── */

function Messages({ list, openId, onOpen }: { list: InboxList; openId: string | null; onOpen: (id: string) => void }) {
  const rows = list.conversations ?? [];
  useEffect(() => { if (!openId && rows[0] && window.innerWidth >= 1024) onOpen(rows[0].id); }, [rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className={cn('overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', openId && 'hidden lg:block')}>
        {!rows.length ? <EmptyState icon={<Inbox className="h-6 w-6" />} title={t('Koi message nahi')} description={t('Naye messages yahan aayenge.')} /> : (
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-auto">
            {rows.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpen(c.id)} className={cn('flex w-full items-start gap-3 px-3 py-3 text-start hover:bg-slate-50', openId === c.id && 'bg-brand-50')}>
                  <span className="mt-0.5">{markFor(c.platform)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate text-[0.875rem] text-slate-900', c.unread ? 'font-bold' : 'font-medium')}>{c.participantName || (c.participantUsername ? `@${c.participantUsername}` : t('Customer'))}</span>
                      <span className="ms-auto shrink-0 text-[0.6875rem] text-slate-400">{ago(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-[0.8125rem] text-slate-500">{c.lastText || '…'}</span>
                      {!!c.unread && <span className="ms-auto rounded-full bg-brand-600 px-1.5 text-[0.6875rem] font-bold text-white">{c.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {openId ? <Thread key={openId} id={openId} onBack={() => onOpen('')} /> : (
        <section className="hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:block">
          <EmptyState icon={<MessageCircle className="h-6 w-6" />} title={t('Baat chunein')} description={t('Baen taraf se koi baat-cheet kholein.')} />
        </section>
      )}
    </div>
  );
}

function QuickReplies({ name, onPick }: { name: string; onPick: (text: string) => void }) {
  const saved = useWaTemplates();
  const items = useMemo(() => WA_TEMPLATES.filter((x) => x.key !== 'cart'), []);
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <button key={x.key} type="button" onClick={() => onPick(fillTemplate(saved.data?.templates?.[x.key] ?? x.text(), { name }))}
          className="rounded-full bg-slate-50 px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-white">
          {x.label}
        </button>
      ))}
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['meta-thread', id], queryFn: () => metaApi.conversation(id), refetchInterval: 20_000 });
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => { if (q.data) setPhone(q.data.conversation.phone ?? ''); }, [q.data?.conversation.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => { qc.invalidateQueries({ queryKey: ['meta-thread', id] }); qc.invalidateQueries({ queryKey: ['meta-inbox'] }); };
  const send = useMutation({ mutationFn: () => metaApi.reply(id, text), onSuccess: () => { setText(''); refresh(); }, onError: (e) => { toast.error(apiErrorMessage(e)); refresh(); } });
  const update = useMutation({ mutationFn: (b: Partial<Pick<InboxConversation, 'status' | 'phone' | 'customerId' | 'channelOrderId'>>) => metaApi.updateConversation(id, b), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });

  if (q.isLoading || !q.data) return <Skeleton className="h-[30rem] rounded-3xl" />;
  const { conversation: c, messages, links } = q.data;
  const name = c.participantName || (c.participantUsername ? `@${c.participantUsername}` : t('Customer'));

  return (
    <section className="flex min-h-[30rem] flex-col rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button type="button" onClick={onBack} className="rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-slate-600 hover:bg-slate-100 lg:hidden">{t('Wapas')}</button>
        {markFor(c.platform)}
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-slate-900">{name}</span>
        {c.status === 'OPEN'
          ? <Button size="xs" variant="secondary" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => update.mutate({ status: 'DONE' })}>{t('Ho gayi')}</Button>
          : <Button size="xs" variant="ghost" onClick={() => update.mutate({ status: 'OPEN' })}>{t('Dobara kholein')}</Button>}
      </header>

      <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-h-0 flex-col">
          <ol className="max-h-[55vh] flex-1 space-y-2 overflow-auto px-4 py-3">
            {messages.map((m) => (
              <li key={m.id} className={cn('flex', m.direction === 'OUT' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-[0.8125rem]', m.direction === 'OUT' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-900', m.status === 'FAILED' && 'bg-rose-50 text-rose-800 ring-1 ring-rose-200')}>
                  <p className="whitespace-pre-wrap break-words">{m.text || (m.attachments.length ? `[${m.attachments.map((a) => a.type).join(', ')}]` : '')}</p>
                  <p className={cn('mt-0.5 text-[0.625rem]', m.direction === 'OUT' && m.status !== 'FAILED' ? 'text-white/70' : 'text-slate-400')}>{ago(m.sentAt)}{m.error ? ` · ${m.error}` : ''}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="space-y-2 border-t border-slate-100 p-3">
            {c.canReply ? (
              <>
                <QuickReplies name={c.participantName ?? ''} onPick={setText} />
                <div className="flex items-end gap-2">
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t('Jawab likhein…')} className="flex-1" aria-label={t('Jawab')}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) send.mutate(); }} />
                  <Button onClick={() => send.mutate()} loading={send.isPending} disabled={!text.trim()} leftIcon={<Send className="h-4 w-4" />}>{t('Bhejein')}</Button>
                </div>
                {c.replyClosesAt && <p className="flex items-center gap-1 text-[0.6875rem] text-slate-500"><Clock className="h-3 w-3" />{t('Jawab {{date}} tak bhej sakte hain', { date: ago(c.replyClosesAt) })}</p>}
              </>
            ) : (
              <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                {t('Is bande ka aakhri message 24 ghante se purana hai — Facebook ab jawab bhejne nahi deta. Woh dobara message kare to jawab de sakte hain.')}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-3 border-t border-slate-100 p-3 xl:border-s xl:border-t-0">
          <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500"><User className="h-3.5 w-3.5" />{t('Customer')}</p>
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" className="h-9" aria-label={t('Phone')} />
            <Button size="sm" variant="secondary" onClick={() => update.mutate({ phone: phone || null })} loading={update.isPending}>{t('Save')}</Button>
          </div>
          {links.phone ? (
            <>
              {links.customers.map((cu) => (
                <Link key={cu.id} to={`/customers/${cu.id}`} className={cn('block rounded-xl px-2.5 py-2 text-[0.8125rem] ring-1 hover:bg-slate-50', c.customerId === cu.id ? 'ring-brand-300' : 'ring-slate-200')}>
                  <span className="font-semibold text-slate-900">{cu.name}</span> <span className="text-slate-500">{cu.phone}</span>
                </Link>
              ))}
              {links.orders.map((o) => (
                <div key={o.id} className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-[0.8125rem] ring-1', c.channelOrderId === o.id ? 'ring-brand-300' : 'ring-slate-200')}>
                  <Link to={`/online-orders?search=${encodeURIComponent(o.number)}`} className="min-w-0 flex-1 truncate font-semibold text-brand-700 hover:underline">#{o.number}</Link>
                  <span className="text-slate-500">{o.status}</span>
                  {c.channelOrderId !== o.id && <button type="button" onClick={() => update.mutate({ channelOrderId: o.id })} className="text-[0.75rem] font-semibold text-slate-600 hover:underline">{t('Jorein')}</button>}
                </div>
              ))}
              {!links.customers.length && !links.orders.length && <p className="text-[0.75rem] text-slate-500">{t('Is number ka koi customer ya order nahi.')}</p>}
            </>
          ) : <p className="text-[0.75rem] text-slate-500">{t('Phone number daalein — us ke orders aur customer yahan dikhenge.')}</p>}
          <Link to={`/online-orders/new?source=${c.platform === 'INSTAGRAM' ? 'INSTAGRAM' : 'FACEBOOK'}&name=${encodeURIComponent(c.participantName ?? '')}${links.phone ? `&phone=${encodeURIComponent(links.phone)}` : ''}`}>
            <Button size="sm" variant="secondary" className="w-full" leftIcon={<ShoppingBag className="h-4 w-4" />}>{t('Order banayein')}</Button>
          </Link>
        </aside>
      </div>
    </section>
  );
}

/* ───────────────────────── comments ───────────────────────── */

function Comments({ list }: { list: InboxList }) {
  const qc = useQueryClient();
  const rows = list.comments ?? [];
  const unreadIds = rows.filter((c) => !c.read).map((c) => c.id).join(',');
  useEffect(() => {
    if (!unreadIds) return;
    const timer = window.setTimeout(() => metaApi.readComments(unreadIds.split(',')).then(() => qc.invalidateQueries({ queryKey: ['meta-inbox'] })).catch(() => undefined), 3_000);
    return () => window.clearTimeout(timer);
  }, [unreadIds]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><EmptyState icon={<MessagesSquare className="h-6 w-6" />} title={t('Koi comment nahi')} description={t('Post par naye comments yahan aayenge.')} /></section>;
  return <div className="space-y-3">{rows.map((c) => <CommentCard key={c.id} c={c} />)}</div>;
}

function CommentCard({ c }: { c: InboxComment }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'public' | 'private' | null>(null);
  const done = () => { setText(''); setMode(null); qc.invalidateQueries({ queryKey: ['meta-inbox'] }); };
  const onErr = (e: unknown) => toast.error(apiErrorMessage(e));
  const reply = useMutation({ mutationFn: () => metaApi.replyComment(c.id, text, mode === 'private'), onSuccess: () => { toast.success(mode === 'private' ? t('Private message chala gaya') : t('Jawab chala gaya')); done(); }, onError: onErr });
  const hide = useMutation({ mutationFn: () => metaApi.hideComment(c.id, !c.hidden), onSuccess: done, onError: onErr });
  const del = useMutation({ mutationFn: () => metaApi.deleteComment(c.id), onSuccess: () => { toast.success(t('Comment mita diya')); done(); }, onError: onErr });

  return (
    <article className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !c.read && 'ring-brand-200')}>
      <header className="flex flex-wrap items-center gap-2">
        {markFor(c.platform)}
        <span className="text-[0.875rem] font-semibold text-slate-900">{c.authorName || t('Customer')}</span>
        <span className="text-[0.75rem] text-slate-400">{ago(c.commentedAt)}</span>
        {c.hidden && <span className="rounded-full bg-slate-100 px-2 py-px text-[0.6875rem] font-semibold text-slate-600">{t('Chhupa hua')}</span>}
        {c.repliedAt ? <span className="rounded-full bg-success-50 px-2 py-px text-[0.6875rem] font-semibold text-success-700">{t('Jawab diya')}</span>
          : <span className="rounded-full bg-amber-50 px-2 py-px text-[0.6875rem] font-semibold text-amber-800">{t('Jawab baqi')}</span>}
        {c.socialPostId && <Link to={`/online-store/social?post=${c.socialPostId}`} className="ms-auto text-[0.75rem] font-semibold text-brand-700 hover:underline">{t('Post dekhein')}</Link>}
      </header>
      <p className="mt-1.5 whitespace-pre-wrap text-[0.875rem] text-slate-800">{c.text}</p>
      {c.phone && <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-slate-500"><Phone className="h-3 w-3" />{c.phone} · <Link to={`/online-orders/new?source=${c.platform}&phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.authorName ?? '')}`} className="font-semibold text-brand-700 hover:underline">{t('Order banayein')}</Link></p>}
      {!!c.replies?.length && (
        <ul className="mt-2 space-y-1.5 border-s-2 border-slate-100 ps-3">
          {c.replies.map((r) => <li key={r.id} className="text-[0.8125rem] text-slate-700"><span className="font-semibold">{r.fromShop ? t('Aap') : r.authorName}</span>: {r.text}</li>)}
        </ul>
      )}
      {mode ? (
        <div className="mt-3 flex items-end gap-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus aria-label={t('Jawab')}
            placeholder={mode === 'private' ? t('Private message (sirf is bande ko)…') : t('Sab ke saamne jawab…')} className="flex-1" />
          <Button onClick={() => reply.mutate()} loading={reply.isPending} disabled={!text.trim()} leftIcon={<Send className="h-4 w-4" />}>{t('Bhejein')}</Button>
          <Button variant="ghost" onClick={() => setMode(null)}>{t('Band')}</Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="xs" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => setMode('public')}>{t('Jawab')}</Button>
          <Button size="xs" variant="secondary" leftIcon={<Lock className="h-3.5 w-3.5" />} onClick={() => setMode('private')}>{t('Private message')}</Button>
          <Button size="xs" variant="ghost" leftIcon={c.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} loading={hide.isPending} onClick={() => hide.mutate()}>{c.hidden ? t('Dikhayein') : t('Chhupayein')}</Button>
          <Button size="xs" variant="ghost" className="text-rose-700" leftIcon={<Trash2 className="h-3.5 w-3.5" />} loading={del.isPending}
            onClick={async () => { if (await confirmDialog({ title: t('Comment mitayein?'), text: t('Ye Facebook / Instagram se bhi mit jayega.'), yes: t('Mitayein'), danger: true })) del.mutate(); }}>
            {t('Mitayein')}
          </Button>
        </div>
      )}
      {c.hidden && <p className="mt-2 flex items-center gap-1 text-[0.6875rem] text-slate-500"><AlertTriangle className="h-3 w-3" />{t('Chhupa comment sirf likhne wala aur us ke dost dekh sakte hain.')}</p>}
    </article>
  );
}
