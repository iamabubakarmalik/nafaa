/**
 * Branch analytics: every branch side by side for any period — sales, net
 * profit and bills against the previous period of the same length, share of
 * sales, the daily trend, busy hours and the full table, with print and CSV.
 * Figures use the same business maths as the Reports centre.
 *
 * `?branch=<id>` (from a branch card) shows that branch only.
 * Keys: 1–4 views · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Building2, CalendarRange, Clock, Download, GraduationCap, LineChart as LineIcon, Receipt, RotateCcw, Scale, ShoppingBag,
  Table2, TrendingUp, Wallet,
} from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { usePermission } from '@core/hooks/usePermission';
import { useBusinessDayStart } from '@core/lib/business-day';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { shopsApi, type BranchComparison } from '../api/shops.api';
import { CompareView, FiguresTable, Growth, HoursView, METRICS, TrendView, type Metric } from '../components/BranchAnalyticsViews';
import { hueAt } from '../components/meta';

type Tab = 'compare' | 'trend' | 'hours' | 'table';
const TABS: Tab[] = ['compare', 'trend', 'hours', 'table'];

export default function ShopsOverviewPage() {
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const canMoney = usePermission(PERMISSIONS.REPORTS_VIEW);
  const { sales: money, cost, costHidden } = useMasked();

  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [metric, setMetric] = useState<Metric>('net');
  const [tab, setTab] = useState<Tab>('compare');
  const branch = params.get('branch') ?? '';
  const setBranch = (id: string) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('branch', id); else n.delete('branch'); return n; }, { replace: true });

  const period = resolveRange(range, startHour);
  const from = period?.from ?? '';
  const to = period?.to ?? '';
  const q = useQuery({
    queryKey: ['shops-compare', from, to],
    queryFn: () => shopsApi.compare({ from, to }),
    enabled: canMoney && !!from,
    placeholderData: (p) => p,
  });
  const live = useQuery({ queryKey: ['shops-analytics'], queryFn: shopsApi.analytics, enabled: canMoney, refetchInterval: 60_000, retry: false });

  // Colours follow main-first, then name, so they do not move with the period or sort.
  const all = q.data;
  const hue = useMemo(() => {
    const order = [...(all?.shops ?? [])].sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name));
    const map = new Map(order.map((s, i) => [s.id, hueAt(i)]));
    return (id: string) => map.get(id) ?? hueAt(99);
  }, [all]);

  // One branch picked: keep only its rows and series.
  const data: BranchComparison | undefined = useMemo(() => {
    if (!all || !branch || !all.shops.some((s) => s.id === branch)) return all;
    const one = all.shops.find((s) => s.id === branch)!;
    const pick = <T extends Record<string, number | string>>(r: T) => Object.fromEntries(Object.entries(r).filter(([k]) => k === branch || k === 'day' || k === 'hour')) as T;
    return {
      ...all,
      shops: [one],
      totals: {
        bills: one.bills, gross: one.gross, refunds: one.refunds, net: one.net, discount: one.discount, cashIn: one.cashIn, credit: one.credit,
        cost: one.cost, grossProfit: one.grossProfit, expenses: one.expenses, writeOff: one.writeOff, netProfit: one.netProfit,
        prevNet: one.prev.net, prevNetProfit: one.prev.netProfit, prevBills: one.prev.bills,
      },
      trend: all.trend.map(pick),
      hours: all.hours.map(pick),
    };
  }, [all, branch]);

  const hidden = costHidden || !!data?.costHidden;
  const costOf = (n: number | undefined) => (hidden || n === undefined ? MASK : cost(n));
  const fmt = { money, cost: costOf };
  const t = data?.totals;
  const growth = t ? (t.prevNet > 0 ? ((t.net - t.prevNet) / t.prevNet) * 100 : t.net > 0 ? 100 : 0) : 0;
  const label = period ? rangeLabel(period.from, period.to) : '';
  const branchName = branch ? all?.shops.find((s) => s.id === branch)?.name : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < TABS.length) setTab(TABS[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = () => (data?.shops ?? []).map((s) => [
    s.name, s.bills, s.net, s.refunds, s.discount, s.cashIn, s.credit, s.avgBill,
    hidden ? '' : s.grossProfit ?? '', s.expenses, hidden ? '' : s.writeOff, hidden ? '' : s.netProfit ?? '', `${s.share}%`, `${s.growth.toFixed(1)}%`,
  ]);
  const HEAD = ['Branch', 'Bill', 'Sale', 'Return', 'Discount', 'Haath aaya', 'Udhaar', 'Ausat bill', 'Profit', 'Expenses', 'Nuqsan', 'Net profit', 'Hissa', 'Pichhli se'];
  const exportCsv = () => downloadCsv(`branches-${from}-${to}.csv`, [[`Branch analytics — ${tenantName ?? ''}`], [`Period: ${label}`], [], HEAD, ...rows()]);
  const printDoc = (): PrintDoc => ({
    title: 'Branch analytics',
    subtitle: label,
    meta: [
      ['Branches', String(data?.shops.length ?? 0)],
      ['Total sale', money(t?.net ?? 0)],
      ...(!hidden ? [['Net profit', costOf(t?.netProfit)] as [string, string]] : []),
      ['Pichhli period', `${data ? rangeLabel(data.previous.from, data.previous.to) : ''} · ${money(t?.prevNet ?? 0)}`],
    ],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Branch' }, { label: 'Bill', align: 'right' }, { label: 'Sale', align: 'right' }, { label: 'Return', align: 'right', wideOnly: true },
        { label: 'Haath aaya', align: 'right', wideOnly: true }, { label: 'Udhaar', align: 'right', wideOnly: true }, { label: 'Expenses', align: 'right', wideOnly: true },
        ...(!hidden ? [{ label: 'Net profit', align: 'right' as const }] : []), { label: 'Hissa', align: 'right', wideOnly: true },
      ],
      rows: (data?.shops ?? []).map((s) => [
        s.name, String(s.bills), money(s.net), money(s.refunds), money(s.cashIn), money(s.credit), money(s.expenses),
        ...(!hidden ? [costOf(s.netProfit)] : []), `${s.share.toFixed(1)}%`,
      ]),
      footer: t ? ['Kul', String(t.bills), money(t.net), money(t.refunds), money(t.cashIn), money(t.credit), money(t.expenses), ...(!hidden ? [costOf(t.netProfit)] : []), '100%'] : undefined,
    }],
    footer: 'Sale = bill − return · Net profit = sale − cost − expenses − nuqsan',
  });

  if (!canMoney) {
    return (
      <PageShell>
        <PageHero title="Branch analytics" />
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Branches ka hisaab dekhne ke liye "Reports dekhna" ki permission chahiye</p>
          <Link to="/shops" className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">Branches ki list →</Link>
        </div>
      </PageShell>
    );
  }

  const loading = q.isLoading || !data;
  return (
    <PageShell>
      <PageHero
        title="Branch analytics"
        chip={<><CalendarRange />{label}</>}
        meta={branchName ? `${branchName} · ${tenantName ?? ''}` : `${data?.shops.length ?? 0} branches · ${tenantName ?? ''}`}
        busy={q.isFetching && !q.isLoading}
        loading={loading}
        actions={<>
          <PrivacyToggle compact />
          <Link to="/shops" className={heroButton}><Building2 className="h-4 w-4" /><span className="hidden sm:inline">Branches</span></Link>
          <button type="button" onClick={exportCsv} disabled={!data?.shops.length} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.shops.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: `Total sale · ${t?.bills ?? 0} bill`, value: money(t?.net ?? 0), hint: t ? <Growth v={growth} /> : undefined },
          { label: 'Net profit', value: costOf(t?.netProfit), hint: hidden ? 'Cost lock' : undefined },
          { label: 'Pichhli period', value: money(t?.prevNet ?? 0), hint: data ? rangeLabel(data.previous.from, data.previous.to) : undefined },
          { label: 'Ausat bill', value: money(t && t.bills ? t.net / t.bills : 0) },
        ]}
      />

      <KpiRow>
        {loading || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Wallet} color="#16a34a" label="Haath aaya" value={money(t.cashIn)} hint={`Udhaar ${money(t.credit)}`} />
            <KpiCard icon={RotateCcw} color="#ea580c" label="Return" value={money(t.refunds)} hint={t.net + t.refunds > 0 ? `${((t.refunds / (t.net + t.refunds)) * 100).toFixed(1)}% sale ka` : undefined} />
            <KpiCard icon={Receipt} color="#e11d48" label="Expenses" value={money(t.expenses)} hint="Paid expenses" />
            <KpiCard icon={Scale} color="#a16207" label="Nuqsan" value={costOf(t.writeOff)} hint="Kharab, gum, ginti me kam" />
            <KpiCard icon={ShoppingBag} color="#2563eb" label="Bill" value={String(t.bills)} hint={`Pehle ${t.prevBills}`} />
          </>
        )}
      </KpiRow>

      <FilterBar
        chips={branch && branchName ? <FilterChip onRemove={() => setBranch('')}>{branchName}</FilterChip> : undefined}
        onClear={() => setBranch('')}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="thisMonth" />
        <FilterMenu icon={Building2} label="Branch" value={branch} active={!!branch} onChange={setBranch}
          options={[{ value: '', label: 'Sab branches' }, ...(all?.shops ?? []).map((s) => ({ value: s.id, label: s.name, color: hue(s.id) }))]} />
        {tab === 'compare' && (
          <FilterMenu icon={TrendingUp} label="Dikhayein" value={metric} onChange={setMetric}
            options={(Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: METRICS[m].label }))} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>4</Kbd> se badlein</>}
        tabs={[
          { id: 'compare', label: 'Muqabla', icon: BarChart3 },
          { id: 'trend', label: 'Trend', icon: LineIcon },
          { id: 'hours', label: 'Rush time', icon: Clock },
          { id: 'table', label: 'Table', icon: Table2, count: data?.shops.length },
        ]} />

      {q.isError && !data ? (
        <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Hisaab load nahi hua — internet check karein aur dobara kholein.</p>
      ) : loading ? (
        <div className="space-y-4"><Skeleton className="h-80 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div></div>
      ) : !data!.shops.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <Building2 className="h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Koi chalu branch nahi</p>
          <Link to="/shops" className="mt-2 text-[0.875rem] font-semibold text-brand-700 hover:underline">Branches par jayein →</Link>
        </div>
      ) : tab === 'compare' ? (
        <CompareView data={data!} metric={metric} hue={hue} fmt={fmt} live={branch ? undefined : live.data} />
      ) : tab === 'trend' ? (
        <TrendView data={data!} hue={hue} fmt={fmt} />
      ) : tab === 'hours' ? (
        <HoursView data={data!} hue={hue} />
      ) : (
        <FiguresTable data={data!} hue={hue} fmt={fmt} />
      )}

      {guide.isOpen && (
        <PageGuide title="Branch analytics — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Period chunein', text: 'Aaj, 7 din, is mahine ya apni date. Har number usi period ka hai, aur pichhli barabar period se muqabla hota hai.' },
            { icon: BarChart3, color: '#16a34a', title: 'Muqabla', text: 'Har branch ki sale, net profit ya bill — rangeen bar is period ke, halke bar pichhli period ke.' },
            { icon: LineIcon, color: '#7c3aed', title: 'Trend', text: 'Roz ki sale har branch ki alag line me. Kaunsi branch upar ja rahi hai, kaunsi neeche.' },
            { icon: Clock, color: '#d97706', title: 'Rush time', text: 'Kis ghante sab se zyada bill bante hain — staff ki shift isi hisaab se lagayein.' },
            { icon: Table2, color: '#0891b2', title: 'Table', text: 'Sab number ek jagah: return, discount, udhaar, expenses, nuqsan aur net profit. CSV ya print nikaal lein.' },
            { icon: Building2, color: '#db2777', title: 'Ek branch', text: '"Branch" filter se sirf ek branch dekhein. Branch ke card par "Analytics" dabane se bhi yahi hota hai.' },
          ]}
          tips={[
            'Bikri me se wapsi ghatai jati hai; net munafa me kharche aur kharab/gum maal bhi ghatte hain — wohi hisaab jo Reports me hai.',
            'Din dukaan ke apne waqt par badalta hai (Settings → "Din kab shuru hota hai").',
          ]}
          shortcuts={[['1', 'muqabla'], ['2', 'trend'], ['3', 'rush time'], ['4', 'table'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
