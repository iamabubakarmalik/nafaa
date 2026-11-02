/**
 * New leave request for one person: type, first and last day, reason.
 * A manager can save it as approved straight away.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Palmtree } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/design-system/components';
import { attendanceApi, type AttStaff, type LeaveType } from '../api/attendance.api';
import { ATT_KEY, LEAVE_TYPE } from './meta';
import { t } from '@core/i18n';

const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000) + 1;

export function LeaveModal({ staff, today, staffId: initialStaff, canApprove, onClose }: {
  staff: AttStaff[]; today: string; staffId?: string; canApprove: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [staffId, setStaffId] = useState(initialStaff ?? '');
  const [type, setType] = useState<LeaveType>('CASUAL');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [reason, setReason] = useState('');
  const [approve, setApprove] = useState(canApprove);
  const days = start && end && end >= start ? daysBetween(start, end) : 0;
  const valid = !!staffId && days > 0 && days <= 62;

  const m = useMutation({
    mutationFn: () => attendanceApi.createLeave({ staffId, type, startDate: start, endDate: end, reason: reason.trim() || undefined, approve: canApprove && approve }),
    onSuccess: () => {
      toast.success(approve && canApprove ? t('Chhutti approve ho gayi') : t('Chhutti ki darkhwast save ho gayi'), { description: t('{{days}} din', { days }) });
      void qc.invalidateQueries({ queryKey: [ATT_KEY] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string | string[] } } }) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? t('Save nahi hua'));
    },
  });

  return (
    <Modal open onClose={onClose} title={t('Chhutti likhein')} description={t('Approve chhutti ke din sheet par khud \'Chhutti\' dikhte hain')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!valid} leftIcon={<Palmtree className="h-4 w-4" />}>{t('Save karein')}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }}>
        <Select label={t('Kis ki chhutti')} required value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder={t('Staff chunein')}
          options={staff.map((s) => ({ value: s.id, label: `${s.fullName} · ${s.designation}` }))} hint={t('Sirf kaam par mojood staff')} />
        <Select label={t('Kis type ki')} value={type} onChange={(e) => setType(e.target.value as LeaveType)}
          options={Object.entries(LEAVE_TYPE).map(([value, label]) => ({ value, label }))} hint={t('\'Bina tankhwah\' wali chhutti sheet me alag ginti hai')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Pehla din')} type="date" required value={start} onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} hint={t('Chhutti kis din se')} />
          <Input label={t('Aakhri din')} type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)}
            error={end < start ? t('Aakhri din pehle din se pehle hai') : days > 62 ? t('62 din se lambi nahi') : undefined}
            hint={days ? t('{{days}} din', { days }) : undefined} />
        </div>
        <Textarea label={t('Wajah (marzi se)')} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={t('Masalan: shaadi, beemari')} hint={t('Sirf record ke liye')} />
        {canApprove && (
          <Checkbox label={t('Abhi approve kar dein')} checked={approve} onChange={(e) => setApprove(e.target.checked)}
            description={t('Hata dein to darkhwast \'faisla baqi\' me jayegi')} />
        )}
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}
