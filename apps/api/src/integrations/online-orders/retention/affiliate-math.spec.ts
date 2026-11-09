import { AffiliateRule, commissionBase, commissionFor, matchAffiliate, normalizeCode, roiOf, slugify, statementOf } from './affiliate-math';

const rules: AffiliateRule[] = [
  { id: 'a', slug: 'ayesha-styles', codes: ['AYESHA10'], commissionType: 'PERCENT', commissionValue: 10 },
  { id: 'b', slug: 'bilal', codes: ['BILAL', 'BILAL200'], commissionType: 'FIXED', commissionValue: 150 },
];

describe('attribution', () => {
  it('matches the discount code on the order, ignoring case and spaces', () => {
    expect(matchAffiliate({ discountCodes: [' ayesha10 '] }, rules)).toEqual({ affiliateId: 'a', source: 'CODE' });
    expect(matchAffiliate({ discountCodes: ['bilal200'] }, rules)).toEqual({ affiliateId: 'b', source: 'CODE' });
  });

  it('falls back to the link tag in utm_campaign', () => {
    expect(matchAffiliate({ discountCodes: [], utmCampaign: 'Ayesha-Styles' }, rules)).toEqual({ affiliateId: 'a', source: 'UTM' });
  });

  it('a code wins over a different link tag', () => {
    expect(matchAffiliate({ discountCodes: ['BILAL'], utmCampaign: 'ayesha-styles' }, rules)).toEqual({ affiliateId: 'b', source: 'CODE' });
  });

  it('returns null for an order with neither', () => {
    expect(matchAffiliate({ discountCodes: ['EID20'], utmCampaign: 'eid-sale' }, rules)).toBeNull();
    expect(matchAffiliate({}, rules)).toBeNull();
  });

  it('normalises codes and slugs', () => {
    expect(normalizeCode(' Eid 20 ')).toBe('EID20');
    expect(slugify('Ayesha Styles!')).toBe('ayesha-styles');
  });
});

describe('commission', () => {
  it('percent is on the goods, not the delivery charge', () => {
    expect(commissionBase(3200, 200)).toBe(3000);
    expect(commissionFor(rules[0], 3000)).toBe(300);
  });

  it('fixed is per delivered order whatever the value', () => {
    expect(commissionFor(rules[1], 99_999)).toBe(150);
  });

  it('caps percent at 100 and never goes negative', () => {
    expect(commissionFor({ commissionType: 'PERCENT', commissionValue: 250 }, 1000)).toBe(1000);
    expect(commissionFor({ commissionType: 'PERCENT', commissionValue: -5 }, 1000)).toBe(0);
  });

  it('statement: delivered earn, open are pending, returned earn nothing, paid stay frozen', () => {
    const st = statementOf(rules[0], [
      { id: '1', status: 'DELIVERED', total: 2200, deliveryFee: 200, paid: false },
      { id: '2', status: 'DELIVERED', total: 1100, deliveryFee: 100, paid: true, paidCommission: 90 },
      { id: '3', status: 'OUT_FOR_DELIVERY', total: 5000, deliveryFee: 0, paid: false },
      { id: '4', status: 'RETURNED', total: 4000, deliveryFee: 0, paid: false },
    ]);
    expect(st.totals).toEqual({ orders: 4, delivered: 2, pending: 1, returned: 1, sales: 3300, commission: 290, paid: 90, due: 200 });
    expect(st.lines.find((l) => l.id === '4')!.commission).toBe(0);
  });

  it('ROI is sales per rupee of commission', () => {
    expect(roiOf(30_000, 3000)).toBe(10);
    expect(roiOf(1000, 0)).toBeNull();
  });
});
