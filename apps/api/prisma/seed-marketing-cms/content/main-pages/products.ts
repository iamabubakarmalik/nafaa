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
      body: 'This is the Classic layout: products in big tiles by category with their stock on each one, so a new cashier finds them on day one. The bill stays on the right, with the customer, discount, delivery charge and every way to pay one tap away. The green button finishes a cash bill and prints it, and F12 does the same from the keyboard.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 40, y: 26, label: 'Categories and quick keys' },
        { x: 30, y: 47, label: 'Stock left on every tile' },
        { x: 85, y: 22, label: 'The bill, with the customer' },
        { x: 85, y: 86, label: 'F12: cash and print' },
        { x: 85, y: 93, label: 'Card, JazzCash, Easypaisa, udhaar' },
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
    table('Four counter layouts, one counter', 'The owner picks the shop default in Settings, Counter & POS. Each cashier can switch to another layout on their own browser without changing anyone else\'s.', [
      { key: 'screen', label: 'What the screen shows' },
      { key: 'best', label: 'Best for', highlight: true },
    ], [
      ['Classic', 'Product tiles on the left, the bill on the right', 'Most shops, and new cashiers who like to see the items'],
      ['Express', 'A large search box with the bill as a table below it', 'Barcode scanners and fast typists at a busy counter'],
      ['Cart-focus', 'A large bill on the left and a slim product list on the right', 'Long bills that need checking line by line, like wholesale'],
      ['Touch', 'Bigger tiles and buttons', 'Tablets and touch screens'],
    ]),
    prose(`## Keyboard first, mouse optional

A cashier who knows the keys can finish a bill without looking away from the customer. Type \`3*\` before a name or barcode to add three at once, or type a mobile number like 0300 1234567 to find or add that customer. F2 opens the customer, F3 moves into the bill lines to change quantity or rate, F4 opens the discount, F6 holds the bill and brings it back, F8 opens payment where keys 1 to 6 choose cash, card, JazzCash, Easypaisa, udhaar or split, and F12 takes cash and prints. Alt+R repeats the last bill, Alt+1 to 9 add this counter's most sold items, and \`?\` shows every key on screen.

The owner also decides what the counter shows: product images, categories, quick keys, stock on tiles, the delivery charge, the discount button, line notes, price editing, sounds, auto-print and quick discount buttons such as 5% and 10%. A small shop can keep the screen simple and a busy one can switch on everything.`),
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
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'SERVICE:hardware', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:payments', kind: 'RELATED' },
    { ref: 'PRODUCT:offline-pos', kind: 'RELATED' },
    { ref: 'PRODUCT:fbr', kind: 'RELATED' },
  ],
  sortOrder: 1,
  featured: true,
  evidence: [
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
    'apps/web/src/modules/pos/lib/posCounterConfig.ts',
    'apps/web/src/modules/pos/lib/posKeys.ts',
    'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx',
    'apps/web/src/modules/pos/components/PosPayPicker.tsx',
    'apps/web/src/modules/organization/settings/sections/_PosCounter.tsx',
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
    'Nafaa Inventory keeps stock right in every unit and every branch: products with cost, price and margin, barcodes and labels, combos, low-stock alerts, damage and adjustments with reasons, stock transfers between branches, and a full movement history. Import from Excel or paste from a spreadsheet, and change many prices at once in the bulk editor.',
  data: { icon: 'boxes', shortName: 'Inventory', benefit: 'Stock You Can Trust', status: 'live', appRoute: '/products' },
  seoTitle: 'Inventory Software in Pakistan: Stock You Can Trust',
  seoDescription:
    'Nafaa inventory: stock by unit and branch, low-stock alerts, transfers, damage, barcode labels, Excel import and bulk edit, linked to the POS. 7-day free trial.',
  focusKeyword: 'inventory software pakistan',
  hero: {
    eyebrow: 'Inventory',
    heading: 'Know what is on the shelf without counting it',
    sub: 'Every sale, purchase, return and transfer moves stock by itself, in the right unit and the right branch. See value, margin and what is running low at a glance, and fix the rest with reasons on record.',
    media: { id: SHOT.inventory, url: 'app.nafaa.pk/products' },
    badges: ['Excel import and paste', 'Bulk edit', 'Low-stock alerts'],
  },
  answer: {
    facts: [
      ['Tracks', 'Stock, cost, sale price and margin for every product and unit'],
      ['Moves stock', 'Sales, purchases, returns, damage, adjustments and transfers'],
      ['Alerts', 'Low-stock list with days of stock left and a reorder shortcut'],
      ['Setup', 'Excel or CSV import, or cells pasted from a spreadsheet, checked line by line before saving'],
      ['Changes', 'Bulk editor for prices, cost, barcodes, alerts and stock counts'],
    ],
    romanUrdu:
      'Nafaa me har bikri, khareed, wapsi aur transfer se stock khud update hota hai. Kam stock ki list, har cheez ka cost aur margin, Excel se ya copy-paste se poori list ek dafa me, aur bulk edit se sau cheezon ki qeemat ek saath badlein.',
  },
  body: [
    shot({
      heading: 'Your whole stock, priced and valued',
      body: 'The top line shows what your stock cost, what it would sell for and how much sold in the last 30 days. Each product card shows the sale price, cost, margin and stock left, and items running low are listed above the grid. Filter by category, type or status, and open any product to see every movement behind its number.',
      id: SHOT.inventory,
      url: 'app.nafaa.pk/products',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Stock value at cost' },
        { x: 45, y: 33, label: 'Items running low' },
        { x: 60, y: 41, label: 'Category, type and status filters' },
        { x: 27, y: 82, label: 'Price, cost and margin' },
        { x: 96, y: 80, label: 'Stock left, marked when low' },
      ],
    }),
    features('Stock control without the spreadsheet', [
      ['layers', 'Units and packs', 'Buy in cartons, sell in pieces. Stock is kept in the base unit and shown in the one you choose.'],
      ['barcode', 'Barcodes and labels', 'Use the maker\'s barcode or create your own. Design the sticker once and print on a thermal roll or an A4 sticker sheet.'],
      ['triangle-alert', 'Low-stock alerts', 'A live list of what is about to run out, with days of stock left, ready to turn into a purchase order.'],
      ['package-check', 'Damage with approval', 'Staff report broken, expired or missing stock with a reason; stock only leaves when a manager approves.'],
      ['arrow-left-right', 'Branch transfers', 'Send stock to another branch; the other side receives it and any short delivery is recorded.'],
      ['gift', 'Combos and deals', 'Bundle items into a deal with its own price; each item\'s stock goes down when it sells.'],
    ]),
    shot({
      heading: 'Never run out of the fast movers',
      body: 'The low-stock list works out how many days each item will last at its current sale, suggests how much to order and from which supplier, and turns the list into a purchase order or a WhatsApp message to the supplier.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'split-left',
      callouts: [
        { x: 59, y: 63, label: 'Days of stock left' },
        { x: 70, y: 60, label: 'Suggested order' },
        { x: 93, y: 61, label: 'Order or WhatsApp the supplier' },
      ],
    }),
    steps('Set up your stock in an afternoon', [
      ['Bring the file, or paste', 'Upload an Excel or CSV file, download a sample made for your business type, or copy cells from any spreadsheet and paste them in.'],
      ['Check the columns', 'Nafaa finds the header row and matches columns from English, Roman Urdu or Urdu names. Pick the branch that receives the stock.'],
      ['Fix lines in the sheet', 'Every line opens in an editable grid. Errors show in their cells while you type, with find and replace, undo and paste from Excel.'],
      ['Import and start selling', 'Lines go in chunks with a progress bar that can pause and resume. Failed lines open again to fix, or download as Excel.'],
    ], undefined, true),
    table('Three ways to change many products at once', 'Pick the tool for the job. All three check every line before anything is saved, and stock is never overwritten without a record.', [
      { key: 'use', label: 'Use it when' },
      { key: 'stock', label: 'What happens to stock', highlight: true },
    ], [
      ['Excel import', 'You have a list from old software, a supplier or a notebook typed into Excel', 'For products already in the shop you choose: set stock to the file, add the file to stock, or leave stock alone'],
      ['Bulk create', 'You are typing new products row by row, like in a spreadsheet', 'Opening stock is added for the branch you choose'],
      ['Bulk edit', 'Prices, cost, barcodes, categories or low-stock alerts need changing on many items', 'A changed stock cell becomes a stock count, posted as an adjustment with the difference'],
    ]),
    prose(`## One stock for the counter, the website and the marketplace

Stock in Nafaa is not a separate list that someone updates at night. The counter, purchase bills, returns, online orders and Nafaa Bazaar all move the same numbers, so what you see is what is on the shelf. Businesses with branches see each branch's stock and can transfer between them, and the stock report shows value at cost and at sale price, what is dead or slow, what is near expiry, and the stock on any past date for your accountant.

## Who it is for

Any business that buys goods and sells them on: kiryana and general stores with thousands of small items, pharmacies that need batch and expiry dates, hardware and auto parts shops with odd units like feet and bori, garment and shoe shops with sizes and colours, and mobile shops that track every IMEI. Each industry pack adds its own fields on top of the same stock.

## What to check before you choose inventory software

- **Units.** Can you buy a carton of 24 and sell single pieces without doing the maths yourself?
- **Re-import safety.** If you import the same file twice, does stock double? In Nafaa, "set stock to the file" posts only the difference.
- **A reason for every change.** Damage, adjustments and transfers should leave a trail with a name, so a missing carton can be traced.
- **Speed of change.** Price rises come often. A bulk editor that saves only the changed cells saves an evening of typing.`),
  ],
  faqKeys: ['mp-inventory-import', 'mp-branches-transfer', 'offline'],
  cta: { heading: 'Put your stock in order this week', body: 'Import or paste your products and see your real stock value today.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:autoparts', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
  ],
  sortOrder: 2,
  featured: true,
  evidence: [
    'apps/web/src/modules/inventory/products',
    'apps/web/src/modules/inventory/product-units',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
    'apps/web/src/modules/inventory/damage/components/DecideModal.tsx',
    'apps/web/src/modules/inventory/transfers/components/ReceiveModal.tsx',
    'apps/web/src/modules/inventory/combos',
    'apps/web/src/modules/inventory/barcodes/pages/BarcodeLabelsPage.tsx',
    'apps/web/src/modules/inventory/stock-report/pages/StockReportPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkEditPage.tsx',
    'apps/web/src/modules/inventory/products/import/ImportOptions.tsx',
    'apps/web/src/modules/inventory/products/import/grid/SheetGrid.tsx',
    'apps/api/src/modules/inventory/products/bulk-edit/product-bulk-edit.service.ts',
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
      ['Without internet', 'Payments and khata entries wait on the device and sync later'],
    ],
    romanUrdu:
      'Nafaa khata me udhaar seedha counter se judta hai. Kis ne kitna dena hai aur kab se, sab saamne. Credit limit lagayein aur WhatsApp par ek click me yaad-dihani bhejein.',
  },
  body: [
    shot({
      heading: 'See every rupee you are owed',
      body: 'The khata opens on the total receivable and what came in this month, then splits the udhaar by age: under 7 days, 7 to 30, 30 to 90 and over 90. Customers who owe the most sit at the top, each with a Payment button, a WhatsApp reminder and a statement one tap away.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Total udhaar to collect' },
        { x: 48, y: 30, label: 'Udhaar by age' },
        { x: 87, y: 55, label: 'Record a payment' },
        { x: 94, y: 55, label: 'WhatsApp reminder and statement' },
        { x: 88, y: 12, label: 'Old register and new udhaar' },
      ],
    }),
    steps('How udhaar comes back', [
      ['Sell on khata', 'Pick the customer at the counter and put the bill, or the part not paid, on their khata. Over the credit limit, the counter asks for the manager PIN.'],
      ['Watch the age', 'Balances move from under 7 days to 7 to 30, 30 to 90 and over 90 days, so slow payers stand out before they become bad debt.'],
      ['Remind on WhatsApp', 'Send the balance from your own WhatsApp in one tap. The wording gets firmer as the udhaar gets older.'],
      ['Record the payment', 'Cash, JazzCash, Easypaisa or bank: the payment clears the oldest udhaar first and shows in the day book.'],
    ]),
    features('A khata your customers trust', [
      ['notebook-pen', 'Full history', 'Every sale, payment and opening balance with date and bill number, printable as a statement or PDF.'],
      ['hand-coins', 'Partial payments and advances', 'Take whatever the customer can pay today; money paid ahead is kept as advance.'],
      ['shield', 'Credit limits', 'Stop udhaar at the limit you set, unless a manager approves with the PIN.'],
      ['message-circle', 'Reminders in your words', 'Edit the three reminder messages once; Nafaa fills in the name, the balance and a fitting salutation such as bhai or baji.'],
      ['handshake', 'Suppliers too', 'Track what you owe each supplier next to what customers owe you.'],
      ['lock', 'Private by default', 'The khata sits behind the app PIN, and one tap hides every amount when a customer is looking at the screen.'],
    ]),
    table('Which reminder goes when', 'Nafaa picks the tone from how long the oldest unpaid udhaar has been waiting. You can change the wording of each one.', [
      { key: 'tone', label: 'Reminder tone', highlight: true },
      { key: 'why', label: 'Why it works' },
    ], [
      ['Under 7 days', 'Polite', 'A friendly note with the balance. Most regulars simply forgot.'],
      ['7 to 30 days', 'Firm', 'States the amount and asks for a date. Clear, never rude.'],
      ['30 days and more', 'Final', 'Asks for payment now, plainly. A good moment to lower the credit limit too.'],
    ]),
    shot({ heading: 'Balances in your pocket', body: 'The khata works on a phone, so you can answer "kitna banta hai?" from home or the market, not only at the counter. Payments taken without internet are saved on the phone and sync later.', id: SHOT.khataPhone, frame: 'phone', layout: 'split-left' }),
    prose(`## Why a digital khata beats the register

A paper register cannot remind anyone, cannot add up ageing, and is lost the day it gets wet. With Nafaa, the khata is written by the counter itself, so there are no missed entries, and every balance can be shown to the customer line by line. Shops that move their old register into Nafaa usually start with the opening balances only, using the "Purana khata" entry, then let the counter do the rest.

## Who it is for

Any business that sells on trust: kiryana and general stores with monthly accounts, milk shops and dairies with daily customers, hardware and building material dealers who give credit to contractors, pharmacies with family accounts, and wholesalers who sell to shopkeepers on a running khata. If you have ever argued with a customer over a page in the register, it is for you.

## What to look for in a khata app

- **It must be connected to billing.** A khata that you fill in separately misses entries on a busy day.
- **Ageing, not just a total.** A balance owed for a week is different from the same amount owed since Eid.
- **A limit that the counter respects.** Credit limits only work if the cashier cannot quietly go past them.
- **Statements the customer can read.** A clear list of bills and payments ends most disputes.`),
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
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
  ],
  sortOrder: 3,
  featured: true,
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/core/security/AppLockGate.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/purchasing/suppliers/components/SupplierMoneyModal.tsx',
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
      ['Tax returns', 'Monthly figures per authority, with A4 print and CSV'],
    ],
    romanUrdu:
      'Nafaa FBR aur PRA se approved POS integrator hai. Har bill FBR, PRA, SRB ya KPRA ko report hota hai, receipt par fiscal number aur QR chhapta hai, aur internet na ho to baad me khud bhej deta hai.',
  },
  body: [
    shot({
      heading: 'One setup screen for every authority',
      body: 'Pick the authority, enter your business name as registered, the PCT code and the tax rates, then add each branch with its own POS ID and NTN. Send a test bill to the sandbox first and switch to live when it is accepted.',
      id: SHOT.taxSetup,
      url: 'app.nafaa.pk/settings/tax',
      layout: 'full',
      callouts: [
        { x: 58, y: 22, label: 'PRA, SRB, KPRA or FBR' },
        { x: 27, y: 56, label: 'Sandbox first, then live' },
        { x: 60, y: 78, label: 'Rate for cash and for card or wallet' },
        { x: 85, y: 87, label: 'Only counter bills, or online too' },
        { x: 50, y: 92, label: 'POS ID and NTN per branch' },
      ],
    }),
    steps('How a fiscal invoice is made', [
      ['Sell as usual', 'The cashier bills normally; nothing extra to type at the counter.'],
      ['Nafaa reports it', 'The invoice goes to FBR or your provincial authority in the background, from the branch\'s own POS ID.'],
      ['Number and QR print', 'The fiscal invoice number and QR code print on the receipt for the customer to verify.'],
      ['Misses are retried', 'If the tax server is slow or the internet is down, the invoice waits in a queue and is sent again.'],
    ]),
    features('Compliance that runs itself', [
      ['shield-check', 'Approved integrator', 'Nafaa is an FBR & PRA approved POS integrator.'],
      ['landmark', 'Four authorities', 'FBR for Tier-1 retailers selling goods, plus PRA, SRB and KPRA for services such as restaurants and salons.'],
      ['qr-code', 'Receipt QR', 'Customers can verify the invoice from the QR on the receipt.'],
      ['refresh-cw', 'Automatic retry', 'Queued invoices go out when the connection returns; errors from the tax server are explained in plain words.'],
      ['rotate-ccw', 'Returns reported', 'A return is reported against the original invoice, so your tax figures go down with it.'],
      ['file-spreadsheet', 'Tax reports', 'Taxable sale, tax and returns per authority for every month, printable on A4 and as CSV for your accountant.'],
    ]),
    table('Which authority applies to you', 'Who collects sales tax depends on what you sell and where. Check your registration with your tax adviser. Official sites: FBR (fbr.gov.pk), PRA (pra.punjab.gov.pk), SRB (srb.gos.pk), KPRA (kpra.kp.gov.pk).', [
      { key: 'auth', label: 'Authority', highlight: true },
      { key: 'area', label: 'Area' },
    ], [
      ['Tier-1 retailers selling goods', 'Federal Board of Revenue (FBR)', 'All of Pakistan'],
      ['Restaurants, salons and other services', 'Punjab Revenue Authority (PRA)', 'Punjab'],
      ['Services', 'Sindh Revenue Board (SRB)', 'Sindh'],
      ['Services', 'Khyber Pakhtunkhwa Revenue Authority (KPRA)', 'Khyber Pakhtunkhwa'],
    ]),
    steps('The Tax section, tab by tab', [
      ['Overview', 'Taxable sale, tax and returns per authority for this month against last, and how many bills are still waiting.'],
      ['Invoices', 'Every bill that was sent, with its fiscal number, QR and the authority\'s answer. Anything not yet accepted has a retry button.'],
      ['Reports', 'Monthly sales tax figures per authority for your return, printable on A4 and downloadable as CSV.'],
      ['Settings', 'Authorities, branches, POS IDs, keys, rates and the test bill, in one place.'],
    ]),
    prose(`## Who needs FBR POS integration

The Sales Tax Act, 1990 defines Tier-1 retailers in section 2(43A). The definition covers, for example, retailers that are part of a national or international chain and retailers above limits for shop size or yearly electricity bill set in the law. Under Chapter XIV-AA of the Sales Tax Rules, 2006, Tier-1 retailers must report every sale to FBR in real time through an integrated POS. The limits change with Finance Acts, so confirm your status with FBR (fbr.gov.pk) or your tax adviser.

Services are taxed by the provinces. Restaurants, cafes, salons, gyms and other service businesses in Punjab report to PRA, in Sindh to SRB, and in Khyber Pakhtunkhwa to KPRA, each with its own POS registration. A business with branches in two provinces can set up both authorities; each branch reports to one.

## Details that matter at the counter

- **Prices include tax.** Nafaa treats the shelf price as tax-inclusive and works the tax out of it, so the customer pays the price on the tag.
- **Card and wallet rates.** Some authorities charge a lower rate when the customer pays by card or digital wallet. Nafaa keeps one rate for cash bills and another for card, JazzCash and bank payments, and applies the right one to each bill.
- **Online orders.** You choose whether website and marketplace orders are reported or only counter bills.
- **Customer verification.** Customers can check an FBR invoice by scanning the receipt QR with FBR's Tax Asaan app.

## Before you switch to live

Register the POS with your authority and get the POS ID and credentials for each branch, enter them in Nafaa, and send a test bill to the sandbox. When the test is accepted, switch to live. Our team can do this with you as a paid setup if you prefer.`),
  ],
  faqKeys: ['mp-fbr-who', 'mp-fbr-offline', 'offline'],
  cta: { heading: 'Get compliant without changing how you sell', body: 'Our team can set up the integration with you. Start with the free trial.' },
  relations: [
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'SERVICE:fbr-integration-setup', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:fbr-pos', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:tier-1-retailer', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:ntn', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:strn', kind: 'RELATED' },
    { ref: 'BLOG_POST:fbr-e-invoicing-complete-guide-2026', kind: 'RELATED' },
  ],
  sortOrder: 4,
  featured: true,
  evidence: [
    'apps/api/src/integrations/fbr/fbr.service.ts',
    'apps/api/src/integrations/fbr/fbr-errors.ts',
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/api/src/integrations/tax-authority/tax-setup.ts',
    'apps/api/src/integrations/tax-authority/tax-reports.ts',
    'apps/api/src/integrations/tax-authority/tax-authority.service.ts',
    'apps/web/src/modules/tax/TaxPage.tsx',
    'apps/web/src/integrations/fbr',
    'apps/web/src/integrations/tax-authority',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  needsOwner: ['Tax facts on this page (Sales Tax Act 1990 s. 2(43A), Sales Tax Rules 2006 Chapter XIV-AA, Tax Asaan invoice check) are from FBR public material; please confirm wording with the tax adviser before publishing.'],
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
      ['Channels', 'Website, Shopify, WooCommerce, Daraz, Foodpanda and Nafaa Bazaar'],
      ['Stock', 'One stock for counter and online; channels update when items sell'],
      ['Couriers', 'TCS, Leopards, M&P, PostEx, Trax and CallCourier'],
      ['Payments', 'COD, plus JazzCash and Easypaisa payment links'],
      ['COD risk', 'Each buyer\'s past orders, deliveries and returns before you ship'],
    ],
    romanUrdu:
      'Website, Shopify, WooCommerce, Daraz aur Foodpanda ke orders seedha Nafaa me aate hain, dukaan wale stock se kat-te hain, aur TCS, Leopards ya PostEx ki booking order se hi ho jati hai.',
  },
  body: [
    shot({
      heading: 'Every online order in one list',
      body: 'Orders from every channel land in one list with the buyer, their city, the items, how they pay and how long the order has waited. The top line shows online sale, COD still to collect and the return rate. Accept, pack, book the courier and track it without leaving Nafaa.',
      id: SHOT.onlineOrders,
      url: 'app.nafaa.pk/online-orders',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Online sale this period' },
        { x: 58, y: 30, label: 'COD still to collect' },
        { x: 56, y: 55, label: 'Paid or COD, new or repeat buyer' },
        { x: 63, y: 55, label: 'How long it has waited' },
        { x: 92, y: 58, label: 'Accept in one tap' },
      ],
    }),
    features('Run online like you run the counter', [
      ['globe', 'Your own website', 'Connect a website built by Nafaa or your developer, or link the Shopify and WooCommerce stores you already have.'],
      ['bell-ring', 'Alerts at the counter', 'A new order pops up over the POS so nobody misses it in a busy hour.'],
      ['truck', 'Courier booking', 'Book TCS, Leopards, M&P, PostEx, Trax or CallCourier from the order, print the label and track it.'],
      ['shield', 'COD risk check', 'See how many of a buyer\'s past orders were delivered, refused or cancelled before you ship cash-on-delivery.'],
      ['link', 'Payment links', 'Send a JazzCash or Easypaisa link so the buyer pays before dispatch.'],
      ['package-search', 'Google listings', 'Share your product feed with Google so shoppers can find your items.'],
    ]),
    shot({
      heading: 'Connect a channel in minutes',
      body: 'The sales channels screen shows what is connected, when its last order came in, and what you can add. WooCommerce and Shopify connect by approving or installing; a website your developer built connects with its own key. Products are matched once, then prices and stock flow by themselves.',
      id: SHOT.salesChannels,
      url: 'app.nafaa.pk/channels',
      layout: 'split-right',
      callouts: [
        { x: 45, y: 29, label: 'Live channel and new orders' },
        { x: 30, y: 43, label: 'WooCommerce' },
        { x: 49, y: 43, label: 'Shopify' },
        { x: 87, y: 43, label: 'Daraz and Foodpanda' },
      ],
    }),
    steps('From click to doorstep', [
      ['Order arrives', 'From any channel, with the buyer, address and payment method, and a risk badge from their history with your shop.'],
      ['Accept and pack', 'Choose the branch that ships it. Stock comes off the same shelf the counter sells from, and every channel sees the new number.'],
      ['Book the courier', 'Choose the courier, print the label and hand over the parcel. Tracking updates on the order.'],
      ['Collect the cash', 'Mark COD as collected when the courier pays out; reports show what is still due and what came back.'],
    ]),
    table('Which way to sell online', 'Most shops use more than one. All of them land in the same order list and the same stock.', [
      { key: 'how', label: 'How it connects' },
      { key: 'best', label: 'Good for', highlight: true },
    ], [
      ['Your own website', 'A site built by Nafaa or your developer, connected with a key', 'Shops that want their own name, prices and repeat buyers'],
      ['Shopify or WooCommerce', 'Install or approve the Nafaa connection', 'Stores already selling online that want one stock with the shop'],
      ['Daraz', 'Connect your seller account', 'Reaching buyers across Pakistan without your own marketing'],
      ['Foodpanda', 'Connect your restaurant', 'Restaurants and bakeries taking delivery orders'],
      ['Nafaa Bazaar', 'Publish products from Nafaa', 'Being found by nearby buyers on Nafaa\'s own marketplace'],
    ]),
    prose(`## Built for cash-on-delivery

Most online orders in Pakistan are still paid on delivery, and the biggest cost is the parcel that comes back: courier charges both ways and stock stuck on the road. Nafaa shows each buyer's record with your shop before you ship, so you can call to confirm, ask for an advance or send a payment link to buyers who refused before. Reports show COD collected, COD still with the courier and the return rate by channel.

## Who it is for

Garment, shoe and cosmetics shops that sell on Instagram and a website, electronics and mobile shops listed on Daraz, restaurants on Foodpanda, and any shop that wants its counter and its online store to stop overselling each other. If you also want a website built, Nafaa's team can do that as a service.`),
  ],
  faqKeys: ['mp-online-channels', 'mp-ecommerce-stock', 'sell-online'],
  cta: { heading: 'Bring your online orders home', body: 'Connect your store and see every order next to your counter sales.' },
  relations: [
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'TAG' },
    { ref: 'SOLUTION:ecommerce', kind: 'TAG' },
    { ref: 'SERVICE:online-store-setup', kind: 'RELATED' },
    { ref: 'SERVICE:websites', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:payments', kind: 'RELATED' },
  ],
  sortOrder: 5,
  featured: true,
  evidence: [
    'apps/api/src/integrations/online-orders/shopify.service.ts',
    'apps/api/src/integrations/online-orders/woocommerce.service.ts',
    'apps/api/src/integrations/online-orders/daraz.service.ts',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
    'apps/api/src/integrations/online-orders/website-setup.service.ts',
    'apps/api/src/integrations/channels/custom-website',
    'apps/api/src/integrations/online-orders/courier-api/registry.ts',
    'apps/api/src/integrations/online-orders/customer-risk.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/google/feed.ts',
    'apps/api/src/integrations/online-orders/stock-push.service.ts',
    'apps/web/src/integrations/online-orders/components/OrderBranchPicker.tsx',
    'apps/web/src/integrations/online-orders/components/OnlineOrderAlert.tsx',
  ],
});

