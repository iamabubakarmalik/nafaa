/**
 * City fixtures. Names, provinces, tax authorities, coordinates and Wikidata
 * ids are the fact-checked values from the CMS seed (content/cities). Markets
 * and areas are the names PLAN section 5 lists for research; their notes are
 * marked as sample text because the city writers (Phase 5) have not written
 * them yet. Tax rates are never stated: the fixture points at the official
 * site and says so.
 */
import type { EntryCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { FIXTURE_DATE, card, entry, fixtureId } from './factory';
import { DEMO, INDUSTRY_CARDS, SAMPLE, SEED_FAQS, SIGNUP } from './shared';

type Authority = 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT';
type Province = 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad Capital Territory';

interface CitySeed {
  slug: string;
  name: string;
  province: Province;
  authority: Authority;
  wikidataId: string;
  geo: { lat: number; lng: number };
}

const SEED: CitySeed[] = [
  { slug: 'lahore', name: 'Lahore', province: 'Punjab', authority: 'PRA', wikidataId: 'Q11739', geo: { lat: 31.5204, lng: 74.3587 } },
  { slug: 'karachi', name: 'Karachi', province: 'Sindh', authority: 'SRB', wikidataId: 'Q8660', geo: { lat: 24.8607, lng: 67.0011 } },
  { slug: 'islamabad', name: 'Islamabad', province: 'Islamabad Capital Territory', authority: 'ICT', wikidataId: 'Q1362', geo: { lat: 33.6844, lng: 73.0479 } },
  { slug: 'faisalabad', name: 'Faisalabad', province: 'Punjab', authority: 'PRA', wikidataId: 'Q173985', geo: { lat: 31.4504, lng: 73.135 } },
  { slug: 'gujranwala', name: 'Gujranwala', province: 'Punjab', authority: 'PRA', wikidataId: 'Q243322', geo: { lat: 32.1877, lng: 74.1945 } },
  { slug: 'sialkot', name: 'Sialkot', province: 'Punjab', authority: 'PRA', wikidataId: 'Q643883', geo: { lat: 32.4945, lng: 74.5229 } },
  { slug: 'peshawar', name: 'Peshawar', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q1113311', geo: { lat: 34.0151, lng: 71.5249 } },
  { slug: 'quetta', name: 'Quetta', province: 'Balochistan', authority: 'BRA', wikidataId: 'Q185458', geo: { lat: 30.1798, lng: 66.9749 } },
];

const AUTHORITY: Record<Authority, { name: string; site: string; publisher: string }> = {
  PRA: { name: 'Punjab Revenue Authority (PRA)', site: 'https://pra.punjab.gov.pk/', publisher: 'Punjab Revenue Authority' },
  SRB: { name: 'Sindh Revenue Board (SRB)', site: 'https://srb.gos.pk/', publisher: 'Sindh Revenue Board' },
  KPRA: { name: 'Khyber Pakhtunkhwa Revenue Authority (KPRA)', site: 'https://kpra.kp.gov.pk/', publisher: 'Khyber Pakhtunkhwa Revenue Authority' },
  BRA: { name: 'Balochistan Revenue Authority (BRA)', site: 'https://bra.gob.pk/', publisher: 'Balochistan Revenue Authority' },
  ICT: { name: 'FBR (Islamabad Capital Territory services tax)', site: 'https://www.fbr.gov.pk/', publisher: 'Federal Board of Revenue' },
};

const cityPath = (slug: string) => `/pos-software/${slug}`;
const cityId = (slug: string) => fixtureId('CITY', cityPath(slug));

function cityCard(c: CitySeed): EntryCard {
  return card({
    type: 'CITY',
    path: cityPath(c.slug),
    title: c.name,
    shortName: c.name,
    icon: 'map-pin',
    summary: `POS, stock and khata software for shops in ${c.name}, with ${c.authority} services tax rules explained.`,
  });
}

const NEARBY: Record<string, string[]> = {
  lahore: ['gujranwala', 'faisalabad', 'sialkot'],
  karachi: [],
  islamabad: ['peshawar'],
};

function summaryFor(c: CitySeed): string {
  const tax = AUTHORITY[c.authority].name;
  return (
    `Nafaa is POS, stock and khata software for shops in ${c.name}. It runs in the browser, keeps billing without internet, ` +
    `and keeps udhaar in a digital khata. In ${c.name}, sales tax on services is collected by ${tax}, while sales tax on goods is collected by FBR.`
  );
}

/** A full hub, used for Lahore and Karachi. */
function richCity(c: CitySeed, opts: { markets: { name: string; area?: string }[]; areas: string[]; industries: EntryCard[] }): PublicEntry {
  const authority = AUTHORITY[c.authority];
  const nearby = (NEARBY[c.slug] ?? []).map((slug) => SEED.find((s) => s.slug === slug)).filter((s): s is CitySeed => Boolean(s));
  const industryLinks = opts.industries.map((i) => (i.summary ? `- [${i.title}](${i.path}): ${i.summary}` : `- [${i.title}](${i.path})`)).join('\n');
  return entry({
    type: 'CITY',
    path: cityPath(c.slug),
    title: c.name,
    seoTitle: `POS Software in ${c.name}: Billing, Stock & ${c.authority} Tax`,
    summary: summaryFor(c),
    gate: 700,
    forcePassed: true,
    data: {
      type: 'CITY',
      name: c.name,
      province: c.province,
      authority: c.authority,
      wikidataId: c.wikidataId,
      geo: c.geo,
      servicesTax: {
        rate: 'See source',
        appliesTo: `${SAMPLE} The city writer adds the services that pay sales tax to ${authority.name}, the current rate and the SRO it comes from.`,
        source: { title: `${authority.publisher}: official website`, url: authority.site, publisher: authority.publisher, accessedAt: FIXTURE_DATE },
      },
      tier1Note: `${SAMPLE} Who counts as a Tier-1 retailer for FBR, in plain words, with a link to the FBR page that defines it.`,
      markets: opts.markets.map((m) => ({
        name: m.name,
        ...(m.area ? { area: m.area } : {}),
        note: `${SAMPLE} What the shops in ${m.name} sell and which Nafaa features fit them, written from a visit or a dated source.`,
      })),
      areas: opts.areas.map((name) => ({
        name,
        note: `${SAMPLE} The kinds of businesses around ${name} and how setup and support work there.`,
      })),
      support: { onsite: false, note: 'Remote setup and support on WhatsApp.' },
      nearbyCityIds: nearby.map((n) => cityId(n.slug)),
    },
    blocks: [
      {
        type: 'hero',
        eyebrow: `POS software in ${c.name}`,
        sub: `Billing, stock and khata for ${c.name} shops in one app. It keeps billing when the internet drops and works on the phone, tablet or computer you already have.`,
        primaryCta: SIGNUP,
        secondaryCta: DEMO,
        layout: 'split',
        media: { kind: 'diagram', diagram: { kind: 'offline-sync', animate: true } },
      },
      {
        type: 'answerBox',
        facts: [
          { label: 'Services tax', value: authority.name },
          { label: 'Goods tax', value: 'FBR (Federal Board of Revenue)' },
          { label: 'Setup', value: 'Remote setup and support on WhatsApp' },
          { label: 'Price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
        ],
        romanUrdu: `${c.name} ki dukaanon ke liye Nafaa: POS, stock aur khata ek app me. Internet na ho to bhi bill bante rehte hain.`,
      },
      { type: 'cityFacts', show: ['tax'] },
      {
        type: 'richText',
        markdown:
          `## Business types Nafaa has apps for\n\nNafaa ships a separate app for each kind of business, so a pharmacy in ${c.name} gets batch and expiry tracking while a restaurant gets kitchen tickets. ` +
          `Each one shares the same counter, stock and khata underneath.\n\n${industryLinks}\n\n` +
          `### How setup works in ${c.name}\n\nSetup is done remotely: you sign up, add products (or import them from Excel), and the team helps on WhatsApp when you get stuck. ` +
          `A barcode scanner and a receipt printer can be added later.`,
      },
      { type: 'cityFacts', show: ['markets', 'areas'], heading: `Markets and areas in ${c.name}` },
      { type: 'cityFacts', show: ['support'] },
      { type: 'faq', heading: `Questions from ${c.name} shop owners` },
      { type: 'relatedLinks', source: 'related', heading: 'Nearby cities' },
      {
        type: 'cta',
        heading: `Start billing in ${c.name} today`,
        body: 'Try every feature on the free trial, then pick a plan.',
        primaryCta: SIGNUP,
        secondaryCta: { label: 'Ask on WhatsApp', href: 'https://wa.me/923241772933', variant: 'ghost', trackAs: 'whatsapp' },
      },
    ],
    faqs: [
      {
        id: `fixture__faq-${c.slug}-tax`,
        topic: 'tax',
        question: `Who collects sales tax on services in ${c.name}?`,
        answer: `In ${c.name}, sales tax on services is collected by ${authority.name}, while sales tax on goods is collected by FBR. The tax section on this page links to the official source.`,
      },
      SEED_FAQS.devices,
      SEED_FAQS.offline,
      SEED_FAQS.khata,
      SEED_FAQS.pricing,
    ],
    tags: { INDUSTRY: opts.industries, COMPLIANCE: [card({ type: 'COMPLIANCE', path: '/compliance/pra-pos-integration', title: 'PRA POS Integration' })] },
    related: nearby.map(cityCard),
  });
}

/** A short hub below the 700-word gate (shows the noindex path). */
function thinCity(c: CitySeed): PublicEntry {
  return entry({
    type: 'CITY',
    path: cityPath(c.slug),
    title: c.name,
    seoTitle: `POS Software in ${c.name}: Billing, Stock & ${c.authority} Tax`,
    summary: summaryFor(c),
    gate: 700,
    data: {
      type: 'CITY',
      name: c.name,
      province: c.province,
      authority: c.authority,
      wikidataId: c.wikidataId,
      geo: c.geo,
      markets: [],
      areas: [],
      support: { onsite: false, note: 'Remote setup and support on WhatsApp.' },
      nearbyCityIds: [],
    },
    blocks: [
      { type: 'hero', eyebrow: `POS software in ${c.name}`, sub: summaryFor(c), primaryCta: SIGNUP, secondaryCta: DEMO, layout: 'split' },
      {
        type: 'answerBox',
        facts: [
          { label: 'Services tax', value: AUTHORITY[c.authority].name },
          { label: 'Goods tax', value: 'FBR (Federal Board of Revenue)' },
        ],
      },
    ],
  });
}

export const LAHORE = richCity(SEED[0]!, {
  markets: [
    { name: 'Hall Road' },
    { name: 'Anarkali Bazaar' },
    { name: 'Liberty Market', area: 'Gulberg' },
    { name: 'Shah Alam Market' },
  ],
  areas: ['Gulberg', 'Johar Town', 'DHA'],
  industries: [INDUSTRY_CARDS.kiryana, INDUSTRY_CARDS.pharmacy, INDUSTRY_CARDS.restaurant, INDUSTRY_CARDS.mobile, INDUSTRY_CARDS.garments],
});

export const KARACHI = richCity(SEED[1]!, {
  markets: [{ name: 'Saddar' }, { name: 'Tariq Road' }, { name: 'Jodia Bazaar' }],
  areas: ['DHA', 'Gulshan-e-Iqbal'],
  industries: [INDUSTRY_CARDS.kiryana, INDUSTRY_CARDS.restaurant, INDUSTRY_CARDS.pharmacy, INDUSTRY_CARDS.bakery],
});

export const CITY_FIXTURES: PublicEntry[] = [LAHORE, KARACHI, ...SEED.slice(2).map(thinCity)];

// ─── City × industry pairs (launch with 0; these exercise the gate) ───

function pair(city: PublicEntry, industry: EntryCard, opts: { passed: boolean; slug: string }): PublicEntry {
  const cityName = city.title;
  const path = `${city.path}/${opts.slug}`;
  return entry({
    type: 'CITY_INDUSTRY',
    path,
    title: `${industry.shortName ?? industry.title} software in ${cityName}`,
    seoTitle: `${industry.shortName ?? industry.title} POS Software in ${cityName}`,
    summary: `${SAMPLE} A page for ${industry.title.toLowerCase()} owners in ${cityName}, published only with real evidence: a consented case study or at least five real customers in the city.`,
    gate: 900,
    forcePassed: opts.passed,
    parent: card({ type: 'CITY', path: city.path, title: cityName, icon: 'map-pin' }),
    data: { type: 'CITY_INDUSTRY', industryId: industry.id, evidence: `${SAMPLE} Evidence reference kept for editors; never rendered.` },
    blocks: [
      { type: 'hero', eyebrow: `${industry.shortName ?? industry.title} · ${cityName}`, sub: `${SAMPLE} Why ${industry.title.toLowerCase()} owners in ${cityName} use Nafaa, in 25 to 60 words, with the features that matter for this trade.`, primaryCta: SIGNUP, secondaryCta: DEMO, layout: 'split' },
      { type: 'answerBox', facts: [{ label: 'Built for', value: industry.title }, { label: 'City', value: cityName }] },
      { type: 'richText', markdown: `## What ${industry.title.toLowerCase()} owners in ${cityName} need\n\n${SAMPLE} Written for this city and trade only, from the evidence behind the page.` },
      { type: 'faq' },
    ],
    faqs: [SEED_FAQS.devices, SEED_FAQS.offline],
    tags: { INDUSTRY: [industry] },
    related: [],
  });
}

export const PAIR_FIXTURES: PublicEntry[] = [
  pair(LAHORE, INDUSTRY_CARDS.pharmacy, { passed: true, slug: 'pharmacy' }),
  pair(LAHORE, INDUSTRY_CARDS.bakery, { passed: false, slug: 'bakery' }),
];
