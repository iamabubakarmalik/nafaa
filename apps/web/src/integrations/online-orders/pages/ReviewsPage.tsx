/**
 * Customer reviews after delivery. Each delivered order can get a rating
 * link (/rate/<token>, no login); the merchant sends it over WhatsApp one by
 * one. The customer gives 1–5 stars and a comment; a good rating is offered
 * the shop's Google / Facebook review pages. The automation recipe
 * "Deliver hone par review request" makes the links by itself.
 *
 * Keys: / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2, Copy, ExternalLink, GraduationCap, MessageCircle, Plus, Send, Settings2, Star, ThumbsDown, Trash2, Truck, Undo2, Workflow,
} from 'lucide-react';
import {
  Button, Card, EmptyState, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { retentionApi, type ReviewFilter, type ReviewLink, type ReviewRow } from '../api/retention.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { timeAgo, waNumber } from '../lib/labels';
import { waLink } from '../lib/retention';
import { fillTemplate, templateText, usePlatformWaTemplates, useWaTemplates } from '../lib/waTemplates';

export const rateUrl = (token: string) => `${window.location.origin}/rate/${token}`;

export function Stars({ value, size = 'h-3.5 w-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t('{{value}} star', { value })}>
      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn(size, s <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}
    </span>
  );
}

export default function ReviewsPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const saved = useWaTemplates().data?.templates;
  const platformWa = usePlatformWaTemplates();
  const [filter, setFilter] = useState<ReviewFilter>('TO_SEND');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => { const id = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(id); }, [search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = useQuery({ queryKey: ['online-reviews', filter, term], queryFn: () => retentionApi.reviews({ filter, search: term || undefined }), placeholderData: (p) => p });
  const refresh = () => qc.invalidateQueries({ queryKey: ['online-reviews'] });
  const make = useMutation({
    mutationFn: () => retentionApi.requestRecent(14),
    onSuccess: (r) => { toast.success(r.made ? t('{{count}} naye review link bane', { count: r.made }) : t('Sab deliver orders ke link pehle se hain')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sent = useMutation({
    mutationFn: ({ id, undo }: { id: string; undo?: boolean }) => retentionApi.reviewSent(id, undo),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const textFor = (r: ReviewRow) => {
    const base = templateText('delivered', saved, platformWa);
    const url = rateUrl(r.token);
    const withUrl = base.includes('{reviewUrl}') ? base.replace(/\{reviewUrl\}/g, url) : `${base}\n${url}`;
    return fillTemplate(withUrl, { name: String(r.customerName ?? '').split(' ')[0], shop, no: r.orderNo ?? '' });
  };
  const send = (r: ReviewRow) => {
    const href = waLink(waNumber(r.customerPhone), textFor(r));
    if (!href) { toast.error(t('Number sahi nahi')); return; }
    window.open(href, '_blank', 'noopener');
    sent.mutate({ id: r.id });
  };

  const s = q.data?.stats;
  return (
    <PageShell>
      <PageHero
        title={t('Reviews')}
        chip={<><Star />{s?.average ? t('{{avg}} / 5', { avg: s.average }) : t('Rating')}</>}
        meta={t('Deliver hone ke baad customer se rating lein — aur achhi rating wale ko Google / Facebook review ka link')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => make.mutate()} disabled={make.isPending} className={heroButton}><Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('14 din ke links banayein')}</span></button>
          <button type="button" onClick={() => setSettingsOpen(true)} className={heroButton}><Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Review links')}</span></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: t('Ausat rating'), value: s.average ? `${s.average} ★` : '—', hint: t('{{count}} ratings', { count: s.rated }) },
          { label: t('Bhejne hain'), value: String(s.toSend) },
          { label: t('Jawab dene wale'), value: `${s.responseRate}%`, hint: t('{{count}} ko bheja', { count: s.sent }) },
          { label: t('Kam rating'), value: String(s.low), hint: t('3 ya kam') },
        ] : [{ label: t('Ausat rating'), value: '' }, { label: t('Bhejne hain'), value: '' }, { label: t('Jawab dene wale'), value: '' }, { label: t('Kam rating'), value: '' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : [5, 4, 3, 2, 1].map((star) => (
          <KpiCard key={star} icon={Star} color={star >= 4 ? '#d97706' : star === 3 ? '#64748b' : '#e11d48'} label={t('{{value}} star', { value: star })}
            value={s.distribution[star - 1]} hint={s.rated ? `${Math.round((s.distribution[star - 1] / s.rated) * 100)}%` : '—'} />
        ))}
      </KpiRow>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
        <Workflow className="h-4 w-4 text-teal-600" />
        <span className="min-w-0 flex-1 text-slate-600">{t('Har deliver order ka review link khud banwana ho to Automation me "Deliver hone par review request" recipe ON karein.')}</span>
        <Link to="/online-store/automation" className="font-semibold text-brand-700 hover:underline">{t('Automation kholein')}</Link>
      </div>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam, phone ya order no…')} label={t('Review search')} />} />
      <ViewTabs value={filter} onChange={setFilter}
        tabs={[
          { id: 'TO_SEND', label: t('Bhejne hain'), icon: Send, count: s?.toSend ?? null },
          { id: 'SENT', label: t('Bhej diye'), icon: MessageCircle },
          { id: 'RATED', label: t('Rating aayi'), icon: Star, count: s?.rated ?? null },
          { id: 'LOW', label: t('Kam rating'), icon: ThumbsDown, count: s?.low ?? null },
          { id: 'ALL', label: t('Sab'), icon: CheckCircle2 },
        ]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : q.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
          : !q.data?.items.length ? (
            <EmptyState icon={<Star className="h-5 w-5" />} title={t('Is list me kuch nahi')}
              description={filter === 'TO_SEND' ? t('Pichhle 14 din ke deliver orders ke link banane ke liye upar wala button dabayein.') : undefined}
              action={filter === 'TO_SEND' ? <Button leftIcon={<Plus className="h-4 w-4" />} loading={make.isPending} onClick={() => make.mutate()}>{t('Links banayein')}</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {q.data.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-semibold text-slate-900">
                      {r.customerName || t('Naam nahi')}
                      <button type="button" onClick={() => setOrderId(r.channelOrderId)} className="font-mono text-[0.75rem] font-normal text-brand-700 hover:underline">#{r.orderNo}</button>
                      {r.rating ? <Stars value={r.rating} /> : null}
                    </p>
                    {r.comment ? <p className="mt-0.5 text-[0.8125rem] text-slate-700">“{r.comment}”</p> : null}
                    <p className="text-[0.6875rem] text-slate-400">
                      {r.customerPhone}{r.ratedAt ? ` · ${t('Rating {{ago}}', { ago: timeAgo(r.ratedAt) })}` : r.sentAt ? ` · ${t('Bheja {{ago}}', { ago: timeAgo(r.sentAt) })}` : ` · ${t('Bana {{ago}}', { ago: timeAgo(r.createdAt) })}`}
                      {r.source === 'AUTOMATION' ? ` · ${t('Automation')}` : ''}
                    </p>
                  </div>
                  {!r.ratedAt && (
                    <div className="flex items-center gap-1.5">
                      <button type="button" title={t('Link copy')} aria-label={t('Link copy')} onClick={() => { void navigator.clipboard?.writeText(rateUrl(r.token)); toast.success(t('Link copy')); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Copy className="h-4 w-4" /></button>
                      {r.sentAt && <Button size="xs" variant="ghost" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => sent.mutate({ id: r.id, undo: true })}>{t('Wapas')}</Button>}
                      <Button size="xs" variant="success" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} disabled={!waNumber(r.customerPhone)} onClick={() => send(r)}>
                        {r.sentAt ? t('Dobara') : t('WhatsApp')}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </section>

      {settingsOpen && <ReviewLinksModal onClose={() => setSettingsOpen(false)} />}
      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide
          title={t('Reviews — aasaan tareeqa')}
          onClose={guide.close}
          flow={[
            { label: t('Deliver'), icon: Truck, color: '#0d9488' },
            { label: t('Review link'), hint: t('Khud ya button se'), icon: Star, color: '#d97706' },
            { label: t('WhatsApp'), hint: t('Ek ek karke'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Rating'), hint: t('1–5 star + baat'), icon: CheckCircle2, color: '#7c3aed' },
          ]}
          steps={[
            { icon: Plus, color: '#2563eb', title: t('Link banana'), text: t('Har deliver order ka apna link hota hai. "14 din ke links banayein" ya Automation recipe se khud.') },
            { icon: MessageCircle, color: '#16a34a', title: t('Bhejna'), text: t('Hara button WhatsApp kholta hai — "Delivered" wala message aur rating link. Message "WhatsApp messages" page par badlein.') },
            { icon: Star, color: '#d97706', title: t('Rating'), text: t('Customer login ke bagair 1–5 star aur apni baat likhta hai. Yahan aur Reports me dikhti hai.') },
            { icon: ExternalLink, color: '#7c3aed', title: t('Google / Facebook'), text: t('4–5 star dene wale ko aap ke Google ya Facebook review page ka button dikhta hai.') },
            { icon: ThumbsDown, color: '#e11d48', title: t('Kam rating'), text: t('3 ya kam star wale ko foran call karein — masla hal ho to customer wapas aata hai.') },
          ]}
          shortcuts={[['/', t('dhoondein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function ReviewLinksModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['retention-settings'], queryFn: retentionApi.settings });
  const [links, setLinks] = useState<ReviewLink[] | null>(null);
  const [from, setFrom] = useState<number | null>(null);
  const list = links ?? q.data?.reviews.links ?? [];
  const linksFrom = from ?? q.data?.reviews.linksFrom ?? 4;
  const save = useMutation({
    mutationFn: () => retentionApi.saveSettings({ reviews: { links: list.filter((l) => l.label && l.url), linksFrom } }),
    onSuccess: () => { toast.success(t('Save ho gaya')); qc.invalidateQueries({ queryKey: ['retention-settings'] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const set = (i: number, patch: Partial<ReviewLink>) => setLinks(list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <Modal open onClose={onClose} title={t('Review links')} description={t('Achhi rating ke baad customer ko ye buttons dikhte hain (sirf https:// link).')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{t('Save karein')}</Button></>}>
      {q.isLoading ? <Skeleton className="h-32 rounded-xl" /> : (
        <Card className="rounded-2xl" flush>
          <div className="space-y-2 p-4">
            {list.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <Input wrapperClassName="w-36" label={i === 0 ? t('Naam') : undefined} value={l.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Google" maxLength={40} />
                <Input wrapperClassName="flex-1" label={i === 0 ? t('Link') : undefined} value={l.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://g.page/r/…" />
                <button type="button" aria-label={t('Hatayein')} onClick={() => setLinks(list.filter((_, j) => j !== i))} className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {list.length < 5 && <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLinks([...list, { label: '', url: '' }])}>{t('Link jorein')}</Button>}
            <Select wrapperClassName="pt-2" label={t('Kitne star par links dikhayein')} value={String(linksFrom)} onChange={(e) => setFrom(Number(e.target.value))}
              options={[5, 4, 3].map((n) => ({ value: String(n), label: t('{{value}} star ya zyada', { value: n }) }))} />
          </div>
        </Card>
      )}
    </Modal>
  );
}
