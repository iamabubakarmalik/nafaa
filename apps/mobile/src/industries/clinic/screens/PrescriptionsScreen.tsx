/** Prescriptions (web ClinicPrescriptionsPage): every nuskha with the patient, doctor and medicines; tap to read the full list. */

import { Pill } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { DetailRow, Sheet, Text } from '@/design';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { DeskList } from '../../_shared/serviceKit';
import { clinicApi } from '../api';
import { CLINIC_KEYS, dateOf, doctorName } from '../meta';

const rxDoc = (p: Row, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `prescription-${p.prescriptionNumber}`,
  title: L(lang, 'Prescription', 'نسخہ', 'Nuskha'),
  subtitle: p.prescriptionNumber,
  meta: [[L(lang, 'Patient', 'مریض', 'Mareez'), p.patient ? `${p.patient.fullName} (${p.patient.mrn})` : '—'], [L(lang, 'Doctor', 'ڈاکٹر', 'Doctor'), doctorName(p.doctor)], [L(lang, 'Date', 'تاریخ', 'Date'), dateOf(p.issuedAt)],
    ...(p.patient?.allergies?.length ? [[L(lang, 'Allergy', 'الرجی', 'Allergy'), p.patient.allergies.join(', ')] as [string, string]] : [])],
  rows: (p.encounter?.finalDiagnosis ?? p.encounter?.provisionalDiagnosis) ? [[L(lang, 'Diagnosis', 'تشخیص', 'Diagnosis'), (p.encounter?.finalDiagnosis ?? p.encounter?.provisionalDiagnosis)!]] : [],
  tables: [{ columns: [L(lang, 'Medicine', 'دوا', 'Dawai'), L(lang, 'Dose', 'خوراک', 'Dose'), L(lang, 'Times', 'اوقات', 'Waqt'), L(lang, 'Days', 'دن', 'Din'), L(lang, 'Instructions', 'ہدایات', 'Hidayat')],
    rows: p.items.map((i) => [`${i.drugName}${i.strength ? ` ${i.strength}` : ''}`, i.dose, i.frequency, i.durationDays, i.instructions]) }],
  notes: [L(lang, 'Doctor signature: ____________________', 'ڈاکٹر کے دستخط: ____________________', 'Doctor ke dastakhat: ____________________')],
});

type Row = Awaited<ReturnType<typeof clinicApi.prescriptions.page>>['items'][number];

export function PrescriptionsScreen() {
  const [open, setOpen] = useState<Row | null>(null);
  return (
    <DeskList<{ items: Row[] }> title={t('Prescriptions')} queryKey={[CLINIC_KEYS.rx]} fetch={() => clinicApi.prescriptions.page({ limit: 80 })} feature="clinicDesk" emptyIcon={Pill} empty={t('Abhi koi nuskha nahi')} searchPlaceholder={t('Mareez ya nuskha number')}
      rows={(d) => d.items.map((p) => ({
        id: p.id, icon: Pill, tone: 'accent', search: `${p.patient?.fullName} ${p.prescriptionNumber} ${p.items.map((i) => i.drugName).join(' ')}`, title: p.patient?.fullName ?? p.prescriptionNumber,
        subtitle: `${p.prescriptionNumber} · ${dateOf(p.issuedAt)} · ${doctorName(p.doctor)}`, trailing: <Text size="xs" tone="muted">{t('{{n}} dawai', { n: p.totalItems })}</Text>, onPress: () => setOpen(p),
      }))}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.patient?.fullName} description={open ? `${open.prescriptionNumber} · ${doctorName(open.doctor)}` : undefined}
        footer={open ? <View style={{ alignItems: 'center' }}><DocActions phone={open.patient?.phonePrimary} build={(lang) => rxDoc(open, lang)} /></View> : undefined}>
        {open && <View style={{ gap: 4 }}>
          {(open.encounter?.finalDiagnosis ?? open.encounter?.provisionalDiagnosis) ? <DetailRow label={t('Diagnosis')} value={(open.encounter?.finalDiagnosis ?? open.encounter?.provisionalDiagnosis)!} /> : null}
          {open.items.map((i, k) => <DetailRow key={k} label={i.drugName} value={[i.dose, i.frequency, i.durationDays ? t('{{n}} din', { n: i.durationDays }) : ''].filter(Boolean).join(' · ') || '—'} last={k === open.items.length - 1} />)}
        </View>}
      </Sheet>
    </DeskList>
  );
}
