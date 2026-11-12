import { cleanPath, cleanSlug, cleanTarget, defaultProductHandle, idPrefixOf, slugProblem, slugify, uniqueHandle } from './lib/handle';
import { htmlToText, sanitizeHtml, textToHtml } from './lib/sanitize-html';
import { quoteRates, freeShippingGap, zoneFor, provinceCode, weightKg } from './lib/shipping';
import { readRules, ruleWhere } from './lib/collection-rules';
import { readMenuItems, resolveMenu, menuRefs } from './lib/menus';
import { domainKind, hostProblem, normalizeHost, pairOf, dnsRecordsFor, slugFromHost } from './lib/host';
import { checkSecret, hashSecret, readToken, signToken } from './lib/tokens';
import { mergeSettings, readCheckout, readSettings, readShipping, readPolicies, policyKindOf, publicCheckout } from './store-settings';
import { cleanThemeDoc, carryContent, themeRefs, ThemeDocError } from './theme/theme-doc';
import { presetDoc, PRESETS } from './theme/presets';
import { SECTIONS, TEMPLATE_KEYS, FIXED_SECTION, allowedIn } from './theme/section-schema';
import { blockedDomain, blockedWord, mergeControls, readControls } from './store-controls';
import { policyTemplate } from './lib/policy-templates';
import { sourceOf } from './store-analytics.service';

describe('handles', () => {
  it('slugifies names', () => {
    expect(slugify('Lawn Suit — 3 Piece & Dupatta!')).toBe('lawn-suit-3-piece-and-dupatta');
    expect(slugify('Café Crème')).toBe('cafe-creme');
    expect(slugify('   ')).toBe('');
  });
  it('default product handle ends with the id prefix', () => {
    const h = defaultProductHandle('Red Kurta', 'a1b2c3d4-e5f6-7890-abcd-ef0123456789');
    expect(h).toBe('red-kurta-a1b2c3d4');
    expect(idPrefixOf(h)).toBe('a1b2c3d4');
    expect(idPrefixOf('red-kurta')).toBeNull();
  });
  it('finds a free handle', () => {
    expect(uniqueHandle('shoes', new Set(['shoes', 'shoes-2']))).toBe('shoes-3');
    expect(uniqueHandle('bags', new Set())).toBe('bags');
  });
  it('checks store slugs', () => {
    expect(slugProblem(cleanSlug('ab'))).toBeTruthy();
    expect(slugProblem(cleanSlug('www'))).toBeTruthy();
    expect(slugProblem(cleanSlug('Hiba E Store'))).toBeNull();
    expect(cleanSlug('Hiba E Store')).toBe('hiba-e-store');
  });
  it('cleans redirect paths and targets', () => {
    expect(cleanPath('https://old.myshopify.com/Products/Red-Kurta/')).toBe('/products/red-kurta');
    expect(cleanPath('collections//sale')).toBe('/collections/sale');
    expect(cleanPath('/a b')).toBeNull();
    expect(cleanTarget('https://example.com/x')).toBe('https://example.com/x');
    expect(cleanTarget('javascript:alert(1)')).toBe('/javascript:alert(1)');
  });
});

