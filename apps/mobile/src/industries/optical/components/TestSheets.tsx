/**
 * Eye test desk sheets shared by the tests list and the test page: book,
 * take the fee (now, on khata or waived), move to another time, and cancel
 * or mark "did not come". `useTestActions` holds the requests.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarPlus, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Button, Card, ChipGroup, DatePicker, Input, MoneyInput, Segmented, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { eyeTestsApi, optometristsApi, type OpticalEyeTest, type PayMethod, type TestStatus } from '../api';
import { COMPLAINTS, asDate, NO_SHOW_REASONS, CANCEL_TEST_REASONS, OPTICAL_KEYS, PAY_METHODS, TIME_SLOTS, dayKey, isoAt, refreshOptical, todayKey } from '../meta';
import { Choices, PartyFields, emptyParty, partyErrors, type PartyDraft } from './parts';

export type TestDialog = { kind: 'fee' | 'move' | 'cancel' | 'noshow'; test: OpticalEyeTest } | { kind: 'book' } | null;

export function useTestActions(onDone?: () => void) {
  const online = useOnlineStatus();
  const done = (msgText: string, money = false) => { toast.success(msgText); refreshOptical([OPTICAL_KEYS.tests, OPTICAL_KEYS.doctors], money); onDone?.(); };
  const guard = () => { if (!online) { toast.warning(onlineNeededText('opticalDesk')); throw new Error('offline'); } };
  const start = useMutation({
    mutationFn: (x: OpticalEyeTest) => { guard(); return eyeTestsApi.start(x.id); },
    onSuccess: (_r, x) => done(t('{{customerName}} — test shuru', { customerName: x.customerName })),
  });
  const fee = useMutation({
    mutationFn: ({ x, body }: { x: OpticalEyeTest; body: { amount?: number; paymentMethod?: PayMethod; onKhata?: boolean; waiveOff?: boolean } }) => { guard(); return eyeTestsApi.recordPayment(x.id, body); },
    onSuccess: (r, v) => done(v.body.waiveOff ? t('Fees maaf kar di') : r.sale ? t('Bill {{saleNumber}} ban gaya', { saleNumber: r.sale.saleNumber }) : t('Fees save'), !v.body.waiveOff),
  });
  const status = useMutation({
    mutationFn: ({ x, body }: { x: OpticalEyeTest; body: { status: TestStatus; reason?: string; rescheduledDate?: string; scheduledSlot?: string } }) => { guard(); return eyeTestsApi.updateStatus(x.id, body); },
    onSuccess: () => done(t('Save ho gaya')),
  });
  return { start, fee, status };
}

/** Free slots for the doctor on that day; without a doctor, the shop's usual slots. */
function useSlots(doctorId: string, date: string, enabled: boolean) {
  const q = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'slots', doctorId, date], queryFn: () => eyeTestsApi.availableSlots(doctorId, date), enabled: enabled && !!doctorId && !!date });
  return { slots: doctorId ? q.data?.available ?? [] : TIME_SLOTS, reason: q.data?.reason, fee: q.data?.optometrist?.consultationFee, loading: q.isLoading && !!doctorId };
}

