/**
 * Owner / manager fix for one person's day: status, check-in and
 * check-out times on the shop's clock, and a reason that goes to the
 * activity log. Can also remove a wrong entry.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PencilLine, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { attendanceApi, type AttStaff, type AttendanceStatus, type DayCell, type ShopClock } from '../api/attendance.api';
import { ATT_KEY, CODE, hhmm } from './meta';

const STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'PRESENT', label: 'Hazir (late waqt se khud lagega)' },
  { value: 'HALF_DAY', label: 'Aadha din' },
  { value: 'ABSENT', label: 'Ghair hazir' },
  { value: 'ON_LEAVE', label: 'Chhutti' },
  { value: 'HOLIDAY', label: 'Tehwar / dukaan band' },
];

const REASONS = ['Check-in bhool gaye', 'Check-out bhool gaye', 'Ghalat waqt laga', 'Bahar kaam par the', 'Malik ki ijazat se'];

const toStatus = (c?: DayCell): AttendanceStatus =>
  !c ? 'PRESENT' : c.code === 'A' ? 'ABSENT' : c.code === 'LV' ? 'ON_LEAVE' : c.code === 'HO' ? 'HOLIDAY' : c.code === 'H' ? 'HALF_DAY' : 'PRESENT';

export function CorrectModal({ staff, date: initialDate, cell, clock, today, onClose }: {
  staff: AttStaff; date: string; cell?: DayCell; clock: ShopClock; today: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(initialDate);
  const [status, setStatus] = useState<AttendanceStatus>(toStatus(cell));
  const [checkIn, setCheckIn] = useState(hhmm(cell?.in, clock.tz));
  const [checkOut, setCheckOut] = useState(hhmm(cell?.out, clock.tz));
  const [reason, setReason] = useState('');
  const timed = status === 'PRESENT' || status === 'HALF_DAY';
  const hasRecord = !!cell?.id && date === initialDate;
  const valid = reason.trim().length >= 3 && !!date && date <= today && (!checkOut || !!checkIn);

  const done = (msg: string, payrollMade: boolean) => {
    toast.success(msg, { description: `${staff.fullName} · ${date}` });
    if (payrollMade) toast.warning('Is din ki tankhwah pehle ban chuki', { description: 'Payroll page par us mahine ka hisaab dobara dekh lein' });
    void qc.invalidateQueries({ queryKey: [ATT_KEY] });
    onClose();
  };
  const onError = (e: { response?: { data?: { message?: string | string[] } } }) => {
    const m = e?.response?.data?.message;
    toast.error(Array.isArray(m) ? m[0] : m ?? 'Save nahi hua');
  };
  const save = useMutation({
    mutationFn: () => attendanceApi.correct({
      staffId: staff.id, date, status, reason: reason.trim(),
      checkIn: timed && checkIn ? checkIn : undefined, checkOut: timed && checkOut ? checkOut : undefined,
    }),
    onSuccess: (r) => done('Hazri save ho gayi', r.payrollMade),
    onError,
  });
  const remove = useMutation({
    mutationFn: () => attendanceApi.correct({ staffId: staff.id, date, remove: true, reason: reason.trim() }),
    onSuccess: (r) => done('Hazri hata di', r.payrollMade),
    onError,
  });

  return (
    <Modal open onClose={onClose} title="Hazri theek karein" description={`${staff.fullName} · ${staff.designation}${cell ? ` · abhi: ${CODE[cell.code].label}` : ''}`}
      footer={<>
        {hasRecord && (
          <Button variant="ghost" className="mr-auto text-rose-700" disabled={!valid} loading={remove.isPending} onClick={() => remove.mutate()} leftIcon={<Trash2 className="h-4 w-4" />}>
            Entry hatayein
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!valid || remove.isPending} leftIcon={<PencilLine className="h-4 w-4" />}>Save karein</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && !save.isPending) save.mutate(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Tareekh" type="date" max={today} required value={date} onChange={(e) => setDate(e.target.value)}
            hint="Karobari din; aane wala din nahi chun sakte" />
          <Select label="Haal" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)} options={STATUSES}
            hint="Late khud ginta hai — check-in ke waqt se" />
        </div>
        {timed && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Aaye (check-in)" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
              hint={`Dukaan ${clock.openTime} par khulti hai; ${clock.graceMinutes} min tak late nahi`} />
            <Input label="Gaye (check-out)" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
              error={checkOut && !checkIn ? 'Pehle check-in ka waqt likhein' : undefined}
              hint="Aadhi raat ke baad gaye to bhi wohi waqt likhein" />
          </div>
        )}
        <div>
          <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Kyun badal rahe hain?"
            hint="Zaroori hai — activity log me aap ke naam se likhi jayegi" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                  reason === r ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
            ))}
          </div>
        </div>
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}
