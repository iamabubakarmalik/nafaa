/**
 * City hubs (/pos-software/{city}). The first 12 were imported from
 * apps/marketing cities.ts; later cities were added on 26 Oct 2026. Kept here:
 * name, province, tax authority, coordinates and the Wikidata id (looked up
 * through the Wikidata API). Dropped: activeShops, topIndustries and every
 * count. Each city's copy (markets, areas, trades, setup) lives in its own
 * file, content/cities/<slug>.ts, and replaces the stub built below. A city
 * without its own file stays a short draft below the 700-word gate.
 */

import { answerBox, hero, withIds, writerNotes } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';
import { enrichLahore } from './lahore';
import { enrichKarachi } from './karachi';
import { enrichIslamabad } from './islamabad';
import { enrichRawalpindi } from './rawalpindi';
import { enrichFaisalabad } from './faisalabad';
import { enrichMultan } from './multan';
import { enrichPeshawar } from './peshawar';
import { enrichQuetta } from './quetta';
import { enrichHyderabad } from './hyderabad';
import { enrichGujranwala } from './gujranwala';
import { enrichSialkot } from './sialkot';
import { enrichBahawalpur } from './bahawalpur';
import { enrichSargodha } from './sargodha';
import { enrichSukkur } from './sukkur';
import { enrichLarkana } from './larkana';
import { enrichAbbottabad } from './abbottabad';
import { enrichMardan } from './mardan';
import { enrichSahiwal } from './sahiwal';
import { enrichSheikhupura } from './sheikhupura';
import { enrichRahimYarKhan } from './rahim-yar-khan';
import { enrichDeraGhaziKhan } from './dera-ghazi-khan';
import { enrichGujrat } from './gujrat';
import { enrichKasur } from './kasur';
import { enrichOkara } from './okara';
import { enrichMirpurKhas } from './mirpur-khas';
import { enrichChiniot } from './chiniot';
import { enrichKamoke } from './kamoke';
import { enrichWahCantt } from './wah-cantt';
import { enrichMingora } from './mingora';
import { enrichJhelum } from './jhelum';
import { enrichDeraIsmailKhan } from './dera-ismail-khan';

type Province = 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad Capital Territory';
type Authority = 'PRA' | 'SRB' | 'KPRA' | 'BRA' | 'ICT';

