/**
 * Front desk bookings: today's arrivals and departures, who is in the
 * hotel, what is booked ahead and what is still to collect; the full record
 * with search, source and check-in date filters and server paging; and
 * occupancy analytics. Rows open the stay page.
 *
 * Keys: N new booking · / search · 1 bookings · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, BedDouble, CalendarCheck, CalendarDays, CalendarPlus, ChevronRight, Filter, Globe, GraduationCap, Home, ListChecks, LogIn, LogOut, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { bookingsApi, type BookingView, type HotelBooking } from '../api/bookings.api';
import { OccupancyPanel } from '../components/OccupancyPanel';
import { HOTEL_KEYS, SOURCES, addDaysKey, dueOf, roomsOf, sourceLabel, statusOf, stayDay, todayKey } from '../components/meta';

type Tab = 'bookings' | 'analytics';

const VIEWS: Array<{ id: BookingView; label: string; icon: typeof Home }> = [
  { id: 'arrivals', label: 'Aaj aane wale', icon: LogIn },
  { id: 'inhouse', label: 'Andar hain', icon: BedDouble },
  { id: 'departures', label: 'Aaj jaane wale', icon: LogOut },
  { id: 'upcoming', label: 'Aage ki bookings', icon: CalendarCheck },
  { id: 'due', label: 'Paisa baqi', icon: Wallet },
  { id: 'all', label: 'Sab bookings', icon: ListChecks },
];
const viewLabel = (v: BookingView) => VIEWS.find((x) => x.id === v)?.label ?? v;

function BookingRow({ b, money }: { b: HotelBooking; money: (n: number) => string }) {
  const st = statusOf(b.status);
  const due = dueOf(b);
  return (
    <li>
      <Link to={`/hotel/bookings/${b.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:flex-nowrap">
        <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[0.875rem] font-bold text-slate-800">{roomsOf(b)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{b.guestName}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>
            {b.bookedBy && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-violet-700">{b.bookedBy}</span>}
          </span>
          <span className="block truncate text-[0.75rem] text-slate-500">
            {stayDay(b.checkInDate, { day: true })} → {stayDay(b.checkOutDate)} · {b.nights} raat · {b.guestPhone} · {sourceLabel(b.source)} · {b.bookingNumber}
          </span>
        </span>
        <span className="ml-auto text-right">
          <span className="block text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(b.grandTotal)}</span>
          <span className={cn('block text-[0.75rem] tabular-nums', due > 0 ? 'text-amber-700' : 'text-success-700')}>{due > 0 ? `${money(due)} baqi` : 'Poora mila'}</span>
        </span>
        <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
      </Link>
    </li>
  );
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const canReports = usePermission(PERMISSIONS.REPORTS_VIEW);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'bookings');
  const [view, setView] = useState<BookingView>((params.get('view') as BookingView) || 'arrivals');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [aFrom, setAFrom] = useState(addDaysKey(todayKey(), -29));
  const [aTo, setATo] = useState(todayKey());

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, source, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'bookings') next.delete('tab'); else next.set('tab', tab);
    if (view === 'arrivals') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const period = resolveRange(range, startHour);
  const q = { view, page, limit: 30, search: query || undefined, source: source || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [HOTEL_KEYS.bookings, 'page', q], queryFn: () => bookingsApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'bookings' });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const counts = data?.summary.views;
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const filtered = !!source || !!query || range.preset !== 'all';
  const clear = () => { setSource(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: BookingView) => { setTab('bookings'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/hotel/bookings/new'); }
      if (e.key === '1') setTab('bookings');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('bookings'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await bookingsApi.page({ ...q, page: 1, limit: 200 });
    return {
      title: `Bookings — ${viewLabel(view)}`,
      subtitle: period ? `Check-in ${rangeLabel(period.from, period.to)}` : stayDay(todayKey(), { day: true, year: true }),
      meta: [['Bookings', String(all.total)], ['Kul', sales(all.summary.billed)], ['Baqi', sales(all.summary.due)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Room' }, { label: 'Guest' }, { label: 'Phone', wideOnly: true }, { label: 'Aamad' }, { label: 'Rawangi' }, { label: 'Halat', wideOnly: true }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((b) => [roomsOf(b), b.guestName, b.guestPhone, stayDay(b.checkInDate), stayDay(b.checkOutDate), statusOf(b.status).label, sales(b.grandTotal), sales(dueOf(b))]),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title="Bookings"
        chip={<><CalendarDays /> Front desk</>}
        meta="Aamad, rawangi, andar guests aur baqi paisa — ek jagah"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'bookings' || !rows.length} /></span>
          <Link to="/hotel/rooms" className={heroButton}><Home className="h-4 w-4" /><span className="hidden sm:inline">Room board</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/hotel/bookings/new" title="Nayi booking (N)" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Nayi booking</Link>}
        </>}
        stats={counts ? [
          { label: 'Andar guests', value: counts.inhouse },
          { label: 'Aaj aane wale', value: counts.arrivals },
          { label: 'Aaj jaane wale', value: counts.departures },
        ] : [{ label: 'Andar guests', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!counts ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={LogIn} color="#d97706" label="Aaj aane wale" value={counts.arrivals} hint="Check-in baqi (late bhi)" onClick={() => pick('arrivals')} active={tab === 'bookings' && view === 'arrivals'} />
          <KpiCard icon={BedDouble} color="#4f46e5" label="Andar hain" value={counts.inhouse} hint="Abhi hotel me" onClick={() => pick('inhouse')} active={tab === 'bookings' && view === 'inhouse'} />
          <KpiCard icon={LogOut} color={counts.departures ? '#e11d48' : '#64748b'} label="Aaj jaane wale" value={counts.departures} hint="Check-out baqi" onClick={() => pick('departures')} active={tab === 'bookings' && view === 'departures'} />
          <KpiCard icon={CalendarCheck} color="#0891b2" label="Aage ki bookings" value={counts.upcoming} hint="Kal aur aagay" onClick={() => pick('upcoming')} active={tab === 'bookings' && view === 'upcoming'} />
          <KpiCard icon={Wallet} color="#16a34a" label="Paisa baqi" value={counts.due} hint="Bookings jin par baqi hai" onClick={() => pick('due')} active={tab === 'bookings' && view === 'due'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Raatein jab guest thehre — check-out hone ya na hone se farq nahi</p>}>
          <input type="date" value={aFrom} max={aTo} onChange={(e) => setAFrom(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-[0.8125rem]" aria-label="Kab se" />
          <input type="date" value={aTo} min={aFrom} onChange={(e) => setATo(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-[0.8125rem]" aria-label="Kab tak" />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Guest, phone, room #, booking #, company…" label="Search" />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Check-in: {rangeLabel(period.from, period.to)}</FilterChip>}
            {source && <FilterChip onRemove={() => setSource('')}>{sourceLabel(source)}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'arrivals'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts && v.id !== 'all' ? `${counts[v.id]}` : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Check-in date" />
          <FilterMenu icon={Globe} label={source ? sourceLabel(source) : 'Kahan se'} value={source} active={!!source} onChange={setSource} align="right"
            options={[{ value: '', label: 'Sab' }, ...SOURCES.map((s) => ({ value: s.id as string, label: s.label }))]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'bookings', label: 'Bookings', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Occupancy', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        canReports ? <OccupancyPanel from={aFrom} to={aTo} /> : (
          <div className="rounded-3xl bg-white px-6 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Occupancy aur kamai dekhne ke liye "Reports dekhna" ki permission chahiye.</div>
        )
      ) : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} bookings · {sales(data.summary.billed)}</span>
            {data.summary.due > 0 && <span className="text-amber-700">Baqi {sales(data.summary.due)}</span>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Bookings load nahi huin</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi booking nahi' : view === 'arrivals' ? 'Aaj koi aane wala baqi nahi' : view === 'departures' ? 'Aaj koi check-out baqi nahi' : 'Koi booking nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Phone par booking ho ya walk-in guest — "Nayi booking" se room aur advance likhein.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => navigate('/hotel/bookings/new')} leftIcon={<CalendarPlus className="h-4 w-4" />}>Nayi booking</Button>}
              {filtered ? <Button variant="ghost" onClick={clear}>Filter saaf karein</Button> : view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab bookings dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((b) => <BookingRow key={b.id} b={b} money={sales} />)}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {guide.isOpen && (
        <PageGuide title="Bookings — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarPlus, color: '#4f46e5', title: 'Nayi booking', text: 'Dates, room aur guest likhein. Advance liya ho to wahin likhein — usi din drawer aur guest ke khate me jata hai. Walk-in guest ho to "Abhi check-in".' },
            { icon: LogIn, color: '#d97706', title: 'Aaj aane wale', text: 'Subah ye list dekhein. Guest aaye to booking kholein aur check-in (CNIC zaroori). Na aaye to no-show.' },
            { icon: BedDouble, color: '#0891b2', title: 'Andar guests', text: 'Khana, laundry, minibar ke charges stay page par room ke bill me likhein.' },
            { icon: LogOut, color: '#e11d48', title: 'Aaj jaane wale', text: 'Check-out par ek bill: raatein + charges − advance. Split payment ya company khata.' },
            { icon: BarChart3, color: '#16a34a', title: 'Occupancy', text: 'Har raat kitne room bhare, ausat rate (ADR) aur RevPAR.' },
          ]}
          tips={['Har raat band karne se pehle Reports → Night audit dekhein: koi check-in / check-out baqi na rahe.', 'Booking banane aur badalne ke liye "Bookings sambhalna" ki permission chahiye.']}
          shortcuts={[['N', 'nayi booking'], ['/', 'dhoondein'], ['1', 'bookings'], ['2', 'occupancy'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
