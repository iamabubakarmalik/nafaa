/**
 * Pages for work that went live in November 2026 (round 7):
 *
 *   PAGE:mobile-app            the Nafaa POS app on Google Play and the App Store
 *   PRODUCT:product-library    ready-made product lists per business type
 *   PAGE:partners              partner and reseller applications (portal not live yet)
 *   PAGE:languages             English, Urdu and Roman Urdu in the app
 *
 * Store graphics are the owner's own Play listing images (media keys
 * mobile-app-en-*), converted to WebP. The iOS app is sign-in only, so no
 * copy here suggests buying a plan inside the iPhone app.
 */

import type { SeedEntry, SeedFaq } from '../../lib/types';
import { SHOT, callout, features, leadForm, page, prose, shot, steps, table } from './_build';

/** Store links (checked 15 Nov 2026). */
export const STORE = {
  play: 'https://play.google.com/store/apps/details?id=com.nafaa.app',
  appStore: 'https://apps.apple.com/pk/app/nafaa-pos-business-manager/id6769007778',
} as const;

/** The owner's designed store graphics (media/files/mobile-app-*.webp). */
export const MOBILE_SHOT = {
  en: {
    feature: 'media_mobile-app-en-feature',
    home: 'media_mobile-app-en-01',
    billing: 'media_mobile-app-en-02',
    offline: 'media_mobile-app-en-03',
    khata: 'media_mobile-app-en-04',
    stock: 'media_mobile-app-en-05',
    profit: 'media_mobile-app-en-06',
    industries: 'media_mobile-app-en-07',
    online: 'media_mobile-app-en-08',
  },
  ur: {
    feature: 'media_mobile-app-ur-feature',
    home: 'media_mobile-app-ur-01',
    billing: 'media_mobile-app-ur-02',
    offline: 'media_mobile-app-ur-03',
    khata: 'media_mobile-app-ur-04',
    stock: 'media_mobile-app-ur-05',
    profit: 'media_mobile-app-ur-06',
    industries: 'media_mobile-app-ur-07',
    online: 'media_mobile-app-ur-08',
  },
} as const;

const ORIGIN = 'new (round 7 feature pages, 15 Nov 2026)';
const M = 'apps/mobile/src';

const faq = (key: string, topic: string, question: string, answer: string, sourceNote: string, evidence: string[]): SeedFaq => ({ key, topic, question, answer, sourceNote, origin: ORIGIN, evidence });

