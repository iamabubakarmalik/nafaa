/**
 * Pricing tools: profit margin, GST, discount and break-even calculators.
 */

import { src, type ToolSpec } from './_tool';

const FBR_CIRCULAR = src(
  'Circular No. 1 of 2023 (Sales Tax and Federal Excise): standard rate raised from 17% to 18%',
  'https://download1.fbr.gov.pk/Docs/20232281524459451Circular01-2023SalesTaxFederalExcise.pdf',
  'Federal Board of Revenue',
);

export const profitMargin: ToolSpec = {
  slug: 'profit-margin-calculator',
  toolKey: 'profit-margin-calculator',
  kind: 'Profit margin',
  title: 'Profit Margin Calculator',
  summary:
    'Work out profit, margin and markup from your cost and selling price, or find the price that gives the margin you want. Built for shops in Pakistan: type rupee amounts, add a quantity for total profit, and see why a 25% markup is only a 20% margin.',
  seoTitle: 'Profit Margin & Markup Calculator (Free, in Rupees)',
  seoDescription: 'Free profit margin and markup calculator for Pakistani shops. Enter cost and price, or a target margin, and get profit, margin %, markup % and the right price.',
  focusKeyword: 'profit margin calculator',
  facts: [
    ['Margin', 'Profit ÷ selling price × 100'],
    ['Markup', 'Profit ÷ cost × 100'],
    ['Price for a target margin', 'Cost ÷ (1 − margin ÷ 100)'],
    ['Works offline?', 'It runs in your browser; nothing is sent or saved'],
  ],
  romanUrdu: 'Cost aur bechne ki price likhein: Profit, margin aur markup foran nazar aayega. Jitna margin chahiye wo likhein to sahi price bhi mil jayegi.',
  steps: [
    ['Choose what you know', 'Pick **I know my price** if you already sell the item, or **Target margin** / **Target markup** if you are setting a new price.'],
    ['Enter the cost per item', 'Use the full landed cost: purchase price plus freight, loading and any packing. A cost that leaves out transport makes every margin look better than it is.'],
    ['Enter the price or the % you want', 'The result panel updates as you type, with profit, margin and markup side by side.'],
    ['Add a quantity (optional)', 'Type how many you sell in a day or a month to see the total profit on that quantity.'],
  ],
  sections: [
    `## How it's calculated

Profit per item is **selling price − cost**. The same profit is then read two ways:

- **Margin** divides profit by the **selling price**. It tells you how much of every rupee in the galla is yours.
- **Markup** divides profit by the **cost**. It tells you how much you added on top of what you paid.

To set a price from a margin, divide the cost by (1 − margin). To set it from a markup, multiply the cost by (1 + markup). Because the divisor is different, the two numbers are never equal: a markup is always the bigger percentage.`,
    `## Worked example

You buy a bottle of cooking oil for 300 rupees including transport and sell it for 375 rupees.

- Profit = 375 − 300 = **75 rupees**
- Margin = 75 ÷ 375 = **20%**
- Markup = 75 ÷ 300 = **25%**

Now a new item costs 480 rupees and you want a 20% margin. Price = 480 ÷ (1 − 0.20) = 480 ÷ 0.8 = **600 rupees**. If you had added 20% markup instead, the price would be 576 rupees and the margin only 16.7%. Selling 50 of them a week, that gap is 1,200 rupees of profit every week.

When you run the counter on [Nafaa](/product/inventory), cost and sale price are saved on each product, and the [profit report](/product/reports) shows margin by product and category from real bills, so you can check the numbers this calculator gives you against what actually sold.`,
  ],
  callout: { tone: 'tip', title: 'Price loose goods from the real yield', body: 'For goods you weigh out (rice, sugar, daal), divide the bag cost by the kilos you actually sell after spillage, not by the weight printed on the bag. Then use that cost here.' },
  faqs: [
    { q: 'What is a good profit margin for a kiryana or general store?', a: 'It depends on the item. Fast-moving essentials such as flour, sugar and oil usually carry thin margins because every shop sells them, while snacks, cosmetics and loose items carry more. Instead of one target for the whole shop, look at margin by category and make sure the slow, space-taking items earn enough to justify their shelf. Use this calculator per item, then compare categories in your profit report.' },
    { q: 'Should I use margin or markup to set prices?', a: 'Either works if you are consistent, but margin is safer because it is measured against the price customers pay, the same base as your sales and expenses. Many shopkeepers add a markup on cost and then think of it as margin, which overstates profit. If you think in markup, use the Target markup mode here and read the margin it shows before you decide.' },
    { q: 'Does the cost include rent and salaries?', a: 'No. Put only the cost of the item itself here: purchase price plus freight, loading and packing. Rent, salaries and bills are fixed costs; they are covered by the total profit from many sales. To see how much you must sell to cover them, use the break-even calculator with your average margin from this tool.' },
  ],
  relations: ['TOOL:discount-calculator', 'TOOL:break-even-calculator', 'BLOG_POST:how-to-calculate-profit-margin', 'GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:markup', 'PRODUCT:reports'],
  evidence: ['apps/web/src/modules/finance/profit-report/api.ts', 'apps/web/src/modules/inventory/products/import/columns.ts'],
  factNote: 'Plain arithmetic, no outside facts. Nafaa claims: cost price per product (import columns.ts) and margin in the profit report (finance/profit-report).',
  sortOrder: 10,
  featured: true,
};

