/**
 * Eye test dialogs shared by the tests list and the test page: book a
 * test (customer, doctor, day and free slot, fee), take the fee (cash,
 * card, khata or waived), move it to another day, cancel or no-show.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus, Wallet } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { eyeTestsApi, type OpticalEyeTest } from '../api/eye-tests.api';
import { optometristsApi } from '../api/optometrists.api';
import { COMPLAINTS, MONEY_KEYS, OPTICAL_KEYS, TIME_SLOTS, apiError, moneyInput, todayInput } from '../lib/meta';
import { Chips, CustomerFields, ReasonModal, emptyParty, partyErrors, type PartyDraft } from './ui';

export type TestDialog = { kind: 'fee' | 'move' | 'cancel' | 'noshow'; test: OpticalEyeTest } | { kind: 'book' } | null;

export function useTestActions(onDone?: () => void) {
  const qc = useQueryClient();
  const refresh = (money: boolean) => {
    qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.tests] });
    qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.doctors] });
    qc.invalidateQueries({ queryKey: ['optical-dashboard-overview'] });
    if (money) MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const done = (msg: string, money = false) => { toast.success(msg); refresh(money); onDone?.(); };
  const start = useMutation({ mutationFn: (t: OpticalEyeTest) => eyeTestsApi.start(t.id), onSuccess: (_r, t) => done(`${t.customerName} — test shuru`), onError: (e) => toast.error(apiError(e, 'Shuru nahi hua')) });
  const fee = useMutation({
    mutationFn: ({ t, body }: { t: OpticalEyeTest; body: { amount?: number; paymentMethod?: PaymentMethod; onKhata?: boolean; waiveOff?: boolean } }) => eyeTestsApi.recordPayment(t.id, body),
    onSuccess: (r, v) => done(v.body.waiveOff ? 'Fees maaf kar di' : r.sale ? `Bill ${r.sale.saleNumber} ban gaya` : 'Fees save', !v.body.waiveOff),
    onError: (e) => toast.error(apiError(e, 'Fees save nahi hui')),
  });
  const status = useMutation({
    mutationFn: ({ t, body }: { t: OpticalEyeTest; body: Parameters<typeof eyeTestsApi.updateStatus>[1] }) => eyeTestsApi.updateStatus(t.id, body),
    onSuccess: () => done('Save ho gaya'),
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return { start, fee, status };
}

/** Free slots for the doctor on that day; without a doctor, the shop's usual slots. */
function useSlots(doctorId: string, date: string) {
  const q = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'slots', doctorId, date], queryFn: () => eyeTestsApi.availableSlots(doctorId, date), enabled: !!doctorId && !!date });
  return { slots: doctorId ? q.data?.available ?? [] : TIME_SLOTS, reason: q.data?.reason, fee: q.data?.optometrist?.consultationFee, loading: q.isLoading && !!doctorId };
}

