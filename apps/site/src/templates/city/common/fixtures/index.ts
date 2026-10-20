/**
 * Development fixture provider for the S4 templates. Loaded only through the
 * dynamic import in ../data.ts, which production builds remove.
 *
 * - Every fixture is checked against the contract's `publicEntrySchema` once,
 *   so a template never renders a shape the API could not send.
 * - Tokens are resolved here the way the API resolves them: prices from the
 *   real Plan table, `{{fact:...}}` from the seed's entity settings.
 */
import {
  entryCardSchema,
  publicEntrySchema,
  type EntryCard,
  type PublicEntity,
  type PublicEntry,
} from '@/lib/cms/contract/cms-contract';
import type { EntriesQuery } from '@/lib/cms/client';
import { loadPlans, summarisePlans } from '../plans';
import { cardOf } from './factory';
import { CITY_FIXTURES, PAIR_FIXTURES } from './cities';
import { BEST_FIXTURES, COMPARE_FIXTURES } from './compare';
import { COMPLIANCE_FIXTURES } from './compliance';

const ALL: PublicEntry[] = [...CITY_FIXTURES, ...PAIR_FIXTURES, ...COMPLIANCE_FIXTURES, ...COMPARE_FIXTURES, ...BEST_FIXTURES];
const BY_PATH = new Map(ALL.map((e) => [e.path, e]));

/** The seed's entity settings (apps/api/prisma/seed-marketing-cms/content/settings.ts), as the API would serve them. */
const ENTITY: PublicEntity = {
  brandName: 'Nafaa',
  disambiguatingDescription: 'Nafaa (nafaa.pk), Pakistani POS and business software; not NAFA Funds',
  description:
    'Nafaa is POS, stock and khata software for shops and businesses in Pakistan, with apps for each industry and billing that keeps working without internet.',
  founderIds: [],
  offices: [],
  contact: { email: 'info@nafaa.pk', phone: '+92 324 1772933' },
  compliance: {
    fbrPra: {
      text: 'FBR & PRA approved POS integrator',
      evidenceRef: 'Owner statement (20 Oct 2026). Approval letter or licence number to be filed before launch (O2).',
    },
  },
  platforms: ['Web browser'],
  languages: ['English', 'Roman Urdu'],
  sameAs: [],
  counts: { industries: 0, cities: 0, integrationsLive: 0, glossaryTerms: 0, posts: 0 },
  plans: [],
  minPaidMonthly: null,
  generatedAt: new Date(0).toISOString(),
};

let validated = false;
function validateOnce() {
  if (validated) return;
  validated = true;
  for (const fixture of ALL) {
    const result = publicEntrySchema.safeParse(fixture);
    if (!result.success) {
      console.warn(`[s4 fixtures] ${fixture.path} does not match the contract:`, result.error.issues.slice(0, 5));
    }
  }
}

async function resolveTokens<T>(value: T): Promise<T> {
  const plans = summarisePlans(await loadPlans());
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Karachi' }).format(new Date());
  const json = JSON.stringify(value)
    .replaceAll('{{price:min.monthly}}', plans.minPaidMonthly ?? 'the price on the pricing page')
    .replaceAll('{{fact:compliance.fbrPra}}', ENTITY.compliance.fbrPra?.text ?? '')
    .replaceAll('{{year}}', year);
  return JSON.parse(json) as T;
}

export async function fixtureEntry(path: string, locale: string): Promise<PublicEntry | null> {
  if (locale !== 'en') return null;
  validateOnce();
  const found = BY_PATH.get(path);
  return found ? resolveTokens(found) : null;
}

export function fixtureCards(query: EntriesQuery): EntryCard[] {
  if ((query.locale ?? 'en') !== 'en') return [];
  const items = ALL.filter((e) => e.type === query.type)
    .filter((e) => !query.parentId || e.parent?.id === query.parentId)
    .map(cardOf);
  const sorted = query.sort === 'title' ? [...items].sort((a, b) => a.title.localeCompare(b.title)) : items;
  const limited = query.limit ? sorted.slice(0, query.limit) : sorted;
  return limited.map((c) => entryCardSchema.parse(c));
}

export function fixtureEntity(): PublicEntity {
  return ENTITY;
}
