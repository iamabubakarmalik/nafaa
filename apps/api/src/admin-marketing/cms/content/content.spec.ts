import { collectEntryLinks, collectMentionIds, collectReferencedEntryIds, inspectContent, resolveContent } from './entry-links';
import { markdownHeadingProblems, markdownToPlainText } from './markdown';
import { formatPkr, lookupFact, resolveTokensInText, tokenProblems, type TokenContext } from './tokens';
import { countMainWords, extractMainText, readingMinutes } from './word-count';
import { tokenExamples } from '../paths/cms-config.service';

const ctx: TokenContext = {
  plans: [
    { slug: 'free-trial', priceMonthly: 0, priceQuarterly: 0, priceYearly: 0 },
    { slug: 'basic', priceMonthly: 1500, priceQuarterly: 4200, priceYearly: 15000 },
    { slug: 'pro', priceMonthly: 3500, priceQuarterly: 9900, priceYearly: 35000 },
  ],
  counts: { industries: 31, cities: 12, integrations: 4, glossary: 1200, posts: 0 },
  entity: {
    brandName: 'Nafaa',
    compliance: { fbrPra: { text: 'FBR & PRA approved POS integrator', evidenceRef: 'letter on file' } },
    platforms: ['Android', 'Windows'],
  },
  year: 2026,
};

describe('tokens', () => {
  it('formats PKR', () => {
    expect(formatPkr(1500)).toBe('Rs 1,500');
    expect(formatPkr(0)).toBe('Rs 0');
    expect(formatPkr(1234.5)).toBe('Rs 1,234.5');
  });

  it('resolves every token kind', () => {
    const text = 'From {{price:min.monthly}} ({{ price:basic.yearly }} a year), {{count:industries}} industries, {{count:glossary}} terms. {{fact:compliance.fbrPra}}. © {{year}}';
    expect(resolveTokensInText(text, ctx)).toEqual({
      text: 'From Rs 1,500 (Rs 15,000 a year), 31 industries, 1,200 terms. FBR & PRA approved POS integrator. © 2026',
      problems: [],
    });
  });

  it('reports unknown tokens and keeps or removes them', () => {
    const text = 'A {{price:gold.monthly}} B {{fact:missing.path}} C {{nope}} D {{count:shops}}';
    expect(tokenProblems(text, ctx).map((p) => p.reason)).toEqual(['unknown_plan', 'unknown_fact', 'syntax', 'syntax']);
    expect(resolveTokensInText(text, ctx, 'remove').text).toBe('A  B  C  D ');
    expect(resolveTokensInText(text, ctx, 'keep').text).toBe(text);
  });

  it('has no min price when every plan is free', () => {
    const free: TokenContext = { ...ctx, plans: [ctx.plans[0]!] };
    expect(tokenProblems('{{price:min.monthly}}', free)[0]?.reason).toBe('no_price');
  });

  it('reads facts from strings, statements and string lists', () => {
    expect(lookupFact(ctx.entity, 'brandName')).toBe('Nafaa');
    expect(lookupFact(ctx.entity, 'platforms')).toBe('Android, Windows');
    expect(lookupFact(ctx.entity, 'compliance')).toBeNull();
    expect(lookupFact(null, 'brandName')).toBeNull();
    expect(lookupFact(ctx.entity, 'constructor')).toBeNull();
  });

  it('lists live examples for the admin token helper', () => {
    const examples = tokenExamples(ctx);
    expect(examples).toContainEqual({ token: '{{price:basic.monthly}}', example: 'Rs 1,500' });
    expect(examples).toContainEqual({ token: '{{fact:compliance.fbrPra}}', example: 'FBR & PRA approved POS integrator' });
    expect(examples).toContainEqual({ token: '{{year}}', example: '2026' });
    expect(examples.find((e) => e.token === '{{fact:legalName}}')).toBeUndefined();
  });
});

