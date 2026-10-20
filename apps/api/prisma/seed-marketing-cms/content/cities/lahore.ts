/**
 * Lahore city hub, deep copy (D2, 20 Oct 2026). Replaces the stub blocks with
 * a full hub: markets and areas (H3s inside the hub, never URLs), how shops in
 * Lahore get set up, and the tax split between PRA and FBR. Market and area
 * notes describe what each place is known for; they make no claim about
 * Nafaa customers there. No shop counts, no named customers.
 */

import { withIds } from '../../lib/blocks';
import type { SeedEntry } from '../../lib/types';
import { SHOT, features, heroBlock, pricing, prose, shot, steps } from '../main-pages/_build';

const markets = [
  { name: 'Hall Road', note: 'The city\'s electronics, mobile and accessories market, where wholesale and retail counters sit side by side and serial numbers, warranties and trade credit matter as much as speed.' },
  { name: 'Anarkali Bazaar', area: 'Old City', note: 'One of Lahore\'s oldest markets, crowded with clothing, shoe, fabric and household shops that sell many sizes and colours of the same item.' },
  { name: 'Liberty Market', area: 'Gulberg', note: 'Clothing, shoe and cosmetics boutiques around a busy market square, with eateries close by, where card and wallet payments are common.' },
  { name: 'Shah Alam Market', area: 'Old City', note: 'A wholesale hub for general goods, cosmetics, toys and household items that supplies retailers across Punjab, mostly on cartons and credit.' },
  { name: 'Akbari Mandi', area: 'Old City', note: 'The wholesale market for spices, dry fruits, grains and kiryana goods, where buying and selling by weight and by the bag is the norm.' },
  { name: 'Azam Cloth Market', note: 'A large wholesale cloth market where traders sell fabric by the metre and by the than to shops and tailors.' },
];

const areas = [
  { name: 'Gulberg', note: 'Restaurants, cafés and branded outlets along the main boulevards; multi-branch businesses here often run several counters from one account.' },
  { name: 'DHA', note: 'Supermarkets, pharmacies, salons and cafés serving residential phases, with plenty of home delivery and online ordering.' },
  { name: 'Johar Town', note: 'A large residential and commercial area with grocery stores, mobile shops, bakeries and food outlets on every main road.' },
  { name: 'Model Town', note: 'Neighbourhood markets with kiryana stores, pharmacies and clothing shops serving long-time regular customers on khata.' },
  { name: 'Bahria Town', note: 'Planned commercial areas with restaurants, general stores and service businesses opening new branches.' },
];

