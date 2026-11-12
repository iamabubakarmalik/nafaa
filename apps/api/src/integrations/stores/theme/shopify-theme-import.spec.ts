import { strToU8, zipSync } from 'fflate';
import { ZIP_LIMITS, ThemeImportError, mapFont, mapShopifyTheme, parseLooseJson, readThemeZip, readZipAssets, resolveRefs, shopifyLink } from './shopify-theme-import';
import { cleanThemeDoc } from './theme-doc';
import { presetDoc } from './presets';
import { NafaaThemeFileError, buildNafaaThemeFile, readNafaaThemeFile } from './nafaa-theme-file';
import { StoreThemeImportService, imageKey, shopifyImageUrls, sniffImage } from '../store-theme-import.service';
import { StoreThemeService } from '../store-theme.service';

const HEADER = '/*\n * IMPORTANT: The contents of this file are auto-generated.\n */\n';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

function dawnLikeZip(extra: Record<string, Uint8Array> = {}, prefix = 'theme-export/') {
  const settings = {
    current: {
      logo: 'shopify://shop_images/logo.png',
      logo_width: 120,
      favicon: 'shopify://shop_images/missing-favicon.png',
      color_schemes: {
        'scheme-1': { settings: { background: '#FFFFFF', text: '#1A1A1A', button: '#1A1A1A', button_label: '#FFFFFF' } },
        'scheme-2': { settings: { background: '#F5F1EA', text: '#1A1A1A', button: '#1A1A1A', button_label: '#FFFFFF' } },
        'scheme-3': { settings: { background: '#121212', text: '#FFFFFF', button: '#FFFFFF', button_label: '#121212' } },
        'scheme-4': { settings: { background: '#B5446E', text: '#FFFFFF', button: '#FFFFFF', button_label: '#B5446E' } },
      },
      type_header_font: 'playfair_display_n4',
      type_body_font: 'assistant_n4',
      buttons_radius: 40,
      spacing_sections: 32,
      card_style: 'card',
      cart_type: 'notification',
      social_instagram_link: 'https://instagram.com/libas.pk',
      social_facebook_link: 'http://not-https.example',
    },
  };
  const index = {
    sections: {
      banner: {
        type: 'image-banner',
        blocks: { h: { type: 'heading', settings: { heading: 'Eid <em>Collection</em>' } }, t: { type: 'text', settings: { text: '<p>Lawn &amp; chiffon</p>' } }, b: { type: 'buttons', settings: { button_label_1: 'Shop now', button_link_1: 'shopify://collections/eid' } } },
        block_order: ['h', 't', 'b'],
        settings: { image: 'shopify://shop_images/banner.jpg', image_overlay_opacity: 33, image_height: 'large', desktop_content_alignment: 'left', color_scheme: 'scheme-3' },
      },
      featured: { type: 'featured-collection', settings: { title: 'Best sellers', collection: 'summer', products_to_show: 6, columns_desktop: 3, columns_mobile: '1', color_scheme: 'scheme-2' } },
      cols: { type: 'multicolumn', blocks: { a: { type: 'column', settings: { title: 'Free delivery', text: '<p>All over Pakistan</p>' } }, b: { type: 'column', settings: { title: 'Easy returns', text: '' } } }, block_order: ['a', 'b'], settings: { color_scheme: 'scheme-4' } },
      faq: { type: 'collapsible-content', settings: { heading: 'FAQ' }, blocks: { q: { type: 'collapsible_row', settings: { heading: 'COD?', row_content: '<p>Yes</p>' } } }, block_order: ['q'] },
      code: { type: 'custom-liquid', settings: { custom_liquid: '{{ shop.name }}' } },
      app: { type: '@app', settings: {} },
      blog: { type: 'featured-blog', settings: {} },
      hidden: { type: 'rich-text', disabled: true, blocks: { h: { type: 'heading', settings: { heading: 'Hidden story' } } }, block_order: ['h'], settings: {} },
    },
    order: ['banner', 'featured', 'cols', 'faq', 'code', 'app', 'blog', 'hidden'],
  };
  const header = {
    type: 'header',
    sections: {
      'announcement-bar': { type: 'announcement-bar', settings: { auto_rotate: true, change_slides_speed: 6 }, blocks: { a: { type: 'announcement', settings: { text: 'Free delivery over Rs 3000', link: 'shopify://collections/all' } } }, block_order: ['a'] },
      header: { type: 'header', settings: { logo_position: 'middle-center', menu: 'main-menu', sticky_header_type: 'none' } },
    },
    order: ['announcement-bar', 'header'],
  };
  const footer = { type: 'footer', sections: { footer: { type: 'footer', blocks: { l: { type: 'link_list', settings: { heading: 'Shop', menu: 'footer' } } }, block_order: ['l'], settings: { newsletter_enable: true, newsletter_heading: 'Join us', payment_enable: false } } }, order: ['footer'] };
  const schema = [{ name: 'theme_info', theme_name: 'Dawn', theme_version: '15.2.0' }];
  const files: Record<string, Uint8Array> = {
    [`${prefix}config/settings_data.json`]: strToU8(HEADER + JSON.stringify(settings)),
    [`${prefix}config/settings_schema.json`]: strToU8(JSON.stringify(schema)),
    [`${prefix}templates/index.json`]: strToU8(HEADER + JSON.stringify(index)),
    [`${prefix}templates/page.contact.json`]: strToU8('{"sections":{},"order":[]}'),
    [`${prefix}templates/product.json`]: strToU8(JSON.stringify({ sections: { main: { type: 'main-product', blocks: { t: { type: 'title', settings: {} }, p: { type: 'price', settings: {} }, b: { type: 'buy_buttons', settings: {} }, x: { type: '@app', settings: {} } }, block_order: ['t', 'p', 'b', 'x'], settings: {} }, rel: { type: 'related-products', settings: { heading: 'More' } } }, order: ['main', 'rel'] })),
    [`${prefix}sections/header-group.json`]: strToU8(JSON.stringify(header)),
    [`${prefix}sections/footer-group.json`]: strToU8(JSON.stringify(footer)),
    [`${prefix}sections/header.liquid`]: strToU8('{% comment %}never read{% endcomment %}'),
    [`${prefix}assets/banner.jpg`]: JPEG,
    [`${prefix}assets/theme.js`]: strToU8('alert(1)'),
    ...extra,
  };
  return zipSync(files);
}

