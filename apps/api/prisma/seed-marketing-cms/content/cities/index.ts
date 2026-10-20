/**
 * The 12 city hubs (/pos-software/{city}) imported from apps/marketing
 * cities.ts. Kept: name, province, tax authority, coordinates and the Wikidata
 * id (looked up on 20 Oct 2026). Dropped: activeShops, topIndustries and every
 * count. The city-specific copy (tax rates with sources, markets, areas,
 * support, nearby cities) is Phase 5 work for W7 and W8; until then each hub
 * stays a short draft below the 700-word gate.
 */

import { answerBox, hero, withIds, writerNotes } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';

type Province = 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad Capital Territory';
type Authority = 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT';

const CHECKED_ON = '2026-10-20';

const AUTHORITY_NAME: Record<Authority, string> = {
  PRA: 'the Punjab Revenue Authority (PRA)',
  SRB: 'the Sindh Revenue Board (SRB)',
  KPRA: 'the Khyber Pakhtunkhwa Revenue Authority (KPRA)',
  BRA: 'the Balochistan Revenue Authority (BRA)',
  ICT: 'FBR under the Islamabad Capital Territory services tax law',
};

interface CitySpec {
  slug: string;
  name: string;
  province: Province;
  authority: Authority;
  wikidataId: string;
  wikiTitle: string;
  geo: { lat: number; lng: number };
  featured?: boolean;
  /** Markets and areas named in PLAN section 5: writer notes only, not facts yet. */
  planNotes?: string;
}

