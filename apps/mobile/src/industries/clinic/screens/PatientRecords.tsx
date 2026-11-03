/**
 * A patient's specialty records (web SpecialtyRecords + the vitals tab): the
 * dental chart with each tooth coloured by its latest entry, the growth chart
 * (weight and height over visits), antenatal visits and physio sessions.
 */

import { useQuery } from '@tanstack/react-query';
import { Baby, Dumbbell, LineChart as GrowthIcon, Plus, Smile, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Badge, Button, Card, DetailRow, EmptyState, IconButton, LineChart, ListRow, PressableScale, Row, Segmented, Sheet, Text, confirm, toast, useTheme, type StatusTone } from '@/design';
import { dateToKey, todayKey } from '../../_shared/deskKit';
import { FormSheet, clean, type FormField } from '../../_shared/serviceKit';
import { clinicApi, type DentalRecord, type Patient } from '../api';
import { CLINIC_KEYS, dateOf, doctorName } from '../meta';

const stamp = (key?: string) => `${key ?? todayKey()}T12:00:00+05:00`;
type Tab = 'dental' | 'growth' | 'anc' | 'physio';

const CONDITIONS = ['Caries (keera)', 'Filling', 'Root canal', 'Crown', 'Missing', 'Extraction', 'Scaling', 'Bridge', 'Implant', 'Sensitive', 'Healthy'];
const toneOf = (c: string): StatusTone => (/healthy/i.test(c) ? 'success' : /missing|extraction/i.test(c) ? 'neutral' : /caries|sensitive/i.test(c) ? 'danger' : 'info');
const QUADRANTS = [['18', '17', '16', '15', '14', '13', '12', '11'], ['21', '22', '23', '24', '25', '26', '27', '28'], ['48', '47', '46', '45', '44', '43', '42', '41'], ['31', '32', '33', '34', '35', '36', '37', '38']];

