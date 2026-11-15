import { ModifierGroupView, priceModifiers } from './market-modifiers';

const size: ModifierGroupView = {
  id: 'g-size', name: 'Size', type: 'VARIANT', required: true, min: 1, max: 1,
  options: [
    { id: 's', name: 'Small', price: 0, isDefault: true, emoji: null },
    { id: 'l', name: 'Large', price: 250, isDefault: false, emoji: null },
  ],
};
const toppings: ModifierGroupView = {
  id: 'g-top', name: 'Toppings', type: 'ADDON', required: false, min: 0, max: 2,
  options: [
    { id: 'c', name: 'Extra cheese', price: 120, isDefault: false, emoji: null },
    { id: 'o', name: 'Olives', price: 80, isDefault: false, emoji: null },
    { id: 'j', name: 'Jalapeno', price: 60, isDefault: false, emoji: null },
  ],
};

describe('priceModifiers', () => {
  it('prices the picked options and keeps a readable summary', () => {
    const r = priceModifiers([size, toppings], [{ groupId: 'g-size', optionIds: ['l'] }, { groupId: 'g-top', optionIds: ['c', 'o'] }]);
    expect(r).toEqual({
      ok: true,
      extra: 450,
      stored: {
        picks: [{ groupId: 'g-size', optionIds: ['l'] }, { groupId: 'g-top', optionIds: ['c', 'o'] }],
        summary: [{ group: 'Size', options: ['Large'] }, { group: 'Toppings', options: ['Extra cheese', 'Olives'] }],
      },
    });
  });

  it('re-reads a stored line so prices always come from the POS', () => {
    const stored = { picks: [{ groupId: 'g-size', optionIds: ['l'] }], summary: [] };
    const cheaper = { ...size, options: size.options.map((o) => (o.id === 'l' ? { ...o, price: 200 } : o)) };
    expect(priceModifiers([cheaper], stored)).toMatchObject({ ok: true, extra: 200 });
  });

  it('asks for a required group', () => {
    expect(priceModifiers([size, toppings], [])).toEqual({ ok: false, error: 'Pehle "Size" chunein' });
  });

  it('enforces the maximum', () => {
    const r = priceModifiers([size, toppings], [{ groupId: 'g-size', optionIds: ['s'] }, { groupId: 'g-top', optionIds: ['c', 'o', 'j'] }]);
    expect(r.ok).toBe(false);
  });

  it('rejects options that no longer exist', () => {
    expect(priceModifiers([size], [{ groupId: 'g-size', optionIds: ['gone'] }]).ok).toBe(false);
    expect(priceModifiers([], [{ groupId: 'g-size', optionIds: ['l'] }]).ok).toBe(false);
  });

  it('is free for products without add-ons', () => {
    expect(priceModifiers([], undefined)).toEqual({ ok: true, extra: 0, stored: null });
  });
});