export function enrichLahore(base: SeedEntry): SeedEntry {
  const key = 'CITY:lahore';
  return {
    ...base,
    summary:
      'Nafaa is POS, stock and khata software for shops, restaurants and businesses in Lahore. It runs on the phone or computer you already have, keeps billing without internet, and keeps udhaar in a digital khata, with setup help on WhatsApp.',
    data: {
      ...base.data,
      markets,
      areas,
      support: { onsite: false, note: 'Setup, data import from Excel or old software, and training happen remotely over WhatsApp and video calls, in Urdu or English. Most shops start billing the same day.' },
    },
    blocks: withIds(key, [
      heroBlock({
        eyebrow: 'POS software in Lahore',
        heading: 'Lahore',
        sub: 'From Hall Road counters to Gulberg cafés: billing, stock, khata and online orders for Lahore businesses, on the phone or computer you already have, even through load-shedding.',
        media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
        badges: ['Works offline', 'Digital khata', 'Setup on WhatsApp'],
      }),
      {
        type: 'answerBox',
        facts: [
          { label: 'Runs on', value: 'The phone, tablet or computer you already have, also without internet' },
          { label: 'For', value: 'Shops, restaurants, wholesalers, online sellers and service businesses' },
          { label: 'Setup', value: 'Remote setup and training on WhatsApp and video calls' },
          { label: 'Price', value: 'Paid plans from {{price:min.monthly}} a month, with a free trial first' },
        ],
        romanUrdu: 'Lahore ki dukaanon, restaurants aur karobar ke liye Nafaa: bill, stock aur khata ek app me. Bijli ya internet jaye to bhi counter chalta rehta hai, aur setup WhatsApp par.',
      },
      { type: 'cityFacts', show: ['tax'], heading: 'Sales tax in Lahore' },
      prose(`## Businesses in Lahore that run on Nafaa

Lahore's trade runs from wholesale markets in the old city to restaurant strips in Gulberg and supermarkets in the housing societies. The same Nafaa account handles each of them with screens built for the trade:

- **Kiryana and general stores** sell by piece, dozen and carton, keep regular customers on khata and send reminders on WhatsApp.
- **Restaurants and cafés** run tables, kitchen tickets and delivery from one screen.
- **Mobile and electronics shops** on Hall Road track phones by IMEI, and sell to trade customers on credit.
- **Clothing and shoe shops** in Anarkali and Liberty keep stock by size and colour.
- **Wholesalers** in Shah Alam and Akbari Mandi keep carton prices, credit limits and supplier accounts.
- **Pharmacies, salons and bakeries** across the city use their own Nafaa screens on top of the same counter.`),
      { type: 'cityFacts', show: ['markets', 'areas'], heading: 'Markets and areas' },
      shot({
        heading: 'One dashboard for every Lahore branch',
        body: 'Owners with a shop in the old city and another in a housing society see both branches side by side: sale, profit, cash and stock, live.',
        id: SHOT.branches,
        url: 'app.nafaa.pk/branches',
        layout: 'full',
      }),
      steps('Getting started in Lahore', [
        ['Start the free trial', 'Sign up on the phone or computer at your counter. No card needed.'],
        ['Send us your list', 'Share your products and khata balances in Excel, or photos of the register, on WhatsApp.'],
        ['Go live', 'We check your receipt, printer and first bills with you on WhatsApp.'],
        ['Train the team', 'A short video call for cashiers and managers, in Urdu or English.'],
      ]),
      features('Why Lahore businesses choose Nafaa', [
        ['wifi-off', 'Load-shedding proof', 'The counter keeps billing without internet and syncs later.'],
        ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, only if your business needs it.'],
        ['notebook-pen', 'Khata for regulars', 'Udhaar per customer with one-tap WhatsApp reminders.'],
        ['building-2', 'Many branches', 'Old city and society branches in one account.'],
        ['truck', 'Online orders', 'Website, Shopify, WooCommerce and Foodpanda orders next to counter sales.'],
        ['languages', 'Urdu and English', 'Screens, receipts and support in the language your team reads.'],
      ]),
      { type: 'cityFacts', show: ['support'], heading: 'Support in Lahore' },
      pricing('Plans for Lahore businesses'),
      { type: 'faq', heading: 'Common questions' },
      {
        type: 'cta',
        heading: 'Start billing in Lahore today',
        body: 'Seven days free on the device you already have. Setup help on WhatsApp.',
        primaryCta: { label: 'Start free trial', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
        secondaryCta: { label: 'Ask on WhatsApp', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      },
    ] as never),
    faqKeys: ['devices', 'offline', 'mp-fbr-who', 'khata-reminders', 'pricing'],
    relations: [
      { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
      { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
      { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
      { ref: 'INDUSTRY:garments', kind: 'TAG' },
      { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
      { ref: 'PRODUCT:fbr', kind: 'RELATED' },
    ],
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/api/src/integrations/tax-authority/adapters.ts', 'apps/web/src/modules/multi-branch', 'apps/web/src/industries'],
    factCheck: {
      checkedOn: '2026-10-20',
      note: 'Market and area notes describe what each place is commonly known for (no customer claims). Product claims checked against apps/web and apps/api. No services-tax rate is stated (needs a dated PRA source).',
    },
  };
}
