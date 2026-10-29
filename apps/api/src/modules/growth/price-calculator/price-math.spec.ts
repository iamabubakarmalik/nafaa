import { DEFAULT_CHANNEL_FEES, normalizeFees, normalizeGrowthSettings, channelKind } from '../growth-settings';
import { PriceInputs, at, breakdownAt, endWith9, quoteChannel } from './price-math';

const base: PriceInputs = {
  cost: 1000, packaging: 50, courier: 200, returnPct: 100, codPct: 4, codFixed: 0,
  adsPerOrder: 0, rtoPct: 0, deliveryCharge: 0, taxPct: 0, target: { mode: 'MARGIN', value: 20 }, endWith9: false,
};
const plain = normalizeFees({ commissionPct: 0, paymentFeePct: 0, codShare: 0, ownCourier: true }, DEFAULT_CHANNEL_FEES.WEBSITE);

describe('price math', () => {
  it('ends prices in 9 without going below the raw price', () => {
    expect(endWith9(1234)).toBe(1239);
    expect(endWith9(1239)).toBe(1239);
    expect(endWith9(1239.2)).toBe(1249);
    expect(endWith9(1240)).toBe(1249);
    expect(endWith9(0)).toBe(9);
  });

  it('breaks even at cost + packaging + courier with no fees', () => {
    const q = quoteChannel({ ...base, target: { mode: 'RUPEES', value: 0 } }, plain);
    expect(q.breakEven).toBe(1250);
    expect(q.price).toBe(1250);
    expect(q.profit).toBe(0);
  });

  it('hits the target margin of the price', () => {
    const q = quoteChannel(base, plain);
    // 1250 / (1 - 0.2) = 1562.5 → 1563
    expect(q.price).toBe(1563);
    expect(q.margin).toBeGreaterThanOrEqual(20);
    expect(q.profit).toBeCloseTo(313, 0);
  });

  it('hits a target in rupees a piece and rounds to 9', () => {
    const q = quoteChannel({ ...base, target: { mode: 'RUPEES', value: 300 }, endWith9: true }, plain);
    expect(q.price).toBe(1559);
    expect(q.profit).toBe(309);
  });

  it('breakdown adds up to what the customer pays', () => {
    const fees = normalizeFees({ commissionPct: 15, paymentFeePct: 2, ownCourier: false, shippingFee: 150 }, DEFAULT_CHANNEL_FEES.DARAZ);
    const i: PriceInputs = { ...base, adsPerOrder: 100, rtoPct: 20, deliveryCharge: 150, taxPct: 18 };
    const { lines } = breakdownAt(2000, i, fees);
    const total = lines.reduce((s, l) => s + l.value, 0);
    expect(total).toBeCloseTo(2150, 1);
    expect(lines.find((l) => l.key === 'codFee')).toBeUndefined();
    expect(lines.find((l) => l.key === 'shipping')?.value).toBe(150);
  });

  it('counts COD fee only on the COD share with an own courier', () => {
    const fees = normalizeFees({ codShare: 50, paymentFeePct: 0 }, DEFAULT_CHANNEL_FEES.WEBSITE);
    const { lines } = breakdownAt(1000, { ...base, codPct: 4, codFixed: 20 }, fees);
    // 50% × (4% × 1000 + 20) = 30
    expect(lines.find((l) => l.key === 'codFee')?.value).toBe(30);
  });

  it('spreads returns and ads over delivered orders', () => {
    const i = { ...base, rtoPct: 20, adsPerOrder: 80 };
    const { lines } = breakdownAt(2000, i, plain);
    // ads: 80 / 0.8 = 100; RTO: 0.25 × (50 + 200 + 200) = 112.5
    expect(lines.find((l) => l.key === 'ads')?.value).toBe(100);
    expect(lines.find((l) => l.key === 'rto')?.value).toBe(112.5);
  });

  it('price at break-even leaves no loss with every fee on', () => {
    const fees = normalizeFees({ commissionPct: 12, paymentFeePct: 3, codShare: 80 }, DEFAULT_CHANNEL_FEES.SHOPIFY);
    const i = { ...base, rtoPct: 15, adsPerOrder: 120, deliveryCharge: 100, taxPct: 17 };
    const q = quoteChannel(i, fees);
    expect(q.breakEven).not.toBeNull();
    expect(at(q.breakEven!, i, fees).profit).toBeGreaterThanOrEqual(-0.01);
    expect(at(q.breakEven! - 2, i, fees).profit).toBeLessThan(0);
  });

  it('reports when fees or margin leave nothing', () => {
    const greedy = normalizeFees({ commissionPct: 100 }, DEFAULT_CHANNEL_FEES.WEBSITE);
    expect(quoteChannel(base, greedy).problem).toBe('FEES_TOO_HIGH');
    const fees = normalizeFees({ commissionPct: 50, codShare: 0 }, DEFAULT_CHANNEL_FEES.WEBSITE);
    expect(quoteChannel({ ...base, target: { mode: 'MARGIN', value: 60 } }, fees).problem).toBe('MARGIN_TOO_HIGH');
  });

  it('normalizes saved settings and keeps presets', () => {
    const s = normalizeGrowthSettings({ price: { channels: { DARAZ: { category: 'fashion', commissionPct: 18 } }, rtoPct: '25' }, ads: { postExpenses: false } });
    expect(s.price.channels.DARAZ.category).toBe('fashion');
    expect(s.price.channels.DARAZ.ownCourier).toBe(false);
    expect(s.price.rtoPct).toBe(25);
    expect(s.price.adsPerOrder).toBeNull();
    expect(s.ads.postExpenses).toBe(false);
    expect(normalizeGrowthSettings(null).ads.postExpenses).toBe(true);
  });

  it('maps sales channels to fee kinds', () => {
    expect(channelKind('DARAZ')).toBe('DARAZ');
    expect(channelKind('CUSTOM_WEBSITE', 'woocommerce')).toBe('WOOCOMMERCE');
    expect(channelKind('CUSTOM_WEBSITE', null)).toBe('WEBSITE');
    expect(channelKind('FOODPANDA')).toBeNull();
  });
});
