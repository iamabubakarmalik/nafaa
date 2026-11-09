/**
 * Call center: the confirmation call queue (new orders by priority), callbacks,
 * the call log and agent figures. Calls go out through tel: links (the phone,
 * or the computer's calling app); the agent logs the outcome and the order's
 * confirmation and follow-up are updated with it. Auto-dial and recording are
 * not built yet.
 *
 * Keys: R refresh · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarClock, CheckCircle2, Clock, GraduationCap, History, ListChecks, Phone, PhoneCall, PhoneMissed, PhoneOff,
  RefreshCw, Sparkles, User, UserX, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, EmptyState, FilterBar, Input, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { apiErrorMessage, type CustomerRisk } from '../api/online-orders.api';
import { callCenterApi, type CallOutcome, type CallRow, type QueueOrder } from '../api/call-center.api';
import { RiskBadge } from '../components/RiskBadge';
import { timeAgo } from '../lib/labels';

type Tab = 'queue' | 'followups' | 'log' | 'team';

const OUTCOME: Record<CallOutcome, { label: string; icon: typeof Phone; tone: string }> = {
  CONFIRMED: { label: t('Confirm'), icon: CheckCircle2, tone: 'bg-success-50 text-success-700' },
  NO_ANSWER: { label: t('Jawab nahi'), icon: PhoneMissed, tone: 'bg-amber-50 text-amber-800' },
  BUSY: { label: t('Busy'), icon: PhoneOff, tone: 'bg-amber-50 text-amber-800' },
  WRONG_NUMBER: { label: t('Ghalat number'), icon: UserX, tone: 'bg-rose-50 text-rose-700' },
  CALL_BACK: { label: t('Dobara call'), icon: CalendarClock, tone: 'bg-sky-50 text-sky-700' },
  CANCELLED: { label: t('Cancel kiya'), icon: XCircle, tone: 'bg-rose-50 text-rose-700' },
};

/** Local "YYYY-MM-DDTHH:mm" for a datetime input, `hours` from now. */
const inHours = (hours: number) => {
  const d = new Date(Date.now() + hours * 3_600_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function OutcomeChip({ outcome }: { outcome: CallOutcome }) {
  const o = OUTCOME[outcome];
  if (!o) return null;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', o.tone)}><o.icon className="h-3 w-3" />{o.label}</span>;
}

function CallLink({ phone, onCall, compact }: { phone: string | null; onCall?: () => void; compact?: boolean }) {
  if (!phone) return <span className="text-[0.75rem] text-slate-400">{t('Phone nahi')}</span>;
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} onClick={onCall}
      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-[0.8125rem] font-semibold text-brand-fg shadow-sm hover:bg-brand-700">
      <PhoneCall className="h-3.5 w-3.5" />{compact ? t('Call') : phone}
    </a>
  );
}

