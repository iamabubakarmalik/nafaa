/** Patients (web PatientsPage + PatientDetailPage): directory with MRN and khata balance; register, edit, and open one for their visits, prescriptions and labs. */

import { useQuery } from '@tanstack/react-query';
import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, ListRow, Row, Sheet, Text, toast } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { clinicApi, type Patient } from '../api';
import { PatientRecordsSheet } from './PatientRecords';
import { APT_STATUS, CLINIC_KEYS, ageOf, dateOf, doctorName, refreshClinic } from '../meta';

export function PatientsScreen() {
  const can = usePermission();
  const edit = can(P.CUSTOMERS_EDIT);
  const records = can(P.CLINIC_RECORDS_VIEW);
  const { guard } = useDeskOnline('clinicDesk');
  const [form, setForm] = useState<Patient | 'new' | null>(null);
  const [open, setOpen] = useState<Patient | null>(null);
  const [recs, setRecs] = useState<Patient | null>(null);
  const hist = useQuery({ queryKey: [CLINIC_KEYS.patients, 'history', open?.id], queryFn: () => clinicApi.patients.history(open!.id), enabled: !!open && records });
  return (
    <DeskList<{ items: Patient[] }> title={t('Patients')} queryKey={[CLINIC_KEYS.patients, 'page']} fetch={() => clinicApi.patients.page({ limit: 100 })} feature="clinicDesk" emptyIcon={UserRound} empty={t('Abhi koi mareez nahi')} searchPlaceholder={t('Naam, MRN ya phone')}
      rows={(d) => d.items.map((p) => ({
        id: p.id, icon: UserRound, tone: p.allergies.length ? 'danger' : 'accent', search: `${p.fullName} ${p.mrn} ${p.phonePrimary ?? ''}`, title: p.fullName,
        subtitle: `${p.mrn}${p.phonePrimary ? ` · ${p.phonePrimary}` : ''}${p.lastVisitAt ? ` · ${dateOf(p.lastVisitAt)}` : ''}`, trailing: (p.khataBalance ?? 0) > 0 ? <Badge tone="warning">{formatMoney(p.khataBalance)}</Badge> : <Text size="xs" tone="muted">{t('{{n}} visits', { n: p.totalVisits })}</Text>, onPress: () => setOpen(p),
      }))}
      fab={edit ? { label: t('New patient'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <PatientRecordsSheet patient={recs} canManage={can(P.CLINIC_RECORDS_MANAGE)} onClose={() => setRecs(null)} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.fullName} description={open ? `${open.mrn}${open.phonePrimary ? ` · ${open.phonePrimary}` : ''}` : undefined}
        footer={open ? <Row gap={2}>
          {records && <Button style={{ flex: 1 }} variant="soft" onPress={() => { const p = open; setOpen(null); setRecs(p); }}>{t('Records')}</Button>}
          {edit && <Button style={{ flex: 1 }} variant="secondary" onPress={() => { const p = open; setOpen(null); guard(() => setForm(p)); }}>{t('Edit')}</Button>}
        </Row> : undefined}>
        {open && (
          <View style={{ gap: 6 }}>
            {open.allergies.length > 0 && <Text size="sm" tone="danger">{`${t('Allergy')}: ${open.allergies.join(', ')}`}</Text>}
            {open.dateOfBirth && <DetailRow label={t('Umar')} value={t('{{n}} saal', { n: ageOf(open.dateOfBirth) ?? 0 })} />}
            <DetailRow label={t('Visits')} value={String(open.totalVisits)} />
            <DetailRow label={t('Kul fees')} value={<Text ltr>{formatMoney(open.totalSpent)}</Text>} last />
            {records && hist.data && (
              <Card title={t('Pichli visits')} flush>
                {hist.data.appointments.slice(0, 8).map((a, i, arr) => <ListRow key={a.id} divider={i < arr.length - 1} dense title={`${dateOf(a.scheduledStart)} · ${doctorName(a.doctor)}`} subtitle={a.encounter?.finalDiagnosis ?? a.encounter?.provisionalDiagnosis ?? a.chiefComplaint ?? ''} trailing={<Badge tone={APT_STATUS[a.status].tone}>{t(APT_STATUS[a.status].label)}</Badge>} />)}
                {hist.data.appointments.length === 0 && <View style={{ padding: 12 }}><Text size="sm" tone="muted">{t('Abhi koi visit nahi')}</Text></View>}
              </Card>
            )}
          </View>
        )}
      </Sheet>
      <FormSheet open={!!form} title={form === 'new' ? t('New patient') : t('Edit patient')} onClose={() => setForm(null)}
        fields={[{ key: 'fullName', label: t('Naam'), required: true }, { key: 'phonePrimary', label: t('Phone'), kind: 'phone' }, { key: 'gender', label: t('Gender'), kind: 'select', options: [{ value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }] }, { key: 'ageYears', label: t('Umar (saal)'), kind: 'number' }, { key: 'cnic', label: t('CNIC') }, { key: 'allergyText', label: t('Allergy (comma se alag)') }, { key: 'notes', label: t('Note'), kind: 'multiline' }]}
        initial={form && form !== 'new' ? { ...form, allergyText: form.allergies.join(', '), ageYears: ageOf(form.dateOfBirth) ?? undefined } : {}}
        onSubmit={async (v) => { const body = clean({ fullName: v.fullName.trim(), phonePrimary: v.phonePrimary, gender: v.gender, ageYears: form === 'new' ? v.ageYears : undefined, cnic: v.cnic, notes: v.notes, allergies: String(v.allergyText ?? '').split(',').map((x) => x.trim()).filter(Boolean), chronicConditions: [], currentMedications: [], hasInsurance: false }); if (form === 'new') await clinicApi.patients.create(body); else await clinicApi.patients.update((form as Patient).id, { ...body, ageYears: undefined }); refreshClinic(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
