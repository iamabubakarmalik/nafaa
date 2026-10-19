/**
 * Installations: AC, geyser, washing machine and TV fitting visits — what
 * is booked, who goes where today, jobs with no technician, late visits,
 * money still to collect, and the month's installation earnings.
 *
 * Keys: N new booking · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, Clock, Download, Filter, GraduationCap, HardHat, ListChecks,
  MessageCircle, Plus, Printer, Receipt, UserCog, UserX, Wallet, Wrench,
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
import { installationsApi, type Installation, type InstallationSummary } from '../api/installations.api';
import { techniciansApi } from '../api/technicians.api';
import { InstallationCard, NewInstallationModal, installDue, installMessage } from '../components/installationDialogs';
import { Box, Bars, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { INSTALL_KEY, INSTALL_TYPES, TECH_KEY, dayOnly, installStatusOf, serviceTypeOf, slotLabel, todayKey, waLink } from '../components/meta';
import { printInstallationJob } from '../receipt/appliancePrints';

type Tab = 'list' | 'analytics';
type View = 'open' | 'today' | 'unpaid' | 'done' | 'cancelled' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Wrench }> = [
  { id: 'open', label: 'Khula kaam', icon: HardHat },
  { id: 'today', label: 'Aaj ke visit', icon: CalendarClock },
  { id: 'unpaid', label: 'Paisa baqi', icon: Wallet },
  { id: 'done', label: 'Lag gaya', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: View) => VIEWS.find((x) => x.id === v)?.label ?? v;
const ALL_TIME: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

function viewParams(v: View) {
  const t = todayKey();
  if (v === 'open') return { open: true };
  if (v === 'today') return { from: t, to: t };
  if (v === 'unpaid') return { unpaidOnly: true };
  if (v === 'done') return { status: 'COMPLETED' };
  if (v === 'cancelled') return { status: 'CANCELLED' };
  return {};
}

export default function InstallationsPage() {
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
  const [type, setType] = useState('');
  const [range, setRange] = useState<DateRangeValue>(ALL_TIME);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [openId, setOpenId] = useState<string | null>(params.get('id'));

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, tech, type, range, query]);
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
    ...viewParams(view), page, limit: 40, search: query || undefined, technicianId: tech || undefined, serviceType: type || undefined,
    ...(period && period.from !== 'all' && view !== 'today' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [INSTALL_KEY, 'page', q], queryFn: () => installationsApi.list(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [INSTALL_KEY, 'summary'], queryFn: installationsApi.summary, refetchInterval: 60_000 });
  const techQ = useQuery({ queryKey: [TECH_KEY, 'all'], queryFn: () => techniciansApi.list(), staleTime: 5 * 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const techName = (id: string) => techQ.data?.find((t) => t.id === id)?.name ?? 'Technician';
  const filtered = !!tech || !!type || !!query || range.preset !== 'all';
  const clear = () => { setTech(''); setType(''); setSearch(''); setRange(ALL_TIME); };
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

  const fetchAll = () => installationsApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Installations — ${viewLabel(view)}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Kaam', String(all.meta.total)]],
      sections: [{
        kind: 'table',
        columns: [{ label: '#' }, { label: 'Product' }, { label: 'Customer' }, { label: 'Pata', wideOnly: true }, { label: 'Date' }, { label: 'Technician', wideOnly: true }, { label: 'Halat' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((i) => [i.installationNumber, i.productName, `${i.customerName} ${i.customerPhone}`, [i.customerAddress, i.area].filter(Boolean).join(', '),
          i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}` : '—', i.technicianName ?? '—', installStatusOf(i.status).label, sales(installDue(i))]),
      }],
      footer: all.meta.total > all.items.length ? `Pehle ${all.items.length} (kul ${all.meta.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('installations.csv', [
      ['Number', 'Kaam', 'Product', 'Serial', 'Customer', 'Phone', 'Pata', 'Ilaqa', 'Date', 'Waqt', 'Technician', 'Halat', 'Mazdoori', 'Visit', 'Saman', 'Kul', 'Mila', 'Baqi'],
      ...all.items.map((i) => [i.installationNumber, serviceTypeOf(i.serviceType), i.productName, i.serialNumber ?? '', i.customerName, i.customerPhone, i.customerAddress, i.area ?? '',
        i.scheduledDate ? dayOnly(i.scheduledDate) : '', slotLabel(i.scheduledTimeSlot), i.technicianName ?? '', installStatusOf(i.status).label,
        i.laborCharge, i.visitCharge, i.materialsCharge, i.totalCharge, i.paidByCustomer, installDue(i)]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Installations"
        chip={<><HardHat /> Fitting visits</>}
        meta="Booking, technician, date, kaam mukammal aur bill — sab ek jagah"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating(true)} title="Nayi booking (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi installation</button>}
        </>}
        stats={s ? [
          { label: 'Khula kaam', value: s.open, hint: s.overdue ? `${s.overdue} late` : undefined },
          { label: 'Aaj ke visit', value: s.todayJobs },
          { label: 'Is mahine kamai', value: sales(s.month.revenue), hint: `${s.month.jobs} kaam` },
        ] : [{ label: 'Khula kaam', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={HardHat} color="#2563eb" label="Khula kaam" value={s.open} hint={`${s.pending} ki date baqi`} onClick={() => pick('open')} active={tab === 'list' && view === 'open'} />
          <KpiCard icon={CalendarClock} color="#7c3aed" label="Aaj ke visit" value={s.todayJobs} hint="Technician ko parchi dein" onClick={() => pick('today')} active={tab === 'list' && view === 'today'} />
          <KpiCard icon={UserX} color={s.unassigned ? '#ea580c' : '#64748b'} label="Technician nahi laga" value={s.unassigned} hint={s.unassigned ? 'Banda lagayein' : 'Sab ko banda mil gaya'} onClick={() => pick('open')} />
          <KpiCard icon={AlertTriangle} color={s.overdue ? '#e11d48' : '#64748b'} label="Late" value={s.overdue} hint={s.overdue ? 'Date guzar gayi' : 'Koi late nahi'} onClick={() => pick('open')} />
          <KpiCard icon={Wallet} color={s.month.outstanding ? '#d97706' : '#64748b'} label="Paisa baqi" value={sales(s.month.outstanding)} hint="Is mahine ke kaam" onClick={() => pick('unpaid')} active={tab === 'list' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is mahine mukammal installations — kamai, wusooli aur rating</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Number, customer, phone, serial, product, pata…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {tech && <FilterChip onRemove={() => setTech('')}>{techName(tech)}</FilterChip>}
            {type && <FilterChip onRemove={() => setType('')}>{serviceTypeOf(type)}</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange(ALL_TIME)}>Date: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-60" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          <FilterMenu icon={UserCog} label={tech ? techName(tech) : 'Technician'} value={tech} active={!!tech} onChange={setTech}
            options={[{ value: '', label: 'Sab' }, ...(techQ.data ?? []).map((t) => ({ value: t.id, label: t.name, hint: t.openJobs ? `${t.openJobs} kaam` : undefined }))]} />
          <FilterMenu icon={Wrench} label={type ? serviceTypeOf(type) : 'Kaam'} value={type} active={!!type} onChange={setType}
            options={[{ value: '', label: 'Sab' }, ...INSTALL_TYPES.map((t) => ({ value: t, label: serviceTypeOf(t) }))]} />
          {view !== 'today' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Visit ki date" />}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'list', label: 'Kaam', icon: ListChecks, count: data?.meta.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics s={s} money={sales} /> : (<>
        {data && data.meta.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.meta.total} kaam</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={HardHat}
          title={filtered ? 'Is filter me koi kaam nahi' : view === 'today' ? 'Aaj koi visit nahi' : view === 'unpaid' ? 'Sab ka paisa mil gaya' : 'Koi installation nahi'}
          hint="POS par AC ya geyser bechte waqt installation book karein, ya yahan se nayi booking karein."
          actions={<>{canManage && <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Nayi installation</Button>}{filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}</>}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((i) => <InstallRow key={i.id} i={i} shopName={shopName} money={sales} onOpen={() => setOpenId(i.id)} />)}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.meta.totalPages} onPage={setPage} />}
      </>)}

      {creating && <NewInstallationModal onClose={() => setCreating(false)} onCreated={(i) => { setCreating(false); setOpenId(i.id); }} />}
      {openId && <InstallationCard id={openId} shopName={shopName} canManage={canManage} onClose={() => setOpenId(null)} />}

      {guide.isOpen && (
        <PageGuide title="Installations — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Booking', text: 'POS par AC, geyser ya washing machine bechte waqt "Installation book" karein — ya yahan "Nayi installation". Serial likhein to product aur customer khud aa jata hai.' },
            { icon: UserCog, color: '#7c3aed', title: 'Technician aur date', text: 'Kaam kholein → "Technician lagayein": banda, din aur waqt. Parchi print karein ya WhatsApp par customer ko waqt bhejein.' },
            { icon: Wallet, color: '#d97706', title: 'Advance', text: 'Customer pehle paisa de to "Advance lein" — khata me jama hota hai aur bill banne par khud lag jata hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Mukammal = bill', text: '"Mukammal" par asal mazdoori, saman aur visit likhein, paisa lein. Bill Sales, galla, Profit aur khata me aata hai; jo na mile wo udhaar.' },
            { icon: Receipt, color: '#64748b', title: 'Galti', text: 'Bill galat ban gaya ho to Sales se void karein — kaam dobara khul jata hai aur technician ka hisaab bhi wapas hota hai.' },
          ]}
          tips={['Subah "Aaj ke visit" dekhein aur har technician ko parchi dein.', 'Free installation (company ya dukaan ki taraf se) par saman ki cost Profit me kharch ki tarah aati hai.', 'Kaam sambhalne ke liye "Service jobs manage" permission chahiye.']}
          shortcuts={[['N', 'nayi booking'], ['/', 'dhoondein'], ['1', 'kaam'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function InstallRow({ i, shopName, money, onOpen }: { i: Installation; shopName: string; money: (n: number) => string; onOpen: () => void }) {
  const due = installDue(i);
  const wa = waLink(i.customerPhone, installMessage(i, shopName));
  const st = installStatusOf(i.status);
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', i.isOverdue ? 'bg-rose-50 text-rose-600' : i.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
        <HardHat className="h-5 w-5" />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{i.productName}</span>
          <Pill meta={st} />
          {i.serviceType !== 'INSTALLATION' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">{serviceTypeOf(i.serviceType)}</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{i.installationNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{i.customerName} · {i.customerPhone} — {[i.customerAddress, i.area].filter(Boolean).join(', ')}</p>
        <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', i.isOverdue ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
            {i.status === 'COMPLETED' ? `Lag gaya ${dayOnly(i.completedAt)}` : i.scheduledDate ? `${i.isOverdue ? 'Late — ' : ''}${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}` : 'Date baqi'}
          </span>
          <span className="font-normal text-slate-500">· {i.technicianName ?? 'Technician nahi laga'}</span>
        </p>
      </button>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(Number(i.totalCharge) || 0)}</p>
        {due > 0 && i.status !== 'CANCELLED' && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {money(due)}</p>}
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={() => printInstallationJob(i, shopName)} aria-label="Parchi" title="Parchi" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-3.5 w-3.5" /></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
          <button type="button" onClick={onOpen} aria-label="Kholein" title="Kholein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </li>
  );
}

function Analytics({ s, money }: { s?: InstallationSummary; money: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const m = s.month;
  const rows = [
    { key: 'p', label: 'Date baqi', value: s.pending, color: '#0ea5e9' }, { key: 's', label: 'Date lag gayi', value: s.scheduled, color: '#3b82f6' },
    { key: 'i', label: 'Kaam chal raha', value: s.inProgress, color: '#f59e0b' }, { key: 'c', label: 'Lag gaya', value: s.completed, color: '#16a34a' },
    { key: 'x', label: 'Cancel', value: s.cancelled, color: '#94a3b8' },
  ].filter((r) => r.value > 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Is mahine" hint="Mukammal kaam ka hisaab — har kaam ka bill Sales aur Profit me hai">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Kaam" value={m.jobs} /><Box label="Kamai" value={money(m.revenue)} />
          <Box label="Wusool" value={money(m.collected)} /><Box label="Baqi" value={money(m.outstanding)} tone={m.outstanding > 0 ? 'text-amber-700' : 'text-slate-900'} />
          <Box label="Saman ki cost" value={money(m.materialCost)} /><Box label="Profit" value={money(m.profit)} tone="text-emerald-700" />
          <Box label="Demo diye" value={m.demosGiven} /><Box label="Rating" value={m.avgRating ? `${m.avgRating.toFixed(1)} / 5` : '—'} />
        </dl>
      </Panel>
      <Panel title="Kaam kis halat me"><Bars rows={rows} /></Panel>
    </div>
  );
}
