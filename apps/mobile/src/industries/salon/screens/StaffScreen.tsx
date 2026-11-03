/** Stylists and commission (web StaffPage + CommissionPayoutPage): who works when, their commission rule, and this month's commission with a payout. */

import { useQuery } from '@tanstack/react-query';
import { Banknote, FileText, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { router } from 'expo-router';
import { Badge, Button, DetailRow, Sheet, Text, confirm, toast } from '@/design';
import { DeskList, FormSheet, clean, type FormField, ltr } from '../../_shared/serviceKit';
import { todayKey, useDeskOnline, errorText } from '../../_shared/deskKit';
import { salonApi, type StaffProfile } from '../api';
import { COMMISSION_TYPES, SALON_KEYS, WEEKDAYS, refreshSalon, roleLabel, roleOptions, staffName } from '../meta';

export function StaffScreen() {
  const can = usePermission();
  const canStaff = can(P.STAFF_MANAGE);
  const canComm = can(P.COMMISSION_VIEW) || can(P.COMMISSION_MANAGE);
  const canPay = can(P.COMMISSION_MANAGE) && can(P.EXPENSES_CREATE);
  const { guard } = useDeskOnline('salonDesk');
  const hr = useOfflineList<{ id: string; fullName?: string; name?: string }>('staff');
  const [form, setForm] = useState<StaffProfile | 'new' | null>(null);
  const [open, setOpen] = useState<StaffProfile | null>(null);
  const monthStart = `${todayKey().slice(0, 8)}01`;
  const fields = (isNew: boolean): FormField[] => [
    ...(isNew ? [{ key: 'staffId', label: t('Staff'), kind: 'select' as const, required: true, options: (hr.data ?? []).map((s) => ({ value: s.id, label: s.fullName ?? s.name ?? '' })) }] : []),
    { key: 'role', label: t('Kaam'), kind: 'select', options: roleOptions(), required: true },
    { key: 'commissionType', label: t('Commission'), kind: 'select', options: COMMISSION_TYPES.map(([value, label]) => ({ value, label: t(label) })) },
    { key: 'commissionPct', label: t('Commission %'), kind: 'number', when: (v) => v.commissionType === 'PERCENTAGE' || v.commissionType === 'HYBRID' },
    { key: 'commissionFixed', label: t('Commission fixed'), kind: 'money', when: (v) => v.commissionType === 'FIXED_PER_SERVICE' || v.commissionType === 'HYBRID' },
    { key: 'workStartTime', label: t('Shuru'), kind: 'time' },
    { key: 'workEndTime', label: t('Khatam'), kind: 'time' },
    { key: 'isBookable', label: t('Booking le sakta hai'), kind: 'switch' },
  ];
  const save = async (v: Record<string, any>) => {
    const cur = form && form !== 'new' ? form : null;
    await salonApi.staff.upsert(clean({ ...v, staffId: cur?.staffId ?? v.staffId, commissionPct: v.commissionPct ?? 0, commissionFixed: v.commissionFixed ?? 0, workingDays: cur?.workingDays ?? [1, 2, 3, 4, 5, 6], isBookable: v.isBookable ?? true }));
    refreshSalon(); toast.success(t('Save ho gaya'));
  };
  return (
    <DeskList<StaffProfile[]> title={t('Stylists')} queryKey={[SALON_KEYS.staff, 'all']} fetch={() => salonApi.staff.list()} feature="salonDesk" emptyIcon={UserCheck} empty={t('Abhi koi stylist nahi')}
      rows={(list) => list.map((s) => ({
        id: s.id, icon: UserCheck, tone: s.isActive ? 'success' : 'neutral', search: `${staffName(s)} ${roleLabel(s.role)}`,
        title: staffName(s), subtitle: `${roleLabel(s.role)} · ${ltr(`${s.workStartTime}–${s.workEndTime}`)} · ${s.workingDays.map((d) => t(WEEKDAYS[d]).slice(0, 3)).join('، ')}`,
        trailing: <Badge tone={s.isBookable ? 'success' : 'neutral'}>{s.commissionType === 'PERCENTAGE' ? `${s.commissionPct}%` : s.commissionType === 'NONE' ? '—' : formatMoney(s.commissionFixed)}</Badge>,
        onPress: () => setOpen(s),
      }))}
      fab={canStaff ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <StylistSheet s={open} from={monthStart} canEdit={canStaff} canComm={canComm} canPay={canPay} onClose={() => setOpen(null)} onEdit={(s) => { setOpen(null); guard(() => setForm(s)); }} />
      <FormSheet open={!!form} title={form === 'new' ? t('New stylist') : t('Edit stylist')} fields={fields(form === 'new')} initial={form && form !== 'new' ? { ...form } : { commissionType: 'PERCENTAGE', commissionPct: 10, isBookable: true, workStartTime: '10:00', workEndTime: '20:00' }} onSubmit={save} onClose={() => setForm(null)} />
    </DeskList>
  );
}

function StylistSheet({ s, from, canEdit, canComm, canPay, onClose, onEdit }: { s: StaffProfile | null; from: string; canEdit: boolean; canComm: boolean; canPay: boolean; onClose: () => void; onEdit: (s: StaffProfile) => void }) {
  const to = todayKey();
  const q = useQuery({ queryKey: [SALON_KEYS.commission, s?.id, from], queryFn: () => salonApi.staff.commission({ from, to, staffProfileId: s!.id }), enabled: !!s && canComm });
  const row = q.data?.staff.find((x) => x.staffProfileId === s?.id);
  const pay = async () => {
    if (!s || !row || row.unpaid <= 0) return;
    if (!(await confirm({ title: t('{{amount}} commission dein?', { amount: formatMoney(row.unpaid) }), message: t('Ye drawer se Expense likha jayega.'), confirmLabel: t('Dein') }))) return;
    try { await salonApi.staff.payout({ staffProfileId: s.id, from, to, paymentMethod: 'CASH' }); refreshSalon([SALON_KEYS.commission], true); toast.success(t('Commission de di')); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <Sheet open={!!s} onClose={onClose} title={s ? staffName(s) : undefined} description={s ? roleLabel(s.role) : undefined}
      footer={s && canEdit ? <Button variant="secondary" onPress={() => onEdit(s)} fullWidth>{t('Edit')}</Button> : undefined}>
      {s && (
        <View style={{ gap: 4 }}>
          <DetailRow label={t('Kul appointments')} value={String(s.totalAppointments)} />
          <DetailRow label={t('Kul Sale')} value={<Text ltr>{formatMoney(s.totalRevenue)}</Text>} last={!canComm} />
          {canComm && (
            <>
              <DetailRow label={t('Is mahine services')} value={String(row?.services ?? 0)} />
              <DetailRow label={t('Is mahine Sale')} value={<Text ltr>{formatMoney(row?.revenue ?? 0)}</Text>} />
              <DetailRow label={t('Commission')} value={<Text ltr>{formatMoney(row?.net ?? 0)}</Text>} />
              <DetailRow label={t('Di ja chuki')} value={<Text ltr>{formatMoney(row?.paid ?? 0)}</Text>} />
              <DetailRow label={t('Baqi')} value={<Text weight="bold" ltr>{formatMoney(row?.unpaid ?? 0)}</Text>} last />
              {canPay && (row?.unpaid ?? 0) > 0 && <Button icon={Banknote} onPress={() => void pay()}>{t('Commission dein')}</Button>}
              <Button variant="soft" icon={FileText} onPress={() => { onClose(); router.push({ pathname: '/salon/commission', params: { id: s.id } } as never); }}>{t('Commission aur slips')}</Button>
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}
