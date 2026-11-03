/**
 * New leave request for one person: type, first and last day, reason. A
 * manager can save it as approved straight away.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, DatePicker, Input, Select, Sheet, Switch, Text, toast } from '@/design';
import { attendanceApi, type AttStaff, type LeaveType } from '../api/attendance';
import { ATT_KEY, LEAVE_TYPE, dateOfKey, keyOfDate } from '../lib/meta';

const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000) + 1;

export function LeaveSheet({ open, staff, today, staffId, canApprove, online, onClose }: {
  open: boolean; staff: AttStaff[]; today: string; staffId?: string; canApprove: boolean; online: boolean; onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={t('Chhutti likhein')} description={t('Approve chhutti ke din sheet par khud \'Chhutti\' dikhte hain')}>
      {open && <Body key={staffId ?? 'new'} staff={staff} today={today} staffId={staffId} canApprove={canApprove} online={online} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ staff, today, staffId: initial, canApprove, online, onClose }: { staff: AttStaff[]; today: string; staffId?: string; canApprove: boolean; online: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [staffId, setStaffId] = useState(initial ?? '');
  const [type, setType] = useState<LeaveType>('CASUAL');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState('');
  const [approve, setApprove] = useState(canApprove);
  const days = start && end && end >= start ? daysBetween(start, end) : 0;
  const valid = online && !!staffId && days > 0 && days <= 62;

  const m = useMutation({
    mutationFn: () => attendanceApi.createLeave({ staffId, type, startDate: start, endDate: end, reason: reason.trim() || undefined, approve: canApprove && approve }),
    onSuccess: () => {
      toast.success(approve && canApprove ? t('Chhutti approve ho gayi') : t('Chhutti ki darkhwast save ho gayi'), { message: t('{{days}} din', { days }) });
      void qc.invalidateQueries({ queryKey: [ATT_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      {!online && <Text size="sm" tone="warning">{t('Chhutti likhne ke liye internet chahiye.')}</Text>}
      <Select label={t('Kis ki chhutti')} value={staffId || null} onChange={setStaffId} placeholder={t('Staff chunein')}
        options={staff.map((s) => ({ value: s.id, label: s.fullName, description: s.designation }))} hint={t('Sirf kaam par mojood staff')} />
      <Select label={t('Kis type ki')} value={type} onChange={setType}
        options={(Object.keys(LEAVE_TYPE) as LeaveType[]).map((value) => ({ value, label: t(LEAVE_TYPE[value]) }))}
        hint={t('\'Bina tankhwah\' wali chhutti sheet me alag ginti hai')} />
      <DatePicker label={t('Pehla din')} value={dateOfKey(start)} onChange={(d) => { const k = keyOfDate(d); setStart(k); if (k > end) setEnd(k); }} hint={t('Chhutti kis din se')} />
      <DatePicker label={t('Aakhri din')} value={dateOfKey(end)} minimumDate={dateOfKey(start)} onChange={(d) => setEnd(keyOfDate(d))}
        error={end < start ? t('Aakhri din pehle din se pehle hai') : days > 62 ? t('62 din se lambi nahi') : undefined}
        hint={days ? t('{{days}} din', { days }) : undefined} />
      <Input label={t('Wajah (marzi se)')} value={reason} onChangeText={setReason} maxLength={500} placeholder={t('Masalan: shaadi, beemari')} hint={t('Sirf record ke liye')} />
      {canApprove && <Switch value={approve} onChange={setApprove} label={t('Abhi approve kar dein')} description={t('Hata dein to darkhwast \'faisla baqi\' me jayegi')} />}
      <Button fullWidth loading={m.isPending} disabled={!valid} onPress={() => m.mutate()}>{t('Save')}</Button>
    </View>
  );
}
