import { applySchemes, earnedFreeByProduct, schemeIsLive, type SchemeLine, type SchemeRule } from './scheme-resolver';

/** Pepsi 250ml: carton of 24, Rs 50 a bottle. */
const pepsi = (baseQty: number, over: Partial<SchemeLine> = {}): SchemeLine => ({
  productId: 'pepsi', brandId: 'pepsico', categoryId: 'drinks', baseQty, unitPrice: 50, packs: { pcs: 1, Carton: 24 }, ...over,
});

const scheme = (over: Partial<SchemeRule>): SchemeRule => ({ id: 's1', name: 'Scheme', type: 'PERCENT_OFF', isActive: true, ...over });

describe('scheme resolver', () => {
  it('FREE_QTY gives free packs for every full set bought, in base units', () => {
    const s = scheme({ type: 'FREE_QTY', name: '10+1', buyQty: 10, freeQty: 1, buyUnitName: 'carton', productIds: ['pepsi'] });
    const [r] = applySchemes([pepsi(24 * 21)], [s]);
    expect(r.schemeId).toBe('s1');
    expect(r.freeBaseQty).toBe(48); // 21 cartons → 2 sets → 2 cartons free
    expect(r.discount).toBe(0);
    expect(r.note).toBe('10+1: 2 carton free');
  });

  it('FREE_QTY below one full set gives nothing', () => {
    const s = scheme({ type: 'FREE_QTY', buyQty: 10, freeQty: 1, buyUnitName: 'Carton' });
    expect(applySchemes([pepsi(24 * 9)], [s])[0].schemeId).toBeNull();
  });

  it('FREE_QTY of another product gives base units of that product', () => {
    const s = scheme({ type: 'FREE_QTY', buyQty: 5, freeQty: 6, buyUnitName: 'Carton', freeProductId: 'glass' });
    const [r] = applySchemes([pepsi(24 * 10)], [s]);
    expect(r.freeProductId).toBe('glass');
    expect(r.freeBaseQty).toBe(12);
  });

  it('a product without the buy pack does not qualify', () => {
    const s = scheme({ type: 'PERCENT_OFF', value: 5, buyUnitName: 'Carton' });
    expect(applySchemes([pepsi(100, { packs: { pcs: 1 } })], [s])[0].schemeId).toBeNull();
  });

  it('PERCENT_OFF and AMOUNT_PER_UNIT work on the line gross', () => {
    const pct = scheme({ id: 'p', type: 'PERCENT_OFF', value: 10, buyQty: 1, buyUnitName: 'Carton' });
    expect(applySchemes([pepsi(48)], [pct])[0].discount).toBe(240); // 2400 × 10%
    const amt = scheme({ id: 'a', type: 'AMOUNT_PER_UNIT', value: 30, buyUnitName: 'Carton' });
    expect(applySchemes([pepsi(48)], [amt])[0].discount).toBe(60);
  });

  it('SLAB takes the highest slab reached', () => {
    const s = scheme({ type: 'SLAB', buyUnitName: 'Carton', slabs: [{ minQty: 5, percent: 2 }, { minQty: 10, percent: 4 }, { minQty: 20, freeQty: 3 }] });
    expect(applySchemes([pepsi(24 * 4)], [s])[0].schemeId).toBeNull();
    expect(applySchemes([pepsi(24 * 6)], [s])[0].discount).toBe(144); // 7200 × 2%
    expect(applySchemes([pepsi(24 * 12)], [s])[0].discount).toBe(576); // 14400 × 4%
    expect(applySchemes([pepsi(24 * 25)], [s])[0].freeBaseQty).toBe(72);
  });

  it('picks the scheme worth most, and keeps the earlier one on a tie', () => {
    const a = scheme({ id: 'a', type: 'PERCENT_OFF', value: 5 });
    const b = scheme({ id: 'b', type: 'AMOUNT_PER_UNIT', value: 3 }); // Rs 3 a bottle = 6%
    expect(applySchemes([pepsi(10)], [a, b])[0].schemeId).toBe('b');
    const c = scheme({ id: 'c', type: 'PERCENT_OFF', value: 6 });
    expect(applySchemes([pepsi(10)], [b, c])[0].schemeId).toBe('b');
  });

  it('respects product, brand, category and price list filters', () => {
    const byBrand = scheme({ type: 'PERCENT_OFF', value: 5, brandIds: ['other'] });
    expect(applySchemes([pepsi(10)], [byBrand])[0].schemeId).toBeNull();
    const byCat = scheme({ type: 'PERCENT_OFF', value: 5, categoryIds: ['drinks'] });
    expect(applySchemes([pepsi(10)], [byCat])[0].schemeId).toBe('s1');
    const byList = scheme({ type: 'PERCENT_OFF', value: 5, priceListIds: ['retailers'] });
    expect(applySchemes([pepsi(10)], [byList], { priceListId: 'wholesale' })[0].schemeId).toBeNull();
    expect(applySchemes([pepsi(10)], [byList], { priceListId: 'retailers' })[0].schemeId).toBe('s1');
  });

  it('respects dates, the active flag and the minimum order value', () => {
    const at = new Date('2026-10-15T10:00:00Z');
    expect(schemeIsLive(scheme({ startsAt: '2026-10-16T00:00:00Z' }), at)).toBe(false);
    expect(schemeIsLive(scheme({ endsAt: '2026-10-14T23:59:59Z' }), at)).toBe(false);
    expect(schemeIsLive(scheme({ isActive: false }), at)).toBe(false);
    const min = scheme({ type: 'PERCENT_OFF', value: 5, minOrderValue: 1000 });
    expect(applySchemes([pepsi(10)], [min])[0].schemeId).toBeNull(); // Rs 500 order
    expect(applySchemes([pepsi(10), pepsi(10, { productId: 'x' })], [min], { orderGross: 1000 })[0].schemeId).toBe('s1');
  });

  it('rupees off never pass the line gross', () => {
    const s = scheme({ type: 'AMOUNT_PER_UNIT', value: 80 });
    expect(applySchemes([pepsi(2)], [s])[0].discount).toBe(100);
  });

  it('adds up free goods earned per product', () => {
    const s = scheme({ type: 'FREE_QTY', buyQty: 12, freeQty: 1 });
    const earned = earnedFreeByProduct([pepsi(24), pepsi(12)], [s]);
    expect(earned.get('pepsi')).toBe(3);
  });
});
