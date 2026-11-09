import { attributionColumns, attributionOf, matchCampaign, trafficSourceOf, urlParams, utmLink } from './attribution';

describe('attribution', () => {
  it('reads UTM tags and click ids from a Shopify landing site', () => {
    const a = attributionOf({
      landing_site: '/products/lawn-suit?utm_source=facebook&utm_medium=paid&utm_campaign=Eid%20Sale&fbclid=AbC123',
      referring_site: 'https://l.facebook.com/',
      source_name: 'web',
      discount_codes: [{ code: 'eid20' }],
    }, 'shopify')!;
    expect(a.utmSource).toBe('facebook');
    expect(a.utmCampaign).toBe('Eid Sale');
    expect(a.clickIds?.fbclid).toBe('AbC123');
    expect(a.discountCodes).toEqual(['EID20']);
    expect(trafficSourceOf(a)).toBe('META');
  });

  it('reads WooCommerce order attribution meta and coupons', () => {
    const a = attributionOf({
      meta_data: [
        { key: '_wc_order_attribution_source_type', value: 'utm' },
        { key: '_wc_order_attribution_utm_source', value: 'tiktok' },
        { key: '_wc_order_attribution_utm_campaign', value: 'winter_drop' },
        { key: '_wc_order_attribution_referrer', value: '(none)' },
        { key: '_wc_order_attribution_session_entry', value: 'https://shop.pk/p/shoes' },
      ],
      coupon_lines: [{ code: 'TT10' }],
    }, 'woocommerce')!;
    expect(a.utmSource).toBe('tiktok');
    expect(a.utmCampaign).toBe('winter_drop');
    expect(a.referrer).toBeUndefined();
    expect(a.discountCodes).toEqual(['TT10']);
    expect(trafficSourceOf(a)).toBe('TIKTOK');
  });

  it('reads website API fields in either shape', () => {
    expect(attributionOf({ utm: { source: 'google', campaign: 'search' }, couponCode: 'g5' }, 'custom')).toMatchObject({ utmSource: 'google', utmCampaign: 'search', discountCodes: ['G5'] });
    expect(attributionOf({ utm_source: 'ig', landingPage: 'https://x.pk/?gclid=1' }, 'custom')!.clickIds).toEqual({ gclid: '1' });
    expect(attributionOf({ items: [] }, 'custom')).toBeUndefined();
  });

  it('tells the platform from the referrer when there are no tags', () => {
    expect(trafficSourceOf({ referrer: 'https://www.google.com/' })).toBe('GOOGLE');
    expect(trafficSourceOf({ referrer: 'https://blog.example.com/post' })).toBe('REFERRAL');
    expect(trafficSourceOf({ referrer: 'https://shop.pk/cart' }, ['shop.pk'])).toBe('DIRECT');
    expect(trafficSourceOf({ landingPage: '/' })).toBe('DIRECT');
    expect(trafficSourceOf({ utmSource: 'newsletter' })).toBe('EMAIL');
    expect(trafficSourceOf({ utmSource: 'partner-blog' })).toBe('OTHER');
  });

  it('gives manual orders their picked source', () => {
    expect(attributionColumns({ source: 'INSTAGRAM' })).toMatchObject({ utmSource: 'instagram', trafficSource: 'META' });
    expect(attributionColumns({ source: 'WHATSAPP' })!.trafficSource).toBe('WHATSAPP');
    expect(attributionColumns({ source: 'MANUAL' })).toBeNull();
    expect(attributionColumns({ attribution: { utmSource: 'fb', discountCodes: ['A'] } })).toMatchObject({ trafficSource: 'META', discountCodes: ['A'] });
  });

  it('matches orders to campaigns by code first, then utm_campaign', () => {
    const rules = [
      { id: 'a', platform: 'META', name: 'Eid Sale', utmCampaign: null, discountCodes: [] },
      { id: 'b', platform: 'INFLUENCER', name: 'Ayesha', utmCampaign: 'ayesha-reel', discountCodes: ['AYESHA10'] },
    ];
    expect(matchCampaign({ utmCampaign: 'eid_sale', discountCodes: ['ayesha10'] }, rules)).toMatchObject({ rule: { id: 'b' }, by: 'CODE' });
    expect(matchCampaign({ utmCampaign: 'EID-SALE' }, rules)).toMatchObject({ rule: { id: 'a' }, by: 'UTM' });
    expect(matchCampaign({ utmCampaign: 'Ayesha Reel' }, rules)).toMatchObject({ rule: { id: 'b' }, by: 'UTM' });
    expect(matchCampaign({ utmCampaign: 'other' }, rules)).toBeNull();
  });

  it('builds UTM links and keeps other parameters', () => {
    expect(utmLink('https://shop.pk/p/a?variant=2&utm_source=old#top', { source: 'facebook', medium: 'paid', campaign: 'Eid Sale' }))
      .toBe('https://shop.pk/p/a?variant=2&utm_source=facebook&utm_medium=paid&utm_campaign=Eid%20Sale#top');
    expect(urlParams('/x?a=1&B=2')).toEqual({ a: '1', b: '2' });
  });
});
