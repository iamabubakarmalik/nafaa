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
import { t as tr } from '@core/i18n';

const VIEWS: Array<{ id: ReminderView; label: string; icon: typeof Bell }> = [
  { id: 'due', label: tr('Abhi karne wale'), icon: AlarmClock },
  { id: 'overdue', label: tr('Guzar gaye'), icon: Clock },
  { id: 'upcoming', label: tr('Agle 30 din'), icon: CalendarClock },
  { id: 'done', label: tr('Ho gaye'), icon: CheckCircle2 },
  { id: 'all', label: tr('Sab'), icon: ListChecks },
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
    onSuccess: (_r, v) => { toast.success(v.status === 'DONE' ? tr('Ho gaya') : v.status === 'SENT' ? tr('Bhej diya — likh liya') : tr('Badal diya')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const snooze = useMutation({
    mutationFn: (v: { id: string; until: string }) => serviceRemindersApi.snooze(v.id, v.until),
    onSuccess: () => { toast.success(tr('Aage kar diya')); setSnoozeOf(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
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
    if (!link) { toast.error(tr('Is gaari ke malik ka phone nahi likha')); return; }
    window.open(link, '_blank', 'noopener');
    if (r.status === 'PENDING' && canEdit) setStatus.mutate({ id: r.id, status: 'SENT' });
  };

  return (
    <PageShell>
      <PageHero
        title={tr('Service reminders')}
        chip={<><Bell /> {' '}{tr('Customer wapas laayein')}</>}
        meta={tr('Oil change, service aur kaghzat — waqt par WhatsApp, customer dobara aata hai')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <Link to="/autoparts/vehicles?view=papers" className={heroButton}><Car className="h-4 w-4" /><span className="hidden sm:inline">{tr('Gaariyan')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setAdding(true)} title={tr('Naya reminder (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Reminder')}</button>}
        </>}
        stats={s ? [
          { label: tr('Guzar gaye'), value: s.overdue },
          { label: tr('Is hafte'), value: s.week },
          { label: tr('30 din me ho gaye'), value: s.done },
        ] : [{ label: tr('Guzar gaye'), value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color={s.overdue ? '#e11d48' : '#64748b'} label={tr('Guzar gaye')} value={s.overdue} hint={tr('Aaj hi call karein')} onClick={() => setView('overdue')} active={view === 'overdue'} />
          <KpiCard icon={AlarmClock} color="#ea580c" label={tr('Is hafte')} value={s.week} onClick={() => setView('due')} active={view === 'due'} />
          <KpiCard icon={CalendarClock} color="#2563eb" label={tr('Agle 30 din')} value={s.month} onClick={() => setView('upcoming')} active={view === 'upcoming'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Ho gaye (30 din)')} value={s.done} onClick={() => setView('done')} active={view === 'done'} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Gaari number, malik, phone…')} label={tr('Search')} />} />

      <ViewTabs value={view} onChange={setView} hint={<>{canEdit && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>5</Kbd> {' '}{tr('list')}</>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: v.id === view ? data?.total ?? null : null }))} />

      {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : !data?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{query ? tr('Koi reminder nahi mila') : view === 'overdue' ? tr('Koi reminder nahi guzra — shabash') : tr('Is list me koi reminder nahi')}</p>
            <p className="mt-1 text-sm text-slate-500">{tr('Gaari dete waqt "agli service" likhein — reminder khud ban jata hai.')}</p>
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
                      {r.status === 'SENT' && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700">{tr('Bheja {{sentAt}}', { sentAt: dayOnly(r.sentAt) })}</span>}
                      {r.status === 'SNOOZED' && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700">{tr('Aage kiya')}</span>}
                    </p>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">
                      {v ? <><strong className="font-semibold text-slate-800">{v.registrationNumber}</strong> {vehicleName(v)} · {[v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') || tr('Malik nahi likha')}</> : tr('Gaari nahi mili')}
                    </p>
                    <p className={cn('mt-0.5 text-[0.75rem]', over ? 'font-semibold text-rose-700' : 'text-slate-500')}>
                      {done ? tr('Ho gaya {{doneAt}}', { doneAt: dayOnly(r.doneAt) }) : [
                        r.dueDate ? (left! < 0 ? tr('{{value}} din guzar gaye ({{dueDate}})', { value: -left!, dueDate: dayOnly(r.dueDate) }) : left === 0 ? tr('Aaj') : tr('{{left}} din me ({{dueDate}})', { left, dueDate: dayOnly(r.dueDate) })) : null,
                        r.dueOdometerKm ? tr('{{dueOdometerKm}} par{{value}}', { dueOdometerKm: km(r.dueOdometerKm), value: kmLeft !== null ? kmLeft <= 0 ? tr(' — meter guzar gaya') : tr(' — {{kmLeft}} baqi', { kmLeft: km(kmLeft) }) : '' }) : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {!done && (
                    <div className="flex w-full shrink-0 flex-wrap justify-end gap-1.5 sm:w-auto">
                      <Button size="sm" variant="secondary" leftIcon={<MessageCircle className="h-3.5 w-3.5 text-emerald-600" />} onClick={() => send(r)}>{tr('WhatsApp')}</Button>
                      {canEdit && <>
                        <Button size="sm" variant="ghost" onClick={() => setSnoozeOf(r)}>{tr('Aage karein')}</Button>
                        <Button size="sm" variant="ghost" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setStatus.mutate({ id: r.id, status: 'DONE' })}>{tr('Ho gaya')}</Button>
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
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{totalPages}}', { page, totalPages: data.totalPages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}

      {snoozeOf && <SnoozeModal r={snoozeOf} pending={snooze.isPending} onSave={(until) => snooze.mutate({ id: snoozeOf.id, until })} onClose={() => setSnoozeOf(null)} />}
      {adding && <AddReminderModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />}

      {guide.isOpen && (
        <PageGuide title={tr('Reminders — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Wrench, color: '#2563eb', title: tr('Khud bante hain'), text: tr('Job par "Gaari dein" ke waqt agli service ka km ya date likhein — reminder ban jata hai. Gaari ke kaghzat se bhi banta hai.') },
            { icon: MessageCircle, color: '#22c55e', title: tr('WhatsApp'), text: tr('Button dabayein — malik ko message khud likha jata hai aur reminder "Bheja" ho jata hai.') },
            { icon: CheckCircle2, color: '#16a34a', title: tr('Ho gaya / aage'), text: tr('Customer aa gaya to "Ho gaya". Abhi nahi aana to "Aage karein" se nayi date.') },
          ]}
          tips={[tr('Har subah "Guzar gaye" aur "Is hafte" dekhein — 5 minute me 10 customer wapas aate hain.')]}
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
    <Modal open onClose={onClose} size="sm" title={tr('Aage karein')} description={`${r.title} — ${r.vehicle?.registrationNumber ?? ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button disabled={!ok} loading={pending} onClick={() => onSave(new Date(`${date}T09:00`).toISOString())}>{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <Input label={tr('Nayi date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} error={date && !ok ? tr('Aage ki date chunein') : undefined} />
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
    onSuccess: () => { toast.success(tr('Reminder ban gaya')); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Reminder nahi bana'))),
  });
  const ok = !!vehicleId && (!!date || !!dueKm);
  return (
    <Modal open onClose={onClose} size="md" title={tr('Naya reminder')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button disabled={!ok} loading={create.isPending} onClick={() => create.mutate()}>{tr('Banayein')}</Button></>}>
      <div className="space-y-3">
        <div className="relative">
          <Input label={tr('Gaari')} required value={reg} onChange={(e) => { setReg(e.target.value.toUpperCase()); setVehicleId(''); }} autoFocus leftIcon={<Search className="h-4 w-4" />}
            placeholder={tr('Gaari ka number')} hint={vehicleId ? tr('Gaari chun li') : tr('Number likh kar list se chunein')} />
          {!vehicleId && (look.data?.items.length ?? 0) > 0 && (
            <ul className="absolute inset-x-0 top-[4.75rem] z-20 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {look.data!.items.map((v) => (
                <li key={v.id}><button type="button" onClick={() => { setVehicleId(v.id); setReg(v.registrationNumber); }} className="w-full px-3 py-2 text-start text-[0.875rem] hover:bg-brand-50">
                  <strong>{v.registrationNumber}</strong> <span className="text-slate-600">{vehicleName(v)} · {v.ownerName ?? ''}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={tr('Kis cheez ka')} value={type} onChange={(e) => { setType(e.target.value); setTitle(reminderTypeOf(e.target.value)); }} options={REMINDER_TYPES} />
          <Input label={tr('Likhna')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label={tr('Date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label={tr('Ya meter (km)')} inputMode="numeric" value={dueKm} onChange={(e) => setDueKm(digits(e.target.value))} placeholder={tr('Marzi hai')} />
        </div>
        {!ok && vehicleId && <p className="text-[0.8125rem] text-rose-600">{tr('Date ya km me se ek likhein')}</p>}
      </div>
    </Modal>
  );
}