describe('Shopify theme file: reading the zip', () => {
  it('reads only the theme files, under a wrapping folder', () => {
    const files = readThemeZip(dawnLikeZip());
    expect(files.root).toBe('theme-export/');
    expect([...files.json.keys()].sort()).toEqual([
      'config/settings_data.json', 'config/settings_schema.json', 'sections/footer-group.json', 'sections/header-group.json',
      'templates/index.json', 'templates/page.contact.json', 'templates/product.json',
    ]);
    expect(files.text.size).toBe(0);
  });
  it('reads files at the zip root too', () => {
    expect(readThemeZip(dawnLikeZip({}, '')).root).toBe('');
  });
  it('strips Shopify comment headers but keeps strings', () => {
    expect(parseLooseJson(`${HEADER}{"a":"x // y /* z */","b":1}`)).toEqual({ a: 'x // y /* z */', b: 1 });
  });
  it('refuses files that are not zips', () => {
    expect(() => readThemeZip(strToU8('hello world, not a zip'))).toThrow(ThemeImportError);
    expect(() => readThemeZip(new Uint8Array())).toThrow(ThemeImportError);
  });
  it('refuses a broken zip', () => {
    const z = dawnLikeZip();
    const cut = z.slice(0, Math.floor(z.length / 2));
    expect(() => readThemeZip(cut)).toThrow(ThemeImportError);
  });
  it('refuses a zip without a theme', () => {
    expect(() => readThemeZip(zipSync({ 'notes.txt': strToU8('hi') }))).toThrow(/Shopify theme nahi mila/);
  });
  it('stops a zip bomb: one file too big once unzipped', () => {
    const bomb = zipSync({ 'config/settings_data.json': new Uint8Array(ZIP_LIMITS.maxJsonBytes + 10).fill(32) }, { level: 9 });
    expect(bomb.length).toBeLessThan(100_000);
    expect(() => readThemeZip(bomb)).toThrow(/bohat bari/);
  });
  it('stops a zip bomb: total size and entry count caps', () => {
    const many: Record<string, Uint8Array> = { 'config/settings_data.json': strToU8('{}') };
    for (let i = 0; i < 20; i++) many[`templates/t${i}.json`] = new Uint8Array(4000).fill(32);
    const z = zipSync(many, { level: 9 });
    expect(() => readThemeZip(z, { ...ZIP_LIMITS, maxTotalBytes: 30_000 })).toThrow(/bohat bari/);
    expect(() => readThemeZip(z, { ...ZIP_LIMITS, maxEntries: 10 })).toThrow(/zyada cheezein/);
  });
  it('refuses an upload over the size limit', () => {
    expect(() => readThemeZip(dawnLikeZip(), { ...ZIP_LIMITS, maxZipBytes: 100 })).toThrow(/MB se bari/);
  });
  it('reads referenced images from assets/ only', () => {
    const z = dawnLikeZip();
    const got = readZipAssets(z, 'theme-export/', ['banner.jpg', 'logo.png', '../etc/passwd', 'theme.js']);
    expect([...got.keys()]).toEqual(['banner.jpg']);
    expect(sniffImage(got.get('banner.jpg')!)).toBe('image/jpeg');
  });
});

