import { normalizeRules, pickCourier, rankCouriers } from './courier-rules';

const cfg = normalizeRules({
  trigger: 'ACCEPT',
  rules: [
    { action: 'BOOK', courier: 'TCS', codMin: 10000 },
    { action: 'BOOK', courier: 'LEOPARDS', cities: ['Karachi'] },
    { action: 'ASK', channelIds: ['daraz'] },
  ],
  fallback: 'POSTEX',
}, ['TCS', 'LEOPARDS', 'POSTEX']);

const order = (o: Partial<{ city: string | null; cod: number; risk: string | null; integrationId: string }> = {}) =>
  ({ city: 'Lahore', cod: 2000, risk: 'OK', integrationId: 'web', ...o });

describe('courier rules: setup', () => {
  it('drops unknown couriers, keeps ask rules, defaults to holding risky customers', () => {
    const r = normalizeRules({ trigger: 'X', rules: [{ action: 'BOOK', courier: 'FOO' }, { action: 'ASK' }], fallback: 'FOO' }, ['TCS']);
    expect(r.trigger).toBe('OFF');
    expect(r.rules).toHaveLength(1);
    expect(r.rules[0].action).toBe('ASK');
    expect(r.fallback).toBeNull();
    expect(r.holdRisky).toBe(true);
  });
});

describe('courier rules: picking', () => {
  it('first rule that fits wins', () => {
    expect(pickCourier(cfg, order({ cod: 12000, city: 'Karachi' }))).toMatchObject({ action: 'BOOK', courier: 'TCS', ruleId: 'r1' });
    expect(pickCourier(cfg, order({ city: 'karachi ' }))).toMatchObject({ action: 'BOOK', courier: 'LEOPARDS' });
  });

  it('otherwise the fallback courier', () => {
    expect(pickCourier(cfg, order())).toMatchObject({ action: 'BOOK', courier: 'POSTEX', ruleId: null });
  });

  it('an ask rule stops auto-booking', () => {
    expect(pickCourier(cfg, order({ integrationId: 'daraz' })).action).toBe('ASK');
  });

  it('a risky customer is never booked by itself', () => {
    expect(pickCourier(cfg, order({ risk: 'HIGH', cod: 12000 })).action).toBe('ASK');
    expect(pickCourier({ ...cfg, holdRisky: false }, order({ risk: 'HIGH', cod: 12000 }))).toMatchObject({ action: 'BOOK', courier: 'TCS' });
  });

  it('no fallback: the shop decides', () => {
    expect(pickCourier({ ...cfg, fallback: null }, order()).action).toBe('ASK');
  });

  it('risk and COD limits on a rule', () => {
    const c = normalizeRules({ rules: [{ action: 'BOOK', courier: 'TCS', risks: ['NEW'], codMax: 5000 }] }, ['TCS']);
    expect(pickCourier(c, order({ risk: 'NEW', cod: 4000 })).action).toBe('BOOK');
    expect(pickCourier(c, order({ risk: 'NEW', cod: 6000 })).action).toBe('ASK');
    expect(pickCourier(c, order({ risk: 'TRUSTED', cod: 4000 })).action).toBe('ASK');
  });
});

describe('courier suggestions', () => {
  it('higher delivered share wins; a tiny sample never wins', () => {
    const r = rankCouriers([
      { code: 'TCS', sent: 40, delivered: 36, returned: 4, chargeSum: 40 * 260, chargeCount: 40 },
      { code: 'LEOPARDS', sent: 50, delivered: 40, returned: 10, chargeSum: 50 * 200, chargeCount: 50 },
      { code: 'POSTEX', sent: 2, delivered: 2, returned: 0, chargeSum: 0, chargeCount: 0 },
    ]);
    expect(r[0].code).toBe('TCS');
    expect(r[0].best).toBe(true);
    expect(r.find((x) => x.code === 'POSTEX')!.best).toBe(false);
    expect(r.find((x) => x.code === 'LEOPARDS')).toMatchObject({ successRate: 80, avgCharge: 200 });
  });

  it('same success: the cheaper courier ranks first', () => {
    const r = rankCouriers([
      { code: 'A', sent: 20, delivered: 18, returned: 2, chargeSum: 20 * 300, chargeCount: 20 },
      { code: 'B', sent: 20, delivered: 18, returned: 2, chargeSum: 20 * 200, chargeCount: 20 },
    ]);
    expect(r.map((x) => x.code)).toEqual(['B', 'A']);
  });

  it('no history: nothing is marked best', () => {
    expect(rankCouriers([{ code: 'A', sent: 0, delivered: 0, returned: 0, chargeSum: 0, chargeCount: 0 }])[0].best).toBe(false);
  });
});
