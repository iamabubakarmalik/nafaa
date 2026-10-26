/**
 * Starting a pharmacy or medical store: location, licence (provincial),
 * qualified person, premises, suppliers, first stock, pricing and systems.
 * No fees or licence categories stated; sources are DRAP and Punjab health.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { CHECKED_ON, checkRules, sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('PMU Provincial DRAP: sale licensing, inspections and pharmacy management in Punjab', 'https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap', 'Primary & Secondary Healthcare Department, Punjab'),
  src('Drug Regulatory Authority of Pakistan (DRAP)', 'https://www.dra.gov.pk/', 'Drug Regulatory Authority of Pakistan'),
  src('DRAP recall alerts', 'https://dra.gov.pk/tag/recall', 'Drug Regulatory Authority of Pakistan'),
  src('IRIS taxpayer portal (NTN registration)', 'https://iris.fbr.gov.pk/public/txplogin.xhtml', 'Federal Board of Revenue'),
];

const spec: PostSpec = {
  slug: 'how-to-start-a-pharmacy-pakistan',
  seoDescription: 'The steps to open a pharmacy in Pakistan: location, drug sale licence and qualified person, premises, licensed suppliers, first stock and records from day one.',
  title: 'How to Start a Pharmacy or Medical Store in Pakistan',
  summary:
    'The steps to open a pharmacy or medical store: choosing the location, the drug sale licence and qualified person, setting up the premises, finding licensed suppliers, building the first stock, pricing, and the systems that keep you compliant from day one.',
  category: 'industry',
  cover: PHOTO.howToStartAPharmacyPakistan,
  tags: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:drap', 'GLOSSARY_TERM:batch-tracking'],
  related: ['BLOG_POST:drap-compliance-pharmacy', 'PRODUCT:inventory', 'GLOSSARY_TERM:fifo', 'COMPLIANCE:drap-pharmacy'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`A pharmacy is a shop with responsibilities. You sell what doctors prescribe and what families rely on, under rules set by both the federal regulator and your province. Done properly, it is a steady business with loyal customers who come back every month for the same medicines. Done carelessly, it risks patients and your licence.

This guide covers the path from idea to opening day. It does not list fees or licence categories, because these differ by province and change. Check with your provincial drug control office before you sign a lease.`),
    checkRules(`Licensing is a provincial matter and the rules change. Before you rent premises or hire staff, confirm the licence type, the qualified-person requirement and the premises rules with your provincial drug control office. Checked on ${CHECKED_ON}.`),
    prose(`## 1. Location

Pharmacies do best near the people who need medicine regularly:

- Near clinics, hospitals and doctors' practices, where prescriptions are written.
- In residential areas, for families' regular medicines and late-night needs.
- On a main road with parking, for customers who stop on the way home.

Check how many pharmacies are already close by and what hours they keep. Long hours and night service are often how a new pharmacy wins customers.

## 2. Licence and qualified person

Drug sale licences are issued by the province. In Punjab, the health department's provincial DRAP unit lists sale and distribution licensing, inspections, and the issuance and cancellation of licences for pharmacies and medical stores among its functions. Other provinces have their own drug control offices.

Provinces have different kinds of drug sale licence, for example for a pharmacy or for a medical store, and each requires a qualified person (such as a registered pharmacist or a qualified technician) to be in charge. Ask your provincial office:

- Which licence fits the business you plan
- Who must be present during opening hours
- What the premises must have (area, storage, refrigeration)
- What documents to submit and how long approval takes

You will also need an NTN from FBR (done on the IRIS portal) and any local trade permissions your area requires.

## 3. Premises

- **Storage:** shelves away from direct sun, and a temperature that suits medicines.
- **Refrigerator:** for insulin, vaccines and other cold-chain items, ideally with a thermometer you check daily.
- **Separate area** for expired or recalled stock, clearly labelled, away from saleable stock.
- **Secure storage** for controlled medicines.
- **Power backup:** a UPS or generator, because the fridge cannot go off for hours.

## 4. Suppliers

Buy only from licensed distributors and keep every purchase invoice with batch numbers and expiry dates. Distributors of the major manufacturers visit regularly, take orders and deliver. Ask about credit terms, how they handle near-expiry returns, and how quickly they can deliver urgent items. Cheaper stock from an unlicensed source is not worth the risk to patients or to your licence.`),
    steps(
      'Build the first stock',
      [
        ['Start with what local doctors prescribe', 'Talk to nearby doctors or watch prescriptions in the first weeks. Stock what they write most.'],
        ['Cover common everyday needs', 'Pain relief, fever, cough and cold, stomach, vitamins, first aid, baby care and personal care.'],
        ['Keep alternatives by salt', 'For common medicines, stock more than one brand of the same salt so a customer is not sent away.'],
        ['Go light on slow and expensive items', 'Order specialised medicines on demand until you know there is steady need.'],
        ['Record batch and expiry for every line', 'From the first delivery, so expiry checks and recalls are quick.'],
      ],
      'A narrow, well-chosen first stock beats a wide one full of slow movers.',
      true,
    ),
    prose(`## 5. Pricing

Medicines carry a printed retail price, and you must not sell above it. Your margin comes from the difference between the distributor's trade price and the printed price, plus any scheme. Medicines sold by the strip or tablet should be priced in proportion to the pack. Non-medicine items (cosmetics, baby products, supplements) often carry better margins and help the shop's overall profit.

## 6. Systems from day one

Set up these routines before the first customer:

- **Batch and expiry** recorded on every purchase.
- **First-expiry, first-out** on the shelf.
- **Prescription check** for prescription-only medicines, and a register for controlled medicines.
- **Monthly expiry sweep:** list what expires in the coming months and return or clear it.
- **Daily fridge log.**
- **Recall alerts:** check DRAP's recall page and act on any batch you hold.

Our checklist of DRAP rules for pharmacies, linked below, covers these in more detail.

## How Nafaa helps a new pharmacy

Nafaa's pharmacy setup stores each medicine with its salt (formula), schedule and whether it needs a prescription, and shows substitutes with the same salt. Purchases are received with batch and expiry, and the expiry screen lists what is close to expiring. At the counter, controlled medicines prompt a register entry, prescriptions and doctors are saved for repeat patients, a cold-chain log records fridge temperatures, and medicines can be sold by box, strip or tablet from the same stock.`),
    shot({
      heading: 'Know what to reorder before the shelf is empty',
      body: 'The low-stock list shows medicines below their alert level, how many days of stock are left and what to order, next to stock that expires within 30 days.',
      id: SHOT.pharmacyLowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'full',
      caption: 'Pharmacy low-stock list in Nafaa (demo data): medicines below their alert level, days of stock left and what to order.',
    }),
    tip('Before opening, ask two or three nearby doctors which medicines they prescribe most and which ones patients struggle to find. It is the best first-order list you can get.', 'Ask the doctors next door'),
    sourcesBlock(SOURCES),
  ],
  outline: ['Location', 'Licence and qualified person', 'Premises', 'Suppliers', 'First stock', 'Pricing', 'Systems', 'How Nafaa helps'],
  dropped: [],
  needsOwner: ['A pharmacist or provincial drug office to review before publishing (licence types, premises rules).'],
  evidence: [
    'apps/web/src/industries/pharmacy/PharmacyPack.tsx',
    'apps/web/src/industries/pharmacy/products/PharmacyProductEditor.tsx',
    'apps/web/src/industries/pharmacy/api/expiry.api.ts',
    'apps/web/src/industries/pharmacy/api/controlled-log.api.ts',
    'apps/web/src/industries/pharmacy/api/substitutes.api.ts',
    'apps/web/src/industries/pharmacy/api/temperature.api.ts',
  ],
  factNote: 'Provincial licensing role from the Punjab PMU Provincial DRAP page (2026-10-26). No fees, licence categories or margins stated as fact. Product statements checked against the code.',
};

export default spec;
