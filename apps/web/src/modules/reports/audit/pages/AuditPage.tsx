/**
 * Nigrani (audit and loss prevention): everything risky in one place for any
 * business-day period — voided bills, refunds, large hand discounts, sales
 * below cost, PIN use, drawer shorts and overs, cash taken out, stock written
 * off, damage, transfers that arrived short, deleted expenses, settings and
 * team changes, and failed or new-device logins. Filters by branch, staff,
 * type and severity; a risk score per staff member, charts, the list of
 * things to look at first, print (A4 / PDF / thermal) and CSV.
 *
 * Keys: 1–5 tab · / search · C compare · L limits · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertOctagon, ArrowDownWideNarrow, Ban, BarChart3, CalendarRange, Clock, Download, Filter, GitCompareArrows, GraduationCap,
  Layers, ListChecks, LogIn, MousePointerClick, PackageMinus, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, SlidersHorizontal,
  Store, UserRound, Users, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useAuthStore, useCanSwitchShops, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useReportCompare, useReportMasked, useReportRange } from '../../prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  AUDIT_KEY, auditApi, type AuditEvent, type AuditFilters, type AuditType, type EventSort, type Insight, type LoginStatus,
  type Severity, type StaffRisk,
} from '../api';
import { SEVERITY_META, TYPE_META, TYPE_ORDER } from '../meta';
import { downloadCsv, eventsDoc, loginsDoc, overviewDoc } from '../print';
import { AuditAnalytics } from '../components/AuditAnalytics';
import { EventDrawer } from '../components/EventDrawer';
import { EventsView } from '../components/EventsView';
import { LimitsModal, readLimits, saveLimits, type Limits } from '../components/LimitsModal';
import { LoginsView } from '../components/LoginsView';
import { Delta, Panel, ScoreRing } from '../components/parts';
import { StaffDrawer, StaffView } from '../components/StaffView';
import { WatchList } from '../components/WatchList';

type Tab = 'summary' | 'events' | 'staff' | 'analytics' | 'logins';
const TABS: Tab[] = ['summary', 'events', 'staff', 'analytics', 'logins'];
const COMPARE_KEY = 'nafaa-audit-compare';
const SORTS: Array<{ value: EventSort; label: string }> = [
  { value: 'new', label: 'Naye pehle' }, { value: 'severity', label: 'Zaroori pehle' }, { value: 'amount', label: 'Bari amount pehle' }, { value: 'old', label: 'Purane pehle' },
];
const READER_LABEL: Record<string, string> = {
  void: 'void bill', refund: 'wapsi', discount: 'chhoot', below_cost: 'cost se kam', drawer: 'drawer', cash_out: 'galle se nikale',
  stock_loss: 'stock', damage: 'damage', transfer_short: 'transfer', activity: 'PIN / settings', login: 'login',
};

export default function AuditPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { sales: money, cost, costHidden } = useReportMasked();
  const fmt = useMemo(() => ({ money, cost, costHidden }), [money, cost, costHidden]);
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const canSwitch = useCanSwitchShops();
  const tenantName = useAuthStore((s) => s.tenant?.name ?? '');
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => (TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'summary'));
  const [range, setRange] = useReportRange('month');
  const [branch, setBranch] = useState('');
  const [staffId, setStaffId] = useState(params.get('staff') ?? '');
  const [type, setType] = useState<AuditType | ''>(() => (TYPE_ORDER.includes(params.get('type') as AuditType) ? (params.get('type') as AuditType) : ''));
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<EventSort>('new');
  const [compare, toggleCompare] = useReportCompare(COMPARE_KEY);
  const [limits, setLimits] = useState<Limits>(readLimits);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('all');
  const [loginLimit, setLoginLimit] = useState(50);
  const [openEvent, setOpenEvent] = useState<AuditEvent | null>(null);
  const [openStaff, setOpenStaff] = useState<StaffRisk | null>(null);

  // Links from other pages (?staff=…&type=…&tab=…) are read once, then cleared.
  useEffect(() => {
    if (params.has('staff') || params.has('type') || params.has('tab')) setParams((p) => { p.delete('staff'); p.delete('type'); p.delete('tab'); return p; }, { replace: true });
  }, [params, setParams]);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setLoginLimit(50); }, [loginStatus, range, branch, staffId]);

  const period = useMemo(() => resolveRange(range, startHour) ?? { from: 'all', to: businessDayKey(new Date(), startHour) }, [range, startHour]);
  const label = rangeLabel(period.from, period.to);
  const filters: AuditFilters = { ...period, branch: branch || undefined, staffId: staffId || undefined, ...limits };
  const scopeKey = shopParam ?? null;

  const overview = useQuery({
    queryKey: [AUDIT_KEY, 'overview', scopeKey, filters],
    queryFn: () => auditApi.overview(filters),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const eventQuery = { ...filters, type: type || undefined, severity: severity || undefined, search: query || undefined, sort };
  const events = useInfiniteQuery({
    queryKey: [AUDIT_KEY, 'events', scopeKey, eventQuery],
    queryFn: ({ pageParam }) => auditApi.events({ ...eventQuery, page: pageParam, limit: 40 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: tab === 'events',
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const logins = useQuery({
    queryKey: [AUDIT_KEY, 'logins', scopeKey, filters, loginStatus, loginLimit],
    queryFn: () => auditApi.logins({ ...filters, status: loginStatus, page: 1, limit: loginLimit }),
    enabled: tab === 'logins',
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const { data: shops = [] } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: isAll && canSwitch });

  const d = overview.data;
  const t = d?.totals;
  const prev = compare ? d?.previous : null;
  const people = d?.people ?? [];
  const staffName = people.find((p) => p.id === staffId)?.name;
  const branchName = shops.find((s) => s.id === branch)?.name;
  const shopLabel = `${tenantName}${branchName ? ` · ${branchName}` : !isAll && shopName ? ` · ${shopName}` : isAll ? ' · Sab branches' : ''}`;
  const filtered = !!staffId || !!branch || !!type || !!severity || !!query;
  const filterText = [branchName, staffName, type && TYPE_META[type].label, severity && SEVERITY_META[severity].label, query && `"${query}"`].filter(Boolean).join(' · ');

  const focusType = (tp: AuditType) => { setType(tp); setTab('events'); };
  const focusStaff = (id: string) => { setStaffId(id); setOpenStaff(null); };
  const clear = () => { setStaffId(''); setBranch(''); setType(''); setSeverity(''); setSearch(''); };
  const pickInsight = (i: Insight) => {
    if (i.userId && !i.eventId) setStaffId(i.userId);
    setType(i.type ?? '');
    setSeverity(i.eventId ? 'high' : '');
    setTab('events');
  };
  const applyLimits = (l: Limits) => { setLimits(l); saveLimits(l); setLimitsOpen(false); toast.success('Hadd lag gayi'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1]);
      else if (e.key === '/') { e.preventDefault(); setTab('events'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (e.key.toLowerCase() === 'c') toggleCompare();
      else if (e.key.toLowerCase() === 'l') { e.preventDefault(); setLimitsOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const head = { period: label, shop: shopLabel, filters: filterText };
  const doc = async () => {
    if (tab === 'events') return eventsDoc((await auditApi.events({ ...eventQuery, page: 1, limit: 2000 })).items, fmt, head);
    if (tab === 'logins') {
      if (!logins.data) throw new Error('Report abhi aa rahi hai');
      return loginsDoc(logins.data, head);
    }
    if (!d) throw new Error('Report abhi aa rahi hai');
    return overviewDoc(d, fmt, head);
  };
  const exportCsv = async () => {
    try {
      downloadCsv(await doc(), `nigrani-${tab}-${period.from}-${period.to}.csv`);
      toast.success('CSV ban gayi');
    } catch (e) { toast.error((e as Error).message || 'CSV nahi bani'); }
  };

  const hint = (now: number, before: number | undefined, fallback: string) => (prev && before != null ? <Delta now={now} before={before} /> : fallback);

  return (
    <PageShell>
      <PageHero
        title="Nigrani"
        chip={<><CalendarRange />{label}</>}
        meta={`Chori aur nuqsan se hifazat · ${isAll ? branchName ?? 'Sab branches' : shopName ?? tenantName}`}
        busy={overview.isFetching && !overview.isLoading}
        loading={overview.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => setLimitsOpen(true)} title="Hadd (L)" className={heroButton}><SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Hadd</span></button>
          <button type="button" onClick={() => void exportCsv()} disabled={!d} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={doc} disabled={!d} /></span>
          <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: [AUDIT_KEY] })} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', overview.isFetching && 'animate-spin')} /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: 'Kul waqiye', value: String(t.events), hint: `${t.bills} bill me se` },
          { label: 'Zaroor dekhein', value: String(t.high), hint: `${t.medium} dhyan` },
          { label: 'Bari discount', value: money(t.discountValue), hint: `${t.discounts} bill` },
          { label: 'Waqt ke baad', value: String(t.afterHours), hint: d?.settings.hours },
        ] : [{ label: 'Kul waqiye', value: '' }, { label: 'Zaroor dekhein', value: '' }, { label: 'Bari discount', value: '' }, { label: 'Waqt ke baad', value: '' }]}
      />

      <KpiRow>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShieldAlert} color="#e11d48" label="Zaroor dekhein" value={t.high} hint={hint(t.high, prev?.high, 'shak wale kaam · dabayein')}
            onClick={() => { setSeverity(severity === 'high' ? '' : 'high'); setTab('events'); }} active={severity === 'high' && tab === 'events'} />
          <KpiCard icon={Ban} color={TYPE_META.void.color} label="Void bill" value={`${t.voids} · ${money(t.voidValue)}`} hint={hint(t.voidValue, prev?.voidValue, `${t.voidRate}% bill void`)}
            onClick={() => focusType('void')} active={type === 'void' && tab === 'events'} />
          <KpiCard icon={RotateCcw} color={TYPE_META.refund.color} label="Return" value={money(t.refundValue)} hint={hint(t.refundValue, prev?.refundValue, `${t.cashRefunds} cash · ${t.refundRate}% sale ka`)}
            onClick={() => focusType('refund')} active={type === 'refund' && tab === 'events'} />
          <KpiCard icon={Wallet} color={TYPE_META.drawer.color} label="Drawer kam" value={money(t.drawerShort)} hint={hint(t.drawerShort, prev?.drawerShort, `${t.shortCount} dafa · zyada ${money(t.drawerOver)}`)}
            onClick={() => focusType('drawer')} active={type === 'drawer' && tab === 'events'} />
          <KpiCard icon={PackageMinus} color={TYPE_META.stock_loss.color} label="Stock nuqsan" value={costHidden ? `${t.losses} dafa` : cost(t.cost ?? 0)} hint={costHidden ? 'Cost chhupi hai' : hint(t.cost ?? 0, prev?.cost, `${t.losses} dafa · cost par`)}
            onClick={() => focusType('stock_loss')} active={type === 'stock_loss' && tab === 'events'} />
        </>}
      </KpiRow>

      {!!d?.failed.length && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-100">
          Kuch hisse abhi load nahi hue: {d.failed.map((f) => READER_LABEL[f] ?? f).join(', ')}. Baqi report theek hai.
        </p>
      )}

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); if (v && tab !== 'events') setTab('events'); }}
          placeholder="Bill, return number, naam, wajah ya device…" label="Waqiye search" />}
        chips={filtered ? <>
          {branch && <FilterChip onRemove={() => setBranch('')}>{branchName ?? 'Branch'}</FilterChip>}
          {staffId && <FilterChip onRemove={() => setStaffId('')}>{staffName ?? 'Staff'}</FilterChip>}
          {type && <FilterChip onRemove={() => setType('')}>{TYPE_META[type].label}</FilterChip>}
          {severity && <FilterChip onRemove={() => setSeverity('')}>{SEVERITY_META[severity].label}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        {isAll && canSwitch && shops.length > 1 && (
          <FilterMenu icon={Store} label="Branch" value={branch} active={!!branch} onChange={setBranch}
            options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name, hint: s.isActive ? undefined : 'Band' }))]} />
        )}
        {people.length > 1 && (
          <FilterMenu icon={UserRound} label="Staff" value={staffId} active={!!staffId} onChange={setStaffId}
            options={[{ value: '', label: 'Sab staff' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
        )}
        <FilterMenu icon={Layers} label="Type" value={type} active={!!type} onChange={(v) => { setType(v); if (v) setTab('events'); }} width="w-72"
          options={[{ value: '' as const, label: 'Har type' }, ...TYPE_ORDER.map((tp) => ({ value: tp, label: TYPE_META[tp].label, icon: TYPE_META[tp].icon, color: TYPE_META[tp].color }))]} />
        <FilterMenu icon={Filter} label="Darja" value={severity} active={!!severity} onChange={setSeverity}
          options={[{ value: '' as const, label: 'Har darja' }, ...(['high', 'medium', 'low'] as const).map((s) => ({ value: s, label: SEVERITY_META[s].label, hint: SEVERITY_META[s].hint, color: SEVERITY_META[s].color }))]} />
        <FilterMenu icon={GitCompareArrows} label="Muqabla" value={compare ? 'on' : 'off'} active={compare} width="w-72" align="right"
          options={[{ value: 'on', label: 'Pichli period se muqabla', hint: 'Itne hi din pehle ke saath' }, { value: 'off', label: 'Muqabla band' }]}
          onChange={(v) => { if ((v === 'on') !== compare) toggleCompare(); }} />
        {tab === 'events' && <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} options={SORTS} onChange={setSort} align="right" width="w-56" />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>1</Kbd>–<Kbd>5</Kbd> tab · <Kbd>/</Kbd> search · <Kbd>L</Kbd> hadd</>}
        tabs={[
          { id: 'summary', label: 'Khulasa', icon: AlertOctagon, count: d ? d.watch.length : null },
          { id: 'events', label: 'Waqiye', icon: ListChecks, count: t ? t.events : null },
          { id: 'staff', label: 'Staff risk', icon: Users },
          { id: 'analytics', label: 'Charts', icon: BarChart3 },
          { id: 'logins', label: 'Login', icon: LogIn },
        ]} />

      {overview.error && !d ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report nahi aa saki</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{(overview.error as Error).message}</p>
          <div className="mt-4"><Button onClick={() => void overview.refetch()}>Dobara koshish</Button></div>
        </div>
      ) : tab === 'summary' ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3"><WatchList items={d?.watch} loading={overview.isLoading} onPick={pickInsight} /></div>
          <div className="space-y-4 lg:col-span-2">
            <Panel icon={Users} title="Kis par nazar rakhein" hint="Sab se zyada risk score wale. Dabane se details.">
              {!d ? <Skeleton className="h-40 rounded-xl" /> : !d.staff.some((s) => s.score > 0) ? (
                <p className="flex items-center gap-2 text-[0.8125rem] text-emerald-700"><ShieldCheck className="h-4 w-4" />Kisi ka score nahi bana</p>
              ) : (
                <ul className="space-y-1">
                  {d.staff.filter((s) => s.score > 0).slice(0, 5).map((s) => (
                    <li key={s.id ?? 'none'}>
                      <button type="button" onClick={() => setOpenStaff(s)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50">
                        <ScoreRing score={s.score} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{s.name}</span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{s.events} waqiye · {s.high} zaroori{s.topType ? ` · zyada ${TYPE_META[s.topType].label}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel icon={Layers} title="Type war" hint="Dabane se us type ke sab waqiye.">
              {!d ? <Skeleton className="h-40 rounded-xl" /> : !d.byType.length ? <p className="text-[0.8125rem] text-slate-500">Koi waqiya nahi</p> : (
                <div className="grid grid-cols-2 gap-2">
                  {d.byType.map((x) => {
                    const m = TYPE_META[x.type];
                    return (
                      <button key={x.type} type="button" onClick={() => focusType(x.type)} title={m.hint}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left ring-1 ring-slate-100 transition hover:bg-white hover:shadow-sm">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.75rem] text-slate-500">{m.label}</span>
                          <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{x.count}{x.high > 0 && <span className="ml-1 text-[0.6875rem] font-semibold text-rose-600">{x.high} zaroori</span>}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : tab === 'events' ? (
        <EventsView pages={events.data?.pages} loading={events.isLoading} loadingMore={events.isFetchingNextPage} hasMore={!!events.hasNextPage}
          onMore={() => void events.fetchNextPage()} type={type} onType={setType} severity={severity} onSeverity={setSeverity}
          startHour={startHour} fmt={fmt} onOpen={setOpenEvent} onStaff={focusStaff} filtered={filtered} onClear={clear} />
      ) : tab === 'staff' ? (
        <StaffView staff={d?.staff} loading={overview.isLoading} fmt={fmt} onOpen={setOpenStaff} />
      ) : tab === 'analytics' ? (
        <AuditAnalytics data={d} loading={overview.isLoading} fmt={fmt} onType={focusType} />
      ) : (
        <LoginsView data={logins.data} loading={logins.isLoading} status={loginStatus} onStatus={setLoginStatus}
          onMore={() => setLoginLimit((n) => Math.min(500, n + 50))} loadingMore={logins.isFetching && !logins.isLoading} onStaff={focusStaff} />
      )}

      {d?.capped && tab !== 'events' && (
        <p className="text-center text-[0.75rem] text-slate-500">Bohat zyada record — har type ke sab se naye 4,000 gine gaye. Puri tasveer ke liye period chhoti karein.</p>
      )}

      {openEvent && <EventDrawer e={openEvent} fmt={fmt} onStaff={focusStaff} onClose={() => setOpenEvent(null)} />}
      {openStaff && d && (
        <StaffDrawer s={openStaff} all={d.staff} filters={filters} fmt={fmt} onFocus={() => openStaff.id && focusStaff(openStaff.id)}
          onOpenEvent={(e) => { setOpenStaff(null); setOpenEvent(e); }} onClose={() => setOpenStaff(null)} />
      )}
      {limitsOpen && <LimitsModal value={limits} defaults={d?.settings} onSave={applyLimits} onClose={() => setLimitsOpen(false)} />}

      {guide.isOpen && (
        <PageGuide title="Nigrani — aasaan tareeqa" description="Dukaan me paisa ya maal kahan se nikal sakta hai, ek jagah" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#2563eb', title: 'Period aur branch', text: '"Period" se Aaj, 7 din, is mahine ya apni date. Malik "Branch" se ek branch chun sakta hai. Muqabla chalu ho to har number pichli period se milta hai.' },
            { icon: AlertOctagon, color: '#e11d48', title: 'Kya dekhna chahiye', text: 'Khulasa me woh baatein jo aam se hat kar hain: kisi ke void ya return dukaan ke ausat se zyada, drawer baar baar kam, ghalat PIN, aur bari amount wale waqiye.' },
            { icon: ListChecks, color: '#7c3aed', title: 'Waqiye', text: 'Void bill, return, bari discount, cost se kam sale, PIN, drawer farq, galle se nikala cash, stock kam, damage, transfer, expense mitana, settings aur login — din war.' },
            { icon: MousePointerClick, color: '#16a34a', title: 'Kholein aur jaanchein', text: 'Waqiye par dabayein: kyun nazar me aaya, kis ne, kab, aur asal record ka link (bill, return, drawer). Bande ke naam par dabane se sirf us ki report.' },
            { icon: Users, color: '#d97706', title: 'Staff risk', text: 'Har bande ka 0–100 score. Zaroori waqiya 8, dhyan wala 3, aam 1 point. Ausat se kahin zyada void ya return par aur points. Score ilzaam nahi — sirf ishara hai.' },
            { icon: SlidersHorizontal, color: '#0891b2', title: 'Apni hadd', text: '"Hadd" se tay karein kitni discount bari hai, kitni amount bari hai, aur dukaan kab khulti/band hoti hai. Ye sirf aap ki screen par lagti hai.' },
            { icon: Clock, color: '#475569', title: 'Dukaan ke waqt ke baad', text: 'Jo kaam dukaan band hone ke baad ya khulne se pehle hua, us par nishan lagta hai. Waqt Settings → Zubaan aur waqt se aata hai.' },
            { icon: Download, color: '#db2777', title: 'Print aur CSV', text: 'Jo tab khula hai usi ki report: A4, PDF, thermal slip ya Excel (CSV).' },
          ]}
          tips={[
            'Bill cancel (void) us bande ke naam aata hai jis ne cancel kiya. Purane cancel bill (jab ye record nahi hota tha) bill wale bande ke naam.',
            'Malik ke apne login, device, PIN aur settings ki tabdeeli sirf malik ko dikhti hai. Malik ka kiya void, return ya discount sab ko dikhta hai.',
            'Cost aur stock ka nuqsan sirf unhe dikhta hai jin ke paas cost dekhne ki permission hai.',
            'Rate badalna, product mitana aur cart se cheez hatana abhi record nahi hota, is liye yahan nahi aate.',
            'Login aur settings ka record kisi branch ka nahi hota — branch chunne par us branch ke bandon ka dikhta hai.',
          ]}
          shortcuts={[['1–5', 'tab'], ['/', 'dhoondein'], ['C', 'muqabla'], ['L', 'hadd'], ['G', 'guide']]}
          footer={<Link to="/activity-log" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poora activity log →</Link>}
        />
      )}
    </PageShell>
  );
}
