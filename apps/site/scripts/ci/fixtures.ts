/**
 * CI fixtures for the site quality gates (ARCH 14, 15 Q1).
 *
 * Contract-typed stand-ins for the public read API, one entry per template,
 * so `next build`, Lighthouse and the SEO crawl can run before the CMS has
 * rows (locally) or without any API at all (GitHub Actions).
 *
 * - Served only by scripts/ci/fixture-api.mjs. Nothing under src/ imports
 *   this file, so it never reaches a production bundle.
 * - Builds made against it always run with SITE_INDEXABLE=false.
 * - Copy is placeholder text that describes the template under test. It holds
 *   no prices, customer names, counts or claims; plan prices come from the
 *   real Plan table when the local API is reachable.
 * - Loaded by Node's type stripping, so only `import type` from the contract.
 */
import type {
  Block,
  CmsEntryType,
  EntryCard,
  EntryData,
  MenuItemResolved,
  PublicEntity,
  PublicEntry,
  PublicFaq,
  PublicLayout,
  PublicPlan,
} from '../../src/lib/cms/contract/cms-contract.ts';

const FIXED_DATE = '2026-10-01T00:00:00.000Z';
const UPDATED_DATE = '2026-10-15T00:00:00.000Z';

export interface FixtureSet {
  entries: PublicEntry[];
  layout: PublicLayout;
  entity: Omit<PublicEntity, 'plans' | 'minPaidMonthly' | 'counts'>;
  plans: PublicPlan[];
}

interface Spec {
  id: string;
  type: CmsEntryType;
  path: string;
  title: string;
  /** Title without the "| Nafaa" suffix, 22-50 chars so the final title is 30-60. */
  seoTitle: string;
  titleIncludesBrand?: boolean;
  data: EntryData;
  blocks: Block[];
  faqs?: number;
  /** Text for the summary and FAQ answers; city fixtures set their own so the uniqueness check compares distinct pages. */
  uniqueText?: string;
  noindex?: boolean;
  shortName?: string;
  icon?: string;
}

const LOREM =
  'This placeholder paragraph stands in for real CMS copy so the template can be measured for layout, speed and markup. ' +
  'It is replaced by reviewed content before any page is published.';

function description(label: string): string {
  // 140-155 characters, as the SEO checks expect.
  const text = `CI fixture for the ${label} template. Placeholder copy used only to check layout, accessibility, structured data and speed before publishing.`;
  return text.length > 155 ? text.slice(0, 154).trimEnd() + '.' : text.padEnd(140, '.');
}

function faqList(prefix: string, count: number, answerText = LOREM): PublicFaq[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-faq-${i + 1}`,
    question: `Placeholder question ${i + 1} for the ${prefix} template?`,
    answer: `Placeholder answer ${i + 1}. ${answerText}`,
    topic: 'fixtures',
  }));
}

const hero = (id: string, sub: string, extra: Partial<Extract<Block, { type: 'hero' }>> = {}): Block => ({
  id: `${id}-hero`,
  type: 'hero',
  sub,
  primaryCta: { label: 'See pricing', href: '/pricing', variant: 'primary' },
  secondaryCta: { label: 'Contact us', href: '/contact', variant: 'secondary' },
  layout: 'split',
  ...extra,
});

const answer = (id: string): Block => ({
  id: `${id}-answer`,
  type: 'answerBox',
  heading: 'The short answer',
  answer: 'A one-paragraph, answer-first summary of the page goes here.',
  facts: [
    { label: 'Placeholder fact', value: 'Value from the CMS' },
    { label: 'Second fact', value: 'Value from the CMS' },
    { label: 'Third fact', value: 'Value from the CMS' },
  ],
});

const features = (id: string, heading: string): Block => ({
  id: `${id}-features`,
  type: 'featuresGrid',
  heading,
  columns: 3,
  items: [
    { icon: 'receipt', title: 'Placeholder feature one', body: 'Short description of the feature from the CMS.' },
    { icon: 'boxes', title: 'Placeholder feature two', body: 'Short description of the feature from the CMS.' },
    { icon: 'notebook-pen', title: 'Placeholder feature three', body: 'Short description of the feature from the CMS.', status: 'beta' },
    { icon: 'sparkles', title: 'Placeholder feature four', body: 'Short description of the feature from the CMS.', status: 'coming' },
  ],
});

const steps = (id: string, howTo = false): Block => ({
  id: `${id}-steps`,
  type: 'steps',
  heading: 'How it works',
  howTo,
  items: [
    { title: 'First step', body: 'Placeholder instructions for the first step.' },
    { title: 'Second step', body: 'Placeholder instructions for the second step.' },
    { title: 'Third step', body: 'Placeholder instructions for the third step.' },
  ],
});

const rich = (id: string, heading: string): Block => ({
  id: `${id}-rich`,
  type: 'richText',
  markdown: `## ${heading}\n\n${LOREM}\n\n### Details\n\n- First placeholder point\n- Second placeholder point\n- Third placeholder point\n\n${LOREM} See [pricing](/pricing) and [the glossary](/glossary/pos).`,
});