describe('sanitizeHtml', () => {
  it('drops scripts, handlers and bad urls', () => {
    const out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="http://x/a.png"><img src="https://x/b.png" onerror="y">');
    expect(out).not.toMatch(/script|onclick|onerror|javascript|http:\/\/x/);
    expect(out).toContain('<p>Hi</p>');
    expect(out).toContain('<a>x</a>');
    expect(out).toContain('<img src="https://x/b.png">');
  });
  it('blocks encoded javascript urls', () => {
    expect(sanitizeHtml('<a href="jav&#x09;ascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });
  it('keeps youtube embeds only', () => {
    expect(sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc123"></iframe>')).toContain('youtube.com/embed/abc123');
    expect(sanitizeHtml('<iframe src="https://evil.com/x"></iframe>')).toBe('');
  });
  it('closes open tags, escapes stray brackets and adds rel to new-tab links', () => {
    expect(sanitizeHtml('<p><strong>bold')).toBe('<p><strong>bold</strong></p>');
    expect(sanitizeHtml('a < b')).toBe('a &lt; b');
    expect(sanitizeHtml('<a href="https://x.pk" target="_blank" rel="opener">x</a>')).toBe('<a href="https://x.pk" target="_blank" rel="noopener noreferrer nofollow">x</a>');
  });
  it('filters styles', () => {
    expect(sanitizeHtml('<p style="text-align:center;background:url(x)">x</p>')).toBe('<p style="text-align:center">x</p>');
  });
  it('converts text and html', () => {
    expect(textToHtml('Line 1\nLine 2\n\nPara <b>')).toBe('<p>Line 1<br>Line 2</p><p>Para &lt;b&gt;</p>');
    expect(htmlToText('<p>Hello&nbsp;<b>world</b></p>', 50)).toContain('world');
  });
});

describe('shipping', () => {
  const settings = readShipping({
    freeShippingThreshold: 5000, codFee: 50,
    zones: [
      { id: 'khi', name: 'Karachi', cities: ['Karachi'], rates: [{ id: 'std', name: 'Same city', type: 'flat', price: 150 }] },
      { id: 'pb', name: 'Punjab', provinces: ['PB'], codFee: 0, rates: [{ id: 'l', name: 'Light', type: 'weight', price: 200, max: 1 }, { id: 'h', name: 'Heavy', type: 'weight', price: 400, min: 1 }] },
      { id: 'rest', name: 'Rest of Pakistan', codEnabled: false, rates: [{ id: 'std', name: 'Standard', type: 'flat', price: 300, freeAbove: 3000 }] },
    ],
  });
  it('matches city, then province, then the catch-all zone', () => {
    expect(zoneFor(settings, 'khi')?.id).toBe('khi');
    expect(zoneFor(settings, 'Lahore')?.id).toBe('pb');
    expect(zoneFor(settings, 'Quetta')?.id).toBe('rest');
    expect(zoneFor(settings, null, 'Punjab')?.id).toBe('pb');
  });
  it('quotes weight bands, free thresholds and COD fees', () => {
    expect(quoteRates(settings, { city: 'Lahore', subtotal: 1000, weightKg: 0.5 }).rates.map((r) => r.id)).toEqual(['pb:l']);
    expect(quoteRates(settings, { city: 'Lahore', subtotal: 1000, weightKg: 2 }).rates[0]).toMatchObject({ id: 'pb:h', price: 400, codFee: 0 });
    expect(quoteRates(settings, { city: 'Karachi', subtotal: 1000, weightKg: 0 }).rates[0]).toMatchObject({ price: 150, codFee: 50, codAvailable: true });
    expect(quoteRates(settings, { city: 'Quetta', subtotal: 3500, weightKg: 0 }).rates[0]).toMatchObject({ price: 0, codAvailable: false });
    expect(quoteRates(settings, { city: 'Karachi', subtotal: 6000, weightKg: 0 }).rates[0].price).toBe(0);
    expect(freeShippingGap(settings, 4500)).toEqual({ threshold: 5000, remaining: 500 });
  });
  it('defaults to one all-Pakistan zone', () => {
    const d = readShipping({});
    expect(d.zones).toHaveLength(1);
    expect(quoteRates(d, { city: 'Gilgit', subtotal: 100, weightKg: 0 }).rates).toHaveLength(1);
  });
  it('reads provinces and weights', () => {
    expect(provinceCode('sindh')).toBe('SD');
    expect(weightKg(500, 'g')).toBe(0.5);
  });
});

describe('collection rules', () => {
  it('validates and builds a filter', () => {
    expect('error' in readRules({ conditions: [] })).toBe(true);
    expect('error' in readRules({ conditions: [{ field: 'price', op: 'is', value: 1 }] })).toBe(true);
    const r = readRules({ match: 'any', conditions: [{ field: 'price', op: 'lt', value: '3000' }, { field: 'stock', op: 'in_stock' }, { field: 'title', op: 'contains', value: 'lawn' }] });
    if ('error' in r) throw new Error(r.error);
    const where = ruleWhere(r, 'shop-1', 0) as any;
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0]).toEqual({ price: { lt: 3000 } });
    expect(where.OR[1]).toEqual({ shopStocks: { some: { shopId: 'shop-1', stock: { gt: 0 } } } });
  });
});

describe('menus', () => {
  it('cleans, limits depth and resolves urls', () => {
    const items = readMenuItems([
      { title: 'Home', type: 'home' },
      { title: 'Sale', type: 'collection', ref: 'c1', children: [{ title: 'Kurta', type: 'product', ref: 'p1', children: [{ title: 'Deep', type: 'url', url: '/x', children: [{ title: 'Too deep', type: 'home' }] }] }] },
      { title: 'Bad', type: 'url', url: 'javascript:x' },
      { title: '', type: 'home' },
      { title: 'Gone', type: 'page', ref: 'missing' },
    ]);
    expect(items).toHaveLength(3);
    expect(items[1].children[0].children[0].children).toHaveLength(0);
    expect(menuRefs([items])).toEqual({ collections: ['c1'], products: ['p1'], pages: ['missing'] });
    const out = resolveMenu(items, { collections: new Map([['c1', 'sale']]), products: new Map([['p1', 'kurta-abc']]), pages: new Map() });
    expect(out.map((i) => i.url)).toEqual(['/', '/collections/sale']);
    expect(out[1].children[0].url).toBe('/products/kurta-abc');
  });
});

describe('hosts', () => {
  it('normalises and classifies hosts', () => {
    expect(normalizeHost('HTTPS://WWW.Shop.pk:443/path')).toBe('www.shop.pk');
    expect(domainKind('shop.pk')).toBe('apex');
    expect(domainKind('shop.com.pk')).toBe('apex');
    expect(domainKind('www.shop.com.pk')).toBe('www');
    expect(domainKind('store.shop.pk')).toBe('sub');
    expect(pairOf('www.shop.pk')).toBe('shop.pk');
    expect(pairOf('shop.com.pk')).toBe('www.shop.com.pk');
    expect(pairOf('store.shop.pk')).toBeNull();
  });
  it('gives DNS records and refuses platform hosts', () => {
    expect(dnsRecordsFor('shop.pk')).toEqual([{ type: 'A', name: '@', value: '76.76.21.21' }]);
    expect(dnsRecordsFor('www.shop.pk')).toEqual([{ type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }]);
    expect(hostProblem('x.stores.nafaa.pk')).toBeTruthy();
    expect(hostProblem('abc.myshopify.com')).toBeTruthy();
    expect(hostProblem('not a host')).toBeTruthy();
    expect(hostProblem('www.apnidukaan.pk')).toBeNull();
    expect(slugFromHost('hiba.stores.nafaa.pk')).toBe('hiba');
    expect(slugFromHost('hiba.localhost')).toBe('hiba');
  });
});

describe('tokens', () => {
  it('signs and checks kinds and expiry', () => {
    const t = signToken('preview', { s: 'store-1' }, 60_000).token;
    expect(readToken<{ s: string }>('preview', t)?.s).toBe('store-1');
    expect(readToken('access', t)).toBeNull();
    expect(readToken('preview', t.slice(0, -2) + 'xx')).toBeNull();
    expect(readToken('preview', signToken('preview', { s: 'x' }, -1).token)).toBeNull();
  });
  it('hashes secrets', () => {
    const h = hashSecret('1234');
    expect(checkSecret('1234', h)).toBe(true);
    expect(checkSecret('1235', h)).toBe(false);
    expect(checkSecret('1234', null)).toBe(false);
  });
});

describe('store settings', () => {
  it('fills defaults and repairs bad values', () => {
    const s = readSettings({ logoUrl: 'javascript:x', tracking: { metaPixelId: '123456789', ga4Id: 'bad' }, languages: { enabled: ['ur'] } });
    expect(s.logoUrl).toBeNull();
    expect(s.tracking.metaPixelId).toBe('123456789');
    expect(s.tracking.ga4Id).toBeNull();
    expect(s.languages.enabled).toEqual(['en', 'ur']);
    expect(s.catalogMode).toBe('ALL');
  });
  it('deep merges updates', () => {
    const cur = readSettings({ contact: { phone: '03001234567', email: 'a@b.pk' } });
    const next = mergeSettings(cur, { contact: { email: 'c@d.pk' } });
    expect(next.contact).toMatchObject({ phone: '03001234567', email: 'c@d.pk' });
  });
  it('checkout defaults keep COD on and hide private fields publicly', () => {
    const c = readCheckout({ advance: { percent: 500 } });
    expect(c.payments.cod).toBe(true);
    expect(c.advance.percent).toBe(30);
    expect(publicCheckout(c)).not.toHaveProperty('payments');
  });
  it('reads policies and kinds', () => {
    expect(readPolicies({ refund: { bodyHtml: '<p>x</p>' }, terms: { bodyHtml: '' } })).toHaveProperty('refund');
    expect(policyKindOf('refund-policy')).toBe('refund');
    expect(policyKindOf('terms')).toBe('terms');
    expect(policyKindOf('nope')).toBeNull();
  });
  it('fills policy templates', () => {
    const t = policyTemplate('shipping', { storeName: 'Hiba <Store>', phone: '0300', email: null, freeShippingThreshold: 3000 });
    expect(t.bodyHtml).toContain('Rs 3,000');
    expect(t.bodyHtml).not.toContain('{{');
    expect(policyTemplate('privacy', { storeName: 'Hiba <Store>', phone: null, email: null }).bodyHtml).toContain('Hiba &lt;Store&gt;');
  });
});

describe('theme documents', () => {
  it('every preset is valid and keeps the main sections', () => {
    for (const p of PRESETS) {
      const doc = presetDoc(p.id);
      const clean = cleanThemeDoc(JSON.parse(JSON.stringify(doc)), doc);
      for (const key of TEMPLATE_KEYS) {
        const fixed = FIXED_SECTION[key];
        if (fixed) expect(clean.templates[key].sections.some((s) => s.type === fixed)).toBe(true);
      }
      expect(clean.templates.home.sections.length).toBeGreaterThan(4);
    }
  });
  it('every schema section has a known category and default-able settings', () => {
    for (const s of SECTIONS) {
      expect(s.label).toBeTruthy();
      for (const f of s.settings) expect(f.key).toMatch(/^\w+$/);
    }
    expect(allowedIn(SECTIONS.find((s) => s.type === 'main_product')!, 'home')).toBe(false);
  });
  it('refuses unknown or misplaced sections and cleans values', () => {
    const base = presetDoc('grocery');
    expect(() => cleanThemeDoc({ ...base, templates: { ...base.templates, home: { sections: [{ type: 'hacker' }] } } }, base)).toThrow(ThemeDocError);
    expect(() => cleanThemeDoc({ ...base, templates: { ...base.templates, home: { sections: [{ type: 'main_product' }] } } }, base)).toThrow(ThemeDocError);
    const doc = cleanThemeDoc({
      ...base,
      tokens: { ...base.tokens, colors: { ...base.tokens.colors, primary: 'red' }, fonts: { heading: 'Comic Sans', body: 'Inter' } },
      templates: {
        ...base.templates,
        home: { sections: [{ type: 'rich_text', settings: { text: '<p>Hi<script>x</script></p>', heading: { en: 'Hello', ur: 'سلام' }, align: 'diagonal', unknown: 1 } }] },
        product: { sections: [] },
      },
    }, base);
    const s = doc.templates.home.sections[0];
    expect(s.settings.text).toBe('<p>Hi</p>');
    expect(s.settings.heading).toEqual({ en: 'Hello', ur: 'سلام' });
    expect(s.settings.align).toBe('center');
    expect(s.settings).not.toHaveProperty('unknown');
    expect(doc.tokens.colors.primary).toBe(base.tokens.colors.primary);
    expect(doc.tokens.fonts.heading).toBe(base.tokens.fonts.heading);
    expect(doc.templates.product.sections[0].type).toBe('main_product');
  });
  it('limits blocks per type and carries content when switching theme', () => {
    const base = presetDoc('fashion');
    const hero = { type: 'hero', settings: { heading: 'My sale', image: 'https://cdn.x/a.jpg' } };
    const doc = cleanThemeDoc({ ...base, templates: { ...base.templates, home: { sections: [hero] } } }, base);
    const switched = carryContent(doc, presetDoc('beauty'));
    const h = switched.templates.home.sections.find((s) => s.type === 'hero')!;
    expect(h.settings.heading).toBe('My sale');
    expect(switched.themeId).toBe('beauty');
    const withRefs = cleanThemeDoc({ ...base, templates: { ...base.templates, home: { sections: [{ type: 'featured_collection', settings: { collection: 'c-1' } }] } } }, base);
    expect(themeRefs(withRefs).collections).toContain('c-1');
  });
});

describe('platform controls', () => {
  it('reads defaults, merges and blocks words/domains', () => {
    const c = readControls({});
    expect(c.maxCustomDomains).toBe(2);
    expect(c.themes.fashion.enabled).toBe(true);
    const next = mergeControls(c, { themes: { beauty: { enabled: false } }, blockedKeywords: 'casino, Fake Brand', blockedDomains: ['badsite.pk'], checkout: { paused: true } });
    expect(next.themes.beauty).toEqual({ enabled: false, featured: false });
    expect(next.themes.fashion.enabled).toBe(true);
    expect(blockedWord(next, 'Best CASINO deals')).toBe('casino');
    expect(blockedDomain(next, 'www.badsite.pk')).toBe(true);
    expect(blockedDomain(next, 'goodsite.pk')).toBe(false);
    expect(next.checkout).toEqual({ paused: true, message: null });
  });
});

describe('analytics sources', () => {
  it('labels traffic sources', () => {
    expect(sourceOf({ utm: { source: 'fb' } })).toBe('facebook');
    expect(sourceOf({ referrer: 'https://www.google.com/search?q=x' })).toBe('google');
    expect(sourceOf({ referrer: 'https://l.instagram.com/' })).toBe('instagram');
    expect(sourceOf({})).toBe('direct');
    expect(sourceOf({ referrer: 'https://shop.pk/a' }, 'www.shop.pk')).toBe('direct');
  });
});
