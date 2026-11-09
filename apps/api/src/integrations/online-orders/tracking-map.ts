/**
 * Parcel map and order journey. Pure functions over the normalised courier
 * events (courier-api/tracking-events.ts).
 *
 * Pakistani courier APIs send text events with a city name, never a rider's
 * live position. So a parcel sits on the map at a city: where it is going,
 * or the last city a courier event named. Nothing here invents a position.
 */

import { TrackEvent } from './courier-api/tracking-events';
import { STUCK_DAYS } from './order-board';
import { PkCity, cityLabel, matchCity } from './pk-cities';

export const PARCEL_STATES = ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED', 'STUCK', 'RETURNING', 'DELIVERED'] as const;
export type ParcelState = (typeof PARCEL_STATES)[number];

export interface ParcelInput {
  orderStatus: string;
  courierStatus: string | null;
  dispatchedAt: Date | null;
  courierBookedAt: Date | null;
  events: TrackEvent[];
}

const lastOf = (events: TrackEvent[]) => [...events].reverse().find((e) => e.status !== 'OTHER') ?? null;

/**
 * Where a sent parcel stands. Closed orders (returned to the shop, cancelled)
 * are not on the map; a delivered one is (the query keeps only today's).
 */
export function parcelState(p: ParcelInput, now = Date.now()): ParcelState | null {
  if (p.orderStatus === 'DELIVERED') return 'DELIVERED';
  if (['RETURNED', 'CANCELLED', 'REJECTED', 'PENDING', 'ACCEPTING'].includes(p.orderStatus)) return null;
  const last = lastOf(p.events);
  if (p.courierStatus === 'RETURNING' || p.courierStatus === 'RETURNED' || last?.status === 'RETURNING' || last?.status === 'RETURNED') return 'RETURNING';
  if (p.courierStatus === 'ATTEMPTED' || last?.status === 'ATTEMPT_FAILED') return 'FAILED';
  const sent = p.dispatchedAt ?? p.courierBookedAt;
  if (p.orderStatus === 'OUT_FOR_DELIVERY' && sent && now - sent.getTime() > STUCK_DAYS * 86_400_000) return 'STUCK';
  if (p.courierStatus === 'OUT_FOR_DELIVERY' || last?.status === 'OUT_FOR_DELIVERY') return 'OUT_FOR_DELIVERY';
  if (p.orderStatus !== 'OUT_FOR_DELIVERY' && !p.courierBookedAt) return null;
  return 'IN_TRANSIT';
}

/** The last city a courier event named, matched to a known city when possible. */
export function lastSeenCity(events: TrackEvent[]): { name: string; city: PkCity | null; at: string | null } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (!e.city) continue;
    return { name: cityLabel(e.city) ?? e.city, city: matchCity(e.city), at: e.at };
  }
  return null;
}

export const failedAttempts = (events: TrackEvent[]) => events.filter((e) => e.status === 'ATTEMPT_FAILED').length;

// ─── Map summary ────────────────────────────────────────────────

export interface MapParcel {
  id: string;
  state: ParcelState;
  /** City the parcel is going to (raw text from the order). */
  destination: string | null;
  /** Last city a courier event named. */
  seen: string | null;
}

export interface MapCity {
  key: string;
  name: string;
  lat: number;
  lng: number;
  province: string;
  total: number;
  counts: Record<ParcelState, number>;
  /** The state most parcels here are in, worst first on a tie. */
  top: ParcelState;
}

const WORST_FIRST: ParcelState[] = ['STUCK', 'FAILED', 'RETURNING', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'DELIVERED'];
const blank = (): Record<ParcelState, number> => ({ IN_TRANSIT: 0, OUT_FOR_DELIVERY: 0, FAILED: 0, STUCK: 0, RETURNING: 0, DELIVERED: 0 });

/**
 * Parcels grouped into city bubbles. `by` picks the place: the destination
 * city or the last city seen in courier events. Parcels whose place matches
 * no known city are counted under `unplaced` with the text as written.
 */
export function mapCities(parcels: MapParcel[], by: 'destination' | 'seen') {
  const cities = new Map<string, MapCity>();
  const unplaced = new Map<string, number>();
  let noCity = 0;
  for (const p of parcels) {
    const raw = by === 'seen' ? p.seen : p.destination;
    const c = matchCity(raw);
    if (!c) {
      if (raw && raw.trim()) unplaced.set(raw.trim().slice(0, 40), (unplaced.get(raw.trim().slice(0, 40)) ?? 0) + 1);
      else noCity++;
      continue;
    }
    const row = cities.get(c.name) ?? { key: c.name, name: c.name, lat: c.lat, lng: c.lng, province: c.province, total: 0, counts: blank(), top: 'IN_TRANSIT' as ParcelState };
    row.total++;
    row.counts[p.state]++;
    cities.set(c.name, row);
  }
  for (const row of cities.values()) {
    row.top = [...WORST_FIRST].sort((a, b) => row.counts[b] - row.counts[a] || WORST_FIRST.indexOf(a) - WORST_FIRST.indexOf(b))[0];
  }
  return {
    cities: [...cities.values()].sort((a, b) => b.total - a.total),
    unplaced: [...unplaced.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 30),
    noCity,
  };
}

// ─── Journey ────────────────────────────────────────────────────