describe('Shopify theme file: mapping', () => {
  const mapped = mapShopifyTheme(readThemeZip(dawnLikeZip()), { currentThemeId: 'grocery' });

  it('names the theme and picks the closest preset', () => {
    expect(mapped.themeName).toBe('Dawn');
    expect(mapped.themeVersion).toBe('15.2.0');
    expect(mapped.basePreset).toBe('fashion');
  });
  it('maps colours, fonts and shapes', () => {
    const tk = mapped.doc.tokens;
    expect(tk.colors.background).toBe('#ffffff');
    expect(tk.colors.text).toBe('#1a1a1a');
    expect(tk.colors.primary).toBe('#1a1a1a');
    expect(tk.colors.surface).toBe('#f5f1ea');
    expect(tk.colors.accent).toBe('#b5446e');
    expect(tk.fonts).toEqual({ heading: 'Playfair Display', body: 'Open Sans' });
    expect(mapped.fonts.find((f) => f.role === 'heading')).toMatchObject({ from: 'Playfair Display', exact: true });
    expect(mapped.fonts.find((f) => f.role === 'body')).toMatchObject({ from: 'Assistant', to: 'Open Sans', exact: false });
    expect(tk.buttonStyle).toBe('pill');
    expect(tk.radius).toBe('full');
    expect(tk.cardStyle).toBe('bordered');
  });
  it('keeps the home page order and maps known sections', () => {
    const home = mapped.doc.templates.home.sections;
    expect(home.map((s) => s.type)).toEqual(['hero', 'featured_collection', 'trust_badges', 'faq', 'rich_text']);
    const hero = home[0].settings;
    expect(hero).toMatchObject({ heading: 'Eid Collection', subheading: 'Lawn & chiffon', buttonLabel: 'Shop now', buttonLink: '/collections/eid', align: 'left', height: 'large', overlay: 35, colorScheme: 'inverse' });
    expect(hero.image).toBe('shopify://shop_images/banner.jpg');
    expect(home[1].settings).toMatchObject({ heading: 'Best sellers', collection: 'summer', limit: 6, columns: 3, mobileColumns: 1, colorScheme: 'muted' });
    expect(home[2].settings.colorScheme).toBe('accent');
    expect(home[2].blocks!.map((b) => b.settings.icon)).toEqual(['truck', 'return']);
    expect(home[3].blocks![0].settings).toEqual({ question: 'COD?', answer: '<p>Yes</p>' });
    expect(home[4].hidden).toBe(true);
  });
  it('lists what could not come, with reasons', () => {
    const codes = mapped.skipped.map((s) => `${s.code}:${s.what}`);
    expect(codes).toEqual(expect.arrayContaining([
      'custom_code:Home: custom-liquid', 'app_section:Home: @app', 'unknown_section:Home: featured-blog', 'cart_type:Cart: notification',
      'template_other:page.contact', 'app_section:Product: @app',
    ]));
    for (const s of mapped.skipped) expect(s.why.length).toBeGreaterThan(5);
  });
  it('maps header, announcement and footer', () => {
    expect(mapped.doc.global.header.settings).toMatchObject({ layout: 'logo_center', menu: 'main-menu', sticky: false });
    expect(mapped.doc.global.announcement.blocks!.map((b) => b.settings)).toEqual([{ text: 'Free delivery over Rs 3000', link: '/collections/all' }]);
    expect(mapped.doc.global.announcement.settings).toMatchObject({ autoplay: true, speed: 6 });
    expect(mapped.doc.global.footer.settings.showPayments).toBe(false);
    expect(mapped.doc.global.footer.blocks!.map((b) => b.type)).toEqual(['menu', 'newsletter', 'contact']);
  });
  it('maps the product page and keeps Nafaa extras', () => {
    const sections = mapped.doc.templates.product.sections;
    expect(sections.map((s) => s.type)).toEqual(['main_product', 'bought_together', 'product_reviews', 'product_recommendations']);
    const blocks = sections[0].blocks!.map((b) => b.type);
    expect(blocks.slice(0, 7)).toEqual(['badges', 'title', 'price', 'buy_buttons', 'whatsapp_order', 'delivery_eta', 'trust_icons']);
  });
  it('carries logo and https social links for publish time', () => {
    expect(mapped.settings).toEqual({ logo: 'shopify://shop_images/logo.png', favicon: 'shopify://shop_images/missing-favicon.png', logoWidth: 120, social: { instagram: 'https://instagram.com/libas.pk' } });
    expect(mapped.images.sort()).toEqual(['banner.jpg', 'logo.png', 'missing-favicon.png']);
    expect(mapped.collections.sort()).toEqual(['summer']);
  });
  it('resolves images and collections into a valid theme', () => {
    const doc = cleanThemeDoc(resolveRefs(mapped.doc, new Map([['banner.jpg', 'https://res.cloudinary.com/x/banner.jpg']]), new Set()), presetDoc(mapped.basePreset));
    const home = doc.templates.home.sections;
    expect(home[0].settings.image).toBe('https://res.cloudinary.com/x/banner.jpg');
    expect(home[1].settings.collection).toBeNull();
    expect(JSON.stringify(doc)).not.toContain('shopify://');
  });
  it('maps Shopify fonts and links', () => {
    expect(mapFont('dm_sans_n4', 'Inter')).toEqual({ from: 'DM Sans', to: 'DM Sans', exact: true });
    expect(mapFont('futura_n4', 'Inter')).toMatchObject({ to: 'Jost', exact: false });
    expect(mapFont('sans-serif_n4', 'Lora')).toMatchObject({ to: 'Inter' });
    expect(mapFont('old_standard_tt_n4', 'Inter')).toMatchObject({ to: 'Cormorant Garamond' });
    expect(shopifyLink('shopify://products/red-kurta')).toBe('/products/red-kurta');
    expect(shopifyLink('javascript:alert(1)')).toBe('');
  });
});

