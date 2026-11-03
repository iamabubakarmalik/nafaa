/**
 * A member's own records (web MemberDetailPage body tab + the gym's workout and
 * diet APIs): body measurements with BMI, workout log, diet plans, and the
 * profile photo from the camera. Writes need the server.
 */

import { useQuery } from '@tanstack/react-query';
import { Apple, Dumbbell, Plus, Ruler, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, EmptyState, IconButton, ListRow, Row, Segmented, Sheet, Text, confirm, toast } from '@/design';
import { PhotoPick } from '@/modules/hr/staff/components/PhotoPick';
import { todayKey, useDeskOnline } from '../../_shared/deskKit';
import { FormSheet, clean, type FormField } from '../../_shared/serviceKit';
import { gymApi, type MemberDetail } from '../api';
import { GYM_KEYS, dateOf, memberName } from '../meta';

type Tab = 'body' | 'workout' | 'diet';
const stamp = (k?: string) => `${k ?? todayKey()}T12:00:00+05:00`;
const GOALS = [['GENERAL_FITNESS', t('Fitness')], ['WEIGHT_LOSS', t('Weight loss')], ['MUSCLE_GAIN', t('Muscle gain')], ['BODY_BUILDING', t('Body building')], ['STRENGTH', t('Strength')], ['ENDURANCE', t('Endurance')]] as const;
const INTENSITY = [['LIGHT', t('Halka')], ['MODERATE', t('Darmiyana')], ['HIGH', t('Tez')]] as const;

export function MemberRecordsSheet({ member, onClose, onChanged }: { member: MemberDetail | null; onClose: () => void; onChanged: () => void }) {
  const can = usePermission();
  const edit = can(P.CUSTOMERS_EDIT);
  const [tab, setTab] = useState<Tab>('body');
  const { guard } = useDeskOnline('gymDesk');
  const savePhoto = async (url: string) => {
    if (!member) return;
    try { await gymApi.members.update(member.id, { photoUrl: url || null }); onChanged(); toast.success(t('Photo save ho gayi')); } catch { toast.error(t('Nahi hua')); }
  };
  return (
    <Sheet open={!!member} onClose={onClose} title={member ? memberName(member) : undefined} description={t('Records')} height={0.9}>
      {member && (
        <View style={{ gap: 12 }}>
          {edit && <View style={{ alignItems: 'center' }}><PhotoPick value={member.photoUrl ?? ''} onChange={(u) => guard(() => void savePhoto(u))} purpose="avatar" round size={96} /></View>}
          <Segmented value={tab} onChange={(v) => setTab(v as Tab)} options={[{ value: 'body', label: t('Naap'), icon: Ruler }, { value: 'workout', label: t('Workout'), icon: Dumbbell }, { value: 'diet', label: t('Diet'), icon: Apple }]} />
          {tab === 'body' && <Body member={member} edit={edit} onChanged={onChanged} />}
          {tab === 'workout' && <Workouts member={member} edit={edit} />}
          {tab === 'diet' && <Diet member={member} edit={edit} />}
        </View>
      )}
    </Sheet>
  );
}

const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));

