import { deliverySlots, isOpenAt } from './market-hours';

const TZ = 'Asia/Karachi';
const hours = { mon: { open: '09:00', close: '22:00' }, tue: { open: '18:00', close: '02:00' }, sun: { closed: true } };

describe('market-hours', () => {
  // Monday 16 Nov 2026, 10:30 in Karachi = 05:30 UTC
  const mondayMorning = new Date('2026-11-16T05:30:00Z');

  it('reads opening hours in Pakistan time, not UTC', () => {
    expect(isOpenAt(hours, [], mondayMorning, TZ)).toBe(true);
    // 08:30 Karachi (03:30 UTC) is before opening
    expect(isOpenAt(hours, [], new Date('2026-11-16T03:30:00Z'), TZ)).toBe(false);
  });

  it('handles hours that run past midnight', () => {
    // Wednesday 01:00 Karachi falls in Tuesday 18:00-02:00
    expect(isOpenAt(hours, [], new Date('2026-11-17T20:00:00Z'), TZ)).toBe(true);
  });

  it('treats holidays and closed days as closed', () => {
    expect(isOpenAt(hours, [new Date('2026-11-16T00:00:00Z')], mondayMorning, TZ)).toBe(false);
    expect(isOpenAt(hours, [], new Date('2026-11-15T07:00:00Z'), TZ)).toBe(false);
  });

  it('builds one-hour windows inside the hours, skipping the past', () => {
    const slots = deliverySlots(hours, [], { days: 1, leadMinutes: 60, now: mondayMorning, tz: TZ });
    // First window starts at 12:00 (10:30 + 60 min lead rounds up to the next hour start); last ends at 22:00.
    expect(slots[0].start).toBe('2026-11-16T07:00:00.000Z');
    expect(slots[0].label).toBe('12pm - 1pm');
    expect(slots[slots.length - 1].end).toBe('2026-11-16T17:00:00.000Z');
    expect(slots.every((s) => s.date === '2026-11-16')).toBe(true);
  });
});