const CITIES: CitySpec[] = [
  { slug: 'karachi', name: 'Karachi', province: 'Sindh', authority: 'SRB', wikidataId: 'Q8660', wikiTitle: 'Karachi', geo: { lat: 24.8607, lng: 67.0011 }, featured: true, planNotes: 'Markets to research: Saddar, Tariq Road, Jodia Bazaar. Areas: DHA, Gulshan. Candidate FAQ: "Do Karachi restaurants need SRB integration?"' },
  { slug: 'lahore', name: 'Lahore', province: 'Punjab', authority: 'PRA', wikidataId: 'Q11739', wikiTitle: 'Lahore', geo: { lat: 31.5204, lng: 74.3587 }, featured: true, planNotes: 'Markets to research: Hall Road, Anarkali, Liberty, Shah Alam. Areas: Gulberg, Johar Town, DHA.' },
  { slug: 'islamabad', name: 'Islamabad', province: 'Islamabad Capital Territory', authority: 'ICT', wikidataId: 'Q1362', wikiTitle: 'Islamabad', geo: { lat: 33.6844, lng: 73.0479 }, featured: true },
  { slug: 'rawalpindi', name: 'Rawalpindi', province: 'Punjab', authority: 'PRA', wikidataId: 'Q93230', wikiTitle: 'Rawalpindi', geo: { lat: 33.5651, lng: 73.0169 }, planNotes: 'Markets to research: Raja Bazaar, Saddar. Area: Bahria Town.' },
  { slug: 'faisalabad', name: 'Faisalabad', province: 'Punjab', authority: 'PRA', wikidataId: 'Q173985', wikiTitle: 'Faisalabad', geo: { lat: 31.4504, lng: 73.135 }, featured: true, planNotes: 'Markets to research: cloth markets, Kapra Mandi.' },
  { slug: 'multan', name: 'Multan', province: 'Punjab', authority: 'PRA', wikidataId: 'Q185453', wikiTitle: 'Multan', geo: { lat: 30.1575, lng: 71.5249 } },
  { slug: 'peshawar', name: 'Peshawar', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q1113311', wikiTitle: 'Peshawar', geo: { lat: 34.0151, lng: 71.5249 } },
  { slug: 'quetta', name: 'Quetta', province: 'Balochistan', authority: 'BRA', wikidataId: 'Q185458', wikiTitle: 'Quetta', geo: { lat: 30.1798, lng: 66.9749 } },
  { slug: 'gujranwala', name: 'Gujranwala', province: 'Punjab', authority: 'PRA', wikidataId: 'Q243322', wikiTitle: 'Gujranwala', geo: { lat: 32.1877, lng: 74.1945 }, planNotes: 'Appliance market; PLAN says the HQ is here (owner decision O4: confirm the address before naming it).' },
  { slug: 'sialkot', name: 'Sialkot', province: 'Punjab', authority: 'PRA', wikidataId: 'Q643883', wikiTitle: 'Sialkot', geo: { lat: 32.4945, lng: 74.5229 }, planNotes: 'Sports goods and surgical instrument exporters.' },
  { slug: 'hyderabad', name: 'Hyderabad', province: 'Sindh', authority: 'SRB', wikidataId: 'Q1640079', wikiTitle: 'Hyderabad, Pakistan', geo: { lat: 25.396, lng: 68.3578 } },
  { slug: 'bahawalpur', name: 'Bahawalpur', province: 'Punjab', authority: 'PRA', wikidataId: 'Q318156', wikiTitle: 'Bahawalpur', geo: { lat: 29.3956, lng: 71.6836 } },
];

function city(c: CitySpec, index: number): SeedEntry {
  const key = `CITY:${c.slug}`;
  const tax = AUTHORITY_NAME[c.authority];
  const summary =
    `Nafaa is POS, stock and khata software for shops in ${c.name}. It runs in the browser, keeps billing without internet, ` +
    `and keeps udhaar in a digital khata. In ${c.name}, sales tax on services is collected by ${tax}, while sales tax on goods is collected by FBR.`;
  return {
    type: 'CITY',
    slug: c.slug,
    title: c.name,
    summary,
    data: {
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
    blocks: withIds(key, [
      hero(summary, { eyebrow: `POS software in ${c.name}` }),
      answerBox(
        [
          { label: 'Services tax', value: c.authority === 'ICT' ? 'FBR (Islamabad Capital Territory)' : tax.replace(/^the /, '') },
          { label: 'Goods tax', value: 'FBR (Federal Board of Revenue)' },
          { label: 'Setup', value: 'Remote setup and support on WhatsApp' },
          { label: 'Price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
        ],
        `${c.name} ki dukaanon ke liye Nafaa: POS, stock aur khata ek app me. Internet na ho to bhi bill bante rehte hain.`,
      ),
      writerNotes(
        [
          'City hub (Phase 5, W7/W8): at least 700 words written for this city only, under 50% 5-gram similarity with other hubs.',
          `Add servicesTax with a dated official source (${c.authority === 'ICT' ? 'fbr.gov.pk' : c.authority.toLowerCase() + ' website'}), Tier-1 note, markets, areas (H3s, never URLs), real support, 3 nearby cities.`,
          c.planNotes ? `PLAN 5 notes: ${c.planNotes}` : '',
          'Real customers only with consent. No shop counts.',
        ]
          .filter(Boolean)
          .join('\n\n'),
      ),
    ]),
    featured: c.featured ?? false,
    sortOrder: index + 1,
    origin: `apps/marketing/src/lib/data/cities.ts#${c.slug}`,
    evidence: [],
    sources: [
      {
        title: `${c.wikiTitle} (Wikidata ${c.wikidataId})`,
        url: `https://www.wikidata.org/wiki/${c.wikidataId}`,
        publisher: 'Wikidata',
        accessedAt: CHECKED_ON,
      },
    ],
    factCheck: {
      checkedOn: CHECKED_ON,
      note: 'Wikidata id from the enwiki sitelink via the Wikidata API. Province and authority mapping as in PLAN section 5. The services-tax rate is not stated until a dated official source is added.',
    },
    dropped: [
      `activeShops count and the "topIndustries" list (invented).`,
      'Urdu Nastaliq name.',
    ],
    needsOwner: c.slug === 'gujranwala' ? ['HQ address and on-site support (O4) before the hub names an office.'] : [],
  };
}

export const cities: SeedEntry[] = CITIES.map(city);
