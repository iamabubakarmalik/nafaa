/**
 * Stock and kitchen tools: reorder level, barcode generator and food cost.
 */

import { src, type ToolSpec } from './_tool';

const WIKI_REORDER = src('Reorder point', 'https://en.wikipedia.org/wiki/Reorder_point', 'Wikipedia');
const WIKI_EAN = src('International Article Number (EAN-13 structure and check digit)', 'https://en.wikipedia.org/wiki/International_Article_Number', 'Wikipedia');
const WIKI_GS1_PREFIX = src('List of GS1 country codes (200-299: restricted circulation numbers)', 'https://en.wikipedia.org/wiki/List_of_GS1_country_codes', 'Wikipedia');
const WIKI_CODE128 = src('Code 128', 'https://en.wikipedia.org/wiki/Code_128', 'Wikipedia');

export const reorderLevel: ToolSpec = {
  slug: 'reorder-level-calculator',
  toolKey: 'reorder-level-calculator',
  kind: 'Reorder level',
  title: 'Reorder Level Calculator',
  summary:
    'Find the stock level at which to place your next order, so a product does not run out while the supplier delivers. Enter what you sold, the supplier\'s lead time and a safety margin; add today\'s stock to see whether to order now and how much.',
  seoTitle: 'Reorder Level Calculator: When to Order Stock (Free)',
  seoDescription: 'Free reorder level calculator for shops: average daily sale × lead time + safety stock, with days of stock left and a suggested order quantity.',
  focusKeyword: 'reorder level calculator',
  facts: [
    ['Reorder level', 'Average daily sale × lead time + safety stock'],
    ['Safety stock (simple)', 'Average daily sale × extra days'],
    ['Safety stock (from a busy week)', 'Most sold in a day × longest lead time − usual lead-time sale'],
    ['Order quantity', 'Enough for the lead time and the days you choose, topped up to safety stock'],
  ],
  romanUrdu: 'Maal kab mangwana hai, ye yahan nikalein: roz ki Sale, supplier ke maal pohanchane ke din aur thora extra. Abhi ka Stock likhein to pata chalega ke abhi order karna hai ya nahi, aur kitna.',
  steps: [
    ['Enter what you sold', 'Quantity sold and over how many days: for example 240 packets in 30 days. Use a normal month, not Ramadan or a sale week.'],
    ['Enter the lead time', 'Days from placing the order to having the stock on your shelf, including the day the salesman visits and any delay at the market.'],
    ['Choose safety stock', '**Extra days of sale** is simplest. **From a busy week** uses the most you ever sold in a day and the longest the supplier has taken.'],
    ['Add stock on hand', 'Optional. You see how many days it lasts, whether to order now, and a suggested quantity to cover the lead time plus the days you choose.'],
  ],
  sections: [
    `## How it's calculated

During the lead time you keep selling, so the order must go out while you still have enough to last until delivery. That amount is **average daily sale × lead time**. Sales and deliveries vary, so a **safety stock** is added on top:

- Simple: safety stock = average daily sale × extra days you want to keep
- From a busy week: safety stock = (most sold in one day × longest lead time) − (average daily sale × usual lead time)

**Reorder level = average daily sale × lead time + safety stock.** When stock falls to that number, you order. This is the standard reorder point method used in stock control (see the source below).`,
    `## Worked example

You sold 240 packets of a biscuit in 30 days: **8 a day**. The distributor delivers 4 days after you order, and you want 3 extra days as safety.

- Sold during the lead time = 8 × 4 = **32**
- Safety stock = 8 × 3 = **24**
- Reorder level = 32 + 24 = **56 packets**

You have 70 on the shelf, which lasts about 8 days, so you do not order yet. When you do, ordering for 15 days after delivery means 8 × (4 + 15) + 24 − 70 = **106 packets**. With the busy-week method (14 sold on the best day, 6 days on the slowest delivery) safety stock becomes 84 − 32 = 52 and the reorder level 84.

Doing this for hundreds of products by hand is not practical. Nafaa's [low stock list](/product/inventory) works out days of cover for every product from its own sales and suggests the quantity to order, grouped by supplier, so you can turn it into a [purchase order](/product/purchasing) in one step.`,
  ],
  sources: [WIKI_REORDER],
  faqs: [
    { q: 'What is the difference between reorder level and minimum stock?', a: 'Minimum stock, or safety stock, is the cushion you never want to go below. Reorder level is higher: it is the safety stock plus what you will sell while the order is on its way. If you order only when you reach minimum stock, you will dip into that cushion on every delivery. Set your low stock alert at the reorder level, not at the minimum.' },
    { q: 'How often should I recalculate reorder levels?', a: 'At least every season, and whenever a supplier changes delivery days. Sales of many items change sharply around Ramadan, Eid, school openings and winter, so a level set in a quiet month leaves you short in a busy one. A system that recalculates from recent sales every day avoids the problem; with this calculator, redo your top sellers each month.' },
    { q: 'Should every product have the same safety days?', a: 'No. Give more safety days to items customers will not wait for and that you cannot borrow from a nearby shop, such as milk, bread, cooking oil and medicines, and to items from slow or unreliable suppliers. Slow-moving or expensive items can carry fewer days, because extra stock ties up cash and shelf space.' },
  ],
  relations: ['GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:purchase-order', 'TEMPLATE:stock-take-sheet', 'TEMPLATE:purchase-order-template', 'PRODUCT:inventory', 'PRODUCT:purchasing'],
  evidence: ['apps/web/src/modules/inventory/low-stock/api.ts', 'apps/web/src/modules/inventory/low-stock/components/OrderModal.tsx', 'apps/web/src/modules/inventory/products/import/columns.ts'],
  factNote: 'Reorder point formula checked against Wikipedia "Reorder point" (curl 200, 26 Oct 2026). Nafaa claims: low stock lines with days of cover and suggested order quantity, order per supplier (inventory/low-stock api.ts, OrderModal.tsx).',
  sortOrder: 50,
};

