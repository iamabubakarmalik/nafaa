/**
 * Builder for deep city hubs (/pos-software/{city}).
 *
 * Each city file supplies its own copy: markets and areas (rendered by the
 * cityFacts block as H3s, never URLs), the trades that shape the city, local
 * working conditions, a city-specific table and setup steps, and a short
 * question-and-answer section. This file only fixes the block order so every
 * hub reads the same way; none of the prose lives here.
 *
 * Market and area notes describe what each place is publicly known for. They
 * make no claim about Nafaa customers, offices or staff in the city.
 */

import { withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';
import type { Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { SHOT, heroBlock, pricing, prose, shot, steps, table, type ShotSpec } from '../main-pages/_build';

export interface CityMarket {
  name: string;
  area?: string;
  note: string;
}

export interface CityCopy {
  slug: string;
  name: string;
  summary: string;
  /** Meta description, 120-160 characters (the summary is longer). */
  seoDescription?: string;
  hero: { sub: string; media: { id: string; url: string }; badges: string[] };
  facts: [label: string, value: string][];
  romanUrdu: string;
  /** "## ..." markdown: the city's trade and the Nafaa screens that fit it. */
  trades: string;
  markets: CityMarket[];
  areas: { name: string; note: string }[];
  /** "## ..." markdown: power, connectivity, languages, payments. */
  local: string;
  shot: ShotSpec;
  table: {
    heading: string;
    caption: string;
    columns: { key: string; label: string }[];
    rows: [string, ...string[]][];
  };
  steps: { heading: string; intro?: string; items: [string, string][] };
  /** "## ..." markdown with "###" questions written for this city. */
  questions: string;
  support: string;
  pricingHeading: string;
  cta: { heading: string; body: string };
  faqKeys: string[];
  relations: { ref: EntryRef; kind: 'TAG' | 'RELATED' }[];
  evidence: string[];
  /** Public sources for city facts, on top of the Wikidata id. */
  sources: Source[];
  factCheckNote: string;
  checkedOn: string;
  needsOwner?: string[];
}

/** Evidence shared by every hub: offline counter, khata, wallets, Urdu UI, branches. */
export const BASE_EVIDENCE = [
  'apps/web/src/core/lib/offline/offlineSales.ts',
  'apps/web/src/modules/customers/khata',
  'apps/web/src/core/payments/payQr.ts',
  'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
  'apps/web/src/core/i18n/messages/ur.json',
  'apps/web/src/modules/organization/shops',
  'apps/web/src/modules/inventory/transfers',
];

export function wikipedia(title: string, accessedAt: string): Source {
  return {
    title: `${title.replace(/_/g, ' ')} (Wikipedia)`,
    url: `https://en.wikipedia.org/wiki/${title.replace(/ /g, '_')}`,
    publisher: 'Wikipedia',
    accessedAt,
  };
}

/** Returns the enrich function that turns the stub hub from index.ts into the deep hub. */
export function cityHub(copy: CityCopy): (base: SeedEntry) => SeedEntry {
  return (base) => {
    const key = `CITY:${copy.slug}`;
    return {
      ...base,
      summary: copy.summary,
      ...(copy.seoDescription ? { seoDescription: copy.seoDescription } : {}),
      data: {
        ...base.data,
        markets: copy.markets,
        areas: copy.areas,
        support: { onsite: false, note: copy.support },
      },
      blocks: withIds(key, [
        heroBlock({
          eyebrow: `POS software in ${copy.name}`,
          heading: copy.name,
          sub: copy.hero.sub,
          media: copy.hero.media,
          badges: copy.hero.badges,
        }),
        {
          type: 'answerBox',
          facts: copy.facts.map(([label, value]) => ({ label, value })),
          romanUrdu: copy.romanUrdu,
        },
        { type: 'cityFacts', show: ['tax'], heading: `Sales tax in ${copy.name}` },
        prose(copy.trades),
        { type: 'cityFacts', show: ['markets', 'areas'], heading: 'Markets and areas' },
        prose(copy.local),
        shot(copy.shot),
        table(copy.table.heading, copy.table.caption, copy.table.columns, copy.table.rows),
        steps(copy.steps.heading, copy.steps.items, copy.steps.intro),
        prose(copy.questions),
        { type: 'cityFacts', show: ['support'], heading: `Support in ${copy.name}` },
        pricing(copy.pricingHeading),
        { type: 'faq', heading: 'More questions' },
        {
          type: 'cta',
          heading: copy.cta.heading,
          body: copy.cta.body,
          primaryCta: { label: 'Start free trial', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
          secondaryCta: { label: 'Ask on WhatsApp', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
        },
      ] as never),
      faqKeys: copy.faqKeys,
      relations: copy.relations,
      evidence: [...new Set([...BASE_EVIDENCE, ...copy.evidence])],
      sources: [...(base.sources ?? []), ...copy.sources],
      factCheck: { checkedOn: copy.checkedOn, note: copy.factCheckNote },
      needsOwner: [...base.needsOwner, ...(copy.needsOwner ?? [])],
    };
  };
}

export { SHOT };
