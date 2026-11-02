/**
 * Labels, colours and small helpers shared by the hotel pages: booking and
 * room statuses, booking sources, meal plans, payment methods, query keys
 * and stay-date formatting. Stay dates are calendar days (YYYY-MM-DD).
 */

import {
  Ban, BedDouble, CalendarCheck, CalendarClock, CheckCircle2, Clock, DoorOpen, LogIn, LogOut, Sparkles, UserX, Wrench, type LucideIcon,
} from 'lucide-react';
import type { BookingSource, BookingStatus, MealPlan, PayMethod } from '../api/bookings.api';
import type { FolioChargeType } from '../api/folio.api';
import type { HousekeepingStatus, RoomStatus } from '../api/rooms.api';
import type { TaskPriority, TaskStatus, TaskType } from '../api/housekeeping.api';
import { t as tr } from '@core/i18n';

/** React Query key roots; every hotel mutation refreshes the stay, board and lists through these. */
export const HOTEL_KEYS = {
  bookings: 'hotel-bookings',
  booking: 'hotel-booking',
  board: 'hotel-board',
  rooms: 'hotel-rooms',
  roomTypes: 'hotel-room-types',
  guests: 'hotel-guests',
  housekeeping: 'hotel-housekeeping',
  ratePlans: 'hotel-rate-plans',
  reports: 'hotel-reports',
  dashboard: 'hotel-dashboard',
} as const;

export const ALL_HOTEL_KEYS = Object.values(HOTEL_KEYS);

interface Tone { label: string; tone: string; color: string; icon: LucideIcon }

