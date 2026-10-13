/**
 * Online sales report for a period of business days: how much sold and
 * against the previous period, by channel, city and courier with RTO rate,
 * hours and weekdays, products, customers and how long COD sits with
 * couriers. CSV of every order (owner and manager) and a printable summary.
 *
 * Keys: 1–5 tabs · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Clock, Download, Globe, GraduationCap, LayoutDashboard, MapPin, Package, PackageCheck, RotateCcw,
  ShieldBan, ShoppingBag, Timer, Truck, Users, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton,
  resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useReportRange } from '@modules/reports/prefs';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { OnlineAnalytics, type AnalyticsSection } from '../components/analytics/OnlineAnalytics';
import { channelMeta, useSalesChannels } from '../hooks/useSalesChannels';
import { reportDoc } from '../lib/print';

type Tab = 'summary' | 'channels' | 'couriers' | 'products' | 'aging';

const TABS: Array<{ id: Tab; label: string; icon: typeof Globe; sections: AnalyticsSection[] }> = [
  { id: 'summary', label: 'Khulasa', icon: LayoutDashboard, sections: ['pipeline', 'trend', 'payment', 'time'] },
  { id: 'channels', label: 'Channel & shehar', icon: MapPin, sections: ['channels', 'cities'] },
  { id: 'couriers', label: 'Courier & RTO', icon: Truck, sections: ['couriers', 'cities'] },
  { id: 'products', label: 'Products & customers', icon: Package, sections: ['products', 'customers'] },
  { id: 'aging', label: 'COD', icon: Clock, sections: ['payment', 'codAging'] },
];

const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);

export default function OnlineReportsPage() {
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('summary');
  const [range, setRange] = useReportRange('month');
  const [channelId, setChannelId] = useState('');
  const { data: channels } = useSalesChannels();

  const today = businessDayKey(new Date(), startHour);
  const period = resolveRange(range, startHour) ?? { from: today, to: today };
  const periodText = rangeLabel(period.from, period.to);
  const channelName = channels?.find((c) => c.id === channelId)?.displayName ?? 'Sab channels';
  const q = { ...period, integrationId: channelId || undefined };

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['online-report', period.from, period.to, channelId || undefined],
    queryFn: () => onlineOrdersApi.report(q),
    placeholderData: (prev) => prev,
  });
  const exp = useMutation({
    mutationFn: () => onlineOrdersApi.exportCsv(q),
    onSuccess: () => toast.success('CSV download ho gayi — Excel me kholein'),
    onError: (e) => toast.error(apiErrorMessage(e, 'CSV nahi bani')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (/^[1-5]$/.test(e.key)) setTab(TABS[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const t = data?.totals;
  const p = data?.previous;
  const valueChange = t && p ? change(t.netValue, p.netValue) : null;
  const ordersChange = t && p ? change(t.orders, p.orders) : null;
  const vs = (n: number | null) => (n == null ? 'pichli period me kuch nahi' : `${n >= 0 ? '+' : ''}${n}% pichli period se`);
  const acceptText = (m: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.round(m / 60)} ghante`);

  return (
    <PageShell>
      <PageHero
        title="Online reports"
        chip={<><BarChart3 />{periodText}</>}
        meta={`${channelName} · cancel aur wapas orders sale me nahi gine jate`}
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => exp.mutate()} disabled={exp.isPending} className={heroButton} title="Har order ki line (malik / manager)">
            <Download className="h-4 w-4" /> {exp.isPending ? 'Ban rahi…' : 'CSV (Excel)'}
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => reportDoc(data!, periodText, channelName)} disabled={!data} /></span>
          <Link to="/online-orders/customers" className={heroButton}><Users className="h-4 w-4" /> <span className="hidden sm:inline">Customers</span></Link>
          <Link to="/online-store/blocklist" title="Block list" className={heroIconButton}><ShieldBan className="h-4 w-4" /></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: `Online sale · ${t.netOrders} order`, value: money(t.netValue), hint: vs(valueChange) },
          { label: 'Orders aaye', value: String(t.orders), hint: vs(ordersChange) },
          { label: 'Deliver', value: money(t.deliveredValue), hint: `${t.delivered} · ${t.deliveryRate}% bheje hue` },
          { label: 'RTO (wapas)', value: `${t.rtoRate}%`, hint: `${t.returned} / ${t.dispatched}${p?.rtoRate != null ? ` · pehle ${p.rtoRate}%` : ''}` },
        ] : [{ label: 'Online sale', value: '' }, { label: 'Orders', value: '' }, { label: 'Deliver', value: '' }, { label: 'RTO', value: '' }]}
      />

      <KpiRow>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={(valueChange ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight} color={(valueChange ?? 0) >= 0 ? '#16a34a' : '#e11d48'} label="Ausat order"
            value={money(t.avgOrderValue)} hint={`${t.customers} customer · ${t.repeatCustomers} dobara`} />
          <KpiCard icon={XCircle} color="#e11d48" label="Cancel / reject" value={`${t.cancelRate}%`} hint={`${t.cancelled} order`} />
          <KpiCard icon={RotateCcw} color="#c026d3" label="Wapas aaya maal" value={money(t.returnedValue)} hint={`${t.returned} parcel`} onClick={() => setTab('couriers')} active={tab === 'couriers'} />
          <KpiCard icon={Timer} color="#0284c7" label="Accept me waqt" value={acceptText(t.avgAcceptMinutes)} hint="Order aane se bill tak" />
          <KpiCard icon={PackageCheck} color="#0d9488" label="Delivery me waqt" value={t.avgDeliveryDays == null ? '—' : `${t.avgDeliveryDays} din`}
            hint={t.pending ? `${t.pending} naye abhi accept baqi` : 'Courier ko dene se deliver tak'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">
          Saare charts isi period ke hain · pichli period {p ? rangeLabel(p.from, p.to) : ''} se muqabla
        </p>}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
        {(channels?.length ?? 0) > 1 && (
          <FilterMenu icon={Globe} label="Channel" value={channelId} active={!!channelId} onChange={setChannelId} width="w-72" align="right"
            options={[{ value: '', label: 'Sab channels' }, ...channels!.map((c) => ({ value: c.id, label: `${channelMeta(c.type).emoji} ${c.displayName}`, hint: channelMeta(c.type).label }))]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>-<Kbd>5</Kbd> tabs</>}
        tabs={TABS.map(({ id, label, icon }) => ({ id, label, icon }))} />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : isError || !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi bani</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : data.totals.orders === 0 && tab !== 'aging' ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBag className="h-6 w-6" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Is period me koi online order nahi</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">Date ya channel badal kar dekhein.</p>
        </div>
      ) : (
        <OnlineAnalytics data={data} money={money} sections={TABS.find((x) => x.id === tab)!.sections} />
      )}

      {guide.isOpen && (
        <PageGuide title="Online reports — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: BarChart3, color: '#2563eb', title: 'Period chunein', text: 'Aaj, 7 din, 30 din, mahina ya apni date. Upar ke number pichli itni hi period se milaye jate hain.' },
            { icon: ShoppingBag, color: '#16a34a', title: 'Sale ka hisaab', text: 'Sale me sirf woh orders jo cancel ya wapas nahi hue. "Orders aaye" me har order ginta hai.' },
            { icon: MapPin, color: '#7c3aed', title: 'Channel aur shehar', text: 'Kahan se zyada order aata hai, aur kis shehar me RTO zyada — wahan COD call karke confirm karein.' },
            { icon: Truck, color: '#0284c7', title: 'Courier aur RTO', text: 'Kaun sa courier zyada deliver karta hai aur kis ke parcel wapas aate hain.' },
            { icon: Package, color: '#d97706', title: 'Products aur customers', text: 'Sab se zyada bikne wali cheezein aur sab se qeemti customer.' },
            { icon: Download, color: '#0891b2', title: 'CSV aur print', text: 'CSV me har order ki line (malik ya manager). Print me khulasa, channel, shehar, courier aur products.' },
          ]}
          tips={['Test order kisi report me nahi aata.', 'Din dukaan ke apne waqt par badalta hai (Settings → karobari din).', 'COD tab ka "kitne din se" poore account ka hai, date ka nahi.']}
          shortcuts={[['1', 'khulasa'], ['2', 'channel'], ['3', 'courier'], ['4', 'products'], ['5', 'COD'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
