import { emptyHistory, phoneKey, riskOf } from './customer-risk';

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