describe('image matching', () => {
  it('matches Shopify CDN names', () => {
    expect(imageKey('Banner_1200x.jpg')).toBe('banner');
    expect(imageKey('Hero%20Image.png')).toBe('hero image');
    const html = `<img src="//shop.pk/cdn/shop/files/Banner.jpg?v=12&width=3840"><img src="https://cdn.shopify.com/s/files/1/0001/0002/files/logo_200x.png?v=9">`;
    const urls = shopifyImageUrls(html, 'shop.pk');
    expect(urls.get('banner')).toBe('https://shop.pk/cdn/shop/files/Banner.jpg?v=12');
    expect(urls.get('logo')).toBe('https://cdn.shopify.com/s/files/1/0001/0002/files/logo_200x.png?v=9');
  });
});

describe('Nafaa theme file', () => {
  it('round-trips a theme and refuses other files', () => {
    const doc = presetDoc('beauty');
    const file = buildNafaaThemeFile({ storeName: 'Glow', doc, settings: { logoUrl: 'https://x.y/logo.png', faviconUrl: null, logoWidth: 140, social: { instagram: 'https://instagram.com/glow', x: undefined } } });
    const back = readNafaaThemeFile(JSON.stringify(file));
    expect(back.doc.themeId).toBe('beauty');
    expect(back.doc.templates.home.sections.map((s) => s.type)).toEqual(doc.templates.home.sections.map((s) => s.type));
    expect(back.settings.social).toEqual({ instagram: 'https://instagram.com/glow' });
    expect(() => readNafaaThemeFile('{"hello":1}')).toThrow(NafaaThemeFileError);
    expect(() => readNafaaThemeFile('not json')).toThrow(NafaaThemeFileError);
    const bad = { ...file, doc: { ...doc, templates: { ...doc.templates, home: { sections: [{ type: 'evil_section', settings: {} }] } } } };
    expect(() => readNafaaThemeFile(JSON.stringify(bad))).toThrow(/nahi chalta/);
  });
});

