/** Pure rules of the clinic pack (shared by web and mobile): visit fee math, what is still to collect, and the order patients are called. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fee of a visit: consultation plus other charges, less discount. Never negative. */
export function visitTotal(consultationFee: number, otherCharges = 0, discount = 0): number {
  return Math.max(round2(consultationFee + otherCharges - discount), 0);
}

/** Message when the discount is more than the fee, else ''. */
export function discountIssue(fee: number, otherCharges: number, discount: number): 'too_high' | 'negative' | '' {
  if (discount < 0) return 'negative';
  return discount > fee + otherCharges ? 'too_high' : '';
}

/** What is still to collect on a visit or lab order. */
export const feeDue = (a: { total: number; paidAmount: number }) => Math.max(round2(a.total - a.paidAmount), 0);

/**
 * Body of a fee payment: the amount billed, what is taken now, and whether the
 * rest goes to the patient's khata (the API bills the full amount, takes `paid`).
 */
export function feePayBody(due: number, paidNow: number, method: string) {
  const paid = Math.min(Math.max(round2(paidNow), 0), due);
  if (paid <= 0) return { amount: due, onCredit: true as const };
  return paid < due ? { amount: due, paid, paymentMethod: method } : { amount: due, paymentMethod: method };
}

export type VisitStep = 'arrive' | 'call' | 'finish' | null;
/** The next step of a visit at reception and in the room. */
export function visitNext(status: string): VisitStep {
  if (status === 'SCHEDULED' || status === 'CONFIRMED' || status === 'RESCHEDULED') return 'arrive';
  if (status === 'ARRIVED') return 'call';
  if (status === 'IN_CONSULTATION') return 'finish';
  return null;
}

const OPEN = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_CONSULTATION'];
/** Emergencies first, then who is in the room, then who waits, then by slot time. */
export function queueOrder<T extends { status: string; isEmergency?: boolean; scheduledStart: string }>(list: T[]): T[] {
  const rank = (x: T) => (x.isEmergency ? 0 : x.status === 'IN_CONSULTATION' ? 1 : x.status === 'ARRIVED' ? 2 : 3);
  return list.filter((x) => OPEN.includes(x.status)).sort((a, b) => rank(a) - rank(b) || a.scheduledStart.localeCompare(b.scheduledStart));
}

/** A booked patient this many minutes past the slot, not yet arrived, is late. */
export const LATE_MINUTES = 15;
export const isLate = (a: { status: string; scheduledStart: string }, now: number) =>
  (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && new Date(a.scheduledStart).getTime() < now - LATE_MINUTES * 60_000;

/** Doctor's share of the day: a percent of fees (and lab fees), or a fixed amount per patient seen. */
export function doctorShare(input: { type: 'PERCENTAGE' | 'FIXED'; pct: number; fees: number; labFees?: number; seen: number }): number {
  return input.type === 'FIXED' ? round2(input.pct * input.seen) : round2(((input.fees + (input.labFees ?? 0)) * input.pct) / 100);
}
