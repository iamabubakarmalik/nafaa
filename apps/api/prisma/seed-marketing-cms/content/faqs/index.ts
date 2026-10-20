/**
 * FAQ library imported from apps/marketing (industry-content.ts) and rewritten
 * to what the app really does. Answers with typed prices, counts or claims
 * that could not be found in the code were dropped (see content/dropped.ts).
 * Prices only appear as {{price:...}} tokens.
 */

import type { SeedFaq } from '../../lib/types';

const IC = 'apps/marketing/src/lib/data/industry-content.ts';

export const faqs: SeedFaq[] = [
  // ─── Getting started (shared by many pages) ───
  {
    key: 'devices',
    topic: 'getting-started',
    question: 'Do I need a computer to use Nafaa?',
    answer:
      'No. Nafaa runs in a web browser, so the phone, tablet or computer you already have will do. A barcode scanner and a receipt printer can be added later but are not required to start. The counter also keeps working without internet and sends the sales to your account when the connection returns.',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: `${IC}#kiryana.faqs[0]`,
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'offline',
    topic: 'getting-started',
    question: 'Does Nafaa work without internet?',
    answer:
      'Yes, the counter keeps billing when the internet drops. Sales made offline are saved on the device and sent to your account automatically when the connection comes back, and you can see the sales still waiting to be sent. Reports and other branches see those sales once they have synced.',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'new',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'pricing',
    topic: 'pricing',
    question: 'How much does Nafaa cost?',
    answer:
      'Paid plans start at {{price:min.monthly}} a month. The pricing page lists every plan with its price and limits, taken straight from our plan settings, so it is always current. You can start with the free trial first, and no credit card is needed to sign up.',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'new',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
  {
    key: 'khata-reminders',
    topic: 'khata',
    question: 'Can Nafaa send udhaar reminders on WhatsApp?',
    answer:
      "Yes. The khata keeps each customer's udhaar, payments and balances brought over from the old register. From the khata you send a customer a WhatsApp reminder with their balance in one tap. Reminders go one by one from your own WhatsApp, and the wording gets firmer as the udhaar gets older.",
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'new',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },

  // ─── Home (D1, 20 Oct 2026) ───
  {
    key: 'every-business',
    topic: 'getting-started',
    question: 'Is Nafaa only for shops?',
    answer:
      'No. Nafaa started at the shop counter, but the same account runs restaurants (tables, kitchen tickets, delivery), online sellers (your own store and the Nafaa Bazaar marketplace), service businesses (bookings, memberships, commission), wholesalers (carton prices, credit limits, suppliers) and companies with many branches. Each business type gets its own screens on top of the same POS, stock, khata and reports.',
    sourceNote: 'apps/web/src/industries (31 packs), restaurant, multi-branch, online orders and marketplace publishing modules.',
    origin: 'new',
    evidence: ['apps/web/src/industries', 'apps/web/src/modules/multi-branch', 'apps/api/src/integrations/online-orders', 'apps/api/src/marketplace/publishing'],
  },
  {
    key: 'sell-online',
    topic: 'getting-started',
    question: 'Can I sell online with Nafaa?',
    answer:
      'Yes. Orders from your own website, a Shopify store or a WooCommerce store come into Nafaa next to your counter sales and take stock from the same shelf. You can also list products on Nafaa Bazaar, the Nafaa marketplace, to reach new buyers.',
    sourceNote: 'Online orders (website, Shopify, WooCommerce normaliser) and marketplace publishing.',
    origin: 'new',
    evidence: ['apps/api/src/integrations/online-orders/order-normalizer.ts', 'apps/api/src/integrations/channels/custom-website', 'apps/api/src/marketplace/publishing'],
  },
  {
    key: 'services-worldwide',
    topic: 'services',
    question: 'Do you build custom software for businesses outside Pakistan?',
    answer:
      'Yes. The team behind Nafaa builds custom software, websites, online stores and mobile apps for businesses in Pakistan and abroad. Tell us what you need through the “Quote lein” form on the services page, in English or Urdu, and we reply with a plan, a timeline and a price before any work starts.',
    sourceNote: 'Owner decision (20 Oct 2026): worldwide services through the "Quote lein" form.',
    origin: 'new',
    evidence: ['docs/marketing-site/PLAN.md'],
  },

  // ─── Kiryana ───
  {
    key: 'kiryana-units',
    topic: 'kiryana',
    question: 'Can I sell the same item by piece, dozen and carton?',
    answer:
      'Yes. A product can be sold in more than one unit, such as piece, dozen and carton, and each unit has its own price. So the same biscuit can go out as a single packet to one customer and as a full carton to a shopkeeper who buys in bulk, each at its own price.',
    sourceNote: 'Retail pack: multi-unit pricing (piece/dozen/carton).',
    origin: `${IC}#kiryana.faqs[2]`,
    evidence: ['apps/web/src/industries/retail/RetailPack.tsx'],
  },
  {
    key: 'kiryana-import',
    topic: 'kiryana',
    question: 'Can I add my products from Excel?',
    answer:
      'Yes. Download the template made for your business, fill it or paste your list, and upload it. Nafaa first checks every line in a dry run, flagging duplicates by name, SKU or barcode and bad prices, without saving anything. Then the import runs in chunks, and lines that need fixing download as Excel with the reason.',
    sourceNote: 'ProductBulkImportPage (template, column match, dry run, chunked import, error file).',
    origin: 'new',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  },

  // ─── Bakery ───
  {
    key: 'bakery-bulk',
    topic: 'bakery',
    question: 'Can I handle wedding and event bulk orders?',
    answer:
      'Yes. Bulk orders for weddings and events are kept apart from counter sales, with the advance recorded on the order. If an order is confirmed but no advance has come in, Nafaa warns you before you buy the material for it. A cancelled order can refund its advance in cash.',
    sourceNote: 'Bakery bulk orders (BulkViews.tsx: advance, no-advance warning, advance refund).',
    origin: `${IC}#bakery.faqs[0]`,
    evidence: ['apps/web/src/industries/bakery/components/bulk/BulkViews.tsx'],
  },
  {
    key: 'bakery-costing',
    topic: 'bakery',
    question: 'How does recipe and ingredient costing work?',
    answer:
      'Ingredients are kept as raw materials with their stock and cost per unit. On a product you add its recipe, with the quantity of each ingredient and how many pieces it makes, and Nafaa shows the cost as you build it. When ingredient costs change, the recipe cost follows, so you can see your real margin.',
    sourceNote: 'BakeryProductEditor (recipe with live cost, recipeYield) and BakeryRawMaterials.',
    origin: `${IC}#bakery.faqs[2]`,
    evidence: ['apps/web/src/industries/bakery/products/BakeryProductEditor.tsx', 'apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx'],
  },

  // ─── Pharmacy ───
  {
    key: 'pharmacy-salt',
    topic: 'pharmacy',
    question: 'Can I search medicines by salt or formula?',
    answer:
      'Yes. Each medicine carries its salt or formula, so you can search by brand name or by salt. Nafaa can also show the other brands with the same salt, so when one brand is missing the customer can take a substitute. Salts have their own list that you keep up to date.',
    sourceNote: 'Pharmacy salts page and substitutes API.',
    origin: `${IC}#pharmacy.faqs[1]`,
    evidence: ['apps/web/src/industries/pharmacy/api/salts.api.ts', 'apps/web/src/industries/pharmacy/api/substitutes.api.ts'],
  },
  {
    key: 'pharmacy-expiry',
    topic: 'pharmacy',
    question: 'How does batch and expiry tracking work?',
    answer:
      'Stock is kept by batch, each with its expiry date. The expiry screen lists what is close to expiring: items inside 30 days are marked red, inside 90 days amber, and expired stock stands out on its own. That gives you time to return, discount or move stock before it becomes a loss.',
    sourceNote: 'ExpiringPage tone thresholds (expired, 30, 90 days); pack description "batch tracking".',
    origin: `${IC}#pharmacy.faqs[2]`,
    evidence: ['apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx', 'apps/web/src/industries/pharmacy/PharmacyPack.tsx'],
  },
  {
    key: 'pharmacy-register',
    topic: 'pharmacy',
    question: 'Does Nafaa keep a narcotic register?',
    answer:
      "Yes. Medicines marked controlled, narcotic, psychotropic or Schedule X go into a register. When one is sold at the counter, Nafaa asks for the patient's name and CNIC and the doctor's name and PMDC number, and writes them on the bill line. The register then lists every such sale with those details, ready to check at any time.",
    sourceNote: 'pharmacy/lib/meta.ts (REGISTER_CLASSES, rxNote) and ControlledLogPage.',
    origin: `${IC}#pharmacy.faqs[0] (rewritten; DRAP claim dropped)`,
    evidence: ['apps/web/src/industries/pharmacy/lib/meta.ts', 'apps/web/src/industries/pharmacy/pages/ControlledLogPage.tsx'],
  },

  // ─── Restaurant ───
  {
    key: 'restaurant-stations',
    topic: 'restaurant',
    question: 'Can each kitchen station get its own tickets?',
    answer:
      'Yes. You set up stations such as grill, tandoor, karahi, Chinese or bar and give each one whole menu categories. Every dish then prints its KOT at its own station, on a printer or a kitchen screen. Categories not given to a station go to the first station, so no order is lost.',
    sourceNote: 'StationsPage and KotDisplayPage.',
    origin: `${IC}#restaurant.faqs[1]`,
    evidence: ['apps/web/src/industries/restaurant/pages/StationsPage.tsx', 'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx'],
  },
  {
    key: 'restaurant-split',
    topic: 'restaurant',
    question: 'Can a table pay in more than one way?',
    answer:
      'Yes. A bill can be paid by cash, card or wallet, split across more than one method, paid in part now and the rest later, or put fully on the customer\'s khata. Whatever is left unpaid shows as udhaar against that customer, so nothing is lost between shifts.',
    sourceNote: 'useOrderPayment (cash, card, wallet, split, part payment, full udhaar).',
    origin: `${IC}#restaurant.faqs[2] (rewritten)`,
    evidence: ['apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx'],
  },

  // ─── Mobile shop ───
  {
    key: 'mobile-imei',
    topic: 'mobile-shop',
    question: 'How does IMEI tracking work?',
    answer:
      'Every phone is kept by its IMEI. When you buy stock you enter the IMEIs, and when you sell, the IMEI goes on the bill, so you always know which handset is in stock, sold, or in for repair. Each IMEI can also carry its PTA status.',
    sourceNote: 'Mobile pack: IMEI stock, PTA compliance per IMEI, repair tickets.',
    origin: `${IC}#mobile-shop.faqs[0]`,
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx'],
  },
  {
    key: 'mobile-used',
    topic: 'mobile-shop',
    question: 'Can I buy used phones and take trade-ins?',
    answer:
      'Yes. The used phones screen records phones you buy from customers and phones taken in part-exchange against a new sale, so they join your stock with their IMEI and cost. When you resell them, they are sold at the counter like any other phone, with the IMEI on the bill.',
    sourceNote: 'Mobile pack: used phones (used-phones route) and trade-in.',
    origin: `${IC}#mobile-shop.faqs[2] (rewritten; checklist claims dropped)`,
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx'],
  },

  // ─── Garments ───
  {
    key: 'garments-variants',
    topic: 'garments',
    question: 'How are sizes and colours handled?',
    answer:
      'Each size and colour of a product is its own stock line, so you see exactly which sizes and colours are in stock and which are selling. Size charts and collections help you group stock, and exchanges at the counter put the returned size back into stock.',
    sourceNote: 'Garments pack: size × colour variants, size charts, collections, exchange.',
    origin: `${IC}#garments.faqs[0]`,
    evidence: ['apps/web/src/industries/garments/GarmentsPack.tsx'],
  },
  {
    key: 'garments-measurements',
    topic: 'garments',
    question: 'Can I save customer measurements?',
    answer:
      "Yes. Each customer can have one or more measurement records, for example their own kameez and a child's frock, with the unit, the numbers grouped the way a tailor takes them, and fitting notes. A new stitching order opens those measurements, so a regular customer is not measured every time.",
    sourceNote: 'Garments pack: measurements (naap) and MeasurementModal; tailoring orders.',
    origin: `${IC}#garments.faqs[1]`,
    evidence: ['apps/web/src/industries/garments/components/MeasurementModal.tsx'],
  },
  {
    key: 'garments-layaway',
    topic: 'garments',
    question: 'Can a customer reserve an expensive item and pay over time?',
    answer:
      'Yes. You can put an item on hold for a customer, or sell it on a qist plan where the customer pays in parts and takes it when it is paid. Both keep the item out of normal stock, so it is not sold to someone else.',
    sourceNote: 'Garments pack: Hold (reservations) and Qist plan (layaway).',
    origin: `${IC}#garments.faqs[2] (rewritten; automatic reminders dropped)`,
    evidence: ['apps/web/src/industries/garments/GarmentsPack.tsx'],
  },

  // ─── Salon ───
  {
    key: 'salon-commission',
    topic: 'salon',
    question: 'Can I track stylist commission?',
    answer:
      "Yes. You set each stylist's commission, and every service billed at the salon counter is credited to the stylist who did it. The commission adds up on its own, and the payout screen shows what each stylist is owed, so nobody works it out by hand at month end.",
    sourceNote: 'Salon pack: "Stylist aur commission" (staff) and salon counter BillPanel.',
    origin: `${IC}#salon.faqs[1]`,
    evidence: ['apps/web/src/industries/salon/SalonPack.tsx', 'apps/web/src/industries/salon/pos/BillPanel.tsx', 'apps/web/src/industries/salon/pages/CommissionPayoutPage.tsx'],
  },
  {
    key: 'salon-membership',
    topic: 'salon',
    question: 'Can I sell memberships and packages?',
    answer:
      'Yes. Salons can sell memberships, prepaid packages and gift vouchers. They are recorded against the customer and used at the salon counter, so the person at the counter can see what a regular customer has bought before billing the visit.',
    sourceNote: 'Salon pack: memberships, packages, gift vouchers, customers.',
    origin: `${IC}#salon.faqs[2] (rewritten; automatic tiers dropped)`,
    evidence: ['apps/web/src/industries/salon/SalonPack.tsx'],
  },
];
