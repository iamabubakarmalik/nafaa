/**
 * Sargodha pair page: seed, fertiliser and spray dealers serving the
 * district's farms, including its citrus (kinnow) orchards. Facts from
 * Wikipedia; no dealers or farmers are named.
 */

import { type PairCopy, pair, wiki } from './_build';

const agri: PairCopy = {
  city: 'sargodha',
  cityName: 'Sargodha',
  industry: 'agri',
  title: 'Agri dealer POS in Sargodha',
  summary:
    'Nafaa is POS for Sargodha seed, fertiliser and spray dealers: each farmer\'s account with land, crops and a credit limit, udhaar by crop season, bulk season orders with an advance, advisory slips, a crop calendar, subsidy claims, and a counter that refuses expired registrations. It sells by bag, maund, kilo or litre.',
  seoDescription: 'Agri dealer POS for Sargodha: farmer accounts, udhaar by crop season, bulk orders, crop calendar, subsidy claims and sale by bag or maund. Works offline.',
  focusKeyword: 'agri dealer pos sargodha',
  sub: 'For the dealer who gives fertiliser and spray on credit against the next harvest, to wheat farmers and kinnow growers alike, and has to collect it season by season.',
  badges: ['Udhaar by crop season', 'Bags and maund', 'Subsidy claims'],
  facts: [
    ['Built for', 'Seed, fertiliser and pesticide dealers, and farm-input shops'],
    ['Farmers', 'Village, acres, crops and a credit limit on each account'],
    ['Units', 'The 50 kg bag, the maund, the kilo or the litre'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Sargodha ke beej, khaad aur spray dealer ke liye: har kisaan ka khata zameen, fasal aur had ke saath, udhaar fasal ke season ke hisaab se, season ke bulk order advance ke saath, aur expire registration wala maal counter par nahi bikega.',
  local: `## Farming and farm supply around Sargodha

[Sargodha](https://en.wikipedia.org/wiki/Sargodha), along the Kirana Hills in central Punjab, has an economy that rests mainly on agriculture. The district is considered the best citrus-producing area of Pakistan, sometimes called the California of Pakistan, and it is described as the largest [kinnow](https://en.wikipedia.org/wiki/Kinnow)-producing district in the world. Its oranges are sent across the country and exported. The kinnow itself is a high-yield mandarin hybrid grown widely in Punjab, and the fruit matures in January and February.

Behind those orchards and the wheat and other crops around them stands a network of input dealers in the city and the market towns. They sell seed, fertiliser, sprays and tools, and much of it is sold on credit. A farmer takes urea and spray in the growing months and pays after the harvest, so the dealer's money is tied up for a whole season, sometimes longer when a crop disappoints.

That makes the khata the centre of the business. A paper register usually keeps one running total per farmer, with seasons mixed together, so it becomes hard to tell what is overdue from last year and what is normal for this season.

Two other things matter. Sprays and seed carry registrations and expiry dates, and an expired product should not leave the shop. And government subsidy schemes mean that the farmer sometimes pays a reduced price while the dealer waits to claim the rest.`,
  shotA: {
    heading: 'Every farmer\'s account and season',
    body: 'Each farmer has his village, land in acres, crops and a credit limit. The list shows what each one took this season, what came back, what carried over, and who has crossed the limit or is due now that the harvest has passed.',
  },
  work: `## A season at a Sargodha input dealer

**Morning.** Open the dashboard: sowing readiness, farmer recovery, registrations about to lapse and subsidy claims still pending.

**A farmer walks in.** Search by crop or pest at the counter to find what fits. His village, land, this season's udhaar and his credit limit show under his name on the bill. Sell by the 50 kg bag, the maund, the kilo or the litre; bulk rates apply once the bag count reaches your threshold.

**Advice.** When an orchard owner asks about a problem on his trees, record the crop, its stage and the problem, add the advice and the products suggested, print a slip and set a follow-up date.

**Booking for the season.** Book a farmer's bags ahead with an advance. Stock moves only when the order is delivered, and the normal bill is made then, with the advance already counted.

**Subsidy.** When a scheme applies, the farmer pays the reduced price and the shop's claim is tracked from pending to approved to paid, or rejected.

**Evening.** Take the day's recoveries on the farmer pages, and check the crop calendar before ordering for the next sowing. Stock on hand shows as the acres it can cover.`,
  table: {
    heading: 'Dealer jobs in Sargodha: register or Nafaa',
    caption: 'Where an input dealer\'s money gets lost, and what the app keeps.',
    columns: ['With a register', 'With Nafaa'],
    rows: [
      ['Farmer udhaar', 'One total per name, seasons mixed', 'Given, received and carried over per crop season'],
      ['Season bookings', 'A diary with the advance noted', 'Bulk order with advance; stock moves on delivery'],
      ['Expired registration', 'Noticed only if someone checks the bag', 'The counter will not sell it'],
      ['Spray expiry', 'Old batches found at the back', 'Batches with expiry, earliest valid batch sold first'],
      ['Subsidy money', 'Remembered, sometimes', 'Claim tracked to payment'],
    ],
  },
  shotB: {
    heading: 'Low stock before the sowing rush',
    body: 'The low-stock list shows what is running out and how much to order. With the crop calendar, urea and seed are in the godown before farmers come asking, not a week after.',
  },
  steps: {
    heading: 'Setting up a Sargodha agri shop on Nafaa',
    items: [
      ['Add farmers', 'Each with village, acres, crops, a credit limit and the balance from your register.'],
      ['List products with units', 'Bags, maund, kilos and litres, with registration and expiry where needed.'],
      ['Fill the crop calendar', 'Sowing and harvest dates, dose per acre and spray days for each crop.'],
      ['Enter open bookings', 'Season orders already taken, with their advances.'],
    ],
  },
  questions: `## Questions from Sargodha dealers

### Can I see what a farmer owes from last season separately?
Yes. Udhaar is kept by crop season, so you see what was taken this season, what came back and what carried over from before.

### Will the counter stop me selling an expired spray?
Yes. A seed, fertiliser or spray whose government registration has expired cannot be sold at the counter, and sprays in batches sell the earliest valid batch first.

### Can I give a bigger farmer a better rate on bags?
Yes. Bulk rates apply by themselves once the bag count reaches the threshold you set, so the counter does not depend on the owner remembering who gets which price.

### My shop is outside the city and the signal is weak. Will it work?
Yes. Bills are made on the device without internet and sync when the signal returns.

### Do I need tax integration?
Most input dealers do not. Optional FBR/PRA integration is there for a business that is required to report. See the [agri page](/industries/agri) and [Sargodha](/pos-software/sargodha) for the other trades on the same account.`,
  cta: {
    heading: 'Collect this season\'s udhaar on time',
    body: 'Free trial on the phone or computer at your counter. Setup help on WhatsApp.',
  },
  siblings: ['chiniot/furniture', 'faisalabad/pharmacy', 'gujranwala/hardware'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Sargodha'), wiki('Kinnow')],
  factNote:
    'Sargodha (Kirana Hills, economy mainly agriculture, best citrus-producing area, "California of Pakistan", largest kinnow-producing district in the world, oranges supplied nationally and exported) from Wikipedia; kinnow as a high-yield mandarin hybrid grown in Punjab, maturing in January-February, from Wikipedia. Opened 26 Oct 2026. Credit-against-harvest practice described in general terms. No dealers named. Product claims checked against the agri pack (farmers, seasonal udhaar, bulk orders, advisory, crop calendar, subsidy, registration check, units) and the low-stock page.',
};

export const sargodhaPairs: PairCopy[] = [agri];
export const sargodha = sargodhaPairs.map(pair);
