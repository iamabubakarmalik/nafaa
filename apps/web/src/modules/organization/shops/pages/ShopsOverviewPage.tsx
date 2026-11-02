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
import { t as tr } from '@core/i18n';

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
  const HEAD = [tr('Branch'), tr('Bill'), tr('Sale'), tr('Return'), tr('Discount'), tr('Haath aaya'), tr('Udhaar'), tr('Ausat bill'), tr('Profit'), tr('Expenses'), tr('Nuqsan'), tr('Net profit'), tr('Hissa'), tr('Pichhli se')];
  const exportCsv = () => downloadCsv(`branches-${from}-${to}.csv`, [[tr('Branch analytics — {{value}}', { value: tenantName ?? '' })], [tr('Period: {{label}}', { label })], [], HEAD, ...rows()]);
  const printDoc = (): PrintDoc => ({
    title: tr('Branch analytics'),
    subtitle: label,
    meta: [
      [tr('Branches'), String(data?.shops.length ?? 0)],
      [tr('Total sale'), money(t?.net ?? 0)],
      ...(!hidden ? [[tr('Net profit'), costOf(t?.netProfit)] as [string, string]] : []),
      [tr('Pichhli period'), `${data ? rangeLabel(data.previous.from, data.previous.to) : ''} · ${money(t?.prevNet ?? 0)}`],
    ],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Branch') }, { label: tr('Bill'), align: 'right' }, { label: tr('Sale'), align: 'right' }, { label: tr('Return'), align: 'right', wideOnly: true },
        { label: tr('Haath aaya'), align: 'right', wideOnly: true }, { label: tr('Udhaar'), align: 'right', wideOnly: true }, { label: tr('Expenses'), align: 'right', wideOnly: true },
        ...(!hidden ? [{ label: tr('Net profit'), align: 'right' as const }] : []), { label: tr('Hissa'), align: 'right', wideOnly: true },
      ],
      rows: (data?.shops ?? []).map((s) => [
        s.name, String(s.bills), money(s.net), money(s.refunds), money(s.cashIn), money(s.credit), money(s.expenses),
        ...(!hidden ? [costOf(s.netProfit)] : []), `${s.share.toFixed(1)}%`,
      ]),
      footer: t ? [tr('Kul'), String(t.bills), money(t.net), money(t.refunds), money(t.cashIn), money(t.credit), money(t.expenses), ...(!hidden ? [costOf(t.netProfit)] : []), '100%'] : undefined,
    }],
    footer: tr('Sale = bill − return · Net profit = sale − cost − expenses − nuqsan'),
  });

  if (!canMoney) {
    return (
      <PageShell>
        <PageHero title={tr('Branch analytics')} />
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{tr('Branches ka hisaab dekhne ke liye "Reports dekhna" ki permission chahiye')}</p>
          <Link to="/shops" className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">{tr('Branches ki list →')}</Link>
        </div>
      </PageShell>
    );
  }

  const loading = q.isLoading || !data;
  return (
    <PageShell>
      <PageHero
        title={tr('Branch analytics')}
        chip={<><CalendarRange />{label}</>}
        meta={branchName ? `${branchName} · ${tenantName ?? ''}` : tr('{{value}} branches · {{value2}}', { value: data?.shops.length ?? 0, value2: tenantName ?? '' })}
        busy={q.isFetching && !q.isLoading}
        loading={loading}
        actions={<>
          <PrivacyToggle compact />
          <Link to="/shops" className={heroButton}><Building2 className="h-4 w-4" /><span className="hidden sm:inline">{tr('Branches')}</span></Link>
          <button type="button" onClick={exportCsv} disabled={!data?.shops.length} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.shops.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Total sale · {{value}} bill', { value: t?.bills ?? 0 }), value: money(t?.net ?? 0), hint: t ? <Growth v={growth} /> : undefined },
          { label: tr('Net profit'), value: costOf(t?.netProfit), hint: hidden ? tr('Cost lock') : undefined },
          { label: tr('Pichhli period'), value: money(t?.prevNet ?? 0), hint: data ? rangeLabel(data.previous.from, data.previous.to) : undefined },
          { label: tr('Ausat bill'), value: money(t && t.bills ? t.net / t.bills : 0) },
        ]}
      />

      <KpiRow>
        {loading || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Wallet} color="#16a34a" label={tr('Haath aaya')} value={money(t.cashIn)} hint={tr('Udhaar {{credit}}', { credit: money(t.credit) })} />
            <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Return')} value={money(t.refunds)} hint={t.net + t.refunds > 0 ? tr('{{value}}% sale ka', { value: ((t.refunds / (t.net + t.refunds)) * 100).toFixed(1) }) : undefined} />
            <KpiCard icon={Receipt} color="#e11d48" label={tr('Expenses')} value={money(t.expenses)} hint={tr('Paid expenses')} />
            <KpiCard icon={Scale} color="#a16207" label={tr('Nuqsan')} value={costOf(t.writeOff)} hint={tr('Kharab, gum, ginti me kam')} />
            <KpiCard icon={ShoppingBag} color="#2563eb" label={tr('Bill')} value={String(t.bills)} hint={tr('Pehle {{prevBills}}', { prevBills: t.prevBills })} />
          </>
        )}
      </KpiRow>

      <FilterBar
        chips={branch && branchName ? <FilterChip onRemove={() => setBranch('')}>{branchName}</FilterChip> : undefined}
        onClear={() => setBranch('')}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="thisMonth" />
        <FilterMenu icon={Building2} label={tr('Branch')} value={branch} active={!!branch} onChange={setBranch}
          options={[{ value: '', label: tr('Sab branches') }, ...(all?.shops ?? []).map((s) => ({ value: s.id, label: s.name, color: hue(s.id) }))]} />
        {tab === 'compare' && (
          <FilterMenu icon={TrendingUp} label={tr('Dikhayein')} value={metric} onChange={setMetric}
            options={(Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: METRICS[m].label }))} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>4</Kbd> {' '}{tr('se badlein')}</>}
        tabs={[
          { id: 'compare', label: tr('Muqabla'), icon: BarChart3 },
          { id: 'trend', label: tr('Trend'), icon: LineIcon },
          { id: 'hours', label: tr('Rush time'), icon: Clock },
          { id: 'table', label: tr('Table'), icon: Table2, count: data?.shops.length },
        ]} />

      {q.isError && !data ? (
        <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">{tr('Hisaab load nahi hua — internet check karein aur dobara kholein.')}</p>
      ) : loading ? (
        <div className="space-y-4"><Skeleton className="h-80 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div></div>
      ) : !data!.shops.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <Building2 className="h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{tr('Koi chalu branch nahi')}</p>
          <Link to="/shops" className="mt-2 text-[0.875rem] font-semibold text-brand-700 hover:underline">{tr('Branches par jayein →')}</Link>
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
        <PageGuide title={tr('Branch analytics — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: tr('Period chunein'), text: tr('Aaj, 7 din, is mahine ya apni date. Har number usi period ka hai, aur pichhli barabar period se muqabla hota hai.') },
            { icon: BarChart3, color: '#16a34a', title: tr('Muqabla'), text: tr('Har branch ki sale, net profit ya bill — rangeen bar is period ke, halke bar pichhli period ke.') },
            { icon: LineIcon, color: '#7c3aed', title: tr('Trend'), text: tr('Roz ki sale har branch ki alag line me. Kaunsi branch upar ja rahi hai, kaunsi neeche.') },
            { icon: Clock, color: '#d97706', title: tr('Rush time'), text: tr('Kis ghante sab se zyada bill bante hain — staff ki shift isi hisaab se lagayein.') },
            { icon: Table2, color: '#0891b2', title: tr('Table'), text: tr('Sab number ek jagah: return, discount, udhaar, expenses, nuqsan aur net profit. CSV ya print nikaal lein.') },
            { icon: Building2, color: '#db2777', title: tr('Ek branch'), text: tr('"Branch" filter se sirf ek branch dekhein. Branch ke card par "Analytics" dabane se bhi yahi hota hai.') },
          ]}
          tips={[
            tr('Sale me se wapsi ghatai jati hai; net profit me kharche aur kharab/gum maal bhi ghatte hain — wohi hisaab jo Reports me hai.'),
            tr('Din dukaan ke apne waqt par badalta hai (Settings → "Din kab shuru hota hai").'),
          ]}
          shortcuts={[['1', tr('muqabla')], ['2', tr('trend')], ['3', tr('rush time')], ['4', tr('table')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}
