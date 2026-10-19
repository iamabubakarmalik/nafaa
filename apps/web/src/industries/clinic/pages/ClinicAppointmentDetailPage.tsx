/**
 * One visit, start to finish: status (arrived → with doctor → done), the
 * checkup (vitals, notes, diagnosis, follow-up), prescriptions, lab tests,
 * the fee bills, and the patient's earlier visits. Fees are billed as sales;
 * a wrong bill is voided from Sales and the visit updates by itself.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, DoorOpen, FlaskConical, GraduationCap, History, Pill, Plus, Printer, Receipt,
  ShoppingCart, Ticket, UserCheck, Wallet, XCircle,
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi, type AppointmentStatus, type FeePayment } from '../api/appointments.api';
import type { LabOrder } from '../api/lab-orders.api';
import { labOrdersApi } from '../api/lab-orders.api';
import { patientsApi } from '../api/patients.api';
import { prescriptionsApi, type Prescription } from '../api/prescriptions.api';
import { FeePayModal } from '../components/FeePayModal';
import { LabResultsModal, NewLabOrderModal } from '../components/LabModals';
import { RxBuilder } from '../components/RxBuilder';
import { VisitCheckup } from '../components/VisitCheckup';
import { APT_STATUS, LAB_STATUS, PAY_STATUS, apiError, dateTime, drName, patientLine, r2, shortDate, visitLabel } from '../lib/meta';
import { printPrescription, printTokenSlip } from '../lib/print';

type Tab = 'checkup' | 'rx' | 'lab' | 'fees' | 'history';
const KEY = 'clinic-appointment';

export default function ClinicAppointmentDetailPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [tab, setTab] = useState<Tab>('checkup');
  const [paying, setPaying] = useState<'apt' | LabOrder | null>(null);
  const [writingRx, setWritingRx] = useState(false);
  const [newLab, setNewLab] = useState(false);
  const [results, setResults] = useState<LabOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [moving, setMoving] = useState(false);
  const [newTime, setNewTime] = useState('');

  const q = useQuery({ queryKey: [KEY, id], queryFn: () => appointmentsApi.getOne(id), refetchInterval: 30_000 });
  const apt = q.data;
  const history = useQuery({ queryKey: ['clinic-patient-history', apt?.patientId], queryFn: () => patientsApi.history(apt!.patientId), enabled: !!apt && tab === 'history' });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: [KEY, id] });
    qc.invalidateQueries({ queryKey: ['clinic-appointments'] });
    qc.invalidateQueries({ queryKey: ['clinic-queue'] });
  };

  const status = useMutation({
    mutationFn: ({ s, why }: { s: AppointmentStatus; why?: string }) => appointmentsApi.updateStatus(id, s, why),
    onSuccess: (_r, { s }) => { toast.success(APT_STATUS[s].label); setCancelling(false); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Status nahi badla')),
  });
  const move = useMutation({
    mutationFn: () => appointmentsApi.reschedule(id, { scheduledStart: new Date(newTime).toISOString() }),
    onSuccess: () => { toast.success('Waqt badal gaya'); setMoving(false); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const pay = useMutation({
    mutationFn: async (body: FeePayment) => {
      if (paying === 'apt') { const res = await appointmentsApi.addPayment(id, body); return { sale: res.sale, apt: res }; }
      const res = await labOrdersApi.addPayment((paying as LabOrder).id, body);
      return { sale: res.sale, apt: null };
    },
    onSuccess: ({ sale, apt: billed }) => {
      toast.success(`Bill ${sale.saleNumber} ban gaya`);
      if (billed && apt) printTokenSlip({ ...apt, ...billed }, apt.patient, apt.doctor, sale);
      setPaying(null); refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });
  const rxStatus = useMutation({
    mutationFn: (rx: Prescription) => prescriptionsApi.updateStatus(rx.id, 'DISPENSED'),
    onSuccess: () => { toast.success('Dawai de di — nuskha band'); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  if (!apt) {
    return <PageShell><EmptyState title="Appointment nahi mili" description="Ho sakta hai link purana ho." action={<Button onClick={() => navigate('/clinic/appointments')}>Appointments</Button>} /></PageShell>;
  }

  const p = apt.patient;
  const left = r2(apt.total - apt.paidAmount);
  const closed = apt.status === 'CANCELLED' || apt.status === 'NO_SHOW';
  const rxs = apt.encounter?.prescriptions ?? [];
  const labs = apt.encounter?.labOrders ?? [];
  const printRx = (rx: Prescription) => void printPrescription({ rx, patient: p, doctor: apt.doctor, encounter: apt.encounter, vitals: apt.vitals });

  const next: Array<{ s: AppointmentStatus; label: string; icon: typeof DoorOpen }> = (
    ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status) ? [{ s: 'ARRIVED', label: 'Aa gaya', icon: UserCheck }, { s: 'IN_CONSULTATION', label: 'Andar bhejein', icon: DoorOpen }]
      : apt.status === 'ARRIVED' ? [{ s: 'IN_CONSULTATION', label: 'Andar bhejein', icon: DoorOpen }, { s: 'COMPLETED', label: 'Mukammal', icon: CheckCircle2 }]
        : apt.status === 'IN_CONSULTATION' ? [{ s: 'COMPLETED', label: 'Mukammal', icon: CheckCircle2 }] : []) as Array<{ s: AppointmentStatus; label: string; icon: typeof DoorOpen }>;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Visit — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ClipboardList, color: '#0891b2', title: 'Checkup', text: 'Vitals, shikayat, diagnosis aur "Dobara kab aayein" — Ctrl+S se save.' },
            { icon: Pill, color: '#7c3aed', title: 'Nuskha', text: 'Dawai clinic ke stock se chunein to counter par wohi milti hai. Save ke saath A4 print.' },
            { icon: FlaskConical, color: '#d97706', title: 'Lab', text: 'Test likhein, fees lein, sample aur result yahin se; report print.' },
            { icon: Wallet, color: '#16a34a', title: 'Fees', text: 'Har payment ek bill — ghalat ho to Sales me bill void karein; visit khud theek ho jati hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}
      {paying && (
        <FeePayModal title={paying === 'apt' ? `Fees — Token ${apt.tokenNumber ?? '-'}` : `Lab ${(paying as LabOrder).orderNumber}`}
          due={paying === 'apt' ? left : r2((paying as LabOrder).totalCost - (paying as LabOrder).paidAmount)} busy={pay.isPending}
          onClose={() => setPaying(null)} onPay={(b) => pay.mutate(b)} />
      )}
      {writingRx && <RxBuilder appointmentId={apt.id} encounterId={apt.encounter?.id} onClose={() => setWritingRx(false)} onSaved={(rx) => { setWritingRx(false); refresh(); printRx(rx); }} />}
      {newLab && p && <NewLabOrderModal patient={p} doctorId={apt.doctorId} encounterId={apt.encounter?.id} onClose={() => setNewLab(false)} onSaved={() => { setNewLab(false); refresh(); }} />}
      {results && <LabResultsModal order={results} patient={p} doctor={apt.doctor} onClose={() => setResults(null)} onSaved={() => { setResults(null); refresh(); }} />}
      {cancelling && (
        <Modal open onClose={() => setCancelling(false)} size="sm" title="Appointment cancel" description={apt.paidAmount > 0 ? 'Pehle Sales me fees ka bill void karein' : 'Wajah likhein — record me rehti hai'}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCancelling(false)}>Wapas</Button>
            <Button variant="danger" disabled={!reason.trim()} loading={status.isPending} onClick={() => status.mutate({ s: 'CANCELLED', why: reason.trim() })}>Cancel karein</Button></div>}>
          <Input label="Wajah" required autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mareez ne mana kar diya" />
        </Modal>
      )}
      {moving && (
        <Modal open onClose={() => setMoving(false)} size="sm" title="Waqt badlein"
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setMoving(false)}>Wapas</Button><Button disabled={!newTime} loading={move.isPending} onClick={() => move.mutate()}>Save</Button></div>}>
          <Input label="Naya waqt" type="datetime-local" required value={newTime} onChange={(e) => setNewTime(e.target.value)} />
        </Modal>
      )}

      <PageHero
        title={<HeroBack to="/clinic/appointments" label="Appointments">{p?.fullName ?? apt.appointmentNumber}</HeroBack>}
        chip={<><Ticket />Token {apt.tokenNumber ?? '-'}</>}
        meta={`${drName(apt.doctor)} · ${visitLabel(apt.visitType)} · ${dateTime(apt.scheduledStart)}`}
        actions={<>
          <button type="button" onClick={() => printTokenSlip(apt, p, apt.doctor)} className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Token</span></button>
          {rxs[0] && <button type="button" onClick={() => printRx(rxs[0])} className={heroButton}><Pill className="h-4 w-4" /><span className="hidden sm:inline">Nuskha print</span></button>}
          {canManage && !closed && apt.status !== 'COMPLETED' && apt.status !== 'IN_CONSULTATION' && apt.status !== 'ARRIVED' && (
            <button type="button" onClick={() => { setNewTime(''); setMoving(true); }} className={heroButton}><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">Waqt badlein</span></button>
          )}
          {canManage && !closed && apt.status !== 'COMPLETED' && apt.status !== 'IN_CONSULTATION' && (
            <button type="button" onClick={() => { setReason(''); setCancelling(true); }} className={heroButton}><XCircle className="h-4 w-4" /><span className="hidden sm:inline">Cancel</span></button>
          )}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && next.map((n, i) => (
            <button key={n.s} type="button" onClick={() => status.mutate({ s: n.s })} className={i === next.length - 1 ? heroPrimaryButton : heroButton}><n.icon className="h-4 w-4" />{n.label}</button>
          ))}
        </>}
        stats={[
          { label: 'Status', value: APT_STATUS[apt.status].label },
          { label: 'Fees', value: money(apt.total) },
          { label: left > 0 && !closed ? 'Baqi' : 'Bill bana', value: money(left > 0 && !closed ? left : apt.paidAmount) },
        ]} />

      <div className="flex flex-wrap items-center gap-2">
        {p && <Link to={`/clinic/patients/${p.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">{patientLine(p)} · {p.mrn}</Link>}
        {(p?.allergies?.length ?? 0) > 0 && <Badge variant="danger"><AlertTriangle className="mr-1 h-3.5 w-3.5" />Allergy: {p!.allergies.join(', ')}</Badge>}
        {(p?.chronicConditions?.length ?? 0) > 0 && <Badge variant="warning">{p!.chronicConditions.join(', ')}</Badge>}
        {p?.hasInsurance && <Badge variant="info">Panel: {p.insuranceProvider || 'haan'}</Badge>}
        {apt.isEmergency && <Badge variant="danger">Emergency</Badge>}
        {apt.cancellationReason && <Badge variant="default">Cancel: {apt.cancellationReason}</Badge>}
      </div>

      <ViewTabs<Tab> value={tab} onChange={setTab}
        tabs={[
          { id: 'checkup', label: 'Checkup', icon: ClipboardList },
          { id: 'rx', label: 'Nuskha', icon: Pill, count: rxs.length || null },
          { id: 'lab', label: 'Lab', icon: FlaskConical, count: labs.length || null },
          { id: 'fees', label: 'Fees', icon: Wallet, count: apt.bills.length || null },
          { id: 'history', label: 'Purani visits', icon: History },
        ]} />

      {tab === 'checkup' && <VisitCheckup key={apt.updatedAt} apt={apt} canEdit={canManage && !closed} onSaved={refresh} />}

      {tab === 'rx' && (
        <Card title="Nuskhe" description="Save ke baad print; dawai counter par di jaye to 'Dawai de di'"
          actions={canManage && !closed && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setWritingRx(true)}>Nuskha likhein</Button>}>
          {rxs.length === 0 ? <EmptyState icon={<Pill className="h-6 w-6" />} title="Abhi koi nuskha nahi" description="Checkup ke baad dawai likhein — A4 par print hota hai." /> : (
            <ul className="divide-y divide-slate-100">
              {rxs.map((rx) => (
                <li key={rx.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex-1 font-semibold text-slate-900">{rx.prescriptionNumber} · {shortDate(rx.issuedAt)}</p>
                    <Badge variant={rx.status === 'DISPENSED' ? 'success' : rx.status === 'CANCELLED' ? 'danger' : 'info'}>{rx.status === 'DISPENSED' ? 'Dawai de di' : rx.status === 'CANCELLED' ? 'Cancel' : 'Chalu'}</Badge>
                    <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printRx(rx)}>Print</Button>
                    {canBill && rx.status === 'ACTIVE' && <Link to="/pos" className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><ShoppingCart className="h-4 w-4" />Counter</Link>}
                    {canManage && rx.status === 'ACTIVE' && <Button size="sm" variant="ghost" loading={rxStatus.isPending} onClick={() => rxStatus.mutate(rx)}>Dawai de di</Button>}
                  </div>
                  <ol className="mt-2 space-y-1 text-[0.875rem] text-slate-700">
                    {rx.items.map((it, i) => <li key={it.id ?? i}>{i + 1}. <b>{[it.form, it.drugName, it.strength].filter(Boolean).join(' ')}</b> — {[it.dose, it.frequency, it.durationDays ? `${it.durationDays} din` : null, it.afterMeal ? 'khane ke baad' : it.beforeMeal ? 'khane se pehle' : null].filter(Boolean).join(' · ')}</li>)}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'lab' && (
        <Card title="Lab tests" description="Fees, sample, result aur report — sab yahin"
          actions={canManage && !closed && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewLab(true)}>Test likhein</Button>}>
          {labs.length === 0 ? <EmptyState icon={<FlaskConical className="h-6 w-6" />} title="Koi test nahi likha" /> : (
            <Table minWidth="44rem">
              <THead><Tr><Th>Order</Th><Th>Test</Th><Th>Status</Th><Th align="right">Fees</Th><Th align="right" /></Tr></THead>
              <TBody>
                {labs.map((o) => {
                  const due = r2(o.totalCost - o.paidAmount);
                  return (
                    <Tr key={o.id}>
                      <Td className="whitespace-nowrap font-semibold text-slate-900">{o.orderNumber}</Td>
                      <Td className="max-w-xs">{o.tests.map((t) => <span key={t.id} className={t.isAbnormal || t.isCritical ? 'font-semibold text-rose-700' : ''}>{t.testName}{t.result ? `: ${t.result}` : ''}; </span>)}</Td>
                      <Td><Badge variant={LAB_STATUS[o.status].variant}>{LAB_STATUS[o.status].label}</Badge></Td>
                      <Td align="right"><p>{money(o.totalCost)}</p>{due > 0 && o.status !== 'CANCELLED' && <p className="text-[0.75rem] text-amber-700">{money(due)} baqi</p>}</Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          {canBill && due > 0 && o.status !== 'CANCELLED' && <Button size="xs" variant="secondary" onClick={() => setPaying(o)}>Fees</Button>}
                          {canManage && o.status !== 'CANCELLED' && <Button size="xs" onClick={() => setResults(o)}>Result</Button>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      {tab === 'fees' && (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Card title="Hisaab">
            <dl className="space-y-2 px-4 pb-4 text-[0.875rem] sm:px-5 sm:pb-5">
              <div className="flex justify-between"><dt className="text-slate-500">Consultation</dt><dd className="tabular-nums">{money(apt.consultationFee)}</dd></div>
              {apt.otherCharges > 0 && <div className="flex justify-between"><dt className="text-slate-500">Doosre charges</dt><dd className="tabular-nums">{money(apt.otherCharges)}</dd></div>}
              {apt.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">-{money(apt.discount)}</dd></div>}
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold"><dt>Kul</dt><dd className="tabular-nums">{money(apt.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Bill bana</dt><dd className="tabular-nums">{money(apt.paidAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Baqi</dt><dd className="font-semibold tabular-nums text-amber-700">{money(closed ? 0 : left)}</dd></div>
              {apt.total > 0 && <Badge variant={PAY_STATUS[apt.paymentStatus]?.variant ?? 'default'}>{PAY_STATUS[apt.paymentStatus]?.label ?? apt.paymentStatus}</Badge>}
              {canBill && left > 0 && !closed && <Button fullWidth leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setPaying('apt')}>Fees lein</Button>}
            </dl>
          </Card>
          <Card title="Bill" description="Ghalat bill Sales me void karein — yahan baqi khud wapas aa jata hai">
            {apt.bills.length === 0 ? <EmptyState icon={<Receipt className="h-6 w-6" />} title="Abhi koi bill nahi" /> : (
              <Table>
                <THead><Tr><Th>Bill</Th><Th>Kab</Th><Th>Status</Th><Th align="right">Amount</Th><Th align="right">Khata</Th></Tr></THead>
                <TBody>
                  {apt.bills.map((b) => (
                    <Tr key={b.id}>
                      <Td><Link to={`/sales?search=${encodeURIComponent(b.saleNumber)}`} className="font-semibold text-brand-700 hover:underline">{b.saleNumber}</Link></Td>
                      <Td>{dateTime(b.createdAt)}</Td>
                      <Td><Badge variant={b.status === 'VOIDED' ? 'danger' : 'success'}>{b.status === 'VOIDED' ? 'Void' : 'Theek'}</Badge></Td>
                      <Td align="right">{money(b.amount)}</Td>
                      <Td align="right">{b.creditAmount > 0 ? money(b.creditAmount) : '—'}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card title="Pichhli visits" description={p ? `${p.fullName} ki ${p.totalVisits} visits` : undefined}
          actions={p && <Link to={`/clinic/patients/${p.id}`} className="text-[0.8125rem] font-semibold text-brand-700">Poora record →</Link>}>
          {history.isLoading ? <div className="p-4"><Skeleton className="h-24 rounded-xl" /></div> : (
            <ul className="divide-y divide-slate-100">
              {(history.data?.appointments ?? []).filter((a) => a.id !== apt.id).slice(0, 15).map((a) => (
                <li key={a.id}>
                  <Link to={`/clinic/appointments/${a.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <span className="w-28 text-[0.8125rem] font-semibold text-slate-900">{shortDate(a.scheduledStart)}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] text-slate-700">{a.encounter?.finalDiagnosis || a.encounter?.provisionalDiagnosis || a.chiefComplaint || visitLabel(a.visitType)}</span>
                    {a.vitals?.bpSystolic && <span className="text-[0.75rem] text-slate-500">BP {a.vitals.bpSystolic}/{a.vitals.bpDiastolic}</span>}
                    <Badge size="xs" variant={APT_STATUS[a.status].variant}>{APT_STATUS[a.status].label}</Badge>
                  </Link>
                </li>
              ))}
              {(history.data?.appointments ?? []).length <= 1 && <li className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">Ye pehli visit hai</li>}
            </ul>
          )}
        </Card>
      )}
    </PageShell>
  );
}
