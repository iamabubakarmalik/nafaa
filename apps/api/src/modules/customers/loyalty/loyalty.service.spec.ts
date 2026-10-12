import { pointsToExpire } from './loyalty.service';

const d = (s: string) => new Date(`${s}T10:00:00Z`);

describe('pointsToExpire', () => {
  it('spends oldest points first and expires what is left of old lots', () => {
    // 100 in Jan, 50 in Jun, 120 spent in Jul → Jan used up, 30 of Jun left.
    const entries = [{ points: 100, createdAt: d('2026-01-10') }, { points: 50, createdAt: d('2026-06-10') }, { points: -120, createdAt: d('2026-07-01') }];
    expect(pointsToExpire(entries, d('2026-03-01'))).toBe(0);
    expect(pointsToExpire(entries, d('2026-08-01'))).toBe(30);
  });
  it('expires nothing when everything old was spent', () => {
    expect(pointsToExpire([{ points: 40, createdAt: d('2026-01-01') }, { points: -40, createdAt: d('2026-02-01') }], d('2026-06-01'))).toBe(0);
  });
});
