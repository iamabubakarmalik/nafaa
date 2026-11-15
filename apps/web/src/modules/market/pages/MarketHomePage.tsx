/**
 * Market home: today's Market orders and sales, rating and followers, the
 * "Go live" checklist with a link to fix each item, publish / unpublish and
 * the latest orders (they open in the Online Orders board).
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bike, CheckCircle2, ChefHat, Circle, Clock, Eye, EyeOff, Image as ImageIcon, MapPin, MessageCircle, Package, Rocket, ShoppingBag,
  Star, Store, Truck, Wallet,
} from 'lucide-react';
import {
  Badge, Button, Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR, formatRelative } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { errorText, marketApi } from '../api/market.api';
import { gateLabel, marketKeys, shopGate, useMarketConfig, useMarketProfile } from '../hooks/useMarket';
import { ApprovalBanner, GuideButton, OrderStatusBadge, TONE } from '../components/parts';

/** Products a shop should list before going live. */
export const MIN_LISTED = 5;

export default function MarketHomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const profileQ = useMarketProfile();
  const configQ = useMarketConfig();
  const dashQ = useQuery({ queryKey: marketKeys.dashboard, queryFn: marketApi.dashboard, refetchInterval: 60_000 });
  const p = profileQ.data;
  const d = dashQ.data;
  const live = !!p?.isListedOnMarketplace;
  const gate = shopGate(p);
  const ordersPath = p?.integrationId ? `/online-orders?channel=${p.integrationId}` : '/market/orders';

  const publish = useMutation({
    mutationFn: () => (live ? marketApi.profile.unpublish() : marketApi.profile.publish()),
    onSuccess: () => {
      toast.success(live ? t('Dukaan Market se hata di') : t('Dukaan Market par live ho gayi'));
      qc.invalidateQueries({ queryKey: ['market'] });
    },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const listed = d?.products.listed ?? 0;
  const checks = p ? [
    { done: !!p.logoUrl, label: t('Logo lagayein'), to: '/market/profile', icon: ImageIcon },
    { done: !!p.coverUrl, label: t('Cover tasveer lagayein'), to: '/market/profile', icon: ImageIcon },
    { done: !!(p.address && p.city && p.lat != null && p.lng != null), label: t('Pata aur map par jagah'), to: '/market/profile', icon: MapPin },
    { done: !!p.workingHours && Object.keys(p.workingHours).length > 0, label: t('Dukaan ke auqaat'), to: '/market/profile', icon: Clock },
    { done: !!(p.offersDelivery || p.offersPickup || p.offersDineIn), label: t('Delivery ya pickup'), to: '/market/profile', icon: Truck },
    { done: listed >= MIN_LISTED, label: t('Kam az kam {{count}} products online', { count: MIN_LISTED }), to: '/market/products', icon: Package },
    { done: live, label: t('Dukaan publish karein'), to: '', icon: Rocket },
  ] : [];
  const doneCount = checks.filter((c) => c.done).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'e') { e.preventDefault(); navigate('/market/profile'); }
      if (k === 'p') { e.preventDefault(); navigate('/market/products'); }
      if (k === 'o') { e.preventDefault(); navigate(ordersPath); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, ordersPath]);

  return (
    <PageShell>
      <PageHero
        title={t('Nafaa Market')}
        chip={<><Store /> {gate ? gateLabel(gate, configQ.data) : t('Market')}</>}
        meta={p ? (live ? <Badge size="sm" variant="success" dot>{t('Live')}</Badge> : <Badge size="sm" variant="warning" dot>{t('Abhi live nahi')}</Badge>) : undefined}
        loading={dashQ.isLoading || profileQ.isLoading}
        busy={dashQ.isFetching && !dashQ.isLoading}
        actions={<>
          <Link to={ordersPath} className={heroButton}><ShoppingBag className="h-4 w-4" /> {t('Orders')}</Link>
          <GuideButton onClick={guide.open} />
          {canEdit && p && (
            <button type="button" onClick={() => publish.mutate()} disabled={publish.isPending} className={live ? heroButton : heroPrimaryButton}>
              {live ? <><EyeOff className="h-4 w-4" /> {t('Unpublish')}</> : <><Rocket className="h-4 w-4" /> {t('Publish')}</>}
            </button>
          )}
        </>}
        stats={d ? [
          { label: t('Aaj ke orders'), value: d.orders.todayCount, hint: t('{{count}} naye', { count: d.orders.pendingCount }) },
          { label: t('Aaj ki Sale'), value: formatPKR(d.orders.todayRevenue) },
          { label: t('Aaj dukaan dekhi'), value: d.shop.viewsToday ?? 0, hint: t('7 din: {{count}}', { count: d.shop.views7d ?? 0 }) },
          { label: t('Rating'), value: d.shop.ratingAverage ? d.shop.ratingAverage.toFixed(1) : '—', hint: t('{{count}} reviews · {{followers}} followers', { count: d.shop.ratingCount, followers: d.shop.followerCount }) },
        ] : undefined}
      />
      <ApprovalBanner approval={p?.approval} />

      {d && (
        <KpiRow cols={4}>
          <KpiCard icon={Clock} color={TONE.amber} label={t('Naye orders')} value={d.orders.pendingCount} onClick={() => navigate(ordersPath)} />
          <KpiCard icon={ChefHat} color={TONE.blue} label={t('Tayyar ho rahe')} value={d.orders.preparingCount} onClick={() => navigate(ordersPath)} />
          <KpiCard icon={Bike} color={TONE.violet} label={t('Raste me')} value={d.orders.outForDeliveryCount} onClick={() => navigate('/market/delivery')} />
          <KpiCard icon={Wallet} color={TONE.green} label={t('Is mahine Sale')} value={formatPKR(d.orders.monthRevenue)} hint={t('{{count}} orders', { count: d.orders.monthCount })} />
        </KpiRow>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card title={t('Haal ke orders')} flush
          actions={<Link to={ordersPath} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Sab dekhein')}</Link>}>
          {dashQ.isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : !d?.recent.orders.length ? (
            <div className="px-6 py-10 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-700">{t('Abhi koi Market order nahi')}</p>
              <p className="text-[0.8125rem] text-slate-500">{live ? t('Order aate hi yahan dikhega') : t('Dukaan publish karein, phir order aayenge')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.recent.orders.map((o) => (
                <li key={o.id} data-nav-row className="relative flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <Link to={ordersPath} data-nav-open className="absolute inset-0" aria-label={t('Order {{orderNumber}} kholein', { orderNumber: o.orderNumber })} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900"><span className="dir-ltr">#{o.orderNumber}</span> · {o.customer?.fullName || t('Customer')}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">
                      {(o.items ?? []).map((i) => `${i.quantity}× ${i.productName}`).join(', ') || t('{{count}} items', { count: o.itemCount })} · {formatRelative(o.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <span className="w-24 text-end text-sm font-semibold tabular-nums text-slate-900">{formatPKR(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card title={t('Go live checklist')} description={p ? t('{{done}} / {{total}} mukammal', { done: doneCount, total: checks.length }) : undefined}>
            {profileQ.isLoading ? <Skeleton className="h-48 rounded-xl" /> : (
              <>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${checks.length ? (doneCount / checks.length) * 100 : 0}%` }} />
                </div>
                <ul className="space-y-1">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                      {c.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                      <span className={cn('min-w-0 flex-1 text-[0.8125rem]', c.done ? 'text-slate-500 line-through' : 'font-medium text-slate-800')}>{c.label}</span>
                      {!c.done && (c.to
                        ? <Link to={c.to} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{t('Theek karein')}</Link>
                        : canEdit && <Button size="xs" onClick={() => publish.mutate()} loading={publish.isPending}>{t('Publish')}</Button>)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {d && (
            <Card title={t('Jawab ka intezar')}>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/market/reviews" className="rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                  <Star className="h-4 w-4 text-amber-500" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{d.activity.unrespondedReviews}</p>
                  <p className="text-[0.75rem] text-slate-500">{t('Reviews bina jawab')}</p>
                </Link>
                <Link to="/market/messages" className="rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{d.activity.unreadMessages}</p>
                  <p className="text-[0.75rem] text-slate-500">{t('Naye messages')}</p>
                </Link>
                <Link to="/market/products" className="col-span-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                  <Package className="h-4 w-4 text-brand-600" />
                  <span className="flex-1 text-[0.8125rem] text-slate-700">{t('{{listed}} / {{total}} products online', { listed: d.products.listed, total: d.products.total })}</span>
                  <Eye className="h-4 w-4 text-slate-400" />
                  <span className="text-[0.8125rem] tabular-nums text-slate-700" title={t('Aaj products dekhe gaye')}>{d.shop.productViewsToday ?? 0}</span>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title={t('Nafaa Market — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Profile'), hint: t('Logo, pata, auqaat'), icon: Store, color: TONE.blue },
            { label: t('Products online'), hint: t('Stock POS se'), icon: Package, color: TONE.green },
            { label: t('Publish'), icon: Rocket, color: TONE.violet },
            { label: t('Order aaya'), hint: t('Online Orders me'), icon: ShoppingBag, color: TONE.amber },
            { label: t('Bill bana'), hint: t('Stock khud kata'), icon: CheckCircle2, color: TONE.green },
          ]}
          steps={[
            { icon: CheckCircle2, color: TONE.green, title: t('Checklist poori karein'), text: t('Har adhoori cheez ke saath "Theek karein" hai. Sab hari ho jayein to dukaan publish karein.') },
            { icon: ShoppingBag, color: TONE.amber, title: t('Orders ek jagah'), text: t('Market ke orders Online Orders board me aate hain, Daraz aur website ke saath. Accept karte hi POS bill banta hai.') },
            { icon: Package, color: TONE.blue, title: t('Stock POS se'), text: t('Online products ka stock wohi hai jo POS me hai. Alag se ginti nahi karni.') },
            { icon: Star, color: TONE.pink, title: t('Reviews aur messages'), text: t('Customer ke sawal aur reviews ka jaldi jawab dein, rating behtar hoti hai.') },
          ]}
          shortcuts={[['O', t('orders')], ['P', t('products')], ['E', t('profile')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
