/**
 * Doctors: fees (first visit, follow-up and its days, emergency), timings,
 * daily limit and the doctor's share. The "Din ka hisaab" tab closes a day
 * per doctor: patients seen, fees and lab billed (from the bills, so it
 * matches the day book), cash vs khata, and the doctor's share to pay out.
 * Doctors are switched off, never deleted, so old visits keep their name.
 */

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, BookOpen, CalendarDays, Clock, Download, GraduationCap, HandCoins, Pencil, Plus, Power, Printer, Stethoscope, UserCog, Users } from 'lucide-react';
import {
  Badge, Button, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Select, Skeleton,
  Table, TBody, THead, Td, Th, Tr, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi } from '../api/appointments.api';
import { doctorsApi, type Doctor, type Specialty } from '../api/doctors.api';
import { ListCard, ListFailed, ListLoading } from '../components/ListBits';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { DAYS, SPECIALTIES, apiError, dayBounds, dayKey, drName, shortDate, specialtyLabel } from '../lib/meta';

type Tab = 'doctors' | 'day';

interface Draft {
  fullName: string; phone: string; title: string; qualifications: string; specialties: Specialty[]; pmcNumber: string;
  consultationFee: string; followUpFee: string; followUpDays: string; emergencyFee: string;
  workStartTime: string; workEndTime: string; workingDays: number[]; slotDurationMin: string; maxDailyPatients: string;
  commissionType: 'PERCENTAGE' | 'FIXED'; commissionPct: string;
}
const fromDoctor = (d: Doctor | null): Draft => ({
  fullName: d?.fullName ?? '', phone: '', title: d?.title ?? 'Dr.', qualifications: (d?.qualifications ?? []).join(', '), specialties: d?.specialties ?? ['GENERAL_PRACTITIONER'],
  pmcNumber: d?.pmcNumber ?? '', consultationFee: String(d?.consultationFee ?? ''), followUpFee: String(d?.followUpFee ?? ''), followUpDays: String(d?.followUpDays ?? 7),
  emergencyFee: d?.emergencyFee != null ? String(d.emergencyFee) : '', workStartTime: d?.workStartTime ?? '09:00', workEndTime: d?.workEndTime ?? '21:00',
  workingDays: d?.workingDays ?? [1, 2, 3, 4, 5, 6], slotDurationMin: String(d?.slotDurationMin ?? 15), maxDailyPatients: d?.maxDailyPatients != null ? String(d.maxDailyPatients) : '',
  commissionType: d?.commissionType === 'FIXED' ? 'FIXED' : 'PERCENTAGE', commissionPct: String(d?.commissionPct ?? 0),
});

