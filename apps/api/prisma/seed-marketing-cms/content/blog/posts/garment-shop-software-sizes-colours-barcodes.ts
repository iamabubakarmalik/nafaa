/**
 * Buyer checklist for garment and clothing shop software: size/colour
 * variants, barcodes per variant, exchange, seasons, alterations, layaway.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [srcChecked('Stock keeping unit', 'https://en.wikipedia.org/wiki/Stock_keeping_unit', 'Wikipedia', '2026-11-15'), srcChecked('Barcode', 'https://en.wikipedia.org/wiki/Barcode', 'Wikipedia', '2026-11-15')];

const spec: PostSpec = {
  slug: 'garment-shop-software-sizes-colours-barcodes',
  title: 'Garment Shop Software: Sizes, Colours and Barcodes',
  summary:
    'Clothing software must treat every size and colour of a design as its own stock line, give each one a barcode, handle exchanges and seasonal markdowns, and manage stitching, alterations and layaway. This guide lists what to check and how to set up variants so the stock stays accurate.',
  category: 'industry',
  cover: PHOTO.garmentShopSoftwareSizesColoursBarcodes,
  tags: ['INDUSTRY:garments', 'GLOSSARY_TERM:product-variant', 'GLOSSARY_TERM:barcode'],
  related: [
    'INDUSTRY:garments',
    'BLOG_POST:clothing-size-inventory-guide',
    'BLOG_POST:garment-shop-seasonal-stock-planning',
    'BLOG_POST:barcode-setup-guide',
    'GLOSSARY_TERM:sku',
    'GLOSSARY_TERM:layaway',
    'PAGE:kapre-ki-dukaan-software',
  ],
  isNew: true,
  seoTitle: 'Garment Shop Software: Sizes, Colours, Barcodes',
  seoDescription:
    'What clothing shops in Pakistan should check in a POS: size and colour variants, a barcode for each, exchanges, markdowns, alterations and layaway.',
  focusKeyword: 'garment shop software',
  sources: SOURCES,
  blocks: [
    prose(`A garment shop sells the same design in many forms. One kurta can come in four sizes and three colours, which is twelve things on your shelf that look alike and sell separately. A software that lists "kurta" with one quantity cannot tell you that the medium blue is finished while the large red has been sitting for a month, and that is exactly the question a clothing owner needs answered every day.

This guide helps owners of clothing, boutique, readymade and fabric shops choose software. It covers how variants should work, why barcodes decide the speed of the counter, what to check for exchanges and seasons, and the extra jobs a garment shop has: stitching, alterations and layaway. For the planning side of sizes, see our guide to [clothing size inventory](/blog/clothing-size-inventory-guide) and, for the season, [seasonal stock planning](/blog/garment-shop-seasonal-stock-planning).

## The core idea: a design, with variants

Think of two levels:

- **The design,** like "Cotton kurta, style 214". It has a name, a category, a photo, a cost and a selling price.
- **The variants,** each size and colour of that design. Each variant has its own stock, its own barcode and, sometimes, its own price.

If your software calls this a [product variant](/glossary/product-variant), good. The point is that stock is counted per variant, while reports can be read per design. A product list where each combination is a separate typed product technically works, but you cannot see the design as a whole, and typing 12 products for each design is a waste of your afternoon.

What to check:

- **Creating a design with sizes and colours in one go,** by ticking sizes and colours instead of typing each combination.
- **A grid view** of one design showing sizes against colours with the quantity in each cell.
- **Different prices by variant,** if large sizes cost more.
- **A size chart** you can reuse for similar designs.
- **A photo per design,** so staff can find it and online sales can use it.

## Barcodes: the difference between a fast and a slow counter

Clothes cannot be priced like packets of biscuits; each piece has a size and colour. A barcode that identifies the [SKU](/glossary/sku), the exact variant, lets the cashier scan and bill without choosing a size on screen. Without barcodes, the cashier searches a name, then picks the size and colour, and that is where wrong variants and wrong stock come from.

Check that the software can:

- **Generate barcodes for each variant** when you create it.
- **Print labels** with design name, size, colour, price and barcode, in the label size you use. See the [barcode setup guide](/blog/barcode-setup-guide) and the [barcode generator](/tools/barcode-generator).
- **Reprint a label** for one variant, for example when a tag falls off.
- **Scan at stock-taking,** so counting is quick.
- **Use your supplier's barcode** if it already exists, instead of making a new one.

If you use hang tags, put the barcode at the same place on every garment, so the cashier does not hunt for it.

## Receiving stock without typing

A garment shop receives in bundles: ten pieces of the design in five sizes. The slow way is to enter every variant separately. Look for a purchase screen where you pick the design and type the quantity in each size cell, then print the labels for exactly what arrived. This is where the grid view saves the most time.

## Exchanges, returns and refunds

Clothing has the highest return rate of most retail, and most returns are really exchanges for another size. Your software should treat that as a normal event.

- **An exchange screen** that takes the returned variant back into stock and gives the new variant in one step, with the price difference.
- **A return rule** for how many days, store credit versus cash and who approves it. A refund PIN for the manager is the usual control.
- **A record of why,** so you learn which sizes run small and which designs come back often.

Nafaa has an exchange page in the garments pack, and a general returns and refund PIN at the counter. See [returns and refund PIN](/help/pos-counter/returns-and-refund-pin).`),
    shot({
      heading: 'One design, every size and colour',
      body: 'The garments product list shows each design with its stock across sizes and colours, so you see at once which size has run out and which sits unsold.',
      id: SHOT.garmentsProducts,
      url: 'app.nafaa.pk/garments/products',
      layout: 'full',
      caption: 'Product list from a demo garment shop.',
    }),
    prose(`## Seasons, markdowns and collections

Clothing stock has an expiry of its own: the season. A winter jacket on the shelf in April is money tied up. Software should help you see it coming.

- **Collections or seasons,** so you can group designs and view their sales together.
- **Age of stock,** so you see how long a design has been on the shelf.
- **Markdown tools,** to reduce prices for a group of designs in one action, not one by one.
- **Sell-through reports,** showing for each design how much of the stock has sold.

Planning the Eid and wedding season has its own rhythm; see our [Ramadan and Eid retail strategy](/blog/ramadan-eid-retail-strategy).

## Stitching, tailoring and alterations

Many clothing shops do more than sell: they take measurements, send fabric for stitching or alter a purchased suit. If you do any of this, check that the software has:

- **Customer measurements** saved for the next order.
- **Tailoring orders** with a delivery date, an advance, a balance and a status.
- **Alterations** as a small job linked to a bill.
- **A pending list for the day,** so the shop knows what is due today.

If your software ends at the sale, you will keep a second notebook for this, and the notebook will be the one that goes missing.

## Layaway, reservations and advance

A customer who likes a wedding outfit but cannot pay today asks you to keep it. That is a reservation or [layaway](/glossary/layaway): the item is set aside, the customer pays in parts and takes it at the end. The software should reserve the stock so it cannot be sold meanwhile, record each part-payment and show the balance.

## Staff, discounts and cash

Clothing counters give a lot of discounts, which makes them a place where money leaks. Check discount limits per role, a PIN above the limit and a report of discounts by person. See [staff control at the counter](/blog/staff-permissions-checklist-pos-software).

## Reports a garment owner should read

- Stock by size: which sizes are short and which are heavy.
- Fast and slow designs, by number and by profit.
- Sales by season or collection.
- Discounts given, and by whom.
- Udhaar by customer, for shops that sell on credit.

## Set up variants correctly the first time`),
    steps(
      'Setting up a design properly',
      [
        ['Create the design once', 'Name, category, cost, selling price and a photo.'],
        ['Tick sizes and colours', 'Let the system create every combination.'],
        ['Enter the opening stock in the grid', 'Quantity in each size and colour.'],
        ['Print one label per piece', 'Each variant gets its own barcode.'],
        ['Stick labels in the same place', 'Always the same position on the tag.'],
        ['Count one rack to test', 'Scan every piece and compare with the system.'],
      ],
      'Do this for one rack first, then repeat for the rest of the shop.',
      true,
    ),
    mdTable(
      'Garment software checklist',
      'Ask the vendor to show each line using a design with at least three sizes and two colours.',
      [
        { key: 'test', label: 'What to see' },
      ],
      [
        ['Create a design with sizes and colours', 'Variants made by ticking, not typing'],
        ['Grid of stock by size and colour', 'One screen per design'],
        ['Barcode label per variant', 'Name, size, colour, price and barcode'],
        ['Scan at the counter', 'Correct variant, stock goes down'],
        ['Size exchange', 'One step, price difference handled'],
        ['Markdown for a group', 'Change many prices at once'],
        ['Tailoring or alteration job', 'Measurements, advance, due date'],
        ['Reserved item with part payments', 'Cannot be sold meanwhile'],
        ['Discount over the limit', 'Needs a manager PIN'],
      ],
    ),
    prose(`## How Nafaa's garments pack covers this

Nafaa's garments pack has a product wizard that creates a design with its sizes and colours, size charts, stock by size and colour, barcode labels, an exchange page, collections, layaway and reservations, measurements, tailoring orders and alterations, with the ordinary POS, khata, staff controls and reports. The help article on [garments size and colour](/help/by-business-type/garments-size-and-colour) explains the daily use, and the [garments industry page](/industries/garments) lists the features. Start with one rack in the free trial, count it, and compare the stock with the shelf; see [pricing](/pricing) for the plans.`),
    tip('Choose your barcode label size before you buy a label printer, and choose the printer before you print a thousand labels. Changing the label layout later means relabelling the shop.', 'Label size first'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Design and variants', 'Barcodes', 'Receiving stock', 'Exchanges', 'Seasons', 'Tailoring', 'Layaway', 'Discounts', 'Reports', 'Setup steps', 'Checklist'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/garments/pages/GarmentProductWizardPage.tsx',
    'apps/web/src/industries/garments/pages/GarmentProductsPage.tsx',
    'apps/web/src/industries/garments/pages/SizeChartsPage.tsx',
    'apps/web/src/industries/garments/pages/ExchangePage.tsx',
    'apps/web/src/industries/garments/pages/CollectionsPage.tsx',
    'apps/web/src/industries/garments/pages/LayawayPage.tsx',
    'apps/web/src/industries/garments/pages/ReservationsPage.tsx',
    'apps/web/src/industries/garments/pages/MeasurementsPage.tsx',
    'apps/web/src/industries/garments/pages/TailoringPage.tsx',
    'apps/web/src/industries/garments/pages/AlterationsPage.tsx',
  ],
  factNote: 'Garment features checked in apps/web/src/industries/garments. Wikipedia pages opened 2026-11-15. General retail practice for the rest.',
};

export default spec;
