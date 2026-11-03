/** Booking statuses, pickup timing and the WhatsApp text, shared by the bookings screens. */

import { AlarmClock, Ban, Clock, PackageCheck, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react-native';
import { bookingMessage as buildMessage, pickupState as stateOf, type PickupState } from '@nafaa/core/bookings';
import type { MessageLang } from '@nafaa/core/customers';
import { formatDate, formatMoney, formatTime, startOfBusinessDay } from '@/core/format';
import { msg } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { Booking, BookingItem, BookingStatus, BookingStatusFilter } from '../api/bookings';

export const BOOKINGS_KEY = 'bookings';

export const STATUS: Record<BookingStatus, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  PENDING: { label: msg('Advance baqi'), icon: Clock, tone: 'warning' },
  ADVANCE_PAID: { label: msg('Advance mila'), icon: Wallet, tone: 'info' },
  READY_FOR_PICKUP: { label: msg('Tayyar'), icon: PackageCheck, tone: 'success' },
  CONVERTED: { label: msg('Bik gayi'), icon: ShoppingBag, tone: 'accent' },
  CANCELLED: { label: msg('Cancel'), icon: Ban, tone: 'danger' },
  EXPIRED: { label: msg('Waqt guzar gaya'), icon: Ban, tone: 'neutral' },
};

export const OPEN_FILTERS: Array<{ value: BookingStatusFilter; label: string; icon?: LucideIcon }> = [
  { value: 'ACTIVE', label: msg('Sab khuli') },
  { value: 'OVERDUE', label: msg('Late'), icon: AlarmClock },
  { value: 'PENDING', label: STATUS.PENDING.label, icon: Clock },
  { value: 'ADVANCE_PAID', label: STATUS.ADVANCE_PAID.label, icon: Wallet },
  { value: 'READY_FOR_PICKUP', label: STATUS.READY_FOR_PICKUP.label, icon: PackageCheck },
];

export const ALL_FILTERS: Array<{ value: BookingStatusFilter | 'all'; label: string }> = [
  { value: 'all', label: msg('Sab') }, { value: 'ACTIVE', label: msg('Khuli') }, { value: 'OVERDUE', label: msg('Late') },
  ...(Object.keys(STATUS) as BookingStatus[]).map((k) => ({ value: k, label: STATUS[k].label })),
];

export const PICKUP: Record<Exclude<PickupState, 'none'>, { label: string; tone: StatusTone }> = {
  overdue: { label: msg('Pickup ka din guzar gaya'), tone: 'danger' },
  today: { label: msg('Aaj pickup'), tone: 'warning' },
  tomorrow: { label: msg('Kal pickup'), tone: 'warning' },
  soon: { label: msg('Is hafte'), tone: 'info' },
  later: { label: msg('Baad me'), tone: 'neutral' },
};

export const todayStart = (startHour: number) => startOfBusinessDay(Date.now(), startHour).getTime();
export const pickupOf = (b: Pick<Booking, 'status' | 'expectedPickupAt'>, startHour: number) => stateOf(b, todayStart(startHour));
export const dayText = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '');
export const whenText = (iso: string) => `${formatDate(iso)}, ${formatTime(iso)}`;

export const itemLabel = (i: BookingItem) => `${i.product?.name ?? '—'}${i.variant ? ` (${i.variant.name})` : ''}`;
export const qtyText = (n: number) => String(Number(n.toFixed(3)));

/** "Suit × 2, Dupatta × 1 +2" for list rows. */
export function itemsSummary(b: Booking, max = 2) {
  const items = b.items ?? [];
  const head = items.slice(0, max).map((i) => `${itemLabel(i)} × ${qtyText(i.quantity)}`).join(', ');
  return items.length > max ? `${head} +${items.length - max}` : head;
}

export function bookingText(b: Booking, shop: string, startHour: number, lang: MessageLang) {
  return buildMessage({
    customer: b.customer?.name ?? '', shop, number: b.bookingNumber, status: b.status, pickupState: pickupOf(b, startHour), pickupDay: b.expectedPickupAt ? dayText(b.expectedPickupAt) : undefined,
    items: (b.items ?? []).map((i) => `${itemLabel(i)} × ${qtyText(i.quantity)}`), total: formatMoney(b.total), paid: formatMoney(b.totalPaid - b.totalRefunded), due: formatMoney(b.balanceDue),
  }, lang);
}
