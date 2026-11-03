/**
 * Holds (web ReservationsPage): pieces kept for a customer with a deposit.
 * The counter does not sell held pieces. Swipe a hold to sell it, extend the
 * days or cancel; a new hold picks the piece (and size), deposit and days.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Bookmark, CalendarPlus, Plus, ShoppingBag, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, ChipGroup, Input, ListRow, MoneyInput, Row, Sheet, StatTile, StatusPill, SwipeRow, Text, TextArea, toast, useTheme, type StatusTone, type SwipeAction } from '@/design';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { PaySheet, useDeskOnline } from '../../_shared/deskKit';
import { reservationsApi, type Reservation, type ReservationView } from '../api';
import { JobList } from '../components/JobList';
import { CancelSheet, CustomerBox, emptyCustomer, type CustomerValue } from '../components/kit';
import { HOLD_KEY, opt, refreshGarments, whenText } from '../meta';

const VIEWS: Array<{ value: ReservationView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'today', label: msg('Aaj khatam') }, { value: 'expired', label: msg('Waqt guzar gaya') },
  { value: 'sold', label: msg('Bik gaye') }, { value: 'cancelled', label: msg('Cancel') }, { value: 'all', label: msg('Sab') },
];
const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Hold par'), tone: 'info' }, CONVERTED_TO_SALE: { label: msg('Bik gaya'), tone: 'success' }, EXPIRED: { label: msg('Waqt guzar gaya'), tone: 'warning' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};

function NewHoldSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [picked, setPicked] = useState<PickedProduct | null>(null);
  const [picking, setPicking] = useState(false);
  const [qty, setQty] = useState('1');
  const [deposit, setDeposit] = useState<number | null>(null);
  const [days, setDays] = useState('7');
  const [notes, setNotes] = useState('');
  const price = picked ? Number(picked.product.price ?? 0) : 0;
  const reset = () => { setCustomer(emptyCustomer); setPicked(null); setQty('1'); setDeposit(null); setDays('7'); setNotes(''); };
  const save = useMutation({
    mutationFn: () => reservationsApi.create({
      customerId: customer.customerId || undefined, customerName: customer.name.trim() || undefined, customerPhone: opt(customer.phone),
      productId: picked!.product.id, variantId: picked!.variantId ?? undefined, quantity: Math.max(Number(qty) || 1, 1), unitPrice: price,
      depositAmount: deposit ?? 0, paymentMethod: (deposit ?? 0) > 0 ? 'CASH' : undefined, holdDays: Number(days) || 7, notes: opt(notes),
    }),
    onSuccess: (r) => { toast.success(t('{{reservationNumber}} hold par', { reservationNumber: r.reservationNumber })); refreshGarments([HOLD_KEY, 'garments-meta'], true); reset(); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Hold nahi hua'))),
  });
  const bad = !picked || (!customer.customerId && !customer.name.trim());
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Naya hold')} height={0.9}
        footer={<Button fullWidth size="lg" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Hold par rakhein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <CustomerBox value={customer} onChange={setCustomer} />
          <ListRow dense title={picked ? `${picked.product.name}${picked.variantName ? ` · ${picked.variantName}` : ''}` : t('Piece chunein')} subtitle={picked ? formatMoney(price) : undefined} chevron onPress={() => setPicking(true)} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} label={t('Piece')} value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Deposit')} value={deposit} onChangeValue={setDeposit} />
          </Row>
          <Text size="sm" weight="semibold" tone="secondary">{t('Kitne din')}</Text>
          <ChipGroup wrap value={days} onChange={setDays} options={['3', '7', '14', '30'].map((d) => ({ value: d, label: t('{{d}} din', { d }) }))} />
          <TextArea label={t('Notes')} value={notes} onChangeText={setNotes} />
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Piece chunein')} includeRaw={false} onPick={(p) => { setPicked(p); setPicking(false); }} />
    </>
  );
}

export function ReservationsScreen() {
  const can = usePermission();
  const manage = can(P.POS_USE);
  const { guard } = useDeskOnline('garmentsDesk');
  const [adding, setAdding] = useState(false);
  const [sell, setSell] = useState<Reservation | null>(null);
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const sum = useQuery({ queryKey: [HOLD_KEY, 'totals'], queryFn: () => reservationsApi.page({ view: 'active', limit: 1 }), refetchInterval: 60_000 });
  const done = () => refreshGarments([HOLD_KEY, 'garments-meta'], true);
  return (
    <>
      <JobList<Reservation, ReservationView, Awaited<ReturnType<typeof reservationsApi.page>>>
        title={t('Holds')} queryKey={HOLD_KEY} views={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} defaultView="active"
        fetch={({ view, search, page }) => reservationsApi.page({ view, search, page, limit: 30 })}
        searchPlaceholder={t('Customer, phone ya hold #')} emptyIcon={Bookmark} emptyTitle={t('Koi hold nahi')}
        onNew={manage ? () => guard(() => setAdding(true)) : undefined} newLabel={t('New')}
        tiles={() => (
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Bookmark} tone="info" label={t('Piece hold par')} loading={!sum.data} value={String(sum.data?.totals.pieces ?? 0)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShoppingBag} tone="success" label={t('Deposit mila')} loading={!sum.data} value={<Amount value={sum.data?.totals.deposits ?? 0} size="lg" weight="bold" compact />} />
          </Row>
        )}
        renderRow={(r) => {
          const st = STATUS[r.status] ?? STATUS.ACTIVE;
          const live = r.status === 'ACTIVE';
          const end: SwipeAction[] = manage && live ? [
            { icon: ShoppingBag, label: t('Becho'), tone: 'success', onPress: () => guard(() => setSell(r)) },
            { icon: CalendarPlus, label: t('+7 din'), tone: 'brand', onPress: () => guard(() => void reservationsApi.extend(r.id, 7).then(() => { toast.success(t('7 din barha diye')); done(); }).catch((e) => toast.error(apiErrorMessage(e, t('Nahi hua'))))) },
            { icon: XCircle, label: t('Cancel'), tone: 'danger', onPress: () => guard(() => setCancel(r)) },
          ] : [];
          return (
            <SwipeRow end={end}>
              <ListRow divider icon={Bookmark} iconTone={st.tone} title={r.customerName || r.reservationNumber} overline={live ? whenText(r.expiresAt) : undefined}
                subtitle={`${r.reservationNumber} · ${r.productName ?? ''} × ${r.quantity}`}
                trailing={<Row gap={2} style={{ alignItems: 'flex-end' }}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill><Amount value={r.balance} size="sm" tone={r.balance > 0 && live ? 'danger' : 'default'} /></Row>} />
            </SwipeRow>
          );
        }}
      />
      <NewHoldSheet open={adding} onClose={() => setAdding(false)} />
      <PaySheet open={!!sell} title={t('Hold bechein')} name={`${sell?.customerName ?? ''} · ${sell?.reservationNumber ?? ''}`} due={sell?.balance ?? 0} cta={t('Bill banayein')} onClose={() => setSell(null)}
        onConfirm={async (p) => { if (sell) { await reservationsApi.sell(sell.id, { paidNow: p.paidAmount, paymentMethod: p.paymentMethod }); toast.success(t('Bik gaya')); done(); } }} />
      <CancelSheet open={!!cancel} title={`${cancel?.customerName ?? ''} · ${cancel?.reservationNumber ?? ''}`} paid={cancel?.depositAmount ?? 0} onClose={() => setCancel(null)}
        onConfirm={async (reason) => { if (cancel) { await reservationsApi.cancel(cancel.id, reason || undefined); done(); } }} />
    </>
  );
}
