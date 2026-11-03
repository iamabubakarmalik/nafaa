/**
 * The money and status actions on one booking: take a payment, turn it into a
 * sale at pickup, cancel (with or without giving the advance back) and change
 * the pickup date. Each refreshes bookings, the customer's khata and, on a
 * sale, sales history and stock.
 */

import { Ban, ShoppingCart, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { paymentProblem, shareAmounts, udhaarAtPickup } from '@nafaa/core/bookings';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { type PaymentMethod } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Chip, DatePicker, Input, MoneyInput, Row, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { MethodGrid } from '@/modules/pos/components/parts';
import { queryClient } from '@/core/query/client';
import { bookingsApi, type Booking } from '../api/bookings';
import { BOOKINGS_KEY } from '../lib/meta';

const KEYS = [BOOKINGS_KEY, 'customers-directory', 'customer', 'customer-ledger', 'khata-summary'];
export const refreshBookings = (sale = false) => [...KEYS, ...(sale ? ['sales-history'] : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));

function Money({ b }: { b: Booking }) {
  const th = useTheme();
  const cell = (label: string, v: number, tone?: 'success' | 'warning') => (
    <View style={{ flex: 1, alignItems: 'center' }}><Text size="xs" tone="muted">{label}</Text><Amount value={v} weight="bold" tone={tone} /></View>
  );
  return <Row style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>{cell(t('Kul'), b.total)}{cell(t('Diya'), b.totalPaid, 'success')}{cell(t('Baqi'), b.balanceDue, 'warning')}</Row>;
}

function Share({ max, onPick, value }: { max: number; onPick: (n: number) => void; value: number | null }) {
  return <Row gap={2} wrap>{shareAmounts(max).map((n) => <Chip key={n} label={n === max ? `${t('Poora')} (${formatMoney(max)})` : formatMoney(n)} selected={value === n} onPress={() => onPick(n)} />)}</Row>;
}

export function PaymentSheet({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(booking.balanceDue);
  const [method, setMethod] = useState<PaymentMethod>((booking.paymentMethod as PaymentMethod) ?? 'CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(booking.balanceDue); setNote(''); } }, [open, booking.balanceDue]);
  const n = amount ?? 0;
  const problem = paymentProblem(booking.balanceDue, n);
  const bad = problem === 'empty' ? t('Amount likhein') : problem === 'too_much' ? t('Baqi sirf {{balanceDue}} hai', { balanceDue: formatMoney(booking.balanceDue) }) : '';
  const run = async () => {
    setBusy(true);
    try {
      const b = await bookingsApi.addPayment(booking.id, { amount: n, paymentMethod: method, notes: note.trim() || undefined });
      toast.success(b.balanceDue <= 0 ? t('Poori payment aa gayi, booking tayyar') : t('{{amount}} mil gaye', { amount: formatMoney(n) }));
      refreshBookings();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Payment nahi likhi gayi'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Payment lein')} description={`${booking.bookingNumber} · ${booking.customer?.name ?? ''}`}
      footer={<Button fullWidth size="lg" icon={Wallet} loading={busy} disabled={!!bad} onPress={() => void run()}>{t('{{formatPKR}} likhein', { formatPKR: formatMoney(n) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Money b={booking} />
        <MoneyInput label={t('Kitne mile')} value={amount} onChangeValue={setAmount} size="xl" error={bad || undefined} hint={bad ? undefined : t('Customer ke khate me jama hota hai; sale par bill me lag jata hai')} />
        <Share max={booking.balanceDue} value={amount} onPick={setAmount} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kaise diya')}</Text>
        <MethodGrid value={method} onChange={setMethod} />
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Maslan: transaction ID')} />
      </View>
    </Sheet>
  );
}

export function ConvertSheet({ booking, open, onClose, onSold }: { booking: Booking; open: boolean; onClose: () => void; onSold: (saleId: string) => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(booking.balanceDue);
  const [method, setMethod] = useState<PaymentMethod>((booking.paymentMethod as PaymentMethod) ?? 'CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setAmount(booking.balanceDue); }, [open, booking.balanceDue]);
  const n = amount ?? 0;
  const udhaar = udhaarAtPickup(booking.balanceDue, n);
  const bad = n < 0 ? t('Amount ghalat hai') : n > booking.balanceDue + 0.01 ? t('Baqi sirf {{balanceDue}} hai', { balanceDue: formatMoney(booking.balanceDue) }) : '';
  const run = async () => {
    setBusy(true);
    try {
      const { sale } = await bookingsApi.convert(booking.id, { additionalPayment: n, paymentMethod: method });
      toast.success(t('Bill {{saleNumber}} ban gaya', { saleNumber: sale.saleNumber }));
      refreshBookings(true);
      onClose();
      onSold(sale.id);
    } catch (e) { toast.error(apiErrorMessage(e, t('Sale nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Sale karein (pickup)')} description={t('Maal customer ko dein: bill banega aur stock is branch se nikal jayega')}
      footer={<Button fullWidth size="lg" icon={ShoppingCart} loading={busy} disabled={!!bad} onPress={() => void run()}>{t('Bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Money b={booking} />
        {booking.balanceDue > 0 ? (
          <>
            <MoneyInput label={t('Abhi kitne mile')} value={amount} onChangeValue={setAmount} size="xl" error={bad || undefined}
              hint={bad ? undefined : udhaar > 0 ? t('{{udhaar}} customer ke khate me udhaar likha jayega', { udhaar: formatMoney(udhaar) }) : t('Poora hisaab saaf')} />
            <Share max={booking.balanceDue} value={amount} onPick={setAmount} />
            <Text size="sm" weight="semibold" tone="secondary">{t('Kaise diya')}</Text>
            <MethodGrid value={method} onChange={setMethod} />
          </>
        ) : <Text size="sm" tone="success">{t('Poori payment pehle aa chuki hai. Bas bill banayein.')}</Text>}
        <Text size="xs" tone="muted">{t('Advance khud bill me lag jata hai. Reserve kiye IMEI aur cut piece "bik gaye" ho jate hain.')}</Text>
      </View>
    </Sheet>
  );
}

const CANCEL_CHIPS = [msg('Customer ne mana kar diya'), msg('Maal nahi mila'), msg('Customer nahi aaya'), msg('Qeemat par baat nahi bani')];

export function CancelSheet({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const canRefund = can(P.RETURNS_CREATE);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(booking.totalPaid > 0 && canRefund);
  const [method, setMethod] = useState<PaymentMethod>((booking.paymentMethod as PaymentMethod) ?? 'CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(''); setRefund(booking.totalPaid > 0 && canRefund); } }, [open, booking.totalPaid, canRefund]);
  const run = async () => {
    setBusy(true);
    try {
      await withManagerPin(t('Advance return'), (managerPin) => bookingsApi.cancel(booking.id, { reason: reason.trim() || undefined, refundAdvance: refund, refundMethod: method, managerPin }), 'refund');
      toast.success(refund && booking.totalPaid > 0 ? t('Booking cancel, {{totalPaid}} wapas', { totalPaid: formatMoney(booking.totalPaid) }) : t('Booking cancel ho gayi'));
      refreshBookings();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Cancel nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Booking cancel karein')} description={`${booking.bookingNumber} · ${booking.customer?.name ?? ''}`}
      footer={<Button fullWidth size="lg" variant="danger" icon={Ban} loading={busy} onPress={() => void run()}>{t('Cancel karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2} wrap>{CANCEL_CHIPS.map((c) => <Chip key={c} label={t(c)} selected={reason === c} onPress={() => setReason(c)} />)}</Row>
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Marzi hai')} />
        {booking.totalPaid > 0 && (
          <View style={{ gap: th.space(2) }}>
            <Switch value={refund} onChange={setRefund} disabled={!canRefund} label={t('Advance wapas dein ({{totalPaid}})', { totalPaid: formatMoney(booking.totalPaid) })}
              description={canRefund ? t('Na dein to advance dukaan ke paas rehta hai') : t('Advance wapas karne ki ijazat nahi hai')} />
            {refund && <MethodGrid value={method} onChange={setMethod} />}
          </View>
        )}
      </View>
    </Sheet>
  );
}

export function DateSheet({ booking, open, onClose }: { booking: Booking; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [pickup, setPickup] = useState<Date | null>(null);
  const [expires, setExpires] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setPickup(booking.expectedPickupAt ? new Date(booking.expectedPickupAt) : null); setExpires(booking.expiresAt ? new Date(booking.expiresAt) : null); }
  }, [open, booking.expectedPickupAt, booking.expiresAt]);
  const bad = pickup && expires && expires < pickup ? t('Aakhri din pickup se pehle nahi ho sakta') : '';
  const run = async () => {
    setBusy(true);
    try {
      await bookingsApi.update(booking.id, { expectedPickupAt: pickup ? pickup.toISOString() : null, expiresAt: expires ? expires.toISOString() : null });
      toast.success(t('Nayi date save ho gayi'));
      refreshBookings();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Pickup ki date')} footer={<Button fullWidth size="lg" loading={busy} disabled={!!bad} onPress={() => void run()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DatePicker label={t('Pickup')} value={pickup} onChange={setPickup} />
        <DatePicker label={t('Aakhri din')} value={expires} onChange={setExpires} error={bad || undefined} hint={t('Marzi hai — is din tak na aaye to faisla karein')} />
      </View>
    </Sheet>
  );
}