describe('entry links', () => {
  const blocks = [
    { id: 'hero000001', type: 'hero', sub: 'See [pricing](entry:pricing1) and ![shot](media:m1)', primaryCta: { label: 'Start', href: 'signup' }, secondaryCta: { label: 'POS', href: 'entry:pos1#offline' } },
    { id: 'rich000001', type: 'richText', markdown: 'Read [the guide](entry:guide1 "Guide") and [old](entry:gone1).' },
    { id: 'code000001', type: 'codeSample', tabs: [{ label: 'x', language: 'js', code: 'tpl("{{name}}") // [x](entry:code1)' }] },
  ];

  it('collects links with their fields', () => {
    expect(collectEntryLinks(blocks, 'blocks')).toEqual([
      { id: 'pricing1', anchor: null, field: 'blocks[0].sub', inMarkdown: true },
      { id: 'pos1', anchor: 'offline', field: 'blocks[0].secondaryCta.href', inMarkdown: false },
      { id: 'guide1', anchor: null, field: 'blocks[1].markdown', inMarkdown: true },
      { id: 'gone1', anchor: null, field: 'blocks[1].markdown', inMarkdown: true },
    ]);
    expect(collectMentionIds(blocks)).toEqual(['pricing1', 'pos1', 'guide1', 'gone1']);
  });

  it('collects ids referenced by id in blocks and data', () => {
    const grid = [{ id: 'grid000001', type: 'entryGrid', entryType: 'BLOG_POST', filter: { tagId: 'ind1' }, layout: 'cards' }];
    expect(collectReferencedEntryIds('CITY', grid, { nearbyCityIds: ['c2', 'c3'] }).sort()).toEqual(['c2', 'c3', 'ind1']);
    expect(collectReferencedEntryIds('CITY_INDUSTRY', [], { industryId: 'ind9' })).toEqual(['ind9']);
  });

  it('resolves links, tokens and CTA keywords and reports broken links', () => {
    const live: Record<string, string> = { pricing1: '/pricing', pos1: '/product/pos', guide1: '/ur/guides/fbr' };
    const result = resolveContent(blocks, {
      fieldPrefix: 'blocks',
      tokens: ctx,
      linkTarget: (id) => (live[id] ? { path: live[id] } : null),
      cta: { signupUrl: 'https://app.nafaa.pk/signup', demoPath: '/demo', whatsapp: null },
    });
    const [hero, rich, code] = result.value as typeof blocks;
    expect(hero?.sub).toBe('See [pricing](/pricing) and ![shot](media:m1)');
    expect(hero?.primaryCta.href).toBe('https://app.nafaa.pk/signup');
    expect(hero?.secondaryCta?.href).toBe('/product/pos#offline');
    expect(rich?.markdown).toBe('Read [the guide](/ur/guides/fbr "Guide") and old.');
    expect(code).toEqual(blocks[2]);
    expect(result.brokenLinks).toEqual([{ id: 'gone1', anchor: null, field: 'blocks[1].markdown', inMarkdown: true }]);
    expect(blocks[0]?.primaryCta.href).toBe('signup'); // input untouched
  });

  it('leaves a keyword alone when settings do not provide it, and outside href fields', () => {
    const value = { label: 'demo', cta: { href: 'whatsapp' } };
    expect(resolveContent(value, { cta: { whatsapp: null } }).value).toEqual(value);
    expect(resolveContent(value, { cta: { whatsapp: { number: '923001234567', message: 'Salam Nafaa' } } }).value).toEqual({
      label: 'demo',
      cta: { href: 'https://wa.me/923001234567?text=Salam%20Nafaa' },
    });
  });

  it('inspects token problems with field paths, skipping code', () => {
    const { tokenProblems: problems } = inspectContent([{ body: 'x {{price:gold.monthly}}' }, { code: '{{bad}}' }], { fieldPrefix: 'blocks', tokens: ctx });
    expect(problems).toEqual([expect.objectContaining({ field: 'blocks[0].body', reason: 'unknown_plan' })]);
  });
});

describe('markdown', () => {
  it('flags H1, deep and skipped headings, ignoring code', () => {
    const md = ['# Title', '', '### Early', '', '## Section', '### Fine', '#### Deep', '```', '# not a heading', '```', 'Setext', '======'].join('\n');
    expect(markdownHeadingProblems(md)).toEqual([
      { line: 1, level: 1, reason: 'h1' },
      { line: 3, level: 3, reason: 'skipped' },
      { line: 7, level: 4, reason: 'too_deep' },
      { line: 12, level: 1, reason: 'h1' },
    ]);
    expect(markdownHeadingProblems('## A\n\nText\n\n### B')).toEqual([]);
  });

  it('turns Markdown into plain text', () => {
    const md = '## Heading\n\n- **Bold** item with [a link](entry:x)\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst code = 1;\n```\n![img](media:m)\n> quote {{year}}';
    expect(markdownToPlainText(md)).toBe('Heading Bold item with a link A B 1 2 quote token');
  });
});

describe('word count', () => {
  const blocks = [
    { id: 'hero000001', type: 'hero', heading: 'POS for pharmacies', sub: 'Sell medicines fast', primaryCta: { label: 'Start free', href: 'signup' } },
    { id: 'ans0000001', type: 'answerBox', facts: [{ label: 'Works offline', value: 'yes always' }] },
    { id: 'rich000001', type: 'richText', markdown: 'One two three.' },
    { id: 'hide000001', type: 'richText', markdown: 'hidden words here', hidden: true },
    { id: 'grid000001', type: 'entryGrid', heading: 'More', entryType: 'INDUSTRY', layout: 'cards' },
    { id: 'faq0000001', type: 'faq' },
  ];

  it('counts visible prose, the summary once and own FAQs only', () => {
    const input = { type: 'INDUSTRY' as const, summary: 'Short answer here.', blocks, ownFaqs: [{ question: 'Is it offline?', answer: 'Yes it is.' }] };
    // hero 3+3, answerBox summary 3 + facts 2+2, rich 3, grid 1, faq q 3 + a 3 = 23
    expect(countMainWords(input)).toBe(23);
    expect(extractMainText(input)).not.toContain('hidden');
    expect(extractMainText(input)).not.toContain('Start free');
  });

  it('counts CITY data sections only when a cityFacts block shows them', () => {
    const data = { tier1Note: 'Note words', markets: [{ name: 'Anarkali', note: 'Old bazaar' }], areas: [{ name: 'Gulberg', note: 'Busy' }] };
    const withMarkets = [{ id: 'city000001', type: 'cityFacts', show: ['markets'] }];
    expect(countMainWords({ type: 'CITY', blocks: withMarkets, data })).toBe(2 + 1 + 2);
    expect(countMainWords({ type: 'CITY', blocks: [], data })).toBe(2);
  });

  it('computes reading time', () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
  });
});