const CHECKED_ON = '2026-10-20';
const ADDED = '2026-10-26';

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
  /** Set for cities added after the apps/marketing import (no source entry to point at). */
  addedOn?: string;
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
  // Added 26 Oct 2026 (Wikidata ids and coordinates from the Wikidata API).
  { slug: 'sargodha', name: 'Sargodha', province: 'Punjab', authority: 'PRA', wikidataId: 'Q855997', wikiTitle: 'Sargodha', geo: { lat: 32.0836, lng: 72.6711 }, addedOn: ADDED },
  { slug: 'sukkur', name: 'Sukkur', province: 'Sindh', authority: 'SRB', wikidataId: 'Q868631', wikiTitle: 'Sukkur', geo: { lat: 27.6995, lng: 68.8673 }, addedOn: ADDED },
  { slug: 'larkana', name: 'Larkana', province: 'Sindh', authority: 'SRB', wikidataId: 'Q696605', wikiTitle: 'Larkana', geo: { lat: 27.56, lng: 68.2264 }, addedOn: ADDED },
  { slug: 'abbottabad', name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q170315', wikiTitle: 'Abbottabad', geo: { lat: 34.15, lng: 73.2167 }, addedOn: ADDED },
  { slug: 'mardan', name: 'Mardan', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q993859', wikiTitle: 'Mardan', geo: { lat: 34.1958, lng: 72.0447 }, addedOn: ADDED },
  { slug: 'sahiwal', name: 'Sahiwal', province: 'Punjab', authority: 'PRA', wikidataId: 'Q523778', wikiTitle: 'Sahiwal', geo: { lat: 30.6706, lng: 73.1064 }, addedOn: ADDED },
  { slug: 'sheikhupura', name: 'Sheikhupura', province: 'Punjab', authority: 'PRA', wikidataId: 'Q972756', wikiTitle: 'Sheikhupura', geo: { lat: 31.7083, lng: 74 }, addedOn: ADDED },
  { slug: 'rahim-yar-khan', name: 'Rahim Yar Khan', province: 'Punjab', authority: 'PRA', wikidataId: 'Q989297', wikiTitle: 'Rahim Yar Khan', geo: { lat: 28.4206, lng: 70.3033 }, addedOn: ADDED },
  { slug: 'dera-ghazi-khan', name: 'Dera Ghazi Khan', province: 'Punjab', authority: 'PRA', wikidataId: 'Q999076', wikiTitle: 'Dera Ghazi Khan', geo: { lat: 30.05, lng: 70.6333 }, addedOn: ADDED },
  { slug: 'gujrat', name: 'Gujrat', province: 'Punjab', authority: 'PRA', wikidataId: 'Q929062', wikiTitle: 'Gujrat, Pakistan', geo: { lat: 32.5736, lng: 74.0789 }, addedOn: ADDED },
  { slug: 'kasur', name: 'Kasur', province: 'Punjab', authority: 'PRA', wikidataId: 'Q989283', wikiTitle: 'Kasur', geo: { lat: 31.1167, lng: 74.45 }, addedOn: ADDED },
  { slug: 'okara', name: 'Okara', province: 'Punjab', authority: 'PRA', wikidataId: 'Q968211', wikiTitle: 'Okara, Pakistan', geo: { lat: 30.81, lng: 73.4597 }, addedOn: ADDED },
  { slug: 'mirpur-khas', name: 'Mirpur Khas', province: 'Sindh', authority: 'SRB', wikidataId: 'Q1020490', wikiTitle: 'Mirpur Khas', geo: { lat: 25.5269, lng: 69.0111 }, addedOn: ADDED },
  { slug: 'chiniot', name: 'Chiniot', province: 'Punjab', authority: 'PRA', wikidataId: 'Q1017651', wikiTitle: 'Chiniot', geo: { lat: 31.7167, lng: 72.9833 }, addedOn: ADDED },
  { slug: 'kamoke', name: 'Kamoke', province: 'Punjab', authority: 'PRA', wikidataId: 'Q1260929', wikiTitle: 'Kamoke', geo: { lat: 31.9744, lng: 74.2244 }, addedOn: ADDED },
  { slug: 'wah-cantt', name: 'Wah Cantt', province: 'Punjab', authority: 'PRA', wikidataId: 'Q1251261', wikiTitle: 'Wah Cantonment', geo: { lat: 33.7892, lng: 72.7253 }, addedOn: ADDED },
  { slug: 'mingora', name: 'Mingora', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q31356', wikiTitle: 'Mingora', geo: { lat: 34.7717, lng: 72.36 }, addedOn: ADDED },
  { slug: 'jhelum', name: 'Jhelum', province: 'Punjab', authority: 'PRA', wikidataId: 'Q121551', wikiTitle: 'Jhelum', geo: { lat: 32.9333, lng: 73.7333 }, addedOn: ADDED },
  { slug: 'dera-ismail-khan', name: 'Dera Ismail Khan', province: 'Khyber Pakhtunkhwa', authority: 'KPRA', wikidataId: 'Q1249888', wikiTitle: 'Dera Ismail Khan', geo: { lat: 31.8167, lng: 70.9167 }, addedOn: ADDED },
];

function city(c: CitySpec, index: number): SeedEntry {
  const key = `CITY:${c.slug}`;
  const summary =
    `Nafaa is POS, stock and khata software for shops, restaurants and wholesalers in ${c.name}. It runs in the browser on any phone or computer, keeps billing without internet, ` +
    `and keeps udhaar in a digital khata, with screens for each trade, online orders and setup help on WhatsApp.`;
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
          { label: 'Runs on', value: 'The phone, tablet or computer you already have, also without internet' },
          { label: 'For', value: 'Shops, restaurants, wholesalers, online sellers and service businesses' },
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
    origin: c.addedOn ? 'new' : `apps/marketing/src/lib/data/cities.ts#${c.slug}`,
    evidence: [],
    sources: [
      {
        title: `${c.wikiTitle} (Wikidata ${c.wikidataId})`,
        url: `https://www.wikidata.org/wiki/${c.wikidataId}`,
        publisher: 'Wikidata',
        accessedAt: c.addedOn ?? CHECKED_ON,
      },
    ],
    factCheck: {
      checkedOn: c.addedOn ?? CHECKED_ON,
      note: 'Wikidata id from the enwiki sitelink via the Wikidata API. Province and authority mapping as in PLAN section 5. The services-tax rate is not stated until a dated official source is added.',
    },
    dropped: c.addedOn
      ? []
      : [`activeShops count and the "topIndustries" list (invented).`, 'Urdu Nastaliq name.'],
    needsOwner: c.slug === 'gujranwala' ? ['HQ address and on-site support (O4) before the hub names an office.'] : [],
  };
}

/** Deep copy per city; a city missing here keeps the stub. */
const ENRICH: Record<string, (base: SeedEntry) => SeedEntry> = {
  lahore: enrichLahore,
  karachi: enrichKarachi,
  islamabad: enrichIslamabad,
  rawalpindi: enrichRawalpindi,
  faisalabad: enrichFaisalabad,
  multan: enrichMultan,
  peshawar: enrichPeshawar,
  quetta: enrichQuetta,
  hyderabad: enrichHyderabad,
  gujranwala: enrichGujranwala,
  sialkot: enrichSialkot,
  bahawalpur: enrichBahawalpur,
  sargodha: enrichSargodha,
  sukkur: enrichSukkur,
  larkana: enrichLarkana,
  abbottabad: enrichAbbottabad,
  mardan: enrichMardan,
  sahiwal: enrichSahiwal,
  sheikhupura: enrichSheikhupura,
  'rahim-yar-khan': enrichRahimYarKhan,
  'dera-ghazi-khan': enrichDeraGhaziKhan,
  gujrat: enrichGujrat,
  kasur: enrichKasur,
  okara: enrichOkara,
  'mirpur-khas': enrichMirpurKhas,
  chiniot: enrichChiniot,
  kamoke: enrichKamoke,
  'wah-cantt': enrichWahCantt,
  mingora: enrichMingora,
  jhelum: enrichJhelum,
  'dera-ismail-khan': enrichDeraIsmailKhan,
};

export const cities: SeedEntry[] = CITIES.map((c, i) => {
  const enrich = ENRICH[c.slug];
  return enrich ? enrich(city(c, i)) : city(c, i);
});