const multiShop = page({
  type: 'PRODUCT',
  slug: 'multi-shop',
  title: 'Multi-Branch',
  summary:
    'Nafaa Multi-Branch runs every shop, warehouse or godown from one account: each branch keeps its own counter, stock and cash, head office compares sales and profit side by side, stock moves between branches with transfers that the other side receives, and each staff member works in the branch they are assigned to.',
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
      ['Branch types', 'Shops that sell, plus warehouses and godowns that only hold and send stock'],
      ['Stock', 'Transfers with send and receive confirmation'],
      ['Plans', 'Number of shops per plan comes from the pricing page'],
    ],
    romanUrdu:
      'Har branch apna counter, stock aur galla chalati hai, aur aap sab branches ki bikri, munafa aur stock ek jagah dekhte hain. Ek branch se doosri me stock transfer bhi asaan.',
  },
  body: [
    shot({
      heading: 'Compare branches at a glance',
      body: 'Branch analytics put every branch side by side for any period: sales, net profit and bills against the previous period of the same length, each branch\'s share of sales, the daily trend and the busy hours. The figures use the same maths as the reports, so the numbers always agree.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/branches',
      layout: 'full',
      callouts: [
        { x: 26, y: 19, label: 'Total sale, all branches' },
        { x: 43, y: 20, label: 'Net profit' },
        { x: 37, y: 41, label: 'Pick the period and branch' },
        { x: 33, y: 48, label: 'Compare, trend, rush time, table' },
        { x: 36, y: 70, label: 'Sale by branch' },
      ],
    }),
    features('Built for owners who cannot be everywhere', [
      ['layout-dashboard', 'Branch analytics', 'Sales, profit, bills and average bill by branch, against the last period.'],
      ['chart-line', 'Branch P&L', 'Profit and loss per branch and for the whole business.'],
      ['notebook-pen', 'Day book', 'Each branch\'s cash in and out, closed at the end of the day, or all branches together.'],
      ['arrow-left-right', 'Stock transfers', 'Send stock between branches; the other side receives it and a short delivery is recorded.'],
      ['warehouse', 'Warehouses and godowns', 'Keep bulk stock in a godown that does not sell, and send it to the shops that do.'],
      ['shield-check', 'Audit by branch', 'Voids, refunds, big discounts, drawer shorts and transfers that arrived short, filtered by branch and staff.'],
    ]),
    shot({
      heading: 'Every branch on one list',
      body: 'Each branch card shows today\'s sale, the cash in its drawer, its stock at cost, items running low and who is on duty. Open a branch to see its analytics, call or WhatsApp it, or switch into its counter.',
      id: SHOT.branchList,
      url: 'app.nafaa.pk/branches',
      layout: 'split-left',
      callouts: [
        { x: 27, y: 78, label: 'Today\'s sale' },
        { x: 38, y: 78, label: 'Cash in the drawer' },
        { x: 27, y: 87, label: 'Stock and items low' },
        { x: 38, y: 87, label: 'Staff on duty' },
      ],
    }),
    table('What each branch runs, and what head office sees', 'Branches work on their own during the day; head office sees all of them live from the same account.', [
      { key: 'branch', label: 'At each branch' },
      { key: 'office', label: 'At head office', highlight: true },
    ], [
      ['Sales', 'Its own counter, bills and returns', 'Sales, profit and bills for every branch, side by side'],
      ['Stock', 'Its own stock, low-stock list and damage', 'Stock value per branch, transfers in transit, what is low everywhere'],
      ['Cash', 'Its own drawer, shifts and day book', 'Cash in every open drawer and the day book for one branch or all'],
      ['Staff', 'People assigned to that branch', 'Staff sales, attendance and audit across branches'],
      ['Online orders', 'Packs the orders sent to it', 'Chooses which branch ships each order'],
    ]),
    steps('Add a branch in four steps', [
      ['Create the branch', 'Name, type (shop, warehouse or godown), phone and address. Create the branch manager\'s login in the same step.'],
      ['Give it stock', 'Transfer opening stock from the main shop or a godown, or import its own list from Excel.'],
      ['Add the team', 'Add staff and assign each person to the branch they work in.'],
      ['Start billing', 'The new counter reports into the same account from its first sale.'],
    ]),
    prose(`## Who it is for

Owners with a second shop in another bazaar, chains of pharmacies or grocery stores across a city, restaurants with more than one outlet, and wholesalers who keep stock in a godown and sell from a shop front. It also suits a single shop with a separate store room, which can be set up as a godown so its stock is counted on its own.

## What to check before you open the next branch

- **Separate cash per branch.** Each drawer should close on its own, or a short in one branch hides inside the total.
- **Transfers with a receiving step.** Stock that leaves one branch should only arrive in the other when someone there confirms it.
- **One product list.** Adding a product once should make it available everywhere, with stock counted per branch.
- **Head office on the phone.** You should see every branch's sale tonight without calling anyone.`),
  ],
  faqKeys: ['mp-branches-transfer', 'offline', 'pricing'],
  cta: { heading: 'Open the next branch with confidence', body: 'Run it from the same account and see it next to the others from day one.' },
  relations: [
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:enterprise', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:staff', kind: 'RELATED' },
  ],
  sortOrder: 6,
  evidence: [
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopsPage.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopFormPage.tsx',
    'apps/web/src/modules/organization/shops/components/BranchCard.tsx',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/modules/reports/audit',
    'apps/web/src/modules/organization/team/api/team.api.ts',
    'apps/web/src/integrations/online-orders/components/OrderBranchPicker.tsx',
  ],
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
      ['Daily close', 'Day book of cash in and out, with a closing summary sent to you'],
      ['Every report', 'Any period, compared with the one before; A4, PDF or thermal print and CSV'],
      ['Export', 'Excel, PDF, and journals for QuickBooks, Xero, Zoho Books or Tally'],
    ],
    romanUrdu:
      'Nafaa sirf bikri nahi, asal munafa batata hai: cost aur kharche nikal kar. Kaun si cheez kitna kama rahi hai, galle me kitna hai, aur poora P&L, sab ek jagah.',
  },
  body: [
    shot({
      heading: 'The whole day on one screen',
      body: 'Today\'s sale with bills, average bill and udhaar given, the day\'s path from morning to the rush hour, profit after cost and expenses, cash in the drawer, online sale, low stock and udhaar still to collect. Below it, a short list of what needs you today and the live day book.',
      id: SHOT.dashboard,
      url: 'app.nafaa.pk/dashboard',
      layout: 'full',
      callouts: [
        { x: 30, y: 26, label: 'Today\'s sale' },
        { x: 24, y: 52, label: 'Profit after cost and expenses' },
        { x: 51, y: 52, label: 'Cash in the drawer' },
        { x: 92, y: 52, label: 'Udhaar to collect' },
        { x: 31, y: 73, label: 'What needs you today' },
      ],
    }),
    features('Reports owners actually open', [
      ['trending-up', 'Profit by product', 'Sale, cost, profit and margin for every item, and by category, brand, supplier, staff or day.'],
      ['chart-line', 'Profit and loss', 'Net sale, gross profit, expenses and net profit for any period, month by month and branch by branch.'],
      ['notebook-pen', 'Day book', 'Opening cash, every payment method, drawers, expenses, purchases and khata for one day, printable as a Z report.'],
      ['boxes', 'Stock report', 'Stock at cost and sale price by category and branch, with dead, slow and near-expiry items.'],
      ['users', 'Staff and customers', 'Sales, discounts, voids and drawer results per person; new and returning customers, top buyers and udhaar ageing.'],
      ['file-spreadsheet', 'Export and accounting', 'Excel and PDF, plus daily journals to QuickBooks, Xero or Zoho Books, or a Tally export.'],
    ]),
    shot({
      heading: 'Which products really make money',
      body: 'Profit by product sorts your catalogue by what it earns, not what it sells. Each line shows quantity, sale, cost per piece, profit and margin, and the tabs regroup the same figures by category, brand, supplier, staff or day.',
      id: SHOT.profitByProduct,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'split-right',
      callouts: [
        { x: 55, y: 20, label: 'Net profit after expenses' },
        { x: 45, y: 48, label: 'By category, brand, supplier, staff' },
        { x: 85, y: 59, label: 'Profit per item' },
        { x: 95, y: 59, label: 'Margin' },
      ],
    }),
    shot({ heading: 'A P&L your accountant will accept', body: 'Net sale, cost of goods, gross profit, expenses and net profit, for a day, a month or a year, against the previous period or the same dates last year. Print it on A4 or download it as CSV.', id: SHOT.profitLoss, url: 'app.nafaa.pk/reports/pnl', layout: 'split-left' }),
    table('The question, and the report that answers it', 'Every report reads the same sales, stock and khata the counter writes, so the numbers agree with each other.', [
      { key: 'report', label: 'Open this report', highlight: true },
      { key: 'see', label: 'What you will see' },
    ], [
      ['How much did I really earn this month?', 'Profit and loss', 'Net sale less cost of goods and expenses, against last month'],
      ['Which items should I stop stocking?', 'Profit by product, and the stock report', 'Low-margin items, and stock that has not moved for weeks'],
      ['Does the cash in the drawer match the sales?', 'Day book and cash register', 'Expected cash per drawer, the count, and any short or over'],
      ['Which cashier gives the most discounts or voids?', 'Staff report and Nigrani (audit)', 'Discounts, voids, refunds and PIN use per person'],
      ['Who owes me the most, and since when?', 'Customers report', 'Udhaar by age and what was collected'],
      ['Which branch is slipping?', 'Branch analytics', 'Sales and profit per branch against the last period'],
    ]),
    prose(`## A closing summary without asking

At the time you choose, Nafaa sends the day's closing summary as an app notification: sale, profit, cash, udhaar given and collected, and the lines you picked. Tap "WhatsApp" and it opens in your WhatsApp ready to forward to a partner. You also decide which money figures staff may see, so a cashier can run the counter without seeing your profit.

## Who it is for

Owners who close the shop and still do not know what they earned that day. A kiryana owner reading today's profit after cost, a restaurant comparing outlets, a pharmacy checking near-expiry stock value, or a wholesaler sending month-end journals to an accountant. Reports work the same in every industry, and each industry adds its own tab where it needs one.`),
  ],
  faqKeys: ['mp-reports-export', 'pricing', 'devices'],
  cta: { heading: 'See today\'s real profit tonight', body: 'Start the free trial and your dashboard fills itself from the first bill.' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:enterprise', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'PRODUCT:ai-assistant', kind: 'RELATED' },
  ],
  sortOrder: 7,
  evidence: [
    'apps/web/src/modules/dashboard',
    'apps/web/src/modules/finance/profit-report',
    'apps/web/src/modules/reports/center',
    'apps/web/src/modules/reports/pnl',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
    'apps/web/src/modules/inventory/stock-report',
    'apps/web/src/modules/reports/staff-report',
    'apps/web/src/modules/reports/customers-report',
    'apps/web/src/modules/reports/audit',
    'apps/web/src/modules/reports/exports',
    'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx',
    'apps/api/src/integrations/accounting',
  ],
});

