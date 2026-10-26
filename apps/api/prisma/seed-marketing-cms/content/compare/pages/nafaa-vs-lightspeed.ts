/**
 * Nafaa vs Lightspeed Retail (formerly Vend). Facts from lightspeedhq.com:
 * the "Vend is now Lightspeed" page and the Retail pricing page (X-Series),
 * read on CHECKED_ON. Prices quoted in US dollars as published, with the date.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const LS_VEND = src('Vend is now Lightspeed', 'https://www.lightspeedhq.com/vend/', 'Lightspeed');
const LS_PRICING = src('Lightspeed Retail pricing (X-Series plans and services)', 'https://www.lightspeedhq.com/pos/retail/pricing/', 'Lightspeed');
const SOURCES = [LS_VEND, LS_PRICING];

const SUMMARY =
  'Vend is now Lightspeed Retail (X-Series), a cloud retail POS from Lightspeed with eCommerce, loyalty, wholesale ordering and integrated payments, priced in US dollars. Nafaa is a POS built for Pakistani shops, priced in rupees. This page compares them for a retailer in Pakistan and says where Lightspeed is the stronger product.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-lightspeed',
  title: 'Nafaa vs Lightspeed (Vend)',
  seoTitle: 'Nafaa vs Lightspeed Retail (Vend) for Pakistani Retailers',
  seoDescription:
    'Nafaa vs Lightspeed Retail, formerly Vend: plans, payments, offline use and local fit for a retailer in Pakistan, from Lightspeed\'s own pages, Oct 2026.',
  competitorName: 'Lightspeed Retail (Vend)',
  competitorUrl: 'https://www.lightspeedhq.com/',
  verdict:
    'Lightspeed Retail is a mature retail platform for stores in the countries it serves, with integrated card payments, eCommerce and brand wholesale networks. For a shop in Pakistan, Nafaa is the practical choice: rupee pricing, JazzCash, Easypaisa and udhaar on the bill, and local support.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Lightspeed Retail (formerly Vend)' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Lightspeed for retailers in the markets it serves directly; Nafaa for a retailer in Pakistan.' },
        { label: 'Choose Lightspeed if', value: 'You trade in a country where Lightspeed Payments and support are offered and want its wholesale and eCommerce network.' },
        { label: 'Choose Nafaa if', value: 'You sell in Pakistan, take wallets and udhaar, and want pricing and support in rupees and Urdu.' },
        { label: 'Lightspeed price', value: 'X-Series from US$89 a month (Basic), US$149 (Core), US$289 (Plus), shown with annual billing (26 Oct 2026)' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Lightspeed (pehle Vend) un mulkon ke liye acha hai jahan wo khud kaam karta hai. Pakistan ki dukaan ke liye Nafaa behtar hai: rupay me qeemat, JazzCash, Easypaisa, udhaar aur Urdu me madad.',
      'Which one should you choose?',
    ),
    disclosure('Lightspeed and Vend', 'lightspeedhq.com (the Vend page and the Retail pricing page)'),
    prose(`## What happened to Vend

Vend was a popular cloud POS for retailers. Lightspeed's own page now says "Vend is now part of the Lightspeed family" and that Vend is "now Lightspeed Retail (X-Series)", with the same inventory tracking, an eCommerce option, a retail API and access to Lightspeed Capital, its merchant cash advance programme. If you are searching for Vend today, Lightspeed Retail is the product you will be offered.

## What each one is

**Lightspeed Retail (X-Series)** is priced per month in US dollars, shown with annual billing that "saves up to 18%": Basic at US$89, Core at US$149 and Plus at US$289, each with one register included and more registers and locations at extra cost. Plans include integrated payments, product and stock management across channels, built-in eCommerce (Basic), in-store and online loyalty, and on higher plans advanced reports, landed costs, forecasting, custom roles, API access and single sign-on. The page lists 24/7 chat and phone support, a card-present rate of 1.5% with Lightspeed Payments, and notes that some services, such as taking payments in the mobile app and Lightspeed Capital, are only available in certain countries.

**Nafaa** is built for retail in Pakistan: barcode billing with quick keys, sizes and colours, cash, card, JazzCash, Easypaisa, bank transfer and udhaar on one bill, a khata with credit limits, purchasing with supplier balances, branches with transfers, staff roles and Profit reports, priced in rupees.`),
    compareTable(
      'Nafaa and Lightspeed Retail side by side',
      'Lightspeed details are from lightspeedhq.com, checked on the date shown. Nafaa details are from the product as it is today.',
      'Lightspeed Retail (X-Series)',
      [
        ['Price', 'From {{price:min.monthly}} a month in rupees', 'US$89, US$149 or US$289 a month with annual billing; extra registers and locations cost more'],
        ['Registers', 'Counters and devices within the plan\'s limits', 'One register included; additional registers charged'],
        ['Card payments', 'Records card payments made on your bank\'s machine', 'Lightspeed Payments, card-present rate 1.5%'],
        ['Wallets and udhaar', 'JazzCash, Easypaisa, bank transfer and udhaar as their own methods; khata with limits', 'Not listed for Pakistan on the pages checked'],
        ['eCommerce', 'Online store plus Shopify, WooCommerce and Daraz on the same stock', 'Built-in Lightspeed eCommerce'],
        ['Stock', 'Variants, units, batches, transfers, stock counts and supplier purchases', 'Products, variants and stock across channels; landed costs and forecasting on higher plans'],
        ['Wholesale sourcing', 'Not offered', 'Lightspeed Wholesale and NuORDER catalog for ordering from brands'],
        ['Staff', 'Roles for Discounts, refunds and seeing Cost; attendance and payroll', 'Staff reports; custom user roles on higher plans'],
        ['Devices', 'Browser on any phone, tablet or computer; Windows app', 'iPad POS, countertop hardware, iOS and Android scanner app'],
        ['Support', 'WhatsApp and video calls, in Urdu or English', '24/7 chat and phone support'],
      ],
      SOURCES,
    ),
    prose(`## When Lightspeed is the better choice

- **You trade where Lightspeed operates directly.** If your store is in a country where Lightspeed Payments, Capital and local support are offered, you get a full retail platform from one company.
- **You buy from international brands.** Lightspeed Wholesale and the NuORDER catalog connect retailers with brands and speed up product setup. Nafaa has nothing similar.
- **You need landed costs and forecasting,** with freight and duty spread across product costs, and custom scheduled reports.
- **You want round-the-clock phone support,** which the Lightspeed pricing page lists.
- **You run a large chain** that needs single sign-on and a retail API with an enterprise account team.

## When Nafaa is the better choice

- **You trade in Pakistan.** Nafaa is priced in rupees, so there is no dollar bill that changes with the exchange rate.
- **Customers pay the way Pakistan pays.** JazzCash, Easypaisa, bank transfer and udhaar are separate methods, and the drawer and wallets reconcile at closing. See [Payments](/product/payments).
- **Credit matters.** Regular customers and contractors buy on khata with limits and WhatsApp reminders. See [Khata](/product/khata).
- **Any device.** Bill on an Android phone, a cheap tablet or the shop's Windows PC; no iPad needed.
- **Power cuts.** The counter keeps billing without internet and syncs later. See [Offline POS](/product/offline-pos).
- **Local channels and couriers.** Daraz orders and Pakistani couriers such as PostEx, Leopards and TCS work with your stock.`),
    shot({
      heading: 'Branches side by side',
      body: 'Sale, Profit and average bill per branch, with Expenses and returns, so head office sees every shop at once and moves stock where it sells.',
      id: SHOT.branches,
      url: 'app.nafaa.pk/branches',
      layout: 'split-right',
      callouts: [
        { x: 34.5, y: 19.5, label: 'Sale, profit and average bill' },
        { x: 57, y: 31, label: 'Expenses and returns per branch' },
        { x: 35.6, y: 75, label: 'Branches compared side by side' },
      ],
    }),
    steps(
      'Moving from Vend or Lightspeed to Nafaa',
      [
        ['Get your lists into spreadsheets', 'Products with variants, prices and stock, and customers with balances. Ask Lightspeed support for the best way to export them.'],
        ['Import into Nafaa', 'Upload the product file; each line is checked. Add customer balances as opening balances.'],
        ['Connect your hardware', 'Receipt printers, barcode scanners and cash drawers usually carry over.'],
        ['Do one stock count', 'Count once to set opening stock per branch.'],
        ['Bill in parallel for a few days', 'Keep the old account open for look-ups until you are confident.'],
      ],
      'Our data migration service can help if your export is large.',
      true,
    ),
    prose(`## Before you choose

Check whether Lightspeed sells and supports its Retail plans in Pakistan, and in which currency you would be billed. Ask which payment features work here, since several are limited to certain countries. Then price a full year for your registers and locations on both sides. For a broader comparison of options for Pakistani shops, see [How to choose POS software in Pakistan](/best/pos-software-pakistan).`),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'BEST_OF:pos-software-pakistan', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-loyverse', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/integrations/channels/daraz',
    'apps/api/src/integrations/online-orders/courier-api/registry.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/vite.config.ts',
    'apps/desktop/src/main/cashDrawer.ts',
  ],
  factNote:
    'Lightspeed facts read on 2026-10-26: lightspeedhq.com/vend ("Vend is now part of the Lightspeed family"; "now Lightspeed Retail (X-Series)"; eCom, API, Lightspeed Capital) and lightspeedhq.com/pos/retail/pricing (X-Series; annual billing "save up to 18%"; Basic US$89, Core US$149, Plus US$289 per month; 1 register included; Lightspeed Payments card-present 1.5%; built-in eCommerce Basic; loyalty; Lightspeed Wholesale and NuORDER; landed costs; forecasting; custom user roles; SSO; 24/7 chat and phone support; mobile payments and Capital limited to certain countries; "prices can vary").',
  topics: ['Price', 'Registers', 'Card payments', 'Wallets and udhaar', 'eCommerce', 'Stock', 'Wholesale', 'Staff', 'Devices', 'Support'],
  dropped: ['"Tens of thousands" of businesses (vendor usage claim).'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: Lightspeed X-Series prices (US$89/149/289 with annual billing) and which plan features sit on which tier.',
    'Verify: whether Lightspeed Retail is sold and supported in Pakistan; the page tells readers to check.',
  ],
};

export default spec;
