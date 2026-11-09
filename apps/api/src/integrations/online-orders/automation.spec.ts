import {
  MAX_CHAIN, OrderFacts, ProductFacts, RATE_LIMIT, advanceAmount, checkConditions, emptyConditions, eventOfStatus, guardRun, matches,
  normalizeAction, normalizeRule, recipeRule, waLink,
} from './automation';
import { defaultsFor, normalizeAnswers } from './commerce-setup';

const order = (o: Partial<OrderFacts> = {}): OrderFacts => ({
  kind: 'order', integrationId: 'web', city: 'Lahore', amount: 4000, isCod: true, risk: 'OK', pastOrders: 2, returns: 0,
  productIds: ['p1'], tags: [], hour: 14, weekday: 1, ...o,
});
const product = (o: Partial<ProductFacts> = {}): ProductFacts => ({ kind: 'product', productId: 'p1', stock: 1, hour: 10, weekday: 2, ...o });

describe('automation: conditions', () => {
  it('an empty rule fits every order', () => {
    expect(matches(emptyConditions(), order())).toBe(true);
  });

  it('checks channel, city (with aliases), amount, payment and customer history', () => {
    const c = { ...emptyConditions(), channelIds: ['web'], cities: ['Lhr'], amountMin: 3000, amountMax: 5000, payment: 'COD' as const, rtoMin: 2 };
    expect(matches(c, order({ returns: 2 }))).toBe(true);
    const checks = checkConditions(c, order({ city: 'Karachi', returns: 1 }));
    expect(checks.filter((x) => !x.ok).map((x) => x.key)).toEqual(['cities', 'rtoMin']);
    expect(matches({ ...c, citiesExclude: true }, order({ city: 'Karachi', returns: 3 }))).toBe(true);
    expect(matches({ ...emptyConditions(), payment: 'PREPAID' }, order({ isCod: false }))).toBe(true);
  });

  it('checks new customer, risk, products, tags and time windows', () => {
    expect(matches({ ...emptyConditions(), newCustomer: true }, order({ pastOrders: 0 }))).toBe(true);
    expect(matches({ ...emptyConditions(), newCustomer: true }, order())).toBe(false);
    expect(matches({ ...emptyConditions(), risks: ['HIGH'] }, order({ risk: 'HIGH' }))).toBe(true);
    expect(matches({ ...emptyConditions(), productIds: ['p9'] }, order())).toBe(false);
    expect(matches({ ...emptyConditions(), tags: ['vip'] }, order({ tags: ['vip'] }))).toBe(true);
    // 22:00 → 06:00 wraps midnight.
    const night = { ...emptyConditions(), hourFrom: 22, hourTo: 6 };
    expect(matches(night, order({ hour: 23 }))).toBe(true);
    expect(matches(night, order({ hour: 3 }))).toBe(true);
    expect(matches(night, order({ hour: 12 }))).toBe(false);
    expect(matches({ ...emptyConditions(), days: [5, 6] }, order({ weekday: 1 }))).toBe(false);
  });

  it('stock rules look at the product', () => {
    expect(matches({ ...emptyConditions(), stockBelow: 2 }, product({ stock: 1 }))).toBe(true);
    expect(matches({ ...emptyConditions(), stockBelow: 2 }, product({ stock: 2 }))).toBe(false);
  });
});

describe('automation: rule cleaning and actions', () => {
  it('keeps only actions that fit the event and drops bad ones', () => {
    const r = normalizeRule({
      name: ' Hold ', event: 'ORDER_RECEIVED',
      actions: [{ type: 'SET_STATUS', to: 'ON_HOLD' }, { type: 'SET_STATUS', to: 'DELETED' }, { type: 'HIDE_PRODUCT' }, { type: 'BOOK_COURIER', courier: 'best' }, { type: 'TAG', tag: 'risky' }],
      conditions: { amountMin: '5000', payment: 'COD', risks: ['HIGH', 'NOPE'], days: [1, 9] },
    });
    expect(r.name).toBe('Hold');
    expect(r.actions).toEqual([{ type: 'SET_STATUS', to: 'ON_HOLD' }, { type: 'TAG', tag: 'risky' }]);
    expect(r.conditions).toMatchObject({ amountMin: 5000, payment: 'COD', risks: ['HIGH'], days: [1] });
  });

  it('refuses a rule with no event or no action', () => {
    expect(() => normalizeRule({ event: 'NOPE', actions: [{ type: 'NOTE', text: 'x' }] })).toThrow();
    expect(() => normalizeRule({ event: 'DELIVERED', actions: [] })).toThrow();
  });

  it('product events take product actions only; stock rules get a default limit', () => {
    expect(normalizeAction({ type: 'SET_STATUS', to: 'CONFIRMED' }, 'STOCK_LOW')).toBeNull();
    expect(normalizeAction({ type: 'HIDE_PRODUCT' }, 'STOCK_LOW')).toEqual({ type: 'HIDE_PRODUCT', channelId: null });
    expect(normalizeRule({ event: 'STOCK_LOW', actions: [{ type: 'PUSH_STOCK' }] }).conditions.stockBelow).toBe(1);
    expect(normalizeAction({ type: 'BOOK_COURIER', courier: 'BEST' }, 'CONFIRMED')).toEqual({ type: 'BOOK_COURIER', courier: 'BEST' });
    expect(normalizeAction({ type: 'ASK_ADVANCE' }, 'ORDER_RECEIVED')).toEqual({ type: 'ASK_ADVANCE', pct: 30 });
  });

  it('builds the advance link and amount', () => {
    expect(advanceAmount(2999, 30)).toBe(900);
    expect(waLink('0300-1234567', 'Salam')).toBe('https://wa.me/923001234567?text=Salam');
    expect(waLink('+92 300 1234567', 'a b')).toBe('https://wa.me/923001234567?text=a%20b');
    expect(waLink('123', 'x')).toBeNull();
  });

  it('maps order status events', () => {
    expect(eventOfStatus('READY')).toBe('PACKED');
    expect(eventOfStatus('OUT_FOR_DELIVERY')).toBe('DISPATCHED');
    expect(eventOfStatus('SETTLED')).toBe('PAYMENT_RECEIVED');
    expect(eventOfStatus('PREPARING')).toBeNull();
  });
});

