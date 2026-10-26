/**
 * Chiniot pair page: furniture showrooms and workshops. Chiniot is known for
 * carved wooden furniture and grew as a woodworking centre on the Chenab.
 * Facts from Wikipedia; no workshops or customers are named.
 */

import { type PairCopy, pair, wiki } from './_build';

const furniture: PairCopy = {
  city: 'chiniot',
  cityName: 'Chiniot',
  industry: 'furniture',
  title: 'Furniture shop software in Chiniot',
  summary:
    'Nafaa is software for Chiniot furniture showrooms and workshops: custom orders with design, wood, polish, size and sketch, advances on the customer\'s khata, each karigar\'s bench and pay, delivery and fitting with charges, and showroom stock by wood and finish. Profit shows after wood, labour and transport.',
  seoDescription: 'Furniture shop software for Chiniot: custom orders with sketches, advances on khata, karigar work and pay, delivery and fitting, profit after labour.',
  focusKeyword: 'furniture shop software chiniot',
  sub: 'Carved beds, dining sets and doors made to order, sold from the showroom and sent to buyers in other cities: orders, karigars, advances and deliveries in one app.',
  badges: ['Custom orders', 'Karigar work and pay', 'Delivery and fitting'],
  facts: [
    ['Built for', 'Furniture showrooms, carving workshops and made-to-order makers'],
    ['Orders', 'Design, wood, polish, fabric, size and sketch, with the days to make it'],
    ['Workshop', 'Who is making what, and wages saved as expenses'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Chiniot ke furniture showroom aur workshop ke liye: order par design, lakri, polish aur naap ke saath sketch, advance gahak ke khata me, har karigar ka kaam aur mazdoori, aur delivery aur fitting ka kharcha bill me.',
  local: `## Chiniot and its woodwork

[Chiniot](https://en.wikipedia.org/wiki/Chiniot), on the bank of the Chenab, is known across Pakistan for intricate wooden furniture. It grew as a woodworking centre because timber from Kashmir used to be floated down the river to the town, and Chinioti craftsmen have carved flowers and geometric patterns into wood for centuries. Its artisans are recorded as having worked on the Taj Mahal and the Wazir Khan Mosque, and the city's wooden architecture is still part of its identity. Wikipedia's article on the [furniture industry in Pakistan](https://en.wikipedia.org/wiki/Furniture_industry_in_Pakistan) lists Chiniot first among the country's leading wooden-furniture areas, along with Gujrat, Peshawar, Lahore and Karachi.

The trade works differently from most retail. Much of what a Chiniot maker sells is not sitting on the floor when the customer walks in. A family chooses a carved bed or a dining set from a design, picks the wood, the polish and the fabric, agrees a size and a price, pays an advance and waits weeks for it to be made. Many buyers come from other cities, so the order then travels by road and is fitted on arrival.

In between, the work sits on the benches of several karigars, some paid by the day, some per piece, some given advances against future work. The owner has to know which order is on whose bench, when it was promised, and how much has already been paid by the customer and to the workers.

A showroom in the same business also keeps ready pieces in stock and display items that are not for immediate sale.`,
  shotA: {
    heading: 'Advances and balances on every order',
    body: 'Furniture is rarely paid in one go. Advances, part payments and delivery charges land on the customer\'s khata, so you see what is owed on every order and can send a polite reminder on WhatsApp.',
  },
  work: `## An order from quotation to the customer's door

**Quotation.** Write the design, wood, polish, fabric and size, attach a sketch or a photo of the carving, and set the price including fitting. Print the quotation slip for the customer to take home.

**Advance.** When the customer agrees, take the advance. It goes into the drawer and onto the customer's khata at once, and the price is fixed from that point.

**Making.** Put a karigar on the order and follow its progress on his bench, with the days promised to the customer. The workload page shows how much is on each bench, so a new order goes to someone with time.

**Karigar pay.** Record daily wages, per-job rates or advances paid from the drawer. They are saved as expenses, so profit reflects the labour.

**Delivery and fitting.** Book the date, vehicle and driver, then mark the order out, reached, delivered or fitted. Transport, floors and fitting charges go on the bill. When the order is delivered, the bill is made and the advance is counted against it.

**Showroom.** Ready sofas, beds and almari are stock with wood, polish and fabric; colours and fabrics are variants. Mark new and display pieces, and filter the counter by room.`,
  table: {
    heading: 'Furniture jobs in Chiniot: paper or Nafaa',
    caption: 'What a made-to-order workshop tracks, and where it lives in Nafaa.',
    columns: ['On paper', 'In Nafaa'],
    rows: [
      ['Order details', 'A page with a rough sketch', 'Design, wood, polish, fabric, size and sketch on the order'],
      ['Customer advances', 'A receipt book the customer may lose', 'On the drawer and the khata the day they are paid'],
      ['Who is making what', 'Ask in the workshop', 'Each karigar\'s bench and progress on one page'],
      ['Karigar wages', 'Cash from the galla, not in profit', 'Saved as an expense and seen in profit'],
      ['Sending to another city', 'Transport cost added later or forgotten', 'Delivery and fitting charges on the bill'],
    ],
  },
  shotB: {
    heading: 'Profit after wood, labour and transport',
    body: 'Because karigar pay and transport are saved as expenses, the profit and loss statement shows what the business kept after materials, labour and delivery, not just the gap between sale and wood cost.',
  },
  steps: {
    heading: 'Setting up a Chiniot furniture business',
    items: [
      ['Add open orders', 'Each with its design, price, advance paid and promised date.'],
      ['Add your karigars', 'With how each is paid: daily, per job or with advances.'],
      ['List showroom pieces', 'Ready stock by wood, polish and fabric, display pieces marked.'],
      ['Set delivery charges', 'Transport, floors and fitting as charges you can add to a bill.'],
    ],
  },
  questions: `## Questions from Chiniot furniture makers

### Most of our buyers live in other cities. Does that change anything?
No. The order, the advance and the delivery are recorded the same way. Payments sent from another city by bank transfer or wallet are recorded on the customer's khata, next to the advance and the order's bill.

### Can I attach a photo of the carving the customer chose?
Yes. Custom orders hold a sketch along with the wood, polish, fabric and size.

### How do I see if an order is running late?
Each order shows the days promised and the karigar's progress, so late orders stand out before the customer calls.

### Can a salesman take orders without seeing our costs?
Yes. Staff roles decide what each person can do and see, including cost prices, so a salesman can take orders and advances while the wood cost and the workshop's numbers stay with the owner.

### Do I need tax integration?
Most workshops do not. Optional FBR/PRA integration is there if your business is required to report. See the [furniture page](/industries/furniture) and [Chiniot](/pos-software/chiniot) for the other trades on the same account.`,
  cta: {
    heading: 'Track every order from the bench to the buyer',
    body: 'Free trial on the phone or computer you already have. Setup help on WhatsApp.',
  },
  siblings: ['sargodha/agri', 'gujranwala/hardware', 'faisalabad/garments'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Chiniot'), wiki('Furniture industry in Pakistan')],
  factNote:
    'Chiniot (on the Chenab, known for intricate wooden furniture, woodworking centre because Kashmir timber was floated down the river, centuries of carving, artisans employed on the Taj Mahal and Wazir Khan Mosque) from Wikipedia; leading wooden-furniture areas (Chiniot, Gujrat, Peshawar, Lahore, Karachi) from Wikipedia\'s Furniture industry in Pakistan. Opened 26 Oct 2026. Buyers from other cities described in general terms, without counts. No workshops named. Product claims checked against the furniture pack (custom orders, karigar workload and pay, deliveries, showroom stock and display pieces).',
};

export const chiniotPairs: PairCopy[] = [furniture];
export const chiniot = chiniotPairs.map(pair);
