/**
 * Repairs and complaints: units the customer calls about — open jobs,
 * urgent ones, jobs waiting for parts, warranty and AMC visits, money still
 * to collect, and the month's repair earnings.
 *
 * Keys: N new complaint · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock, Download, Filter, Flame, GraduationCap, ListChecks, MessageCircle, Package,
  Plus, Printer, Receipt, Send, ShieldCheck, UserCog, Wallet, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { serviceRequestsApi, type ServiceRequest, type ServiceRequestSummary } from '../api/service-requests.api';
import { techniciansApi } from '../api/technicians.api';
import { NewRepairModal, RepairCard, repairDue, repairMessage } from '../components/repairDialogs';
import { Box, Bars, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { PRIORITIES, SERVICE_KEY, TECH_KEY, dateTime, dayOnly, priorityOf, serviceStatusOf, serviceTypeOf, slotLabel, waLink } from '../components/meta';
import { printRepairJob } from '../receipt/appliancePrints';

type Tab = 'list' | 'analytics';
type View = 'open' | 'parts' | 'warranty' | 'amc' | 'unpaid' | 'done' | 'cancelled' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Wrench }> = [
  { id: 'open', label: 'Khuli shikayatein', icon: Wrench },
  { id: 'parts', label: 'Parts ka intezar', icon: Package },
  { id: 'warranty', label: 'Warranty wale', icon: ShieldCheck },
  { id: 'amc', label: 'AMC visits', icon: Send },
  { id: 'unpaid', label: 'Paisa baqi', icon: Wallet },
  { id: 'done', label: 'Theek ho gaye', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: View) => VIEWS.find((x) => x.id === v)?.label ?? v;
const ALL_TIME: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

function viewParams(v: View) {
  if (v === 'open') return { open: true };
  if (v === 'parts') return { status: 'PENDING_PARTS' };
  if (v === 'warranty') return { coveredUnderWarranty: true };
  if (v === 'amc') return { coveredUnderAmc: true };
  if (v === 'unpaid') return { unpaidOnly: true };
  if (v === 'done') return { status: 'COMPLETED' };
  if (v === 'cancelled') return { status: 'CANCELLED' };
  return {};
}

export default function ServiceRequestsPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [view, setView] = useState<View>((params.get('view') as View) || 'open');
  const [tech, setTech] = useState('');
  const [priority, setPriority] = useState('');
  const [range, setRange] = useState<DateRangeValue>(ALL_TIME);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [openId, setOpenId] = useState<string | null>(params.get('id'));

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, tech, priority, range, query]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'list') next.set('tab', tab);
    if (view !== 'open') next.set('view', view);
    if (query) next.set('q', query);
    if (openId) next.set('id', openId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view, query, openId]);

  const period = resolveRange(range, startHour);
  const q = {
    ...viewParams(view), page, limit: 40, search: query || undefined, technicianId: tech || undefined, priority: priority || undefined,
    ...(period && period.from !== 'all' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [SERVICE_KEY, 'page', q], queryFn: () => serviceRequestsApi.list(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [SERVICE_KEY, 'summary'], queryFn: serviceRequestsApi.summary, refetchInterval: 60_000 });
  const techQ = useQuery({ queryKey: [TECH_KEY, 'all'], queryFn: () => techniciansApi.list(), staleTime: 5 * 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const techName = (id: string) => techQ.data?.find((t) => t.id === id)?.name ?? 'Technician';
  const filtered = !!tech || !!priority || !!query || range.preset !== 'all';
  const clear = () => { setTech(''); setPriority(''); setSearch(''); setRange(ALL_TIME); };
  const pick = (v: View) => { setTab('list'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(true); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => serviceRequestsApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Repairs — ${viewLabel(view)}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Shikayatein', String(all.meta.total)]],
      sections: [{
        kind: 'table',
        columns: [{ label: '#' }, { label: 'Product' }, { label: 'Kharabi', wideOnly: true }, { label: 'Customer' }, { label: 'Technician', wideOnly: true }, { label: 'Halat' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((r) => [r.requestNumber, r.productName, r.reportedIssue, `${r.customerName} ${r.customerPhone}`, r.technicianName ?? '—', serviceStatusOf(r.status).label, sales(repairDue(r))]),
      }],
      footer: all.meta.total > all.items.length ? `Pehle ${all.items.length} (kul ${all.meta.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('repairs.csv', [
      ['Number', 'Darj', 'Kaam', 'Product', 'Serial', 'Kharabi', 'Customer', 'Phone', 'Pata', 'Technician', 'Halat', 'Warranty', 'AMC', 'Visit', 'Mazdoori', 'Parts', 'Kul', 'Mila', 'Baqi'],
      ...all.items.map((r) => [r.requestNumber, dayOnly(r.requestedAt), serviceTypeOf(r.serviceType), r.productName, r.serialNumber ?? '', r.reportedIssue, r.customerName, r.customerPhone, r.customerAddress,
        r.technicianName ?? '', serviceStatusOf(r.status).label, r.coveredUnderWarranty ? 'Haan' : '', r.amcContractNumber ?? '', r.visitCharge, r.laborCharge, r.partsCharge, r.totalCharge, r.paidAmount, repairDue(r)]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Repairs"
        chip={<><Wrench /> Shikayatein</>}
        meta="Customer ki call se le kar technician, parts, bill aur warranty claim tak"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating(true)} title="Nayi shikayat (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi shikayat</button>}
        </>}
        stats={s ? [
          { label: 'Khuli shikayatein', value: s.open, hint: s.urgent ? `${s.urgent} foran` : undefined },
          { label: 'Aaj theek hue', value: s.completedToday },
          { label: 'Is mahine kamai', value: sales(s.month.revenue), hint: `${s.month.jobs} kaam` },
        ] : [{ label: 'Khuli shikayatein', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wrench} color="#7c3aed" label="Khuli" value={s.open} hint={s.unassigned ? `${s.unassigned} ko technician nahi` : 'Sab ko banda laga'} onClick={() => pick('open')} active={tab === 'list' && view === 'open'} />
          <KpiCard icon={Flame} color={s.urgent ? '#e11d48' : '#64748b'} label="Foran / late" value={`${s.urgent} / ${s.overdue}`} hint="Pehle inhe dekhein" onClick={() => pick('open')} />
          <KpiCard icon={Package} color={s.pendingParts ? '#ea580c' : '#64748b'} label="Parts ka intezar" value={s.pendingParts} hint="Part mangwayein" onClick={() => pick('parts')} active={tab === 'list' && view === 'parts'} />
          <KpiCard icon={AlertTriangle} color={s.pendingFollowUps ? '#d97706' : '#64748b'} label="Follow-up" value={s.pendingFollowUps} hint="Dobara phone karein" onClick={() => pick('done')} />
          <KpiCard icon={Wallet} color={s.month.outstanding ? '#d97706' : '#64748b'} label="Paisa baqi" value={sales(s.month.outstanding)} hint="Is mahine ke kaam" onClick={() => pick('unpaid')} active={tab === 'list' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is mahine ke repair — kamai, parts, waqt aur rating</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Number, customer, phone, serial, product, kharabi…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {tech && <FilterChip onRemove={() => setTech('')}>{techName(tech)}</FilterChip>}
            {priority && <FilterChip onRemove={() => setPriority('')}>{priorityOf(priority).label}</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange(ALL_TIME)}>Darj: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-60" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          <FilterMenu icon={UserCog} label={tech ? techName(tech) : 'Technician'} value={tech} active={!!tech} onChange={setTech}
            options={[{ value: '', label: 'Sab' }, ...(techQ.data ?? []).map((t) => ({ value: t.id, label: t.name, hint: t.openJobs ? `${t.openJobs} kaam` : undefined }))]} />
          <FilterMenu icon={Flame} label={priority ? priorityOf(priority).label : 'Jaldi'} value={priority} active={!!priority} onChange={setPriority}
            options={[{ value: '', label: 'Sab' }, ...PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))]} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Darj hone ki date" />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'list', label: 'Shikayatein', icon: ListChecks, count: data?.meta.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics s={s} money={sales} /> : (<>
        {data && data.meta.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.meta.total} shikayatein</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Wrench}
          title={filtered ? 'Is filter me kuch nahi' : view === 'open' ? 'Koi khuli shikayat nahi — shabash' : 'Kuch nahi mila'}
          hint="Customer ka phone aaye to serial number likh kar shikayat darj karein — warranty aur AMC khud check hoti hai."
          actions={<>{canManage && <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Nayi shikayat</Button>}{filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}</>}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((r) => <RepairRow key={r.id} r={r} shopName={shopName} money={sales} onOpen={() => setOpenId(r.id)} />)}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.meta.totalPages} onPage={setPage} />}
      </>)}

      {creating && <NewRepairModal onClose={() => setCreating(false)} onCreated={(r) => { setCreating(false); setOpenId(r.id); }} />}
      {openId && <RepairCard id={openId} shopName={shopName} canManage={canManage} onClose={() => setOpenId(null)} />}

      {guide.isOpen && (
        <PageGuide title="Repairs — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Shikayat darj', text: '"Nayi shikayat": serial likh kar "Check" dabayein — product, customer, warranty aur AMC khud aa jate hain. Kharabi ek click me chunein.' },
            { icon: UserCog, color: '#7c3aed', title: 'Technician', text: 'Shikayat kholein → technician, din aur waqt lagayein. Parchi technician ko dein, WhatsApp par customer ko waqt bhejein.' },
            { icon: Package, color: '#ea580c', title: 'Parts', text: 'Part na ho to "Parts ka intezar" karein. Part aaye to "Kaam chal raha" par wapas.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Mukammal = bill', text: 'Kya kiya, mazdoori aur parts likhein, paisa lein. Bill Sales, galla, Profit aur khata me aata hai; baqi udhaar.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Warranty aur AMC', text: 'Warranty wale kaam par customer se kuch nahi — "Company se claim" se parts ka paisa company se lein. AMC visit khud ginti hoti hai.' },
          ]}
          tips={['Bill galat ho to Sales se void karein — shikayat dobara khul jati hai.', 'Follow-up wali shikayat par kuch din baad customer ko phone karein.', 'Kaam sambhalne ke liye "Service jobs manage" permission chahiye.']}
          shortcuts={[['N', 'nayi shikayat'], ['/', 'dhoondein'], ['1', 'list'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function RepairRow({ r, shopName, money, onOpen }: { r: ServiceRequest; shopName: string; money: (n: number) => string; onOpen: () => void }) {
  const due = repairDue(r);
  const wa = waLink(r.customerPhone, repairMessage(r, shopName));
  const urgent = r.priority === 'URGENT' || r.priority === 'HIGH';
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.isOverdue || urgent ? 'bg-rose-50 text-rose-600' : r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600')}>
        <Wrench className="h-5 w-5" />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{r.productName}</span>
          <Pill meta={serviceStatusOf(r.status)} />
          {r.priority !== 'NORMAL' && <Pill meta={priorityOf(r.priority)} />}
          {r.coveredUnderWarranty && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] text-emerald-700 ring-1 ring-emerald-200">Warranty</span>}
          {r.coveredUnderAmc && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] text-violet-700 ring-1 ring-violet-200">AMC</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{r.requestNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{r.customerName} · {r.customerPhone} — {r.reportedIssue}</p>
        <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', r.isOverdue ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
            {r.status === 'COMPLETED' ? `Theek ${dayOnly(r.completedAt)}` : r.scheduledDate ? `Visit ${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}` : `Darj ${dateTime(r.requestedAt)}`}
          </span>
          <span className="font-normal text-slate-500">· {r.technicianName ?? 'Technician nahi laga'}</span>
        </p>
      </button>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(Number(r.totalCharge) || 0)}</p>
        {due > 0 && r.status !== 'CANCELLED' && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {money(due)}</p>}
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={() => printRepairJob(r, shopName)} aria-label="Parchi" title="Parchi" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-3.5 w-3.5" /></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
          <button type="button" onClick={onOpen} aria-label="Kholein" title="Kholein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </li>
  );
}

function Analytics({ s, money }: { s?: ServiceRequestSummary; money: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const m = s.month;
  const rows = [
    { key: 'r', label: 'Nayi', value: s.requested, color: '#0ea5e9' }, { key: 's', label: 'Date lag gayi', value: s.scheduled, color: '#3b82f6' },
    { key: 'i', label: 'Kaam chal raha', value: s.inProgress, color: '#f59e0b' }, { key: 'p', label: 'Parts ka intezar', value: s.pendingParts, color: '#f97316' },
    { key: 'c', label: 'Theek ho gaye', value: s.completed, color: '#16a34a' }, { key: 'u', label: 'Theek nahi hue', value: s.unresolved, color: '#e11d48' },
  ].filter((r) => r.value > 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Is mahine" hint="Har mukammal kaam ka bill Sales aur Profit me hai">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Kaam" value={m.jobs} /><Box label="Kamai" value={money(m.revenue)} />
          <Box label="Wusool" value={money(m.collected)} /><Box label="Baqi" value={money(m.outstanding)} tone={m.outstanding > 0 ? 'text-amber-700' : 'text-slate-900'} />
          <Box label="Parts ki cost" value={money(m.partsCost)} /><Box label="Profit" value={money(m.profit)} tone="text-emerald-700" />
          <Box label="Theek hone me waqt" value={`${Math.round(m.avgResolutionHours)} ghante`} /><Box label="Rating" value={m.avgRating ? `${m.avgRating.toFixed(1)} / 5` : '—'} />
        </dl>
      </Panel>
      <Panel title="Shikayatein kis halat me"><Bars rows={rows} /></Panel>
    </div>
  );
}