describe('automation: loop guard', () => {
  const now = Date.parse('2026-11-09T10:00:00Z');
  const run = (o: Partial<{ ruleId: string; subjectId: string; event: string; at: Date; dryRun: boolean }> = {}) =>
    ({ ruleId: 'r1', subjectId: 'o1', event: 'CONFIRMED', at: new Date(now - 60_000), dryRun: false, ...o });

  it('stops a chain of rules raising events for the same order', () => {
    expect(guardRun({ ruleId: 'r1', subjectId: 'o1', event: 'CONFIRMED', depth: MAX_CHAIN, prior: [], now })).toBe('CHAIN');
    expect(guardRun({ ruleId: 'r1', subjectId: 'o1', event: 'CONFIRMED', depth: MAX_CHAIN - 1, prior: [], now })).toBeNull();
  });

  it('runs a rule once per order and event; dry runs do not count', () => {
    expect(guardRun({ ruleId: 'r1', subjectId: 'o1', event: 'CONFIRMED', depth: 0, prior: [run()], now })).toBe('ALREADY_RAN');
    expect(guardRun({ ruleId: 'r1', subjectId: 'o1', event: 'CONFIRMED', depth: 0, prior: [run({ dryRun: true })], now })).toBeNull();
    expect(guardRun({ ruleId: 'r1', subjectId: 'o1', event: 'PACKED', depth: 0, prior: [run()], now })).toBeNull();
    expect(guardRun({ ruleId: 'r2', subjectId: 'o1', event: 'CONFIRMED', depth: 0, prior: [run()], now })).toBeNull();
  });

  it('repeats a stock rule for a product only after a day', () => {
    const prior = [run({ event: 'STOCK_LOW', subjectId: 'p1', at: new Date(now - 3600_000) })];
    expect(guardRun({ ruleId: 'r1', subjectId: 'p1', event: 'STOCK_LOW', depth: 0, prior, now })).toBe('ALREADY_RAN');
    const old = [run({ event: 'STOCK_LOW', subjectId: 'p1', at: new Date(now - 25 * 3600_000) })];
    expect(guardRun({ ruleId: 'r1', subjectId: 'p1', event: 'STOCK_LOW', depth: 0, prior: old, now })).toBeNull();
  });

  it('holds a runaway rule', () => {
    const prior = Array.from({ length: RATE_LIMIT }, (_, i) => run({ subjectId: `o${i + 10}` }));
    expect(guardRun({ ruleId: 'r1', subjectId: 'new', event: 'CONFIRMED', depth: 0, prior, now })).toBe('RATE');
  });
});

describe('automation: recipes and seller setup', () => {
  it('fills recipe numbers', () => {
    const hold = recipeRule('hold_big_cod_new', { amount: 8000 });
    expect(hold.conditions).toMatchObject({ payment: 'COD', amountMin: 8000, newCustomer: true });
    expect(hold.actions[0]).toEqual({ type: 'SET_STATUS', to: 'ON_HOLD' });
    expect(recipeRule('city_courier', { city: 'Lahore', courier: 'TCS' }).actions).toEqual([{ type: 'BOOK_COURIER', courier: 'TCS' }]);
    expect(() => recipeRule('city_courier', { city: 'Lahore' })).toThrow();
    expect(recipeRule('low_stock_unlist', { stock: 3 }).conditions.stockBelow).toBe(3);
    expect(recipeRule('auto_confirm_prepaid').conditions.payment).toBe('PREPAID');
  });

  it('turns the answers into defaults', () => {
    const cod = defaultsFor(normalizeAnswers({ places: ['INSTAGRAM'], couriers: ['TCS', 'LEOPARDS'], codShare: 'MOST', team: 'SOLO', confirmBy: 'CALL', packScan: false }), ['TCS']);
    expect(cod.recipes.map((r) => r.key)).toEqual(['hold_big_cod_new', 'rto_advance']);
    expect(cod.hiddenNav).toEqual(expect.arrayContaining(['/online-orders/pack', '/online-orders/post-office', '/online-orders/abandoned']));
    expect(cod.pinnedNav).toContain('/online-orders/couriers-score');
    expect(cod.courierFallback).toBe('TCS');
    expect(cod.confirmText).toBeTruthy();
    const prepaid = defaultsFor(normalizeAnswers({ places: ['SHOPIFY'], couriers: ['RIDER'], codShare: 'FEW', confirmBy: 'WHATSAPP', packScan: true }), []);
    expect(prepaid.recipes.map((r) => r.key)).toEqual(['auto_confirm_prepaid']);
    expect(prepaid.homeTiles).not.toContain('STUCK');
    expect(prepaid.hiddenTiles).toContain('COD_DUE');
    expect(prepaid.pinnedNav).toContain('/online-store/whatsapp-templates');
    expect(prepaid.confirmText).toBeNull();
  });
});