// ─── service: never touches the published theme ───

type Row = { id: string; storeId: string; tenantId: string; version: number; status: string; themeId: string; doc: any; note: string | null; publishedAt: Date | null; publishedById: string | null; createdAt: Date; updatedAt: Date };

function fakePrisma() {
  let n = 0;
  const rows: Row[] = [];
  const store: any = { id: 'store-1', tenantId: 't1', themeId: 'grocery', slug: 'demo', name: 'Demo', settings: {}, migration: null };
  const match = (r: Row, w: any) => Object.entries(w ?? {}).every(([k, v]) => (r as any)[k] === v);
  const calls: Array<{ op: string; id?: string; where?: any; data?: any }> = [];
  const tv = {
    findFirst: async ({ where, orderBy }: any) => rows.filter((r) => match(r, where)).sort((a, b) => (orderBy?.version === 'desc' ? b.version - a.version : 0))[0] ?? null,
    findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    findMany: async ({ where }: any) => rows.filter((r) => match(r, where)),
    create: async ({ data }: any) => { const r: Row = { note: null, publishedAt: null, publishedById: null, ...data, id: `v${++n}`, createdAt: new Date(), updatedAt: new Date() }; rows.push(r); calls.push({ op: 'create', id: r.id, data }); return r; },
    update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id)!; calls.push({ op: 'update', id: r.id, data }); Object.assign(r, data, { updatedAt: new Date() }); return r; },
    updateMany: async ({ where, data }: any) => { const hit = rows.filter((r) => match(r, where)); calls.push({ op: 'updateMany', where, data }); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    aggregate: async ({ where }: any) => ({ _max: { version: Math.max(0, ...rows.filter((r) => match(r, where)).map((r) => r.version)) } }),
  };
  const prisma: any = {
    storeThemeVersion: tv,
    nafaaStore: {
      findUnique: async () => store, findUniqueOrThrow: async () => store,
      update: async ({ data }: any) => { Object.assign(store, data); return store; },
    },
    storeCollection: { findMany: async () => [] },
    integration: { findFirst: async () => null },
    user: { findMany: async () => [] },
    $transaction: async (fn: any) => fn(prisma),
  };
  return { prisma, rows, store, calls };
}

