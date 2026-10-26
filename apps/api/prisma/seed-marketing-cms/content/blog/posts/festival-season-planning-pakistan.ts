/**
 * Planning for Pakistan's selling seasons beyond Ramadan: Eid ul Adha,
 * 14 August, 12 Rabi ul Awwal, back-to-school, wedding season and winter.
 * What sells, a six-week plan, cash planning with an illustrative example,
 * staffing and the clearance after. Ramadan and Eid ul Fitr are covered in
 * their own post, which this one links to.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Eid al-Adha', 'https://en.wikipedia.org/wiki/Eid_al-Adha', 'Wikipedia'),
  src('Public holidays in Pakistan', 'https://en.wikipedia.org/wiki/Public_holidays_in_Pakistan', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'festival-season-planning-pakistan',
  cover: PHOTO.festivalSeasonPlanningPakistan,
  title: 'Festival and Season Planning for Shops in Pakistan, Beyond Ramadan',
  summary:
    'Eid ul Adha, 14 August, back-to-school, wedding season and winter each bring a different rush, and each needs its own stock, staff and cash plan about six weeks ahead. Start from what sold in the same weeks last year, arrange the cash before you order, and plan the clearance before the season ends.',
  category: 'business',
  tags: ['INDUSTRY:kiryana', 'INDUSTRY:garments', 'PRODUCT:inventory'],
  related: ['BLOG_POST:ramadan-eid-retail-strategy', 'BLOG_POST:garment-shop-seasonal-stock-planning', 'GLOSSARY_TERM:working-capital', 'GLOSSARY_TERM:dead-stock', 'PRODUCT:reports'],
  isNew: true,
  sources: SOURCES,
  seoTitle: 'Festival Season Planning for Shops in Pakistan',
  seoDescription: 'Plan stock, staff and cash for Eid ul Adha, 14 August, back-to-school, wedding season and winter: what sells, a six-week plan and the clearance after.',
  focusKeyword: 'festival season planning Pakistan shop',
  blocks: [
    prose(`Ramadan and Eid ul Fitr get most of the planning attention, and our [Ramadan and Eid guide](/blog/ramadan-eid-retail-strategy) covers them in detail. But a Pakistani shop has several other seasons every year, each with its own rush and its own mistakes: Eid ul Adha, Independence Day, 12 Rabi ul Awwal, the start of the school year, wedding season and winter.

Each one rewards the shop that prepared a few weeks ahead and punishes the one that ordered late, ran out on the best days, or was left with boxes of seasonal stock nobody wants in the following month. This guide covers what changes in each season and a simple plan that works for all of them.

## The seasons and what they bring

Religious dates follow the Islamic calendar. As the Wikipedia article on [Eid al-Adha](https://en.wikipedia.org/wiki/Eid_al-Adha) notes, Eid ul Adha falls on the 10th of Dhu al-Hijjah, and because the lunar calendar is about eleven days shorter than the solar one, it comes earlier each year by the Gregorian calendar. So do 12 Rabi ul Awwal and Ramadan. Check this year's expected dates when you plan, and remember that the exact day in Pakistan is confirmed close to the time.

| Season | What sells more | Plan from |
|---|---|---|
| Eid ul Adha | Spices and masala mixes, oil, onions, tomatoes, yogurt, freezer bags, knives, chopping boards, skewers, charcoal; deep freezers at appliance shops | Six weeks before |
| 14 August | Flags, buntings, badges, green and white clothing, face paint, sweets | Four weeks before |
| 12 Rabi ul Awwal | Lights, decorations, buntings, sweets and drinks for gatherings | Four weeks before |
| School opening | Copies, stationery, bags, water bottles, lunch boxes, uniforms and school shoes | When schools announce book lists |
| Wedding season | Formal clothing, cosmetics, jewellery, gift packs, crockery, bakery and sweet orders | Two months before |
| Winter | Shawls, khaddar and woollens, dry fruit, eggs, tea, soup packets, heaters and geysers at appliance shops | As the first cold weeks approach |

Not every season matters for every shop. A pharmacy feels winter in cough and flu medicines; a hardware store feels Eid ul Adha in knives and hooks. Pick the three or four seasons that move your sales and plan those properly.

## Eid ul Adha needs its own plan

Eid ul Adha is not a smaller Eid ul Fitr. Shoppers spend heavily on the sacrifice itself, so clothing and gift spending is often lower, while kitchen and meat-related demand jumps. The article on Eid al-Adha notes the meat is generally divided into three parts, for the family, for friends and relatives, and for the poor, and that is exactly why freezer bags, containers and cooking ingredients sell in the days around Eid.

Two more things are different. Many staff travel home for Eid ul Adha, so plan leave early and decide who works on which day. And many shops close for one or more days of Eid; tell customers your timings in advance.

## Independence Day and 12 Rabi ul Awwal

These are short, sharp seasons for small items. [Public holidays in Pakistan](https://en.wikipedia.org/wiki/Public_holidays_in_Pakistan) lists 14 August as Independence Day and 12 Rabi ul Awwal as the Prophet's birthday. Stock for both sells in the last week or two and stops the day after. Order modestly, put the items at the front of the shop, and plan to return or store what is left. Do not tie up money you need for the next big season in flags and lights.`),
    steps(
      'A six-week plan for any season',
      [
        ['Six weeks before: look at last year', 'Pull sales by item for the same weeks last year. Note what sold out, what was left over, and what customers asked for that you did not have.'],
        ['Five weeks before: plan the cash', 'Work out how much extra stock you need and when each supplier wants payment. Collect old udhaar now, not after the season.'],
        ['Four weeks before: order', 'Place orders with your regular suppliers and ask for credit on the seasonal quantity. Wholesale markets get crowded and prices can move close to the season.'],
        ['Three weeks before: staff', 'Agree leave, extra hours and any temporary help. Train new people now, not in the rush.'],
        ['One week before: the counter', 'Put seasonal items on quick keys, make bundles, check the printer and paper, and display the stock at the front.'],
        ['After the season: clear and review', 'Discount what is left while it still sells, return what suppliers will take, and write down what you would change next year.'],
      ],
      undefined,
      true,
    ),
    prose(`## Plan the cash before the stock

Seasonal stock is paid for weeks before it sells. This is a [working capital](/glossary/working-capital) problem, and it catches many shops out. An illustrative example for a kiryana store before Eid ul Adha:

| Item | Amount |
|---|---|
| Extra seasonal stock to buy | 250,000 rupees |
| Credit agreed with suppliers (pay after Eid) | 150,000 rupees |
| Cash needed before Eid | 100,000 rupees |
| Old udhaar you can realistically collect in a month | 60,000 rupees |
| Gap to cover from savings or by ordering less | 40,000 rupees |

Doing this on paper a month ahead turns a panic into a decision: order less, ask for more credit, or collect harder. Doing it a week before means borrowing at a bad time.

## Staffing

Every season adds hours. Write the rota early, keep at least one trained cashier on every shift, and do not let the most experienced person take leave on the busiest days. Temporary helpers can pack, fetch and guide customers, but billing and cash should stay with trained staff who have their own login. Our guide to [hiring and training counter staff](/blog/hire-and-train-counter-staff) has a one-week training plan.

## The clearance after

Every season leaves stock behind. Flags after 14 August, school bags after the first month of term, shawls at the end of winter. Plan the clearance before you order: what you will discount, from which date, and what the supplier will take back. Seasonal stock that is not cleared becomes [dead stock](/glossary/dead-stock), tying up money and shelf space until the same season comes round again. For clothing, our guide to [garment shop seasonal stock planning](/blog/garment-shop-seasonal-stock-planning) goes deeper into sizes, colours and end-of-season sales.`),
    shot({
      heading: 'Reorder from the selling rate',
      body: 'The low-stock list shows what is running out and how many days the rest will last at the recent selling rate, so seasonal items get reordered before the busiest days.',
      id: SHOT.lowStock,
      url: 'app.nafaa.pk/low-stock',
      layout: 'full',
      caption: 'Low stock list in a demo store: items running out that need reordering.',
    }),
    prose(`## How Nafaa helps

In Nafaa's report centre you can pick any dates, including last year's season, and see sales by item, with charts, print and CSV; the profit and loss report can compare a period with the same dates last year. The low-stock page shows what is out, low or running out soon in each branch, how many days the rest lasts at the recent selling rate, and turns the lines into purchase orders grouped by supplier, WhatsApp messages or a printed reorder sheet.

For the counter, combos sell seasonal bundles at one price with validity dates, and discount codes can run for set dates with per-customer limits. The khata sends udhaar reminders on WhatsApp before you need the cash, Shop accounts shows money in each account, and the attendance page records leave requests for each person. See the [Reports](/product/reports) page for more.`),
    tip('After every season, spend ten minutes writing three lines: what ran out, what was left over, and what you will order differently. Next year, that note is worth more than any forecast.', 'Write it down for next year'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Seasons and what sells', 'Eid ul Adha', '14 August and 12 Rabi ul Awwal', 'Six-week plan', 'Cash plan', 'Staffing', 'Clearance', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/reports/center/pages/ReportsCenterPage.tsx',
    'apps/web/src/modules/reports/pnl/pages/ProfitLossPage.tsx',
    'apps/web/src/modules/organization/settings/sections/ReportsSection.tsx',
    'apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx',
    'apps/web/src/modules/inventory/combos/pages/ComboFormPage.tsx',
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/finance/money/pages/MoneyPage.tsx',
    'apps/web/src/modules/hr/attendance/components/LeaveModal.tsx',
  ],
  factNote:
    'Wikipedia (Eid al-Adha) used for the date on 10 Dhu al-Hijjah, the lunar calendar being about eleven days shorter than the solar one, and the meat divided into three parts; Wikipedia (Public holidays in Pakistan) for 14 August and 12 Rabi ul Awwal. What sells in each season is general trade knowledge; cash amounts are illustrative. Links checked on 2026-10-26. Product statements checked against the code (see evidence).',
};

export default spec;
