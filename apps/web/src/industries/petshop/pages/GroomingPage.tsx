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
import { t as tr } from '@core/i18n';

type Tab = 'today' | 'open' | 'all' | 'analytics';
type Action = 'view' | 'complete' | 'pickup' | 'advance' | 'cancel' | 'noshow' | 'rate';
const LIMIT = 25;
const STATUS_OPTIONS = [{ value: '', label: tr('Sab halat') }, ...Object.entries(GROOM_STATUS).map(([value, s]) => ({ value, label: s.label }))];
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
    onSuccess: (a) => done(tr('{{petName}}: kaam shuru', { petName: a.petName })),
    onError: (e) => toast.error(errorText(e, tr('Shuru nahi hua'))),
  });
  const setState = useMutation({
    mutationFn: ({ a, to, reason }: { a: PetGroomingAppointment; to: PetGroomingStatus; reason?: string }) => groomingApi.updateStatus(a.id, { status: to, reason }),
    onSuccess: (a) => done(`${a.petName}: ${GROOM_STATUS[a.status].label}`),
    onError: (e) => toast.error(errorText(e, tr('Halat nahi badli'))),
  });
  const cancel = useMutation({
    mutationFn: ({ a }: { a: PetGroomingAppointment }) => groomingApi.cancel(a.id),
    onSuccess: (a) => done(a.paidAmount > 0 ? tr('Cancel — advance customer ke khate me jama hai') : tr('Appointment cancel')),
    onError: (e) => toast.error(errorText(e, tr('Cancel nahi hua'))),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Is filter me kuch nahi')); return; }
    downloadCsv('grooming.csv', [
      [tr('Number'), tr('Date'), tr('Waqt'), tr('Pet'), tr('Janwar'), tr('Malik'), tr('Phone'), tr('Service'), tr('Groomer'), tr('Fee'), tr('Mila'), tr('Baqi'), tr('Halat')],
      ...rows.map((a) => [a.appointmentNumber, a.scheduledDate.slice(0, 10), a.scheduledSlot ?? '', a.petName, speciesLabel(a.petSpecies), a.customerName, a.customerPhone,
        SERVICE[a.serviceType], a.groomerName ?? '', a.totalFee, a.paidAmount, due(a), GROOM_STATUS[a.status]?.label]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'today' ? tr('Aaj ki grooming') : tr('Grooming'), subtitle: tab === 'today' ? longDate(dayKey()) : undefined,
    meta: [[tr('Kitne'), String(rows.length)]],
    sections: [{
      kind: 'table', title: tr('Appointments'),
      columns: [{ label: tr('Waqt') }, { label: tr('Pet') }, { label: tr('Malik') }, { label: tr('Service') }, { label: tr('Groomer'), wideOnly: true }, { label: tr('Baqi'), align: 'right' }],
      rows: rows.map((a) => [a.scheduledSlot ?? shortDate(a.scheduledDate), `${a.petName} (${speciesLabel(a.petSpecies)})`, `${a.customerName} ${a.customerPhone}`, SERVICE[a.serviceType], a.groomerName ?? '', money(due(a))]),
    }],
  });
  const clear = () => { setSearch(''); setStatus(''); setGroomerId(''); setSpecies(''); setPeriod({ preset: 'all', custom: { from: '', to: '' } }); setPage(1); };
  const filtered = !!(search.trim() || status || groomerId || species || (tab !== 'today' && range));
  const groomerOptions = [{ value: '', label: tr('Sab groomers') }, ...(groomersQ.data ?? []).map((g) => ({ value: g.id, label: g.name }))];

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Grooming')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#0284c7', title: tr('Booking'), text: tr('"Nayi booking" me pet, malik ka phone, service, din aur groomer ka khali waqt chunein.') },
            { icon: Play, color: '#d97706', title: tr('Kaam'), text: tr('Pet aaye to "Shuru", kaam khatam ho to "Tayyar" — extra service ya discount yahin likhein.') },
            { icon: Receipt, color: '#16a34a', title: tr('Le jayein = bill'), text: tr('"Le jayein" par counter wala checkout khulta hai — cash, card, split ya udhaar. Bill sales aur day book me jata hai.') },
            { icon: Wallet, color: '#7c3aed', title: tr('Advance'), text: tr('Pehle paisa liya to "Advance" — customer ke khate me jama; bill par khud kat jata hai.') },
          ]}
          shortcuts={[['/', 'search'], ['T', 'aaj'], ['A', 'analytics'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Grooming')} busy={listQ.isFetching && !listQ.isLoading} loading={openQ.isLoading} meta={tr('Booking se bill tak')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/petshop/groomers" className={heroButton}><Scissors className="h-4 w-4" />{tr('Groomers')}</Link>
          {canWork && <Link to="/petshop/grooming/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Nayi booking')}</Link>}
        </>}
        stats={[
          { label: tr('Aaj'), value: String(todayQ.data?.total ?? 0) },
          { label: tr('Chalu'), value: String(openQ.data?.total ?? 0) },
          { label: tr('Chalu ka baqi'), value: money(Math.max((openQ.data?.totals.fee ?? 0) - (openQ.data?.totals.paid ?? 0), 0)) },
        ]} />

      <KpiRow cols={4}>
        {openQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={CalendarDays} color="#0284c7" label={tr('Booking / pakki')} value={(counts.SCHEDULED ?? 0) + (counts.CONFIRMED ?? 0)} />
          <KpiCard icon={Play} color="#d97706" label={tr('Kaam jari')} value={counts.IN_PROGRESS ?? 0} active={status === 'IN_PROGRESS'} onClick={() => { setStatus(status === 'IN_PROGRESS' ? '' : 'IN_PROGRESS'); setTab('all'); setPage(1); }} />
          <KpiCard icon={PawPrint} color="#7c3aed" label={tr('Tayyar — le jayein')} value={counts.READY_FOR_PICKUP ?? 0} active={status === 'READY_FOR_PICKUP'} onClick={() => { setStatus(status === 'READY_FOR_PICKUP' ? '' : 'READY_FOR_PICKUP'); setTab('all'); setPage(1); }} />
          <KpiCard icon={Wallet} color="#16a34a" label={tr('Advance mila (chalu)')} value={money(openQ.data?.totals.paid ?? 0)} hint={tr('Customer ke khate me')} />
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Pet, malik, phone ya number…')} />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{GROOM_STATUS[status as PetGroomingStatus]?.label}</FilterChip>}
          {groomerId && <FilterChip onRemove={() => setGroomerId('')}>{groomerOptions.find((g) => g.value === groomerId)?.label}</FilterChip>}
          {species && <FilterChip onRemove={() => setSpecies('')}>{speciesLabel(species)}</FilterChip>}
          {tab !== 'today' && range && <FilterChip onRemove={() => setPeriod({ preset: 'all', custom: { from: '', to: '' } })}>{range.from} → {range.to}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label={status ? GROOM_STATUS[status as PetGroomingStatus]?.label : tr('Halat')} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterMenu icon={Scissors} label={groomerId ? groomerOptions.find((g) => g.value === groomerId)?.label ?? tr('Groomer') : tr('Groomer')} value={groomerId} active={!!groomerId} options={groomerOptions} onChange={(v) => { setGroomerId(v); setPage(1); }} />
        <FilterMenu icon={PawPrint} label={species ? speciesLabel(species) : tr('Janwar')} value={species} active={!!species} options={[{ value: '', label: tr('Sab janwar') }, ...SPECIES_OPTIONS]} onChange={(v) => { setSpecies(v); setPage(1); }} />
        {tab !== 'today' && <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label={tr('Din')} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint={tr('Appointment par click kar ke tafseel aur print')}
        tabs={[
          { id: 'today', label: tr('Aaj'), icon: CalendarDays, count: todayQ.data?.total ?? null },
          { id: 'open', label: tr('Chalu'), icon: Play, count: openQ.data?.total ?? null },
          { id: 'all', label: tr('Sab'), icon: ListChecks },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        anaQ.isLoading || !anaQ.data ? <ListLoading /> : (
          <div className="space-y-4">
            <KpiRow cols={4}>
              <KpiCard icon={CalendarDays} color="#0284c7" label={tr('Bookings')} value={anaQ.data.booked} />
              <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Mukammal')} value={anaQ.data.done} hint={money(anaQ.data.value)} />
              <KpiCard icon={UserX} color="#e11d48" label={tr('Nahi aaye / cancel')} value={anaQ.data.noShow + anaQ.data.cancelled} />
              <KpiCard icon={Star} color="#d97706" label={tr('Rating')} value={anaQ.data.avgRating ?? '—'} />
            </KpiRow>
            <div className="grid gap-4 lg:grid-cols-2">
              <BarList title={tr('Service')} money={money} rows={anaQ.data.byService.map((r) => ({ ...r, label: SERVICE[r.key as keyof typeof SERVICE] ?? r.key }))} />
              <BarList title={tr('Groomer')} money={money} rows={anaQ.data.byGroomer} />
              <BarList title={tr('Janwar')} money={money} rows={anaQ.data.bySpecies.map((r) => ({ ...r, label: speciesLabel(r.key) }))} />
              <BarList title={tr('Din ba din')} money={money} rows={anaQ.data.byDay.map((r) => ({ ...r, label: shortDate(r.key) }))} />
            </div>
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Scissors} title={tab === 'today' ? tr('Aaj koi booking nahi') : tr('Is filter me kuch nahi')} text={tr('Nahlana, baal katna, nakhun — booking banayein, groomer ka waqt khud bachta hai.')}
              action={canWork ? <Link to="/petshop/grooming/new" className={primaryBtn}><Plus className="h-4 w-4" />{tr('Nayi booking')}</Link> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((a) => {
                const owed = due(a);
                return (
                  <li key={a.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_9rem_9rem_auto] lg:items-center">
                    <button type="button" onClick={() => setAct({ a, kind: 'view' })} className="min-w-0 text-start">
                      <p className="truncate font-semibold text-slate-900 hover:underline">{a.petName} <span className="font-normal text-slate-500">· {speciesLabel(a.petSpecies)}{a.petBreed ? ` · ${a.petBreed}` : ''}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[a.customerName, a.customerPhone, SERVICE[a.serviceType], a.groomerName].filter(Boolean).join(' · ')}</p>
                    </button>
                    <p className="text-[0.8125rem] text-slate-700">{shortDate(a.scheduledDate)}<span className="block text-[0.75rem] text-slate-500">{a.scheduledSlot ?? tr('Waqt nahi')}</span></p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(a.totalFee)}
                      <span className={cn('block text-[0.75rem] font-medium', owed > 0.009 ? 'text-rose-700' : 'text-emerald-700')}>{a.status === 'COMPLETED' ? tr('Bill ban gaya') : owed > 0.009 ? tr('{{owed}} baqi', { owed: money(owed) }) : tr('Poora mila')}</span></p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Pill tone={GROOM_STATUS[a.status]?.tone ?? ''}>{GROOM_STATUS[a.status]?.label}</Pill>
                      {canWork && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && <button type="button" disabled={start.isPending} onClick={() => start.mutate(a)} className={actionBtn}><Play className="h-4 w-4" />{tr('Shuru')}</button>}
                      {canWork && a.status === 'IN_PROGRESS' && <button type="button" onClick={() => setAct({ a, kind: 'complete' })} className={actionBtn}><CheckCircle2 className="h-4 w-4" />{tr('Tayyar')}</button>}
                      {canWork && a.status === 'READY_FOR_PICKUP' && <button type="button" onClick={() => setAct({ a, kind: 'pickup' })} className={primaryBtn}><Receipt className="h-4 w-4" />{tr('Le jayein (bill)')}</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {act?.kind === 'view' && <AppointmentModal a={act.a} money={money} canWork={canWork} onAction={(kind) => setAct({ a: act.a, kind })} onClose={() => setAct(null)} />}
      {act?.kind === 'complete' && <CompleteModal a={act.a} money={money} onClose={() => setAct(null)} onDone={() => done(tr('{{petName}} tayyar — malik ko bulayein', { petName: act.a.petName }))} />}
      {act?.kind === 'pickup' && <PickupCheckout a={act.a} onClose={() => setAct(null)} onDone={(msg) => done(msg)} />}
      {act?.kind === 'advance' && <AdvanceModal a={act.a} money={money} onClose={() => setAct(null)} onDone={(amt) => done(tr('{{amt}} advance khate me jama', { amt: money(amt) }))} />}
      {act?.kind === 'rate' && <RateModal a={act.a} onClose={() => setAct(null)} onDone={() => done(tr('Rating save'))} />}
      {act?.kind === 'cancel' && <ConfirmModal title={tr('Appointment cancel?')} cta={tr('Haan, cancel')} danger busy={cancel.isPending} onConfirm={() => cancel.mutate({ a: act.a })} onClose={() => setAct(null)}
        text={act.a.paidAmount > 0 ? tr('{{paidAmount}} advance customer ke khate me jama rahega — wapas dena ho to Khata se dein.', { paidAmount: money(act.a.paidAmount) }) : tr('Record rehta hai, sirf cancel hota hai.')} />}
      {act?.kind === 'noshow' && <ConfirmModal title={tr('Customer nahi aaye?')} cta={tr('Haan, nahi aaye')} busy={setState.isPending} onConfirm={() => setState.mutate({ a: act.a, to: 'NO_SHOW' })} onClose={() => setAct(null)}
        text={tr('Groomer ka waqt khali ho jayega. Baad me aayein to dobara booking karein.')} />}
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
    title: `Grooming ${full.appointmentNumber}`, subtitle: `${longDate(full.scheduledDate)} ${full.scheduledSlot ?? ''}`, // i18n-ignore
    meta: [['Fee', money(full.totalFee)], ['Mila', money(full.paidAmount)], ['Baqi', money(owed)]],
    sections: [{ kind: 'rows', title: 'Pet', rows: [ // i18n-ignore
      { label: 'Pet', value: `${full.petName} · ${speciesLabel(full.petSpecies)} ${full.petBreed ?? ''}` }, { label: 'Malik', value: `${full.customerName} ${full.customerPhone}` }, // i18n-ignore
      { label: 'Service', value: [SERVICE[full.serviceType], ...full.additionalServices.map((s) => SERVICE[s])].join(', ') }, { label: 'Groomer', value: full.groomerName ?? '—' }, // i18n-ignore
      { label: 'Khayal', value: [full.petTemperament, full.petAllergies, full.petSpecialInstructions].filter(Boolean).join(' · ') || '—' }, // i18n-ignore
    ] }],
  });
  return (
    <Modal open onClose={onClose} size="lg" title={`${full.petName} · ${GROOM_STATUS[full.status].label}`} description={`${full.appointmentNumber} · ${longDate(full.scheduledDate)} ${full.scheduledSlot ?? ''}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={slip} label={tr('Slip')} size="sm" />
        {canWork && booking && <Link to={`/petshop/grooming/${full.id}/edit`} className={actionBtn}>{tr('Badlein')}</Link>}
        {canWork && booking && <Button variant="secondary" size="sm" onClick={() => onAction('noshow')}><UserX className="h-4 w-4" />{tr('Nahi aaye')}</Button>}
        {canWork && booking && <Button variant="secondary" size="sm" onClick={() => onAction('cancel')}><XCircle className="h-4 w-4" />{tr('Cancel')}</Button>}
        {canWork && full.status === 'COMPLETED' && !full.customerRating && <Button variant="secondary" size="sm" onClick={() => onAction('rate')}><Star className="h-4 w-4" />{tr('Rating')}</Button>}
        <span className="flex-1" />
        {canWork && open && owed > 0.009 && full.status !== 'READY_FOR_PICKUP' && <Button variant="secondary" onClick={() => onAction('advance')}><Wallet className="h-4 w-4" />{tr('Advance')}</Button>}
        {canWork && full.status === 'IN_PROGRESS' && <Button onClick={() => onAction('complete')}><CheckCircle2 className="h-4 w-4" />{tr('Tayyar')}</Button>}
        {canWork && full.status === 'READY_FOR_PICKUP' && <Button onClick={() => onAction('pickup')}><Receipt className="h-4 w-4" />{tr('Le jayein (bill)')}</Button>}
      </div>}>
      <div className="space-y-4 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={PawPrint} title={tr('Pet')}>
            <p className="font-semibold text-slate-900">{full.petName} · {speciesLabel(full.petSpecies)}</p>
            <p className="text-slate-600">{[full.petBreed, full.petWeightKg ? `${full.petWeightKg} kg` : null, full.petTemperament].filter(Boolean).join(' · ') || '—'}</p>
            {full.petAllergies && <p className="text-rose-700">{tr('Allergy: {{petAllergies}}', { petAllergies: full.petAllergies })}</p>}
          </Info>
          <Info icon={Phone} title={tr('Malik')}>
            <p className="font-semibold text-slate-900">{full.customerName}</p>
            <a href={`tel:${full.customerPhone}`} className="text-brand-700 hover:underline">{full.customerPhone}</a>
          </Info>
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            <li className="flex justify-between px-4 py-2"><span>{SERVICE[full.serviceType]}</span><span className="tabular-nums">{money(full.serviceFee)}</span></li>
            {full.additionalCharges > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>{tr('Extra ({{value}})', { value: full.additionalServices.map((s) => SERVICE[s]).join(', ') || 'service' })}</span><span className="tabular-nums">{money(full.additionalCharges)}</span></li>}
            {full.discount > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>{tr('Discount')}</span><span className="tabular-nums">−{money(full.discount)}</span></li>}
            <li className="flex justify-between bg-slate-50 px-4 py-2 font-semibold"><span>{tr('Total · mila {{paidAmount}}', { paidAmount: money(full.paidAmount) })}</span><span className="tabular-nums">{money(full.totalFee)}</span></li>
          </ul>
        </div>
        {full.groomerNotes && <p className="whitespace-pre-line text-slate-600">{full.groomerNotes}</p>}
        {full.customerRating && <p className="text-amber-700">{'★'.repeat(full.customerRating)}{full.customerFeedback ? ` — ${full.customerFeedback}` : ''}</p>}
        {(full.previousVisits?.length ?? 0) > 0 && (
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">{tr('Pichli visits')}</p>
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
  const error = ex < 0 || dis < 0 ? tr('Amount sahi likhein') : total < a.paidAmount - 0.01 ? tr('{{paidAmount}} pehle mil chuke — total us se kam nahi', { paidAmount: money(a.paidAmount) }) : '';
  const save = useMutation({
    mutationFn: () => groomingApi.complete(a.id, { additionalCharges: ex, discount: dis, groomerNotes: notes.trim() || undefined }),
    onSuccess: onDone,
    onError: (e) => toast.error(errorText(e, tr('Save nahi hua'))),
  });
  const submit = () => { if (error) { toast.error(error); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="sm" title={tr('{{petName}} tayyar', { petName: a.petName })} description={tr('Extra service ya discount ho to likhein')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={submit}>{tr('Tayyar hai')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={tr('Extra (Rs)')} inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} hint={tr('Pissu, nakhun waghera')} />
          <Input label={tr('Discount (Rs)')} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} error={error || undefined} />
        </div>
        <Textarea label={tr('Groomer ka note (marzi)')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Kaan me infection — doctor ko dikhayein')} />
        <p className="text-[0.875rem] font-semibold text-slate-900">{tr('Total {{total}} · baqi {{value}}', { total: money(total), value: money(Math.max(total - a.paidAmount, 0)) })}</p>
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
      onDone(tr('Bill {{value}} ban gaya{{value2}}', { value: r.sale?.saleNumber ?? '', value2: change > 0.009 ? tr(' — Rs {{change}} wapas dein', { change }) : '' }));
    },
    onError: (e) => toast.error(errorText(e, tr('Bill nahi bana'))),
  });
  if (owed <= 0.009) {
    return <ConfirmModal title={tr('{{petName}} le jayein?', { petName: a.petName })} cta={tr('Haan, bill banayein')} busy={pickup.isPending} onClose={onClose}
      onConfirm={() => pickup.mutate({ paymentMethod: 'CASH', paidAmount: 0, isCredit: false, depositExtra: false })}
      text={tr('Poora paisa pehle mil chuka hai (khate me). Bill banega aur advance us me se kat jayega.')} />;
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
    onError: (e) => toast.error(errorText(e, tr('Advance save nahi hua'))),
  });
  return <MoneyModal title={tr('Advance lein')} description={tr('{{petName}} — baqi {{owed}}', { petName: a.petName, owed: money(owed) })} due={owed} max={owed} busy={pay.isPending} cta={tr('Advance lein')}
    hint={tr('Customer ke khate me jama; pickup ke bill par kat jata hai')} onSubmit={(v) => pay.mutate(v)} onClose={onClose} />;
}

function RateModal({ a, onClose, onDone }: { a: PetGroomingAppointment; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const save = useMutation({
    mutationFn: () => groomingApi.rate(a.id, { rating, feedback: feedback.trim() || undefined }),
    onSuccess: onDone,
    onError: (e) => toast.error(errorText(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Customer ki rating')} description={a.petName}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} aria-label={tr('{{n}} star', { n })} className={cn('text-2xl', n <= rating ? 'text-amber-500' : 'text-slate-300')}>★</button>)}</div>
        <Textarea label={tr('Kya kaha (marzi)')} rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
    </Modal>
  );
}
