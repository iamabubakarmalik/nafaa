/**
 * Leave requests of the period: who, which days, what kind and the
 * decision. Pending requests can be approved or turned down with a reason;
 * approved ones can be cancelled.
 */

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Palmtree, X } from 'lucide-react';
import { Avatar, Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { attendanceApi, type LeaveRow } from '../api/attendance.api';
import { ATT_KEY, LEAVE_STATUS, LEAVE_TYPE, dayLabel } from './meta';

type Decision = 'APPROVE' | 'REJECT' | 'CANCEL';

export function LeavesList({ leaves, showShop, canDecide, empty }: { leaves: LeaveRow[]; showShop: boolean; canDecide: boolean; empty: ReactNode }) {
  const qc = useQueryClient();
  const [asking, setAsking] = useState<{ leave: LeaveRow; decision: Exclude<Decision, 'APPROVE'> } | null>(null);
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: ({ id, decision, why }: { id: string; decision: Decision; why?: string }) => attendanceApi.decideLeave(id, decision, why),
    onSuccess: (_r, v) => {
      toast.success({ APPROVE: 'Chhutti manzoor', REJECT: 'Chhutti na-manzoor', CANCEL: 'Chhutti cancel' }[v.decision]);
      void qc.invalidateQueries({ queryKey: [ATT_KEY] });
      setAsking(null);
      setReason('');
    },
    onError: (e: { response?: { data?: { message?: string | string[] } } }) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Nahi hua');
    },
  });

  if (!leaves.length) return <>{empty}</>;
  return (
    <>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {leaves.map((l) => {
          const st = LEAVE_STATUS[l.status];
          const busy = m.isPending && m.variables?.id === l.id;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
              <Avatar name={l.staff.fullName} url={l.staff.avatarUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-slate-900">{l.staff.fullName}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', l.type === 'UNPAID' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-violet-50 text-violet-700 ring-violet-200')}>{LEAVE_TYPE[l.type]}</span>
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
                  {l.staff.designation}{showShop && l.staff.shop ? ` · ${l.staff.shop.name}` : ''}{l.reason ? ` · ${l.reason}` : ''}
                  {l.rejectedReason ? ` · Wajah: ${l.rejectedReason}` : ''}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[0.6875rem] text-slate-400">{l.days} din</span>
                <span className="block text-[0.8125rem] font-semibold tabular-nums text-slate-900">
                  {dayLabel(l.startDate.slice(0, 10))}{l.endDate.slice(0, 10) !== l.startDate.slice(0, 10) ? ` — ${dayLabel(l.endDate.slice(0, 10))}` : ''}
                </span>
              </span>
              {canDecide && (
                <span className="ml-auto flex shrink-0 gap-1.5">
                  {l.status === 'PENDING' && <>
                    <Button size="sm" variant="success" loading={busy && m.variables?.decision === 'APPROVE'} disabled={busy} onClick={() => m.mutate({ id: l.id, decision: 'APPROVE' })} leftIcon={<Check className="h-4 w-4" />}>Manzoor</Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setAsking({ leave: l, decision: 'REJECT' })} leftIcon={<X className="h-4 w-4" />}>Na</Button>
                  </>}
                  {l.status === 'APPROVED' && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAsking({ leave: l, decision: 'CANCEL' })}>Cancel</Button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {asking && (
        <Modal open onClose={() => setAsking(null)} size="sm"
          title={asking.decision === 'REJECT' ? 'Chhutti na-manzoor karein' : 'Manzoor chhutti cancel karein'}
          description={`${asking.leave.staff.fullName} · ${asking.leave.days} din`}
          footer={<>
            <Button variant="secondary" onClick={() => setAsking(null)}>Rehne dein</Button>
            <Button variant="danger" loading={m.isPending} disabled={asking.decision === 'REJECT' && reason.trim().length < 2}
              onClick={() => m.mutate({ id: asking.leave.id, decision: asking.decision, why: reason.trim() || undefined })} leftIcon={<Palmtree className="h-4 w-4" />}>
              {asking.decision === 'REJECT' ? 'Na-manzoor' : 'Cancel karein'}
            </Button>
          </>}>
          <Input data-autofocus label="Wajah" required={asking.decision === 'REJECT'} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
            placeholder="Masalan: us din stock ginti hai" hint="Staff aur activity log me dikhegi" />
        </Modal>
      )}
    </>
  );
}
