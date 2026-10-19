/**
 * Appointment pieces shared by the list, calendar and detail screens: the
 * row, the status badge, and the actions with their dialogs (arrived, in
 * the chair, no-show, cancel, new time, advance, bill at the counter and
 * the WhatsApp reminder).
 */

import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Armchair, CalendarClock, CheckCircle2, MessageCircle, Receipt, UserCheck, UserX, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { TakePaymentModal } from '@modules/pos/components';
import { appointmentsApi, type Appointment, type AppointmentStatus } from '../api/appointments.api';
import { CancelModal } from './fields';
import { SALON_KEYS, STATUS, apiError, dayKey, serviceLine, shortDate, timeOf, toIso, waLink } from '../lib/meta';

const OPEN: AppointmentStatus[] = ['CONFIRMED', 'RESCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'DRAFT'];
export const isOpen = (a: Appointment) => !a.saleId && OPEN.includes(a.status);
export const dueOf = (a: Appointment) => Math.max(Number(a.total) - Number(a.paidAmount), 0);
export const lateBy = (a: Appointment) => ((a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') ? Math.round((Date.now() - new Date(a.scheduledStart).getTime()) / 60_000) : 0);

export function StatusBadge({ a }: { a: Appointment }) {
  const late = lateBy(a);
  if (late > 15) return <Badge size="sm" variant="danger" dot>Late {late < 120 ? `${late} min` : ''}</Badge>;
  if (a.status === 'IN_PROGRESS' && !a.saleId && (a.internalNotes ?? '').includes('void')) return <Badge size="sm" variant="warning" dot>Bill dobara</Badge>;
  const st = STATUS[a.status];
  return <Badge size="sm" variant={st.variant} dot>{st.label}</Badge>;
}

type Dialog = { kind: 'pay' | 'cancel' | 'move'; a: Appointment } | null;

/** Status moves and dialogs for appointments; render `modals` once on the page. */
export function useAppointmentActions() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Salon';
  const [dialog, setDialog] = useState<Dialog>(null);
  const refresh = () => [SALON_KEYS.appointments, 'salon-appointments-today', 'salon-appointments-upcoming'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const status = useMutation({
    mutationFn: ({ a, to, reason }: { a: Appointment; to: AppointmentStatus; reason?: string }) => appointmentsApi.updateStatus(a.id, to, reason),
    onSuccess: (_r, v) => { toast.success(`${v.a.appointmentNumber}: ${STATUS[v.to].label}`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Status nahi badla')),
  });
  const pay = useMutation({
    mutationFn: ({ a, amount, method }: { a: Appointment; amount: number; method: string }) => appointmentsApi.addPayment(a.id, { amount, paymentMethod: method }),
    onSuccess: () => { toast.success('Advance khate me jama ho gaya'); setDialog(null); refresh(); qc.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e) => toast.error(apiError(e, 'Payment nahi hui')),
  });

  const remind = (a: Appointment) => {
    const text = `Assalam o Alaikum ${a.customerName ?? ''}! ${shopName} me aap ka appointment ${shortDate(a.scheduledStart)} ${timeOf(a.scheduledStart)} par hai (${serviceLine(a.services)}).${dueOf(a) > 0 && a.paidAmount > 0 ? ` Advance ${formatPKR(a.paidAmount)} mil chuka.` : ''} Shukriya!`;
    window.open(waLink(a.customerPhone, text), '_blank', 'noopener');
  };

  const act = {
    arrived: (a: Appointment) => status.mutate({ a, to: 'ARRIVED' }),
    start: (a: Appointment) => status.mutate({ a, to: 'IN_PROGRESS' }),
    noShow: (a: Appointment) => status.mutate({ a, to: 'NO_SHOW' }),
    bill: (a: Appointment) => navigate(`/pos?appointment=${a.id}`),
    pay: (a: Appointment) => setDialog({ kind: 'pay', a }),
    cancel: (a: Appointment) => setDialog({ kind: 'cancel', a }),
    move: (a: Appointment) => setDialog({ kind: 'move', a }),
    remind,
    busy: status.isPending,
  };

  const modals = dialog && (
    dialog.kind === 'pay' ? (
      <TakePaymentModal title={`Advance — ${dialog.a.appointmentNumber}`} description={`${dialog.a.customerName ?? 'Customer'} · bill ${formatPKR(dialog.a.total)}`}
        amount={dueOf(dialog.a)} max={dueOf(dialog.a)} loading={pay.isPending} confirmLabel="Advance lein"
        hint="Customer ke khate me advance jama hota hai aur bill me khud kat jata hai"
        onConfirm={(amount, method) => pay.mutate({ a: dialog.a, amount, method })} onClose={() => setDialog(null)} />
    ) : dialog.kind === 'cancel' ? (
      <CancelModal title={`${dialog.a.appointmentNumber} · ${dialog.a.customerName ?? ''}`} paid={Number(dialog.a.paidAmount)}
        onConfirm={async (reason) => { await appointmentsApi.updateStatus(dialog.a.id, 'CANCELLED', reason || undefined); refresh(); }} onClose={() => setDialog(null)} />
    ) : (
      <MoveModal a={dialog.a} onDone={() => { setDialog(null); refresh(); }} onClose={() => setDialog(null)} />
    )
  );

  return { ...act, modals };
}

export type AppointmentActions = ReturnType<typeof useAppointmentActions>;

/** New date and time for a booking; the stylist must be free then. */
function MoveModal({ a, onDone, onClose }: { a: Appointment; onDone: () => void; onClose: () => void }) {
  const start = new Date(a.scheduledStart);
  const length = Math.max(Math.round((new Date(a.scheduledEnd).getTime() - start.getTime()) / 60_000), 5);
  const [date, setDate] = useState(dayKey(start));
  const [time, setTime] = useState(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: () => {
      const from = toIso(date, time);
      return appointmentsApi.reschedule(a.id, { scheduledStart: from, scheduledEnd: new Date(new Date(from).getTime() + length * 60_000).toISOString(), reason: reason.trim() || undefined });
    },
    onSuccess: () => { toast.success('Naya waqt lag gaya'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Waqt nahi badla')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Waqt badlein" description={`${a.appointmentNumber} · ${a.customerName ?? ''} · ${length} min`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={run.isPending} disabled={!date || !time} onClick={() => run.mutate()}>Naya waqt lagayein</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} min={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} />
          <Input label="Waqt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <Textarea label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Customer ne kaha, stylist chhutti par…" hint="Marzi hai" />
      </div>
    </Modal>
  );
}

/** One appointment in a list: time, customer, services and stylists, money and the next step. */
export function AppointmentRow({ a, act, canBook, canBill }: { a: Appointment; act: AppointmentActions; canBook: boolean; canBill: boolean }) {
  const due = dueOf(a);
  const open = isOpen(a);
  const people = [...new Set(a.services.map((s) => s.staffName).filter(Boolean))].join(', ');
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <Link to={`/salon/appointments/${a.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn('flex w-16 shrink-0 flex-col items-center rounded-xl py-1.5 text-center ring-1', a.status === 'IN_PROGRESS' ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200')}>
          <span className="text-[0.875rem] font-bold tabular-nums text-slate-900">{timeOf(a.scheduledStart)}</span>
          <span className="text-[0.625rem] text-slate-500">{shortDate(a.scheduledStart).split(',')[0]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{a.customerName || 'Walk-in'}</span>
            <StatusBadge a={a} />
            {(a.internalNotes ?? '').startsWith('Walk-in') && <Badge size="xs" variant="outline">Walk-in</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-slate-600">{serviceLine(a.services)}{people ? ` · ${people}` : ''}</span>
          <span className="mt-0.5 block text-[0.75rem] text-slate-500">
            {a.appointmentNumber} · {formatPKR(a.total)}
            {Number(a.paidAmount) > 0 && <span className="text-success-700"> · advance {formatPKR(a.paidAmount)}</span>}
            {a.saleId && <span className="text-success-700"> · bill ban gaya</span>}
          </span>
        </span>
      </Link>
      {open && (
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {canBook && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && <Button size="sm" variant="secondary" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => act.arrived(a)} disabled={act.busy}>Aa gaye</Button>}
          {canBook && a.status === 'ARRIVED' && <Button size="sm" variant="secondary" leftIcon={<Armchair className="h-4 w-4" />} onClick={() => act.start(a)} disabled={act.busy}>Chair par</Button>}
          {canBill && <Button size="sm" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => act.bill(a)}>Bill</Button>}
          {canBook && due > 0 && <IconBtn title="Advance lein" onClick={() => act.pay(a)}><Wallet className="h-4 w-4" /></IconBtn>}
          {a.customerPhone && <IconBtn title="WhatsApp yaad dihani" onClick={() => act.remind(a)}><MessageCircle className="h-4 w-4" /></IconBtn>}
          {canBook && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && <IconBtn title="Waqt badlein" onClick={() => act.move(a)}><CalendarClock className="h-4 w-4" /></IconBtn>}
          {canBook && lateBy(a) > 15 && <IconBtn title="Nahi aaye (no-show)" onClick={() => act.noShow(a)}><UserX className="h-4 w-4" /></IconBtn>}
          {canBook && <IconBtn title="Cancel" onClick={() => act.cancel(a)}><X className="h-4 w-4" /></IconBtn>}
        </div>
      )}
      {!open && a.saleId && <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-success-700"><CheckCircle2 className="h-4 w-4" /> Paid {formatPKR(a.paidAmount)}</span>}
    </li>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{children}</button>;
}
