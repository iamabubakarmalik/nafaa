/**
 * Grooming appointments: booking, work, ready, pickup. The day runs from
 * the "Aaj" tab: start the bath, mark it ready (with any extra charges),
 * and when the owner comes the shared checkout takes the money (cash,
 * card, split or udhaar) and makes the bill. Advances wait on the
 * customer's khata until then. Appointments are cancelled, never deleted;
 * a voided pickup bill makes the visit ready for pickup again.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarDays, CheckCircle2, Download, GraduationCap, ListChecks, PawPrint, Phone, Play, Plus, Receipt, Scissors, Star,
  UserX, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton,
  Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { PosCheckoutModal, type PosCheckoutResult } from '@modules/pos/components';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { groomersApi } from '../api/groomers.api';
import { groomingApi, type PetGroomingAppointment, type PetGroomingStatus } from '../api/grooming.api';
import { BarList, ConfirmModal, Empty, Info, ListCard, ListLoading, MoneyModal, Pager, Pill, actionBtn, primaryBtn } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { GROOM_STATUS, MONEY_KEYS, PET_KEYS, SERVICE, SPECIES_OPTIONS, dayKey, errorText, longDate, numIn, shortDate, speciesLabel } from '../lib/meta';

type Tab = 'today' | 'open' | 'all' | 'analytics';
type Action = 'view' | 'complete' | 'pickup' | 'advance' | 'cancel' | 'noshow' | 'rate';
const LIMIT = 25;
const STATUS_OPTIONS = [{ value: '', label: 'Sab halat' }, ...Object.entries(GROOM_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const due = (a: PetGroomingAppointment) => Math.max(Math.round((a.totalFee - a.paidAmount) * 100) / 100, 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function GroomingPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [status, setStatus] = useState('');
  const [groomerId, setGroomerId] = useState('');
  const [species, setSpecies] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [act, setAct] = useState<{ a: PetGroomingAppointment; kind: Action } | null>(null);
  const range = resolveRange(period, startHour);

  const params = {
    search: q || undefined, groomerId: groomerId || undefined, species: species || undefined, page, limit: LIMIT,
    status: status || (tab === 'open' ? 'OPEN' : undefined), today: tab === 'today' ? true : undefined,
    from: tab === 'today' ? undefined : range?.from, to: tab === 'today' ? undefined : range?.to,
  };
  const listQ = useQuery({ queryKey: [PET_KEYS.grooming, 'paged', params], queryFn: () => groomingApi.paged(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const openQ = useQuery({ queryKey: [PET_KEYS.grooming, 'open'], queryFn: () => groomingApi.paged({ status: 'OPEN', limit: 1 }) });
  const todayQ = useQuery({ queryKey: [PET_KEYS.grooming, 'today'], queryFn: () => groomingApi.paged({ today: true, limit: 1 }) });
  const anaQ = useQuery({ queryKey: [PET_KEYS.grooming, 'analytics', range], queryFn: () => groomingApi.analytics({ from: range?.from, to: range?.to }), enabled: tab === 'analytics' });
  const groomersQ = useQuery({ queryKey: [PET_KEYS.groomers, 'active'], queryFn: () => groomersApi.list({ active: true }), staleTime: 60_000 });
  const rows = listQ.data?.items ?? [];
  const counts = openQ.data?.counts ?? {};
  usePageKeys(searchRef, { t: () => setTab('today'), a: () => setTab('analytics') });

  const refresh = () => [PET_KEYS.grooming, 'petshop-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const done = (msg: string) => { refresh(); setAct(null); toast.success(msg); };
  const start = useMutation({
    mutationFn: (a: PetGroomingAppointment) => groomingApi.start(a.id),
    onSuccess: (a) => done(`${a.petName}: kaam shuru`),
    onError: (e) => toast.error(errorText(e, 'Shuru nahi hua')),
  });
  const setState = useMutation({
    mutationFn: ({ a, to, reason }: { a: PetGroomingAppointment; to: PetGroomingStatus; reason?: string }) => groomingApi.updateStatus(a.id, { status: to, reason }),
    onSuccess: (a) => done(`${a.petName}: ${GROOM_STATUS[a.status].label}`),
    onError: (e) => toast.error(errorText(e, 'Halat nahi badli')),
  });
  const cancel = useMutation({
    mutationFn: ({ a }: { a: PetGroomingAppointment }) => groomingApi.cancel(a.id),
    onSuccess: (a) => done(a.paidAmount > 0 ? 'Cancel — advance customer ke khate me jama hai' : 'Appointment cancel'),
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hua')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me kuch nahi'); return; }
    downloadCsv('grooming.csv', [
      ['Number', 'Date', 'Waqt', 'Pet', 'Janwar', 'Malik', 'Phone', 'Service', 'Groomer', 'Fee', 'Mila', 'Baqi', 'Halat'],
      ...rows.map((a) => [a.appointmentNumber, a.scheduledDate.slice(0, 10), a.scheduledSlot ?? '', a.petName, speciesLabel(a.petSpecies), a.customerName, a.customerPhone,
        SERVICE[a.serviceType], a.groomerName ?? '', a.totalFee, a.paidAmount, due(a), GROOM_STATUS[a.status]?.label]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'today' ? 'Aaj ki grooming' : 'Grooming', subtitle: tab === 'today' ? longDate(dayKey()) : undefined,
    meta: [['Kitne', String(rows.length)]],
    sections: [{
      kind: 'table', title: 'Appointments',
      columns: [{ label: 'Waqt' }, { label: 'Pet' }, { label: 'Malik' }, { label: 'Service' }, { label: 'Groomer', wideOnly: true }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((a) => [a.scheduledSlot ?? shortDate(a.scheduledDate), `${a.petName} (${speciesLabel(a.petSpecies)})`, `${a.customerName} ${a.customerPhone}`, SERVICE[a.serviceType], a.groomerName ?? '', money(due(a))]),
    }],
  });
  const clear = () => { setSearch(''); setStatus(''); setGroomerId(''); setSpecies(''); setPeriod({ preset: 'all', custom: { from: '', to: '' } }); setPage(1); };
  const filtered = !!(search.trim() || status || groomerId || species || (tab !== 'today' && range));
  const groomerOptions = [{ value: '', label: 'Sab groomers' }, ...(groomersQ.data ?? []).map((g) => ({ value: g.id, label: g.name }))];

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Grooming" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#0284c7', title: 'Booking', text: '"Nayi booking" me pet, malik ka phone, service, din aur groomer ka khali waqt chunein.' },
            { icon: Play, color: '#d97706', title: 'Kaam', text: 'Pet aaye to "Shuru", kaam khatam ho to "Tayyar" — extra service ya discount yahin likhein.' },
            { icon: Receipt, color: '#16a34a', title: 'Le jayein = bill', text: '"Le jayein" par counter wala checkout khulta hai — cash, card, split ya udhaar. Bill sales aur day book me jata hai.' },
            { icon: Wallet, color: '#7c3aed', title: 'Advance', text: 'Pehle paisa liya to "Advance" — customer ke khate me jama; bill par khud kat jata hai.' },
          ]}
          shortcuts={[['/', 'search'], ['T', 'aaj'], ['A', 'analytics'], ['G', 'guide']]} />
      )}

      <PageHero title="Grooming" busy={listQ.isFetching && !listQ.isLoading} loading={openQ.isLoading} meta="Booking se bill tak"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/petshop/groomers" className={heroButton}><Scissors className="h-4 w-4" />Groomers</Link>
          {canWork && <Link to="/petshop/grooming/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Nayi booking</Link>}
        </>}
        stats={[
          { label: 'Aaj', value: String(todayQ.data?.total ?? 0) },
          { label: 'Chalu', value: String(openQ.data?.total ?? 0) },
          { label: 'Chalu ka baqi', value: money(Math.max((openQ.data?.totals.fee ?? 0) - (openQ.data?.totals.paid ?? 0), 0)) },
        ]} />

      <KpiRow cols={4}>
        {openQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={CalendarDays} color="#0284c7" label="Booking / pakki" value={(counts.SCHEDULED ?? 0) + (counts.CONFIRMED ?? 0)} />
          <KpiCard icon={Play} color="#d97706" label="Kaam jari" value={counts.IN_PROGRESS ?? 0} active={status === 'IN_PROGRESS'} onClick={() => { setStatus(status === 'IN_PROGRESS' ? '' : 'IN_PROGRESS'); setTab('all'); setPage(1); }} />
          <KpiCard icon={PawPrint} color="#7c3aed" label="Tayyar — le jayein" value={counts.READY_FOR_PICKUP ?? 0} active={status === 'READY_FOR_PICKUP'} onClick={() => { setStatus(status === 'READY_FOR_PICKUP' ? '' : 'READY_FOR_PICKUP'); setTab('all'); setPage(1); }} />
          <KpiCard icon={Wallet} color="#16a34a" label="Advance mila (chalu)" value={money(openQ.data?.totals.paid ?? 0)} hint="Customer ke khate me" />
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Pet, malik, phone ya number…" />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{GROOM_STATUS[status as PetGroomingStatus]?.label}</FilterChip>}
          {groomerId && <FilterChip onRemove={() => setGroomerId('')}>{groomerOptions.find((g) => g.value === groomerId)?.label}</FilterChip>}
          {species && <FilterChip onRemove={() => setSpecies('')}>{speciesLabel(species)}</FilterChip>}
          {tab !== 'today' && range && <FilterChip onRemove={() => setPeriod({ preset: 'all', custom: { from: '', to: '' } })}>{range.from} → {range.to}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label={status ? GROOM_STATUS[status as PetGroomingStatus]?.label : 'Halat'} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterMenu icon={Scissors} label={groomerId ? groomerOptions.find((g) => g.value === groomerId)?.label ?? 'Groomer' : 'Groomer'} value={groomerId} active={!!groomerId} options={groomerOptions} onChange={(v) => { setGroomerId(v); setPage(1); }} />
        <FilterMenu icon={PawPrint} label={species ? speciesLabel(species) : 'Janwar'} value={species} active={!!species} options={[{ value: '', label: 'Sab janwar' }, ...SPECIES_OPTIONS]} onChange={(v) => { setSpecies(v); setPage(1); }} />
        {tab !== 'today' && <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Din" />}
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint="Appointment par click kar ke tafseel aur print"
        tabs={[
          { id: 'today', label: 'Aaj', icon: CalendarDays, count: todayQ.data?.total ?? null },
          { id: 'open', label: 'Chalu', icon: Play, count: openQ.data?.total ?? null },
          { id: 'all', label: 'Sab', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        anaQ.isLoading || !anaQ.data ? <ListLoading /> : (
          <div className="space-y-4">
            <KpiRow cols={4}>
              <KpiCard icon={CalendarDays} color="#0284c7" label="Bookings" value={anaQ.data.booked} />
              <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal" value={anaQ.data.done} hint={money(anaQ.data.value)} />
              <KpiCard icon={UserX} color="#e11d48" label="Nahi aaye / cancel" value={anaQ.data.noShow + anaQ.data.cancelled} />
              <KpiCard icon={Star} color="#d97706" label="Rating" value={anaQ.data.avgRating ?? '—'} />
            </KpiRow>
            <div className="grid gap-4 lg:grid-cols-2">
              <BarList title="Service" money={money} rows={anaQ.data.byService.map((r) => ({ ...r, label: SERVICE[r.key as keyof typeof SERVICE] ?? r.key }))} />
              <BarList title="Groomer" money={money} rows={anaQ.data.byGroomer} />
              <BarList title="Janwar" money={money} rows={anaQ.data.bySpecies.map((r) => ({ ...r, label: speciesLabel(r.key) }))} />
              <BarList title="Din ba din" money={money} rows={anaQ.data.byDay.map((r) => ({ ...r, label: shortDate(r.key) }))} />
            </div>
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Scissors} title={tab === 'today' ? 'Aaj koi booking nahi' : 'Is filter me kuch nahi'} text="Nahlana, baal katna, nakhun — booking banayein, groomer ka waqt khud bachta hai."
              action={canWork ? <Link to="/petshop/grooming/new" className={primaryBtn}><Plus className="h-4 w-4" />Nayi booking</Link> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((a) => {
                const owed = due(a);
                return (
                  <li key={a.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_9rem_9rem_auto] lg:items-center">
                    <button type="button" onClick={() => setAct({ a, kind: 'view' })} className="min-w-0 text-left">
                      <p className="truncate font-semibold text-slate-900 hover:underline">{a.petName} <span className="font-normal text-slate-500">· {speciesLabel(a.petSpecies)}{a.petBreed ? ` · ${a.petBreed}` : ''}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[a.customerName, a.customerPhone, SERVICE[a.serviceType], a.groomerName].filter(Boolean).join(' · ')}</p>
                    </button>
                    <p className="text-[0.8125rem] text-slate-700">{shortDate(a.scheduledDate)}<span className="block text-[0.75rem] text-slate-500">{a.scheduledSlot ?? 'Waqt nahi'}</span></p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(a.totalFee)}
                      <span className={cn('block text-[0.75rem] font-medium', owed > 0.009 ? 'text-rose-700' : 'text-emerald-700')}>{a.status === 'COMPLETED' ? 'Bill ban gaya' : owed > 0.009 ? `${money(owed)} baqi` : 'Poora mila'}</span></p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Pill tone={GROOM_STATUS[a.status]?.tone ?? ''}>{GROOM_STATUS[a.status]?.label}</Pill>
                      {canWork && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && <button type="button" disabled={start.isPending} onClick={() => start.mutate(a)} className={actionBtn}><Play className="h-4 w-4" />Shuru</button>}
                      {canWork && a.status === 'IN_PROGRESS' && <button type="button" onClick={() => setAct({ a, kind: 'complete' })} className={actionBtn}><CheckCircle2 className="h-4 w-4" />Tayyar</button>}
                      {canWork && a.status === 'READY_FOR_PICKUP' && <button type="button" onClick={() => setAct({ a, kind: 'pickup' })} className={primaryBtn}><Receipt className="h-4 w-4" />Le jayein (bill)</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {act?.kind === 'view' && <AppointmentModal a={act.a} money={money} canWork={canWork} onAction={(kind) => setAct({ a: act.a, kind })} onClose={() => setAct(null)} />}
      {act?.kind === 'complete' && <CompleteModal a={act.a} money={money} onClose={() => setAct(null)} onDone={() => done(`${act.a.petName} tayyar — malik ko bulayein`)} />}
      {act?.kind === 'pickup' && <PickupCheckout a={act.a} onClose={() => setAct(null)} onDone={(msg) => done(msg)} />}
      {act?.kind === 'advance' && <AdvanceModal a={act.a} money={money} onClose={() => setAct(null)} onDone={(amt) => done(`${money(amt)} advance khate me jama`)} />}
      {act?.kind === 'rate' && <RateModal a={act.a} onClose={() => setAct(null)} onDone={() => done('Rating save')} />}
      {act?.kind === 'cancel' && <ConfirmModal title="Appointment cancel?" cta="Haan, cancel" danger busy={cancel.isPending} onConfirm={() => cancel.mutate({ a: act.a })} onClose={() => setAct(null)}
        text={act.a.paidAmount > 0 ? `${money(act.a.paidAmount)} advance customer ke khate me jama rahega — wapas dena ho to Khata se dein.` : 'Record rehta hai, sirf cancel hota hai.'} />}
      {act?.kind === 'noshow' && <ConfirmModal title="Customer nahi aaye?" cta="Haan, nahi aaye" busy={setState.isPending} onConfirm={() => setState.mutate({ a: act.a, to: 'NO_SHOW' })} onClose={() => setAct(null)}
        text="Groomer ka waqt khali ho jayega. Baad me aayein to dobara booking karein." />}
    </PageShell>
  );
}

function AppointmentModal({ a, money, canWork, onAction, onClose }: {
  a: PetGroomingAppointment; money: (n: number) => string; canWork: boolean; onAction: (k: Action) => void; onClose: () => void;
}) {
  const detailQ = useQuery({ queryKey: [PET_KEYS.grooming, 'one', a.id], queryFn: () => groomingApi.getOne(a.id) });
  const full = detailQ.data ?? a;
  const owed = due(full);
  const booking = full.status === 'SCHEDULED' || full.status === 'CONFIRMED';
  const open = booking || full.status === 'IN_PROGRESS' || full.status === 'READY_FOR_PICKUP';
  const slip = (): PrintDoc => ({
    title: `Grooming ${full.appointmentNumber}`, subtitle: `${longDate(full.scheduledDate)} ${full.scheduledSlot ?? ''}`,
    meta: [['Fee', money(full.totalFee)], ['Mila', money(full.paidAmount)], ['Baqi', money(owed)]],
    sections: [{ kind: 'rows', title: 'Pet', rows: [
      { label: 'Pet', value: `${full.petName} · ${speciesLabel(full.petSpecies)} ${full.petBreed ?? ''}` }, { label: 'Malik', value: `${full.customerName} ${full.customerPhone}` },
      { label: 'Service', value: [SERVICE[full.serviceType], ...full.additionalServices.map((s) => SERVICE[s])].join(', ') }, { label: 'Groomer', value: full.groomerName ?? '—' },
      { label: 'Khayal', value: [full.petTemperament, full.petAllergies, full.petSpecialInstructions].filter(Boolean).join(' · ') || '—' },
    ] }],
  });
  return (
    <Modal open onClose={onClose} size="lg" title={`${full.petName} · ${GROOM_STATUS[full.status].label}`} description={`${full.appointmentNumber} · ${longDate(full.scheduledDate)} ${full.scheduledSlot ?? ''}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={slip} label="Slip" size="sm" />
        {canWork && booking && <Link to={`/petshop/grooming/${full.id}/edit`} className={actionBtn}>Badlein</Link>}
        {canWork && booking && <Button variant="secondary" size="sm" onClick={() => onAction('noshow')}><UserX className="h-4 w-4" />Nahi aaye</Button>}
        {canWork && booking && <Button variant="secondary" size="sm" onClick={() => onAction('cancel')}><XCircle className="h-4 w-4" />Cancel</Button>}
        {canWork && full.status === 'COMPLETED' && !full.customerRating && <Button variant="secondary" size="sm" onClick={() => onAction('rate')}><Star className="h-4 w-4" />Rating</Button>}
        <span className="flex-1" />
        {canWork && open && owed > 0.009 && full.status !== 'READY_FOR_PICKUP' && <Button variant="secondary" onClick={() => onAction('advance')}><Wallet className="h-4 w-4" />Advance</Button>}
        {canWork && full.status === 'IN_PROGRESS' && <Button onClick={() => onAction('complete')}><CheckCircle2 className="h-4 w-4" />Tayyar</Button>}
        {canWork && full.status === 'READY_FOR_PICKUP' && <Button onClick={() => onAction('pickup')}><Receipt className="h-4 w-4" />Le jayein (bill)</Button>}
      </div>}>
      <div className="space-y-4 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={PawPrint} title="Pet">
            <p className="font-semibold text-slate-900">{full.petName} · {speciesLabel(full.petSpecies)}</p>
            <p className="text-slate-600">{[full.petBreed, full.petWeightKg ? `${full.petWeightKg} kg` : null, full.petTemperament].filter(Boolean).join(' · ') || '—'}</p>
            {full.petAllergies && <p className="text-rose-700">Allergy: {full.petAllergies}</p>}
          </Info>
          <Info icon={Phone} title="Malik">
            <p className="font-semibold text-slate-900">{full.customerName}</p>
            <a href={`tel:${full.customerPhone}`} className="text-brand-700 hover:underline">{full.customerPhone}</a>
          </Info>
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            <li className="flex justify-between px-4 py-2"><span>{SERVICE[full.serviceType]}</span><span className="tabular-nums">{money(full.serviceFee)}</span></li>
            {full.additionalCharges > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>Extra ({full.additionalServices.map((s) => SERVICE[s]).join(', ') || 'service'})</span><span className="tabular-nums">{money(full.additionalCharges)}</span></li>}
            {full.discount > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>Discount</span><span className="tabular-nums">−{money(full.discount)}</span></li>}
            <li className="flex justify-between bg-slate-50 px-4 py-2 font-semibold"><span>Total · mila {money(full.paidAmount)}</span><span className="tabular-nums">{money(full.totalFee)}</span></li>
          </ul>
        </div>
        {full.groomerNotes && <p className="whitespace-pre-line text-slate-600">{full.groomerNotes}</p>}
        {full.customerRating && <p className="text-amber-700">{'★'.repeat(full.customerRating)}{full.customerFeedback ? ` — ${full.customerFeedback}` : ''}</p>}
        {(full.previousVisits?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Pichli visits</p>
            <ul className="space-y-1 text-[0.8125rem] text-slate-600">{full.previousVisits!.slice(0, 5).map((v) => <li key={v.id}>{shortDate(v.scheduledDate)} · {v.petName} · {SERVICE[v.serviceType]} · {money(v.totalFee)}</li>)}</ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CompleteModal({ a, money, onClose, onDone }: { a: PetGroomingAppointment; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const [extra, setExtra] = useState(a.additionalCharges ? String(a.additionalCharges) : '');
  const [discount, setDiscount] = useState(a.discount ? String(a.discount) : '');
  const [notes, setNotes] = useState('');
  const ex = numIn(extra) ?? 0;
  const dis = numIn(discount) ?? 0;
  const total = Math.max(a.serviceFee + ex - dis, 0);
  const error = ex < 0 || dis < 0 ? 'Amount sahi likhein' : total < a.paidAmount - 0.01 ? `${money(a.paidAmount)} pehle mil chuke — total us se kam nahi` : '';
  const save = useMutation({
    mutationFn: () => groomingApi.complete(a.id, { additionalCharges: ex, discount: dis, groomerNotes: notes.trim() || undefined }),
    onSuccess: onDone,
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { if (error) { toast.error(error); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="sm" title={`${a.petName} tayyar`} description="Extra service ya discount ho to likhein"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Tayyar hai</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Extra (Rs)" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} hint="Pissu, nakhun waghera" />
          <Input label="Discount (Rs)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} error={error || undefined} />
        </div>
        <Textarea label="Groomer ka note (marzi)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kaan me infection — doctor ko dikhayein" />
        <p className="text-[0.875rem] font-semibold text-slate-900">Total {money(total)} · baqi {money(Math.max(total - a.paidAmount, 0))}</p>
      </form>
    </Modal>
  );
}

/** Pickup with the counter's checkout: full, part (rest udhaar), udhaar or split. */
function PickupCheckout({ a, onClose, onDone }: { a: PetGroomingAppointment; onClose: () => void; onDone: (msg: string) => void }) {
  const owed = due(a);
  const { data: counter } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const pickup = useMutation({
    mutationFn: (pay: PosCheckoutResult) => {
      if (pay.payments && pay.payments.length > 1) return groomingApi.pickup(a.id, { payments: pay.payments.map((p) => ({ method: p.method, amount: p.amount })) });
      const paid = pay.isCredit && pay.paidAmount <= 0 ? 0 : pay.depositExtra ? Math.min(pay.paidAmount, owed) : pay.paidAmount;
      return groomingApi.pickup(a.id, { paymentMethod: pay.paymentMethod, paidAmount: r2(paid) });
    },
    onSuccess: (r) => {
      const change = r.change ?? 0;
      onDone(`Bill ${r.sale?.saleNumber ?? ''} ban gaya${change > 0.009 ? ` — Rs ${change} wapas dein` : ''}`);
    },
    onError: (e) => toast.error(errorText(e, 'Bill nahi bana')),
  });
  if (owed <= 0.009) {
    return <ConfirmModal title={`${a.petName} le jayein?`} cta="Haan, bill banayein" busy={pickup.isPending} onClose={onClose}
      onConfirm={() => pickup.mutate({ paymentMethod: 'CASH', paidAmount: 0, isCredit: false, depositExtra: false })}
      text="Poora paisa pehle mil chuka hai (khate me). Bill banega aur advance us me se kat jayega." />;
  }
  return (
    <PosCheckoutModal total={owed} itemCount={1} loading={pickup.isPending} initMode="full" customerName={a.customerName} hasCustomer
      allowCredit={counter?.allowCredit ?? true} initMethod={(counter?.defaultPaymentMethod as PosCheckoutResult['paymentMethod']) || 'CASH'}
      onConfirm={(d) => pickup.mutate(d)} onClose={() => { if (!pickup.isPending) onClose(); }} />
  );
}

