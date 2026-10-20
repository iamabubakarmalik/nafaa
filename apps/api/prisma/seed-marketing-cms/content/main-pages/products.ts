/**
 * PRODUCT pages (/product/<slug>), the "Products" column of the header.
 * Every claim is backed by the files in `evidence` (checked 20 Oct 2026).
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, features, page, pricing, prose, shot, steps, table } from './_build';

const COMMON_FAQ = ['devices', 'offline', 'pricing'];

const pos = page({
  type: 'PRODUCT',
  slug: 'pos',
  title: 'POS & Billing',
  summary:
    'Nafaa POS is the billing counter for any business: scan a barcode or tap a quick key, sell by piece, dozen or carton, take cash, card, JazzCash, Easypaisa or khata in one bill, print or WhatsApp the receipt, and keep billing when the internet drops. It runs on the phone, tablet or computer you already have.',
  data: { icon: 'scan-barcode', shortName: 'POS', benefit: 'Fast Billing That Works Offline', status: 'live', planFeature: 'featurePos', appRoute: '/pos' },
  seoTitle: 'POS Software in Pakistan: Fast Billing That Works Offline',
  seoDescription:
    'Nafaa POS: barcode billing, units, split payments, JazzCash, Easypaisa, khata and WhatsApp receipts. Keeps billing offline. Start with a 7-day free trial.',
  focusKeyword: 'pos software pakistan',
  hero: {
    eyebrow: 'Point of sale',
    heading: 'The counter that never makes a customer wait',
    sub: 'Scan, tap or search, sell in any unit, split the bill across cash, card and wallets, and hand over a printed or WhatsApp receipt in seconds. When the internet drops, Nafaa keeps billing and syncs later.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Works offline', 'JazzCash & Easypaisa', 'WhatsApp receipts'],
  },
  answer: {
    facts: [
      ['Runs on', 'Any web browser on a phone, tablet or computer, plus a Windows desktop app'],
      ['Without internet', 'Sales are saved on the device and sent when the connection returns'],
      ['Payments', 'Cash, card, JazzCash, Easypaisa, bank transfer and khata, split in one bill'],
      ['Hardware', 'Optional: barcode scanner, 58 or 80 mm thermal printer, cash drawer'],
      ['Price', 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial'],
    ],
    romanUrdu:
      'Nafaa POS se barcode scan karein ya quick key dabayein, piece, darjan ya carton me bechein, cash, card, JazzCash, Easypaisa ya udhaar me paise lein aur receipt print ya WhatsApp karein. Internet chala jaye to bhi bill bante rehte hain.',
  },
  body: [
    shot({
      heading: 'Built for the rush hour',
      body: 'Products sit in big tiles by category with their stock on each one, so a new cashier finds them on day one. The bill stays on the right, with the customer, discount, delivery charge and every way to pay one tap away. Keyboard shortcuts cover everything for fast hands.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 40, y: 26, label: 'Categories and quick keys' },
        { x: 30, y: 47, label: 'Stock left on every tile' },
        { x: 85, y: 22, label: 'The bill, with the customer' },
        { x: 85, y: 93, label: 'Cash, card, JazzCash, Easypaisa, udhaar' },
      ],
    }),
    steps('From scan to receipt in four moves', [
      ['Find the item', 'Scan the barcode, search by name, or tap a quick key for loose items like sugar or eggs.'],
      ['Pick the unit', 'Sell by piece, dozen or carton. Each unit has its own price, and stock is counted in the base unit.'],
      ['Take payment', 'Cash, card, JazzCash, Easypaisa or bank transfer, or put it on the customer\'s khata. Split one bill across several.'],
      ['Hand over the receipt', 'Print on a thermal printer or send it on WhatsApp, with your shop name, logo and return policy on it.'],
    ]),
    features('Everything the counter needs', [
      ['wifi-off', 'Keeps billing offline', 'When the internet drops, sales are saved on the device and sync on their own when it returns. You can see what is still waiting to be sent.'],
      ['layers', 'Units and packs', 'Piece, dozen, carton or any pack you define, each with its own price and barcode.'],
      ['wallet', 'Split payments', 'One bill, many ways to pay: part cash, part card, part on the khata.'],
      ['shield-check', 'Counter rules', 'Refunds and big discounts need the manager PIN. Every sensitive action is logged with a name.'],
      ['rotate-ccw', 'Returns and exchanges', 'Find the old bill, take back items, and the stock and khata update by themselves.'],
      ['message-circle', 'WhatsApp receipts', 'Send the bill to the customer\'s WhatsApp instead of paper.'],
    ]),
    shot({
      heading: 'In your pocket too',
      body: 'The same counter runs on an Android phone, so a small shop can start with nothing else. Add a Bluetooth printer and scanner when you are ready.',
      id: SHOT.posPhone,
      frame: 'phone',
      layout: 'split-left',
    }),
    prose(`## Made for how Pakistani shops really sell

Most billing software is built for one price per item and one way to pay. Pakistani counters are different: the same cooking oil sells by the bottle and by the carton, regular customers pay at the end of the month, and more and more bills are paid on JazzCash or Easypaisa. Nafaa handles all of that on one screen, in English or Roman Urdu.

It is also built for the realities of load-shedding and weak signal. The counter does not stop when the internet does, and the Windows desktop app prints straight to the receipt printer and opens the cash drawer without extra clicks.`),
    pricing('Start free, upgrade when you grow'),
  ],
  faqKeys: ['mp-pos-hardware', 'mp-pos-payments', ...COMMON_FAQ],
  cta: { heading: 'Open your counter in minutes', body: 'Start the 7-day free trial on the device you already have. No card needed.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
  ],
  sortOrder: 1,
  featured: true,
  evidence: [
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
    'apps/web/src/modules/pos/lib/posUnits.ts',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/sales/returns',
    'apps/web/src/core/lib/whatsapp/templates.ts',
    'apps/desktop/src/main/cashDrawer.ts',
  ],
});

const inventory = page({
  type: 'PRODUCT',
  slug: 'inventory',
  title: 'Inventory',
  summary:
    'Nafaa Inventory keeps stock right in every unit and every branch: products with cost, price and margin, barcodes and labels, combos, low-stock alerts, damage and adjustments with reasons, stock transfers between branches, and a full movement history. Import your list from Excel in minutes.',
  data: { icon: 'boxes', shortName: 'Inventory', benefit: 'Stock You Can Trust', status: 'live', appRoute: '/products' },
  seoTitle: 'Inventory Software in Pakistan: Stock You Can Trust',
  seoDescription:
    'Nafaa inventory: stock by unit and branch, low-stock alerts, transfers, damage, barcode labels and Excel import, linked to the POS. Start a 7-day free trial.',
  focusKeyword: 'inventory software pakistan',
  hero: {
    eyebrow: 'Inventory',
    heading: 'Know what is on the shelf without counting it',
    sub: 'Every sale, purchase, return and transfer moves stock by itself, in the right unit and the right branch. See value, margin and what is running low at a glance, and fix the rest with reasons on record.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Excel import', 'Low-stock alerts', 'Branch transfers'],
  },
  answer: {
    facts: [
      ['Tracks', 'Stock, cost, sale price and margin for every product and unit'],
      ['Moves stock', 'Sales, purchases, returns, damage, adjustments and transfers'],
      ['Alerts', 'Low-stock list with a reorder shortcut'],
      ['Setup', 'Excel import with a check before anything is saved'],
    ],
    romanUrdu:
      'Nafaa me har bikri, khareed, wapsi aur transfer se stock khud update hota hai. Kam stock ki list, har cheez ka cost aur margin, aur Excel se poori list ek dafa me daalein.',
  },
  body: [
    shot({
      heading: 'Your whole stock, priced and valued',
      body: 'Each product card shows the sale price, cost, margin and stock, with the total stock value on top. Filter by category, brand or tag, and open any product to see every movement behind its number.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'split-right',
    }),
    features('Stock control without the spreadsheet', [
      ['layers', 'Units and packs', 'Buy in cartons, sell in pieces. Stock is kept in the base unit and shown in the one you choose.'],
      ['barcode', 'Barcodes and labels', 'Use the maker\'s barcode or create your own, and print shelf labels from the desktop app.'],
      ['triangle-alert', 'Low-stock alerts', 'A live list of what is about to run out, ready to turn into a purchase.'],
      ['package-check', 'Damage and adjustments', 'Record broken, expired or missing stock with a reason, so the loss shows in reports.'],
      ['arrow-left-right', 'Branch transfers', 'Send stock to another branch; the other side confirms what arrived.'],
      ['gift', 'Combos and deals', 'Bundle items into a deal with its own price; each item\'s stock goes down when it sells.'],
    ]),
    shot({
      heading: 'Never run out of the fast movers',
      body: 'The low-stock list collects every product below its alert level, so the morning order takes minutes instead of a walk through the shelves.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'split-left',
    }),
    steps('Set up your stock in an afternoon', [
      ['Download the template', 'One Excel sheet with columns for name, barcode, unit, cost, price and opening stock.'],
      ['Fill it in or paste your list', 'Bring your list from any old software or a notebook typed into Excel.'],
      ['Check the dry run', 'Nafaa shows every row it will add or change and flags mistakes before anything is saved.'],
      ['Start selling', 'The counter, reports and online channels read the same stock from the first sale.'],
    ], undefined, true),
    prose(`## One stock for the counter, the website and the marketplace

Stock in Nafaa is not a separate list that someone updates at night. The counter, purchase bills, returns, online orders and Nafaa Bazaar all move the same numbers, so what you see is what is on the shelf. Businesses with branches see each branch's stock and can transfer between them, and the stock report shows value at cost for your accountant.`),
  ],
  faqKeys: ['mp-inventory-import', 'mp-branches-transfer', 'offline'],
  cta: { heading: 'Put your stock in order this week', body: 'Import your products from Excel and see your real stock value today.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:autoparts', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
  ],
  sortOrder: 2,
  featured: true,
  evidence: [
    'apps/web/src/modules/inventory/products',
    'apps/web/src/modules/inventory/product-units',
    'apps/web/src/modules/inventory/low-stock',
    'apps/web/src/modules/inventory/damage',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/modules/inventory/combos',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/desktop/src/main/labelPrinter.ts',
  ],
});

const khata = page({
  type: 'PRODUCT',
  slug: 'khata',
  title: 'Digital Khata',
  summary:
    'Nafaa Digital Khata replaces the paper udhaar register: every credit sale lands in the customer\'s khata from the counter, payments and old balances are recorded, balances are grouped by age, credit limits stop runaway udhaar, and a WhatsApp reminder goes out in one tap.',
  data: { icon: 'notebook-pen', shortName: 'Khata', benefit: 'Udhaar That Comes Back', status: 'live', planFeature: 'featureKhata', appRoute: '/customers' },
  seoTitle: 'Digital Khata App in Pakistan: Udhaar That Comes Back',
  seoDescription:
    'Nafaa digital khata: udhaar from the POS, payments, ageing, credit limits and one-tap WhatsApp reminders. Replace the paper register. 7-day free trial.',
  focusKeyword: 'digital khata app',
  hero: {
    eyebrow: 'Digital khata',
    heading: 'The udhaar register that collects for you',
    sub: 'Credit sales go into the customer\'s khata straight from the counter. See who owes what and for how long, stop new udhaar at a limit, and send a polite WhatsApp reminder with the balance in one tap.',
    media: { id: SHOT.khata, url: 'app.nafaa.pk/khata' },
    badges: ['WhatsApp reminders', 'Credit limits', 'Ageing buckets'],
  },
  answer: {
    facts: [
      ['From the counter', 'Any bill, or part of one, can go on the customer\'s khata'],
      ['Old register', 'Bring opening balances over from the paper khata'],
      ['Reminders', 'One-tap WhatsApp message with the balance, firmer as udhaar ages'],
      ['Control', 'Credit limit per customer; going over needs the manager PIN'],
    ],
    romanUrdu:
      'Nafaa khata me udhaar seedha counter se judta hai. Kis ne kitna dena hai aur kab se, sab saamne. Credit limit lagayein aur WhatsApp par ek click me yaad-dihani bhejein.',
  },
  body: [
    shot({
      heading: 'See every rupee you are owed',
      body: 'The khata opens on the total receivable, split into ageing buckets, with the customers who owe the most at the top. Tap a name to see every sale and payment behind the balance.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
    }),
    steps('How udhaar comes back', [
      ['Sell on khata', 'Pick the customer at the counter and put the bill, or the part not paid, on their khata.'],
      ['Watch the age', 'Balances move from new to 30, 60 and 90 days, so slow payers stand out.'],
      ['Remind on WhatsApp', 'Send the balance from your own WhatsApp in one tap. The wording gets firmer as the udhaar gets older.'],
      ['Record the payment', 'Cash, wallet or bank: the payment clears the balance and shows in the day book.'],
    ]),
    features('A khata your customers trust', [
      ['notebook-pen', 'Full history', 'Every sale, payment and opening balance with date and bill number.'],
      ['hand-coins', 'Partial payments', 'Take whatever the customer can pay today; the rest stays on record.'],
      ['shield', 'Credit limits', 'Stop udhaar at the limit you set, unless a manager approves.'],
      ['message-circle', 'WhatsApp statements', 'Send a clear balance message instead of arguing over a notebook.'],
      ['users', 'Suppliers too', 'Track what you owe suppliers next to what customers owe you.'],
      ['smartphone', 'On your phone', 'Check a balance from home or the market, not only at the counter.'],
    ]),
    shot({ heading: 'Balances in your pocket', body: 'The khata works on a phone, so you can answer "kitna banta hai?" anywhere.', id: SHOT.khataPhone, frame: 'phone', layout: 'split-left' }),
    prose(`## Why a digital khata beats the register

A paper register cannot remind anyone, cannot add up ageing, and is lost the day it gets wet. With Nafaa, the khata is written by the counter itself, so there are no missed entries, and every balance can be shown to the customer line by line. Shops that move their old register into Nafaa usually start with the opening balances only, then let the counter do the rest.`),
  ],
  faqKeys: ['khata-reminders', 'mp-khata-limit', 'offline'],
  cta: { heading: 'Retire the paper register', body: 'Move your opening balances in and let the counter keep the khata.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:meat', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
  ],
  sortOrder: 3,
  featured: true,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/purchasing/suppliers',
  ],
});

const fbr = page({
  type: 'PRODUCT',
  slug: 'fbr',
  title: 'FBR & PRA Invoicing',
  summary:
    'Nafaa is an FBR & PRA approved POS integrator. Every sale can be reported to FBR, PRA, SRB or KPRA from the counter, the fiscal invoice number and QR code print on the receipt, failed invoices retry by themselves, and tax reports are ready for your return.',
  data: { icon: 'shield-check', shortName: 'FBR & PRA', benefit: 'Fiscal Invoices From the Counter', status: 'live', appRoute: '/settings/tax' },
  seoTitle: 'FBR POS Integration: Fiscal Invoices From the Counter',
  seoDescription:
    'FBR & PRA approved POS integrator. Report invoices to FBR, PRA, SRB and KPRA, print fiscal number and QR on receipts, auto-retry offline. Free trial.',
  focusKeyword: 'fbr pos integration',
  hero: {
    eyebrow: 'FBR & PRA invoicing',
    heading: 'Tax-ready on every bill, without slowing the counter',
    sub: 'Connect your POS ID once. From then on each sale is reported to FBR or your provincial authority, the fiscal number and QR code print on the receipt, and anything the tax server misses is sent again on its own.',
    diagram: { kind: 'fbr-invoice' },
    layout: 'split',
    badges: ['FBR & PRA approved POS integrator', 'SRB and KPRA too'],
  },
  answer: {
    facts: [
      ['Status', 'FBR & PRA approved POS integrator'],
      ['Authorities', 'FBR (Tier-1 retail), PRA (Punjab), SRB (Sindh), KPRA (Khyber Pakhtunkhwa)'],
      ['On the receipt', 'Fiscal invoice number and verification QR code'],
      ['When offline', 'Invoices queue and retry automatically; failures are listed with the reason'],
    ],
    romanUrdu:
      'Nafaa FBR aur PRA se approved POS integrator hai. Har bill FBR, PRA, SRB ya KPRA ko report hota hai, receipt par fiscal number aur QR chhapta hai, aur internet na ho to baad me khud bhej deta hai.',
  },
  body: [
    shot({
      heading: 'One setup screen for every authority',
      body: 'Enter your POS ID, NTN and credentials for FBR, PRA, SRB or KPRA, test against the sandbox, then switch to live. Sales tax rates and which items are taxable stay with each product.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'split-right',
    }),
    steps('How a fiscal invoice is made', [
      ['Sell as usual', 'The cashier bills normally; nothing extra to type at the counter.'],
      ['Nafaa reports it', 'The invoice goes to FBR or your provincial authority in the background.'],
      ['Number and QR print', 'The fiscal invoice number and QR code print on the receipt for the customer to verify.'],
      ['Misses are retried', 'If the tax server is slow or the internet is down, the invoice waits in a queue and is sent again.'],
    ]),
    features('Compliance that runs itself', [
      ['shield-check', 'Approved integrator', 'Nafaa is an FBR & PRA approved POS integrator.'],
      ['landmark', 'Four authorities', 'FBR for goods, plus PRA, SRB and KPRA for services such as restaurants and salons.'],
      ['qr-code', 'Receipt QR', 'Customers can verify the invoice from the QR on the receipt.'],
      ['refresh-cw', 'Automatic retry', 'Queued invoices go out when the connection returns; errors are explained in plain words.'],
      ['rotate-ccw', 'Returns reported', 'Returns are reported against the original invoice.'],
      ['file-spreadsheet', 'Tax reports', 'Sales tax summaries by period for your return and your accountant.'],
    ]),
    table('Which authority applies to you', 'Who collects sales tax depends on what you sell and where. Check your registration with your tax adviser.', [
      { key: 'auth', label: 'Authority', highlight: true },
      { key: 'area', label: 'Area' },
    ], [
      ['Tier-1 retailers selling goods', 'Federal Board of Revenue (FBR)', 'All of Pakistan'],
      ['Restaurants, salons and other services', 'Punjab Revenue Authority (PRA)', 'Punjab'],
      ['Services', 'Sindh Revenue Board (SRB)', 'Sindh'],
      ['Services', 'Khyber Pakhtunkhwa Revenue Authority (KPRA)', 'Khyber Pakhtunkhwa'],
    ]),
  ],
  faqKeys: ['mp-fbr-who', 'mp-fbr-offline', 'offline'],
  cta: { heading: 'Get compliant without changing how you sell', body: 'Our team can set up the integration with you. Start with the free trial.' },
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:fbr-pos', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:tier-1-retailer', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:ntn', kind: 'RELATED' },
    { ref: 'BLOG_POST:fbr-e-invoicing-complete-guide-2026', kind: 'RELATED' },
  ],
  sortOrder: 4,
  featured: true,
  evidence: [
    'apps/api/src/integrations/fbr/fbr.service.ts',
    'apps/api/src/integrations/fbr/fbr-errors.ts',
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/api/src/integrations/tax-authority/tax-reports.ts',
    'apps/web/src/integrations/fbr',
    'apps/web/src/integrations/tax-authority',
  ],
});

const onlineStore = page({
  type: 'PRODUCT',
  slug: 'online-store',
  title: 'Online Store',
  summary:
    'Nafaa brings online selling into the same account as the shop: orders from your own website, Shopify, WooCommerce, Daraz and Foodpanda arrive next to counter sales, take stock from the same shelf, and ship with TCS, Leopards, M&P, PostEx, Trax or CallCourier booked from the order.',
  data: { icon: 'shopping-bag', shortName: 'Online store', benefit: 'Sell Online From the Same Stock', status: 'live', appRoute: '/online-orders' },
  seoTitle: 'Online Store and Order Management for Pakistani Sellers',
  seoDescription:
    'Website, Shopify, WooCommerce, Daraz and Foodpanda orders in one place, one stock, courier booking with TCS, Leopards, PostEx and more. 7-day free trial.',
  focusKeyword: 'online store order management pakistan',
  hero: {
    eyebrow: 'Online store',
    heading: 'Your shop and your website, finally on one stock',
    sub: 'Orders from your website, Shopify, WooCommerce, Daraz and Foodpanda pop up at the counter, take stock from the same shelf and ship with the courier you already use. No more selling what you sold an hour ago.',
    media: { id: SHOT.posOnlineAlert, url: 'app.nafaa.pk/pos' },
    badges: ['Website, Shopify, WooCommerce', 'Courier booking', 'One stock'],
  },
  answer: {
    facts: [
      ['Channels', 'Website on Nafaa, Shopify, WooCommerce, Daraz, Foodpanda and Nafaa Bazaar'],
      ['Stock', 'One stock for counter and online; channels update when items sell'],
      ['Couriers', 'TCS, Leopards, M&P, PostEx, Trax and CallCourier'],
      ['Payments', 'COD, plus JazzCash and Easypaisa payment links'],
    ],
    romanUrdu:
      'Website, Shopify, WooCommerce, Daraz aur Foodpanda ke orders seedha Nafaa me aate hain, dukaan wale stock se kat-te hain, aur TCS, Leopards ya PostEx ki booking order se hi ho jati hai.',
  },
  body: [
    shot({
      heading: 'Every online order in one list',
      body: 'Orders from every channel land in one list with their status, the buyer\'s area and payment. Accept, pack, book the courier and track it without leaving Nafaa.',
      id: SHOT.onlineOrders,
      url: 'app.nafaa.pk/online-orders',
      layout: 'full',
    }),
    features('Run online like you run the counter', [
      ['globe', 'Your own website', 'Connect a website built on Nafaa, or link Shopify and WooCommerce stores you already have.'],
      ['bell-ring', 'Alerts at the counter', 'A new order pops up over the POS so nobody misses it in a busy hour.'],
      ['truck', 'Courier booking', 'Book TCS, Leopards, M&P, PostEx, Trax or CallCourier from the order and track it.'],
      ['shield', 'COD risk check', 'See a buyer\'s past orders and refusals before you ship cash-on-delivery.'],
      ['link', 'Payment links', 'Send a JazzCash or Easypaisa link so the buyer pays before dispatch.'],
      ['package-search', 'Google listings', 'Share your product feed with Google so shoppers can find your items.'],
    ]),
    shot({
      heading: 'Connect a channel in minutes',
      body: 'The sales channels screen shows what is connected and what you can add. Products are matched once, then prices and stock flow by themselves.',
      id: SHOT.salesChannels,
      url: 'app.nafaa.pk/channels',
      layout: 'split-right',
    }),
    steps('From click to doorstep', [
      ['Order arrives', 'From any channel, with the buyer, address and payment method.'],
      ['Accept and pack', 'Stock is reserved from the same shelf the counter sells from.'],
      ['Book the courier', 'Choose the courier, print the label and hand over the parcel.'],
      ['Collect the cash', 'Mark COD as collected when the courier pays out; reports show what is still due.'],
    ]),
  ],
  faqKeys: ['mp-online-channels', 'mp-ecommerce-stock', 'sell-online'],
  cta: { heading: 'Bring your online orders home', body: 'Connect your store and see every order next to your counter sales.' },
  relations: [
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
    { ref: 'SOLUTION:ecommerce', kind: 'RELATED' },
  ],
  sortOrder: 5,
  featured: true,
  evidence: [
    'apps/api/src/integrations/online-orders/shopify.service.ts',
    'apps/api/src/integrations/online-orders/woocommerce.service.ts',
    'apps/api/src/integrations/online-orders/daraz.service.ts',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
    'apps/api/src/integrations/channels/custom-website',
    'apps/api/src/integrations/online-orders/courier-api',
    'apps/api/src/integrations/online-orders/customer-risk.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/google/feed.ts',
    'apps/api/src/integrations/online-orders/stock-push.service.ts',
  ],
});

const multiShop = page({
  type: 'PRODUCT',
  slug: 'multi-shop',
  title: 'Multi-Branch',
  summary:
    'Nafaa Multi-Branch runs every shop or branch from one account: each branch keeps its own counter, stock and cash, head office compares sales and profit side by side, stock moves between branches with transfers, and staff only see the branches they work in.',
  data: { icon: 'building-2', shortName: 'Multi-branch', benefit: 'Every Branch in One View', status: 'live', planFeature: 'featureMultiShop', appRoute: '/branches' },
  seoTitle: 'Multi-Branch POS Software: Every Branch in One View',
  seoDescription:
    'Run every branch from one Nafaa account: branch analytics, P&L, day book, stock transfers and staff by branch. On plans with more than one shop. Free trial.',
  focusKeyword: 'multi branch pos software',
  hero: {
    eyebrow: 'Multi-branch',
    heading: 'Three branches, one clear picture',
    sub: 'Each branch bills, stocks and closes its own day. You see all of them together: sales, profit, cash and stock, branch by branch, from your phone or the head-office desk.',
    media: { id: SHOT.branches, url: 'app.nafaa.pk/branches' },
    badges: ['Branch P&L', 'Stock transfers', 'Staff by branch'],
  },
  answer: {
    facts: [
      ['Each branch', 'Its own counter, stock, cash register and day book'],
      ['Head office', 'Sales, profit and loss, staff and customers compared side by side'],
      ['Stock', 'Transfers with send and receive confirmation'],
      ['Plans', 'Number of shops per plan comes from the pricing page'],
    ],
    romanUrdu:
      'Har branch apna counter, stock aur galla chalati hai, aur aap sab branches ki bikri, munafa aur stock ek jagah dekhte hain. Ek branch se doosri me stock transfer bhi asaan.',
  },
  body: [
    shot({
      heading: 'Compare branches at a glance',
      body: 'Branch analytics put each branch\'s sale, bills and trend next to the others, so you see at once which one needs attention.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/branches',
      layout: 'full',
    }),
    features('Built for owners who cannot be everywhere', [
      ['layout-dashboard', 'Branch analytics', 'Sales, bills and average bill by branch, today and over time.'],
      ['chart-line', 'Branch P&L', 'Profit and loss per branch and for the whole business.'],
      ['notebook-pen', 'Day book', 'Each branch\'s cash in and out, closed at the end of the day.'],
      ['arrow-left-right', 'Stock transfers', 'Send stock between branches with a record on both sides.'],
      ['users', 'Staff by branch', 'Staff see only the branches they work in; reports by person.'],
      ['shield-check', 'Audit and activity', 'An activity log of refunds, discounts and changes, branch by branch.'],
    ]),
    shot({ heading: 'Every branch on one list', body: 'Open any branch to see its sale and stock, or jump straight into its counter.', id: SHOT.branchList, url: 'app.nafaa.pk/branches', layout: 'split-left' }),
    steps('Add a branch in four steps', [
      ['Create the branch', 'Name, address and its own receipt header.'],
      ['Give it stock', 'Transfer opening stock from the main shop or import its own list.'],
      ['Add the team', 'Invite staff and choose which branches each person can open.'],
      ['Start billing', 'The new counter reports into the same account from its first sale.'],
    ]),
  ],
  faqKeys: ['mp-branches-transfer', 'offline', 'pricing'],
  cta: { heading: 'Open the next branch with confidence', body: 'Run it from the same account and see it next to the others from day one.' },
  relations: [
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
  ],
  sortOrder: 6,
  evidence: ['apps/web/src/modules/multi-branch', 'apps/web/src/modules/inventory/transfers', 'apps/web/src/modules/reports/activity-log', 'apps/web/src/modules/hr/staff'],
});

const reports = page({
  type: 'PRODUCT',
  slug: 'reports',
  title: 'Reports',
  summary:
    'Nafaa Reports answer the owner\'s questions in plain numbers: today\'s sale and profit on the dashboard, profit by product, profit and loss with expenses, the day book, stock value, staff and customer reports, with Excel export and journals for QuickBooks, Xero, Zoho Books or Tally.',
  data: { icon: 'chart-column', shortName: 'Reports', benefit: 'Know Your Real Profit', status: 'live', planFeature: 'featureReports', appRoute: '/reports' },
  seoTitle: 'Business Reports Software: Know Your Real Profit Daily',
  seoDescription:
    'Dashboard, profit by product, P&L with expenses, day book, stock and staff reports, Excel export and accounting sync. Built into Nafaa POS. Free trial.',
  focusKeyword: 'profit report software',
  hero: {
    eyebrow: 'Reports',
    heading: 'Know your real profit, every single day',
    sub: 'Not just sales. Nafaa subtracts cost and expenses so you see what you actually earned, which products carry the shop, and where the cash went, in English or Roman Urdu.',
    media: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    badges: ['Profit after cost', 'Day book', 'Excel export'],
  },
  answer: {
    facts: [
      ['Dashboard', 'Today\'s sale, profit, cash in the drawer, online sales and udhaar'],
      ['Profit', 'By product and as a full P&L with expenses'],
      ['Daily close', 'Day book of cash in and out'],
      ['Export', 'Excel, PDF, and journals for QuickBooks, Xero, Zoho Books or Tally'],
    ],
    romanUrdu:
      'Nafaa sirf bikri nahi, asal munafa batata hai: cost aur kharche nikal kar. Kaun si cheez kitna kama rahi hai, galle me kitna hai, aur poora P&L, sab ek jagah.',
  },
  body: [
    shot({
      heading: 'The whole day on one screen',
      body: 'Today\'s sale, profit after cost, cash in the drawer, online orders, low stock and udhaar, with a short list of things that need you today.',
      id: SHOT.dashboard,
      url: 'app.nafaa.pk/dashboard',
      layout: 'full',
    }),
    features('Reports owners actually open', [
      ['trending-up', 'Profit by product', 'Sale, cost, profit and margin for every item, so you know what to push.'],
      ['chart-line', 'Profit and loss', 'Net sale, gross profit, expenses and net profit for any period.'],
      ['notebook-pen', 'Day book', 'Opening cash, every movement and the closing balance.'],
      ['boxes', 'Stock report', 'Stock and its value at cost, by category and branch.'],
      ['users', 'Staff and customers', 'Sales by staff member, and your best and slowest-paying customers.'],
      ['file-spreadsheet', 'Export and accounting', 'Excel and PDF, plus daily journals to QuickBooks, Xero or Zoho Books, or a Tally export.'],
    ]),
    shot({ heading: 'Which products really make money', body: 'Profit by product sorts your catalogue by what it earns, not what it sells.', id: SHOT.profitByProduct, url: 'app.nafaa.pk/reports/profit', layout: 'split-right' }),
    shot({ heading: 'A P&L your accountant will accept', body: 'Net sale, cost of goods, gross profit, expenses and net profit, for a day, a month or a year.', id: SHOT.profitLoss, url: 'app.nafaa.pk/reports/pnl', layout: 'split-left' }),
  ],
  faqKeys: ['mp-reports-export', 'pricing', 'devices'],
  cta: { heading: 'See today\'s real profit tonight', body: 'Start the free trial and your dashboard fills itself from the first bill.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
  ],
  sortOrder: 7,
  evidence: [
    'apps/web/src/modules/dashboard',
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/reports/pnl',
    'apps/web/src/modules/reports/day-book',
    'apps/web/src/modules/inventory/stock-report',
    'apps/web/src/modules/reports/staff-report',
    'apps/web/src/modules/reports/exports',
    'apps/api/src/integrations/accounting',
  ],
});

const payments = page({
  type: 'PRODUCT',
  slug: 'payments',
  title: 'Payments',
  summary:
    'Nafaa takes every way Pakistan pays: cash, card, JazzCash, Easypaisa, bank transfer, QR and the customer\'s khata, split across one bill if needed, with a cash register that balances at the end of every day and payment links for online and phone orders.',
  data: { icon: 'wallet', shortName: 'Payments', benefit: 'Every Way Pakistan Pays', status: 'live', planFeature: 'featureCashRegister', appRoute: '/pos' },
  seoTitle: 'POS Payments in Pakistan: Cash, Card, JazzCash, Easypaisa',
  seoDescription:
    'Take cash, card, JazzCash, Easypaisa, bank transfer, QR and khata in one bill, close the cash register daily and send payment links. Nafaa free trial.',
  focusKeyword: 'jazzcash easypaisa pos',
  hero: {
    eyebrow: 'Payments',
    heading: 'Cash, card, wallets and khata on one bill',
    sub: 'Customers pay how they like, and Nafaa keeps every rupee in the right place: the drawer, the wallet account, the bank or the khata. At closing time the cash register tells you exactly what should be in the drawer.',
    media: { id: SHOT.posDark, url: 'app.nafaa.pk/pos' },
    badges: ['Split payments', 'Payment links', 'Cash register'],
  },
  answer: {
    facts: [
      ['Methods', 'Cash, card, JazzCash, Easypaisa, bank transfer, QR and khata'],
      ['Split', 'One bill across several methods'],
      ['Drawer', 'Opening cash, cash in and out, and the expected closing amount'],
      ['Online', 'JazzCash and Easypaisa payment links for website orders'],
    ],
    romanUrdu: 'Ek hi bill me cash, card, JazzCash, Easypaisa, bank ya udhaar. Din ke aakhir me galla khud batata hai ke drawer me kitne paise hone chahiye.',
  },
  body: [
    steps('How money moves through Nafaa', [
      ['At the counter', 'The cashier picks one method or splits the bill across several.'],
      ['Into the right account', 'Cash goes to the drawer, wallets and card to their accounts, credit to the khata.'],
      ['During the day', 'Record cash taken out for expenses or added for change.'],
      ['At closing', 'Count the drawer; Nafaa shows the expected amount and any difference.'],
    ]),
    features('Payments without the guesswork', [
      ['wallet', 'Split tender', 'Part cash, part card, part khata, all on one receipt.'],
      ['qr-code', 'Payment QR', 'Show your merchant QR at the counter; Nafaa checks it is a valid payment QR before saving.'],
      ['link', 'Payment links', 'Send JazzCash or Easypaisa links for online and phone orders.'],
      ['banknote', 'Cash register', 'Opening float, cash in and out, and a closing count with the difference.'],
      ['receipt', 'Expenses', 'Record shop expenses from the drawer so profit stays honest.'],
      ['chart-pie', 'Payment mix', 'See how much came in by each method in the day book.'],
    ]),
    shot({ heading: 'Every method one tap away', body: 'Cash, card, JazzCash, Easypaisa and udhaar sit at the bottom of the bill, with the total in large type.', id: SHOT.pos, url: 'app.nafaa.pk/pos', layout: 'split-right', callouts: [{ x: 86, y: 93, label: 'Payment methods' }, { x: 85, y: 79, label: 'Bill total' }] }),
    prose(`## Built around how Pakistan pays

Wallet payments are now part of every counter, but most billing software still treats them as "other". Nafaa records JazzCash, Easypaisa and bank transfers as their own methods, so the day book, the profit report and your accountant's journal all see the same split. Udhaar is a payment method too: what is not paid today goes on the customer's khata with the bill attached.`),
  ],
  faqKeys: ['mp-pos-payments', 'pricing', 'offline'],
  cta: { heading: 'Take every payment your customers offer' },
  relations: [{ ref: 'PRODUCT:pos', kind: 'RELATED' }, { ref: 'PRODUCT:khata', kind: 'RELATED' }, { ref: 'GLOSSARY_TERM:raast', kind: 'RELATED' }],
  sortOrder: 8,
  evidence: [
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/api/src/integrations/pay-qr/pay-qr.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/payments/jazzcash',
    'apps/api/src/integrations/payments/easypaisa',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/finance/expenses',
  ],
});

const offline = page({
  type: 'PRODUCT',
  slug: 'offline-pos',
  title: 'Offline POS',
  summary:
    'Nafaa keeps billing when the internet drops. Products, prices and customers are kept on the device, new sales and khata entries wait in an offline queue, and everything syncs to your account on its own when the connection returns, with a list of what is still waiting.',
  data: { icon: 'wifi-off', shortName: 'Offline POS', benefit: 'Billing That Never Stops', status: 'live', appRoute: '/pos' },
  seoTitle: 'Offline POS Software: Billing That Never Stops in Pakistan',
  seoDescription:
    'Nafaa keeps billing without internet: sales, khata and receipts work offline and sync when the connection returns. Built for load-shedding. Free trial.',
  focusKeyword: 'offline pos software',
  hero: {
    eyebrow: 'Works offline',
    heading: 'Load-shedding is not a reason to stop selling',
    sub: 'When the internet goes, the counter does not. Bills, receipts and khata entries keep working on the device, and Nafaa sends them to your account the moment the connection comes back.',
    diagram: { kind: 'offline-sync' },
    layout: 'split',
    badges: ['Sales queue on the device', 'Automatic sync'],
  },
  answer: {
    facts: [
      ['Works offline', 'Billing, receipts, returns and khata entries'],
      ['Stored on device', 'Products, prices, customers and pending sales'],
      ['Sync', 'Automatic when the connection returns; pending sales are listed'],
      ['Other branches', 'See offline sales once they have synced'],
    ],
    romanUrdu: 'Internet chala jaye to bhi Nafaa me bill bante rehte hain. Sales device par mehfooz rehti hain aur internet aate hi khud account me chali jati hain.',
  },
  body: [
    steps('What happens when the internet drops', [
      ['Nothing changes at the counter', 'The cashier keeps scanning and billing; a small badge shows you are offline.'],
      ['Sales wait safely', 'Each bill is saved on the device in an offline queue, with its receipt printed as usual.'],
      ['Connection returns', 'Queued sales are sent to your account in order, by themselves.'],
      ['Everyone catches up', 'Reports, stock and other branches update once the sync finishes.'],
    ]),
    features('Offline, done properly', [
      ['database', 'Local copy', 'Products, prices and customers are kept on the device for instant search.'],
      ['cloud-off', 'Offline queue', 'Bills and khata entries wait safely until they can be sent.'],
      ['refresh-cw', 'Automatic sync', 'No button to press; sync starts as soon as the internet is back.'],
      ['list-checks', 'Pending list', 'See exactly which sales are still waiting to reach the cloud.'],
      ['printer', 'Receipts keep printing', 'The printer does not care whether the internet is up.'],
      ['download', 'Backup reminders', 'Nafaa reminds you to export a backup of the data kept on the device.'],
    ]),
    shot({ heading: 'The counter you saw online works the same offline', id: SHOT.pos, url: 'app.nafaa.pk/pos', layout: 'full', caption: 'The Nafaa POS. Billing, search and receipts keep working without internet.' }),
  ],
  faqKeys: ['offline', 'devices', 'mp-fbr-offline'],
  cta: { heading: 'Try it: turn off the Wi-Fi and keep selling' },
  relations: [{ ref: 'PRODUCT:pos', kind: 'RELATED' }],
  sortOrder: 9,
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx',
    'apps/web/src/core/lib/offline/offlineAutoBackup.ts',
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
  ],
});

const purchasing = page({
  type: 'PRODUCT',
  slug: 'purchasing',
  title: 'Purchasing',
  summary:
    'Nafaa Purchasing records what you buy and what you owe: suppliers with their contact details and balances, purchase bills in any unit that add stock and update cost, full or partial payments to suppliers, and reorders started straight from the low-stock list.',
  data: { icon: 'clipboard-list', shortName: 'Purchasing', benefit: 'Suppliers and Payables in Order', status: 'live', appRoute: '/purchases' },
  seoTitle: 'Purchase and Supplier Management Software in Pakistan',
  seoDescription:
    'Suppliers, purchase bills, payables and reorders from low stock, with cost and stock updated automatically. Part of Nafaa POS. Start a 7-day free trial.',
  focusKeyword: 'supplier management software',
  hero: {
    eyebrow: 'Purchasing',
    heading: 'Buy smarter and always know what you owe',
    sub: 'Enter a supplier\'s bill once: stock goes up, cost is updated, and the amount owed lands on the supplier\'s account. Reorder from the low-stock list and pay suppliers from the same place.',
    media: { id: SHOT.lowStock, url: 'app.nafaa.pk/low-stock' },
    badges: ['Supplier balances', 'Reorder from low stock'],
  },
  answer: {
    facts: [
      ['Suppliers', 'Contact details, purchase history and balance owed'],
      ['Purchase bills', 'Add stock and update cost in one step'],
      ['Payables', 'Payments to suppliers, full or partial'],
      ['Reorders', 'Start a purchase from the low-stock list'],
    ],
    romanUrdu: 'Supplier ka bill ek dafa daalein: stock barh jata hai, cost update hoti hai, aur supplier ka hisaab khud ban jata hai. Kam stock ki list se seedha order banayein.',
  },
  body: [
    steps('A purchase in four steps', [
      ['Pick the supplier', 'Or add a new one with phone and address.'],
      ['Enter the bill', 'Items, quantities in any unit, and the price paid.'],
      ['Stock and cost update', 'Stock goes up and the product\'s cost follows the new price.'],
      ['Pay now or later', 'Pay in full or in part; the rest stays on the supplier\'s account.'],
    ]),
    features('Purchasing that keeps margins honest', [
      ['truck', 'Supplier accounts', 'Every bill and payment per supplier, with the balance owed.'],
      ['calculator', 'Cost updates', 'Profit reports use the latest cost, so margins stay true.'],
      ['triangle-alert', 'Reorder from low stock', 'Turn the low-stock list into a purchase in a few taps.'],
      ['printer', 'Printable bills', 'Print or share purchase bills for your records.'],
      ['layers', 'Buy in any unit', 'Buy cartons, sell pieces; Nafaa converts the stock.'],
      ['file-spreadsheet', 'Export', 'Purchases and supplier balances export to Excel.'],
    ]),
    shot({ heading: 'Start from what is running out', id: SHOT.lowStock, url: 'app.nafaa.pk/low-stock', layout: 'split-right', body: 'The low-stock list is the shopping list: items under their alert level, ready to reorder.' }),
  ],
  faqKeys: ['mp-inventory-import', 'pricing'],
  cta: { heading: 'Get your supplier accounts in order' },
  relations: [{ ref: 'PRODUCT:inventory', kind: 'RELATED' }, { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' }],
  sortOrder: 10,
  evidence: ['apps/web/src/modules/purchasing/purchases', 'apps/web/src/modules/purchasing/suppliers', 'apps/web/src/modules/purchasing/print.ts', 'apps/web/src/modules/inventory/low-stock'],
});

const staff = page({
  type: 'PRODUCT',
  slug: 'staff',
  title: 'Staff & Payroll',
  summary:
    'Nafaa Staff gives every team member a login and a role, sets counter rules like the refund PIN, tracks attendance, works out sales commission, runs payroll and logs every sensitive action with a name, so the owner can trust the counter without standing behind it.',
  data: { icon: 'users', shortName: 'Staff', benefit: 'Trust the Counter When You Are Away', status: 'live', appRoute: '/staff' },
  seoTitle: 'Staff, Attendance and Payroll Software for Shops',
  seoDescription:
    'Roles and permissions, manager PIN for refunds, attendance, commission and payroll, with an activity log of every sensitive action. Nafaa free trial.',
  focusKeyword: 'staff payroll software pakistan',
  hero: {
    eyebrow: 'Staff & payroll',
    heading: 'Trust the counter, even when you are not there',
    sub: 'Give each person their own login and only the access they need. Refunds and big discounts wait for the manager PIN, attendance and commission add up by themselves, and every sensitive action is on record.',
    media: { id: SHOT.staff, url: 'app.nafaa.pk/staff' },
    badges: ['Roles and PIN', 'Attendance', 'Commission and payroll'],
  },
  answer: {
    facts: [
      ['Access', 'Roles with permissions, per branch'],
      ['Counter rules', 'Manager PIN for refunds and discounts over your limit'],
      ['People', 'Attendance, commission and payroll'],
      ['Records', 'Activity log of refunds, discounts, deletions and changes'],
    ],
    romanUrdu: 'Har staff ka apna login aur sirf zaroori ijazat. Refund aur bara discount manager PIN se, haazri aur commission khud jurte hain, aur har aham kaam ka record rehta hai.',
  },
  body: [
    shot({ heading: 'Your team at a glance', body: 'Team members, their roles, who is on duty, and sales by staff member, on one screen.', id: SHOT.staff, url: 'app.nafaa.pk/staff', layout: 'full' }),
    features('Control without micromanaging', [
      ['user-cog', 'Roles and permissions', 'Decide who can sell, refund, edit prices, see profit or open settings.'],
      ['key-round', 'Manager PIN', 'Refunds, voids and big discounts wait for a manager\'s PIN.'],
      ['calendar-check', 'Attendance', 'Who came, when, and for how long.'],
      ['percent', 'Commission', 'Sales commission per person, worked out from their sales.'],
      ['banknote', 'Payroll', 'Salaries with advances and commission, ready each month.'],
      ['eye', 'Activity log', 'A record of every sensitive action with the person\'s name and time.'],
    ]),
    steps('Bring your team on board', [
      ['Invite', 'Add staff by phone or email and choose their role.'],
      ['Set counter rules', 'Choose what needs the manager PIN and your discount limit.'],
      ['Track the month', 'Attendance and commission build up as they work.'],
      ['Pay', 'Run payroll and see it in your profit and loss.'],
    ]),
  ],
  faqKeys: ['mp-staff-permissions', 'pricing'],
  cta: { heading: 'Give your team the right keys' },
  relations: [{ ref: 'INDUSTRY:salon', kind: 'TAG' }, { ref: 'INDUSTRY:restaurant', kind: 'TAG' }, { ref: 'INDUSTRY:retail', kind: 'TAG' }, { ref: 'PRODUCT:multi-shop', kind: 'RELATED' }],
  sortOrder: 11,
  evidence: ['apps/web/src/modules/hr/staff', 'apps/web/src/modules/hr/attendance', 'apps/web/src/modules/hr/commission', 'apps/web/src/modules/hr/payroll', 'apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/reports/activity-log'],
});

const whatsapp = page({
  type: 'PRODUCT',
  slug: 'whatsapp-sms',
  title: 'WhatsApp Messages',
  summary:
    'Nafaa talks to customers where they already are: receipts on WhatsApp instead of paper, udhaar reminders with the exact balance, thank-you messages after a purchase, and a WhatsApp chat with online buyers opened straight from their order, all in wording you can edit to sound like your shop.',
  data: { icon: 'message-circle', shortName: 'WhatsApp', benefit: 'Receipts and Reminders on WhatsApp', status: 'live', planFeature: 'featureWhatsappReceipt' },
  seoTitle: 'WhatsApp Receipts and Udhaar Reminders for Shops',
  seoDescription:
    'Send receipts on WhatsApp, remind customers about udhaar with their exact balance and chat with online buyers from the order. Nafaa 7-day free trial.',
  focusKeyword: 'whatsapp receipt pos',
  hero: {
    eyebrow: 'WhatsApp',
    heading: 'Receipts and reminders where customers actually look',
    sub: 'Skip the paper roll and send the bill to WhatsApp. Remind udhaar customers with their exact balance in one tap, and message online buyers straight from their order.',
    media: { id: SHOT.khataPhone, frame: 'phone' },
    layout: 'split',
    badges: ['WhatsApp receipts', 'Udhaar reminders'],
  },
  answer: {
    facts: [
      ['Receipts', 'Send the bill to the customer\'s WhatsApp from the counter'],
      ['Reminders', 'Udhaar balance messages from the khata, firmer as it ages'],
      ['Orders', 'Open a WhatsApp chat with an online buyer from the order'],
      ['Plans', 'WhatsApp receipts on plans that include them'],
    ],
    romanUrdu: 'Bill WhatsApp par bhejein, udhaar walon ko unka hisaab ek click me yaad dilayein, aur online order wale customer se order se hi WhatsApp par baat karein.',
  },
  body: [
    features('Messages that save time and paper', [
      ['receipt', 'WhatsApp receipts', 'The full bill, sent to the customer\'s number.'],
      ['bell-ring', 'Udhaar reminders', 'A polite message with the balance; the tone firms up as udhaar ages.'],
      ['truck', 'Online buyers', 'Open a WhatsApp chat with the buyer from any online order.'],
      ['notebook-pen', 'Your own wording', 'Edit the receipt, thank-you and reminder messages to sound like you.'],
      ['languages', 'Roman Urdu or English', 'Messages read naturally to your customers.'],
      ['user-check', 'From your number', 'Reminders go from your own WhatsApp, so customers know who is writing.'],
    ]),
    steps('A reminder in one tap', [
      ['Open the khata', 'Customers who owe are sorted by amount and age.'],
      ['Tap remind', 'Nafaa writes the message with the balance and last payment.'],
      ['Send from WhatsApp', 'Your WhatsApp opens with the message ready to send.'],
      ['Get paid', 'Record the payment and the balance clears.'],
    ]),
    shot({ heading: 'The khata that writes the message', body: 'From the khata, every customer with a balance is one tap away from a reminder.', id: SHOT.khata, url: 'app.nafaa.pk/khata', layout: 'split-right' }),
  ],
  faqKeys: ['khata-reminders', 'pricing'],
  cta: { heading: 'Stop printing, start messaging' },
  relations: [{ ref: 'PRODUCT:khata', kind: 'RELATED' }, { ref: 'PRODUCT:pos', kind: 'RELATED' }],
  sortOrder: 12,
  evidence: ['apps/web/src/core/lib/whatsapp/templates.ts', 'apps/web/src/modules/customers/directory/messages.ts', 'apps/web/src/integrations/online-orders/components/OrderDetailPanel.tsx', 'apps/api/src/integrations/whatsapp'],
  needsOwner: ['The menu calls this page "WhatsApp & SMS". SMS in the API is used for sign-in and admin messages only, not for shops messaging customers, so the page does not claim SMS.'],
});

const loyalty = page({
  type: 'PRODUCT',
  slug: 'loyalty',
  title: 'Loyalty',
  summary:
    'Nafaa Loyalty turns first-time buyers into regular customers: points on every purchase that can be used on a later bill, tiers for your best buyers, referral rewards, and discounts and promotions you control, all recorded on the customer\'s profile at the counter.',
  data: { icon: 'award', shortName: 'Loyalty', benefit: 'Bring Customers Back', status: 'live', planFeature: 'featureLoyalty', appRoute: '/customers/loyalty' },
  seoTitle: 'Customer Loyalty and Points Software for Shops',
  seoDescription:
    'Points, tiers, referrals and promotions linked to the POS and customer profiles. Reward regulars and bring customers back. Nafaa 7-day free trial.',
  focusKeyword: 'loyalty program software',
  hero: {
    eyebrow: 'Loyalty',
    heading: 'Give regulars a reason to come back',
    sub: 'Customers earn points on every bill and move up tiers as they buy more. Referral rewards bring their friends, and promotions you set run at the counter without extra work.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Points and tiers', 'Referrals', 'Promotions'],
  },
  answer: {
    facts: [
      ['Points', 'Earned on purchases, used as a discount on a later bill'],
      ['Tiers', 'Levels for your best customers'],
      ['Referrals', 'Rewards when a customer brings someone new'],
      ['Promotions', 'Discounts and deals that apply at the counter'],
    ],
    romanUrdu: 'Har khareed par points, achhe customers ke liye tiers, dost lane par inaam, aur aap ke set kiye hue offers counter par khud lagte hain.',
  },
  body: [
    features('Loyalty that runs at the counter', [
      ['star', 'Points', 'Customers earn on every bill and redeem at checkout.'],
      ['award', 'Tiers', 'Reward your best buyers with a higher level.'],
      ['user-plus', 'Referrals', 'Track who brought whom and reward the referral.'],
      ['badge-percent', 'Promotions', 'Discounts and deals with start and end dates.'],
      ['gift', 'Combos', 'Bundle items into a deal at a special price.'],
      ['users', 'Customer profiles', 'Points, tier, khata and history in one place.'],
    ]),
    steps('Launch a loyalty program in a day', [
      ['Choose the earning rule', 'How many points each rupee earns.'],
      ['Set tiers', 'Name the levels and what each one gets.'],
      ['Tell customers', 'Add their phone at the counter to start earning.'],
      ['Watch them return', 'See points earned and used in the customer report.'],
    ]),
    shot({ heading: 'Rewards without extra steps', body: 'Pick the customer at checkout; points and tier discounts apply on the bill.', id: SHOT.pos, url: 'app.nafaa.pk/pos', layout: 'split-right' }),
  ],
  faqKeys: ['pricing', 'devices'],
  cta: { heading: 'Turn first-time buyers into regulars' },
  relations: [{ ref: 'INDUSTRY:cosmetics', kind: 'TAG' }, { ref: 'INDUSTRY:salon', kind: 'TAG' }, { ref: 'INDUSTRY:garments', kind: 'TAG' }, { ref: 'PRODUCT:pos', kind: 'RELATED' }],
  sortOrder: 13,
  evidence: ['apps/api/src/modules/loyalty-tiers', 'apps/web/src/modules/customers/loyalty', 'apps/web/src/modules/customers/referrals', 'apps/api/src/modules/promotions', 'apps/web/src/modules/sales/discounts', 'apps/web/src/modules/inventory/combos'],
});

export const products: SeedEntry[] = [pos, inventory, khata, fbr, onlineStore, multiShop, reports, payments, offline, purchasing, staff, whatsapp, loyalty];