export function BookTestSheet({ open, onClose, onBooked }: { open: boolean; onClose: () => void; onBooked: (x: OpticalEyeTest) => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const doctors = useQuery({ queryKey: [OPTICAL_KEYS.doctors, 'active'], queryFn: () => optometristsApi.list({ active: true }), enabled: open });
  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [age, setAge] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [complaint, setComplaint] = useState('');
  const [fee, setFee] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setParty(emptyParty); setAge(''); setDoctorId(''); setDate(todayKey()); setSlot(''); setComplaint(''); setFee(null); setTried(false); } }, [open]);
  const { slots, reason, fee: doctorFee, loading } = useSlots(doctorId, date, open);
  const pe = partyErrors(party);
  const ageN = age ? Number(age) : null;
  const ageErr = ageN != null && (!Number.isInteger(ageN) || ageN < 0 || ageN > 120) ? t('Umar 0 se 120') : undefined;
  const save = useMutation({
    mutationFn: () => eyeTestsApi.create({
      customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), customerAge: ageN ?? undefined,
      optometristId: doctorId || undefined, appointmentDate: isoAt(date, slot || '12:00'), scheduledSlot: slot || undefined,
      chiefComplaint: complaint.trim() || undefined, testFee: fee ?? undefined,
    }),
    onSuccess: (x) => { toast.success(t('{{testNumber}} book ho gaya', { testNumber: x.testNumber })); refreshOptical([OPTICAL_KEYS.tests]); onBooked(x); },
  });
  const submit = () => {
    setTried(true);
    if (!online) { toast.warning(onlineNeededText('opticalDesk')); return; }
    if (!Object.keys(pe).length && !ageErr && date && !save.isPending) save.mutate();
  };
  const shownFee = fee ?? doctorFee;
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Eye test book karein')} description={t('Customer, doctor aur waqt — fees test ke baad')}
      footer={<Button fullWidth size="lg" icon={CalendarPlus} loading={save.isPending} onPress={submit}>{t('Book karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <PartyFields value={party} onChange={setParty} errors={tried ? pe : {}} />
        <Input label={t('Umar')} value={age} onChangeText={(v) => setAge(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" error={ageErr} hint={t('Marzi hai')} />
        <Select label={t('Optometrist')} value={doctorId} onChange={(v) => { setDoctorId(v); setSlot(''); }}
          options={[{ value: '', label: t('Koi bhi') }, ...(doctors.data ?? []).map((d) => ({ value: d.id, label: d.name }))]} />
        <DatePicker label={t('Din')} value={asDate(date)} onChange={(d) => { setDate(dayKey(d.toISOString())); setSlot(''); }} minimumDate={new Date()} />
        <View style={{ gap: th.space(1.5) }}>
          <Text size="sm" weight="medium" tone="secondary">{t('Waqt')}</Text>
          {loading ? <Text size="sm" tone="muted">{t('Khali waqt dekh rahe hain…')}</Text>
            : reason ? <Text size="sm" tone="warning">{t('Is din doctor nahi aate — doosra din chunein')}</Text>
            : slots.length ? <Choices options={slots} value={slot} onChange={setSlot} clearable />
            : <Text size="sm" tone="warning">{t('Is din koi waqt khali nahi')}</Text>}
        </View>
        <Input label={t('Masla')} value={complaint} onChangeText={setComplaint} placeholder={t('Customer kya keh raha hai')} maxLength={300} />
        <Choices options={COMPLAINTS} value={complaint} onChange={setComplaint} clearable />
        <MoneyInput label={t('Fees')} value={fee} onChangeValue={setFee} placeholder={doctorFee != null ? String(doctorFee) : '0'}
          hint={shownFee != null ? t('Fees: {{shownFee}} — khali chhoren to doctor ki fees lagti hai', { shownFee: formatMoney(shownFee) }) : t('Muft test ho to 0 likhein')} />
      </View>
    </Sheet>
  );
}

export function FeeSheet({ open, test, pending, onConfirm, onClose }: {
  open: boolean; test: OpticalEyeTest; pending: boolean; onConfirm: (b: { amount?: number; paymentMethod?: PayMethod; onKhata?: boolean; waiveOff?: boolean }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const due = Math.max(Math.round((test.testFee - test.paidAmount) * 100) / 100, 0);
  const [mode, setMode] = useState<'pay' | 'khata' | 'waive'>('pay');
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState<PayMethod>('CASH');
  useEffect(() => { if (open) { setMode('pay'); setAmount(due); setMethod('CASH'); } }, [open, due]);
  const n = amount ?? 0;
  const error = mode === 'pay' && (n <= 0 ? t('Amount likhein') : n > due + 0.01 ? t('Sirf {{due}} baqi hai', { due: formatMoney(due) }) : undefined);
  const options = useMemo(() => [
    { value: 'pay' as const, label: t('Abhi lein') }, { value: 'khata' as const, label: t('Khata me') },
    ...(test.paidAmount <= 0 ? [{ value: 'waive' as const, label: t('Maaf') }] : []),
  ], [test.paidAmount]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Test fees — {{testNumber}}', { testNumber: test.testNumber })} description={t('{{customerName}} · baqi {{due}}', { customerName: test.customerName, due: formatMoney(due) })}
      footer={<Button fullWidth size="lg" icon={Wallet} loading={pending} disabled={!!error}
        onPress={() => onConfirm(mode === 'waive' ? { waiveOff: true } : mode === 'khata' ? { onKhata: true } : { amount: n, paymentMethod: method })}>
        {mode === 'waive' ? t('Fees maaf karein') : mode === 'khata' ? t('{{due}} khata me', { due: formatMoney(due) }) : t('{{formatPKR}} lein', { formatPKR: formatMoney(n) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={mode} onChange={setMode} options={options} />
        {mode === 'pay' && (
          <>
            <MoneyInput label={t('Kitna mila')} value={amount} onChangeValue={setAmount} size="xl" error={amount != null ? error || undefined : undefined} />
            <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />
          </>
        )}
        {mode === 'khata' && <Card tone="warning"><Text size="sm">{t('{{due}} {{customerName}} ke khata me udhaar likha jayega aur bill banega.', { due: formatMoney(due), customerName: test.customerName })}</Text></Card>}
        {mode === 'waive' && <Card><Text size="sm" tone="secondary">{t('Fees nahi li jayegi — koi bill nahi banta. Jaise: chashma banwane wale ka test muft.')}</Text></Card>}
      </View>
    </Sheet>
  );
}

export function MoveTestSheet({ open, test, pending, onConfirm, onClose }: {
  open: boolean; test: OpticalEyeTest; pending: boolean; onConfirm: (b: { rescheduledDate: string; scheduledSlot?: string; reason?: string }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [why, setWhy] = useState('');
  useEffect(() => { if (open) { setDate(todayKey()); setSlot(''); setWhy(''); } }, [open]);
  const { slots, reason, loading } = useSlots(test.optometristId ?? '', date, open);
  return (
    <Sheet open={open} onClose={onClose} title={t('Waqt badlein — {{customerName}}', { customerName: test.customerName })}
      footer={<Button fullWidth size="lg" loading={pending} onPress={() => onConfirm({ rescheduledDate: isoAt(date, slot || '12:00'), scheduledSlot: slot || '', reason: why.trim() ? t('Waqt badla: {{value}}', { value: why.trim() }) : undefined })}>{t('Naya waqt save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DatePicker label={t('Naya din')} value={asDate(date)} onChange={(d) => { setDate(dayKey(d.toISOString())); setSlot(''); }} minimumDate={new Date()} />
        {loading ? <Text size="sm" tone="muted">{t('Khali waqt dekh rahe hain…')}</Text> : reason ? <Text size="sm" tone="warning">{t('Is din doctor nahi aate')}</Text> : <Choices options={slots} value={slot} onChange={setSlot} clearable />}
        <TextArea label={t('Wajah')} value={why} onChangeText={setWhy} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

export function ReasonSheet({ open, title, confirm, presets, pending, onConfirm, onClose }: {
  open: boolean; title: string; confirm: string; presets: string[]; pending: boolean; onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const ok = reason.trim().length >= 3;
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<Button fullWidth size="lg" variant="danger" loading={pending} disabled={!ok} onPress={() => onConfirm(reason.trim())}>{confirm}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Choices options={presets} value={reason} onChange={setReason} />
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} error={reason && !ok ? t('Thori si wajah likhein') : undefined} />
      </View>
    </Sheet>
  );
}

/** Renders whichever test sheet is open. */
export function TestDialogs({ dialog, close, actions, onBooked }: { dialog: TestDialog; close: () => void; actions: ReturnType<typeof useTestActions>; onBooked?: (x: OpticalEyeTest) => void }) {
  const [last, setLast] = useState<NonNullable<TestDialog> | null>(null);
  useEffect(() => { if (dialog) setLast(dialog); }, [dialog]);
  const open = !!dialog;
  const x = last && last.kind !== 'book' ? last.test : null;
  return (
    <>
      <BookTestSheet open={open && last?.kind === 'book'} onClose={close} onBooked={(b) => { close(); onBooked?.(b); }} />
      {x && (
        <>
          <FeeSheet open={open && last?.kind === 'fee'} test={x} pending={actions.fee.isPending} onClose={close} onConfirm={(body) => actions.fee.mutate({ x, body })} />
          <MoveTestSheet open={open && last?.kind === 'move'} test={x} pending={actions.status.isPending} onClose={close} onConfirm={(b) => actions.status.mutate({ x, body: { status: 'RESCHEDULED', ...b } })} />
          <ReasonSheet open={open && last?.kind === 'noshow'} title={t('Nahi aaya — {{customerName}}', { customerName: x.customerName })} confirm={t('Nahi aaya')} presets={NO_SHOW_REASONS}
            pending={actions.status.isPending} onClose={close} onConfirm={(reason) => actions.status.mutate({ x, body: { status: 'NO_SHOW', reason } })} />
          <ReasonSheet open={open && last?.kind === 'cancel'} title={t('Test cancel — {{customerName}}', { customerName: x.customerName })} confirm={t('Cancel karein')} presets={CANCEL_TEST_REASONS}
            pending={actions.status.isPending} onClose={close} onConfirm={(reason) => actions.status.mutate({ x, body: { status: 'CANCELLED', reason } })} />
        </>
      )}
    </>
  );
}
