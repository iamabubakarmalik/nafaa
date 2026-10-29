/**
 * Profit and loss: the shop's real earnings for any period. The statement
 * against the previous period (or the same dates last year), month by month
 * for up to two years, branch by branch, cash in and out, and analytics on
 * expenses, margins and break-even. A4/PDF/thermal print and CSV of every view.
 *
 * Keys: 1–5 views · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BarChart3, Calculator, CalendarRange, Download, FileText, GitCompareArrows, GraduationCap, Landmark, MousePointerClick, Package, PiggyBank,
  Receipt, RotateCcw, Scale, Store, Target, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type ViewTab,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { presetRange, rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useCanSwitchShops, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useReportMasked, useReportPrefs, useReportRange } from '../../prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { SOURCES } from '@modules/finance/money/components/meta';
import { pnlApi, type PnlQuery } from '../api';
import { usePnlConfig } from '../config';
import { buildLines, change, monthLabel, monthRange, pctText, unionCategories, type PnlLine } from '../meta';
import { branchesDoc, cashDoc, downloadCsv, linesCsv, monthlyDoc, statementDoc } from '../print';
import { AnalyticsView } from '../components/AnalyticsView';
import { BranchView } from '../components/BranchView';
import { CashFlowView } from '../components/CashFlowView';
import { DetailModal } from '../components/DetailModal';
import { MonthlyView } from '../components/MonthlyView';
import { StatementView } from '../components/StatementView';
import { ChangeChip, ChartSkeleton, type Fmt } from '../components/parts';

type Tab = 'statement' | 'monthly' | 'branches' | 'cash' | 'analytics';

/** A per-viewer setting kept in this browser. */
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw == null ? initial : (JSON.parse(raw) as T); } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } }, [key, value]);
  return [value, setValue] as const;
}

