/**
 * Inventory software for Pakistani shops. Excel, Odoo Inventory, TallyPrime
 * and Zoho Inventory described from their own sites, read on CHECKED_ON;
 * Nafaa from the code. The page says when a spreadsheet or another product
 * is the better fit.
 */
import { hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { quickPick, src, type BestOfSpec } from '../_bestof';

const MS_COAUTHOR = src('Collaborate on Excel workbooks at the same time with co-authoring', 'https://support.microsoft.com/en-us/excel/get-started/collaborate-on-excel-workbooks-at-the-same-time-with-co-authoring', 'Microsoft Support');
const MS_WEB = src('Free Microsoft 365 for the web (Word, Excel, PowerPoint)', 'https://www.microsoft.com/en-us/microsoft-365/free-office-online-for-the-web', 'Microsoft');
const ODOO_INV = src('Odoo Inventory', 'https://www.odoo.com/app/inventory', 'Odoo');
const ODOO_PRICING = src('Odoo pricing', 'https://www.odoo.com/pricing', 'Odoo');
const TALLY = src('TallyPrime product page (features, editions, licences)', 'https://tallysolutions.com/tally-prime/', 'Tally Solutions');
const ZOHO = src('Zoho Inventory (features and integrations)', 'https://www.zoho.com/inventory/', 'Zoho');
const ZOHO_PRICING = src('Zoho Inventory pricing', 'https://www.zoho.com/inventory/pricing/', 'Zoho');

const SUMMARY =
  'Inventory software keeps a count of what you hold, what it cost and what to reorder. For a Pakistani shop the real test is whether stock changes on its own when you sell, buy, return or move goods. This guide compares five options, from Excel to full business suites, using each vendor\'s own site.';

const spec: BestOfSpec = {
  slug: 'inventory-software-pakistan',
  title: 'Inventory Software for Pakistani Shops',
  category: 'Inventory',
  summary: SUMMARY,
  seoTitle: 'Inventory Software for Shops in Pakistan: 5 Options Compared',
  seoDescription:
    'How to choose inventory software in Pakistan: stock that changes on every sale, purchase and return, with five options from Excel to business suites compared.',
  focusKeyword: 'inventory software pakistan',
  methodology: `**What we compared.** Whether stock updates by itself on sales, purchases and returns; selling one product in more than one unit; batch, expiry and serial tracking; reorder help; more than one shop or godown; getting your existing list in; and what it costs to start.

**Where the facts come from.** Each product's own website, opened on 26 October 2026 and linked on this page. Where a site does not mention a feature we say so, rather than guess. Nafaa's facts come from the product.

**Order.** Nafaa is ours, so it is listed first and marked; the rest are alphabetical. The order is not a ranking, and nobody paid to be on this list.`,
  items: [
    {
      name: 'Nafaa',
      isNafaa: true,
      strengths: [
        'Stock moves with every sale, purchase, return, damage entry, adjustment and transfer, with no separate typing',
        'One product sold by carton, dozen, piece or kilo, each with its own price and barcode',
        'Low-stock list with days of stock left and a reorder shortcut that starts a purchase order',
        'Excel or CSV import checked line by line, and a bulk editor for prices, costs and stock counts',
        'Shops and godowns in one account, with transfers confirmed when sent and received',
        'Billing counter, khata and reports built in, so inventory is not a separate system',
      ],
      weaknesses: [
        'Paid after a 7-day free trial; plans limit products, users, shops and monthly sales',
        'Built for shops and small chains rather than factories with complex production planning',
      ],
      bestFor: 'Shops and small chains that want stock to follow the counter automatically, with udhaar and purchases in the same place.',
    },
    {
      name: 'Microsoft Excel',
      isNafaa: false,
      url: 'https://www.microsoft.com/en-us/microsoft-365/excel',
      strengths: [
        'Familiar and flexible: any column, formula or report you can think of',
        'Excel for the web is offered free by Microsoft, with files saved in OneDrive',
        'Several people can edit one workbook at once with co-authoring',
      ],
      weaknesses: [
        'Stock changes only when someone types the change; a sale at the counter does not reduce it',
        'Co-authoring needs a Microsoft 365 subscription and files saved in OneDrive or SharePoint Online',
        'No billing, receipt printing or barcode scanning at the counter',
      ],
      bestFor: 'A one-person shop with a short product list and time to update the sheet each evening.',
    },
    {
      name: 'Odoo Inventory',
      isNafaa: false,
      url: 'https://www.odoo.com/app/inventory',
      price: 'First app free with unlimited users; more apps paid',
      priceSource: ODOO_PRICING,
      strengths: [
        'Stock across several warehouses or companies',
        'Barcode app that reads barcodes, QR codes and GS1',
        'Serial numbers, lots, cycle counting and reservation strategies',
        'Replenishment rules such as min-max that can propose or create purchase orders',
      ],
      weaknesses: [
        'Inventory alone is one app; adding POS, purchasing or accounting means paying for more apps',
        'Expiry dates are not mentioned on its inventory page',
      ],
      bestFor: 'Businesses with warehouses and an IT person who want inventory as part of a full business suite.',
    },
    {
      name: 'TallyPrime',
      isNafaa: false,
      url: 'https://tallysolutions.com/tally-prime/',
      strengths: [
        'Inventory and accounting in one product, a long-standing choice of accountants',
        'Single-PC (Silver) and multi-user on a local network (Gold) editions',
        'Cloud access to the same books offered as an add-on',
      ],
      weaknesses: [
        'The site we read lists Indian GST features and prices in Indian rupees; ask a local partner about Pakistan',
        'Batches and expiry are not mentioned on its product page; no billing counter for a retail shop',
      ],
      bestFor: 'Businesses whose accountant already keeps the books in Tally and wants stock in the same ledger.',
    },
    {
      name: 'Zoho Inventory',
      isNafaa: false,
      url: 'https://www.zoho.com/inventory/',
      price: 'Free plan: 50 orders a month, 1 user, 2 locations',
      priceSource: ZOHO_PRICING,
      strengths: [
        'Stock across multiple warehouse locations',
        'Batch and serial number tracking, barcode and RFID',
        'Apps for iOS, Android and Windows',
        'Connects to Shopify, WooCommerce and Etsy for online selling',
      ],
      weaknesses: [
        'A point of sale is not mentioned on its inventory page',
        'The free plan is limited to one user and 50 orders a month',
      ],
      bestFor: 'Online sellers and wholesalers who manage orders and stock across warehouses and web stores.',
    },
  ],
  blocks: [
    hero(SUMMARY, { eyebrow: 'Buyer\'s guide · Inventory', heading: 'Inventory software for Pakistani shops' }),
    prose(`Most shops do not lose money on one big mistake. They lose it on stock that went missing, expired on the back shelf, was bought twice because nobody checked, or ran out on the busiest day. Inventory software is meant to stop that, but only if the count stays true without extra work.

This page is written by Nafaa, and Nafaa is on the list. Other products are described only from their own websites, and every entry says who it suits, including when a spreadsheet is enough.`),
    quickPick(
      'Quick comparison',
      'From each vendor\'s own site on 26 October 2026. "Not stated" means we could not find it there.',
      [
        { key: 'nafaa', label: 'Nafaa', highlight: true },
        { key: 'excel', label: 'Excel' },
        { key: 'odoo', label: 'Odoo Inventory' },
        { key: 'tally', label: 'TallyPrime' },
        { key: 'zoho', label: 'Zoho Inventory' },
      ],
      [
        ['Stock drops on each sale', 'Yes, from the counter', 'No, typed by hand', 'With Odoo POS', 'Not stated', 'With connected sales channels'],
        ['Several shops or godowns', 'Yes, with transfers', 'Separate sheets', 'Yes', 'Godowns (customer quote on site)', 'Yes'],
        ['Batch / serial tracking', 'Batch and expiry; IMEI for phones', 'Manual columns', 'Lots and serials', 'Not stated', 'Batches and serials'],
        ['Reorder help', 'Low-stock list and reorder', 'Your own formulas', 'Min-max rules', 'Not stated', 'Not stated on main page'],
        ['Billing counter included', 'Yes', 'No', 'Separate app', 'No', 'Not stated'],
        ['Free option', '7-day trial', 'Excel for the web', 'First app free', 'Not stated', 'Free plan with limits'],
      ],
      [MS_COAUTHOR, MS_WEB, ODOO_INV, ODOO_PRICING, TALLY, ZOHO, ZOHO_PRICING],
    ),
    prose(`## What good inventory looks like in a Pakistani shop

**Stock follows the counter.** If a sale does not reduce stock on its own, the count is wrong by evening. This is the single biggest difference between a spreadsheet and inventory software.

**Units match how you buy and sell.** You buy ghee by the carton and sell by the tin; you buy biscuits by the dozen packs and sell single packets. The software should convert between [units of measure](/glossary/unit-of-measure) and keep one stock figure.

**Cost is true.** Freight, loading and discounts on a supplier bill change what each item really cost you. Spreading them into item cost ([landed cost](/glossary/landed-cost)) is what makes [profit margin](/blog/how-to-calculate-profit-margin) reports honest.

**Expiry and batches where they matter.** For medicines, food and cosmetics, [batch tracking](/glossary/batch-tracking) and selling the earliest expiry first ([FEFO](/glossary/fefo)) prevent write-offs.

**Reorder before you run out.** A [reorder level](/glossary/reorder-level) per item and a list of what is running low turn buying from guesswork into a routine.

**Counting is easy.** A [stock take](/blog/stock-taking-guide) should take an evening, not a weekend, and differences should be recorded as adjustments with a reason.`),
    shot({
      heading: 'Low stock with days left',
      body: 'Nafaa lists items running low with how many days of stock remain at the current sale rate, and starts a purchase order from the list.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'split-left',
    }),
    steps(
      'Moving from a register or spreadsheet',
      [
        ['Clean the list once', 'One row per product: name, unit, cost, sale price, barcode if any. Merge duplicates now.'],
        ['Count what you hold', 'Do one full count on a quiet day and enter it as opening stock.'],
        ['Import, do not retype', 'Bring the sheet in as Excel or CSV. Nafaa checks each line before saving.'],
        ['Enter purchases as they arrive', 'Every supplier bill goes in when goods arrive, so stock and cost stay right.'],
        ['Count a section each week', 'Rotate through the shop with small counts instead of one big count a year.'],
      ],
    ),
    prose(`## Which one fits which business

- **A retail shop, pharmacy or small chain that bills at a counter:** Nafaa, because billing and stock are one system and udhaar sits next to them. See [Inventory](/product/inventory) and [Purchasing](/product/purchasing).
- **A one-person shop with a few hundred items and a calm evening:** Excel is enough. Keep one sheet, one row per product, and update it daily. Our [Excel comparison](/compare/nafaa-vs-excel) explains when to move on.
- **An online seller shipping from a warehouse:** Zoho Inventory's free plan and store connections are worth a look; Nafaa's [online store](/product/online-store) is the option if you also run a physical shop.
- **A company with warehouses and an IT team:** Odoo covers inventory, purchasing and accounting together.
- **A business whose accountant lives in Tally:** keep the books there; Nafaa can export journals for Tally if you also need a shop counter.

For a full walkthrough of methods, counts and reorder levels, read our [inventory management guide](/guides/inventory-management-small-business).`),
  ],
  faqs: [
    [
      'Can I manage shop inventory in Excel?',
      'Yes, if you are the only person selling and you update the sheet every day. The weakness is that a sale does not change the sheet by itself, so the count drifts on busy days. Once two people bill, or you hold more than a few hundred items, software that reduces stock at the counter saves time and arguments.',
    ],
    [
      'Which inventory method should a small shop use?',
      'For most shops, keeping stock at average cost and selling oldest or earliest-expiry stock first is enough. Medicines, food and cosmetics need batch and expiry tracking. Mobile phones and electronics need serial or IMEI numbers. Pick software that supports the method your goods need.',
    ],
    [
      'How often should I count stock?',
      'A full count once or twice a year, plus small counts of one section every week, works for most shops. Count fast-moving and expensive items more often. Record each difference as an adjustment with a reason, so you can see whether stock is being lost, damaged or mis-entered.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:stock-take', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:reorder-level', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide', kind: 'RELATED' },
    { ref: 'BLOG_POST:barcode-setup-guide', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-excel', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-tally', kind: 'RELATED' },
  ],
  sources: [MS_COAUTHOR, MS_WEB, ODOO_INV, ODOO_PRICING, TALLY, ZOHO, ZOHO_PRICING],
  evidence: [
    'apps/web/src/modules/inventory/products',
    'apps/web/src/modules/inventory/product-units',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
    'apps/web/src/modules/inventory/transfers/components/ReceiveModal.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkEditPage.tsx',
    'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
    'apps/web/src/integrations/accounting/TallyCard.tsx',
    'apps/web/src/industries/mobile/MobilePack.tsx',
  ],
  factNote:
    'Excel (co-authoring requirements, free web version), Odoo Inventory and pricing, TallyPrime product page (editions, cloud add-on, GST features, INR prices) and Zoho Inventory home and pricing (free plan 50 orders, 1 user, 2 locations) read on 2026-10-26. Nafaa claims checked in the evidence files.',
  needsOwner: [],
};

export default spec;
