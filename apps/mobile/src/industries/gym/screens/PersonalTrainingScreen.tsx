/** Personal training (web PTSessionsPage): sessions with trainer and member, status steps, and PT packages sold up front. */

import { Flame } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Row, Segmented, Select, Sheet, Text, toast } from '@/design';
import { useQuery } from '@tanstack/react-query';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { PaySheet, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type GymMember, type PTSession, type PtPackage } from '../api';
import { MemberField } from '../components/MemberField';
import { GYM_KEYS, PT_STATUS, dateOf, refreshGym, timeOf, toIso } from '../meta';

export function PersonalTrainingScreen() {
  const can = usePermission();
  const manage = can(P.SERVICE_BOOKINGS_MANAGE);
  const { guard } = useDeskOnline('gymDesk');
  const [tab, setTab] = useState<'sessions' | 'packages'>('sessions');
  const [open, setOpen] = useState<PTSession | null>(null);
  const [form, setForm] = useState(false);
  const [sell, setSell] = useState(false);
  const [member, setMember] = useState<GymMember | null>(null);
  const [trainerId, setTrainerId] = useState('');
  const [pay, setPay] = useState<{ sessions: number; price: number } | null>(null);
  const trainers = useQuery({ queryKey: [GYM_KEYS.trainers, 'all'], queryFn: () => gymApi.trainers.list() });
  const seg = () => <Segmented value={tab} onChange={setTab} options={[{ value: 'sessions', label: t('Sessions') }, { value: 'packages', label: t('Packages') }]} />;
  const move = async (s: PTSession, status: string) => { try { await gymApi.pt.status(s.id, { status }); refreshGym(true); setOpen(null); toast.success(t('Ho gaya')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const trainerOpts = (trainers.data ?? []).map((x) => ({ value: x.id, label: x.staff?.fullName ?? x.trainerNumber }));
  return (
    <>
      {tab === 'sessions' ? (
        <DeskList<PTSession[]> title={t('Personal training')} queryKey={[GYM_KEYS.pt, 'sessions']} fetch={() => gymApi.pt.list()} feature="gymDesk" emptyIcon={Flame} empty={t('Abhi koi session nahi')} summary={seg}
          rows={(list) => list.map((s) => ({
            id: s.id, icon: Flame, tone: PT_STATUS[s.status]?.tone ?? 'neutral', search: `${s.member?.customer?.name} ${s.sessionNumber} ${s.trainer?.staff?.fullName}`, title: s.member?.customer?.name ?? s.sessionNumber,
            subtitle: `${dateOf(s.scheduledStart)} · ${timeOf(s.scheduledStart)} · ${s.trainer?.staff?.fullName ?? ''}`, trailing: <Badge tone={PT_STATUS[s.status]?.tone ?? 'neutral'}>{t(PT_STATUS[s.status]?.label ?? s.status)}</Badge>, onPress: () => setOpen(s),
          }))}
          fab={manage ? { label: t('New session'), onPress: () => guard(() => { setMember(null); setTrainerId(''); setForm(true); }) } : undefined} />
      ) : (
        <DeskList<{ items: PtPackage[] }> title={t('Personal training')} queryKey={[GYM_KEYS.pt, 'packages']} fetch={() => gymApi.pt.packages()} feature="gymDesk" emptyIcon={Flame} empty={t('Abhi koi package nahi')} summary={seg}
          rows={(d) => d.items.map((p) => ({ id: p.id, icon: Flame, tone: p.status === 'ACTIVE' ? 'success' : 'neutral', search: `${p.member?.customer?.name} ${p.packageNumber}`, title: p.member?.customer?.name ?? p.packageNumber, subtitle: `${p.packageNumber} · ${p.trainer?.name ?? ''}`, trailing: <Badge tone="info">{t('{{n}}/{{m}} baqi', { n: p.sessionsLeft, m: p.sessionsTotal })}</Badge> }))}
          fab={can(P.POS_USE) ? { label: t('Sell package'), onPress: () => guard(() => { setMember(null); setTrainerId(''); setSell(true); }) } : undefined} />
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.member?.customer?.name} description={open?.sessionNumber}
        footer={open && manage && ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(open.status) ? (
          <Row gap={2}>
            {open.status !== 'IN_PROGRESS' && <Button style={{ flex: 1 }} onPress={() => guard(() => void move(open, 'IN_PROGRESS'))}>{t('Shuru')}</Button>}
            {open.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} onPress={() => guard(() => void move(open, 'COMPLETED'))}>{t('Khatam')}</Button>}
            <Button variant="secondary" onPress={() => guard(() => void move(open, 'CANCELLED'))}>{t('Cancel')}</Button>
          </Row>
        ) : undefined}>
        {open && <View style={{ gap: 4 }}>
          <DetailRow label={t('Trainer')} value={open.trainer?.staff?.fullName ?? '—'} /><DetailRow label={t('Waqt')} value={`${dateOf(open.scheduledStart)} ${timeOf(open.scheduledStart)}`} />
          <DetailRow label={t('Fee')} value={open.isFromPackage ? t('Package se') : <Text ltr>{formatMoney(open.price)}</Text>} last />
        </View>}
      </Sheet>
      <FormSheet open={form} title={t('New session')} onClose={() => setForm(false)} fields={[{ key: 'date', label: t('Din'), kind: 'date', required: true }, { key: 'time', label: t('Waqt'), kind: 'time', required: true }, { key: 'durationMinutes', label: t('Minute'), kind: 'number' }, { key: 'price', label: t('Fee'), kind: 'money' }, { key: 'focusArea', label: t('Focus') }]}
        initial={{ date: todayKey(), time: '18:00', durationMinutes: 60 }}
        extra={<><MemberField value={member} onChange={setMember} /><Select label={t('Trainer')} value={trainerId || null} onChange={setTrainerId} options={trainerOpts} /></>}
        onSubmit={async (v) => { if (!member || !trainerId) throw new Error(t('Member aur trainer chunein')); await gymApi.pt.create({ memberId: member.id, trainerId, scheduledStart: toIso(v.date, v.time), durationMinutes: v.durationMinutes ?? 60, price: v.price ?? undefined, focusArea: v.focusArea || undefined }); refreshGym(true); toast.success(t('Session book ho gaya')); }} />
      <FormSheet open={sell} title={t('Sell package')} onClose={() => setSell(false)} submitLabel={t('Aage')} fields={[{ key: 'sessions', label: t('Sessions'), kind: 'number', required: true }, { key: 'price', label: t('Total qeemat'), kind: 'money', required: true }]}
        extra={<><MemberField value={member} onChange={setMember} /><Select label={t('Trainer')} value={trainerId || null} onChange={setTrainerId} options={trainerOpts} /></>}
        onSubmit={async (v) => { if (!member) throw new Error(t('Member chunein')); setPay({ sessions: v.sessions, price: v.price }); }} />
      <PaySheet open={!!pay} onClose={() => setPay(null)} title={t('Package payment')} name={member?.customer?.name ?? ''} due={pay?.price ?? 0} cta={t('Bechein')}
        onConfirm={async (p) => { await gymApi.pt.sellPackage(clean({ memberId: member!.id, trainerId: trainerId || undefined, sessions: pay!.sessions, price: pay!.price, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }) as any); refreshGym(true); toast.success(t('Package bik gaya')); }} />
    </>
  );
}
