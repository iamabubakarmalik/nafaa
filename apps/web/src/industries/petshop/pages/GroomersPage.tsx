/**
 * Groomers: who bathes and trims the pets, on which days and hours (the
 * booking form offers their open slots), their rate and commission, and
 * this month's visits. A groomer who leaves is switched off, never
 * deleted, so old visits keep the name.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, CheckCircle2, Clock, GraduationCap, Pencil, Phone, Plus, Power, Scissors, Star, Users, Wallet } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Switch, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { groomersApi, type GroomerInput, type PetGroomer } from '../api/groomers.api';
import type { PetGroomingServiceType } from '../api/grooming.api';
import type { PetSpeciesType } from '../api/products.api';
import { ConfirmModal, Empty, Info, ListCard, ListLoading, Pill, actionBtn, primaryBtn } from '../components/ui';
import { usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { PET_KEYS, SERVICE, SPECIES, dayKey, errorText, numIn, phoneOk, shortDate } from '../lib/meta';

type Tab = 'active' | 'off' | 'all';
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export default function GroomersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [today, setToday] = useState('');
  const [form, setForm] = useState<PetGroomer | 'new' | null>(null);
  const [open, setOpen] = useState<PetGroomer | null>(null);
  const [off, setOff] = useState<PetGroomer | null>(null);

  const q = useQuery({ queryKey: [PET_KEYS.groomers, 'all'], queryFn: () => groomersApi.list() });
  const all = q.data ?? [];
  const weekday = new Date().getDay();
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return all.filter((g) => (tab === 'all' || (tab === 'active' ? g.isActive : !g.isActive))
      && (!today || (g.isActive && g.workingDays.includes(weekday)))
      && (!t || [g.name, g.phone, g.employeeCode].join(' ').toLowerCase().includes(t)));
  }, [all, tab, search, today, weekday]);
  const active = all.filter((g) => g.isActive);
  const rated = active.filter((g) => g.avgRating);
  usePageKeys(searchRef, { n: () => canManage && setForm('new') });

  const refresh = () => qc.invalidateQueries({ queryKey: [PET_KEYS.groomers] });
  const deactivate = useMutation({
    mutationFn: (g: PetGroomer) => groomersApi.deactivate(g.id),
    onSuccess: () => { refresh(); setOff(null); toast.success('Groomer band — purani visits me naam rahega'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const activate = useMutation({
    mutationFn: (g: PetGroomer) => groomersApi.update(g.id, { isActive: true }),
    onSuccess: () => { refresh(); toast.success('Groomer dobara chalu'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Groomers" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#0284c7', title: 'Naya groomer', text: 'Naam, phone, kaam ke din aur waqt likhein — booking me usi ka khali waqt aata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Commission', text: 'Commission % likhein; har groomer ka is mahine ka kaam aur commission uske card me dikhta hai.' },
            { icon: Power, color: '#e11d48', title: 'Band karna', text: 'Groomer chala jaye to "Band" karein — record nahi mit-ta, purani visits me naam rehta hai.' },
          ]}
          shortcuts={[['N', 'naya groomer'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Groomers" loading={q.isLoading} meta="Kaun, kab, kitna kaam"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya groomer</button>}
        </>}
        stats={[
          { label: 'Chalu', value: String(active.length) },
          { label: 'Aaj kaam par', value: String(active.filter((g) => g.workingDays.includes(weekday)).length) },
        ]} />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          <KpiCard icon={Users} color="#0284c7" label="Chalu groomers" value={active.length} active={tab === 'active' && !today} onClick={() => { setTab('active'); setToday(''); }} />
          <KpiCard icon={CalendarDays} color="#16a34a" label="Aaj kaam par" value={active.filter((g) => g.workingDays.includes(weekday)).length} active={!!today} onClick={() => setToday(today ? '' : 'yes')} />
          <KpiCard icon={CheckCircle2} color="#7c3aed" label="Kul visits" value={active.reduce((t, g) => t + g.completedAppointments, 0)} />
          <KpiCard icon={Star} color="#d97706" label="Aam rating" value={rated.length ? (rated.reduce((t, g) => t + (g.avgRating ?? 0), 0) / rated.length).toFixed(1) : '—'} />
        </>)}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone ya code…" />}
        chips={search.trim() || today ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {today && <FilterChip onRemove={() => setToday('')}>Aaj kaam par</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setToday(''); }}>
        <FilterMenu icon={CalendarDays} label={today ? 'Aaj kaam par' : 'Din'} value={today} active={!!today} options={[{ value: '', label: 'Sab din' }, { value: 'yes', label: 'Aaj kaam par' }]} onChange={setToday} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={[
        { id: 'active', label: 'Chalu', icon: Users, count: active.length },
        { id: 'off', label: 'Band', icon: Power, count: all.length - active.length },
        { id: 'all', label: 'Sab', icon: Scissors },
      ]} />

      <ListCard>
        {q.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Scissors} title={all.length ? 'Is filter me koi nahi' : 'Abhi koi groomer nahi'} text="Groomer jorein — booking me usi ke khali waqt aate hain."
            action={canManage ? <button type="button" onClick={() => setForm('new')} className={primaryBtn}><Plus className="h-4 w-4" />Naya groomer</button> : undefined} />
        ) : (
          <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {rows.map((g) => (
              <li key={g.id} className={cn('rounded-2xl p-4 ring-1 ring-slate-200', !g.isActive && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setOpen(g)} className="min-w-0 text-left">
                    <p className="truncate font-semibold text-slate-900 hover:underline">{g.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{g.employeeCode} · {g.phone}</p>
                  </button>
                  <Pill tone={g.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>{g.isActive ? 'Chalu' : 'Band'}</Pill>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[0.75rem] text-slate-600"><Clock className="h-3.5 w-3.5" />{g.workStartTime}–{g.workEndTime} · {g.workingDays.map((d) => DAYS[d]?.slice(0, 3)).join(', ') || 'Din nahi'}</p>
                <div className="mt-2 flex flex-wrap gap-1">{g.specializations.slice(0, 4).map((s) => <span key={s} className="rounded bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-amber-800">{SPECIES[s as keyof typeof SPECIES]?.emoji} {SPECIES[s as keyof typeof SPECIES]?.label ?? s}</span>)}</div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[0.8125rem]">
                  <span className="text-slate-600">{g.completedAppointments} visits{g.avgRating ? ` · ★ ${g.avgRating}` : ''}</span>
                  {canManage && (
                    <span className="flex gap-1.5">
                      <button type="button" onClick={() => setForm(g)} className={actionBtn} aria-label="Badlein"><Pencil className="h-4 w-4" /></button>
                      {g.isActive
                        ? <button type="button" onClick={() => setOff(g)} className={actionBtn} aria-label="Band karein"><Power className="h-4 w-4" /></button>
                        : <button type="button" disabled={activate.isPending} onClick={() => activate.mutate(g)} className={actionBtn}>Chalu</button>}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      {open && <GroomerModal g={open} onClose={() => setOpen(null)} />}
      {off && <ConfirmModal title={`${off.name} band karein?`} cta="Haan, band" danger busy={deactivate.isPending} onConfirm={() => deactivate.mutate(off)} onClose={() => setOff(null)}
        text="Nayi booking me nahi aayega. Purani visits aur hisaab me naam rahega; baad me dobara chalu kar sakte hain." />}
      {form && <GroomerForm groomer={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { refresh(); setForm(null); }} />}
    </PageShell>
  );
}

function GroomerModal({ g, onClose }: { g: PetGroomer; onClose: () => void }) {
  const canCommission = usePermission(PERMISSIONS.COMMISSION_VIEW);
  const { sales: money } = useMasked();
  const monthStart = `${dayKey().slice(0, 8)}01`;
  const detailQ = useQuery({ queryKey: [PET_KEYS.groomers, 'one', g.id], queryFn: () => groomersApi.getOne(g.id) });
  const loadQ = useQuery({ queryKey: [PET_KEYS.groomers, 'workload', g.id, monthStart], queryFn: () => groomersApi.workload(g.id, monthStart, dayKey()), enabled: canCommission });
  const d = detailQ.data ?? g;
  const t = loadQ.data?.totals;
  return (
    <Modal open onClose={onClose} size="lg" title={g.name} description={`${g.employeeCode} · ${g.phone}`}>
      <div className="space-y-4 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={Clock} title="Kaam ka waqt">
            <p className="text-slate-800">{g.workStartTime}–{g.workEndTime}</p>
            <p className="text-slate-600">{g.workingDays.map((x) => DAYS[x]).join(', ') || '—'}</p>
          </Info>
          <Info icon={Scissors} title="Kya karta hai">
            <p className="text-slate-700">{g.serviceTypes.map((s) => SERVICE[s]).join(', ') || 'Sab'}</p>
            <p className="text-slate-500">{g.experienceYears ? `${g.experienceYears} saal tajurba` : ''}</p>
          </Info>
        </div>
        {canCommission && (
          <div className="grid grid-cols-3 gap-2">
            {[['Is mahine visits', t ? `${t.completed} / ${t.total}` : '…'], ['Kaam ki value', t ? money(t.revenue) : '…'], [`Commission (${g.commissionPct}%)`, t ? money(t.commission) : '…']].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70"><p className="text-[0.75rem] text-slate-500">{l}</p><p className="text-lg font-bold tabular-nums text-slate-900">{v}</p></div>
            ))}
          </div>
        )}
        <div>
          <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Aaj</p>
          {(d.todayAppointments ?? []).length === 0 ? <p className="text-slate-500">Aaj koi booking nahi</p> : (
            <ul className="space-y-1">{(d.todayAppointments ?? []).map((a) => <li key={a.id} className="flex justify-between gap-2"><span>{a.scheduledSlot ?? '—'} · {a.petName} · {SERVICE[a.serviceType]}</span><span className="text-slate-500">{a.status}</span></li>)}</ul>
          )}
        </div>
        {(d.upcoming ?? []).length > 0 && (
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Aage</p>
            <ul className="space-y-1 text-slate-600">{(d.upcoming ?? []).slice(0, 8).map((a) => <li key={a.id}>{shortDate(a.scheduledDate)} {a.scheduledSlot ?? ''} · {a.petName}</li>)}</ul>
          </div>
        )}
        <a href={`tel:${g.phone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="h-4 w-4" />{g.phone}</a>
      </div>
    </Modal>
  );
}

function GroomerForm({ groomer, onClose, onSaved }: { groomer: PetGroomer | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState({
    employeeCode: groomer?.employeeCode ?? '', name: groomer?.name ?? '', phone: groomer?.phone ?? '', cnic: groomer?.cnic ?? '',
    specializations: groomer?.specializations ?? (['DOG', 'CAT'] as PetSpeciesType[]), serviceTypes: groomer?.serviceTypes ?? ([] as PetGroomingServiceType[]),
    workingDays: groomer?.workingDays ?? [1, 2, 3, 4, 5, 6], workStartTime: groomer?.workStartTime ?? '10:00', workEndTime: groomer?.workEndTime ?? '19:00',
    experienceYears: groomer?.experienceYears != null ? String(groomer.experienceYears) : '', perServiceRate: groomer?.perServiceRate != null ? String(groomer.perServiceRate) : '',
    commissionPct: groomer ? String(groomer.commissionPct) : '0', isActive: groomer?.isActive ?? true,
  });
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const pct = numIn(d.commissionPct) ?? 0;
  const errors: string[] = [];
  if (!d.employeeCode.trim()) errors.push('Code likhein');
  if (!d.name.trim()) errors.push('Naam likhein');
  if (!phoneOk(d.phone)) errors.push('Phone 10 se 15 hindse');
  if (!d.workingDays.length) errors.push('Kam se kam ek din chunein');
  if (d.workStartTime >= d.workEndTime) errors.push('Chhutti ka waqt shuru se baad ho');
  if (pct < 0 || pct > 100) errors.push('Commission 0 se 100%');

  const save = useMutation({
    mutationFn: () => {
      const body: GroomerInput = {
        employeeCode: d.employeeCode.trim(), name: d.name.trim(), phone: d.phone.trim(), cnic: d.cnic.trim() || undefined,
        specializations: d.specializations, serviceTypes: d.serviceTypes, workingDays: [...d.workingDays].sort(), workStartTime: d.workStartTime, workEndTime: d.workEndTime,
        experienceYears: d.experienceYears ? Math.round(numIn(d.experienceYears) ?? 0) : undefined, perServiceRate: d.perServiceRate ? numIn(d.perServiceRate) ?? undefined : undefined,
        commissionPct: pct, isActive: d.isActive,
      };
      return groomer ? groomersApi.update(groomer.id, body) : groomersApi.create(body);
    },
    onSuccess: () => { toast.success(groomer ? 'Save ho gaya' : 'Groomer jor diya'); onSaved(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { setTouched(true); if (errors.length) { toast.error(errors[0]); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  const chip = (on: boolean) => cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:bg-slate-50');

  return (
    <Modal open onClose={onClose} size="lg" title={groomer ? `${groomer.name} badlein` : 'Naya groomer'} description="Ctrl+S se save"
      footer={<>{touched && errors[0] && <p className="mr-auto text-[0.8125rem] text-amber-800">{errors[0]}</p>}<Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}>{groomer ? 'Save karein' : 'Jorein'}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Code" required value={d.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} placeholder="G-01" hint="Har groomer ka alag" />
          <Input label="Naam" required value={d.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Phone" required inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam ke din</span>
          <div className="flex flex-wrap gap-1">{DAYS.map((name, i) => <button key={name} type="button" onClick={() => set('workingDays', toggle(d.workingDays, i))} className={chip(d.workingDays.includes(i))}>{name}</button>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Shuru" type="time" value={d.workStartTime} onChange={(e) => set('workStartTime', e.target.value)} />
          <Input label="Chhutti" type="time" value={d.workEndTime} onChange={(e) => set('workEndTime', e.target.value)} />
          <Input label="Rate (Rs)" inputMode="decimal" value={d.perServiceRate} onChange={(e) => set('perServiceRate', e.target.value)} hint="Booking me yaad dilata hai" />
          <Input label="Commission %" inputMode="decimal" value={d.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kin janwaron ka kaam</span>
          <div className="flex flex-wrap gap-1">{(['DOG', 'CAT', 'RABBIT', 'BIRD', 'OTHER'] as const).map((s) => <button key={s} type="button" onClick={() => set('specializations', toggle(d.specializations, s))} className={chip(d.specializations.includes(s))}>{SPECIES[s].emoji} {SPECIES[s].label}</button>)}</div>
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kya karta hai (khali = sab)</span>
          <div className="flex flex-wrap gap-1">{(Object.keys(SERVICE) as PetGroomingServiceType[]).map((s) => <button key={s} type="button" onClick={() => set('serviceTypes', toggle(d.serviceTypes, s))} className={chip(d.serviceTypes.includes(s))}>{SERVICE[s]}</button>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="CNIC (marzi)" value={d.cnic} onChange={(e) => set('cnic', e.target.value)} placeholder="35202-1234567-1" />
          <Input label="Tajurba (saal)" inputMode="numeric" value={d.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
          <div className="flex items-end pb-2"><Switch label="Chalu" checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} /></div>
        </div>
      </form>
    </Modal>
  );
}
