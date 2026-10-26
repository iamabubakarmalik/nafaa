/**
 * Menu engineering for restaurants: plate cost and food cost per dish,
 * profit per plate, the popularity and profit matrix (stars, workhorses,
 * puzzles, dogs) with a worked example, what to do with each group, menu
 * layout and deals.
 */
import { SHOT, prose, shot} from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Menu engineering', 'https://en.wikipedia.org/wiki/Menu_engineering', 'Wikipedia'),
  src('Contribution margin', 'https://en.wikipedia.org/wiki/Contribution_margin', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'restaurant-menu-engineering',
  title: 'Menu Engineering for Restaurants: Find Your Stars and Dogs',
  summary:
    'Menu engineering sorts every dish by how often it sells and how much profit each plate leaves, so you know which dishes to promote, reprice, rework or drop. This guide shows how to cost each plate, build the four groups with a worked example in PKR, and use the result in your menu layout and deals.',
  category: 'industry',
  cover: PHOTO.restaurantMenuEngineering,
  seoTitle: 'Menu Engineering for Restaurants in Pakistan',
  seoDescription: 'Cost every plate, rank dishes by sales and profit per plate, and decide what to promote, reprice or drop. Worked example with stars, workhorses and dogs.',
  focusKeyword: 'menu engineering',
  tags: ['INDUSTRY:restaurant', 'GLOSSARY_TERM:menu-engineering', 'GLOSSARY_TERM:food-cost'],
  related: ['SOLUTION:restaurants', 'BLOG_POST:restaurant-kot-system-guide', 'GLOSSARY_TERM:recipe-costing', 'PRODUCT:reports'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`Most restaurant owners know their best-selling dish. Fewer know which dish makes them the most money, and the two are often different. A biryani that sells 30 plates a day at a thin margin can earn less than a karahi that sells 20. Menu engineering is a simple method to see this clearly and act on it.

The idea is not new. According to [Wikipedia’s article on menu engineering](https://en.wikipedia.org/wiki/Menu_engineering), the concept was introduced in 1982 by Michael L. Kasavana and Donald I. Smith. It needs only two numbers per dish: how many plates sold in a period, and the profit each plate leaves after its ingredients.

## Step 1: Cost every plate

Start with a recipe for each dish: every ingredient with its quantity per plate, or per degh divided by the plates it serves. Price each ingredient at what you paid on your last purchase, not last year’s rate. Include oil, spices, garnish and, for takeaway, the box and bag.

For example, a half chicken karahi might use 500 g chicken, tomatoes, oil, ginger, garlic, green chillies and spices. If those add up to 560 rupees at today’s rates, that is the plate cost.

Two figures follow from it:

- **Food cost %** = plate cost ÷ selling price. At a price of 1,400 rupees, the karahi’s food cost is 40%.
- **Profit per plate** = selling price − plate cost. Here, 840 rupees. Accountants call this the [contribution margin](https://en.wikipedia.org/wiki/Contribution_margin): what each sale leaves to pay rent, salaries, gas and electricity, and then profit.

Chicken, mutton and oil rates move often in Pakistan. A plate cost worked out three months ago may be wrong today, so update recipe costs whenever a main ingredient’s rate changes. The glossary has more on [food cost](/glossary/food-cost) and [recipe costing](/glossary/recipe-costing).

## Step 2: Count plates sold

Take a period long enough to smooth out odd days, such as 30 days, and count plates sold per dish from your POS. Leave out staff meals and complimentary plates, and use net sales after returns. Compare dishes within the same part of the menu where you can: mains with mains, drinks with drinks.

## Step 3: Sort dishes into four groups

Compare each dish with the menu as a whole:

- **Popularity:** in the classic method, a dish counts as popular if it sells at least 70% of an equal share. With six dishes and 3,000 plates, an equal share is 500, so the bar is 350 plates.
- **Profit:** a dish counts as high-profit if its profit per plate is at or above the average profit per plate across all plates sold.

That gives four groups:

| Group | Sells | Profit per plate |
|---|---|---|
| Star | Above the bar | Above average |
| Workhorse (sometimes called plowhorse) | Above the bar | Below average |
| Puzzle | Below the bar | Above average |
| Dog | Below the bar | Below average |`),
    prose(`## Worked example: six dishes over 30 days

| Dish | Plates sold | Price (rupees) | Plate cost (rupees) | Food cost % | Profit per plate (rupees) | Group |
|---|---|---|---|---|---|---|
| Chicken karahi (half) | 700 | 1,400 | 560 | 40% | 840 | Star |
| Chicken handi | 500 | 1,300 | 520 | 40% | 780 | Star |
| Chicken biryani | 900 | 450 | 230 | 51% | 220 | Workhorse |
| Daal mash | 550 | 500 | 150 | 30% | 350 | Workhorse |
| Mutton karahi (half) | 200 | 2,600 | 1,500 | 58% | 1,100 | Puzzle |
| Fish tikka | 150 | 1,200 | 800 | 67% | 400 | Dog |

*Illustrative numbers. 3,000 plates in total; popularity bar 350 plates; average profit per plate about 550 rupees.*`),
    prose(`Two lessons stand out in this example. Daal mash has the lowest food cost % on the menu, 30%, yet it is a workhorse, because 350 rupees per plate is below the average. Mutton karahi has a high food cost % of 58%, yet it leaves the most rupees per plate. Food cost % alone would have pointed you the wrong way on both. The Wikipedia article makes the same point: low food cost and high gross profit are not the same thing.

## What to do with each group

**Stars.** Protect them. Keep the recipe and portion consistent, keep them visible at the top of their section, and avoid discounting them. If a star runs out often, plan more prep for it.

**Workhorses.** Customers love them, so do not remove them. Raise the margin carefully instead:

- A small price rise, tested on one dish at a time.
- Check the portion. Is the plate getting more chicken than the recipe says?
- Pair it with high-margin extras. A biryani with raita and a drink earns more than biryani alone.
- Use it as the anchor of a deal that also carries higher-margin items.

**Puzzles.** They earn well per plate but do not sell enough. Help them be seen:

- Move them to the top of their section or a boxed area of the menu.
- Write a short, clear description. Wikipedia notes that descriptive labels may raise how customers value a dish.
- Ask waiters to suggest them, especially to larger tables.
- If a puzzle still does not move after a month of effort, consider whether the price is too high for your area.

**Dogs.** Remove them, rework them, or keep them for a reason. A dish that rarely sells still costs you stock, prep time and kitchen space. Keep a dog only if it serves a purpose, such as a plain dish families expect for children, and then cut its prep so little is wasted.

## Menu layout

Layout advice is full of rules about where the eye lands first. Be careful with them: Wikipedia’s article notes there is no empirical evidence yet that these menu “sweet spots” work. What is safe to do:

- Group dishes clearly by section (BBQ, karahi and handi, rice, breads, drinks, desserts).
- Put stars and puzzles first within each section.
- Keep the menu short enough to read. Every dog you remove gives the rest more attention.
- Use the same dish names on the menu, the POS and the kitchen ticket, so the [KOT](/blog/restaurant-kot-system-guide) and the report match what the customer ordered.`),
    shot({
      heading: 'One menu for the counter, the kitchen and the reports',
      body: 'Dishes are grouped by category with their prices. The same items drive the POS, the kitchen tickets and the sales and profit figures.',
      id: SHOT.restaurantMenu,
      url: 'app.nafaa.pk/restaurant/menu',
      layout: 'full',
      caption: 'Menu engineering only works when every plate sold is recorded against the right dish.',
    }),
    prose(`## Build deals from the matrix

Deals are common in Pakistani restaurants, and they are where margin is most often lost. Build each [combo deal](/glossary/combo-deal) on purpose:

1. Anchor it with a star or workhorse that pulls customers in.
2. Add items with a high profit per plate, such as naan, raita and drinks.
3. Add up the plate costs of everything in the deal and check the deal still leaves a healthy profit.

For example, a deal of a half chicken karahi (plate cost 560 rupees), four naan (60 rupees in total) and a 1.5 litre drink (180 rupees) costs 800 rupees to serve. At 1,999 rupees it leaves 1,199 rupees, more than the karahi alone, and the customer sees a saving against ordering each item separately. If the deal had been built around fish tikka instead, the numbers would look very different.

Time-limited offers, such as a tea discount in a slow afternoon, can fill quiet hours. Run them on slow periods and slow dishes, not on stars that already sell at full price.

## How often to review

Run the matrix monthly, and again after any menu change, price change or large rate change in chicken, mutton or oil. Compare the same period length each time. A dish that moves from workhorse to star after a recipe change is the result you want to see.

## How Nafaa helps

In Nafaa’s [restaurant setup](/industries/restaurant), each dish can carry a recipe, and the recipes screen shows plate cost at today’s rates and food cost %, with a button to refresh costs when ingredient rates change. The menu’s analytics tab ranks dishes by sales and profit over 7, 30 or 90 days and puts each into star, workhorse, puzzle or dog, using the same bill figures as the profit report. Combos and time-based happy-hour rules are built in, and happy hours stay within the shop’s discount limit. See [Nafaa for restaurants](/solutions/restaurants) for the full setup.`),
    tip('Before you change any price, run the matrix on the last 30 days and save it. Run it again 30 days after the change. Without a before and after, you are guessing.', 'Measure before and after'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Cost every plate', 'Count plates sold', 'Four groups', 'Worked example', 'What to do with each group', 'Menu layout', 'Deals', 'Review cadence', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/industries/restaurant/pages/RestaurantProductsListPage.tsx',
    'apps/web/src/industries/restaurant/api/menu-items.api.ts',
    'apps/api/src/industries/restaurant/menu-items/menu-board.service.ts',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/industries/restaurant/lib/menuMeta.ts',
    'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx',
    'apps/web/src/modules/inventory/combos/pages/CombosPage.tsx',
  ],
  factNote:
    'Wikipedia "Menu engineering" (introduced 1982 by Kasavana and Smith; no empirical evidence for sweet spots; descriptive labels; low food cost vs high gross profit) and "Contribution margin" (definition) read on 2026-10-26; both links checked to load on 2026-10-26. The 70%-of-equal-share popularity bar is the classic method and matches the app (menu-board.service.ts). All dish figures are illustrative. Product statements checked against the code.',
};

export default spec;
