/**
 * Customers report for every industry: who buys and how often, new against
 * returning, named against walk-in, top customers, RFM groups with WhatsApp
 * lists, monthly retention cohorts, udhaar ageing and collection, and
 * loyalty points. Any business-day period, compared with the previous one;
 * owners can narrow the all-branches view to one branch. Print (A4 / PDF /
 * thermal) and CSV for whichever tab is open.
 *
 * Keys: 1–5 switch tab · C compare · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, CalendarRange, Coins, Download, FileDown, GitCompareArrows, GraduationCap, Grid3x3, HandCoins, LayoutDashboard,
  Lightbulb, MessageCircle, Percent, RefreshCw, Repeat, Store, TrendingDown, TriangleAlert, UserPlus, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { PERMISSIONS } from '@core/lib/permissions';
import { RequireAllPermissions, useReportCompare, useReportRange } from '../../prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { CUSTOMERS_REPORT_KEY, customersReportApi, type Overview, type Period, type SegmentKey } from '../api';
import { useCustomersReportConfig } from '../config';
import { Delta, Insights, useFmt } from '../components/parts';
import { OverviewView } from '../components/OverviewView';
import { SegmentsView } from '../components/SegmentsView';
import { RetentionView } from '../components/RetentionView';
import { KhataView } from '../components/KhataView';
import { LoyaltyView } from '../components/LoyaltyView';
import { cohortsDoc, downloadCsv, khataDoc, loyaltyDoc, overviewDoc, segmentsDoc } from '../print';

type Tab = 'overview' | 'segments' | 'retention' | 'khata' | 'loyalty';
const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Khulasa', icon: LayoutDashboard },
  { id: 'segments', label: 'Groups', icon: Grid3x3 },
  { id: 'retention', label: 'Wapsi', icon: Repeat },
  { id: 'khata', label: 'Udhaar', icon: BookOpen },
  { id: 'loyalty', label: 'Points', icon: Coins },
];
const COMPARE_KEY = 'nafaa-customers-report-compare';

/** Needs both report access and customer access; says which one is missing otherwise. */
export default function CustomersReportPage() {
  return (
    <RequireAllPermissions need={[PERMISSIONS.REPORTS_VIEW, PERMISSIONS.CUSTOMERS_VIEW]} title="Customers report">
      <CustomersReport />
    </RequireAllPermissions>
  );
}