export function PatientRecordsSheet({ patient, canManage, onClose }: { patient: Patient | null; canManage: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('dental');
  const tabs = [{ value: 'dental', label: t('Daant'), icon: Smile }, { value: 'growth', label: t('Growth'), icon: GrowthIcon },
    ...(patient?.gender !== 'MALE' ? [{ value: 'anc', label: t('Hamal (ANC)'), icon: Baby }] : []), { value: 'physio', label: t('Physio'), icon: Dumbbell }];
  return (
    <Sheet open={!!patient} onClose={onClose} title={patient?.fullName} description={t('Records')} height={0.9}>
      {patient && (
        <View style={{ gap: 12 }}>
          <Segmented value={tab} onChange={(v) => setTab(v as Tab)} options={tabs as Array<{ value: string; label: string }>} />
          {tab === 'dental' && <Dental patient={patient} canManage={canManage} />}
          {tab === 'growth' && <Growth patient={patient} />}
          {tab === 'anc' && <Anc patient={patient} canManage={canManage} />}
          {tab === 'physio' && <Physio patient={patient} canManage={canManage} />}
        </View>
      )}
    </Sheet>
  );
}

function useDoctors() {
  return useQuery({ queryKey: [CLINIC_KEYS.doctors, 'active'], queryFn: () => clinicApi.doctors.list({ active: true }) }).data ?? [];
}

function Dental({ patient, canManage }: { patient: Patient; canManage: boolean }) {
  const th = useTheme();
  const doctors = useDoctors();
  const key = ['clinic-dental', patient.id];
  const q = useQuery({ queryKey: key, queryFn: () => clinicApi.specialty.dental(patient.id) });
  const [form, setForm] = useState<{ tooth?: string } | null>(null);
  const rows = (q.data ?? []).filter((r) => r.isActive);
  const latest = useMemo(() => {
    const m = new Map<string, DentalRecord>();
    for (const r of [...rows].sort((a, b) => +new Date(a.performedAt) - +new Date(b.performedAt))) m.set(r.toothNumber, r);
    return m;
  }, [rows]);
  const fields: FormField[] = [
    { key: 'toothNumber', label: t('Daant no. (FDI)'), kind: 'number', required: true },
    { key: 'condition', label: t('Halat'), kind: 'select', required: true, options: CONDITIONS.map((c) => ({ value: c, label: c })) },
    { key: 'surface', label: t('Surface'), hint: t('O, M, D…') }, { key: 'treatment', label: t('Ilaaj') },
    { key: 'performedAt', label: t('Tareekh'), kind: 'date' },
    { key: 'doctorId', label: t('Doctor'), kind: 'select', options: doctors.map((d) => ({ value: d.id, label: doctorName(d) })) }, { key: 'notes', label: t('Note'), kind: 'multiline' },
  ];
  const remove = async (r: DentalRecord) => {
    if (!(await confirm({ title: t('Entry hata dein?'), message: t('Entry hata di — record me mehfooz hai'), confirmLabel: t('Hatayein') }))) return;
    await clinicApi.specialty.removeDental(r.id).then(() => void q.refetch()).catch(() => toast.error(t('Nahi hua')));
  };
  return (
    <View style={{ gap: 12 }}>
      <Text size="xs" tone="muted">{t('Har daant ka halat aur ilaaj (FDI numbering)')}</Text>
      {QUADRANTS.map((row, i) => (
        <Row key={i} gap={1}>
          {row.map((n) => {
            const r = latest.get(n);
            const tone = r ? toneOf(r.condition) : undefined;
            const c = tone === 'danger' ? th.colors.danger : tone === 'success' ? th.colors.success : tone === 'info' ? th.colors.info : tone === 'neutral' ? th.colors.neutral : undefined;
            return (
              <PressableScale key={n} disabled={!canManage} onPress={() => setForm({ tooth: n })} accessibilityLabel={r ? `${n} ${r.condition}` : n}
                style={{ flex: 1, minHeight: 40, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c?.solid ?? th.colors.border, backgroundColor: c?.soft ?? th.colors.surface }}>
                <Text size="xs" weight="semibold" ltr style={{ color: c?.text }}>{n}</Text>
              </PressableScale>
            );
          })}
        </Row>
      ))}
      {canManage && <Button icon={Plus} variant="soft" onPress={() => setForm({})}>{t('Naya')}</Button>}
      {rows.length === 0 ? <EmptyState icon={Smile} title={t('Daant ka koi record nahi')} /> : (
        <Card flush>
          {[...rows].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt)).map((r, i, arr) => (
            <ListRow key={r.id} divider={i < arr.length - 1} dense title={`${r.toothNumber}${r.surface ? ` · ${r.surface}` : ''} — ${r.condition}`} subtitle={`${r.treatment ?? ''}${r.treatment ? ' · ' : ''}${dateOf(r.performedAt)}`}
              trailing={canManage ? <IconButton icon={Trash2} label={t('Hatayein')} onPress={() => void remove(r)} /> : <Badge tone={toneOf(r.condition)}>{r.toothNumber}</Badge>} />
          ))}
        </Card>
      )}
      <FormSheet open={!!form} title={t('Daant ka record')} fields={fields} initial={{ toothNumber: form?.tooth ? Number(form.tooth) : undefined, performedAt: todayKey(), doctorId: doctors[0]?.id }}
        onClose={() => setForm(null)}
        onSubmit={async (v) => {
          const n = Number(v.toothNumber);
          if (!(n >= 11 && n <= 85 && n % 10 >= 1 && n % 10 <= 8)) throw new Error(t('FDI number (11–48, bachay 51–85)'));
          await clinicApi.specialty.addDental(clean({ patientId: patient.id, toothNumber: String(n), condition: v.condition, surface: v.surface?.trim(), treatment: v.treatment?.trim(), doctorId: v.doctorId, notes: v.notes?.trim(), performedAt: stamp(v.performedAt) }));
          void q.refetch(); toast.success(t('Daant {{toothNumber}} likh diya', { toothNumber: String(n) }));
        }} />
    </View>
  );
}

