/**
 * FAQs for the product, solution, service, pricing and marketplace pages.
 * Each answer was checked against the code listed in `evidence`. Prices only
 * appear as {{price:...}} tokens.
 */

import type { SeedFaq } from '../../lib/types';

const NEW = 'new (D2, 20 Oct 2026)';

export const mainPageFaqs: SeedFaq[] = [
  // ─── Products ───
  {
    key: 'mp-pos-hardware',
    topic: 'product',
    question: 'Which printers and scanners work with the Nafaa POS?',
    answer:
      'Any USB or Bluetooth barcode scanner that types like a keyboard works without setup. Receipts print on 58 mm and 80 mm thermal printers, and the Windows desktop app prints without a dialog and can open the cash drawer. You can also skip paper and send the receipt on WhatsApp.',
    sourceNote: 'core/hardware (scanner input), core/print (58/80 mm), desktop app printing, WhatsApp receipt templates.',
    origin: NEW,
    evidence: ['apps/web/src/core/hardware', 'apps/web/src/core/print', 'apps/desktop', 'apps/web/src/core/lib/whatsapp/templates.ts'],
  },
  {
    key: 'mp-pos-payments',
    topic: 'product',
    question: 'Can one bill be paid partly in cash and partly by card or wallet?',
    answer:
      'Yes. At checkout you can split one bill across cash, card, JazzCash, Easypaisa, bank transfer and the customer\'s khata. Each part is recorded with its method, so the cash drawer, the wallet totals and the khata balance all stay correct in the day book.',
    sourceNote: 'PosSplitTender and PosCheckoutModal; accounting PayMethod list (CASH, CARD, BANK_TRANSFER, JAZZCASH, EASYPAISA).',
    origin: NEW,
    evidence: ['apps/web/src/modules/pos/components/PosSplitTender.tsx', 'apps/web/src/modules/pos/components/PosCheckoutModal.tsx', 'apps/web/src/integrations/accounting/accounting.api.ts'],
  },
  {
    key: 'mp-inventory-import',
    topic: 'product',
    question: 'Can I bring my product list from Excel?',
    answer:
      'Yes. Download the import template, fill in names, prices, cost, stock and barcodes, and upload it. Nafaa checks the file first and shows every row it would add or change, so you can fix mistakes before anything is saved. Products can be exported back to Excel at any time.',
    sourceNote: 'ProductBulkImportPage and import/columns.ts; reports/exports.',
    origin: NEW,
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/inventory/products/import/columns.ts', 'apps/web/src/modules/reports/exports'],
  },
  {
    key: 'mp-khata-limit',
    topic: 'khata',
    question: 'Can I set a credit limit for a customer?',
    answer:
      'Yes. Each khata customer can have a credit limit. When a new udhaar sale would take them over it, the counter stops the bill until a manager approves it with the PIN. The khata also groups what is owed by age, so you can see which balances are new and which have been waiting for months.',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: NEW,
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'mp-fbr-who',
    topic: 'compliance',
    question: 'Which tax authorities does Nafaa report invoices to?',
    answer:
      'Nafaa is an FBR & PRA approved POS integrator. It reports sales invoices to FBR for Tier-1 retailers and to the provincial authorities for services: PRA in Punjab, SRB in Sindh and KPRA in Khyber Pakhtunkhwa. Each bill gets its fiscal invoice number and QR code printed on the receipt.',
    sourceNote: 'integrations/fbr (IMS PostData) and integrations/tax-authority adapters (PRA, SRB, KPRA, FBR).',
    origin: NEW,
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'mp-fbr-offline',
    topic: 'compliance',
    question: 'What happens to fiscal invoices when the internet is down?',
    answer:
      'The counter keeps billing. Invoices that could not reach the tax authority are kept in a queue and sent again automatically when the connection returns, and failed ones are listed with the reason so you can fix them. You never have to stop selling because the tax server is slow.',
    sourceNote: 'FbrService retry cron (shouldRetry, parseFbrResponse) and FbrInvoiceStatus.',
    origin: NEW,
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/fbr/fbr-errors.ts'],
  },
  {
    key: 'mp-online-channels',
    topic: 'product',
    question: 'Which online stores and couriers can I connect?',
    answer:
      'Orders can come from a website built on Nafaa, a Shopify store, a WooCommerce store, Daraz and Foodpanda. For delivery you can book parcels with TCS, Leopards, M&P, PostEx, Trax and CallCourier from the order screen, and stock is updated on every connected channel when something sells.',
    sourceNote: 'online-orders: shopify, woocommerce, daraz, foodpanda services; courier-api adapters; stock-push.service.',
    origin: NEW,
    evidence: ['apps/api/src/integrations/online-orders', 'apps/api/src/integrations/online-orders/courier-api', 'apps/api/src/integrations/online-orders/stock-push.service.ts'],
  },
  {
    key: 'mp-branches-transfer',
    topic: 'product',
    question: 'Can I move stock from one branch to another?',
    answer:
      'Yes. Create a stock transfer from one branch, and the receiving branch confirms what arrived. Stock leaves one shop and lands in the other with a record of who sent and received it. Head office sees every branch\'s stock, sales and profit and loss side by side.',
    sourceNote: 'inventory/transfers; multi-branch center, pnl and day-book pages.',
    origin: NEW,
    evidence: ['apps/web/src/modules/inventory/transfers', 'apps/web/src/modules/multi-branch/pages'],
  },
  {
    key: 'mp-reports-export',
    topic: 'product',
    question: 'Can I export reports to Excel or my accountant\'s software?',
    answer:
      'Yes. Reports export to Excel and print as PDF, so you can share them with a partner or keep them for your records. Businesses with an accountant can also send each day\'s sales, returns, expenses and payments as a journal to QuickBooks, Xero or Zoho Books, or export them for Tally.',
    sourceNote: 'reports/exports; integrations/accounting (QuickBooks, Xero, Zoho adapters; Tally export).',
    origin: NEW,
    evidence: ['apps/web/src/modules/reports/exports', 'apps/api/src/integrations/accounting'],
  },
  {
    key: 'mp-staff-permissions',
    topic: 'product',
    question: 'Can I stop staff from giving discounts or refunds?',
    answer:
      'Yes. Each staff member gets a role with its own permissions, and counter rules decide what needs a manager. By default a refund needs the manager PIN, and a discount above the limit you set needs it too. Every sensitive action is written to the activity log with the name of the person who did it.',
    sourceNote: 'core/security/ManagerPin.tsx; counter rules (refund PIN default on, discount limit); reports/activity-log.',
    origin: NEW,
    evidence: ['apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/reports/activity-log', 'apps/web/src/modules/hr/staff'],
  },

  // ─── Solutions ───
  {
    key: 'mp-ecommerce-stock',
    topic: 'solutions',
    question: 'Will my online store and shop share one stock?',
    answer:
      'Yes. Website, Shopify, WooCommerce, Daraz and Nafaa Bazaar orders take stock from the same products as the counter. When the last piece sells in the shop, the online channels are updated, so you do not sell what you no longer have.',
    sourceNote: 'stock-push.service and channel-catalog.service; marketplace publishing from Nafaa products.',
    origin: NEW,
    evidence: ['apps/api/src/integrations/online-orders/stock-push.service.ts', 'apps/api/src/integrations/online-orders/channel-catalog.service.ts', 'apps/api/src/marketplace/publishing'],
  },
  {
    key: 'mp-ecommerce-cod',
    topic: 'solutions',
    question: 'How does Nafaa help with cash-on-delivery orders?',
    answer:
      'Each online order shows the customer\'s past orders and returns, so a buyer who keeps refusing parcels stands out before you ship. You book the courier from the order, track it, and mark the cash as collected when the courier pays out. Payment links for JazzCash and Easypaisa let buyers pay before dispatch.',
    sourceNote: 'customer-risk.ts, courier-api, payment-links.service.',
    origin: NEW,
    evidence: ['apps/api/src/integrations/online-orders/customer-risk.ts', 'apps/api/src/integrations/online-orders/courier-api', 'apps/api/src/integrations/online-orders/payment-links.service.ts'],
  },
  {
    key: 'mp-wholesale-prices',
    topic: 'solutions',
    question: 'Can I keep separate retail and wholesale prices?',
    answer:
      'Yes. A product can carry a retail price and a wholesale price, and each unit (piece, dozen, carton) has its own price too. The counter uses the right one for the sale, and the khata keeps each trade customer\'s balance and credit limit.',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: NEW,
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'mp-manufacturing-scope',
    topic: 'solutions',
    question: 'Does Nafaa do full manufacturing (MRP)?',
    answer:
      'Not yet as a general module. Today Nafaa handles raw materials, recipes with costing and daily production plans for food production such as bakeries and kitchens, plus purchasing, stock and sales for any factory. Bills of materials for any product and work orders are on the roadmap. Our team can also build custom modules.',
    sourceNote: 'industries/bakery (IngredientsPage, ProductionPage, RecipeCosting, PlanBuilder); restaurant RecipesPage. General BOM/work orders not found in apps/web.',
    origin: NEW,
    evidence: ['apps/web/src/industries/bakery/pages/ProductionPage.tsx', 'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx', 'apps/web/src/industries/restaurant/pages/RecipesPage.tsx'],
  },
  {
    key: 'mp-enterprise-api',
    topic: 'solutions',
    question: 'Can Nafaa connect to our other systems?',
    answer:
      'Yes. The Nafaa API reads products, stock, customers, sales and online orders and can create customers, using keys you create in Settings. Webhooks tell your systems when a sale or order happens. Accounting journals go to QuickBooks, Xero or Zoho Books, and our team can build any connector you need.',
    sourceNote: 'integrations/public-api (api-keys, webhooks, events); integrations/accounting.',
    origin: NEW,
    evidence: ['apps/api/src/integrations/public-api', 'apps/api/src/integrations/accounting'],
  },
  {
    key: 'mp-restaurant-kot',
    topic: 'solutions',
    question: 'How do orders reach the kitchen?',
    answer:
      'When a waiter or cashier saves an order, Nafaa sends a kitchen order ticket (KOT) to the right station, such as the grill or the drinks counter. Tickets show on the kitchen display or print at the station, and move from new to cooking to ready, so the counter knows when a table\'s food is done.',
    sourceNote: 'restaurant KotDisplayPage and StationsPage.',
    origin: NEW,
    evidence: ['apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx', 'apps/web/src/industries/restaurant/pages/StationsPage.tsx'],
  },

  // ─── Services ───
  {
    key: 'mp-services-price',
    topic: 'services',
    question: 'How do you price a project?',
    answer:
      'After a short call we write down what will be built and send one fixed quote for that scope, in PKR or USD. You see the work in stages as it is built. If you want to change the scope later, we quote the change first and only start once you agree.',
    sourceNote: 'Service process (owner decision: worldwide services via "Quote lein" form; quote form takes PKR or USD).',
    origin: NEW,
    evidence: ['apps/site/src/components/islands/LeadForm.tsx'],
  },
  {
    key: 'mp-migration-what',
    topic: 'services',
    question: 'What can you move into Nafaa from my old system?',
    answer:
      'Products with prices, cost, barcodes and stock, customers with their khata balances, and suppliers with what you owe them. We take Excel or CSV files or an export from your old software, check them with you, and import them with the same tools the app uses, so nothing is typed by hand.',
    sourceNote: 'Product bulk import; customers directory; suppliers.',
    origin: NEW,
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/customers', 'apps/web/src/modules/purchasing/suppliers'],
  },

  // ─── Pricing and marketplace ───
  {
    key: 'mp-pricing-trial',
    topic: 'pricing',
    question: 'What happens when the 7-day free trial ends?',
    answer:
      'Your products, customers and sales stay in your account. Billing pauses until you pick a plan, and everything is there when you do. You never need a credit card to start the trial, and you can change plans later as the business grows.',
    sourceNote: 'Plan table: trialDays 7, free-trial description "koi credit card nahi chahiye"; SubscriptionGuard blocks (402) on expiry without deleting data.',
    origin: NEW,
    evidence: ['apps/api/src/modules/billing/subscriptions/guards/subscription.guard.ts', 'apps/api/src/modules/billing/plans/plans.service.ts'],
  },
  {
    key: 'mp-pricing-periods',
    topic: 'pricing',
    question: 'Can I pay quarterly or yearly instead of monthly?',
    answer:
      'Yes. Plans can be paid monthly, quarterly or yearly. Use the toggle above the plans to see each price, and the saving compared with paying month by month is shown next to it. All prices are in Pakistani rupees and come straight from our plan settings, the same ones the app uses.',
    sourceNote: 'Plan table quarterly/yearly prices; PricingToggle computes the saving from the plan rows.',
    origin: NEW,
    evidence: ['apps/site/src/components/islands/PricingToggle.tsx', 'apps/api/src/modules/billing'],
  },
  {
    key: 'mp-bazaar-what',
    topic: 'marketplace',
    question: 'What is Nafaa Bazaar?',
    answer:
      'Nafaa Bazaar is the Nafaa marketplace, where buyers browse and order from shops that use Nafaa. You choose which of your products to list, and their price and stock come from your Nafaa account. Orders arrive in the same app as your counter sales and online orders.',
    sourceNote: 'apps/marketplace (buyer app); apps/api/src/marketplace (publishing, orders); apps/web/src/marketplace (seller screens).',
    origin: NEW,
    evidence: ['apps/marketplace', 'apps/api/src/marketplace/publishing', 'apps/api/src/marketplace/orders', 'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx'],
  },
];