export const gst: ToolSpec = {
  slug: 'gst-calculator',
  toolKey: 'gst-calculator',
  kind: 'GST',
  title: 'GST Calculator',
  summary:
    'Add sales tax to a price or take it out of a tax-inclusive price. The 18% standard federal rate is preset with its FBR source, and you can type any other rate for reduced-rate goods or provincial tax on services. Results show the price before tax, the tax and the total.',
  seoTitle: 'GST Calculator Pakistan: Add or Remove 18% Sales Tax',
  seoDescription: 'Free GST calculator for Pakistan. Add sales tax to a price or remove it from an inclusive price at the 18% standard rate or any rate you enter.',
  focusKeyword: 'gst calculator pakistan',
  facts: [
    ['Add tax', 'Tax = price × rate ÷ 100'],
    ['Remove tax', 'Price before tax = price with tax ÷ (1 + rate ÷ 100)'],
    ['Preset rate', '18% standard rate on goods, section 3(1) of the Sales Tax Act, 1990 (FBR Circular 1 of 2023)'],
    ['Other rates', 'Type your own: reduced-rate goods and provincial tax on services differ'],
  ],
  romanUrdu: 'Price par sales tax jorna ho ya tax wali price se tax nikalna ho, dono yahan hote hain. 18% standard rate FBR ke hawale ke saath pehle se hai, koi aur rate khud likh sakte hain.',
  steps: [
    ['Pick add or remove', '**Add GST to a price** when you know the price before tax. **Remove GST from a price** when the price already includes tax, such as a printed retail price.'],
    ['Enter the price', 'Type the amount in rupees. Commas are fine.'],
    ['Choose the rate', 'Keep the 18% standard rate, or choose **Other rate** and type the rate that applies to your goods or service.'],
    ['Read the split', 'The result shows the price before tax, the tax amount and the total, rounded to paisa.'],
  ],
  sections: [
    `## How it's calculated

**Adding tax:** tax = price × rate ÷ 100, and the total is price + tax.

**Removing tax:** the price before tax = price with tax ÷ (1 + rate ÷ 100), and the tax is the difference. A common mistake is to take 18% of the inclusive price; that over-counts the tax because 18% of a price that already contains tax includes tax on tax.

The 18% figure is the standard rate under section 3(1) of the Sales Tax Act, 1990, raised from 17% by FBR Circular No. 1 of 2023 (linked below). Some goods are taxed at other rates under the schedules, and sales tax on services is collected by the provinces at their own rates, so the calculator lets you type any rate rather than assume one.`,
    `## Worked example

A wholesaler quotes 1,000 rupees before tax. At 18%: tax = 1,000 × 18 ÷ 100 = **180 rupees**, total **1,180 rupees**.

Going the other way, a carton is billed at 1,180 rupees including 18% tax. Price before tax = 1,180 ÷ 1.18 = **1,000 rupees**, tax = **180 rupees**. Taking 18% of 1,180 would give 212.40 rupees, which is wrong by 32.40 rupees on a single carton.

If your shop must issue tax invoices, Nafaa offers optional FBR/PRA integration and prints the tax on each bill; see [FBR integration](/product/fbr) for who it applies to.`,
  ],
  callout: { tone: 'warning', title: 'Rates change', body: 'Sales tax rates are set by Finance Acts and notifications. The preset was checked on 26 October 2026 against the FBR circular below; confirm the rate for your goods with FBR or your tax adviser before you bill.' },
  sources: [FBR_CIRCULAR],
  faqs: [
    { q: 'Is the GST rate in Pakistan 17% or 18%?', a: 'The standard federal sales tax rate on goods has been 18% since FBR Circular No. 1 of 2023, which raised it from 17%. Some goods carry reduced or special rates under the schedules to the Sales Tax Act, and services are taxed by the provinces at their own rates. That is why this calculator lets you type any rate, and why you should confirm the rate for your goods.' },
    { q: 'How do I find the tax inside a price that already includes GST?', a: 'Divide the inclusive price by 1 plus the rate as a decimal, then subtract. At 18%, divide by 1.18: a price of 590 rupees is 500 rupees before tax and 90 rupees of tax. Do not take 18% of 590, because that also taxes the tax and gives a figure that is too high. The Remove GST mode does this division for you.' },
    { q: 'Can I use this for provincial sales tax on services?', a: 'Yes. Choose Other rate and type the rate your province charges on your service, for example the rate printed on your registration or on a recent tax invoice. The arithmetic for adding or removing tax is the same; only the rate differs. Restaurants, salons and other service businesses should confirm their rate with the provincial revenue authority.' },
  ],
  relations: ['GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:sales-tax-invoice', 'PRODUCT:fbr', 'BLOG_POST:sales-tax-guide-punjab-2026', 'TOOL:receipt-maker'],
  evidence: ['apps/site/src/components/islands/tools/facts.ts', 'apps/web/src/core/receipt/setup.ts'],
  factNote: 'Standard rate 18% checked on 26 Oct 2026 against FBR Circular 1 of 2023 (URL loads, curl 200). Nafaa claims: tax line on bills (core/receipt), optional FBR/PRA integration per settings wording.',
  sortOrder: 20,
  featured: true,
};

