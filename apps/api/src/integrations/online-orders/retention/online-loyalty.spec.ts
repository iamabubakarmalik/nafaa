import { friendDiscountFor, onlinePoints, referralCodeFrom } from './online-loyalty.service';
import { normalizeRetention } from './retention-settings';

describe('online loyalty', () => {
  it('uses the online rate when set, else the counter rate', () => {
    expect(onlinePoints(2499, null, 0.01)).toBe(24);
    expect(onlinePoints(2499, 0.02, 0.01)).toBe(49);
    expect(onlinePoints(-100, null, 0.01)).toBe(0);
  });

  it('gives the friend a percent or fixed discount, never above the order', () => {
    const s = normalizeRetention({ referral: { enabled: true, friendDiscountType: 'PERCENT', friendDiscount: 10 } }).referral;
    expect(friendDiscountFor(s, 3000)).toBe(300);
    const f = normalizeRetention({ referral: { enabled: true, friendDiscountType: 'FIXED', friendDiscount: 500 } }).referral;
    expect(friendDiscountFor(f, 300)).toBe(300);
  });

  it('makes NAME + 4 digit codes', () => {
    expect(referralCodeFrom('Ayesha Khan')).toMatch(/^AYESHA\d{4}$/);
    expect(referralCodeFrom('علی')).toMatch(/^NAFAA\d{4}$/);
  });

  it('settings: clamps numbers, keeps only https review links', () => {
    const s = normalizeRetention({
      referral: { friendDiscount: 500, referrerPoints: -3 },
      reviews: { links: [{ label: 'Google', url: 'https://g.page/r/x' }, { label: 'Bad', url: 'javascript:alert(1)' }], linksFrom: 9 },
    });
    expect(s.referral.friendDiscount).toBe(90);
    expect(s.referral.referrerPoints).toBe(0);
    expect(s.reviews.links).toEqual([{ label: 'Google', url: 'https://g.page/r/x' }]);
    expect(s.reviews.linksFrom).toBe(5);
    expect(s.loyalty.enabled).toBe(false);
  });
});
