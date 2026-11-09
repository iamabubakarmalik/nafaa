import { agentStats, confirmationFor, queueScore } from './call-math';

const now = new Date('2026-11-20T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe('confirmation queue order', () => {
  const base = { receivedAt: hoursAgo(2), riskLevel: 'OK', attempts: 0, cod: true, total: 3000 };

  it('puts risky and older orders first', () => {
    const risky = queueScore({ ...base, riskLevel: 'HIGH' }, now)!;
    const ok = queueScore(base, now)!;
    const older = queueScore({ ...base, receivedAt: hoursAgo(20) }, now)!;
    expect(risky).toBeGreaterThan(ok);
    expect(older).toBeGreaterThan(ok);
  });

  it('holds an order while its callback time is ahead, then puts it on top', () => {
    expect(queueScore({ ...base, callBackAt: new Date(now.getTime() + 600_000) }, now)).toBeNull();
    const due = queueScore({ ...base, callBackAt: hoursAgo(0.1), lastCallAt: hoursAgo(3) }, now)!;
    expect(due).toBeGreaterThan(queueScore({ ...base, riskLevel: 'HIGH' }, now)!);
  });

  it('waits an hour after an unanswered call and lowers it per try', () => {
    expect(queueScore({ ...base, attempts: 1, lastCallAt: hoursAgo(0.5) }, now)).toBeNull();
    expect(queueScore({ ...base, attempts: 2, lastCallAt: hoursAgo(2) }, now)!).toBeLessThan(queueScore(base, now)!);
  });
});

describe('call outcomes', () => {
  it('maps to the order confirmation result', () => {
    expect(confirmationFor('CONFIRMED')).toBe('CONFIRMED');
    expect(confirmationFor('BUSY')).toBe('NO_ANSWER');
    expect(confirmationFor('CANCELLED')).toBe('REFUSED');
    expect(confirmationFor('CALL_BACK')).toBeNull();
  });
});

describe('agent figures', () => {
  it('counts calls, orders and the confirm rate per agent', () => {
    const rows = [
      { agentId: 'a', outcome: 'NO_ANSWER', channelOrderId: 'o1' },
      { agentId: 'a', outcome: 'CONFIRMED', channelOrderId: 'o1' },
      { agentId: 'a', outcome: 'CANCELLED', channelOrderId: 'o2' },
      { agentId: 'b', outcome: 'BUSY', channelOrderId: 'o3' },
    ];
    const [a, b] = agentStats(rows);
    expect(a).toMatchObject({ agentId: 'a', calls: 3, orders: 2, confirmed: 1, cancelled: 1, noAnswer: 1, confirmRate: 50 });
    expect(a.reachRate).toBeCloseTo(66.7, 1);
    expect(b).toMatchObject({ agentId: 'b', calls: 1, confirmRate: 0, reachRate: 0 });
  });
});
