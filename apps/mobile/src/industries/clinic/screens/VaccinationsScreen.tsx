/** Vaccinations (web VaccinationsPage): doses due, overdue and given; give a dose with batch number, or schedule one. */

import { Syringe } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DatePicker, Input, Segmented, Sheet, Text, toast } from '@/design';
import { dateToKey, errorText, todayKey, daysFromToday, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { clinicApi, type Patient, type Vaccination } from '../api';
import { PatientField } from '../components';
import { CLINIC_KEYS, dateOf, refreshClinic } from '../meta';

export function VaccinationsScreen() {
  const manage = usePermission()(P.CLINIC_RECORDS_MANAGE);
  const { guard } = useDeskOnline('clinicDesk');
  const [give, setGive] = useState<Vaccination | null>(null);
  const [add, setAdd] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  return (
    <DeskList<{ items: Vaccination[] }> title={t('Vaccinations')} queryKey={[CLINIC_KEYS.vaccines]} fetch={() => clinicApi.vaccinations.page({ limit: 100 })} feature="clinicDesk" emptyIcon={Syringe} empty={t('Abhi koi vaccine nahi')} searchPlaceholder={t('Mareez ya vaccine')}
      filters={[{ value: 'all', label: t('Sab') }, { value: 'due', label: t('Baqi') }, { value: 'done', label: t('Lag chuki') }]}
      rows={(d) => d.items.map((v) => {
        const left = daysFromToday(v.dueDate);
        const done = v.status === 'ADMINISTERED';
        return {
          id: v.id, icon: Syringe, tone: done ? 'success' : left !== null && left < 0 ? 'danger' : 'info', filter: done ? 'done' : 'due', search: `${v.patient?.fullName} ${v.vaccineName}`,
          title: `${v.vaccineName}${v.doseNumber ? ` (${t('Dose')} ${v.doseNumber})` : ''}`, subtitle: `${v.patient?.fullName ?? ''} · ${done ? dateOf(v.administeredAt) : dateOf(v.dueDate)}`,
          trailing: <Badge tone={done ? 'success' : left !== null && left < 0 ? 'danger' : 'info'}>{done ? t('Lag gayi') : left !== null && left < 0 ? t('Der') : t('Baqi')}</Badge>, onPress: manage && !done ? () => guard(() => setGive(v)) : undefined,
        };
      })}
      fab={manage ? { label: t('Schedule'), onPress: () => guard(() => { setPatient(null); setAdd(true); }) } : undefined}>
      <FormSheet open={!!give} title={t('Dose lagayein')} description={give ? `${give.vaccineName} · ${give.patient?.fullName ?? ''}` : undefined} onClose={() => setGive(null)}
        fields={[{ key: 'batchNumber', label: t('Batch number') }, { key: 'administeredBy', label: t('Kis ne lagayi') }]}
        onSubmit={async (v) => { await clinicApi.vaccinations.administer(give!.id, clean(v)); refreshClinic(); toast.success(t('Dose likh di')); }} />
      <ScheduleSheet open={add} onClose={() => setAdd(false)} patient={patient} onPatient={setPatient} />
    </DeskList>
  );
}

/** One dose, or the child's whole EPI schedule from the birth date (the server skips doses the child already has). */
function ScheduleSheet({ open, onClose, patient, onPatient }: { open: boolean; onClose: () => void; patient: Patient | null; onPatient: (p: Patient) => void }) {
  const [mode, setMode] = useState<'epi' | 'one'>('epi');
  const [birth, setBirth] = useState<Date>(new Date());
  const [name, setName] = useState('');
  const [dose, setDose] = useState<number | null>(null);
  const [due, setDue] = useState<Date>(new Date());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMode('epi'); setName(''); setDose(null); setDue(new Date()); setBirth(patient?.dateOfBirth ? new Date(patient.dateOfBirth) : new Date()); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (patient?.dateOfBirth) setBirth(new Date(patient.dateOfBirth)); }, [patient?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!patient) { toast.warning(t('Mareez chunein')); return; }
    if (mode === 'epi' && dateToKey(birth) > todayKey()) { toast.warning(t('Aage ki tareekh nahi')); return; }
    if (mode === 'one' && !name.trim()) { toast.warning(t('Zaroori jagah bharein')); return; }
    setBusy(true);
    try {
      if (mode === 'epi') { const r = await clinicApi.vaccinations.bulkEpi(patient.id, `${dateToKey(birth)}T12:00:00+05:00`); toast.success(t('{{added}} doses lag gayi', { added: r.added })); }
      else { await clinicApi.vaccinations.schedule({ patientId: patient.id, vaccineName: name.trim(), dueDate: `${dateToKey(due)}T12:00:00+05:00`, doseNumber: dose ?? undefined }); toast.success(t('Dose jur gayi')); }
      refreshClinic(); onClose();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Vaccine schedule')} description={t('Bachay ka poora EPI schedule ek click me, ya ek dose')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{mode === 'epi' ? t('Poora EPI schedule') : t('Save')}</Button>}>
      <View style={{ gap: 12 }}>
        <Segmented value={mode} onChange={(v) => setMode(v as 'epi' | 'one')} options={[{ value: 'epi', label: t('Poora EPI schedule') }, { value: 'one', label: t('Ek dose') }]} />
        <PatientField value={patient} onChange={onPatient} />
        {mode === 'epi' ? (
          <><DatePicker label={t('Paidaish ki tareekh')} value={birth} onChange={setBirth} maximumDate={new Date()} />
            <Text size="xs" tone="muted">{t('Bachay ki paidaish ki tareekh se BCG se Measles-2 tak saari doses ki tareekh khud ban jati hai.')}</Text></>
        ) : (
          <><Input label={t('Vaccine')} value={name} onChangeText={setName} />
            <Input label={t('Dose number')} keyboardType="number-pad" ltr value={dose ? String(dose) : ''} onChangeText={(v) => setDose(Number(v.replace(/\D/g, '')) || null)} />
            <DatePicker label={t('Kab lagani hai')} value={due} onChange={setDue} /></>
        )}
      </View>
    </Sheet>
  );
}
