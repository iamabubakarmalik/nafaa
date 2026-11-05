/**
 * How to check PTA IMEI status and track phones in a mobile shop. Facts about
 * PTA's DIRBS come only from dirbs.pta.gov.pk (opened 5 Nov 2026); the Nafaa
 * part is checked against apps/web/src/industries/mobile.
 */
import { SHOT, prose, shot } from '../../main-pages/_build';
import { sourcesBlock, src, tip, note, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  { ...src('PTA DIRBS: Device Identification, Registration and Blocking System', 'https://dirbs.pta.gov.pk/', 'Pakistan Telecommunication Authority'), accessedAt: '2026-11-05' },
  { ...src('PTA DIRBS: user guide and registration steps', 'https://dirbs.pta.gov.pk/users-guide', 'Pakistan Telecommunication Authority'), accessedAt: '2026-11-05' },
  { ...src('PTA DIRBS: facilitation centres', 'https://dirbs.pta.gov.pk/facilitation-center', 'Pakistan Telecommunication Authority'), accessedAt: '2026-11-05' },
];

const spec: PostSpec = {
  slug: 'check-pta-imei-status-mobile-shop',
  title: 'How to Check PTA IMEI Status and Track Phones in a Mobile Shop',
  summary:
    'How a mobile shop can check a phone’s status on PTA DIRBS by IMEI, what to write down for every handset, and how to keep those records in Nafaa. Official steps are taken from the PTA DIRBS website, checked on 5 November 2026.',
  category: 'industry',
  cover: PHOTO.mobileShopImeiRecords,
  seoTitle: 'PTA IMEI Tracker: Check IMEI Status in a Mobile Shop',
  seoDescription: 'How to check PTA IMEI status by SMS 8484 or the DIRBS app, what a mobile shop must record for each phone, and how to track IMEI stock in Nafaa.',
  focusKeyword: 'pta imei tracker',
  tags: ['INDUSTRY:mobile-shop', 'GLOSSARY_TERM:imei', 'GLOSSARY_TERM:pta-approved'],
  related: ['PAGE:mobile-imei-tracking', 'BLOG_POST:mobile-shop-imei-records', 'GLOSSARY_TERM:trade-in', 'GLOSSARY_TERM:warranty', 'PRODUCT:inventory'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`If you sell phones in Pakistan, someone will ask you the same question every day: “Is this phone PTA approved?” Customers search for a **PTA IMEI tracker** because they want a quick answer, and shop owners search for **IMEI tracking in Pakistan** because they need to answer it for every handset on the shelf, in the right order, with a record that shows what they checked and when.

This guide covers both halves. First, how to check a phone’s status through the Pakistan Telecommunication Authority’s own channels. Second, what your shop should write down for each phone, and how Nafaa keeps that record so you can find any handset by its IMEI later. Everything said about PTA comes from the DIRBS website, [dirbs.pta.gov.pk](https://dirbs.pta.gov.pk/), which we opened on 5 November 2026. PTA can change its steps, so check the site before you rely on a procedure.`),
    prose(`## What an IMEI is and where to find it

An IMEI is the 15-digit number that identifies a phone handset. A dual-SIM phone has two of them, one for each SIM slot, and the DIRBS page notes that each 15-digit IMEI is sent separately in that case. The quickest way to see the numbers is to dial \`*#06#\` on the phone, which is also the way the DIRBS page tells people to find them. The IMEI is usually printed on the box and on a label under the battery or on the SIM tray as well, but the dialer is the one to trust, because a box label can belong to a different phone. Compare the dialer number with the box before you stock or sell a unit. See the [IMEI glossary entry](/glossary/imei) for the short definition.`),
    prose(`## Three ways to check a phone’s status with PTA

The DIRBS home page offers three public ways to check a device. These are the options PTA lists, in its own words and order:

1. **SMS 8484.** Open messages, write the 15-digit IMEI and send it to 8484. For a dual-SIM phone, send each IMEI on its own.
2. **The DIRBS website.** The home page has a “Check status of your device” section. It asks for the IMEI, which you find with \`*#06#\`.
3. **The DIRBS DVS app.** PTA links an Android app, “DIRBS DVS”, from the DIRBS page on Google Play.

PTA’s page does not list the wording of every result, so we do not guess at status names here. Read the reply you get and write it down exactly as it appears. If a reply is unclear, the DIRBS help line printed on the site is 0800-55055.

One more official fact worth knowing: the DIRBS page says non-compliant devices are paired with the user’s mobile number, and that registration can be done online at [dirbs.pta.gov.pk/drs](https://dirbs.pta.gov.pk/drs), by dialling \`*8484#\`, or at the franchise centres of the mobile operators. The page also says registration can be completed within 60 days through the online automated service. For duty information on a device, PTA’s page links to an FBR page.`),
    note('Nafaa does not check an IMEI with PTA for you. The PTA status in Nafaa is a record that your shop enters for each phone. You check on the PTA channels above, then record the result.', 'What Nafaa does and does not do'),
    prose(`## When a mobile shop should check

A check costs a minute, so do it at the points where a wrong answer costs money:

- **When new stock arrives.** Check a few units from every box, or every unit for high-value models, and record the result against the supplier’s bill.
- **Before buying a used phone.** Check first, then discuss the price. A seller in a hurry is a reason to slow down.
- **Before the customer pays.** Show the result on the customer’s own phone if they ask, and put the checked date on the bill.
- **When a phone comes back.** For a warranty claim or a return, confirm that the IMEI in the box is the IMEI you sold.

Keep the date next to the result. A status you checked in March tells you little in November.`),
    prose(`## What to record for every phone

The aim of your records is that, for any handset that passed through your shop, you can answer who sold it to you, what you paid, what its status was, who bought it and what warranty you gave. For each new phone write down:

- IMEI 1 and IMEI 2 (both for dual-SIM models)
- Model, variant (for example 4GB/64GB) and colour
- Supplier name and the purchase bill
- Cost price and sale price
- PTA status as you found it, and the date you checked
- Warranty months you offer

When you **sell**, add the customer’s name and phone number, the date, and the warranty start date. When you **buy a used phone**, add the seller’s name, phone number and CNIC, the IMEI, the condition, the price you paid and the DIRBS result. That sheet is your protection if the phone later turns out to have a problem. Our longer guide on [IMEI record keeping for mobile shops](/blog/mobile-shop-imei-records) goes through each step in more detail, including repairs and warranty claims.

Two common mistakes are worth naming. The first is recording stock by model and count only (“Samsung A15, 6 pieces”), which makes it impossible to find the unit a customer is holding. The second is keeping the PTA result in your head or in a chat thread. If it is not in the record, it did not happen.`),
    shot({ id: SHOT.mobileImei, heading: 'IMEI stock in Nafaa', caption: 'A demo mobile shop’s IMEI stock: each handset by IMEI 1 and 2, with PTA status, days on the shelf, sale price and cost.', url: 'app.nafaa.pk/imei-inventory' }),
    prose(`## How IMEI tracking works in Nafaa

This is what the mobile shop setup does today, checked against the app code:

- **One product per model, one record per handset.** You add the model once, then put each phone into stock by its IMEI with its cost, warranty in months and PTA status. The status choices are PTA Approved, Non-PTA, Patched, PTA baqi (pending) and Exempt.
- **Fast entry.** On the IMEI stock screen, press **IMEI daalein** (or N), pick the model, then scan each box with continuous scan on, or paste one line per phone. Nafaa accepts 15-digit IMEIs, skips duplicates and warns when an IMEI’s check digit does not match, which catches most typing errors.
- **Sell by IMEI.** At the counter, scan the IMEI and that exact phone goes on the bill. If you tap the model instead, Nafaa lists the phones in stock at that branch for you to choose from.
- **IMEI check.** Press **IMEI check** (or C) and enter a number to see when that phone was sold, to whom, how much warranty is left and its history. It is the screen to open when a customer comes back with a phone.
- **Shelf view.** The IMEI stock screen shows how many phones are on the shelf, how many are older than 60 days, how many are Non-PTA and what sold this month.
- **Used phones, repairs and instalments.** Phones taken in on exchange have their own screen with the seller’s details and an inspection, repairs run as tickets with parts and payments, and phones sold on qist can be tracked as an instalment plan in the customer’s khata.

The step-by-step version, with screenshots of each screen, is in the help article [IMEI tracking for mobile shops with PTA status](/help/by-business-type/mobile-imei-tracking). The whole setup is on the [mobile shop software page](/industries/mobile-shop). One limit to know: phones need an internet connection at the moment of sale, because the IMEI is checked on the server, while accessories sell offline like any product.`),
    tip('Put the PTA check and the Nafaa entry in the same minute. Check the phone with SMS 8484 or the app, then enter the status and the date in Nafaa before the box goes on the shelf. Records made later are records that get skipped.'),
    prose(`## A simple routine you can copy

1. Stock arrives. Count the boxes against the supplier’s bill.
2. For each unit, dial \`*#06#\` on the display phone or read the IMEI sticker, and confirm it matches the box.
3. Check status with SMS 8484, the DIRBS website or the DIRBS DVS app.
4. In Nafaa press IMEI daalein, scan or paste the IMEIs, enter cost, warranty and the PTA status you found.
5. When a customer buys, scan the IMEI at the counter so the sale is tied to that handset.
6. At the end of the week, open IMEI stock and look at phones older than 60 days and Non-PTA phones. Those are where your money sits.

A shop that follows this for a month has something most shops do not: a record showing the origin, status, sale and warranty of every phone it handled.`),
    prose(`## Frequently asked questions

**Is there an official PTA IMEI tracker?** PTA runs DIRBS. Its home page offers a status check by SMS to 8484, a web check and the DIRBS DVS app, as listed above.

**Can Nafaa check PTA status automatically?** No. Nafaa stores the status you record against each IMEI. The check itself is done on PTA’s channels.

**Does IMEI tracking replace a warranty card?** It makes claims faster, because you look up the IMEI and see the sale date and warranty left. You can still give the customer a printed bill that shows the IMEI.

**What if the IMEI check digit fails?** Nafaa warns you. Most of the time the number was mistyped, so read it again from the dialer. If a real phone’s IMEI fails, look at that phone more closely before you stock it.

If you want to see this in your own shop, the [mobile shop page](/industries/mobile-shop) has the full list of screens, and the 7-day free trial lets you add a few phones and try a sale by IMEI.`),
    sourcesBlock(SOURCES, 'Official sources (checked on 5 November 2026)'),
  ],
  outline: ['IMEI basics', 'Three PTA channels', 'When to check', 'What to record', 'Nafaa tracking', 'Routine', 'FAQ'],
  dropped: [],
  needsOwner: [],
  evidence: [
    'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx',
    'apps/web/src/industries/mobile/components/meta.ts',
    'apps/web/src/industries/mobile/components/imei/AddImeisModal.tsx',
    'apps/web/src/industries/mobile/components/imei/ImeiLookupModal.tsx',
    'apps/web/src/industries/mobile/api/imei.api.ts',
    'apps/web/src/industries/mobile/MobilePack.tsx',
    'apps/web/src/industries/mobile/api/used-phones.api.ts',
  ],
  factNote:
    'PTA DIRBS home page and user guide read on 2026-11-05 (SMS 8484, DVS app, *#06#, DRS registration, *8484#, 60-day online registration, help line 0800-55055). Nafaa claims checked against apps/web/src/industries/mobile on 2026-11-05.',
};

export default spec;
