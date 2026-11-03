/**
 * Owner / manager fix for one person's day: status, check-in and check-out
 * times, and a reason that goes to the activity log. Can also remove a wrong
 * entry. Needs internet (the correction is checked by the server).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DatePicker, IconButton, Input, Select, Sheet, Text, toast } from '@/design';
import { attendanceApi, type AttendanceStatus, type AttStaff, type DayCell, type ShopClock } from '../api/attendance';
import { ATT_KEY, CODE, dateOfKey, hhmm, hhmmOfDate, keyOfDate, timeOfHhmm } from '../lib/meta';

const STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: t('Hazir (late waqt se khud lagega)') },
  { value: 'HALF_DAY', label: t('Aadha din') },
  { value: 'ABSENT', label: t('Ghair hazir') },
  { value: 'ON_LEAVE', label: t('Chhutti') },
  { value: 'HOLIDAY', label: t('Tehwar / dukaan band') },
];

const REASONS = [t('Check-in bhool gaye'), t('Check-out bhool gaye'), t('Ghalat waqt laga'), t('Bahar kaam par the'), t('Malik ki permission se')];

const toStatus = (c?: DayCell): AttendanceStatus =>
  !c ? 'PRESENT' : c.code === 'A' ? 'ABSENT' : c.code === 'LV' ? 'ON_LEAVE' : c.code === 'HO' ? 'HOLIDAY' : c.code === 'H' ? 'HALF_DAY' : 'PRESENT';

export interface FixTarget { staff: AttStaff; date: string; cell?: DayCell }

export function CorrectSheet({ target, clock, today, online, onClose }: { target: FixTarget | null; clock: ShopClock; today: string; online: boolean; onClose: () => void }) {
  return (
    <Sheet open={!!target} onClose={onClose} title={t('Hazri theek karein')}
      description={target ? `${target.staff.fullName} · ${target.staff.designation}${target.cell ? ` · ${t('Abhi')}: ${t(CODE[target.cell.code].label)}` : ''}` : undefined}>
      {target && <Body key={`${target.staff.id}-${target.date}`} target={target} clock={clock} today={today} online={online} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ target, clock, today, online, onClose }: { target: FixTarget; clock: ShopClock; today: string; online: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { staff, cell } = target;
  const [date, setDate] = useState(target.date);
  const [status, setStatus] = useState<AttendanceStatus>(toStatus(cell));
  const [checkIn, setCheckIn] = useState(hhmm(cell?.in));
  const [checkOut, setCheckOut] = useState(hhmm(cell?.out));
  const [reason, setReason] = useState('');
  const timed = status === 'PRESENT' || status === 'HALF_DAY';
  const hasRecord = !!cell?.id && date === target.date;
  const valid = online && reason.trim().length >= 3 && !!date && date <= today && (!checkOut || !!checkIn);

  const done = (message: string, payrollMade: boolean) => {
    toast.success(message, { message: `${staff.fullName} · ${date}` });
    if (payrollMade) toast.warning(t('Is din ki tankhwah pehle ban chuki'), { message: t('Payroll page par us mahine ka hisaab dobara dekh lein') });
    void qc.invalidateQueries({ queryKey: [ATT_KEY] });
    onClose();
  };
  const save = useMutation({
    mutationFn: () => attendanceApi.correct({
      staffId: staff.id, date, status, reason: reason.trim(),
      checkIn: timed && checkIn ? checkIn : undefined, checkOut: timed && checkOut ? checkOut : undefined,
    }),
    onSuccess: (r) => done(t('Hazri save ho gayi'), r.payrollMade),
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: () => attendanceApi.correct({ staffId: staff.id, date, remove: true, reason: reason.trim() }),
    onSuccess: (r) => done(t('Hazri hata di'), r.payrollMade),
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      {!online && <Text size="sm" tone="warning">{t('Hazri theek karne ke liye internet chahiye.')}</Text>}
      <DatePicker label={t('Date')} value={dateOfKey(date)} maximumDate={dateOfKey(today)} onChange={(d) => setDate(keyOfDate(d))}
        hint={t('Karobari din; aane wala din nahi chun sakte')} />
      <Select label={t('Haal')} value={status} onChange={setStatus} options={STATUSES} hint={t('Late khud ginta hai — check-in ke waqt se')} />
      {timed && (
        <>
          <DatePicker mode="time" label={t('Aaye (check-in)')} value={checkIn ? timeOfHhmm(checkIn) : null} onChange={(d) => setCheckIn(hhmmOfDate(d))}
            placeholder={t('Waqt chunein')}
            hint={t('Dukaan {{openTime}} par khulti hai; {{graceMinutes}} min tak late nahi', { openTime: clock.openTime, graceMinutes: clock.graceMinutes })} />
          <DatePicker mode="time" label={t('Gaye (check-out)')} value={checkOut ? timeOfHhmm(checkOut) : null} onChange={(d) => setCheckOut(hhmmOfDate(d))}
            placeholder={t('Waqt chunein')} error={checkOut && !checkIn ? t('Pehle check-in ka waqt likhein') : undefined}
            hint={t('Aadhi raat ke baad gaye to bhi wohi waqt likhein')} />
        </>
      )}
      <View style={{ gap: 8 }}>
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={300} placeholder={t('Kyun badal rahe hain?')}
          hint={t('Zaroori hai — activity log me aap ke naam se likhi jayegi')} />
        <ChipGroup wrap options={REASONS.map((r) => ({ value: r, label: r }))} value={reason} onChange={setReason} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {hasRecord && <IconButton icon={Trash2} label={t('Entry hatayein')} variant="danger" size="lg" disabled={!valid || remove.isPending} onPress={() => remove.mutate()} />}
        <Button fullWidth style={{ flex: 1 }} loading={save.isPending} disabled={!valid || remove.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>
      </View>
    </View>
  );
}
