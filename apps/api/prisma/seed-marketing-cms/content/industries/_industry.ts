/**
 * Builder for INDUSTRY seed entries.
 *
 * Every industry page starts from the same honest skeleton: hero, short
 * answer with a Roman Urdu summary, the features that exist in the app for
 * that industry, FAQs where real ones exist, and a closing CTA. The pages stay
 * below the 700-word gate (and so noindex) until Phase 4 writers add the deep
 * copy in these same files.
 */

import type { DraftBlock, IconName } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { answerBox, cta, faq, featuresGrid, hero, withIds, writerNotes } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';

export const INDUSTRY_CHECKED_ON = '2026-10-20';

export interface IndustrySpec {
  slug: string;
  title: string;
  shortName: string;
  shopNoun: string;
  romanUrduName: string;
  group: 'retail' | 'food' | 'health' | 'specialty' | 'service' | 'lifestyle';
  icon: IconName;
  /** Accent with at least 4.5:1 contrast against white. */
  color: string;
  /** Set when the app's identity colour failed contrast and a darker shade is seeded. */
  colorNote?: string;
  /** Industry pack id in apps/web/src/industries (design-system identity id). */
  appIndustryKey: string;
  /** Business type the sign-up flow stores for this card (industry-choices.ts). */
  businessType: string;
  /** 40-60 words, every claim backed by `evidence`. */
  summary: string;
  /** "Who it is for" fact. */
  builtFor: string;
  /** Roman Urdu summary, at most 60 words. */
  romanUrdu: string;
  /** 3-12 features that exist in the app today. */
  features: { icon: IconName; title: string; body: string }[];
  faqKeys?: string[];
  featured?: boolean;
  sortOrder: number;
  evidence: string[];
  dropped: string[];
  needsOwner?: string[];
  /** Notes for the Phase 4 writer (hidden block). */
  writerNotes?: string;
  /** Deep copy (Phase 4 and D2): a shorter hero with a screenshot, and extra blocks after the features. */
  heroOverride?: { heading?: string; sub: string; badges?: string[]; media?: { mediaId: string; url?: string; frame?: 'browser' | 'phone' | 'tablet' } };
  deepBlocks?: Omit<DraftBlock, 'id'>[];
}

/** Facts every industry page shares. Prices and the compliance line come from tokens. */
function sharedFacts(spec: IndustrySpec): { label: string; value: string }[] {
  return [
    { label: 'Built for', value: spec.builtFor },
    { label: 'Everyday tools', value: 'Counter (POS), stock, khata (udhaar) and reports in one app' },
    { label: 'Without internet', value: 'The counter keeps billing offline and sends the sales when the connection returns' },
    { label: 'Price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
    { label: 'Tax', value: 'Optional FBR/PRA integration, only if you need it' },
  ];
}

const SHARED_EVIDENCE = [
  'apps/web/src/design-system/industries/identities.ts',
  'apps/web/src/modules/auth/lib/industry-choices.ts',
  'apps/web/src/core/lib/offline/offlineSales.ts',
  'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
];

function heroBlock(spec: IndustrySpec): Omit<DraftBlock, 'id'> {
  const base = hero(spec.heroOverride?.sub ?? spec.summary, { eyebrow: `For ${spec.shopNoun}`, heading: spec.heroOverride?.heading, badges: spec.heroOverride?.badges });
  const media = spec.heroOverride?.media;
  if (!media) return base;
  return { ...base, layout: 'centered', media: { kind: 'screenshot', mediaId: media.mediaId, frame: media.frame ?? 'browser', ...(media.url ? { url: media.url } : {}) } } as Omit<DraftBlock, 'id'>;
}

export function industry(spec: IndustrySpec): SeedEntry {
  const key = `INDUSTRY:${spec.slug}`;
  const notes = [
    `App pack: apps/web/src/industries/${spec.appIndustryKey}. Sign-up business type: ${spec.businessType}.`,
    'Deep copy (Phase 4): write from the real screens of this pack; every claim needs a file in evidence.',
    spec.writerNotes ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    type: 'INDUSTRY',
    slug: spec.slug,
    title: spec.title,
    summary: spec.summary,
    data: {
      icon: spec.icon,
      color: spec.color,
      group: spec.group,
      shortName: spec.shortName,
      shopNoun: spec.shopNoun,
      romanUrduName: spec.romanUrduName,
      appIndustryKey: spec.appIndustryKey,
    },
    blocks: withIds(key, [
      heroBlock(spec),
      answerBox(sharedFacts(spec), spec.romanUrdu),
      featuresGrid(`What Nafaa does for ${spec.shopNoun}`, spec.features),
      ...(spec.deepBlocks ?? []),
      ...(spec.faqKeys?.length ? [faq()] : []),
      cta(`Try Nafaa in your ${spec.shortName.toLowerCase()} business`, 'Start with the free trial. No card needed.'),
      writerNotes(notes),
    ]),
    faqKeys: spec.faqKeys ?? [],
    featured: spec.featured ?? false,
    sortOrder: spec.sortOrder,
    origin: `apps/marketing/src/lib/data/industries.ts#${spec.slug}`,
    evidence: [...SHARED_EVIDENCE, ...spec.evidence],
    factCheck: {
      checkedOn: INDUSTRY_CHECKED_ON,
      note: `Features compared with the ${spec.appIndustryKey} pack (navigation, routes and description) and the shared modules. ${spec.colorNote ?? 'Colour is the app identity colour.'}`,
    },
    dropped: [
      'Emoji, gradients, aurora colours and Urdu Nastaliq strings (design now comes from the site tokens).',
      '"Only POS with ..." signature line (unprovable superlative).',
      ...spec.dropped,
    ],
    needsOwner: spec.needsOwner ?? [],
  };
}
