/**
 * One stay (web HotelBookingDetailPage + StayModals): check-in with the guest's
 * ID, advance, room-service and other folio charges (void), extend, cancel or
 * no-show, and check-out with the bill (cash split, or on the khata). Early
 * leavers are billed only for the nights stayed unless the owner keeps them.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BedDouble, Banknote, LogIn, LogOut, Plus, XCircle, CalendarPlus, Undo2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { bookingNext, folioTotals, round2 } from '@nafaa/core/industries/hotel';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, MoneyInput, Input, DetailRow, DetailSection, DetailTemplate, ListRow, PageHero, Row, Segmented, Sheet, Switch, Text, confirm, toast, HeroAmount } from '@/design';
import { FormSheet } from '../../_shared/serviceKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { MethodChips, PaySheet, errorText, shiftKey, useDeskOnline } from '../../_shared/deskKit';
import { hotelApi, type BookingDetail, type CheckOutResult } from '../api';
import { BOOKING_STATUS, CHARGE_TYPES, ID_TYPES, dateOf, opts, refreshHotel, roomsOf } from '../meta';

export function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('hotelDesk');
  const q = useQuery({ queryKey: ['hotel-bookings', 'one', id], queryFn: () => hotelApi.bookings.getOne(id!), enabled: !!id });
  const b = q.data;
  const [sheet, setSheet] = useState<'in' | 'pay' | 'charge' | 'extend' | 'room' | 'cancel' | 'out' | 'refund' | null>(null);
  const [done, setDone] = useState<CheckOutResult | null>(null);
  const manage = can(P.SERVICE_BOOKINGS_MANAGE);
  const bill = can(P.POS_USE);
  const step = b ? bookingNext(b.status) : null;
  const reload = () => { refreshHotel(true); void q.refetch(); };
  const open = (s: NonNullable<typeof sheet>) => guard(() => setSheet(s));
  const voidCharge = async (cid: string) => {
    if (!(await confirm({ title: t('Ye charge hataein?'), tone: 'danger', confirmLabel: t('Haan, hataein') }))) return;
    try { await hotelApi.folio.void(cid, t('Ghalti se likha')); reload(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <>
      <DetailTemplate actions={b ? <DocActions phone={b.guestPhone} build={(lang) => folioDoc(b, lang)} /> : undefined} title={b?.guestName ?? t('Booking')} subtitle={b ? `${b.bookingNumber} · ${t('Room')} ${roomsOf(b)}` : undefined} loading={q.isLoading} error={b ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
        summary={b && (
          <PageHero title={`${dateOf(b.checkInDate)} → ${dateOf(b.checkOutDate)}`} chip={t(BOOKING_STATUS[b.status].label)}
            stats={[{ label: t('Kul bill'), value: <HeroAmount value={b.bill.total} size="2xl" /> }, { label: t('Baqi'), value: <HeroAmount value={b.money.due} size="2xl" /> }]} />
        )}
        bottomActions={b && manage ? (
          <>
            {step === 'check-in' && <Button style={{ flex: 1 }} icon={LogIn} onPress={() => open('in')}>{t('Check-in')}</Button>}
            {step === 'check-out' && bill && <Button style={{ flex: 1 }} variant="success" icon={LogOut} onPress={() => open('out')}>{t('Check-out')}</Button>}
          </>
        ) : undefined}>
        {b && (
          <>
            <DetailSection title={t('Stay')}>
              <DetailRow label={t('Raatein')} value={String(b.nights)} />
              <DetailRow label={t('Guests')} value={t('{{a}} bare, {{c}} bachche', { a: b.totalAdults, c: b.totalChildren })} />
              <DetailRow label={t('Phone')} value={<Text ltr>{b.guestPhone}</Text>} />
              {b.specialRequests ? <DetailRow label={t('Khaas darkhwast')} value={b.specialRequests} /> : null}
              {b.bookedRooms.map((r, i) => <DetailRow key={r.id} label={`${t('Room')} ${r.roomNumber ?? r.roomTypeName ?? ''}`} value={<Text ltr>{formatMoney(r.ratePerNight)} × {r.totalNights}</Text>} last={i === b.bookedRooms.length - 1} />)}
            </DetailSection>
            <DetailSection title={t('Bill')}>
              {b.bill.lines.map((l, i) => <DetailRow key={i} label={l.label} value={<Text ltr>{formatMoney(l.amount)}</Text>} />)}
              <DetailRow label={t('Advance')} value={<Text ltr>{formatMoney(b.money.khataPaid + b.money.legacyPaid)}</Text>} />
              <DetailRow label={t('Baqi')} value={<Text weight="bold" ltr>{formatMoney(b.money.due)}</Text>} last />
            </DetailSection>
            <Card title={t('Folio (room service aur doosre charges)')} flush>
              {b.folioCharges.length === 0 && <View style={{ padding: 16 }}><Text tone="muted" size="sm">{t('Abhi koi charge nahi')}</Text></View>}
              {b.folioCharges.map((c, i) => (
                <ListRow key={c.id} divider={i < b.folioCharges.length - 1} title={<Text style={c.isVoid ? { textDecorationLine: 'line-through' } : undefined}>{c.description}</Text>} subtitle={`${c.chargeNumber} · ${dateOf(c.chargeDate)}`}
                  trailing={<Row gap={2}><Text ltr>{formatMoney(c.totalAmount)}</Text>{!c.isVoid && manage && b.status === 'CHECKED_IN' ? <Button size="sm" variant="ghost" onPress={() => guard(() => void voidCharge(c.id))}>{t('Hataein')}</Button> : c.isVoid ? <Badge tone="neutral">{t('Hata')}</Badge> : null}</Row>} />
              ))}
            </Card>
            {manage && (
              <Row gap={2} style={{ flexWrap: 'wrap' }}>
                {b.status === 'CHECKED_IN' && <Button size="sm" variant="soft" icon={Plus} onPress={() => open('charge')}>{t('Charge')}</Button>}
                {['CONFIRMED', 'TENTATIVE', 'CHECKED_IN'].includes(b.status) && bill && <Button size="sm" variant="soft" icon={Banknote} onPress={() => open('pay')}>{t('Advance lein')}</Button>}
                {['CONFIRMED', 'TENTATIVE', 'CHECKED_IN'].includes(b.status) && <Button size="sm" variant="soft" icon={BedDouble} onPress={() => open('room')}>{t('Room badlein')}</Button>}
                {b.status === 'CHECKED_IN' && <Button size="sm" variant="soft" icon={CalendarPlus} onPress={() => open('extend')}>{t('Stay barhayein')}</Button>}
                {['CONFIRMED', 'TENTATIVE'].includes(b.status) && <Button size="sm" variant="ghost" icon={XCircle} onPress={() => open('cancel')}>{t('Cancel')}</Button>}
                {b.status === 'CHECKED_OUT' && b.money.advanceLeft > 0 && bill && <Button size="sm" variant="soft" icon={Undo2} onPress={() => open('refund')}>{t('Advance wapas')}</Button>}
              </Row>
            )}
          </>
        )}
      </DetailTemplate>
      {b && (
        <>
          <FormSheet open={sheet === 'in'} title={t('Check-in')} description={b.guestName} submitLabel={t('Check-in karein')} onClose={() => setSheet(null)}
            fields={[{ key: 'idType', label: t('ID ki qism'), kind: 'select', options: opts(ID_TYPES) }, { key: 'idNumber', label: t('ID number'), required: true, hint: t('Police record ke liye zaroori') }]} initial={{ idType: 'CNIC' }}
            onSubmit={async (v) => { await hotelApi.bookings.checkIn(b.id, { idType: v.idType || undefined, idNumber: v.idNumber?.trim() || undefined }); reload(); toast.success(t('Check-in ho gaya')); }} />
          <PaySheet open={sheet === 'pay'} onClose={() => setSheet(null)} title={t('Advance lein')} name={b.guestName} due={Math.max(b.grandTotal - (b.money.khataPaid + b.money.legacyPaid), 0) || b.grandTotal} advance cta={t('Save')}
            onConfirm={async (p) => { await hotelApi.bookings.addPayment(b.id, p.paidAmount, p.paymentMethod); reload(); toast.success(t('Advance lag gaya')); }} />
          <FormSheet open={sheet === 'charge'} title={t('Charge jorein')} description={b.guestName} onClose={() => setSheet(null)}
            fields={[{ key: 'chargeType', label: t('Qism'), kind: 'select', options: opts(CHARGE_TYPES), required: true }, { key: 'description', label: t('Kya'), required: true }, { key: 'quantity', label: t('Miqdaar'), kind: 'number' }, { key: 'unitPrice', label: t('Qeemat'), kind: 'money', required: true }]} initial={{ chargeType: 'FOOD', quantity: 1 }}
            onSubmit={async (v) => { await hotelApi.folio.add({ bookingId: b.id, chargeType: v.chargeType, description: v.description.trim(), quantity: v.quantity ?? 1, unitPrice: v.unitPrice ?? 0 }); reload(); toast.success(t('Charge lag gaya')); }} />
          <FormSheet open={sheet === 'extend'} title={t('Stay barhayein')} description={`${t('Abhi')} ${dateOf(b.checkOutDate)} ${t('tak')}`} onClose={() => setSheet(null)}
            fields={[{ key: 'date', label: t('Nayi rawangi'), kind: 'date', required: true }]} initial={{ date: shiftKey(b.checkOutDate.slice(0, 10), 1) }}
            onSubmit={async (v) => { await hotelApi.bookings.extend(b.id, v.date); reload(); toast.success(t('Stay barh gayi')); }} />
          <FormSheet open={sheet === 'cancel'} title={t('Booking cancel')} onClose={() => setSheet(null)}
            fields={[{ key: 'reason', label: t('Wajah'), required: true }, { key: 'charge', label: t('Cancel charge'), kind: 'money' }, { key: 'noShow', label: t('Guest aaya hi nahi'), kind: 'switch' }]}
            onSubmit={async (v) => { await hotelApi.bookings.cancel(b.id, { reason: v.reason.trim(), charge: v.charge || undefined, noShow: !!v.noShow }); reload(); toast.success(t('Cancel ho gayi')); }} />
          <FormSheet open={sheet === 'refund'} title={t('Advance wapas')} description={t('{{a}} bacha hai', { a: formatMoney(b.money.advanceLeft) })} onClose={() => setSheet(null)}
            fields={[{ key: 'amount', label: t('Rakam'), kind: 'money' }]} initial={{ amount: b.money.advanceLeft }}
            onSubmit={async (v) => { await hotelApi.bookings.refund(b.id, { amount: v.amount ?? b.money.advanceLeft }); reload(); toast.success(t('Wapas kar diya')); }} />
          <ChangeRoomSheet b={sheet === 'room' ? b : null} onClose={() => setSheet(null)} onDone={() => { setSheet(null); reload(); toast.success(t('Room badal diya')); }} />
          <CheckOutSheet b={sheet === 'out' ? b : null} onClose={() => setSheet(null)} onDone={(r) => { setSheet(null); setDone(r); reload(); }} />
        </>
      )}
      <Sheet open={!!done} onClose={() => setDone(null)} title={t('Check-out ho gaya')} description={done?.sale.saleNumber} footer={<Button fullWidth onPress={() => { setDone(null); router.back(); }}>{t('Theek hai')}</Button>}>
        {done && <View style={{ gap: 4 }}>
          <Row justify="between"><Text tone="muted">{t('Bill')}</Text><Amount value={done.sale.total} weight="bold" /></Row>
          {done.change > 0 && <Row justify="between"><Text tone="muted">{t('Change wapas')}</Text><Amount value={done.change} /></Row>}
          {done.onKhata > 0 && <Row justify="between"><Text tone="muted">{t('Khata me')}</Text><Amount value={done.onKhata} /></Row>}
        </View>}
      </Sheet>
    </>
  );
}

/** Check-out: the stay bill (early leavers only pay the nights stayed), then cash or khata. */
function CheckOutSheet({ b, onClose, onDone }: { b: BookingDetail | null; onClose: () => void; onDone: (r: CheckOutResult) => void }) {
  const [keep, setKeep] = useState(false);
  const [mode, setMode] = useState<'pay' | 'khata'>('pay');
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  if (!b) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const early = b.earlyNights != null && b.earlyNights < b.nights;
  const stayed = early && !keep ? b.earlyNights! : b.nights;
  const roomNow = early && !keep ? b.bookedRooms.reduce((s, r) => s + ((r.totalAmount - r.discount) * stayed) / Math.max(r.totalNights, 1), 0) : b.roomTotal;
  const ratio = b.roomTotal > 0 ? roomNow / b.roomTotal : 1;
  const f = folioTotals({ roomAmount: round2(roomNow + (b.taxAmount + b.serviceCharge) * ratio), discount: b.discount, charges: b.folioCharges.map((c) => ({ amount: c.totalAmount, isVoid: c.isVoid })) });
  const total = early && !keep ? f.total : b.bill.total;
  const advance = b.money.khataPaid + b.money.legacyPaid;
  const due = Math.max(round2(total - advance), 0);
  const khataId = b.billTo?.id ?? b.khata?.id;
  const go = async () => {
    setBusy(true);
    try {
      const base = { keepBookedNights: early && keep ? true : undefined };
      const body = due <= 0 ? { ...base, paidAmount: 0 } : mode === 'khata' ? { ...base, onCredit: true, customerId: khataId } : { ...base, payments: [{ method, amount: due }] };
      onDone(await hotelApi.bookings.checkOut(b.id, body));
    } catch (e) { toast.error(errorText(e, t('Check-out nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={t('Check-out aur bill')} description={`${b.guestName} · ${t('{{n}} raat', { n: stayed })}`}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={b.overdueNights > 0} onPress={() => void go()}>{due <= 0 ? t('Check-out karein') : mode === 'khata' ? t('{{due}} khate me · check-out', { due: formatMoney(due) }) : t('{{due}} le kar check-out', { due: formatMoney(due) })}</Button>}>
      <View style={{ gap: 10 }}>
        {b.overdueNights > 0 && <Text size="sm" tone="warning">{t('Guest {{n}} raat zyada ruka — pehle "Stay barhayein" se aaj tak barhayein, phir check-out.', { n: b.overdueNights })}</Text>}
        {b.bill.lines.map((l, i) => <Row key={i} justify="between"><Text size="sm" tone="muted" style={{ flex: 1 }}>{l.label}</Text><Text size="sm" ltr>{formatMoney(l.amount)}</Text></Row>)}
        <Row justify="between"><Text weight="semibold">{t('Kul bill')}</Text><Text weight="semibold" ltr>{formatMoney(total)}</Text></Row>
        {advance > 0 && <Row justify="between"><Text tone="muted">{t('Advance')}</Text><Text ltr>−{formatMoney(Math.min(advance, total))}</Text></Row>}
        <Row justify="between"><Text weight="bold">{t('Ab lena hai')}</Text><Amount value={due} weight="bold" size="lg" /></Row>
        {early && <Switch label={t('Booked raaton ka poora paisa lein')} value={keep} onChange={setKeep} />}
        {due > 0 && (
          <>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'pay', label: t('Abhi paisa lein') }, { value: 'khata', label: t('Khate me') }]} />
            {mode === 'pay' ? <MethodChips value={method} onChange={setMethod} /> : <Text size="sm" tone="muted">{t('{{due}} {{name}} ke khate me likha jayega.', { due: formatMoney(due), name: b.billTo?.name ?? b.khata?.name ?? b.guestName })}</Text>}
          </>
        )}
      </View>
    </Sheet>
  );
}

const folioDoc = (b: BookingDetail, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `folio-${b.bookingNumber}`,
  title: L(lang, 'Guest folio', 'گیسٹ فولیو', 'Guest folio'),
  subtitle: b.bookingNumber,
  meta: [[L(lang, 'Guest', 'مہمان', 'Guest'), b.guestName], [L(lang, 'Room', 'کمرہ', 'Room'), roomsOf(b)], [L(lang, 'Check-in', 'آمد', 'Check-in'), dateOf(b.checkInDate)], [L(lang, 'Check-out', 'روانگی', 'Check-out'), dateOf(b.checkOutDate)], [L(lang, 'Nights', 'راتیں', 'Raatein'), String(b.nights)]],
  tables: [
    { heading: L(lang, 'Rooms', 'کمرے', 'Rooms'), columns: [L(lang, 'Room', 'کمرہ', 'Room'), L(lang, 'Rate', 'ریٹ', 'Rate'), L(lang, 'Nights', 'راتیں', 'Raatein')], rows: b.bookedRooms.map((r) => [r.roomNumber ?? r.roomTypeName ?? '—', formatMoney(r.ratePerNight), r.totalNights]) },
    ...(b.folioCharges.some((c) => !c.isVoid) ? [{ heading: L(lang, 'Extra charges', 'اضافی چارجز', 'Extra charges'), columns: [L(lang, 'Item', 'آئٹم', 'Item'), L(lang, 'Amount', 'رقم', 'Amount')], rows: b.folioCharges.filter((c) => !c.isVoid).map((c) => [c.description, formatMoney(c.totalAmount)]) }] : []),
  ],
  rows: [...b.bill.lines.map((l) => [l.label, formatMoney(l.amount)] as [string, string]), [L(lang, 'Total', 'کل', 'Kul bill'), formatMoney(b.bill.total), 'strong'],
    [L(lang, 'Advance paid', 'ایڈوانس', 'Advance'), formatMoney(b.money.khataPaid + b.money.legacyPaid)], [L(lang, 'Balance', 'باقی', 'Baqi'), formatMoney(b.money.due), 'strong']],
});

