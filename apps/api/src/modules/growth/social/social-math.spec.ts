import {
  cleanHashtags, festivalsBetween, festivalsInWindow, newPostCode, parseJsonObject, platformFromSource, quickCaptions, quickHashtags, quickPlan,
  quickReelScript, socialSignal, tagLink, weekStart, weeklyCounts,
} from './social-math';

describe('social-math', () => {
  describe('tagLink', () => {
    it('adds utm tags for the platform and post', () => {
      const u = new URL(tagLink('https://shop.pk/products/kurta', { platform: 'INSTAGRAM', code: 'abc234', campaign: 'Eid ul Fitr' }));
      expect(u.searchParams.get('utm_source')).toBe('instagram');
      expect(u.searchParams.get('utm_medium')).toBe('social');
      expect(u.searchParams.get('utm_campaign')).toBe('eid-ul-fitr');
      expect(u.searchParams.get('utm_content')).toBe('np-abc234');
    });
    it('keeps utm values already on the link', () => {
      const u = new URL(tagLink('https://shop.pk/p?utm_campaign=winter&x=1', { platform: 'FACEBOOK', code: 'abc234' }));
      expect(u.searchParams.get('utm_campaign')).toBe('winter');
      expect(u.searchParams.get('x')).toBe('1');
      expect(u.searchParams.get('utm_source')).toBe('facebook');
    });
    it('leaves non-web links alone', () => {
      expect(tagLink('not a link', { platform: 'TIKTOK', code: 'abc234' })).toBe('not a link');
    });
  });

  describe('socialSignal', () => {
    it('reads the post tag and source from a stored landing page', () => {
      const s = socialSignal({ metadata: { landingSite: '/products/kurta?utm_source=instagram&utm_medium=social&utm_content=np-abc234' } });
      expect(s).toEqual({ platform: 'INSTAGRAM', code: 'abc234' });
    });
    it('reads URL-encoded tags', () => {
      const s = socialSignal({ metadata: { landing: encodeURIComponent('https://x.pk/?utm_source=tiktok&utm_content=np-zz9988') } });
      expect(s.platform).toBe('TIKTOK');
      expect(s.code).toBe('zz9988');
    });
    it('reads nested utm objects and Woo attribution fields', () => {
      expect(socialSignal({ metadata: { attribution: { utmSource: 'fb' } } }).platform).toBe('FACEBOOK');
      expect(socialSignal({ metadata: { _wc_order_attribution_utm_source: 'ig' } }).platform).toBe('INSTAGRAM');
    });
    it('uses the manual order source and the referrer', () => {
      expect(socialSignal({ metadata: { source: 'TIKTOK' } }).platform).toBe('TIKTOK');
      expect(socialSignal({ metadata: { referringSite: 'https://l.instagram.com/' } }).platform).toBe('INSTAGRAM');
    });
    it('reads the attribution columns saved on the order', () => {
      expect(socialSignal({ metadata: null, utmSource: 'ig', utmContent: 'np-abc234' })).toEqual({ platform: 'INSTAGRAM', code: 'abc234' });
      expect(socialSignal({ metadata: null, referrer: 'https://m.facebook.com/story.php' }).platform).toBe('FACEBOOK');
      expect(socialSignal({ metadata: null, referrer: 'https://wa.me/923001234567' }).platform).toBeNull();
    });
    it('returns nothing for other orders', () => {
      expect(socialSignal({ metadata: { source: 'PHONE', landingSite: '/?utm_source=google' } })).toEqual({ platform: null, code: null });
      expect(socialSignal({ metadata: { source: 'WHATSAPP' } }).platform).toBeNull();
      expect(socialSignal({ metadata: { landingSite: '/?utm_source=whatsapp&utm_content=np-abc234' } })).toEqual({ platform: 'WHATSAPP_STATUS', code: 'abc234' });
      expect(socialSignal({ metadata: null })).toEqual({ platform: null, code: null });
    });
  });

  it('maps source words to platforms', () => {
    expect(platformFromSource('m.facebook.com')).toBe('FACEBOOK');
    expect(platformFromSource('WhatsApp')).toBe('WHATSAPP_STATUS');
    expect(platformFromSource('google')).toBeNull();
  });

  it('makes six-character codes without look-alike characters', () => {
    const c = newPostCode();
    expect(c).toMatch(/^[a-z2-9]{6}$/);
    expect(c).not.toMatch(/[ilo01]/);
  });

  describe('weeks', () => {
    it('starts weeks on Monday', () => {
      expect(weekStart('2026-11-09')).toBe('2026-11-09'); // Monday
      expect(weekStart('2026-11-15')).toBe('2026-11-09'); // Sunday
    });
    it('counts posts per platform per week', () => {
      const w = weeklyCounts([
        { day: '2026-11-09', platforms: ['FACEBOOK', 'INSTAGRAM'] },
        { day: '2026-11-12', platforms: ['INSTAGRAM'] },
        { day: '2026-11-17', platforms: ['TIKTOK', 'NOPE'] },
      ]);
      expect(w).toEqual([
        { week: '2026-11-09', counts: { FACEBOOK: 1, INSTAGRAM: 2 }, total: 3 },
        { week: '2026-11-16', counts: { TIKTOK: 1 }, total: 1 },
      ]);
    });
  });

  describe('festival calendar', () => {
    it('has the November and December sale days', () => {
      const keys = festivalsBetween('2026-11-01', '2026-12-31').map((f) => `${f.key}@${f.date}`);
      expect(keys).toEqual(expect.arrayContaining(['11-11@2026-11-11', 'white-friday@2026-11-27', '12-12@2026-12-12']));
    });
    it('marks Islamic dates as approximate', () => {
      const eid = festivalsBetween('2027-01-01', '2027-12-31').find((f) => f.key === 'eid-ul-fitr');
      expect(eid?.approx).toBe(true);
      expect(eid?.date).toBe('2027-03-10');
    });
    it('includes festivals whose posting window has started', () => {
      // 11.11 posting starts 7 days before.
      expect(festivalsInWindow('2026-11-05', '2026-11-06').map((f) => f.key)).toContain('11-11');
      expect(festivalsInWindow('2026-11-01', '2026-11-02').map((f) => f.key)).not.toContain('12-12');
    });
  });

  describe('ready-made content', () => {
    const input = { shop: 'Hiba Store', products: [{ id: 'p1', name: 'Lawn Suit 3pc', price: 2500, comparePrice: 3200, category: 'Ladies Suits' }] };
    it('writes captions with the real price and Discount', () => {
      const c = quickCaptions(input);
      expect(c).toHaveLength(3);
      expect(c[0]).toContain('Rs 2,500');
      expect(c[0]).toContain('22% Discount');
    });
    it('writes English and Urdu captions', () => {
      expect(quickCaptions({ ...input, lang: 'en' })[0]).toContain('Now Rs 2,500');
      expect(quickCaptions({ ...input, lang: 'ur' })[0]).toMatch(/[؀-ۿ]/);
    });
    it('makes unique hashtags with festival and platform tags', () => {
      const h = quickHashtags({ ...input, platform: 'TIKTOK', festival: { name: 'Eid', hashtags: ['#EidMubarak'] } });
      expect(h).toContain('#HibaStore');
      expect(h).toContain('#EidMubarak');
      expect(h).toContain('#TikTokPakistan');
      expect(new Set(h.map((x) => x.toLowerCase())).size).toBe(h.length);
      expect(h.length).toBeLessThanOrEqual(20);
    });
    it('writes a reel script with hook, scenes and CTA', () => {
      const s = quickReelScript(input);
      expect(s.hook).toBeTruthy();
      expect(s.scenes.length).toBeGreaterThanOrEqual(3);
      expect(s.cta).toBeTruthy();
    });
    it('plans one post a day and builds up to festivals', () => {
      const plan = quickPlan({ ...input, from: '2026-11-05', days: 7 });
      expect(plan).toHaveLength(7);
      expect(plan[0].date).toBe('2026-11-05');
      expect(plan[6].date).toBe('2026-11-11');
      expect(plan[6].festivalKey).toBe('11-11');
      expect(plan.every((p) => p.platforms.length > 0)).toBe(true);
      // 9 November is Iqbal Day: a greeting post without a product or price.
      const iqbal = plan.find((p) => p.festivalKey === 'iqbal-day')!;
      expect(iqbal.productIds).toEqual([]);
      expect(iqbal.caption).not.toContain('Rs');
      expect(plan.filter((p) => p.festivalKey !== 'iqbal-day').every((p) => p.productIds[0] === 'p1')).toBe(true);
    });
  });

  it('reads JSON out of a model answer and cleans hashtags', () => {
    expect(parseJsonObject('Sure: {"a": 1} done')).toEqual({ a: 1 });
    expect(parseJsonObject('no json')).toBeNull();
    expect(cleanHashtags(['eid sale', '#EidSale', '##Lawn', 5])).toEqual(['#eidsale', '#Lawn']);
  });
});
