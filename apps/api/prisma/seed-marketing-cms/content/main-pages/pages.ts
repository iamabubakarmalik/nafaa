/**
 * PAGE entries owned by the main templates: /pricing (template "pricing")
 * and /marketplace (template "default", the Nafaa Bazaar page).
 * Prices only come from the Plan table: the pricing block, the plan matrix
 * and {{price:...}} tokens. Plan contents are not final (owner), so the page
 * shows each plan's limits and makes no per-plan feature claims.
 */

import type { SeedEntry } from '../../lib/types';
import { features, page, pricing, prose, steps, table } from './_build';

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
  body: [
    pricing('Choose your plan', false),
    features('Every Nafaa account comes with', [
      ['scan-barcode', 'The counter', 'Fast billing with barcodes, units and receipts, on any device.'],
      ['wifi-off', 'Offline billing', 'Sales keep going without internet and sync later.'],
      ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, switched on only if your business needs it.'],
      ['languages', 'English and Roman Urdu', 'Screens and receipts in the language your team reads.'],
      ['message-circle', 'Help on WhatsApp', 'Questions answered by people who know the app.'],
      ['lock', 'Your data, backed up', 'Data in the cloud, plus backups you can export.'],
    ], 'What is inside each plan is listed above; these come with every account.'),
    steps('How billing works', [
      ['Start free', 'Seven days on the plan of your choice, without a card.'],
      ['Pick a plan', 'Choose monthly, quarterly or yearly payment in rupees.'],
      ['Grow', 'Move to a bigger plan when you add products, people or shops.'],
      ['Need more?', 'Large or custom setups: talk to our team for a quote.'],
    ]),
    table('What else might cost money', 'Nafaa runs on the devices you already have. These are optional and bought from any shop you like.', [
      { key: 'need', label: 'Needed?', highlight: true },
      { key: 'note', label: 'Notes' },
    ], [
      ['Barcode scanner', 'Optional', 'Search and quick keys work without one.'],
      ['Receipt printer (58 or 80 mm)', 'Optional', 'Receipts can go on WhatsApp instead.'],
      ['Cash drawer', 'Optional', 'Opened by the Windows desktop app.'],
      ['Setup, migration and training', 'Optional', 'Services from our team, quoted separately.'],
    ]),
    prose(`## Questions about plans?

Plan prices and limits on this page come straight from the same plan settings the app uses, so they are always current. If you run many branches, need custom modules or want help moving from another system, [book a demo](/demo) or message us on WhatsApp and we will suggest the right setup.`),
  ],
  faqKeys: ['pricing', 'mp-pricing-trial', 'mp-pricing-periods', 'devices', 'offline'],
  cta: { heading: 'Start your 7 din Free Trial today', body: 'Every feature of your chosen plan, on the device you already have. No card needed.' },
  relations: [
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'SERVICE:hardware', kind: 'RELATED' },
  ],
  evidence: ['apps/api/src/modules/billing/plans/plans.service.ts', 'apps/api/src/modules/billing/subscriptions/guards/subscription.guard.ts', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/api/src/integrations/fbr'],
  needsOwner: ['Plan contents are not final: the page shows limits from the Plan table only. "Your data, backed up" and "Help on WhatsApp" are general; confirm wording.'],
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
      ['truck', 'Delivery', 'Manage delivery and follow riders on the way.'],
      ['chart-line', 'Analytics', 'Views, orders and sales from the marketplace.'],
    ]),
    steps('Start selling in four steps', [
      ['Use Nafaa for your shop', 'Start the free trial and add your products.'],
      ['Set up your shop profile', 'Name, photos, area and opening hours.'],
      ['Choose what to list', 'Pick products to show on Nafaa Bazaar.'],
      ['Take orders', 'Accept, pack and deliver; stock updates by itself.'],
    ]),
    prose(`## One stock for the counter, your website and the marketplace

Nafaa Bazaar is not a separate seller account to keep up to date. It reads the same products, prices and stock as your counter and your own online store, so a piece sold in the shop is gone from the marketplace too. Marketplace orders sit in the same list as website, Shopify and WooCommerce orders, and the money shows in the same reports.`),
  ],
  faqKeys: ['mp-bazaar-what', 'mp-ecommerce-stock', 'sell-online', 'pricing'],
  cta: { heading: 'Open your shop to more buyers', body: 'Start with Nafaa, then list on Nafaa Bazaar when you are ready.' },
  relations: [
    { ref: 'SOLUTION:ecommerce', kind: 'RELATED' },
    { ref: 'PRODUCT:online-store', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory', kind: 'RELATED' },
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
  ],
  needsOwner: [
    'No marketplace screenshot yet: the seller screen shows prices as "Rs Rs" and the dashboard shows a "12,000+ Nafaa Bazaar customers" figure that looks made up (apps/web bugs). Capture after those are fixed.',
    'Buyer reach and how buyers find Nafaa Bazaar (app or website URL) are not stated until the owner confirms them.',
  ],
});

export const mainPages: SeedEntry[] = [pricingPage, marketplace];