export const JOURNEY_STEPS = ['BOOKED', 'PICKED_UP', 'AT_ORIGIN_HUB', 'IN_TRANSIT', 'AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY', 'END'] as const;
export type JourneyStepKey = (typeof JOURNEY_STEPS)[number];

export interface JourneyStep {
  key: JourneyStepKey;
  /** For END: DELIVERED or RETURNED once known. */
  outcome?: 'DELIVERED' | 'RETURNED';
  reached: boolean;
  /** A later step happened but the courier never reported this one. */
  inferred: boolean;
  current: boolean;
  at: string | null;
  city: string | null;
  text: string | null;
  rider: { name?: string; phone?: string } | null;
}

export interface JourneyPlace { name: string; lat: number; lng: number }

export interface Journey {
  steps: JourneyStep[];
  outcome: 'DELIVERED' | 'RETURNED' | null;
  returning: boolean;
  attempts: number;
  rider: { name?: string; phone?: string } | null;
  last: { at: string | null; text: string; city: string | null } | null;
  origin: JourneyPlace | null;
  destination: JourneyPlace | null;
  /** Known cities the parcel passed, oldest first (no repeats in a row). */
  path: JourneyPlace[];
  /** Last place seen (for the "here now" dot). */
  here: JourneyPlace | null;
  events: TrackEvent[];
}

export interface JourneyInput {
  events: TrackEvent[];
  orderStatus: string;
  bookedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  returnedAt: Date | null;
  originCity: string | null;
  destinationCity: string | null;
}

const place = (c: PkCity | null): JourneyPlace | null => (c ? { name: c.name, lat: c.lat, lng: c.lng } : null);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * The step timeline (Booked → Picked → origin hub → in transit → destination
 * hub → out for delivery → delivered / returned), each with the first
 * courier event of that step: time, city, the courier's words and the rider
 * when sent. A step the courier skipped is marked reached-by-inference when
 * a later one happened. Order dates fill Booked / Delivered / Returned when
 * the courier sent no events.
 */
export function journeyOf(j: JourneyInput): Journey {
  const ev = j.events ?? [];
  const firstOf = (st: string) => ev.find((e) => e.status === st) ?? null;
  const lastOfStatus = (st: string) => [...ev].reverse().find((e) => e.status === st) ?? null;
  const returnedEv = lastOfStatus('RETURNED');
  const deliveredEv = lastOfStatus('DELIVERED');
  const outcome: Journey['outcome'] = j.orderStatus === 'RETURNED' || returnedEv ? 'RETURNED'
    : j.orderStatus === 'DELIVERED' || deliveredEv ? 'DELIVERED' : null;
  const returning = !outcome && ev.some((e) => e.status === 'RETURNING');

  const raw = JOURNEY_STEPS.map((key): JourneyStep => {
    const e = key === 'END' ? (outcome === 'RETURNED' ? returnedEv : deliveredEv) : firstOf(key);
    let at = e?.at ?? null;
    if (!e) {
      if (key === 'BOOKED') at = iso(j.bookedAt);
      if (key === 'PICKED_UP' && j.dispatchedAt && ev.length === 0) at = iso(j.dispatchedAt);
      if (key === 'END') at = iso(outcome === 'RETURNED' ? j.returnedAt : outcome === 'DELIVERED' ? j.deliveredAt : null);
    }
    const reached = !!e || !!at || (key === 'END' && !!outcome);
    return {
      key, ...(key === 'END' && outcome ? { outcome } : {}),
      reached, inferred: false, current: false, at,
      city: e?.city ? cityLabel(e.city) : null, text: e?.text ?? null, rider: e?.rider ?? null,
    };
  });
  // A later step implies the earlier ones happened, even unreported.
  let furthest = -1;
  raw.forEach((s, i) => { if (s.reached) furthest = i; });
  raw.forEach((s, i) => { if (!s.reached && i < furthest) { s.reached = true; s.inferred = true; } });
  if (furthest >= 0 && !outcome) raw[furthest].current = true;

  const riderEv = [...ev].reverse().find((e) => e.rider);
  const origin = place(matchCity(j.originCity)) ?? place(matchCity(ev.find((e) => e.city)?.city));
  const destination = place(matchCity(j.destinationCity));
  const path: JourneyPlace[] = [];
  for (const e of ev) {
    const p = place(matchCity(e.city));
    if (p && path[path.length - 1]?.name !== p.name) path.push(p);
  }
  if (origin && path[0]?.name !== origin.name) path.unshift(origin);
  const seen = lastSeenCity(ev);
  const here = place(seen?.city ?? null) ?? (outcome === 'DELIVERED' ? destination : null);
  const lastEv = lastOf(ev) ?? ev[ev.length - 1] ?? null;
  return {
    steps: raw, outcome, returning, attempts: failedAttempts(ev),
    rider: riderEv?.rider ?? null,
    last: lastEv ? { at: lastEv.at, text: lastEv.text, city: lastEv.city ? cityLabel(lastEv.city) : null } : null,
    origin, destination, path, here, events: ev,
  };
}

/** The same journey for the customer's own tracking page: rider phone kept, nothing about other parcels. */
export function publicJourney(j: Journey) {
  return {
    steps: j.steps.map(({ key, outcome, reached, inferred, current, at, city, text, rider }) => ({ key, outcome, reached, inferred, current, at, city, text, rider })),
    outcome: j.outcome, returning: j.returning, attempts: j.attempts, rider: j.rider,
    origin: j.origin, destination: j.destination, path: j.path, here: j.here,
  };
}