export const barcode: ToolSpec = {
  slug: 'barcode-generator',
  toolKey: 'barcode-generator',
  kind: 'Barcode',
  title: 'Barcode Generator',
  summary:
    'Make EAN-13 or Code 128 barcodes for your products and print them as a label sheet on A4, or download them as SVG for packaging. Check digits are worked out for you, in-store numbers can be filled in, and nothing you type leaves your browser.',
  seoTitle: 'Free Barcode Generator: EAN-13 & Code 128 Label Sheet',
  seoDescription: 'Free barcode generator for shops in Pakistan: EAN-13 and Code 128, automatic check digit, A4 label sheet to print and SVG download. No sign-up.',
  focusKeyword: 'barcode generator',
  facts: [
    ['Types', 'EAN-13 (retail packs) and Code 128 (SKUs, letters and numbers)'],
    ['EAN-13 check digit', 'Added for 12 digits, verified for 13'],
    ['Output', 'Printable A4 label sheet (3, 4 or 5 per row) and SVG download'],
    ['In-store numbers', 'Fills numbers from the 200-299 restricted-circulation range'],
  ],
  romanUrdu: 'Apne products ke liye EAN-13 ya Code 128 barcode banayein aur A4 sheet par label print karein. Aakhri check digit khud lag jata hai, aur aap ka data browser se bahar nahi jata.',
  steps: [
    ['Choose the type', '**EAN-13** for products sold in a shop, the type most scanners and supermarkets read. **Code 128** for your own SKU codes, shelf labels and anything with letters.'],
    ['Type the codes, one per line', 'Add a comma and a label to print a name or price above the bars: `200000000101, Chai 190g`. For EAN-13, type 12 digits and the check digit is added.'],
    ['No numbers yet? Fill in-store numbers', 'The **Add 10 in-store numbers** button fills numbers from the 200-299 range for goods you pack and label yourself.'],
    ['Set copies and labels per row, then print', 'Print at 100% scale on A4 sticker paper or plain paper, or save as PDF. Scan one label to test before you print a full sheet.'],
  ],
  sections: [
    `## How EAN-13 and Code 128 work

An **EAN-13** number has 12 data digits and a 13th check digit. To get the check digit, multiply the digits alternately by 1 and 3 from the left, add them up, and take the amount needed to reach the next multiple of 10. For 200000000101 the weighted sum is 8, so the check digit is 2 and the full number is **2000000001012**. A scanner recomputes this digit on every scan, which is how it catches a misread.

The first three digits are a GS1 prefix. Numbers starting 200 to 299 are restricted-circulation numbers: they are not registered to anyone and are only meant for use inside your own business, such as loose items you weigh and pack. Goods you supply to other shops or supermarkets need numbers from **GS1 Pakistan** so they are unique everywhere.

**Code 128** encodes letters, digits and symbols, so it suits SKU codes like KUR-M-WHT. The generator uses its compact digit mode for all-number codes, which keeps labels short.`,
    `## Worked example

A bakery packs rusk, cake rusk and nimko in its own bags. It types three 12-digit numbers starting 2000000001, each with a label and price, chooses 4 labels per row and 12 copies each, and prints 36 labels on one A4 sticker sheet. The scanner at the counter reads them like any packaged product.

In Nafaa you can save the same number on each product, scan it at the [POS counter](/product/pos), and print shelf and product labels from the app's own [label designer](/product/inventory) with the name and price from your product list, without retyping.`,
  ],
  callout: { tone: 'warning', title: 'Do not copy another company\'s barcode', body: 'Printing a number that belongs to a brand on your own goods causes wrong prices and wrong stock at every shop that scans it. Use in-store numbers for your own shop, and GS1-registered numbers for goods you sell to others.' },
  sources: [WIKI_EAN, WIKI_GS1_PREFIX, WIKI_CODE128],
  faqs: [
    { q: 'Do I need to register barcodes for my own products?', a: 'Only if the goods will be sold by other shops, supermarkets or online marketplaces. Those businesses need numbers that are unique worldwide, issued by GS1 Pakistan. For items you pack and sell only in your own shop, such as weighed dry fruit or bakery bags, numbers from the 200 to 299 restricted range are enough, as long as you never reuse one for two products.' },
    { q: 'Which is better for a shop, EAN-13 or Code 128?', a: 'Use EAN-13 for products, because it is the retail standard and every barcode scanner reads it. Use Code 128 when the code contains letters, such as your own SKU codes, or for shelf and bin labels inside the store. Most shop scanners read both, so you can use EAN-13 on goods and Code 128 on internal labels.' },
    { q: 'Why does my printed barcode not scan?', a: 'The usual causes are printing at a reduced scale, a label too small for the bars, a faded thermal ribbon, or no white space beside the bars. Print at 100% scale with fewer labels per row, keep the margins clear, and test one label first. For EAN-13, also check the number: a wrong 13th digit is rejected, which this tool flags before you print.' },
  ],
  relations: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:ean-13', 'GLOSSARY_TERM:sku', 'BLOG_POST:barcode-setup-guide', 'BLOG_POST:barcode-vs-no-barcode-store', 'PRODUCT:inventory'],
  evidence: ['apps/site/src/components/islands/tools/barcode.ts', 'apps/web/src/modules/inventory/barcodes/components/LabelDesigner.tsx', 'apps/web/src/modules/inventory/products/import/columns.ts'],
  factNote: 'EAN-13 check digit and GS1 restricted range 200-299 checked against Wikipedia (International Article Number; List of GS1 country codes), Code 128 against Wikipedia, all curl 200 on 26 Oct 2026. Encoder output compared with jsbarcode 3.12.3 for EAN-13 and Code 128 samples. Nafaa claims: barcode field per product, label designer with Code 128 / EAN-13 / QR (inventory/barcodes LabelDesigner.tsx).',
  sortOrder: 60,
  featured: true,
};

