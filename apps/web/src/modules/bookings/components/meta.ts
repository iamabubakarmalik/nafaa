/**
 * Statuses, pickup timing, labels and the WhatsApp reminder shared by the
 * bookings list, detail, calendar, analytics and print-outs.
 */

import { Ban, Clock, PackageCheck, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react';
import { startOfBusinessDay } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { fillTemplate, waLink } from '@core/lib/whatsapp/templates';
import type { Booking, BookingItem, BookingStatus } from '../api/bookings.api';
import { t } from '@core/i18n';

export const STATUS: Record<BookingStatus, { label: string; icon: LucideIcon; tone: string; color: string; hint: string }> = {
  PENDING: { label: t('Advance baqi'), icon: Clock, tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706', hint: t('Abhi koi paisa nahi aaya') },
  ADVANCE_PAID: { label: t('Advance mila'), icon: Wallet, tone: 'bg-sky-50 text-sky-800 ring-sky-200', color: '#0284c7', hint: t('Kuch paisa aa gaya, baqi pickup par') },
  READY_FOR_PICKUP: { label: t('Tayyar'), icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a', hint: t('Maal tayyar hai, customer le ja sakta hai') },
  CONVERTED: { label: t('Bik gayi'), icon: ShoppingBag, tone: 'bg-violet-50 text-violet-700 ring-violet-200', color: '#7c3aed', hint: t('Bill ban gaya') },
  CANCELLED: { label: t('Cancel'), icon: Ban, tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48', hint: t('Booking khatam') },
  EXPIRED: { label: t('Waqt guzar gaya'), icon: Ban, tone: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#475569', hint: t('Deadline nikal gayi') },
};

export const OPEN: BookingStatus[] = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'];
export const isOpen = (b: Pick<Booking, 'status'>) => OPEN.includes(b.status);

/** Every query of this page lives under this key. */
export const BOOKINGS_KEY = 'bookings';

export type PickupState = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'none';

const DAY = 86_400_000;

/** Where an open booking's pickup stands against today's business day. */
export function pickupState(b: Pick<Booking, 'status' | 'expectedPickupAt'>, startHour: number): PickupState {
  if (!isOpen(b) || !b.expectedPickupAt) return 'none';
  const today = startOfBusinessDay(new Date(), startHour).getTime();
  const at = new Date(b.expectedPickupAt).getTime();
  if (at < today) return 'overdue';
  if (at < today + DAY) return 'today';
  if (at < today + 2 * DAY) return 'tomorrow';
  if (at < today + 7 * DAY) return 'soon';
  return 'later';
}

export const PICKUP: Record<Exclude<PickupState, 'none'>, { label: string; tone: string }> = {
  overdue: { label: t('Pickup ka din guzar gaya'), tone: 'bg-rose-600 text-white' },
  today: { label: t('Aaj pickup'), tone: 'bg-amber-500 text-white' },
  tomorrow: { label: t('Kal pickup'), tone: 'bg-amber-100 text-amber-900' },
  soon: { label: t('Is hafte'), tone: 'bg-sky-100 text-sky-900' },
  later: { label: t('Baad me'), tone: 'bg-slate-100 text-slate-700' },
};

/** Whole days late (positive) or ahead (negative) of pickup, by business day. */
export function daysFromPickup(iso: string, startHour: number) {
  const today = startOfBusinessDay(new Date(), startHour).getTime();
  const day = startOfBusinessDay(new Date(iso), startHour).getTime();
  return Math.round((today - day) / DAY);
}

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const dayText = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function itemLabel(i: BookingItem) {
  const name = i.product?.name ?? t('Cheez');
  return i.variant ? `${name} (${i.variant.name})` : name;
}

export const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK');

/** Short "Suit × 2, Dupatta × 1 +2" for list rows. */
export function itemsSummary(b: Booking, max = 2) {
  const items = b.items ?? [];
  const head = items.slice(0, max).map((i) => `${itemLabel(i)} × ${qtyText(i.quantity)}`).join(', ');
  return items.length > max ? `${head} +${items.length - max}` : head;
}

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Ready-made WhatsApp text for a booking: ready, pickup reminder, late, or a plain update. */
export function bookingMessage(b: Booking, shop: string, startHour: number) {
  const state = pickupState(b, startHour);
  const lines = (b.items ?? []).slice(0, 6).map((i) => `• ${itemLabel(i)} × ${qtyText(i.quantity)}`).join('\n');
  const opening = b.status === 'READY_FOR_PICKUP'
    ? t('Aap ka saman tayyar hai, jab chahein le jayein.')
    : state === 'overdue'
      ? t('Aap ki booking ka pickup {{expectedPickupAt}} tha. Jab suhulat ho tashreef layein.', { expectedPickupAt: dayText(b.expectedPickupAt) })
      : state === 'today' ? t('Yaad dihani: aaj aap ki booking ka pickup hai.')
        : state === 'tomorrow' ? t('Yaad dihani: kal aap ki booking ka pickup hai.')
          : t('Aap ki booking ki details:');
  return fillTemplate(
    'Assalam-o-Alaikum {{customer}} 👋\n\n{{opening}}\n\n📌 Booking: {{number}}\n{{pickup}}\n{{items}}\n\n💰 Kul: {{total}}\n✅ Diya: {{paid}}\n📖 Baqi: {{baqi}}\n\n{{shop}}',
    {
      customer: b.customer?.name, opening, number: b.bookingNumber,
      pickup: b.expectedPickupAt ? t('📅 Pickup: {{expectedPickupAt}}', { expectedPickupAt: dayText(b.expectedPickupAt) }) : '',
      items: lines, total: formatPKR(b.total), paid: formatPKR(b.totalPaid - b.totalRefunded), baqi: formatPKR(b.balanceDue), shop,
    },
  );
}

export function bookingWaLink(b: Booking, shop: string, startHour: number) {
  return waLink(b.customer?.phone, bookingMessage(b, shop, startHour));
}
