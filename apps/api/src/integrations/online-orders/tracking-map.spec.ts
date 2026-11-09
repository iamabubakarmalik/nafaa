import { TrackEvent } from './courier-api/tracking-events';
import { journeyOf, mapCities, parcelState } from './tracking-map';

const DAY = 86_400_000;
const now = Date.parse('2026-11-09T10:00:00Z');
const ev = (status: TrackEvent['status'], at: string, city?: string, text = status, rider?: TrackEvent['rider']): TrackEvent => ({ status, at, text, ...(city ? { city } : {}), ...(rider ? { rider } : {}) });

describe('tracking map: parcel state', () => {
  const base = { orderStatus: 'OUT_FOR_DELIVERY', courierStatus: 'IN_TRANSIT', dispatchedAt: new Date(now - DAY), courierBookedAt: new Date(now - DAY), events: [] as TrackEvent[] };
  it('sorts sent parcels into states, worst signals first', () => {
    expect(parcelState(base, now)).toBe('IN_TRANSIT');
    expect(parcelState({ ...base, courierStatus: 'OUT_FOR_DELIVERY' }, now)).toBe('OUT_FOR_DELIVERY');
    expect(parcelState({ ...base, courierStatus: 'ATTEMPTED' }, now)).toBe('FAILED');
    expect(parcelState({ ...base, courierStatus: 'RETURNING' }, now)).toBe('RETURNING');
    expect(parcelState({ ...base, dispatchedAt: new Date(now - 6 * DAY) }, now)).toBe('STUCK');
    expect(parcelState({ ...base, orderStatus: 'DELIVERED' }, now)).toBe('DELIVERED');
    expect(parcelState({ ...base, orderStatus: 'RETURNED' }, now)).toBeNull();
    expect(parcelState({ ...base, orderStatus: 'READY', courierBookedAt: null, dispatchedAt: null }, now)).toBeNull();
  });
});

describe('tracking map: city bubbles', () => {
  it('groups by destination or last seen city, keeping unknown places apart', () => {
    const parcels = [
      { id: '1', state: 'IN_TRANSIT' as const, destination: 'Lhr', seen: 'Karachi' },
      { id: '2', state: 'STUCK' as const, destination: 'Lahore Cantt', seen: null },
      { id: '3', state: 'OUT_FOR_DELIVERY' as const, destination: 'Some Village', seen: 'Multan' },
      { id: '4', state: 'IN_TRANSIT' as const, destination: null, seen: null },
    ];
    const d = mapCities(parcels, 'destination');
    expect(d.cities).toHaveLength(1);
    expect(d.cities[0]).toMatchObject({ name: 'Lahore', total: 2, top: 'STUCK' });
    expect(d.unplaced).toEqual([{ name: 'Some Village', count: 1 }]);
    expect(d.noCity).toBe(1);
    const s = mapCities(parcels, 'seen');
    expect(s.cities.map((c) => c.name).sort()).toEqual(['Karachi', 'Multan']);
  });
});

describe('tracking map: journey', () => {
  it('fills each step from the first event, infers skipped ones and marks the current step', () => {
    const j = journeyOf({
      events: [
        ev('BOOKED', '2026-11-05T05:00:00Z', 'Lahore'),
        ev('IN_TRANSIT', '2026-11-06T05:00:00Z', 'Lahore', 'Departed'),
        ev('AT_DESTINATION_HUB', '2026-11-07T05:00:00Z', 'KHI'),
        ev('OUT_FOR_DELIVERY', '2026-11-08T05:00:00Z', 'Karachi', 'With rider', { name: 'Ali', phone: '03001234567' }),
      ],
      orderStatus: 'OUT_FOR_DELIVERY', bookedAt: null, dispatchedAt: null, deliveredAt: null, returnedAt: null, originCity: null, destinationCity: 'Karachi',
    });
    const by = Object.fromEntries(j.steps.map((s) => [s.key, s]));
    expect(by.BOOKED.reached).toBe(true);
    expect(by.PICKED_UP).toMatchObject({ reached: true, inferred: true, at: null });
    expect(by.AT_DESTINATION_HUB.city).toBe('Karachi');
    expect(by.OUT_FOR_DELIVERY).toMatchObject({ current: true, rider: { name: 'Ali' } });
    expect(by.END.reached).toBe(false);
    expect(j.path.map((p) => p.name)).toEqual(['Lahore', 'Karachi']);
    expect(j.origin?.name).toBe('Lahore');
    expect(j.destination?.name).toBe('Karachi');
    expect(j.here?.name).toBe('Karachi');
    expect(j.rider?.phone).toBe('03001234567');
  });

  it('uses order dates when the courier sent no events, and shows returns', () => {
    const j = journeyOf({
      events: [ev('ATTEMPT_FAILED', '2026-11-07T05:00:00Z', 'Multan', 'Customer not available'), ev('RETURNED', '2026-11-09T05:00:00Z', 'Lahore')],
      orderStatus: 'RETURNED', bookedAt: new Date('2026-11-04T05:00:00Z'), dispatchedAt: null, deliveredAt: null, returnedAt: null, originCity: 'Lahore', destinationCity: 'Multan',
    });
    expect(j.outcome).toBe('RETURNED');
    expect(j.attempts).toBe(1);
    expect(j.steps[0].at).toBe('2026-11-04T05:00:00.000Z');
    expect(j.steps[6]).toMatchObject({ key: 'END', outcome: 'RETURNED', reached: true });
    const plain = journeyOf({ events: [], orderStatus: 'DELIVERED', bookedAt: null, dispatchedAt: new Date('2026-11-05T05:00:00Z'), deliveredAt: new Date('2026-11-06T05:00:00Z'), returnedAt: null, originCity: null, destinationCity: 'isb' });
    expect(plain.outcome).toBe('DELIVERED');
    expect(plain.steps.every((s) => s.reached)).toBe(true);
    expect(plain.here?.name).toBe('Islamabad');
  });
});
