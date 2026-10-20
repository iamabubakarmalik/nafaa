/**
 * Compliance fixtures. Authority names and official websites are real; every
 * rule, date, SRO and penalty is marked as sample text, because those facts
 * must come from the W6 writer with an official source (COMPLIANCE needs a
 * source and a fact-check stamp to publish). The Nafaa statement is the
 * owner's exact wording through `{{fact:compliance.fbrPra}}`.
 */
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { FIXTURE_DATE, card, entry } from './factory';
import { DEMO, INDUSTRY_CARDS, SAMPLE, SEED_FAQS, SIGNUP } from './shared';

interface AuthoritySpec {
  slug: string;
  authority: 'FBR' | 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT';
  name: string;
  site: string;
  cities: { slug: string; name: string }[];
}

const SPECS: AuthoritySpec[] = [
  { slug: 'fbr-pos-integration', authority: 'FBR', name: 'Federal Board of Revenue', site: 'https://www.fbr.gov.pk/', cities: [] },
  {
    slug: 'pra-pos-integration',
    authority: 'PRA',
    name: 'Punjab Revenue Authority',
    site: 'https://pra.punjab.gov.pk/',
    cities: [
      { slug: 'lahore', name: 'Lahore' },
      { slug: 'faisalabad', name: 'Faisalabad' },
      { slug: 'gujranwala', name: 'Gujranwala' },
      { slug: 'sialkot', name: 'Sialkot' },
    ],
  },
  { slug: 'srb-pos-integration', authority: 'SRB', name: 'Sindh Revenue Board', site: 'https://srb.gos.pk/', cities: [{ slug: 'karachi', name: 'Karachi' }] },
  { slug: 'kpra-pos-integration', authority: 'KPRA', name: 'Khyber Pakhtunkhwa Revenue Authority', site: 'https://kpra.kp.gov.pk/', cities: [{ slug: 'peshawar', name: 'Peshawar' }] },
];

function compliancePage(spec: AuthoritySpec, rich: boolean): PublicEntry {
  const path = `/compliance/${spec.slug}`;
  const short = spec.authority;
  const source = { title: `${spec.name}: official website`, url: spec.site, publisher: spec.name, accessedAt: FIXTURE_DATE };
  return entry({
    type: 'COMPLIANCE',
    path,
    title: `${short} POS Integration`,
    seoTitle: `${short} POS Integration: Who Must Comply & How (2026)`,
    summary: `${SAMPLE} Who has to connect their POS to ${spec.name} (${short}), from when, what it costs and what happens if you do not, answered in the first lines with a link to the official rule.`,
    gate: 900,
    forcePassed: rich,
    factChecked: true,
    data: {
      type: 'COMPLIANCE',
      authority: spec.authority,
      sroRefs: rich ? [`${SAMPLE} SRO number and year`, `${SAMPLE} Second notification, if any`] : [],
      ...(rich ? { effectiveDate: FIXTURE_DATE } : {}),
      ...(rich ? { penaltySummary: `${SAMPLE} The penalty exactly as the notification states it, in one or two plain sentences.` } : {}),
    },
    blocks: [
      {
        type: 'hero',
        eyebrow: `${short} compliance`,
        sub: `${SAMPLE} One plain sentence on what ${short} POS integration is and who it applies to, then how Nafaa sends each invoice for you.`,
        primaryCta: SIGNUP,
        secondaryCta: DEMO,
        layout: 'split',
        ...(spec.authority === 'FBR' || spec.authority === 'PRA' ? { media: { kind: 'diagram' as const, diagram: { kind: 'fbr-invoice' as const, animate: true } } } : {}),
      },
      {
        type: 'answerBox',
        heading: 'Who, when and what if not',
        facts: [
          { label: 'Who', value: `${SAMPLE} Which businesses must integrate` },
          { label: 'Deadline', value: `${SAMPLE} The date from the notification` },
          { label: 'Penalty', value: `${SAMPLE} As stated in the rule` },
        ],
        romanUrdu: `${SAMPLE} Roman Urdu me mukhtasar jawab: kis ko ${short} se POS jorna hai aur kab tak.`,
      },
      ...(rich
        ? [
            {
              type: 'richText' as const,
              markdown:
                `## What ${short} POS integration means\n\n${SAMPLE} Each sale at the counter is reported to ${spec.name} as it happens, and the receipt carries an invoice number and QR code issued by the authority. ` +
                `The writer explains it in plain words and links the official page.\n\n## Who must comply\n\n${SAMPLE} The categories of business named in the notification, quoted with its number.\n\n` +
                `### Businesses that are usually asked first\n\n${SAMPLE} Only what the rule says, with a source.`,
            },
            {
              type: 'steps' as const,
              heading: `How to get ${short}-ready with Nafaa`,
              items: [
                { title: 'Register with the authority', body: `${SAMPLE} The registration step on the ${short} portal, with a link.` },
                { title: 'Connect Nafaa', body: `${SAMPLE} Where the integration setting lives in Nafaa and what it asks for.` },
                { title: 'Make a test sale', body: `${SAMPLE} What a correct receipt shows, with a screenshot of the real receipt.` },
              ],
            },
            {
              type: 'richText' as const,
              markdown: `## How Nafaa handles it\n\nNafaa is an {{fact:compliance.fbrPra}}. ${SAMPLE} The writer explains, from the app, how invoices are sent and what the counter shows when the authority cannot be reached.`,
            },
          ]
        : []),
      { type: 'faq', heading: `${short} questions` },
      { type: 'sources', items: [source] },
    ],
    faqs: [SEED_FAQS.offline, SEED_FAQS.devices],
    tags: {
      CITY: spec.cities.map((c) => card({ type: 'CITY', path: `/pos-software/${c.slug}`, title: c.name, icon: 'map-pin' })),
      INDUSTRY: [INDUSTRY_CARDS.restaurant, INDUSTRY_CARDS.kiryana],
    },
  });
}

export const COMPLIANCE_FIXTURES: PublicEntry[] = SPECS.map((spec, i) => compliancePage(spec, i < 2));