function CustomersReport() {
  const config = useCustomersReportConfig();
  const qc = useQueryClient();
  const f = useFmt();
  const startHour = useBusinessDayStart();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (t === 'overview') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });
  const [range, setRange] = useReportRange('month');
  const [compare, toggleCompare] = useReportCompare(COMPARE_KEY);
  const [branch, setBranch] = useState('');
  const [months, setMonths] = useState(12);
  const [segment, setSegment] = useState<SegmentKey>('atRisk');

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: isAll });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const branchId = isAll && branch ? branch : undefined;
  const branchName = branchId ? shops.find((s) => s.id === branchId)?.name : undefined;

  const period: Period = useMemo(() => resolveRange(range, startHour) ?? { from: 'all', to: businessDayKey(new Date(), startHour) }, [range, startHour]);
  const label = rangeLabel(period.from, period.to);
  const where = branchName ?? (isAll ? 'Sab branches' : shopName ?? tenantName);
  const shopLabel = `${tenantName}${where && where !== tenantName ? ` · ${where}` : ''}`;
  const base = [CUSTOMERS_REPORT_KEY, shopParam ?? null, branchId ?? null];

  const overview = useQuery({ queryKey: [...base, 'overview', period.from, period.to], queryFn: () => customersReportApi.overview(period, branchId), placeholderData: (p) => p, staleTime: 60_000 });
  const segments = useQuery({ queryKey: [...base, 'segments'], queryFn: () => customersReportApi.segments(undefined, branchId), enabled: tab === 'segments', staleTime: 60_000 });
  const cohorts = useQuery({ queryKey: [...base, 'cohorts', months], queryFn: () => customersReportApi.cohorts(months, branchId), enabled: tab === 'retention', placeholderData: (p) => p, staleTime: 60_000 });
  const khata = useQuery({ queryKey: [...base, 'khata', period.from, period.to], queryFn: () => customersReportApi.khata(period, branchId), enabled: tab === 'khata', placeholderData: (p) => p, staleTime: 60_000 });
  const loyalty = useQuery({ queryKey: [...base, 'loyalty', period.from, period.to], queryFn: () => customersReportApi.loyalty(period, branchId), enabled: tab === 'loyalty', placeholderData: (p) => p, staleTime: 60_000 });
  const current = { overview, segments, retention: cohorts, khata, loyalty }[tab];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1].id);
      else if (e.key.toLowerCase() === 'c') toggleCompare();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ctx = { f, period: label, shop: shopLabel, noun: config.noun };
  const doc = (): PrintDoc => {
    switch (tab) {
      case 'segments': if (segments.data) return segmentsDoc(segments.data, ctx); break;
      case 'retention': if (cohorts.data) return cohortsDoc(cohorts.data, ctx); break;
      case 'khata': if (khata.data) return khataDoc(khata.data, khata.data.rows, ctx); break;
      case 'loyalty': if (loyalty.data) return loyaltyDoc(loyalty.data, ctx); break;
      default: if (overview.data) return overviewDoc(overview.data, ctx);
    }
    throw new Error('Report abhi aa rahi hai');
  };
  const exportCsv = () => {
    if (!current.data) { toast.error('Report abhi aa rahi hai'); return; }
    downloadCsv(doc(), `customers-${tab}-${period.from}-${period.to}.csv`);
    toast.success('CSV ban gayi');
  };

  const t = overview.data?.totals;
  const pv = compare ? overview.data?.previous : null;
  const hint = (now: number, before: number | undefined, fallback: string, opts?: { up?: 'good' | 'bad'; points?: boolean }) =>
    (pv && before != null ? <Delta now={now} before={before} up={opts?.up} points={opts?.points} /> : fallback);

  return (
    <PageShell>
      <PageHero
        title={`${config.noun} report`}
        chip={<><CalendarRange />{tab === 'segments' ? 'Aaj tak · 12 mahine' : tab === 'retention' ? `Pichle ${months} mahine` : label}</>}
        busy={(overview.isFetching && !overview.isLoading) || (current.isFetching && !current.isLoading)}
        meta={`${config.label} · ${where}`}
        loading={overview.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={exportCsv} disabled={!current.data} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={doc} disabled={!current.data} /></span>
          <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: [CUSTOMERS_REPORT_KEY] })} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}>
            <RefreshCw className={cn('h-4 w-4', current.isFetching && 'animate-spin')} />
          </button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: 'Naam wale customers', value: f.count(t.buyers), hint: `${t.newBuyers} naye` },
          { label: 'Un ki bikri', value: f.money(t.named), hint: `${t.namedShare.toFixed(0)}% kul ka` },
          { label: 'Ausat kharch', value: f.money(t.avgSpend), hint: 'har customer' },
          ...(!f.costHidden && t.profit != null ? [{ label: 'Munafa', value: f.cost(t.profit), hint: f.pct(t.margin) }] : [{ label: 'Ausat bill', value: f.money(t.avgBasket) }]),
        ] : [{ label: 'Naam wale customers', value: '' }, { label: 'Un ki bikri', value: '' }, { label: 'Ausat kharch', value: '' }, { label: 'Ausat bill', value: '' }]}
      />

      <KpiRow>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={UserPlus} color="#16a34a" label="Naye customers" value={f.count(t.newBuyers)} hint={hint(t.newBuyers, pv?.newBuyers, `${t.signups} register hue`)}
              onClick={() => setTab('overview')} active={tab === 'overview'} />
            <KpiCard icon={Repeat} color="#2563eb" label="Dobara aaye" value={f.pct(t.repeatRate)} hint={hint(t.repeatRate, pv?.repeatRate, `${t.repeat} ek se zyada din`, { points: true })}
              onClick={() => setTab('retention')} active={tab === 'retention'} />
            <KpiCard icon={Users} color="#7c3aed" label="Naam wali bikri" value={f.pct(t.namedShare)} hint={hint(t.namedShare, pv?.namedShare, `walk-in ${f.money(t.walkIn)}`, { points: true })}
              onClick={() => setTab('segments')} active={tab === 'segments'} />
            <KpiCard icon={Wallet} color="#0891b2" label="Ausat bill" value={f.money(t.avgBasket)} hint={hint(t.avgBasket, pv?.avgBasket, `walk-in ${f.money(t.walkInBasket)}`)} />
            <KpiCard icon={HandCoins} color="#d97706" label="Udhaar par diya" value={f.money(t.credit)} hint={hint(t.credit, pv?.credit, 'naam wale bills par', { up: 'bad' })}
              onClick={() => setTab('khata')} active={tab === 'khata'} />
          </>
        )}
      </KpiRow>

      {tab === 'overview' && overview.data && <Insights items={insights(overview.data, f.money)} />}

      <FilterBar
        chips={branchId ? <FilterChip onRemove={() => setBranch('')}>{branchName ?? 'Branch'}</FilterChip> : undefined}
        onClear={() => setBranch('')}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={GitCompareArrows} label="Muqabla" value={compare ? 'on' : 'off'} active={compare} width="w-72"
          options={[
            { value: 'on', label: 'Pichli muddat se muqabla', hint: 'Itne hi din pehle ke saath — number ke neeche %' },
            { value: 'off', label: 'Muqabla band' },
          ]}
          onChange={(v) => { if ((v === 'on') !== compare) toggleCompare(); }} />
        {isAll && shops.length > 1 && (
          <FilterMenu icon={Store} label="Branch" value={branch} active={!!branch} onChange={setBranch}
            options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={TABS} hint={<><Kbd>1</Kbd>–<Kbd>5</Kbd> tab · <Kbd>C</Kbd> muqabla · <Kbd>G</Kbd> guide</>} />

      {current.error && !current.data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(current.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void current.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : !current.data ? (
        <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className={cn('h-64 rounded-2xl', i === 0 && 'lg:col-span-2')} />)}</div>
      ) : tab === 'overview' && overview.data ? (
        overview.data.totals.buyers + overview.data.totals.walkInBills === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Users className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Is muddat me koi bikri nahi</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Muddat badal kar dekhein, ya POS par bill ke saath customer ka naam likhein.</p>
            <div className="mt-4"><Button variant="secondary" onClick={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Shuru se dikhayein</Button></div>
          </div>
        ) : <OverviewView data={overview.data} f={f} compare={compare} noun={config.noun} />
      ) : tab === 'segments' && segments.data ? (
        <SegmentsView data={segments.data} f={f} shop={shopLabel} shopKey={shopParam ?? null} branch={branchId} selected={segment} onSelect={setSegment} />
      ) : tab === 'retention' && cohorts.data ? (
        <RetentionView data={cohorts.data} f={f} months={months} onMonths={setMonths} />
      ) : tab === 'khata' && khata.data ? (
        <KhataView data={khata.data} f={f} compare={compare} period={label} shop={shopLabel} />
      ) : tab === 'loyalty' && loyalty.data ? (
        <LoyaltyView data={loyalty.data} f={f} compare={compare} />
      ) : null}

      {guide.isOpen && (
        <PageGuide title={`${config.noun} report — aasaan tareeqa`} onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Muddat aur branch', text: '"Muddat" se Aaj, 30 din, is mahine ya apni tareekh. Sab branches dekh rahe hon to "Branch" se ek branch chun sakte hain.' },
            { icon: GitCompareArrows, color: '#7c3aed', title: 'Pichli dafa se muqabla', text: 'Muqabla chalu ho to number ke neeche likha hota hai ke itne hi din pehle se kitna upar ya neeche gaya.' },
            { icon: LayoutDashboard, color: '#16a34a', title: 'Khulasa', text: 'Naye aur purane customer, naam wali vs walk-in bikri, kitne din aaye, do visits ka faasla, sab se ache customer aur kis shehar se.' },
            { icon: Grid3x3, color: '#ea580c', title: 'Groups', text: 'Har customer ek group me: Behtareen, Wafadar, Naye, Dhyan chahiye, Khatre me, Kho gaye. Group chun kar list nikaalein aur WhatsApp bhejein.' },
            { icon: Repeat, color: '#0891b2', title: 'Wapsi', text: 'Jo customer kisi mahine pehli dafa aaye, un me se kitne agle mahino me phir aaye. Gehra rang = zyada log wapas.' },
            { icon: BookOpen, color: '#d97706', title: 'Udhaar', text: 'Kitna udhaar kitna purana hai, is muddat me kitna diya aur kitna wapas aaya, aur kis se pehle wasooli karni hai. Ek click me yaad dihani.' },
            { icon: Coins, color: '#db2777', title: 'Points', text: 'Loyalty points kitne diye aur kitne istemal hue, aur baqi points ki qeemat — yeh dukaan par qarz hai.' },
            { icon: MessageCircle, color: '#059669', title: 'WhatsApp list', text: 'Har list par WhatsApp button: paighaam pehle se likha hota hai, "Agla bhejein" se ek ek kar ke sab ko.' },
            { icon: FileDown, color: '#475569', title: 'Print aur CSV', text: 'Upar Print se A4, PDF ya thermal; CSV se Excel file. Jo tab khula hai wohi report banti hai. Group aur udhaar ki poori list bhi.' },
          ]}
          tips={[
            'Walk-in bill par naam nahi hota, is liye woh groups aur wapsi me nahi aate. Jitne zyada bills par naam, utni sahi report.',
            '"Naya" customer woh hai jis ne is branch par pehli dafa isi muddat me khareeda.',
            'Udhaar ki umar: wasooli hamesha sab se purane udhaar me gini jati hai.',
            'Munafa sirf unhe dikhta hai jin ke paas cost dekhne ki ijazat hai.',
            'Ye report dekhne ke liye "View Reports" aur "View Customers" dono ijazatein chahiye.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['1–5', 'tab'], ['C', 'muqabla'], ['G', 'guide']]}
          footer={<Link to="/customers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Customers ki list →</Link>}
        />
      )}
    </PageShell>
  );
}