export const discount: ToolSpec = {
  slug: 'discount-calculator',
  toolKey: 'discount-calculator',
  kind: 'Discount',
  title: 'Discount Calculator',
  summary:
    'Find the sale price after a percentage or rupee discount, or the discount % between two prices. Add your cost to see the profit left after the discount and how many more items you must sell to earn the same profit, before you announce a sale.',
  seoTitle: 'Discount & Sale Price Calculator (Profit After Discount)',
  seoDescription: 'Free discount calculator: sale price from % or rupees off, the % between two prices, and the profit left after the discount for Pakistani shops.',
  focusKeyword: 'discount calculator',
  facts: [
    ['Sale price', 'Price × (1 − discount ÷ 100)'],
    ['Discount %', '(Old price − new price) ÷ old price × 100'],
    ['Extra sales needed', 'Profit before ÷ profit after'],
    ['Modes', '% off, rupees off, or find the % from two prices'],
  ],
  romanUrdu: 'Discount ke baad price kitni banegi, aur Profit kitna bachega, yahan dekhein. Cost likhenge to ye bhi pata chalega ke wohi Profit kamane ke liye kitna zyada bechna hoga.',
  steps: [
    ['Choose the mode', '**% off** for "15% off", **Rs off** for "200 rupees off", or **Find the %** when you know the price before and after.'],
    ['Enter the original price', 'The normal price on the shelf or the menu.'],
    ['Enter the discount or the new price', 'The sale price and the rupees saved appear at once.'],
    ['Add your cost', 'Optional, but it is the useful part: you see the profit per item before and after, the new margin, and how many times as many items you must sell to keep the same profit.'],
  ],
  sections: [
    `## How it's calculated

- Sale price = original price × (1 − discount % ÷ 100)
- Discount % = (original price − sale price) ÷ original price × 100
- Profit after the discount = sale price − cost
- Sales needed to keep the same profit = profit before ÷ profit after

The last line is the one most sales forget. A discount comes straight out of your profit, not out of the price as a whole, so a small-looking discount can halve what you earn on each item.`,
    `## Worked example

A shirt sells for 1,200 rupees and costs you 900 rupees. You plan a 15% Eid discount.

- Discount = 1,200 × 15 ÷ 100 = **180 rupees**, sale price **1,020 rupees**
- Profit before = 1,200 − 900 = **300 rupees**; after = 1,020 − 900 = **120 rupees**
- Margin falls from 25% to 11.8%
- To earn the same profit you must sell 300 ÷ 120 = **2.5 times** as many shirts

If the sale will not move two and a half times the volume, a smaller discount, a discount only on slow stock, or a bundle may work better. In Nafaa, [discounts](/product/pos) can be set as a percentage or an amount, and the [profit report](/product/reports) shows what the sale really earned afterwards.`,
  ],
  faqs: [
    { q: 'How do I calculate 20% off a price?', a: 'Multiply the price by 0.8. For 20% off 2,500 rupees: 2,500 × 0.8 = 2,000 rupees, a saving of 500 rupees. For any percentage, subtract it from 100, divide by 100, and multiply the price by the result. The % off mode in this calculator does it for you and also shows the saving in rupees.' },
    { q: 'Is a percentage discount better than a rupee discount?', a: 'They are the same thing written differently, but customers read them differently. On cheap items a percentage often sounds larger, and on expensive items a rupee figure does. For your profit, what matters is the rupees taken off each item compared with the profit on that item. Enter both versions here with your cost and compare the profit left.' },
    { q: 'How much more do I need to sell to cover a discount?', a: 'Divide the profit per item before the discount by the profit per item after it. If you earned 100 rupees an item and the discount leaves 60, you must sell 100 ÷ 60, about 1.67 times as many items, just to stand still. The calculator shows this figure when you enter your cost, so you can judge whether the sale is worth running.' },
  ],
  relations: ['TOOL:profit-margin-calculator', 'GLOSSARY_TERM:discount', 'BLOG_POST:ramadan-eid-retail-strategy', 'BLOG_POST:pricing-strategy-small-shop', 'PRODUCT:pos'],
  evidence: ['apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx', 'apps/web/src/modules/finance/profit-report/api.ts'],
  factNote: 'Plain arithmetic, no outside facts. Nafaa claims: discounts page (sales/discounts) and profit report.',
  sortOrder: 30,
};