function AdvanceModal({ a, money, onClose, onDone }: { a: PetGroomingAppointment; money: (n: number) => string; onClose: () => void; onDone: (amount: number) => void }) {
  const owed = due(a);
  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string }) => groomingApi.payment(a.id, { amount: v.amount, paymentMethod: v.paymentMethod }),
    onSuccess: (_, v) => onDone(v.amount),
    onError: (e) => toast.error(errorText(e, 'Advance save nahi hua')),
  });
  return <MoneyModal title="Advance lein" description={`${a.petName} — baqi ${money(owed)}`} due={owed} max={owed} busy={pay.isPending} cta="Advance lein"
    hint="Customer ke khate me jama; pickup ke bill par kat jata hai" onSubmit={(v) => pay.mutate(v)} onClose={onClose} />;
}

function RateModal({ a, onClose, onDone }: { a: PetGroomingAppointment; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const save = useMutation({
    mutationFn: () => groomingApi.rate(a.id, { rating, feedback: feedback.trim() || undefined }),
    onSuccess: onDone,
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Customer ki rating" description={a.petName}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`} className={cn('text-2xl', n <= rating ? 'text-amber-500' : 'text-slate-300')}>★</button>)}</div>
        <Textarea label="Kya kaha (marzi)" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
    </Modal>
  );
}
