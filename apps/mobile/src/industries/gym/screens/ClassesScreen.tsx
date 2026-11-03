/** Group classes (web ClassesPage): the week's classes with seats; book a member (paid classes are billed), check in, start, finish or cancel. */

import { Calendar, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, ListRow, Row, Sheet, Text, toast } from '@/design';
import { useQuery } from '@tanstack/react-query';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { PaySheet, errorText, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type GymClass, type GymMember } from '../api';
import { MemberField } from '../components/MemberField';
import { GYM_KEYS, classTypeOptions, dateOf, refreshGym, timeOf, toIso } from '../meta';

export function ClassesScreen() {
  const can = usePermission();
  const manage = can(P.SERVICE_BOOKINGS_MANAGE);
  const { guard } = useDeskOnline('gymDesk');
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const from = todayKey();
  return (
    <DeskList<GymClass[]> title={t('Group classes')} queryKey={[GYM_KEYS.classes, 'week']} fetch={() => gymApi.classes.calendar(toIso(from, '00:00'), toIso(shiftKey(from, 7), '23:59'))} feature="gymDesk" emptyIcon={Calendar} empty={t('Is hafte koi class nahi')} refetchMs={60_000}
      rows={(list) => list.filter((c) => c.status !== 'CANCELLED').sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)).map((c) => ({
        id: c.id, icon: Calendar, tone: c.status === 'IN_PROGRESS' ? 'warning' : 'accent', search: `${c.name} ${c.classType}`, title: c.name,
        subtitle: `${dateOf(c.scheduledStart)} · ${timeOf(c.scheduledStart)} · ${c.trainer?.staff?.fullName ?? ''}`,
        trailing: <Badge tone={c.currentEnrolled >= c.maxParticipants ? 'danger' : 'info'}>{`${c.currentEnrolled}/${c.maxParticipants}`}</Badge>, onPress: () => setOpen(c.id),
      }))}
      fab={manage ? { label: t('New class'), onPress: () => guard(() => setForm(true)) } : undefined}>
      <ClassSheet id={open} manage={manage} onClose={() => setOpen(null)} />
      <FormSheet open={form} title={t('New class')} onClose={() => setForm(false)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'classType', label: t('Type'), kind: 'select', options: classTypeOptions(), required: true }, { key: 'date', label: t('Din'), kind: 'date', required: true }, { key: 'start', label: t('Shuru'), kind: 'time', required: true }, { key: 'minutes', label: t('Waqt (minute)'), kind: 'number' }, { key: 'maxParticipants', label: t('Seats'), kind: 'number' }, { key: 'isFree', label: t('Muft'), kind: 'switch' }, { key: 'memberPrice', label: t('Member fee'), kind: 'money', when: (v) => !v.isFree }, { key: 'dropInPrice', label: t('Drop-in fee'), kind: 'money', when: (v) => !v.isFree }]}
        initial={{ date: todayKey(), start: '18:00', minutes: 60, maxParticipants: 20, isFree: true, classType: 'YOGA' }}
        onSubmit={async (v) => {
          const startMs = new Date(toIso(v.date, v.start)).getTime();
          await gymApi.classes.create(clean({ name: v.name, classType: v.classType, scheduledStart: new Date(startMs).toISOString(), scheduledEnd: new Date(startMs + (v.minutes ?? 60) * 60000).toISOString(), maxParticipants: v.maxParticipants ?? 20, isFree: !!v.isFree, memberPrice: v.isFree ? 0 : v.memberPrice ?? 0, dropInPrice: v.isFree ? 0 : v.dropInPrice ?? 0 }));
          refreshGym(); toast.success(t('Class ban gayi'));
        }} />
    </DeskList>
  );
}

function ClassSheet({ id, manage, onClose }: { id: string | null; manage: boolean; onClose: () => void }) {
  const { guard } = useDeskOnline('gymDesk');
  const q = useQuery({ queryKey: [GYM_KEYS.classes, 'one', id], queryFn: () => gymApi.classes.getOne(id!), enabled: !!id });
  const c = q.data;
  const [member, setMember] = useState<GymMember | null>(null);
  const [pay, setPay] = useState(false);
  const bookable = !!c && c.status === 'SCHEDULED' && c.currentEnrolled < c.maxParticipants;
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); refreshGym(true); void q.refetch(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const book = async (paid?: number, method?: string) => { await gymApi.classes.book(id!, { memberId: member!.id, paidAmount: paid, paymentMethod: method }); refreshGym(true); setMember(null); void q.refetch(); toast.success(t('Booking ho gayi')); };
  const fee = c ? (c.isFree ? 0 : c.memberPrice) : 0;
  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={c?.name} description={c ? `${dateOf(c.scheduledStart)} · ${timeOf(c.scheduledStart)}–${timeOf(c.scheduledEnd)}` : undefined}
        footer={c && manage ? (
          <Row gap={2}>
            {c.status === 'SCHEDULED' && <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => gymApi.classes.status(c.id, 'IN_PROGRESS')))}>{t('Shuru')}</Button>}
            {c.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => gymApi.classes.status(c.id, 'COMPLETED')))}>{t('Khatam')}</Button>}
            {c.status === 'SCHEDULED' && <Button variant="secondary" onPress={() => guard(() => void act(() => gymApi.classes.status(c.id, 'CANCELLED', t('Cancel'))).then(onClose))}>{t('Cancel')}</Button>}
          </Row>
        ) : undefined}>
        {c && (
          <View style={{ gap: 6 }}>
            <DetailRow label={t('Seats')} value={`${c.currentEnrolled}/${c.maxParticipants}`} />
            <DetailRow label={t('Fee')} value={c.isFree ? t('Muft') : <Text ltr>{formatMoney(c.memberPrice)}</Text>} last />
            {(c.bookings ?? []).filter((b) => b.status !== 'CANCELLED').map((b) => (
              <ListRow key={b.id} dense title={b.member?.customer?.name ?? b.member?.memberNumber ?? b.bookingNumber} trailing={b.attended ? <Badge tone="success">{t('Aaya')}</Badge> : manage && c.status !== 'COMPLETED' ? <Button size="sm" variant="soft" onPress={() => guard(() => void act(() => gymApi.classes.checkIn(b.id)))}>{t('Check-in')}</Button> : undefined} />
            ))}
            {manage && bookable && (
              <>
                <MemberField value={member} onChange={setMember} label={t('Member jorein')} />
                <Button icon={Plus} disabled={!member} onPress={() => guard(() => (fee > 0 ? setPay(true) : void act(() => book())))}>{t('Book karein')}</Button>
              </>
            )}
          </View>
        )}
      </Sheet>
      <PaySheet open={pay} onClose={() => setPay(false)} title={t('Class fee')} name={member?.customer?.name ?? ''} due={fee} cta={t('Book karein')} onConfirm={async (p) => { await book(p.paidAmount, p.paymentMethod); }} />
    </>
  );
}
