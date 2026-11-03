/**
 * Reception (web ClinicNewAppointmentPage): pick or register the patient and the
 * doctor; the fee comes from the doctor (follow-up fee inside the follow-up
 * days); walk-ins get a token at once. Fees are billed from the visit.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { discountIssue, visitTotal } from '@nafaa/core/industries/clinic';
import { t } from '@/core/i18n';
import { Amount, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Switch, Text, toast } from '@/design';
import { dateToKey, errorText } from '../../_shared/deskKit';
import { clinicApi, type Patient } from '../api';
import { PatientField } from '../components';
import { CLINIC_KEYS, doctorName, refreshClinic, specialtyLabel, visitTypeLabel } from '../meta';

export function ReceptionScreen() {
  const docs = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'active'], queryFn: () => clinicApi.doctors.list({ active: true }) });
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [walkIn, setWalkIn] = useState(true);
  const [day, setDay] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [complaint, setComplaint] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [other, setOther] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const quote = useQuery({ queryKey: [CLINIC_KEYS.appointments, 'fee', doctorId, patient?.id], queryFn: () => clinicApi.appointments.feeQuote(doctorId, patient?.id), enabled: !!doctorId });
  useEffect(() => { if (!doctorId && docs.data?.length === 1) setDoctorId(docs.data[0].id); }, [docs.data, doctorId]);
  const fee = quote.data?.fee ?? docs.data?.find((d) => d.id === doctorId)?.consultationFee ?? 0;
  const total = visitTotal(fee, other ?? 0, discount ?? 0);
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const save = async () => {
    if (!patient) { toast.warning(t('Mareez chunein ya register karein')); return; }
    if (!doctorId) { toast.warning(t('Doctor chunein')); return; }
    if (discountIssue(fee, other ?? 0, discount ?? 0)) { toast.warning(t('Discount fees se zyada hai')); return; }
    setSaving(true);
    try {
      const start = walkIn ? new Date().toISOString() : new Date(`${dateToKey(day)}T${hhmm(time)}:00+05:00`).toISOString();
      const a = await clinicApi.appointments.create({ patientId: patient.id, doctorId, walkIn, scheduledStart: start, visitType: emergency ? 'EMERGENCY' : undefined, isEmergency: emergency, chiefComplaint: complaint.trim() || undefined, discount: discount ?? 0, otherCharges: other ?? 0 });
      refreshClinic(); toast.success(a.tokenNumber ? t('Token {{n}}', { n: a.tokenNumber }) : t('Booking ho gayi'), { message: a.appointmentNumber }); router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  return (
    <FormTemplate title={t('Reception (token)')} dirty={!!patient} saving={saving} onSave={() => void save()}>
      <FormSection title={t('Mareez')}><PatientField value={patient} onChange={setPatient} /></FormSection>
      <FormSection title={t('Doctor')}>
        <Select label={t('Doctor')} value={doctorId || null} onChange={setDoctorId} options={(docs.data ?? []).map((d) => ({ value: d.id, label: doctorName(d), description: specialtyLabel(d.specialties?.[0]) }))} />
        {quote.data && <Text size="sm" tone="muted">{`${visitTypeLabel(quote.data.visitType)} · ${t('Fee')} `}<Amount value={quote.data.fee} /></Text>}
        <Switch label={t('Walk-in (abhi token)')} value={walkIn} onChange={setWalkIn} />
        {!walkIn && <Row gap={2}><View style={{ flex: 1 }}><DatePicker label={t('Din')} value={day} onChange={setDay} minimumDate={new Date()} /></View><View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={time} onChange={setTime} /></View></Row>}
        <Switch label={t('Emergency')} value={emergency} onChange={setEmergency} />
        <Input label={t('Shikayat')} value={complaint} onChangeText={setComplaint} multiline />
      </FormSection>
      <FormSection title={t('Fee')}>
        <Row gap={2}><View style={{ flex: 1 }}><MoneyInput label={t('Aur charges')} value={other} onChangeValue={setOther} /></View><View style={{ flex: 1 }}><MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} /></View></Row>
        <Row justify="between"><Text tone="muted">{t('Total')}</Text><Amount value={total} weight="bold" size="lg" /></Row>
      </FormSection>
    </FormTemplate>
  );
}
