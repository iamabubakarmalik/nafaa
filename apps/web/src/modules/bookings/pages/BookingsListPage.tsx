/**
 * Bookings: advance orders and reservations. Tabs: open bookings by pickup
 * day (late ones first), the full record for a period, a pickup calendar and
 * analytics. Each row has quick actions: WhatsApp reminder, payment, ready,
 * sale at pickup, new date, slip print and cancel.
 *
 * Keys: N new booking · U upcoming · C calendar · A analytics · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlarmClock, BarChart3, BookmarkPlus, CalendarClock, CalendarDays, ChevronDown, ClipboardList, Filter, GraduationCap, ListChecks,
  MessageCircle, PackageCheck, Plus, Printer, ShoppingCart, Store, Undo2, UserRound, Wallet, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, type FilterOption,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { teamApi } from '@modules/organization/team/api/team.api';
import { bookingsApi, type Booking, type BookingQuery, type BookingStatusFilter } from '../api/bookings.api';
import { CancelModal, ConvertModal, PaymentModal, RescheduleModal, useMarkReady } from '../components/ActionModals';
import { BookingCalendar } from '../components/BookingCalendar';
import { BookingPrintModal } from '../components/BookingPrintModal';
import { BookingsAnalytics } from '../components/BookingsAnalytics';
import { BOOKINGS_KEY, PICKUP, STATUS, bookingWaLink, daysFromPickup, dayText, isOpen, itemLabel, itemsSummary, pickupState, qtyText, when } from '../components/meta';
import { bookingsDoc } from '../components/print';

type Tab = 'upcoming' | 'all' | 'calendar' | 'analytics';
type Action = 'pay' | 'convert' | 'cancel' | 'date' | 'print';

const OPEN_FILTERS: Array<FilterOption<BookingStatusFilter>> = [
  { value: 'ACTIVE', label: 'Sab khuli' },
  { value: 'OVERDUE', label: 'Late', hint: 'Pickup ka din guzar gaya', icon: AlarmClock, color: '#e11d48' },
  ...(['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'] as const).map((k) => ({ value: k, label: STATUS[k].label, hint: STATUS[k].hint, icon: STATUS[k].icon, color: STATUS[k].color })),
];
const ALL_FILTERS: Array<FilterOption<BookingStatusFilter | 'all'>> = [
  { value: 'all', label: 'Sab' },
  { value: 'ACTIVE', label: 'Khuli', hint: 'Abhi sale ya cancel nahi hui' },
  { value: 'OVERDUE', label: 'Late', icon: AlarmClock, color: '#e11d48' },
  ...(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((k) => ({ value: k, label: STATUS[k].label, icon: STATUS[k].icon, color: STATUS[k].color })),
];

export default function BookingsListPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [tab, setTab] = useState<Tab>('upcoming');
  const [openStatus, setOpenStatus] = useState<BookingStatusFilter>('ACTIVE');
  const [status, setStatus] = useState<BookingStatusFilter | 'all'>('all');
  const [staffId, setStaffId] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ kind: Action; b: Booking } | null>(null);
  const guide = usePageGuide();
  const ready = useMarkReady();

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, status, openStatus, staffId, query, tab]);

  const period = resolveRange(range, startHour);
  const base = { staffId: staffId || undefined, search: query || undefined };
  const periodFilters = { ...(period ?? {}), ...base };
  // Upcoming shows every open booking by pickup day, whatever the period.
  const filters: BookingQuery = tab === 'upcoming'
    ? { ...base, status: openStatus, sort: 'pickup' }
    : { ...periodFilters, status: status === 'all' ? undefined : status };
  const q: BookingQuery = { ...filters, page, limit: 30 };

  const listQ = useQuery({ queryKey: [BOOKINGS_KEY, 'records', q], queryFn: () => bookingsApi.records(q), placeholderData: (p) => p, enabled: tab === 'upcoming' || tab === 'all' });
  const overQ = useQuery({ queryKey: [BOOKINGS_KEY, 'overview', period], queryFn: () => bookingsApi.overview(period ?? {}), placeholderData: (p) => p, refetchInterval: 60_000 });
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });

  const o = overQ.data;
  const data = listQ.data;
  const rows = data?.items ?? [];
  const staffName = team.find((t) => t.id === staffId)?.fullName;
  const statusOn = tab === 'upcoming' ? openStatus !== 'ACTIVE' : tab === 'all' && status !== 'all';
  const filtered = !!staffId || !!query || statusOn;
  const statusLabel = tab === 'upcoming' ? OPEN_FILTERS.find((f) => f.value === openStatus)?.label : ALL_FILTERS.find((f) => f.value === status)?.label;
  const filterText = [statusOn && statusLabel, staffName, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => bookingsDoc(
    await bookingsApi.records({ ...filters, page: 1, limit: 300 }),
    tab === 'upcoming' ? 'Khuli bookings (pickup ke hisaab se)' : 'Bookings',
    tab === 'upcoming' || !period ? 'Sab tareekhen' : `${period.from} — ${period.to}`, filterText,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); navigate('/bookings/new'); }
      if (k === 'u') { e.preventDefault(); setTab('upcoming'); }
      if (k === 'c') { e.preventDefault(); setTab('calendar'); }
      if (k === 'a') { e.preventDefault(); setTab('analytics'); }
      if (e.key === '/') { e.preventDefault(); setTab((t) => (t === 'analytics' || t === 'calendar' ? 'all' : t)); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const clear = () => { setStatus('all'); setOpenStatus('ACTIVE'); setStaffId(''); setSearch(''); };
  const showUpcoming = (s: BookingStatusFilter) => { setTab('upcoming'); setOpenStatus(s); };
  const staffOptions: Array<FilterOption<string>> = useMemo(() => [{ value: '', label: 'Sab staff' }, ...team.map((t) => ({ value: t.id, label: t.fullName }))], [team]);

  return (
    <PageShell>
      <PageHero
        title="Bookings"
        chip={<><BookmarkPlus /> Advance aur reserve</>}
        meta="Advance lein, maal rakhein, pickup par bill banayein"
        busy={(listQ.isFetching && !listQ.isLoading) || overQ.isFetching}
        loading={overQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!(tab === 'upcoming' || tab === 'all') || !rows.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/bookings/new" title="Nayi booking (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi booking</Link>
        </>}
        stats={o ? [
          { label: 'Khuli bookings ki amount', value: money(o.active.value), hint: `${o.active.count} booking` },
          { label: 'Advance hath me', value: money(o.active.held) },
          { label: 'Baqi wasooli', value: money(o.active.balance) },
          { label: 'Agle 7 din pickup', value: o.upcoming },
        ] : [{ label: 'Khuli bookings ki amount', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!o ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={BookmarkPlus} color="#2563eb" label="Aaj ki bookings" value={o.today.count} hint={o.today.count ? money(o.today.value) : 'Abhi koi nahi'}
            onClick={() => { setTab('all'); setStatus('all'); setRange({ preset: 'today', custom: { from: '', to: '' } }); }} />
          <KpiCard icon={CalendarClock} color="#d97706" label="Pickup baqi" value={o.active.count}
            hint={o.pickupToday ? `${o.pickupToday} aaj · ${money(o.active.balance)} baqi` : `${money(o.active.balance)} baqi`}
            onClick={() => showUpcoming('ACTIVE')} active={tab === 'upcoming' && openStatus === 'ACTIVE'} />
          <KpiCard icon={Wallet} color="#16a34a" label="Advance mila" value={money(o.collected.net)}
            hint={o.collected.refunded ? `${money(o.collected.refunded)} wapas diye` : `${o.collected.payments} payment · ${period ? 'is period' : 'aaj'}`} />
          <KpiCard icon={AlarmClock} color="#e11d48" label="Late" value={o.overdue.count} hint={o.overdue.count ? `${money(o.overdue.balance)} baqi · yaad dilayein` : 'Sab waqt par'}
            onClick={() => showUpcoming('OVERDUE')} active={tab === 'upcoming' && openStatus === 'OVERDUE'} />
          <KpiCard icon={PackageCheck} color="#7c3aed" label="Tayyar, lene nahi aaye" value={o.ready.count} hint={o.ready.count ? `${money(o.ready.balance)} baqi` : 'Koi intezar me nahi'}
            onClick={() => showUpcoming('READY_FOR_PICKUP')} active={tab === 'upcoming' && openStatus === 'READY_FOR_PICKUP'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Booking number, customer, phone ya note…" label="Search" />}
        chips={filtered ? <>
          {statusOn && <FilterChip onRemove={() => (tab === 'upcoming' ? setOpenStatus('ACTIVE') : setStatus('all'))}>{statusLabel}</FilterChip>}
          {staffId && <FilterChip onRemove={() => setStaffId('')}>{staffName ?? 'Staff'}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" label="Booking ki period" />
        {tab === 'upcoming' && <FilterMenu icon={Filter} label="Haal" value={openStatus} active={openStatus !== 'ACTIVE'} onChange={setOpenStatus} options={OPEN_FILTERS} />}
        {tab === 'all' && <FilterMenu icon={Filter} label="Haal" value={status} active={status !== 'all'} onChange={setStatus} options={ALL_FILTERS} />}
        {team.length > 1 && <FilterMenu icon={UserRound} label="Staff" value={staffId} active={!!staffId} onChange={setStaffId} align="right" options={staffOptions} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={tab === 'upcoming' ? <>Period ka filter yahan nahi lagta — har khuli booking pickup ke din se</> : <><Kbd>N</Kbd> nayi · <Kbd>U</Kbd> upcoming · <Kbd>C</Kbd> calendar · <Kbd>A</Kbd> analytics</>}
        tabs={[
          { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, count: o?.active.count ?? null },
          { id: 'all', label: 'Sab record', icon: ListChecks },
          { id: 'calendar', label: 'Calendar', icon: CalendarDays },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <BookingsAnalytics filters={periodFilters} money={money} />
        : tab === 'calendar' ? <BookingCalendar filters={base} startHour={startHour} money={money} />
          : (<>
            {data && rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
                <span className="text-slate-500">{data.total} booking</span>
                <span>Kul <b className="tabular-nums text-slate-900">{money(data.totals.value)}</b></span>
                <span>Mil chuka <b className="tabular-nums text-emerald-700">{money(data.totals.paid)}</b></span>
                <span>Baqi <b className="tabular-nums text-amber-700">{money(data.totals.balance)}</b></span>
              </div>
            )}

            {listQ.isLoading ? (
              <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4.5rem] rounded-xl" />)}</div>
            ) : !rows.length ? (
              <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
                {tab === 'upcoming' && !filtered ? <PackageCheck className="mx-auto h-10 w-10 text-emerald-400" /> : <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />}
                <p className="mt-3 font-semibold text-slate-900">
                  {filtered ? 'Is filter me koi booking nahi' : tab === 'upcoming' ? 'Koi khuli booking nahi' : 'Is period me koi booking nahi'}
                </p>
                <p className="mt-1 text-sm text-slate-500">Customer ne advance diya ya maal rakhwana hai? Booking banayein, pickup par ek click me bill ban jayega.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button onClick={() => navigate('/bookings/new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi booking</Button>
                  {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                {rows.map((b) => (
                  <Row key={b.id} b={b} money={money} startHour={startHour} shop={shopName} onAction={(kind) => setAction({ kind, b })}
                    readyBusy={ready.isPending && ready.variables?.id === b.id}
                    onReady={(r) => ready.mutate({ id: b.id, ready: r })} />
                ))}
              </ul>
            )}

            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
                <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
                <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
              </div>
            )}
          </>)}

      {action?.kind === 'pay' && <PaymentModal booking={action.b} onClose={() => setAction(null)} />}
      {action?.kind === 'convert' && <ConvertModal booking={action.b} onClose={() => setAction(null)} />}
      {action?.kind === 'cancel' && <CancelModal booking={action.b} onClose={() => setAction(null)} />}
      {action?.kind === 'date' && <RescheduleModal booking={action.b} onClose={() => setAction(null)} />}
      {action?.kind === 'print' && <PrintLoader id={action.b.id} onClose={() => setAction(null)} />}

      {guide.isOpen && (
        <PageGuide title="Bookings — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: BookmarkPlus, color: '#2563eb', title: 'Booking banayein', text: '"Nayi booking" dabayein, customer chunein, cheezen dalein, pickup ki date aur advance likhein. IMEI ya carpet piece ho to woh reserve ho jata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance aur baqi', text: 'Advance customer ke khate me jama hota hai. Baad me aur paise aayein to "Payment" dabayein. Poora paisa aate hi booking "Tayyar" ho jati hai.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp yaad dihani', text: 'Har booking par WhatsApp ka button hai: tayyar ho to "le jayein", pickup qareeb ho to yaad dihani, late ho to narmi se yaad.' },
            { icon: ShoppingCart, color: '#7c3aed', title: 'Pickup par sale', text: '"Sale" dabayein: bill banta hai, stock is branch se nikalta hai, advance bill me lag jata hai aur baqi chahein to udhaar me.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Cancel par advance wapas de sakte hain ya khate me rehne de sakte hain. Return par malik ka PIN mang sakta hai (Settings).' },
            { icon: Store, color: '#0891b2', title: 'Branch', text: 'Har booking apni branch ki hoti hai. Staff sirf apni branch ki booking badal sakta hai.' },
          ]}
          tips={[
            'Upcoming tab me late bookings sab se upar hoti hain — roz subah ek nazar dalein.',
            'Calendar me har din ke pickup aur baqi amount dikhti hai.',
            'Booking slip 80mm ya A4 par print hoti hai; do copies: ek customer ki, ek dukaan ki.',
            'Booking ke waqt stock nahi ghatta; bikri par ghatta hai.',
          ]}
          shortcuts={[['N', 'nayi booking'], ['U', 'upcoming'], ['C', 'calendar'], ['A', 'analytics'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/** The list row has no payments; the slip needs the full booking. */