const table = (id: string): Block => ({
  id: `${id}-table`,
  type: 'comparisonTable',
  heading: 'Side by side',
  caption: 'Placeholder comparison table.',
  columns: [
    { key: 'nafaa', label: 'Nafaa', highlight: true },
    { key: 'other', label: 'Other option' },
  ],
  rows: [
    { label: 'Placeholder row one', cells: { nafaa: { value: 'yes' }, other: { value: 'partial' } } },
    { label: 'Placeholder row two', cells: { nafaa: { value: 'yes' }, other: { value: 'no' } } },
  ],
});

const pricing = (id: string, compact = false): Block => ({ id: `${id}-pricing`, type: 'pricingTable', showToggle: !compact, compact });
const faq = (id: string): Block => ({ id: `${id}-faq`, type: 'faq', heading: 'Questions' });
const grid = (id: string, entryType: CmsEntryType): Block => ({ id: `${id}-grid`, type: 'entryGrid', entryType, layout: 'cards' });
const cta = (id: string): Block => ({
  id: `${id}-cta`,
  type: 'cta',
  heading: 'Placeholder call to action',
  primaryCta: { label: 'See pricing', href: '/pricing' },
});
const sources = (id: string): Block => ({
  id: `${id}-sources`,
  type: 'sources',
  items: [{ title: 'Federal Board of Revenue', url: 'https://www.fbr.gov.pk/', publisher: 'FBR', accessedAt: '2026-10-01' }],
});