export const novFaqs: SeedFaq[] = [
  // ─── Mobile app ───
  faq('nov-app-cost', 'mobile-app', 'Is the Nafaa mobile app free?',
    'The app is free to download from Google Play and the App Store. It uses your Nafaa account, so the plan you already have on Nafaa covers the app too. There is no separate charge for using Nafaa on a phone.',
    'Play and App Store listings; the app signs in to the same account and plan as the web app.', [`${M}/modules/auth`, `${M}/modules/billing`]),
  faq('nov-app-offline', 'mobile-app', 'Does the app work without internet?',
    'Yes. Products, stock, customers, khata balances and the last 30 days of bills are kept on the phone. Bills you make offline are saved on the phone and sent by themselves when the connection returns. Each bill is sent with its own key, so a resend never makes a second bill, and anything the server cannot accept shows up as a sync issue in plain words instead of being dropped.',
    'apps/mobile/src/core/offline/README.md (mirror, outbox with Idempotency-Key, sync issues).', [`${M}/core/offline/README.md`, `${M}/core/offline/engine`]),
  faq('nov-app-iphone', 'mobile-app', 'Can I create a new account in the iPhone app?',
    'On iPhone and iPad the app is for signing in to an existing Nafaa account. Create your account at nafaa.pk or in the Android app first, then sign in on the iPhone with the same login. Your plan, products, customers and khata are already there when you sign in.',
    'iOS build is sign-in only (commit a9dc75fd, App Review 3.1.1).', [`${M}/modules/auth`, 'apps/mobile/app.json']),
  faq('nov-app-same-data', 'mobile-app', 'Is the data on the app the same as on the computer?',
    'Yes. The phone, the web app and the Windows desktop app all use one Nafaa account, so a bill made on the phone appears in the reports on the computer, and a price changed on the computer reaches the phone at the next sync. The app syncs when it opens, when the connection comes back and every few minutes while online.',
    'Offline engine sync triggers: app start and resume, connection back, every 3 minutes, after any change.', [`${M}/core/offline/README.md`]),
  faq('nov-app-print', 'mobile-app', 'Can I print bills from the phone?',
    'Yes. The app prints the bill through the phone\'s own print service (AirPrint on iPhone, the print service on Android), in the same receipt design as the web app. You can also share the bill as a PDF, or send it to the customer on WhatsApp as text.',
    'apps/mobile/src/core/receipt/print.ts (expo-print, PDF share, WhatsApp text).', [`${M}/core/receipt/print.ts`]),
  faq('nov-app-notifications', 'mobile-app', 'What notifications does the app send?',
    'The app can alert you to new sales, payments received, low and out-of-stock items, returns, new customers, stock transfers, cash register open and close, credit alerts, online orders and your morning summary. Each person chooses which alerts they want, and whether to be told about their own actions too.',
    'Notification types in apps/mobile/src/modules/notifications/api/notifications.ts; own-action toggles (f713ecb5, 991877a6).', [`${M}/modules/notifications/api/notifications.ts`, `${M}/modules/notifications/lib/usePushSetup.ts`]),

  // ─── Product library ───
  faq('nov-library-what', 'product', 'What is the Nafaa product library?',
    'It is a set of ready-made product lists, one for each kind of business. Instead of typing every product, you search the list for your type of shop, tick what you sell, choose the branch and opening stock, and Nafaa creates the products. Items you already have are not created twice.',
    'apps/web/src/modules/inventory/products/library; API product-library.service.ts.', ['apps/web/src/modules/inventory/products/library/ProductLibrary.tsx', 'apps/api/src/modules/inventory/products/library/product-library.service.ts']),
  faq('nov-library-pharmacy', 'product', 'Where do the medicine names and prices come from?',
    'The pharmacy list is taken from the DRAP Pharmaceutical Product Price Index (e.dra.gov.pk/public/price), copied in November 2026. Each medicine has its brand name, salts and strength, form, pack, company, registration number and the MRP listed by DRAP. Cost is worked out as MRP minus a margin you set (15% unless you change it). Always check the price on the pack before you sell.',
    'library-data.ts (pharmacy-drap.json.gz); scraper source https://e.dra.gov.pk/public/price; margin default 15% in ProductLibrary.tsx.', ['apps/api/src/modules/inventory/products/library/library-data.ts', 'apps/api/src/modules/inventory/products/library/data/pharmacy-drap.json.gz']),
  faq('nov-library-prices', 'product', 'Are the prices in the other lists exact?',
    'No. Outside the pharmacy list, prices are estimates to get you started, and the app marks them as "Andaza price". Change them to your own buying and selling prices before you start billing, or set a margin when you add the products.',
    'library-data.ts: starter packs have estimates: true; UI label "Andaza price — apni price check kar lein".', ['apps/api/src/modules/inventory/products/library/library-data.ts', 'apps/web/src/modules/inventory/products/library/ProductLibrary.tsx']),

  // ─── Partners ───
  faq('nov-partner-portal', 'partners', 'Is there a partner portal?',
    'The partner portal is built and opening soon. Until it opens, send your application with the form on this page and our team will contact you on WhatsApp or by email to agree the terms and get you started. Every business you bring is recorded against your name from the start.',
    'apps/partner exists but is not deployed (owner, 15 Nov 2026).', ['apps/partner/src/App.tsx', 'apps/api/src/modules/partners']),
  faq('nov-partner-earn', 'partners', 'How do partners earn?',
    'When a business you bring to Nafaa signs up and pays for its plan, you earn a commission on its payments for an agreed period, and there can be bonuses when the shop starts selling on Nafaa. The amounts are set in your partner agreement before you start, so you know them up front.',
    'apps/api/src/modules/partners/commission/partner-commission.service.ts (signup, activation, recurring percent, target slabs); amounts per partner plan.', ['apps/api/src/modules/partners/commission/partner-commission.service.ts', 'apps/api/src/modules/partners/attribution/partner-attribution.service.ts']),

  // ─── Languages ───
  faq('nov-lang-switch', 'product', 'How do I change the language of the app?',
    'Pick English, Urdu or Roman Urdu on the login page, during sign-up, from the profile menu or in Settings. Each person chooses their own language, so the owner can read English while the cashier uses Urdu on the same account.',
    'LanguagePicker in AuthLayout, OnboardingPage, ProfileDropdown and LocalizationSection.', ['apps/web/src/core/i18n/components/LanguagePicker.tsx', 'apps/web/src/modules/organization/settings/sections/LocalizationSection.tsx']),
  faq('nov-lang-urdu-rtl', 'product', 'Is the Urdu version written right to left?',
    'Yes. In Urdu the whole screen turns right to left and uses an Urdu font made for screens (Noto Naskh). If you prefer the classic Nastaliq style, you can pick it under Appearance. Numbers and business words such as Sale and Stock stay easy to read.',
    'core/i18n/locales.ts (ur: dir rtl); design-system/tokens/typography.ts (Naskh default, Nastaliq and Gulzar options).', ['apps/web/src/core/i18n/locales.ts', 'apps/web/src/design-system/tokens/typography.ts']),
];

// ─── PAGE:mobile-app ───

