import { baseRowFromProduct, followPiecePrices, packDiscountOf, fromBase, optionalPackFromBase, packCostFromAverage, packFromBase, perBase, safeRate, toBase, wholePacks } from './unit-math';
import { bumpPrice } from '../../../modules/inventory/products/suppliers/product-suppliers.service';
import { pickPreferred } from '../../../modules/inventory/products/suppliers/product-suppliers.helper';

describe('unit math', () => {
  it('turns packs into base units and back', () => {
    expect(toBase(2, 24)).toBe(48);
    expect(fromBase(48, 24)).toBe(2);
    expect(toBase(1.5, 12)).toBe(18);
    expect(fromBase(30, 12)).toBe(2.5);
  });

  it('treats a missing, zero or broken rate as 1', () => {
    expect(safeRate(0)).toBe(1);
    expect(safeRate(-3)).toBe(1);
    expect(safeRate(null)).toBe(1);
    expect(safeRate('abc')).toBe(1);
    expect(toBase(5, 0)).toBe(5);
  });

  it('counts whole packs in stock without float drift', () => {
    expect(wholePacks(36, 12)).toBe(3);
    expect(wholePacks(0.3 * 3, 0.3)).toBe(3);
    expect(wholePacks(35.99, 12)).toBe(2);
    expect(wholePacks(-5, 12)).toBe(0);
  });

  it('prices a pack from the base price and back', () => {
    expect(packFromBase(12.5, 12)).toBe(150);
    expect(packFromBase(3.33, 3)).toBe(9.99);
    expect(perBase(150, 12)).toBe(12.5);
    expect(perBase(100, 3)).toBe(33.3333);
  });

  it('keeps an empty tier price empty', () => {
    expect(optionalPackFromBase(null, 12)).toBeNull();
    expect(optionalPackFromBase(0, 12)).toBeNull();
    expect(optionalPackFromBase(9, 12)).toBe(108);
  });

  it('moves pack cost with the base average cost', () => {
    expect(packCostFromAverage(10.256, 24)).toBe(246.14);
  });

  it('builds the base row from the product, keeping the name when it clashes', () => {
    const p = { unit: 'kg', price: 300, costPrice: 250, wholesalePrice: 280, creditPrice: null };
    expect(baseRowFromProduct(p, true)).toEqual({ unitName: 'kg', conversionRate: 1, conversionType: 'BASE', price: 300, costPrice: 250, wholesalePrice: 280, creditPrice: null });
    expect(baseRowFromProduct(p, false)).not.toHaveProperty('unitName');
  });
});

describe('bulk price change', () => {
  it('rounds to the step and never goes to zero', () => {
    expect(bumpPrice(100, 10)).toBe(110);
    expect(bumpPrice(103, 10, 5)).toBe(115);
    expect(bumpPrice(99, -5, 10)).toBe(90);
    expect(bumpPrice(2, -90, 5)).toBe(5);
    expect(bumpPrice(0, 10)).toBe(0);
  });
});

describe('preferred supplier', () => {
  it('keeps exactly one preferred link', () => {
    expect(pickPreferred([{ isPreferred: false }, { isPreferred: true }, { isPreferred: true }]).map((l) => l.isPreferred)).toEqual([false, true, false]);
    expect(pickPreferred([{ isPreferred: false }, { isPreferred: false }]).map((l) => l.isPreferred)).toEqual([true, false]);
    expect(pickPreferred([])).toEqual([]);
  });

  it('moves automatic pack tiers with the piece and keeps typed ones', () => {
    const before = { price: 50, costPrice: 40, wholesalePrice: 45, creditPrice: null };
    const after = { price: 60, costPrice: 40, wholesalePrice: 45, creditPrice: 55 };
    const carton = { conversionRate: 24, price: 1200, costPrice: 960, wholesalePrice: 1080, creditPrice: null };
    expect(followPiecePrices(before, after, carton)).toEqual({ price: 1440, creditPrice: 1320 });
    // A 5% pack discount carries over to the new price (wholesale 1080 is not 5% off, so it counts as typed).
    expect(packDiscountOf(before, { ...carton, price: 1140 })).toBe(5);
    expect(followPiecePrices(before, after, { ...carton, price: 1140 })).toEqual({ price: 1368, creditPrice: 1254 });
    // A typed rate stays.
    expect(followPiecePrices(before, after, { ...carton, price: 1150, wholesalePrice: 1100 })).toEqual({ creditPrice: 1320 });
    expect(followPiecePrices(before, before, carton)).toEqual({});
  });
});
