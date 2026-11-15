/**
 * Market reviews: filter by stars or by "no reply yet", answer a review,
 * hide it from the shop page or report it to Nafaa.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EyeOff, Flag, MessageSquareReply, Star } from 'lucide-react';
import {
  Avatar, Badge, Button, EmptyState, FilterBar, FilterMenu, Modal, PageHero, PageShell, Skeleton, Textarea, ViewTabs,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatRelative } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { errorText, marketApi, type MarketReview } from '../api/market.api';
import { GuideButton, Pager, TONE, stars } from '../components/parts';

type Tab = 'all' | 'unanswered';
type Rating = '' | '5' | '4' | '3' | '2' | '1';

export default function MarketReviewsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [tab, setTab] = useState<Tab>('all');
  const [rating, setRating] = useState<Rating>('');
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState<MarketReview | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => { setPage(1); }, [tab, rating]);
  const params = { rating: rating ? Number(rating) : undefined, hasReply: tab === 'unanswered' ? false : undefined, page, limit: 20 };
  const listQ = useQuery({ queryKey: ['market', 'reviews', params], queryFn: () => marketApi.reviews.list(params), placeholderData: (prev) => prev });
  const items = listQ.data?.items ?? [];
  const counts = listQ.data?.counts;
  const meta = listQ.data?.meta;

  const done = (msgText: string) => { toast.success(msgText); qc.invalidateQueries({ queryKey: ['market'] }); };
  const reply = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => marketApi.reviews.reply(id, body),
    onSuccess: () => { setReplying(null); setText(''); done(t('Jawab bhej diya')); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const hide = useMutation({
    mutationFn: (id: string) => marketApi.reviews.hide(id),
    onSuccess: () => done(t('Review chhupa diya')),
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const report = useMutation({
    mutationFn: ({ id, why }: { id: string; why: string }) => marketApi.reviews.report(id, why),
    onSuccess: () => { setReporting(null); setReason(''); done(t('Report bhej di — Nafaa team dekhegi')); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const RATINGS: Array<{ value: Rating; label: string }> = [
    { value: '', label: t('Sab stars') },
    ...(['5', '4', '3', '2', '1'] as const).map((r) => ({ value: r, label: t('{{count}} star', { count: Number(r) }) })),
  ];
  const fiveStar = counts?.byStar?.['5'];

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Reviews')}
        chip={<><Star /> {t('Customer kya kehte hain')}</>}
        loading={listQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={counts ? [
          { label: t('Average rating'), value: counts.avgRating ? Number(counts.avgRating).toFixed(1) : '—' },
          { label: t('Kul reviews'), value: counts.total },
          { label: t('Bina jawab'), value: counts.unresponded },
          ...(fiveStar != null ? [{ label: t('5 star'), value: fiveStar }] : []),
        ] : undefined}
      />

      <FilterBar>
        <FilterMenu icon={Star} label={t('Stars')} value={rating} active={!!rating} onChange={setRating} options={RATINGS} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={[
        { id: 'all', label: t('Sab'), icon: Star, count: counts?.total ?? null },
        { id: 'unanswered', label: t('Bina jawab'), icon: MessageSquareReply, count: counts?.unresponded ?? null },
      ]} />

      {listQ.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={<Star className="h-6 w-6" />} title={tab === 'unanswered' ? t('Sab reviews ka jawab de diya') : t('Abhi koi review nahi')}
          description={t('Order mukammal hone ke baad customer review de sakta hai.')} />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} data-nav-row className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', r.isHidden && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <Avatar name={r.customer?.fullName ?? '?'} url={r.customer?.avatarUrl ?? undefined} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.customer?.fullName || t('Customer')}</span>
                    <span className={cn('text-sm tracking-tight', r.rating >= 4 ? 'text-amber-500' : r.rating === 3 ? 'text-amber-600' : 'text-rose-600')} aria-label={t('{{count}} star', { count: r.rating })}>{stars(r.rating)}</span>
                    {r.isVerifiedPurchase && <Badge size="xs" variant="success">{t('Khareeda hua')}</Badge>}
                    {r.isHidden && <Badge size="xs">{t('Chhupa hua')}</Badge>}
                    <span className="ms-auto text-[0.75rem] text-slate-500">{formatRelative(r.createdAt)}</span>
                  </div>
                  {r.title && <p className="mt-1 text-sm font-semibold text-slate-800">{r.title}</p>}
                  {r.comment && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>}
                  {r.imageUrls.length > 0 && (
                    <div className="mt-2 flex gap-2">{r.imageUrls.slice(0, 4).map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />)}</div>
                  )}
                  {r.replyFromShop && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[0.75rem] font-semibold text-slate-500">{t('Aap ka jawab')}</p>
                      <p className="whitespace-pre-line text-sm text-slate-700">{r.replyFromShop}</p>
                    </div>
                  )}
                  {replying === r.id ? (
                    <div className="mt-3 space-y-2">
                      <Textarea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Shukriya ya masle ka hal likhein…')}
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim()) reply.mutate({ id: r.id, body: text.trim() }); }} />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setReplying(null); setText(''); }}>{t('Wapas')}</Button>
                        <Button size="sm" disabled={!text.trim()} loading={reply.isPending} onClick={() => reply.mutate({ id: r.id, body: text.trim() })}>{t('Jawab bhejein')}</Button>
                      </div>
                    </div>
                  ) : canEdit && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" data-nav-open leftIcon={<MessageSquareReply className="h-3.5 w-3.5" />}
                        onClick={() => { setReplying(r.id); setText(r.replyFromShop ?? ''); }}>{r.replyFromShop ? t('Jawab badlein') : t('Jawab dein')}</Button>
                      {!r.isHidden && <Button size="sm" variant="ghost" leftIcon={<EyeOff className="h-3.5 w-3.5" />} onClick={() => hide.mutate(r.id)} disabled={hide.isPending}>{t('Chhupayein')}</Button>}
                      <Button size="sm" variant="ghost" leftIcon={<Flag className="h-3.5 w-3.5" />} onClick={() => setReporting(r)}>{t('Report')}</Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && <Pager page={page} totalPages={meta.totalPages} onPage={setPage} />}

      <Modal open={!!reporting} onClose={() => setReporting(null)} title={t('Review report karein')} description={t('Jhoota, gaali wala ya kisi aur dukaan ka review? Nafaa team dekhegi.')}
        footer={<div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReporting(null)}>{t('Wapas')}</Button>
          <Button variant="danger" disabled={reason.trim().length < 3} loading={report.isPending} onClick={() => reporting && report.mutate({ id: reporting.id, why: reason.trim() })}>{t('Report bhejein')}</Button>
        </div>}>
        <Textarea label={t('Wajah')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </Modal>

      {guide.isOpen && (
        <PageGuide title={t('Reviews')} onClose={guide.close}
          flow={[
            { label: t('Order mukammal'), icon: Star, color: TONE.green },
            { label: t('Customer ka review'), icon: Star, color: TONE.amber },
            { label: t('Aap ka jawab'), hint: t('Sab ko dikhta hai'), icon: MessageSquareReply, color: TONE.blue },
          ]}
          steps={[
            { icon: MessageSquareReply, color: TONE.blue, title: t('Jawab dein'), text: t('Har review ka jawab dein, khaas kar kam stars wale ka. Naye customer jawab dekh kar bharosa karte hain.') },
            { icon: EyeOff, color: TONE.slate, title: t('Chhupayein'), text: t('Ghalat jagah ya bekaar review ko shop page se chhupa dein.') },
            { icon: Flag, color: TONE.rose, title: t('Report'), text: t('Jhoota ya gaali wala review Nafaa team ko report karein.') },
          ]}
          tips={[t('Jawab likhte waqt Ctrl+Enter se bhej dein.')]}
          shortcuts={[['Enter', t('jawab dein')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