export const breakEven: ToolSpec = {
  slug: 'break-even-calculator',
  toolKey: 'break-even-calculator',
  kind: 'Break-even',
  title: 'Break-even Calculator',
  summary:
    'Find how much you must sell each month and each day to cover rent, salaries and bills, and how much more to reach the profit you want. Use a single item\'s price and cost, or your shop\'s average margin when you sell hundreds of products.',
  seoTitle: 'Break-even Calculator for Shops & Restaurants (Free)',
  seoDescription: 'Free break-even calculator for Pakistani shops and restaurants: monthly and daily sales needed to cover rent, salaries and bills, plus your profit target.',
  focusKeyword: 'break even calculator',
  facts: [
    ['Break-even sales', 'Fixed costs ÷ share of each sale you keep after its cost'],
    ['Break-even items', 'Fixed costs ÷ (price − cost per item)'],
    ['With a profit target', '(Fixed costs + target) ÷ share kept'],
    ['Two ways in', 'One main item, or the average margin of a many-product shop'],
  ],
  romanUrdu: 'Kiraya, tankhwah aur bill nikalne ke liye mahine aur roz kitni Sale chahiye, ye yahan nikalein. Jitna Profit chahiye wo likhein to us ke liye zaroori Sale bhi dikhegi.',
  steps: [
    ['Add your fixed costs', 'Rent, salaries, electricity, gas and internet, and anything else you pay every month whether or not you sell: generator fuel, software, a loan instalment.'],
    ['Choose how you sell', '**One main item** for a business with one product or a typical plate or service. **Many products** for a shop, where you enter the average gross margin instead.'],
    ['Enter price and cost, or the margin', 'For one item, its selling price and its own cost. For many products, the average margin from your profit report, or from a week of bills.'],
    ['Set days open and a profit target', 'Days open turns the monthly figure into a daily one. A profit target shows the sales needed to also pay you.'],
  ],
  sections: [
    `## How it's calculated

Every sale leaves something after paying for the goods sold: the **contribution**. For a single item it is price − cost. As a share of sales it is the gross margin. Break-even is the sales level where those contributions add up to the fixed costs:

- Break-even sales = fixed costs ÷ contribution share
- Break-even items = fixed costs ÷ contribution per item
- Sales for a profit target = (fixed costs + target profit) ÷ contribution share

Above break-even, the whole contribution of each extra sale is profit. Below it, the shop is paying its costs out of savings or credit.`,
    `## Worked example

A general store pays 60,000 rupees rent, 90,000 rupees salaries, 30,000 rupees in bills and 20,000 rupees of other fixed costs: **200,000 rupees a month**. Its average gross margin across all products is 16%.

- Break-even sales = 200,000 ÷ 0.16 = **1,250,000 rupees a month**
- Open 30 days, that is about **41,700 rupees of sales a day**
- For 100,000 rupees of profit on top: 300,000 ÷ 0.16 = **1,875,000 rupees a month**, about 62,500 a day

Raising the average margin from 16% to 18%, by pricing slow items better or cutting wastage, lowers break-even to about 1,111,000 rupees: the same shop needs roughly 139,000 rupees less sales every month. Nafaa's [reports](/product/reports) show daily sales and margin, so you can see each day whether you are above the line.`,
  ],
  faqs: [
    { q: 'What counts as a fixed cost?', a: 'Anything you pay every month even if no customer walks in: rent, salaries of permanent staff, minimum electricity and internet bills, security, software, loan instalments and generator upkeep. Costs that rise with each sale, such as the goods themselves, packing, delivery and card fees, are variable and belong in the cost per item or the margin instead.' },
    { q: 'Where do I get my average margin?', a: 'The best source is a profit report built from real bills, which shows sales and gross profit for the month; margin is profit divided by sales. Without one, add up a week of bills at sale price and at cost price and divide the difference by the sales total. Use the profit margin calculator to check a few key items by hand.' },
    { q: 'Can a restaurant use this calculator?', a: 'Yes. Use One main item with your average bill per customer as the price and the food cost of that bill as the cost, or use Many products with your gross margin after food cost. Put staff salaries, rent, gas and electricity in fixed costs. The daily figure then tells you the sales, or covers, you need on a normal day.' },
  ],
  relations: ['TOOL:profit-margin-calculator', 'TOOL:food-cost-calculator', 'GLOSSARY_TERM:break-even-point', 'GLOSSARY_TERM:operating-expenses', 'BLOG_POST:how-to-read-profit-and-loss-report', 'PRODUCT:reports'],
  evidence: ['apps/web/src/modules/finance/profit-report/api.ts', 'apps/web/src/modules/reports'],
  factNote: 'Plain arithmetic, no outside facts. Nafaa claims: daily sales and margin in reports (modules/reports, finance/profit-report).',
  sortOrder: 40,
};
