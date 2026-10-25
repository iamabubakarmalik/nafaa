/**
 * Ramadan, Chand Raat and Eid planning for retail shops: stock, cash,
 * staff, counter speed, offers and the week after Eid.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { FAKE_AUTHOR, tip, type PostSpec } from '../_post';

const spec: PostSpec = {
  slug: 'ramadan-eid-retail-strategy',
  title: 'Ramadan and Eid Planning for Retail Shops',
  summary:
    'How to plan stock, cash, staff and the counter for Ramadan, Chand Raat and Eid: what to order and when, how to handle late nights and the last-night rush, simple offers that work, and what to do in the quiet week after.',
  category: 'business',
  tags: ['INDUSTRY:kiryana', 'INDUSTRY:garments'],
  related: ['PRODUCT:pos', 'PRODUCT:inventory', 'BLOG_POST:whatsapp-customer-retention', 'BLOG_POST:stock-taking-guide'],
  blocks: [
    prose(`For many shops in Pakistan, Ramadan and the run-up to Eid are the busiest weeks of the year. Grocery stores sell more dates, besan, oil, sugar and drinks in the first week of Ramadan than in a normal month. Garments, shoes, bangles and cosmetics shops do a large share of their year's business in the last ten days, with Chand Raat as the single biggest night. Bakeries and sweet shops sell boxes of mithai and sewaiyan by the hundred.

The rush rewards shops that planned a month ahead and punishes those that did not: empty shelves on the best days, queues that send customers next door, and cash that does not add up at sehri time. This guide is a planning checklist.

## The season in four phases

Plan by phase, not as one long rush.`),
    diagram(
      'Each phase needs different stock, staff and counter preparation.',
      {
        kind: 'timeline',
        items: [
          { date: '4 weeks before', label: 'Plan and order', note: 'Check last year\'s sales, place supplier orders, arrange cash' },
          { date: 'First week', label: 'Ramadan staples', note: 'Grocery peak: dates, besan, oil, drinks, fruit' },
          { date: 'Last ten days', label: 'Eid shopping', note: 'Clothes, shoes, bangles, cosmetics, gifts' },
          { date: 'Chand Raat', label: 'The busiest night', note: 'Extra counters, cash float, fast billing' },
          { date: 'Week after Eid', label: 'Exchanges and clearance', note: 'Size swaps, slow stock, supplier payments' },
        ],
        animate: true,
      },
      'Ramadan to Eid at a glance',
    ),
    prose(`## Stock: order from last year's numbers

The best guide to this year is what sold last year in the same weeks. Pull your sales by item for last Ramadan and the Eid week, and look at three things: what sold out (order more), what was left over (order less), and what customers asked for that you did not have.

**Grocery and kiryana:** dates, besan, gram, oil and ghee, sugar, sherbets and drinks, fruit, vermicelli for Eid, spices, rice and meat-related items before Eid ul Adha.

**Garments, shoes and accessories:** sizes run out unevenly. Look at last year's sales by size and colour, not just by design, and reorder the sizes that sold out first.

**Bakery and sweets:** plan mithai and sewaiyan boxes, and the packaging for them, well ahead. Packaging often runs out before the product.

Order early. Suppliers and wholesale markets get busy in the second half of Ramadan, prices can move, and delivery slows.

## Cash: plan the money before the stock

Extra stock needs extra cash weeks before the extra sales arrive. Work out how much more you will buy, when the supplier wants payment, and when you expect the sales. Ask regular suppliers for credit on the seasonal order. Collect old udhaar before Ramadan starts; customers spend more on their own needs during the month.

Arrange a larger cash float for the counter, with plenty of small notes. Many customers want new notes for Eidi; some shops keep a supply and say so.

## Staff and late nights

Shop hours shift after iftar and run late. Split shifts so the same person does not work from noon to sehri. Plan for the cashier's iftar break so the counter is never left without someone who can bill. Train any temporary staff before the last ten days, not on Chand Raat.`),
    steps(
      'Get the counter ready for Chand Raat',
      [
        ['Add a second counter', 'A phone or tablet with the POS open can bill at the door while the main counter handles the queue.'],
        ['Set up quick keys', 'Put the fastest sellers (bangles, mehndi cones, gift boxes, popular suits) on one-tap keys.'],
        ['Make ready-made bundles', 'An Eid gift pack or a set of three sold as one item bills in one tap and moves slower stock with fast stock.'],
        ['Check the printer and paper', 'Keep spare paper rolls and a charged backup phone. Test the printer the afternoon before.'],
        ['Plan for power and internet cuts', 'Keep the UPS charged. Billing that works offline and syncs later keeps the queue moving.'],
        ['Close shifts properly', 'Even at 3 a.m., count the drawer and record the difference before staff go home.'],
      ],
      undefined,
      true,
    ),
    shot({
      heading: 'Quick keys for the rush',
      body: 'Best sellers and bundles as one-tap tiles, with stock left shown on each, so the cashier never has to search during the last-night queue.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
      callouts: [
        { x: 40, y: 26, label: 'Categories and quick keys' },
        { x: 30, y: 47, label: 'Stock left on every tile' },
      ],
    }),
    prose(`## Offers that work

Simple offers beat clever ones in a rush.

- **Bundles:** a Ramadan grocery pack, an Eid gift box, a suit with matching dupatta. One price, one tap.
- **Time-bound discounts:** a discount for the first week of Ramadan on staples, ending on a set date so it does not run on into Eid.
- **Tell your regulars first:** a personal WhatsApp message to regular customers a week before Eid, saying what has arrived. See our [WhatsApp templates](/blog/whatsapp-customer-retention).

Set a discount limit for staff. In a rush, cashiers give extra discount to clear the queue, and it adds up.

## The week after Eid

Expect exchanges, mostly sizes in garments and shoes. Decide your exchange policy before Eid and print it on the bill. Count your stock, clear slow seasonal items with a sale, pay suppliers on time, and note what to do differently next year while it is fresh.

## How Nafaa helps

In Nafaa you can look back at last year's sales by item for the same dates, build combos sold as one item, put best sellers and combos on quick keys, set discount codes that start and expire on set dates, add extra counters on any phone or tablet, keep billing offline during cuts, and close each shift with expected and counted cash.`),
    tip('Write down, on the night after Eid, the three items you ran out of first and the three that were left over. That note is next year\'s order.', 'Make a note for next year'),
  ],
  outline: ['Four phases', 'Stock from last year', 'Cash planning', 'Staff and late nights', 'Chand Raat counter', 'Offers', 'Week after Eid', 'How Nafaa helps'],
  dropped: ['"How to 3x your sales" title.', 'Sales-uplift percentages (no source).', FAKE_AUTHOR],
  evidence: [
    'apps/web/src/modules/inventory/combos/pages/CombosPage.tsx',
    'apps/web/src/modules/pos/quick-keys/QuickKeyEditor.tsx',
    'apps/web/src/modules/sales/discounts/api/discounts.api.ts',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/organization/settings/sections/POSSection.tsx',
    'apps/web/src/industries/garments/GarmentsPack.tsx',
  ],
};

export default spec;
