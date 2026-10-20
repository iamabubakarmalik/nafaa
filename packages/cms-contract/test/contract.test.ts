/**
 * Runtime checks for the CMS contract. Run with `pnpm --filter @nafaa/cms-contract test`
 * (tsx). Plain node:assert, no test framework.
 */
import assert from 'node:assert/strict';
import {
  ALLOWED_BLOCKS,
  ALLOWED_ICONS,
  BLOCK_SCHEMAS,
  BLOCK_TYPES,
  CMS_ENTRY_TYPES,
  DEFAULT_TITLE_PATTERNS,
  DIAGRAM_LABEL_KEYS,
  PAGE_TEMPLATE_STARTER_BLOCKS,
  REQUIRED_DATA_FIELDS,
  SITEMAP_SECTIONS,
  STARTER_BLOCKS,
  blockSchema,
  blockStructureIssues,
  blocksSchema,
  contrastRatioWithWhite,
  diagramSpecSchema,
  draftBlocksSchema,
  entryDataSchema,
  findTokens,
  iconExportName,
  isPagePathAllowed,
  isValidHref,
  menuItemsSchema,
  parseEntryData,
  parseEntryLink,
  parseToken,
  publicFetchCache,
  revalidateRequestSchema,
  seoSettingsSchema,
  sitemapSectionFor,
  zodErrorToIssues,
  DEFAULT_SEO_SETTINGS,
  ENTRY_DATA_SCHEMAS,
  featureStatusOf,
  titlePatternFor,
  titlePatternVariant,
  publicEntriesQuerySchema,
} from '../src/cms-contract';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const cta = { label: 'Free shuru karein', href: 'signup' };

test('every block type has a schema and is allowed somewhere', () => {
  for (const type of BLOCK_TYPES) {
    assert.ok(BLOCK_SCHEMAS[type], type);
    assert.ok(CMS_ENTRY_TYPES.some((t) => ALLOWED_BLOCKS[t].includes(type)), `${type} allowed nowhere`);
  }
});

test('starter blocks are allowed for their type', () => {
  for (const type of CMS_ENTRY_TYPES) {
    for (const block of STARTER_BLOCKS[type]) assert.ok(ALLOWED_BLOCKS[type].includes(block), `${type} starter ${block}`);
  }
  for (const blocks of Object.values(PAGE_TEMPLATE_STARTER_BLOCKS)) {
    for (const block of blocks) assert.ok(ALLOWED_BLOCKS.PAGE.includes(block), `PAGE starter ${block}`);
  }
});

test('allowed-blocks map matches API-CONTRACT 4', () => {
  assert.ok(ALLOWED_BLOCKS.TOOL.includes('tool'));
  assert.ok(!ALLOWED_BLOCKS.PAGE.includes('tool'));
  assert.ok(ALLOWED_BLOCKS.CITY.includes('cityFacts'));
  assert.ok(!ALLOWED_BLOCKS.INDUSTRY.includes('cityFacts'));
  assert.ok(ALLOWED_BLOCKS.DOC.includes('codeSample'));
  assert.ok(!ALLOWED_BLOCKS.DOC.includes('hero'));
  assert.ok(ALLOWED_BLOCKS.BLOG_CATEGORY.includes('entryGrid'));
  assert.ok(!ALLOWED_BLOCKS.BLOG_POST.includes('faq'));
  assert.deepEqual([...ALLOWED_BLOCKS.GLOSSARY_TERM].sort(), ['callout', 'cta', 'diagram', 'relatedLinks', 'richText', 'screenshot', 'sources', 'steps']);
});

test('every type is in exactly one sitemap section', () => {
  for (const type of CMS_ENTRY_TYPES) {
    const hits = Object.values(SITEMAP_SECTIONS).filter((types) => (types as readonly string[]).includes(type)).length;
    assert.equal(hits, 1, type);
  }
  assert.equal(sitemapSectionFor('CITY_INDUSTRY'), 'locations');
});

test('icons are unique kebab-case and convert to lucide export names', () => {
  assert.equal(new Set(ALLOWED_ICONS).size, ALLOWED_ICONS.length);
  for (const name of ALLOWED_ICONS) assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(iconExportName('gamepad-2'), 'Gamepad2');
  assert.equal(iconExportName('utensils-crossed'), 'UtensilsCrossed');
});