/** Plain-language pointers from the period's numbers. */
function insights(d: Overview, money: (n: number) => string) {
  const t = d.totals;
  const list: Array<{ tone: 'good' | 'warn' | 'bad'; text: string; icon: LucideIcon }> = [];
  if (t.named + t.walkIn > 0 && t.namedShare < 40) list.push({ tone: 'warn', icon: Users, text: `Sirf ${t.namedShare.toFixed(0)}% bikri par customer ka naam hai — POS par naam ya phone likhwayein, tabhi wapsi ka pata chalega.` });
  const top5 = d.top.spend.slice(0, 5).reduce((s, c) => s + c.net, 0);
  if (t.named > 0 && top5 / t.named > 0.5 && t.buyers > 10) list.push({ tone: 'warn', icon: TriangleAlert, text: `Naam wali bikri ka ${Math.round((top5 / t.named) * 100)}% sirf 5 customers se hai — in ka khaas khayal rakhein.` });
  const prev = d.previous;
  if (prev && prev.buyers > 5) {
    const ch = ((t.buyers - prev.buyers) / prev.buyers) * 100;
    if (ch <= -10) list.push({ tone: 'bad', icon: TrendingDown, text: `Customer pichli muddat se ${Math.abs(ch).toFixed(0)}% kam aaye — "Groups" me "Khatre me" wale dekhein.` });
    else if (ch >= 10) list.push({ tone: 'good', icon: Lightbulb, text: `Customer pichli muddat se ${ch.toFixed(0)}% zyada aaye.` });
  }
  if (t.buyers >= 10 && t.repeatRate < 20) list.push({ tone: 'warn', icon: Percent, text: `Sirf ${t.repeatRate.toFixed(0)}% customer ek se zyada din aaye — naye customers ko shukriya aur doosri khareedari ki chhoot bhejein.` });
  if (t.avgBasket > 0 && t.walkInBasket > 0 && t.avgBasket > t.walkInBasket * 1.3) list.push({ tone: 'good', icon: Lightbulb, text: `Naam wale customers ka ausat bill (${money(t.avgBasket)}) walk-in se ${Math.round((t.avgBasket / t.walkInBasket - 1) * 100)}% bara hai.` });
  return list;
}
