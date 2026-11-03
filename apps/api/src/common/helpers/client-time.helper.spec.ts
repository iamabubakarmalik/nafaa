import { acceptClientTime, notBefore, saleClock } from './client-time.helper';

const NOW = new Date('2026-11-03T10:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

describe('acceptClientTime', () => {
  it('ignores a missing or broken value', () => {
    expect(acceptClientTime(undefined, NOW)).toBeNull();
    expect(acceptClientTime(null, NOW)).toBeNull();
    expect(acceptClientTime('', NOW)).toBeNull();
    expect(acceptClientTime('yesterday evening', NOW)).toBeNull();
    expect(acceptClientTime({}, NOW)).toBeNull();
  });

  it('keeps a time from the last 72 hours', () => {
    const evening = hoursAgo(15);
    expect(acceptClientTime(evening.toISOString(), NOW)?.toISOString()).toBe(evening.toISOString());
    expect(acceptClientTime(hoursAgo(72).toISOString(), NOW)?.toISOString()).toBe(hoursAgo(72).toISOString());
  });

  it('refuses a time older than 72 hours', () => {
    expect(acceptClientTime(hoursAgo(72.1).toISOString(), NOW)).toBeNull();
    expect(acceptClientTime('2025-01-01T00:00:00Z', NOW)).toBeNull();
  });

  it('refuses a time in the future but treats a clock a little ahead as now', () => {
    expect(acceptClientTime(new Date(NOW.getTime() + 10 * 60_000).toISOString(), NOW)).toBeNull();
    expect(acceptClientTime(new Date(NOW.getTime() + 60_000).toISOString(), NOW)?.getTime()).toBe(NOW.getTime());
  });
});

describe('saleClock', () => {
  const tillA = { id: 'A', openedAt: hoursAgo(26), closedAt: hoursAgo(12) };
  const tillB = { id: 'B', openedAt: hoursAgo(2), closedAt: null };

  it('dates the bill when it was sold and puts it in the till open then', () => {
    const sold = hoursAgo(14);
    expect(saleClock(sold, tillA, tillB)).toEqual({ soldAt: sold, register: tillA });
  });

  it('uses the till open now when none was open then, and keeps the bill inside its count', () => {
    const sold = hoursAgo(5);
    expect(saleClock(sold, null, tillB)).toEqual({ soldAt: tillB.openedAt, register: tillB });
    const later = hoursAgo(1);
    expect(saleClock(later, null, tillB)).toEqual({ soldAt: later, register: tillB });
  });

  it('keeps the client time when the branch has no till', () => {
    const sold = hoursAgo(3);
    expect(saleClock(sold, null, null)).toEqual({ soldAt: sold, register: null });
  });
});

describe('notBefore', () => {
  it('moves a time up to the floor only when it is earlier', () => {
    expect(notBefore(hoursAgo(5), hoursAgo(3))).toEqual(hoursAgo(3));
    expect(notBefore(hoursAgo(1), hoursAgo(3))).toEqual(hoursAgo(1));
    expect(notBefore(hoursAgo(1), null)).toEqual(hoursAgo(1));
  });
});