/** Moves one booked room to another free room for the rest of the stay (the old rate stays unless changed). */
function ChangeRoomSheet({ b, onClose, onDone }: { b: BookingDetail | null; onClose: () => void; onDone: () => void }) {
  const [lineId, setLineId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inHouse = b?.status === 'CHECKED_IN';
  const from = b ? (inHouse && b.today > b.checkInDate.slice(0, 10) ? b.today : b.checkInDate.slice(0, 10)) : '';
  const q = useQuery({ queryKey: ['hotel-quote', 'change', b?.id, from], queryFn: () => hotelApi.bookings.quote({ checkInDate: from, checkOutDate: b!.checkOutDate.slice(0, 10), exceptBookingId: b!.id, source: b!.source }), enabled: !!b });
  useEffect(() => { if (b) { setLineId(b.bookedRooms[0]?.id ?? ''); setRoomId(''); setRate(null); setReason(''); } }, [b?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = b?.bookedRooms.find((r) => r.id === lineId);
  const options = (q.data?.types ?? []).flatMap((x) => x.free.filter((r) => r.id !== line?.roomId).map((r) => ({ ...r, type: x })));
  const picked = options.find((o) => o.id === roomId);
  useEffect(() => { if (picked) setRate(line?.ratePerNight ?? Math.round(picked.total / Math.max(q.data?.nights ?? 1, 1))); }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    setBusy(true);
    try { await hotelApi.bookings.changeRoom(b!.id, { bookedRoomId: lineId, roomId, ratePerNight: rate ?? undefined, reason: reason.trim() || undefined }); onDone(); }
    catch (e) { toast.error(errorText(e, t('Room nahi badla'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!b} onClose={onClose} title={t('Room badlein')} description={b ? t('{{from}} se {{to}} tak', { from: dateOf(from), to: dateOf(b.checkOutDate) }) : undefined}
      footer={<Button fullWidth size="lg" icon={BedDouble} loading={busy} disabled={!roomId || !lineId} onPress={() => void go()}>{t('Badlein')}</Button>}>
      {b && (
        <View style={{ gap: 12 }}>
          {b.bookedRooms.length > 1 && <ChipGroup wrap value={lineId} onChange={setLineId} options={b.bookedRooms.map((r) => ({ value: r.id, label: `${t('Room')} ${r.roomNumber ?? '—'}` }))} />}
          <Text size="sm" weight="semibold" tone="secondary">{t('Khaali room')}</Text>
          {q.isLoading ? <Text tone="muted" size="sm">{t('Dhoond rahe hain…')}</Text> : !options.length ? <Text tone="muted" size="sm">{t('In dates me koi aur room khaali nahi.')}</Text> : (
            <ChipGroup wrap value={roomId} onChange={setRoomId} options={options.map((o) => ({ value: o.id, label: `${o.roomNumber} · ${o.type.name}` }))} />
          )}
          <MoneyInput label={t('Rate fi raat')} value={rate} onChangeValue={setRate} hint={t('Purana rate rakhna ho to wohi rehne dein; upgrade free ho to bhi purana rate')} />
          <Input label={t('Wajah')} value={reason} onChangeText={setReason} />
        </View>
      )}
    </Sheet>
  );
}