function DoctorModal({ doctor, onClose, onSaved }: { doctor: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => fromDoctor(doctor));
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const errors: Partial<Record<keyof Draft, string>> = {
    fullName: d.fullName.trim().length < 2 ? 'Naam likhein' : undefined,
    phone: !doctor && d.phone.replace(/\D/g, '').length < 10 ? 'Phone likhein (03xx…)' : undefined,
    consultationFee: !(Number(d.consultationFee) >= 0) || d.consultationFee.trim() === '' ? 'Fees likhein' : undefined,
    followUpFee: d.followUpFee && !(Number(d.followUpFee) >= 0) ? 'Sahi likhein' : undefined,
    workEndTime: d.workStartTime >= d.workEndTime ? 'Band hone ka waqt baad me ho' : undefined,
    commissionPct: !(Number(d.commissionPct) >= 0) || (d.commissionType === 'PERCENTAGE' && Number(d.commissionPct) > 100) ? 'Share 0–100%' : undefined,
    workingDays: d.workingDays.length === 0 ? 'Kam se kam ek din' : undefined,
  };
  const save = useMutation({
    mutationFn: () => doctorsApi.upsert({
      ...(doctor ? { staffId: doctor.staffId } : { phone: d.phone }),
      fullName: d.fullName.trim(), title: d.title.trim() || undefined, qualifications: d.qualifications.split(',').map((x) => x.trim()).filter(Boolean),
      specialties: d.specialties, pmcNumber: d.pmcNumber.trim() || undefined, consultationFee: Number(d.consultationFee) || 0, followUpFee: num(d.followUpFee) ?? 0,
      followUpDays: num(d.followUpDays) ?? 7, emergencyFee: num(d.emergencyFee), workStartTime: d.workStartTime, workEndTime: d.workEndTime,
      workingDays: [...d.workingDays].sort(), slotDurationMin: num(d.slotDurationMin) ?? 15, maxDailyPatients: num(d.maxDailyPatients),
      commissionType: d.commissionType, commissionPct: Number(d.commissionPct) || 0, isActive: true,
    }),
    onSuccess: () => { toast.success(doctor ? 'Doctor update ho gaya' : 'Doctor jur gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setTried(true); if (!Object.values(errors).some(Boolean)) save.mutate(); };
  const err = (k: keyof Draft) => (tried ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="xl" title={doctor ? `${drName(doctor)} — badlein` : 'Naya doctor'} description="Fees, waqt aur share — reception par fees khud lagti hai"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="doctor-form" loading={save.isPending}>Save (Ctrl+S)</Button></div>}>
      <form id="doctor-form" onSubmit={submit} className="space-y-5"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Naam" required autoFocus value={d.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ayesha Malik" error={err('fullName')} hint='"Dr." alag khane me' wrapperClassName="sm:col-span-2" />
          <Input label="Title" value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Dr." />
          {!doctor && <Input label="Phone" required inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03xx-xxxxxxx" error={err('phone')} hint="Staff list me bhi jurta hai" />}
          <Input label="Degree" value={d.qualifications} onChange={(e) => set('qualifications', e.target.value)} placeholder="MBBS, FCPS" />
          <Input label="PMDC number" value={d.pmcNumber} onChange={(e) => set('pmcNumber', e.target.value)} placeholder="12345-P" hint="Nuskhe par chhapta hai" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Specialist</span>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map((s) => {
              const on = d.specialties.includes(s.value);
              return <button key={s.value} type="button" aria-pressed={on} onClick={() => set('specialties', on ? d.specialties.filter((x) => x !== s.value) : [...d.specialties, s.value])}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{s.label}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Fees (pehli visit)" required inputMode="decimal" value={d.consultationFee} onChange={(e) => set('consultationFee', e.target.value)} error={err('consultationFee')} />
          <Input label="Follow-up fees" inputMode="decimal" value={d.followUpFee} onChange={(e) => set('followUpFee', e.target.value)} error={err('followUpFee')} hint="0 = poori fees" />
          <Input label="Follow-up kitne din" inputMode="numeric" value={d.followUpDays} onChange={(e) => set('followUpDays', e.target.value)} hint="Is ke andar follow-up fees" />
          <Input label="Emergency fees" inputMode="decimal" value={d.emergencyFee} onChange={(e) => set('emergencyFee', e.target.value)} placeholder="Wohi" />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Clinic shuru" type="time" value={d.workStartTime} onChange={(e) => set('workStartTime', e.target.value)} />
          <Input label="Clinic band" type="time" value={d.workEndTime} onChange={(e) => set('workEndTime', e.target.value)} error={err('workEndTime')} />
          <Input label="Ek mareez (minute)" inputMode="numeric" value={d.slotDurationMin} onChange={(e) => set('slotDurationMin', e.target.value)} />
          <Input label="Din me zyada se zyada" inputMode="numeric" value={d.maxDailyPatients} onChange={(e) => set('maxDailyPatients', e.target.value)} placeholder="Had nahi" hint="Is ke baad sirf emergency" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kin dinon</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((label, i) => {
              const on = d.workingDays.includes(i);
              return <button key={label} type="button" aria-pressed={on} onClick={() => set('workingDays', on ? d.workingDays.filter((x) => x !== i) : [...d.workingDays, i])}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{label}</button>;
            })}
          </div>
          {err('workingDays') && <p className="mt-1 text-xs font-medium text-rose-600">{err('workingDays')}</p>}
        </div>
        <div className="grid gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:grid-cols-[auto_12rem] sm:items-end">
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Doctor ka share</span>
            <Segmented<'PERCENTAGE' | 'FIXED'> value={d.commissionType} onChange={(v) => set('commissionType', v)} label="Share"
              items={[{ value: 'PERCENTAGE', label: 'Fees ka %' }, { value: 'FIXED', label: 'Har mareez par Rs' }]} />
            <p className="mt-1 text-[0.75rem] text-slate-500">"Din ka hisaab" me isi se doctor ka share banta hai</p>
          </div>
          <Input label={d.commissionType === 'FIXED' ? 'Rs har mareez' : '% fees ka'} inputMode="decimal" value={d.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} error={err('commissionPct')} />
        </div>
      </form>
    </Modal>
  );
}

function DayClose() {
  const { sales: money } = useMasked();
  const [day, setDay] = useState(dayKey());
  const q = useQuery({ queryKey: ['clinic-day-close', day], queryFn: () => appointmentsApi.dayClose(dayBounds(day).from) });
  const rows = q.data?.rows ?? [];
  const t = q.data?.totals;
  const exportCsv = () => downloadCsv(`doctor-hisaab-${day}.csv`, [
    ['Doctor', 'Booked', 'Dekhe', 'Cancel', 'Fees', 'Lab', 'Cash/Card', 'Khata', 'Share', 'Clinic'],
    ...rows.map((r) => [drName(r.doctor), r.booked, r.seen, r.cancelled, r.fees, r.labFees, r.collected, r.khata, r.share, r.clinicKeeps]),
  ]);
  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Input label="Din" type="date" value={day} onChange={(e) => setDay(e.target.value || dayKey())} wrapperClassName="w-44" />
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!rows.length}>CSV</Button>
        <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
        <Link to="/expenses" className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><HandCoins className="h-4 w-4" />Share ada karein (Expense)</Link>
      </div>
      <KpiRow>
        <KpiCard icon={Users} color="#2563eb" label="Mareez dekhe" value={t?.seen ?? 0} hint={`${t?.booked ?? 0} booked`} />
        <KpiCard icon={Stethoscope} color="#0891b2" label="Consultation fees" value={money(t?.fees)} />
        <KpiCard icon={CalendarDays} color="#7c3aed" label="Lab fees" value={money(t?.labFees)} />
        <KpiCard icon={Banknote} color="#16a34a" label="Haath me aaya" value={money(t?.collected)} hint={`Khata: ${money(t?.khata)}`} />
        <KpiCard icon={HandCoins} color="#d97706" label="Doctors ka share" value={money(t?.share)} />
      </KpiRow>
      <ListCard>
        {q.isLoading ? <ListLoading rows={3} /> : q.isError ? <ListFailed onRetry={() => q.refetch()} /> : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-[0.875rem] text-slate-500">{shortDate(dayBounds(day).from)} ko koi visit ya bill nahi.</p>
        ) : (
          <Table minWidth="60rem">
            <THead><Tr><Th>Doctor</Th><Th align="right">Mareez</Th><Th align="right">Fees</Th><Th align="right">Lab</Th><Th align="right">Cash / card</Th><Th align="right">Khata</Th><Th align="right">Share</Th><Th align="right">Clinic ka</Th></Tr></THead>
            <TBody>
              {rows.map((r) => (
                <Tr key={r.doctorId}>
                  <Td><p className="font-semibold text-slate-900">{drName(r.doctor) || 'Doctor'}</p><p className="text-[0.75rem] text-slate-500">{r.commissionType === 'FIXED' ? `${formatPKR(r.commissionPct)} har mareez` : `${r.commissionPct}% share`}</p></Td>
                  <Td align="right"><p className="font-semibold">{r.seen}</p><p className="text-[0.75rem] text-slate-500">{r.booked} booked · {r.cancelled} cancel</p></Td>
                  <Td align="right">{money(r.fees)}</Td>
                  <Td align="right">{money(r.labFees)}</Td>
                  <Td align="right">{money(r.collected)}</Td>
                  <Td align="right" className={r.khata > 0 ? 'text-amber-700' : ''}>{money(r.khata)}</Td>
                  <Td align="right" className="font-semibold text-slate-900">{money(r.share)}</Td>
                  <Td align="right">{money(r.clinicKeeps)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
      <p className="text-[0.75rem] text-slate-500">Amount bill se li jati hai (void aur poore wapas bill shamil nahi), is liye day book se milti hai. Share ki adaigi Expense me "Doctor share" likh kar karein.</p>
    </div>
  );
}

export default function DoctorsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const canMoney = usePermission(PERMISSIONS.REPORTS_VIEW);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('doctors');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'active' | 'off'>('active');
  const [spec, setSpec] = useState('');
  const [editing, setEditing] = useState<Doctor | 'new' | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canManage && setEditing('new') });

  const list = useQuery({ queryKey: ['clinic-doctors', 'page', q], queryFn: () => doctorsApi.list({ search: q || undefined }) });
  const today = dayBounds(dayKey());
  const { data: todays = [] } = useQuery({ queryKey: ['clinic-appointments', 'today-count', today.from], queryFn: () => appointmentsApi.list(today) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinic-doctors'] });
  const off = useMutation({
    mutationFn: (d: Doctor) => (d.isActive ? doctorsApi.remove(d.id) : doctorsApi.upsert({ staffId: d.staffId, fullName: d.fullName, isActive: true })),
    onSuccess: (_r, d) => { toast.success(d.isActive ? `${drName(d)} band — purani visits me naam rahega` : `${drName(d)} phir chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const all = list.data ?? [];
  const rows = useMemo(() => all.filter((d) => (show === 'active' ? d.isActive : !d.isActive)).filter((d) => !spec || d.specialties.includes(spec as Specialty)), [all, show, spec]);
  const load = (id: string) => todays.filter((a) => a.doctorId === id && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW');

  return (
    <PageShell>
      {editing && <DoctorModal doctor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {guide.isOpen && (
        <PageGuide title="Doctors — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserCog, color: '#2563eb', title: 'Doctor jorein', text: 'Naam, phone aur fees kaafi hain. Follow-up fees aur din likhein — reception par khud lagti hai.' },
            { icon: Clock, color: '#0891b2', title: 'Waqt aur had', text: 'Clinic ka waqt, din aur din ki had — had poori ho to sirf emergency token banta hai.' },
            { icon: HandCoins, color: '#d97706', title: 'Share', text: 'Fees ka % ya har mareez par Rs. "Din ka hisaab" me har doctor ka share banta hai.' },
            { icon: BookOpen, color: '#16a34a', title: 'Din ka hisaab', text: 'Har shaam doctor wise mareez, fees, khata aur share — print kar ke dastakhat lein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya doctor'], ['G', 'guide']]} />
      )}

      <PageHero title="Doctors" chip={<><Stethoscope />{all.filter((d) => d.isActive).length} chalu</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta="Fees, waqt, share aur din ka hisaab"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canMoney && <button type="button" onClick={() => setTab('day')} className={heroButton}><BookOpen className="h-4 w-4" />Din ka hisaab</button>}
          {canManage && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya doctor</button>}
        </>}
        stats={[
          { label: 'Aaj ke mareez', value: String(todays.filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length) },
          { label: 'Mukammal', value: String(todays.filter((a) => a.status === 'COMPLETED').length) },
        ]} />

      <ViewTabs<Tab> value={tab} onChange={setTab}
        tabs={[{ id: 'doctors', label: 'Doctors', icon: Stethoscope, count: all.length }, ...(canMoney ? [{ id: 'day' as const, label: 'Din ka hisaab', icon: BookOpen }] : [])]} />

      {tab === 'day' && canMoney ? <DayClose /> : (
        <>
          <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam ya PMDC number…" />}>
            <Segmented<'active' | 'off'> value={show} onChange={setShow} label="Kaun" items={[{ value: 'active', label: 'Chalu' }, { value: 'off', label: 'Band' }]} />
            <Select aria-label="Specialist" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Sab specialist" options={SPECIALTIES.map((s) => ({ value: s.value, label: s.label }))} />
          </FilterBar>
          <ListCard>
            {list.isLoading ? <ListLoading rows={3} /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Stethoscope className="h-7 w-7" /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{show === 'off' ? 'Koi band doctor nahi' : 'Abhi koi doctor nahi'}</h3>
                <p className="mt-1 text-[0.875rem] text-slate-500">Doctor jorein — fees aur waqt reception par khud lagte hain.</p>
                {canManage && show === 'active' && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya doctor</Button>}
              </div>
            ) : (
              <Table minWidth="56rem">
                <THead><Tr><Th>Doctor</Th><Th align="right">Fees</Th><Th>Waqt</Th><Th align="right">Aaj</Th><Th align="right">Share</Th><Th align="right" /></Tr></THead>
                <TBody>
                  {rows.map((d) => {
                    const l = load(d.id);
                    return (
                      <Tr key={d.id} className={cn(!d.isActive && 'opacity-60')}>
                        <Td>
                          <p className="font-semibold text-slate-900">{drName(d)}</p>
                          <p className="text-[0.75rem] text-slate-500">{[d.specialties.map(specialtyLabel).join(', '), d.qualifications.join(', '), d.pmcNumber && `PMDC ${d.pmcNumber}`].filter(Boolean).join(' · ')}</p>
                        </Td>
                        <Td align="right"><p className="font-semibold">{money(d.consultationFee)}</p>{d.followUpFee > 0 && <p className="text-[0.75rem] text-slate-500">Follow-up {money(d.followUpFee)} · {d.followUpDays} din</p>}</Td>
                        <Td><p>{d.workStartTime}–{d.workEndTime}</p><p className="text-[0.75rem] text-slate-500">{d.workingDays.length === 7 ? 'Har din' : d.workingDays.map((x) => DAYS[x]?.slice(0, 3)).join(', ')}</p></Td>
                        <Td align="right"><p className="font-semibold">{l.length}{d.maxDailyPatients ? ` / ${d.maxDailyPatients}` : ''}</p><p className="text-[0.75rem] text-slate-500">{l.filter((a) => a.status === 'COMPLETED').length} mukammal</p></Td>
                        <Td align="right">{d.commissionPct ? <Badge variant="accent">{d.commissionType === 'FIXED' ? `${money(d.commissionPct)} / mareez` : `${d.commissionPct}%`}</Badge> : '—'}</Td>
                        <Td align="right">
                          <div className="flex justify-end gap-1">
                            {canManage && <button type="button" onClick={() => setEditing(d)} title="Badlein" aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                            {canManage && <button type="button" onClick={() => off.mutate(d)} title={d.isActive ? 'Band karein' : 'Chalu karein'} aria-label={d.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Power className="h-4 w-4" /></button>}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </ListCard>
        </>
      )}
    </PageShell>
  );
}