const payments = page({
  type: 'PRODUCT',
  slug: 'payments',
  title: 'Payments',
  summary:
    'Nafaa takes every way Pakistan pays: cash, card, JazzCash, Easypaisa, bank transfer, QR and the customer\'s khata, split across one bill if needed, with a cash register that balances at the end of every shift and payment links for online and phone orders.',
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
    badges: ['Split payments', 'Payment QR', 'Cash register'],
  },
  answer: {
    facts: [
      ['Methods', 'Cash, card, JazzCash, Easypaisa, bank transfer, QR and khata'],
      ['Split', 'One bill across several methods'],
      ['Payment QR', 'Your own Raast, JazzCash or Easypaisa QR with the bill amount; money goes straight to you'],
      ['Drawer', 'Opening float, cash in and out, and a closing count with the difference'],
      ['Online', 'JazzCash and Easypaisa payment links for website and phone orders'],
    ],
    romanUrdu: 'Ek hi bill me cash, card, JazzCash, Easypaisa, bank ya udhaar. Din ke aakhir me galla khud batata hai ke drawer me kitne paise hone chahiye.',
  },
  body: [
    shot({
      heading: 'Every method one tap away',
      body: 'The total sits in large type at the bottom of the bill. The big button takes cash and prints, and card, JazzCash, Easypaisa and udhaar sit right below it. From the keyboard, F8 opens the payment picker and the keys 1 to 6 choose the method, including split.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 85, y: 79, label: 'Bill total' },
        { x: 85, y: 86, label: 'Cash and print (F12)' },
        { x: 80, y: 94, label: 'Card, JazzCash, Easypaisa, udhaar' },
        { x: 95, y: 94, label: 'More options (F9)' },
      ],
    }),
    steps('How money moves through Nafaa', [
      ['At the counter', 'The cashier picks one method or splits the bill across several.'],
      ['Into the right account', 'Cash goes to the drawer, wallets, card and bank to their own accounts, credit to the khata.'],
      ['During the day', 'Record cash taken out for expenses or the safe, or put in for change, with a note.'],
      ['At closing', 'Count the drawer note by note; Nafaa shows the expected amount and any short or over.'],
    ]),
    features('Payments without the guesswork', [
      ['wallet', 'Split tender', 'Part cash, part card, part khata, all on one receipt.'],
      ['qr-code', 'Payment QR with the amount', 'Add your own receive QR once. Checkout, the customer display and unpaid bills show it with the bill amount. Nafaa takes no fee.'],
      ['link', 'Payment links', 'Send JazzCash or Easypaisa links for online and phone orders, and dispatch once paid.'],
      ['banknote', 'Cash register shifts', 'Opening float, cash in and out, and a closing count, printed as an X or Z report.'],
      ['landmark', 'Shop accounts', 'Cash, bank, card, JazzCash and Easypaisa balances, with money moved between the drawer and the safe or bank.'],
      ['chart-pie', 'Payment mix', 'See how much came in by each method in the day book and the reports.'],
    ]),
    table('Where each payment lands', 'Every method is recorded as itself, so the day book, the profit report and your accountant see the same split.', [
      { key: 'lands', label: 'Recorded in', highlight: true },
      { key: 'check', label: 'How you check it' },
    ], [
      ['Cash', 'The open drawer of that counter', 'Closing count against the expected amount'],
      ['Card', 'The card account', 'Match against the bank machine\'s settlement slip'],
      ['JazzCash and Easypaisa', 'Their own wallet accounts', 'Compare with the wallet app\'s statement'],
      ['Bank transfer or Raast QR', 'The bank account', 'Compare with the bank statement'],
      ['Udhaar', 'The customer\'s khata', 'Khata ageing and reminders'],
    ]),
    prose(`## Built around how Pakistan pays

Wallet payments are now part of every counter, but most billing software still treats them as "other". Nafaa records JazzCash, Easypaisa and bank transfers as their own methods, so the day book, the profit report and your accountant's journal all see the same split. Udhaar is a payment method too: what is not paid today goes on the customer's khata with the bill attached.

The payment QR is your own. You add the receive QR from your bank (Raast), JazzCash or Easypaisa account once, from a screenshot or its text, and Nafaa checks that it is a valid payment QR before saving it. The money goes straight from the customer's app to your account; Nafaa is not in between.

## Who it is for

Every counter that takes more than cash: a kiryana where half the bills are paid on JazzCash, a restaurant splitting a table's bill between card and cash, a clothing shop sending payment links to Instagram buyers, and any owner who wants the galla to balance every night without a calculator.`),
  ],
  faqKeys: ['mp-pos-payments', 'pricing', 'offline'],
  cta: { heading: 'Take every payment your customers offer' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:ecommerce', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:online-store', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:raast', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cod', kind: 'RELATED' },
  ],
  sortOrder: 8,
  evidence: [
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/modules/pos/components/PosPayPicker.tsx',
    'apps/web/src/core/payments/PayQrPage.tsx',
    'apps/web/src/core/payments/PayQrPanel.tsx',
    'apps/api/src/integrations/pay-qr/pay-qr.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/payments/jazzcash',
    'apps/api/src/integrations/payments/easypaisa',
    'apps/web/src/modules/finance/cash-register',
    'apps/web/src/modules/finance/money/pages/MoneyPage.tsx',
    'apps/web/src/modules/finance/expenses',
    'apps/web/src/modules/reports/day-book/DayBookPage.tsx',
  ],
});

