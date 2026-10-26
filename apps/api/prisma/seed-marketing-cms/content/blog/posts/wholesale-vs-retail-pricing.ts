/**
 * Wholesale vs retail pricing for shops that sell to both: separate price
 * lists, quantity tiers, carton vs piece prices, rates by customer type, and
 * how to keep bulk rates from eating the margin. Worked example uses
 * illustrative amounts.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Wholesaling', 'https://en.wikipedia.org/wiki/Wholesaling', 'Wikipedia'),
  src('Volume discount', 'https://en.wikipedia.org/wiki/Volume_discount', 'Wikipedia'),
  src('Price Statistics (SPI, CPI, WPI)', 'https://www.pbs.gov.pk/price-statistics/', 'Pakistan Bureau of Statistics'),
];

const spec: PostSpec = {
  slug: 'wholesale-vs-retail-pricing',
  title: 'Wholesale vs Retail Pricing: Price Lists, Tiers and Cartons',
  summary:
    'A shop that sells to both households and bulk buyers needs two kinds of price: a retail price per piece and wholesale rates that start at a clear minimum quantity. This guide shows how to build the tiers, price cartons against pieces, set rates by customer type and keep bulk sales from eating your margin.',
  category: 'business',
  cover: PHOTO.wholesaleVsRetailPricing,
  tags: ['GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:unit-of-measure', 'INDUSTRY:hardware'],
  related: [
    'BLOG_POST:pricing-strategy-small-shop',
    'BLOG_POST:how-to-calculate-profit-margin',
    'BLOG_POST:cash-vs-credit-sales',
    'PRODUCT:inventory',
    'INDUSTRY:meat',
    'SOLUTION:wholesale-distribution',
  ],
  isNew: true,
  seoTitle: 'Wholesale vs Retail Pricing for Shops: Tiers and Cartons',
  seoDescription: 'Set wholesale and retail prices that both earn: quantity tiers, carton vs piece prices, rates for contractors and restaurants, and protecting your margin.',
  focusKeyword: 'wholesale vs retail pricing',
  sources: SOURCES,
  blocks: [
    prose(`Many Pakistani shops are half retail and half wholesale without ever deciding to be. The kiryana store sells biscuits by the pack to families and by the carton to the tuck shop down the road. The hardware store sells one tap to a household and fifty bags of cement to a contractor. The butcher sells a kilo to a family and twenty kilos a day to a restaurant.

Each of these bulk buyers expects a better rate, and usually deserves one. The trouble starts when that rate is decided at the counter, differently every time, by whoever is serving. This guide shows how to set wholesale and retail prices on purpose. For setting the retail price itself, see [pricing strategy for small shops](/blog/pricing-strategy-small-shop).

## Why wholesale rates are lower

[Wholesaling](https://en.wikipedia.org/wiki/Wholesaling) means selling in bulk to someone who is not the end user: another shop, a restaurant, a contractor, an office. A lower price per piece for these buyers makes sense because the sale costs you less per piece:

- One bill and one conversation instead of twenty-four.
- No time on the shelf; the carton goes straight from your godown to the buyer.
- Your cash comes back faster on stock you might otherwise hold for weeks.

That is the logic of a [volume discount](https://en.wikipedia.org/wiki/Volume_discount). It also tells you the limit: the discount should be no bigger than the cost you actually save, plus whatever you choose to give to win the account.

## Three ways to structure the rate

**By quantity.** The rate depends on how much is bought: retail for 1 to 11 pieces, a dozen rate from 12, a carton rate for a full carton. Anyone buying the quantity gets the rate. This is the fairest and easiest to run.

**By pack.** The carton, box, dozen or bori has its own price, separate from the loose piece. A customer who takes a sealed carton gets the carton price; one who takes 20 loose pieces pays the piece rate.

**By customer type.** Contractors, restaurants or other shopkeepers on your books get a trade rate on everything, whatever the quantity on that bill. This suits buyers who come often in small amounts but buy a lot over a month.

Most shops use a mix: pack prices for packaged goods, quantity tiers for items sold loose, and a trade rate for a short list of known buyers.

## A worked example: carton vs piece

For example, a biscuit pack comes 24 to a carton. Illustrative figures:

| Rate | Price | Per pack | Margin |
|---|---|---|---|
| Landed cost | 2,400 rupees per carton | 100 rupees | |
| Retail, single pack | 120 rupees | 120 rupees | 16.7% |
| Dozen rate (12 packs) | 1,380 rupees | 115 rupees | 13.0% |
| Carton rate (24 packs) | 2,640 rupees | 110 rupees | 9.1% |
| Carton rate with 60 rupees delivery included | 2,640 rupees | 107.50 rupees after delivery | 6.8% |

Three things to notice. Each step down is still above cost. The carton price is clearly lower per pack than the dozen price, so the tiers make sense to the buyer. And free delivery quietly takes the carton margin from 9.1% to 6.8%; charge it separately or build it into the rate.

Check the other direction too: a pack price should never be higher than buying the same number of loose pieces. If the carton costs more than 24 single packs, nobody will buy the carton.`),
    steps(
      'Build a wholesale price list',
      [
        ['Start from landed cost per piece', 'Divide the carton or bag cost, plus transport, by the number of pieces or kilos you can actually sell.'],
        ['Set a minimum margin for bulk', 'Decide the lowest margin you accept on a wholesale sale, by category. No rate goes below it.'],
        ['Fix the tiers', 'Choose the quantities where the rate changes, such as a dozen, a carton, or 50 bags, and the rate at each.'],
        ['Price every pack', 'Give the carton, box or dozen its own price, checked against cost and against the loose price.'],
        ['List trade customers', 'Write down which buyers get a trade rate and on what terms: cash, or credit with a payment day.'],
        ['Review with every cost change', 'When the supplier rate moves, update the retail and wholesale rates together.'],
      ],
      'Put the list on one page for the counter, so everyone quotes the same rate.',
      true,
    ),
    prose(`## Rates by customer type

Some businesses run on trade customers. A hardware store may give contractors a rate below retail on every item; a meat shop may give restaurants a fixed per-kilo rate. A few rules keep this under control:

- **Name the customers.** The trade rate is for buyers on your list, not for whoever says "thekedar hoon".
- **Tie it to volume.** Review each trade buyer's monthly purchases. If they no longer buy enough, move them back to retail rates or the quantity tiers.
- **Price credit separately from cash.** Wholesale rates are already thin. A buyer who pays in 30 days costs you more than one who pays now; see [cash vs credit sales](/blog/cash-vs-credit-sales).
- **Show the rate on the bill.** The buyer sees which rate they got, and you can check later that it was applied correctly.

## Protecting the margin

Wholesale is where shops most often sell below cost without noticing. The usual causes:

- **Old cost prices.** The supplier raised the carton rate last week; the wholesale price did not move. On a 7% margin, a small cost rise wipes out the profit. The Pakistan Bureau of Statistics tracks price movements, including a wholesale price index, on its [price statistics page](https://www.pbs.gov.pk/price-statistics/), but your own purchase bills are the number that matters.
- **Rates given at the counter.** A salesman matches a rate he heard from another shop. Decide who may give a wholesale rate, and to whom.
- **Retail customers getting bulk rates.** A family buying 12 packs for a function is fine under a quantity tier; a friend getting the trade rate on one pack is not.
- **Hidden costs.** Delivery, loading, longer credit and returns all come out of the wholesale margin. Count them.
- **Never checking.** Look at profit by product each month for your bulk lines. If an item earns almost nothing, change the rate or stop selling it wholesale.`),
    shot({
      heading: 'See what bulk sales really earn',
      body: 'Profit by product shows sale, cost, profit and margin for each item, so a wholesale line that earns almost nothing stands out.',
      id: SHOT.profitByProduct,
      url: 'app.nafaa.pk/reports/profit',
      layout: 'full',
      caption: 'Profit by product report for a demo grocery store.',
    }),
    prose(`## How Nafaa helps

In Nafaa every product, and every pack of it (carton, box, dozen, bori, strip), can carry its own price and an optional wholesale price, and the multi-units page sells and buys by the pack as well as loose. Its analytics flag packs priced above the loose rate or below cost. On the [hardware](/industries/hardware) counter the bill switches between retail and contractor rate, and items can have quantity rates, so 50 bags get the bulk rate as soon as the quantity is entered. The [meat shop](/industries/meat) counter switches to the restaurant rate for hotel and restaurant buyers on khata. [Inventory](/product/inventory) shows price, cost and margin on each product, and the profit by product report shows what each line earns.`),
    tip('Write the minimum bulk margin for each category on the counter price list. When a buyer pushes for a lower rate, the counter can check it in seconds instead of guessing.', 'Give the counter a floor'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Why wholesale rates are lower', 'Quantity, pack and customer-type rates', 'Carton vs piece example', 'Build a price list', 'Rates by customer type', 'Protecting the margin', 'How Nafaa helps'],
  dropped: [],
  needsOwner: [
    'A retail/wholesale rate switch at the counter exists only in the hardware and meat setups (rateMode). Should the shared POS for kiryana and other industries get one, using the stored wholesale price?',
  ],
  evidence: [
    'apps/web/src/modules/inventory/product-units/pages/ProductUnitsPage.tsx',
    'apps/web/src/modules/inventory/product-units/components/UnitEditor.tsx',
    'apps/web/src/modules/inventory/product-units/components/UnitsAnalytics.tsx',
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
    'apps/web/src/industries/hardware/pos/config.ts',
    'apps/web/src/industries/hardware/pos/QtyRateModal.tsx',
    'apps/web/src/industries/hardware/products/HardwareProductEditor.tsx',
    'apps/web/src/industries/meat/pos/config.ts',
    'apps/web/src/modules/inventory/products/list/components/ProductCard.tsx',
    'apps/web/src/modules/finance/profit-report/pages/ProfitReportPage.tsx',
  ],
  factNote:
    'Worked example uses illustrative amounts. Wikipedia articles on wholesaling and volume discounts and the PBS price statistics page (SPI, CPI, WPI listed) were opened and checked to load on 2026-10-26. Product statements checked against the code (see evidence).',
};

export default spec;