describe('theme import service', () => {
  const user: any = { id: 'u1', tenantId: 't1', role: 'OWNER' };
  const setup = () => {
    const f = fakePrisma();
    const ctx = () => ({ store: f.store, integration: {}, settings: { logoUrl: null, faviconUrl: null, logoWidth: 140, social: {} }, tenantId: 't1', shopId: null, preview: false });
    const access: any = { requireStore: async () => ctx(), assertWrite: async () => undefined, invalidate: () => undefined };
    const revalidate: any = { send: async () => undefined };
    const theme = new StoreThemeService(f.prisma, access, revalidate);
    const uploads: any = { uploadOne: jest.fn(async (_u: any, file: any) => ({ url: `https://res.cloudinary.com/demo/${file.originalname}` })) };
    const service = new StoreThemeImportService(f.prisma, access, theme, uploads, {} as any, revalidate);
    // A live store: published v1 and a draft v2 with the merchant's own edits.
    const pub = presetDoc('grocery');
    f.rows.push({ id: 'pub', storeId: 'store-1', tenantId: 't1', version: 1, status: 'PUBLISHED', themeId: 'grocery', doc: pub, note: 'Start', publishedAt: new Date(), publishedById: 'u1', createdAt: new Date(), updatedAt: new Date() });
    const mine = presetDoc('grocery');
    mine.templates.home.sections[0].settings.heading = 'My own draft';
    f.rows.push({ id: 'draft', storeId: 'store-1', tenantId: 't1', version: 2, status: 'DRAFT', themeId: 'grocery', doc: mine, note: null, publishedAt: null, publishedById: null, createdAt: new Date(), updatedAt: new Date() });
    return { ...f, service, uploads };
  };

  it('writes a new draft, keeps the old draft, never touches the published theme', async () => {
    const t = setup();
    const before = JSON.stringify(t.rows.find((r) => r.id === 'pub'));
    const out = await t.service.importShopify(user, 'store-1', { buffer: Buffer.from(dawnLikeZip()), originalname: 'dawn.zip' } as any, {});
    expect(JSON.stringify(t.rows.find((r) => r.id === 'pub'))).toBe(before);
    expect(t.calls.some((c) => c.id === 'pub' || c.op === 'updateMany' || c.data?.status === 'PUBLISHED')).toBe(false);
    expect(t.rows.filter((r) => r.status === 'DRAFT')).toHaveLength(1);
    const draft = t.rows.find((r) => r.status === 'DRAFT')!;
    expect(draft.id).toBe(out.draft.id);
    expect(draft.doc.templates.home.sections[0].type).toBe('hero');
    expect(draft.doc.templates.home.sections[0].settings.image).toBe('https://res.cloudinary.com/demo/banner.jpg');
    expect(t.rows.find((r) => r.id === 'draft')!.status).toBe('ARCHIVED');
    expect(out.report).toMatchObject({ themeName: 'Dawn', basePreset: 'fashion', state: 'draft', imported: { images: 1 } });
    expect(out.report.skipped.map((s: any) => s.code)).toEqual(expect.arrayContaining(['image_missing', 'collection_missing']));
    expect(t.store.settings).toEqual({});
    expect(t.store.migration.themeImport.id).toBe(out.report.id);
  });

  it('"Chhor dein" brings the old draft back and leaves the live theme', async () => {
    const t = setup();
    const before = JSON.stringify(t.rows.find((r) => r.id === 'pub'));
    await t.service.importShopify(user, 'store-1', { buffer: Buffer.from(dawnLikeZip()), originalname: 'dawn.zip' } as any, {});
    const out = await t.service.discard(user, 'store-1');
    expect(out.draft.id).toBe('draft');
    expect(out.draft.doc.templates.home.sections[0].settings.heading).toBe('My own draft');
    expect(t.rows.filter((r) => r.status === 'DRAFT').map((r) => r.id)).toEqual(['draft']);
    expect(JSON.stringify(t.rows.find((r) => r.id === 'pub'))).toBe(before);
    expect(out.report.state).toBe('discarded');
  });

  it('"Live karein" publishes the draft and applies the logo', async () => {
    const t = setup();
    const zip = dawnLikeZip({ 'theme-export/assets/logo.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]) });
    await t.service.importShopify(user, 'store-1', { buffer: Buffer.from(zip), originalname: 'dawn.zip' } as any, {});
    const out = await t.service.publish(user, 'store-1');
    expect(out.report.state).toBe('published');
    expect(t.rows.find((r) => r.id === 'pub')!.status).toBe('ARCHIVED');
    expect(t.rows.filter((r) => r.status === 'PUBLISHED')).toHaveLength(1);
    expect(t.store.settings.logoUrl).toBe('https://res.cloudinary.com/demo/logo.png');
    expect(t.store.settings.social).toEqual({ instagram: 'https://instagram.com/libas.pk' });
  });
});
