/**
 * Optometrists (eye test doctors): who tests, on which days and hours, and
 * their fee — booking uses these to offer free slots and the default fee.
 * Shows tests done and fees billed per doctor, with this month's workload.
 * Doctors are switched off, never removed, so their history stays.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CalendarDays, Clock, Download, GraduationCap, Pencil, Plus, Stethoscope, UserCog, Users, Wallet } from 'lucide-react';
import {
  Button, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, FilterBar, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { optometristsApi, type OpticalOptometrist, type OptometristInput } from '../api/optometrists.api';
import { ListCard, ListState } from '../components/ui';
import { usePageKeys } from '../hooks/usePageKeys';
import { OPTICAL_KEYS, apiError, moneyInput, phoneOk } from '../lib/meta';

type Tab = 'active' | 'off' | 'all';
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumerat', 'Juma', 'Hafta'];
const SPECIAL = ['Refraction', 'Contact lens', 'Bachon ki aankh', 'Low vision', 'Squint'];

export default function OptometristsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<OpticalOptometrist | 'new' | null>(null);
  const [off, setOff] = useState<OpticalOptometrist | null>(null);
  usePageKeys(searchRef, { n: () => canManage && setEditing('new') });

  const list = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'all'], queryFn: () => optometristsApi.list() });
  const all = useMemo(() => list.data ?? [], [list.data]);
  const term = search.trim().toLowerCase();
  const rows = all.filter((d) => (tab === 'all' || (tab === 'active' ? d.isActive : !d.isActive)) && (!term || [d.name, d.phone, d.employeeCode, d.qualification].some((v) => v?.toLowerCase().includes(term))));
  const active = all.filter((d) => d.isActive);
  const today = new Date().getDay();

  const deactivate = useMutation({
    mutationFn: (d: OpticalOptometrist) => optometristsApi.deactivate(d.id),
    onSuccess: () => { toast.success('Band kar diya — purana record rehta hai'); setOff(null); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.doctors] }); },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });
  const reactivate = useMutation({
    mutationFn: (d: OpticalOptometrist) => optometristsApi.update(d.id, { isActive: true }),
    onSuccess: () => { toast.success('Dobara chalu'); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.doctors] }); },
    onError: (e) => toast.error(apiError(e, 'Chalu nahi hua')),
  });

  const exportCsv = () => {
    if (!rows.length) { toast.error('Koi doctor nahi'); return; }
    downloadCsv('optometrists.csv', [['Code', 'Naam', 'Phone', 'Qualification', 'Din', 'Waqt', 'Fees', 'Follow-up fees', 'Test', 'Fees mili', 'Chalu'],
      ...rows.map((d) => [d.employeeCode, d.name, d.phone, d.qualification, d.workingDays.map((x) => DAYS[x]).join(' '), `${d.workStartTime}-${d.workEndTime}`, d.consultationFee, d.followUpFee, d.totalTests, d.totalRevenue, d.isActive ? 'Haan' : 'Nahi'])]);
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Optometrists" onClose={guide.close}
          steps={[
            { icon: CalendarDays, color: '#2563eb', title: 'Din aur waqt', text: 'Jin dinon aur ghanton me doctor baithta hai — test book karte waqt sirf yahi khali waqt dikhte hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Fees', text: 'Doctor ki fees test par khud lagti hai; booking par badal bhi sakte hain.' },
            { icon: Ban, color: '#e11d48', title: 'Band karna', text: 'Doctor chhor jaye to band karein — us ke test aur fees ka record rehta hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya doctor'], ['G', 'guide']]} />
      )}
      {editing && <DoctorModal doctor={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {off && (
        <Modal open onClose={() => setOff(null)} size="sm" title={`${off.name} ko band karein?`} description="Naye test me nahi aayenge. Purane test aur fees ka record rehta hai."
          footer={<><Button variant="secondary" onClick={() => setOff(null)}>Rehne dein</Button><Button variant="danger" loading={deactivate.isPending} onClick={() => deactivate.mutate(off)}>Band karein</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{off.totalTests} test · {money(off.totalRevenue)} fees</p>
        </Modal>
      )}

      <PageHero title="Optometrists" chip={<><UserCog />{active.length}</>} loading={list.isLoading} meta="Eye test karne wale doctor"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya doctor</button>}
        </>}
        stats={[
          { label: 'Kul fees (ab tak)', value: money(all.reduce((a, d) => a + d.totalRevenue, 0)) },
          { label: 'Kul test', value: all.reduce((a, d) => a + d.totalTests, 0) },
          { label: 'Aaj baithe', value: active.filter((d) => d.workingDays.includes(today)).length },
        ]} />

      <KpiRow cols={3}>
        {list.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Users} color="#2563eb" label="Chalu doctor" value={active.length} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={Clock} color="#16a34a" label="Aaj dukaan par" value={active.filter((d) => d.workingDays.includes(today)).length} hint={DAYS[today]} />
            <KpiCard icon={Ban} color="#94a3b8" label="Band" value={all.length - active.length} onClick={() => setTab('off')} active={tab === 'off'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone ya code…" />} />
      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'active', label: 'Chalu', icon: Stethoscope }, { id: 'off', label: 'Band' }, { id: 'all', label: 'Sab' }]} />

      <ListCard>
        <ListState loading={list.isLoading} error={list.isError} empty={!rows.length} onRetry={() => void list.refetch()} icon={UserCog}
          title={term ? `"${search}" se koi nahi mila` : 'Abhi koi doctor nahi'} hint="Doctor jorein — eye test booking me unke din, waqt aur fees aate hain."
          actions={canManage && <Button onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya doctor</Button>}>
          <Table minWidth="56rem">
            <THead><Tr><Th>Doctor</Th><Th>Din</Th><Th>Waqt</Th><Th align="right">Fees</Th><Th align="right">Test</Th><Th align="right">Fees mili</Th><Th align="right" /></Tr></THead>
            <TBody>
              {rows.map((d) => (
                <Tr key={d.id} className={d.isActive ? '' : 'opacity-60'}>
                  <Td><p className="font-semibold text-slate-900">{d.name}</p><p className="text-[0.75rem] text-slate-500">{[d.employeeCode, d.qualification, d.phone].filter(Boolean).join(' · ')}</p></Td>
                  <Td><div className="flex flex-wrap gap-0.5">{DAYS.map((n, i) => <span key={n} className={`rounded px-1 text-[0.6875rem] ${d.workingDays.includes(i) ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-300'}`}>{n.slice(0, 2)}</span>)}</div></Td>
                  <Td className="whitespace-nowrap">{d.workStartTime}–{d.workEndTime}</Td>
                  <Td align="right">{money(d.consultationFee)}{d.followUpFee > 0 && <p className="text-[0.75rem] text-slate-500">dobara {money(d.followUpFee)}</p>}</Td>
                  <Td align="right">{d.totalTests}</Td>
                  <Td align="right">{money(d.totalRevenue)}</Td>
                  <Td align="right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="ghost" aria-label="Badlein" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        {d.isActive ? <Button size="xs" variant="ghost" aria-label="Band karein" onClick={() => setOff(d)}><Ban className="h-3.5 w-3.5" /></Button>
                          : <Button size="xs" variant="secondary" loading={reactivate.isPending} onClick={() => reactivate.mutate(d)}>Chalu</Button>}
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </ListState>
      </ListCard>
    </PageShell>
  );
}

function DoctorModal({ doctor, onClose }: { doctor: OpticalOptometrist | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    employeeCode: doctor?.employeeCode ?? `OPT-${Date.now().toString().slice(-4)}`, name: doctor?.name ?? '', phone: doctor?.phone ?? '', qualification: doctor?.qualification ?? '',
    registrationNumber: doctor?.registrationNumber ?? '', years: doctor?.yearsExperience != null ? String(doctor.yearsExperience) : '',
    days: doctor?.workingDays ?? [1, 2, 3, 4, 5, 6], start: doctor?.workStartTime ?? '10:00', end: doctor?.workEndTime ?? '20:00',
    fee: String(doctor?.consultationFee ?? 500), followFee: String(doctor?.followUpFee ?? 0), specializations: doctor?.specializations ?? [],
  });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = 'Naam likhein';
  if (!phoneOk(f.phone)) e.phone = 'Sahi mobile number likhein (03xx-xxxxxxx)';
  if (!f.employeeCode.trim()) e.code = 'Code likhein';
  if (!f.days.length) e.days = 'Kam se kam ek din chunein';
  if (f.end <= f.start) e.time = 'Chhutti ka waqt aane ke baad ho';
  const save = useMutation({
    mutationFn: () => {
      const body: OptometristInput = {
        employeeCode: f.employeeCode.trim(), name: f.name.trim(), phone: f.phone.trim(), qualification: f.qualification.trim() || undefined,
        registrationNumber: f.registrationNumber.trim() || undefined, yearsExperience: f.years ? Number(f.years) : undefined,
        workingDays: [...f.days].sort(), workStartTime: f.start, workEndTime: f.end, consultationFee: Number(f.fee) || 0, followUpFee: Number(f.followFee) || 0,
        specializations: f.specializations,
      };
      return doctor ? optometristsApi.update(doctor.id, body) : optometristsApi.create(body);
    },
    onSuccess: () => { toast.success(doctor ? 'Save ho gaya' : 'Doctor jur gaya'); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.doctors] }); onClose(); },
    onError: (err) => toast.error(apiError(err, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!Object.keys(e).length && !save.isPending) save.mutate(); };
  const show = (k: string) => (tried ? e[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={doctor ? `${doctor.name} — badlein` : 'Naya optometrist'} description="Din, waqt aur fees — booking yahi istemal karti hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naam" required autoFocus value={f.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="Dr. Sana Ahmed" error={show('name')} maxLength={120} />
          <Input label="Mobile" required inputMode="tel" value={f.phone} onChange={(ev) => set({ phone: ev.target.value })} placeholder="0300-1234567" error={show('phone')} maxLength={20} />
          <Input label="Qualification" value={f.qualification} onChange={(ev) => set({ qualification: ev.target.value })} placeholder="B.Sc Optometry" hint="Marzi hai" />
          <Input label="Registration number" value={f.registrationNumber} onChange={(ev) => set({ registrationNumber: ev.target.value })} hint="Marzi hai" />
          <Input label="Code" value={f.employeeCode} onChange={(ev) => set({ employeeCode: ev.target.value })} error={show('code')} hint="Har doctor ka alag" maxLength={30} />
          <Input label="Tajurba (saal)" inputMode="numeric" value={f.years} onChange={(ev) => set({ years: ev.target.value.replace(/\D/g, '').slice(0, 2) })} hint="Marzi hai" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kin dinon aate hain</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((n, i) => (
              <button key={n} type="button" aria-pressed={f.days.includes(i)} onClick={() => set({ days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })}
                className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1 ${f.days.includes(i) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{n}</button>
            ))}
          </div>
          {show('days') && <p className="mt-1 text-[0.8125rem] text-rose-600">{show('days')}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Aane ka waqt" type="time" value={f.start} onChange={(ev) => set({ start: ev.target.value })} />
          <Input label="Jane ka waqt" type="time" value={f.end} onChange={(ev) => set({ end: ev.target.value })} error={show('time')} />
          <Input label="Test fees" inputMode="decimal" value={f.fee} onChange={(ev) => set({ fee: moneyInput(ev.target.value) })} />
          <Input label="Dobara aane ki fees" inputMode="decimal" value={f.followFee} onChange={(ev) => set({ followFee: moneyInput(ev.target.value) })} hint="Marzi hai" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Khaas kaam</span>
          <div className="flex flex-wrap gap-1.5">
            {SPECIAL.map((s) => (
              <button key={s} type="button" aria-pressed={f.specializations.includes(s)} onClick={() => set({ specializations: f.specializations.includes(s) ? f.specializations.filter((x) => x !== s) : [...f.specializations, s] })}
                className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1 ${f.specializations.includes(s) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{s}</button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
