/**
 * Doctor directory: who sends prescriptions here, how many and for how
 * much medicine. Counter staff add and correct doctors; verifying or
 * switching one off needs customer-records rights. Doctors are never
 * deleted, so old prescriptions keep their name.
 */

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Download, FileText, GraduationCap, Pencil, Phone, Plus, Power, Stethoscope, Trophy, UserPlus } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { drName, formatCnic, shortDate } from '../lib/meta';

type Tab = 'active' | 'verified' | 'inactive';
type Sort = 'rx' | 'value' | 'name' | 'recent';
interface Draft { name: string; registrationNumber: string; phone: string; cnic: string; qualification: string; specialization: string; clinicName: string; clinicAddress: string; hospitalAffiliation: string; notes: string }

const EMPTY: Draft = { name: '', registrationNumber: '', phone: '', cnic: '', qualification: '', specialization: '', clinicName: '', clinicAddress: '', hospitalAffiliation: '', notes: '' };
const SPECIALITIES = ['General physician', 'Child (Peds)', 'Gynae', 'Medicine', 'Sugar / Diabetes', 'Dil (Cardio)', 'Skin', 'ENT', 'Eye', 'Surgeon', 'Dentist'];
const apiError = (e: unknown) => { const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message; return (Array.isArray(m) ? m[0] : m) ?? 'Save nahi hua'; };

