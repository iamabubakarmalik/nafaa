/**
 * Tax: PRA, SRB, KPRA and FBR POS in one place.
 *   /tax           overview: taxable sale, tax, delivery per authority, this month against last
 *   /tax/invoices  every bill sent: fiscal number, QR, the authority's answer, retry
 *   /tax/reports   monthly sales-tax return figures per authority, A4 print and CSV
 *   /tax/settings  per-authority setup: branches, POS IDs, keys, test bill
 *
 * Keys: 1–4 tabs · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CheckCircle2, Clock, Download, FileText, Filter, GraduationCap, Landmark, Percent, ReceiptText, RotateCcw, Settings2, ShieldAlert,
  Store, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange,
} from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { useBusinessDayStart, businessDayKey } from '@core/lib/business-day';
import { presetRange, rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useIsAllShops } from '@core/stores/auth.store';
import { useReportMasked, useReportRange } from '@modules/reports/prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { TAX_KEY, taxApi, type Authority, type InvoiceQuery, type TaxStatus } from './api';
import { AUTH, AUTHORITY_ORDER, STATUS, apiError, change, monthName } from './meta';
import { invoicesDoc, monthlyReturnDoc } from './print';
import { InvoiceDrawer } from './components/InvoiceDrawer';
import { InvoicesView } from './components/InvoicesView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { OverviewView } from './components/OverviewView';
import { SettingsView } from './components/SettingsView';
import { TaxGuide } from './components/TaxGuide';

type Tab = 'overview' | 'invoices' | 'reports' | 'settings';
const PATH: Record<Tab, string> = { overview: '/tax', invoices: '/tax/invoices', reports: '/tax/reports', settings: '/tax/settings' };
const TABS: Tab[] = ['overview', 'invoices', 'reports', 'settings'];
const tabOf = (p: string): Tab => (p.startsWith('/tax/invoices') ? 'invoices' : p.startsWith('/tax/reports') ? 'reports' : p.startsWith('/tax/settings') ? 'settings' : 'overview');
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

export default function TaxPage() {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !MANAGERS.includes(role)) {
    return (
      <PageShell>
        <EmptyState className="min-h-[50vh]" icon={<ShieldAlert className="h-6 w-6" />} title="Tax sirf malik ya manager dekh sakte hain"
          description="Is safhe par dukaan ki poori bikri aur tax ka hisaab hai. Malik se kahein agar aap ko dekhna hai." />
      </PageShell>
    );
  }
  return <Tax />;
}

function Tax() {
  const { pathname, search: qs } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tab = tabOf(pathname);
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const { sales: money } = useReportMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const urlParams = useMemo(() => new URLSearchParams(qs), [qs]);
  const thisMonth = businessDayKey(new Date(), startHour).slice(0, 7);

  const [range, setRange] = useReportRange('thisMonth');
  const [authority, setAuthority] = useState<Authority | ''>('');
  const [shopId, setShopId] = useState('');
  const [status, setStatus] = useState<TaxStatus | ''>(() => (urlParams.get('status') as TaxStatus) || '');
  const [kind, setKind] = useState<'' | 'SALE' | 'RETURN'>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(() => urlParams.get('month') || thisMonth);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, authority, shopId, status, kind, query]);
  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);
  // Links like /tax/invoices?status=FAILED or /tax/reports?month=2026-09
  useEffect(() => {
    const s = urlParams.get('status');
    if (s && s in STATUS) setStatus(s as TaxStatus);
    const m = urlParams.get('month');
    if (m && /^\d{4}-\d{2}$/.test(m)) setMonth(m);
  }, [urlParams]);

  const go = (t: Tab) => navigate(PATH[t]);
  const showInvoices = (s: TaxStatus | '', a?: Authority) => { setStatus(s); if (a) setAuthority(a); navigate(PATH.invoices); };
  const showReport = (m: string) => { setMonth(m); navigate(PATH.reports); };

  const resolved = resolveRange(range, startHour);
  const period = resolved ?? presetRange('thisMonth', startHour);
  const filter = { from: period.from, to: period.to, authority, shopId: shopId || undefined };
  const invQuery: InvoiceQuery = {
    ...(tab === 'invoices' && !resolved ? { authority, shopId: shopId || undefined } : filter),
    status, kind, search: query || undefined, page, limit: 30,
  };

  const analyticsQ = useQuery({ queryKey: [TAX_KEY, 'analytics', filter], queryFn: () => taxApi.analytics(filter), placeholderData: keepPreviousData, refetchInterval: 60_000, enabled: tab !== 'settings' });
  const invoicesQ = useQuery({ queryKey: [TAX_KEY, 'invoices', invQuery], queryFn: () => taxApi.invoices(invQuery), placeholderData: keepPreviousData, enabled: tab === 'invoices' });
  const reportQ = useQuery({ queryKey: [TAX_KEY, 'report', month, authority, shopId], queryFn: () => taxApi.report({ month, authority, shopId: shopId || undefined }), placeholderData: keepPreviousData, enabled: tab === 'reports' });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });

  const a = analyticsQ.data;
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const branchOf = (id: string | null) => (id ? (shopsQ.data ?? []).find((s) => s.id === id)?.name ?? 'Branch' : '—');
  const authorities = AUTHORITY_ORDER.filter((x) => a?.profiles.some((p) => p.authority === x));
  const onNames = (a?.profiles ?? []).filter((p) => p.enabled).map((p) => p.authority);

  const refresh = () => qc.invalidateQueries({ queryKey: [TAX_KEY] });
  const retry = useMutation({
    mutationFn: taxApi.retry,
    onSuccess: (r) => {
      if ('skipped' in r) toast.error(r.reason);
      else if (r.status === 'SUCCESS') toast.success(`Number mil gaya: ${r.fiscalNumber}`);
      else if (r.status === 'PENDING') toast('Abhi bheja ja raha hai, thori der me dekhein');
      else toast.error(r.error ?? 'Abhi bhi fail');
      refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Dobara nahi bheja')),
  });
  const retryAll = useMutation({
    mutationFn: () => taxApi.retryFailed(authority),
    onSuccess: (r) => {
      if (r.queued) toast.success(`${r.queued} bill dobara bheje ja rahe hain. 1-2 minute me list taaza karein.`);
      else toast(r.running ? 'Pehle wale bill abhi bheje ja rahe hain' : 'Koi fail bill nahi');
      setTimeout(refresh, 15_000);
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const csv = useMutation({
    mutationFn: () => taxApi.reportCsv({ month, authority, shopId: shopId || undefined }),
    onSuccess: () => toast.success('CSV download ho gayi (Excel me khulti hai)'),
    onError: (e) => toast.error(apiError(e, 'CSV nahi bani')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) { e.preventDefault(); navigate(PATH[TABS[n - 1]]); }
      if (e.key === '/') { e.preventDefault(); if (tab !== 'invoices') navigate(PATH.invoices); window.setTimeout(() => searchRef.current?.focus(), 50); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, tab]);

  const periodText = resolved ? rangeLabel(resolved.from, resolved.to) : 'Sab tareekhen';
  const filterText = [authority && AUTH[authority].label, shopId && branchOf(shopId), status && STATUS[status].label, kind && (kind === 'RETURN' ? 'Wapsi' : 'Bill'), query && `"${query}"`].filter(Boolean).join(' · ');
  const filtered = !!authority || !!shopId || !!status || !!kind || !!query;
  const clear = () => { setAuthority(''); setShopId(''); setStatus(''); setKind(''); setSearch(''); };

  const printDoc = tab === 'reports'
    ? () => monthlyReturnDoc(reportQ.data!, money)
    : async () => invoicesDoc((await taxApi.invoices({ ...invQuery, page: 1, limit: 200 })).rows, money, periodText, filterText, branchOf);
  const canPrint = tab === 'reports' ? !!reportQ.data : tab === 'invoices' && !!invoicesQ.data?.rows.length;

  const t = a?.totals;
  const vsLast = a ? change(a.thisMonth.tax, a.lastMonthToDate.tax) : null;
  const waiting = a ? a.health.pending + a.missing : 0;
  const r = reportQ.data;

  const authorityMenu = authorities.length > 1 && (
    <FilterMenu icon={Landmark} label="Authority" value={authority} active={!!authority} onChange={setAuthority}
      options={[{ value: '' as const, label: 'Sab authorities' }, ...authorities.map((x) => ({ value: x, label: AUTH[x].label, color: AUTH[x].color }))]} />
  );
  const branchMenu = allShops && shops.length > 1 && (
    <FilterMenu icon={Store} label="Branch" value={shopId} active={!!shopId} onChange={setShopId}
      options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
  );
  const chips = filtered ? <>
    {authority && <FilterChip onRemove={() => setAuthority('')}>{AUTH[authority].label}</FilterChip>}
    {shopId && <FilterChip onRemove={() => setShopId('')}>{branchOf(shopId)}</FilterChip>}
    {status && tab === 'invoices' && <FilterChip onRemove={() => setStatus('')}>{STATUS[status].label}</FilterChip>}
    {kind && tab === 'invoices' && <FilterChip onRemove={() => setKind('')}>{kind === 'RETURN' ? 'Sirf wapsi' : 'Sirf bill'}</FilterChip>}
    {query && tab === 'invoices' && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
  </> : undefined;

  return (
    <PageShell>
      <PageHero
        title="Tax"
        chip={<><Landmark /> {onNames.length ? onNames.join(' · ') : 'Band'}</>}
        meta="Har bill authority ko, bill par fiscal number aur QR, mahine ki report"
        busy={analyticsQ.isFetching && !analyticsQ.isLoading}
        loading={analyticsQ.isLoading && tab !== 'settings'}
        actions={<>
          {(tab === 'invoices' || tab === 'reports') && (
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!canPrint} /></span>
          )}
          {tab === 'reports' && (
            <button type="button" onClick={() => csv.mutate()} disabled={csv.isPending || !r} className={heroButton}><Download className="h-4 w-4" /> CSV</button>
          )}
          {tab !== 'settings' && <button type="button" onClick={() => go('settings')} className={heroButton}><Settings2 className="h-4 w-4" /> Settings</button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={a ? [
          { label: 'Is mahine ka tax', value: money(a.thisMonth.tax), hint: `${a.thisMonth.bills} bill` },
          { label: 'Pichla mahina', value: money(a.lastMonth.tax) },
          { label: 'Fail', value: a.health.failed, hint: waiting ? `${waiting} qatar me` : undefined },
        ] : [{ label: 'Is mahine ka tax', value: '—' }]}
      />

      {(tab === 'overview' || tab === 'invoices') && (
        <KpiRow cols={5}>
          {!a || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={ReceiptText} color="#2563eb" label="Taxable sale" value={money(t.saleValue)}
              hint={`${t.bills} bill${t.returns ? ` · ${t.returns} wapsi` : ''} · tax ke baghair`} />
            <KpiCard icon={Percent} color="#16a34a" label="Tax jama hua" value={money(t.tax)}
              hint={`${t.saleValue ? `Ausat ${((t.tax / t.saleValue) * 100).toFixed(1)}% · ` : ''}${rangeLabel(period.from, period.to)}`} />
            <KpiCard icon={vsLast != null && vsLast < 0 ? TrendingDown : TrendingUp} color={vsLast == null ? '#64748b' : vsLast >= 0 ? '#16a34a' : '#e11d48'}
              label="Pichle mahine se" value={vsLast == null ? '—' : `${vsLast > 0 ? '+' : ''}${vsLast}%`}
              hint={`Is mahine ${money(a.thisMonth.tax)} · pichle isi din tak ${money(a.lastMonthToDate.tax)}`}
              onClick={() => setRange({ preset: 'thisMonth', custom: { from: '', to: '' } })} active={range.preset === 'thisMonth' && tab === 'overview'} />
            <KpiCard icon={CheckCircle2} color="#0891b2" label="Authority ne liye" value={a.health.success}
              hint={a.health.successRate == null ? 'Abhi koi bill nahi gaya' : `${a.health.successRate}% kamyab${a.health.avgSeconds != null ? ` · ausat ${a.health.avgSeconds}s` : ''}`}
              onClick={() => showInvoices('SUCCESS')} active={tab === 'invoices' && status === 'SUCCESS'} />
            <KpiCard icon={a.health.failed ? RotateCcw : Clock} color={a.health.failed ? '#e11d48' : '#d97706'} label="Fail / qatar me" value={a.health.failed + waiting}
              hint={`${a.health.failed} fail · ${a.health.pending} qatar me${a.missing ? ` · ${a.missing} abhi nahi gaye` : ''}`}
              onClick={() => showInvoices(a.health.failed ? 'FAILED' : 'PENDING')} active={tab === 'invoices' && (status === 'FAILED' || status === 'PENDING')} />
          </>}
        </KpiRow>
      )}

      {tab === 'reports' && (
        <KpiRow cols={5}>
          {!r ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={ReceiptText} color="#2563eb" label="Sale (tax ke baghair)" value={money(r.totals.grossValue)} hint={`${r.totals.bills} bill`} />
            <KpiCard icon={Percent} color="#16a34a" label="Output tax" value={money(r.totals.grossTax)} hint="Bills par laga tax" />
            <KpiCard icon={RotateCcw} color="#d97706" label="Credit notes (wapsi)" value={money(r.totals.returnTax)} hint={`${r.totals.returns} wapsi · ${money(r.totals.returnValue)}`} />
            <KpiCard icon={Landmark} color="#7c3aed" label="Net tax" value={money(r.totals.tax)} hint="Output tax - credit notes" />
            <KpiCard icon={Clock} color={r.notSent.bills ? '#e11d48' : '#64748b'} label="Report me nahi" value={r.notSent.bills}
              hint={r.notSent.bills ? `Tax ${money(r.notSent.tax)} · authority ne abhi nahi liya` : 'Sab bill shamil hain'}
              onClick={r.notSent.bills ? () => showInvoices('FAILED') : undefined} />
          </>}
        </KpiRow>
      )}

      {tab === 'overview' && (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Saare figures isi muddat ke hain. Sirf woh bill ginte hain jo authority ne qabool kiye.</p>}
          chips={chips} onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
          {authorityMenu}
          {branchMenu}
        </FilterBar>
      )}

      {tab === 'invoices' && (
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Bill number ya authority ka number…" label="Dhoondein" />}
          chips={chips} onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" />
          {authorityMenu}
          <FilterMenu icon={Filter} label="Haal" value={status} active={!!status} onChange={setStatus}
            options={[{ value: '' as const, label: 'Sab' }, ...(Object.keys(STATUS) as TaxStatus[]).map((k) => ({
              value: k, label: STATUS[k].label, icon: STATUS[k].icon, color: STATUS[k].color,
              hint: invoicesQ.data?.counts[k] != null ? String(invoicesQ.data.counts[k]) : undefined,
            }))]} />
          <FilterMenu icon={FileText} label={kind === 'RETURN' ? 'Sirf wapsi' : kind === 'SALE' ? 'Sirf bill' : 'Bill aur wapsi'} value={kind} active={!!kind} onChange={setKind} align="right"
            options={[{ value: '' as const, label: 'Bill aur wapsi' }, { value: 'SALE' as const, label: 'Sirf bill' }, { value: 'RETURN' as const, label: 'Sirf wapsi (credit note)' }]} />
          {branchMenu}
        </FilterBar>
      )}

      {tab === 'reports' && (
        <FilterBar search={
          <label className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-[0.8125rem] font-medium text-slate-600">Mahina</span>
            <input type="month" value={month} max={thisMonth} onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-11 rounded-2xl border-0 bg-slate-100/80 px-4 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
            <span className="hidden text-[0.8125rem] text-slate-500 sm:inline">{monthName(month)} ka sales tax return</span>
          </label>
        } chips={authority || shopId ? chips : undefined} onClear={clear}>
          {authorityMenu}
          {branchMenu}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={go}
        hint={<><Kbd>1</Kbd>-<Kbd>4</Kbd> tabs · <Kbd>/</Kbd> dhoondein · <Kbd>G</Kbd> guide</>}
        tabs={[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'invoices', label: 'Invoices', icon: FileText, count: a ? a.health.failed || null : null },
          { id: 'reports', label: 'Mahine ki report', icon: Download },
          { id: 'settings', label: 'Settings', icon: Settings2 },
        ]} />

      {tab === 'overview' && (
        <OverviewView data={a} loading={analyticsQ.isLoading} failed={analyticsQ.isError && !a} onRetryLoad={() => analyticsQ.refetch()}
          money={money} onInvoices={showInvoices} onReport={showReport} onSettings={() => go('settings')} onOpen={setOpenId} />
      )}
      {tab === 'invoices' && (
        <InvoicesView q={invoicesQ} money={money} showShop={allShops && !shopId && shops.length > 1} branchOf={branchOf} filtered={filtered} onClear={clear}
          page={page} setPage={setPage} onOpen={setOpenId}
          onRetry={(id) => retry.mutate(id)} retrying={retry.isPending ? retry.variables : undefined}
          failedCount={invoicesQ.data?.counts.FAILED ?? 0} onRetryAll={() => retryAll.mutate()} retryingAll={retryAll.isPending} />
      )}
      {tab === 'reports' && (
        <MonthlyReportView q={reportQ} money={money} onInvoices={showInvoices} />
      )}
      {tab === 'settings' && <SettingsView />}

      {openId && (
        <InvoiceDrawer id={openId} money={money} branchOf={branchOf} onClose={() => setOpenId(null)} onOpen={setOpenId}
          onRetry={(id) => retry.mutate(id)} retrying={retry.isPending && retry.variables === openId} />
      )}
      {guide.isOpen && <TaxGuide onClose={guide.close} />}
    </PageShell>
  );
}
