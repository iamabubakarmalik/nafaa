/**
 * Repairs: phones in the shop and where each job stands — being checked,
 * waiting for the customer or a part, in work, ready to collect — what is
 * late, money still to take, and phones still under repair warranty.
 * Analytics shows repair earnings, parts cost and the brands that come most.
 *
 * Keys: N new job · / search · 1 jobs · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, CheckCircle2, Clock, Download, Filter, Flame, GraduationCap, ListChecks, MessageCircle, Plus, Printer,
  Receipt, ShieldCheck, Smartphone, UserCog, Wallet, Wrench,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { repairsApi, type RepairListParams, type RepairPriority, type RepairSort, type RepairTicket, type RepairView } from '../api/repairs.api';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { RepairPriorityBadge } from '../components/repairs/RepairPriorityBadge';
import { RepairStatusBadge } from '../components/repairs/RepairStatusBadge';
import { printJobCard, repairMessage } from '../components/slips';
import { PRIORITIES, REPAIR_KEY, dateTime, dayOnly, daysTo, priorityOf, repairStatusOf, waLink } from '../components/meta';

type Tab = 'jobs' | 'analytics';
const VIEWS: Array<{ id: RepairView; label: string; icon: typeof Wrench }> = [
  { id: 'open', label: 'Shop me', icon: Smartphone },
  { id: 'working', label: 'Kaam baqi', icon: Wrench },
  { id: 'ready', label: 'Tayyar — dene hain', icon: CheckCircle2 },
  { id: 'late', label: 'Late', icon: AlertTriangle },
  { id: 'unpaid', label: 'Paisa baqi', icon: Wallet },
  { id: 'warranty', label: 'Warranty me', icon: ShieldCheck },
  { id: 'closed', label: 'Wapas / cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: RepairView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const SORTS: Array<{ value: RepairSort; label: string }> = [
  { value: 'due', label: 'Jo pehle dena hai' }, { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' }, { value: 'amount', label: 'Bara bill pehle' },
];

export default function RepairTicketsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const shopId = useShopParam();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.MOBILE_REPAIRS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'jobs');
  const [view, setView] = useState<RepairView>((params.get('view') as RepairView) || 'open');
  const [priority, setPriority] = useState<RepairPriority | ''>('');
  const [tech, setTech] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aDays, setADays] = useState('30');
  const [sort, setSort] = useState<RepairSort>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, priority, tech, range, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'jobs') next.delete('tab'); else next.set('tab', tab);
    if (view === 'open') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const period = resolveRange(range, startHour);
  const q: RepairListParams = {
    view, shopId, page, limit: 40, sort, search: query || undefined, priority: priority || undefined, technician: tech || undefined,
    ...(period && period.from !== 'all' ? { from: period.from, to: period.to } : {}),
  };
  const listQ = useQuery({ queryKey: [REPAIR_KEY, 'page', q], queryFn: () => repairsApi.list(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'jobs' });
  const statsQ = useQuery({ queryKey: ['repair-stats', shopId], queryFn: () => repairsApi.stats(shopId), refetchInterval: 60_000 });
  const techQ = useQuery({ queryKey: [REPAIR_KEY, 'technicians'], queryFn: () => repairsApi.technicians(), staleTime: 5 * 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const ready = s?.byStatus.find((x) => x.status === 'READY')?.count ?? 0;
  const filtered = !!priority || !!tech || !!query || range.preset !== 'all';
  const clear = () => { setPriority(''); setTech(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: RepairView) => { setTab('jobs'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/repair-tickets/new'); }
      if (e.key === '1') setTab('jobs');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('jobs'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const fetchAll = () => repairsApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Repairs — ${viewLabel(view)}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Jobs', String(all.total)], ['Bill', formatPKR(all.totals.bill)], ['Baqi', formatPKR(all.totals.due)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Phone' }, { label: 'Customer', wideOnly: true }, { label: 'Kharabi', wideOnly: true }, { label: 'Halat' }, { label: 'Tayyar', wideOnly: true }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((t) => [t.ticketNumber, `${t.deviceBrand} ${t.deviceModel}`, `${t.customerName} ${t.customerPhone}`, t.diagnosedIssue || t.reportedIssue,
          repairStatusOf(t.status).label, t.estimatedReadyAt ? dateTime(t.estimatedReadyAt) : '—', formatPKR(Number(t.balanceDue) || 0)]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} jobs (kul ${all.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('repairs.csv', [
      ['Job', 'Aaya', 'Customer', 'Phone', 'Brand', 'Model', 'IMEI', 'Kharabi', 'Check', 'Technician', 'Halat', 'Tayyar hoga', 'Wapas', 'Parts', 'Mazdoori', 'Bill', 'Mila', 'Baqi'],
      ...all.items.map((t) => [t.ticketNumber, dayOnly(t.receivedAt), t.customerName, t.customerPhone, t.deviceBrand, t.deviceModel, t.imei1, t.reportedIssue, t.diagnosedIssue,
        t.technicianName, repairStatusOf(t.status).label, t.estimatedReadyAt ? dateTime(t.estimatedReadyAt) : '', t.deliveredAt ? dayOnly(t.deliveredAt) : '', t.partsCost, t.laborCost, t.totalCost, t.paidAmount, t.balanceDue]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Repairs"
        chip={<><Wrench /> Job cards</>}
        meta="Phone lein, check karein, theek kar ke wapas dein — har qadam ka record"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'jobs' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/repair-tickets/new" title="Naya job (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya job</Link>}
        </>}
        stats={s ? [
          { label: 'Shop me phone', value: s.openTickets, hint: s.late ? `${s.late} late` : undefined },
          { label: 'Aaj aaye / gaye', value: `${s.todayCount} / ${s.deliveredToday}` },
          { label: 'Is mahine kamai', value: sales(s.monthRevenue), hint: `${s.monthDelivered} phone wapas` },
        ] : [{ label: 'Shop me phone', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Smartphone} color="#2563eb" label="Shop me" value={s.openTickets} hint={`Aaj ${s.todayCount} naye`} onClick={() => pick('open')} active={tab === 'jobs' && view === 'open'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Tayyar — dene hain" value={ready} hint={s.readyDue ? `${sales(s.readyDue)} lena hai` : 'Customer ko bulayein'} onClick={() => pick('ready')} active={tab === 'jobs' && view === 'ready'} />
          <KpiCard icon={AlertTriangle} color={s.late ? '#e11d48' : '#64748b'} label="Late" value={s.late} hint={s.late ? 'Customer ko batayein' : 'Koi late nahi'} onClick={() => pick('late')} active={tab === 'jobs' && view === 'late'} />
          <KpiCard icon={Wallet} color="#d97706" label="Paisa baqi" value="Dekhein" hint="Jin par advance kam hai" onClick={() => pick('unpaid')} active={tab === 'jobs' && view === 'unpaid'} />
          <KpiCard icon={ShieldCheck} color="#0891b2" label="Warranty me" value="Dekhein" hint="Wapas aaye to muft" onClick={() => pick('warranty')} active={tab === 'jobs' && view === 'warranty'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Wapas diye gaye phone — kamai, parts ki cost aur brand</p>}>
          <FilterMenu icon={Clock} label={`Pichle ${aDays} din`} value={aDays} onChange={setADays} options={[{ value: '7', label: '7 din' }, { value: '30', label: '30 din' }, { value: '90', label: '90 din' }, { value: '365', label: '1 saal' }]} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Job #, customer, phone number, IMEI, model…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {priority && <FilterChip onRemove={() => setPriority('')}>{priorityOf(priority).label}</FilterChip>}
            {tech && <FilterChip onRemove={() => setTech('')}>{tech}</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{view === 'closed' ? 'Wapas' : 'Aaya'}: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-64"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          <FilterMenu icon={Flame} label={priority ? priorityOf(priority).label : 'Jaldi'} value={priority} active={!!priority} onChange={setPriority}
            options={[{ value: '' as RepairPriority | '', label: 'Sab' }, ...PRIORITIES.map((p) => ({ value: p as RepairPriority | '', label: priorityOf(p).label }))]} />
          <FilterMenu icon={UserCog} label={tech || 'Technician'} value={tech} active={!!tech} onChange={setTech}
            options={[{ value: '', label: 'Sab' }, ...(techQ.data ?? []).map((x) => ({ value: x.name, label: x.name, hint: `${x.open} chal rahe` }))]} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={view === 'closed' ? 'Wapas ki date' : 'Aane ki date'} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? 'Tarteeb'} value={sort} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'jobs', label: 'Jobs', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <RepairAnalytics days={Number(aDays)} /> : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} jobs · bill {sales(data.totals.bill || data.totals.estimate)}</span>
            <span className="text-slate-600">mila {sales(data.totals.paid)}</span>
            {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">baqi {sales(data.totals.due)}</button>}
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
            <Wrench className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi job nahi' : view === 'late' ? 'Koi job late nahi — shabash' : view === 'ready' ? 'Koi phone dene ke liye tayyar nahi' : 'Koi job nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Customer ka phone lein, kharabi likhein, parchi dein — tayyar hote hi WhatsApp karein.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => navigate('/repair-tickets/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya job</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
              {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab jobs dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((t) => <RepairRow key={t.id} t={t} shopName={shopName} money={sales} />)}
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
        <PageGuide title="Repairs — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Job banayein', text: '"Naya job": customer, phone, IMEI, kharabi, andaza aur advance. Save ke baad parchi print karein.' },
            { icon: Wrench, color: '#7c3aed', title: 'Check aur kaam', text: 'Job kholein: "Check karein" se asal kharabi aur andaza; phir "Kaam shuru", parts jodein, aur "Tayyar hai".' },
            { icon: MessageCircle, color: '#22c55e', title: 'Customer ko batayein', text: 'Har job par WhatsApp button — halat, waqt aur baqi paisa khud likha hota hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Wapas dein = bill', text: '"Wapas dein" par baqi paisa lein. Repair ka bill banta hai — Sales, Profit, galla aur khata sab me aata hai.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Warranty', text: 'Repair warranty wapas dene ke din se chalti hai. Wahi phone dobara aaye to naye job me "Warranty claim" lagayein.' },
            { icon: Printer, color: '#ea580c', title: 'Parchi', text: 'Job card dukaan ke bill design me chhapta hai — customer isi se phone wapas leta hai.' },
          ]}
          tips={['"Late" card roz subah dekhein — late phone ka customer naraz hota hai.', 'Stock wale parts job me lagte hi stock se nikalte hain; job cancel ho to wapas.', 'Job sambhalne ke liye "Repairs sambhalna" ki permission chahiye.']}
          shortcuts={[['N', 'naya job'], ['/', 'dhoondein'], ['1', 'jobs'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function RepairRow({ t, shopName, money }: { t: RepairTicket; shopName: string; money: (n: number) => string }) {
  const bill = Number(t.totalCost) > 0 ? Number(t.totalCost) : Number(t.estimatedCost) || 0;
  const due = Math.max(bill - Number(t.paidAmount || 0), 0);
  const left = daysTo(t.estimatedReadyAt);
  const wa = waLink(t.customerPhone, repairMessage(t, shopName));
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.isLate ? 'bg-rose-50 text-rose-600' : t.status === 'READY' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>
        <Wrench className="h-5 w-5" />
      </span>
      <Link to={`/repair-tickets/${t.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{t.deviceBrand} {t.deviceModel}</span>
          <RepairStatusBadge status={t.status} />
          <RepairPriorityBadge priority={t.priority} />
          {t.warrantyActive && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[0.6875rem] font-medium text-cyan-700 ring-1 ring-cyan-200">Warranty</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{t.ticketNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{t.customerName} · {t.customerPhone} — {t.diagnosedIssue || t.reportedIssue}</p>
        <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', t.isLate ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />
            {t.status === 'DELIVERED' ? `Wapas ${dayOnly(t.deliveredAt)}` : t.estimatedReadyAt ? (t.isLate ? `${-(left ?? 0)} din late` : `Tayyar ${dateTime(t.estimatedReadyAt)}`) : `${t.daysInShop ?? 0} din se shop me`}
          </span>
          {t.technicianName && <span className="font-normal text-slate-500">· {t.technicianName}</span>}
        </p>
      </Link>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(bill)}</p>
        {due > 0 && !['DELIVERED', 'CANCELLED'].includes(t.status) && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {money(due)}</p>}
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={() => printJobCard(t, shopName)} aria-label="Parchi" title="Parchi" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-3.5 w-3.5" /></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
        </div>
      </div>
    </li>
  );
}

function RepairAnalytics({ days }: { days: number }) {
  const { cost, sales } = useMasked();
  const q = useQuery({ queryKey: ['repair-analytics', days], queryFn: () => mobileReportsApi.repairAnalytics(days), staleTime: 60_000 });
  const d = q.data;
  if (q.isLoading || !d) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const max = Math.max(1, ...d.topBrands.map((b) => b.count));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Kamai — pichle {days} din</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <Box label="Phone wapas" value={String(d.delivered)} />
          <Box label="Bill" value={sales(d.totalRevenue)} />
          <Box label="Mazdoori" value={sales(d.laborRevenue)} />
          <Box label="Parts (customer se)" value={sales(d.partsCost)} />
          <Box label="Parts ki apni cost" value={cost(d.partsOwnCost)} />
          <Box label="Profit" value={cost(d.grossProfit)} tone={d.grossProfit < 0 ? 'text-rose-600' : 'text-emerald-700'} />
        </dl>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Kaunse brand zyada aaye</h3>
        <ul className="mt-4 space-y-3">
          {d.topBrands.length === 0 && <li className="text-[0.8125rem] text-slate-500">Is waqt me koi job nahi</li>}
          {d.topBrands.map((b) => (
            <li key={b.brand}>
              <div className="flex justify-between text-[0.8125rem]"><span className="font-medium text-slate-700">{b.brand}</span><span className="tabular-nums text-slate-600">{b.count}</span></div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(b.count / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.75rem] text-slate-500">{d.byStatus.map((x) => `${repairStatusOf(x.status).label}: ${x.count}`).join(' · ')}</p>
      </section>
    </div>
  );
}

function Box({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums', tone)}>{value}</dd></div>;
}