/** One entry per template (ARCH 8), plus the hubs the menus link to. */
function specs(): Spec[] {
  return [
    {
      id: 'fx-home', type: 'PAGE', path: '/', title: 'Nafaa', seoTitle: 'Nafaa: POS & Business Software for Pakistan', titleIncludesBrand: true,
      data: { type: 'PAGE', template: 'home' },
      blocks: [
        hero('fx-home', 'Placeholder hero line for the home template.', { heading: 'Placeholder home heading', media: { kind: 'diagram', diagram: { kind: 'offline-sync', animate: true } } }),
        answer('fx-home'), features('fx-home', 'What Nafaa does'), grid('fx-home', 'INDUSTRY'),
        { id: 'fx-home-diagram', type: 'diagram', heading: 'Placeholder diagram', caption: 'Placeholder caption for the diagram.', diagram: { kind: 'fbr-invoice', animate: true } },
        pricing('fx-home'), faq('fx-home'),
      ],
      faqs: 6,
    },
    {
      id: 'fx-pricing', type: 'PAGE', path: '/pricing', title: 'Pricing', seoTitle: 'Pricing placeholder for the CI checks',
      data: { type: 'PAGE', template: 'pricing' },
      blocks: [hero('fx-pricing', 'Placeholder hero line for the pricing template.', { layout: 'centered' }), pricing('fx-pricing'), rich('fx-pricing', 'Hardware costs'), faq('fx-pricing')],
      faqs: 6,
    },
    {
      id: 'fx-industries', type: 'PAGE', path: '/industries', title: 'Industries', seoTitle: 'Industries hub placeholder page',
      data: { type: 'PAGE', template: 'hub', hubOf: 'INDUSTRY' },
      blocks: [hero('fx-industries', 'Placeholder hero line for the hub template.', { layout: 'centered' }), answer('fx-industries'), { id: 'fx-industries-grid', type: 'entryGrid', entryType: 'INDUSTRY', layout: 'grouped' }],
    },
    ...(
      [
        ['fx-hub-product', '/product', 'Product', 'PRODUCT'],
        ['fx-hub-blog', '/blog', 'Blog', 'BLOG_POST'],
        ['fx-hub-glossary', '/glossary', 'Glossary', 'GLOSSARY_TERM'],
        ['fx-hub-team', '/team', 'Team', 'PERSON'],
        ['fx-hub-tools', '/tools', 'Tools', 'TOOL'],
        ['fx-hub-pos-software', '/pos-software', 'POS software by city', 'CITY'],
        ['fx-hub-compare', '/compare', 'Compare', 'COMPARE'],
        ['fx-hub-best', '/best', 'Best-of lists', 'BEST_OF'],
        ['fx-hub-compliance', '/compliance', 'Compliance', 'COMPLIANCE'],
        ['fx-hub-solutions', '/solutions', 'Solutions', 'SOLUTION'],
        ['fx-hub-services', '/services', 'Services', 'SERVICE'],
      ] as const
    ).map(([id, path, title, hubOf]): Spec => ({
      id, type: 'PAGE', path, title, seoTitle: `${title}: placeholder hub page`,
      data: { type: 'PAGE', template: 'hub', hubOf },
      blocks: [hero(id, `Placeholder hero line for the ${title} hub.`, { layout: 'centered' }), { id: `${id}-grid`, type: 'entryGrid', entryType: hubOf, layout: 'cards' }],
    })),
    {
      id: 'fx-about', type: 'PAGE', path: '/about', title: 'About', seoTitle: 'About page placeholder for checks',
      data: { type: 'PAGE', template: 'default' },
      blocks: [hero('fx-about', 'Placeholder hero line for the default page template.', { layout: 'centered' }), rich('fx-about', 'Placeholder section')],
    },
    {
      id: 'fx-contact', type: 'PAGE', path: '/contact', title: 'Contact', seoTitle: 'Contact page placeholder for checks',
      data: { type: 'PAGE', template: 'contact' },
      blocks: [
        hero('fx-contact', 'Placeholder hero line for the contact template.', { layout: 'centered' }),
        { id: 'fx-contact-form', type: 'leadForm', heading: 'Placeholder form', form: 'contact', successMessage: 'Placeholder success message.' },
      ],
    },
    {
      id: 'fx-faq', type: 'PAGE', path: '/faq', title: 'FAQ', seoTitle: 'Questions hub placeholder for checks',
      data: { type: 'PAGE', template: 'hub' },
      blocks: [hero('fx-faq', 'Placeholder hero line for the FAQ hub.', { layout: 'centered' }), faq('fx-faq')],
      faqs: 6,
    },
    {
      id: 'fx-roadmap', type: 'PAGE', path: '/roadmap', title: 'Roadmap', seoTitle: 'Roadmap placeholder page for checks',
      data: { type: 'PAGE', template: 'roadmap' },
      blocks: [
        hero('fx-roadmap', 'Placeholder hero line for the roadmap template.', { layout: 'centered' }),
        { id: 'fx-roadmap-grid', type: 'entryGrid', entryType: 'PRODUCT', filter: { status: ['coming', 'beta'] }, layout: 'cards' },
        cta('fx-roadmap'),
      ],
    },
    {
      id: 'fx-product', type: 'PRODUCT', path: '/product/pos', title: 'POS billing', seoTitle: 'POS billing placeholder product page', shortName: 'POS', icon: 'receipt',
      data: { type: 'PRODUCT', icon: 'receipt', shortName: 'POS', benefit: 'Placeholder benefit', status: 'live' },
      blocks: [hero('fx-product', 'Placeholder hero line for the product template.'), answer('fx-product'), steps('fx-product', true), features('fx-product', 'Placeholder features'), grid('fx-product', 'INDUSTRY'), table('fx-product'), pricing('fx-product', true), faq('fx-product')],
      faqs: 6,
    },
    {
      id: 'fx-product-coming', type: 'PRODUCT', path: '/product/ci-fixture-coming', title: 'Coming feature', seoTitle: 'Coming feature placeholder product', shortName: 'Coming', icon: 'sparkles', noindex: true,
      data: { type: 'PRODUCT', icon: 'sparkles', shortName: 'Coming', benefit: 'Placeholder benefit', status: 'coming' },
      blocks: [hero('fx-product-coming', 'Placeholder hero line for a coming feature.'), faq('fx-product-coming')],
      faqs: 5,
    },
    {
      id: 'fx-industry', type: 'INDUSTRY', path: '/industries/kiryana', title: 'Kiryana store', seoTitle: 'Kiryana store placeholder industry', shortName: 'Kiryana', icon: 'store',
      data: { type: 'INDUSTRY', icon: 'store', color: '#047857', group: 'retail', shortName: 'Kiryana', shopNoun: 'shops' },
      blocks: [hero('fx-industry', 'Placeholder hero line for the industry template.'), answer('fx-industry'), features('fx-industry', 'Problems it solves'), steps('fx-industry'), pricing('fx-industry', true), rich('fx-industry', 'Buyer checklist'), table('fx-industry'), faq('fx-industry')],
      faqs: 6,
    },
    {
      id: 'fx-solution', type: 'SOLUTION', path: '/solutions/multi-branch', title: 'Multi-branch', seoTitle: 'Multi-branch placeholder solution page', shortName: 'Multi-branch', icon: 'building-2',
      data: { type: 'SOLUTION', icon: 'building-2', shortName: 'Multi-branch', outcome: 'Placeholder outcome', status: 'live' },
      blocks: [hero('fx-solution', 'Placeholder hero line for the solution template.'), answer('fx-solution'), features('fx-solution', 'What you get'), { id: 'fx-solution-diagram', type: 'diagram', caption: 'Placeholder caption.', diagram: { kind: 'multi-branch', animate: true } }, rich('fx-solution', 'Example'), faq('fx-solution')],
      faqs: 5,
    },
    {
      id: 'fx-service', type: 'SERVICE', path: '/services/custom-software', title: 'Custom software', seoTitle: 'Custom software placeholder service', shortName: 'Custom software', icon: 'code',
      data: { type: 'SERVICE', icon: 'code', shortName: 'Custom software', areaServed: 'worldwide', status: 'live' },
      blocks: [
        hero('fx-service', 'Placeholder hero line for the service template.'), rich('fx-service', 'What we build'),
        { id: 'fx-service-diagram', type: 'diagram', caption: 'Placeholder caption.', diagram: { kind: 'service-process', animate: true } },
        steps('fx-service'), faq('fx-service'),
        { id: 'fx-service-form', type: 'leadForm', heading: 'Quote lein', form: 'quote', successMessage: 'Placeholder success message.', currencies: ['PKR', 'USD'], whatsapp: true },
      ],
      faqs: 5,
    },
    {
      id: 'fx-compliance', type: 'COMPLIANCE', path: '/compliance/fbr-pos-integration', title: 'FBR POS integration', seoTitle: 'FBR POS integration placeholder page',
      data: { type: 'COMPLIANCE', authority: 'FBR', sroRefs: [] },
      blocks: [hero('fx-compliance', 'Placeholder hero line for the compliance template.'), answer('fx-compliance'), rich('fx-compliance', 'Who must comply'), steps('fx-compliance'), faq('fx-compliance'), sources('fx-compliance')],
      faqs: 5,
    },
    {
      id: 'fx-city', type: 'CITY', path: '/pos-software/lahore', title: 'Lahore', seoTitle: 'POS software in Lahore placeholder',
      data: { type: 'CITY', name: 'Lahore', province: 'Punjab', authority: 'PRA', wikidataId: 'Q11739', markets: [], areas: [], support: { onsite: false, note: '' }, nearbyCityIds: [] },
      blocks: [
        hero('fx-city', 'Placeholder hero line for the city template, Lahore variant.'), answer('fx-city'),
        { id: 'fx-city-facts', type: 'cityFacts', show: ['tax', 'markets', 'areas', 'support'] },
        { id: 'fx-city-rich', type: 'richText', markdown: '## Popular business types\n\nLahore placeholder paragraph about local trade, kept distinct from other city fixtures so the uniqueness check has two different texts to compare. Bazaars, wholesale lanes and neighbourhood stores are typical subjects here.' },
        faq('fx-city'),
      ],
      faqs: 5,
      uniqueText: 'Lahore fixture answer about Punjab tax registration, provincial filing and counter setup in older markets.',
    },
    {
      id: 'fx-city-2', type: 'CITY', path: '/pos-software/karachi', title: 'Karachi', seoTitle: 'POS software in Karachi placeholder',
      data: { type: 'CITY', name: 'Karachi', province: 'Sindh', authority: 'SRB', wikidataId: 'Q8660', markets: [], areas: [], support: { onsite: false, note: '' }, nearbyCityIds: [] },
      blocks: [
        hero('fx-city-2', 'Placeholder hero line for the city template, Karachi variant.'),
        { id: 'fx-city-2-rich', type: 'richText', markdown: '## Business types\n\nKarachi placeholder: a port city fixture written with different wording, so that shingle overlap with the Lahore fixture stays low. Shipping, textiles and retail markets would be covered by the reviewed copy.' },
        faq('fx-city-2'),
      ],
      faqs: 5,
      uniqueText: 'Karachi fixture reply on Sindh revenue rules, port trade volumes and wholesale counters near the harbour.',
    },
    {
      id: 'fx-best', type: 'BEST_OF', path: '/best/pos-software-pakistan', title: 'Best POS software', seoTitle: 'Best POS software placeholder list',
      data: {
        type: 'BEST_OF', category: 'POS', methodology: 'Placeholder methodology.',
        items: [
          { name: 'Nafaa', isNafaa: true, strengths: ['Placeholder strength'], weaknesses: [], bestFor: 'Placeholder' },
          { name: 'Placeholder option', isNafaa: false, strengths: ['Placeholder strength'], weaknesses: ['Placeholder weakness'], bestFor: 'Placeholder' },
        ],
      },
      blocks: [hero('fx-best', 'Placeholder hero line for the best-of template.'), rich('fx-best', 'Methodology'), table('fx-best'), faq('fx-best')],
      faqs: 5,
    },
    {
      id: 'fx-compare', type: 'COMPARE', path: '/compare/nafaa-vs-placeholder', title: 'Nafaa vs placeholder', seoTitle: 'Nafaa vs Placeholder: CI comparison page', titleIncludesBrand: true,
      data: { type: 'COMPARE', competitorName: 'Placeholder', competitorUrl: 'https://example.com/', verdict: 'Placeholder verdict.' },
      blocks: [hero('fx-compare', 'Placeholder hero line for the compare template.'), answer('fx-compare'), table('fx-compare'), rich('fx-compare', 'Where each option fits'), steps('fx-compare'), faq('fx-compare')],
      faqs: 5,
    },
    {
      id: 'fx-article', type: 'BLOG_POST', path: '/blog/ci-fixture-article', title: 'Placeholder article title', seoTitle: 'Placeholder article for the CI checks',
      data: { type: 'BLOG_POST', toc: true, readingMinutes: 3 },
      blocks: [rich('fx-article', 'First section'), { id: 'fx-article-rich2', type: 'richText', markdown: `## Second section\n\n${LOREM}\n\n## Third section\n\n${LOREM}` }],
    },
    {
      id: 'fx-glossary', type: 'GLOSSARY_TERM', path: '/glossary/pos', title: 'POS', seoTitle: 'What is POS? Placeholder glossary term',
      data: { type: 'GLOSSARY_TERM', term: 'POS', definition: 'Placeholder one-sentence definition.', definitionRomanUrdu: 'Placeholder Roman Urdu definition.', alsoKnownAs: [] },
      blocks: [rich('fx-glossary', 'Meaning')],
    },
    {
      id: 'fx-tool', type: 'TOOL', path: '/tools/gst-calculator', title: 'GST calculator', seoTitle: 'GST calculator placeholder tool page',
      data: { type: 'TOOL', toolKey: 'gst-calculator', kind: 'GST' },
      blocks: [hero('fx-tool', 'Placeholder hero line for the tool template.', { layout: 'centered' }), { id: 'fx-tool-island', type: 'tool', toolKey: 'gst-calculator' }, rich('fx-tool', "How it's calculated"), faq('fx-tool')],
      faqs: 5,
    },
    {
      id: 'fx-person', type: 'PERSON', path: '/team/ci-fixture-author', title: 'Fixture Author', seoTitle: 'Fixture Author, placeholder person',
      data: { type: 'PERSON', name: 'Fixture Author', role: 'Placeholder role', sameAs: [], knowsAbout: [] },
      blocks: [rich('fx-person', 'Bio')],
    },
    {
      id: 'fx-docs', type: 'DOC', path: '/developers', title: 'Developer docs', seoTitle: 'Developer docs placeholder for checks',
      data: { type: 'DOC' },
      blocks: [
        rich('fx-docs', 'Getting started'),
        { id: 'fx-docs-code', type: 'codeSample', tabs: [{ label: 'curl', language: 'bash', code: 'curl https://example.com/api/v1/placeholder' }] },
      ],
    },
  ];
}

