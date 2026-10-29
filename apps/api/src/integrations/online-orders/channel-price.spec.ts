import { applyPriceRule, channelPrice, readPriceRule, samePrice } from './channel-price';
import { priceXml } from './daraz.client';

describe('channel price rule', () => {
  it('no rule keeps the Nafaa price', () => {
    expect(applyPriceRule(1250, readPriceRule(undefined))).toBe(1250);
  });

  it('percent up and down', () => {
    expect(applyPriceRule(1000, { mode: 'PERCENT', value: 10, rounding: 'NONE' })).toBe(1100);
    expect(applyPriceRule(1000, { mode: 'PERCENT', value: -15, rounding: 'NONE' })).toBe(850);
    expect(applyPriceRule(999, { mode: 'PERCENT', value: 12.5, rounding: 'NONE' })).toBe(1123.88);
  });

  it('fixed rupees up and down, never below zero', () => {
    expect(applyPriceRule(500, { mode: 'FIXED', value: 150, rounding: 'NONE' })).toBe(650);
    expect(applyPriceRule(500, { mode: 'FIXED', value: -100, rounding: 'NONE' })).toBe(400);
    expect(applyPriceRule(80, { mode: 'FIXED', value: -100, rounding: 'NONE' })).toBe(0);
  });

  it('rounding to the nearest 10', () => {
    expect(applyPriceRule(1234, { mode: 'NONE', value: 0, rounding: 'NEAREST_10' })).toBe(1230);
    expect(applyPriceRule(1000, { mode: 'PERCENT', value: 7.7, rounding: 'NEAREST_10' })).toBe(1080);
    expect(applyPriceRule(3, { mode: 'NONE', value: 0, rounding: 'NEAREST_10' })).toBe(10);
  });

  it('rounding to a price ending in 9', () => {
    expect(applyPriceRule(1234, { mode: 'NONE', value: 0, rounding: 'END_9' })).toBe(1229);
    expect(applyPriceRule(1236, { mode: 'NONE', value: 0, rounding: 'END_9' })).toBe(1239);
    expect(applyPriceRule(1000, { mode: 'PERCENT', value: 10, rounding: 'END_9' })).toBe(1099);
    expect(applyPriceRule(4, { mode: 'NONE', value: 0, rounding: 'END_9' })).toBe(4);
  });

  it('a link price wins over the rule', () => {
    const rule = readPriceRule({ mode: 'PERCENT', value: 10, rounding: 'END_9' });
    expect(channelPrice(1000, rule, 950)).toBe(950);
    expect(channelPrice(1000, rule, null)).toBe(1099);
    expect(channelPrice(1000, rule, 0)).toBe(1099);
  });

  it('reads stored rules safely', () => {
    expect(readPriceRule({ mode: 'PERCENT', value: -150 })).toEqual({ mode: 'PERCENT', value: -90, rounding: 'NONE' });
    expect(readPriceRule({ mode: 'BOGUS', value: 5, rounding: 'END_9' })).toEqual({ mode: 'NONE', value: 0, rounding: 'END_9' });
    expect(readPriceRule({ mode: 'FIXED', value: 'abc' })).toEqual({ mode: 'FIXED', value: 0, rounding: 'NONE' });
  });

  it('compares in whole rupees', () => {
    expect(samePrice(1000, 1000.4)).toBe(true);
    expect(samePrice(1000, 1001)).toBe(false);
    expect(samePrice(1000, null)).toBe(false);
  });

  it('Daraz price XML carries the normal price per SKU', () => {
    const xml = priceXml([{ itemId: '11', skuId: '22', sellerSku: 'A&B', price: 1099 }]);
    expect(xml).toContain('<ItemId>11</ItemId><SkuId>22</SkuId><SellerSku>A&amp;B</SellerSku><Price>1099.00</Price>');
    expect(xml).not.toContain('SalePrice');
  });
});
