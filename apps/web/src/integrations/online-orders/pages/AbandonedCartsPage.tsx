/**
 * Abandoned carts: checkouts the customer left without ordering (Shopify,
 * and custom websites that send `checkout.abandoned`). One click opens
 * WhatsApp with the cart link and marks the cart contacted; a later order
 * from the same phone or email marks it recovered.
 *
 * Keys: R refresh · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2, CircleDollarSign, Clock, GraduationCap, MessageCircle, RefreshCw, Settings2, ShoppingBag, ShoppingCart, Undo2, Users,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { growthApi, type AbandonedCart, type CartStatus } from '../api/growth.api';
import { timeAgo, waNumber } from '../lib/labels';
import { fillTemplate, templateText, useWaTemplates } from '../lib/waTemplates';

export default function AbandonedCartsPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name);
  const [status, setStatus] = useState<CartStatus>('OPEN');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const id = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(id); }, [search]);

  const q = useQuery({
    queryKey: ['abandoned-carts', status, term],
    queryFn: () => growthApi.abandoned({ status, search: term || undefined }),
    placeholderData: (p) => p,
  });
  const saved = useWaTemplates().data?.templates;
  const refresh = () => qc.invalidateQueries({ queryKey: ['abandoned-carts'] });
  const sync = useMutation({
    mutationFn: growthApi.syncAbandoned,
    onSuccess: (r) => {
      const bad = r.filter((x) => !x.ok);
      if (bad.length) toast.error(t('Shopify se carts nahi aaye'), { description: bad.map((b) => `${b.channel}: ${b.error ?? ''}`).join('\n') });
      else toast.success(t('Carts taaza ho gaye'));
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const contact = useMutation({
    mutationFn: ({ id, undo }: { id: string; undo?: boolean }) => growthApi.contacted(id, undo),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); sync.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sync]);

  const d = q.data;
  const s = d?.stats;
  const noSource = d && !d.sources.shopify.length && !d.sources.website.length;

  const sendWa = (c: AbandonedCart) => {
    const wa = waNumber(c.customerPhone);
    if (!wa) return;
    const text = fillTemplate(templateText('cart', saved), {
      name: c.customerName ?? '', shop: shopName ?? '', cartUrl: c.recoveryUrl ?? '',
      items: c.items.slice(0, 3).map((i) => `${i.quantity} × ${i.name}`).join(', '), total: money(c.total),
    });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    contact.mutate({ id: c.id });
  };

  return (
    <PageShell>
      <PageHero
        title={t('Abandoned carts')}
        chip={<><ShoppingCart />{t('Pichhle {{days}} din', { days: d?.days ?? 30 })}</>}
        meta={t('Jo customer checkout chhod gaye — WhatsApp par cart link bhejein, wapas layein')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} title={t('Taaza karein (R)')} className={heroButton}>
            <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} /> <span className="hidden sm:inline">{t('Taaza karein')}</span>
          </button>
          <Link to="/online-store/whatsapp-templates" className={heroButton}><Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Message')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: t('Carts'), value: String(s.carts), hint: money(s.value) },
          { label: t('Wapas aaye'), value: String(s.recovered), hint: `${s.rate}%` },
          { label: t('Wapas sale'), value: money(s.recoveredValue) },
        ] : [{ label: t('Carts'), value: '' }, { label: t('Wapas aaye'), value: '' }, { label: t('Wapas sale'), value: '' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShoppingCart} color="#2563eb" label={t('Chhode hue carts')} value={String(s.carts)} hint={money(s.value)} />
          <KpiCard icon={MessageCircle} color="#16a34a" label={t('Rabta kiya')} value={String(s.contacted)} hint={s.carts ? `${Math.round((s.contacted / s.carts) * 100)}%` : '—'} />
          <KpiCard icon={CheckCircle2} color="#0d9488" label={t('Wapas aaye')} value={String(s.recovered)} hint={t('{{count}} message ke baad', { count: s.recoveredAfterContact })} />
          <KpiCard icon={CircleDollarSign} color="#7c3aed" label={t('Wapas sale')} value={money(s.recoveredValue)} hint={t('Recovery rate {{rate}}%', { rate: s.rate })} />
        </>}
      </KpiRow>

      {d && (d.sources.woocommerce.length > 0 || noSource) && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {noSource && <p>{t('Abhi Shopify ya apni website nahi juri. Shopify jorne par carts khud yahan aayenge.')}</p>}
          {d.sources.woocommerce.length > 0 && (
            <p className="flex items-center gap-2"><BrandLogo name="woocommerce" size={18} />
              {t('WooCommerce ke chhode hue carts — jaldi aa raha hai (WooCommerce khud ye list nahi deta).')}
              <span className="rounded-full bg-amber-100 px-1.5 text-[0.625rem] font-semibold uppercase">{t('Soon')}</span>
            </p>
          )}
        </div>
      )}

      <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder={t('Naam, phone ya email…')} label={t('Cart search')} />} />

      <ViewTabs value={status} onChange={setStatus}
        tabs={[
          { id: 'OPEN', label: t('Naye'), icon: Clock },
          { id: 'CONTACTED', label: t('Rabta kiya'), icon: MessageCircle },
          { id: 'RECOVERED', label: t('Wapas aaye'), icon: CheckCircle2 },
          { id: 'ALL', label: t('Sab'), icon: ShoppingCart },
        ]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          : q.isError ? <EmptyState title={t('List nahi khuli')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
          : !d?.items.length ? <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title={t('Koi cart nahi')} description={status === 'OPEN' ? t('Abhi koi naya chhoda hua cart nahi.') : t('Is list me abhi kuch nahi.')} />
          : (
            <ul className="divide-y divide-slate-100">
              {d.items.map((c) => <CartRow key={c.id} c={c} money={money} busy={contact.isPending && contact.variables?.id === c.id}
                onWa={() => sendWa(c)} onUndo={() => contact.mutate({ id: c.id, undo: true })} />)}
            </ul>
          )}
      </section>

      {guide.isOpen && (
        <PageGuide
          title={t('Abandoned carts — aasaan tareeqa')}
          description={t('Customer ne cart bhara, checkout khola aur chala gaya. Ek message se aksar wapas aa jata hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Cart chhoda'), hint: t('Shopify ya website'), icon: ShoppingCart, color: '#2563eb' },
            { label: t('WhatsApp'), hint: t('Cart link ke saath'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Order aaya'), hint: t('Usi phone se'), icon: ShoppingBag, color: '#0d9488' },
            { label: t('Wapas aaya'), hint: t('Khud nishan lagta hai'), icon: CheckCircle2, color: '#7c3aed' },
          ]}
          steps={[
            { icon: RefreshCw, color: '#2563eb', title: t('Taaza list'), text: t('Shopify ke carts page kholne par khud aate hain. Abhi chahiye to "Taaza karein" dabayein.') },
            { icon: MessageCircle, color: '#16a34a', title: t('Ek click message'), text: t('Hara button WhatsApp kholta hai, message me cart ka link hota hai. Cart "Rabta kiya" me chala jata hai.') },
            { icon: Users, color: '#0d9488', title: t('Wapas aaya'), text: t('14 din me usi phone ya email se order aaye to cart "Wapas aaye" me aa jata hai.') },
            { icon: Settings2, color: '#7c3aed', title: t('Apna message'), text: t('Message ka text "WhatsApp messages" page par badal sakte hain.') },
          ]}
          shortcuts={[['R', t('Taaza karein')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function CartRow({ c, money, busy, onWa, onUndo }: { c: AbandonedCart; money: (n: number) => string; busy: boolean; onWa: () => void; onUndo: () => void }) {
  const wa = waNumber(c.customerPhone);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <BrandLogo name={c.source === 'SHOPIFY' ? 'shopify' : 'website'} size={28} title={c.channel ?? undefined} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[0.875rem] font-semibold text-slate-900">
          <span className="truncate">{c.customerName || t('Naam nahi')}</span>
          {c.customerPhone && <span className="font-mono text-[0.75rem] font-normal text-slate-500">{c.customerPhone}</span>}
          {c.customerCity && <span className="text-[0.75rem] font-normal text-slate-500">· {c.customerCity}</span>}
        </p>
        <p className="truncate text-[0.75rem] text-slate-500" title={c.items.map((i) => `${i.quantity} × ${i.name}`).join('\n')}>
          {c.items.slice(0, 3).map((i) => `${i.quantity} × ${i.name}${i.variant ? ` (${i.variant})` : ''}`).join(', ') || t('Items nahi')}
          {c.items.length > 3 ? ` · +${c.items.length - 3}` : ''}
        </p>
        <p className="text-[0.6875rem] text-slate-400">
          {timeAgo(c.abandonedAt)}{c.channel ? ` · ${c.channel}` : ''}{c.contactedAt ? ` · ${t('Message {{ago}}', { ago: timeAgo(c.contactedAt) })}` : ''}
          {!c.customerPhone && c.customerEmail ? ` · ${c.customerEmail}` : ''}
        </p>
      </div>
      <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(c.total)}</span>
      {c.recoveredAt ? (
        c.recoveredOrderId
          ? <Link to={`/online-orders?search=${encodeURIComponent(c.recoveredOrderNo ?? '')}`} className="rounded-full bg-success-50 px-2.5 py-1 text-[0.75rem] font-semibold text-success-700">{t('Order #{{no}}', { no: c.recoveredOrderNo ?? '' })}</Link>
          : <span className="rounded-full bg-success-50 px-2.5 py-1 text-[0.75rem] font-semibold text-success-700">{t('Checkout poora hua')}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          {c.contactedAt && <Button size="xs" variant="ghost" loading={busy} onClick={onUndo} leftIcon={<Undo2 className="h-3.5 w-3.5" />}>{t('Wapas')}</Button>}
          <Button size="xs" variant="success" disabled={!wa} loading={busy} onClick={onWa} leftIcon={<MessageCircle className="h-3.5 w-3.5" />}>
            {c.contactedAt ? t('Dobara') : t('WhatsApp')}
          </Button>
        </div>
      )}
    </li>
  );
}
