import { priceCutTotal, type PriceCutLine } from './price-cut.helper';

/** A transaction stub: units as given, no bulk rates, combos or quotations. */
function fakeDb(units: Array<{ productId: string; variantId?: string | null; conversionRate: number; price: number; wholesalePrice?: number | null; creditPrice?: number | null }> = []) {
  return {
    productUnit: { findMany: async () => units.map((u) => ({ variantId: null, wholesalePrice: null, creditPrice: null, ...u })) },
    hardwareBulkPricing: { findMany: async () => [] },
    productCombo: { findMany: async () => [] },
    hardwareQuotation: { findMany: async () => [] },
  } as never;
}

/** Retail 100, wholesale 90, credit 110. */
const line = (over: Partial<PriceCutLine>): PriceCutLine => ({
  productId: 'p1', quantity: 2, price: 100,
  productPrice: 100, productWholesale: 90, productCredit: 110,
  ...over,
});

describe('price cut with price tiers', () => {
  it('wholesale price on a wholesale line is not a discount', async () => {
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 90, tier: 'WHOLESALE' })])).toBe(0);
  });

  it('credit price on a credit line is not a discount', async () => {
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 110, tier: 'CREDIT' })])).toBe(0);
  });

  it('a manual price below the wholesale price counts as a discount', async () => {
    // 85 against the wholesale floor of 90, two pieces.
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 85, tier: 'WHOLESALE' })])).toBe(10);
  });

  it('a manual price below the credit price counts as a discount, even at the retail price', async () => {
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 100, tier: 'CREDIT' })])).toBe(20);
  });

  it('a tier without its own price falls back to retail', async () => {
    const l = line({ price: 100, tier: 'CREDIT', productCredit: null });
    expect(await priceCutTotal(fakeDb(), 't1', [l])).toBe(0);
    expect(await priceCutTotal(fakeDb(), 't1', [{ ...l, price: 95 }])).toBe(10);
  });

  it('a pack sold at its wholesale pack price is not a discount', async () => {
    // Carton of 12: retail 1150, wholesale 1020 → 85 a piece.
    const db = fakeDb([{ productId: 'p1', conversionRate: 12, price: 1150, wholesalePrice: 1020 }]);
    expect(await priceCutTotal(db, 't1', [line({ price: 85, quantity: 12, tier: 'WHOLESALE' })])).toBe(0);
  });

  it('a retail line keeps the old rule: the wholesale price is an owner-set price', async () => {
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 90 })])).toBe(0);
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 90, tier: 'RETAIL' })])).toBe(0);
    expect(await priceCutTotal(fakeDb(), 't1', [line({ price: 80 })])).toBe(20);
  });
});