const offline = page({
  type: 'PRODUCT',
  slug: 'offline-pos',
  title: 'Offline POS',
  summary:
    'Nafaa keeps billing when the internet drops. Products, prices and customers are kept on the device, new sales, khata payments, customers and expenses wait in an offline queue, and everything syncs to your account on its own when the connection returns, with a Sync Center that shows what is still waiting.',
  data: { icon: 'wifi-off', shortName: 'Offline POS', benefit: 'Billing That Never Stops', status: 'live', appRoute: '/pos' },
  seoTitle: 'Offline POS Software: Billing That Never Stops in Pakistan',
  seoDescription:
    'Nafaa keeps billing without internet: sales, khata and receipts work offline and sync when the connection returns. Built for load-shedding. Free trial.',
  focusKeyword: 'offline pos software',
  hero: {
    eyebrow: 'Works offline',
    heading: 'Load-shedding is not a reason to stop selling',
    sub: 'When the internet goes, the counter does not. Bills, receipts and khata payments keep working on the device, and Nafaa sends them to your account the moment the connection comes back.',
    diagram: { kind: 'offline-sync' },
    layout: 'split',
    badges: ['Sales queue on the device', 'Automatic sync', 'Sync Center'],
  },
  answer: {
    facts: [
      ['Works offline', 'Billing, receipts, khata payments, new customers, products and expenses'],
      ['Stored on device', 'Products, prices, customers, settings and pending changes'],
      ['Sync', 'Automatic when the connection returns; nothing unsent is ever deleted'],
      ['Sign in', 'A device that has signed in once can open the counter without internet'],
      ['Needs internet', 'Actions that need the manager PIN, such as refunds, wait for the connection'],
    ],
    romanUrdu: 'Internet chala jaye to bhi Nafaa me bill bante rehte hain. Sales device par mehfooz rehti hain aur internet aate hi khud account me chali jati hain.',
  },
  body: [
    steps('What happens when the internet drops', [
      ['Nothing changes at the counter', 'The cashier keeps scanning and billing; a small badge shows you are offline.'],
      ['Sales wait safely', 'Each bill is saved on the device with its own number, and its receipt prints as usual.'],
      ['Connection returns', 'Queued sales and changes are sent to your account in order, by themselves.'],
      ['Everyone catches up', 'Reports, stock and other branches update once the sync finishes. If tax reporting is on, the invoices go out then.'],
    ]),
    features('Offline, done properly', [
      ['database', 'Local copy', 'Products, prices, customers and settings are kept on the device for instant search, even with no signal.'],
      ['cloud-off', 'Offline queue', 'Bills, khata payments, new customers, product edits and expenses wait safely until they can be sent.'],
      ['refresh-cw', 'Automatic sync', 'No button to press; sync starts as soon as the internet is back, and checks again every few minutes.'],
      ['smartphone', 'No clashing bill numbers', 'Each device numbers its offline bills with its own code, so two counters offline at once never collide.'],
      ['triangle-alert', 'Stock conflicts flagged', 'If an offline sale finds the stock already gone, it is held in the Sync Center for you to review, not dropped.'],
      ['download', 'Backups', 'Export a backup of the data on the device; Nafaa reminds you every week.'],
    ]),
    shot({
      heading: 'The counter you saw online works the same offline',
      body: 'Search, scan, quick keys, units, discounts, split payments and receipts all run from the copy on the device. The header shows whether you are online and how many bills are waiting to sync.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 30, y: 12, label: 'Online or offline badge' },
        { x: 82, y: 3, label: 'Sync status' },
        { x: 30, y: 21, label: 'Search and scan from the device copy' },
        { x: 85, y: 86, label: 'Bills and receipts keep working' },
      ],
    }),
    table('What works without internet', 'Most of the counter runs from the device. A few actions are checked on the server on purpose, so they wait for the connection.', [
      { key: 'offline', label: 'Without internet', highlight: true },
      { key: 'why', label: 'Note' },
    ], [
      ['Billing and receipts', 'Yes', 'Saved on the device, synced later'],
      ['Khata payments and udhaar entries', 'Yes', 'The customer\'s balance updates at once on the device'],
      ['New customers and product edits', 'Yes', 'Sent in order when the connection returns'],
      ['Expenses', 'Yes', 'Recorded against the day as usual'],
      ['Refunds and other PIN actions', 'Waits', 'The manager PIN is checked by the server'],
      ['Other branches seeing the sale', 'After sync', 'Reports and stock update once the bills reach your account'],
    ]),
    prose(`## Built for load-shedding and weak signal

In much of Pakistan the internet drops several times a day, during load-shedding, in markets with poor signal, or when the shop's router restarts. A cloud POS that stops at those moments loses sales at the busiest hour. Nafaa is built the other way round: the counter works from the device first and talks to the server when it can.

Unsent work is never thrown away. The Sync Center lists every bill and change made offline, shows which have reached your account, retries anything that failed, and lets you download a backup of the device's data before you clear it.

## Who it is for

Shops in markets with weak signal, counters on a mobile hotspot, branches outside the big cities, and any business that cannot afford a queue at the till when the internet goes. It works the same on a phone, a tablet and the Windows desktop app.`),
  ],
  faqKeys: ['offline', 'devices', 'mp-fbr-offline'],
  cta: { heading: 'Try it: turn off the Wi-Fi and keep selling' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
  ],
  sortOrder: 9,
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/lib/offline/offlineAuth.ts',
    'apps/web/src/core/lib/offline/offlineDevice.ts',
    'apps/web/src/core/lib/offline/syncEngine.ts',
    'apps/web/src/core/lib/offline/ui/SyncCenterPage.tsx',
    'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx',
    'apps/web/src/core/lib/offline/offlineAutoBackup.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/modules/finance/expenses/api/expenses.api.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/pos/engine/PosScreen.tsx',
  ],
});