function Growth({ patient }: { patient: Patient }) {
  const q = useQuery({ queryKey: ['clinic-vitals', patient.id], queryFn: () => clinicApi.vitalsOf(patient.id) });
  const rows = [...(q.data ?? [])].sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
  const w = rows.filter((r) => r.weightKg);
  const h = rows.filter((r) => r.heightCm);
  if (!rows.length) return <EmptyState icon={GrowthIcon} title={t('Vitals nahi liye gaye')} />;
  const lab = (xs: typeof rows) => xs.map((r) => dateOf(r.recordedAt).slice(0, 6));
  return (
    <View style={{ gap: 12 }}>
      {w.length > 1 && <Card title={t('Wazan (kg)')}><LineChart labels={lab(w)} series={[{ key: 'w', data: w.map((r) => r.weightKg as number) }]} format={(v) => `${Math.round(v * 10) / 10} kg`} /></Card>}
      {h.length > 1 && <Card title={t('Qad (cm)')}><LineChart labels={lab(h)} series={[{ key: 'h', data: h.map((r) => r.heightCm as number) }]} format={(v) => `${Math.round(v)} cm`} /></Card>}
      <Card flush>
        {[...rows].reverse().map((v, i, arr) => (
          <ListRow key={v.id} divider={i < arr.length - 1} dense title={dateOf(v.recordedAt)}
            subtitle={[v.weightKg ? `${v.weightKg} kg` : '', v.heightCm ? `${v.heightCm} cm` : '', v.bpSystolic ? `BP ${v.bpSystolic}/${v.bpDiastolic ?? '-'}` : '', v.pulseRate ? `${t('Pulse')} ${v.pulseRate}` : '', v.temperatureC ? `${v.temperatureC}°C` : '', v.spo2 ? `SpO2 ${v.spo2}` : ''].filter(Boolean).join(' · ')} />
        ))}
      </Card>
    </View>
  );
}

const range = (v: unknown, min: number, max: number, label: string) => { if (v === undefined || v === null || v === '') return; const n = Number(v); if (!(n >= min && n <= max)) throw new Error(`${label}: ${min}–${max}`); };

function Anc({ patient, canManage }: { patient: Patient; canManage: boolean }) {
  const q = useQuery({ queryKey: ['clinic-anc', patient.id], queryFn: () => clinicApi.specialty.anc(patient.id) });
  const [add, setAdd] = useState(false);
  const fields: FormField[] = [
    { key: 'gestationWeeks', label: t('Hafte'), kind: 'number' }, { key: 'weightKg', label: t('Wazan (kg)'), kind: 'number' }, { key: 'visitDate', label: t('Tareekh'), kind: 'date' },
    { key: 'bpSystolic', label: t('BP upar'), kind: 'number' }, { key: 'bpDiastolic', label: t('BP neeche'), kind: 'number' }, { key: 'fetalHeartRate', label: t('Bachay ki dhadkan'), kind: 'number' },
    { key: 'fundalHeightCm', label: t('Fundal height (cm)'), kind: 'number' }, { key: 'fetalPosition', label: t('Bachay ki position') }, { key: 'urineProtein', label: t('Urine protein') },
    { key: 'edema', label: t('Sujan') }, { key: 'nextVisitDate', label: t('Agli visit'), kind: 'date' }, { key: 'advice', label: t('Mashwara'), kind: 'multiline' },
  ];
  return (
    <View style={{ gap: 12 }}>
      <Text size="xs" tone="muted">{t('Hamal ke dauran har visit: hafte, BP, wazan, bachay ki dhadkan')}</Text>
      {canManage && <Button icon={Plus} variant="soft" onPress={() => setAdd(true)}>{t('Naya')}</Button>}
      {!q.data?.length ? <EmptyState icon={Baby} title={t('Koi ANC visit nahi')} /> : (
        <Card flush>
          {q.data.map((v, i, arr) => (
            <View key={v.id} style={{ padding: 12, gap: 2, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0 }}>
              <Text weight="semibold">#{v.visitNumber} · {dateOf(v.visitDate)}</Text>
              <DetailRow label={t('Hafte')} value={String(v.gestationWeeks ?? '—')} />
              <DetailRow label={t('BP')} value={v.bpSystolic ? `${v.bpSystolic}/${v.bpDiastolic ?? '-'}` : '—'} />
              <DetailRow label={t('Wazan')} value={v.weightKg ? `${v.weightKg} kg` : '—'} />
              <DetailRow label={t('Dhadkan')} value={String(v.fetalHeartRate ?? '—')} last={!v.advice} />
              {!!v.advice && <Text size="sm" tone="muted">{v.advice}</Text>}
            </View>
          ))}
        </Card>
      )}
      <FormSheet open={add} title={t('Hamal ki visit (ANC)')} fields={fields} initial={{ visitDate: todayKey() }} onClose={() => setAdd(false)}
        onSubmit={async (v) => {
          range(v.gestationWeeks, 0, 45, t('Hafte')); range(v.weightKg, 20, 250, t('Wazan')); range(v.bpSystolic, 50, 260, t('BP upar')); range(v.bpDiastolic, 30, 180, t('BP neeche')); range(v.fetalHeartRate, 60, 220, t('Dhadkan'));
          await clinicApi.specialty.addAnc(clean({ ...v, patientId: patient.id, visitDate: stamp(v.visitDate), nextVisitDate: v.nextVisitDate ? stamp(v.nextVisitDate) : undefined }));
          void q.refetch(); toast.success(t('ANC visit likh di'));
        }} />
    </View>
  );
}

