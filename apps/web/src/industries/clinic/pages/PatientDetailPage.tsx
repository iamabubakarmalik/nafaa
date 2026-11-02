/**
 * One patient's record: profile and alerts, every visit with diagnosis,
 * prescriptions (reprint), lab results, vaccines, the vitals trend, dental,
 * antenatal and physio records, the panel that pays, and the khata balance
 * with a link to the customer's khata page.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, AlertTriangle, Baby, BookOpen, CalendarPlus, Dumbbell, FlaskConical, GraduationCap, History, Pencil, Pill, Power, Printer, Smile, Syringe } from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { patientsApi } from '../api/patients.api';
import { LabResultsModal } from '../components/LabModals';
import { PatientFormModal } from '../components/PatientFormModal';
import { AncRecords, DentalRecords, PhysioRecords } from '../components/SpecialtyRecords';
import type { LabOrder } from '../api/lab-orders.api';
import { APT_STATUS, LAB_STATUS, VACCINE_STATUS, ageOf, apiError, bloodLabel, drName, genderLabel, shortDate, visitLabel } from '../lib/meta';
import { printLabReport, printPrescription } from '../lib/print';
import { t as tr } from '@core/i18n';

type Tab = 'visits' | 'rx' | 'lab' | 'vaccines' | 'vitals' | 'dental' | 'anc' | 'physio';

export default function PatientDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canManage = usePermission(PERMISSIONS.CLINIC_RECORDS_MANAGE);
  const [tab, setTab] = useState<Tab>('visits');
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<LabOrder | null>(null);

  const q = useQuery({ queryKey: ['clinic-patient-history', id], queryFn: () => patientsApi.history(id) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['clinic-patient-history', id] }); qc.invalidateQueries({ queryKey: ['clinic-patients'] }); };
  const toggle = useMutation({
    mutationFn: () => patientsApi.update(id, { isActive: !q.data!.patient.isActive }),
    onSuccess: (p) => { toast.success(p.isActive ? tr('Record phir chalu') : tr('Record band — history mehfooz hai')); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  if (!q.data) return <PageShell><EmptyState title={tr('Mareez nahi mila')} action={<Button onClick={() => navigate('/clinic/patients')}>{tr('Mareez')}</Button>} /></PageShell>;

  const { patient: p, appointments, prescriptions, labOrders, vaccinations, vitalsHistory, customer, doctors, panel } = q.data;
  const doc = (docId: string) => doctors.find((d) => d.id === docId) ?? null;
  const encById = new Map(appointments.filter((a) => a.encounter).map((a) => [a.encounter!.id, a]));
  const facts: Array<[string, string | undefined | null]> = [
    [tr('MR No.'), p.mrn], [tr('Umar'), ageOf(p.dateOfBirth)], [tr('Jins'), genderLabel(p.gender)], [tr('Phone'), p.phonePrimary], ['CNIC', p.cnic],
    [tr('Walid / shohar'), p.fatherOrHusbandName], [tr('Blood group'), bloodLabel(p.bloodGroup)], [tr('Pata'), [p.address, p.city].filter(Boolean).join(', ')],
    [tr('Emergency'), [p.emergencyContactName, p.emergencyContactPhone].filter(Boolean).join(' · ')], [tr('Panel'), panel ? [panel.name, p.insuranceNumber].filter(Boolean).join(' · ') + (panel.isActive ? '' : ' (band)') : p.hasInsurance ? [p.insuranceProvider, p.insuranceNumber].filter(Boolean).join(' · ') || tr('Haan') : null],
    [tr('Register'), shortDate(p.registeredAt)],
  ];

  return (
    <PageShell>
      {editing && <PatientFormModal patient={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
      {results && <LabResultsModal order={results} patient={p} doctor={doc(results.doctorId)} onClose={() => setResults(null)} onSaved={() => { setResults(null); refresh(); }} />}
      {guide.isOpen && (
        <PageGuide title={tr('Mareez ka record')} onClose={guide.close}
          steps={[
            { icon: History, color: '#2563eb', title: tr('Visits'), text: tr('Har visit ki diagnosis aur vitals — row dabayein to poori visit khulti hai.') },
            { icon: Pill, color: '#7c3aed', title: tr('Nuskhe'), text: tr('Purana nuskha dobara print — mareez kho de to.') },
            { icon: FlaskConical, color: '#d97706', title: tr('Lab'), text: tr('Saare test aur result; ghair-mamooli laal me.') },
            { icon: BookOpen, color: '#16a34a', title: tr('Khata'), text: tr('Mareez ka udhaar aur bill — Khata button se poora hisaab.') },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero title={<HeroBack to="/clinic/patients" label={tr('Mareez')}>{p.fullName}</HeroBack>} chip={<>{p.mrn}</>}
        meta={[ageOf(p.dateOfBirth), genderLabel(p.gender), p.phonePrimary].filter(Boolean).join(' · ')}
        actions={<>
          {customer && <Link to={`/customers/${customer.id}`} className={heroButton}><BookOpen className="h-4 w-4" />{tr('Khata')}</Link>}
          {canEdit && <button type="button" onClick={() => setEditing(true)} className={heroButton}><Pencil className="h-4 w-4" />{tr('Badlein')}</button>}
          {canEdit && <button type="button" onClick={() => toggle.mutate()} className={heroButton}><Power className="h-4 w-4" />{p.isActive ? tr('Band') : tr('Chalu')}</button>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to={`/clinic/appointments/new?patient=${p.id}`} className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" />{tr('Token dein')}</Link>
        </>}
        stats={[
          { label: tr('Visits'), value: String(p.totalVisits) },
          { label: tr('Aakhri visit'), value: p.lastVisitAt ? shortDate(p.lastVisitAt) : '—' },
          { label: tr('Khata'), value: money(customer?.balance ?? 0) },
        ]} />

      {(p.allergies.length > 0 || p.chronicConditions.length > 0 || p.currentMedications.length > 0 || !p.isActive) && (
        <div className="flex flex-wrap gap-2">
          {!p.isActive && <Badge variant="default">{tr('Record band hai')}</Badge>}
          {p.allergies.length > 0 && <Badge variant="danger"><AlertTriangle className="me-1 h-3.5 w-3.5" />{tr('Allergy: {{value}}', { value: p.allergies.join(', ') })}</Badge>}
          {p.chronicConditions.length > 0 && <Badge variant="warning">{tr('Bimari: {{value}}', { value: p.chronicConditions.join(', ') })}</Badge>}
          {p.currentMedications.length > 0 && <Badge variant="info">{tr('Dawai: {{value}}', { value: p.currentMedications.join(', ') })}</Badge>}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card title={tr('Profile')}>
          <dl className="space-y-2 px-4 pb-4 text-[0.875rem] sm:px-5 sm:pb-5">
            {facts.filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-end font-medium text-slate-900">{v}</dd></div>)}
            {p.notes && <p className="rounded-lg bg-slate-50 p-2 text-[0.8125rem] text-slate-600">{p.notes}</p>}
          </dl>
        </Card>

        <div className="space-y-4">
          <ViewTabs<Tab> value={tab} onChange={setTab}
            tabs={[
              { id: 'visits', label: tr('Visits'), icon: History, count: appointments.length },
              { id: 'rx', label: tr('Nuskhe'), icon: Pill, count: prescriptions.length },
              { id: 'lab', label: tr('Lab'), icon: FlaskConical, count: labOrders.length },
              { id: 'vaccines', label: tr('Vaccines'), icon: Syringe, count: vaccinations.length },
              { id: 'vitals', label: tr('Vitals'), icon: Activity, count: vitalsHistory.length },
              { id: 'dental', label: tr('Daant'), icon: Smile },
              ...(p.gender !== 'MALE' ? [{ id: 'anc' as const, label: tr('Hamal (ANC)'), icon: Baby }] : []),
              { id: 'physio', label: tr('Physio'), icon: Dumbbell },
            ]} />

          <Card>
            {tab === 'dental' && <DentalRecords patientId={p.id} canManage={canManage} />}
            {tab === 'anc' && <AncRecords patientId={p.id} canManage={canManage} />}
            {tab === 'physio' && <PhysioRecords patientId={p.id} canManage={canManage} />}
            {tab === 'visits' && (appointments.length === 0 ? <EmptyState title={tr('Abhi koi visit nahi')} /> : (
              <Table minWidth="44rem">
                <THead><Tr><Th>{tr('Tareekh')}</Th><Th>{tr('Doctor')}</Th><Th>{tr('Diagnosis')}</Th><Th>{tr('Status')}</Th><Th align="right">{tr('Fees')}</Th></Tr></THead>
                <TBody>
                  {appointments.map((a) => (
                    <Tr key={a.id} interactive onClick={() => navigate(`/clinic/appointments/${a.id}`)}>
                      <Td className="whitespace-nowrap font-semibold text-slate-900">{shortDate(a.scheduledStart)}</Td>
                      <Td>{drName(doc(a.doctorId))}<p className="text-[0.75rem] text-slate-500">{visitLabel(a.visitType)}</p></Td>
                      <Td className="max-w-xs truncate">{a.encounter?.finalDiagnosis || a.encounter?.provisionalDiagnosis || a.chiefComplaint || '—'}</Td>
                      <Td><Badge size="xs" variant={APT_STATUS[a.status].variant}>{APT_STATUS[a.status].label}</Badge></Td>
                      <Td align="right">{money(a.total)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            ))}
            {tab === 'rx' && (prescriptions.length === 0 ? <EmptyState title={tr('Koi nuskha nahi')} /> : (
              <ul className="divide-y divide-slate-100">
                {prescriptions.map((rx) => {
                  const a = encById.get(rx.encounterId);
                  return (
                    <li key={rx.id} className="px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="flex-1 font-semibold text-slate-900">{rx.prescriptionNumber} · {shortDate(rx.issuedAt)} · {drName(doc(rx.doctorId))}</p>
                        <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => void printPrescription({ rx, patient: p, doctor: doc(rx.doctorId), encounter: a?.encounter, vitals: a?.vitals })}>{tr('Print')}</Button>
                      </div>
                      <p className="mt-1 text-[0.8125rem] text-slate-600">{rx.items.map((it) => [it.drugName, it.strength, it.frequency].filter(Boolean).join(' ')).join(' · ')}</p>
                    </li>
                  );
                })}
              </ul>
            ))}
            {tab === 'lab' && (labOrders.length === 0 ? <EmptyState title={tr('Koi test nahi')} /> : (
              <Table minWidth="44rem">
                <THead><Tr><Th>{tr('Order')}</Th><Th>{tr('Result')}</Th><Th>{tr('Status')}</Th><Th align="right" /></Tr></THead>
                <TBody>
                  {labOrders.map((o) => (
                    <Tr key={o.id}>
                      <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{o.orderNumber}</p><p className="text-[0.75rem] text-slate-500">{shortDate(o.orderedAt)}</p></Td>
                      <Td className="max-w-md">{o.tests.map((t) => <span key={t.id} className={t.isAbnormal || t.isCritical ? 'font-semibold text-rose-700' : ''}>{t.testName}: {t.result ?? 'baqi'}{t.unit ? ` ${t.unit}` : ''}; </span>)}</Td>
                      <Td><Badge size="xs" variant={LAB_STATUS[o.status].variant}>{LAB_STATUS[o.status].label}</Badge></Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          <Button size="xs" variant="secondary" onClick={() => void printLabReport(o, p, doc(o.doctorId))}>{tr('Print')}</Button>
                          {canManage && o.status !== 'CANCELLED' && <Button size="xs" onClick={() => setResults(o)}>{tr('Result')}</Button>}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            ))}
            {tab === 'vaccines' && (vaccinations.length === 0 ? (
              <EmptyState title={tr('Koi vaccine record nahi')} action={<Link to={`/clinic/vaccinations?patient=${p.id}`} className="text-[0.875rem] font-semibold text-brand-700">{tr('Vaccine register →')}</Link>} />
            ) : (
              <Table>
                <THead><Tr><Th>{tr('Vaccine')}</Th><Th>{tr('Due')}</Th><Th>{tr('Lagi')}</Th><Th>{tr('Status')}</Th></Tr></THead>
                <TBody>
                  {vaccinations.map((v) => (
                    <Tr key={v.id}>
                      <Td className="font-semibold text-slate-900">{v.vaccineName}</Td>
                      <Td>{shortDate(v.dueDate)}</Td>
                      <Td>{v.administeredAt ? shortDate(v.administeredAt) : '—'}</Td>
                      <Td><Badge size="xs" variant={VACCINE_STATUS[v.status].variant}>{VACCINE_STATUS[v.status].label}</Badge></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            ))}
            {tab === 'vitals' && (vitalsHistory.length === 0 ? <EmptyState title={tr('Vitals nahi liye gaye')} /> : (
              <Table minWidth="40rem">
                <THead><Tr><Th>{tr('Tareekh')}</Th><Th align="right">{tr('BP')}</Th><Th align="right">{tr('Pulse')}</Th><Th align="right">{tr('Bukhar')}</Th><Th align="right">{tr('SpO2')}</Th><Th align="right">{tr('Wazan')}</Th><Th align="right">{tr('Sugar')}</Th></Tr></THead>
                <TBody>
                  {vitalsHistory.map((v) => (
                    <Tr key={v.id}>
                      <Td>{shortDate(v.recordedAt)}</Td>
                      <Td align="right">{v.bpSystolic ? `${v.bpSystolic}/${v.bpDiastolic ?? '-'}` : '—'}</Td>
                      <Td align="right">{v.pulseRate ?? '—'}</Td>
                      <Td align="right">{v.temperatureF ? tr('{{temperatureF}}°F', { temperatureF: v.temperatureF }) : '—'}</Td>
                      <Td align="right">{v.spo2 ? `${v.spo2}%` : '—'}</Td>
                      <Td align="right">{v.weightKg ? tr('{{weightKg}} kg', { weightKg: v.weightKg }) : '—'}</Td>
                      <Td align="right">{v.bloodSugar ?? '—'}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            ))}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
