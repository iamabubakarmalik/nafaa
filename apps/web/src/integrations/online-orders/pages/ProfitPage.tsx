/**
 * Profit of the online store for a period, the owner's way: sales − product
 * Cost − ads − courier − returns − other expenses = net Profit. Below it the
 * cash actually received against COD still out, and Profit per order,
 * channel (after its ads), courier, city and product. Numbers come from
 * the selling-costs report and the ads entries; nothing is worked out twice.
 *
 * Keys: 1-5 tabs · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Banknote, Calculator, Globe, GraduationCap, Hourglass, ListOrdered, MapPin, Megaphone, Package, Receipt, ShoppingBag, TrendingUp, Truck,
} from 'lucide-react';
import {
  Button, Card, DateRangeMenu, EmptyState, FilterBar, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Switch, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { growthApi, type ProfitStatement } from '../api/growth.api';
import { useSalesChannels } from '../hooks/useSalesChannels';

type Tab = 'orders' | 'channel' | 'courier' | 'city' | 'product';
const TABS: Tab[] = ['orders', 'channel', 'courier', 'city', 'product'];
const tone = (n: number | null | undefined) => (n == null ? 'text-slate-400' : n < 0 ? 'text-rose-700' : 'text-success-700');

export default function ProfitPage() {
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [channel, setChannel] = useState('ALL');
  const [withExpenses, setWithExpenses] = useState(true);
  const [tab, setTab] = useState<Tab>('orders');
  const [shown, setShown] = useState(100);
  const period = resolveRange(range, startHour);
  const { data: channels } = useSalesChannels();
  const q = useQuery({
    queryKey: ['online-profit-statement', period?.from, period?.to, channel, withExpenses],
    queryFn: () => growthApi.profit({ from: period?.from, to: period?.to, integrationId: channel === 'ALL' ? undefined : channel, expenses: withExpenses ? '1' : '0' }),
    placeholderData: (p) => p,
  });
  useEffect(() => { setShown(100); }, [period?.from, period?.to, channel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) { e.preventDefault(); setTab(TABS[n - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const d = q.data;
  const w = d?.waterfall;

  return (
    <PageShell>
      <PageHero
        title={t('Profit')}
        chip={<><TrendingUp />{t('Online store')}</>}
        meta={t('Sale − product Cost − ads − courier − returns − doosre Expense = asli Profit')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/online-store/costs" className={heroButton}><Calculator className="h-4 w-4" /> <span className="hidden sm:inline">{t('Selling costs')}</span></Link>
          <Link to="/online-store/ads" className={heroButton}><Megaphone className="h-4 w-4" /> <span className="hidden sm:inline">{t('Ads')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={w ? [
          { label: t('Net Profit'), value: money(w.net), hint: w.margin != null ? `${w.margin}%` : undefined },
          { label: t('Sale'), value: money(w.sales) },
          { label: t('Haath me aaya'), value: money(d!.cash.received) },
        ] : [{ label: t('Net Profit'), value: '' }, { label: t('Sale'), value: '' }, { label: t('Haath me aaya'), value: '' }]}
      />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
        <FilterMenu icon={Globe} label={t('Channel')} value={channel} active={channel !== 'ALL'} onChange={setChannel}
          options={[{ value: 'ALL', label: t('Sab channels') }, ...(channels ?? []).map((c) => ({ value: c.id, label: c.displayName }))]} />
        {period && <span className="self-center text-[0.8125rem] text-slate-500">{rangeLabel(period.from, period.to)}</span>}
        <span className="ms-auto self-center">
          <Switch checked={withExpenses && channel === 'ALL'} disabled={channel !== 'ALL'} onChange={(e) => setWithExpenses(e.target.checked)} label={t('Doosre Expense bhi ghataein')} />
        </span>
      </FilterBar>

      {q.isError ? (
        <EmptyState title={t('Profit nahi nikla')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : <>
        {!!d?.missingRates.length && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{t('{{value}} ka rate likha nahi — in ke parcels ka courier charge 0 gina gaya hai.', { value: d.missingRates.map((r) => r.name).join(', ') })}</span>
            <Link to="/online-store/costs" className="font-semibold underline">{t('Rate likhein')}</Link>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card title={t('Hisaab')} description={d ? t('{{count}} order (bill bane) · {{returned}} wapas', { count: d.totals.orders, returned: d.returns.orders }) : undefined}>
            {!w ? <Skeleton className="h-64 rounded-xl" /> : <Waterfall d={d!} money={money} />}
          </Card>
          <div className="space-y-4">
            <KpiRow cols={3}>
              {!d ? Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
                <KpiCard icon={Banknote} color="#16a34a" label={t('Haath me aaya')} value={money(d.cash.received)} hint={t('Prepaid, advance aur COD jo mil gaya')} />
                <KpiCard icon={Hourglass} color="#ea580c" label={t('COD baqi')} value={money(d.cash.codOutstanding)} hint={t('Abhi courier ya customer ke paas')} />
              </>}
            </KpiRow>
            <Card title={t('Ads aur Expense')}>
              {!d ? <Skeleton className="h-28 rounded-xl" /> : (
                <ul className="space-y-1.5 text-[0.8125rem]">
                  {d.ads.byPlatform.map((a) => <li key={a.platform} className="flex justify-between"><span className="text-slate-600">{t('Ads · {{platform}}', { platform: a.platform })}</span><span className="tabular-nums">{money(a.amount)}</span></li>)}
                  {!d.ads.byPlatform.length && <li className="text-slate-500">{t('Is period me ads ka kharcha nahi likha.')} <Link to="/online-store/ads" className="font-medium text-brand-700 underline">{t('Likhein')}</Link></li>}
                  {d.withExpenses && d.expenses.slice(0, 8).map((e) => <li key={e.category || '-'} className="flex justify-between"><span className="text-slate-600">{e.category || t('Doosra kharcha')}</span><span className="tabular-nums">{money(e.amount)}</span></li>)}
                  {d.withExpenses && d.expenses.length > 8 && <li className="text-[0.75rem] text-slate-400">{t('+{{count}} aur', { count: d.expenses.length - 8 })}</li>}
                  {!d.withExpenses && <li className="text-[0.75rem] text-slate-400">{channel !== 'ALL' ? t('Ek channel par dukaan ke Expense nahi ghatte.') : t('Doosre Expense band hain.')}</li>}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <ViewTabs value={tab} onChange={setTab}
          tabs={[
            { id: 'orders', label: t('Har order'), icon: ListOrdered, count: d?.orders.length ?? null },
            { id: 'channel', label: t('Channel'), icon: Globe },
            { id: 'courier', label: t('Courier'), icon: Truck },
            { id: 'city', label: t('Shehar'), icon: MapPin },
            { id: 'product', label: t('Product'), icon: Package },
          ]} />

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {!d ? <div className="p-4"><Skeleton className="h-64 rounded-xl" /></div>
            : tab === 'orders' ? <OrdersTable d={d} money={money} shown={shown} onMore={() => setShown((n) => n + 200)} />
              : <GroupTable d={d} tab={tab} money={money} />}
        </section>
      </>}

      {guide.isOpen && (
        <PageGuide
          title={t('Profit — aasaan tareeqa')}
          description={t('Sale me se har kharcha ghata kar jo bache wohi asli Profit hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Sale'), hint: t('Customer ne diya'), icon: ShoppingBag, color: '#2563eb' },
            { label: t('Product Cost'), hint: t('Maal ki qeemat'), icon: Package, color: '#7c3aed' },
            { label: t('Ads + courier'), hint: t('Bechne ka kharcha'), icon: Megaphone, color: '#db2777' },
            { label: t('Returns'), hint: t('Wapas parcel'), icon: Truck, color: '#c026d3' },
            { label: t('Net Profit'), hint: t('Jo bacha'), icon: TrendingUp, color: '#16a34a' },
          ]}
          steps={[
            { icon: Calculator, color: '#16a34a', title: t('Courier ka rate'), text: t('Courier charge "Selling costs" ke rate se ya courier ke statement se aata hai.') },
            { icon: Megaphone, color: '#db2777', title: t('Ads'), text: t('"Ads & ROAS" me likha kharcha yahan ghatta hai. Channel se jura ad us channel ke Profit se bhi ghatta hai.') },
            { icon: Receipt, color: '#64748b', title: t('Doosre Expense'), text: t('Kiraya, tankhwah jaise Expense poori dukaan ke hain — switch se hata sakte hain.') },
            { icon: Banknote, color: '#0d9488', title: t('Haath me aaya'), text: t('Profit kaghaz par hai; "Haath me aaya" wo paisa hai jo sach me mil gaya. Baqi COD courier ke paas hai.') },
          ]}
          shortcuts={[['1-5', t('Tabs')], ['G', t('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function Waterfall({ d, money }: { d: ProfitStatement; money: (n: number) => string }) {
  const w = d.waterfall;
  const rows: Array<{ label: string; value: number; minus?: boolean; strong?: boolean; color: string; hint?: string }> = [
    { label: t('Sale'), value: w.sales, color: '#2563eb', hint: t('Maal + delivery jo customer ne diya') },
    { label: t('Product Cost'), value: w.productCost, minus: true, color: '#7c3aed' },
    { label: t('Ads'), value: w.ads, minus: true, color: '#db2777' },
    { label: t('Courier, COD fee, packing'), value: w.courier, minus: true, color: '#ea580c' },
    { label: t('Returns (RTO)'), value: w.returns, minus: true, color: '#c026d3', hint: t('{{count}} parcel wapas', { count: d.returns.orders }) },
    ...(d.withExpenses ? [{ label: t('Doosre Expense'), value: w.otherExpenses, minus: true, color: '#64748b' }] : []),
  ];
  const max = Math.max(w.sales, 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
            <span className="text-slate-700">{r.minus ? '− ' : ''}{r.label}{r.hint && <span className="ms-1.5 text-[0.6875rem] text-slate-400">{r.hint}</span>}</span>
            <span className={cn('font-semibold tabular-nums', r.minus ? 'text-slate-700' : 'text-slate-900')}>{r.minus ? `− ${money(r.value)}` : money(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, backgroundColor: r.color }} /></div>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-slate-200 pt-2.5">
        <span className="text-[0.9375rem] font-semibold text-slate-900">{t('= Net Profit')}</span>
        <span className={cn('text-[1.125rem] font-bold tabular-nums', tone(w.net))}>{money(w.net)}{w.margin != null && <span className="ms-1.5 text-[0.75rem] font-semibold">{w.margin}%</span>}</span>
      </div>
    </div>
  );
}

function OrdersTable({ d, money, shown, onMore }: { d: ProfitStatement; money: (n: number) => string; shown: number; onMore: () => void }) {
  if (!d.orders.length) return <EmptyState icon={<ListOrdered className="h-5 w-5" />} title={t('Koi order nahi')} description={t('Is period me bill wala koi online order nahi.')} />;
  return (
    <>
      <p className="px-4 pt-3 text-[0.75rem] text-slate-500">{t('Sab se kam Profit wale pehle — nuqsan wale order yahin dikhte hain.')}</p>
      <div className="overflow-x-auto">
        <Table>
          <THead><Tr><Th>{t('Order')}</Th><Th>{t('Channel')}</Th><Th>{t('Courier')}</Th><Th>{t('Status')}</Th><Th className="text-end">{t('Sale')}</Th><Th className="text-end">{t('Cost')}</Th><Th className="text-end">{t('Selling costs')}</Th><Th className="text-end">{t('Profit')}</Th></Tr></THead>
          <TBody>
            {d.orders.slice(0, shown).map((o) => (
              <Tr key={o.id}>
                <Td><Link to={`/online-orders?search=${encodeURIComponent(o.number)}`} className="font-mono font-semibold text-slate-900 hover:underline">#{o.number}</Link><span className="block text-[0.6875rem] text-slate-400">{o.city ?? ''}</span></Td>
                <Td className="text-[0.8125rem]">{o.channel}</Td>
                <Td className="text-[0.8125rem]">{o.courier ?? '—'}</Td>
                <Td><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600">{o.status}</span></Td>
                <Td className="text-end tabular-nums">{money(o.sale)}</Td>
                <Td className="text-end tabular-nums">{money(o.cost)}</Td>
                <Td className="text-end tabular-nums">{money(o.sellingCosts)}{o.estimated && <span className="ms-1 text-[0.625rem] text-amber-600" title={t('Rate card se andaza')}>~</span>}</Td>
                <Td className={cn('text-end font-semibold tabular-nums', tone(o.profit))}>{money(o.profit)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
      {d.orders.length > shown && <div className="p-3 text-center"><Button size="sm" variant="secondary" onClick={onMore}>{t('Aur dikhayein ({{count}})', { count: d.orders.length - shown })}</Button></div>}
    </>
  );
}

function GroupTable({ d, tab, money }: { d: ProfitStatement; tab: Exclude<Tab, 'orders'>; money: (n: number) => string }) {
  const rows = useMemo(() => {
    if (tab === 'channel') return d.byChannel.map((r) => ({ key: r.id ?? r.name, ...r, ads: r.ads as number | undefined, afterAds: r.afterAds as number | undefined }));
    if (tab === 'courier') return d.byCourier.map((r) => ({ key: r.code, ...r, ads: undefined, afterAds: undefined }));
    if (tab === 'city') return d.byCity.map((r) => ({ key: r.city, name: r.city, ...r, ads: undefined, afterAds: undefined }));
    return d.byProduct.map((r) => ({ key: r.name, ...r, ads: undefined, afterAds: undefined }));
  }, [d, tab]);
  if (!rows.length) return <EmptyState title={t('Kuch nahi')} description={t('Is period me data nahi.')} />;
  const withAds = tab === 'channel';
  return (
    <div className="overflow-x-auto">
      <Table>
        <THead><Tr><Th>{t('Naam')}</Th><Th className="text-end">{t('Orders')}</Th><Th className="text-end">{t('Sale')}</Th><Th className="text-end">{t('Cost')}</Th><Th className="text-end">{t('Selling costs')}</Th><Th className="text-end">{t('Profit')}</Th>{withAds && <><Th className="text-end">{t('Ads')}</Th><Th className="text-end">{t('Ads ke baad')}</Th></>}<Th className="text-end">{t('Margin')}</Th></Tr></THead>
        <TBody>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td className="font-medium text-slate-900">{r.name}</Td>
              <Td className="text-end tabular-nums">{r.orders}</Td>
              <Td className="text-end tabular-nums">{money(r.sale + r.deliveryCollected)}</Td>
              <Td className="text-end tabular-nums">{money(r.cost ?? 0)}</Td>
              <Td className="text-end tabular-nums">{money(r.sellingCosts)}</Td>
              <Td className={cn('text-end font-semibold tabular-nums', tone(r.profit))}>{money(r.profit ?? 0)}</Td>
              {withAds && <><Td className="text-end tabular-nums">{money(r.ads ?? 0)}</Td><Td className={cn('text-end font-semibold tabular-nums', tone(r.afterAds))}>{money(r.afterAds ?? 0)}</Td></>}
              <Td className="text-end text-[0.8125rem] tabular-nums">{r.margin != null ? `${r.margin}%` : '—'}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
