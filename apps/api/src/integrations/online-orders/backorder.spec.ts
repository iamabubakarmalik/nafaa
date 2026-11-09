import {
  availability, availabilityDate, backorderRoom, backorderRule, cleanBackorderInput, leadTimeText, owedUnits,
  shopifyPolicy, shopifyPolicyUpdates, stockFloor, wooBackorders, wooStockPatch,
} from './backorder';

const ON = { enabled: true, max: null };
const OFF = { enabled: false, max: null };
const UNSET = { enabled: null, max: null };

describe('backorder rule', () => {
  it('link wins over size, size over product; null follows the level above', () => {
    expect(backorderRule({ backorder: true }).enabled).toBe(true);
    expect(backorderRule({ backorder: true }, { backorder: false }).enabled).toBe(false);
    expect(backorderRule({ backorder: false }, { backorder: null }, { backorder: true }).enabled).toBe(true);
    expect(backorderRule({ backorder: true }, null, { backorder: null }).enabled).toBe(true);
    expect(backorderRule({}).enabled).toBeNull();
  });

  it('Daraz cannot sell at zero, so it is always off there', () => {
    expect(backorderRule({ backorder: true }, null, { backorder: true }, 'DARAZ').enabled).toBe(false);
    expect(backorderRule({ backorder: true }, null, null, 'SHOPIFY').enabled).toBe(true);
  });

  it('cleans posted input', () => {
    expect(cleanBackorderInput({ backorder: true, max: '20', leadDays: 0, note: '  7 din me bhejenge ' }))
      .toEqual({ backorder: true, backorderMax: 20, backorderLeadDays: 1, backorderNote: '7 din me bhejenge' });
    expect(cleanBackorderInput({ backorder: null, max: '', note: '' })).toEqual({ backorder: null, backorderMax: null, backorderNote: null });
    expect(cleanBackorderInput({})).toEqual({});
  });
});

describe('backorder qty math', () => {
  it('owed units are the stock below zero', () => {
    expect(owedUnits(5)).toBe(0);
    expect(owedUnits(0)).toBe(0);
    expect(owedUnits(-3)).toBe(3);
    expect(owedUnits(-1.5)).toBe(1.5);
  });

  it('room: none when off, unlimited without a max, else max minus owed', () => {
    expect(backorderRoom(0, OFF)).toBe(0);
    expect(backorderRoom(0, UNSET)).toBe(0);
    expect(backorderRoom(-50, ON)).toBe(Infinity);
    expect(backorderRoom(0, { enabled: true, max: 10 })).toBe(10);
    expect(backorderRoom(-7, { enabled: true, max: 10 })).toBe(3);
    expect(backorderRoom(-12, { enabled: true, max: 10 })).toBe(0);
    expect(backorderRoom(4, { enabled: true, max: 10 })).toBe(10);
  });

  it('stock floor for accepting an online order', () => {
    expect(stockFloor(OFF)).toBeNull();
    expect(stockFloor(UNSET)).toBeNull();
    expect(stockFloor(ON)).toBe(-Infinity);
    expect(stockFloor({ enabled: true, max: 10 })).toBe(-10);
  });
});

describe('availability mapper', () => {
  it('in stock whenever there is a quantity to offer', () => {
    expect(availability(3, OFF)).toBe('in_stock');
    expect(availability(3, ON)).toBe('in_stock');
  });

  it('out of stock unless backorder is on and has room', () => {
    expect(availability(0, OFF)).toBe('out_of_stock');
    expect(availability(0, UNSET)).toBe('out_of_stock');
    expect(availability(0, ON)).toBe('backorder');
    expect(availability(0, ON, -40)).toBe('backorder');
    expect(availability(0, { enabled: true, max: 5 }, -5)).toBe('out_of_stock');
    expect(availability(0, { enabled: true, max: 5 }, -2)).toBe('backorder');
  });

  it('availability date and lead text', () => {
    expect(availabilityDate(7, new Date('2026-11-09T10:00:00Z'))).toBe('2026-11-16');
    expect(availabilityDate(null)).toBeNull();
    expect(leadTimeText({ leadDays: 7, note: null })).toBe('7 din me bhejenge');
    expect(leadTimeText({ leadDays: 7, note: 'Agle hafte' })).toBe('Agle hafte');
    expect(leadTimeText({ leadDays: null, note: null })).toBeNull();
  });
});

describe('channel payloads', () => {
  it('Shopify policy: untouched when never set, DENY when off or the limit is reached', () => {
    expect(shopifyPolicy(UNSET, 0)).toBeUndefined();
    expect(shopifyPolicy(ON, -100)).toBe('CONTINUE');
    expect(shopifyPolicy(OFF, 10)).toBe('DENY');
    expect(shopifyPolicy({ enabled: true, max: 5 }, -5)).toBe('DENY');
    expect(shopifyPolicy({ enabled: true, max: 5 }, -4)).toBe('CONTINUE');
  });

  it('Shopify updates: only changed variants, grouped per product', () => {
    const want = new Map([['v1', 'CONTINUE'], ['v2', 'CONTINUE'], ['v3', 'DENY']] as const);
    const out = shopifyPolicyUpdates([
      { id: 'v1', productId: 'p1', inventoryPolicy: 'DENY' },
      { id: 'v2', productId: 'p1', inventoryPolicy: 'CONTINUE' },
      { id: 'v3', productId: 'p2', inventoryPolicy: 'CONTINUE' },
      { id: 'v4', productId: 'p2', inventoryPolicy: 'CONTINUE' },
    ], (id) => want.get(id as 'v1'));
    expect([...out.entries()]).toEqual([
      ['p1', [{ id: 'v1', inventoryPolicy: 'CONTINUE' }]],
      ['p2', [{ id: 'v3', inventoryPolicy: 'DENY' }]],
    ]);
  });

  it('Woo backorders value', () => {
    expect(wooBackorders(UNSET, 0)).toBeUndefined();
    expect(wooBackorders(ON, 0)).toBe('notify');
    expect(wooBackorders(OFF, 0)).toBe('no');
  });

  it('Woo patch: true stock never below zero, backorders only when it changes', () => {
    expect(wooStockPatch({ id: 1, stock: 5, manage: true, backorders: 'no' }, 5, undefined)).toBeNull();
    expect(wooStockPatch({ id: 1, stock: 5, manage: true, backorders: 'no' }, 5, 'no')).toBeNull();
    expect(wooStockPatch({ id: 1, stock: 0, manage: true, backorders: 'no' }, -3, 'notify'))
      .toEqual({ id: 1, manage_stock: true, stock_quantity: 0, backorders: 'notify' });
    expect(wooStockPatch({ id: 1, stock: 0, manage: true, backorders: 'yes' }, 0, 'notify')).toBeNull();
    expect(wooStockPatch({ id: 2, stock: 9, manage: true, backorders: 'notify' }, 4, 'notify'))
      .toEqual({ id: 2, manage_stock: true, stock_quantity: 4 });
    expect(wooStockPatch({ id: 3, stock: null, manage: false }, 2, undefined))
      .toEqual({ id: 3, manage_stock: true, stock_quantity: 2 });
  });
});