function DoctorModal({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => (doctor ? {
    name: doctor.name, registrationNumber: doctor.registrationNumber, phone: doctor.phone ?? '', cnic: doctor.cnic ?? '', qualification: doctor.qualification ?? '',
    specialization: doctor.specialization ?? '', clinicName: doctor.clinicName ?? '', clinicAddress: doctor.clinicAddress ?? '', hospitalAffiliation: doctor.hospitalAffiliation ?? '', notes: doctor.notes ?? '',
  } : EMPTY));
  const [tried, setTried] = useState(false);
  const set = (k: keyof Draft, v: string) => setD((x) => ({ ...x, [k]: v }));
  const errors: Partial<Record<keyof Draft, string>> = {
    name: d.name.trim().length < 2 ? 'Naam likhein' : undefined,
    registrationNumber: d.registrationNumber.trim().length < 2 ? 'PMDC number likhein' : undefined,
    cnic: d.cnic && d.cnic.replace(/\D/g, '').length !== 13 ? 'CNIC 13 hindsay ka hota hai' : undefined,
  };
  const save = useMutation({
    mutationFn: () => {
      const opt = (v: string) => v.trim() || undefined;
      const body = {
        name: d.name.trim(), registrationNumber: d.registrationNumber.trim(), phone: opt(d.phone), cnic: opt(d.cnic), qualification: opt(d.qualification),
        specialization: opt(d.specialization), clinicName: opt(d.clinicName), clinicAddress: opt(d.clinicAddress), hospitalAffiliation: opt(d.hospitalAffiliation), notes: opt(d.notes),
      };
      return doctor ? doctorsApi.update(doctor.id, body) : doctorsApi.create(body);
    },
    onSuccess: () => { toast.success(doctor ? 'Doctor update ho gaya' : 'Doctor jur gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="lg" title={doctor ? `${doctor.name} — badlein` : 'Naya doctor'} description="PMDC number se doctor pehchana jata hai — ek number do doctors ka nahi ho sakta"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="doctor-form" loading={save.isPending}>Save</Button></div>}>
      <form id="doctor-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label="Naam" required autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Ahmed Raza" error={tried ? errors.name : undefined} hint='"Dr." likhne ki zaroorat nahi' />
        <Input label="PMDC number" required value={d.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder="12345-P" error={tried ? errors.registrationNumber : undefined} />
        <div className="sm:col-span-2">
          <Input label="Specialist" value={d.specialization} onChange={(e) => set('specialization', e.target.value)} list="doctor-specs" />
          <datalist id="doctor-specs">{SPECIALITIES.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <Input label="Phone" inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx…" />
        <Input label="Degree" value={d.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="MBBS, FCPS" />
        <Input label="Clinic" value={d.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
        <Input label="Hospital" value={d.hospitalAffiliation} onChange={(e) => set('hospitalAffiliation', e.target.value)} />
        <Input label="Clinic ka pata" value={d.clinicAddress} onChange={(e) => set('clinicAddress', e.target.value)} wrapperClassName="sm:col-span-2" />
        <Input label="CNIC" inputMode="numeric" value={d.cnic} onChange={(e) => set('cnic', formatCnic(e.target.value))} error={tried ? errors.cnic : undefined} />
        <Textarea label="Note" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
      </form>
    </Modal>
  );
}

export default function PharmacyDoctorsPage() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const canAdd = usePermission(PERMISSIONS.POS_USE);
  const canManage = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('rx');
  const [spec, setSpec] = useState('');
  const [editing, setEditing] = useState<Doctor | 'new' | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canAdd && setEditing('new') });

  const { data: all = [], isLoading, isFetching } = useQuery({ queryKey: ['pharmacy-doctors', 'page', q], queryFn: () => doctorsApi.list({ search: q || undefined }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['pharmacy-doctors'] });
  const verify = useMutation({ mutationFn: (id: string) => doctorsApi.verify(id), onSuccess: refresh, onError: (e) => toast.error(apiError(e)) });
  const toggle = useMutation({
    mutationFn: (d: Doctor) => (d.isActive ? doctorsApi.remove(d.id) : doctorsApi.update(d.id, { name: d.name, registrationNumber: d.registrationNumber, isActive: true })),
    onSuccess: (_r, d) => { toast.success(d.isActive ? `${d.name} band — purane nuskhon me naam rahega` : `${d.name} phir chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const specs = useMemo(() => [...new Set(all.map((d) => d.specialization).filter(Boolean) as string[])].sort(), [all]);
  const counts = { active: all.filter((d) => d.isActive).length, verified: all.filter((d) => d.isActive && d.isVerified).length, inactive: all.filter((d) => !d.isActive).length };
  const rows = useMemo(() => all
    .filter((d) => (tab === 'inactive' ? !d.isActive : d.isActive && (tab !== 'verified' || d.isVerified)))
    .filter((d) => !spec || d.specialization === spec)
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'value' ? b.totalBusiness - a.totalBusiness
        : sort === 'recent' ? String(b.lastPrescriptionAt ?? '').localeCompare(String(a.lastPrescriptionAt ?? ''))
          : b.totalPrescriptions - a.totalPrescriptions)), [all, tab, spec, sort]);
  const totalRx = all.reduce((s, d) => s + d.totalPrescriptions, 0);
  const totalValue = all.reduce((s, d) => s + d.totalBusiness, 0);
  const top = [...all].sort((a, b) => b.totalPrescriptions - a.totalPrescriptions)[0];

  const exportCsv = () => {
    if (!rows.length) { toast.error('Koi doctor nahi'); return; }
    downloadCsv('doctors.csv', [['Naam', 'PMDC', 'Specialist', 'Phone', 'Clinic', 'Nuskhe', 'Dawai ki value', 'Aakhri nuskha', 'Verified'],
      ...rows.map((d) => [d.name, d.registrationNumber, d.specialization, d.phone, d.clinicName, d.totalPrescriptions, d.totalBusiness, d.lastPrescriptionAt?.slice(0, 10), d.isVerified ? 'Haan' : 'Nahi'])]);
  };

  return (
    <PageShell>
      {editing && <DoctorModal doctor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {guide.isOpen && (
        <PageGuide title="Doctors — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserPlus, color: '#2563eb', title: 'Doctor jorein', text: 'Naam aur PMDC number kaafi hai. Nuskha likhte waqt directory se doctor chunein to PMDC khud aa jata hai.' },
            { icon: BadgeCheck, color: '#16a34a', title: 'Verify', text: 'PMDC number check kar lein to "Verified" lagayein — narcotic nuskhe me isi doctor par bharosa hota hai.' },
            { icon: Trophy, color: '#d97706', title: 'Kaun zyada bhejta hai', text: 'Har doctor ke nuskhe aur dawai ki value — kis clinic se kaam aata hai, saaf dikhta hai.' },
            { icon: Power, color: '#64748b', title: 'Band karein', text: 'Doctor mitaya nahi jata, sirf band hota hai — purane nuskhon me naam rehta hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya doctor'], ['G', 'guide']]} />
      )}

      <PageHero title="Doctors" chip={<><Stethoscope />{counts.active} chalu</>} busy={isFetching && !isLoading} loading={isLoading}
        meta="Directory — nuskhe kis doctor se aate hain"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <Link to="/pharmacy/prescriptions" className={heroButton}><FileText className="h-4 w-4" /><span className="hidden sm:inline">Nuskhe</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya doctor</button>}
        </>}
        stats={[
          { label: 'Kul nuskhe', value: String(totalRx) },
          { label: 'Dawai ki value', value: money(totalValue) },
          { label: 'Sab se zyada', value: top && top.totalPrescriptions ? top.name : '—', hint: top && top.totalPrescriptions ? `${top.totalPrescriptions} nuskhe` : undefined },
        ]} />

      <KpiRow cols={3}>
        {isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Stethoscope} color="#0891b2" label="Chalu doctors" value={counts.active} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={BadgeCheck} color="#16a34a" label="Verified" value={counts.verified} hint="PMDC check" onClick={() => setTab('verified')} active={tab === 'verified'} />
            <KpiCard icon={Power} color="#64748b" label="Band" value={counts.inactive} onClick={() => setTab('inactive')} active={tab === 'inactive'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, PMDC, phone, clinic ya specialist…" />}
        chips={(spec || search.trim()) ? <>
          {spec && <FilterChip onRemove={() => setSpec('')}>{spec}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setSpec(''); }}>
        {specs.length > 0 && <FilterMenu icon={Stethoscope} label="Specialist" value={spec || 'all'} active={!!spec} options={[{ value: 'all', label: 'Sab' }, ...specs.map((s) => ({ value: s, label: s }))]} onChange={(v) => setSpec(v === 'all' ? '' : v)} />}
        <FilterMenu icon={Trophy} label="Sort" value={sort} align="right" width="w-56" onChange={setSort}
          options={[{ value: 'rx', label: 'Zyada nuskhe pehle' }, { value: 'value', label: 'Zyada value pehle' }, { value: 'recent', label: 'Haal hi me' }, { value: 'name', label: 'Naam se' }]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        tabs={[{ id: 'active', label: 'Chalu', count: counts.active }, { id: 'verified', label: 'Verified', count: counts.verified }, { id: 'inactive', label: 'Band', count: counts.inactive }]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Stethoscope className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || spec ? 'Is filter me koi doctor nahi' : 'Abhi koi doctor nahi'}</h3>
              <p className="mt-1 text-[0.875rem] text-slate-500">Jin doctors ke nuskhe aate hain unhe jorein — nuskha likhna tez ho jata hai.</p>
              {canAdd && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya doctor</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-[0.875rem]">
                <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Doctor</th><th className="px-3 py-2.5">Clinic / hospital</th><th className="px-3 py-2.5 text-right">Nuskhe</th><th className="px-3 py-2.5 text-right">Dawai ki value</th><th className="px-3 py-2.5">Aakhri</th><th className="px-5 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((d) => (
                    <tr key={d.id} className={cn(!d.isActive && 'opacity-60')}>
                      <td className="px-5 py-2.5">
                        <p className="flex items-center gap-1.5 font-semibold text-slate-900">{drName(d.name)}{d.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}</p>
                        <p className="text-[0.75rem] text-slate-500">PMDC {d.registrationNumber}{d.specialization && ` · ${d.specialization}`}{d.qualification && ` · ${d.qualification}`}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        <p>{d.clinicName || d.hospitalAffiliation || '—'}</p>
                        {d.phone && <a href={`tel:${d.phone}`} className="inline-flex items-center gap-1 text-[0.75rem] text-brand-700"><Phone className="h-3 w-3" />{d.phone}</a>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{d.totalPrescriptions}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(d.totalBusiness)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{d.lastPrescriptionAt ? shortDate(d.lastPrescriptionAt) : '—'}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          {canAdd && <button type="button" onClick={() => setEditing(d)} title="Badlein" aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                          {canManage && d.isActive && <button type="button" onClick={() => verify.mutate(d.id)} title={d.isVerified ? 'Verified hatayein' : 'Verify karein'} className={cn('flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100', d.isVerified ? 'text-emerald-600' : 'text-slate-400')}><BadgeCheck className="h-4 w-4" /></button>}
                          {canManage && <button type="button" onClick={() => toggle.mutate(d)} title={d.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>}
                          <Link to={`/pharmacy/prescriptions?doctor=${d.id}`} title="Nuskhe" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><FileText className="h-4 w-4" /></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </PageShell>
  );
}