function Body({ member, edit, onChanged }: { member: MemberDetail; edit: boolean; onChanged: () => void }) {
  const [add, setAdd] = useState(false);
  const rows = member.measurements ?? [];
  const fields: FormField[] = ([['weightKg', t('Wazan (kg)')], ['heightCm', t('Qad (cm)')], ['bodyFatPct', t('Fat %')], ['muscleMassPct', t('Muscle %')], ['chestCm', t('Seena (cm)')], ['waistCm', t('Kamar (cm)')], ['hipsCm', t('Hips (cm)')], ['bicepsCm', t('Bazu (cm)')], ['thighsCm', t('Ran (cm)')]] as const)
    .map(([key, label]) => ({ key, label, kind: 'number' as const }));
  const remove = async (id: string) => {
    if (!(await confirm({ title: t('Ye naap void karein?'), tone: 'danger', confirmLabel: t('Haan, void') }))) return;
    try { await gymApi.measurements.void(id); onChanged(); } catch { toast.error(t('Nahi hua')); }
  };
  return (
    <View style={{ gap: 12 }}>
      {edit && <Button icon={Plus} variant="soft" onPress={() => setAdd(true)}>{t('Naya naap')}</Button>}
      {rows.length === 0 ? <EmptyState icon={Ruler} title={t('Abhi koi naap nahi')} /> : (
        <Card flush>
          {rows.map((x, i) => (
            <ListRow key={x.id} divider={i < rows.length - 1} title={dateOf(x.measurementDate)}
              subtitle={[x.weightKg ? `${x.weightKg} kg` : '', x.heightCm ? `${x.heightCm} cm` : '', x.bodyFatPct ? `${t('Fat')} ${x.bodyFatPct}%` : '', x.waistCm ? `${t('Kamar')} ${x.waistCm}` : '', x.chestCm ? `${t('Seena')} ${x.chestCm}` : ''].filter(Boolean).join(' · ')}
              trailing={<Row gap={1}>{x.bmi ? <Badge tone="info">BMI {x.bmi.toFixed(1)}</Badge> : null}{edit && <IconButton icon={Trash2} label={t('Delete')} onPress={() => void remove(x.id)} />}</Row>} />
          ))}
        </Card>
      )}
      <FormSheet open={add} title={t('Naya naap')} description={t('Jo naap liya woh likhein; BMI khud banta hai')} fields={fields} initial={{ heightCm: member.measurements?.[0]?.heightCm }} onClose={() => setAdd(false)}
        onSubmit={async (v) => {
          const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null).map(([k, x]) => [k, Number(x)]));
          if (!Object.keys(body).length) throw new Error(t('Zaroori jagah bharein'));
          await gymApi.measurements.create({ memberId: member.id, ...body }); onChanged(); toast.success(t('Naap save ho gaya'));
        }} />
    </View>
  );
}

