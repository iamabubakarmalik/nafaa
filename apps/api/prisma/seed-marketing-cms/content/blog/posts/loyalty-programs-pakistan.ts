/**
 * Loyalty programmes for Pakistani shops: points, member discounts, stamp
 * cards, levels and discount codes compared; what each really costs as a
 * share of gross profit; rules that keep a programme affordable; and the
 * common ways it gets abused at the counter.
 */
import { diagram, prose, steps } from '../../main-pages/_build';
import { note, sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Loyalty program', 'https://en.wikipedia.org/wiki/Loyalty_program', 'Wikipedia'),
  src('Breakage (accounting)', 'https://en.wikipedia.org/wiki/Breakage_(accounting)', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'loyalty-programs-pakistan',
  cover: PHOTO.loyaltyProgramsPakistan,
  title: 'Loyalty Programs for Shops in Pakistan: Points, Discounts or Stamp Cards',
  summary:
    'A loyalty programme only pays when the reward is small next to your gross profit and the rules stop it from being given to people who would have bought anyway. For most Pakistani shops a simple points scheme, worth about one percent of the bill and tied to the customer\'s phone number, beats a flat member discount.',
  category: 'business',
  tags: ['PRODUCT:loyalty', 'GLOSSARY_TERM:loyalty-points', 'GLOSSARY_TERM:discount'],
  related: ['BLOG_POST:whatsapp-customer-retention', 'BLOG_POST:how-to-calculate-profit-margin', 'BLOG_POST:pricing-strategy-small-shop', 'GLOSSARY_TERM:gross-margin'],
  isNew: true,
  sources: SOURCES,
  seoTitle: 'Loyalty Programs for Shops in Pakistan: What Works',
  seoDescription: 'Points, member discounts, stamp cards and discount codes compared for Pakistani shops: what each costs, rules that keep it affordable, and how to stop abuse.',
  focusKeyword: 'loyalty program for shops Pakistan',
  blocks: [
    prose(`Every shop owner wants regulars, and many have tried a loyalty card at some point. Some programmes bring customers back for years. Others quietly give away profit to people who would have shopped with you anyway, and then get abandoned when the owner sees the bill.

The difference is rarely the idea. It is the arithmetic and the rules. This guide compares the common types of loyalty scheme for Pakistani shops, works out what each really costs, and lists the rules and checks that keep a programme from leaking.

## What a loyalty programme is for

A [loyalty program](https://en.wikipedia.org/wiki/Loyalty_program) is a way of rewarding customers for continuing to buy from you. In a neighbourhood shop, that usually means one of three goals:

1. **Win more of a regular's spending.** The family that buys milk and bread from you but monthly ration from a superstore.
2. **Bring back customers who have gone quiet.** A reason to return after a few weeks away.
3. **Know who your customers are.** A phone number on every bill tells you who buys what, which is useful long after the reward is forgotten.

The same article notes a common complaint: loyalty schemes can end up giving discounts to people who are buying anyway. Keep that in mind when you choose the reward.

## The main options compared

| Option | How it works | Works well for | Watch out for |
|---|---|---|---|
| Points | Customer earns points on each bill and spends them as a discount later | Kiryana, pharmacy, cosmetics, any shop with repeat buyers | Points that pile up for years; cashiers using their own number |
| Member discount | A fixed percentage off every bill for members | High-margin shops with few, high-value customers | Expensive: you pay it on every bill, even ones they would make anyway |
| Stamp card | Buy a set number, get one free | Bakery, tea and coffee, salon, car wash | Paper cards are easy to fake and easy to lose |
| Levels | Customers move up levels as their points grow | Seeing who your best customers are | Levels with costly perks you cannot sustain |
| Discount codes | A code for a set period, sometimes once per customer | Bringing back quiet customers, seasonal pushes | Codes shared widely beyond the people you meant |

These are typical patterns; your results depend on your margins and customers.

## Work out the cost before you launch

Loyalty is paid out of gross profit, not out of sales, so compare the reward with your margin. Here is an illustrative example for a grocery shop with a gross margin of about 12 percent. Use your own numbers; our guide to [calculating profit margin](/blog/how-to-calculate-profit-margin) shows how.

A customer spends **10,000 rupees** in a month. Gross profit on that is about **1,200 rupees**.

| Scheme | Reward given | Share of the 1,200 rupees gross profit |
|---|---|---|
| Points: 1 point per 100 rupees, each point worth 1 rupee | 100 rupees | About 8% |
| Member discount of 5% on every bill | 500 rupees | About 42% |
| Stamp card: 10 bills over 1,000 rupees, then a free item that sells for 300 rupees (250 rupees at cost) | 250 rupees at cost | About 21% |

The numbers make the choice clear for a low-margin shop: a small points reward is affordable, and a flat discount is not. A bakery or salon with higher margins can afford a stamp card, and its customers understand one.

Two more things change the real cost:

- **Not everyone redeems.** Some points are never used. Accountants call unused value [breakage](https://en.wikipedia.org/wiki/Breakage_(accounting)). Do not plan on it, but an expiry date keeps old points from hanging over your books for years.
- **Points are a promise.** Until they expire or are used, the points customers hold are money you owe them as a discount. Look at the total value outstanding every month.`),
    diagram(
      'Points are earned on a bill, held for a while, then spent as a discount or expire.',
      {
        kind: 'flow',
        nodes: [
          { id: 'bill', label: 'Bill with phone number', icon: 'receipt', note: 'Points only for a named customer' },
          { id: 'earn', label: 'Points earned', icon: 'coins', note: 'For example 1 point per 100 rupees' },
          { id: 'hold', label: 'Points held', icon: 'hourglass', note: 'Money you owe as a discount' },
          { id: 'redeem', label: 'Spent on a later bill', icon: 'badge-percent', note: 'Within minimum and maximum limits' },
          { id: 'expire', label: 'Expired', icon: 'calendar-clock', note: 'After the period you set' },
        ],
        edges: [
          { from: 'bill', to: 'earn' },
          { from: 'earn', to: 'hold' },
          { from: 'hold', to: 'redeem', label: 'used' },
          { from: 'hold', to: 'expire', label: 'unused' },
        ],
        animate: true,
      },
      'The life of a loyalty point',
    ),
    steps(
      'Rules that keep it affordable',
      [
        ['Set a modest earn rate', 'Start around one percent of the bill. You can raise it for a season; lowering it later upsets people.'],
        ['Set a minimum to redeem', 'Points can be spent only once the customer has a meaningful amount, so the counter is not slowed by tiny discounts.'],
        ['Cap the share of a bill', 'Points can pay for only part of a bill, so a single visit never becomes free.'],
        ['Give points an expiry', 'For example, points expire some months after they were earned. Tell customers clearly.'],
        ['Tie points to a phone number', 'One account per customer, found by number at the counter. No number, no points.'],
        ['Write the rules on a card', 'A small notice at the counter avoids arguments: how to earn, how to spend, when they expire.'],
      ],
      undefined,
      true,
    ),
    prose(`## How loyalty gets abused

Most abuse happens at the counter, not by customers:

- **Cashier's own number.** A cashier puts their own or a friend's number on customers' bills and collects the points. Look for one account earning on many bills a day.
- **Points on returned goods.** A customer buys, earns points, then returns the goods. Points earned on a returned item should be taken back.
- **Manual "gifts".** Adding points by hand should be limited to the owner or manager, with a reason, and every adjustment should be visible in history.
- **Codes on social media.** A code meant for twenty regulars gets posted in a group. Use a limit per customer and an end date.
- **Splitting bills.** If you give a bonus above a bill size, watch for one purchase split into several bills.

Review the programme monthly: points given, points redeemed, value outstanding, and the top earners. If the numbers look odd, check the bills behind them.`),
    note('Tell customers their balance. A WhatsApp message with "aap ke 450 points hain, agli khareedari par 450 rupay kam" brings people back more reliably than a card in their wallet. Our [WhatsApp retention guide](/blog/whatsapp-customer-retention) has message ideas.', 'A programme only works if people remember it'),
    prose(`## How Nafaa helps

Nafaa has [loyalty points](/product/loyalty) built in. In Settings you choose points per rupee, the value of one point, the minimum points per bill, the largest share of a bill points can pay, and after how many days unused points expire. Points are earned on bills with a customer selected and redeemed at the counter from the discount dialog, alongside discount codes. If goods are returned, the points earned on them are taken back, and a cancelled bill reverses both points earned and points used.

The Loyalty page shows what the programme costs: points outstanding and their rupee value, points given, redeemed and expired over any period, member levels from Starter to Diamond by points balance, each member's history, and manual gifts or corrections. Discount codes have their own page with dates, branch and per-customer limits, and can be shared on WhatsApp. See also the glossary entry for [loyalty points](/glossary/loyalty-points).`),
    tip('Launch loyalty in a quiet month, not just before Eid. You want staff to learn the counter steps and customers to see their first points before the rush.', 'Start in a quiet month'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['What it is for', 'Options compared', 'Cost before launch', 'Life of a point', 'Rules', 'Abuse', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/modules/organization/settings/sections/CustomerSection.tsx',
    'apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx',
    'apps/web/src/modules/customers/loyalty/api/loyalty.api.ts',
    'apps/web/src/modules/pos/components/PosPerks.tsx',
    'apps/web/src/modules/pos/components/PosDiscountModal.tsx',
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/api/src/modules/sales/returns/returns.service.ts',
    'apps/api/src/modules/sales/sales/sales.service.ts',
  ],
  needsOwner: ['No loyalty screenshot exists yet; a Loyalty page screenshot would make this post stronger.'],
  factNote:
    'Wikipedia used for the definition of a loyalty program, the criticism that schemes can discount goods to people buying anyway, and the definition of breakage. All PKR amounts and margins are illustrative examples. Links checked on 2026-10-26. Product statements checked against the code (see evidence).',
};

export default spec;