export default function ProfitLossPage() {
  const cfg = usePnlConfig();
  const startHour = useBusinessDayStart();
  const { sales, cost, costHidden } = useReportMasked();
  const prefs = useReportPrefs();
  const fmt: Fmt = useMemo(() => ({ sales, cost, costHidden }), [sales, cost, costHidden]);
  const shopParam = useShopParam();
  const allShops = useIsAllShops();
  const isOwner = useCanSwitchShops();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const assigned = useAuthStore((s) => s.user?.assignedShop);
  const guide = usePageGuide();

  const [range, setRange] = useReportRange('thisMonth');
  // The viewer's last choice in this browser, else the shop's default (P&L always compares).
  const [comparePicked, setCompare] = useStored<'prev' | 'year' | null>('pnl-compare-choice', null);
  const compare = comparePicked ?? (prefs.compareDefault === 'year' ? 'year' : 'prev');
  const [staff, setStaff] = useStored<boolean>('pnl-staff', true);
  const [months, setMonths] = useStored<number>('pnl-months', 12);
  const [branch, setBranch] = useState('');
  const [tab, setTab] = useState<Tab>('statement');
  const [drill, setDrill] = useState<PnlLine | null>(null);
  useEffect(() => { setBranch(''); }, [shopParam]);

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: isOwner, staleTime: 5 * 60_000 });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const canPickBranch = allShops && shops.length > 1;
  const showBranches = canPickBranch && !branch;

  const today = businessDayKey(new Date(), startHour);
  const period = resolveRange(range, startHour) ?? presetRange('thisMonth', startHour);
  const query: PnlQuery = { from: period.from, to: period.to, compare, staff, shopId: canPickBranch ? branch || undefined : undefined };
  const scopeKey = shopParam ?? 'all';
  const days = Math.round((Date.parse(`${period.to}T00:00:00Z`) - Date.parse(`${period.from}T00:00:00Z`)) / 86_400_000) + 1;

  const reportQ = useQuery({ queryKey: ['pnl', 'report', scopeKey, query], queryFn: () => pnlApi.report(query), placeholderData: (prev) => prev });
  const monthlyQ = useQuery({
    queryKey: ['pnl', 'monthly', scopeKey, query.shopId, staff, months],
    queryFn: () => pnlApi.monthly({ shopId: query.shopId, staff, months }),
    enabled: tab === 'monthly' || tab === 'analytics', placeholderData: (prev) => prev,
  });
  const branchesQ = useQuery({ queryKey: ['pnl', 'branches', scopeKey, query], queryFn: () => pnlApi.branches(query), enabled: tab === 'branches' && showBranches, placeholderData: (prev) => prev });
  const cashQ = useQuery({ queryKey: ['pnl', 'cash', scopeKey, query], queryFn: () => pnlApi.cashFlow(query), enabled: tab === 'cash' && days <= 366, placeholderData: (prev) => prev });

  const r = reportQ.data;
  const s = r?.current;
  const p = r?.previous;
  const lines = useMemo(() => (r ? buildLines(cfg, unionCategories([r.current, r.previous]), r.staffIncluded, [r.current, r.previous]) : []), [r, cfg]);
  const monthLines = useMemo(() => (monthlyQ.data ? buildLines(cfg, unionCategories(monthlyQ.data.months.map((m) => m.statement)), monthlyQ.data.staffIncluded, monthlyQ.data.months.map((m) => m.statement)) : []), [monthlyQ.data, cfg]);
  const branchLines = useMemo(() => (branchesQ.data ? buildLines(cfg, unionCategories([branchesQ.data.total]), branchesQ.data.staffIncluded, [branchesQ.data.total, ...branchesQ.data.branches.map((b) => b.statement)]) : []), [branchesQ.data, cfg]);

  const label = rangeLabel(period.from, period.to);
  const prevShort = compare === 'year' ? 'Pichla saal' : 'Pichli period';
  const prevLabel = r ? `${prevShort}: ${rangeLabel(r.period.prevFrom, r.period.prevTo)}` : prevShort;
  const branchName = r?.branch?.name ?? (allShops ? 'Sab branches' : assigned?.name ?? '');
  const metaLine = `${cfg.label} · ${branchName || tenantName || ''}`;

  const tabs = useMemo<Array<ViewTab<Tab>>>(() => [
    { id: 'statement', label: 'Bayan', icon: FileText },
    { id: 'monthly', label: 'Mahine war', icon: CalendarRange },
    ...(showBranches ? [{ id: 'branches' as const, label: 'Branch war', icon: Store }] : []),
    { id: 'cash', label: 'Paisa aaya/gaya', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ], [showBranches]);
  useEffect(() => { if (tab === 'branches' && !showBranches) setTab('statement'); }, [tab, showBranches]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < tabs.length) { e.preventDefault(); setTab(tabs[i].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tabs]);

  const pickMonth = (key: string) => { setRange({ preset: 'custom', custom: monthRange(key, today) }); setTab('statement'); };
  const pickBranch = (id: string) => { if (id !== '-') { setBranch(id); setTab('statement'); } };

  /* ── print and CSV follow the open view ── */
  const header = [`Profit-loss (P&L) — ${tenantName ?? ''}`, `Period: ${label}`, `Branch: ${branchName}`];
  const printDoc = () => {
    if (tab === 'monthly' && monthlyQ.data) return monthlyDoc(monthlyQ.data, { costHidden, branch: branchName });
    if (tab === 'branches' && branchesQ.data) return branchesDoc(branchesQ.data, { costHidden, period: label });
    if (tab === 'cash' && cashQ.data && s) return cashDoc(cashQ.data, { period: label, netProfit: s.netProfit == null ? '—' : cost(s.netProfit) });
    if (!r) throw new Error('Report not loaded');
    return statementDoc(r, lines, { costHidden, period: label, prevPeriod: prevLabel, branch: branchName, label: cfg.label });
  };
  const exportCsv = () => {
    if (tab === 'monthly' && monthlyQ.data) {
      const m = monthlyQ.data.months;
      return linesCsv('pnl-mahine', header, monthLines, costHidden, m.map((x) => ({ label: monthLabel(x.key, true), s: x.statement })));
    }
    if (tab === 'branches' && branchesQ.data) {
      const b = branchesQ.data;
      return linesCsv('pnl-branches', header, branchLines, costHidden, [...b.branches.map((x) => ({ label: x.name, s: x.statement })), { label: 'Kul', s: b.total }]);
    }
    if (tab === 'cash' && cashQ.data) {
      const c = cashQ.data;
      return downloadCsv('paisa-aaya-gaya', header, [
        ['Kahan se / kahan', 'Entries', 'Aaya', 'Gaya'],
        ...c.bySource.map((x) => [SOURCES[x.source]?.label ?? x.source, x.count, x.direction === 'in' ? x.amount.toFixed(2) : '', x.direction === 'out' ? x.amount.toFixed(2) : '']),
        [''], [c.grouping === 'month' ? 'Mahina' : 'Din', 'Aaya', 'Gaya', 'Bacha'],
        ...c.trend.map((t) => [t.key, t.in.toFixed(2), t.out.toFixed(2), t.net.toFixed(2)]),
      ]);
    }
    if (r) linesCsv('pnl', [...header, prevLabel], lines, costHidden, [{ label: 'Is period', s: r.current }, { label: prevShort, s: r.previous }]);
  };
  const exportReady = tab === 'monthly' ? !!monthlyQ.data : tab === 'branches' ? !!branchesQ.data : tab === 'cash' ? !!cashQ.data : !!r;

  const nothing = s && s.revenue.bills === 0 && s.revenue.returnCount === 0 && s.expenses.total === 0 && !(s.writeOffs?.count);
  const loading = reportQ.isLoading || !s || !p;
  const filtered = !!branch || !staff;

  return (
    <PageShell>
      <PageHero
        title="Profit-loss (P&L)"
        chip={<><CalendarRange />{label}</>}
        meta={metaLine}
        busy={reportQ.isFetching && !reportQ.isLoading}
        loading={loading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={exportCsv} disabled={!exportReady} className={heroButton}><Download className="h-4 w-4" /> CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!exportReady} /></span>
          <Link to="/profit-report" title="Har product ka profit" className={heroButton}><Package className="h-4 w-4" /> <span className="hidden sm:inline">Product war</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s && p ? [
          { label: 'Net profit', value: s.netProfit == null ? '—' : cost(s.netProfit), hint: s.netMargin == null || costHidden ? undefined : `${pctText(s.netMargin)} margin` },
          { label: 'Net sale', value: sales(s.revenue.net), hint: `${s.revenue.bills} bill` },
          { label: 'Gross margin', value: s.grossMargin == null || costHidden ? cost(null) : pctText(s.grossMargin) },
          { label: 'Kharchay', value: sales(s.expenses.total), hint: s.revenue.net > 0 ? `sale ka ${pctText((s.expenses.total / s.revenue.net) * 100)}` : undefined },
        ] : [{ label: 'Net profit', value: '' }, { label: 'Net sale', value: '' }, { label: 'Gross margin', value: '' }, { label: 'Kharchay', value: '' }]}
      />

      <KpiRow>
        {loading || !s || !p ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={TrendingUp} color="#2563eb" label="Net sale" value={sales(s.revenue.net)}
              hint={<ChangeChip value={change(s.revenue.net, p.revenue.net)} suffix={prevShort.toLowerCase()} />} />
            <KpiCard icon={Scale} color="#16a34a" label="Gross profit" value={s.grossProfit == null ? '—' : cost(s.grossProfit)}
              hint={costHidden || s.grossProfit == null ? 'Cost chhupi' : <ChangeChip value={change(s.grossProfit, p.grossProfit)} suffix={prevShort.toLowerCase()} />} />
            <KpiCard icon={Receipt} color="#d97706" label="Kharchay" value={sales(s.expenses.total)} onClick={() => setTab('analytics')}
              hint={<ChangeChip value={change(s.expenses.total, p.expenses.total)} upIsGood={false} suffix="· analytics" />} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Stock nuqsan" value={s.writeOffs == null ? '—' : cost(s.writeOffs.net)}
              hint={s.writeOffs ? `${s.writeOffs.count} entries · dabayein` : 'Cost ki permission nahi'}
              onClick={s.writeOffs ? () => setDrill(lines.find((l) => l.id === 'w-damage') ?? null) : undefined} />
            <KpiCard icon={Wallet} color="#7c3aed" label="Udhaar par biki" value={sales(s.revenue.credit)} onClick={() => setTab('cash')}
              hint="Paisa abhi aana hai · cash dekhein" />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">
          {tab === 'monthly' ? 'Pichle mahine, karobari din ke hisaab se — date yahan nahi lagti'
            : tab === 'analytics' ? 'Kharchay is muddat ke; rujhan aur break-even mahine war'
              : tab === 'cash' ? 'Shop accounts ke len den se — bill, return, purchase, kharchay'
                : `Muqabla: ${prevLabel}`}
        </p>}
        chips={filtered ? <>
          {branch && <FilterChip onRemove={() => setBranch('')}>{shops.find((x) => x.id === branch)?.name ?? 'Branch'}</FilterChip>}
          {!staff && <FilterChip onRemove={() => setStaff(true)}>Tankhwah shamil nahi</FilterChip>}
        </> : undefined}
        onClear={() => { setBranch(''); setStaff(true); }}>
        {tab !== 'monthly' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />}
        {(tab === 'monthly' || tab === 'analytics') && (
          <FilterMenu icon={CalendarRange} label="Mahine" value={String(months)} active={months !== 12} width="w-56"
            options={[{ value: '6', label: '6 mahine' }, { value: '12', label: '12 mahine' }, { value: '24', label: '24 mahine' }]}
            onChange={(v) => setMonths(Number(v))} />
        )}
        {(tab === 'statement') && (
          <FilterMenu icon={GitCompareArrows} label="Muqabla" value={compare} active={compare !== 'prev'} width="w-64"
            options={[{ value: 'prev', label: 'Pichli period', hint: 'Itne hi din, is se pehle' }, { value: 'year', label: 'Pichla saal', hint: 'Yahi tareekhen, ek saal pehle' }]}
            onChange={setCompare} />
        )}
        {canPickBranch && (
          <FilterMenu icon={Store} label="Branch" value={branch} active={!!branch} width="w-64"
            options={[{ value: '', label: 'Sab branches' }, ...shops.map((x) => ({ value: x.id, label: x.name, hint: x.isMain ? 'Main' : undefined }))]}
            onChange={setBranch} />
        )}
        <FilterMenu icon={Users} label="Tankhwah" value={staff ? 'yes' : 'no'} active={!staff} align="right" width="w-72"
          options={[
            { value: 'yes', label: 'Kharchay me shamil', hint: 'Tankhwah aur commission jo staff page se diye' },
            { value: 'no', label: 'Shamil nahi', hint: 'Jab tankhwah pehle hi Kharchay me likhte hain' },
          ]}
          onChange={(v) => setStaff(v === 'yes')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} hint={<><Kbd>1</Kbd>–<Kbd>{tabs.length}</Kbd> se badlein · <Kbd>G</Kbd> guide</>} />

      {reportQ.isError ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
          <p className="mt-3 font-semibold text-slate-900">Hisaab nahi aa saka</p>
          <p className="mt-1 text-sm text-slate-500">Internet check karein ya period chhoti karein</p>
          <Button className="mt-4" variant="secondary" onClick={() => void reportQ.refetch()}>Dobara koshish</Button>
        </div>
      ) : tab === 'statement' ? (
        loading || !r ? <StatementSkeleton /> : nothing ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><PiggyBank className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Is period me koi len den nahi</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Period badlein, ya "Mahine war" me pichle mahine dekhein</p>
            <div className="mt-4"><Button variant="secondary" onClick={() => setTab('monthly')}>Mahine war dekhein</Button></div>
          </div>
        ) : <StatementView report={r} lines={lines} fmt={fmt} prevLabel={prevShort} onDrill={setDrill} />
      ) : tab === 'monthly' ? (
        !monthlyQ.data ? <ChartSkeleton /> : <MonthlyView data={monthlyQ.data} lines={monthLines} fmt={fmt} onPickMonth={pickMonth} />
      ) : tab === 'branches' ? (
        !branchesQ.data ? <ChartSkeleton /> : <BranchView data={branchesQ.data} lines={branchLines} fmt={fmt} onPickBranch={pickBranch} />
      ) : tab === 'cash' ? (
        days > 366 ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-100">Paisa aaya/gaya ek saal tak ki period ke liye hai — period chhoti karein.</p>
        ) : !cashQ.data || !r ? <ChartSkeleton /> : <CashFlowView cash={cashQ.data} report={r} fmt={fmt} />
      ) : (
        !monthlyQ.data || !r ? <ChartSkeleton /> : <AnalyticsView report={r} monthly={monthlyQ.data} fmt={fmt} />
      )}

      {drill?.drill && (
        <DetailModal query={query} kind={drill.drill.kind} categoryId={drill.drill.categoryId} fmt={fmt} onClose={() => setDrill(null)}
          title={drill.drill.kind === 'writeoff' ? 'Stock nuqsan' : drill.drill.kind === 'staff' ? 'Tankhwah aur commission' : drill.label} period={label} />
      )}

      {guide.isOpen && (
        <PageGuide title="Profit-loss — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Period chunein', text: 'Is mahine, pichhla mahina, saal ya apni date. "Muqabla" se pichli itni hi period ya pichle saal ki yahi tareekhen saath dikhti hain.' },
            { icon: FileText, color: '#16a34a', title: 'Bayan parhein', text: 'Upar sale, phir maal ki cost, gross profit, kharchay, stock ka nuqsan — aakhir me Net profit. Har line ke neeche likha hai ke wo kya hai.' },
            { icon: Calculator, color: '#0f766e', title: 'Hisaab kaise', text: 'Asal sale = bill − wapsi (void bill nahi gine jate). Cost = bill bante waqt ki cost; cost na likhi ho to aaj ki cost. Kharche sirf jo ada ho chuke (pending nahi). Net profit = profit − kharche − kharab, gum ya ginti me kam maal. Wapsi us bill ke din me ginti hai jis ka maal tha. Reports, Profit report, Nafa nuqsan aur Dashboard sab yahi hisaab lagate hain. Yahan tankhwah aur commission bhi alag line me nikalte hain, aur cancel booking ka rakha hua advance aamdani me judta hai.' },
            { icon: MousePointerClick, color: '#d97706', title: 'Line par click', text: 'Expenses ki type, tankhwah, stock nuqsan ya booking par click karein — us ke saare record khul jate hain.' },
            { icon: CalendarRange, color: '#7c3aed', title: 'Mahine war', text: 'Pichle 6, 12 ya 24 mahine ek saath. Kisi mahine par click karein to us ka poora bayan khulta hai.' },
            { icon: Landmark, color: '#0891b2', title: 'Profit ya cash?', text: '"Paisa aaya/gaya" batata hai jeb me kitna aaya, aur profit se farq kyun hai — udhaar, purchase, khata.' },
            { icon: Target, color: '#db2777', title: 'Break-even', text: 'Analytics me dekhein ke har mahine kitni sale par saare fixed expenses poore hote hain, aur is mahine kitna baqi hai.' },
          ]}
          tips={[
            'Return us bill ki period me gini jati hai jis ka maal tha, chahe return baad me hui ho. Din ka hisaab me return usi din dikhti hai jis din hui.',
            'Jis cheez ki cost nahi likhi, us ki cost product ki aaj ki cost se andaza lagti hai. Note me batata hai kitni lines aisi hain.',
            'Agar tankhwah aap Kharchay me bhi likhte hain to "Tankhwah" filter band karein, warna do dafa gini jayegi.',
            ...(cfg.tips ?? []),
          ]}
          shortcuts={[['1–5', 'view badlein'], ['G', 'guide']]}
          footer={<Link to="/returns" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline"><RotateCcw className="mr-1 inline h-4 w-4" />Return ka record →</Link>}
        />
      )}
    </PageShell>
  );
}

function StatementSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
