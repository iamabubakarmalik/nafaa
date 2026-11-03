/** Technicians (web TechniciansPage): skill, level, open jobs and commission rule; duty status, this month's commission and a payout. */

import { useQuery } from '@tanstack/react-query';
import { Banknote, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Chip, DetailRow, Sheet, Text, confirm, toast } from '@/design';
import { errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet, clean, type FormField } from '../../_shared/serviceKit';
import { servicesApi, type Technician } from '../api';
import { LEVELS, SB_KEYS, TECH_STATUS, labelOf, opts, refreshServices, skillOptions } from '../meta';

export function TechniciansScreen() {
  const can = usePermission();
  const staffManage = can(P.STAFF_MANAGE);
  const canComm = can(P.COMMISSION_VIEW) || can(P.COMMISSION_MANAGE);
  const canPay = can(P.COMMISSION_MANAGE) && can(P.EXPENSES_CREATE);
  const { guard } = useDeskOnline('servicesDesk');
  const hr = useOfflineList<{ id: string; fullName?: string; name?: string }>('staff');
  const [form, setForm] = useState<Technician | 'new' | null>(null);
  const [open, setOpen] = useState<Technician | null>(null);
  const from = `${todayKey().slice(0, 8)}01`;
  const comm = useQuery({ queryKey: [SB_KEYS.techs, 'comm', open?.staffId, from], queryFn: () => servicesApi.technicians.commission(from, todayKey(), open!.staffId), enabled: !!open && canComm });
  const row = comm.data?.technicians.find((x) => x.technicianId === open?.staffId);
  const fields = (isNew: boolean): FormField[] => [
    ...(isNew ? [{ key: 'staffId', label: t('Staff'), kind: 'select' as const, required: true, options: (hr.data ?? []).map((s) => ({ value: s.id, label: s.fullName ?? s.name ?? '' })) }] : []),
    { key: 'level', label: t('Level'), kind: 'select', options: opts(LEVELS) }, { key: 'primarySkill', label: t('Hunar'), kind: 'select', options: skillOptions() },
    { key: 'commissionType', label: t('Commission'), kind: 'select', options: [{ value: 'NONE', label: t('Koi nahi') }, { value: 'PERCENTAGE', label: t('Percent') }, { value: 'FIXED', label: t('Fixed per job') }, { value: 'BOTH', label: t('Percent + fixed') }] },
    { key: 'commissionPct', label: t('Commission %'), kind: 'number', when: (v) => v.commissionType === 'PERCENTAGE' || v.commissionType === 'BOTH' }, { key: 'fixedPerJob', label: t('Fixed per job'), kind: 'money', when: (v) => v.commissionType === 'FIXED' || v.commissionType === 'BOTH' },
    { key: 'maxOngoingJobs', label: t('Ek waqt me zyada se zyada jobs'), kind: 'number' }, { key: 'isAvailableForEmergency', label: t('Emergency ke liye available'), kind: 'switch' },
  ];
  const pay = async () => {
    if (!open || !row || row.unpaid <= 0) return;
    if (!(await confirm({ title: t('{{amount}} commission dein?', { amount: formatMoney(row.unpaid) }), message: t('Ye drawer se Expense likha jayega.'), confirmLabel: t('Dein') }))) return;
    try { await servicesApi.technicians.pay({ technicianId: open.staffId, from, to: todayKey(), paymentMethod: 'CASH' }); refreshServices(true); void comm.refetch(); toast.success(t('Commission de di')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <DeskList<Technician[]> title={t('Technicians')} queryKey={[SB_KEYS.techs, 'all']} fetch={() => servicesApi.technicians.list()} feature="servicesDesk" emptyIcon={Users} empty={t('Abhi koi technician nahi')}
      rows={(list) => list.map((x) => ({
        id: x.id, icon: Users, tone: TECH_STATUS[x.status]?.tone ?? 'neutral', search: `${x.staff?.fullName} ${x.primarySkill ?? ''}`, title: x.staff?.fullName ?? '—', subtitle: `${labelOf(LEVELS, x.level)}${x.primarySkill ? ` · ${x.primarySkill}` : ''} · ${t('{{n}} khuli jobs', { n: x.openJobs ?? 0 })}`,
        trailing: <Badge tone={TECH_STATUS[x.status]?.tone ?? 'neutral'}>{t(TECH_STATUS[x.status]?.label ?? x.status)}</Badge>, onPress: () => setOpen(x),
      }))}
      fab={staffManage ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.staff?.fullName} description={open?.primarySkill ?? undefined}
        footer={open && staffManage ? <Button fullWidth variant="secondary" onPress={() => { const x = open; setOpen(null); guard(() => setForm(x)); }}>{t('Edit')}</Button> : undefined}>
        {open && <View style={{ gap: 8 }}>
          {manageStatus(open, guard, () => { refreshServices(); setOpen(null); }, can(P.SERVICE_JOBS_MANAGE))}
          <DetailRow label={t('Kul jobs')} value={String(open.totalJobs)} /><DetailRow label={t('Mukammal')} value={String(open.completedJobs)} last={!canComm} />
          {canComm && <>
            <DetailRow label={t('Is mahine jobs')} value={String(row?.jobs ?? 0)} /><DetailRow label={t('Commission')} value={<Text ltr>{formatMoney(row?.commission ?? 0)}</Text>} /><DetailRow label={t('Di ja chuki')} value={<Text ltr>{formatMoney(row?.paid ?? 0)}</Text>} />
            <DetailRow label={t('Baqi')} value={<Text weight="bold" ltr>{formatMoney(row?.unpaid ?? 0)}</Text>} last />
            {canPay && (row?.unpaid ?? 0) > 0 && <Button icon={Banknote} onPress={() => void pay()}>{t('Commission dein')}</Button>}
          </>}
        </View>}
      </Sheet>
      <FormSheet open={!!form} title={form === 'new' ? t('New technician') : t('Edit technician')} fields={fields(form === 'new')} onClose={() => setForm(null)}
        initial={form && form !== 'new' ? { ...form } : { level: 'JUNIOR', primarySkill: 'OTHER', commissionType: 'PERCENTAGE', commissionPct: 20, maxOngoingJobs: 3, isAvailableForEmergency: false }}
        onSubmit={async (v) => { const cur = form && form !== 'new' ? form : null; await servicesApi.technicians.upsert(clean({ ...v, staffId: cur?.staffId ?? v.staffId, commissionPct: v.commissionPct ?? 0, fixedPerJob: v.fixedPerJob ?? 0, maxOngoingJobs: v.maxOngoingJobs ?? 3, experienceYears: 0, serviceAreas: [], workingDays: [1, 2, 3, 4, 5, 6], isAvailableForEmergency: !!v.isAvailableForEmergency, isActive: true })); refreshServices(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}

function manageStatus(x: Technician, guard: (run: () => void) => void, done: () => void, can: boolean) {
  if (!can) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['AVAILABLE', 'ON_BREAK', 'OFF_DUTY', 'ON_LEAVE'].map((s) => <Chip key={s} label={t(TECH_STATUS[s].label)} selected={x.status === s} onPress={() => guard(() => void servicesApi.technicians.status(x.id, s).then(done))} />)}
    </View>
  );
}
