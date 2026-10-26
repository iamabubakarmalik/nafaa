/**
 * Islamabad city hub, deep copy (26 Oct 2026). A planned capital where trade
 * sits in each sector's markaz: cafés, supermarkets, pharmacies, salons,
 * clinics and bookshops, many run as branches across sectors and across the
 * Rawalpindi border. No shop counts, no named customers, no office claims.
 */

import { SHOT, cityHub, wikipedia } from './_hub';

const CHECKED = '2026-10-26';

export const enrichIslamabad = cityHub({
  slug: 'islamabad',
  seoDescription: 'POS, stock and khata software for Islamabad cafes, supermarkets, pharmacies and salons, with billing through outages and every markaz branch in one account.',
  name: 'Islamabad',
  checkedOn: CHECKED,
  summary:
    'Nafaa is POS, stock and khata software for Islamabad cafés, supermarkets, pharmacies, salons and clinics. It runs in the browser on the devices you already have, keeps billing through power and internet faults, and shows every markaz branch in one account.',
  hero: {
    sub: 'For the markaz businesses of Islamabad, from F-7 cafés to G-9 stores and Blue Area offices: billing, appointments, stock and branch reports in one app, in English or Urdu.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    badges: ['Branches in one view', 'Card and wallet payments', 'English or Urdu screens'],
  },
  facts: [
    ['Runs on', 'A laptop, tablet or phone with a browser, also when the connection drops'],
    ['Good fit', 'Cafés, supermarkets, pharmacies, salons, clinics, bookshops and service firms'],
    ['Branches', 'Each sector branch has its own stock and staff; the owner sees them together'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, after a free trial'],
  ],
  romanUrdu:
    'Islamabad ke cafés, stores, pharmacies aur salons ke liye Nafaa: bill, appointment, stock aur har branch ki report ek app me. Screen English ya Urdu me, aur internet jaye to bhi bill bante rehte hain.',
  trades: `## How Islamabad trades, and where Nafaa fits

Islamabad was planned as a capital, so most of its trade sits in the markaz, the commercial centre of each sector, and along Blue Area. A typical markaz has a supermarket, two or three pharmacies, a bakery, cafés, a salon, a clinic and mobile and computer shops within a short walk. Customers are a mix of government and private-sector staff, students and families, and many of them pay by card or wallet rather than cash.

- **Cafés and restaurants** in F-6, F-7 and the newer sectors run dine-in, takeaway and delivery from one screen, with tables, kitchen tickets, add-ons and split bills.
- **Supermarkets and kiryana stores** scan barcodes at speed, keep low-stock lists and send the regular households' balances on WhatsApp.
- **Pharmacies** search by salt, offer substitutes, and track batches and expiry dates so short-dated stock is sold or returned on time.
- **Salons and barbers** book appointments on a calendar, pay stylists commission per service and sell memberships and packages.
- **Clinics** issue tokens at reception, keep prescriptions with each visit and close the day with doctor fees in the same app.
- **Bookshops and stationers** keep titles by ISBN and textbooks by grade, which helps at the start of every school session.`,
  markets: [
    { name: 'Jinnah Super Market', area: 'F-7 Markaz', note: 'Clothing, shoe and book shops, cafés and restaurants around an open market square, busy in the evenings and on weekends.' },
    { name: 'Super Market', area: 'F-6 Markaz', note: 'One of the city\'s oldest markets, with grocers, pharmacies, bookshops, tailors and small eateries serving the surrounding sectors.' },
    { name: 'Blue Area', note: 'The central business strip along Jinnah Avenue, with offices, banks, showrooms and restaurants that serve office workers at lunchtime.' },
    { name: 'Aabpara Market', area: 'G-6', note: 'A long-established market of grocers, cloth and household shops, and low-cost eateries close to government offices.' },
    { name: 'Karachi Company', area: 'G-9 Markaz', note: 'A busy market of clothing, footwear, mobile phones and general goods, with pricing aimed at families and students.' },
    { name: 'Weekly bazaar', area: 'H-9', note: 'The weekly market for fruit, vegetables, clothing and household goods, where sellers bill fast and mostly in cash.' },
  ],
  areas: [
    { name: 'F-10 and F-11 Markaz', note: 'Restaurants, cafés, bakeries and salons serving residential sectors, with heavy evening and delivery trade.' },
    { name: 'I-8 Markaz', note: 'A growing commercial centre with pharmacies, clinics, supermarkets and food outlets.' },
    { name: 'G-11 and G-13', note: 'Newer markaz areas with general stores, mobile shops, tuition centres and takeaways opening their first or second branch.' },
    { name: 'I-9 and I-10 Industrial Area', note: 'Workshops, printing presses, distributors and small factories that buy and sell on account.' },
  ],
  local: `## Working conditions in Islamabad

**Power and internet.** Supply in the sectors comes from IESCO. Outages are usually shorter than in many other cities, but scheduled maintenance shutdowns, storm damage and internet faults still stop counters at the busiest time of day. Nafaa keeps billing on the device without a connection and sends the sales to your account when the line is back.

**Payment habits.** A large share of Islamabad customers pay by card, bank app or mobile wallet. The counter shows a JazzCash, Easypaisa or Raast QR for the exact amount, takes card and cash, and lets one bill be split across methods. The closing report shows each method separately, so the cash count is quick.

**Language.** English is common on Islamabad shop signs and menus, and Urdu at the counter, with Punjabi, Pashto and Hindko spoken by many staff and customers. Nafaa screens can be switched between English and Urdu on each device, so a cashier and the owner can each read the one they prefer.

**Twin-city businesses.** Many owners run a shop in Islamabad and another in Rawalpindi. Both branches sit in one Nafaa account with their own stock, prices and cashiers, and stock can move between them with a transfer that the receiving branch confirms.`,
  shot: {
    heading: 'Every markaz branch on one dashboard',
    body: 'An owner with a café in F-7 and another in F-11 sees today\'s sale, profit, cash and stock for both, live, and can open either one for detail. Each staff member is assigned to the branch they work in.',
    id: SHOT.branches,
    url: 'app.nafaa.pk/branches',
    layout: 'full',
  },
  table: {
    heading: 'Islamabad businesses and the screens they use most',
    caption: 'Where common Islamabad businesses usually start in Nafaa. All plans include the counter, stock and khata.',
    columns: [
      { key: 'screens', label: 'Main screens' },
      { key: 'busy', label: 'What helps at rush hour' },
    ],
    rows: [
      ['Café or restaurant', 'Tables, kitchen tickets, menu with add-ons', 'Split bills and wallet QR at the table'],
      ['Supermarket', 'Barcode counter, low-stock list, purchasing', 'Quick keys for loose items and keyboard billing'],
      ['Pharmacy', 'Salt search, batches and expiry', 'Substitute suggestions when a brand is out'],
      ['Salon or barber', 'Appointment calendar, services, commission', 'Packages and memberships billed in seconds'],
      ['Clinic', 'Tokens, visits, prescriptions', 'Live queue at reception'],
      ['Bookshop', 'ISBN titles, textbooks by grade', 'School book lists ready before term starts'],
    ],
  },
  steps: {
    heading: 'Setting up an Islamabad business with branches',
    items: [
      ['Start with your main branch', 'Open a free trial, choose your business type and enter the products or services of the branch you know best.'],
      ['Add the second sector', 'Create the next branch, assign its staff and enter its opening stock, or import it from Excel.'],
      ['Give staff their own logins', 'Cashiers, stylists or pharmacists get a login with only the rights they need, so refunds and discounts stay under control.'],
      ['Read the branch reports', 'Compare sale, profit and stock across branches each evening, and move stock where it is short.'],
    ],
  },
  questions: `## Questions from Islamabad businesses

### Which tax authority covers services in Islamabad?
Sales tax on services in the Islamabad Capital Territory is administered by the FBR, not a provincial authority. Nafaa offers an optional tax integration; check with your tax adviser whether your business needs it.

### Can customers pay by card and wallet on the same bill?
Yes. Split one bill across card, cash, JazzCash, Easypaisa or bank transfer. Each part is recorded with its method.

### We have one branch in Islamabad and one in Rawalpindi. Is that two accounts?
No. One account holds both branches, each with its own stock and staff, and the owner sees both together.`,
  support:
    'Setup, data import and staff training are done remotely on WhatsApp and video calls, in English or Urdu. Nafaa has no office in Islamabad; we work with you at your own counter.',
  pricingHeading: 'Plans for Islamabad businesses',
  cta: {
    heading: 'Start billing in Islamabad today',
    body: 'Try it free on the laptop, tablet or phone you already use. Help on WhatsApp.',
  },
  faqKeys: ['devices', 'mp-pos-payments', 'mp-branches-transfer', 'mp-staff-permissions', 'mp-fbr-who', 'pricing'],
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
    { ref: 'INDUSTRY:clinic', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
  ],
  evidence: [
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/pharmacy',
    'apps/web/src/industries/salon',
    'apps/web/src/industries/clinic',
    'apps/web/src/industries/bookstore',
    'apps/web/src/core/stores/locale.store.ts',
    'apps/web/src/modules/organization/team/api/team.api.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/pos/components/PosTiles.tsx',
  ],
  sources: [
    wikipedia('Islamabad', CHECKED),
    wikipedia('Blue Area', CHECKED),
    wikipedia('Islamabad Electric Supply Company', CHECKED),
    {
      title: 'Islamabad Capital Territory (Tax on Services) Ordinance, 2001',
      url: 'https://www.fbr.gov.pk',
      publisher: 'Federal Board of Revenue',
      accessedAt: CHECKED,
    },
  ],
  factCheckNote:
    'Sector and markaz layout, IESCO as the utility and FBR administration of ICT sales tax on services are public facts (Wikipedia, fbr.gov.pk). Market notes describe what each place is known for; no customer, office or shop-count claims. Product claims checked in apps/web (branches, locale per user, wallet QR, industry packs). No tax rate is stated.',
});