export default function CallCenterPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const [tab, setTab] = useState<Tab>('queue');
  const [mine, setMine] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const [dialing, setDialing] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ order: QueueOrder | null; row?: CallRow; outcome: 'CALL_BACK' | 'CANCELLED' } | null>(null);

  const queue = useQuery({ queryKey: ['call-queue', mine], queryFn: () => callCenterApi.queue(mine), refetchInterval: 60_000, placeholderData: (p) => p });
  const follow = useQuery({ queryKey: ['call-followups', mine], queryFn: () => callCenterApi.followUps(mine), refetchInterval: 60_000, placeholderData: (p) => p });
  const log = useQuery({ queryKey: ['call-log', period?.from, period?.to], queryFn: () => callCenterApi.log({ from: period?.from, to: period?.to }), enabled: tab === 'log', placeholderData: (p) => p });
  const team = useQuery({ queryKey: ['call-team', period?.from, period?.to], queryFn: () => callCenterApi.performance({ from: period?.from, to: period?.to }), enabled: tab === 'team', placeholderData: (p) => p });

  const refresh = () => {
    for (const k of ['call-queue', 'call-followups', 'call-log', 'call-team']) qc.invalidateQueries({ queryKey: [k] });
  };
  const record = useMutation({
    mutationFn: callCenterApi.record,
    onSuccess: (r) => {
      toast.success(r.outcome === 'CONFIRMED' ? t('Order confirm ho gaya') : r.outcome === 'CALL_BACK' ? t('Dobara call ka waqt rakh diya') : t('Call likh di'));
      setDialing(null);
      setAsk(null);
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const done = useMutation({ mutationFn: (id: string) => callCenterApi.done(id), onSuccess: refresh, onError: (e) => toast.error(apiErrorMessage(e)) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); refresh(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const s = queue.data?.stats;
  const outcome = (o: QueueOrder, out: CallOutcome) => {
    if (out === 'CALL_BACK' || out === 'CANCELLED') { setAsk({ order: o, outcome: out }); return; }
    record.mutate({ orderId: o.id, outcome: out });
  };

  return (
    <PageShell>
      <PageHero
        title={t('Call center')}
        chip={<><PhoneCall />{t('Confirmation calls')}</>}
        meta={t('Naye orders ko call karein, natija likhein — order khud confirm ya follow-up me chala jata hai')}
        busy={queue.isFetching && !queue.isLoading}
        loading={queue.isLoading}
        actions={<>
          <button type="button" onClick={() => setMine((m) => !m)} className={cn(heroButton, mine && 'ring-2 ring-white/70')} aria-pressed={mine}>
            <User className="h-4 w-4" /> <span className="hidden sm:inline">{mine ? t('Sirf mere') : t('Sab ke')}</span>
          </button>
          <button type="button" onClick={refresh} title={t('Taaza karein (R)')} className={heroButton}>
            <RefreshCw className={cn('h-4 w-4', queue.isFetching && 'animate-spin')} /> <span className="hidden sm:inline">{t('Taaza karein')}</span>
          </button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: t('Call karni hai'), value: String(s.waiting), hint: s.risky ? t('{{count}} khatre wale', { count: s.risky }) : undefined },
          { label: t('Dobara call due'), value: String(follow.data?.stats.due ?? 0), hint: t('{{count}} baad me', { count: s.later }) },
          { label: t('Aaj calls'), value: String(s.callsToday), hint: t('{{count}} jawab nahi', { count: s.noAnswerToday }) },
          { label: t('Aaj confirm'), value: String(s.confirmedToday) },
        ] : [{ label: t('Call karni hai'), value: '' }, { label: t('Dobara call due'), value: '' }, { label: t('Aaj calls'), value: '' }, { label: t('Aaj confirm'), value: '' }]}
      />

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'queue', label: t('Call queue'), icon: ListChecks },
          { id: 'followups', label: t('Dobara call'), icon: CalendarClock },
          { id: 'log', label: t('Call log'), icon: History },
          { id: 'team', label: t('Team'), icon: BarChart3 },
        ]} />

      {(tab === 'log' || tab === 'team') && (
        <FilterBar>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="week" allowAll={false} />
        </FilterBar>
      )}

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {tab === 'queue' && (
          queue.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            : queue.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(queue.error)} action={<Button variant="secondary" onClick={() => queue.refetch()}>{t('Dobara koshish')}</Button>} />
            : !queue.data?.items.length ? <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={t('Sab calls ho gayi')} description={queue.data?.later.length ? t('{{count}} order baad me call honge.', { count: queue.data.later.length }) : t('Abhi koi naya order confirm karna baqi nahi.')} />
            : (
              <ul className="divide-y divide-slate-100">
                {queue.data.items.map((o) => (
                  <li key={o.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', dialing === o.id && 'bg-brand-50/60')}>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] font-semibold text-slate-900">
                        <Link to={`/online-orders?search=${encodeURIComponent(o.no)}`} className="font-mono text-brand-700 hover:underline">#{o.no}</Link>
                        <span className="truncate">{o.customerName}</span>
                        {o.customerCity && <span className="text-[0.75rem] font-normal text-slate-500">· {o.customerCity}</span>}
                        <RiskBadge risk={o.risk as CustomerRisk | null} />
                        {o.callBackAt && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-sky-700">{t('Dobara call ka waqt')}</span>}
                      </p>
                      <p className="text-[0.75rem] text-slate-500">
                        {timeAgo(o.receivedAt)}{o.channel ? ` · ${o.channel}` : ''}{o.cod ? ` · COD` : ''}
                        {o.attempts ? ` · ${t('{{count}} dafa try', { count: o.attempts })}` : ''}
                        {o.assignedTo?.name ? ` · ${o.assignedTo.name}` : ''}
                      </p>
                      {o.lastCall && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-slate-400">
                          <OutcomeChip outcome={o.lastCall.outcome} /> {timeAgo(o.lastCall.at)}{o.lastCall.by ? ` · ${o.lastCall.by}` : ''}{o.lastCall.note ? ` · ${o.lastCall.note}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(o.total)}</span>
                    <CallLink phone={o.customerPhone} onCall={() => setDialing(o.id)} />
                    <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                      {(['CONFIRMED', 'NO_ANSWER', 'BUSY', 'CALL_BACK', 'WRONG_NUMBER', 'CANCELLED'] as CallOutcome[]).map((out) => {
                        const meta = OUTCOME[out];
                        return (
                          <Button key={out} size="xs" variant={out === 'CONFIRMED' ? 'success' : 'secondary'} disabled={record.isPending}
                            loading={record.isPending && record.variables?.orderId === o.id && record.variables?.outcome === out}
                            onClick={() => outcome(o, out)} leftIcon={<meta.icon className="h-3.5 w-3.5" />}>{meta.label}</Button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )
        )}

        {tab === 'followups' && (
          follow.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : !follow.data?.items.length ? <EmptyState icon={<CalendarClock className="h-5 w-5" />} title={t('Koi dobara call baqi nahi')} description={t('"Dobara call" chunne par waqt yahan aata hai.')} />
            : (
              <ul className="divide-y divide-slate-100">
                {follow.data.items.map((c) => {
                  const late = c.callBackAt && new Date(c.callBackAt).getTime() <= Date.now();
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', late ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700')}>
                        <Clock className="h-3.5 w-3.5" />{c.callBackAt ? when(c.callBackAt) : ''}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.875rem] font-semibold text-slate-900">
                          {c.order && <Link to={`/online-orders?search=${encodeURIComponent(c.order.no)}`} className="me-2 font-mono text-brand-700 hover:underline">#{c.order.no}</Link>}
                          {c.customerName ?? t('Naam nahi')}
                        </p>
                        <p className="text-[0.75rem] text-slate-500">{c.note ?? ''}{c.agent?.name ? ` · ${c.agent.name}` : ''}</p>
                      </div>
                      <CallLink phone={c.customerPhone} />
                      {c.order ? (
                        <>
                          <Button size="xs" variant="success" disabled={record.isPending} onClick={() => record.mutate({ orderId: c.order!.id, outcome: 'CONFIRMED' })} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>{t('Confirm')}</Button>
                          <Button size="xs" variant="secondary" disabled={record.isPending} onClick={() => record.mutate({ orderId: c.order!.id, outcome: 'NO_ANSWER' })} leftIcon={<PhoneMissed className="h-3.5 w-3.5" />}>{t('Jawab nahi')}</Button>
                        </>
                      ) : null}
                      <Button size="xs" variant="ghost" loading={done.isPending && done.variables === c.id} onClick={() => done.mutate(c.id)}>{t('Ho gaya')}</Button>
                    </li>
                  );
                })}
              </ul>
            )
        )}

        {tab === 'log' && (
          log.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            : !log.data?.length ? <EmptyState icon={<History className="h-5 w-5" />} title={t('Is period me koi call nahi')} />
            : (
              <Table>
                <THead><Tr><Th>{t('Waqt')}</Th><Th>{t('Order')}</Th><Th>{t('Customer')}</Th><Th>{t('Natija')}</Th><Th>{t('Kis ne')}</Th><Th>{t('Note')}</Th></Tr></THead>
                <TBody>
                  {log.data.map((c) => (
                    <Tr key={c.id}>
                      <Td className="whitespace-nowrap text-slate-500">{when(c.at)}</Td>
                      <Td>{c.order ? <Link to={`/online-orders?search=${encodeURIComponent(c.order.no)}`} className="font-mono text-brand-700 hover:underline">#{c.order.no}</Link> : '—'}</Td>
                      <Td>{c.customerName ?? '—'}<span className="ms-1 font-mono text-[0.75rem] text-slate-400">{c.customerPhone ?? ''}</span></Td>
                      <Td><OutcomeChip outcome={c.outcome} />{c.callBackAt ? <span className="ms-1 text-[0.6875rem] text-slate-500">{when(c.callBackAt)}</span> : null}</Td>
                      <Td>{c.agent?.name ?? '—'}</Td>
                      <Td className="max-w-[16rem] truncate text-slate-500">{c.note ?? ''}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )
        )}

        {tab === 'team' && (
          team.isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-xl" /></div>
            : !team.data?.agents.length ? <EmptyState icon={<BarChart3 className="h-5 w-5" />} title={t('Is period me koi call nahi')} />
            : (
              <Table>
                <THead><Tr><Th>{t('Staff')}</Th><Th className="text-end">{t('Calls')}</Th><Th className="text-end">{t('Orders')}</Th><Th className="text-end">{t('Confirm')}</Th><Th className="text-end">{t('Confirm rate')}</Th><Th className="text-end">{t('Baat hui')}</Th><Th className="text-end">{t('Jawab nahi')}</Th><Th className="text-end">{t('Cancel')}</Th></Tr></THead>
                <TBody>
                  {[...team.data.agents, { ...team.data.totals, agentId: 'total', name: t('Kul') }].map((a) => (
                    <Tr key={a.agentId ?? '-'} className={cn(a.agentId === 'total' && 'bg-slate-50 font-semibold')}>
                      <Td>{a.name || t('Naam nahi')}</Td>
                      <Td className="text-end tabular-nums">{a.calls}</Td>
                      <Td className="text-end tabular-nums">{a.orders}</Td>
                      <Td className="text-end tabular-nums">{a.confirmed}</Td>
                      <Td className="text-end tabular-nums">{a.confirmRate}%</Td>
                      <Td className="text-end tabular-nums">{a.reachRate}%</Td>
                      <Td className="text-end tabular-nums">{a.noAnswer}</Td>
                      <Td className="text-end tabular-nums">{a.cancelled}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <span className="flex-1">{t('Khud number milana (auto-dial) aur call recording — jaldi aa raha hai. Abhi "Call" dabane se aap ka phone ya computer ki calling app khulti hai.')}</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase text-amber-800">{t('Soon')}</span>
      </div>

      {ask && <OutcomeDialog ask={ask} busy={record.isPending} onClose={() => setAsk(null)}
        onSave={(note, at) => record.mutate({ orderId: ask.order?.id, outcome: ask.outcome, note: note || undefined, callBackAt: at ? new Date(at).toISOString() : undefined })} />}

      {guide.isOpen && (
        <PageGuide
          title={t('Call center — aasaan tareeqa')}
          description={t('COD order bhejne se pehle customer se baat kar lein — RTO (parcel wapas) bohat kam ho jata hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Naya order'), hint: t('Queue me upar'), icon: ListChecks, color: '#2563eb' },
            { label: t('Call'), hint: t('Phone ya computer'), icon: PhoneCall, color: '#16a34a' },
            { label: t('Natija'), hint: t('Ek click'), icon: CheckCircle2, color: '#0d9488' },
            { label: t('Dobara call'), hint: t('Waqt par yaad'), icon: CalendarClock, color: '#7c3aed' },
          ]}
          steps={[
            { icon: ListChecks, color: '#2563eb', title: t('Pehle kaun'), text: t('Purane, khatre wale aur COD orders upar aate hain. Jawab na mile to order ek ghante baad dobara aata hai.') },
            { icon: PhoneCall, color: '#16a34a', title: t('Call karein'), text: t('"Call" mobile par phone kholta hai; computer par aap ki calling app (Phone Link, Skype, FaceTime) kholta hai.') },
            { icon: CheckCircle2, color: '#0d9488', title: t('Natija likhein'), text: t('Confirm, jawab nahi, busy, ghalat number ya cancel — order par confirmation khud lag jati hai.') },
            { icon: BarChart3, color: '#7c3aed', title: t('Team'), text: t('Team tab me har staff ki calls aur confirm rate dekhein.') },
          ]}
          shortcuts={[['R', t('Taaza karein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function OutcomeDialog({ ask, busy, onClose, onSave }: {
  ask: { order: QueueOrder | null; outcome: 'CALL_BACK' | 'CANCELLED' };
  busy: boolean;
  onClose: () => void;
  onSave: (note: string, at: string | null) => void;
}) {
  const [note, setNote] = useState('');
  const [at, setAt] = useState(inHours(2));
  const callBack = ask.outcome === 'CALL_BACK';
  return (
    <Modal open onClose={onClose} size="sm"
      title={callBack ? t('Dobara call kab karein?') : t('Customer ne cancel kiya')}
      description={ask.order ? `#${ask.order.no} · ${ask.order.customerName}` : undefined}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('Wapas')}</Button>
        <Button variant={callBack ? 'primary' : 'danger'} loading={busy} disabled={callBack ? !at : !note.trim()} onClick={() => onSave(note.trim(), callBack ? at : null)}>{t('Save karein')}</Button>
      </>}>
      <div className="space-y-3">
        {callBack && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[[1, t('1 ghanta')], [3, t('3 ghante')], [24, t('Kal')]].map(([h, label]) => (
                <Button key={String(h)} size="xs" variant="secondary" onClick={() => setAt(inHours(Number(h)))}>{label}</Button>
              ))}
            </div>
            <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} aria-label={t('Waqt')} />
          </>
        )}
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={callBack ? t('Note (jaise: shaam ko free hain)') : t('Wajah (zaroori)')} aria-label={t('Note')} />
        {!callBack && <p className="text-[0.75rem] text-slate-500">{t('Order par "mana kar diya" lag jayega. Order cancel karna ho to orders page se karein.')}</p>}
      </div>
    </Modal>
  );
}