const purchasing = page({
  type: 'PRODUCT',
  slug: 'purchasing',
  title: 'Purchasing',
  summary:
    'Nafaa Purchasing records what you buy and what you owe: suppliers with their khata and rate history, purchase bills in any unit that add stock at the real landed cost, purchase orders that wait until goods arrive, returns to suppliers, full or partial payments, and reorders started straight from the low-stock list.',
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
    badges: ['Supplier khata', 'Purchase orders', 'Reorder from low stock'],
  },
  answer: {
    facts: [
      ['Suppliers', 'Contact and bank details, purchase history, rate history and balance owed'],
      ['Purchase bills', 'Add stock and update the average cost in one step'],
      ['Landed cost', 'Freight, tax and discount on the bill are spread into item cost'],
      ['Orders', 'Purchase orders move no stock until goods are received, in full or in part'],
      ['Payables', 'Payments to suppliers, full or partial, from the drawer or an account'],
    ],
    romanUrdu: 'Supplier ka bill ek dafa daalein: stock barh jata hai, cost update hoti hai, aur supplier ka hisaab khud ban jata hai. Kam stock ki list se seedha order banayein.',
  },
  body: [
    steps('A purchase in four steps', [
      ['Pick the supplier', 'Or add a new one with phone, address and bank details.'],
      ['Enter the bill', 'Search or scan items. Each line can be bought in pieces, the product\'s carton, or a purchase-only unit such as a bori of 50 kg. Add batch and expiry where it matters.'],
      ['Stock and cost update', 'Stock goes up, and freight, tax and discount on the bill spread into each item\'s cost, so the average cost stays true.'],
      ['Pay now or later', 'Pay in full or in part; the rest stays on the supplier\'s khata.'],
    ]),
    features('Purchasing that keeps margins honest', [
      ['handshake', 'Supplier khata', 'Every bill, payment, return and opening balance per supplier, with what you owe and since when.'],
      ['calculator', 'Real landed cost', 'Profit reports use the average cost after freight and discounts, so margins stay true.'],
      ['clipboard-check', 'Purchase orders', 'Send an order, then receive what actually arrived. Nothing enters stock until it is received.'],
      ['rotate-ccw', 'Returns to supplier', 'Send back damaged or wrong goods; stock and the supplier\'s balance both go down.'],
      ['trending-up', 'Rate history', 'See how a supplier\'s prices moved over time before you agree the next rate.'],
      ['printer', 'Printable bills', 'Print A4 purchase bills and supplier statements, or share them on WhatsApp.'],
    ]),
    shot({
      heading: 'Start from what is running out',
      body: 'The low-stock list is the shopping list: items under their alert level, how many days each will last, how much to order and from which supplier. The reorder tab groups it into one card per supplier and branch, ready to become a purchase order, a WhatsApp message or a printed sheet.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Cost of the full reorder' },
        { x: 33, y: 48, label: 'Reorder list by supplier' },
        { x: 70, y: 60, label: 'Suggested quantity and cost' },
        { x: 85, y: 61, label: 'Supplier and last purchase' },
        { x: 92, y: 12, label: 'Make the order' },
      ],
    }),
    table('Purchase bill or purchase order?', 'Use a bill when the goods are already in the shop, and an order when you are asking a supplier to send them.', [
      { key: 'bill', label: 'Purchase bill', highlight: true },
      { key: 'order', label: 'Purchase order' },
    ], [
      ['When to use it', 'Goods have arrived with the supplier\'s bill', 'You are placing an order by phone or WhatsApp'],
      ['Stock', 'Goes up at once', 'Goes up only when you receive it, all or part'],
      ['Supplier balance', 'Goes up by the unpaid amount', 'Goes up as goods are received'],
      ['Cost', 'Average cost updates at once', 'Updates on receiving'],
    ]),
    prose(`## Who it is for

Kiryana and general stores buying from distributors several times a week, pharmacies that need batch and expiry on every purchase, hardware and building material shops buying by the bori, ton or foot, bakeries buying flour, sugar and ghee as raw materials on the same bill, and wholesalers who carry large supplier balances.

## What to look for in purchase software

- **True cost.** If freight and the supplier's discount are not part of the cost, every profit report after that is wrong.
- **Units that match the invoice.** The supplier bills in cartons and boris; you sell in pieces and kilos. The software should convert, not you.
- **A supplier khata, not just bills.** Payments, returns and old balances belong in one statement you can send to the supplier.
- **Orders separate from bills.** What you asked for and what arrived are often different. Receiving should record the difference.`),
  ],
  faqKeys: ['mp-inventory-import', 'pricing'],
  cta: { heading: 'Get your supplier accounts in order' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:autoparts', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:fifo', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
  ],
  sortOrder: 10,
  evidence: [
    'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
    'apps/web/src/modules/purchasing/purchases/editor/sources.ts',
    'apps/web/src/modules/purchasing/purchases/pages/PurchaseDetailPage.tsx',
    'apps/web/src/modules/purchasing/purchases/api/purchases.api.ts',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/purchasing/suppliers/components/SupplierMoneyModal.tsx',
    'apps/web/src/modules/purchasing/print.ts',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
  ],
});

