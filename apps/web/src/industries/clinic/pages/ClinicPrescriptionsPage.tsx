/**
 * Prescriptions written at this clinic: search by patient, MR, number or
 * medicine; filter by doctor and period; reprint on A4; mark as given when
 * the medicine leaves the clinic counter.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileText, GraduationCap, Pill, Printer, ShoppingCart, Stethoscope } from 'lucide-react';
import {
  Badge, Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { doctorsApi } from '../api/doctors.api';
import { prescriptionsApi, type Prescription, type PrescriptionRow } from '../api/prescriptions.api';
import { ListCard, ListFailed, ListLoading, Pager } from '../components/ListBits';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { apiError, dayBounds, drName, patientLine, shortDate } from '../lib/meta';
import { printPrescription } from '../lib/print';
import { t } from '@core/i18n';

type Tab = 'all' | 'ACTIVE' | 'DISPENSED' | 'CANCELLED';
const LIMIT = 30;
const STATUS: Record<Prescription['status'], { label: string; variant: 'info' | 'success' | 'danger' | 'default' }> = {
  DRAFT: { label: t('Kaccha'), variant: 'default' }, ACTIVE: { label: t('Chalu'), variant: 'info' }, DISPENSED: { label: t('Dawai de di'), variant: 'success' },
  EXPIRED: { label: t('Purana'), variant: 'default' }, CANCELLED: { label: t('Cancel'), variant: 'danger' },
};

export default function ClinicPrescriptionsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.CLINIC_RECORDS_MANAGE);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  usePageKeys(searchRef);
  useEffect(() => { setPage(1); }, [q, doctorId, range, tab]);

  const { data: doctors = [] } = useQuery({ queryKey: ['clinic-doctors', 'all'], queryFn: () => doctorsApi.list() });
  const params = useMemo(() => {
    const r = resolveRange(range, 0);
    return {
      search: q || undefined, doctorId: doctorId || undefined, status: tab === 'all' ? undefined : tab, limit: LIMIT,
      ...(r && { from: r.from === 'all' ? undefined : dayBounds(r.from).from, to: dayBounds(r.to).to }),
    };
  }, [q, doctorId, range, tab]);
  const list = useQuery({ queryKey: ['clinic-prescriptions', params, page], queryFn: () => prescriptionsApi.page({ ...params, page }), placeholderData: (p) => p });
  const data = list.data;

  const give = useMutation({
    mutationFn: (rx: PrescriptionRow) => prescriptionsApi.updateStatus(rx.id, 'DISPENSED'),
    onSuccess: () => { toast.success(t('Dawai de di')); qc.invalidateQueries({ queryKey: ['clinic-prescriptions'] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const print = (rx: PrescriptionRow) => void printPrescription({ rx, patient: rx.patient ? { ...rx.patient, mrn: rx.patient.mrn } : null, doctor: rx.doctor, encounter: rx.encounter });

  const exportCsv = async () => {
    try {
      const all = await prescriptionsApi.page({ ...params, page: 1, limit: 200 });
      if (!all.items.length) { toast.error(t('Koi nuskha nahi')); return; }
      downloadCsv('prescriptions.csv', [[t('Number'), t('Tareekh'), t('Mareez'), 'MR', t('Doctor'), t('Diagnosis'), t('Dawaiyan'), t('Status')],
        ...all.items.map((r) => [r.prescriptionNumber, r.issuedAt.slice(0, 10), r.patient?.fullName, r.patient?.mrn, drName(r.doctor), r.encounter?.finalDiagnosis || r.encounter?.provisionalDiagnosis,
          r.items.map((i) => [i.drugName, i.strength, i.frequency].filter(Boolean).join(' ')).join('; '), STATUS[r.status].label])]);
    } catch (e) { toast.error(apiError(e, t('File nahi bani'))); }
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Nuskhe — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: FileText, color: '#7c3aed', title: t('Kahan likhein'), text: t('Nuskha visit page ke "Nuskha" tab me likha jata hai; yahan sab nuskhe ek jagah.') },
            { icon: Printer, color: '#2563eb', title: t('Dobara print'), text: t('Mareez parchi kho de to yahin se A4 print.') },
            { icon: ShoppingCart, color: '#16a34a', title: t('Dawai dena'), text: t('Counter par dawai bechein (mareez ke naam se), phir "Dawai de di" lagayein.') },
          ]}
          shortcuts={[['/', 'search'], ['G', 'guide']]} />
      )}
      <PageHero title={t('Nuskhe')} chip={<><Pill />{data?.total ?? 0}</>} busy={list.isFetching && !list.isLoading} loading={list.isLoading}
        meta={t('Doctors ke likhe nuskhe')}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t('CSV')}</span></button>
          {canSell && <Link to="/pos" className={heroButton}><ShoppingCart className="h-4 w-4" /><span className="hidden sm:inline">{t('Counter')}</span></Link>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>} />

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Mareez, MR, nuskha number ya dawai…')} />}
        chips={(doctorId || q) ? <>
          {doctorId && <FilterChip onRemove={() => setDoctorId('')}>{drName(doctors.find((d) => d.id === doctorId))}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setDoctorId(''); }}>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} defaultPreset="month" />
        <FilterMenu icon={Stethoscope} label={t('Doctor')} value={doctorId || 'all'} active={!!doctorId} onChange={(v) => setDoctorId(v === 'all' ? '' : v)} align="right"
          options={[{ value: 'all', label: t('Sab doctors') }, ...doctors.map((d) => ({ value: d.id, label: drName(d) }))]} />
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'all', label: t('Sab') }, { id: 'ACTIVE', label: t('Chalu') }, { id: 'DISPENSED', label: t('Dawai de di') }, { id: 'CANCELLED', label: t('Cancel') }]} />

      <ListCard>
        {list.isLoading ? <ListLoading /> : list.isError ? <ListFailed onRetry={() => list.refetch()} /> : !data?.items.length ? (
          <p className="px-6 py-16 text-center text-[0.875rem] text-slate-500">{t('Is filter me koi nuskha nahi. Nuskha visit page se likha jata hai.')}</p>
        ) : (
          <>
            <Table minWidth="58rem">
              <THead><Tr><Th>{t('Nuskha')}</Th><Th>{t('Mareez')}</Th><Th>{t('Doctor / diagnosis')}</Th><Th>{t('Dawaiyan')}</Th><Th>{t('Status')}</Th><Th align="right" /></Tr></THead>
              <TBody>
                {data.items.map((rx) => (
                  <Tr key={rx.id}>
                    <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{rx.prescriptionNumber}</p><p className="text-[0.75rem] text-slate-500">{shortDate(rx.issuedAt)}</p></Td>
                    <Td>{rx.patient ? <Link to={`/clinic/patients/${rx.patient.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{patientLine(rx.patient)}</Link> : '—'}<p className="text-[0.75rem] text-slate-500">{rx.patient?.mrn}</p></Td>
                    <Td><p>{drName(rx.doctor)}</p><p className="max-w-[14rem] truncate text-[0.75rem] text-slate-500">{rx.encounter?.finalDiagnosis || rx.encounter?.provisionalDiagnosis || ''}</p></Td>
                    <Td className="max-w-xs"><p className="truncate">{rx.items.map((i) => [i.drugName, i.strength].filter(Boolean).join(' ')).join(', ')}</p><p className="text-[0.75rem] text-slate-500">{t('{{totalItems}} dawai', { totalItems: rx.totalItems })}</p></Td>
                    <Td><Badge variant={STATUS[rx.status].variant}>{STATUS[rx.status].label}</Badge></Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="secondary" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => print(rx)}>{t('Print')}</Button>
                        {canManage && rx.status === 'ACTIVE' && <Button size="xs" variant="ghost" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} loading={give.isPending && give.variables?.id === rx.id} onClick={() => give.mutate(rx)}>{t('Dawai de di')}</Button>}
                        {rx.encounter && <Link to={`/clinic/appointments/${rx.encounter.appointmentId}`} className="inline-flex h-7 items-center rounded-lg px-2 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50">{t('Visit')}</Link>}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />
          </>
        )}
      </ListCard>
    </PageShell>
  );
}
