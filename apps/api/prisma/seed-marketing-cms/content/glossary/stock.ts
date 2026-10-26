/**
 * Glossary: stock, buying and making (batches and expiry, counts and losses,
 * reordering, purchases, transfers, valuation, documents and production).
 */

import { EV, type TermSpec } from './_term';

const STOCK_META = 'apps/web/src/modules/inventory/stock-report/components/meta.ts';
const LOW_SETTINGS = 'apps/web/src/modules/inventory/low-stock/components/SettingsModal.tsx';

export const stockTerms: TermSpec[] = [
  {
    slug: 'fifo',
    seoDescription: 'FIFO (First In, First Out) is the stock rule that the oldest stock is sold first. Here is how it affects shelf order, stock value and profit in a shop.',
    imported: true,
    term: 'FIFO (First In, First Out)',
    definition: 'FIFO is the stock rule that the oldest stock is sold first.',
    definitionRomanUrdu: 'FIFO ka matlab hai jo maal pehle aaya woh pehle bike.',
    example: `A kiryana receives a new carton of tea while half of last month's carton is still on the shelf. Staff put the new packs behind the old ones, so the older stock sells first.`,
    body: `## How it works

FIFO is both a shelf habit and an accounting method. On the shelf, it means older stock goes to the front so nothing sits until it spoils or fades. In accounting, it means the cost of each sale is taken from the oldest purchase still in stock, which matters when supplier prices keep rising, as they often do in Pakistan.

For goods with an expiry date, a stricter rule usually works better: FEFO, first expiry first out, because a newer delivery can sometimes expire sooner than older stock. FIFO is the right default for goods that age but carry no printed expiry, such as garments, shoes, hardware and stationery.

## In Nafaa

Nafaa saves the cost on each bill line at the time of sale, and for batch-tracked products it takes stock from the batch with the earliest expiry first, which is FEFO.`,
    alsoKnownAs: ['first in first out', 'pehle aaya pehle gaya'],
    related: ['GLOSSARY_TERM:fefo', 'GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:stock-valuation'],
    evidence: [EV.profitReport, EV.pharmacyPos],
  },
  {
    slug: 'fefo',
    seoDescription: 'FEFO (First Expiry, First Out) means the batch with the nearest expiry date is sold first, whatever order it arrived in. Pharmacies and food shops rely on it.',
    term: 'FEFO (First Expiry, First Out)',
    definition: 'FEFO is the stock rule that the batch with the nearest expiry date is sold or used first, whatever order it arrived in.',
    definitionRomanUrdu: 'FEFO ka matlab hai jis batch ki expiry sab se qareeb ho woh pehle bike ya istemal ho, chahe woh baad me aaya ho.',
    example: `A pharmacy receives a fresh delivery of a syrup expiring in May, but the stock already on the shelf expires in August. Under FEFO, the May batch is sold first.`,
    body: `## How it works

FEFO matters wherever goods expire: medicines, dairy, bakery, packaged food, cosmetics and agricultural chemicals. Distributors sometimes deliver short-dated stock, so arrival order alone is not enough. Selling the nearest expiry first keeps write-offs low and protects customers.

To work, FEFO needs every batch recorded with its expiry date when it is received, and the counter must take stock from the right batch. Expired stock should never block a sale of good stock, and should be pulled from the shelf and returned to the supplier or written off before it reaches a customer.

## In Nafaa

Batch-tracked products in Nafaa are sold from the branch's batches with the earliest valid expiry first; a named batch can be picked at the counter, and expired batches are taken last. Returns and voids put stock back into the batch it came from.`,
    alsoKnownAs: ['first expiry first out', 'first expired first out', 'expiry first'],
    related: ['GLOSSARY_TERM:fifo', 'GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:expiry-management', 'INDUSTRY:pharmacy'],
    evidence: [EV.pharmacyPos, EV.posBatch],
  },
  {
    slug: 'batch-tracking',
    seoDescription: 'Batch tracking records each purchase lot separately with its own expiry date, so a pharmacy or food shop knows which stock to sell first and what to return.',
    imported: true,
    term: 'Batch Tracking',
    definition: 'Batch tracking records each purchase lot separately with its own expiry date.',
    definitionRomanUrdu: 'Batch tracking me har khareed ka lot apni expiry date ke saath alag rakha jata hai.',
    example: `A pharmacy holds two batches of the same syrup: batch A123 expiring in March and B456 expiring in September. When DRAP recalls batch A123, the pharmacy sees at once how many bottles of it are left and which bills sold it.`,
    body: `## How it works

A batch (or lot) is a quantity made or received together, identified by the batch number on the pack. Tracking batches lets a business answer three questions a simple stock count cannot: which stock expires next, where a recalled batch went, and what each lot actually cost.

Pharmacies, food businesses, cosmetics and agri input dealers in Pakistan need it most. The work is at receiving: each purchase line must record the batch number and expiry. After that, sales, returns, transfers and write-offs should all move stock in and out of specific batches.

## In Nafaa

In Nafaa batches belong to a branch. Receiving a purchase creates or tops up batches at landed cost; sales take the earliest expiry first; returns and voids put stock back; transfers carry batches to the other branch; and expiry lists, the stock report and low stock read batches per branch.`,
    alsoKnownAs: ['lot tracking', 'batch and expiry', 'batch number tracking'],
    related: ['GLOSSARY_TERM:fefo', 'GLOSSARY_TERM:expiry-management', 'GLOSSARY_TERM:fifo', 'INDUSTRY:pharmacy', 'BLOG_POST:drap-compliance-pharmacy'],
    evidence: [EV.posBatch, EV.purchasesService, EV.transfers, EV.expiring],
  },
  {
    slug: 'expiry-management',
    seoDescription: 'Expiry management is tracking expiry dates, selling near-expiry stock in time and removing expired goods before they reach a customer.',
    term: 'Expiry Management',
    definition: 'Expiry management is the routine of tracking expiry dates, selling near-expiry stock in time, and removing or returning expired goods before they reach customers.',
    definitionRomanUrdu: 'Expiry management matlab expiry dates par nazar rakhna, qareeb-ul-expiry maal waqt par bechna, aur expire hone wala maal gahak tak pohanchne se pehle hatana ya wapas karna.',
    example: `Every Monday a mini-mart prints the list of items expiring within 60 days. Juices due next month go on a front shelf with a small offer, and two cartons of yoghurt past their date are taken off and recorded as written off.`,
    body: `## How it works

Expired stock is pure loss, and selling it damages trust and can break the law, especially for medicines. Good expiry management has four steps: record expiry at receiving, review a near-expiry list on a fixed day, act early (move to the front, offer, or return to the supplier while the return window is open), and record whatever is written off.

Many distributors in Pakistan accept near-expiry returns only within a set period before the date, so knowing what expires in the next two or three months matters more than knowing what already expired.

## In Nafaa

Nafaa's low stock page shows stock near expiry in each branch, with a setting for how many days ahead to warn. The pharmacy pack adds an expiring page with returns to the supplier or write-off, and damaged or expired goods go through the damage page with manager approval.`,
    alsoKnownAs: ['expiry tracking', 'near expiry', 'short expiry', 'expiry date management'],
    related: ['GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:fefo', 'GLOSSARY_TERM:wastage', 'GLOSSARY_TERM:purchase-return'],
    evidence: [EV.lowStock, LOW_SETTINGS, EV.expiring, EV.damage],
  },
  {
    slug: 'stock-take',
    term: 'Stock Take',
    definition: 'A stock take is a physical count of the goods on the shelves and in the store, compared with what the system says should be there.',
    definitionRomanUrdu: 'Stock take matlab shelf aur godown me maujood maal ko hath se ginna aur system ke hisaab se milana.',
    example: `A cosmetics shop counts its lipsticks on the first Sunday of the month. The system says 214, the shelves hold 206. The 8 missing pieces, worth 9,600 rupees at cost, are booked out and the gap is investigated.`,
    body: `## How it works

Every stock system drifts from reality: items are sold without scanning, received without entry, damaged or stolen. A stock take resets the numbers and, more importantly, shows how much is being lost. Full counts are disruptive, so many shops use cycle counts instead: count one category or aisle each week, so the whole shop is covered over a month.

Count when the shop is closed or quiet, freeze movements for the area being counted, and have a second person recount large differences. The value of the difference, not just the quantity, is what matters for the owner.

## In Nafaa

Nafaa's stock count works by search, scan or a whole category: staff type what is on the shelf and see the system figure, the difference and its value live. A summary is confirmed before saving, and each difference is booked in or out as an adjustment.`,
    alsoKnownAs: ['stock count', 'physical count', 'inventory count', 'cycle count', 'stocktaking'],
    related: ['GLOSSARY_TERM:shrinkage', 'GLOSSARY_TERM:stock-adjustment', 'GLOSSARY_TERM:stock-valuation'],
    evidence: [EV.stockCount, EV.adjustments],
  },
  {
    slug: 'shrinkage',
    term: 'Shrinkage',
    definition: 'Shrinkage is stock that is lost without being sold, through theft, damage, spoilage, counting mistakes or supplier short deliveries.',
    definitionRomanUrdu: 'Shrinkage woh maal hai jo bike baghair ghayab ho jata hai: chori, tootna, kharab hona, ginti ki ghalti ya supplier ka kam maal dena.',
    example: `A supermarket's books show 2.4 million rupees of stock at cost, but the quarterly count finds 2.33 million. Shrinkage is 70,000 rupees, about 3% of stock, mostly in small high-value items near the exit.`,
    body: `## How it works

Shrinkage is usually measured as a percentage of sales or stock value over a period. Its causes split into four groups: customer theft, staff theft, admin errors (wrong entries, wrong units, unrecorded returns) and supplier issues (short deliveries accepted without checking). In many shops the admin errors are as large as the theft.

Reducing it starts with measuring it: regular counts, damage recorded as it happens, deliveries checked against the purchase, and high-value items kept near the counter. Compare shrinkage by category and branch; a sudden rise in one place points to the cause.

## In Nafaa

Every stock count in Nafaa books the difference and shows what was gained and lost in value. Damage and wastage are reported separately with manager approval, and the stock movements page shows every change to a product's stock with who made it.`,
    alsoKnownAs: ['stock loss', 'inventory shrink', 'pilferage'],
    related: ['GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:wastage', 'GLOSSARY_TERM:cash-over-short', 'GLOSSARY_TERM:stock-adjustment'],
    evidence: [EV.stockCount, EV.damage, EV.movements],
  },
  {
    slug: 'reorder-level',
    term: 'Reorder Level',
    definition: 'A reorder level is the stock quantity at which a new order should be placed, so stock arrives before the shelf runs empty.',
    definitionRomanUrdu: 'Reorder level stock ki woh had hai jis par naya order dena chahiye, taake shelf khali hone se pehle maal aa jaye.',
    example: `A shop sells about 6 bottles of a shampoo a day and the distributor delivers 4 days after ordering. Keeping 2 days of safety stock, the reorder level is 6 times 6, which is 36 bottles.`,
    body: `## How it works

The simple formula is daily sales multiplied by supplier lead time, plus safety stock for busy days and late deliveries. Setting it by gut feel leads to two costly outcomes: running out of fast sellers (lost sales that never show on any report) or overstocking slow ones (cash stuck on the shelf).

Reorder levels should change with the season. Sales of cold drinks, school stationery and Ramadan items swing sharply, so a level based on the last 30 days of sales is better than a fixed number set once. Group the reorder list by supplier, since one order goes to one distributor.

## In Nafaa

Each product in Nafaa can have its own low stock limit. The low stock page also works out how many days each item lasts at its recent selling rate, flags what runs out soon, estimates lost sales on items already out, and suggests a quantity to order for the chosen number of days.`,
    alsoKnownAs: ['reorder point', 'minimum stock', 'low stock alert', 'safety stock'],
    related: ['GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:abc-analysis', 'GLOSSARY_TERM:inventory-turnover'],
    evidence: [EV.priceStep, EV.lowStock, LOW_SETTINGS, EV.reorder],
  },
  {
    slug: 'landed-cost',
    seoDescription: 'Landed cost is the full cost of getting goods into your shop: purchase price plus freight, loading, duties and other charges, less any discount.',
    term: 'Landed Cost',
    definition: 'Landed cost is the full cost of getting goods into your shop: the purchase price plus freight, loading, duties, taxes that cannot be claimed back, and other charges, less any discount.',
    definitionRomanUrdu: 'Landed cost maal ko dukaan tak laane ki poori qeemat hai: khareed ki qeemat jama kiraya, loading, duty aur doosre kharchay, minus discount.',
    example: `A shop buys 100 pieces at 300 rupees each from a Karachi supplier. Freight to Multan is 2,000 rupees and loading 500. Landed cost is 32,500 for 100, so 325 rupees a piece, not 300.`,
    body: `## How it works

If freight and other charges are not added to cost, every margin calculation is wrong, and the shop may price items below what they really cost. This matters most for goods bought from other cities, imports and heavy or bulky items such as cement, tiles and furniture, where transport is a large share of the price.

Spread the charges across the lines of the purchase, usually by value or by quantity, and use the landed cost as the item's cost price. Supplier discounts work the other way: they reduce landed cost.

## In Nafaa

When a purchase is entered in Nafaa, freight, tax and discount on the bill are spread across its lines, so each unit's cost is its landed cost. Batches are created at that cost, and purchase returns lower the supplier's balance by the same landed cost.`,
    alsoKnownAs: ['total cost', 'cost including freight', 'asal laagat'],
    related: ['GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:markup', 'GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:grn'],
    evidence: [EV.purchaseEditor, EV.purchasesService],
  },
  {
    slug: 'purchase-order',
    term: 'Purchase Order (PO)',
    definition: 'A purchase order is a document a buyer sends a supplier listing the items, quantities and agreed prices it wants to buy.',
    definitionRomanUrdu: 'Purchase order woh document hai jo khareedar supplier ko bhejta hai, jis me items, tadaad aur tay shuda qeemat likhi hoti hai.',
    example: `A hardware store sends its paint distributor a PO on WhatsApp for 40 tins of white emulsion and 20 of primer at the agreed rates. When the truck arrives, staff check the delivery against the PO.`,
    body: `## How it works

Many Pakistani shops order by phone or by telling the distributor's salesman what is needed, and nothing is written down. A purchase order fixes the quantity and rate in advance, so short deliveries, wrong items and price changes are caught at the door instead of at payment time.

A PO is not a purchase yet: nothing enters stock until goods arrive. When they arrive, the delivery is received against the PO, fully or partly, and the rest stays open. Keep open POs visible so staff know what is already on the way and do not order twice.

## In Nafaa

In Nafaa a purchase can be saved as an order that puts nothing in stock until it is received. The reorder list turns suggested quantities into purchase orders grouped by supplier and branch, which can be sent on WhatsApp or printed, and orders can be received in parts.`,
    alsoKnownAs: ['PO', 'order to supplier', 'supplier order'],
    related: ['GLOSSARY_TERM:grn', 'GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:accounts-payable', 'PRODUCT:purchasing'],
    evidence: [EV.purchaseEditor, EV.purchasesApi, EV.reorder],
  },
  {
    slug: 'grn',
    term: 'GRN (Goods Received Note)',
    definition: 'A goods received note records what actually arrived from a supplier, checked against the purchase order, before the stock is added and the bill is paid.',
    definitionRomanUrdu: 'GRN woh record hai jo batata hai ke supplier se asal me kya maal aaya, purchase order se mila kar, stock me daalne aur payment se pehle.',
    example: `A pharmacy ordered 50 boxes of a tablet; 46 arrive, two with damaged packs. The GRN records 44 good boxes received, with batch and expiry, and the supplier bill is adjusted to 44.`,
    body: `## How it works

The GRN is the check between ordering and paying. Without it, shops pay the supplier's bill as written, including items that never arrived or arrived damaged. In a three-way match, the purchase order, the GRN and the supplier's invoice should agree before payment is made.

Receiving is also the right moment to record batch numbers, expiry dates, serials and IMEIs, because once goods are on the shelf nobody goes back to note them. If the delivery is partial, the rest of the order stays open.

## In Nafaa

Receiving a purchase order in Nafaa records what actually arrived; an order can be received in parts and shows as partial until complete. Receiving adds stock at landed cost and creates batches with their expiry for batch-tracked items.`,
    alsoKnownAs: ['goods received note', 'goods receipt', 'receiving', 'maal wasooli'],
    related: ['GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:landed-cost', 'GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:purchase-return'],
    evidence: [EV.purchasesApi, EV.purchasesService],
  },
  {
    slug: 'purchase-return',
    term: 'Purchase Return',
    definition: 'A purchase return is goods sent back to the supplier because they were damaged, wrong, short-dated or unsold under an agreed return arrangement.',
    definitionRomanUrdu: 'Purchase return matlab maal supplier ko wapas bhejna kyun ke woh kharab, ghalat, qareeb-ul-expiry ya tay shuda shart par na bika ho.',
    example: `A bookshop returns 30 unsold copies of a guidebook to the publisher after the exam season, as agreed. Stock falls by 30 and the publisher's balance falls by their cost.`,
    body: `## How it works

Every purchase return has two sides: stock goes out and the amount owed to the supplier goes down (or the supplier refunds). Recording only one side causes trouble. If stock leaves but the supplier balance is not reduced, the shop overpays; if the balance is reduced but stock is not, the shelf count is wrong.

Agree return terms with each supplier in advance: which items can come back, the time limit, and at what value. Keep the supplier's acknowledgement with the return, especially for near-expiry medicines and food.

## In Nafaa

A purchase return in Nafaa takes the goods out of stock, including from their batches, and lowers the supplier's balance by their landed cost. The purchases list filters bills with returns.`,
    alsoKnownAs: ['return to supplier', 'RTV', 'return to vendor', 'supplier return'],
    related: ['GLOSSARY_TERM:debit-note', 'GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:expiry-management', 'GLOSSARY_TERM:grn'],
    evidence: [EV.purchasesService, EV.purchasesApi],
  },
  {
    slug: 'stock-transfer',
    term: 'Stock Transfer',
    definition: 'A stock transfer moves goods from one branch, store or warehouse of the same business to another, reducing stock at one place and adding it at the other.',
    definitionRomanUrdu: 'Stock transfer matlab ek hi karobar ki ek branch ya godown se doosri jagah maal bhejna; ek jagah stock kam aur doosri jagah zyada hota hai.',
    example: `A shoe chain sends 24 pairs of a slow style from its Saddar branch to its DHA branch, where the size sells better. The DHA manager confirms 23 pairs arrived and one carton was opened, so the shortage is recorded.`,
    body: `## How it works

Moving stock between branches is normal, but it is a common place for stock to go missing. A transfer should have two steps: the sending branch records what left, and the receiving branch records what arrived. Anything not received is "on the way" until it is, and differences are shortages to investigate.

Treat transfers at cost, not selling price, since no sale happened. For items with batches, serials or IMEIs, the transfer must carry those details too, so the receiving branch can sell and warranty them correctly.

## In Nafaa

Transfers in Nafaa show what is coming in, what went out, what is still on the way and short deliveries. Sending covers products in any unit and variant, IMEI phones and electronics serials, and batches move with their expiry. Staff tied to a branch only see transfers that touch it.`,
    alsoKnownAs: ['branch transfer', 'inter-branch transfer', 'stock movement', 'maal muntaqli'],
    related: ['GLOSSARY_TERM:multi-branch', 'GLOSSARY_TERM:stock-adjustment', 'GLOSSARY_TERM:batch-tracking'],
    evidence: [EV.transfers],
  },
  {
    slug: 'stock-adjustment',
    term: 'Stock Adjustment',
    definition: 'A stock adjustment is a manual correction to a product\'s stock quantity, with a reason, when the system figure does not match reality.',
    definitionRomanUrdu: 'Stock adjustment kisi product ke stock me hath se durusti hai, wajah ke saath, jab system ka figure asal se na mile.',
    example: `After a count, a shop finds 3 extra packs of a detergent that were received but never entered. The owner adds 3 with the reason "found in godown", and the change shows in the item's history.`,
    body: `## How it works

Adjustments are necessary but risky, because they can hide theft or mistakes. Every adjustment should record who made it, when, the quantity and the reason, and the value at cost. Only senior staff should be able to make them, and the owner should review adjustments regularly, especially large ones or repeated ones on the same item.

Use the right tool for each case: a count for counting differences, the damage process for broken or expired goods, a transfer for moving stock, and an adjustment only for what is left.

## In Nafaa

Stock adjustments in Nafaa record the reason and value and appear in each product's stock movements. Changing stock through bulk import or bulk edit is posted as an adjustment too, and needs the stock adjustments permission.`,
    alsoKnownAs: ['inventory adjustment', 'stock correction', 'stock write-off'],
    related: ['GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:shrinkage', 'GLOSSARY_TERM:wastage', 'GLOSSARY_TERM:opening-stock'],
    evidence: [EV.adjustments, EV.movements, EV.productImport],
  },
  {
    slug: 'dead-stock',
    seoDescription: 'Dead stock is inventory that has not sold for a long time and is unlikely to sell at its normal price. Here is how to spot it early and clear it.',
    term: 'Dead Stock',
    definition: 'Dead stock is inventory that has not sold for a long time and is unlikely to sell at its normal price.',
    definitionRomanUrdu: 'Dead stock woh maal hai jo kaafi arse se nahi bika aur normal qeemat par bikne ka imkaan kam hai.',
    example: `A mobile accessories shop finds 140 phone covers for models no longer sold, untouched for 180 days. At cost they hold 42,000 rupees of cash. The owner bundles them as free gifts with screen protectors to clear the shelf.`,
    body: `## How it works

Dead stock costs more than it seems: it holds cash, takes shelf space, and often loses value further as fashions, models and seasons change. Most shops have more than they think, because nobody looks at what did not sell.

Review it on a fixed rhythm, for example items with no sale in 60, 90 or 180 days. Then act: return to the supplier if possible, transfer to a branch where it sells, bundle with fast sellers, mark down, or write off. Prevention is better: buy smaller quantities of new or seasonal items until they prove themselves.

## In Nafaa

The Nafaa stock report marks dead stock (no sale for a period you choose: 30, 60, 90 or 180 days) and slow-moving stock separately from fast sellers, with the value held in each.`,
    alsoKnownAs: ['non-moving stock', 'slow-moving stock', 'obsolete stock', 'phansa hua maal'],
    related: ['GLOSSARY_TERM:abc-analysis', 'GLOSSARY_TERM:inventory-turnover', 'GLOSSARY_TERM:working-capital', 'GLOSSARY_TERM:combo-deal'],
    evidence: [STOCK_META, EV.stockReport],
  },
  {
    slug: 'abc-analysis',
    seoDescription: 'ABC analysis sorts products into A, B and C groups by their share of sales or profit, so a shop knows which few items deserve the closest watch.',
    term: 'ABC Analysis',
    definition: 'ABC analysis sorts products into three groups by their share of sales or profit: A for the few that bring most of it, B for the middle, and C for the many that bring little.',
    definitionRomanUrdu: 'ABC analysis products ko teen groups me baantti hai: A jo zyada sale ya profit laate hain, B darmiyan wale, aur C jo bohat se hain magar kam laate hain.',
    example: `A grocery store with 3,000 items finds that about 400 of them bring 75% of its gross profit. Those A items get weekly counts and are never allowed to run out; C items are reordered only when nearly finished.`,
    body: `## How it works

In most shops a small share of products earns most of the money. ABC analysis makes that visible so effort goes where it matters. Sort products by sales or gross profit for the last few months, then add up from the top: items that make up roughly the first 70 to 80% are A, the next 15 to 20% are B, and the rest are C.

Use it to decide count frequency, safety stock, shelf position and how much negotiation each supplier deserves. Review the groups each season, since a C item in winter can be an A item in summer.

## In Nafaa

Nafaa's profit report lists top earners against top sellers by product, category, brand and supplier for any period, which is the list an ABC grouping is built from; Nafaa does not label products A, B or C itself.`,
    alsoKnownAs: ['ABC classification', 'Pareto analysis', '80/20 rule'],
    related: ['GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:gross-profit'],
    evidence: [EV.profitReport],
  },
  {
    slug: 'inventory-turnover',
    seoDescription: 'Inventory turnover is how many times a business sells through its average stock in a period: cost of goods sold divided by average stock at cost.',
    term: 'Inventory Turnover',
    definition: 'Inventory turnover is how many times a business sells through its average stock in a period, calculated as cost of goods sold divided by average stock at cost.',
    definitionRomanUrdu: 'Inventory turnover batata hai ke ek muddat me average stock kitni baar bik kar dobara aaya: COGS taqseem average stock (cost par).',
    example: `A kiryana's cost of goods sold for the year is 24 million rupees and its average stock at cost is 2 million. Turnover is 12 times a year, so stock sits about a month on average.`,
    body: `## How it works

Turnover shows how hard stock is working. A higher number means less cash tied up for the same sales. Grocery and fresh food turn fast; furniture, jewellery and hardware turn slowly, so compare a shop with itself over time and with similar businesses, not with a fixed target.

The same idea expressed in days is often easier: 365 divided by turnover gives the average days of stock. Look at it by category. A shop with good overall turnover may still have one category that hardly moves and hides a lot of cash.

## In Nafaa

Nafaa's low stock page shows how many days each item's stock will last at its recent selling rate, and the stock report shows stock value with dead, slow and fast movers, which together show where stock turns slowly.`,
    alsoKnownAs: ['stock turnover', 'stock turn', 'inventory turns', 'days of stock'],
    related: ['GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:working-capital', 'GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:stock-valuation'],
    evidence: [EV.lowStock, STOCK_META],
  },
  {
    slug: 'stock-valuation',
    seoDescription: 'Stock valuation is the money value of the inventory a business holds on a date, usually counted at cost. Here is how shops in Pakistan work it out.',
    term: 'Stock Valuation',
    definition: 'Stock valuation is the money value of the inventory a business holds on a date, usually counted at cost.',
    definitionRomanUrdu: 'Stock valuation kisi tareekh par dukaan me maujood maal ki raqam hai, aam taur par cost par gini jati hai.',
    example: `On 30 June a pharmacy's stock is valued at 3.1 million rupees at cost and 3.8 million at selling price. The cost figure goes in the year-end accounts; the selling figure shows the profit still on the shelf.`,
    body: `## How it works

Stock is usually a shop's biggest asset after the premises, so its value matters for the balance sheet, for bank finance, for insurance and for working out profit, since closing stock is part of the cost of goods sold calculation. Accounting rules value stock at cost, or at the lower of cost and what it can be sold for if items are damaged or obsolete.

Which cost is used matters when prices change: FIFO, weighted average or the actual cost of each batch. Whatever method is used, it should stay consistent from year to year.

## In Nafaa

The Nafaa stock report shows stock and its value by branch, with filters for items in stock, low, out, dead, slow, near expiry and items with no cost entered, so missing costs do not distort the value.`,
    alsoKnownAs: ['inventory valuation', 'stock value', 'closing stock value'],
    related: ['GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:fifo', 'GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:inventory-turnover'],
    evidence: [EV.stockReport, STOCK_META],
  },
  {
    slug: 'wastage',
    seoDescription: 'Wastage is stock that is damaged, spoilt, expired or used up without being sold, and must be written off. Here is how shops record and reduce it.',
    term: 'Wastage',
    definition: 'Wastage is stock that is damaged, spoilt, expired or used up without being sold, and must be written off.',
    definitionRomanUrdu: 'Wastage woh maal hai jo toot jaye, kharab ho, expire ho ya bike baghair zaya ho jaye aur use khaate se nikalna pare.',
    example: `A bakery records at closing: 18 buns unsold and stale, 2 cakes dropped, 3 kg of cream spoilt during a power cut. The wastage is valued at cost and shows in the month's loss report.`,
    body: `## How it works

Some wastage is unavoidable in food, bakery, dairy, meat, flowers and pharmacy. The problem is wastage that is never recorded, which makes stock wrong and hides how much money is being lost. Load-shedding without backup cooling is a common cause in Pakistan.

Record wastage as it happens, with a reason, the quantity and who reported it; have a manager approve it so it cannot hide theft; and review it by product and reason. Patterns tell you what to change: smaller batches, better storage, earlier offers, or a different supplier.

## In Nafaa

The Nafaa damage and wastage page lets staff report damaged, expired or spoilt goods. A manager approves or rejects each report; approved lines leave stock and show on the adjustments page, and analytics show where the loss comes from.`,
    alsoKnownAs: ['waste', 'damage', 'spoilage', 'write-off', 'zaya'],
    related: ['GLOSSARY_TERM:shrinkage', 'GLOSSARY_TERM:expiry-management', 'GLOSSARY_TERM:food-cost', 'GLOSSARY_TERM:stock-adjustment'],
    evidence: [EV.damage],
  },
  {
    slug: 'opening-stock',
    term: 'Opening Stock',
    definition: 'Opening stock is the quantity and value of goods a business has at the start of a period, or when it starts using a new system.',
    definitionRomanUrdu: 'Opening stock woh maal hai jo kisi muddat ke shuru me, ya naya system shuru karte waqt, dukaan me maujood ho.',
    example: `A shop moving from a paper register to software counts everything on the first night: 1,860 items worth 4.2 million rupees at cost. That count is entered as opening stock, and every sale and purchase after it builds on it.`,
    body: `## How it works

When switching to a POS, the opening stock is the foundation: if it is wrong, every report after it is wrong. Count carefully, use the right units, and enter cost prices too, otherwise profit reports will show items with no cost. It is fine to start with the fast-moving items and add the rest category by category.

In accounting, the opening stock of one period is the closing stock of the previous one, and both feed the cost of goods sold calculation.

## In Nafaa

Products can be brought into Nafaa through bulk import with an editable preview and paste from Excel. Opening stock is posted as an opening balance in the chosen branch, and importing products that already exist can set or add stock, posted as an adjustment.`,
    alsoKnownAs: ['opening balance', 'opening inventory', 'shuruati stock'],
    related: ['GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:stock-valuation', 'GLOSSARY_TERM:stock-adjustment'],
    evidence: [EV.productImport],
  },
  {
    slug: 'delivery-challan',
    term: 'Delivery Challan',
    definition: 'A delivery challan is a document that goes with goods being delivered, listing the items and quantities, which the receiver signs to confirm delivery.',
    definitionRomanUrdu: 'Delivery challan woh parchi hai jo maal ke saath jati hai, jis me items aur tadaad hoti hai aur lene wala sign kar ke wasooli ki tasdeeq karta hai.',
    example: `A hardware store sends 200 bags of cement to a building site in three trips. Each truck carries a challan; the site supervisor signs each one, and the store bills the contractor once all three are signed.`,
    body: `## How it works

A challan is not a bill: it proves that goods were handed over. It is used in construction supply, wholesale, furniture and distribution in Pakistan, where goods often go out before the invoice, or in several deliveries against one order.

Signed challans protect the seller when a customer later says goods were not received, and help the buyer check deliveries against what was ordered. Number them, keep the signed copy, and match them to the invoice before billing so nothing is billed twice or forgotten.

## In Nafaa

The Nafaa hardware pack has delivery challans for goods going to sites: open challans with today's and late ones first, part-delivered challans with goods still to send, delivered and cancelled. Challans print and export to CSV.`,
    alsoKnownAs: ['challan', 'delivery note', 'gate pass', 'dispatch note'],
    related: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:quotation', 'INDUSTRY:hardware'],
    evidence: [EV.challans],
  },
  {
    slug: 'quotation',
    term: 'Quotation',
    definition: 'A quotation is a written offer to supply goods or services at stated prices, valid for a set time, given before the customer decides to buy.',
    definitionRomanUrdu: 'Quotation ek likhi hui pesh-kash hai jis me saman ya service ki qeemat aur muddat likhi hoti hai, gahak ke faisle se pehle.',
    example: `A contractor asks three hardware stores to quote for the plumbing of a house. One store sends a quote for pipes, fittings and taps valid for 7 days; when the contractor asks for cheaper taps, the store sends a revised quote.`,
    body: `## How it works

Quotations are common in hardware, electrical, furniture, IT, printing and services. A good quote lists each item with quantity and rate, any delivery or installation charge, taxes if registered, the validity period and payment terms. Validity matters in Pakistan because prices of steel, cement, copper and imported goods change often.

Track quotes as a pipeline: sent, revised, accepted, lost. A quote that turns into an order should become the bill without retyping, so prices agreed with the customer are the prices charged.

## In Nafaa

The Nafaa hardware pack creates quotations with revisions and keeps their history, and the services pack has quotes for jobs.`,
    alsoKnownAs: ['quote', 'estimate', 'proforma', 'rate list'],
    related: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:delivery-challan', 'INDUSTRY:hardware', 'INDUSTRY:services-biz'],
    evidence: [EV.quotations, 'apps/web/src/industries/services-biz/pages/QuotesPage.tsx'],
  },
  {
    slug: 'consignment',
    term: 'Consignment',
    definition: 'Consignment is an arrangement where goods are placed in a shop to sell, but the owner of the goods is paid only after they are sold.',
    definitionRomanUrdu: 'Consignment me maal dukaan par bechne ke liye rakha jata hai magar maal ke maalik ko paise sirf bikne ke baad milte hain.',
    example: `A customer leaves his used phone at a mobile shop to sell for 45,000 rupees. The shop displays it, sells it a week later, keeps its agreed commission and pays the customer the rest.`,
    body: `## How it works

Consignment lets a shop offer more products without paying for stock up front. In Pakistan it is common for used phones, handicrafts, books from small publishers, clothing from home-based designers, and some FMCG trials. The risk shifts: the shop holds goods it does not own, so it must keep them safe and report sales honestly.

Keep consigned goods separate in stock, record who owns each item and the agreed price or commission, and settle with owners on a fixed schedule. Unsold goods go back after an agreed period.

## In Nafaa

The Nafaa mobile pack can record a used phone as sold on the customer's behalf, so the shop pays the customer when the phone sells.`,
    alsoKnownAs: ['sale or return', 'consignment stock', 'amanat'],
    related: ['GLOSSARY_TERM:trade-in', 'GLOSSARY_TERM:imei', 'INDUSTRY:mobile-shop'],
    evidence: [EV.mobileMeta],
  },
  {
    slug: 'bom',
    term: 'BOM (Bill of Materials)',
    definition: 'A bill of materials is the list of raw materials and quantities needed to make one unit of a product, used to plan production and work out its cost.',
    definitionRomanUrdu: 'BOM ek product banane ke liye zaroori kacha maal aur us ki miqdar ki list hai, jis se production plan aur cost nikali jati hai.',
    example: `A bakery's BOM for one kg of sponge cake: 400 g flour, 350 g sugar, 6 eggs, 100 g butter and a baking pan liner. At today's rates the materials cost 610 rupees, before gas and labour.`,
    body: `## How it works

Restaurants call it a recipe, factories call it a BOM, but the idea is the same. With it, a business can cost a product accurately, see how much raw material a production plan needs, and check whether actual usage matches what should have been used. Any gap is wastage, theft or a recipe that staff are not following.

Keep BOMs up to date when recipes or pack sizes change, and update costs as raw material prices rise. When a finished item is made or sold, its materials should leave stock.

## In Nafaa

Nafaa bakeries keep raw materials with recipe costing at today's rates, and restaurant recipes show plate cost, food cost percentage and how many plates the stock still covers. Raw materials used are compared with purchases and stock.`,
    alsoKnownAs: ['bill of materials', 'recipe', 'formula', 'material list'],
    related: ['GLOSSARY_TERM:recipe-costing', 'GLOSSARY_TERM:work-order', 'GLOSSARY_TERM:food-cost', 'SOLUTION:manufacturing'],
    evidence: [EV.ingredients, EV.recipes],
  },
  {
    slug: 'work-order',
    seoDescription: 'A work order is an instruction to carry out a job, such as a repair, installation or production run, with the work, parts and person responsible.',
    term: 'Work Order',
    definition: 'A work order is an instruction to carry out a specific job, such as a repair, an installation or a production run, with the work, parts and person responsible.',
    definitionRomanUrdu: 'Work order ek khaas kaam ki hidayat hai, jaise marammat, installation ya production, jis me kaam, parts aur zimmedar shakhs likha hota hai.',
    example: `An AC service company receives a call for a split AC that is not cooling. A work order is opened with the address, assigned to a technician, and updated with the gas refill and capacitor used before the bill is made.`,
    body: `## How it works

Work orders (also called job cards) keep track of work that takes time and passes through several hands: repair shops, workshops, tailoring, printing, installation and small manufacturing. Each order records what the customer asked for, any advance paid, who is doing it, parts used, the current status and the promised date.

The main benefits are fewer forgotten jobs, parts that are billed instead of lost, and clear technician commission. Customers also get a slip they can bring back, which ends "where is my item?" arguments.

## In Nafaa

The Nafaa services pack keeps job cards from intake with an advance through booked, technician on the way, waiting for parts or approval, and ready for the bill, with parts taken from stock and technician commission. Bakeries plan production for each business day.`,
    alsoKnownAs: ['job card', 'job order', 'production order', 'service ticket'],
    related: ['GLOSSARY_TERM:bom', 'GLOSSARY_TERM:warranty', 'INDUSTRY:services-biz', 'INDUSTRY:autoparts'],
    evidence: ['apps/web/src/industries/services-biz/pages/JobsListPage.tsx', EV.production],
  },
];
