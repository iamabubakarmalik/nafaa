/** Housekeeping (web HousekeepingPage): open cleaning and repair jobs per room with assign, start and done; add a job. */

import { Sparkle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Input, Row, Sheet, toast } from '@/design';
import { DeskList, FormSheet } from '../../_shared/serviceKit';
import { errorText, useDeskOnline } from '../../_shared/deskKit';
import { hotelApi, type HousekeepingTask } from '../api';
import { HOTEL_KEYS, PRIORITIES, TASK_TYPES, opts, refreshHotel, taskTypeLabel } from '../meta';

export function HousekeepingScreen() {
  const manage = usePermission()(P.SERVICE_BOOKINGS_MANAGE);
  const { guard } = useDeskOnline('hotelDesk');
  const [open, setOpen] = useState<HousekeepingTask | null>(null);
  const [add, setAdd] = useState(false);
  const [who, setWho] = useState('');
  const rooms = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'board'], queryFn: () => hotelApi.rooms.board(), enabled: add });
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); refreshHotel(); setOpen(null); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  return (
    <DeskList<HousekeepingTask[]> title={t('Housekeeping')} queryKey={[HOTEL_KEYS.housekeeping]} fetch={() => hotelApi.housekeeping.list({ view: 'open' })} feature="hotelDesk" emptyIcon={Sparkle} empty={t('Koi kaam baqi nahi')} refetchMs={60_000}
      rows={(list) => list.map((k) => ({
        id: k.id, icon: Sparkle, tone: k.priority === 'URGENT' ? 'danger' : k.priority === 'HIGH' ? 'warning' : 'info', search: `${k.roomNumber} ${taskTypeLabel(k.taskType)} ${k.assignedName ?? ''}`,
        title: `${t('Room')} ${k.roomNumber} · ${taskTypeLabel(k.taskType)}`, subtitle: k.assignedName ?? t('Kisi ko diya nahi'), trailing: <Badge tone={k.status === 'IN_PROGRESS' ? 'warning' : 'neutral'}>{k.status === 'IN_PROGRESS' ? t('Chal raha') : k.status === 'ASSIGNED' ? t('Diya hua') : t('Baqi')}</Badge>, onPress: manage ? () => { setWho(k.assignedName ?? ''); setOpen(k); } : undefined,
      }))}
      fab={manage ? { label: t('New'), onPress: () => guard(() => setAdd(true)) } : undefined}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${t('Room')} ${open.roomNumber}` : undefined} description={open ? taskTypeLabel(open.taskType) : undefined}
        footer={open ? <Row gap={2}>
          {open.status !== 'IN_PROGRESS' && <Button style={{ flex: 1 }} variant="secondary" onPress={() => guard(() => void act(async () => { if (who.trim() && who.trim() !== open.assignedName) await hotelApi.housekeeping.assign(open.id, who.trim()); await hotelApi.housekeeping.start(open.id); }))}>{t('Shuru')}</Button>}
          <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => hotelApi.housekeeping.complete(open.id, {})))}>{t('Ho gaya')}</Button>
        </Row> : undefined}>
        <View style={{ gap: 10 }}>
          <Input label={t('Kis ko diya')} value={who} onChangeText={setWho} />
          {open?.notes ? <DetailRow label={t('Note')} value={open.notes} last /> : null}
        </View>
      </Sheet>
      <FormSheet open={add} title={t('New kaam')} onClose={() => setAdd(false)}
        fields={[{ key: 'roomId', label: t('Room'), kind: 'select', required: true, options: (rooms.data?.rooms ?? []).map((r) => ({ value: r.id, label: r.roomNumber })) }, { key: 'taskType', label: t('Kaam'), kind: 'select', required: true, options: opts(TASK_TYPES) }, { key: 'priority', label: t('Zaroorat'), kind: 'select', options: opts(PRIORITIES) }, { key: 'assignedName', label: t('Kis ko diya') }, { key: 'notes', label: t('Note'), kind: 'multiline' }]}
        initial={{ taskType: 'DAILY_CLEAN', priority: 'NORMAL' }}
        onSubmit={async (v) => { await hotelApi.housekeeping.create({ roomId: v.roomId, taskType: v.taskType, priority: v.priority, assignedName: v.assignedName || undefined, notes: v.notes || undefined }); refreshHotel(); toast.success(t('Kaam likh liya')); }} />
    </DeskList>
  );
}
