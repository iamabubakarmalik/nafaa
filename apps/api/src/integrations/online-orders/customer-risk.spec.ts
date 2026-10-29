import { blockedRisk, emptyHistory, phoneKey, riskOf, withSignals } from './customer-risk';

const h = (p: Partial<ReturnType<typeof emptyHistory>>) => ({ ...emptyHistory(), ...p });

describe('customer risk', () => {
  it('phoneKey: har format ek jaisa', () => {
    expect(phoneKey('0300-1234567')).toBe('3001234567');
    expect(phoneKey('+92 300 1234567')).toBe('3001234567');
    expect(phoneKey('923001234567')).toBe('3001234567');
    expect(phoneKey('12345')).toBe(null);
  });
  it('naya', () => expect(riskOf(h({})).level).toBe('NEW'));
  it('2 wapas = HIGH', () => expect(riskOf(h({ total: 5, delivered: 3, returned: 2 })).level).toBe('HIGH'));
  it('1 wapas, 0 liya = HIGH', () => expect(riskOf(h({ total: 1, returned: 1 })).level).toBe('HIGH'));
  it('1 wapas, 3 liye = WATCH', () => expect(riskOf(h({ total: 4, delivered: 3, returned: 1 })).level).toBe('WATCH'));
  it('3 cancel, 0 liya = WATCH', () => expect(riskOf(h({ total: 3, cancelled: 3 })).level).toBe('WATCH'));
  it('2 liye = TRUSTED', () => expect(riskOf(h({ total: 2, delivered: 2 })).level).toBe('TRUSTED'));
  it('1 liya = OK', () => expect(riskOf(h({ total: 1, delivered: 1 })).level).toBe('OK'));
});

describe('customer risk: order signals', () => {
  const none = { cod: 2000, avgOrder: 2500, nearestOrderMinutes: null, cityCovered: null, city: 'Lahore' };
  it('nothing new: history reason only', () => {
    const r = withSignals(riskOf(h({ total: 2, delivered: 2 })), none);
    expect(r.level).toBe('TRUSTED');
    expect(r.reasons).toHaveLength(1);
  });
  it('another order from the same phone within minutes', () => {
    const r = withSignals(riskOf(h({ total: 3, delivered: 3 })), { ...none, nearestOrderMinutes: 4 });
    expect(r.level).toBe('WATCH');
    expect(r.reasons![0]).toContain('4 minute');
  });
  it('city no courier serves', () => {
    expect(withSignals(riskOf(h({ total: 1, delivered: 1 })), { ...none, cityCovered: false, city: 'Xyzabad' }).reasons![0]).toContain('Xyzabad');
  });
  it('very high COD from a new customer', () => {
    expect(withSignals(riskOf(h({})), { ...none, cod: 16_000 }).level).toBe('WATCH');
    expect(withSignals(riskOf(h({})), { ...none, cod: 40_000 }).level).toBe('HIGH');
    expect(withSignals(riskOf(h({ total: 4, delivered: 4 })), { ...none, cod: 40_000 }).level).toBe('TRUSTED');
  });
  it('two warnings on a new customer make it HIGH', () => {
    expect(withSignals(riskOf(h({})), { ...none, nearestOrderMinutes: 2, cityCovered: false }).level).toBe('HIGH');
  });
  it('repeated cancellations with nothing delivered', () => {
    const r = withSignals(riskOf(h({ total: 2, cancelled: 2 })), none);
    expect(r.level).toBe('WATCH');
    expect(r.reasons).toContain('2 order pehle cancel hue');
  });
  it('blocked stays blocked', () => {
    expect(withSignals(blockedRisk(h({}), 'fake'), { ...none, nearestOrderMinutes: 1 }).level).toBe('BLOCKED');
  });
});

