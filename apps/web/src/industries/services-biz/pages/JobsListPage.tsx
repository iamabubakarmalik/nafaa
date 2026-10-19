/**
 * Service jobs: every job card and where it stands — booked, technician
 * on the way or working, waiting for parts or the customer's go-ahead,
 * ready for the bill — what is late, money still owed on billed jobs, and
 * the month's earnings.
 *
 * Keys: N new job · / search · 1 jobs · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Briefcase, CalendarClock, CheckCircle2, Clock, Download, FileText, Filter, Flame, GraduationCap,
  ListChecks, MapPin, MessageCircle, Package, Plus, Printer, Receipt, Truck, UserCog, Wallet, Wrench,
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
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { jobsApi, type JobListParams, type JobSort, type JobStats, type JobView, type Priority, type ServiceJob } from '../api/jobs.api';
import { techniciansApi } from '../api/technicians.api';
import { jobMessage, printJobCard } from '../components/slips';
import { JOB_KEY, PRIORITIES, READY, TECH_KEY, categoryOf, dateTime, dayOnly, isOnSite, itemName, placeOf, priorityOf, statusOf, waLink } from '../components/meta';

type Tab = 'jobs' | 'analytics';
const VIEWS: Array<{ id: JobView; label: string; icon: typeof Wrench }> = [
  { id: 'open', label: 'Chaalu jobs', icon: Briefcase },
  { id: 'booked', label: 'Booked — technician baqi', icon: CalendarClock },
  { id: 'working', label: 'Kaam chal raha', icon: Wrench },
  { id: 'waiting', label: 'Parts / haan ka intezar', icon: Package },
  { id: 'ready', label: 'Tayyar — bill baqi', icon: CheckCircle2 },
  { id: 'late', label: 'Late', icon: AlertTriangle },
  { id: 'unpaid', label: 'Udhaar baqi', icon: Wallet },
  { id: 'closed', label: 'Mukammal / cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: JobView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const SORTS: Array<{ value: JobSort; label: string }> = [
  { value: 'due', label: 'Jo pehle karni hai' }, { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' }, { value: 'amount', label: 'Bara bill pehle' },
];
const ALL_TIME: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

export default function JobsListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const shopId = useShopParam();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'jobs');
  const [view, setView] = useState<JobView>((params.get('view') as JobView) || 'open');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [tech, setTech] = useState(params.get('technician') ?? '');
  const [range, setRange] = useState<DateRangeValue>(ALL_TIME);
  const [sort, setSort] = useState<JobSort>('due');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, priority, tech, range, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'jobs') next.delete('tab'); else next.set('tab', tab);
    if (view === 'open') next.delete('view'); else next.set('view', view);
    if (query) next.set('q', query); else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view, query]);

  const period = resolveRange(range, startHour);
  const q: JobListParams = {
    view, shopId: shopId || undefined, page, limit: 40, sort, search: query || undefined, priority: priority || undefined, technicianId: tech || undefined,
    ...(period && period.from !== 'all' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [JOB_KEY, 'page', q], queryFn: () => jobsApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'jobs' });
  const statsQ = useQuery({ queryKey: [JOB_KEY, 'stats', shopId], queryFn: () => jobsApi.stats(shopId || undefined), refetchInterval: 60_000 });
  const techQ = useQuery({ queryKey: [TECH_KEY], queryFn: () => techniciansApi.list(), staleTime: 5 * 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const techName = (id: string) => techQ.data?.find((t) => t.staffId === id)?.staff?.fullName ?? 'Technician';
  const filtered = !!priority || !!tech || !!query || range.preset !== 'all';
  const clear = () => { setPriority(''); setTech(''); setSearch(''); setRange(ALL_TIME); };
  const pick = (v: JobView) => { setTab('jobs'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/services-biz/jobs/new'); }
      if (e.key === '1') setTab('jobs');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('jobs'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const fetchAll = () => jobsApi.page({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Service jobs — ${viewLabel(view)}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Jobs', String(all.total)], ['Bill', sales(all.totals.bill)], ['Baqi', sales(all.totals.due)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Kaam' }, { label: 'Customer', wideOnly: true }, { label: 'Kahan', wideOnly: true }, { label: 'Halat' }, { label: 'Technician', wideOnly: true }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((j) => [j.jobNumber, j.serviceName, [j.customerName, j.customerPhone].filter(Boolean).join(' '), placeOf(j), statusOf(j.status).label, j.technicianName ?? '—', sales(j.due ?? 0)]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} jobs (kul ${all.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('service-jobs.csv', [
      ['Job', 'Bani', 'Kaam', 'Category', 'Customer', 'Phone', 'Cheez', 'Kahan', 'Area', 'Waqt', 'Technician', 'Halat', 'Mukammal', 'Visit', 'Labour', 'Parts', 'Transport', 'Discount', 'Bill', 'Mila', 'Baqi'],
      ...all.items.map((j) => [j.jobNumber, dayOnly(j.createdAt), j.serviceName, categoryOf(j.category), j.customerName ?? '', j.customerPhone ?? '', itemName(j), placeOf(j), j.area ?? '',
        j.scheduledStart ? dateTime(j.scheduledStart) : '', j.technicianName ?? '', statusOf(j.status).label, j.completedAt ? dayOnly(j.completedAt) : '',
        j.visitCharge, j.labourCharge, j.partsCharge, j.transportCharge, j.discountAmount, j.totalCharge, j.paidAmount, j.due ?? 0]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Service jobs"
        chip={<><Wrench /> Job cards</>}
        meta="Kaam lein, technician bhejein, parts likhein, bill bana kar paisa lein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'jobs' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <Link to="/services-biz/dispatch" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Dispatch</span></Link>
          <Link to="/services-biz/quotes" className={heroButton}><FileText className="h-4 w-4" /><span className="hidden sm:inline">Quotes</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/services-biz/jobs/new" title="Naya job (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya job</Link>}
        </>}
        stats={s ? [
          { label: 'Chaalu jobs', value: s.open, hint: s.late ? `${s.late} late` : undefined },
          { label: 'Aaj aayi / mukammal', value: `${s.todayIn} / ${s.todayDone}`, hint: s.todayBooked ? `${s.todayBooked} visit aaj` : undefined },
          { label: 'Is mahine kamai', value: sales(s.monthRevenue), hint: `${s.monthDone} jobs` },
        ] : [{ label: 'Chaalu jobs', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarClock} color={s.unassigned ? '#0284c7' : '#64748b'} label="Technician baqi" value={s.unassigned} hint={`${s.booked} booked`} onClick={() => pick('booked')} active={tab === 'jobs' && view === 'booked'} />
          <KpiCard icon={Wrench} color="#7c3aed" label="Kaam chal raha" value={s.working} hint={`${s.onTheWay} raste me · ${s.onSite} site par`} onClick={() => pick('working')} active={tab === 'jobs' && view === 'working'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar — bill baqi" value={s.ready} hint={s.readyDue ? `${sales(s.readyDue)} lena hai` : 'Customer ko batayein'} onClick={() => pick('ready')} active={tab === 'jobs' && view === 'ready'} />
          <KpiCard icon={AlertTriangle} color={s.late ? '#e11d48' : '#64748b'} label="Late" value={s.late} hint={s.urgent ? `${s.urgent} urgent` : 'Waqt guzar gaya'} onClick={() => pick('late')} active={tab === 'jobs' && view === 'late'} />
          <KpiCard icon={Wallet} color={s.unpaidDue ? '#d97706' : '#64748b'} label="Udhaar baqi" value={sales(s.unpaidDue)} hint={`${s.unpaidJobs} job`} onClick={() => pick('unpaid')} active={tab === 'jobs' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is mahine mukammal jobs — kamai, kaam aur parts</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Job #, customer, phone, brand, serial, area…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {priority && <FilterChip onRemove={() => setPriority('')}>{priorityOf(priority).label}</FilterChip>}
            {tech && <FilterChip onRemove={() => setTech('')}>{techName(tech)}</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange(ALL_TIME)}>{view === 'closed' || view === 'unpaid' ? 'Mukammal' : 'Bani'}: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-64"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          <FilterMenu icon={Flame} label={priority ? priorityOf(priority).label : 'Jaldi'} value={priority} active={!!priority} onChange={setPriority}
            options={[{ value: '' as Priority | '', label: 'Sab' }, ...PRIORITIES.map((p) => ({ value: p as Priority | '', label: priorityOf(p).label }))]} />
          <FilterMenu icon={UserCog} label={tech ? techName(tech) : 'Technician'} value={tech} active={!!tech} onChange={setTech}
            options={[{ value: '', label: 'Sab' }, ...(techQ.data ?? []).map((t) => ({ value: t.staffId, label: t.staff?.fullName ?? 'Technician', hint: t.openJobs ? `${t.openJobs} chal rahe` : undefined }))]} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={view === 'closed' || view === 'unpaid' ? 'Mukammal hone ki date' : 'Banne ki date'} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? 'Tarteeb'} value={sort} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'jobs', label: 'Jobs', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <JobAnalytics stats={s} /> : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} jobs · bill {sales(data.totals.bill)}</span>
            <span className="text-slate-600">mila {sales(data.totals.paid)}</span>
            {data.totals.due > 0 && <span className="text-amber-700">baqi {sales(data.totals.due)}</span>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Jobs load nahi hue</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi job nahi' : view === 'late' ? 'Koi job late nahi — shabash' : view === 'ready' ? 'Koi job bill ke liye tayyar nahi' : 'Koi job nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Customer ka phone aaye ya saman aaye to job banayein, parchi dein — tayyar hote hi WhatsApp karein.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => navigate('/services-biz/jobs/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya job</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
              {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab jobs dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((j) => <JobRow key={j.id} j={j} shopName={shopName} money={sales} />)}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {guide.isOpen && (
        <PageGuide title="Service jobs — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Job banayein', text: '"Naya job": customer, kya kaam hai, cheez (brand/model), dukaan par ya ghar par, waqt aur andaza. Advance ho to wahin likhein — customer ke khata me jama hota hai.' },
            { icon: Truck, color: '#7c3aed', title: 'Technician bhejein', text: 'Job kholein → "Technician lagayein". Dispatch page par saari booked jobs aur free technician ek saath dikhte hain.' },
            { icon: Package, color: '#ea580c', title: 'Parts', text: 'Kaam me laga part job par jorein — dukaan ka part bill par stock se nikalta hai; bahar se liya ya customer ka apna bhi likh sakte hain.' },
            { icon: MessageCircle, color: '#22c55e', title: 'Customer ko batayein', text: 'Har job par WhatsApp — halat, waqt aur baqi paisa khud likha hota hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Bill', text: '"Bill banayein" par baqi paisa lein (split bhi). Bill Sales, Profit, galla aur khata sab me aata hai. Counter (POS) par "Tayyar jobs" se bhi bill hota hai.' },
            { icon: Printer, color: '#64748b', title: 'Parchi', text: 'Job card dukaan ke bill design me chhapta hai — customer isi se saman wapas leta hai.' },
          ]}
          tips={['"Late" card roz subah dekhein.', 'Bill ghalat ban gaya ho to Sales se void karein — job dobara khul jati hai, theek kar ke dobara bill banayein.', 'Job sambhalne ke liye "Service jobs manage" aur paisa lene ke liye "POS" ki permission chahiye.']}
          shortcuts={[['N', 'naya job'], ['/', 'dhoondein'], ['1', 'jobs'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function JobRow({ j, shopName, money }: { j: ServiceJob; shopName: string; money: (n: number) => string }) {
  const due = j.due ?? Math.max(j.totalCharge - j.paidAmount, 0);
  const st = statusOf(j.status);
  const ready = READY.includes(j.status);
  const wa = waLink(j.customerPhone, jobMessage(j, shopName));
  const item = itemName(j);
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', j.isLate ? 'bg-rose-50 text-rose-600' : ready ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600')}>
        {isOnSite(j.locationType) ? <MapPin className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
      </span>
      <Link to={`/services-biz/jobs/${j.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{j.serviceName}</span>
          {item && <span className="truncate text-[0.8125rem] text-slate-600">{item}</span>}
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
          {j.priority !== 'NORMAL' && <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', priorityOf(j.priority).tone)}>{priorityOf(j.priority).label}</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{j.jobNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{[j.customerName, j.customerPhone].filter(Boolean).join(' · ') || 'Customer nahi likha'} — {placeOf(j)}</p>
        <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', j.isLate ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
            {j.status === 'COMPLETED' ? `Mukammal ${dayOnly(j.completedAt)}` : j.status === 'CANCELLED' ? `Cancel ${dayOnly(j.cancelledAt)}` : j.scheduledStart ? (j.isLate ? `Late — waqt ${dateTime(j.scheduledEnd ?? j.scheduledStart)}` : dateTime(j.scheduledStart)) : `Bani ${dateTime(j.createdAt)}`}
          </span>
          <span className="font-normal text-slate-500">· {j.technicianName ?? 'Technician nahi laga'}</span>
        </p>
      </Link>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(j.totalCharge)}</p>
        {due > 0 && j.status !== 'CANCELLED' && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {money(due)}</p>}
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={() => printJobCard(j, shopName)} aria-label="Parchi" title="Parchi" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-3.5 w-3.5" /></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
        </div>
      </div>
    </li>
  );
}

function JobAnalytics({ stats: s }: { stats?: JobStats }) {
  const { sales } = useMasked();
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const max = Math.max(1, ...s.byStatus.map((b) => b.count));
  const other = Math.max(s.monthRevenue - s.monthLabour - s.monthParts, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Kamai — is mahine</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <Box label="Jobs mukammal" value={String(s.monthDone)} />
          <Box label="Kul bill" value={sales(s.monthRevenue)} />
          <Box label="Visit + kaam" value={sales(s.monthLabour)} />
          <Box label="Parts" value={sales(s.monthParts)} />
          <Box label="Transport / tax / aur" value={sales(other)} />
          <Box label="Udhaar baqi" value={sales(s.unpaidDue)} tone={s.unpaidDue > 0 ? 'text-amber-700' : 'text-slate-900'} />
        </dl>
        <p className="mt-3 text-[0.75rem] text-slate-500">Profit aur Cost Reports → Profit me — har job ka bill wahan sale ki tarah aata hai.</p>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Jobs kis halat me</h3>
        <ul className="mt-4 space-y-3">
          {s.byStatus.length === 0 && <li className="text-[0.8125rem] text-slate-500">Abhi koi job nahi</li>}
          {[...s.byStatus].sort((a, b) => b.count - a.count).map((b) => (
            <li key={b.status}>
              <div className="flex justify-between text-[0.8125rem]"><span className="font-medium text-slate-700">{statusOf(b.status).label}</span><span className="tabular-nums text-slate-600">{b.count}</span></div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(b.count / max) * 100}%`, backgroundColor: statusOf(b.status).color }} /></div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Box({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums', tone)}>{value}</dd></div>;
}
