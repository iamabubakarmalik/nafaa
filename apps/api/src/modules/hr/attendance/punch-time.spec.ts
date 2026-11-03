import { punchTime } from './attendance.service';

describe('punchTime (offline punches)', () => {
  const now = new Date('2026-11-02T10:00:00.000Z');

  it('uses the server time without `at`', () => {
    expect(punchTime(undefined, now)).toEqual(now);
  });

  it('keeps an offline punch from the last 12 hours', () => {
    expect(punchTime('2026-11-02T04:30:00.000Z', now)).toEqual(new Date('2026-11-02T04:30:00.000Z'));
  });

  it('ignores a time older than 12 hours or in the future', () => {
    expect(punchTime('2026-11-01T20:00:00.000Z', now)).toEqual(now);
    expect(punchTime('2026-11-02T10:05:00.000Z', now)).toEqual(now);
  });

  it('clamps a few seconds of phone clock drift to now', () => {
    expect(punchTime('2026-11-02T10:00:30.000Z', now)).toEqual(now);
  });
});
