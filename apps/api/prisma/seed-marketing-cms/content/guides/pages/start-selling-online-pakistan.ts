/**
 * Pillar guide: starting to sell online in Pakistan for an existing shop.
 * Channels, products and photos, pricing with delivery and COD, payments,
 * couriers, returned parcels, stock sync, customer service and growth.
 * Links to the selling-online post, online store product, e-commerce
 * solution and glossary terms. No market statistics.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { note, tip, type GuideSpec } from '../_guide';

const spec: GuideSpec = {
  slug: 'start-selling-online-pakistan',
  title: 'Starting to Sell Online in Pakistan: A Guide for Shops',
  summary:
    'A step-by-step guide for Pakistani shops that want to start selling online: choosing between WhatsApp, your own website and marketplaces, preparing products and photos, pricing with delivery and cash on delivery in mind, taking payments, working with couriers, cutting returned parcels and keeping shop and online stock in step.',
  seoTitle: 'How to Start Selling Online in Pakistan: Guide for Shops',
  seoDescription:
    'A step-by-step guide to selling online from a Pakistani shop: channels, products and photos, pricing for COD and delivery, couriers, returns and shared stock.',
  focusKeyword: 'start selling online in pakistan',
  outline: ['Is it for you', 'Channels', 'Products and photos', 'Pricing', 'Payments', 'Couriers', 'Returned parcels', 'Stock', 'Customer service', 'Numbers', 'First 30 days'],
  blocks: [
    prose(`Selling online is no longer only for brands with a warehouse. A clothing shop in Faisalabad, a cosmetics store in Karachi or a hardware dealer in Gujranwala can take orders from across Pakistan with a phone, a courier account and a few good photos. Many already do it informally on WhatsApp.

Doing it well is a different matter. Online orders bring new costs (delivery, packaging, returned parcels), new risks (cash on delivery that never arrives) and a new problem: the same item being sold in the shop and online at the same time. This guide takes an existing shop through the decisions in order. For a shorter overview, read [selling online in Pakistan](/blog/selling-online-pakistan).`),
    prose(`## 1. Is online right for your shop?

Online works best for products that are easy to describe and photograph, travel well and are not available on every street corner: clothing, shoes, cosmetics, mobile accessories, books, toys, home goods, specialty food. It works less well for low-value, heavy or perishable goods where delivery costs more than the margin.

Ask three questions before you start:

- **Does the margin cover delivery?** If an item earns you less than the delivery charge, you need a minimum order value or bundles.
- **Can someone pack and ship every day?** Orders that wait three days get cancelled.
- **Can you keep stock accurate?** Selling something online that has already gone from the shop shelf is the fastest way to lose an online customer.`),
    prose(`## 2. Choose your channels

You do not need every channel on day one. Start with one or two and add more once orders are steady.`),
    prose(`## Online sales channels for a Pakistani shop

General comparison; check each marketplace's current seller terms and fees before you join.

| Channel | Good for | Watch out for |
|---|---|---|
| WhatsApp and social media | Existing customers, quick start, no fees | Orders scattered across chats; hard to track |
| Your own website | Your brand, your prices, your customer list | You must bring the visitors yourself |
| Marketplaces such as Daraz | Ready buyers and trust | Commission, price competition, marketplace rules |
| Food delivery apps such as Foodpanda | Restaurants, bakeries and cafés | Commission and delivery times |
| Shopify or WooCommerce store | Shops that want a full online store | Setup and monthly costs |`),
    prose(`A common path is to start with WhatsApp orders from existing customers, add a simple website so customers can browse, and then list best-sellers on a marketplace. Whatever you choose, bring the orders into one place, so nothing is missed and stock stays right. Words used in this guide, such as [marketplace](/glossary/marketplace), [COD](/glossary/cod) and [payment gateway](/glossary/payment-gateway), are explained in our [glossary](/glossary).`),
    shot({
      heading: 'Every channel in one list',
      body: 'Website, Shopify, WooCommerce, Daraz and Foodpanda orders arrive next to each other, with the shop\'s own stock behind them.',
      id: SHOT.salesChannels,
      url: 'app.nafaa.pk/channels',
      layout: 'split-right',
    }),
    prose(`## 3. Products and photos

Online, the photo and the description do the selling that you do at the counter.

- **Clear photos on a plain background**, in daylight, from the front, back and side. A phone camera is enough.
- **Honest descriptions**: size, material, colour, weight and what is in the box. Most returns come from a product that did not match what the customer expected.
- **Sizes and variants** listed properly, with a size chart for clothing and shoes.
- **Start with your best sellers.** Twenty well-listed products sell more than two hundred poor ones.

## 4. Pricing for online

Online prices must cover costs the shop counter never sees:

- **Delivery.** Either the customer pays it, or it is built into the price. Free delivery above a minimum order value is a common middle path.
- **Packaging.** Boxes, flyers, tape, and your time.
- **Payment and COD costs.** Couriers usually charge for collecting cash; payment links and gateways may charge a fee.
- **Returned parcels.** You pay delivery both ways on a parcel the customer refused. See [RTO](/glossary/rto).
- **Marketplace commission**, if you sell there.

**Example with round numbers.** An item that sells for 2,000 rupees and costs you 1,400 leaves 600. If delivery, packing and COD charges come to 300, half the margin is gone before a single return. Price online sales on what is left, not on the shop margin.`),
    prose(`## 5. Payments

Cash on delivery is still the way most Pakistani online shoppers pay. It builds trust but carries risk: refused parcels, delays in getting the cash from the courier, and fake orders.

- **Offer prepayment and make it easy.** JazzCash and Easypaisa payment links, bank transfer and [Raast](/glossary/raast) let customers pay before dispatch. Some shops give a small discount for prepaid orders.
- **Reconcile COD every week.** Match each delivered COD parcel with the payment the courier sent you. [COD reconciliation](/glossary/cod-reconciliation) is where money quietly goes missing.
- **Ask for partial advance on high-value or custom items.** A delivery charge in advance filters out non-serious orders.`),
    diagram(
      'From the order to the doorstep: orders from every channel come into one list, are packed from the shop\'s own stock, handed to a courier, delivered and paid.',
      {
        kind: 'flow',
        nodes: [
          { id: 'order', label: 'Order', icon: 'shopping-bag', note: 'WhatsApp, website, marketplace' },
          { id: 'confirm', label: 'Confirm', icon: 'phone', note: 'Call or message the buyer' },
          { id: 'pack', label: 'Pack from stock', icon: 'package-check', note: 'Same stock as the shop' },
          { id: 'courier', label: 'Book courier', icon: 'truck', note: 'Label and tracking' },
          { id: 'paid', label: 'Delivered and paid', icon: 'circle-check', note: 'COD settled or prepaid' },
        ],
        edges: [
          { from: 'order', to: 'confirm' },
          { from: 'confirm', to: 'pack' },
          { from: 'pack', to: 'courier' },
          { from: 'courier', to: 'paid' },
        ],
        animate: true,
      },
      'How an online order moves',
    ),
    prose(`## 6. Couriers

Pakistan has several national couriers, including TCS, Leopards, M&P, PostEx, Trax and CallCourier. Compare them on what matters for you:

- **Coverage** of the cities and towns your customers are in.
- **Delivery time** and how they handle failed delivery attempts.
- **COD remittance**: how often they pay you the collected cash, and the charges.
- **Pickup** from your shop, and the cut-off time for same-day dispatch.
- **Tracking** that you can share with customers.

Many shops use two couriers: one main, one backup for areas the first does not cover well.

## 7. Cutting returned parcels

Refused and undelivered parcels are the biggest hidden cost of COD selling. Most of them can be prevented:

- **Confirm every COD order** by call or WhatsApp before dispatch, especially from new customers.
- **Check the buyer's history.** A customer who refused two parcels before will probably refuse the third. Keep a list, and block repeat offenders.
- **Ship fast.** The longer the wait, the more likely the customer has bought elsewhere.
- **Describe products accurately**, so what arrives matches what was ordered.
- **Ask for advance payment** on orders that look risky: very large, far away, or from a buyer with returns.`),
    steps(
      'Handling a COD order safely',
      [
        ['Check the buyer', 'Past orders, deliveries and returns before anything else.'],
        ['Confirm by message or call', 'Product, size, price, delivery charge and address.'],
        ['Pack and book the same day', 'Print the label and share tracking with the customer.'],
        ['Follow failed attempts', 'Call the customer if the courier reports a failed delivery.'],
        ['Reconcile the cash', 'Match the courier\'s payment with each delivered parcel.'],
      ],
      undefined,
      true,
    ),
    prose(`## 8. Keep shop and online stock in step

The worst online experience is an order for something that is no longer there. If the shop counter and the online store keep separate stock, this will happen every week.

The fix is one stock for everything: when an item sells at the counter, the website and marketplace listings update; when it sells online, the shop's stock drops. With a few products you can manage this by hand; with more, you need a system that does it for you. Our [inventory management guide](/guides/inventory-management-small-business) covers the counting side.`),
    diagram(
      'Orders from the website, Shopify and the marketplace come into the shop\'s system; stock changes flow back out to each channel.',
      { kind: 'store-sync', animate: true },
      'One stock for the shop and every channel',
    ),
    prose(`## 9. Customer service on WhatsApp

Online customers ask questions before they buy and want updates after. WhatsApp is where most of this happens in Pakistan.

- Reply quickly, even if only to say you will check.
- Send order confirmation, dispatch and tracking messages.
- Keep a polite, standard reply for common questions: delivery time, exchange policy, sizes.
- After delivery, a thank-you message and a reason to come back. See [WhatsApp messages for shops](/blog/whatsapp-customer-retention).

## 10. Numbers to watch

Track these every week from the start:

- Orders and sales by channel.
- Delivery success rate: delivered parcels out of dispatched parcels.
- Returned parcels and their cost.
- COD cash still with couriers.
- Profit per order after delivery, packaging and returns.

If a channel brings sales but loses money after returns and commission, change the prices or drop it.

## 11. Your first 30 days

1. **Week 1:** pick 20 best-selling products, photograph and describe them, and decide delivery charges.
2. **Week 2:** open your first channel (WhatsApp catalogue or a simple website) and a courier account.
3. **Week 3:** take orders, confirm every COD order, and ship the same day.
4. **Week 4:** reconcile COD, count returns, and decide whether to add a second channel.

If you would rather have the store built for you, see our [e-commerce store development](/services/online-store-setup) service.`),
    shot({
      heading: 'Online orders next to the counter',
      body: 'A new website order pops up on the POS, so the shop can confirm and pack it from the same stock.',
      id: SHOT.posOnlineAlert,
      url: 'app.nafaa.pk/pos',
      layout: 'split-left',
    }),
    tip('Start with customers who already know your shop. A WhatsApp message to regulars announcing home delivery often brings the first orders before any advertising.', 'Your first customers are already yours'),
    note('Nafaa connects your own website, Shopify, WooCommerce, Daraz, Foodpanda and Nafaa Bazaar to the shop\'s stock, books TCS, Leopards, M&P, PostEx, Trax and CallCourier, sends JazzCash and Easypaisa payment links, and shows each buyer\'s past deliveries and returns before you ship. See [Online Store](/product/online-store) and [E-commerce sellers](/solutions/ecommerce).'),
  ],
  faqs: [
    [
      'Do I need my own website to sell online?',
      'No. Many shops start with WhatsApp and social media, or a marketplace. A website becomes useful when you want your own brand, your own prices and a customer list that does not depend on a marketplace. You can add one later without changing how you run the shop.',
    ],
    [
      'How do I reduce cash on delivery returns?',
      'Confirm every COD order before dispatch, check whether the buyer has refused parcels before, ship the same day, describe products accurately, and ask for advance payment on risky orders. Track returned parcels each week so you can see which products, cities or customers cause them.',
    ],
    [
      'Can I use the same stock for my shop and online orders?',
      'Yes, and you should. Keeping one stock means an item sold at the counter cannot also be sold online. In Nafaa, online orders reduce the shop\'s stock and counter sales update the connected channels, so both always show what is really on the shelf.',
    ],
  ],
  terms: ['cod', 'cod-reconciliation', 'rto', 'marketplace', 'payment-gateway', 'raast', 'jazzcash', 'easypaisa', 'dropshipping', 'gmv'],
  related: [
    'BLOG_POST:selling-online-pakistan',
    'BLOG_POST:whatsapp-customer-retention',
    'PRODUCT:online-store',
    'SOLUTION:ecommerce',
    'SERVICE:online-store-setup',
    'PRODUCT:payments',
    'INDUSTRY:garments',
    'INDUSTRY:cosmetics',
  ],
  evidence: [
    'apps/api/src/integrations/online-orders/shopify.service.ts',
    'apps/api/src/integrations/online-orders/woocommerce.service.ts',
    'apps/api/src/integrations/online-orders/daraz.service.ts',
    'apps/api/src/integrations/online-orders/foodpanda.service.ts',
    'apps/api/src/integrations/online-orders/courier-api/registry.ts',
    'apps/api/src/integrations/online-orders/customer-risk.ts',
    'apps/api/src/integrations/online-orders/payment-links.service.ts',
    'apps/api/src/integrations/online-orders/stock-push.service.ts',
    'apps/web/src/integrations/online-orders/pages/CodPage.tsx',
    'apps/web/src/integrations/online-orders/pages/BlocklistPage.tsx',
    'apps/web/src/integrations/online-orders/components/OnlineOrderAlert.tsx',
  ],
  factNote:
    'General e-commerce practice for Pakistan; no market statistics. Courier names are the couriers Nafaa integrates (courier-api/registry.ts). Pricing example uses round illustrative figures. Nafaa features checked in the evidence files on 2026-10-26.',
};

export default spec;