const mobileApp = page({
  type: 'PAGE',
  slug: 'mobile-app',
  title: 'Nafaa POS Mobile App',
  summary:
    'The Nafaa POS app for Android and iPhone runs your business from the phone: billing with the camera as a barcode scanner, stock, khata with WhatsApp reminders, profit and reports, online orders and alerts. It keeps billing without internet and syncs by itself, in English, Urdu or Roman Urdu.',
  data: { template: 'default', icon: 'smartphone', shortName: 'Mobile app' },
  seoTitle: 'Nafaa POS App for Android and iPhone: Billing & Khata',
  seoDescription:
    'Download the Nafaa POS app on Google Play or the App Store. Billing, stock, khata, profit and online orders on your phone, working even without internet.',
  focusKeyword: 'pos app pakistan',
  hero: {
    eyebrow: 'Nafaa POS app for Android and iPhone',
    heading: 'Your whole business on your phone',
    sub: 'Make bills, scan barcodes with the camera, keep every customer\'s khata and see today\'s profit, from the phone in your pocket. The app keeps working when the internet drops and syncs by itself when it comes back.',
    media: { id: MOBILE_SHOT.en.feature, frame: 'none' },
    layout: 'split',
    primary: { label: 'Get it on Google Play', href: STORE.play, trackAs: 'app_play' },
    secondary: { label: 'Download on the App Store', href: STORE.appStore, trackAs: 'app_ios' },
    badges: ['Android and iPhone', 'Works offline', 'English, Urdu, Roman Urdu'],
  },
  answer: {
    heading: 'The app in short',
    facts: [
      ['Android', 'Nafaa POS on Google Play'],
      ['iPhone and iPad', 'Nafaa POS on the App Store, for signing in to an existing account'],
      ['Without internet', 'Bills, stock and khata work offline and sync by themselves'],
      ['Languages', 'English, Urdu (right to left) and Roman Urdu'],
      ['Cost', 'Free to download; it uses your Nafaa account and plan'],
    ],
    romanUrdu: 'Nafaa POS app Android aur iPhone par: bill, barcode, stock, khata, Profit aur online orders, sab phone par. Internet na ho tab bhi bill bante hain aur baad me khud sync ho jate hain.',
  },
  body: [
    features('What the app does', [
      ['scan-barcode', 'Billing in seconds', 'Tap products or scan the barcode with the camera. Cash, JazzCash, Easypaisa, card, bank and split payments, discounts, held bills and returns.'],
      ['wifi-off', 'Works offline', 'Bills, stock and khata are saved on the phone and sent by themselves when the internet is back.'],
      ['notebook-pen', 'Khata and udhaar', 'Every customer\'s balance, credit limit and statement, with a WhatsApp reminder in one tap.'],
      ['boxes', 'Stock and barcode', 'Products, packs and variants, stock value, low-stock lists, purchases, suppliers and transfers.'],
      ['chart-column', 'Profit and reports', 'Today\'s sale, profit and a daily target on Home; day report, profit and loss, expenses and cash register.'],
      ['shopping-bag', 'Online orders', 'Website and channel orders, COD confirmation, courier tracking and advance bookings in one desk.'],
      ['bell-ring', 'Alerts on the phone', 'New sales, payments, low stock, online orders and a morning summary as push notifications.'],
      ['sparkles', 'Nafaa AI', 'Ask about your business in your own words and get the answer from your own numbers.'],
      ['message-square', 'Live support', 'Chat with the Nafaa team from inside the app when you need help.'],
    ], 'The app is the same Nafaa you use on the computer, built for a phone screen. Everything below runs on one account with the web app and the Windows desktop app.'),
    shot({
      heading: 'Bill in seconds',
      body: 'The counter on the phone works like the web counter: search or scan, change the quantity, add a discount or a charge, choose the customer and take the payment. Print the receipt through the phone\'s print service, share it as a PDF, or send it on WhatsApp.',
      id: MOBILE_SHOT.en.billing,
      frame: 'none',
      layout: 'split-right',
    }),
    shot({
      heading: 'No internet? Keep selling',
      body: 'Products, stock, customers and the last 30 days of bills live on the phone. A bill made offline takes stock off and adds to the khata at once, and waits in the sync list. When the connection returns it is sent with its own key, so it is never saved twice, and anything that needs your attention shows as a sync issue in plain words.',
      id: MOBILE_SHOT.en.offline,
      frame: 'none',
      layout: 'split-left',
    }),
    shot({
      heading: 'Udhaar, sorted',
      body: 'See who owes the most and since how many days, open a customer\'s statement, take a payment, or send a polite WhatsApp reminder with the exact balance. New customers made offline are created on the server when the phone syncs, together with their bills.',
      id: MOBILE_SHOT.en.khata,
      frame: 'none',
      layout: 'split-right',
    }),
    shot({
      heading: 'Stock and barcode',
      body: 'Scan with the camera to find a product, check its stock in each branch, see what is running low and what sells best. Purchases from suppliers, stock adjustments and transfers between branches are all on the phone.',
      id: MOBILE_SHOT.en.stock,
      frame: 'none',
      layout: 'split-left',
    }),
    shot({
      heading: 'Profit, every day',
      body: 'Home shows today\'s sale, the bills, items sold and given on credit, the profit and a ring for your daily target. The full profit and loss, expenses, other income and the day report are one tap away.',
      id: MOBILE_SHOT.en.profit,
      frame: 'none',
      layout: 'split-right',
    }),
    shot({
      heading: 'Made for your kind of business',
      body: 'The app has screens for 30 business types: restaurant tables and kitchen, pharmacy batches and expiry, mobile shop IMEI and repairs, bakery orders, salon and clinic bookings, and more. Wholesalers get the order booker, delivery and van sales screens in the same app.',
      id: MOBILE_SHOT.en.industries,
      frame: 'none',
      layout: 'split-left',
    }),
    prose(`## How the offline engine works

Most shops in Pakistan lose the internet at some point in the day: load shedding, a weak signal in the market, or a phone package that ran out. The Nafaa app is built so that none of this stops a sale.

- **Everything you sell from is on the phone.** The first sign-in downloads your products (with packs, variants and every barcode), branch stock, customers with their khata balance, categories, staff, counter rules, receipt settings and the last 30 days of bills. After that only changes are downloaded.
- **Every change waits safely in a queue.** A bill, a new customer or a khata payment made offline goes into a queue on the phone. The app sends it as soon as it can: when it opens, when the connection comes back, every few minutes while online, and right after each change.
- **Nothing is sent twice.** Each queued change carries its own key, and the server answers each key once. If the answer is lost on the way, a resend does not create a second bill.
- **Nothing is dropped silently.** If the server cannot accept something, for example the stock ran out on another counter or a rule needs a manager PIN, it shows as a sync issue in plain words. You can fix and retry, or discard it, and the phone puts stock and khata back as they were.

Counter rules such as credit limits and discount limits are checked on the phone before the bill is saved, using the same rules as the server, so an offline bill follows the shop's rules too. Read more on the [offline POS](/product/offline-pos) page.

## Android and iPhone

On **Android**, install Nafaa POS from Google Play, create your business account in the app or sign in to the one you already have, and start billing.

On **iPhone and iPad**, the app is for signing in to an existing Nafaa account. Create the account at nafaa.pk or in the Android app first, then sign in on the iPhone with the same login. Your plan, products and customers are already there.

## One account on every device

The phone, the web app in any browser and the Windows desktop app share one Nafaa account. The owner can check today's sale on the phone while the cashier bills on the shop computer; a price changed on the computer reaches the phone at the next sync; a bill made on the phone appears in the reports everywhere. Staff log in with their own accounts and see only what their role allows, and an owner with [several branches](/product/multi-shop) can switch between them in the app.

## Getting the app on a phone

If you are reading this on a computer, open **nafaa.pk/mobile-app** on your phone, or search for **Nafaa POS** in Google Play or the App Store, and tap the button for your phone. When the app opens, pick your language first: English, Urdu or Roman Urdu. You can change it later in Settings.`),
    steps('Start with the app in four steps', [
      ['Install', 'Get Nafaa POS from Google Play on Android, or from the App Store on iPhone and iPad.'],
      ['Sign in', 'Create your account in the Android app or at nafaa.pk, or sign in with the account you already have.'],
      ['Add products', 'Scan barcodes with the camera, import from Excel on the web, or pick ready products from the [product library](/product/product-library) for your type of business.'],
      ['Make your first bill', 'Open POS, add items, take the payment and send the receipt on WhatsApp.'],
    ]),
    shot({
      heading: 'Online orders on the go',
      body: 'Online orders from your website and other channels arrive on the phone with a push alert. Confirm cash-on-delivery orders with the buyer, accept, track the parcel with the courier and see COD still to collect, without opening the computer. See the [online store](/product/online-store) for everything that runs behind it.',
      id: MOBILE_SHOT.en.online,
      frame: 'none',
      layout: 'split-right',
    }),
    table('Phone, computer or both', 'Most businesses use both. Pick the device by the job, not by the plan: every device uses the same account.', [
      { key: 'phone', label: 'Nafaa POS app', highlight: true },
      { key: 'computer', label: 'Web or desktop app' },
    ], [
      ['Billing at a small counter', 'Yes, with the camera as a scanner', 'Yes, with a USB scanner and thermal printer'],
      ['Checking sale and profit away from the shop', 'Yes, on Home and in reports', 'Yes'],
      ['Khata reminders on WhatsApp', 'Yes, one tap from the customer', 'Yes'],
      ['Order booking in the market', 'Yes, the booker screens work offline with GPS check-in', 'Office side: orders, load sheets, settlement'],
      ['Bulk work: Excel import, labels, long reports', 'Possible', 'Easier on a big screen'],
    ]),
    callout('tip', 'The app is free to download. It uses the plan on your Nafaa account, so there is nothing extra to pay to use Nafaa on a phone. See [pricing](/pricing) for the plans.', 'Free to download'),
  ],
  faqKeys: ['nov-app-cost', 'nov-app-offline', 'nov-app-iphone', 'nov-app-same-data', 'nov-app-print', 'nov-app-notifications'],
  cta: {
    heading: 'Get Nafaa POS on your phone',
    body: 'Search for Nafaa POS, or tap the button for your phone. On iPhone, sign in with an account made at nafaa.pk or on Android.',
    primary: { label: 'Get it on Google Play', href: STORE.play, trackAs: 'cta_play' },
    secondary: { label: 'Download on the App Store', href: STORE.appStore, trackAs: 'cta_ios' },
  },
  relations: [
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:product-library', kind: 'RELATED' },
    { ref: 'PAGE:languages', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
  ],
  sortOrder: 2,
  evidence: [
    'apps/mobile/app.json',
    `${M}/core/offline/README.md`,
    `${M}/core/receipt/print.ts`,
    `${M}/core/hardware/scanner/Scanner.tsx`,
    `${M}/core/auth/biometric.ts`,
    `${M}/modules/notifications/api/notifications.ts`,
    `${M}/modules/ai-assistant`,
    `${M}/modules/support`,
    `${M}/modules/online-store`,
    `${M}/modules/distribution/booker/visit.ts`,
    `${M}/industries`,
    `${M}/core/i18n/locales.ts`,
  ],
  needsOwner: ['Store badges are text buttons; add the official Google Play and App Store badge images if the site template supports them.'],
});

// ─── PRODUCT:product-library ───

const productLibrary = page({
  type: 'PRODUCT',
  slug: 'product-library',
  title: 'Ready Product Library',
  summary:
    'The Nafaa product library gives every type of business a ready-made product list to start from: more than 21,000 medicines from the DRAP price index for pharmacies, a grocery list with barcodes, and starter lists for 23 other trades. Search, tick what you sell and Nafaa creates the products in minutes.',
  data: { icon: 'book-open', shortName: 'Product library', benefit: 'Your Product List, Ready in Minutes', status: 'live' },
  seoTitle: 'Ready Product List for Pharmacy, Grocery and Shops',
  seoDescription:
    'Start with a ready product list: DRAP medicines with salts and MRP, grocery items with barcodes, and starter lists for 23 more trades. Pick, import and sell.',
  focusKeyword: 'pharmacy medicine list software',
  hero: {
    eyebrow: 'Product library',
    heading: 'Your product list, ready before your first bill',
    sub: 'Typing hundreds of products by hand is the slowest part of starting any POS. Nafaa ships ready-made lists for every kind of business. Search the list for your trade, tick what you sell, choose the branch and opening stock, and the products are created for you.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['DRAP medicines with salts', 'Grocery barcodes', '25 ready lists'],
  },
  answer: {
    heading: 'The library in short',
    facts: [
      ['Pharmacy', '21,785 medicines from the DRAP Pharmaceutical Product Price Index, with salts, strength, pack, company and MRP'],
      ['Grocery', '1,720 items, 1,069 of them with barcodes'],
      ['Other trades', 'Starter lists for 23 more business types, with estimated prices'],
      ['Import', 'Pick items, choose branch and opening stock; nothing you already have is created twice'],
    ],
    romanUrdu: 'Har karobar ke liye tayyar products ki list: pharmacy ke liye DRAP ki 21 hazar se zyada dawaiyan formula aur MRP ke saath, grocery barcode ke saath, aur baqi trades ki starter lists. Chunein, add karein, aur bechna shuru karein.',
  },
  body: [
    features('What is in the library', [
      ['pill', 'Medicines from DRAP', 'Brand, salts and strength, form, pack, company, registration number and the DRAP MRP for every medicine.'],
      ['barcode', 'Grocery with barcodes', 'Pakistani grocery items with barcodes and pictures where they are known, so scanning works from day one.'],
      ['boxes', 'Starter lists for trades', 'Hardware, garments, shoes, mobile, auto parts, cosmetics, bakery and more, with categories and units.'],
      ['calculator', 'Your margin, your cost', 'Set a margin and Nafaa works out cost from the price, or type your own prices before you add.'],
      ['shield-check', 'No duplicates', 'Items already in your products are marked "Added" and are not created again.'],
      ['scan-barcode', 'Scan to find', 'Scan a barcode into the search box; if the library knows it, that item shows up.'],
    ]),
    table('Ready lists by business type', 'Counts are the items in each list as shipped with Nafaa in November 2026. Pharmacy prices are the DRAP MRP; other lists carry estimated prices that you check before selling.', [
      { key: 'items', label: 'Items', highlight: true },
      { key: 'notes', label: 'Notes' },
    ], [
      ['Pharmacy', '21,785', 'DRAP price index: salts, strength, form, pack, company, reg. no, MRP'],
      ['Grocery and general store', '1,720', '1,069 with barcodes; some items need your price before adding'],
      ['Cosmetics', '406', 'Includes beauty items with barcodes'],
      ['Shoes', '300', 'Estimated prices'],
      ['Garments', '288', 'Estimated prices'],
      ['Auto parts', '261', 'Estimated prices'],
      ['Hardware', '254', 'Estimated prices'],
      ['Stationery and books', '216', 'Estimated prices'],
      ['Mobile shop', '200', 'Estimated prices'],
      ['Dairy, sports, electronics', '167, 165, 164', 'Estimated prices'],
      ['Agri, pet shop, toys', '154, 156, 156', 'Estimated prices'],
      ['Appliances, restaurant, bakery', '148, 145, 124', 'Estimated prices'],
      ['Salon, optical, furniture', '117, 107, 101', 'Estimated prices'],
      ['Jewelry, florist, meat, carpet', '99, 95, 92, 82', 'Estimated prices'],
    ]),
    steps('From empty shop to ready counter', [
      ['Open the library', 'Go to Products and open the library. It opens on the list for your business type; you can look at the other lists too.'],
      ['Search and tick', 'Search by name, brand, category or barcode. Pharmacies can also search by formula, company or registration number. Tick one item or a whole page.'],
      ['Set price and stock', 'Choose the margin or type your own price, pick the branch, and add an opening stock if you want one (otherwise stock starts at zero).'],
      ['Add and sell', 'Nafaa creates the products in the background and shows how many were made, skipped or need a price. They are ready on the POS at once.'],
    ]),
    prose(`## Built for pharmacies first

A pharmacy can carry thousands of medicines, and the same salt comes from many companies. The pharmacy list comes from the [DRAP Pharmaceutical Product Price Index](https://e.dra.gov.pk/public/price), the Drug Regulatory Authority of Pakistan's public list of registered medicines and their maximum retail prices, copied in November 2026. Each medicine keeps its salts and strength, so when you add it to your shop Nafaa also knows which medicines share the same formula.

That pays off at the counter. When a customer asks for a brand you are out of, the **Same formula** button on the bill line shows the other medicines with the same salts and strength that you stock, with their price, so you can offer a substitute or add it in one tap. Cost is worked out as the MRP minus your margin (15% unless you change it), and you can always edit the cost and price of any product afterwards. Prices change, so check the MRP on the pack before you sell, and see the [pharmacy](/industries/pharmacy) page for batches, expiry and the rest of the pharmacy tools.

## Grocery with barcodes

The grocery list covers the everyday items of a Pakistani [kiryana store](/industries/kiryana): tea, milk, oil, spices, snacks, soap and more. Barcodes and pictures come from Open Food Facts, an open database shared under the ODbL licence, so most packed items scan straight away. A few items in the list have no price yet; the app asks you to type one before they are added.

## Starter lists for every other trade

For hardware, garments, shoes, mobile shops, auto parts, cosmetics, bakery, dairy and the other trades in the table above, the library has a starter list of common items with categories and units. These prices are estimates to save typing, and the app labels them "Andaza price". Treat them as a first draft: tick what you sell, set your own margin, and correct prices as you go.

## When you have your own list

If your products are already in Excel or another system, the [bulk import](/product/inventory) on the web brings them in with a dry run first. Many shops do both: import their own list, then fill the gaps from the library. Our team can also help as part of [data migration](/services/data-migration).`),
    callout('info', 'The library is available on the web and in the [Nafaa POS mobile app](/mobile-app). Products you add from it are normal Nafaa products: you can edit, price, stock and delete them like any other.', 'Normal products, ready to edit'),
  ],
  faqKeys: ['nov-library-what', 'nov-library-pharmacy', 'nov-library-prices'],
  cta: { heading: 'Start with a ready list', body: 'Start the 7-day free trial, open the product library and have your counter ready today.' },
  relations: [
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'PAGE:mobile-app', kind: 'RELATED' },
  ],
  sortOrder: 15,
  evidence: [
    'apps/api/src/modules/inventory/products/library/library-data.ts',
    'apps/api/src/modules/inventory/products/library/product-library.service.ts',
    'apps/api/src/modules/inventory/products/library/data',
    'apps/web/src/modules/inventory/products/library/ProductLibrary.tsx',
    'apps/api/src/industries/pharmacy/common/strength.ts',
    'apps/mobile/src/modules/inventory/library',
  ],
  needsOwner: ['Item counts are from the shipped data files (15 Nov 2026); update the table when the lists are refreshed.'],
});

