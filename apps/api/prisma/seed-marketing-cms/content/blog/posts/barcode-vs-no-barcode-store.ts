/**
 * Deciding whether a shop should bill by barcode, without barcodes, or with
 * a mix: which stores gain the most, fast billing without a scanner, the real
 * cost of labelling your own stock, scale labels, and a one-week test.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { note, sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('International Article Number (EAN)', 'https://en.wikipedia.org/wiki/International_Article_Number', 'Wikipedia'),
  src('GS1', 'https://en.wikipedia.org/wiki/GS1', 'Wikipedia'),
  src('Code 128', 'https://en.wikipedia.org/wiki/Code_128', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'barcode-vs-no-barcode-store',
  title: 'Barcode or No Barcode: How to Decide for Your Shop',
  summary:
    'Shops where most items come in printed packs, with many items and busy queues, gain the most from barcodes; shops selling loose, weighed or a small set of items often bill faster with quick keys and search. Most Pakistani stores do best with a mix, and this guide shows how to decide section by section.',
  category: 'guides',
  cover: PHOTO.barcodeVsNoBarcodeStore,
  tags: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:scale-barcode', 'GLOSSARY_TERM:ean-13', 'PRODUCT:pos'],
  related: [
    'BLOG_POST:barcode-setup-guide',
    'PRODUCT:pos',
    'INDUSTRY:kiryana',
    'SERVICE:hardware',
    'GLOSSARY_TERM:loose-sale',
  ],
  isNew: true,
  seoTitle: 'Barcode or No Barcode: Which Suits Your Shop?',
  seoDescription:
    'Which shops need barcode billing, how to bill fast without a scanner, the cost of labelling your own stock, scale labels, and a mixed approach that works.',
  focusKeyword: 'barcode or no barcode shop',
  sources: SOURCES,
  blocks: [
    prose(`Every shop owner who moves to a POS asks the same question: do I need barcodes? The honest answer is that it depends on what you sell, not on how modern you want the shop to look. A pharmacy and a vegetable stall sit at opposite ends; most kiryana, hardware and general stores sit somewhere in the middle.

This guide helps you decide. If you have already decided to use barcodes, the [barcode setup guide](/blog/barcode-setup-guide) covers scanners, label types and the rollout itself.

## What a barcode actually saves

A barcode does two jobs at the counter. It finds the item without typing, and it finds the **exact** item: the 1 litre bottle, not the 1.5 litre one next to it. The second job matters more than the first. Most billing mistakes in a busy shop are not slow searches; they are the wrong size, flavour or brand billed at the wrong price.

Barcodes on packaged goods are printed by the manufacturer. The common retail format is [EAN-13](https://en.wikipedia.org/wiki/International_Article_Number), a 13-digit number built on the older 12-digit UPC, and manufacturers get their numbers through [GS1](https://en.wikipedia.org/wiki/GS1), the body that maintains these standards. For you, that means those codes cost nothing: you scan them once into your product list and they work from then on.

The cost appears when items do **not** come with a barcode, and you have to print and stick labels yourself.

## Five questions to decide

Answer these honestly for your shop:

1. **What share of your items come in a printed pack?** If most of your shelf is branded packs (biscuits, soap, medicine, cosmetics, drinks), barcodes are close to free.
2. **How many different items do you sell?** A shop with 200 items can be learned by heart. A shop with 3,000 cannot.
3. **How many look alike?** Ten sizes of the same shampoo, five strengths of one medicine: these are where wrong billing happens.
4. **How busy is the counter?** If customers queue at peak hours, every second per item adds up.
5. **How often do staff change?** A new cashier can scan on day one. Learning names, prices and shortcuts takes weeks.

The more "yes, a lot" answers you have, the stronger the case for barcodes.

| Shop type | Usual answer | Why |
|---|---|---|
| Pharmacy, cosmetics, mart | Barcodes | Mostly printed packs, many look-alike items |
| Kiryana and general store | Mix | Packs on shelves, loose daal, rice and sugar by weight |
| Hardware store | Mix | Branded items scan; pipe, wire and nails sold by length or weight |
| Garments and shoes | Own labels | No usable maker barcode; size and colour must be exact |
| Bakery, sweets, sabzi, meat | Mostly no barcode | Few items, sold loose or by weight |
| Restaurant, salon | No barcode | Menu and service items picked on screen |`),
    shot({
      heading: 'Billing without a scanner',
      body: 'Items as tiles on the counter screen, with search above them. A small shop with a few hundred items can bill most sales from here without scanning.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      caption: 'Counter screen from a demo grocery store, with a five-item bill.',
    }),
    prose(`## Billing fast without barcodes

Going without barcodes does not mean typing full product names. A well set-up counter without a scanner uses three tools:

- **Quick keys:** one-tap buttons for your 20 to 60 fastest items, grouped (bread and eggs, cold drinks, loose daal). This alone covers a large part of sales in a small shop.
- **Short, predictable names:** if every item starts with its type ("Sugar 1 kg", "Oil 5 L brand"), typing three letters finds it. See the naming pattern in our [hardware inventory guide](/blog/hardware-store-inventory-many-skus); it works for any trade.
- **Weight or money entry:** for loose goods, the cashier picks the item and types the weight, or the amount the customer asked for ("200 rupay ka"), and the quantity is worked out.

The weakness of this approach is look-alike items and new staff. If either is a problem in your shop, barcode those sections at least.

## The real cost of printing your own labels

For items without a maker barcode, you print labels. Before you commit, count the work, for example:

- 800 unlabelled items on the shelf, at roughly 10 seconds each to print and stick, is a little over two hours of work once.
- New stock: if 150 unlabelled pieces arrive each week, that is about 25 minutes a week, every week.
- Price changes: each changed price needs new labels on every piece already on the shelf, unless the label shows only the name and code, not the price.

That last point is often missed. If your prices move often, print labels **without** the price and keep the price in the system. Own labels usually use [Code 128](https://en.wikipedia.org/wiki/Code_128), which holds numbers and letters and is read by almost every scanner.

## Scale labels

Some shops selling meat, cheese, sweets or dry fruit use a label-printing scale. The scale weighs the item and prints a [scale barcode](/glossary/scale-barcode) that carries the item and its weight or price, so the counter only scans. It suits shops where items are weighed and packed behind a counter and paid for at a separate till. If you consider this, check before buying that your POS reads the exact label format the scale prints, and test it with a few real labels.

A simpler path for most shops is a scale connected to the counter, so the weight goes straight into the bill without a label.`),
    note('Barcodes speed up billing; they do not fix a messy product list. If one item exists three times under different names, scanning will find only one of them. Clean the list first.', 'Clean the list first'),
    steps(
      'A one-week test before you decide',
      [
        ['Pick one section', 'Choose the section with the most look-alike packed items, such as shampoo, medicine or biscuits.'],
        ['Scan in the maker codes', 'Scan each item\'s existing barcode into its product. Generate codes and print labels only for the few without one.'],
        ['Run it for a week', 'Bill that section by scanner and everything else as before.'],
        ['Compare', 'Check wrong-item returns, the cash difference at closing and how long peak-hour queues were.'],
        ['Decide section by section', 'Extend barcodes to sections where it helped. Keep quick keys for loose and weighed items.'],
      ],
      undefined,
      true,
    ),
    prose(`## The mixed approach most stores end up with

In practice, most [kiryana stores](/industries/kiryana) and general stores settle on a mix: maker barcodes on all packed goods, quick keys for the fast loose items, search for the rest, and a few own labels only where items look alike. Each pack size of the same product can carry its own barcode, so a single bottle and a carton both scan correctly. That gives the speed and accuracy of scanning where it pays, without labelling every bag of daal.

## How Nafaa helps

Nafaa's counter takes a barcode scan, a search or a voice search, and quick keys that you arrange in your own groups; keys can be shared, limited to one branch or personal. A product can carry its maker barcode, and Nafaa can generate codes for items and pack units that have none. Each pack unit (piece, dozen, carton) can have its own barcode on the same stock. Barcode labels print on a thermal roll or A4 sticker sheets, with or without the price. Loose items can be billed by weight or by amount, and a connected scale can fill in the weight. If you are not sure which scanner or printer to buy, our [hardware service](/services/hardware) can advise, and the [POS](/product/pos) page shows the counter.`),
    tip('Whatever you choose, set up quick keys for your 30 fastest items on day one. Even shops that scan everything use them for loose sales and items with damaged barcodes.', 'Quick keys first'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['What a barcode saves', 'Five questions', 'Shop types', 'Billing without barcodes', 'Cost of own labels', 'Scale labels', 'One-week test', 'Mixed approach', 'How Nafaa helps'],
  dropped: [],
  needsOwner: ['Does the counter read price- or weight-embedded scale barcodes? Not found in the code, so the post does not claim it.'],
  evidence: [
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/pos/quick-keys/QuickKeysPage.tsx',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/modules/inventory/barcodes/pages/BarcodeLabelsPage.tsx',
    'apps/web/src/modules/inventory/barcodes/components/LabelDesigner.tsx',
    'apps/web/src/core/components/voice/voiceMatch.ts',
    'apps/web/src/modules/inventory/products/api/products.api.ts',
    'apps/web/src/modules/inventory/products/api/product-units.api.ts',
    'apps/web/src/core/hardware/devices.ts',
  ],
  factNote:
    'EAN-13, GS1 and Code 128 descriptions checked on Wikipedia; links checked to load on 2026-10-26 (gs1pk.org and gs1.org returned 429/403 to automated checks, so Wikipedia is cited). Product statements checked against the code (see evidence). Item counts and times are illustrative.',
};

export default spec;
