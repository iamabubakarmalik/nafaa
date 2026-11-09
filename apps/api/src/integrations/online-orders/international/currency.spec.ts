import { fromPkr, internationalNote, readInternational, roundTo, shippingFor, shownPrice, toPkr } from './currency';

const usd = { code: 'USD', rate: 280, decimals: 2 };
const jpy = { code: 'JPY', rate: 1.9, decimals: 0 };

describe('currency conversion', () => {
  it('converts PKR to a currency and rounds to its digits', () => {
    expect(fromPkr(2800, usd)).toBe(10);
    expect(fromPkr(1000, usd)).toBe(3.57);
    expect(fromPkr(1000, jpy)).toBe(526);
  });
  it('never divides by a bad rate', () => {
    expect(fromPkr(1000, { rate: 0, decimals: 2 })).toBe(0);
  });
  it('converts back to PKR with 2 digits', () => {
    expect(toPkr(3.57, usd)).toBe(999.6);
    expect(roundTo(1.005, 2)).toBe(1.01);
  });
});

describe('shownPrice', () => {
  it('converts at the rate without a price list row', () => {
    expect(shownPrice(1000, null, usd)).toEqual({ amount: 3.57, pkr: 999.6, source: 'rate' });
  });
  it('uses the country price list and books PKR from that amount', () => {
    expect(shownPrice(1000, 5, usd)).toEqual({ amount: 5, pkr: 1400, source: 'list' });
  });
  it('ignores zero or broken list prices', () => {
    expect(shownPrice(1000, 0, usd).source).toBe('rate');
    expect(shownPrice(1000, NaN, usd).source).toBe('rate');
  });
});

describe('shippingFor', () => {
  const c = { shippingFee: 3000, freeAbove: 20000 };
  it('charges below the free limit and waives at it', () => {
    expect(shippingFor(c, 19999)).toBe(3000);
    expect(shippingFor(c, 20000)).toBe(0);
  });
  it('always charges when there is no free limit', () => {
    expect(shippingFor({ shippingFee: 1500, freeAbove: null }, 1e9)).toBe(1500);
  });
});

describe('readInternational', () => {
  it('keeps good rows and drops bad ones', () => {
    const c = readInternational({
      enabled: true,
      currencies: [{ code: 'usd', rate: '280' }, { code: 'PKR', rate: 1 }, { code: 'AED', rate: 0 }, { code: 'usd', rate: 300 }, { code: 'JPY', rate: 1.9 }],
      countries: [
        { code: 'us', name: 'USA', currency: 'USD', shippingFee: 5000, freeAbove: 50000 },
        { code: 'PK', name: 'Pakistan', currency: 'USD' },
        { code: 'AE', name: 'UAE', currency: 'AED' },
        { code: 'JP', currency: 'JPY', shippingFee: -5 },
      ],
      defaultCountry: 'us',
    });
    expect(c.currencies.map((x) => x.code)).toEqual(['USD', 'JPY']);
    expect(c.currencies[1].decimals).toBe(0);
    expect(c.countries.map((x) => x.code)).toEqual(['US', 'JP']);
    expect(c.countries[1]).toMatchObject({ name: 'JP', shippingFee: 0, freeAbove: null });
    expect(c.defaultCountry).toBe('US');
    expect(c.enabled).toBe(true);
  });
  it('is off without countries or on garbage', () => {
    expect(readInternational({ enabled: true }).enabled).toBe(false);
    expect(readInternational(null).enabled).toBe(false);
    expect(readInternational('x').countries).toEqual([]);
  });
});

describe('internationalNote', () => {
  it('states country, amount and rate', () => {
    const c = readInternational({ currencies: [{ code: 'USD', rate: 280 }], countries: [{ code: 'US', name: 'USA', currency: 'USD' }] });
    expect(internationalNote(c.countries[0], c.currencies[0], 12.5)).toBe('International order: USA (US), customer saw USD 12.50 at USD 1 = PKR 280');
  });
});
