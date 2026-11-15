/**
 * PAGE entries owned by the main templates: /pricing (template "pricing")
 * and /marketplace (template "default", the Nafaa Market page).
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
    'Nafaa pricing in Pakistani rupees: start with the 7-day free trial with everything switched on, then stay on the Free plan for a very small shop or choose a paid plan from {{price:min.monthly}} a month. Add-ons such as your own online store, sales channels, distribution and Nafaa AI Plus are switched on only when you need them. No card is needed to start.',
  data: { template: 'pricing' },
  seoTitle: 'POS Software Price in Pakistan: Nafaa Plans and Free Trial',
  seoDescription:
    'Nafaa plans in PKR: 7-day free trial, a Free plan for small shops, paid plans monthly, quarterly or yearly, and add-ons you switch on only when needed.',
  focusKeyword: 'pos software price in pakistan',
  hero: {
    eyebrow: 'Pricing',
    heading: 'Simple plans that grow with your business',
    sub: 'Start with the 7-day free trial on any device, with everything switched on. Then pick the plan that fits how many products, people and shops you run, and add only the extras your business uses. Prices are in rupees and come straight from our plan settings.',
    primary: { label: 'Start 7 din Free Trial', href: 'signup', trackAs: 'hero_signup' },
    secondary: { label: 'Talk to sales', href: 'demo', trackAs: 'hero_demo' },
    badges: ['7 din Free Trial', 'Free plan for small shops', 'Add-ons only when you need them'],
  },
  answer: {
    heading: 'Pricing in short',
    facts: [
      ['Start', '7-day free trial with everything on, no card needed'],
      ['Free plan', 'For a very small shop: one shop, one user and small limits'],
      ['Paid plans', 'From {{price:min.monthly}} a month; monthly, quarterly or yearly in rupees'],
      ['Add-ons', 'Online store, channels, couriers, distribution, extra shops and users, Nafaa AI Plus, setup help'],
      ['Plans differ by', 'Products, users, shops, sales per month and the features listed in the table'],
    ],
    romanUrdu: 'Pehle 7 din free, sab kuch on, card ke baghair. Choti dukaan ke liye Free plan, warna apni dukaan ke hisaab se plan chunein. Online store, channels, distribution jaise add-ons sirf tab lein jab zaroorat ho. Qeemat rupay me, mahana, teen mahine ya saal ki.',
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
      ['languages', 'English, Urdu and Roman Urdu', 'Each person picks the language of their own screens.'],
      ['message-circle', 'Help on WhatsApp', 'Questions answered by people who know the app.'],
      ['lock', 'Your data stays yours', 'If a plan ends, the app pauses and your records are kept safe until you renew.'],
      ['receipt-text', 'Tax invoices', 'Optional FBR/PRA integration, switched on only if your business needs it.'],
    ], 'Which plan includes branches, transfers, loyalty, exports and the other features is shown in the table above.'),
    steps('How billing works', [
      ['Start free', 'Seven days with everything switched on, without a card.'],
      ['Pick a plan', 'Stay on Free, or choose a paid plan with monthly, quarterly or yearly payment in rupees.'],
      ['Add what you use', 'Switch on add-ons such as an online store, Shopify or Daraz, distribution or an extra shop from the billing page.'],
      ['Pay and grow', 'Pay by bank transfer, JazzCash or Easypaisa. Watch your usage against each limit and move up when you need to.'],
    ]),
    shot({ heading: 'Know your numbers before you choose', body: 'The dashboard shows today\'s sale, bills and profit. A few days into the trial, these numbers and the usage on the billing page show how busy the business really is, which is a far better guide to the right plan than a guess.', id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard', layout: 'split-right' }),
    table('What else might cost money', 'Nafaa runs on the devices you already have. These are optional and bought from any shop you like.', [
      { key: 'need', label: 'Needed?', highlight: true },
      { key: 'note', label: 'Notes' },
    ], [
      ['Barcode scanner', 'Optional', 'Search and quick keys work without one.'],
      ['Receipt printer (58 or 80 mm)', 'Optional', 'Receipts can go on WhatsApp instead.'],
      ['Cash drawer', 'Optional', 'Opened by the receipt printer or the Windows desktop app.'],
      ['Setup help', 'Optional', 'Assisted setup online, or Full activation with our team at your shop; both are one-time options listed with the add-ons.'],
      ['Data migration and custom work', 'Optional', 'Services from our team, quoted separately.'],
    ]),
    prose(`## Plans and add-ons

Every plan covers the core of the business: the counter, stock, khata, returns, barcodes, the cash register, reports and offline billing. Bigger plans add more people, shops and features such as profit reports, loyalty, transfers and staff tools, as the table above shows.

Some parts of Nafaa are add-ons, because only some businesses need them: your own [online store](/product/online-store) website and order desk, Shopify, WooCommerce and Daraz connections, courier booking, [distribution](/solutions/wholesale-distribution) (charged by the number of bookers), an extra shop or user beyond your plan, and Nafaa AI Plus for heavy use of [Nafaa AI](/product/ai-assistant). The add-ons list above shows each one with its current price. An add-on appears in your menu only once you switch it on, so the app stays simple.

## When a plan ends

Nafaa sends reminders before your plan ends and shows the exact end date and time on the billing page. If a plan ends without renewal, the app stops until you renew, and nothing is deleted: your products, customers, khata and bills are all kept, and bills made offline sync as soon as the plan is active again.`),
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
    'apps/web/src/modules/billing/pricing/components/MyPlanOverview.tsx',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/hardware/escpos.ts',
    'apps/api/src/integrations/fbr',
    'apps/api/src/modules/billing/entitlements/feature-catalog.ts',
    'apps/api/src/modules/billing/pricing/billing-lifecycle.service.ts',
    'apps/api/prisma/migrations/20261128100000_pricing_v2/migration.sql',
    'apps/web/src/modules/billing/pricing/components/PlanGate.tsx',
    'apps/site/src/templates/pricing/PricingV2.tsx',
  ],
  needsOwner: ['Plan contents are not final: the page shows limits and features only through the Plan table. "Help on WhatsApp" is general; confirm wording.'],
});

const marketplace = page({
  type: 'PAGE',
  slug: 'marketplace',
  title: 'Nafaa Market',
  summary:
    'Nafaa Market is the marketplace Nafaa is building for shops that use Nafaa, opening soon. Shops will list products from their own stock, buyers will browse and order, and every order will arrive in the same app as counter sales and online orders, with shop profile, reviews, promotions and delivery in one place.',
  data: { template: 'default' },
  seoTitle: 'Nafaa Market: The Nafaa Marketplace, Coming Soon',
  seoDescription:
    'Nafaa Market, the marketplace for shops on Nafaa, opens soon: list products from your Nafaa stock and get orders in the same app as your counter sales.',
  focusKeyword: 'online marketplace pakistan sellers',
  hero: {
    eyebrow: 'Coming soon: Nafaa Market',
    heading: 'Your shop, open to buyers far beyond your street',
    sub: 'Nafaa Market is the marketplace we are building for shops that run on Nafaa. You will list products from the stock you already keep in Nafaa, buyers will find your shop, and orders will arrive next to your counter sales. It is not open yet; start on Nafaa now and your shop will be ready on day one.',
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
    primary: { label: 'Start with Nafaa', href: 'signup', trackAs: 'hero_signup' },
    badges: ['Coming soon', 'Listed from your stock', 'Orders in the same app'],
  },
  answer: {
    heading: 'Nafaa Market in short',
    facts: [
      ['What it is', 'The Nafaa marketplace for shops that use Nafaa, opening soon'],
      ['Listing', 'Choose products from your Nafaa stock; price and stock stay in sync'],
      ['Orders', 'Arrive in the Nafaa app with counter sales and online orders'],
      ['Manage', 'Shop profile, reviews, promotions, buyer messages and delivery'],
    ],
    romanUrdu: 'Nafaa Market Nafaa ka marketplace hai jo jald khul raha hai. Apne stock se products list honge, khareedar order karenge, aur order usi app me aayega jahan counter ki Sale hoti hai.',
  },
  body: [
    callout('info', 'Nafaa Market is not open to buyers yet. The seller tools below are being finished, and we will announce the launch on the [changelog](/changelog). Today you can sell online with your own [Nafaa Stores website](/product/online-store), Shopify, WooCommerce and Daraz.', 'Coming soon'),
    features('What sellers will get on the marketplace', [
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
      ['Choose what to list', 'Pick products to show on Nafaa Market.'],
      ['Take orders', 'Accept, pack and deliver; stock updates by itself.'],
    ]),
    table('Your own online store and Nafaa Market', 'Both run from the same Nafaa stock and land in the same order list. Most sellers use both: the store for buyers who already know them, the marketplace to be found by new ones.', [
      { key: 'own', label: 'Your own store' },
      { key: 'bazaar', label: 'Nafaa Market', highlight: true },
    ], [
      ['Who finds you', 'People you bring: followers, customers, search', 'Buyers browsing the marketplace'],
      ['Setup', 'Connect a website, Shopify or WooCommerce, or share the Nafaa order link', 'Fill in the shop profile and choose products'],
      ['Stock and price', 'From Nafaa', 'From Nafaa'],
      ['Orders', 'In Nafaa online orders', 'In Nafaa, next to every other channel'],
      ['Delivery', 'Courier booking from the order, or your own riders', 'Your own riders'],
    ]),
    shot({ heading: 'One order list for every channel', body: 'Marketplace orders will sit with website and other online orders, each with its status and buyer, so one person can handle them all between counter sales.', id: SHOT.onlineOrders, url: 'app.nafaa.pk/online-orders', layout: 'split-right' }),
    prose(`## One stock for the counter, your website and the marketplace

Nafaa Market will not be a separate seller account to keep up to date. It reads the same products, prices and stock as your counter and your own online store, so a piece sold in the shop is gone from the marketplace too. Marketplace orders will sit in the same list as website, Shopify and WooCommerce orders, and the money will show in the same reports.

## Who it suits

Nafaa Market will suit shops with stock that travels well and buyers outside walking distance: [garments](/industries/garments), [cosmetics](/industries/cosmetics), [electronics](/industries/electronics), [books](/industries/bookstore) and similar trades. If you already sell online, the [e-commerce solution](/solutions/ecommerce) shows how the marketplace fits next to your website, couriers and COD.`),
  ],
  faqKeys: ['mp-bazaar-what', 'hub-bazaar-delivery', 'hub-bazaar-who', 'mp-ecommerce-stock', 'sell-online'],
  cta: { heading: 'Get your shop ready for Nafaa Market', body: 'Start on Nafaa now: your products and stock will be ready to list when the marketplace opens.' },
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
    'No marketplace screenshot yet: the seller screen shows prices as "Rs Rs" and the dashboard shows a "12,000+ Nafaa Market customers" figure that looks made up (apps/web bugs). Capture after those are fixed.',
    'Buyer reach and how buyers find Nafaa Market (app or website URL) are not stated until the owner confirms them.',
    'Marked coming soon on 15 Nov 2026: market.nafaa.pk is not live. Switch the copy to present tense at launch.',
  ],
});

export const mainPages: SeedEntry[] = [pricingPage, marketplace];
