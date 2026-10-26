/**
 * Nafaa vs Zoho Inventory. Zoho facts from zoho.com/inventory (features and
 * integrations), zoho.com/inventory/pricing (plans in US dollars) and
 * zoho.com/pos (the separate Zoho POS product), read on CHECKED_ON.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const ZI_HOME = src('Zoho Inventory (features and integrations)', 'https://www.zoho.com/inventory/', 'Zoho');
const ZI_PRICING = src('Zoho Inventory pricing (plans, orders, users, locations)', 'https://www.zoho.com/inventory/pricing/', 'Zoho');
const ZOHO_POS = src('Zoho POS (separate point of sale product)', 'https://www.zoho.com/pos/', 'Zoho');
const SOURCES = [ZI_HOME, ZI_PRICING, ZOHO_POS];

const SUMMARY =
  'Zoho Inventory is cloud inventory and order management for businesses that sell across channels and ship orders, priced in US dollars by orders, users and locations. Nafaa is a POS-first system for Pakistani shops, with stock, khata and purchasing built around the counter. This page compares them and says when Zoho Inventory is the better choice.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-zoho-inventory',
  title: 'Nafaa vs Zoho Inventory',
  seoTitle: 'Nafaa vs Zoho Inventory: Shop POS or Order Management?',
  seoDescription:
    'Nafaa vs Zoho Inventory for Pakistani businesses: counter POS with stock and khata against multichannel inventory and shipping. Plans, limits and fit.',
  competitorName: 'Zoho Inventory',
  competitorUrl: 'https://www.zoho.com/inventory/',
  verdict:
    'Zoho Inventory fits a business whose sales are orders to pick, pack and ship across marketplaces and warehouses, especially one already on Zoho Books. Nafaa fits a business whose sales happen at a counter, with walk-in customers, udhaar and cash, and online orders as a second channel.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Zoho Inventory' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Zoho Inventory for order fulfilment and warehouses; Nafaa for a counter where stock, udhaar and cash move with every bill.' },
        { label: 'Choose Zoho Inventory if', value: 'You sell mainly through online channels and ship parcels, manage bins and warehouses, and use Zoho Books.' },
        { label: 'Choose Nafaa if', value: 'You serve walk-in customers, give udhaar, take JazzCash and Easypaisa, and sell online from the same stock.' },
        { label: 'Zoho Inventory price', value: 'Free plan (50 orders); paid from US$29 per organisation per month billed yearly (zoho.com, 26 Oct 2026)' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Zoho Inventory online orders, godaam aur parcel bhejne ke liye hai. Nafaa counter wali dukaan ke liye hai, jahan har bill ke saath Stock, udhaar aur galla badalta hai.',
      'Which one should you choose?',
    ),
    disclosure('Zoho Inventory', 'zoho.com (Zoho Inventory, its pricing page and Zoho POS)'),
    prose(`## What each one is

**Zoho Inventory** is built around orders. Its feature list covers purchase orders and receiving, multi-warehouse management, transfer orders, picklists, bin locations, backorders and dropshipping, packaging and shipping with tracking, serial and batch tracking, price lists, barcodes and sales returns. It connects to Etsy, Shopify, WooCommerce and Zoho Commerce, to Zoho Books, Xero and QuickBooks Online, and to carriers such as UPS and FedEx. Plans are priced in US dollars per organisation and grow by orders per month, users and locations. A free plan allows 50 orders, one user and two locations. Zoho sells point of sale separately as **Zoho POS**, which its site says has Windows, macOS, Android and iOS billing apps with offline billing.

**Nafaa** starts at the counter. Each bill takes stock off the shelf, records the money by method and puts udhaar in the customer's khata. Purchases add stock and track supplier balances, branches transfer stock between them, and stock counts show the difference between system and shelf. Online orders from your own store, Shopify, WooCommerce, Daraz and Foodpanda come into the same stock.`),
    compareTable(
      'Nafaa and Zoho Inventory side by side',
      'Zoho details are from zoho.com/inventory, its pricing page and zoho.com/pos, checked on the date shown. Nafaa details are from the product as it is today.',
      'Zoho Inventory',
      [
        ['Built for', 'Counter sales with stock, khata and cash', 'Order management, warehouses and shipping'],
        ['Point of sale', 'Included: barcode, quick keys, printer, drawer, offline billing', 'Not part of Zoho Inventory; Zoho POS is a separate product'],
        ['Pricing model', 'Monthly plan per business, in rupees', 'Per organisation per month in US dollars, by orders, users and locations'],
        ['Entry plans', 'From {{price:min.monthly}} a month after a 7-day free trial', 'Free: 50 orders, 1 user, 2 locations; Standard US$29 a month billed yearly: 500 orders, 2 users, 2 locations'],
        ['Batches and serials', 'Batches with expiry, and serial or IMEI numbers in the relevant industry packs', 'Serial and batch tracking from the Professional plan (US$79)'],
        ['Customer udhaar', 'Khata from the bill, credit limits, WhatsApp reminders', 'Invoices and receivables'],
        ['Online channels', 'Own store, Shopify, WooCommerce, Daraz and Foodpanda', 'Etsy, Shopify, WooCommerce, Zoho Commerce and more'],
        ['Shipping', 'Pakistani couriers such as PostEx, Leopards, Trax and TCS', 'UPS, FedEx, Easyship and other carriers'],
        ['Accounting link', 'Daily journal to Zoho Books, QuickBooks Online or Xero; Tally file', 'Zoho Books, Xero and QuickBooks Online'],
        ['Support', 'WhatsApp and video calls, in Urdu or English', 'Free support 24/5; premium support plan available'],
      ],
      SOURCES,
    ),
    prose(`## When Zoho Inventory is the better choice

- **Most of your sales are shipped orders.** Picklists, packages, bins, backorders and dropshipping are core to Zoho Inventory. Nafaa handles online orders and couriers, but it is not a warehouse management system.
- **You run large warehouses with bin locations.** Zoho's Premium plan lists 2,000 bins per location.
- **You sell on international marketplaces** such as Etsy, or ship abroad with UPS or FedEx.
- **You already use Zoho Books, CRM or other Zoho apps.** Staying in one family of apps keeps logins and data together.
- **You need multi-currency transactions per contact,** which Zoho lists on its Enterprise plan.

## When Nafaa is the better choice

- **You have a counter.** Zoho Inventory does not include a POS; you would add Zoho POS or another system. Nafaa's [POS](/product/pos) is the centre of the product and keeps billing without internet.
- **Order limits do not fit counter trade.** A busy kiryana store makes hundreds of bills a day. Nafaa plans are not priced by number of orders.
- **Udhaar and local wallets.** Nafaa has a [khata](/product/khata) on every bill and treats JazzCash and Easypaisa as their own payment methods.
- **Local couriers.** Nafaa connects to Pakistani couriers, so cash-on-delivery parcels and returns are tracked against your stock. See [Online store](/product/online-store).
- **Rupee pricing and Urdu support.**`),
    shot({
      heading: 'Online and counter orders on one stock',
      body: 'Orders from your website, Shopify, WooCommerce and Daraz arrive next to counter sales, so the stock you show online is the stock on your shelf.',
      id: SHOT.onlineOrders,
      url: 'app.nafaa.pk/online-orders',
      layout: 'split-right',
    }),
    prose(`## Using Nafaa with Zoho Books

If your accountant uses Zoho Books, you can run the counter on Nafaa and keep the books in Zoho. Nafaa connects to Zoho Books and sends one balanced journal a day with sales by payment method, udhaar given and collected, Discounts, refunds and expenses, and optionally cost of goods sold. Each line is mapped once to an account in Zoho Books. That gives the accountant clean daily totals without every bill.

## A note on order limits

Zoho Inventory plans count orders per month: 50 on the free plan, 500 on Standard, 3,000 on Professional, 7,500 on Premium and 15,000 on Enterprise, according to its pricing page. A shop billing 200 walk-in sales a day makes about 6,000 bills a month. Whether counter bills count against these limits depends on how you connect a POS, so ask Zoho before you plan around them.`),
    steps(
      'How to decide',
      [
        ['Count your sales by channel', 'How many are counter bills, and how many are shipped orders?'],
        ['List what the warehouse needs', 'Bins, picklists and packages point to Zoho Inventory; shelves and a stock room point to Nafaa.'],
        ['Check your accountant\'s software', 'Both connect to Zoho Books, QuickBooks Online and Xero.'],
        ['Price a full year', 'Zoho in US dollars by orders, users and locations; Nafaa by plan in rupees.'],
        ['Trial both', 'Run a week of real sales and a stock count in each.'],
      ],
      undefined,
      true,
    ),
  ],
  relations: [
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'SOLUTION:ecommerce', kind: 'RELATED' },
    { ref: 'BEST_OF:inventory-software-pakistan', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-odoo', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-quickbooks', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
    'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
    'apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/integrations/channels/shopify',
    'apps/web/src/integrations/channels/daraz',
    'apps/web/src/integrations/channels/foodpanda',
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/api/src/integrations/accounting/zoho.adapter.ts',
    'apps/api/src/integrations/accounting/daily-journal.ts',
    'apps/api/src/integrations/online-orders/courier-api',
    'apps/api/src/integrations/online-orders/online-orders.service.ts',
  ],
  factNote:
    'Zoho facts read on 2026-10-26: zoho.com/inventory (purchasing, multi-warehouse, transfer orders, picklists, bins, backorders and dropshipping, shipping and tracking, serial and batch tracking, price lists, barcodes; integrations Etsy, Shopify, WooCommerce, Zoho Commerce, Zoho Books, Xero, QuickBooks Online, UPS, FedEx, Easyship), zoho.com/inventory/pricing (USD; Free: 50 orders, 1 user, 2 locations; Standard US$29 per organisation per month billed annually, 500 orders, 2 users, 2 locations; Professional US$79, 3000 orders, 4 locations, serial and batch tracking; Premium US$129, 7500 orders, 6 locations, 2000 bins per location; Enterprise US$249, 15000 orders, 7 users, 10 locations, multi-currency per contact; prices exclude local taxes; free support 24/5) and zoho.com/pos (separate product; Windows, macOS, Android and iOS billing apps with offline billing).',
  topics: ['Built for', 'POS', 'Pricing model', 'Entry plans', 'Batches', 'Udhaar', 'Online channels', 'Shipping', 'Accounting', 'Support'],
  dropped: ['Zoho POS prices (shown in Indian rupees on the page we saw; currency depends on region).'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: Zoho Inventory plan prices and limits in US dollars as listed, and whether Zoho shows other prices to visitors from Pakistan.',
    'Confirm Nafaa serial/IMEI tracking is available in the electronics and mobile packs only (the page says "in the relevant industry packs").',
  ],
};

export default spec;
