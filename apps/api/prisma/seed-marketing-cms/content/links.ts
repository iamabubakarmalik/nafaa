/**
 * Inbound-link top-up. The CMS warns when fewer than three pages link to an
 * entry, and only relations count (template-generated links do not). This
 * pass runs after the bridges and adds sensible RELATED relations from
 * neighbouring entries until every published entry has at least three:
 *
 * - cities: the nearest cities, and the industries that have a city page there
 * - industries: sibling trades, the cities that have a page for the trade, the core products
 * - glossary, blog, tools, templates, help articles: entries on the same topic
 * - hubs and landing pages: the entries they are about
 * - comparisons: the matching alternative page and the other comparisons
 *
 * Urdu entries only receive links from Urdu entries.
 */

import type { EntryRef, SeedEntry } from '../lib/types';
import { REF, targetFor } from './bridges';

const MIN = 3;
const SOFT_CAP = 5;

const NEAR: Record<string, string[]> = {
  lahore: ['sheikhupura', 'kasur', 'gujranwala', 'okara'],
  faisalabad: ['chiniot', 'sargodha', 'sahiwal', 'lahore'],
  rawalpindi: ['islamabad', 'wah-cantt', 'jhelum', 'abbottabad'],
  multan: ['bahawalpur', 'sahiwal', 'rahim-yar-khan', 'dera-ghazi-khan'],
  gujranwala: ['kamoke', 'sialkot', 'gujrat', 'sheikhupura'],
  sialkot: ['gujranwala', 'gujrat', 'kamoke', 'jhelum'],
  bahawalpur: ['multan', 'rahim-yar-khan', 'sahiwal', 'dera-ghazi-khan'],
  sargodha: ['faisalabad', 'chiniot', 'jhelum', 'gujrat'],
  sheikhupura: ['lahore', 'kamoke', 'gujranwala', 'kasur'],
  'rahim-yar-khan': ['bahawalpur', 'multan', 'sukkur', 'dera-ghazi-khan'],
  'dera-ghazi-khan': ['multan', 'rahim-yar-khan', 'bahawalpur', 'dera-ismail-khan'],
  gujrat: ['gujranwala', 'sialkot', 'jhelum', 'kamoke'],
  kasur: ['lahore', 'okara', 'sheikhupura', 'sahiwal'],
  okara: ['sahiwal', 'kasur', 'lahore', 'faisalabad'],
  sahiwal: ['okara', 'multan', 'faisalabad', 'kasur'],
  chiniot: ['faisalabad', 'sargodha', 'sahiwal', 'lahore'],
  kamoke: ['gujranwala', 'sheikhupura', 'lahore', 'gujrat'],
  'wah-cantt': ['rawalpindi', 'islamabad', 'jhelum', 'abbottabad'],
  jhelum: ['gujrat', 'rawalpindi', 'wah-cantt', 'sargodha'],
  islamabad: ['rawalpindi', 'wah-cantt', 'jhelum', 'abbottabad'],
  karachi: ['hyderabad', 'mirpur-khas', 'sukkur', 'larkana'],
  hyderabad: ['karachi', 'mirpur-khas', 'sukkur', 'larkana'],
  sukkur: ['larkana', 'rahim-yar-khan', 'hyderabad', 'karachi'],
  larkana: ['sukkur', 'hyderabad', 'karachi', 'mirpur-khas'],
  'mirpur-khas': ['hyderabad', 'karachi', 'sukkur', 'larkana'],
  peshawar: ['mardan', 'mingora', 'abbottabad', 'dera-ismail-khan'],
  mardan: ['peshawar', 'mingora', 'abbottabad', 'islamabad'],
  mingora: ['mardan', 'peshawar', 'abbottabad', 'rawalpindi'],
  abbottabad: ['mardan', 'islamabad', 'rawalpindi', 'peshawar'],
  'dera-ismail-khan': ['peshawar', 'dera-ghazi-khan', 'mardan', 'multan'],
  quetta: ['karachi', 'sukkur', 'multan', 'dera-ghazi-khan'],
};

const CLUSTERS: string[][] = [
  ['kiryana', 'bakery', 'dairy', 'meat', 'restaurant', 'retail'],
  ['pharmacy', 'clinic', 'optical', 'cosmetics', 'salon'],
  ['garments', 'shoe', 'jewelry', 'cosmetics', 'carpet'],
  ['mobile-shop', 'electronics', 'appliances', 'gaming', 'autoparts'],
  ['hardware', 'furniture', 'carpet', 'appliances', 'agri'],
  ['sports', 'toystore', 'bookstore', 'gym', 'hotel'],
  ['florist', 'toystore', 'petshop', 'jewelry', 'gaming'],
  ['salon', 'services-biz', 'gym', 'clinic', 'hotel'],
];