test('hero block parses and rejects bad CTA hrefs', () => {
  const hero = { id: 'abc123defg', type: 'hero', sub: 'Billing, stock aur khata ek jagah.', primaryCta: cta, layout: 'split' };
  assert.ok(blockSchema.safeParse(hero).success);
  assert.ok(!blockSchema.safeParse({ ...hero, primaryCta: { label: 'x', href: 'javascript:alert(1)' } }).success);
  assert.ok(blockSchema.safeParse({ ...hero, media: { kind: 'diagram', diagram: { kind: 'offline-sync' } } }).success);
});

test('diagram specs: bespoke label keys, flow edges, hub spokes', () => {
  assert.ok(diagramSpecSchema.safeParse({ kind: 'fbr-invoice', labels: { authority: 'PRA' } }).success);
  assert.ok(!diagramSpecSchema.safeParse({ kind: 'fbr-invoice', labels: { nope: 'x' } }).success);
  assert.ok(
    diagramSpecSchema.safeParse({
      kind: 'flow',
      nodes: [{ id: 'a', label: 'Sale' }, { id: 'b', label: 'Stock', icon: 'boxes' }],
      edges: [{ from: 'a', to: 'b' }],
    }).success,
  );
  assert.ok(!diagramSpecSchema.safeParse({ kind: 'flow', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [{ from: 'a', to: 'z' }] }).success);
  assert.ok(!diagramSpecSchema.safeParse({ kind: 'hub', center: { label: 'Nafaa' }, spokes: [{ label: 'A' }, { label: 'B' }] }).success);
  for (const keys of Object.values(DIAGRAM_LABEL_KEYS)) assert.ok(Object.keys(keys).length >= 4);
});

test('comparison table cells must match columns', () => {
  const table = {
    id: 'cmp0000001', type: 'comparisonTable', heading: 'Nafaa vs X', caption: 'Features',
    columns: [{ key: 'nafaa', label: 'Nafaa', highlight: true }, { key: 'x', label: 'X' }],
    rows: [{ label: 'Offline', cells: { nafaa: { value: 'yes' }, x: { value: 'partial' } } }],
  };
  assert.ok(blockSchema.safeParse(table).success);
  assert.ok(!blockSchema.safeParse({ ...table, rows: [{ label: 'Offline', cells: { y: { value: 'yes' } } }] }).success);
});

test('stats block has no free number field', () => {
  const stats = { id: 'stats00001', type: 'stats', items: [{ metric: 'industries.count', label: 'Industries' }] };
  assert.ok(blockSchema.safeParse(stats).success);
  const parsed = blockSchema.parse({ ...stats, items: [{ metric: 'industries.count', label: 'x', value: 99 }] });
  assert.ok(parsed.type === 'stats' && !('value' in (parsed.items[0] ?? {})));
  assert.ok(!blockSchema.safeParse({ ...stats, items: [{ metric: 'shops.count', label: 'x' }] }).success);
});

test('testimonial pick mode needs ids', () => {
  assert.ok(!blockSchema.safeParse({ id: 'testim0001', type: 'testimonial', mode: 'pick' }).success);
  assert.ok(blockSchema.safeParse({ id: 'testim0001', type: 'testimonial', mode: 'auto' }).success);
});

test('block lists: unique ids; drafts accept half-filled blocks', () => {
  const rich = { id: 'rich000001', type: 'richText', markdown: '## Heading\n\nText' };
  assert.ok(blocksSchema.safeParse([rich]).success);
  assert.ok(!blocksSchema.safeParse([rich, rich]).success);
  assert.ok(draftBlocksSchema.safeParse([{ id: 'feat000001', type: 'featuresGrid', items: [] }]).success);
  assert.ok(!draftBlocksSchema.safeParse([{ id: 'feat000001', type: 'notABlock' }]).success);
});

test('structure issues: hero first, allowed blocks, single faq', () => {
  const issues = blockStructureIssues('BLOG_POST', [
    { id: 'rich000001', type: 'richText' },
    { id: 'hero000001', type: 'hero' },
  ]);
  assert.deepEqual(issues.map((i) => i.code).sort(), ['BLOCK_NOT_ALLOWED', 'HERO_NOT_FIRST']);
  assert.equal(blockStructureIssues('PAGE', [{ id: 'hero000001', type: 'hero' }, { id: 'faq0000001', type: 'faq' }]).length, 0);
  assert.equal(blockStructureIssues('PAGE', [{ id: 'faq0000001', type: 'faq' }, { id: 'faq0000002', type: 'faq' }])[0]?.code, 'INVALID_BLOCK');
});