function PrintLoader({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: [BOOKINGS_KEY, 'one', id], queryFn: () => bookingsApi.getOne(id) });
  useEffect(() => { if (q.isError) { toast.error('Booking load nahi hui'); onClose(); } }, [q.isError, onClose]);
  return q.data ? <BookingPrintModal booking={q.data} onClose={onClose} /> : null;
}

function Row({ b, money, startHour, shop, onAction, onReady, readyBusy }: {
  b: Booking; money: (n: number) => string; startHour: number; shop: string;
  onAction: (a: Action) => void; onReady: (ready: boolean) => void; readyBusy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const s = STATUS[b.status];
  const ps = pickupState(b, startHour);
  const late = ps === 'overdue' && b.expectedPickupAt ? daysFromPickup(b.expectedPickupAt, startHour) : 0;
  const active = isOpen(b);
  const wa = bookingWaLink(b, shop, startHour);
  const meta = [b.bookingNumber, when(b.createdAt), b.createdBy?.fullName, b.shop?.name].filter(Boolean).join(' · ');
  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200" style={{ backgroundColor: `${s.color}14`, color: s.color }}>
          <s.icon className="h-4 w-4" />
        </span>
        <Link to={`/bookings/${b.id}`} className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{b.customer?.name ?? 'Customer'}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}><s.icon className="h-3 w-3" />{s.label}</span>
            {ps !== 'none' && (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', PICKUP[ps].tone)}>
                <CalendarClock className="h-3 w-3" />{ps === 'overdue' ? `${late} din late` : ps === 'soon' || ps === 'later' ? dayText(b.expectedPickupAt) : PICKUP[ps].label}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{itemsSummary(b) || 'Koi cheez nahi'}</span>
          <span className="block truncate text-[0.6875rem] text-slate-400">{meta}</span>
        </Link>
        <div className="ml-auto text-right">
          <p className="font-bold tabular-nums text-slate-900">{money(b.total)}</p>
          <p className={cn('text-[0.75rem] tabular-nums', b.balanceDue > 0 && active ? 'text-amber-700' : 'text-slate-500')}>
            {active ? (b.balanceDue > 0 ? `Baqi ${money(b.balanceDue)}` : 'Poora mila') : b.sale ? b.sale.saleNumber : s.label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {wa && active && (
            <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp yaad dihani" aria-label="WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 ring-1 ring-slate-200 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" /></a>
          )}
          {active && b.balanceDue > 0 && <Button size="sm" variant="secondary" onClick={() => onAction('pay')} leftIcon={<Wallet className="h-4 w-4" />}><span className="hidden sm:inline">Payment</span></Button>}
          {active && <Button size="sm" onClick={() => onAction('convert')} leftIcon={<ShoppingCart className="h-4 w-4" />}>Sale</Button>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur" aria-expanded={open} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:pl-[4.25rem]">
          <ul className="space-y-1">
            {(b.items ?? []).map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="truncate">{itemLabel(i)} × {qtyText(i.quantity)} {i.product?.unit ?? ''}{i.note ? <span className="text-slate-500"> · {i.note}</span> : null}</span>
                <span className="shrink-0 tabular-nums">{money(i.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            <Fact k="Diya" v={money(b.totalPaid - b.totalRefunded)} />
            {b.expectedPickupAt && <Fact k="Pickup" v={dayText(b.expectedPickupAt)} />}
            {b.expiresAt && <Fact k="Aakhri din" v={dayText(b.expiresAt)} />}
            {b.customer?.phone && <Fact k="Phone" v={b.customer.phone} />}
            {b.cancelReason && <Fact k="Cancel ki wajah" v={b.cancelReason} />}
          </dl>
          {b.notes && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{b.notes}</p>}
          <div className="flex flex-wrap gap-2">
            {active && b.status !== 'READY_FOR_PICKUP' && <Button size="sm" variant="secondary" loading={readyBusy} onClick={() => onReady(true)} leftIcon={<PackageCheck className="h-4 w-4" />}>Tayyar hai</Button>}
            {b.status === 'READY_FOR_PICKUP' && <Button size="sm" variant="ghost" loading={readyBusy} onClick={() => onReady(false)} leftIcon={<Undo2 className="h-4 w-4" />}>Abhi tayyar nahi</Button>}
            {active && <Button size="sm" variant="secondary" onClick={() => onAction('date')} leftIcon={<CalendarClock className="h-4 w-4" />}>Date badlein</Button>}
            <Button size="sm" variant="secondary" onClick={() => onAction('print')} leftIcon={<Printer className="h-4 w-4" />}>Slip</Button>
            <Link to={`/bookings/${b.id}`} className="inline-flex h-8 items-center rounded-lg px-3 text-[0.8125rem] font-medium text-brand-700 hover:bg-brand-50">Poori details</Link>
            {active && <Button size="sm" variant="ghost" className="ml-auto text-rose-700" onClick={() => onAction('cancel')} leftIcon={<XCircle className="h-4 w-4" />}>Cancel</Button>}
          </div>
        </div>
      )}
    </li>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 sm:block"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-medium tabular-nums text-slate-900">{v}</dd></div>;
}
