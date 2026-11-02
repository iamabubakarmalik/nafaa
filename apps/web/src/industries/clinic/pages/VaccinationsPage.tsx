/**
 * Vaccine register: overdue, due this week, given. Add one dose or the full
 * Pakistan EPI schedule for a child from the birth date; record the batch,
 * maker and expiry when given; delay or skip with a note. Mothers can be
 * called straight from the overdue list.
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Baby, CalendarClock, CheckCircle2, Download, GraduationCap, Phone, Plus, Syringe, TimerReset } from 'lucide-react';
import {
  Badge, Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import type { Patient } from '../api/patients.api';
import { patientsApi } from '../api/patients.api';
import { vaccinationsApi, type VaccinationRow } from '../api/vaccinations.api';
import { ListCard, ListFailed, ListLoading, Pager } from '../components/ListBits';
import { PatientPicker } from '../components/PatientPicker';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { VACCINE_STATUS, ageOf, apiError, dayBounds, dayKey, shortDate } from '../lib/meta';
import { t } from '@core/i18n';

type Tab = 'OVERDUE' | 'DUE' | 'ADMINISTERED' | 'all';
const LIMIT = 30;

function AddModal({ initial, onClose, onSaved }: { initial: Patient | null; onClose: () => void; onSaved: () => void }) {
  const [patient, setPatient] = useState<Patient | null>(initial);
  const [mode, setMode] = useState<'epi' | 'one'>('epi');
  const [birth, setBirth] = useState(initial?.dateOfBirth?.slice(0, 10) ?? '');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState(dayKey());
  const [dose, setDose] = useState('');
  const [tried, setTried] = useState(false);
  const errors = {
    patient: !patient ? t('Mareez chunein') : undefined,
    birth: mode === 'epi' && !birth ? t('Paidaish ki tareekh likhein') : mode === 'epi' && new Date(birth) > new Date() ? t('Aage ki tareekh nahi') : undefined,
    name: mode === 'one' && !name.trim() ? t('Vaccine ka naam') : undefined,
    due: mode === 'one' && !dueDate ? t('Tareekh likhein') : undefined,
  };
  const save = useMutation({
    mutationFn: async () => (mode === 'epi'
      ? t('{{added}} doses lag gayi', { added: (await vaccinationsApi.bulkEpi(patient!.id, birth)).added })
      : (await vaccinationsApi.schedule({ patientId: patient!.id, vaccineName: name.trim(), dueDate: dayBounds(dueDate).from, doseNumber: dose ? Number(dose) : undefined }), t('Dose jur gayi'))),
    onSuccess: (msg) => { toast.success(msg); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setTried(true); if (!Object.values(errors).some(Boolean)) save.mutate(); };
  return (
    <Modal open onClose={onClose} size="lg" title={t('Vaccine schedule')} description={t('Bachay ka poora EPI schedule ek click me, ya ek dose')}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button type="submit" form="vac-form" loading={save.isPending}>{t('Save (Ctrl+S)')}</Button></div>}>
      <form id="vac-form" onSubmit={submit} className="space-y-4" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <PatientPicker value={patient} onChange={(p) => { setPatient(p); if (p?.dateOfBirth) setBirth(p.dateOfBirth.slice(0, 10)); }} error={tried ? errors.patient : undefined} />
        <Segmented<'epi' | 'one'> value={mode} onChange={setMode} label={t('Kya')} items={[{ value: 'epi', label: t('Poora EPI schedule') }, { value: 'one', label: t('Ek dose') }]} />
        {mode === 'epi' ? (
          <Input label={t('Paidaish ki tareekh')} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} error={tried ? errors.birth : undefined}
            hint={t('BCG se Measles-2 tak har dose ki tareekh khud banti hai; jo pehle se lagi hain wo dobara nahi judti')} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={t('Vaccine')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Hepatitis B, Flu…')} error={tried ? errors.name : undefined} wrapperClassName="sm:col-span-2" />
            <Input label={t('Dose no.')} inputMode="numeric" value={dose} onChange={(e) => setDose(e.target.value)} />
            <Input label={t('Kab lagani hai')} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={tried ? errors.due : undefined} />
          </div>
        )}
      </form>
    </Modal>
  );
}

function GiveModal({ v, onClose, onSaved }: { v: VaccinationRow; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ batchNumber: '', manufacturer: '', expiryDate: '', siteAdministered: 'Left arm', administeredBy: '', adverseReactions: '' });
  const set = (k: keyof typeof f, val: string) => setF((x) => ({ ...x, [k]: val }));
  const expired = !!f.expiryDate && f.expiryDate < dayKey();
  const save = useMutation({
    mutationFn: () => vaccinationsApi.administer(v.id, { ...Object.fromEntries(Object.entries(f).map(([k, val]) => [k, val.trim() || undefined])), ...(f.expiryDate && { expiryDate: dayBounds(f.expiryDate).to }) }),
    onSuccess: () => { toast.success(t('{{vaccineName}} lag gayi', { vaccineName: v.vaccineName })); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open onClose={onClose} size="md" title={t('{{vaccineName}} lagayein', { vaccineName: v.vaccineName })} description={t('{{value}} · due {{dueDate}}', { value: v.patient?.fullName ?? '', dueDate: shortDate(v.dueDate) })}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button disabled={expired} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Syringe className="h-4 w-4" />}>{t('Lag gayi')}</Button></div>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label={t('Batch number')} value={f.batchNumber} onChange={(e) => set('batchNumber', e.target.value)} autoFocus />
        <Input label={t('Company')} value={f.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
        <Input label={t('Expiry')} type="date" value={f.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} error={expired ? t('Expired vaccine nahi lag sakti') : undefined} />
        <Input label={t('Kahan lagi')} value={f.siteAdministered} onChange={(e) => set('siteAdministered', e.target.value)} placeholder={t('Left arm, thigh, mouth')} />
        <Input label={t('Kis ne lagayi')} value={f.administeredBy} onChange={(e) => set('administeredBy', e.target.value)} />
        <Input label={t('Koi reaction')} value={f.adverseReactions} onChange={(e) => set('adverseReactions', e.target.value)} placeholder={t('Bukhar, sujan…')} />
      </div>
    </Modal>
  );
}

export default function VaccinationsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const canManage = usePermission(PERMISSIONS.CLINIC_RECORDS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('OVERDUE');
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [giving, setGiving] = useState<VaccinationRow | null>(null);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef, { n: () => canManage && setAdding(true) });
  useEffect(() => { setPage(1); }, [q, tab, patientId]);
  const { data: fixedPatient = null } = useQuery({ queryKey: ['clinic-patient', patientId], queryFn: () => patientsApi.getOne(patientId), enabled: !!patientId });

  const query = useMemo(() => {
    const week = { from: dayBounds(dayKey()).from, to: dayBounds(dayKey(new Date(Date.now() + 7 * 86_400_000))).to };
    return {
      search: q || undefined, patientId: patientId || undefined, limit: LIMIT,
      ...(tab === 'OVERDUE' && { status: 'OVERDUE' }), ...(tab === 'DUE' && { status: 'DUE', ...week }), ...(tab === 'ADMINISTERED' && { status: 'ADMINISTERED' }),
    };
  }, [q, tab, patientId]);
  const list = useQuery({ queryKey: ['clinic-vaccinations', query, page], queryFn: () => vaccinationsApi.page({ ...query, page }), placeholderData: (p) => p });
  const data = list.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinic-vaccinations'] });
  const delay = useMutation({
    mutationFn: (v: VaccinationRow) => vaccinationsApi.setStatus(v.id, { status: 'DELAYED', dueDate: dayBounds(dayKey(new Date(Date.now() + 7 * 86_400_000))).from, notes: 'Ek hafta aage' }), // i18n-ignore
    onSuccess: () => { toast.success(t('Ek hafta aage kar di')); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  const exportCsv = async () => {
    try {
      const all = await vaccinationsApi.page({ ...query, page: 1, limit: 200 });
      if (!all.items.length) { toast.error(t('Koi record nahi')); return; }
      downloadCsv('vaccines.csv', [[t('Bacha'), 'MR', t('Walida'), t('Phone'), t('Vaccine'), t('Due'), t('Lagi'), t('Status'), t('Batch')],
        ...all.items.map((v) => [v.patient?.fullName, v.patient?.mrn, v.patient?.motherName, v.patient?.phonePrimary, v.vaccineName, v.dueDate.slice(0, 10), v.administeredAt?.slice(0, 10), VACCINE_STATUS[v.status].label, v.batchNumber])]);
    } catch (e) { toast.error(apiError(e, t('File nahi bani'))); }
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Vaccines — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Baby, color: '#2563eb', title: t('EPI schedule'), text: t('Bachay ki paidaish ki tareekh se BCG se Measles-2 tak saari doses ki tareekh khud ban jati hai.') },
            { icon: CalendarClock, color: '#e11d48', title: t('Der ho gayi'), text: t('"Der" tab me jin ki tareekh guzar gayi — phone button se walida ko call karein.') },
            { icon: Syringe, color: '#16a34a', title: t('Lagayein'), text: t('Batch, company aur expiry likhein — expired vaccine nahi lagti.') },
          ]}
          shortcuts={[['/', 'search'], ['N', t('naya schedule')], ['G', 'guide']]} />
      )}
      {adding && <AddModal initial={fixedPatient} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
      {giving && <GiveModal v={giving} onClose={() => setGiving(null)} onSaved={() => { setGiving(null); refresh(); }} />}

      <PageHero title={t('Vaccines')} chip={<><Syringe />{t('{{value}} der se', { value: data?.summary.overdue ?? 0 })}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta={t('EPI aur doosri vaccines ka register')}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t('CSV')}</span></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />{t('Schedule')}</button>}
        </>} />

      <KpiRow cols={3}>
        {list.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CalendarClock} color="#e11d48" label={t('Der ho gayi')} value={data?.summary.overdue ?? 0} onClick={() => setTab('OVERDUE')} active={tab === 'OVERDUE'} />
            <KpiCard icon={TimerReset} color="#2563eb" label={t('Is hafte')} value={data?.summary.thisWeek ?? 0} onClick={() => setTab('DUE')} active={tab === 'DUE'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label={t('30 din me lagi')} value={data?.summary.givenThisMonth ?? 0} onClick={() => setTab('ADMINISTERED')} active={tab === 'ADMINISTERED'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Bachay ka naam, walida, phone, MR ya vaccine…')} />}
        chips={(patientId || q) ? <>
          {patientId && <FilterChip onRemove={() => setPatientId('')}>{fixedPatient?.fullName ?? t('Ek mareez')}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setPatientId(''); }} />

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'OVERDUE', label: t('Der') }, { id: 'DUE', label: t('Is hafte') }, { id: 'ADMINISTERED', label: t('Lag gayi') }, { id: 'all', label: t('Sab') }]} />

      <ListCard>
        {list.isLoading ? <ListLoading /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
          <p className="px-6 py-16 text-center text-[0.875rem] text-slate-500">{t('Is list me kuch nahi. "Schedule" se bachay ka EPI schedule lagayein.')}</p>
        ) : (
          <>
            <Table minWidth="54rem">
              <THead><Tr><Th>{t('Bacha')}</Th><Th>{t('Vaccine')}</Th><Th>{t('Tareekh')}</Th><Th>{t('Status')}</Th><Th align="right" /></Tr></THead>
              <TBody>
                {data.items.map((v) => {
                  const late = (v.status === 'DUE' || v.status === 'DELAYED') && v.dueDate < new Date().toISOString();
                  return (
                    <Tr key={v.id}>
                      <Td>
                        {v.patient ? <Link to={`/clinic/patients/${v.patient.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{v.patient.fullName}</Link> : '—'}
                        <p className="text-[0.75rem] text-slate-500">{[ageOf(v.patient?.dateOfBirth), v.patient?.motherName && `Walida: ${v.patient.motherName}`, v.patient?.mrn].filter(Boolean).join(' · ')}</p>
                      </Td>
                      <Td><p className="font-medium">{v.vaccineName}</p>{v.scheduleName && <p className="text-[0.75rem] text-slate-500">{v.scheduleName}{v.doseNumber != null ? t(' · dose {{doseNumber}}', { doseNumber: v.doseNumber }) : ''}</p>}</Td>
                      <Td className={late ? 'font-semibold text-rose-700' : ''}>{v.administeredAt ? t('Lagi {{administeredAt}}', { administeredAt: shortDate(v.administeredAt) }) : shortDate(v.dueDate)}{v.batchNumber && <p className="text-[0.75rem] font-normal text-slate-500">{t('Batch {{batchNumber}}', { batchNumber: v.batchNumber })}</p>}</Td>
                      <Td><Badge variant={late ? 'danger' : VACCINE_STATUS[v.status].variant}>{late ? t('Der') : VACCINE_STATUS[v.status].label}</Badge></Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          {v.patient?.phonePrimary && v.status !== 'ADMINISTERED' && <a href={`tel:${v.patient.phonePrimary}`} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-100"><Phone className="h-3.5 w-3.5" />{t('Call')}</a>}
                          {canManage && (v.status === 'DUE' || v.status === 'DELAYED') && <Button size="xs" variant="ghost" onClick={() => delay.mutate(v)}>{t('+7 din')}</Button>}
                          {canManage && (v.status === 'DUE' || v.status === 'DELAYED') && <Button size="xs" leftIcon={<Syringe className="h-3.5 w-3.5" />} onClick={() => setGiving(v)}>{t('Lagayein')}</Button>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
            <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
          </>
        )}
      </ListCard>
    </PageShell>
  );
}
