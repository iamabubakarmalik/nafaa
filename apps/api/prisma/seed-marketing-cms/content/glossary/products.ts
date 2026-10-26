/**
 * Glossary: products and how they are identified, priced and tracked
 * (codes, barcodes, variants, units, serials, phones, gold, holds).
 */

import { EV, SRC, type TermSpec } from './_term';

export const productTerms: TermSpec[] = [
  {
    slug: 'sku',
    seoDescription: 'An SKU (Stock Keeping Unit) is a code for one exact product variant, so each size, colour or pack size is counted separately. Here is how to set them up.',
    imported: true,
    term: 'SKU (Stock Keeping Unit)',
    definition: 'An SKU is a code for one exact product variant in stock, so each size, colour or pack size is counted separately.',
    definitionRomanUrdu: 'SKU har product ki har qism ka alag code hai, taake har size, rang ya pack alag gina jaye.',
    example: `A kurta in medium green and the same kurta in large green are two SKUs. A shampoo in 185 ml and 360 ml bottles is two SKUs, even though the brand and name are the same.`,
    body: `## How it works

An SKU is the shop's own code, unlike a barcode, which usually comes from the manufacturer. It answers one question: "exactly which item is this?" Without separate SKUs, a shop knows it has 40 kurtas but not that all the mediums are sold and only XXL is left, which is how reorders go wrong.

A readable SKU helps staff: a short prefix for the category, then style, colour and size, such as KUR-021-GRN-M. Keep codes unique, never reuse an old code for a new product, and do not put the price in the code, because prices change.

## In Nafaa

Every product and variant in Nafaa has its own SKU, and the counter search finds items by name, SKU or barcode. Product types such as medicines get a ready prefix, and bulk import and bulk edit let a shop fill SKUs for its whole list at once.`,
    alsoKnownAs: ['stock keeping unit', 'item code', 'product code'],
    related: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:product-variant', 'GLOSSARY_TERM:unit-of-measure', 'PRODUCT:inventory'],
    evidence: [EV.variantCard, EV.productImport, EV.pos],
  },
  {
    slug: 'barcode',
    term: 'Barcode',
    definition: 'A barcode is a machine-readable pattern of bars or squares printed on a product or label that a scanner reads to identify the item.',
    definitionRomanUrdu: 'Barcode product ya label par chhapi lakeeron ya dabbon ka pattern hai jise scanner parh kar item pehchanta hai.',
    example: `A grocery store scans the barcode on a pack of tea and the right item and price appear on the bill. For loose rice packed in-house, the shop prints its own barcode labels.`,
    body: `## How it works

Scanning a barcode is faster and far more accurate than searching by name, which is why barcodes matter most at busy counters with many similar items. Most branded goods in Pakistan already carry a linear barcode, usually EAN-13. Items packed by the shop, garments and loose goods need labels printed in-house, usually in the Code 128 format, which can hold letters and numbers.

Problems arise when the same barcode is linked to two products, or one product has several barcodes and only one is entered. When a new stock arrives, scan a piece before it goes on the shelf to check it is known.

## In Nafaa

Nafaa scans barcodes at the counter with a USB scanner or the device camera. The barcode labels page designs and prints labels in Code 128, EAN-13 or QR, and a variant's own barcode adds that exact variant to the bill.`,
    alsoKnownAs: ['bar code', 'product code', 'scan code'],
    related: ['GLOSSARY_TERM:ean-13', 'GLOSSARY_TERM:upc', 'GLOSSARY_TERM:sku', 'GLOSSARY_TERM:scale-barcode'],
    evidence: [EV.labels, EV.labelRender, 'apps/web/src/core/components/barcode/BarcodeScanner.tsx'],
  },
  {
    slug: 'ean-13',
    term: 'EAN-13',
    definition: 'EAN-13 is the 13-digit barcode standard printed on most retail products sold outside North America, including in Pakistan.',
    definitionRomanUrdu: 'EAN-13 13 hindson wala barcode standard hai jo Pakistan samet duniya ke zyada tar products par chhapa hota hai.',
    example: `A biscuit packet's barcode reads 13 digits. The first digits identify the GS1 country prefix of the company that registered it, the middle part the company and product, and the last digit is a check digit.`,
    body: `## How it works

EAN-13 numbers are issued through GS1, the global barcode body, to brand owners. The last digit is calculated from the first twelve, so a scanner can tell when it has misread a code. Because the number identifies the product, not the shop, two stores selling the same item see the same barcode.

A shop does not need its own GS1 number for in-house labels: those can use Code 128 or internal numbers. A manufacturer that wants its goods in supermarkets usually needs registered EAN-13 codes. Never make up 13-digit numbers that look like EAN codes for your own products, because they may clash with a real product.

## In Nafaa

The Nafaa label designer prints EAN-13 only when a code is a valid 13-digit number with a correct check digit; any other code is printed as Code 128 automatically.`,
    alsoKnownAs: ['EAN', 'European Article Number', 'GTIN-13', '13 digit barcode'],
    related: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:upc', 'GLOSSARY_TERM:sku'],
    evidence: [EV.labels, EV.labelRender],
  },
  {
    slug: 'upc',
    term: 'UPC (Universal Product Code)',
    definition: 'UPC is the 12-digit barcode standard used mainly in the United States and Canada, readable by the same scanners as EAN-13.',
    definitionRomanUrdu: 'UPC 12 hindson wala barcode standard hai jo zyada tar America aur Canada me chalta hai; EAN-13 wale scanner isay bhi parhte hain.',
    example: `An imported energy drink from the US carries a 12-digit UPC. When scanned at a Karachi store, the POS reads it as a 13-digit code with a leading zero.`,
    body: `## How it works

UPC-A and EAN-13 belong to the same GS1 family. A UPC is effectively an EAN-13 that starts with 0, so most scanners and software treat them as one system. Imported goods in Pakistan, such as cosmetics, supplements, snacks and electronics accessories, often carry UPCs.

The practical issue for a shop is matching: one scanner may send 12 digits and another 13, so the same item looks like two different codes. When products are entered, scan them with the counter's own scanner rather than typing the number from the pack, so the code saved matches what the counter will read.

## In Nafaa

Nafaa stores whatever code the scanner reads and finds the product by it at the counter, so entering a product by scanning it once keeps imported UPC items consistent.`,
    alsoKnownAs: ['UPC-A', 'universal product code', '12 digit barcode'],
    related: ['GLOSSARY_TERM:ean-13', 'GLOSSARY_TERM:barcode', 'BLOG_POST:barcode-setup-guide', 'TOOL:barcode-generator'],
    evidence: [EV.pos],
  },
  {
    slug: 'scale-barcode',
    seoDescription: 'A scale barcode is a label printed by a weighing scale that carries the item code with its weight or price, so loose items can be billed by scanning.',
    term: 'Scale Barcode',
    definition: 'A scale barcode is a label printed by a weighing scale that carries the item code together with its weight or price, so the counter can bill a loose item by scanning it.',
    definitionRomanUrdu: 'Scale barcode woh label hai jo kanta (weighing scale) chhapta hai, jis me item ka code aur wazan ya qeemat hoti hai, taake counter par scan kar ke bill ho jaye.',
    example: `At a supermarket's fruit section, an assistant weighs 1.35 kg of apples, the scale prints a label, and the cashier scans it. The bill shows apples, 1.35 kg, at the day's rate.`,
    body: `## How it works

Label-printing scales are common in supermarkets, bakeries, meat and dry fruit shops. The barcode usually starts with a set prefix, then the item's short code, then the weight or price, then a check digit. The POS splits the number to find the item and quantity.

It speeds up the counter and stops errors from typing weights by hand. For it to work, the item codes on the scale and in the POS must match, and staff should not reuse old labels. Shops without a label scale can weigh at the counter instead, with a scale connected to the computer.

## In Nafaa

At the Nafaa counter a scale label puts the item on the bill straight away with the weight from the label. Items sold by weight without a label open a weigh window, which can read a connected scale set up under Settings, Hardware.`,
    alsoKnownAs: ['weight barcode', 'scale label', 'price embedded barcode'],
    related: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:unit-of-measure', 'INDUSTRY:meat', 'INDUSTRY:kiryana'],
    evidence: ['apps/web/src/modules/pos/engine/usePosEngine.ts', EV.posWeigh, EV.hardwareSettings],
  },
  {
    slug: 'product-variant',
    term: 'Product Variant',
    definition: 'A product variant is one version of a product that differs by size, colour, flavour or similar, and has its own stock, price and code.',
    definitionRomanUrdu: 'Product variant ek product ki woh qism hai jo size, rang, flavour waghera me mukhtalif ho aur jis ka apna stock, qeemat aur code ho.',
    example: `A shoe style comes in sizes 39 to 44 and in black and brown: one product with 12 variants. Each variant has its own barcode, so the counter knows that size 42 brown has been sold out.`,
    body: `## How it works

Variants keep a catalogue tidy. Instead of 12 separate products with similar names, there is one product with a size and colour grid. Reports can still show the style as a whole, while stock, reorders and returns work on the exact variant.

Garments, shoes, cosmetics shades, paint colours and mobile accessories all depend on variants. The common mistake is to sell the "main" product at the counter without picking the variant, which leaves one size showing negative stock and another showing stock that is not there.

## In Nafaa

Products in Nafaa can have variants with their own SKU, barcode, price, wholesale price and stock. At the counter, choosing a product with variants opens a variant picker, and scanning a variant's barcode adds that variant directly. Garments get a size and colour grid.`,
    alsoKnownAs: ['variant', 'SKU variant', 'size and colour', 'item variation'],
    related: ['GLOSSARY_TERM:sku', 'GLOSSARY_TERM:barcode', 'INDUSTRY:garments', 'INDUSTRY:shoe'],
    evidence: [EV.variantCard, EV.posVariant],
  },
  {
    slug: 'unit-of-measure',
    term: 'Unit of Measure',
    definition: 'A unit of measure is the unit in which a product is bought, stocked or sold, such as piece, dozen, carton, kg, litre or metre.',
    definitionRomanUrdu: 'Unit of measure woh ikai hai jis me product khareeda, rakha ya becha jata hai, jaise piece, darjan, carton, kg, litre ya meter.',
    example: `A kiryana buys sugar by the 50 kg bori and sells it per kg; it buys soap by the carton of 72 and sells single bars or a dozen. Stock is kept in the smallest unit so every sale is counted correctly.`,
    body: `## How it works

Most shops in Pakistan buy in one unit and sell in another: cartons and pieces, bori and kg, thaan and metre, strips and tablets. Problems start when the conversion lives only in the owner's head. Stock then shows 3 cartons sold when 3 pieces left, or a purchase of 2 bori is recorded as 2 kg.

The fix is to keep one base unit for stock and define each other unit as a multiple of it, with its own price if needed, so a dozen can sell for less than 12 single pieces. Purchases and sales then convert automatically.

## In Nafaa

Nafaa has a shared multi-units page for every industry. A product can be sold in packs such as dozen or carton with their own price and barcode, purchases can use purchase-only units like "bori = 50 kg", and the counter asks which unit when a product has more than one.`,
    alsoKnownAs: ['UOM', 'unit', 'pack size', 'multi-unit'],
    related: ['GLOSSARY_TERM:sku', 'GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:loose-sale', 'GLOSSARY_TERM:scale-barcode'],
    evidence: [EV.units, EV.posUnit, EV.purchaseEditor],
  },
  {
    slug: 'wholesale-price',
    term: 'Wholesale Price',
    definition: 'A wholesale price is the lower price charged to buyers who purchase in bulk or resell the goods, such as retailers, contractors or institutions.',
    definitionRomanUrdu: 'Wholesale price woh kam qeemat hai jo zyada maal lene walon ya aage bechne walon se li jati hai, jaise dukandar, contractor ya idaray.',
    example: `A stationery shop sells a ream of paper for 1,450 rupees to walk-in customers and 1,350 rupees to schools buying 50 reams. Both prices are saved on the product, and the cashier picks wholesale for the school's bill.`,
    body: `## How it works

Many Pakistani shops do both retail and wholesale from the same counter: a hardware store selling to homeowners and contractors, a kiryana supplying smaller shops in its mohalla, a pharmacy supplying a clinic. If the wholesale rate is not saved, the cashier either gives it from memory or calls the owner, and the profit on wholesale bills is never clear.

Keep the wholesale price on the product, decide who qualifies (a customer type or a minimum quantity), and check the margin on wholesale separately, because it is usually thin. Wholesale customers also tend to buy on credit, so khata limits matter more.

## In Nafaa

Products and variants in Nafaa carry a separate wholesale price, and the counter can bill a line at the wholesale rate instead of the retail one.`,
    alsoKnownAs: ['trade price', 'TP', 'bulk price', 'dealer price'],
    related: ['GLOSSARY_TERM:mrp', 'GLOSSARY_TERM:markup', 'GLOSSARY_TERM:gross-margin', 'SOLUTION:wholesale-distribution'],
    evidence: [EV.variantCard, 'apps/web/src/modules/pos/hooks/useSharedPosCart.ts'],
  },
  {
    slug: 'mrp',
    term: 'MRP (Maximum Retail Price)',
    definition: 'MRP is the retail price printed on a product\'s pack by the manufacturer, which is the most a shop is expected to charge the customer.',
    definitionRomanUrdu: 'MRP woh retail qeemat hai jo company pack par chhapti hai; dukaan gahak se is se zyada nahi le sakti.',
    example: `A juice pack shows "Retail price 120 rupees". The shop buys it at trade price and sells at the printed price; its margin is the difference, set by the company rather than the shop.`,
    body: `## How it works

In Pakistan many packaged goods, including drinks, cooking oil, toiletries and medicines, carry a printed retail price. For these, the shop does not set the price: its profit is the gap between the trade price from the distributor and the printed price. Charging above the printed price causes complaints and can break consumer and price-control rules. For goods listed in the Third Schedule of the Sales Tax Act, 1990, sales tax is charged on the printed retail price.

When a company raises its price, old stock still carries the old printed price. Shops should update the selling price only when new stock arrives, which is easier when purchases are recorded by batch.

## In Nafaa

Nafaa stores a cost price and a selling price for each product, and the product editor shows margin as prices are typed, so printed-price items can be checked for the margin the distributor actually leaves.

## Official source

The Sales Tax Act, 1990 and its schedules are published on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226).`,
    alsoKnownAs: ['maximum retail price', 'printed price', 'retail price', 'company rate'],
    related: ['GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:sales-tax'],
    evidence: [EV.variantCard, EV.priceStep],
    sources: [SRC.fbrActs],
  },
  {
    slug: 'imei',
    seoDescription: 'An IMEI is the 15-digit number that identifies a mobile phone handset. Mobile shops in Pakistan use it to track stock, PTA status, warranty and theft.',
    imported: true,
    term: 'IMEI',
    definition: 'An IMEI is the 15-digit number that identifies a mobile phone handset.',
    definitionRomanUrdu: 'IMEI 15 hindson ka number hai jo har mobile phone ki alag pehchan hai.',
    example: `A mobile shop records the IMEI of each phone it buys and sells. When a customer returns a phone under warranty, the shop types the IMEI and finds the bill, the date and the price in seconds.`,
    body: `## How it works

Every handset has its own IMEI, and dual-SIM phones have two. You can see it by dialling *#06#, on the box label and under the battery or SIM tray. In Pakistan the IMEI matters for two reasons. First, PTA uses it to decide whether a phone may work on local networks. Second, it is the only reliable way to tell two phones of the same model apart for warranty, returns, theft checks and used-phone trade.

A mobile shop should record the IMEI when a phone enters stock and again on the sale bill. Selling a phone without recording its IMEI makes warranty claims and police queries hard to answer.

## In Nafaa

The Nafaa mobile pack keeps an IMEI register: each phone is entered with its IMEI and PTA status, the counter sells by IMEI, and returns can be searched by IMEI. Bulk import also takes an IMEI column for phones.`,
    alsoKnownAs: ['IMEI number', 'International Mobile Equipment Identity'],
    related: ['GLOSSARY_TERM:pta-approved', 'GLOSSARY_TERM:serial-number', 'INDUSTRY:mobile-shop'],
    evidence: [EV.imeiInventory, EV.imeiApi, EV.returns],
  },
  {
    slug: 'pta-approved',
    imported: true,
    term: 'PTA Approved',
    definition: 'A PTA-approved phone is a handset registered with the Pakistan Telecommunication Authority, so it keeps working on Pakistani mobile networks.',
    definitionRomanUrdu: 'PTA approved phone woh hai jo PTA ke paas registered ho, is liye Pakistan ke mobile networks par chalta rehta hai.',
    example: `A customer brings a phone bought abroad. The shop sends its IMEI by SMS to 8484 and the reply shows it is not registered, so it is sold as "non-PTA" at a lower price, and the customer is told it will need registration to use a local SIM.`,
    body: `## How it works

PTA runs DIRBS (Device Identification, Registration and Blocking System). Phones imported through official channels are registered; phones brought in personally must be registered within the allowed time, with duty and taxes paid, or they are blocked on local networks. Anyone can check a phone's status by sending its 15-digit IMEI by SMS to 8484 or on the DIRBS website.

For a mobile shop the PTA status changes a phone's value a lot, so it must be recorded accurately on stock and on the bill. Selling a non-PTA phone without saying so is a common cause of disputes.

## In Nafaa

The Nafaa mobile pack records each phone's PTA status (approved, non-PTA, patched, pending or exempt) with its IMEI, and the mobile dashboard counts non-PTA and pending phones in stock.

## Official source

[PTA DIRBS](https://dirbs.pta.gov.pk/), Pakistan Telecommunication Authority.`,
    alsoKnownAs: ['PTA registered', 'PTA approved phone', 'DIRBS'],
    related: ['GLOSSARY_TERM:imei', 'INDUSTRY:mobile-shop', 'BLOG_POST:mobile-shop-imei-records'],
    evidence: [EV.imeiApi, 'apps/web/src/industries/mobile/dashboard/useMobileOps.ts'],
    sources: [SRC.dirbs],
  },
  {
    slug: 'serial-number',
    seoDescription: 'Serial number tracking records the unique serial of each high-value unit from purchase to sale, so every piece can be traced for warranty and returns.',
    term: 'Serial Number Tracking',
    definition: 'Serial number tracking records the unique serial of each high-value unit from purchase to sale, so every piece can be traced for warranty, returns and theft.',
    definitionRomanUrdu: 'Serial number tracking har qeemti unit ka apna serial khareed se bikri tak record karti hai, taake warranty, return aur chori me har piece ka pata chale.',
    example: `An electronics shop sells an LED TV. The serial on the bill shows it came in on a purchase from the distributor in March. When the customer brings it back in December, the shop sees it is under warranty in seconds.`,
    body: `## How it works

For cheap items, counting quantity is enough. For TVs, laptops, ACs, cameras and appliances, each unit matters: its cost may differ by purchase, it carries its own warranty, and customers sometimes try to return a different unit than the one they bought. Recording the serial when stock comes in and again when it is sold closes these gaps.

It also helps with company claims. Brands in Pakistan often ask for the serial and the sale date before accepting a warranty claim, and the shop that can show both gets its claim through faster.

## In Nafaa

The Nafaa electronics pack keeps a serial register: when each unit came, from which purchase, at what cost, who bought it, on which bill, and how long its warranty runs. Transfers between branches carry serials, and the counter checks that a serial matches the product and branch.`,
    alsoKnownAs: ['serial tracking', 'serialised inventory', 'unit tracking'],
    related: ['GLOSSARY_TERM:warranty', 'GLOSSARY_TERM:imei', 'INDUSTRY:electronics', 'INDUSTRY:appliances'],
    evidence: [EV.serials, EV.transfers],
  },
  {
    slug: 'warranty',
    term: 'Warranty',
    definition: 'A warranty is a promise by the seller or maker to repair, replace or refund a product that develops a fault within a stated period.',
    definitionRomanUrdu: 'Warranty bechne wale ya company ka wada hai ke muqarrara muddat me kharabi aaye to product theek, tabdeel ya paise wapas kiye jayenge.',
    example: `A washing machine has one year of company warranty and the shop adds three months of its own. In the tenth month the motor fails; the shop opens a claim, sends the unit to the company and gives the customer a slip with the claim number.`,
    body: `## How it works

In Pakistan there are usually two warranties: the brand's (often handled through its service centre or the distributor) and the shop's own, such as a "check warranty" of a few days for used phones. Customers rarely know the difference, so the shop is where they come back.

What protects the shop is a record: the sale date, the serial or IMEI, the warranty months and the terms printed on the bill. Claims should be tracked as open cases, with dates, what was done and any cost, because unresolved claims are a frequent source of bad reviews.

## In Nafaa

Nafaa's electronics and appliance packs keep warranty months per product, start the warranty from the bill date, and answer "is this unit under warranty?" at the counter. Warranty claims are opened from the serial and closed as repaired, replaced, refunded or rejected, with costs booked on closing.`,
    alsoKnownAs: ['guarantee', 'warranty claim', 'service warranty'],
    related: ['GLOSSARY_TERM:serial-number', 'GLOSSARY_TERM:sales-return', 'INDUSTRY:electronics', 'INDUSTRY:appliances'],
    evidence: [EV.serials, EV.warrantyClaims],
  },
  {
    slug: 'tola',
    seoDescription: 'A tola is the traditional unit for weighing gold and silver, about 11.66 grams, and the unit in which gold rates are quoted in Pakistan.',
    term: 'Tola',
    definition: 'A tola is the traditional South Asian unit for weighing gold and silver, equal to about 11.66 grams, and the unit in which gold rates are quoted in Pakistan.',
    definitionRomanUrdu: 'Tola sone aur chandi ka riwayati wazan hai, taqreeban 11.66 gram, aur Pakistan me sone ka rate isi me bataya jata hai.',
    example: `A customer buys a 5 gram ring of 22 karat gold. The jeweller converts the day's per-tola rate into a per-gram rate, applies it to the gold weight and adds making charges.`,
    body: `## How it works

Sarafa markets and jewellers' associations announce the gold rate per tola (and per 10 grams) every day, usually for 24 karat, with lower rates for 22 and 21 karat. Jewellery itself is weighed in grams, mashas and rattis, so the jeweller converts between units on almost every bill. A tola is 12 mashas and a masha is 8 rattis.

Because the rate changes daily, a jeweller's stock is valued by weight, not by a fixed price. Bills should show the weight, karat, rate used and making charges separately, so the customer can check them and so old gold exchanges later are fair.

## In Nafaa

The Nafaa jewellery pack keeps the day's metal rates, shows weights in grams or tola, and prices a piece at the counter from today's rate, its weight and karat, plus making charges.`,
    alsoKnownAs: ['tola weight', 'gold tola'],
    related: ['GLOSSARY_TERM:making-charges', 'INDUSTRY:jewelry', 'BLOG_POST:gold-rate-pricing-jewelry-shops'],
    evidence: [EV.metalRates, EV.jewelryMeta],
  },
  {
    slug: 'making-charges',
    term: 'Making Charges',
    definition: 'Making charges are what a jeweller charges for the labour of making a piece, added to the value of the gold or silver in it.',
    definitionRomanUrdu: 'Making charges (banwai) woh raqam hai jo zewar banane ki mehnat ke liye sone ya chandi ki qeemat ke upar li jati hai.',
    example: `A pair of 22 karat earrings weighs 6 grams. The bill shows gold value at today's rate, making charges per gram for the design, and any stones priced separately.`,
    body: `## How it works

Jewellers in Pakistan charge making in three common ways: a fixed amount per piece, an amount per gram, or a percentage of the gold value. Intricate handmade work costs more than machine-made chains. Making charges are also where most negotiation happens, because the gold rate itself is public.

When a customer sells or exchanges jewellery back, making charges are normally not returned; only the gold is valued, often with a deduction. Explaining this on the bill avoids arguments years later. For the shop, making charges minus what the karigar is paid is the main profit on a piece.

## In Nafaa

The Nafaa jewellery pack stores making charges per gram, as a fixed amount or as a percentage on each piece, and custom orders track the karigar who makes them.`,
    alsoKnownAs: ['banwai', 'mazdoori', 'labour charges', 'making'],
    related: ['GLOSSARY_TERM:tola', 'GLOSSARY_TERM:trade-in', 'INDUSTRY:jewelry'],
    evidence: [EV.jewelryMeta, 'apps/web/src/industries/jewelry/pages/KarigarsPage.tsx'],
  },
  {
    slug: 'layaway',
    seoDescription: 'Layaway is reserving an item and paying for it in parts, then taking it home once it is fully paid. Here is how shops in Pakistan keep track of it.',
    imported: true,
    term: 'Layaway',
    definition: 'Layaway is reserving an item and paying for it in parts; the customer takes it home once it is fully paid.',
    definitionRomanUrdu: 'Layaway me gahak cheez rakhwa leta hai aur qiston me paise deta hai; poore paise dene par le jata hai.',
    example: `A bridal dress costing 180,000 rupees is held for a customer who pays 60,000 now and the rest over two months. The dress stays in the shop, marked reserved, until the last payment.`,
    body: `## How it works

Layaway is different from qist (installments). With qist the customer takes the item now and pays later, so the shop carries the risk. With layaway the shop keeps the item until it is fully paid, so the risk is only that the customer stops paying. Bridal wear, furniture and jewellery shops in Pakistan use it often, especially before weddings and Eid.

The rules should be written on the slip: the deadline, what happens if payments stop, and whether the advance is refundable. Reserved stock must not be sold to someone else by mistake, so it should show as held, not available.

## In Nafaa

The Nafaa garments pack has a layaway page: the item is held, advances post to khata and bills, and the record shows what is paid and what is left.`,
    alsoKnownAs: ['qist plan', 'reservation', 'lay-by', 'advance booking'],
    related: ['GLOSSARY_TERM:qist', 'GLOSSARY_TERM:hold-bill', 'INDUSTRY:garments'],
    evidence: [EV.layaway],
  },
];