const staff = page({
  type: 'PRODUCT',
  slug: 'staff',
  title: 'Staff & Payroll',
  summary:
    'Nafaa Staff gives every team member a login and a role, sets counter rules like the refund PIN, tracks attendance and leave, works out sales commission, runs payroll with advances and payslips, and logs every sensitive action with a name, so the owner can trust the counter without standing behind it.',
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
      ['Access', 'Roles with permission boxes you can tick or untick, per branch'],
      ['Counter rules', 'Manager PIN for refunds, cancelled bills and discounts over your limit'],
      ['People', 'Attendance and leave, commission, payroll with advances and payslips'],
      ['Records', 'Activity log and an audit view of refunds, voids, discounts and drawer shorts'],
    ],
    romanUrdu: 'Har staff ka apna login aur sirf zaroori ijazat. Refund aur bara discount manager PIN se, haazri aur commission khud jurte hain, aur har aham kaam ka record rehta hai.',
  },
  body: [
    shot({
      heading: 'Your team at a glance',
      body: 'Everyone who works at the shop, with or without a login: who is on duty right now, their role, branch, last login and today\'s sales. Helpers who never touch the app can still be on the list for attendance and payroll.',
      id: SHOT.staff,
      url: 'app.nafaa.pk/staff',
      layout: 'full',
      callouts: [
        { x: 43, y: 30, label: 'On duty now' },
        { x: 90, y: 30, label: 'Today\'s sales by staff' },
        { x: 32, y: 48, label: 'Roles and permissions' },
        { x: 46, y: 59, label: 'Staff without a login' },
        { x: 93, y: 12, label: 'Add a person' },
      ],
    }),
    features('Control without micromanaging', [
      ['user-cog', 'Roles and permissions', 'Pick a role and its boxes fill in; then tick or untick who can sell, refund, edit prices, see profit or open settings.'],
      ['key-round', 'Manager PIN', 'Refunds, cancelled bills, discounts over your limit and udhaar over a customer\'s limit wait for the PIN.'],
      ['calendar-check', 'Attendance and leave', 'A live board of who is in, late or on leave, a month grid for payroll, and leave requests with decisions.'],
      ['percent', 'Commission', 'Commission from each person\'s own sales, with returns taken off, what is paid and what is still due.'],
      ['banknote', 'Payroll', 'Base pay, overtime, commission, advances, bonuses and deductions, paid from the drawer or an account, with payslips.'],
      ['eye', 'Audit and activity', 'Voids, refunds, big discounts, PIN use and drawer shorts per person, with a risk score to show where to look first.'],
    ]),
    steps('Bring your team on board', [
      ['Add the person', 'Name, phone and branch. Give a login with email and a temporary password, and print the login slip.'],
      ['Set counter rules', 'Choose what needs the manager PIN and the highest discount a cashier may give.'],
      ['Track the month', 'Attendance, late minutes, overtime and commission build up as they work.'],
      ['Pay', 'Run payroll for the branch, hand over payslips and see salaries in your profit and loss.'],
    ]),
    table('Counter rules you control', 'Each rule is a switch in Settings, Counter & POS. Whatever you choose applies to every counter in the shop.', [
      { key: 'rule', label: 'What Nafaa does', highlight: true },
      { key: 'record', label: 'On record' },
    ], [
      ['Refunds', 'Asks for the manager PIN when the refund PIN is on', 'Who refunded, what, and who approved'],
      ['Cancelled bills', 'Asks for the PIN when the void PIN is on', 'Shown in the audit view'],
      ['Discounts', 'Above your discount limit, asks for the PIN', 'Large discounts listed per cashier'],
      ['Udhaar over the limit', 'Asks for the PIN before the bill goes on the khata', 'On the customer\'s khata'],
      ['Seeing profit', 'Only people you allow see profit and cost figures', 'Permission set per person'],
    ]),
    prose(`## Who it is for

Owners who cannot stand at the counter all day: a kiryana with two cashiers and a helper, a salon paying stylists commission on their services, a restaurant with waiters on shifts, and multi-branch businesses with a manager in each branch. If you have ever wondered why the galla was short on a day you were away, the audit view answers it.

## What to look for in staff software

- **Rules that the counter enforces.** A discount limit only works if the cashier cannot go past it without someone else's PIN.
- **Names on every sensitive action.** Shared logins hide who did what. Every person should have their own.
- **Attendance that feeds payroll.** Late minutes, leave and overtime should reach the salary without a second register.
- **Commission from real sales.** Returns should come off the commission in the month they come back.`),
  ],
  faqKeys: ['mp-staff-permissions', 'pricing'],
  cta: { heading: 'Give your team the right keys' },
  relations: [
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:gym', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
  ],
  sortOrder: 11,
  evidence: [
    'apps/web/src/modules/hr/staff/pages/StaffPage.tsx',
    'apps/web/src/modules/hr/staff/components/LoginFields.tsx',
    'apps/web/src/modules/hr/staff/components/LoginSlipModal.tsx',
    'apps/web/src/modules/hr/attendance/pages/AttendancePage.tsx',
    'apps/web/src/modules/hr/commission/pages/CommissionPage.tsx',
    'apps/web/src/modules/hr/payroll/pages/PayrollPage.tsx',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/organization/settings/sections/POSSection.tsx',
    'apps/web/src/modules/reports/audit',
    'apps/web/src/modules/reports/activity-log',
    'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx',
  ],
});

