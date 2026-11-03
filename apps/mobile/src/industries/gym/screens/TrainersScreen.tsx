/** Trainers (web TrainersPage): rates, working hours and commission; this month's commission with a payout. */

import { useQuery } from '@tanstack/react-query';
import { Banknote, Dumbbell } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Sheet, Text, confirm, toast } from '@/design';
import { DeskList, FormSheet, clean, type FormField, ltr } from '../../_shared/serviceKit';
import { errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type Trainer } from '../api';
import { GYM_KEYS, refreshGym, trainerRoleLabel, trainerRoleOptions } from '../meta';

export function TrainersScreen() {
  const can = usePermission();
  const canStaff = can(P.STAFF_MANAGE);
  const canComm = can(P.COMMISSION_VIEW) || can(P.COMMISSION_MANAGE);
  const canPay = can(P.COMMISSION_MANAGE) && can(P.EXPENSES_CREATE);
  const { guard } = useDeskOnline('gymDesk');
  const hr = useOfflineList<{ id: string; fullName?: string; name?: string }>('staff');
  const [form, setForm] = useState<Trainer | 'new' | null>(null);
  const [open, setOpen] = useState<Trainer | null>(null);
  const from = `${todayKey().slice(0, 8)}01`;
  const comm = useQuery({ queryKey: [GYM_KEYS.trainers, 'comm', open?.id, from], queryFn: () => gymApi.trainers.commission(open!.id, from, todayKey()), enabled: !!open && canComm });
  const fields = (isNew: boolean): FormField[] => [
    ...(isNew ? [{ key: 'staffId', label: t('Staff'), kind: 'select' as const, required: true, options: (hr.data ?? []).map((s) => ({ value: s.id, label: s.fullName ?? s.name ?? '' })) }] : []),
    { key: 'role', label: t('Kaam'), kind: 'select', options: trainerRoleOptions(), required: true },
    { key: 'perSessionRate', label: t('Per session rate'), kind: 'money' }, { key: 'commissionPct', label: t('Commission %'), kind: 'number' }, { key: 'commissionFixed', label: t('Commission fixed'), kind: 'money' },
    { key: 'workStartTime', label: t('Shuru'), kind: 'time' }, { key: 'workEndTime', label: t('Khatam'), kind: 'time' }, { key: 'isAvailable', label: t('Available'), kind: 'switch' },
  ];
  const save = async (v: Record<string, any>) => {
    const body = clean({ ...v, perSessionRate: v.perSessionRate ?? 0, hourlyRate: v.hourlyRate ?? 0, monthlyPackageRate: v.monthlyPackageRate ?? 0, commissionPct: v.commissionPct ?? 0, commissionFixed: v.commissionFixed ?? 0, isAvailable: v.isAvailable ?? true });
    if (form === 'new') await gymApi.trainers.create(body); else { delete (body as any).staffId; await gymApi.trainers.update((form as Trainer).id, body); }
    refreshGym(); toast.success(t('Save ho gaya'));
  };
  const pay = async () => {
    const owed = comm.data?.owed ?? 0;
    if (!open || owed <= 0) return;
    if (!(await confirm({ title: t('{{amount}} commission dein?', { amount: formatMoney(owed) }), message: t('Ye drawer se Expense likha jayega.'), confirmLabel: t('Dein') }))) return;
    try { await gymApi.trainers.pay(open.id, { amount: owed, paymentMethod: 'CASH' }); refreshGym(true); void comm.refetch(); toast.success(t('Commission de di')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <DeskList<Trainer[]> title={t('Trainers')} queryKey={[GYM_KEYS.trainers, 'all']} fetch={() => gymApi.trainers.list()} feature="gymDesk" emptyIcon={Dumbbell} empty={t('Abhi koi trainer nahi')}
      rows={(list) => list.map((tr) => ({
        id: tr.id, icon: Dumbbell, tone: tr.isAvailable ? 'success' : 'neutral', search: `${tr.staff?.fullName} ${tr.trainerNumber}`, title: tr.staff?.fullName ?? tr.trainerNumber,
        subtitle: `${trainerRoleLabel(tr.role)} · ${ltr(`${tr.workStartTime}–${tr.workEndTime}`)} · ${t('{{n}} clients', { n: tr.activeClients })}`,
        trailing: <Badge tone={tr.isAvailable ? 'success' : 'neutral'}>{tr.perSessionRate > 0 ? formatMoney(tr.perSessionRate) : `${tr.commissionPct}%`}</Badge>, onPress: () => setOpen(tr),
      }))}
      fab={canStaff ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.staff?.fullName} description={open ? trainerRoleLabel(open.role) : undefined}
        footer={open && canStaff ? <Button fullWidth variant="secondary" onPress={() => { const o = open; setOpen(null); guard(() => setForm(o)); }}>{t('Edit')}</Button> : undefined}>
        {open && (
          <View style={{ gap: 4 }}>
            <DetailRow label={t('Kul sessions')} value={String(open.totalSessions)} />
            <DetailRow label={t('Kul Sale')} value={<Text ltr>{formatMoney(open.totalRevenue)}</Text>} last={!canComm} />
            {canComm && <>
              <DetailRow label={t('Is mahine sessions')} value={String(comm.data?.sessions ?? 0)} />
              <DetailRow label={t('Is mahine commission')} value={<Text ltr>{formatMoney(comm.data?.earned ?? 0)}</Text>} />
              <DetailRow label={t('Di ja chuki')} value={<Text ltr>{formatMoney(comm.data?.paid ?? 0)}</Text>} />
              <DetailRow label={t('Baqi')} value={<Text weight="bold" ltr>{formatMoney(comm.data?.owed ?? 0)}</Text>} last />
              {canPay && (comm.data?.owed ?? 0) > 0 && <Button icon={Banknote} onPress={() => void pay()}>{t('Commission dein')}</Button>}
            </>}
          </View>
        )}
      </Sheet>
      <FormSheet open={!!form} title={form === 'new' ? t('New trainer') : t('Edit trainer')} fields={fields(form === 'new')} initial={form && form !== 'new' ? { ...form } : { role: 'PERSONAL_TRAINER', commissionPct: 20, isAvailable: true, workStartTime: '06:00', workEndTime: '22:00' }} onSubmit={save} onClose={() => setForm(null)} />
    </DeskList>
  );
}