function Physio({ patient, canManage }: { patient: Patient; canManage: boolean }) {
  const doctors = useDoctors();
  const q = useQuery({ queryKey: ['clinic-physio', patient.id], queryFn: () => clinicApi.specialty.physio(patient.id) });
  const [add, setAdd] = useState(false);
  const fields: FormField[] = [
    { key: 'therapistId', label: t('Therapist'), kind: 'select', required: true, options: doctors.map((d) => ({ value: d.id, label: doctorName(d) })) },
    { key: 'painScore', label: t('Dard (0–10)'), kind: 'number' }, { key: 'durationMin', label: t('Minute'), kind: 'number' },
    { key: 'modalitiesUsed', label: t('Machine / ilaaj'), hint: t('Comma laga kar') }, { key: 'exercisesPerformed', label: t('Exercise'), hint: t('Comma laga kar') },
    { key: 'totalSessionsPrescribed', label: t('Kul sessions'), kind: 'number' }, { key: 'sessionDate', label: t('Tareekh'), kind: 'date' },
    { key: 'progressNotes', label: t('Farq / progress'), kind: 'multiline' }, { key: 'nextSessionDate', label: t('Agla session'), kind: 'date' }, { key: 'homeExercises', label: t('Ghar ki exercise'), kind: 'multiline' },
  ];
  const split = (s?: string) => String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return (
    <View style={{ gap: 12 }}>
      <Text size="xs" tone="muted">{t('Har session: dard, ilaaj, exercise aur farq')}</Text>
      {canManage && <Button icon={Plus} variant="soft" onPress={() => setAdd(true)}>{t('Naya')}</Button>}
      {!q.data?.length ? <EmptyState icon={Dumbbell} title={t('Koi physio session nahi')} /> : (
        <Card flush>
          {q.data.map((s, i, arr) => (
            <ListRow key={s.id} divider={i < arr.length - 1} title={`#${s.sessionNumber}${s.totalSessionsPrescribed ? ` / ${s.totalSessionsPrescribed}` : ''} · ${dateOf(s.sessionDate)}`}
              subtitle={[s.modalitiesUsed.join(', '), s.progressNotes].filter(Boolean).join(' · ') || undefined} trailing={s.painScore != null ? <Badge tone={s.painScore >= 7 ? 'danger' : s.painScore >= 4 ? 'warning' : 'success'}>{t('Dard')} {s.painScore}</Badge> : undefined} />
          ))}
        </Card>
      )}
      <FormSheet open={add} title={t('Physio session')} fields={fields} initial={{ sessionDate: todayKey(), therapistId: doctors[0]?.id }} onClose={() => setAdd(false)}
        onSubmit={async (v) => {
          range(v.painScore, 0, 10, t('Dard'));
          await clinicApi.specialty.addPhysio(clean({ ...v, patientId: patient.id, modalitiesUsed: split(v.modalitiesUsed), exercisesPerformed: split(v.exercisesPerformed), sessionDate: stamp(v.sessionDate), nextSessionDate: v.nextSessionDate ? stamp(v.nextSessionDate) : undefined }));
          void q.refetch(); toast.success(t('Session likh diya'));
        }} />
    </View>
  );
}
