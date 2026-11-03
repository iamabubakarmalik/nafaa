/**
 * One visit (web ClinicAppointmentDetailPage): the next step (arrived, call in,
 * finish), vitals, the doctor's notes, prescription, lab order, and the fee
 * (part payment leaves the rest on the patient's khata).
 */

import { useQuery } from '@tanstack/react-query';
import { Banknote, FlaskConical, HeartPulse, NotebookPen, Pill, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { feeDue, feePayBody, visitNext } from '@nafaa/core/industries/clinic';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Row, Sheet, StatusPill, Text, confirm, toast } from '@/design';
import { PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { FormSheet, clean } from '../../_shared/serviceKit';
import { clinicApi } from '../api';
import { APT_STATUS, CLINIC_KEYS, FREQUENCIES, dateOf, doctorName, refreshClinic, visitTypeLabel } from '../meta';

export function VisitSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const can = usePermission();
  const manage = can(P.SERVICE_BOOKINGS_MANAGE);
  const records = can(P.CLINIC_RECORDS_MANAGE);
  const bill = can(P.POS_USE);
  const { guard } = useDeskOnline('clinicDesk');
  const q = useQuery({ queryKey: [CLINIC_KEYS.appointments, 'one', id], queryFn: () => clinicApi.appointments.getOne(id!), enabled: !!id });
  const a = q.data;
  const [sub, setSub] = useState<'vitals' | 'notes' | 'rx' | 'lab' | 'fee' | null>(null);
  const reload = () => { refreshClinic(true); void q.refetch(); };
  const step = a ? visitNext(a.status) : null;
  const move = async (status: Parameters<typeof clinicApi.appointments.status>[1], reason?: string) => { try { await clinicApi.appointments.status(id!, status, reason); reload(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const next = step === 'arrive' ? { label: t('Aa gaye'), status: 'ARRIVED' as const } : step === 'call' ? { label: t('Andar bulayein'), status: 'IN_CONSULTATION' as const } : step === 'finish' ? { label: t('Visit khatam'), status: 'COMPLETED' as const } : null;
  const due = a ? feeDue(a) : 0;
  const cancel = async () => { if (await confirm({ title: t('Visit cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') })) await move('CANCELLED', t('Cancel')); };
  const open = (s: NonNullable<typeof sub>) => guard(() => setSub(s));
  const enc = a?.encounter;
  const clinical = !!a && ['ARRIVED', 'IN_CONSULTATION', 'COMPLETED'].includes(a.status);
  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={a?.patient?.fullName ?? t('Visit')} description={a ? `${a.tokenNumber ? `${t('Token')} ${a.tokenNumber} · ` : ''}${a.patient?.mrn ?? ''} · ${doctorName(a.doctor)}` : undefined}
        footer={a && manage ? (
          <Row gap={2}>
            {next && <Button style={{ flex: 1 }} onPress={() => guard(() => void move(next.status))}>{next.label}</Button>}
            {due > 0 && bill && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW' && <Button style={{ flex: 1 }} variant={next ? 'secondary' : 'primary'} icon={Banknote} onPress={() => open('fee')}>{t('Fee lein')}</Button>}
            {step === 'arrive' && <Button variant="ghost" icon={XCircle} onPress={() => guard(() => void cancel())}>{t('Cancel')}</Button>}
          </Row>
        ) : undefined}>
        {a && (
          <View style={{ gap: 4 }}>
            <Row gap={2}><StatusPill tone={APT_STATUS[a.status].tone}>{t(APT_STATUS[a.status].label)}</StatusPill><Badge tone={a.isEmergency ? 'danger' : 'neutral'}>{a.isEmergency ? t('Emergency') : visitTypeLabel(a.visitType)}</Badge></Row>
            {a.patient?.allergies?.length ? <Text size="sm" tone="danger">{`${t('Allergy')}: ${a.patient.allergies.join(', ')}`}</Text> : null}
            {a.chiefComplaint ? <DetailRow label={t('Shikayat')} value={a.chiefComplaint} /> : null}
            <DetailRow label={t('Consultation fee')} value={<Text ltr>{formatMoney(a.consultationFee)}</Text>} />
            {a.otherCharges > 0 && <DetailRow label={t('Aur charges')} value={<Text ltr>{formatMoney(a.otherCharges)}</Text>} />}
            {a.discount > 0 && <DetailRow label={t('Discount')} value={<Text ltr>−{formatMoney(a.discount)}</Text>} />}
            <DetailRow label={t('Total')} value={<Text weight="bold" ltr>{formatMoney(a.total)}</Text>} />
            <DetailRow label={t('Mil gaye')} value={<Text ltr>{formatMoney(a.paidAmount)}</Text>} last />
            {a.vitals && <DetailRow label={t('Vitals')} value={<Text size="sm" ltr>{[a.vitals.bpSystolic && `${a.vitals.bpSystolic}/${a.vitals.bpDiastolic}`, a.vitals.pulseRate && `${a.vitals.pulseRate} bpm`, a.vitals.temperatureC && `${a.vitals.temperatureC}°C`, a.vitals.spo2 && `SpO₂ ${a.vitals.spo2}%`].filter(Boolean).join(' · ') || '—'}</Text>} />}
            {enc?.finalDiagnosis || enc?.provisionalDiagnosis ? <DetailRow label={t('Diagnosis')} value={enc.finalDiagnosis ?? enc.provisionalDiagnosis ?? ''} /> : null}
            {enc?.advice ? <DetailRow label={t('Mashwara')} value={enc.advice} /> : null}
            {enc?.followUpDate ? <DetailRow label={t('Agli visit')} value={dateOf(enc.followUpDate)} /> : null}
            {(enc?.prescriptions ?? []).map((p) => <DetailRow key={p.id} label={`${t('Nuskha')} ${p.prescriptionNumber}`} value={p.items.map((i) => i.drugName).join(', ')} />)}
            {(enc?.labOrders ?? []).map((l) => <DetailRow key={l.id} label={`${t('Lab')} ${l.orderNumber}`} value={l.tests.map((x) => x.testName).join(', ')} />)}
            {records && clinical && (
              <Row gap={2} style={{ flexWrap: 'wrap', marginTop: 8 }}>
                <Button size="sm" variant="soft" icon={HeartPulse} onPress={() => open('vitals')}>{t('Vitals')}</Button>
                <Button size="sm" variant="soft" icon={NotebookPen} onPress={() => open('notes')}>{t('Doctor ke notes')}</Button>
                {enc && <Button size="sm" variant="soft" icon={Pill} onPress={() => open('rx')}>{t('Nuskha')}</Button>}
                {enc && <Button size="sm" variant="soft" icon={FlaskConical} onPress={() => open('lab')}>{t('Lab test')}</Button>}
              </Row>
            )}
          </View>
        )}
      </Sheet>
      {a && (
        <>
          <FormSheet open={sub === 'vitals'} title={t('Vitals')} onClose={() => setSub(null)} initial={a.vitals ? { ...a.vitals } : {}}
            fields={[{ key: 'bpSystolic', label: t('BP upar'), kind: 'number' }, { key: 'bpDiastolic', label: t('BP neeche'), kind: 'number' }, { key: 'pulseRate', label: t('Pulse'), kind: 'number' }, { key: 'temperatureC', label: t('Bukhar (°C)'), kind: 'number' }, { key: 'spo2', label: 'SpO₂ %', kind: 'number' }, { key: 'bloodSugar', label: t('Sugar'), kind: 'number' }, { key: 'weightKg', label: t('Wazan (kg)'), kind: 'number' }, { key: 'heightCm', label: t('Qad (cm)'), kind: 'number' }]}
            onSubmit={async (v) => { await clinicApi.vitals.record(a.id, clean(v)); reload(); toast.success(t('Vitals likh diye')); }} />
          <FormSheet open={sub === 'notes'} title={t('Doctor ke notes')} onClose={() => setSub(null)} initial={enc ? { ...enc } : {}}
            fields={[{ key: 'subjective', label: t('Shikayat / history'), kind: 'multiline' }, { key: 'provisionalDiagnosis', label: t('Shuruati diagnosis') }, { key: 'finalDiagnosis', label: t('Diagnosis') }, { key: 'advice', label: t('Mashwara'), kind: 'multiline' }, { key: 'followUpDate', label: t('Agli visit'), kind: 'date' }]}
            onSubmit={async (v) => { await clinicApi.encounters.upsert(a.id, clean({ subjective: v.subjective, provisionalDiagnosis: v.provisionalDiagnosis, finalDiagnosis: v.finalDiagnosis, advice: v.advice, followUpDate: v.followUpDate || undefined, icd10Codes: [], attachmentUrls: [] }) as any); reload(); toast.success(t('Notes likh diye')); }} />
          <FormSheet open={sub === 'rx'} title={t('Nuskha')} description={t('Har dawai ek line me: naam, dose, kitni baar, kitne din')} onClose={() => setSub(null)}
            fields={[{ key: 'lines', label: t('Dawaiyan'), kind: 'multiline', required: true, hint: t('Misal: Panadol 500mg, 1 goli, BD, 5') }, { key: 'general', label: t('Hidayat'), kind: 'multiline' }]}
            onSubmit={async (v) => {
              const items = String(v.lines).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const [drugName, dose, frequency, days] = l.split(',').map((x) => x.trim()); return { drugName, dose: dose || undefined, frequency: frequency && (FREQUENCIES as readonly string[]).includes(frequency.toUpperCase()) ? frequency.toUpperCase() : frequency || undefined, durationDays: Number(days) || undefined }; });
              if (!items.length || !enc) throw new Error(t('Kam az kam ek dawai likhein'));
              await clinicApi.prescriptions.create({ encounterId: enc.id, generalInstructions: v.general?.trim() || undefined, items }); reload(); toast.success(t('Nuskha ban gaya'));
            }} />
          <FormSheet open={sub === 'lab'} title={t('Lab test')} description={t('Har test ek line me: naam, qeemat')} onClose={() => setSub(null)}
            fields={[{ key: 'tests', label: t('Tests'), kind: 'multiline', required: true, hint: t('Misal: CBC, 800') }, { key: 'urgent', label: t('Zaroori (urgent)'), kind: 'switch' }]}
            onSubmit={async (v) => {
              const tests = String(v.tests).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const [testName, price] = l.split(',').map((x) => x.trim()); return { testName, price: Number(price) || 0 }; });
              if (!tests.length) throw new Error(t('Kam az kam ek test likhein'));
              await clinicApi.labs.create({ patientId: a.patientId, doctorId: a.doctorId, encounterId: enc?.id, urgency: v.urgent ? 'URGENT' : 'ROUTINE', tests }); reload(); toast.success(t('Lab order ban gaya'));
            }} />
          <PaySheet open={sub === 'fee'} onClose={() => setSub(null)} title={t('Fee lein')} name={a.patient?.fullName ?? ''} due={due} cta={t('Fee lein')}
            onConfirm={async (p) => { await clinicApi.appointments.pay(a.id, feePayBody(due, p.paidAmount, p.paymentMethod)); reload(); toast.success(t('Fee ka bill ban gaya')); }} />
        </>
      )}
    </>
  );
}
