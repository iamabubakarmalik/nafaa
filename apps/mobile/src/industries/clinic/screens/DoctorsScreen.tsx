/** Doctors (web DoctorsPage): fees, follow-up rule, hours and the clinic's share; add and edit, and the day close with each doctor's share. */

import { useQuery } from '@tanstack/react-query';
import { HandCoins, Stethoscope } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, DetailRow, ListRow, Text, toast } from '@/design';
import { todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean, ltr } from '../../_shared/serviceKit';
import { clinicApi, type Doctor } from '../api';
import { CLINIC_KEYS, SPECIALTIES, doctorName, refreshClinic, specialtyLabel } from '../meta';

export function DoctorsScreen() {
  const can = usePermission();
  const manage = can(P.SERVICE_BOOKINGS_MANAGE) && can(P.STAFF_MANAGE);
  const { guard } = useDeskOnline('clinicDesk');
  const [form, setForm] = useState<Doctor | 'new' | null>(null);
  const close = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'close'], queryFn: () => clinicApi.appointments.dayClose(todayKey()), enabled: can(P.COMMISSION_VIEW) || can(P.REPORTS_VIEW) });
  return (
    <DeskList<Doctor[]> title={t('Doctors')} queryKey={[CLINIC_KEYS.doctors, 'all']} fetch={() => clinicApi.doctors.list()} feature="clinicDesk" emptyIcon={Stethoscope} empty={t('Abhi koi doctor nahi')}
      summary={() => close.data && close.data.rows.length > 0 ? (
        <Card title={t('Aaj ka day close')} flush>
          {close.data.rows.map((r, i) => <ListRow key={r.doctorId} divider dense title={doctorName(r.doctor)} subtitle={t('{{n}} mareez · Fees {{f}}', { n: r.seen, f: formatMoney(r.fees + r.labFees) })} trailing={<Text weight="bold" size="sm" ltr>{t('Hissa')} {formatMoney(r.share)}</Text>} />)}
          {can(P.EXPENSES_CREATE) && <ListRow dense icon={HandCoins} title={t('Share ada karein')} chevron onPress={() => router.push('/clinic/doctor-payouts' as never)} />}
          <DetailRow label={t('Clinic ka hissa')} value={<Text weight="bold" ltr>{formatMoney(close.data.totals.fees + close.data.totals.labFees - close.data.totals.share)}</Text>} last />
        </Card>
      ) : null}
      rows={(list) => list.map((d) => ({
        id: d.id, icon: Stethoscope, tone: d.isActive ? 'accent' : 'neutral', search: `${d.fullName} ${d.specialties.join(' ')}`, title: doctorName(d),
        subtitle: `${specialtyLabel(d.specialties[0])} · ${ltr(`${d.workStartTime}–${d.workEndTime}`)}`, trailing: <Badge tone={d.isActive ? 'success' : 'neutral'}>{formatMoney(d.consultationFee)}</Badge>, onPress: manage ? () => guard(() => setForm(d)) : undefined,
      }))}
      fab={manage ? { label: t('New doctor'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New doctor') : t('Edit doctor')} onClose={() => setForm(null)}
        fields={[{ key: 'title', label: t('Title (Dr.)') }, { key: 'fullName', label: t('Naam'), required: true }, { key: 'phone', label: t('Phone'), kind: 'phone', when: () => form === 'new' }, { key: 'specialty', label: t('Specialty'), kind: 'select', options: SPECIALTIES.map(([value, label]) => ({ value, label: t(label) })) }, { key: 'consultationFee', label: t('Consultation fee'), kind: 'money', required: true }, { key: 'followUpFee', label: t('Follow-up fee'), kind: 'money' }, { key: 'followUpDays', label: t('Follow-up kitne din tak'), kind: 'number' }, { key: 'workStartTime', label: t('Shuru'), kind: 'time' }, { key: 'workEndTime', label: t('Khatam'), kind: 'time' }, { key: 'commissionPct', label: t('Doctor ka hissa %'), kind: 'number' }]}
        initial={form && form !== 'new' ? { ...form, specialty: form.specialties[0] } : { specialty: 'GENERAL_PRACTITIONER', followUpDays: 7, workStartTime: '09:00', workEndTime: '17:00', commissionPct: 60 }}
        onSubmit={async (v) => { const cur = form && form !== 'new' ? form : null; await clinicApi.doctors.upsert(clean({ ...v, specialty: undefined, specialties: v.specialty ? [v.specialty] : undefined, staffId: (cur as any)?.staffId, consultationFee: v.consultationFee ?? 0, followUpFee: v.followUpFee ?? 0, followUpDays: v.followUpDays ?? 7, slotDurationMin: cur?.slotDurationMin ?? 15, workingDays: cur?.workingDays ?? [1, 2, 3, 4, 5, 6], commissionPct: v.commissionPct ?? 0, commissionType: cur?.commissionType ?? 'PERCENTAGE', qualifications: cur?.qualifications ?? [], id: undefined })); refreshClinic(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