const whatsapp = page({
  type: 'PRODUCT',
  slug: 'whatsapp-sms',
  title: 'WhatsApp Messages',
  summary:
    'Nafaa talks to customers and suppliers where they already are: receipts on WhatsApp instead of paper, udhaar reminders with the exact balance, thank-you and birthday messages, purchase orders to suppliers, and a WhatsApp chat with online buyers opened straight from their order, all in wording you can edit to sound like your shop.',
  data: { icon: 'message-circle', shortName: 'WhatsApp', benefit: 'Receipts and Reminders on WhatsApp', status: 'live', planFeature: 'featureWhatsappReceipt' },
  seoTitle: 'WhatsApp Receipts and Udhaar Reminders for Shops',
  seoDescription:
    'Send receipts on WhatsApp, remind customers about udhaar with their exact balance and chat with online buyers from the order. Nafaa 7-day free trial.',
  focusKeyword: 'whatsapp receipt pos',
  hero: {
    eyebrow: 'WhatsApp',
    heading: 'Receipts and reminders where customers actually look',
    sub: 'Skip the paper roll and send the bill to WhatsApp. Remind udhaar customers with their exact balance in one tap, and message online buyers and suppliers straight from the order.',
    media: { id: SHOT.khataPhone, frame: 'phone' },
    layout: 'split',
    badges: ['WhatsApp receipts', 'Udhaar reminders', 'From your own number'],
  },
  answer: {
    facts: [
      ['Receipts', 'Send the bill to the customer\'s WhatsApp from the counter'],
      ['Reminders', 'Udhaar balance messages from the khata, firmer as it ages'],
      ['Orders', 'Open a WhatsApp chat with an online buyer, or send a purchase order to a supplier'],
      ['How it sends', 'Your WhatsApp opens with the message written; you press send. No WhatsApp Business API needed'],
      ['Plans', 'WhatsApp receipts on plans that include them'],
    ],
    romanUrdu: 'Bill WhatsApp par bhejein, udhaar walon ko unka hisaab ek click me yaad dilayein, aur online order wale customer se order se hi WhatsApp par baat karein.',
  },
  body: [
    features('Messages that save time and paper', [
      ['receipt', 'WhatsApp receipts', 'The full bill, sent to the customer\'s number from the counter.'],
      ['bell-ring', 'Udhaar reminders', 'A message with the balance in one of three tones, polite, firm or final, picked by how old the udhaar is.'],
      ['truck', 'Online buyers', 'Open a WhatsApp chat with the buyer from any online order to confirm the address or the COD.'],
      ['notebook-pen', 'Your own wording', 'Edit the receipt, thank-you and reminder messages once; Nafaa fills in the name, amount and shop name.'],
      ['send', 'Suppliers too', 'Send a purchase order or the reorder list to a supplier on WhatsApp instead of reading it out on the phone.'],
      ['user-check', 'From your number', 'Messages go from your own WhatsApp, so customers know who is writing and can reply.'],
    ]),
    shot({
      heading: 'The khata that writes the message',
      body: 'Every customer with a balance has a WhatsApp button next to the amount. The reminder button at the top walks through all of them one by one, each with the right tone and the exact balance, so twenty reminders take a few minutes.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 63, y: 12, label: 'Send reminders one by one' },
        { x: 93, y: 55, label: 'WhatsApp this customer' },
        { x: 80, y: 55, label: 'Exact balance in the message' },
        { x: 48, y: 30, label: 'Tone follows the age of udhaar' },
      ],
    }),
    steps('A reminder in one tap', [
      ['Open the khata', 'Customers who owe are sorted by amount and age.'],
      ['Tap remind', 'Nafaa writes the message with the name, a fitting salutation such as bhai or baji, and the balance.'],
      ['Send from WhatsApp', 'Your WhatsApp opens with the message ready. Read it, change a word if you like, and press send.'],
      ['Get paid', 'Record the payment and the balance clears.'],
    ]),
    table('Every message Nafaa can write for you', 'All of them open in your own WhatsApp with the text filled in. Nothing is sent without you pressing send.', [
      { key: 'to', label: 'Goes to' },
      { key: 'from', label: 'Sent from', highlight: true },
    ], [
      ['Receipt', 'The customer', 'The counter, after the sale'],
      ['Udhaar reminder', 'A customer who owes', 'The khata or the customer\'s profile'],
      ['Thank-you and birthday wishes', 'Regular customers', 'The customer list'],
      ['Message to a group', 'Top buyers, lapsed buyers or udhaar list', 'The customers report, one person after another'],
      ['Order confirmation', 'An online buyer', 'The online order'],
      ['Purchase order', 'A supplier', 'The purchase order or the reorder list'],
      ['Discount code', 'Customers you choose', 'The discount codes page'],
      ['Closing summary', 'You or a partner', 'The daily closing notification'],
    ]),
    prose(`## Why wa.me links instead of an API

The WhatsApp Business API needs a separate business number, approval and a fee per message, which most shops do not have. Nafaa uses WhatsApp's own click-to-chat links instead: the message is written for you, your WhatsApp opens on the phone or computer, and you press send. Customers see your shop's number, can reply to it, and there is no per-message charge from Nafaa.

## Who it is for

Any shop whose customers live on WhatsApp, which in Pakistan is nearly all of them: kiryana stores reminding monthly accounts, pharmacies sending receipts to regulars, clothing and cosmetics shops confirming online orders, and wholesalers sending orders to their suppliers. Shops that want to save paper rolls can send most receipts on WhatsApp and print only when a customer asks.`),
  ],
  faqKeys: ['khata-reminders', 'pricing'],
  cta: { heading: 'Stop printing, start messaging' },
  relations: [
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:ecommerce', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:loyalty', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
  ],
  sortOrder: 12,
  evidence: [
    'apps/web/src/core/lib/whatsapp/templates.ts',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/reports/customers-report/components/WhatsAppList.tsx',
    'apps/web/src/integrations/online-orders/components/OrderDetailPanel.tsx',
    'apps/web/src/modules/purchasing/purchases/pages/PurchaseDetailPage.tsx',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx',
  ],
  needsOwner: ['The menu calls this page "WhatsApp & SMS". SMS in the API is used for sign-in and admin messages only, not for shops messaging customers, so the page does not claim SMS.'],
});

