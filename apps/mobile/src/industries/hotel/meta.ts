/** Hotel labels and helpers (mirror of the web hotel components/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate } from '@/core/format';
import type { StatusTone } from '@/design';
import type { BookingStatus, HotelBooking, HousekeepingStatus, RoomStatus } from './api';

export const HOTEL_KEYS = { bookings: 'hotel-bookings', rooms: 'hotel-rooms', guests: 'hotel-guests', housekeeping: 'hotel-housekeeping', roomTypes: 'hotel-room-types', ratePlans: 'hotel-rate-plans', dash: 'hotel-dash', audit: 'hotel-audit' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshHotel(money = false) {
  [...Object.values(HOTEL_KEYS), ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  INQUIRY: { label: msg('Pooch-gachh'), tone: 'neutral' }, QUOTED: { label: msg('Rate bataya'), tone: 'neutral' }, TENTATIVE: { label: msg('Kachchi booking'), tone: 'warning' }, CONFIRMED: { label: msg('Pakki'), tone: 'info' },
  CHECKED_IN: { label: msg('Andar hain'), tone: 'success' }, CHECKED_OUT: { label: msg('Ja chuke'), tone: 'neutral' }, NO_SHOW: { label: msg('Nahi aaye'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' }, EXTENDED: { label: msg('Barhaya'), tone: 'success' },
};
export const ROOM_STATUS: Record<RoomStatus, { label: string; tone: StatusTone }> = {
  AVAILABLE: { label: msg('Khali'), tone: 'success' }, OCCUPIED: { label: msg('Bhara'), tone: 'danger' }, RESERVED: { label: msg('Aane wala'), tone: 'info' }, CLEANING: { label: msg('Safai'), tone: 'warning' },
  MAINTENANCE: { label: msg('Maintenance'), tone: 'warning' }, OUT_OF_ORDER: { label: msg('Kharab'), tone: 'danger' }, BLOCKED: { label: msg('Band'), tone: 'neutral' },
};
export const HK_STATUS: Record<HousekeepingStatus, { label: string; tone: StatusTone }> = {
  DIRTY: { label: msg('Ganda'), tone: 'danger' }, CLEAN: { label: msg('Saaf'), tone: 'success' }, INSPECTED: { label: msg('Check ho gaya'), tone: 'success' }, OUT_OF_ORDER: { label: msg('Kharab'), tone: 'danger' }, MAINTENANCE_REQUIRED: { label: msg('Marammat'), tone: 'warning' },
};
export const TASK_TYPES = [['CHECKOUT_CLEAN', msg('Check-out safai')], ['DAILY_CLEAN', msg('Roz ki safai')], ['DEEP_CLEAN', msg('Gehri safai')], ['TURNDOWN', msg('Turndown')], ['INSPECTION', msg('Check')], ['MAINTENANCE', msg('Marammat')], ['LINEN_CHANGE', msg('Chadar badlain')]] as const;
export const taskTypeLabel = (v: string) => t(TASK_TYPES.find(([k]) => k === v)?.[1] ?? v);
export const PRIORITIES = [['LOW', msg('Kam')], ['NORMAL', msg('Normal')], ['HIGH', msg('Zaroori')], ['URGENT', msg('Foran')]] as const;
export const SOURCES = [['WALK_IN', msg('Walk-in')], ['DIRECT', msg('Direct')], ['PHONE', msg('Phone')], ['WEBSITE', msg('Website')], ['BOOKING_COM', 'Booking.com'], ['AGODA', 'Agoda'], ['TRAVEL_AGENT', msg('Travel agent')], ['CORPORATE', msg('Company')], ['OTHER', msg('Doosra')]] as const;
export const MEAL_PLANS = [['ROOM_ONLY', msg('Sirf room')], ['BED_BREAKFAST', msg('Room + nashta')], ['HALF_BOARD', msg('Half board')], ['FULL_BOARD', msg('Full board')]] as const;
export const ID_TYPES = [['CNIC', 'CNIC'], ['PASSPORT', msg('Passport')], ['DRIVING_LICENSE', msg('Driving license')], ['OTHER', msg('Doosra')]] as const;
export const CHARGE_TYPES = [['FOOD', msg('Khana')], ['BEVERAGE', msg('Peena')], ['LAUNDRY', msg('Laundry')], ['SPA', msg('Spa')], ['MINIBAR', msg('Minibar')], ['TELEPHONE', msg('Phone')], ['INTERNET', msg('Internet')], ['PARKING', msg('Parking')], ['DAMAGE', msg('Nuqsan')], ['MISCELLANEOUS', msg('Doosra')]] as const;
export const opts = (list: ReadonlyArray<readonly [string, string]>) => list.map(([value, label]) => ({ value, label: t(label) }));

export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const shortDate = (iso?: string | null) => (iso ? formatDate(iso) : '—');
export const roomsOf = (b: Pick<HotelBooking, 'bookedRooms'>) => b.bookedRooms.map((r) => r.roomNumber || r.roomTypeName || '—').join(', ');
