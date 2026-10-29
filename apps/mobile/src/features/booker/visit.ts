/**
 * Visit helpers for the booker screens: GPS check-in with the distance to
 * the shop (flagged when far, never refused) and the visit payload built
 * from it.
 */

import { distanceMetres } from '@/lib/distribution/logistics';
import type { Db } from './core/db';
import { getCheckIn, saveCheckIn } from './core/repo';
import type { CheckInRow, CustomerRow, VisitOutcome, VisitPayload } from './core/types';
import { currentGps, GPS_REASON } from './native/device';

/** Same rule as the server: radius plus the reported accuracy (at most 100 m). */
export function isFar(distanceM: number | null, accuracyM: number | null, radiusM: number): boolean {
  if (distanceM == null) return false;
  return distanceM > radiusM + Math.min(Number(accuracyM) || 0, 100);
}

export async function checkIn(db: Db, customer: CustomerRow, dayKey: string, radiusM: number, timeoutMs?: number): Promise<{ row: CheckInRow | null; error: string | null }> {
  const res = await currentGps(timeoutMs);
  const at = new Date().toISOString();
  if (!res.ok) {
    // Keep the time of the visit even without a location.
    const prev = await getCheckIn(db, customer.id, dayKey);
    if (!prev) await saveCheckIn(db, { customerId: customer.id, dayKey, at, latitude: null, longitude: null, accuracyM: null, distanceM: null, far: 0 });
    return { row: (await getCheckIn(db, customer.id, dayKey)) ?? null, error: GPS_REASON[res.reason] };
  }
  const { latitude, longitude, accuracy } = res.gps;
  const distanceM = customer.latitude != null && customer.longitude != null
    ? distanceMetres(latitude, longitude, customer.latitude, customer.longitude)
    : null;
  const row: CheckInRow = { customerId: customer.id, dayKey, at, latitude, longitude, accuracyM: accuracy, distanceM, far: isFar(distanceM, accuracy, radiusM) ? 1 : 0 };
  await saveCheckIn(db, row);
  return { row, error: null };
}

/** The check-in for today, taking one now when there is none yet. */
export async function checkInOrNow(db: Db, customer: CustomerRow, dayKey: string, radiusM: number): Promise<CheckInRow | null> {
  const prev = await getCheckIn(db, customer.id, dayKey);
  if (prev) return prev;
  return (await checkIn(db, customer, dayKey, radiusM, 8000)).row;
}

export function visitPayload(input: {
  clientRef: string;
  customer: CustomerRow;
  outcome: VisitOutcome;
  checkin: CheckInRow | null;
  noOrderReason?: string;
  note?: string;
  orderClientRef?: string;
}): VisitPayload {
  const v: VisitPayload = { clientRef: input.clientRef, customerId: input.customer.id, outcome: input.outcome, checkOutAt: new Date().toISOString() };
  if (input.customer.routeId) v.routeId = input.customer.routeId;
  const c = input.checkin;
  if (c) {
    v.checkInAt = c.at;
    if (c.latitude != null && c.longitude != null) {
      v.latitude = c.latitude;
      v.longitude = c.longitude;
      if (c.accuracyM != null) v.accuracyM = Math.round(c.accuracyM);
    }
  }
  if (input.noOrderReason) v.noOrderReason = input.noOrderReason;
  const note = input.note?.trim();
  if (note) v.note = note.slice(0, 300);
  if (input.orderClientRef) v.salesOrderClientRef = input.orderClientRef;
  return v;
}
