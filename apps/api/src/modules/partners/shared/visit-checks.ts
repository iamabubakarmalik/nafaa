/**
 * Checks on a field visit that may point to a fake visit. A flag does not
 * block the visit; it shows in the admin visit audit for review.
 */

export type VisitFlag = 'NO_GPS' | 'LOW_ACCURACY' | 'FAR_FROM_LEAD' | 'FAST_TRAVEL' | 'OUT_OF_HOURS' | 'TOO_MANY';

export const VISIT_FLAG_TEXT: Record<VisitFlag, string> = {
  NO_GPS: 'No location',
  LOW_ACCURACY: 'Weak location (over 200 m)',
  FAR_FROM_LEAD: 'Over 500 m from the shop’s first visit',
  FAST_TRAVEL: 'Too fast from the last visit (over 120 km/h)',
  OUT_OF_HOURS: 'Outside 8 AM–10 PM',
  TOO_MANY: 'Over 40 visits that day',
};

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Metres between two points. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const hasPoint = (p: { lat?: number | null; lng?: number | null } | null | undefined): p is { lat: number; lng: number } =>
  !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export function visitFlags(input: {
  visit: { lat?: number | null; lng?: number | null; accuracy?: number | null; visitedAt: Date };
  leadPoint?: { lat: number | null; lng: number | null } | null;
  previous?: { lat: number | null; lng: number | null; visitedAt: Date } | null;
  visitsThatDay: number;
}): VisitFlag[] {
  const flags: VisitFlag[] = [];
  const v = input.visit;
  if (!hasPoint(v)) flags.push('NO_GPS');
  else {
    if (typeof v.accuracy === 'number' && v.accuracy > 200) flags.push('LOW_ACCURACY');
    if (hasPoint(input.leadPoint) && distanceM(v, input.leadPoint) > 500) flags.push('FAR_FROM_LEAD');
    if (input.previous && hasPoint(input.previous)) {
      const hours = Math.abs(v.visitedAt.getTime() - input.previous.visitedAt.getTime()) / 3_600_000;
      const km = distanceM(v, input.previous) / 1000;
      if (km > 2 && (hours === 0 || km / hours > 120)) flags.push('FAST_TRAVEL');
    }
  }
  const pkHour = new Date(v.visitedAt.getTime() + 5 * 3_600_000).getUTCHours();
  if (pkHour < 8 || pkHour >= 22) flags.push('OUT_OF_HOURS');
  if (input.visitsThatDay >= 40) flags.push('TOO_MANY');
  return flags;
}
