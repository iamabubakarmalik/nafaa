import { ScoreParcel, bestByCity, scoreOf, scorecard } from './courier-score';

const DAY = 86_400_000;
const now = Date.parse('2026-11-09T10:00:00Z');
const sent = new Date(now - 20 * DAY);
const p = (o: Partial<ScoreParcel> = {}): ScoreParcel => ({
  courier: 'TCS', city: 'Lahore', outcome: 'DELIVERED', sentAt: sent, deliveredAt: new Date(sent.getTime() + 2 * DAY),
  attempts: 0, stuck: false, cod: 0, codSettledAt: null, cost: 250, claim: false, ...o,
});

describe('courier scorecard: one group', () => {
  it('computes delivery, RTO, days, first attempt, stuck, claims and cost', () => {
    const rows = [
      p(), p({ deliveredAt: new Date(sent.getTime() + 4 * DAY), attempts: 1 }), p({ attempts: null }),
      p({ outcome: 'RETURNED', deliveredAt: null, cost: 400 }), p({ outcome: 'OPEN', deliveredAt: null, stuck: true, claim: true, cost: null }),
    ];
    const s = scoreOf(rows, 7, now);
    expect(s).toMatchObject({ sent: 5, delivered: 3, returned: 1, open: 1, stuck: 1, claims: 1 });
    expect(s.deliveryRate).toBe(75);
    expect(s.rtoRate).toBe(25);
    expect(s.avgDays).toBe(2.7);
    // Only parcels with courier events count for first attempt: 1 of 2.
    expect(s.firstAttemptRate).toBe(50);
    expect(s.firstAttemptSample).toBe(2);
    expect(s.costPerParcel).toBe(288);
  });

  it('judges COD timing against the cycle: paid late and unpaid past the cycle are late', () => {
    const delivered = new Date(now - 15 * DAY);
    const rows = [
      p({ cod: 3000, deliveredAt: delivered, codSettledAt: new Date(delivered.getTime() + 3 * DAY) }),
      p({ cod: 3000, deliveredAt: delivered, codSettledAt: new Date(delivered.getTime() + 10 * DAY) }),
      p({ cod: 3000, deliveredAt: delivered, codSettledAt: null }),
      p({ cod: 3000, deliveredAt: new Date(now - 2 * DAY), codSettledAt: null }),
    ];
    const s = scoreOf(rows, 7, now);
    expect(s.codSample).toBe(3);
    expect(s.codOnTimeRate).toBe(33.3);
    expect(s.avgPayDelay).toBe(6.5);
  });

  it('returns nulls, not zeros, when there is nothing to judge', () => {
    const s = scoreOf([p({ outcome: 'OPEN', deliveredAt: null, attempts: null, cost: null })], 7, now);
    expect(s.deliveryRate).toBeNull();
    expect(s.avgDays).toBeNull();
    expect(s.firstAttemptRate).toBeNull();
    expect(s.codOnTimeRate).toBeNull();
    expect(s.costPerParcel).toBeNull();
  });
});

describe('courier scorecard: per city and best courier', () => {
  const rows: ScoreParcel[] = [
    ...Array.from({ length: 10 }, (_, i) => p({ courier: 'TCS', outcome: i < 9 ? 'DELIVERED' : 'RETURNED' })),
    ...Array.from({ length: 10 }, (_, i) => p({ courier: 'LEOPARDS', outcome: i < 6 ? 'DELIVERED' : 'RETURNED' })),
    ...Array.from({ length: 6 }, (_, i) => p({ courier: 'LEOPARDS', city: 'Karachi', outcome: i < 6 ? 'DELIVERED' : 'RETURNED' })),
    ...Array.from({ length: 6 }, (_, i) => p({ courier: 'TCS', city: 'Karachi', outcome: i < 3 ? 'DELIVERED' : 'RETURNED' })),
    p({ courier: 'POSTEX', city: 'Multan' }),
  ];
  const card = scorecard(rows, {}, { now });

  it('ranks couriers overall and per city', () => {
    expect(card.couriers.map((c) => c.code)).toEqual(['TCS', 'LEOPARDS', 'POSTEX']);
    const lahore = card.cities.find((c) => c.city === 'Lahore')!;
    expect(lahore.best).toBe('TCS');
    expect(lahore.runnerUp).toBe('LEOPARDS');
    expect(card.cities.find((c) => c.city === 'Karachi')!.best).toBe('LEOPARDS');
  });

  it('never calls a courier best on too few parcels', () => {
    expect(card.cities.find((c) => c.city === 'Multan')!.best).toBeNull();
  });

  it('feeds auto booking only with bookable couriers', () => {
    expect(bestByCity(card.cities)).toEqual({ Lahore: 'TCS', Karachi: 'LEOPARDS' });
    expect(bestByCity(card.cities, ['TCS'])).toEqual({ Lahore: 'TCS' });
  });
});