test('entry data: publish vs draft, defaults, conditional rules', () => {
  const industry = { icon: 'pill', color: '#15803d', group: 'health', shortName: 'Pharmacy', shopNoun: 'pharmacies' };
  assert.ok(parseEntryData('INDUSTRY', industry, 'publish').success);
  assert.ok(!parseEntryData('INDUSTRY', { ...industry, color: '#16a34a' }, 'publish').success, 'low contrast color');
  assert.ok(parseEntryData('INDUSTRY', { icon: 'pill' }, 'draft').success);
  assert.ok(!parseEntryData('INDUSTRY', { icon: 'pill' }, 'publish').success);
  assert.ok(!parseEntryData('INTEGRATION', { status: 'live', category: 'E-commerce' }, 'publish').success);
  assert.ok(parseEntryData('INTEGRATION', { status: 'live', category: 'E-commerce', verifiedAt: '2026-10-20' }, 'publish').success);
  const page = parseEntryData('PAGE', {}, 'publish');
  assert.ok(page.success && page.data.template === 'default');
  const city = parseEntryData('CITY', { name: 'Lahore', province: 'Punjab', authority: 'PRA', wikidataId: 'Q11739' }, 'publish');
  assert.ok(city.success && city.data.markets.length === 0 && city.data.support.onsite === false);
  assert.ok(entryDataSchema.safeParse({ type: 'GUIDE' }).success);
  for (const type of CMS_ENTRY_TYPES) {
    const shape = ENTRY_DATA_SCHEMAS[type];
    for (const field of REQUIRED_DATA_FIELDS[type]) {
      const result = shape.safeParse({ type });
      if (result.success) assert.fail(`${type} publishes without ${field}`);
    }
  }
});

test('zod issues map to publish issue codes', () => {
  const result = parseEntryData('PRODUCT', { icon: 'not-an-icon', shortName: 'POS' }, 'publish');
  assert.ok(!result.success);
  if (!result.success) {
    const codes = zodErrorToIssues(result.error, 'data').map((i) => i.code);
    assert.ok(codes.includes('UNKNOWN_ICON'));
    assert.ok(codes.includes('MISSING_DATA'));
  }
});

test('tokens grammar', () => {
  assert.deepEqual(parseToken('price:basic.monthly'), { kind: 'price', planSlug: 'basic', period: 'monthly' });
  assert.deepEqual(parseToken('price:free-trial.yearly'), { kind: 'price', planSlug: 'free-trial', period: 'yearly' });
  assert.deepEqual(parseToken('price:min.monthly'), { kind: 'priceMin', period: 'monthly' });
  assert.equal(parseToken('price:min.yearly'), null);
  assert.deepEqual(parseToken('count:industries'), { kind: 'count', key: 'industries' });
  assert.equal(parseToken('count:shops'), null);
  assert.deepEqual(parseToken('fact:compliance.fbrPra'), { kind: 'fact', path: 'compliance.fbrPra' });
  assert.deepEqual(parseToken('year'), { kind: 'year' });
  const found = findTokens('From {{price:basic.monthly}} in {{ year }} and {{bogus}}');
  assert.equal(found.length, 3);
  assert.equal(found[2]?.token, null);
});

test('links and hrefs', () => {
  assert.deepEqual(parseEntryLink('entry:clx123#pricing'), { id: 'clx123', anchor: 'pricing' });
  assert.equal(parseEntryLink('/pricing'), null);
  for (const ok of ['entry:clx1', 'signup', 'demo', 'whatsapp', '/pricing', '/a?b=1#c', '#faq', 'https://fbr.gov.pk/x', 'mailto:a@b.pk', 'tel:+923001234567']) {
    assert.ok(isValidHref(ok), ok);
  }
  for (const bad of ['', '//evil.com', 'javascript:alert(1)', 'ftp://x.y', 'entry:', 'has space']) assert.ok(!isValidHref(bad), bad);
});

