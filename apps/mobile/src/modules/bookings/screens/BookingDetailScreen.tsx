/**
 * One booking: items, money, payment history, pickup timing and every action:
 * payment, ready, sale at pickup, new date, WhatsApp reminder, cancel and
 * (once cancelled) delete.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlarmClock, CalendarClock, MessageCircle, MoreHorizontal, PackageCheck, Receipt, ShoppingCart, Trash2, Undo2, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { heldAmount, isOpenBooking, paidPercent, daysFromPickup } from '@nafaa/core/bookings';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney, startOfBusinessDay } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Avatar, Button, Card, confirm, DetailRow, DetailSection, DetailTemplate, HeroAmount, IconButton, ListRow, PageHero, ProgressBar, Row, Sheet, Text, toast, useTheme } from '@/design';
import { methodLabel } from '@/modules/pos/components/parts';
import { callPhone, openWhatsApp } from '@/modules/customers/lib/contact';
import { useDayStart } from '@/modules/sales/lib/period';
import { bookingsApi } from '../api/bookings';
import { CancelSheet, ConvertSheet, DateSheet, PaymentSheet, refreshBookings } from '../components/BookingSheets';
import { BOOKINGS_KEY, bookingText, dayText, itemLabel, PICKUP, pickupOf, qtyText, STATUS, whenText } from '../lib/meta';

type Dialog = 'pay' | 'convert' | 'cancel' | 'date' | 'menu' | null;

export function BookingDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Hamari dukaan');
  const startHour = useDayStart();
  const [dialog, setDialog] = useState<Dialog>(null);
  const q = useQuery({ queryKey: [BOOKINGS_KEY, 'one', id], queryFn: () => bookingsApi.getOne(id!), enabled: !!id });
  const b = q.data;
  const canManage = can(P.SERVICE_BOOKINGS_MANAGE);
  const active = !!b && isOpenBooking(b);
  const canPay = active && (b?.balanceDue ?? 0) > 0;

  if (!b) return <DetailTemplate title={t('Booking')} loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} />;

  const st = STATUS[b.status];
  const ps = pickupOf(b, startHour);
  const late = ps === 'overdue' && b.expectedPickupAt ? daysFromPickup(startOfBusinessDay(b.expectedPickupAt, startHour).getTime(), startOfBusinessDay(Date.now(), startHour).getTime()) : 0;
  const expired = active && !!b.expiresAt && new Date(b.expiresAt).getTime() < Date.now();
  const pct = paidPercent(b);
  const wa = b.customer?.phone ? bookingText(b, shop, startHour, lang) : null;

  const ready = async () => {
    setDialog(null);
    try { await bookingsApi.markReady(b.id, b.status !== 'READY_FOR_PICKUP'); refreshBookings(); toast.success(b.status === 'READY_FOR_PICKUP' ? t('Abhi tayyar nahi') : t('Tayyar')); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async () => {
    setDialog(null);
    if (!(await confirm({ title: t('Booking mita dein?'), tone: 'danger', confirmLabel: t('Mitayein'), message: t('Mitane ke baad wapas nahi aati.') }))) return;
    try { await bookingsApi.remove(b.id); toast.success(t('Booking mita di')); refreshBookings(); router.back(); } catch (e) { toast.error(apiErrorMessage(e, t('Mitayi nahi gayi'))); }
  };
  const banner = (text: string, tone: 'danger' | 'warning' | 'neutral', icon: typeof AlarmClock) => (
    <Card tone={tone === 'neutral' ? 'muted' : tone}><Row gap={2}>{(() => { const I = icon; return <I size={18} color={tone === 'danger' ? th.colors.danger.text : tone === 'warning' ? th.colors.warning.text : th.colors.textMuted} />; })()}<Text size="sm" style={{ flex: 1 }}>{text}</Text></Row></Card>
  );

  return (
    <>
      <DetailTemplate
        title={b.bookingNumber}
        subtitle={`${b.customer?.name ?? ''} · ${whenText(b.createdAt)}`}
        onRefresh={() => void q.refetch()}
        refreshing={q.isRefetching}
        actions={<IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setDialog('menu')} />}
        summary={(
          <PageHero title={b.customer?.name ?? ''} chip={t(st.label)}
            stats={[{ label: t('Kul'), value: <HeroAmount value={b.total} size="2xl" /> }, { label: t('Diya'), value: <HeroAmount value={heldAmount(b)} size="xl" /> }, { label: t('Baqi'), value: <HeroAmount value={active ? b.balanceDue : 0} size="xl" /> }]} />
        )}
        bottomActions={canManage && active ? (
          <Row gap={2} style={{ flex: 1 }}>
            {canPay && <Button style={{ flex: 1 }} variant="secondary" icon={Wallet} onPress={() => setDialog('pay')}>{t('Payment')}</Button>}
            <Button style={{ flex: 1.3 }} icon={ShoppingCart} onPress={() => setDialog('convert')}>{t('Sale karein')}</Button>
          </Row>
        ) : b.sale ? <Button fullWidth icon={Receipt} onPress={() => router.push(`/sales/${b.sale!.id}` as never)}>{t('Bill {{saleNumber}}', { saleNumber: b.sale.saleNumber })}</Button> : undefined}
      >
        <View style={{ gap: th.space(3) }}>
          {ps === 'overdue' && banner(t('Pickup ka din {{late}} din pehle guzar gaya. Customer ko yaad dilayein ya nayi date rakhein.', { late }), 'danger', AlarmClock)}
          {(ps === 'today' || ps === 'tomorrow') && banner(`${t(PICKUP[ps].label)} — ${t('maal tayyar rakhein')}`, 'warning', CalendarClock)}
          {expired && banner(t('Aakhri din ({{expiresAt}}) guzar gaya. Booking khud cancel nahi hoti — faisla karein.', { expiresAt: dayText(b.expiresAt) }), 'danger', AlarmClock)}
          {b.status === 'CANCELLED' && banner(`${t('Cancel')}${b.cancelledAt ? ` ${whenText(b.cancelledAt)}` : ''}${b.cancelReason ? ` · ${b.cancelReason}` : ''}`, 'neutral', XCircle)}

          <DetailSection title={t('Cheezen')}>
            {(b.items ?? []).map((i, k) => (
              <ListRow key={i.id} dense divider={k < (b.items?.length ?? 0) - 1} title={itemLabel(i)}
                subtitle={`${qtyText(i.quantity)} ${i.product?.unit ?? ''} × ${formatMoney(i.price)}${i.lineDiscount ? ` · ${t('discount {{lineDiscount}}', { lineDiscount: formatMoney(i.lineDiscount) })}` : ''}${i.note ? `\n${i.note}` : ''}`}
                trailing={<Amount value={i.total} weight="semibold" />} />
            ))}
            <DetailRow label={t('Subtotal')} value={<Amount value={b.subtotal} />} />
            {b.discount > 0 && <DetailRow label={t('Discount')} value={<Amount value={-b.discount} tone="warning" />} />}
            {(b.serviceChargesBreakdown ?? []).map((c, n) => <DetailRow key={n} label={c.label} value={<Amount value={Number(c.amount)} signed />} />)}
            <DetailRow last label={t('Kul')} value={<Amount value={b.total} weight="bold" />} />
          </DetailSection>

          <DetailSection title={t('Payments')}>
            <View style={{ padding: th.space(4), gap: 6 }}>
              <ProgressBar value={pct / 100} tone="success" />
              <Text size="xs" tone="muted">{t('{{pct}}% mil chuka · baqi {{formatPKR}}', { pct: Math.round(pct), formatPKR: formatMoney(active ? b.balanceDue : 0) })}</Text>
            </View>
            {(b.payments ?? []).length === 0 ? <DetailRow last label={t('Abhi koi payment nahi aayi')} value="" /> : (b.payments ?? []).map((p, k, a) => (
              <ListRow key={p.id} dense divider={k < a.length - 1} title={`${p.type === 'REFUND' ? t('Return') : p.type === 'ADVANCE' ? t('Advance') : t('Mazeed payment')} · ${methodLabel(p.paymentMethod)}`}
                subtitle={`${whenText(p.paidAt)}${p.createdBy ? ` · ${p.createdBy.fullName}` : ''}${p.notes ? ` · ${p.notes}` : ''}`}
                trailing={<Amount value={p.type === 'REFUND' ? -p.amount : p.amount} signed weight="semibold" tone={p.type === 'REFUND' ? 'danger' : 'success'} />} />
            ))}
          </DetailSection>

          <DetailSection title={t('Customer')}>
            <ListRow leading={<Avatar name={b.customer?.name ?? ''} size={40} />} title={b.customer?.name ?? '—'} subtitle={b.customer?.phone ?? undefined} chevron onPress={() => router.push(`/customers/${b.customerId}` as never)}
              trailing={b.customer?.phone ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(b.customer?.phone, wa ?? '')} /> : undefined} />
            {typeof b.customer?.balance === 'number' && b.customer.balance !== 0 && (
              <DetailRow last label={t('Khata:')} value={<Amount value={Math.abs(b.customer.balance)} tone={b.customer.balance > 0 ? 'danger' : 'success'} />} />
            )}
          </DetailSection>

          <DetailSection title={t('Waqt')}>
            <DetailRow label={t('Booking')} value={whenText(b.createdAt)} />
            <DetailRow label={t('Pickup')} value={b.expectedPickupAt ? dayText(b.expectedPickupAt) : t('Nahi rakhi')} />
            {!!b.expiresAt && <DetailRow label={t('Aakhri din')} value={dayText(b.expiresAt)} />}
            {!!b.convertedAt && <DetailRow label={t('Sale')} value={whenText(b.convertedAt)} />}
            <DetailRow last label={t('Branch')} value={b.shop?.name ?? '—'} />
          </DetailSection>

          {(!!b.notes || !!b.internalNotes) && (
            <DetailSection title={t('Note')}>
              {!!b.notes && <DetailRow label={t('Customer ke liye')} value={b.notes} last={!b.internalNotes} />}
              {!!b.internalNotes && <DetailRow last label={t('Team')} value={b.internalNotes} />}
            </DetailSection>
          )}
        </View>
      </DetailTemplate>

      <PaymentSheet booking={b} open={dialog === 'pay'} onClose={() => setDialog(null)} />
      <ConvertSheet booking={b} open={dialog === 'convert'} onClose={() => setDialog(null)} onSold={(saleId) => router.push(`/sales/${saleId}/receipt` as never)} />
      <CancelSheet booking={b} open={dialog === 'cancel'} onClose={() => setDialog(null)} />
      <DateSheet booking={b} open={dialog === 'date'} onClose={() => setDialog(null)} />
      <Sheet open={dialog === 'menu'} onClose={() => setDialog(null)} title={b.bookingNumber}>
        <View>
          {wa && <ListRow icon={MessageCircle} iconTone="success" title={t('WhatsApp')} subtitle={t('Pickup ya tayyar hone ka paigham')} onPress={() => { setDialog(null); openWhatsApp(b.customer?.phone, wa); }} />}
          {!!b.customer?.phone && <ListRow icon={MessageCircle} title={t('Call')} onPress={() => { setDialog(null); callPhone(b.customer?.phone); }} />}
          {canManage && active && <ListRow icon={b.status === 'READY_FOR_PICKUP' ? Undo2 : PackageCheck} iconTone="success" title={b.status === 'READY_FOR_PICKUP' ? t('Abhi tayyar nahi') : t('Tayyar')} onPress={() => void ready()} />}
          {canManage && active && <ListRow icon={CalendarClock} title={t('Nayi date')} onPress={() => setDialog('date')} />}
          {canManage && active && <ListRow icon={XCircle} destructive title={t('Booking cancel karein')} onPress={() => setDialog('cancel')} />}
          {canManage && b.status === 'CANCELLED' && <ListRow icon={Trash2} destructive title={t('Mitayein')} onPress={() => void remove()} />}
        </View>
      </Sheet>
    </>
  );
}
