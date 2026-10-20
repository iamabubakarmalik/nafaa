/**
 * Eye tests: today's queue first, then upcoming, waiting, done, fees still
 * to take and follow-ups, with server-side search, doctor and period. From
 * a row: start the test, write the result (opens the test page), take the
 * fee (bill), move, cancel or mark no-show, WhatsApp the customer. The
 * Analytics tab shows tests and fees per doctor.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarClock, CalendarPlus, CheckCircle2, Clock, Download, Eye, GraduationCap, MessageCircle, MoreHorizontal, Play, Stethoscope, UserX, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { eyeTestsApi, type EyeTestView, type OpticalEyeTest } from '../api/eye-tests.api';
import { optometristsApi } from '../api/optometrists.api';
import { TestDialogs, useTestActions, type TestDialog } from '../components/TestModals';
import { Bars, ListCard, ListState, Pager, Panel, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { OPTICAL_KEYS, apiError, dateTime, dayOnly, powerSummary, rangeParams, testStatusOf, waLink } from '../lib/meta';

type Tab = EyeTestView | 'analytics';
const LIMIT = 30;
const OPEN = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED'];
const TABS: Array<{ id: Tab; label: string; icon?: typeof Eye }> = [
  { id: 'today', label: 'Aaj', icon: Eye }, { id: 'waiting', label: 'Baqi' }, { id: 'upcoming', label: 'Aage' }, { id: 'done', label: 'Ho gaye' },
  { id: 'unpaid', label: 'Fees baqi' }, { id: 'followup', label: 'Dobara aana' }, { id: 'closed', label: 'Cancel / nahi aaye' }, { id: 'all', label: 'Sab' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function EyeTestsPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>((params.get('view') as Tab) || 'today');
  const [search, setSearch] = useState('');
  const [doctor, setDoctor] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<TestDialog>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const q = useDebounced(search.trim());
  const actions = useTestActions(() => setDialog(null));
  usePageKeys(searchRef, { n: () => setDialog({ kind: 'book' }), a: () => setTab('analytics') });
  useEffect(() => { setPage(1); }, [q, range, tab, doctor]);
  useEffect(() => { setParams(tab !== 'today' ? { view: tab } : {}, { replace: true }); }, [tab, setParams]);
  useEffect(() => { const v = (params.get('view') as Tab) || 'today'; if (v !== tab) setTab(v); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const query = useMemo(() => ({ view: tab === 'analytics' ? 'all' as const : tab, search: q || undefined, optometristId: doctor || undefined, limit: LIMIT, ...rangeParams(resolveRange(range, 0)) }), [tab, q, doctor, range]);
  const list = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'page', query, page], queryFn: () => eyeTestsApi.page({ ...query, page }), placeholderData: (p) => p, enabled: tab !== 'analytics', refetchInterval: 60_000 });
  const summary = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'summary'], queryFn: eyeTestsApi.summary, refetchInterval: 60_000 });
  const s = summary.data;
  const data = list.data;

  const exportCsv = async () => {
    try {
      const all = await eyeTestsApi.page({ ...query, page: 1, limit: 100 });
      if (!all.items.length) { toast.error('Is filter me koi test nahi'); return; }
      downloadCsv('eye-tests.csv', [['Test', 'Din', 'Waqt', 'Customer', 'Mobile', 'Doctor', 'Halat', 'Number', 'Fees', 'Li gayi'],
        ...all.items.map((t) => [t.testNumber, t.appointmentDate.slice(0, 10), t.scheduledSlot, t.customerName, t.customerPhone, t.optometristName, testStatusOf(t.status).label, powerSummary(t), t.testFee, t.isWaivedOff ? 'Maaf' : t.paidAmount])]);
    } catch (e) { toast.error(apiError(e, 'File nahi bani')); }
  };

  const doctorName = doctors.data?.find((d) => d.id === doctor)?.name;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Eye test — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarPlus, color: '#2563eb', title: 'Book', text: '"Test book" (N): customer, doctor aur khali waqt. Walk-in ho to aaj ka din aur koi bhi waqt.' },
            { icon: Play, color: '#d97706', title: 'Shuru', text: 'Customer aaye to "Shuru" — test ka waqt ginna shuru.' },
            { icon: Stethoscope, color: '#7c3aed', title: 'Result', text: 'Result me number (SPH, CYL, AXIS, ADD, PD) — "Nuskha banayein" se prescription khud ban jata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Fees', text: 'Fees lein (bill banta hai), khata me likhein ya maaf karein. Report aur cash drawer me aati hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'test book'], ['A', 'analytics'], ['G', 'guide']]} />
      )}
      <TestDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} onBooked={() => setTab('today')} />

      <PageHero title="Eye tests" chip={<><Eye />{tab === 'analytics' ? s?.monthCount ?? 0 : data?.total ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={summary.isLoading}
        meta="Book → shuru → result → fees"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDialog({ kind: 'book' })} className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" />Test book</button>
        </>}
        stats={[
          { label: 'Is mahine fees mili', value: money(s?.monthlyRevenue ?? 0) },
          { label: 'Is mahine test', value: s?.monthCount ?? 0 },
          { label: 'Is list me fees baqi', value: money(data?.totals.due ?? 0) },
        ]} />

      <KpiRow>
        {summary.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#2563eb" label="Booked" value={s?.scheduled ?? 0} hint="Aane wale" onClick={() => setTab('waiting')} active={tab === 'waiting'} />
            <KpiCard icon={Play} color="#d97706" label="Test jaari" value={s?.inProgress ?? 0} onClick={() => setTab('waiting')} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Aaj ho gaye" value={s?.completedToday ?? 0} onClick={() => setTab('today')} active={tab === 'today'} />
            <KpiCard icon={Wallet} color="#b45309" label="Fees baqi" value={money(s?.unpaidAmount ?? 0)} hint={`${s?.unpaidCount ?? 0} test`} onClick={() => setTab('unpaid')} active={tab === 'unpaid'} />
            <KpiCard icon={CalendarClock} color="#7c3aed" label="Dobara aana" value={s?.pendingFollowUps ?? 0} onClick={() => setTab('followup')} active={tab === 'followup'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Test number, customer ya mobile…" />}
        chips={q || doctor || range.preset !== 'all' ? <>
          {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
          {doctor && <FilterChip onRemove={() => setDoctor('')}>{doctorName}</FilterChip>}
          {range.preset !== 'all' && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Period</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setDoctor(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); }}>
        <FilterMenu icon={Stethoscope} label="Doctor" value={doctor} active={!!doctor} onChange={setDoctor}
          options={[{ value: '', label: 'Sab doctor' }, ...(doctors.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
        {tab !== 'today' && <DateRangeMenu value={range} onChange={setRange} startHour={0} label="Test ka din" />}
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={TABS} hint={data && tab !== 'analytics' ? <>Fees: {money(data.totals.fees)} · mili {money(data.totals.paid)}</> : undefined} />

      {tab === 'analytics' ? <TestsAnalytics /> : (
        <ListCard>
          <ListState loading={list.isLoading} error={list.isError} empty={!data?.items.length} onRetry={() => void list.refetch()} icon={Eye}
            title={tab === 'today' ? 'Aaj koi test book nahi' : 'Is list me koi test nahi'} hint="Customer aaye to test book karein — walk-in bhi."
            actions={<Button onClick={() => setDialog({ kind: 'book' })} leftIcon={<CalendarPlus className="h-4 w-4" />}>Test book</Button>}>
            {data && (
              <>
                <Table minWidth="60rem">
                  <THead><Tr><Th>Waqt</Th><Th>Customer</Th><Th>Doctor</Th><Th>Number</Th><Th>Halat</Th><Th align="right">Fees</Th><Th align="right" /></Tr></THead>
                  <TBody>
                    {data.items.map((t) => <Row key={t.id} t={t} money={money} canBill={canBill} menu={menu} setMenu={setMenu} setDialog={setDialog} actions={actions} open={() => navigate(`/optical/eye-tests/${t.id}`)} />)}
                  </TBody>
                </Table>
                <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
              </>
            )}
          </ListState>
        </ListCard>
      )}
    </PageShell>
  );
}

function Row({ t, money, canBill, menu, setMenu, setDialog, actions, open }: {
  t: OpticalEyeTest; money: (n: number) => string; canBill: boolean; menu: string | null; setMenu: (v: string | null) => void;
  setDialog: (d: TestDialog) => void; actions: ReturnType<typeof useTestActions>; open: () => void;
}) {
  const isOpen = OPEN.includes(t.status);
  const due = t.isWaivedOff ? 0 : Math.max(t.testFee - t.paidAmount, 0);
  const wa = waLink(t.customerPhone, `Assalam o alaikum ${t.customerName}, aap ka eye test ${dayOnly(t.appointmentDate)}${t.scheduledSlot ? ` ${t.scheduledSlot} baje` : ''} book hai. Shukriya.`);
  return (
    <Tr interactive onClick={open}>
      <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{t.scheduledSlot ?? '—'}</p><p className="text-[0.75rem] text-slate-500">{dayOnly(t.appointmentDate)} · {t.testNumber}</p></Td>
      <Td><p className="font-medium text-slate-900">{t.customerName}{t.customerAge ? <span className="text-slate-500"> · {t.customerAge} saal</span> : null}</p><p className="text-[0.75rem] text-slate-500">{t.customerPhone}{t.chiefComplaint ? ` · ${t.chiefComplaint}` : ''}</p></Td>
      <Td>{t.optometristName ?? '—'}</Td>
      <Td className="max-w-[14rem]"><p className="truncate font-mono text-[0.75rem] text-slate-700">{powerSummary(t) || '—'}</p>{t.requiresFollowUp && t.followUpDate && <p className="text-[0.75rem] text-violet-700">Dobara: {dayOnly(t.followUpDate)}</p>}</Td>
      <Td><Pill meta={testStatusOf(t.status)} />{t.testCompletedAt && <p className="mt-0.5 text-[0.6875rem] text-slate-500">{dateTime(t.testCompletedAt)}</p>}</Td>
      <Td align="right" className="whitespace-nowrap">
        <p className="font-semibold">{money(t.testFee)}</p>
        {t.isWaivedOff ? <p className="text-[0.75rem] text-slate-500">Maaf</p> : due > 0.009 ? <p className="text-[0.75rem] font-medium text-amber-700">{money(due)} baqi</p> : t.testFee > 0 ? <p className="text-[0.75rem] text-emerald-700">Mil gayi</p> : null}
      </Td>
      <Td align="right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {isOpen && t.status !== 'IN_PROGRESS' && <Button size="xs" variant="secondary" leftIcon={<Play className="h-3.5 w-3.5" />} loading={actions.start.isPending && actions.start.variables?.id === t.id} onClick={() => actions.start.mutate(t)}>Shuru</Button>}
          {(t.status === 'IN_PROGRESS' || t.status === 'COMPLETED') && <Button size="xs" variant={t.status === 'IN_PROGRESS' ? 'primary' : 'ghost'} leftIcon={<Stethoscope className="h-3.5 w-3.5" />} onClick={open}>{t.status === 'COMPLETED' ? 'Result' : 'Result likhein'}</Button>}
          {canBill && due > 0.009 && !['CANCELLED', 'NO_SHOW'].includes(t.status) && <Button size="xs" variant="ghost" aria-label="Fees lein" onClick={() => setDialog({ kind: 'fee', test: t })}><Wallet className="h-3.5 w-3.5" /></Button>}
          {wa && isOpen && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
          {isOpen && (
            <div className="relative">
              <Button size="xs" variant="ghost" aria-label="Aur" onClick={() => setMenu(menu === t.id ? null : t.id)}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
              {menu === t.id && (
                <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg" onMouseLeave={() => setMenu(null)}>
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] hover:bg-slate-50" onClick={() => { setMenu(null); setDialog({ kind: 'move', test: t }); }}><CalendarClock className="h-3.5 w-3.5" />Waqt badlein</button>
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] hover:bg-slate-50" onClick={() => { setMenu(null); setDialog({ kind: 'noshow', test: t }); }}><UserX className="h-3.5 w-3.5" />Nahi aaya</button>
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[0.8125rem] text-rose-700 hover:bg-rose-50" onClick={() => { setMenu(null); setDialog({ kind: 'cancel', test: t }); }}><XCircle className="h-3.5 w-3.5" />Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </Td>
    </Tr>
  );
}

function TestsAnalytics() {
  const { sales: money } = useMasked();
  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const rows = (doctors.data ?? []).filter((d) => d.totalTests > 0 || d.isActive);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Doctor ke test" hint="Ab tak mukammal test">
        {doctors.isLoading ? <Skeleton className="h-40 rounded-xl" /> : <Bars rows={rows.map((d, i) => ({ key: d.id, label: d.name, value: d.totalTests, color: ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706'][i % 5] }))} empty="Abhi koi doctor nahi" />}
      </Panel>
      <Panel title="Doctor ki fees" hint="Ab tak li gayi fees (bill)">
        {doctors.isLoading ? <Skeleton className="h-40 rounded-xl" /> : <Bars rows={rows.map((d, i) => ({ key: d.id, label: d.name, value: d.totalRevenue, hint: money(d.totalRevenue), color: ['#16a34a', '#0891b2', '#7c3aed', '#2563eb', '#d97706'][i % 5] }))} empty="Abhi koi fees nahi" />}
      </Panel>
    </div>
  );
}