function Workouts({ member, edit }: { member: MemberDetail; edit: boolean }) {
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'workouts', member.id], queryFn: () => gymApi.workouts.list(member.id) });
  const [add, setAdd] = useState(false);
  const fields: FormField[] = [
    { key: 'workoutType', label: t('Workout ka type'), hint: t('Chest, Cardio, Legs…') }, { key: 'sessionDate', label: t('Tareekh'), kind: 'date' },
    { key: 'durationMinutes', label: t('Minute'), kind: 'number' }, { key: 'caloriesBurned', label: t('Calories'), kind: 'number' },
    { key: 'intensity', label: t('Intensity'), kind: 'select', options: INTENSITY.map(([value, label]) => ({ value, label })) },
    { key: 'exercises', label: t('Exercises'), kind: 'multiline', hint: t('Har line ek: Bench press 3x10 40') }, { key: 'notes', label: t('Note'), kind: 'multiline' },
  ];
  const parse = (text?: string) => String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = /^(.*?)\s+(\d+)\s*[x×]\s*(\d+)(?:\s+(\d+(?:\.\d+)?))?$/i.exec(l);
    return m ? { name: m[1], sets: Array.from({ length: Number(m[2]) }, () => ({ reps: Number(m[3]), weight: m[4] ? Number(m[4]) : 0 })) } : { name: l, sets: [] };
  });
  const remove = async (id: string) => { try { await gymApi.workouts.remove(id); void q.refetch(); } catch { toast.error(t('Nahi hua')); } };
  return (
    <View style={{ gap: 12 }}>
      {edit && <Button icon={Plus} variant="soft" onPress={() => setAdd(true)}>{t('Naya workout')}</Button>}
      {!q.data?.length ? <EmptyState icon={Dumbbell} title={t('Abhi koi workout nahi')} /> : (
        <Card flush>{q.data.map((w, i, a) => (
          <ListRow key={w.id} divider={i < a.length - 1} title={`${w.workoutType ?? t('Workout')} · ${dateOf(w.sessionDate)}`}
            subtitle={[w.durationMinutes ? t('{{m}} min', { m: w.durationMinutes }) : '', w.totalSets ? t('{{n}} sets', { n: w.totalSets }) : '', w.exercises?.map((e) => e.name).filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            trailing={edit ? <IconButton icon={Trash2} label={t('Delete')} onPress={() => void remove(w.id)} /> : undefined} />
        ))}</Card>
      )}
      <FormSheet open={add} title={t('Naya workout')} fields={fields} initial={{ sessionDate: todayKey() }} onClose={() => setAdd(false)}
        onSubmit={async (v) => { await gymApi.workouts.create(clean({ memberId: member.id, workoutType: v.workoutType?.trim(), sessionDate: stamp(v.sessionDate), durationMinutes: num(v.durationMinutes), caloriesBurned: num(v.caloriesBurned), intensity: v.intensity, exercises: parse(v.exercises), notes: v.notes?.trim() })); void q.refetch(); toast.success(t('Workout likh diya')); }} />
    </View>
  );
}

function Diet({ member, edit }: { member: MemberDetail; edit: boolean }) {
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'diet', member.id], queryFn: () => gymApi.dietPlans.list(member.id) });
  const [add, setAdd] = useState(false);
  const fields: FormField[] = [
    { key: 'planName', label: t('Plan ka naam'), required: true }, { key: 'goal', label: t('Maqsad'), kind: 'select', options: GOALS.map(([value, label]) => ({ value, label })) },
    { key: 'targetCalories', label: t('Calories (roz)'), kind: 'number' }, { key: 'proteinGrams', label: t('Protein (g)'), kind: 'number' }, { key: 'carbsGrams', label: t('Carbs (g)'), kind: 'number' }, { key: 'fatsGrams', label: t('Fats (g)'), kind: 'number' },
    { key: 'durationDays', label: t('Din'), kind: 'number' }, { key: 'meals', label: t('Khana'), kind: 'multiline', hint: t('Har line ek: Nashta: 2 ande, roti') },
    { key: 'restrictions', label: t('Parhez'), hint: t('Comma laga kar') }, { key: 'notes', label: t('Note'), kind: 'multiline' },
  ];
  const meals = (text?: string) => String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? { meal: l.slice(0, i).trim(), items: l.slice(i + 1).trim() } : { meal: '', items: l }; });
  const toggle = async (id: string, isActive: boolean) => { try { await gymApi.dietPlans.update(id, { isActive }); void q.refetch(); } catch { toast.error(t('Nahi hua')); } };
  return (
    <View style={{ gap: 12 }}>
      {edit && <Button icon={Plus} variant="soft" onPress={() => setAdd(true)}>{t('Naya diet plan')}</Button>}
      {!q.data?.length ? <EmptyState icon={Apple} title={t('Abhi koi diet plan nahi')} /> : q.data.map((d) => (
        <Card key={d.id} title={d.planName}>
          <View style={{ gap: 4 }}>
            <Row gap={2}><Badge tone={d.isActive ? 'success' : 'neutral'}>{d.isActive ? t('Chalu') : t('Band')}</Badge>{!!d.targetCalories && <Text size="sm" ltr>{d.targetCalories} kcal</Text>}</Row>
            {(d.proteinGrams || d.carbsGrams || d.fatsGrams) ? <Text size="sm" tone="muted" ltr>{`P ${d.proteinGrams ?? 0}g · C ${d.carbsGrams ?? 0}g · F ${d.fatsGrams ?? 0}g`}</Text> : null}
            {(d.meals ?? []).map((m, i) => <Text key={i} size="sm">{m.meal ? `${m.meal}: ` : ''}{m.items}</Text>)}
            {d.restrictions.length > 0 && <Text size="xs" tone="warning">{t('Parhez')}: {d.restrictions.join(', ')}</Text>}
            {edit && <Button size="sm" variant="ghost" onPress={() => void toggle(d.id, !d.isActive)}>{d.isActive ? t('Band karein') : t('Dobara chalu')}</Button>}
          </View>
        </Card>
      ))}
      <FormSheet open={add} title={t('Naya diet plan')} fields={fields} initial={{ goal: 'GENERAL_FITNESS' }} onClose={() => setAdd(false)}
        onSubmit={async (v) => { await gymApi.dietPlans.create(clean({ memberId: member.id, planName: v.planName.trim(), goal: v.goal, targetCalories: num(v.targetCalories), proteinGrams: num(v.proteinGrams), carbsGrams: num(v.carbsGrams), fatsGrams: num(v.fatsGrams), durationDays: num(v.durationDays), meals: meals(v.meals), restrictions: String(v.restrictions ?? '').split(',').map((x) => x.trim()).filter(Boolean), notes: v.notes?.trim() })); void q.refetch(); toast.success(t('Diet plan likh diya')); }} />
    </View>
  );
}