export const foodCost: ToolSpec = {
  slug: 'food-cost-calculator',
  toolKey: 'food-cost-calculator',
  kind: 'Food cost',
  title: 'Food Cost Calculator',
  summary:
    'Cost a recipe line by line and get the cost per plate, the food cost percentage at your menu price, and the price that hits the food cost you are aiming for. Made for restaurants, dhabas, cafes and bakeries buying at changing market rates.',
  seoTitle: 'Restaurant Food Cost Calculator: Cost per Plate & Menu Price',
  seoDescription: 'Free restaurant food cost calculator: recipe cost per plate, food cost % at your menu price and the price for your target, with wastage. In rupees.',
  focusKeyword: 'food cost calculator',
  facts: [
    ['Cost per plate', 'Sum of (quantity × rate) × (1 + wastage) ÷ plates'],
    ['Food cost %', 'Cost per plate ÷ menu price × 100'],
    ['Price for a target', 'Cost per plate ÷ target food cost %'],
    ['Inputs', 'Any number of ingredients, plates per batch, wastage %'],
  ],
  romanUrdu: 'Recipe ki har cheez ki Cost jor kar ek plate ki Cost nikalein. Menu price likhein to food cost % aur jitna % chahiye us ke hisaab se sahi price bhi mil jati hai.',
  steps: [
    ['List the ingredients of one batch', 'For each, the quantity used and the rate you buy it at, in the same unit: 1.5 kg chicken at the per-kg rate, 0.25 litre oil at the per-litre rate.'],
    ['Enter plates and wastage', 'How many plates the batch makes, and a wastage % for bones, trimming, spills and oil left in the pan.'],
    ['Enter the menu price', 'The food cost % appears, with what is left from each plate for staff, rent, gas and profit.'],
    ['Set a target food cost', 'Type the percentage you plan for and the calculator gives the menu price that meets it.'],
  ],
  sections: [
    `## How it's calculated

- Batch cost = sum of (quantity used × purchase rate) for every ingredient
- With wastage = batch cost × (1 + wastage % ÷ 100)
- Cost per plate = batch cost with wastage ÷ plates from the batch
- Food cost % = cost per plate ÷ menu price × 100
- Price for a target = cost per plate ÷ (target % ÷ 100)

Count every ingredient, including oil, masala, garnish, the naan or rice served with the dish, and the takeaway box for delivery orders. Leaving out small items is the most common reason a dish earns less than expected.`,
    `## Worked example

A chicken karahi batch, at example market rates:

| Ingredient | Used | Rate | Cost |
|---|---|---|---|
| Chicken | 1 kg | 750 per kg | 750 |
| Tomatoes | 0.5 kg | 160 per kg | 80 |
| Cooking oil | 0.25 litre | 600 per litre | 150 |
| Masala, ginger, garlic, chillies, yoghurt | 1 lot | 120 | 120 |

Batch cost = **1,100 rupees**; with 5% wastage **1,155 rupees**; the batch serves 4 plates, so **288.75 rupees a plate**. At a menu price of 1,000 rupees, food cost is **28.9%**. For a 30% target the price could be 963 rupees; if the chicken rate rises to 900, the plate cost becomes about 328 rupees and the same 1,000-rupee price runs at 32.8%.

Rates change weekly, so recipe costs go stale. In Nafaa's [restaurant software](/industries/restaurant), each menu item can carry its recipe; the app shows the plate cost and food cost % from current purchase rates and deducts the ingredients from stock as plates are sold.`,
  ],
  faqs: [
    { q: 'What food cost percentage should a restaurant aim for?', a: 'There is no single right number: it depends on your menu, prices and how much you spend on staff and rent. Dishes with expensive meat often run a higher food cost and earn on volume, while tea, drinks, bread and rice usually run much lower. Set a target per category, cost each dish against it, and check the overall figure every month from your purchases and sales.' },
    { q: 'Should wastage be part of food cost?', a: 'Yes. Bones and fat trimmed from meat, vegetables peeled, oil left in the karahi and food thrown away at the end of the day are all paid for. Add a wastage percentage to each recipe based on what you see in your kitchen, or weigh the usable yield once and use that weight in the recipe instead.' },
    { q: 'How often should I update recipe costs?', a: 'Whenever a main ingredient rate moves noticeably, which in Pakistan can be weekly for chicken, vegetables and oil. At minimum, recost your best-selling dishes every month. If you keep recipes in software that reads your latest purchase rates, the plate cost updates itself and you only need to review the prices.' },
  ],
  relations: ['GLOSSARY_TERM:food-cost', 'GLOSSARY_TERM:recipe-costing', 'GLOSSARY_TERM:menu-engineering', 'INDUSTRY:restaurant', 'BLOG_POST:restaurant-menu-engineering', 'TOOL:break-even-calculator'],
  evidence: ['apps/web/src/industries/restaurant/products/RestaurantProductDetail.tsx', 'apps/web/src/industries/restaurant/components/RecipeLinesEditor.tsx', 'apps/web/src/industries/restaurant/products/RestaurantProductEditor.tsx', 'apps/api/src/industries/restaurant/recipes/recipes.service.ts'],
  factNote: 'Plain arithmetic; ingredient rates are labelled as examples, not market prices. Nafaa claims: recipe per menu item with plate cost and food cost % from current raw material rates (RestaurantProductDetail.tsx, RecipeLinesEditor.tsx); ingredients deducted from stock when orders are cooked or billed (api recipes.service.ts consumeForLines).',
  sortOrder: 70,
};
