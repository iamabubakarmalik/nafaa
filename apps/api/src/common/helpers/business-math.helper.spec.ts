import { liveSaleSql, utcStamp } from './business-math.helper';

describe('business-math window binding', () => {
  it('binds a window edge as naive UTC text, not a session-dependent Date', () => {
    const q = utcStamp(new Date('2026-11-02T19:00:00.000Z'));
    expect(q.values).toEqual(['2026-11-02T19:00:00.000']);
    expect(q.sql).toContain('::timestamp');
  });

  it('liveSaleSql uses the cast for both edges', () => {
    const q = liveSaleSql(
      { tenantId: 't' },
      { gte: new Date('2026-11-02T19:00:00.000Z'), lt: new Date('2026-11-03T19:00:00.000Z') },
    );
    expect(q.values).toEqual(['t', '2026-11-02T19:00:00.000', '2026-11-03T19:00:00.000']);
    expect(q.sql.match(/::timestamp/g)).toHaveLength(2);
  });
});