test('page paths: hubs allowed, typed namespaces protected', () => {
  assert.ok(isPagePathAllowed('/'));
  assert.ok(isPagePathAllowed('/industries'));
  assert.ok(isPagePathAllowed('/about'));
  assert.ok(isPagePathAllowed('/legal/privacy'));
  assert.ok(!isPagePathAllowed('/industries/kiryana'));
  assert.ok(!isPagePathAllowed('/api'));
  assert.ok(!isPagePathAllowed('/developers'));
});

test('menus: kinds and depth', () => {
  const ok = [{ id: 'm1', kind: 'group', label: 'Product', children: [{ id: 'm2', kind: 'auto', auto: { entryType: 'PRODUCT', limit: 8 } }] }];
  assert.ok(menuItemsSchema.safeParse(ok).success);
  assert.ok(!menuItemsSchema.safeParse([{ id: 'm1', kind: 'url' }]).success);
  const deep = [{ id: 'a', kind: 'group', label: 'A', children: [{ id: 'b', kind: 'group', label: 'B', children: [{ id: 'c', kind: 'group', label: 'C', children: [{ id: 'd', kind: 'url', label: 'D', url: '/d' }] }] }] }];
  assert.ok(!menuItemsSchema.safeParse(deep).success);
});

test('settings defaults parse; patterns are valid', () => {
  assert.ok(seoSettingsSchema.safeParse(DEFAULT_SEO_SETTINGS).success);
  for (const pattern of Object.values(DEFAULT_TITLE_PATTERNS)) assert.ok(pattern && pattern.length <= 120);
});

test('cache policy and revalidation payload', () => {
  assert.deepEqual(publicFetchCache('entry', { locale: 'en', path: '/pricing' }), { tags: ['all', 'page:en:/pricing'], revalidate: 86400 });
  assert.equal(publicFetchCache('preview'), null);
  assert.ok(revalidateRequestSchema.safeParse({ tags: ['sitemap'], reason: 'publish' }).success);
  assert.ok(!revalidateRequestSchema.safeParse({ tags: [], reason: 'publish' }).success);
});

test('contrast helper', () => {
  assert.ok(contrastRatioWithWhite('#047857') > 5);
  assert.ok(contrastRatioWithWhite('#ffffff') < 1.01);
});

test('1.1 amendments: blocks per type, roadmap, feature status', () => {
  assert.ok(ALLOWED_BLOCKS.PRODUCT.includes('entryGrid'));
  assert.ok(ALLOWED_BLOCKS.SERVICE.includes('entryGrid'));
  assert.ok(ALLOWED_BLOCKS.BLOG_CATEGORY.includes('hero'));
  assert.ok(ALLOWED_BLOCKS.BLOG_CATEGORY.includes('faq'));
  assert.ok(PAGE_TEMPLATE_STARTER_BLOCKS.roadmap.length > 0);
  assert.equal(featureStatusOf('PRODUCT', {}), 'live');
  assert.equal(featureStatusOf('INTEGRATION', {}), 'coming');
  assert.equal(featureStatusOf('PRODUCT', { status: 'coming' }), 'coming');
  assert.equal(featureStatusOf('INDUSTRY', { status: 'coming' }), null);
  assert.ok(!parseEntryData('INTEGRATION', { status: 'planned', category: 'x' }, 'publish').success);
  assert.ok(parseEntryData('INTEGRATION', { status: 'coming', category: 'Payments' }, 'publish').success);
  const q = publicEntriesQuerySchema.parse({ type: 'PRODUCT', status: 'coming,beta' });
  assert.deepEqual(q.status, ['coming', 'beta']);
});

test('1.1 amendments: title variants and INVALID_DATA', () => {
  assert.equal(titlePatternVariant('SERVICE', { areaServed: 'worldwide' }), 'worldwide');
  assert.equal(titlePatternFor({}, 'SERVICE', 'worldwide'), '{title} for Businesses Worldwide');
  assert.equal(titlePatternFor({}, 'SERVICE'), '{title} in Pakistan');
  assert.equal(titlePatternFor({}, 'PAGE', 'home'), DEFAULT_TITLE_PATTERNS['PAGE:home']);
  const input = { icon: 'store', shortName: 'POS', benefit: 'x', status: 'gone' };
  const result = parseEntryData('PRODUCT', input, 'publish');
  assert.ok(!result.success);
  if (!result.success) assert.deepEqual(zodErrorToIssues(result.error, 'data', undefined, input).map((i) => i.code), ['INVALID_DATA']);
});

console.log(`cms-contract: ${passed} checks passed`);
