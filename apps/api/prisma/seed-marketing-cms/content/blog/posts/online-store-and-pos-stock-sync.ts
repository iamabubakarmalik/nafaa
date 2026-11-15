/**
 * Buyer guide: why an online store and the shop POS must share one stock;
 * what goes wrong with separate systems and what to check.
 */
import { SHOT, diagram, prose, shot } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Omnichannel', 'https://en.wikipedia.org/wiki/Omnichannel', 'Wikipedia', '2026-11-15'), srcChecked('Stock management', 'https://en.wikipedia.org/wiki/Stock_management', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'online-store-and-pos-stock-sync',
  title: 'Online Store and POS in One: Why Stock Must Sync',
  summary:
    'If your shop and your online store keep separate stock, you will sell items you do not have, cancel orders and lose trust. One shared stock that updates from every sale fixes this. This guide explains what goes wrong with separate systems, what a connected setup must do and how to test it before you sell online.',
  category: 'business',
  cover: PHOTO.onlineStoreAndPosStockSync,
  tags: ['PRODUCT:online-store', 'GLOSSARY_TERM:e-commerce', 'GLOSSARY_TERM:cod'],
  related: [
    'BLOG_POST:selling-online-pakistan',
    'GUIDE:start-selling-online-pakistan',
    'PRODUCT:inventory',
    'PRODUCT:pos',
    'SOLUTION:ecommerce',
    'GLOSSARY_TERM:cod-reconciliation',
    'SERVICE:online-store-setup',
  ],
  isNew: true,
  seoTitle: 'Online Store and POS: Why Stock Must Sync',
  seoDescription:
    'Why a shop that sells online needs one shared stock with its POS: overselling, cancelled orders, COD and returns, and how to test a connected setup.',
  focusKeyword: 'online store and pos sync',
  sources: SOURCES,
  blocks: [
    prose(`The first week of selling online is exciting. The orders come in, the courier collects the parcels and the shop feels bigger. The second week is when owners find the problem: an order came in for an item that was sold at the counter an hour ago, the customer is waiting and nobody has any stock to send. The shop and the website were two separate worlds, each with its own idea of what is on the shelf.

This article is for shop owners who sell, or plan to sell, online and are choosing software. It explains why stock has to be one number, what goes wrong when it is two, what a connected system should do and how to test it. For the business side of starting online, see [selling online in Pakistan](/blog/selling-online-pakistan) and our [guide to start selling online](/guides/start-selling-online-pakistan).

## The problem in one example

You have 3 pairs of a shoe in size 42. A customer buys one at the counter at 4 pm. At 4:10 pm, two customers order size 42 on your website. The website still shows 3. At 4:30 pm you realise you have 2 pairs, not 3 plus 2 orders. One online customer will be disappointed.

Multiply this by a hundred products and a busy weekend, and you get cancelled orders, apologies, refunds and a drop in reviews. With cash on delivery, the loss is bigger: you pack and ship an order that was not available, or you cancel after the customer was told it was confirmed.

## Why it happens: two stocks, one shelf

The shelf is one place. If the counter and the website each keep their own number, someone has to copy changes between them by hand, and the copy is always late. Common ways shops try to cope:

- **A spreadsheet that someone updates at night.** Late and often wrong.
- **Selling only a part of the stock online.** Safe, but you hold back sales.
- **Checking the shelf before every online order.** Slow, and you cannot do it when you are busy.
- **Using separate software for the shop and for the website.** Two systems that do not talk.

None of them scale. The only reliable fix is that **a sale anywhere changes the stock everywhere**, immediately.

## What "one stock" must mean

When a system says it syncs stock, make it specific. Ask for these behaviours.

1. **A counter sale reduces the stock available online.** Within moments, not at night.
2. **An online order reserves or reduces the stock,** so the counter cannot sell the same pair.
3. **A cancelled or returned online order puts the stock back,** if the item is resellable.
4. **A purchase or stock count raises the stock** that online channels see.
5. **Variants are handled,** so size 42 and size 43 are separate.
6. **You can hide or cap a product online,** such as showing at most 2 even if you hold 10.
7. **Stock history shows the cause,** a sale at the counter, an online order or an adjustment.

If the vendor's answer to one of these is "you update it by hand", you do not have sync; you have a connection.`),
    diagram(
      'Counter sales and online orders take from the same shelf, so every channel sees the same number.',
      {
        kind: 'flow',
        nodes: [
          { id: 'orders', label: 'Online orders', icon: 'shopping-bag', note: 'Website and marketplaces' },
          { id: 'nafaa', label: 'One stock', icon: 'layers', note: 'Next to counter sales' },
          { id: 'pack', label: 'Pack from stock', icon: 'package-check', note: 'The same shelf as the shop' },
          { id: 'courier', label: 'Book courier', icon: 'truck', note: 'Label and tracking' },
          { id: 'done', label: 'Delivered and paid', icon: 'circle-check', note: 'COD settled, stock synced' },
        ],
        edges: [
          { from: 'orders', to: 'nafaa' },
          { from: 'nafaa', to: 'pack' },
          { from: 'pack', to: 'courier' },
          { from: 'courier', to: 'done' },
        ],
        animate: true,
      },
      'From online order to delivery',
    ),
    prose(`## More than stock: what else should be shared

Stock is the most urgent thing to share, but it is not the only one.

- **Prices.** Do you want the same price online and in the shop, or a different one for online? A good system lets you set a separate price per channel and keeps the default shared.
- **Customers.** A customer who buys online and later walks into the shop should be one person, with one history.
- **Orders.** Online orders should sit next to counter sales in your reports, so you see the whole business and know which channel earns what.
- **Payments.** Cash on delivery needs to be reconciled against what the courier remits. Online payments need to be matched with orders. See [COD reconciliation](/glossary/cod-reconciliation).
- **Returns.** A return from a courier should go through the same process as a counter return, and update stock and money.

## Cash on delivery and the cost of a bad order

COD is popular in Pakistan, and it carries risk: customers refuse a parcel, give a wrong address or do not answer. Each failed delivery costs you the courier fee both ways and the time of packing. Two practical controls help:

- **See the buyer's past orders** before shipping, including how many were delivered and returned.
- **Confirm high-value or first-time COD orders** by a call or message.

Software cannot remove COD risk, but it can show it. See the glossary on [COD](/glossary/cod).

## Couriers and booking

An order that sits in a list is not delivered. Check that you can book the courier you use from the order itself, print the label, store the tracking number and see the status. Switching between a dozen courier websites is a hidden time cost. Nafaa supports booking with couriers such as TCS, Leopards, M&P, PostEx, Trax and CallCourier from the order.

## Which channels? Your own website, marketplaces and the shop

Most Pakistani sellers use more than one channel: a website or Shopify store, Daraz, WhatsApp orders and the shop itself. Each added channel multiplies the stock problem. The rule is the same: one stock, many channels. Ask the vendor which channels connect today, how each connection is set up and what is still manual. Do not accept "coming soon" as a feature.

Nafaa connects orders from your own website, Shopify, WooCommerce, Daraz and Foodpanda, and from Nafaa Market, to the same stock as the counter; read the [online store page](/product/online-store) for the current list and what each connection needs.

## What to test before you sell online

Run this in the trial with one product and two channels.`),
    mdTable(
      'Stock sync test',
      'Do each step and read the stock after it.',
      [
        { key: 'expect', label: 'What should happen' },
      ],
      [
        ['Start with 5 of one product', 'Counter and online both show 5'],
        ['Sell 1 at the counter', 'Online shows 4 within a moment'],
        ['Place 1 online order', 'Counter shows 3 or an order reserving 1'],
        ['Cancel the online order', 'Stock returns to 4'],
        ['Return the counter sale', 'Stock returns to 5'],
        ['Receive 10 more on purchase', 'Both channels show 15'],
        ['Sell the last unit at the counter', 'The product goes out of stock online'],
        ['Look at the stock history', 'Each change has a cause and a name'],
      ],
    ),
    shot({
      heading: 'Every online order in one list',
      body: 'Orders from each channel land in one list with the buyer, city, items, how they pay and how long the order has waited, next to counter sales.',
      id: SHOT.onlineOrders,
      url: 'app.nafaa.pk/online-orders',
      layout: 'full',
      caption: 'Online orders page from a demo store.',
    }),
    prose(`## Offline and speed

An online store runs on the internet, and the shop counter should not depend on it. Check that the counter bills offline and that online orders and stock sync when the connection is back. See [offline POS](/blog/offline-pos-internet-outage-lost-sales).

## Questions to ask a vendor

1. If I sell the last item at the counter, how fast does it disappear online?
2. Can I set a different price per channel?
3. How do returns and cancellations change stock?
4. Which couriers can I book from an order?
5. How do I see cash on delivery that is still to collect?
6. Which channels connect today, and which need a manual step?
7. Can I stop selling online for a day, without losing orders already placed?

## How Nafaa connects them

Nafaa brings online selling into the same account as the shop: orders from your website, Shopify, WooCommerce, Daraz and Foodpanda arrive next to counter sales, take stock from the same shelf and can be shipped with a courier booked from the order. A channel can have its own price, and you see COD still to collect and the return rate. Which channels you can connect depends on your plan and setup; see [online store](/product/online-store), the help article on [online store setup](/help/grow/online-store-setup), the [online store setup service](/services/online-store-setup) and [pricing](/pricing).`),
    tip('Start online with ten products you can count, not the whole shop. Get the sync right for ten, then add the rest.', 'Start small online'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['The problem', 'Why it happens', 'What one stock means', 'Shared prices and customers', 'COD', 'Couriers', 'Channels', 'Test', 'Vendor questions'],
  dropped: [],
  needsOwner: ['Confirm which channel connections are live per plan before widening the channel list in this post.'],
  evidence: [
    'apps/web/src/modules/sales',
    'apps/web/src/modules/catalog',
    'apps/api/src/integrations/online-orders/order-normalizer.ts',
    'apps/api/prisma/seed-marketing-cms/content/main-pages/products.ts',
  ],
  factNote: 'Channel and courier lists follow the online store product page. Sync behaviours are a buyer checklist; Nafaa statements limited to the product page. Wikipedia pages opened 2026-11-15.',
};

export default spec;