export function BookTestModal({ onClose, onBooked }: { onClose: () => void; onBooked: (t: OpticalEyeTest) => void }) {
  const qc = useQueryClient();
  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'active'], queryFn: () => optometristsApi.list({ active: true }) });
  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [age, setAge] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [slot, setSlot] = useState('');
  const [complaint, setComplaint] = useState('');
  const [fee, setFee] = useState('');
  const [tried, setTried] = useState(false);
  const { slots, reason, fee: doctorFee, loading } = useSlots(doctorId, date);
  const pe = partyErrors(party);
  const ageN = age ? Number(age) : null;
  const ageErr = ageN != null && (!Number.isInteger(ageN) || ageN < 0 || ageN > 120) ? 'Umar 0 se 120' : undefined;
  const save = useMutation({
    mutationFn: () => eyeTestsApi.create({
      customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), customerAge: ageN ?? undefined,
      optometristId: doctorId || undefined, appointmentDate: new Date(`${date}T${slot || '12:00'}:00`).toISOString(), scheduledSlot: slot || undefined,
      chiefComplaint: complaint.trim() || undefined, testFee: fee !== '' ? Number(fee) : undefined,
    }),
    onSuccess: (t) => { toast.success(`${t.testNumber} book ho gaya`); qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.tests] }); onBooked(t); },
    onError: (e) => toast.error(apiError(e, 'Book nahi hua')),
  });
  const submit = () => { setTried(true); if (!Object.keys(pe).length && !ageErr && date && !save.isPending) save.mutate(); };
  const shownFee = fee !== '' ? Number(fee) : doctorFee;
  return (
    <Modal open onClose={onClose} size="lg" title="Eye test book karein" description="Customer, doctor aur waqt — fees test ke baad"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} loading={save.isPending} leftIcon={<CalendarPlus className="h-4 w-4" />}>Book karein</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <CustomerFields value={party} onChange={setParty} errors={tried ? pe : {}} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Umar" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} error={ageErr} hint="Marzi hai" />
          <Select label="Optometrist" value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setSlot(''); }}
            options={[{ value: '', label: 'Koi bhi' }, ...(doctors.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
          <Input label="Din" type="date" min={todayInput()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(''); }} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Waqt</span>
          {loading ? <p className="text-[0.8125rem] text-slate-500">Khali waqt dekh rahe hain…</p>
            : reason ? <p className="text-[0.8125rem] text-amber-700">Is din doctor nahi aate — doosra din chunein</p>
            : slots.length ? <Chips options={slots} value={slot} onChange={setSlot} clearable />
            : <p className="text-[0.8125rem] text-amber-700">Is din koi waqt khali nahi</p>}
        </div>
        <div>
          <Input label="Masla" value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Customer kya keh raha hai" maxLength={300} />
          <div className="mt-1.5"><Chips options={COMPLAINTS} value={complaint} onChange={setComplaint} clearable /></div>
        </div>
        <Input label="Fees" inputMode="decimal" value={fee} onChange={(e) => setFee(moneyInput(e.target.value))} placeholder={doctorFee != null ? String(doctorFee) : '0'}
          hint={shownFee != null ? `Fees: ${formatPKR(shownFee)} — khali chhoren to doctor ki fees lagti hai` : 'Muft test ho to 0 likhein'} />
      </form>
    </Modal>
  );
}