export const BOOKING_STATUS: Record<BookingStatus, Tone> = {
  INQUIRY: { label: tr('Poochh'), tone: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#64748b', icon: Clock },
  QUOTED: { label: tr('Rate diya'), tone: 'bg-slate-100 text-slate-700 ring-slate-200', color: '#64748b', icon: Clock },
  TENTATIVE: { label: tr('Kachi booking'), tone: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#d97706', icon: CalendarClock },
  CONFIRMED: { label: tr('Pakki booking'), tone: 'bg-sky-50 text-sky-800 ring-sky-200', color: '#0284c7', icon: CalendarCheck },
  CHECKED_IN: { label: tr('Andar hai'), tone: 'bg-brand-50 text-brand-800 ring-brand-200', color: '#4f46e5', icon: LogIn },
  EXTENDED: { label: tr('Andar hai'), tone: 'bg-brand-50 text-brand-800 ring-brand-200', color: '#4f46e5', icon: LogIn },
  CHECKED_OUT: { label: tr('Check-out'), tone: 'bg-success-50 text-success-800 ring-success-200', color: '#16a34a', icon: LogOut },
  NO_SHOW: { label: tr('No-show'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48', icon: UserX },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', color: '#e11d48', icon: Ban },
};
export const statusOf = (s?: string | null): Tone => BOOKING_STATUS[(s ?? 'CONFIRMED') as BookingStatus] ?? BOOKING_STATUS.CONFIRMED;

export const OPEN_RESERVATION: BookingStatus[] = ['INQUIRY', 'QUOTED', 'TENTATIVE', 'CONFIRMED'];
export const IN_HOUSE: BookingStatus[] = ['CHECKED_IN', 'EXTENDED'];
export const isOpen = (s: BookingStatus) => OPEN_RESERVATION.includes(s);
export const isInHouse = (s: BookingStatus) => IN_HOUSE.includes(s);
export const isClosed = (s: BookingStatus) => s === 'CHECKED_OUT' || s === 'CANCELLED' || s === 'NO_SHOW';

export const ROOM_STATUS: Record<RoomStatus, { label: string; dot: string; tile: string; color: string; icon: LucideIcon }> = {
  AVAILABLE: { label: tr('Khaali'), dot: 'bg-success-500', tile: 'bg-success-50/60 ring-success-200', color: '#16a34a', icon: DoorOpen },
  OCCUPIED: { label: tr('Guest hai'), dot: 'bg-brand-600', tile: 'bg-brand-50/70 ring-brand-200', color: '#4f46e5', icon: BedDouble },
  RESERVED: { label: tr('Aaj aane wala'), dot: 'bg-amber-500', tile: 'bg-amber-50/70 ring-amber-200', color: '#d97706', icon: CalendarCheck },
  CLEANING: { label: tr('Safai'), dot: 'bg-sky-500', tile: 'bg-sky-50/70 ring-sky-200', color: '#0284c7', icon: Sparkles },
  MAINTENANCE: { label: tr('Marammat'), dot: 'bg-orange-500', tile: 'bg-orange-50/70 ring-orange-200', color: '#ea580c', icon: Wrench },
  OUT_OF_ORDER: { label: tr('Kharab'), dot: 'bg-rose-500', tile: 'bg-rose-50/70 ring-rose-200', color: '#e11d48', icon: Wrench },
  BLOCKED: { label: tr('Band'), dot: 'bg-slate-400', tile: 'bg-slate-50 ring-slate-200', color: '#64748b', icon: Ban },
};
export const roomStatusOf = (s?: string | null) => ROOM_STATUS[(s ?? 'AVAILABLE') as RoomStatus] ?? ROOM_STATUS.AVAILABLE;

/** Statuses the desk sets by hand (occupied comes only from check-in). */
export const MANUAL_ROOM_STATUS: RoomStatus[] = ['AVAILABLE', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'];

export const HK_STATUS: Record<HousekeepingStatus, { label: string; tone: string }> = {
  CLEAN: { label: tr('Saaf'), tone: 'text-success-700' },
  INSPECTED: { label: tr('Check ho gaya'), tone: 'text-success-700' },
  DIRTY: { label: tr('Ganda'), tone: 'text-amber-700' },
  MAINTENANCE_REQUIRED: { label: tr('Marammat chahiye'), tone: 'text-orange-700' },
  OUT_OF_ORDER: { label: tr('Kharab'), tone: 'text-rose-700' },
};

export const SOURCES: Array<{ id: BookingSource; label: string }> = [
  { id: 'WALK_IN', label: tr('Walk-in') }, { id: 'PHONE', label: tr('Phone') }, { id: 'DIRECT', label: tr('Direct') },
  { id: 'CORPORATE', label: tr('Company') }, { id: 'TRAVEL_AGENT', label: tr('Travel agent') }, { id: 'GOVT', label: tr('Sarkari') },
  { id: 'BOOKING_COM', label: tr('Booking.com') }, { id: 'AGODA', label: tr('Agoda') }, { id: 'AIRBNB', label: tr('Airbnb') },
  { id: 'EXPEDIA', label: tr('Expedia') }, { id: 'WEBSITE', label: tr('Website') }, { id: 'REFERRAL', label: tr('Referral') }, { id: 'OTHER', label: tr('Other') },
];
export const sourceLabel = (s?: string | null) => SOURCES.find((x) => x.id === s)?.label ?? s ?? '—';

export const MEAL_PLANS: Array<{ id: MealPlan; label: string }> = [
  { id: 'ROOM_ONLY', label: tr('Sirf room') }, { id: 'BED_BREAKFAST', label: tr('Room + nashta') }, { id: 'HALF_BOARD', label: tr('Nashta + ek khana') },
  { id: 'FULL_BOARD', label: tr('Teeno waqt khana') }, { id: 'ALL_INCLUSIVE', label: tr('Sab shamil') },
];
export const mealLabel = (m?: string | null) => MEAL_PLANS.find((x) => x.id === m)?.label ?? '—';

export const PAY_METHODS: Array<{ id: PayMethod; label: string }> = [
  { id: 'CASH', label: tr('Cash') }, { id: 'CARD', label: tr('Card') }, { id: 'JAZZCASH', label: tr('JazzCash') },
  { id: 'EASYPAISA', label: tr('EasyPaisa') }, { id: 'BANK_TRANSFER', label: tr('Bank') },
];
export const methodLabel = (m?: string | null) => PAY_METHODS.find((x) => x.id === m)?.label ?? m ?? '—';

export const FOLIO_TYPES: Array<{ id: FolioChargeType; label: string }> = [
  { id: 'FOOD', label: tr('Khana / room service') }, { id: 'BEVERAGE', label: tr('Chai / drinks') }, { id: 'MINIBAR', label: tr('Minibar') },
  { id: 'LAUNDRY', label: tr('Laundry') }, { id: 'PARKING', label: tr('Parking') }, { id: 'TELEPHONE', label: tr('Phone') }, { id: 'INTERNET', label: tr('Internet') },
  { id: 'SPA', label: tr('Spa / gym') }, { id: 'DAMAGE', label: tr('Nuqsan') }, { id: 'SERVICE_CHARGE', label: tr('Service charge') }, { id: 'MISCELLANEOUS', label: tr('Doosra') },
];
export const folioLabel = (t?: string | null) => FOLIO_TYPES.find((x) => x.id === t)?.label ?? t ?? '—';

export const ID_TYPES = [
  { id: 'CNIC', label: tr('CNIC') }, { id: 'PASSPORT', label: tr('Passport') }, { id: 'DRIVING_LICENSE', label: tr('Driving license') }, { id: 'OTHER', label: tr('Doosra') },
];

export const TASK_TYPES: Array<{ id: TaskType; label: string }> = [
  { id: 'CHECKOUT_CLEAN', label: tr('Check-out ki safai') }, { id: 'DAILY_CLEAN', label: tr('Rozana safai') }, { id: 'DEEP_CLEAN', label: tr('Poori safai') },
  { id: 'LINEN_CHANGE', label: tr('Chadar / towel badlein') }, { id: 'TURNDOWN', label: tr('Raat ki tayyari') }, { id: 'INSPECTION', label: tr('Check karna') },
  { id: 'MAINTENANCE', label: tr('Marammat') },
];
export const taskLabel = (t?: string | null) => TASK_TYPES.find((x) => x.id === t)?.label ?? t ?? '—';

export const PRIORITIES: Array<{ id: TaskPriority; label: string; tone: string }> = [
  { id: 'URGENT', label: tr('Foran'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  { id: 'HIGH', label: tr('Jaldi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { id: 'NORMAL', label: tr('Aam'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  { id: 'LOW', label: tr('Baad me'), tone: 'bg-slate-50 text-slate-500 ring-slate-200' },
];
export const priorityOf = (p?: string | null) => PRIORITIES.find((x) => x.id === p) ?? PRIORITIES[2];

export const TASK_STATUS: Record<TaskStatus, { label: string; icon: LucideIcon; tone: string }> = {
  PENDING: { label: tr('Kisi ko nahi diya'), icon: Clock, tone: 'text-amber-700' },
  ASSIGNED: { label: tr('Diya gaya'), icon: CalendarCheck, tone: 'text-sky-700' },
  IN_PROGRESS: { label: tr('Chal raha'), icon: Sparkles, tone: 'text-brand-700' },
  COMPLETED: { label: tr('Ho gaya'), icon: CheckCircle2, tone: 'text-success-700' },
  CANCELLED: { label: tr('Cancel'), icon: Ban, tone: 'text-slate-500' },
};

// ─── Dates ───────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar date as YYYY-MM-DD. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey(new Date());
export const addDaysKey = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
};
export const nightsBetween = (from: string, to: string) => Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86_400_000);

const MONTHS = [tr('Jan'), tr('Feb'), tr('Mar'), tr('Apr'), tr('May'), tr('Jun'), tr('Jul'), tr('Aug'), tr('Sep'), tr('Oct'), tr('Nov'), tr('Dec')];
const DAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];
/** A stay date ("2026-10-19T00:00Z") as "19 Oct"; with `day`, "Peer 19 Oct". */
export function stayDay(iso?: string | null, opts: { day?: boolean; year?: boolean } = {}) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${opts.day ? `${DAYS[dow]} ` : ''}${d} ${MONTHS[m - 1]}${opts.year ? ` ${y}` : ''}`;
}
export const stayRange = (b: { checkInDate: string; checkOutDate: string; nights: number }) => `${stayDay(b.checkInDate)} → ${stayDay(b.checkOutDate)} · ${b.nights} raat`;
export function clock(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}`;
}

export const roomsOf = (b: { bookedRooms: Array<{ roomNumber?: string | null }> }) => b.bookedRooms.map((r) => r.roomNumber).filter(Boolean).join(', ') || '—';
export const dueOf = (b: { grandTotal: number; paidAmount: number; status: BookingStatus }) => (b.status === 'CANCELLED' || b.status === 'NO_SHOW' ? 0 : Math.max(b.grandTotal - b.paidAmount, 0));

/** CNIC as 12345-1234567-1 while typing. */
export function formatCnic(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 13);
  return d.length <= 5 ? d : d.length <= 12 ? `${d.slice(0, 5)}-${d.slice(5)}` : `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}
export const cnicOk = (v: string) => v.replace(/\D/g, '').length === 13;
export const phoneOk = (v: string) => v.replace(/\D/g, '').length >= 10;

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

export function waLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  const intl = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** Number typed in a money field. */
export const num = (v: string) => Number(String(v).replace(/[^\d.]/g, '')) || 0;
export const moneyInput = (v: string) => v.replace(/[^\d.]/g, '');