function card(spec: Spec, site: string): EntryCard {
  return {
    id: spec.id,
    type: spec.type,
    locale: 'en',
    path: spec.path,
    url: site + (spec.path === '/' ? '/' : spec.path),
    title: spec.title,
    summary: `Placeholder summary for ${spec.title}.`,
    image: null,
    ...(spec.icon ? { icon: spec.icon } : {}),
    ...(spec.shortName ? { shortName: spec.shortName } : {}),
    ...('status' in spec.data && spec.data.status ? { status: spec.data.status } : {}),
    contentUpdatedAt: UPDATED_DATE,
  };
}

function breadcrumbs(spec: Spec, site: string) {
  const home = { name: 'Home', path: '/', url: `${site}/` };
  if (spec.path === '/') return [home];
  return [home, { name: spec.title, path: spec.path, url: site + spec.path }];
}

export function buildFixtures(site: string): FixtureSet {
  const list = specs();
  const cards = new Map(list.map((s) => [s.id, card(s, site)]));
  const author = cards.get('fx-person')!;

  const entries: PublicEntry[] = list.map((spec) => {
    const url = site + (spec.path === '/' ? '/' : spec.path);
    const related = list
      .filter((other) => other.id !== spec.id && other.type === spec.type && !other.noindex)
      .slice(0, 3)
      .map((other) => cards.get(other.id)!);
    const isArticle = spec.type === 'BLOG_POST';
    return {
      id: spec.id,
      type: spec.type,
      locale: 'en',
      path: spec.path,
      url,
      title: spec.title,
      summary: `Placeholder summary for the ${spec.title} fixture. ${spec.uniqueText ?? LOREM}`,
      blocks: spec.blocks,
      data: spec.data,
      seo: {
        title: spec.seoTitle,
        titleIncludesBrand: spec.titleIncludesBrand ?? false,
        description: description(spec.title),
        canonical: url,
        robots: spec.noindex ? { index: false, follow: true, reason: 'coming' } : { index: true, follow: true },
        ogImage: null,
        schemaExtra: [],
      },
      image: null,
      author: isArticle ? { ...author, role: 'Placeholder role', photo: null, sameAs: [] } : null,
      reviewer: null,
      factCheckedAt: null,
      datePublished: FIXED_DATE,
      dateModified: UPDATED_DATE,
      breadcrumbs: breadcrumbs(spec, site),
      parent: null,
      children: [],
      tags: {},
      related,
      faqs: faqList(spec.id, spec.faqs ?? 0, spec.uniqueText),
      alternates: [{ locale: 'en', path: spec.path, url }],
      media: {},
      quality: { wordCount: 400, gate: null, passed: true },
    };
  });

  const link = (id: string, label: string, href: string, extra: Partial<MenuItemResolved> = {}): MenuItemResolved => ({ id, label, href, ...extra });
  const layout: PublicLayout = {
    locale: 'en',
    menus: {
      header: [
        link('m-product', 'Product', '/product/pos', {
          children: [
            link('m-product-g', 'Sell', '', {
              children: [
                link('m-pos', 'POS billing', '/product/pos', { icon: 'receipt', description: 'Placeholder description' }),
                link('m-coming', 'Coming feature', '/product/ci-fixture-coming', { icon: 'sparkles', description: 'Placeholder description' }),
              ],
            }),
          ],
        }),
        link('m-industries', 'Industries', '/industries', { children: [link('m-kiryana', 'Kiryana', '/industries/kiryana', { icon: 'store' })] }),
        link('m-pricing', 'Pricing', '/pricing'),
        link('m-blog', 'Blog', '/blog/ci-fixture-article'),
      ],
      footer: [
        link('f-product', 'Product', '', { children: [link('f-pos', 'POS billing', '/product/pos'), link('f-pricing', 'Pricing', '/pricing'), link('f-roadmap', 'Roadmap', '/roadmap')] }),
        link('f-solutions', 'Solutions', '', { children: [link('f-multi', 'Multi-branch', '/solutions/multi-branch'), link('f-custom', 'Custom software', '/services/custom-software')] }),
        link('f-learn', 'Learn', '', { children: [link('f-compliance', 'FBR POS integration', '/compliance/fbr-pos-integration'), link('f-glossary', 'POS meaning', '/glossary/pos'), link('f-tool', 'GST calculator', '/tools/gst-calculator'), link('f-dev', 'Developers', '/developers')] }),
        link('f-cities', 'Cities', '', { children: [link('f-lahore', 'Lahore', '/pos-software/lahore'), link('f-karachi', 'Karachi', '/pos-software/karachi')] }),
        link('f-company', 'Company', '', { children: [link('f-about', 'About', '/about'), link('f-contact', 'Contact', '/contact'), link('f-faq', 'FAQ', '/faq'), link('f-best', 'Best POS', '/best/pos-software-pakistan'), link('f-compare', 'Compare', '/compare/nafaa-vs-placeholder'), link('f-team', 'Team', '/team/ci-fixture-author')] }),
      ],
      legal: [],
      mobile: [],
    },
    site: {
      name: 'Nafaa',
      baseUrl: site,
      appUrl: 'https://app.nafaa.pk',
      signupUrl: 'https://app.nafaa.pk/signup',
      demoPath: '/contact',
      locales: ['en'],
      whatsapp: null,
      social: [],
    },
    updatedAt: UPDATED_DATE,
  };

  const entity: FixtureSet['entity'] = {
    brandName: 'Nafaa',
    disambiguatingDescription: 'Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds',
    description: 'Placeholder entity description used by the CI fixtures.',
    founderIds: [],
    offices: [],
    contact: {},
    compliance: { fbrPra: { text: 'FBR & PRA approved POS integrator', evidenceRef: 'CI fixture; the real statement lives in settings.entity' } },
    platforms: ['Web browser'],
    languages: ['English'],
    sameAs: [],
    generatedAt: UPDATED_DATE,
  };

  // Used only when the local API is unreachable (GitHub Actions). Marked as fixtures by name.
  const plans: PublicPlan[] = [
    fixturePlan('fixture-trial', 'Fixture trial', 0, 1, 7, '7 din Free Trial'),
    fixturePlan('fixture-plan', 'Fixture plan', 1000, 2, 0),
  ];

  return { entries, layout, entity, plans };
}

function fixturePlan(slug: string, name: string, monthly: number, sortOrder: number, trialDays: number, tagline?: string): PublicPlan {
  return {
    id: `fixture-${slug}`,
    slug,
    name,
    description: 'Fixture plan for CI only.',
    priceMonthly: monthly,
    priceQuarterly: monthly * 3,
    priceYearly: monthly * 12,
    currency: 'PKR',
    trialDays,
    sortOrder,
    limits: { maxProducts: 0, maxUsers: 0, maxShops: 0, maxSalesPerMonth: 0 },
    features: [],
    display: { ...(tagline ? { tagline } : {}), highlight: sortOrder === 2 },
  };
}
