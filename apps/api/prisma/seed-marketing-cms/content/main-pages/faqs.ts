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
    evidence: ['apps/web/src/modules/inventory/transfers', 'apps/web/src/modules/multi-branch'],
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

  // ─── Solution pages (one page each) ───
  {
    key: 'sol-shop-first-bill',
    topic: 'solutions',
    question: 'How soon can a shop make its first bill?',
    answer:
      'As soon as one product is in. Sign up, pick your trade, then add products by hand, scan their barcodes or import your list from Excel. The Excel import shows every row before anything is saved, so mistakes are fixed first. You can keep adding products while the counter is already in use.',
    sourceNote: 'Onboarding steps; ProductBulkImportPage (dry run); POS works with any saved product.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/onboarding', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/pos'],
  },
  {
    key: 'sol-shop-cashier-control',
    topic: 'solutions',
    question: 'Can I stop a cashier from giving refunds or big discounts?',
    answer:
      'Yes. Refunds need a manager PIN by default, and you set the largest discount a cashier may give in the counter settings; anything above it needs the PIN. Each person gets their own login with only the permissions you tick, and the activity log shows who did what and when.',
    sourceNote: 'ManagerPin; POSSection maxDiscountPercent; PermissionPicker; ActivityLogPage.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/organization/settings/sections/POSSection.tsx', 'apps/web/src/modules/hr/staff/components/PermissionPicker.tsx', 'apps/web/src/modules/reports/activity-log/pages/ActivityLogPage.tsx'],
  },
  {
    key: 'sol-chain-day-close',
    topic: 'solutions',
    question: 'Does each branch close its own day?',
    answer:
      'Yes. Each branch opens and closes its own cash shift with a note-by-note count, and the day book can be read for one branch or for all of them together. It covers sales, payment methods, drawers, expenses, purchases, khata, returns and discounts, and prints as a thermal Z report or a full A4 day book.',
    sourceNote: 'CashRegisterPage (shift per branch); DayBookPage (per branch or all branches, Z report / A4).',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx', 'apps/web/src/modules/reports/day-book/DayBookPage.tsx'],
  },
  {
    key: 'sol-chain-shared-list',
    topic: 'solutions',
    question: 'Do we have to add products separately for every branch?',
    answer:
      'No. The product list belongs to the account, so a product is added once and every branch can sell it. Stock is kept per branch, and the stock report shows what each branch holds, what it is worth and what is slow or dead there. Stock moves between branches through transfers that are checked on arrival.',
    sourceNote: 'Products are account-level; StockReportPage branch view; TransfersPage and ReceiveModal.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/inventory/products', 'apps/web/src/modules/inventory/stock-report/pages/StockReportPage.tsx', 'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx'],
  },
  {
    key: 'sol-ecom-no-website',
    topic: 'solutions',
    question: 'I sell on Instagram and WhatsApp. Do I need a website?',
    answer:
      'No. Nafaa gives your shop an order page with your products, prices and stock straight from Nafaa. Share its link on Instagram, WhatsApp or anywhere else, or add it to a site as an "Order" button. Orders from it land in the same online orders list as every other channel.',
    sourceNote: 'PublicOrderPage: customer-facing order form fed from the shop catalogue; orders go to Online orders.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/online-orders/public/PublicOrderPage.tsx', 'apps/web/src/integrations/online-orders/pages/OnlineOrdersPage.tsx'],
  },
  {
    key: 'sol-ecom-courier-money',
    topic: 'solutions',
    question: 'How do I know which courier still owes me COD money?',
    answer:
      'The COD screen shows parcels still on the road, money a courier has collected but not paid in, settlements received, and parcels that came back. When the courier pays, mark the orders paid from its settlement sheet, by hand or by pasting the consignment numbers.',
    sourceNote: 'CodPage: on the road, collected not paid, settlements, RTO, per-courier numbers; settle by pasting CNs.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/online-orders/pages/CodPage.tsx'],
  },
  {
    key: 'sol-rest-happy-hours',
    topic: 'solutions',
    question: 'Can prices change by themselves at certain hours?',
    answer:
      'Yes. Happy hours apply a price cut in a time window, such as cheaper tea in the afternoon or a deal on Friday night. A rule can be limited to days, dates, categories, dishes, order types and a minimum bill, with a cap per bill, and it stays within the discount limit set for your counter.',
    sourceNote: 'HappyHoursPage: time window in shop time, filters, cap, held to the shop discount limit.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx'],
  },
  {
    key: 'sol-rest-rider-cash',
    topic: 'solutions',
    question: 'How do I keep track of the cash delivery riders carry?',
    answer:
      'The delivery board shows each order waiting for a rider, assigned, on the way or delivered with cash still with the rider. When the rider hands the cash over at the counter, each order becomes a cash bill, so the drawer and the day book match what is in hand. The riders screen shows how much each rider still has to hand over.',
    sourceNote: 'DeliveryTrackingPage ("Cash lein"); RidersPage (cash still to hand over).',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/industries/restaurant/pages/DeliveryTrackingPage.tsx', 'apps/web/src/industries/restaurant/pages/RidersPage.tsx'],
  },
  {
    key: 'sol-wholesale-price-list',
    topic: 'solutions',
    question: 'Can I send my price list to shopkeepers?',
    answer:
      'Yes. The catalog screen prints a price list or a photo catalog and shares it on WhatsApp. It only ever shows sale prices, never your cost. A customer can also pick items from a shared list and send the pick list back to you.',
    sourceNote: 'CatalogPage: price list and photo catalog print, WhatsApp sharing, pick list; sale prices only.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/catalog/pages/CatalogPage.tsx', 'apps/web/src/modules/catalog/catalogPrint.ts'],
  },
  {
    key: 'sol-wholesale-supplier-rates',
    topic: 'solutions',
    question: 'Can I see how a supplier\'s rates have changed?',
    answer:
      'Yes. Each supplier\'s page shows what you owe and since when, the khata statement for any period, their bills, and how their rates moved over time. From the same page you can pay them, raise a purchase order or send a message.',
    sourceNote: 'SupplierDetailPage: dues by age, statement, bills, rate history, pay/buy/order/message.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/purchasing/suppliers/pages/SupplierDetailPage.tsx'],
  },
  {
    key: 'sol-mfg-dairy',
    topic: 'solutions',
    question: 'Can a dairy record dahi and makhan made from milk?',
    answer:
      'Yes. The dairy production screen takes milk out of stock and puts the dahi, makhan, lassi or khoya made from it into stock at the milk\'s cost. At day end, spoiled goods are recorded as a stock adjustment, so the profit report shows the loss instead of a quiet gap in stock.',
    sourceNote: 'industries/dairy ProductionPage.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/industries/dairy/pages/ProductionPage.tsx'],
  },
  {
    key: 'sol-mfg-made-to-order',
    topic: 'solutions',
    question: 'Does Nafaa handle made-to-order work?',
    answer:
      'For furniture, yes. A custom order moves from quotation to advance, to the karigar, to ready and delivery. The advance goes on the customer\'s khata the day it is paid, and the bill is made when the piece leaves the shop. Karigar pay from the drawer is saved as an expense, so the day book and profit see it.',
    sourceNote: 'industries/furniture CustomOrdersPage and CarpentersPage.',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx', 'apps/web/src/industries/furniture/pages/CarpentersPage.tsx'],
  },
  {
    key: 'sol-ent-data-out',
    topic: 'solutions',
    question: 'Can we take our data out of Nafaa?',
    answer:
      'Yes. Exports give Excel files of the business records for any period and branch, with a history of who downloaded which file. The owner can also download a backup of all records as one file. Exports and backups are plan features; the pricing page shows which plans include them.',
    sourceNote: 'ExportsPage (Excel, download history); BackupPage (owner-only JSON backup).',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/reports/exports/pages/ExportsPage.tsx', 'apps/web/src/modules/backup/pages/BackupPage.tsx'],
  },
  {
    key: 'sol-ent-accounting',
    topic: 'solutions',
    question: 'How does Nafaa send figures to our accounting software?',
    answer:
      'Nafaa posts one summary journal per day to Zoho Books, QuickBooks or Xero: sales, discounts, udhaar, refunds and expenses, mapped to your own accounts, with each payment method going to the account you choose. For Tally, Nafaa makes a file of each day\'s sales, receipt and payment vouchers to import.',
    sourceNote: 'AccountingPage (daily summary journal, payment-method mapping); TallyCard (voucher file).',
    origin: 'new (solutions pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/accounting/AccountingPage.tsx', 'apps/web/src/integrations/accounting/TallyCard.tsx', 'apps/api/src/integrations/accounting'],
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
      'Products with prices, cost, barcodes and stock, customers with their old udhaar, and suppliers with what you owe them. We take Excel or CSV files, an export from your old software or photos of the register. Products go in through the app\'s own import with a dry run, balances go in as opening khata and supplier balances, and we check the totals with you before go-live.',
    sourceNote: 'Product bulk import (dry run); customer opening balance (Purana khata); supplier opening balance.',
    origin: NEW,
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/customers', 'apps/web/src/modules/purchasing/suppliers'],
  },

  // ─── Service pages (one page each) ───
  {
    key: 'svc-custom-existing',
    topic: 'services',
    question: 'Can you work with the system we already have?',
    answer:
      'Usually, yes. If your current system has an API, a database we can read or even regular Excel exports, we can connect to it, move data out of it or build alongside it. The written plan says exactly which systems are touched and how, before any work starts.',
    sourceNote: "Integration work is the team's daily work in Nafaa (apps/api/src/integrations).",
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/api/src/integrations'],
  },
  {
    key: 'svc-custom-first-stage',
    topic: 'services',
    question: 'Can we start with a small first stage?',
    answer:
      'Yes. The plan splits the work into stages, and the first one can be the smallest part that is useful on its own. You use it, tell us what to change, and the next stage builds on what you learned.',
    sourceNote: 'Owner decision: projects delivered in visible stages.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/site/src/components/islands/LeadForm.tsx'],
  },
  {
    key: 'svc-web-edit',
    topic: 'services',
    question: 'Can my team update the website after launch?',
    answer:
      'Yes. Every site comes with a content editor, so your team can change text, images and posts without a developer. At launch we walk the people who will use it through the editor, and new pages built from the same blocks keep the design consistent.',
    sourceNote: 'Service scope; this site runs on the Nafaa CMS (apps/api/src/admin-marketing/cms).',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/api/src/admin-marketing/cms', 'apps/site'],
  },
  {
    key: 'svc-web-domain',
    topic: 'services',
    question: 'Do you handle the domain and hosting?',
    answer:
      'We connect your domain and put the site live as part of the launch stage. If you do not have a domain yet, we help you register one in your own name. The quote shows any costs that are paid to third parties, such as the domain name.',
    sourceNote: 'Service scope (launch stage).',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/site'],
  },
  {
    key: 'svc-store-existing',
    topic: 'services',
    question: 'I already have a Shopify or WooCommerce store. Can you connect it?',
    answer:
      'Yes. Shopify connects through its app install and WooCommerce through an approval in WordPress, both started from inside Nafaa. We match your existing products to Nafaa once; after that stock and orders flow by themselves, and the store keeps its design.',
    sourceNote: 'ShopifyAppPage; useWooConnect; MatchItemsModal.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/online-orders/pages/ShopifyAppPage.tsx', 'apps/web/src/integrations/online-orders/hooks/useWooConnect.ts', 'apps/web/src/integrations/online-orders/components/MatchItemsModal.tsx'],
  },
  {
    key: 'svc-store-outside-pk',
    topic: 'services',
    question: 'Do you build stores for businesses outside Pakistan?',
    answer:
      'Yes. We build custom, Shopify and WooCommerce stores for clients anywhere. Couriers such as TCS and PostEx and wallets such as JazzCash only apply in Pakistan; elsewhere we set up the payment and shipping options your platform and country offer. Connecting to Nafaa is optional.',
    sourceNote: 'Owner decision: build services are worldwide; Nafaa courier and wallet connections are Pakistan-specific.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/api/src/integrations/online-orders/courier-api', 'apps/api/src/integrations/payments'],
  },
  {
    key: 'svc-app-offline',
    topic: 'services',
    question: 'Can the app work without internet?',
    answer:
      'Yes, if the work needs it. Screens for riders and field staff can save data on the phone and send it when the signal returns, the same way the Nafaa counter keeps billing offline. We decide which screens need this during scoping.',
    sourceNote: 'Offline pattern used in Nafaa (core/lib/offline).',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/core/lib/offline'],
  },
  {
    key: 'svc-app-both-stores',
    topic: 'services',
    question: 'Do we get Android and iOS, or only one?',
    answer:
      'Both, from one React Native codebase, unless you only need one. One codebase keeps the two apps in step when features change. We prepare the store listings and publish under your own Google Play and App Store accounts, set up with you.',
    sourceNote: 'apps/mobile uses Expo / React Native.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/mobile/package.json'],
  },
  {
    key: 'svc-migration-old-pos',
    topic: 'services',
    question: 'Which old software can you move data from?',
    answer:
      'Any system that can export to Excel or CSV, which most POS and accounting software can. If yours cannot, we work from printed reports or photos of the register. Send a sample first and we will tell you what can come across.',
    sourceNote: 'Product import takes Excel/CSV; balances entered as opening balances.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  },
  {
    key: 'svc-migration-keep-selling',
    topic: 'services',
    question: 'Do I have to stop selling during the migration?',
    answer:
      'No. Keep using your old system while we prepare the data. You choose the go-live day, and the first bill in Nafaa follows on from the last one in the old system. A stock count after go-live corrects anything that sold in between.',
    sourceNote: 'Stock adjustments / counts after go-live.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/inventory/stock-adjustments/pages/StockAdjustmentsPage.tsx'],
  },
  {
    key: 'svc-fbr-ready',
    topic: 'services',
    question: 'What should I have ready for the FBR or PRA setup?',
    answer:
      'Your NTN, your registration with the provincial authority if you sell services, the POS ID issued for each counter or branch, and a list of branches with addresses. If you do not have a POS ID yet, we explain where it comes from before we start.',
    sourceNote: 'Tax settings fields (NTN, POS ID per authority).',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/fbr', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'svc-fbr-branches',
    topic: 'services',
    question: 'Can different branches report to different authorities?',
    answer:
      'Yes. Each branch is set up with its own authority and POS ID, so a Lahore branch can report to PRA while a Karachi branch reports to SRB. Every receipt carries the fiscal number from the authority of the branch that made it.',
    sourceNote: 'Tax-authority POS settings are per shop (FbrModeIndicator uses the active shop).',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/integrations/fbr/components/FbrModeIndicator.tsx', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'svc-hw-phone-print',
    topic: 'services',
    question: 'Can I print receipts from an Android phone?',
    answer:
      'Yes. Small 58 mm Bluetooth printers connect straight from the browser on Android, and USB or serial printers work from a computer. The Windows desktop app adds silent printing on network and USB printers. Each device has a test button in the hardware settings.',
    sourceNote: 'core/hardware: WebUSB, Web Serial, BLE transports; desktop printer mode.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/core/hardware/devices.ts', 'apps/web/src/core/hardware/settings.ts'],
  },
  {
    key: 'svc-hw-scale',
    topic: 'services',
    question: 'Does Nafaa work with a weighing scale?',
    answer:
      'Yes. A scale connected to the counter computer sends the weight straight into the bill, so items sold by the kilo are priced without typing. It suits meat, sabzi, sweets, dry fruit and other loose goods. The scale is set up and tested from the hardware settings of that counter.',
    sourceNote: 'core/hardware ScaleChip; POS PosWeighModal.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/core/hardware/ScaleChip.tsx', 'apps/web/src/modules/pos/components/PosWeighModal.tsx'],
  },
  {
    key: 'svc-train-online',
    topic: 'services',
    question: 'Is online training as good as on site?',
    answer:
      'For most teams, yes. Sessions run over video call with the trainee using Nafaa on their own device, so they practise on the same screen they will use every day. On-site training is available by arrangement where a team prefers it.',
    sourceNote: 'Service scope.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules'],
  },
  {
    key: 'svc-train-new-staff',
    topic: 'services',
    question: 'How do new staff learn after the training?',
    answer:
      'Every screen has a built-in guide that opens with the G key and explains it in plain words, and the help center covers common tasks. Many owners also ask a trained cashier to show new staff the counter, with the guide to fall back on.',
    sourceNote: 'PageGuide on every page (G key); modules/help.',
    origin: 'new (services pass, 26 Oct 2026)',
    evidence: ['apps/web/src/core/components/PageGuide.tsx', 'apps/web/src/modules/help'],
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

  // ─── Hub pages (one page each) ───
  {
    key: 'hub-product-one-price',
    topic: 'product',
    question: 'Do I pay separately for each part of Nafaa?',
    answer:
      'No. Nafaa is one account with one plan. The plan sets your limits for products, users, shops and monthly sales, and the plan table on the pricing page shows which features each plan includes. There is no separate bill for the counter, the khata or the reports.',
    sourceNote: 'Plan table: limits and feature flags per plan (billing/plans).',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/billing/plans/api', 'apps/api/src/modules/feature-gating/feature-gating.service.ts'],
  },
  {
    key: 'hub-solutions-combine',
    topic: 'solutions',
    question: 'Can one business use more than one solution?',
    answer:
      'Yes. Solutions are ways of setting up the same Nafaa account, not separate products. A restaurant can also sell online, a wholesaler can run a retail counter, and a shop can add branches, all on one account with one stock and one set of reports.',
    sourceNote: 'Single account model; channels, branches and industry packs on one tenant.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/organization/shops', 'apps/web/src/integrations/online-orders', 'apps/web/src/industries'],
  },
  {
    key: 'hub-services-need',
    topic: 'services',
    question: 'Do I need a service to start using Nafaa?',
    answer:
      'No. Nafaa is self-serve: sign up for the free trial, add your products and start billing. Services are for when you want our team to do the work, such as moving your data in, setting up hardware or tax invoices, training staff, or building something custom.',
    sourceNote: 'Self-serve signup and onboarding; services optional.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/onboarding', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  },
  {
    key: 'hub-industries-change',
    topic: 'industries',
    question: 'Can I change my trade after signing up?',
    answer:
      'Yes. The business type can be changed later in Settings, and the screens for the new trade switch on over the same products, customers and sales. Nothing in your records is lost when you switch, and the counter, stock and khata keep working the same way.',
    sourceNote: 'BusinessConfigSection changeType.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/organization/settings/sections/BusinessConfigSection.tsx'],
  },
  {
    key: 'hub-integrations-safe',
    topic: 'integrations',
    question: 'Are the keys I enter for channels and couriers kept safe?',
    answer:
      'Yes. Keys and passwords you enter for WooCommerce, wallets, couriers and accounting are stored encrypted, and Nafaa uses them only to talk to that service for your account. Secret fields are typed like passwords, and you can replace a key at any time from the same settings page.',
    sourceNote: 'core/lib/crypto encrypt() in woocommerce.service, payment-links.service, accounting and courier credential storage.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/api/src/integrations/online-orders/woocommerce.service.ts', 'apps/api/src/integrations/online-orders/payment-links.service.ts', 'apps/api/src/integrations/accounting/accounting.service.ts'],
  },
  {
    key: 'hub-roadmap-dates',
    topic: 'roadmap',
    question: 'When will coming-soon features be ready?',
    answer:
      'We give a date only when a feature is close to shipping, and the roadmap shows it as soon as it is live. Until then a coming-soon feature is never sold as available. If you need something now, our team can often build it as a custom project.',
    sourceNote: 'Roadmap policy; status badges on product, solution and integration entries.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/site/src/templates/roadmap'],
  },
  {
    key: 'hub-pricing-pay',
    topic: 'pricing',
    question: 'How do I pay for my Nafaa plan?',
    answer:
      'From the billing page in the app. Each Nafaa bill can be paid by bank transfer, JazzCash or Easypaisa, and the page keeps a record of your bills and the payments you sent, with a print option for your own files. Prices are in Pakistani rupees.',
    sourceNote: 'PayInvoicePage providerOptions (MANUAL_BANK, JAZZCASH, EASYPAISA); BillingPage bills and payments tabs.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/billing/billing/pages/PayInvoicePage.tsx', 'apps/web/src/modules/billing/billing/pages/BillingPage.tsx'],
  },
  {
    key: 'hub-pricing-usage',
    topic: 'pricing',
    question: 'How do I know when I need a bigger plan?',
    answer:
      'The billing page shows your usage against each limit of your plan: products, users, shops and sales this month. When you get close, compare plans on the same page and move up. Your data and settings stay as they are.',
    sourceNote: 'BillingPage usage tab (UsageMeters) and plan comparison; feature-gating usage endpoint.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/modules/billing/billing/components/UsageMeters.tsx', 'apps/web/src/modules/billing/billing/components/PlanCompare.tsx', 'apps/api/src/modules/feature-gating/feature-gating.service.ts'],
  },
  {
    key: 'hub-bazaar-delivery',
    topic: 'marketplace',
    question: 'Who delivers Nafaa Bazaar orders?',
    answer:
      'You do, with your own riders. Add riders in Nafaa, see who is available or out on a delivery, assign orders and follow them on the way. The order and its money stay in the same app as your counter sales.',
    sourceNote: 'MarketplaceDeliveryPage (riders and statuses); RiderTrackingPage.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx', 'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx'],
  },
  {
    key: 'hub-bazaar-who',
    topic: 'marketplace',
    question: 'Can any shop sell on Nafaa Bazaar?',
    answer:
      'Nafaa Bazaar is for shops that run on Nafaa, because listings, prices and stock come from your Nafaa account. Start the free trial, add your products, fill in your shop profile and choose what to list. Products you do not list stay private to your counter.',
    sourceNote: 'Marketplace publishing reads the tenant catalogue.',
    origin: 'new (hubs pass, 26 Oct 2026)',
    evidence: ['apps/api/src/marketplace/publishing', 'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx'],
  },
];
