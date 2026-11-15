/**
 * Market offers: coupon codes and Sales shown to Market customers. Create,
 * edit, pause / resume and remove; filter by status.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgePercent, Filter, Pause, Pencil, Play, Plus, Tag, Ticket, Trash2, Zap } from 'lucide-react';
import {
  Badge, Button, EmptyState, FilterBar, FilterMenu, IconButton, Kbd, PageHero, PageShell, SearchField, SkeletonTable,
  Table, TBody, Td, Th, THead, Tr, confirmDialog, heroPrimaryButton, type BadgeVariant,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatDate, formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { msg, t } from '@core/i18n';
import { errorText, marketApi, type MarketOffer, type PromoStatus } from '../api/market.api';
import { num, useMarketProfile } from '../hooks/useMarket';
import { OfferModal } from '../components/OfferModal';
import { GuideButton, Pager, TONE } from '../components/parts';

const STATUS: Record<PromoStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: msg('Chalu'), variant: 'success' },
  SCHEDULED: { label: msg('Shuru hoga'), variant: 'info' },
  PAUSED: { label: msg('Ruka hua'), variant: 'warning' },
  DRAFT: { label: msg('Draft'), variant: 'default' },
  EXPIRED: { label: msg('Khatam'), variant: 'default' },
  ARCHIVED: { label: msg('Archive'), variant: 'default' },
};
const PAGE = 30;

export default function MarketOffersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.DISCOUNTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | PromoStatus>('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ open: boolean; offer: MarketOffer | null }>({ open: false, offer: null });
  const profileQ = useMarketProfile();

  useEffect(() => { const h = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(h); }, [search]);
  useEffect(() => { setPage(1); }, [q, status]);

  const params = { search: q || undefined, status: status || undefined, limit: PAGE, offset: (page - 1) * PAGE };
  const listQ = useQuery({ queryKey: ['market', 'offers', params], queryFn: () => marketApi.offers.list(params), placeholderData: (prev) => prev });
  const items = listQ.data?.items ?? [];
  const counts = listQ.data?.counts ?? {};
  const total = listQ.data?.total ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['market', 'offers'] });
  const setState = useMutation({
    mutationFn: ({ o, to }: { o: MarketOffer; to: PromoStatus }) => marketApi.offers.update(o.id, { status: to }),
    onSuccess: (_d, v) => { toast.success(v.to === 'PAUSED' ? t('Offer rok diya') : t('Offer chalu ho gaya')); invalidate(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (o: MarketOffer) => marketApi.offers.remove(o.id),
    onSuccess: () => { toast.success(t('Offer hata diya')); invalidate(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setModal({ open: true, offer: null }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const value = (o: MarketOffer) => (o.discountType === 'PERCENT' ? `${num(o.discountValue)}%` : o.discountType === 'FIXED' ? formatPKR(num(o.discountValue)) : t('Free delivery'));
  const used = items.reduce((s, o) => s + (o.usageCount ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Offers')}
        chip={<><BadgePercent /> {t('Coupon aur Sale')}</>}
        loading={listQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<>
          <GuideButton onClick={guide.open} />
          {canEdit && <button type="button" className={heroPrimaryButton} onClick={() => setModal({ open: true, offer: null })}><Plus className="h-4 w-4" /> {t('Naya offer')}</button>}
        </>}
        stats={[
          { label: t('Chalu'), value: counts.ACTIVE ?? 0 },
          { label: t('Shuru honge'), value: counts.SCHEDULED ?? 0 },
          { label: t('Ruke hue'), value: counts.PAUSED ?? 0 },
          { label: t('Is safhe par istemal'), value: used },
        ]}
      />

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam ya coupon code…')} label={t('Search')}
          trailing={canEdit ? <span className="hidden items-center text-[0.75rem] text-slate-500 lg:inline-flex"><Kbd>N</Kbd>&nbsp;{t('naya')}</span> : undefined} />}>
        <FilterMenu icon={Filter} label={t('Halat')} value={status} active={!!status} onChange={setStatus}
          options={[{ value: '' as const, label: t('Sab') }, ...(Object.keys(STATUS) as PromoStatus[]).map((s) => ({ value: s, label: t(STATUS[s].label) }))]} />
      </FilterBar>

      {listQ.isLoading ? <SkeletonTable /> : !items.length ? (
        <EmptyState icon={<Ticket className="h-6 w-6" />} title={t('Abhi koi offer nahi')} description={t('Coupon code ya Sale banayein — Market par customer ko dikhega.')}
          action={canEdit ? <Button onClick={() => setModal({ open: true, offer: null })} leftIcon={<Plus className="h-4 w-4" />}>{t('Naya offer')}</Button> : undefined} />
      ) : (
        <Table minWidth="48rem">
          <THead><Tr><Th>{t('Offer')}</Th><Th>{t('Discount')}</Th><Th align="right">{t('Kam se kam order')}</Th><Th align="right">{t('Istemal')}</Th><Th>{t('Muddat')}</Th><Th>{t('Halat')}</Th><Th /></Tr></THead>
          <TBody>
            {items.map((o) => (
              <Tr key={o.id} data-nav-row>
                <Td>
                  <button type="button" data-nav-open disabled={!canEdit} onClick={() => setModal({ open: true, offer: o })} className="flex items-center gap-2.5 text-start">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{o.type === 'FLASH_SALE' ? <Zap className="h-4 w-4" /> : <Tag className="h-4 w-4" />}</span>
                    <span>
                      <span className="block font-semibold text-slate-900">{o.title}</span>
                      {o.couponCode ? <span className="dir-ltr block font-mono text-[0.75rem] text-slate-500">{o.couponCode}</span> : <span className="block text-[0.75rem] text-slate-500">{t('Sale')}</span>}
                    </span>
                  </button>
                </Td>
                <Td className="font-semibold text-slate-900">{value(o)}</Td>
                <Td align="right" className="tabular-nums">{num(o.minOrderAmount) ? formatPKR(num(o.minOrderAmount)) : '—'}</Td>
                <Td align="right" className="tabular-nums">{o.usageCount ?? 0}{o.usageLimit ? <span className="text-slate-400"> / {o.usageLimit}</span> : null}</Td>
                <Td className="text-[0.8125rem] text-slate-600">{formatDate(o.startsAt)} – {formatDate(o.endsAt)}</Td>
                <Td><Badge size="xs" variant={STATUS[o.status]?.variant ?? 'default'}>{t(STATUS[o.status]?.label ?? o.status)}</Badge></Td>
                <Td align="right">
                  {canEdit && (
                    <span className="inline-flex gap-1">
                      {o.status === 'ACTIVE' && <IconButton label={t('Rokein')} size="sm" onClick={() => setState.mutate({ o, to: 'PAUSED' })}><Pause className="h-4 w-4" /></IconButton>}
                      {o.status === 'PAUSED' && <IconButton label={t('Chalu karein')} size="sm" onClick={() => setState.mutate({ o, to: 'ACTIVE' })}><Play className="h-4 w-4" /></IconButton>}
                      <IconButton label={t('Badlein')} size="sm" onClick={() => setModal({ open: true, offer: o })}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton label={t('Hatayein')} size="sm" onClick={async () => {
                        if (await confirmDialog({ title: t('Offer hatayein?'), text: o.title, yes: t('Hatayein'), danger: true })) remove.mutate(o);
                      }}><Trash2 className="h-4 w-4" /></IconButton>
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <Pager page={page} totalPages={Math.ceil(total / PAGE)} onPage={setPage} />

      <OfferModal open={modal.open} offer={modal.offer} shopId={profileQ.data?.shopId} onClose={() => setModal({ open: false, offer: null })} />

      {guide.isOpen && (
        <PageGuide title={t('Offers')} onClose={guide.close}
          flow={[
            { label: t('Offer banayein'), icon: Plus, color: TONE.blue },
            { label: t('Market par dikhe'), icon: BadgePercent, color: TONE.violet },
            { label: t('Customer lagaye'), hint: t('Checkout par'), icon: Ticket, color: TONE.amber },
            { label: t('Bill par Discount'), icon: Tag, color: TONE.green },
          ]}
          steps={[
            { icon: Tag, color: TONE.blue, title: t('Coupon code'), text: t('Customer checkout par code likhta hai, Discount lag jata hai. WhatsApp ya Facebook par code share karein.') },
            { icon: Zap, color: TONE.amber, title: t('Sale'), text: t('Bina code ke sab customers ke liye, muddat ke andar.') },
            { icon: Pause, color: TONE.slate, title: t('Rokein ya badlein'), text: t('Offer kisi bhi waqt rok sakte hain aur dobara chalu kar sakte hain.') },
          ]}
          shortcuts={[['N', t('naya offer')], ['/', t('search')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
