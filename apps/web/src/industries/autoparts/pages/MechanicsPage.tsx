/**
 * Mechanics: staff members who work on vehicles, with their skills, rate
 * and commission, the jobs they have open, and this month's finished jobs,
 * labour earned and commission due. Mechanics are picked on job cards and
 * credited with the labour lines they do.
 *
 * Keys: N new mechanic · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Coffee, GraduationCap, Hammer, Pencil, Plus, Power, UserCog, Users, Wallet, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import { mechanicsApi, type MechanicProfile } from '../api/mechanics.api';
import { MECHANIC_KEY, apiError, money } from '../components/meta';

const SKILLS = ['Engine', 'Electrician', 'AC', 'Denter', 'Painter', 'Suspension', 'Gear box', 'Tyre / alignment', 'Bike mechanic', 'Diesel', 'Hybrid', 'Scanner'];

export default function MechanicsPage() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.STAFF_MANAGE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<MechanicProfile | 'new' | null>(null);

  const listQ = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list() });
  const all = listQ.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((m) => !q || [m.staff?.fullName, m.staff?.phone, ...m.specialization].some((v) => v?.toLowerCase().includes(q)));
  }, [all, search]);
  const totals = useMemo(() => ({
    available: all.filter((m) => m.isAvailable).length,
    open: all.reduce((s, m) => s + (m.openJobs ?? 0), 0),
    labour: all.reduce((s, m) => s + (m.monthLabour ?? 0), 0),
    commission: all.reduce((s, m) => s + (m.monthCommission ?? 0), 0),
  }), [all]);

  const refresh = () => qc.invalidateQueries({ queryKey: [MECHANIC_KEY] });
  const save = useMutation({
    mutationFn: (v: Partial<MechanicProfile>) => mechanicsApi.upsert(v),
    onSuccess: () => { toast.success('Mechanic save ho gaya'); setForm(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const toggle = useMutation({
    mutationFn: (m: MechanicProfile) => mechanicsApi.toggleAvailability(m.id),
    onSuccess: (_r, m) => { toast.success(m.isAvailable ? `${m.staff?.fullName} chutti par` : `${m.staff?.fullName} kaam par`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (m: MechanicProfile) => mechanicsApi.remove(m.id),
    onSuccess: (_r, m) => { toast.success(`${m.staff?.fullName} mechanic list se hata — purane jobs waise hi`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  return (
    <PageShell>
      <PageHero
        title="Mechanic"
        chip={<><UserCog /> Workshop team</>}
        meta="Kaun kis gaari par hai, is mahine kitna kaam kiya aur kitna commission bana"
        loading={listQ.isLoading}
        actions={<>
          <Link to="/staff" className={heroButton}><Users className="h-4 w-4" /><span className="hidden sm:inline">Staff</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya mechanic (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Mechanic</button>}
        </>}
        stats={[
          { label: 'Mechanic', value: all.length, hint: `${totals.available} kaam par` },
          { label: 'Chalte job', value: totals.open },
          { label: 'Is mahine mazdoori', value: sales(totals.labour) },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={UserCog} color="#2563eb" label="Kaam par" value={totals.available} hint={`${all.length - totals.available} chutti par`} />
        <KpiCard icon={Wrench} color="#7c3aed" label="Chalte job" value={totals.open} />
        <KpiCard icon={Hammer} color="#16a34a" label="Mahine ki mazdoori" value={sales(totals.labour)} hint="Di gayi gaariyon par" />
        <KpiCard icon={Wallet} color="#d97706" label="Commission bana" value={sales(totals.commission)} hint="Mazdoori × commission %" />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone ya hunar — AC, denter…" label="Search" />} />

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <UserCog className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{search ? 'Koi mechanic nahi mila' : 'Abhi koi mechanic nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Pehle Staff me banda banayein, phir yahan use mechanic banayein — job card par chuna jata hai.</p>
            {canEdit && !search && <Button className="mt-4" onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Mechanic banayein</Button>}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((m) => (
              <li key={m.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[1rem] font-bold', m.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {(m.staff?.fullName ?? 'M').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{m.staff?.fullName ?? 'Mechanic'}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[m.staff?.phone, m.yearsOfExperience ? `${m.yearsOfExperience} saal tajurba` : null].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', m.isAvailable ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200')}>
                    {m.isAvailable ? 'Kaam par' : 'Chutti'}
                  </span>
                </div>
                {m.specialization.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">{m.specialization.map((x) => <span key={x} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-700">{x}</span>)}</div>
                )}
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                  <div><dt className="text-slate-500">Chalte</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{m.openJobs ?? 0}</dd></div>
                  <div><dt className="text-slate-500">Mahine me</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{m.monthJobs ?? 0}</dd></div>
                  <div><dt className="text-slate-500">Mazdoori</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{sales(m.monthLabour ?? 0)}</dd></div>
                </dl>
                <p className="mt-2 text-[0.75rem] text-slate-500">
                  {m.hourlyRate > 0 ? `Rate ${sales(m.hourlyRate)}/ghanta · ` : ''}{m.commissionPct > 0 ? `Commission ${m.commissionPct}% = ${sales(m.monthCommission ?? 0)}` : 'Commission nahi'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link to={`/autoparts/jobs?mechanic=${m.id}&view=all`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Wrench className="h-3.5 w-3.5" />Jobs</Link>
                  {canEdit && <>
                    <button type="button" onClick={() => toggle.mutate(m)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100"><Coffee className="h-3.5 w-3.5" />{m.isAvailable ? 'Chutti' : 'Kaam par'}</button>
                    <button type="button" onClick={() => setForm(m)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" />Badlein</button>
                    <button type="button" onClick={() => remove.mutate(m)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50"><Power className="h-3.5 w-3.5" />Hatayein</button>
                  </>}
                </div>
              </li>
            ))}
          </ul>
        )}

      <p className="hidden items-center gap-1 px-1 text-[0.75rem] text-slate-500 sm:flex">{canEdit && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>G</Kbd> guide</p>

      {form && <MechanicModal mechanic={form === 'new' ? null : form} taken={all.map((m) => m.staffId)} pending={save.isPending} onSave={(v) => save.mutate(v)} onClose={() => setForm(null)} />}

      {guide.isOpen && (
        <PageGuide title="Mechanic — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Users, color: '#2563eb', title: 'Staff se', text: 'Mechanic pehle Staff me banta hai (naam, phone, tankhwah). Yahan us ka hunar, rate aur commission likhein.' },
            { icon: Wrench, color: '#7c3aed', title: 'Job par', text: 'Job card par mechanic chunein; mazdoori ki har line us ke naam se. "Jobs" se us ke saare kaam dekhein.' },
            { icon: Wallet, color: '#d97706', title: 'Commission', text: 'Is mahine di gayi gaariyon ki mazdoori × commission % — tankhwah ke waqt dekh lein.' },
            { icon: Coffee, color: '#64748b', title: 'Chutti', text: 'Chutti par mechanic job card me "chutti" likha dikhta hai.' },
          ]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function MechanicModal({ mechanic, taken, pending, onSave, onClose }: {
  mechanic: MechanicProfile | null; taken: string[]; pending: boolean; onSave: (v: Partial<MechanicProfile>) => void; onClose: () => void;
}) {
  const staffQ = useQuery({ queryKey: ['staff', 'active'], queryFn: () => staffApi.list({ status: 'ACTIVE' }), enabled: !mechanic, staleTime: 60_000 });
  const free = (staffQ.data ?? []).filter((s) => !taken.includes(s.id));
  const [staffId, setStaffId] = useState(mechanic?.staffId ?? '');
  const [skills, setSkills] = useState<string[]>(mechanic?.specialization ?? []);
  const [rate, setRate] = useState(mechanic?.hourlyRate ? String(mechanic.hourlyRate) : '');
  const [pct, setPct] = useState(mechanic?.commissionPct ? String(mechanic.commissionPct) : '');
  const [years, setYears] = useState(mechanic?.yearsOfExperience ? String(mechanic.yearsOfExperience) : '');
  const pctBad = Number(pct) > 100;
  const bad = !staffId || pctBad;
  const submit = () => {
    if (bad || pending) return;
    onSave({ staffId, specialization: skills, hourlyRate: Number(rate) || 0, commissionPct: Number(pct) || 0, yearsOfExperience: years ? Number(years) : undefined });
  };
  return (
    <Modal open onClose={onClose} size="md" title={mechanic ? `${mechanic.staff?.fullName} — badlein` : 'Mechanic banayein'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={bad} loading={pending}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!mechanic && (
          <Select label="Staff me se" required value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder={staffQ.isLoading ? 'Load ho raha…' : 'Chunein'}
            options={free.map((s) => ({ value: s.id, label: `${s.fullName}${s.designation ? ` — ${s.designation}` : ''}` }))}
            hint={!staffQ.isLoading && !free.length ? 'Pehle Staff me banda banayein' : 'Jo banda gaariyon par kaam karta hai'} />
        )}
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Hunar</span>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((x) => (
              <button key={x} type="button" aria-pressed={skills.includes(x)} onClick={() => setSkills(skills.includes(x) ? skills.filter((y) => y !== x) : [...skills, x])}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', skills.includes(x) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>{x}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Rate (ghanta)" inputMode="decimal" value={rate} onChange={(e) => setRate(money(e.target.value))} placeholder="0" hint="Mazdoori ghante se ho to" />
          <Input label="Commission %" inputMode="decimal" value={pct} onChange={(e) => setPct(money(e.target.value))} placeholder="0" error={pctBad ? '100 se zyada nahi' : undefined} hint="Mazdoori ka hissa" />
          <Input label="Tajurba (saal)" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value.replace(/\D/g, ''))} placeholder="5" />
        </div>
      </form>
    </Modal>
  );
}