export function FeeModal({ test, pending, onConfirm, onClose }: {
  test: OpticalEyeTest; pending: boolean; onConfirm: (b: { amount?: number; paymentMethod?: PaymentMethod; onKhata?: boolean; waiveOff?: boolean }) => void; onClose: () => void;
}) {
  const due = Math.max(Math.round((test.testFee - test.paidAmount) * 100) / 100, 0);
  const [mode, setMode] = useState<'pay' | 'khata' | 'waive'>('pay');
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const n = Number(amount) || 0;
  const error = mode === 'pay' && (n <= 0 ? 'Amount likhein' : n > due + 0.01 ? `Sirf ${formatPKR(due)} baqi hai` : undefined);
  const submit = () => {
    if (error || pending) return;
    onConfirm(mode === 'waive' ? { waiveOff: true } : mode === 'khata' ? { onKhata: true } : { amount: n, paymentMethod: method });
  };
  const options = useMemo(() => [
    { id: 'pay' as const, label: 'Abhi lein' },
    { id: 'khata' as const, label: 'Khata me' },
    ...(test.paidAmount <= 0 ? [{ id: 'waive' as const, label: 'Maaf' }] : []),
  ], [test.paidAmount]);
  return (
    <Modal open onClose={onClose} size="sm" title={`Test fees — ${test.testNumber}`} description={`${test.customerName} · baqi ${formatPKR(due)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={!!error} loading={pending} leftIcon={<Wallet className="h-4 w-4" />}>{mode === 'waive' ? 'Fees maaf karein' : mode === 'khata' ? `${formatPKR(due)} khata me` : `${formatPKR(n)} lein`}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {options.map((o) => <button key={o.id} type="button" onClick={() => setMode(o.id)} className={`h-9 flex-1 rounded-lg text-[0.8125rem] font-semibold ${mode === o.id ? 'bg-white shadow' : 'text-slate-600'}`}>{o.label}</button>)}
        </div>
        {mode === 'pay' && (
          <>
            <Input label="Kitna mila" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} error={amount ? error || undefined : undefined} />
            <PaymentMethodPicker value={method} onChange={setMethod} />
          </>
        )}
        {mode === 'khata' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">{formatPKR(due)} {test.customerName} ke khata me udhaar likha jayega aur bill banega.</p>}
        {mode === 'waive' && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] text-slate-700 ring-1 ring-slate-200">Fees nahi li jayegi — koi bill nahi banta. Jaise: chashma banwane wale ka test muft.</p>}
      </form>
    </Modal>
  );
}

export function MoveTestModal({ test, pending, onConfirm, onClose }: {
  test: OpticalEyeTest; pending: boolean; onConfirm: (b: { rescheduledDate: string; scheduledSlot?: string; reason?: string }) => void; onClose: () => void;
}) {
  const [date, setDate] = useState(todayInput());
  const [slot, setSlot] = useState('');
  const [why, setWhy] = useState('');
  const { slots, reason, loading } = useSlots(test.optometristId ?? '', date);
  return (
    <Modal open onClose={onClose} size="sm" title={`Waqt badlein — ${test.customerName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!date} loading={pending}
        onClick={() => onConfirm({ rescheduledDate: new Date(`${date}T${slot || '12:00'}:00`).toISOString(), scheduledSlot: slot || '', reason: why.trim() ? `Waqt badla: ${why.trim()}` : undefined })}>Naya waqt save</Button></>}>
      <div className="space-y-3">
        <Input label="Naya din" type="date" min={todayInput()} value={date} onChange={(e) => { setDate(e.target.value); setSlot(''); }} />
        {loading ? <p className="text-[0.8125rem] text-slate-500">Khali waqt dekh rahe hain…</p> : reason ? <p className="text-[0.8125rem] text-amber-700">Is din doctor nahi aate</p> : <Chips options={slots} value={slot} onChange={setSlot} clearable />}
        <Textarea label="Wajah" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} hint="Marzi hai" />
      </div>
    </Modal>
  );
}

export function TestDialogs({ dialog, close, actions, onBooked }: { dialog: TestDialog; close: () => void; actions: ReturnType<typeof useTestActions>; onBooked?: (t: OpticalEyeTest) => void }) {
  if (!dialog) return null;
  if (dialog.kind === 'book') return <BookTestModal onClose={close} onBooked={(t) => { close(); onBooked?.(t); }} />;
  const t = dialog.test;
  if (dialog.kind === 'fee') return <FeeModal test={t} pending={actions.fee.isPending} onClose={close} onConfirm={(body) => actions.fee.mutate({ t, body })} />;
  if (dialog.kind === 'move') return <MoveTestModal test={t} pending={actions.status.isPending} onClose={close} onConfirm={(b) => actions.status.mutate({ t, body: { status: 'RESCHEDULED', ...b } })} />;
  return (
    <ReasonModal title={dialog.kind === 'noshow' ? `Nahi aaya — ${t.customerName}` : `Test cancel — ${t.customerName}`} confirm={dialog.kind === 'noshow' ? 'Nahi aaya' : 'Cancel karein'}
      pending={actions.status.isPending} presets={dialog.kind === 'noshow' ? ['Phone nahi uthaya', 'Kal aayega'] : ['Customer ne mana kiya', 'Doctor chhutti par']}
      onClose={close} onConfirm={(reason) => actions.status.mutate({ t, body: { status: dialog.kind === 'noshow' ? 'NO_SHOW' : 'CANCELLED', reason } })} />
  );
}