// ─── PAGE:partners ───

const partners = page({
  type: 'PAGE',
  slug: 'partners',
  title: 'Nafaa Partner Program',
  summary:
    'The Nafaa partner program is for people who already work with businesses: IT and hardware dealers, accountants, consultants and field sales teams. Partners bring shops to Nafaa, help them get started and earn commission on the plans those shops pay for. Applications are open; the partner portal opens soon.',
  data: { template: 'default', icon: 'handshake', shortName: 'Partners' },
  seoTitle: 'Nafaa Partner and Reseller Program in Pakistan',
  seoDescription:
    'Become a Nafaa partner: bring shops and businesses to Nafaa, help them set up and earn commission on their plans. Applications are open now in Pakistan.',
  focusKeyword: 'pos reseller program pakistan',
  hero: {
    eyebrow: 'Partner program',
    heading: 'Bring Nafaa to the businesses you already serve',
    sub: 'You know the shops in your area. They trust you with their computers, printers, accounts or advice. Help them run on Nafaa, and earn from every business you bring that starts paying for its plan.',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'apply', label: 'Apply', icon: 'clipboard-list' },
        { id: 'agree', label: 'Agree terms', icon: 'handshake' },
        { id: 'bring', label: 'Bring shops', icon: 'store' },
        { id: 'setup', label: 'Help them start', icon: 'graduation-cap' },
        { id: 'earn', label: 'Earn commission', icon: 'coins' },
      ],
      edges: [
        { from: 'apply', to: 'agree' },
        { from: 'agree', to: 'bring' },
        { from: 'bring', to: 'setup' },
        { from: 'setup', to: 'earn' },
      ],
    },
    layout: 'split',
    primary: { label: 'Apply to become a partner', href: '#quote', trackAs: 'partner_apply' },
    secondary: { label: 'Message us on WhatsApp', href: 'whatsapp', trackAs: 'partner_whatsapp' },
    badges: ['Applications open', 'Commission on paid plans', 'Partner portal coming soon'],
  },
  answer: {
    heading: 'The program in short',
    facts: [
      ['Who it is for', 'IT and hardware dealers, accountants, consultants, field sales teams and trainers'],
      ['What partners do', 'Introduce Nafaa, help shops sign up and get started'],
      ['How partners earn', 'Commission on the plan payments of the businesses they bring, as set in the partner agreement'],
      ['Status', 'Applications open now; the partner portal opens soon'],
    ],
    romanUrdu: 'Nafaa partner banein: apne ilaqe ki dukaanon ko Nafaa par layein, unhe shuru karne me madad karein, aur jab wo plan ka paisa dein to aap ko commission mile. Abhi form bhar kar apply karein; partner portal jald aa raha hai.',
  },
  body: [
    features('Who makes a good Nafaa partner', [
      ['monitor', 'IT and hardware dealers', 'You sell computers, printers, scanners and cash drawers to shops. Nafaa runs on the hardware you already sell.'],
      ['calculator', 'Accountants and tax consultants', 'Your clients need clean sales, stock and khata records. Nafaa keeps them in one place.'],
      ['briefcase', 'Business consultants', 'You help businesses grow and organise. Nafaa gives them the system to do it.'],
      ['map', 'Field sales teams', 'You visit markets every day. Nafaa suits every kind of shop you walk into.'],
      ['graduation-cap', 'Trainers and freelancers', 'You set up software and teach staff. Shops need someone local to get them started.'],
      ['building-2', 'Distributors and suppliers', 'Your retailers order from you. On Nafaa they can keep their own books and stock too.'],
    ]),
    steps('How it works', [
      ['Apply', 'Fill in the form below with your name, city, what you do today and the businesses you work with.'],
      ['Talk to our team', 'We call or message you, explain the program and agree the commission terms in a partner agreement.'],
      ['Bring businesses', 'Introduce Nafaa to shops you know. When they sign up, they are linked to you as their partner.'],
      ['Help them start', 'Help with setup, products and the first bills. Shops that start well stay, and so does your income.'],
      ['Earn', 'When a business you brought pays for its plan, you earn the commission agreed in your partner agreement.'],
    ]),
    prose(`## What you offer the businesses you bring

Nafaa is complete business software from Pakistan, so you can offer it to almost any business you walk into: a [kiryana store](/industries/kiryana), a [pharmacy](/industries/pharmacy), a [restaurant](/industries/restaurant), a [garments shop](/industries/garments), a [wholesaler or distributor](/solutions/wholesale-distribution), and many more. It covers the [POS counter](/product/pos), [stock](/product/inventory), [khata](/product/khata), [reports](/product/reports) and [online selling](/product/online-store) in one account, runs on a computer, in the browser and in the [Nafaa POS mobile app](/mobile-app), keeps billing without internet, and speaks [English, Urdu and Roman Urdu](/languages).

Every new business starts with a 7-day free trial, so you can show it working before anyone pays. Ready [product lists](/product/product-library) mean a pharmacy or grocery store can have its counter ready on the same visit.

## How partner earnings work

When a business signs up through you, it is linked to you as its partner. When that business starts paying for its Nafaa plan, you earn a commission on its payments for an agreed period, and there can be extra bonuses when the shop starts selling on Nafaa or when you reach a monthly target. The exact amounts, the period and how often you are paid are written in your partner agreement before you start. We do not publish one rate for everyone, because a hardware dealer who also sets up and trains is doing more than a referral.

## The partner portal

We have built a partner portal where partners will log field visits, keep their leads, share their partner link and follow their earnings and payouts. It is opening soon. Until then, our team handles everything with you directly on WhatsApp and email, and every business you bring is recorded against your name from the start.

## Honest about where we are

The partner program is new. We are starting with a small number of partners so each one gets proper support, and we will open the portal to everyone once it is live. If you apply now, you will hear from us directly.`),
    leadForm('Apply to become a Nafaa partner', 'Tell us your name, city and phone, what you do today (for example hardware dealer or accountant) and roughly how many businesses you work with. We reply on WhatsApp or by email.', { form: 'contact', formType: 'PARTNERSHIP', subjectPrefix: 'Partner application' }),
  ],
  faqKeys: ['nov-partner-portal', 'nov-partner-earn'],
  cta: { heading: 'Questions before you apply?', body: 'Message us on WhatsApp and we will explain the program in a few minutes.', primary: { label: 'Message us on WhatsApp', href: 'whatsapp', trackAs: 'cta_whatsapp' }, secondary: { label: 'See pricing', href: '/pricing', trackAs: 'cta_pricing' } },
  relations: [
    { ref: 'PAGE:pricing', kind: 'RELATED' },
    { ref: 'PAGE:mobile-app', kind: 'RELATED' },
    { ref: 'SERVICE:hardware', kind: 'RELATED' },
    { ref: 'SERVICE:training', kind: 'RELATED' },
    { ref: 'PAGE:contact', kind: 'RELATED' },
  ],
  sortOrder: 40,
  evidence: [
    'apps/api/src/modules/partners/commission/partner-commission.service.ts',
    'apps/api/src/modules/partners/attribution/partner-attribution.service.ts',
    'apps/api/src/modules/partners/portal/partner-portal.service.ts',
    'apps/partner/src/modules',
    'apps/site/src/components/islands/LeadForm.tsx',
  ],
  needsOwner: [
    'The partner portal (apps/partner) is not live: no Vercel project or partner.nafaa.pk DNS yet. Update this page with the portal link once it opens.',
    'Commission amounts are not published; confirm the owner wants them shared only in the agreement.',
  ],
});

