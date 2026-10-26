/**
 * How a jewellery bill is built in Pakistan: karat, daily rate, making,
 * wastage, stones and old-gold exchange. The worked example uses a round
 * placeholder rate, labelled as such; no market rate is quoted.
 */
import { diagram, prose, steps } from '../../main-pages/_build';
import { FAKE_AUTHOR, note, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const spec: PostSpec = {
  slug: 'gold-rate-pricing-jewelry-shops',
  seoDescription: 'How a jewellery bill is built from karat, the daily gold rate, making charges, wastage, stones and old-gold exchange, with a worked example in rupees.',
  title: 'How Jewellery Shops Price Gold in Pakistan',
  summary:
    'Karat and purity, the daily rate, making charges, wastage, stones and old-gold exchange: how a jewellery bill is built, with a worked example and tips for showing each part clearly to the customer.',
  category: 'industry',
  cover: PHOTO.goldRatePricingJewelryShops,
  tags: ['INDUSTRY:jewelry'],
  related: ['PRODUCT:pos', 'PRODUCT:inventory', 'BLOG_POST:how-to-calculate-profit-margin'],
  blocks: [
    prose(`Gold jewellery in Pakistan is priced from a handful of parts: the gold itself at today's rate, the making charge (mazdoori), the wastage allowance, any stones, and smaller charges like polish or hallmarking. Tax is added on top where it applies. Customers compare shops on the total, but they trust the shop that can show how the total was reached. This post walks through each part, puts them together in a worked example, and covers old-gold exchange, where most arguments happen.

## Karat and purity

Purity is measured in karats. Pure gold is 24 karat; lower karats are alloys with other metals, which makes the piece harder and cheaper per gram.

| Karat | Gold content | Common use |
|-------|--------------|-----------|
| 24K | 99.9% | Bars, coins, some plain pieces |
| 22K | 91.67% | Most traditional jewellery |
| 21K | 87.5% | Jewellery, especially in some markets |
| 18K | 75% | Pieces with stones, lighter designs |

When a customer asks for 22K jewellery, 22 parts in 24 of its metal weight are gold. A hallmark or a purity test is how the customer knows the karat on the bill is the karat in the piece.

## Weight units

Most shops quote in tola and sell by grams. One tola is about 11.66 grams. Smaller units (masha and ratti) are still used in some markets. Whatever unit you quote, the bill should show the weight in grams too, because that is what the scale reads.

## The daily rate

The gold rate moves with the international price and the rupee. Most jewellers follow the rate announced in their local sarafa market each morning, set per tola or per 10 grams for 24K, and work out the rate for 22K, 21K and 18K from it. Some shops keep separate buying and selling rates. Whatever your method, the rule is the same: every sale that day is priced from the rate you set that morning, and the rate is written on the bill.`),
    note('This post does not quote a gold rate. Rates change every day; use the rate your market announces and record it in your system each morning.', 'No rate here on purpose'),
    prose(`## Making charges (mazdoori)

Making charges pay for the work of the karigar. Shops set them in one of three ways:

- **Per gram:** a fixed amount for each gram of the piece.
- **Percentage:** a share of the gold value.
- **Fixed:** one amount for the piece, common for small items.

Handmade or detailed pieces cost more to make than machine-made chains. Many shops vary making charges by design category, and some negotiate it with regular customers. Whatever you agree, write it on the bill as its own line.

## Wastage (khaad)

Wastage covers the gold lost while making a piece: filings, melting and polishing. It is added either as a percentage of the gold value or as extra grams charged at the day's rate. Customers often ask about wastage most, so be ready to explain it.

## Stones and other charges

Stones are priced separately, by carat or per piece, and their weight should be taken off the metal weight so the customer does not pay the gold rate for a stone. Polish, hallmark and designer charges, if you use them, go on their own lines.`),
    steps(
      'Putting it together: a worked example',
      [
        ['Gold value', 'Net gold weight × today\'s rate for that karat. Say a 22K bangle has 20 grams of gold, and (only for easy arithmetic, not a real rate) the 22K rate is 10,000 rupees per gram. Gold value = 200,000 rupees.'],
        ['Wastage', 'At an agreed 5% wastage, add 10,000 rupees. If you charge wastage in grams instead, multiply the extra grams by the same rate.'],
        ['Making', 'At an agreed 500 rupees per gram, making is 10,000 rupees. With a percentage method, it would be that share of the gold value.'],
        ['Stones and extras', 'Add the stone value and any polish or hallmark charge as separate lines.'],
        ['Tax and total', 'Add tax where it applies, then total. Show every line on the bill, not just the total.'],
      ],
      'The method is the same for any rate. The numbers below are placeholders to show the arithmetic.',
    ),
    diagram(
      'Each line of a jewellery bill builds on the one before it. Showing every line is what lets the customer check the total.',
      {
        kind: 'flow',
        nodes: [
          { id: 'rate', label: "Today's rate", icon: 'calendar', note: 'For the karat of the piece' },
          { id: 'gold', label: 'Gold value', icon: 'calculator', note: 'Net weight × rate' },
          { id: 'wastage', label: 'Wastage', icon: 'percent', note: 'Percent or grams' },
          { id: 'making', label: 'Making', icon: 'hammer', note: 'Per gram, percent or fixed' },
          { id: 'extras', label: 'Stones and extras', icon: 'gem', note: 'Polish, hallmark' },
          { id: 'total', label: 'Bill total', icon: 'receipt', note: 'Tax where it applies' },
        ],
        edges: [
          { from: 'rate', to: 'gold' },
          { from: 'gold', to: 'wastage' },
          { from: 'wastage', to: 'making' },
          { from: 'making', to: 'extras' },
          { from: 'extras', to: 'total' },
        ],
        animate: true,
      },
      'How the bill adds up',
    ),
    prose(`## Old gold exchange

Many sales include old jewellery in exchange. The fair way to handle it, and the way that avoids disputes later:

1. Weigh the old piece in front of the customer and test the purity.
2. Agree any deduction (for stones, dirt or loss on melting) before you start the new bill, and write it down.
3. Price the old gold at your buying rate for that karat.
4. Show the old gold as its own line on the new bill, taken off the total.

If the customer later asks why they got less than "the rate", the bill answers for you.

## Selling it back: the buyback promise

Some shops promise to buy back their own pieces at a set deduction. If you do, print the terms on the bill: which rate applies, which charges are not returned (usually making), and how long the promise lasts.

## How Nafaa prices a piece

In Nafaa's jewellery setup the owner sets today's gold and silver rate once in the morning, and the counter prices every piece from it. Each piece carries its metal, karat, net weight and stones. Making can be set per gram, as a percentage or as a fixed amount; wastage as a percentage or in grams; and polish, hallmark and designer charges each have their own field. Old gold comes in as an exchange against the sale, and custom orders, karigar work and repairs are tracked on their own screens, with metal stock kept by weight.`),
    tip('Write the day\'s rate, the karat and the net weight on every bill. Most complaints about jewellery bills are about one of these three, and a clear bill settles them at the counter.', 'Three things every bill should show'),
  ],
  outline: ['Karat and purity', 'Weight units', 'The daily rate', 'Making', 'Wastage', 'Stones', 'Worked example', 'Old gold exchange', 'Buyback', 'How Nafaa prices'],
  dropped: [
    '"The formula used by Zeenat Jewellers and other top brands" (named business, no consent).',
    'Indicative tola rates for August 2026 and the worked example built on them.',
    'Making-charge and wastage percentage tables (no source).',
    'GST rates on gold and making charges (not cited).',
    '"Nafaa\'s live gold API" (the app uses a daily rate set by the jeweller).',
    FAKE_AUTHOR,
  ],
  evidence: [
    'apps/web/src/industries/jewelry/JewelryPack.tsx',
    'apps/web/src/industries/jewelry/lib/meta.ts',
    'apps/web/src/industries/jewelry/api/metal-rates.api.ts',
    'apps/web/src/industries/jewelry/api/exchanges.api.ts',
    'apps/web/src/industries/jewelry/api/karigars.api.ts',
  ],
};

export default spec;
