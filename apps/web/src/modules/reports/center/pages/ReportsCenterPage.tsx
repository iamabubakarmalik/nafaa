/**
 * Report centre for every industry: sales, items, customers, purchases,
 * expenses, profit, tax and returns for any business-day period, each with
 * charts, tables, print (A4 / PDF / thermal) and CSV, and a comparison with
 * the previous period of the same length. Industries add their own tab
 * through config.
 *
 * Keys: 1–9 switch tab · C compare · G guide.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgePercent, BookOpen, Calculator, CalendarRange, Download, FileDown, GitCompareArrows, GraduationCap, HandCoins, Landmark, Lightbulb,
  Package, PiggyBank, Printer, Receipt, RefreshCw, RotateCcw, ShoppingCart, TrendingUp, Truck, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type ViewTab,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { REPORTS_KEY, fetchSection, type Period, type ProfitReport, type SalesReport, type SectionData, type SectionId } from '../api';
import { useReportsConfig, type ReportsConfig } from '../config';
import { Delta, WEEKDAYS, useFmt, type Formatter } from '../components/parts';
import { SalesSection } from '../components/SalesSection';
import { ItemsSection } from '../components/ItemsSection';
import { CustomersSection } from '../components/CustomersSection';
import { PurchasesSection } from '../components/PurchasesSection';
import { ExpensesSection } from '../components/ExpensesSection';
import { ProfitSection } from '../components/ProfitSection';
import { TaxSection } from '../components/TaxSection';
import { ReturnsSection } from '../components/ReturnsSection';
import { IndustrySection } from '../components/IndustrySection';
import { downloadCsv, sectionDoc } from '../print';
import { useReportCompare, useReportRange } from '../../prefs';

const COMPARE_KEY = 'nafaa-reports-compare';
const BASE_TABS: Array<{ id: Exclude<SectionId, 'industry'>; label: string; icon: LucideIcon }> = [
  { id: 'sales', label: 'Sale', icon: TrendingUp },
  { id: 'items', label: 'Maal', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'purchases', label: 'Purchase', icon: Truck },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'profit', label: 'Profit', icon: PiggyBank },
  { id: 'tax', label: 'Tax', icon: Landmark },
  { id: 'returns', label: 'Return', icon: RotateCcw },
];

function useSection<K extends SectionId>(id: K, period: Period, shop: string | undefined, enabled: boolean, industry?: string) {
  return useQuery({
    queryKey: [REPORTS_KEY, id, industry ?? null, shop ?? null, period.from, period.to],
    queryFn: () => fetchSection(id, period, industry),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export default function ReportsCenterPage() {
  const config = useReportsConfig();
  const qc = useQueryClient();
  const f = useFmt();
  const startHour = useBusinessDayStart();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const guide = usePageGuide();
  const [range, setRange] = useReportRange('month');
  const [tab, setTab] = useState<SectionId>('sales');
  const [compare, toggleCompare] = useReportCompare(COMPARE_KEY);

  const period: Period = useMemo(() => {
    const r = resolveRange(range, startHour);
    return r ?? { from: 'all', to: businessDayKey(new Date(), startHour) };
  }, [range, startHour]);
  const label = rangeLabel(period.from, period.to);
  const shopLabel = `${tenantName}${!isAll && shopName ? ` · ${shopName}` : isAll ? ' · Sab branches' : ''}`;

  const tabs = useMemo(() => {
    const list: Array<ViewTab<SectionId>> = BASE_TABS.map((t) => ({ id: t.id, label: config.labels?.[t.id] ?? t.label, icon: t.icon }));
    if (config.industry) list.push({ id: 'industry', label: config.industry.label, icon: config.industry.icon });
    return list;
  }, [config]);

  const sales = useSection('sales', period, shopParam, true);
  const profit = useSection('profit', period, shopParam, true);
  const active = useSection(tab, period, shopParam, tab !== 'sales' && tab !== 'profit', config.industry?.kind);
  const current = tab === 'sales' ? sales : tab === 'profit' ? profit : active;
  const tabLabel = tabs.find((t) => t.id === tab)?.label as string;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= tabs.length) setTab(tabs[n - 1].id);
      else if (e.key.toLowerCase() === 'c') toggleCompare();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs]);

  const doc = () => {
    if (!current.data) throw new Error('Report abhi aa rahi hai');
    return sectionDoc(tab, current.data as SectionData[typeof tab], { f, title: `Report — ${tabLabel}`, period: label, shop: shopLabel });
  };
  const exportCsv = () => {
    if (!current.data) { toast.error('Report abhi aa rahi hai'); return; }
    downloadCsv(doc(), `report-${tab}-${period.from}-${period.to}.csv`);
    toast.success('CSV ban gayi');
  };
  const refresh = () => qc.invalidateQueries({ queryKey: [REPORTS_KEY] });

  const s = sales.data?.totals;
  const sp = compare ? sales.data?.previous : null;
  const p = profit.data?.totals;
  const pp = compare ? profit.data?.previous : null;
  const showCost = !f.costHidden && s?.profit != null;
  const hint = (now: number, before: number | null | undefined, fallback: ReactNode, up: 'good' | 'bad' = 'good') =>
    (compare && before != null ? <Delta now={now} before={before} up={up} /> : fallback);

  return (
    <PageShell>
      <PageHero
        title="Reports"
        chip={<><CalendarRange />{label}</>}
        busy={(sales.isFetching && !sales.isLoading) || (current.isFetching && !current.isLoading)}
        meta={`${config.label} · ${isAll ? 'Sab branches' : shopName ?? tenantName}`}
        loading={sales.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={exportCsv} disabled={!current.data} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={doc} disabled={!current.data} /></span>
          <button type="button" onClick={() => void refresh()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', current.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s ? [
          { label: 'Asal sale', value: f.money(s.net), hint: 'return ke baad' },
          { label: 'Profit', value: f.cost(s.profit), hint: showCost ? `${(s.margin ?? 0).toFixed(1)}% margin` : 'Cost lock' },
          { label: 'Bill', value: String(s.bills), hint: `${s.customers} customer` },
          { label: 'Ausat bill', value: f.money(s.average) },
        ] : [{ label: 'Asal sale', value: '' }, { label: 'Profit', value: '' }, { label: 'Bill', value: '' }, { label: 'Ausat bill', value: '' }]}
      />

      <KpiRow>
        {!s || !p ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={TrendingUp} color="#2563eb" label="Sale" value={f.money(s.net)} hint={hint(s.net, sp?.net, `${s.bills} bill`)} onClick={() => setTab('sales')} active={tab === 'sales'} />
            <KpiCard icon={Wallet} color="#16a34a" label="Haath me aaya" value={f.money(s.cashIn)} hint={hint(s.cashIn, sp?.cashIn, 'cash + online')} />
            <KpiCard icon={BookOpen} color="#d97706" label="Udhaar par" value={f.money(s.credit)} hint={hint(s.credit, sp?.credit, 'is period me', 'bad')} onClick={() => setTab('customers')} active={tab === 'customers'} />
            <KpiCard icon={Receipt} color="#e11d48" label="Expenses" value={f.money(p.expenses)} hint={hint(p.expenses, pp?.expenses, `${p.sales ? ((p.expenses / p.sales) * 100).toFixed(0) : 0}% sale ka`, 'bad')} onClick={() => setTab('expenses')} active={tab === 'expenses'} />
            <KpiCard icon={HandCoins} color="#059669" label="Net profit" value={f.cost(p.netProfit)} hint={showCost ? hint(p.netProfit ?? 0, pp?.netProfit, 'kharchon ke baad') : 'Cost lock'} onClick={() => setTab('profit')} active={tab === 'profit'} />
          </>
        )}
      </KpiRow>

      <Insights sales={sales.data} profit={profit.data} f={f} />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={GitCompareArrows} label="Muqabla" value={compare ? 'on' : 'off'} active={compare} width="w-72"
          options={[
            { value: 'on', label: 'Pichli period se muqabla', hint: 'Itne hi din pehle ke saath — har number ke neeche %' },
            { value: 'off', label: 'Muqabla band' },
          ]}
          onChange={(v) => { if ((v === 'on') !== compare) toggleCompare(); }} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} hint={<><Kbd>1</Kbd>–<Kbd>{String(tabs.length)}</Kbd> tab · <Kbd>C</Kbd> muqabla</>} />

      {current.isLoading || !current.data ? (
        current.error ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Report nahi aa saki</p>
            <p className="mt-1 text-[0.875rem] text-slate-500">{(current.error as Error).message}</p>
            <div className="mt-4"><Button onClick={() => void current.refetch()}>Dobara koshish</Button></div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className={cn('h-72 rounded-2xl', i === 0 && 'lg:col-span-2')} />)}</div>
        )
      ) : (
        <Section tab={tab} data={current.data} f={f} compare={compare} config={config} label={tabLabel} />
      )}

      {guide.isOpen && (
        <PageGuide title="Reports — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Period chunein', text: '"Period" se Aaj, 7 din, 30 din, is mahine, ya apni date. Har tab ke number isi period ke hain, dukaan ke din ke hisaab se.' },
            { icon: GitCompareArrows, color: '#7c3aed', title: 'Pichli dafa se muqabla', text: 'Muqabla chalu ho to har bare number ke neeche likha hota hai ke itne hi din pehle se kitna upar ya neeche gaya.' },
            { icon: TrendingUp, color: '#16a34a', title: 'Sale', text: 'Roz ki sale aur profit, kis ghante aur din rush hota hai, payment tareeqe, staff, website/Daraz aur branch war sale.' },
            { icon: Package, color: '#0891b2', title: config.labels?.items ?? 'Maal', text: 'Sab se zyada sale, profit aur quantity wali cheezein, category, brand, aur woh maal jo stock me para hai magar bika nahi.' },
            { icon: Users, color: '#d97706', title: 'Customers aur udhaar', text: 'Naye aur purane customer, sab se bare customer, udhaar diya aur wapas mila, aur kis ka udhaar kitna purana hai.' },
            { icon: ShoppingCart, color: '#ea580c', title: 'Purchase aur expenses', text: 'Kis supplier se kitna maal aaya, kis ko kitna dena hai, aur expenses kis category me gaye.' },
            { icon: PiggyBank, color: '#059669', title: 'Profit', text: 'Sale se return, cost, expenses aur kharab maal nikaal kar net profit. Cheez war profit "Cheez war profit" link par.' },
            { icon: Calculator, color: '#0f766e', title: 'Hisaab kaise', text: 'Asal bikri = bill − wapsi (void bill nahi gine jate). Lagat = bill bante waqt ki cost; cost na likhi ho to aaj ki cost. Kharche sirf jo ada ho chuke (pending nahi). Net munafa = munafa − kharche − kharab, gum ya ginti me kam maal. Wapsi us bill ke din me ginti hai jis ka maal tha. Reports, Munafa report, Nafa nuqsan aur Dashboard sab yahi hisaab lagate hain. Sirf "Wapsi" tab aur Din ka hisaab me wapsi us din dikhti hai jis din hui.' },
            { icon: BadgePercent, color: '#db2777', title: 'Tax aur return', text: 'Tax authority ne kitne bill maane aur kitna tax bana; wapsi kis wajah se aur kis maal ki, aur void bill.' },
            ...(config.industry ? [config.industry.guide] : []),
            { icon: FileDown, color: '#475569', title: 'Print aur CSV', text: 'Upar Print se A4, PDF ya thermal slip; CSV se Excel file. Jo tab khula hai wohi report banti hai.' },
          ]}
          tips={[
            'Cost aur profit sirf unhe dikhta hai jin ke paas cost dekhne ki permission hai. Aankh wale button se screen par chhupa bhi sakte hain.',
            'Profit sale ke waqt ki cost se hai — baad me cost badle to purani sale ka profit nahi badalta.',
            'Upar se branch badlein to sari report usi branch ki ho jati hai. Supplier ka baqi aur kuch industry hisaab sab branches ka mila kar hota hai.',
            ...(config.tips ?? []),
          ]}
          shortcuts={[['1–9', 'tab'], ['C', 'muqabla'], ['G', 'guide']]}
          footer={<Link to="/day-report" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><Printer className="h-3.5 w-3.5" />Din ka hisaab (item war) →</Link>}
        />
      )}
    </PageShell>
  );
}

function Section({ tab, data, f, compare, config, label }: {
  tab: SectionId; data: SectionData[SectionId]; f: Formatter; compare: boolean; config: ReportsConfig; label: string;
}) {
  switch (tab) {
    case 'sales': return <SalesSection data={data as SectionData['sales']} f={f} />;
    case 'items': return <ItemsSection data={data as SectionData['items']} f={f} label={label} />;
    case 'customers': return <CustomersSection data={data as SectionData['customers']} f={f} compare={compare} />;
    case 'purchases': return <PurchasesSection data={data as SectionData['purchases']} f={f} compare={compare} />;
    case 'expenses': return <ExpensesSection data={data as SectionData['expenses']} f={f} compare={compare} />;
    case 'profit': return <ProfitSection data={data as SectionData['profit']} f={f} compare={compare} />;
    case 'tax': return <TaxSection data={data as SectionData['tax']} f={f} />;
    case 'returns': return <ReturnsSection data={data as SectionData['returns']} f={f} compare={compare} />;
    default: return <IndustrySection data={data as SectionData['industry']} f={f} config={config} />;
  }
}

/** Plain-language pointers from the period's numbers. */
function Insights({ sales, profit, f }: { sales?: SalesReport; profit?: ProfitReport; f: Formatter }) {
  if (!sales || !profit || !sales.totals.bills) return null;
  const s = sales.totals;
  const p = profit.totals;
  const list: Array<{ tone: 'good' | 'warn' | 'bad'; text: string }> = [];
  if (!f.costHidden && s.margin != null && s.net > 0 && s.margin < 10) list.push({ tone: 'bad', text: `Profit sirf ${s.margin.toFixed(1)}% hai — rate ya cost dobara dekhein.` });
  if (s.net > 0 && s.credit / s.net > 0.3) list.push({ tone: 'warn', text: `Sale ka ${Math.round((s.credit / s.net) * 100)}% udhaar par gaya — wasooli par dhyan dein.` });
  if (p.sales > 0 && p.expenses / p.sales > 0.25) list.push({ tone: 'warn', text: `Expenses sale ka ${Math.round((p.expenses / p.sales) * 100)}% hain.` });
  if (s.gross > 0 && s.refunds / s.gross > 0.05) list.push({ tone: 'warn', text: `${((s.refunds / s.gross) * 100).toFixed(1)}% maal wapas aaya — "Return" tab me wajah dekhein.` });
  const prev = sales.previous;
  if (prev && prev.net > 0) {
    const ch = ((s.net - prev.net) / prev.net) * 100;
    if (ch <= -10) list.push({ tone: 'bad', text: `Sale pichli period se ${Math.abs(ch).toFixed(0)}% kam hai.` });
    else if (ch >= 10) list.push({ tone: 'good', text: `Sale pichli period se ${ch.toFixed(0)}% zyada hai.` });
  }
  const best = [...sales.weekdays].sort((a, b) => b.net - a.net)[0];
  if (best?.net && list.length < 3) list.push({ tone: 'good', text: `${WEEKDAYS[best.day]} sab se acha din hai — us din maal aur staff poora rakhein.` });
  if (!list.length) return null;
  const tone = { good: 'bg-emerald-50 text-emerald-900 ring-emerald-100', warn: 'bg-amber-50 text-amber-900 ring-amber-100', bad: 'bg-rose-50 text-rose-900 ring-rose-100' };
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {list.slice(0, 3).map((x) => (
        <p key={x.text} className={cn('flex items-start gap-2 rounded-2xl px-4 py-3 text-[0.8125rem] ring-1', tone[x.tone])}>
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />{x.text}
        </p>
      ))}
    </div>
  );
}
