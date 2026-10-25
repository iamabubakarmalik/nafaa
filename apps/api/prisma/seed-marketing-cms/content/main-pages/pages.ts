/**
 * PAGE entries owned by the main templates: /pricing (template "pricing")
 * and /marketplace (template "default", the Nafaa Bazaar page).
 * Prices and plan contents only come from the Plan table: the pricing block,
 * the plan matrix the pricing template draws under it, and {{price:...}}
 * tokens. Plan contents are not final (owner), so the copy here explains
 * the limits and how billing works, and never says what a given plan has.
 */

import type { SeedEntry } from '../../lib/types';
import { SHOT, callout, features, page, pricing, prose, shot, steps, table } from './_build';

const pricingPage = page({
  type: 'PAGE',
  slug: 'pricing',
  title: 'Pricing',
  summary:
    'Nafaa pricing in Pakistani rupees: start with the 7-day free trial, then choose a plan by the number of products, users, shops and monthly sales you need. Paid plans start at {{price:min.monthly}} a month, quarterly and yearly payment cost less, and no card is needed to start.',
  data: { template: 'pricing' },
  seoTitle: 'POS Software Price in Pakistan: Nafaa Plans and Free Trial',
  seoDescription:
    'Nafaa plans in PKR: 7-day free trial, then pay monthly, quarterly or yearly. Limits for products, users, shops and sales on every plan. No card to start.',
  focusKeyword: 'pos software price in pakistan',
  hero: {
    eyebrow: 'Pricing',
    heading: 'Simple plans that grow with your business',
    sub: 'Start with the 7-day free trial on any device. When you are ready, pick the plan that fits how many products, people and shops you run. Prices are in rupees and come straight from our plan settings.',
    primary: { label: 'Start 7 din Free Trial', href: 'signup', trackAs: 'hero_signup' },
    secondary: { label: 'Talk to sales', href: 'demo', trackAs: 'hero_demo' },
    badges: ['7 din Free Trial', 'No card needed', 'Pay monthly, quarterly or yearly'],
  },
  answer: {
    heading: 'Pricing in short',
    facts: [
      ['Start', '7-day free trial, no card needed'],
      ['Paid plans', 'From {{price:min.monthly}} a month'],
      ['Pay', 'Monthly, quarterly or yearly, in rupees'],
      ['Plans differ by', 'Products, users, shops, sales per month and the features listed in the table'],
    ],
    romanUrdu: 'Pehle 7 din free, card ke baghair. Phir apni dukaan ke hisaab se plan chunein: kitne products, kitne log, kitni dukaanein aur mahine ki kitni sale. Qeemat rupay me, mahana, teen mahine ya saal ki.',
  },
  body: [
    pricing('Choose your plan', false),
    table('What the plan limits mean', 'Every plan in the table above has these four limits. The numbers come from the same plan settings the app uses.', [
      { key: 'counts', label: 'What counts', highlight: true },
      { key: 'tip', label: 'How to choose' },
    ], [
      ['Products', 'Each product in your list; its units and variants belong to it', 'Count the items you sell today and leave room for new ones'],
      ['Users', 'Each person with their own login', 'Count everyone who bills, manages stock or reads reports'],
      ['Shops', 'Each branch, shop or godown on the account', 'One for a single shop; more when you add branches'],
      ['Sales per month', 'Bills made in your business month', 'Look at your busiest month, not an average one'],
    ]),
    features('The same on every plan', [
      ['smartphone', 'Any device', 'Phone, tablet or computer, with nothing to install to start.'],
      ['wifi-off', 'Offline billing', 'Sales keep going without internet and sync later.'],
      ['languages', 'English and Roman Urdu', 'Screens and receipts in the language your team reads.'],
      ['message-circle', 'Help on WhatsApp', 'Questions answered by people who know the app.'],
      ['lock', 'Your data stays yours', 'If a plan lapses, your records are kept until you pick a plan again.'],
      ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, switched on only if your business needs it.'],
    ], 'Which plan includes branches, transfers, loyalty, exports and the other features is shown in the table above.'),
    steps('How billing works', [
      ['Start free', 'Seven days on the plan of your choice, without a card.'],
      ['Pick a plan', 'Choose monthly, quarterly or yearly payment in rupees.'],
      ['Pay the bill', 'Pay from the billing page by bank transfer, JazzCash or Easypaisa.'],
      ['Grow', 'Watch your usage against each limit and move to a bigger plan when you need to.'],
    ]),
    shot({ heading: 'Know your numbers before you choose', body: 'The dashboard shows today\'s sale, bills and profit. A few days into the trial, these numbers and the usage on the billing page show how busy the business really is, which is a far better guide to the right plan than a guess.', id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard', layout: 'split-right' }),
    table('What else might cost money', 'Nafaa runs on the devices you already have. These are optional and bought from any shop you like.', [
      { key: 'need', label: 'Needed?', highlight: true },
      { key: 'note', label: 'Notes' },
    ], [
      ['Barcode scanner', 'Optional', 'Search and quick keys work without one.'],
      ['Receipt printer (58 or 80 mm)', 'Optional', 'Receipts can go on WhatsApp instead.'],
      ['Cash drawer', 'Optional', 'Opened by the receipt printer or the Windows desktop app.'],
      ['Setup, migration and training', 'Optional', 'Services from our team, quoted separately.'],
    ]),
    prose(`## Choosing the right plan

Start from what you run today, not from features you might want one day. A single counter with a few hundred products needs a different plan from a chain of branches with a large team. During the free trial, add your real products and bill for a few days; the billing page then shows your usage against each limit, so the choice is based on your own numbers.

If you are between two plans, pick the one that fits your busiest month. You can move to a bigger plan whenever you add products, people or shops, and nothing in your account has to be set up again.

Running many branches, need custom modules or want help moving from another system? [Book a demo](/demo) or message us on WhatsApp and we will suggest the right setup. Our [services](/services) cover [data migration](/services/data-migration), [hardware](/services/hardware) and [training](/services/training).`),
    callout('info', 'Prices on this page are read live from our plan settings, the same ones the app bills from, so they are always current. They are in Pakistani rupees.', 'Always current'),
  ],
  faqKeys: ['pricing', 'mp-pricing-trial', 'mp-pricing-periods', 'hub-pricing-pay', 'hub-pricing-usage', 'devices', 'offline'],
  cta: { heading: 'Start your 7 din Free Trial today', body: 'Every feature of your chosen plan, on the device you already have. No card needed.' },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'SERVICE:hardware', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'SOLUTION:single-shop', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains', kind: 'RELATED' },
  ],
  evidence: [
    'apps/api/src/modules/billing/plans/plans.service.ts',
    'apps/api/src/modules/billing/subscriptions/guards/subscription.guard.ts',
    'apps/api/src/modules/feature-gating/feature-gating.service.ts',
    'apps/web/src/modules/billing/billing/pages/BillingPage.tsx',
    'apps/web/src/modules/billing/billing/pages/PayInvoicePage.tsx',
    'apps/web/src/modules/billing/billing/components/UsageMeters.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/hardware/escpos.ts',
    'apps/api/src/integrations/fbr',
  ],
  needsOwner: ['Plan contents are not final: the page shows limits and features only through the Plan table. "Help on WhatsApp" is general; confirm wording.'],
});

const marketplace = page({
  type: 'PAGE',
  slug: 'marketplace',
  title: 'Nafaa Bazaar',
  summary:
    'Nafaa Bazaar is the Nafaa marketplace. Shops that use Nafaa list products from their own stock, buyers browse and order, and every order arrives in the same app as counter sales and online orders, with your shop profile, reviews, promotions, buyer messages and delivery in one place.',
  data: { template: 'default' },
  seoTitle: 'Nafaa Bazaar: Sell on the Nafaa Marketplace in Pakistan',
  seoDescription:
    'List products from your Nafaa stock on Nafaa Bazaar, get orders in the same app, and manage reviews, promotions and delivery. For shops using Nafaa.',
  focusKeyword: 'online marketplace pakistan sellers',
  hero: {
    eyebrow: 'Nafaa Bazaar marketplace',
    heading: 'Your shop, open to buyers far beyond your street',
    sub: 'List products from the stock you already keep in Nafaa. Buyers find your shop on Nafaa Bazaar, orders arrive next to your counter sales, and price and stock stay in sync by themselves.',
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'stock', label: 'Your Nafaa stock', icon: 'boxes' },
        { id: 'list', label: 'Listed on Bazaar', icon: 'store' },
        { id: 'buyer', label: 'Buyer orders', icon: 'shopping-cart' },
        { id: 'order', label: 'Order in Nafaa', icon: 'bell-ring' },
        { id: 'deliver', label: 'Delivered', icon: 'truck' },
      ],
      edges: [
        { from: 'stock', to: 'list' },
        { from: 'list', to: 'buyer' },
        { from: 'buyer', to: 'order' },
        { from: 'order', to: 'deliver' },
      ],
    },
    layout: 'split',
    primary: { label: 'Start selling', href: 'signup', trackAs: 'hero_signup' },
    badges: ['Listed from your stock', 'Orders in the same app'],
  },
  answer: {
    heading: 'Nafaa Bazaar in short',
    facts: [
      ['What it is', 'The Nafaa marketplace for shops that use Nafaa'],
      ['Listing', 'Choose products from your Nafaa stock; price and stock stay in sync'],
      ['Orders', 'Arrive in the Nafaa app with counter sales and online orders'],
      ['Manage', 'Shop profile, reviews, promotions, buyer messages and delivery'],
    ],
    romanUrdu: 'Nafaa Bazaar Nafaa ka marketplace hai. Apne stock se products list karein, khareedar order karein, aur order usi app me aaye jahan counter ki bikri hoti hai.',
  },
  body: [
    features('Everything a seller needs on the marketplace', [
      ['boxes', 'List from your stock', 'Pick products from Nafaa; price and stock follow your counter.'],
      ['store', 'Shop profile', 'Your shop\'s name, photos, hours and details for buyers.'],
      ['bell-ring', 'Orders in one place', 'Marketplace orders arrive with your other sales channels.'],
      ['star', 'Reviews', 'See and answer what buyers say about your shop.'],
      ['badge-percent', 'Promotions and coupons', 'Run offers for marketplace buyers.'],
      ['message-square', 'Buyer messages', 'Answer buyer questions from the Nafaa app.'],
      ['truck', 'Delivery', 'Your own riders, with their status and the orders they carry.'],
      ['chart-line', 'Analytics', 'Views, orders and sales from the marketplace.'],
    ]),
    steps('Start selling in four steps', [
      ['Use Nafaa for your shop', 'Start the free trial and add your products.'],
      ['Set up your shop profile', 'Name, photos, area and opening hours.'],
      ['Choose what to list', 'Pick products to show on Nafaa Bazaar.'],
      ['Take orders', 'Accept, pack and deliver; stock updates by itself.'],
    ]),
    table('Your own online store and Nafaa Bazaar', 'Both run from the same Nafaa stock and land in the same order list. Most sellers use both: the store for buyers who already know them, the marketplace to be found by new ones.', [
      { key: 'own', label: 'Your own store' },
      { key: 'bazaar', label: 'Nafaa Bazaar', highlight: true },
    ], [
      ['Who finds you', 'People you bring: followers, customers, search', 'Buyers browsing the marketplace'],
      ['Setup', 'Connect a website, Shopify or WooCommerce, or share the Nafaa order link', 'Fill in the shop profile and choose products'],
      ['Stock and price', 'From Nafaa', 'From Nafaa'],
      ['Orders', 'In Nafaa online orders', 'In Nafaa, next to every other channel'],
      ['Delivery', 'Courier booking from the order, or your own riders', 'Your own riders'],
    ]),
    shot({ heading: 'One order list for every channel', body: 'Marketplace orders sit with website and other online orders, each with its status and buyer, so one person can handle them all between counter sales.', id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders', layout: 'split-right' }),
    prose(`## One stock for the counter, your website and the marketplace

Nafaa Bazaar is not a separate seller account to keep up to date. It reads the same products, prices and stock as your counter and your own online store, so a piece sold in the shop is gone from the marketplace too. Marketplace orders sit in the same list as website, Shopify and WooCommerce orders, and the money shows in the same reports.

## Who it suits

Nafaa Bazaar suits shops with stock that travels well and buyers outside walking distance: [garments](/industries/garments), [cosmetics](/industries/cosmetics), [electronics](/industries/electronics), [books](/industries/bookstore) and similar trades. If you already sell online, the [e-commerce solution](/solutions/ecommerce) shows how the marketplace fits next to your website, couriers and COD.`),
  ],
  faqKeys: ['mp-bazaar-what', 'hub-bazaar-delivery', 'hub-bazaar-who', 'mp-ecommerce-stock', 'sell-online'],
  cta: { heading: 'Open your shop to more buyers', body: 'Start with Nafaa, then list on Nafaa Bazaar when you are ready.' },
  relations: [
    { ref: 'SOLUTION:ecommerce', kind: 'RELATED' },
    { ref: 'PRODUCT:online-store', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'SERVICE:online-store-setup', kind: 'RELATED' },
  ],
  evidence: [
    'apps/marketplace/package.json',
    'apps/api/src/marketplace/publishing',
    'apps/api/src/marketplace/orders',
    'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx',
    'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx',
    'apps/web/src/marketplace/reviews/MarketplaceReviewsPage.tsx',
    'apps/web/src/marketplace/promotions/MarketplacePromotionsPage.tsx',
    'apps/web/src/marketplace/messages/MarketplaceMessagesPage.tsx',
    'apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx',
    'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx',
    'apps/web/src/marketplace/analytics/MarketplaceAnalyticsPage.tsx',
    'apps/web/src/integrations/online-orders/public/PublicOrderPage.tsx',
  ],
  needsOwner: [
    'No marketplace screenshot yet: the seller screen shows prices as "Rs Rs" and the dashboard shows a "12,000+ Nafaa Bazaar customers" figure that looks made up (apps/web bugs). Capture after those are fixed.',
    'Buyer reach and how buyers find Nafaa Bazaar (app or website URL) are not stated until the owner confirms them.',
  ],
});

export const mainPages: SeedEntry[] = [pricingPage, marketplace];
