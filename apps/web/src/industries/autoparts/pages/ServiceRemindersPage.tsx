/**
 * Service reminders: oil changes and services that are due (by date or
 * meter), and insurance, token tax and fitness renewals. Each reminder
 * goes to the vehicle owner on WhatsApp in one click; done ones are
 * marked, others put off to a later date. Reminders come from delivered
 * jobs ("next service") and from vehicle paper dates.
 *
 * Keys: N new reminder · / search · 1-5 views · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Bell, CalendarClock, Car, CheckCircle2, Clock, GraduationCap, ListChecks, MessageCircle, Plus, Search, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { serviceRemindersApi, type ReminderRow, type ReminderView } from '../api/service-reminders.api';
import { reminderMessage } from '../components/slips';
import { REMINDER_KEY, REMINDER_TYPES, VEHICLE_KEY, apiError, dateInput, dayOnly, daysTo, digits, km, reminderTypeOf, vehicleName, waLink } from '../components/meta';

const VIEWS: Array<{ id: ReminderView; label: string; icon: typeof Bell }> = [
  { id: 'due', label: 'Abhi karne wale', icon: AlarmClock },
  { id: 'overdue', label: 'Guzar gaye', icon: Clock },
  { id: 'upcoming', label: 'Agle 30 din', icon: CalendarClock },
  { id: 'done', label: 'Ho gaye', icon: CheckCircle2 },
  { id: 'all', label: 'Sab', icon: ListChecks },
];

export default function ServiceRemindersPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ReminderView>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [snoozeOf, setSnoozeOf] = useState<ReminderRow | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  const q = { view, search: query || undefined, page, limit: 40 };
  const listQ = useQuery({ queryKey: [REMINDER_KEY, 'page', q], queryFn: () => serviceRemindersApi.page(q), placeholderData: (p) => p });
  const statsQ = useQuery({ queryKey: [REMINDER_KEY, 'stats'], queryFn: () => serviceRemindersApi.stats() });
  const s = statsQ.data;
  const data = listQ.data;
  const refresh = () => [REMINDER_KEY, 'service-reminders-dash', 'service-reminders-overdue', VEHICLE_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => serviceRemindersApi.updateStatus(v.id, v.status),
    onSuccess: (_r, v) => { toast.success(v.status === 'DONE' ? 'Ho gaya' : v.status === 'SENT' ? 'Bhej diya — likh liya' : 'Badal diya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const snooze = useMutation({
    mutationFn: (v: { id: string; until: string }) => serviceRemindersApi.snooze(v.id, v.until),
    onSuccess: () => { toast.success('Aage kar diya'); setSnoozeOf(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const i = Number(e.key) - 1;
      if (i >= 0 && i < VIEWS.length) setView(VIEWS[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const send = (r: ReminderRow) => {
    const link = waLink(r.vehicle?.ownerPhone, reminderMessage(r, shopName));
    if (!link) { toast.error('Is gaari ke malik ka phone nahi likha'); return; }
    window.open(link, '_blank', 'noopener');
    if (r.status === 'PENDING' && canEdit) setStatus.mutate({ id: r.id, status: 'SENT' });
  };

  return (
    <PageShell>
      <PageHero
        title="Service reminders"
        chip={<><Bell /> Customer wapas laayein</>}
        meta="Oil change, service aur kaghzat — waqt par WhatsApp, customer dobara aata hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <Link to="/autoparts/vehicles?view=papers" className={heroButton}><Car className="h-4 w-4" /><span className="hidden sm:inline">Gaariyan</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setAdding(true)} title="Naya reminder (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Reminder</button>}
        </>}
        stats={s ? [
          { label: 'Guzar gaye', value: s.overdue },
          { label: 'Is hafte', value: s.week },
          { label: '30 din me ho gaye', value: s.done },
        ] : [{ label: 'Guzar gaye', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color={s.overdue ? '#e11d48' : '#64748b'} label="Guzar gaye" value={s.overdue} hint="Aaj hi call karein" onClick={() => setView('overdue')} active={view === 'overdue'} />
          <KpiCard icon={AlarmClock} color="#ea580c" label="Is hafte" value={s.week} onClick={() => setView('due')} active={view === 'due'} />
          <KpiCard icon={CalendarClock} color="#2563eb" label="Agle 30 din" value={s.month} onClick={() => setView('upcoming')} active={view === 'upcoming'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Ho gaye (30 din)" value={s.done} onClick={() => setView('done')} active={view === 'done'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Gaari number, malik, phone…" label="Search" />} />

      <ViewTabs value={view} onChange={setView} hint={<>{canEdit && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>5</Kbd> list</>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: v.id === view ? data?.total ?? null : null }))} />

      {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : !data?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{query ? 'Koi reminder nahi mila' : view === 'overdue' ? 'Koi reminder nahi guzra — shabash' : 'Is list me koi reminder nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Gaari dete waqt "agli service" likhein — reminder khud ban jata hai.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {data.items.map((r) => {
              const left = daysTo(r.dueDate);
              const over = left !== null && left < 0 && r.status !== 'DONE';
              const done = r.status === 'DONE' || r.status === 'ACKNOWLEDGED';
              const v = r.vehicle;
              const kmLeft = r.dueOdometerKm && v?.odometerKm ? r.dueOdometerKm - v.odometerKm : null;
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
                  <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', done ? 'bg-emerald-50 text-emerald-600' : over ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}>
                    {r.reminderType === 'OIL_CHANGE' || r.reminderType === 'GENERAL' ? <Wrench className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{r.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{reminderTypeOf(r.reminderType)}</span>
                      {r.status === 'SENT' && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700">Bheja {dayOnly(r.sentAt)}</span>}
                      {r.status === 'SNOOZED' && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700">Aage kiya</span>}
                    </p>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">
                      {v ? <><strong className="font-semibold text-slate-800">{v.registrationNumber}</strong> {vehicleName(v)} · {[v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') || 'Malik nahi likha'}</> : 'Gaari nahi mili'}
                    </p>
                    <p className={cn('mt-0.5 text-[0.75rem]', over ? 'font-semibold text-rose-700' : 'text-slate-500')}>
                      {done ? `Ho gaya ${dayOnly(r.doneAt)}` : [
                        r.dueDate ? (left! < 0 ? `${-left!} din guzar gaye (${dayOnly(r.dueDate)})` : left === 0 ? 'Aaj' : `${left} din me (${dayOnly(r.dueDate)})`) : null,
                        r.dueOdometerKm ? `${km(r.dueOdometerKm)} par${kmLeft !== null ? (kmLeft <= 0 ? ' — meter guzar gaya' : ` — ${km(kmLeft)} baqi`) : ''}` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {!done && (
                    <div className="flex w-full shrink-0 flex-wrap justify-end gap-1.5 sm:w-auto">
                      <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5 text-emerald-600" />} onClick={() => send(r)}>WhatsApp</Button>
                      {canEdit && <>
                        <Button size="sm" variant="ghost" onClick={() => setSnoozeOf(r)}>Aage karein</Button>
                        <Button size="sm" variant="ghost" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: r.id, status: 'DONE' })}>Ho gaya</Button>
                      </>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {snoozeOf && <SnoozeModal r={snoozeOf} pending={snooze.isPending} onSave={(until) => snooze.mutate({ id: snoozeOf.id, until })} onClose={() => setSnoozeOf(null)} />}
      {adding && <AddReminderModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}

      {guide.isOpen && (
        <PageGuide title="Reminders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Wrench, color: '#2563eb', title: 'Khud bante hain', text: 'Job par "Gaari dein" ke waqt agli service ka km ya date likhein — reminder ban jata hai. Gaari ke kaghzat se bhi banta hai.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp', text: 'Button dabayein — malik ko message khud likha jata hai aur reminder "Bheja" ho jata hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Ho gaya / aage', text: 'Customer aa gaya to "Ho gaya". Abhi nahi aana to "Aage karein" se nayi date.' },
          ]}
          tips={['Har subah "Guzar gaye" aur "Is hafte" dekhein — 5 minute me 10 customer wapas aate hain.']}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1-5', 'list'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function SnoozeModal({ r, pending, onSave, onClose }: { r: ReminderRow; pending: boolean; onSave: (until: string) => void; onClose: () => void }) {
  const [date, setDate] = useState(dateInput(new Date(Date.now() + 7 * 86_400_000)));
  const ok = !!date && new Date(`${date}T23:59`).getTime() > Date.now();
  return (
    <Modal open onClose={onClose} size="sm" title="Aage karein" description={`${r.title} — ${r.vehicle?.registrationNumber ?? ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={pending} onClick={() => onSave(new Date(`${date}T09:00`).toISOString())}>Save</Button></>}>
      <div className="space-y-3">
        <Input label="Nayi date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={date && !ok ? 'Aage ki date chunein' : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {[[3, '3 din'], [7, '1 hafta'], [15, '15 din'], [30, '1 mahina']].map(([d, label]) => (
            <button key={d} type="button" onClick={() => setDate(dateInput(new Date(Date.now() + Number(d) * 86_400_000)))} className="h-8 rounded-lg bg-slate-100 px-3 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200">{label}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function AddReminderModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [reg, setReg] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('OIL_CHANGE');
  const [title, setTitle] = useState('Oil change');
  const [date, setDate] = useState(dateInput(new Date(Date.now() + 90 * 86_400_000)));
  const [dueKm, setDueKm] = useState('');
  const look = useQuery({ queryKey: [VEHICLE_KEY, 'lookup', reg.trim()], queryFn: () => customerVehiclesApi.page({ search: reg.trim(), limit: 6 }), enabled: reg.trim().length >= 2 && !vehicleId });
  const create = useMutation({
    mutationFn: () => serviceRemindersApi.create({
      vehicleId, reminderType: type, title: title.trim() || reminderTypeOf(type),
      dueDate: date ? new Date(`${date}T09:00`).toISOString() : undefined, dueOdometerKm: dueKm ? Number(dueKm) : undefined,
    }),
    onSuccess: () => { toast.success('Reminder ban gaya'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Reminder nahi bana')),
  });
  const ok = !!vehicleId && (!!date || !!dueKm);
  return (
    <Modal open onClose={onClose} size="md" title="Naya reminder"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={create.isPending} onClick={() => create.mutate()}>Banayein</Button></>}>
      <div className="space-y-3">
        <div className="relative">
          <Input label="Gaari" required value={reg} onChange={(e) => { setReg(e.target.value.toUpperCase()); setVehicleId(''); }} autoFocus leftIcon={<Search className="h-4 w-4" />}
            placeholder="Gaari ka number" hint={vehicleId ? 'Gaari chun li' : 'Number likh kar list se chunein'} />
          {!vehicleId && (look.data?.items.length ?? 0) > 0 && (
            <ul className="absolute inset-x-0 top-[4.75rem] z-20 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {look.data!.items.map((v) => (
                <li key={v.id}><button type="button" onClick={() => { setVehicleId(v.id); setReg(v.registrationNumber); }} className="w-full px-3 py-2 text-left text-[0.875rem] hover:bg-brand-50">
                  <strong>{v.registrationNumber}</strong> <span className="text-slate-600">{vehicleName(v)} · {v.ownerName ?? ''}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Kis cheez ka" value={type} onChange={(e) => { setType(e.target.value); setTitle(reminderTypeOf(e.target.value)); }} options={REMINDER_TYPES} />
          <Input label="Likhna" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Ya meter (km)" inputMode="numeric" value={dueKm} onChange={(e) => setDueKm(digits(e.target.value))} placeholder="Marzi hai" />
        </div>
        {!ok && vehicleId && <p className="text-[0.8125rem] text-rose-600">Date ya km me se ek likhein</p>}
      </div>
    </Modal>
  );
}