// ─── PAGE:languages ───

const languages = page({
  type: 'PAGE',
  slug: 'languages',
  title: 'Nafaa in English, Urdu and Roman Urdu',
  summary:
    'Nafaa works in three languages: English, Urdu in right-to-left script, and Roman Urdu. Each person picks their own language for their screens on the web, desktop and mobile app, and Nafaa AI answers in the language you use. Business words like Sale, Profit and Stock stay in the words shops already use.',
  data: { template: 'default', icon: 'languages', shortName: 'Languages' },
  seoTitle: 'POS Software in Urdu, English and Roman Urdu | Nafaa',
  seoDescription:
    'Use Nafaa in English, Urdu (right to left) or Roman Urdu. Each person picks their own language on web, desktop and the mobile app. Simple words throughout.',
  focusKeyword: 'urdu pos software',
  hero: {
    eyebrow: 'Three languages',
    heading: 'Run your business in the language you think in',
    sub: 'Nafaa speaks English, Urdu and Roman Urdu across the whole app. The owner can read reports in English while the cashier bills in Urdu on the same account, and everyone uses simple, everyday words.',
    media: { id: MOBILE_SHOT.ur.billing, frame: 'none' },
    layout: 'split',
    badges: ['English', 'اردو', 'Roman Urdu'],
  },
  answer: {
    heading: 'Languages in short',
    facts: [
      ['Languages', 'English, Urdu (right to left) and Roman Urdu'],
      ['Who chooses', 'Each person picks their own language; the shop sets a bill language'],
      ['Where', 'Web app, Windows desktop app and the Nafaa POS mobile app'],
      ['Nafaa AI', 'Answers in the language of the question or the app'],
    ],
    romanUrdu: 'Nafaa teen zabanon me hai: English, Urdu aur Roman Urdu. Har banda apni zaban khud chunta hai, aur Nafaa AI bhi usi zaban me jawab deta hai.',
  },
  body: [
    features('One app, three languages', [
      ['globe', 'English', 'Clear, plain English for owners, managers and accountants.'],
      ['languages', 'Urdu', 'Urdu script with the whole screen right to left, in an Urdu font made for screens.'],
      ['message-square', 'Roman Urdu', 'Urdu written in English letters, the way most people type on their phones.'],
      ['users', 'Each person chooses', 'The owner, manager and cashier can each use a different language on the same account.'],
      ['sparkles', 'Nafaa AI too', 'Ask a question in English, Urdu or Roman Urdu and the answer comes back in the same language.'],
      ['smartphone', 'Every device', 'The same three languages on the web, the Windows desktop app and the mobile app.'],
    ]),
    shot({
      heading: 'Urdu, right to left',
      body: 'In Urdu the whole app turns right to left: menus, forms, tables and the bill. The default Urdu font is Noto Naskh, which stays clear on a busy screen; if you prefer the classic Nastaliq look, choose it under Appearance.',
      id: MOBILE_SHOT.ur.home,
      frame: 'none',
      layout: 'split-right',
    }),
    steps('Choose your language', [
      ['At sign-up or login', 'The language picker is on the login page and the first sign-up step.'],
      ['From the profile menu', 'Switch at any time from the menu under your name.'],
      ['In Settings', 'Settings → Language shows all three with a sample line, so everyone can recognise their own.'],
      ['On the phone', 'The mobile app asks on first open and keeps the choice in Settings.'],
    ]),
    prose(`## Simple words, business terms people already use

Shops in Pakistan mix languages every day. A cashier says "Sale" and "Stock" in English and "udhaar" and "khata" in Urdu. Nafaa follows the same habit: everyday words are simple, and common business terms such as Sale, Profit, Cost, Expense, Discount and Stock stay as they are in every language, so nobody has to learn new words to use the app. Menu names in Roman Urdu use the English names shops already know, such as Day report and Customer credit.

## Your language, your colleague's language

The language is chosen per person, not per shop. The owner can read reports in English at home, the manager can work in Roman Urdu, and the cashier can bill in Urdu on the counter, all on the same account and the same numbers. New accounts start in English; anyone can switch in a second.

Separately, the shop owner sets a **bill language** in Settings. This is the language meant for bills, receipts and messages that go to customers, and it is one setting for the whole shop.

## Nafaa AI speaks your language

The [Nafaa AI assistant](/product/ai-assistant) answers in the language of your question. Ask "aaj ki sale kitni hui?" and the answer comes in Roman Urdu; ask in English and it answers in English; if the app is set to Urdu, the answer is in Urdu script. Business words stay in English inside the answer, the same as on the screens.

## Finding customers in any spelling

People write names in different ways. In the mobile app, customer search understands English, Roman Urdu and Urdu script, so "ahmad" also finds "Ahmed", and any phone format finds the right customer. That makes the [khata](/product/khata) quick to use whichever way your staff type.

## What is still being translated

The screens, menus, messages from the server and Nafaa AI are in all three languages. A few things are still being finished: some printed papers and Excel column names keep their original wording, and weekday and month names show in English. We are translating these next and list each change in the [changelog](/changelog).`),
    callout('tip', 'Many pages of this website have an Urdu version too. Use the language switch at the bottom of the page.', 'Read this site in Urdu'),
  ],
  faqKeys: ['nov-lang-switch', 'nov-lang-urdu-rtl'],
  cta: { heading: 'Try Nafaa in your language', body: 'Start the 7-day free trial and pick English, Urdu or Roman Urdu on the first screen.' },
  relations: [
    { ref: 'PAGE:mobile-app', kind: 'RELATED' },
    { ref: 'PRODUCT:ai-assistant', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PAGE:pricing', kind: 'RELATED' },
  ],
  sortOrder: 41,
  evidence: [
    'apps/web/src/core/i18n/locales.ts',
    'apps/web/src/core/i18n/components/LanguagePicker.tsx',
    'apps/web/src/modules/organization/settings/sections/LocalizationSection.tsx',
    'apps/web/src/design-system/tokens/typography.ts',
    'apps/api/src/modules/ai-assistant/ai-prompt.ts',
    'apps/mobile/src/core/i18n/locales.ts',
    'apps/mobile/src/core/offline/README.md',
  ],
  needsOwner: ['Open translation items from the 2 Nov deploy (printed papers, CSV headers, weekday names) are stated as still being finished; remove that paragraph when they are done.'],
});

export const novPages: SeedEntry[] = [mobileApp, productLibrary, partners, languages];
