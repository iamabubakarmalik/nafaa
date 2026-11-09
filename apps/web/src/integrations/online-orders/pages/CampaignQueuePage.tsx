/**
 * The one-by-one queue of a WhatsApp campaign. The next customer waits on
 * top: "WhatsApp kholein" opens the chat with the message filled in and marks
 * it sent, then the next one comes up. Replies are ticked by hand; an order
 * within 7 days shows as converted.
 *
 * Keys: Enter open WhatsApp · S skip · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Copy, GraduationCap, MessageCircle, MessageSquareReply, SkipForward, ShoppingBag, Send, Undo2, Users } from 'lucide-react';
import { Badge, Button, EmptyState, Kbd, PageHero, PageShell, Skeleton, ViewTabs, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { retentionApi, type CampaignRecipient } from '../api/retention.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { timeAgo, waNumber } from '../lib/labels';
import { segmentLabel, templateInfo, waLink } from '../lib/retention';

type Tab = 'PENDING' | 'SENT' | 'CONVERTED' | 'ALL';

export default function CampaignQueuePage() {
  const { id = '' } = useParams();
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [orderId, setOrderId] = useState<string | null>(null);
  const key = ['online-campaign', id];
  const q = useQuery({ queryKey: key, queryFn: () => retentionApi.campaign(id), enabled: !!id });
  const mark = useMutation({
    mutationFn: (v: { rid: string; status?: 'SENT' | 'SKIPPED' | 'PENDING'; replied?: boolean }) => retentionApi.markRecipient(id, v.rid, { status: v.status, replied: v.replied }),
    onMutate: async (v) => {
      // Move the queue on at once; the server answer only confirms it.
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData(key, (old: typeof q.data) => old && ({
        ...old,
        recipients: old.recipients.map((r) => (r.id === v.rid ? { ...r, ...(v.status && { status: v.status, sentAt: v.status === 'SENT' ? (r.sentAt ?? new Date().toISOString()) : v.status === 'PENDING' ? null : r.sentAt }), ...(v.replied !== undefined && { replied: v.replied }) } : r)),
      }));
    },
    onError: (e) => { toast.error(apiErrorMessage(e)); qc.invalidateQueries({ queryKey: key }); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['online-campaigns'] }); },
  });

  const c = q.data;
  const next = c?.recipients.find((r) => r.status === 'PENDING') ?? null;
  const counts = useMemo(() => {
    const rs = c?.recipients ?? [];
    return {
      sent: rs.filter((r) => r.status === 'SENT').length,
      pending: rs.filter((r) => r.status === 'PENDING').length,
      skipped: rs.filter((r) => r.status === 'SKIPPED').length,
      replied: rs.filter((r) => r.replied).length,
      converted: rs.filter((r) => r.converted).length,
      revenue: rs.reduce((s, r) => s + (r.converted?.total ?? 0), 0),
    };
  }, [c]);
  const send = (r: CampaignRecipient) => {
    const href = waLink(waNumber(r.phone), r.text);
    if (!href) { toast.error(t('Number sahi nahi')); return; }
    window.open(href, '_blank', 'noopener');
    mark.mutate({ rid: r.id, status: 'SENT' });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !next) return;
      if (e.key === 'Enter') { e.preventDefault(); send(next); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); mark.mutate({ rid: next.id, status: 'SKIPPED' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const list = (c?.recipients ?? []).filter((r) => tab === 'ALL' || (tab === 'CONVERTED' ? !!r.converted : tab === 'SENT' ? r.status !== 'PENDING' : r.status === 'PENDING'));
  const info = c ? templateInfo(c.template) : null;

  return (
    <PageShell>
      <PageHero
        back="/online-store/campaigns"
        title={c?.name ?? t('Campaign')}
        chip={info ? <><info.icon />{info.label}</> : undefined}
        meta={c ? t('{{segment}} · {{count}} customers · {{when}}', { segment: segmentLabel(c.segment), count: c.recipients.length, when: timeAgo(c.createdAt) }) : undefined}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={c ? [
          { label: t('Bheje'), value: `${counts.sent}/${c.recipients.length}`, hint: t('{{count}} chhore', { count: counts.skipped }) },
          { label: t('Jawab aaya'), value: String(counts.replied) },
          { label: t('Order aaye'), value: String(counts.converted), hint: counts.sent ? `${Math.round((counts.converted / counts.sent) * 100)}%` : '—' },
          { label: t('Sale'), value: money(counts.revenue) },
        ] : [{ label: t('Bheje'), value: '' }, { label: t('Jawab aaya'), value: '' }, { label: t('Order aaye'), value: '' }, { label: t('Sale'), value: '' }]}
      />

      {q.isError ? (
        <EmptyState title={t('Campaign nahi khula')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : !c ? <Skeleton className="h-48 rounded-3xl" /> : (
        <>
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
            {next ? (
              <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{t('Agla customer · {{count}} baqi', { count: counts.pending })}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{next.name || t('Naam nahi')}</p>
                  <p className="font-mono text-[0.875rem] text-slate-500">{next.phone}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="success" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => send(next)}>{t('WhatsApp kholein')} <Kbd className="ms-1">↵</Kbd></Button>
                    <Button variant="secondary" leftIcon={<SkipForward className="h-4 w-4" />} onClick={() => mark.mutate({ rid: next.id, status: 'SKIPPED' })}>{t('Chhorein')} <Kbd className="ms-1">S</Kbd></Button>
                    <Button variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={() => { void navigator.clipboard?.writeText(next.text); toast.success(t('Message copy')); }}>{t('Copy')}</Button>
                  </div>
                </div>
                <div className="rounded-2xl bg-brand-50 p-4 text-[0.875rem] text-brand-950 ring-1 ring-brand-100 lg:col-span-3">
                  <p className="whitespace-pre-line">{next.text}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-50 text-success-600"><CheckCircle2 className="h-6 w-6" /></span>
                <p className="mt-3 font-semibold text-slate-900">{t('Sab ko bhej diya')}</p>
                <p className="mt-1 text-[0.8125rem] text-slate-500">{t('7 din tak jo order aayenge woh yahan "Order aaya" me dikhenge.')}</p>
              </div>
            )}
          </section>

          <ViewTabs value={tab} onChange={setTab}
            tabs={[
              { id: 'PENDING', label: t('Baqi'), icon: Users, count: counts.pending },
              { id: 'SENT', label: t('Bheje / chhore'), icon: Send, count: counts.sent + counts.skipped },
              { id: 'CONVERTED', label: t('Order aaya'), icon: ShoppingBag, count: counts.converted },
              { id: 'ALL', label: t('Sab'), icon: MessageCircle, count: c.recipients.length },
            ]} />

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {!list.length ? <EmptyState icon={<Users className="h-5 w-5" />} title={t('Is list me koi nahi')} /> : (
              <ul className="divide-y divide-slate-100">
                {list.map((r) => (
                  <li key={r.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5 sm:flex-nowrap sm:px-5', r.converted && 'bg-success-50/40')}>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 text-[0.875rem] font-medium text-slate-900">
                        {r.name || t('Naam nahi')}
                        {r.status === 'SENT' && <Badge variant="success">{t('Bheja {{when}}', { when: timeAgo(r.sentAt) })}</Badge>}
                        {r.status === 'SKIPPED' && <Badge variant="default">{t('Chhora')}</Badge>}
                        {r.replied && <Badge variant="info">{t('Jawab aaya')}</Badge>}
                      </span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{r.phone} · {r.text}</span>
                    </span>
                    {r.converted && (
                      <button type="button" onClick={() => setOrderId(r.converted!.orderId)} className="rounded-full bg-success-100 px-2.5 py-1 text-[0.75rem] font-semibold text-success-800 hover:bg-success-200">
                        {t('Order #{{no}} · {{total}}', { no: r.converted.no, total: money(r.converted.total) })}
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      {r.status === 'SENT' && (
                        <Button size="xs" variant={r.replied ? 'secondary' : 'ghost'} leftIcon={<MessageSquareReply className="h-3.5 w-3.5" />} onClick={() => mark.mutate({ rid: r.id, replied: !r.replied })}>
                          {r.replied ? t('Jawab ✓') : t('Jawab aaya')}
                        </Button>
                      )}
                      {r.status === 'PENDING'
                        ? <Button size="xs" variant="success" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => send(r)}>{t('WhatsApp')}</Button>
                        : <Button size="xs" variant="ghost" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => mark.mutate({ rid: r.id, status: 'PENDING' })}>{t('Wapas')}</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide
          title={t('Campaign queue — aasaan tareeqa')}
          onClose={guide.close}
          flow={[
            { label: t('Agla customer'), icon: Users, color: '#2563eb' },
            { label: t('WhatsApp kholein'), hint: t('Message tayyar'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Send dabayein'), hint: t('WhatsApp me'), icon: Send, color: '#0d9488' },
            { label: t('Order aaya'), hint: t('7 din me'), icon: ShoppingBag, color: '#7c3aed' },
          ]}
          steps={[
            { icon: MessageCircle, color: '#16a34a', title: t('Bhejna'), text: t('"WhatsApp kholein" (ya Enter) chat kholta hai, customer ko "Bheja" me daal deta hai, aur agla customer upar aa jata hai.') },
            { icon: SkipForward, color: '#64748b', title: t('Chhorna'), text: t('Kisi ko nahi bhejna to "Chhorein" (S). Ghalti ho to "Wapas" se dobara list me.') },
            { icon: MessageSquareReply, color: '#2563eb', title: t('Jawab'), text: t('Customer ne jawab diya to "Jawab aaya" dabayein — campaign ka asar samajh aata hai.') },
            { icon: ShoppingBag, color: '#7c3aed', title: t('Order'), text: t('Usi phone se 7 din me order aaye to khud "Order aaya" lag jata hai.') },
          ]}
          shortcuts={[['Enter', t('WhatsApp kholein')], ['S', t('Chhorein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}
