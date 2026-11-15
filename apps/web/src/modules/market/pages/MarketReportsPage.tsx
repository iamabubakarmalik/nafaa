/**
 * Market reports: Sale and orders over time, top products, where orders
 * stand by status, payment methods and ratings, for 7 / 30 / 90 days or a year.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CreditCard, Package, ShoppingBag, Star, TrendingUp, Wallet } from 'lucide-react';
import { EmptyState, PageHero, PageShell, Skeleton, ViewTabs } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { msg, t } from '@core/i18n';
import { BarList, Panel, TrendChart, useFmt } from '@modules/reports/center/components/parts';
import { marketApi, type AnalyticsRange } from '../api/market.api';
import { GuideButton, TONE, orderStatusLabel, rangeTabs } from '../components/parts';

/** Order statuses in the order an order moves through them. */
const FUNNEL = ['PENDING', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'REFUNDED'];
const PAYMENT: Record<string, string> = {
  COD: msg('Cash on delivery'), CASH_ON_DELIVERY: msg('Cash on delivery'), JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa',
  CARD: msg('Card'), WALLET: msg('Wallet'), BANK_TRANSFER: msg('Bank transfer'),
};

export default function MarketReportsPage() {
  const guide = usePageGuide();
  const f = useFmt();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const q = useQuery({ queryKey: ['market', 'analytics', range], queryFn: () => marketApi.analytics(range), placeholderData: (prev) => prev });
  const a = q.data;

  const trend = (a?.ordersTrend ?? []).slice().sort((x, y) => x.date.localeCompare(y.date)).map((d) => ({ key: d.date, revenue: d.revenue, orders: d.count }));
  const funnel = a ? Object.entries(a.ordersByStatus)
    .sort(([x], [y]) => (FUNNEL.indexOf(x) + 100) % 100 - (FUNNEL.indexOf(y) + 100) % 100)
    .map(([k, v]) => ({ key: k, name: orderStatusLabel(k), value: v })) : [];
  const payments = a ? Object.entries(a.paymentMethodBreakdown).map(([k, v]) => ({ key: k, name: PAYMENT[k] ? t(PAYMENT[k]) : k, value: v.total, hint: t('{{count}} orders', { count: v.count }) })) : [];
  const reviews = (a?.reviewsBreakdown ?? []).map((r) => ({ key: String(r.rating), name: `${r.rating} ★`, value: r.count }));

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Market reports')}
        chip={<><BarChart3 /> {t('Market ki Sale ka hisaab')}</>}
        loading={q.isLoading}
        busy={q.isFetching && !q.isLoading}
        actions={<GuideButton onClick={guide.open} />}
        stats={a ? [
          { label: t('Sale'), value: f.money(a.overview.totalRevenue) },
          { label: t('Orders'), value: a.overview.totalOrders },
          { label: t('Average order'), value: f.money(a.overview.avgOrderValue) },
          { label: t('Rating'), value: a.overview.avgRating ? a.overview.avgRating.toFixed(1) : '—' },
        ] : undefined}
      />

      <ViewTabs value={range} onChange={setRange} tabs={rangeTabs()} />

      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      ) : !a || a.overview.totalOrders === 0 ? (
        <EmptyState icon={<BarChart3 className="h-6 w-6" />} title={t('Is muddat me koi Market order nahi')} description={t('Orders aate hi yahan Sale, top products aur orders ki halat dikhegi.')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={TrendingUp} title={t('Sale aur orders')} className="lg:col-span-2">
            <TrendChart id="market-trend" data={trend} f={f} series={[
              { key: 'revenue', label: t('Sale'), color: TONE.green, fmt: 'money' },
              { key: 'orders', label: t('Orders'), color: TONE.blue, fmt: 'count' },
            ]} />
          </Panel>
          <Panel icon={Package} title={t('Top products')}>
            <BarList f={f} fmt="money" rows={a.topProducts.map((p) => ({ key: p.productId, name: p.name, value: p.revenue, hint: t('{{count}} bike', { count: p.totalSold }) }))} empty={t('Kuch nahi')} />
          </Panel>
          <Panel icon={ShoppingBag} title={t('Orders ki halat')} hint={t('Kitne order kahan tak pohanche')}>
            <BarList f={f} fmt="count" rows={funnel} empty={t('Kuch nahi')} />
          </Panel>
          <Panel icon={CreditCard} title={t('Payment ke tareeqe')}>
            <BarList f={f} fmt="money" rows={payments} empty={t('Kuch nahi')} />
          </Panel>
          <Panel icon={Star} title={t('Ratings')}>
            <BarList f={f} fmt="count" rows={reviews} empty={t('Abhi koi review nahi')} />
          </Panel>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Market reports')} onClose={guide.close}
          flow={[
            { label: t('Order aaya'), icon: ShoppingBag, color: TONE.blue },
            { label: t('Deliver hua'), icon: Package, color: TONE.violet },
            { label: t('Sale bani'), icon: Wallet, color: TONE.green },
          ]}
          steps={[
            { icon: TrendingUp, color: TONE.green, title: t('Sale ka graph'), text: t('Har din ki Market Sale aur orders. Cancel orders Sale me nahi jurte.') },
            { icon: Package, color: TONE.blue, title: t('Top products'), text: t('Market par sab se zyada bikne wali cheezein — inhe hamesha stock me rakhein.') },
            { icon: ShoppingBag, color: TONE.amber, title: t('Orders ki halat'), text: t('Kitne order naye, tayyar, raste me, pohanche ya cancel huay.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