/** Slug of a landing page or hub mapped to the entries it is about. */
const ABOUT: Record<string, EntryRef[]> = {
  solutions: ['SOLUTION:single-shop', 'SOLUTION:retail-chains', 'SOLUTION:restaurants', 'SOLUTION:wholesale-distribution', 'SOLUTION:ecommerce', 'SOLUTION:manufacturing', 'SOLUTION:enterprise'],
  services: ['SERVICE:custom-software', 'SERVICE:websites', 'SERVICE:hardware', 'SERVICE:training', 'SERVICE:data-migration', 'SERVICE:mobile-apps'],
  integrations: ['PRODUCT:payments', 'PRODUCT:fbr', 'PRODUCT:online-store', 'PRODUCT:whatsapp-sms'],
  roadmap: ['PRODUCT:ai-assistant', 'PRODUCT:offline-pos', 'PRODUCT:whatsapp-sms', 'PRODUCT:loyalty'],
  marketplace: ['PRODUCT:online-store', 'SOLUTION:ecommerce', 'SERVICE:online-store-setup', 'BLOG_POST:selling-online-pakistan', 'GUIDE:start-selling-online-pakistan'],
  faq: ['PRODUCT:pos', 'PRODUCT:khata', 'PRODUCT:inventory', 'PRODUCT:reports'],
  blog: ['BLOG_POST:how-to-reduce-udhaar', 'BLOG_POST:stock-taking-guide', 'BLOG_POST:how-to-calculate-profit-margin', 'BLOG_POST:pricing-strategy-small-shop'],
  glossary: ['GLOSSARY_TERM:pos', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:sku', 'GLOSSARY_TERM:invoice'],
  compare: ['COMPARE:nafaa-vs-digikhata', 'COMPARE:nafaa-vs-odoo', 'COMPARE:nafaa-vs-oscar-pos', 'COMPARE:nafaa-vs-zoho-inventory'],
  alternatives: ['ALTERNATIVE:digikhata-alternative', 'ALTERNATIVE:udhaar-book-alternative', 'ALTERNATIVE:tally-alternative', 'ALTERNATIVE:loyverse-alternative-pakistan'],
  compliance: ['PRODUCT:fbr', 'SERVICE:fbr-integration-setup', 'COMPLIANCE:pra-punjab', 'BLOG_POST:fbr-e-invoicing-complete-guide-2026'],
  tools: ['TOOL:profit-margin-calculator', 'TOOL:gst-calculator', 'TOOL:reorder-level-calculator', 'TOOL:barcode-generator'],
  templates: ['TEMPLATE:khata-udhaar-register', 'TEMPLATE:stock-take-sheet', 'TEMPLATE:simple-invoice-template', 'TEMPLATE:price-list-template'],
  'pos-software': ['PRODUCT:pos', 'INDUSTRY:kiryana', 'INDUSTRY:retail', 'PAGE:dukaan-ka-hisaab-app'],
  refund: ['PAGE:terms', 'PAGE:privacy', 'PAGE:cookies', 'PAGE:pricing'],
  help: ['PAGE:getting-started', 'PAGE:products-and-stock', 'PAGE:pos-counter', 'PAGE:khata-and-customers'],
  'getting-started': ['PRODUCT:pos', 'PAGE:pricing', 'PAGE:demo'],
  'products-and-stock': ['PRODUCT:inventory', 'PRODUCT:purchasing', 'GUIDE:inventory-management-small-business'],
  'pos-counter': ['PRODUCT:pos', 'PRODUCT:offline-pos', 'GLOSSARY_TERM:pos'],
  'khata-and-customers': ['PRODUCT:khata', 'GUIDE:managing-udhaar-and-khata', 'GLOSSARY_TERM:khata'],
  'reports-and-cash': ['PRODUCT:reports', 'GLOSSARY_TERM:profit-and-loss', 'BLOG_POST:daily-cash-closing-routine'],
  grow: ['PRODUCT:loyalty', 'PRODUCT:online-store', 'PRODUCT:whatsapp-sms'],
  'by-business-type': ['PAGE:industries', 'INDUSTRY:pharmacy', 'INDUSTRY:restaurant'],
  'dukaan-ka-hisaab-app': ['PRODUCT:pos', 'INDUSTRY:retail', 'INDUSTRY:kiryana', 'PAGE:pos-software'],
  'khata-app': ['PRODUCT:khata', 'INDUSTRY:kiryana', 'GLOSSARY_TERM:khata', 'GUIDE:managing-udhaar-and-khata'],
  'kiryana-store-software': ['INDUSTRY:kiryana', 'SOLUTION:single-shop', 'PAGE:pos-software', 'BLOG_POST:how-to-start-kiryana-store-pakistan'],
  'medical-store-software': ['INDUSTRY:pharmacy', 'BLOG_POST:how-to-start-a-pharmacy-pakistan', 'BLOG_POST:pharmacy-expiry-management', 'PAGE:pharmacy-batch-and-expiry'],
  'mobile-shop-software': ['INDUSTRY:mobile-shop', 'PAGE:mobile-imei-tracking', 'GLOSSARY_TERM:imei', 'BLOG_POST:mobile-shop-imei-records'],
  'kapre-ki-dukaan-software': ['INDUSTRY:garments', 'BLOG_POST:clothing-size-inventory-guide', 'PAGE:garments-size-and-colour'],
  'restaurant-billing-software': ['INDUSTRY:restaurant', 'SOLUTION:restaurants', 'GLOSSARY_TERM:kot', 'BLOG_POST:restaurant-kot-system-guide'],
  'bakery-ka-hisaab': ['INDUSTRY:bakery', 'BLOG_POST:reduce-bakery-wastage', 'PAGE:bakery-orders'],
  'offline-billing-software': ['PRODUCT:offline-pos', 'PAGE:offline-billing', 'BLOG_POST:load-shedding-proof-billing'],
  'whatsapp-udhaar-reminder': ['PRODUCT:whatsapp-sms', 'PRODUCT:khata', 'PAGE:whatsapp-reminders'],
};

const INFO = new Set(['GLOSSARY_TERM', 'BLOG_POST', 'TOOL', 'TEMPLATE', 'GUIDE', 'PAGE']);

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function applyLinks(all: SeedEntry[]): SeedEntry[] {
  const loc = (e: SeedEntry) => e.locale ?? 'en';
  const keyOf = (e: SeedEntry) => `${e.type}:${e.slug}@${loc(e)}`;
  const refKey = (ref: string, l: string) => (ref.includes('@') ? ref : `${ref}@${l}`);
  const byKey = new Map<string, SeedEntry>();
  for (const e of all) byKey.set(keyOf(e), e);
  const live = (e: SeedEntry) => !e.stub && e.slug !== '' && !['CHANGELOG', 'DOC', 'BLOG_CATEGORY', 'CITY_INDUSTRY'].includes(e.type);

  const inbound = new Map<string, Set<string>>();
  for (const e of all) {
    for (const r of e.relations ?? []) {
      const k = refKey(r.ref, loc(e));
      if (!inbound.has(k)) inbound.set(k, new Set());
      inbound.get(k)!.add(keyOf(e));
    }
  }

  const add = new Map<string, { ref: EntryRef; kind: 'RELATED' }[]>();
  const added = new Map<string, number>();

  // Topic groups for informational entries (same locale).
  const groups = new Map<string, SeedEntry[]>();
  for (const e of all) {
    if (!INFO.has(e.type) || !live(e)) continue;
    const t = targetFor(e);
    if (!t) continue;
    const g = `${loc(e)}:${t}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(e);
  }

  // City pages that exist for each industry.
  const cityPairs = new Map<string, string[]>();
  for (const e of all) {
    if (e.type !== 'CITY_INDUSTRY' || typeof e.parent !== 'string') continue;
    const city = e.parent.replace('CITY:', '');
    if (!cityPairs.has(e.slug)) cityPairs.set(e.slug, []);
    cityPairs.get(e.slug)!.push(city);
  }

  const suffix = (l: string) => (l === 'ur' ? '@ur' : '');
  const asEntry = (b: string, l: string) => byKey.get(`${b}@${l}`);

  function candidates(x: SeedEntry): SeedEntry[] {
    const l = loc(x);
    const out: (SeedEntry | undefined)[] = [];
    const base = (ref: string) => asEntry(ref, l);
    const about = ABOUT[x.slug];
    if (x.type === 'PAGE' && about) {
      for (const r of about) out.push(base(r));
      for (const e of all) if (e.type === 'PAGE' && loc(e) === l && e.parent === `PAGE:${x.slug}`) out.push(e);
    }
    if (x.type === 'CITY') {
      for (const n of NEAR[x.slug] ?? []) out.push(base(`CITY:${n}`));
      for (const [ind, cities] of cityPairs) if (cities.includes(x.slug)) out.push(base(`INDUSTRY:${ind}`));
      for (const [c, list] of Object.entries(NEAR)) if (list.includes(x.slug)) out.push(base(`CITY:${c}`));
    } else if (x.type === 'INDUSTRY') {
      for (const cl of CLUSTERS) if (cl.includes(x.slug)) for (const s of cl) if (s !== x.slug) out.push(base(`INDUSTRY:${s}`));
      for (const c of cityPairs.get(x.slug) ?? []) out.push(base(`CITY:${c}`));
      for (const r of ['PRODUCT:pos', 'PRODUCT:inventory', 'PRODUCT:khata', 'SOLUTION:single-shop', 'PAGE:industries']) out.push(base(r));
    } else if (x.type === 'COMPARE' || x.type === 'ALTERNATIVE') {
      const name = x.slug.replace(/^nafaa-vs-/, '').replace(/-alternative.*$/, '');
      for (const e of all) {
        if (loc(e) !== l || e === x) continue;
        if ((e.type === 'COMPARE' || e.type === 'ALTERNATIVE') && (e.slug.includes(name) || name.includes(e.slug.replace(/^nafaa-vs-/, '').replace(/-alternative.*$/, '')))) out.push(e);
      }
      for (const e of all) if (loc(e) === l && e !== x && e.type === x.type) out.push(e);
      out.push(base('PAGE:compare'), base('PAGE:alternatives'), base('PRODUCT:pos'));
    } else if (INFO.has(x.type)) {
      const t = targetFor(x);
      if (x.type === 'PAGE' && typeof x.parent === 'string') {
        for (const e of all) if (loc(e) === l && e !== x && e.type === 'PAGE' && e.parent === x.parent) out.push(e);
      }
      const peers = (t ? (groups.get(`${l}:${t}`) ?? []) : []).filter((p) => p !== x);
      const off = hash(x.slug) % Math.max(1, peers.length);
      const rotated = [...peers.slice(off), ...peers.slice(0, off)];
      rotated.sort((a, b) => Number(a.type === x.type) - Number(b.type === x.type));
      out.push(...rotated);
      if (t) out.push(base(REF[t].ref));
    } else {
      for (const e of all) if (loc(e) === l && e !== x && e.type === x.type) out.push(e);
      if (x.type === 'SERVICE') out.push(base('SOLUTION:enterprise'), base('PRODUCT:pos'));
      if (x.type === 'PRODUCT') out.push(base('PAGE:product'), base('PRODUCT:pos'));
      if (x.type === 'SOLUTION') out.push(base('PAGE:solutions'), base('PRODUCT:pos'));
    }
    // Last resorts so a page is never left short.
    out.push(base('PAGE:pricing'), base('PAGE:product'), base('PAGE:industries'), base('PAGE:solutions'));
    const seen = new Set<SeedEntry>();
    return out.filter((e): e is SeedEntry => !!e && e !== x && live(e) && !seen.has(e) && !!seen.add(e));
  }

  const targets = all.filter(live);
  for (const pass of [1, 2]) {
    for (const x of targets) {
      const k = keyOf(x);
      const have = inbound.get(k) ?? new Set<string>();
      if (have.size >= MIN) continue;
      for (const y of candidates(x)) {
        if (have.size >= MIN) break;
        const yk = keyOf(y);
        if (have.has(yk)) continue;
        if (pass === 1 && (added.get(yk) ?? 0) >= SOFT_CAP) continue;
        const ref = `${x.type}:${x.slug}${suffix(loc(x))}` as EntryRef;
        if (!add.has(yk)) add.set(yk, []);
        add.get(yk)!.push({ ref, kind: 'RELATED' });
        added.set(yk, (added.get(yk) ?? 0) + 1);
        have.add(yk);
        inbound.set(k, have);
      }
    }
  }

  return all.map((e) => {
    const extra = add.get(keyOf(e));
    return extra ? { ...e, relations: [...(e.relations ?? []), ...extra] } : e;
  });
}