const loyalty = page({
  type: 'PRODUCT',
  slug: 'loyalty',
  title: 'Loyalty',
  summary:
    'Nafaa Loyalty turns first-time buyers into regular customers: points on every purchase that come off a later bill, member levels that show who your best buyers are, discount codes with limits you set, combos and deals, and birthday and thank-you messages on WhatsApp, all recorded on the customer\'s profile and applied at the counter.',
  data: { icon: 'award', shortName: 'Loyalty', benefit: 'Bring Customers Back', status: 'live', planFeature: 'featureLoyalty', appRoute: '/customers/loyalty' },
  seoTitle: 'Customer Loyalty and Points Software for Shops',
  seoDescription:
    'Loyalty points, member levels, discount codes and deals linked to the POS and customer profiles. Reward regulars and bring them back. Nafaa 7-day free trial.',
  focusKeyword: 'loyalty program software',
  hero: {
    eyebrow: 'Loyalty',
    heading: 'Give regulars a reason to come back',
    sub: 'Customers earn points on every bill and spend them on the next one. Discount codes and deals run at the counter without extra work, and the loyalty page shows what the programme costs you and what it brings back.',
    media: { id: SHOT.pos, url: 'app.nafaa.pk/pos' },
    badges: ['Points', 'Discount codes', 'Member levels'],
  },
  answer: {
    facts: [
      ['Points', 'Earned on purchases at your rate, used as a discount on a later bill'],
      ['Your rules', 'Points per rupee, rupee value of a point, minimum to redeem, maximum share of a bill, expiry'],
      ['Levels', 'Starter to Diamond, by points, to spot your best customers'],
      ['Discount codes', 'Dates, branches and a limit per customer; shared on WhatsApp'],
      ['Results', 'Points given and used, their rupee value, by day and branch'],
    ],
    romanUrdu: 'Har khareed par points jo agle bill par kaam aate hain, discount code, deals, aur achhe customers ki pehchaan, sab counter par khud lagta hai.',
  },
  body: [
    features('Loyalty that runs at the counter', [
      ['star', 'Points on every bill', 'Pick the customer at checkout and points are added when the bill is saved.'],
      ['gift', 'Redeem at checkout', 'The discount dialog shows the customer\'s points and their rupee value; the cashier uses some or all, within your limits.'],
      ['award', 'Member levels', 'Starter, Bronze, Silver, Gold, Platinum and Diamond by points, so you can filter and message your best buyers.'],
      ['ticket', 'Discount codes', 'Codes with start and end dates, chosen branches and a limit per customer. Used codes are switched off, not deleted.'],
      ['layers', 'Combos and deals', 'Bundle items into a deal at a special price; stock of each item goes down when it sells.'],
      ['calendar-clock', 'Points expiry', 'Set how long points last and preview how many expire before you run it.'],
    ]),
    shot({
      heading: 'Rewards without extra steps',
      body: 'The cashier picks the customer, or types their mobile number in the search box. Points and discount codes sit in the same discount dialog, so using them takes one step and the bill total updates at once.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 83, y: 17, label: 'Pick the customer to earn points' },
        { x: 85, y: 66, label: 'Points and discount codes' },
        { x: 30, y: 21, label: 'Or type their mobile number' },
      ],
    }),
    steps('Launch a loyalty programme in a day', [
      ['Set the earning rule', 'How many points each rupee earns, and what one point is worth when it is spent.'],
      ['Set the limits', 'The minimum points before they can be used, the largest share of a bill they can cover, and when they expire.'],
      ['Tell customers', 'Ask for their mobile number at the counter; they start earning on that bill.'],
      ['Watch them return', 'See points given and used, the rupee value still outstanding, and who your top members are.'],
    ]),
    table('Points or discount codes?', 'Most shops run both. Points reward people who already buy from you; codes bring in new buyers or wake up old ones.', [
      { key: 'points', label: 'Loyalty points', highlight: true },
      { key: 'codes', label: 'Discount codes' },
    ], [
      ['Who gets it', 'Every customer who gives their number', 'Whoever you send the code to'],
      ['When it pays out', 'On a later visit', 'On the bill where the code is used'],
      ['What it costs you', 'The rupee value of points used, shown live', 'The discount given, shown per code'],
      ['Best for', 'Regulars: groceries, pharmacy, bakery', 'Launches, slow days, Eid and sale seasons'],
    ]),
    prose(`## Know what the programme costs

A loyalty programme is a discount you promise in advance, so it should be measured like one. The loyalty page shows the points still outstanding and what they are worth in rupees, points given and used for any period, by day and branch, and every member's history. You can gift or correct points by hand with a note, and message members on WhatsApp.

The customers report adds the bigger picture: new against returning customers, your top buyers, groups by how recently and how often they buy, and monthly cohorts that show how many come back.

## Who it is for

Shops where the same people buy every week: grocery and kiryana stores, pharmacies, bakeries and sweet shops, cosmetics and clothing stores with regular buyers, and cafes. Salons can also use the salon pack's memberships alongside points.`),
  ],
  faqKeys: ['pricing', 'devices'],
  cta: { heading: 'Turn first-time buyers into regulars' },
  relations: [
    { ref: 'INDUSTRY:cosmetics', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'TAG' },
    { ref: 'INDUSTRY:garments', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'SOLUTION:retail-chains', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
    { ref: 'PRODUCT:reports', kind: 'RELATED' },
  ],
  sortOrder: 13,
  evidence: [
    'apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx',
    'apps/web/src/modules/customers/loyalty/api',
    'apps/api/src/modules/customers/loyalty/loyalty.service.ts',
    'apps/api/src/modules/sales/sales/sales.service.ts',
    'apps/web/src/modules/pos/components/PosPerks.tsx',
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/web/src/modules/inventory/combos',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/reports/customers-report',
    'apps/web/src/industries/salon/pages/MembershipsPage.tsx',
  ],
  needsOwner: ['Customer referral rewards were claimed before but are not in the app (the Referrals page is for shops referring other businesses to Nafaa), so the page no longer mentions them. Tiers do not give automatic discounts; they are levels by points.'],
});

export const products: SeedEntry[] = [pos, inventory, khata, fbr, onlineStore, multiShop, reports, payments, offline, purchasing, staff, whatsapp, loyalty];

