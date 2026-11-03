/**
 * Bookings: statuses, pickup timing and the money rules of a booking (what
 * can be paid, what a cancel refunds, what a sale at pickup leaves as credit).
 */

export type BookingStatus = 'PENDING' | 'ADVANCE_PAID' | 'READY_FOR_PICKUP' | 'CONVERTED' | 'CANCELLED' | 'EXPIRED';

export const OPEN_BOOKING: ReadonlyArray<BookingStatus> = ['PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP'];
export const isOpenBooking = (b: { status: BookingStatus }) => OPEN_BOOKING.includes(b.status);

export type PickupState = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later' | 'none';

const DAY = 86_400_000;

/** Where an open booking's pickup stands against the start of today's business day (a timestamp). */
export function pickupState(b: { status: BookingStatus; expectedPickupAt?: string | null }, todayStart: number): PickupState {
  if (!isOpenBooking(b) || !b.expectedPickupAt) return 'none';
  const at = new Date(b.expectedPickupAt).getTime();
  if (at < todayStart) return 'overdue';
  if (at < todayStart + DAY) return 'today';
  if (at < todayStart + 2 * DAY) return 'tomorrow';
  if (at < todayStart + 7 * DAY) return 'soon';
  return 'later';
}

/** Whole days a pickup is late (positive) or ahead (negative), by business day starts. */
export const daysFromPickup = (pickupDayStart: number, todayStart: number) => Math.round((todayStart - pickupDayStart) / DAY);

export interface BookingMoney {
  total: number;
  totalPaid: number;
  totalRefunded: number;
  balanceDue: number;
}

/** Share of the total paid so far (0 to 100). */
export const paidPercent = (b: Pick<BookingMoney, 'total' | 'totalPaid'>) => (b.total > 0 ? Math.min(100, (b.totalPaid / b.total) * 100) : 0);

/** Money the shop is holding for the booking. */
export const heldAmount = (b: Pick<BookingMoney, 'totalPaid' | 'totalRefunded'>) => Math.max(0, b.totalPaid - b.totalRefunded);

/** A payment must be positive and at most what is still due. */
export function paymentProblem(balanceDue: number, amount: number): 'empty' | 'too_much' | null {
  if (!(amount > 0)) return 'empty';
  if (amount > balanceDue + 0.01) return 'too_much';
  return null;
}

/** At pickup, whatever is not paid now is written on the customer's khata. */
export const udhaarAtPickup = (balanceDue: number, paidNow: number) => Math.max(Math.round((balanceDue - paidNow) * 100) / 100, 0);

/** Quick amounts for a payment field: the full amount, half and a quarter. */
export const shareAmounts = (max: number) => [1, 0.5, 0.25].map((f) => Math.round(max * f)).filter((v, i, a) => v > 0 && a.indexOf(v) === i);
export * from './messages';
