/**
 * Appointments: today's floor at a glance (waiting, in the chair, late,
 * done, advances held), the record by view (today, queue, upcoming, done,
 * missed, all) with search, date, stylist and source filters, and analytics
 * for a period (bookings, no-shows, walk-ins, billed amount by source,
 * stylists, services, busy hours and days). Every next step works from the row.
 *
 * Keys: N new booking · W walk-in · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlarmClock, Armchair, BarChart3, CalendarCheck, CalendarDays, CalendarPlus, CheckCircle2, Clock, Crown, Filter, GraduationCap, Hourglass,
  ListChecks, LogIn, MessageCircle, Receipt, Scissors, TrendingUp, UserRound, UserX, Users, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Button, Card, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi, type AppointmentQuery, type AppointmentSource, type AppointmentView } from '../api/appointments.api';
import { AppointmentRow, useAppointmentActions } from '../components/appointments';
import { useStylists } from '../components/fields';
import { AnalyticsSkeleton, CardTitle, Columns, EmptyList, HeroPrint, ListSkeleton, LoadFailed, Pager, RankedBars, StatTile, TotalsStrip } from '../components/ui';
import { SALON_KEYS, SOURCE_LABEL, STATUS, WEEKDAYS, serviceLine, shortDate, staffName, timeOf } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';
import { t as tr } from '@core/i18n';

type Tab = 'list' | 'analytics';

const VIEWS: Array<{ id: AppointmentView; label: string; icon: typeof Clock }> = [
  { id: 'today', label: tr('Aaj'), icon: CalendarCheck },
  { id: 'queue', label: tr('Queue — aaye hue / chair par'), icon: Hourglass },
  { id: 'upcoming', label: tr('Aane wale'), icon: CalendarDays },
  { id: 'done', label: tr('Ho gaye (bill bana)'), icon: CheckCircle2 },
  { id: 'missed', label: tr('Nahi aaye / cancel / late'), icon: UserX },
  { id: 'all', label: tr('Sab'), icon: ListChecks },
];
const viewLabel = (v: AppointmentView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const can = useSalonCan();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const stylists = useStylists();
  const searchRef = useRef<HTMLInputElement>(null);
  const act = useAppointmentActions();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [view, setView] = useState<AppointmentView>((params.get('view') as AppointmentView) || 'today');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [staffId, setStaffId] = useState('');
  const [source, setSource] = useState<AppointmentSource | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, staffId, source, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'list') next.delete('tab'); else next.set('tab', tab);
    if (view === 'today') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const period = resolveRange(range, startHour);
  const aPeriod = resolveRange(aRange, startHour);
  const q: AppointmentQuery = { view, page, limit: 30, search: query || undefined, staffProfileId: staffId || undefined, source: source || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [SALON_KEYS.appointments, 'page', q], queryFn: () => appointmentsApi.page(q), placeholderData: (p) => p, refetchInterval: 30_000, enabled: tab === 'list' });
  const sumQ = useQuery({ queryKey: [SALON_KEYS.appointments, 'summary', aPeriod?.from, aPeriod?.to], queryFn: () => appointmentsApi.summary(aPeriod ?? undefined), refetchInterval: 60_000 });

  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = sumQ.data;
  const filtered = !!staffId || !!source || !!query || range.preset !== 'all';
  const clear = () => { setStaffId(''); setSource(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: AppointmentView) => { setTab('list'); setView(v); };
  const walkIn = () => navigate('/salon/appointments/new?walkin=1');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.book) { e.preventDefault(); navigate('/salon/appointments/new'); }
      if ((e.key === 'w' || e.key === 'W') && can.book) { e.preventDefault(); walkIn(); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await appointmentsApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: tr('Appointments — {{view}}', { view: viewLabel(view) }),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Appointments'), String(all.total)], [tr('Kul'), formatPKR(all.totals.value)], [tr('Advance'), formatPKR(all.totals.paid)]],
      sections: [{
        kind: 'table',
        columns: [{ label: tr('Waqt') }, { label: tr('Number'), wideOnly: true }, { label: tr('Customer') }, { label: tr('Services'), wideOnly: true }, { label: tr('Stylist'), wideOnly: true }, { label: tr('Halat') }, { label: tr('Amount'), align: 'right' }],
        rows: all.items.map((a) => [
          `${shortDate(a.scheduledStart)} ${timeOf(a.scheduledStart)}`, a.appointmentNumber, `${a.customerName ?? tr('Walk-in')} ${a.customerPhone ?? ''}`.trim(),
          serviceLine(a.services), [...new Set(a.services.map((x) => x.staffName).filter(Boolean))].join(', ') || '—', STATUS[a.status].label, formatPKR(a.total),
        ]),
      }],
      footer: all.total > all.items.length ? tr('Pehle {{count}} (kul {{total}})', { count: all.items.length, total: all.total }) : undefined,
    };
  };

  const counts = data?.counts;
  const t = s?.today;
  return (
    <PageShell>
      <PageHero
        title={tr('Appointments')}
        chip={<><Scissors /> {' '}{tr('Salon')}</>}
        meta={tr('Booking, walk-in queue, chair aur bill — ek jagah')}
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={tab !== 'list' || !rows.length} />
          <Link to="/salon/calendar" className={heroButton}><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">{tr('Calendar')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.book && <button type="button" onClick={walkIn} title={tr('Walk-in (W)')} className={heroButton}><UserRound className="h-4 w-4" /><span className="hidden sm:inline">{tr('Walk-in')}</span></button>}
          {can.book && <Link to="/salon/appointments/new" title={tr('Nayi booking (N)')} className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> {' '}{tr('Booking')}</Link>}
        </>}
        stats={t ? [
          { label: tr('Aaj ke appointments'), value: t.total, hint: tr('{{done}} ho gaye', { done: t.done }) },
          { label: tr('Abhi salon me'), value: t.waiting + t.inChair, hint: tr('{{inChair}} chair par · {{waiting}} intezar', { inChair: t.inChair, waiting: t.waiting }) },
          { label: tr('Is period ka bill'), value: sales(s!.period.revenue), hint: tr('{{completed}} bill', { completed: s!.period.completed }) },
        ] : [{ label: tr('Aaj ke appointments'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Hourglass} color="#7c3aed" label={tr('Intezar me')} value={t.waiting} hint={t.waiting ? tr('Chair par bithayein') : tr('Koi intezar nahi')} onClick={() => pick('queue')} active={tab === 'list' && view === 'queue'} />
          <KpiCard icon={Armchair} color="#d97706" label={tr('Chair par')} value={t.inChair} hint={tr('Kaam ke baad bill banayein')} onClick={() => pick('queue')} />
          <KpiCard icon={AlarmClock} color={t.late ? '#e11d48' : '#64748b'} label={tr('Late')} value={t.late} hint={t.late ? tr('Call karein ya no-show') : tr('Sab waqt par')} onClick={() => pick('missed')} active={tab === 'list' && view === 'missed'} />
          <KpiCard icon={CalendarDays} color="#2563eb" label={tr('Aaj aane wale')} value={t.upcoming} hint={tr('Waqt ke hisaab se')} onClick={() => pick('today')} active={tab === 'list' && view === 'today'} />
          <KpiCard icon={Wallet} color="#16a34a" label={tr('Advance jama')} value={sales(s!.held.amount)} hint={tr('{{count}} khuli bookings par', { count: s!.held.count })} onClick={() => pick('upcoming')} active={tab === 'list' && view === 'upcoming'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tr('Jo appointments is period me the — bill ki amount sirf chalu bills se')}</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Customer, phone, number ya service…')} label={tr('Search')} />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{rangeLabel(period.from, period.to)}</FilterChip>}
            {staffId && <FilterChip onRemove={() => setStaffId('')}>{tr('Stylist: {{staffId}}', { staffId: stylists.nameOf(staffId) })}</FilterChip>}
            {source && <FilterChip onRemove={() => setSource('')}>{SOURCE_LABEL[source]}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'today'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? tr('{{value}} appointments', { value: counts[v.id] }) : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Date')} />
          {stylists.all.length > 0 && (
            <FilterMenu icon={Users} label={tr('Stylist')} value={staffId} active={!!staffId} onChange={setStaffId}
              options={[{ value: '', label: tr('Sab stylist') }, ...stylists.all.map((x) => ({ value: x.id, label: staffName(x) }))]} />
          )}
          <FilterMenu icon={LogIn} label={source ? SOURCE_LABEL[source] : tr('Kahan se')} value={source} active={!!source} onChange={setSource}
            options={[
              { value: '', label: tr('Sab') },
              { value: 'BOOKED', label: tr('Booking'), hint: tr('Pehle se waqt liya') },
              { value: 'WALK_IN', label: tr('Walk-in'), hint: tr('Aa kar queue me') },
              { value: 'COUNTER', label: tr('Counter'), hint: tr('Seedha counter par bill') },
            ]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{can.book && <><Kbd>N</Kbd> {' '}{tr('booking ·')}{' '} <Kbd>W</Kbd> {' '}{tr('walk-in ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>2</Kbd> {' '}{tr('tabs')}</>}
        tabs={[
          { id: 'list', label: tr('Appointments'), icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <Analytics summary={sumQ.data} loading={sumQ.isLoading} onStaff={(id) => { setStaffId(id); pick('all'); }} onSource={(k) => { setSource(k); pick('all'); }} /> : (<>
        {data && data.total > 0 && (
          <TotalsStrip>
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{tr('{{total}} appointments · {{sales}}', { total: data.total, sales: sales(data.totals.value) })}</span>
            {data.totals.paid > 0 && <span className="text-success-700">{tr('Paid / advance {{paid}}', { paid: sales(data.totals.paid) })}</span>}
          </TotalsStrip>
        )}
        {listQ.isLoading ? <ListSkeleton /> : listQ.isError && !data ? (
          <LoadFailed what={tr('Appointments')} retry={() => listQ.refetch()} />
        ) : !rows.length ? (
          <EmptyList icon={CalendarCheck}
            title={filtered ? tr('Is filter me koi appointment nahi') : view === 'queue' ? tr('Abhi koi intezar me nahi') : view === 'today' ? tr('Aaj koi appointment nahi') : tr('Koi appointment nahi')}
            text={tr('Phone par booking likhein, ya jo customer abhi aaya hai use walk-in me daalein — kaam ke baad counter par bill banta hai.')}>
            {can.book && <Button onClick={() => navigate('/salon/appointments/new')} leftIcon={<CalendarPlus className="h-4 w-4" />}>{tr('Nayi booking')}</Button>}
            {can.book && <Button variant="secondary" onClick={walkIn} leftIcon={<UserRound className="h-4 w-4" />}>{tr('Walk-in')}</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
          </EmptyList>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((a) => <AppointmentRow key={a.id} a={a} act={act} canBook={can.book} canBill={can.bill} />)}
          </ul>
        )}
        {data && <Pager page={page} pages={data.pages} onPage={setPage} />}
      </>)}

      {act.modals}

      {guide.isOpen && (
        <PageGuide title={tr('Appointments — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: CalendarPlus, color: '#db2777', title: tr('Booking'), text: tr('"Booking": customer, services, stylist aur waqt. Ek stylist ek waqt me do jagah book nahi hota — app khud rok deta hai.') },
            { icon: UserRound, color: '#7c3aed', title: tr('Walk-in queue'), text: tr('Jo customer bagair booking aaye use "Walk-in" se queue me daalein. Queue me pehle aane wala pehle.') },
            { icon: Armchair, color: '#d97706', title: tr('Aa gaye → chair par'), text: tr('Customer aaye to "Aa gaye", kaam shuru ho to "Chair par". Upar ke cards se pata chalta hai kaun intezar me hai.') },
            { icon: Receipt, color: '#16a34a', title: tr('Bill'), text: tr('"Bill" counter kholta hai: services, stylist aur advance pehle se bhare hote hain. Products, istemal ki cheezein aur tip wahin jorein.') },
            { icon: Wallet, color: '#0891b2', title: tr('Advance'), text: tr('Bridal ya bari booking par advance lein — customer ke khate me jama hota hai aur bill me khud kat jata hai. Cancel par bhi khate me rehta hai.') },
            { icon: MessageCircle, color: '#22c55e', title: tr('Yaad dihani'), text: tr('WhatsApp button se customer ko waqt yaad dilayein. 15 min late ho to "Late" dikhta hai — call karein ya no-show lagayein.') },
          ]}
          tips={[
            tr('Roz subah "Aaj" dekhein aur shaam ko "Queue" khali karein — koi bill reh na jaye.'),
            tr('Analytics me no-show rate aur busy ghante dekh kar staff ka shift banayein.'),
            tr('Membership aur package wale customer ka discount / session bill banate waqt counter par lagta hai.'),
          ]}
          shortcuts={[['N', tr('nayi booking')], ['W', 'walk-in'], ['/', 'dhoondein'], ['1', 'list'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Analytics({ summary: s, loading, onStaff, onSource }: {
  summary?: Awaited<ReturnType<typeof appointmentsApi.summary>>; loading: boolean; onStaff: (id: string) => void; onSource: (source: AppointmentSource) => void;
}) {
  const { sales } = useMasked();
  if (loading || !s) return <AnalyticsSkeleton />;
  const p = s.period;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={CalendarCheck} label={tr('Bookings')} value={p.bookings} sub={tr('{{walkIns}} walk-in · {{customers}} customers', { walkIns: p.walkIns, customers: p.customers })} />
        <StatTile icon={TrendingUp} tone="green" label={tr('Bill ki amount')} value={sales(p.revenue)} sub={tr('{{completed}} bill · ausat {{average}}', { completed: p.completed, average: sales(p.average) })} />
        <StatTile icon={UserX} tone="rose" label={tr('No-show')} value={`${p.noShowRate}%`} sub={tr('{{noShows}} nahi aaye · {{cancelled}} cancel', { noShows: p.noShows, cancelled: p.cancelled })} />
        <StatTile icon={Crown} tone="amber" label={tr('Stylist commission')} value={sales(p.commission)} sub={`${rangeLabel(p.from, p.to)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<CardTitle icon={Users}>{tr('Stylist — kis ne kitna kaam kiya')}</CardTitle>}>
          <RankedBars onPick={onStaff} rows={s.staff.map((x) => ({ key: x.staffProfileId, label: tr('{{name}} · {{services}} services', { name: x.name, services: x.services }), value: x.revenue, display: tr('{{revenue}} · comm {{commission}}', { revenue: sales(x.revenue), commission: sales(x.commission) }) }))} />
        </Card>
        <Card title={<CardTitle icon={Scissors}>{tr('Sab se zyada services')}</CardTitle>}>
          <RankedBars rows={s.services.map((x) => ({ key: x.serviceId, label: `${x.name} · ${x.count}`, value: x.revenue, display: sales(x.revenue), color: '#db2777' }))} />
        </Card>
        <Card title={<CardTitle icon={LogIn}>{tr('Customer kahan se aaye')}</CardTitle>}>
          <RankedBars onPick={(k) => onSource(k as AppointmentSource)}
            rows={(['BOOKED', 'WALK_IN', 'COUNTER'] as const).map((k) => ({
              key: k, label: tr('{{value}} · {{count}} ({{completed}} bill)', { value: SOURCE_LABEL[k], count: s.sources[k].count, completed: s.sources[k].completed }), value: s.sources[k].revenue, display: sales(s.sources[k].revenue), color: '#7c3aed',
            }))} />
        </Card>
        <Card title={<CardTitle icon={Clock}>{tr('Kis ghante zyada booking')}</CardTitle>}>
          <Columns items={s.hours.filter((h) => h.hour >= 8 && h.hour <= 23).map((h) => ({ key: String(h.hour), label: String(h.hour % 12 || 12), value: h.bookings, title: tr('{{hour}}:00 — {{bookings}} bookings', { hour: h.hour, bookings: h.bookings }) }))} />
        </Card>
        <Card title={<CardTitle icon={CalendarDays}>{tr('Hafte ke din')}</CardTitle>}>
          <Columns items={s.weekdays.map((d) => ({ key: String(d.day), label: WEEKDAYS[d.day].slice(0, 3), value: d.bookings, title: `${WEEKDAYS[d.day]} — ${d.bookings}` }))} />
        </Card>
      </div>
    </div>
  );
}
