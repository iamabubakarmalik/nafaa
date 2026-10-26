/**
 * Gujranwala pair pages: hardware and sanitary shops (the city makes sanitary
 * fittings, iron and steel, cutlery and farm tools) and appliance shops
 * (electric fans, coolers, heaters). Facts from Wikipedia; no makers,
 * shops or customers are named.
 */

import { type PairCopy, pair, wiki } from './_build';

const hardware: PairCopy = {
  city: 'gujranwala',
  cityName: 'Gujranwala',
  industry: 'hardware',
  title: 'Hardware and sanitary store POS in Gujranwala',
  summary:
    'Nafaa is POS for Gujranwala hardware, sanitary and steel shops: quotations at retail or contractor rate, delivery challans to the site, each contractor\'s udhaar with its age and limit, a reorder list per supplier, and pipes, fittings and paint by size, shade and brand. It keeps billing without internet.',
  seoDescription: 'Hardware and sanitary store POS for Gujranwala: quotations, contractor khata with limits, delivery challans, three rates and supplier reorder lists.',
  focusKeyword: 'hardware store pos gujranwala',
  sub: 'Sanitary fittings, steel and tools made down the road, sold by the piece to a plumber and by the truck to a contractor: rates, quotations, challans and udhaar in one app.',
  badges: ['Quotations to bills', 'Contractor khata', 'Delivery challans'],
  facts: [
    ['Built for', 'Hardware, sanitary, paint, steel and tool shops'],
    ['Rates', 'Retail, contractor and bulk on the same item'],
    ['Site work', 'Quotations, projects and delivery challans per trip'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Gujranwala ki hardware aur sanitary dukaan ke liye: quotation retail ya contractor rate par, site par maal ka challan, har contractor ka udhaar us ki had aur purana pan ke saath, aur supplier ke hisaab se reorder list.',
  local: `## Gujranwala makes what hardware shops sell

[Gujranwala](https://en.wikipedia.org/wiki/Gujranwala) is Pakistan's third-largest centre of industrial production after Karachi and Faisalabad. It is the country's centre for making and exporting sanitary fittings and wares, with more than 200 producers in the city, and its third-largest centre for iron and steel, a trade that goes back to the blacksmith families who settled there in the colonial period. Its workshops also make cutlery, agricultural tools and equipment, plastic goods and machinery.

For a hardware or sanitary shop, that changes the buying side. Many items come straight from local makers rather than from a distant distributor, often in mixed lots, at prices that move with the cost of metal. A shop can carry several brands of the same tap or valve, each with its own dealer, and needs to remember who to call when a size runs out.

The selling side is split too. A homeowner buys two taps and a shower at retail. A plumber or electrician working in the area expects a contractor rate. A builder finishing a house wants a quotation for a whole bathroom set, delivered to the site in more than one trip, paid over weeks.

The district is also among the most industrialised in Punjab and sits on the Grand Trunk Road between Lahore and Rawalpindi, so trade buyers from nearby towns come in to buy in quantity.`,
  shotA: {
    heading: 'Reorder before a size runs out',
    body: 'Items at or below their reorder point show how much to order and from which supplier. Turn the list into a purchase order and print it per supplier, ready for the dealer or the local maker.',
  },
  work: `## A day at a Gujranwala hardware counter

**A builder asks for a price.** Make a quotation at the contractor rate, with validity and terms, and send it on WhatsApp. When he wants a cheaper mixer instead, revise it. When he accepts, the quotation becomes the bill.

**Three rates.** Every item can carry a retail, contractor and bulk rate, and quantity rates apply by themselves. The plumber buying ten elbows pays what you have set for ten, without the owner standing at the counter.

**Sending goods to the site.** One order can go in several trips. Each delivery challan records the vehicle, the trip and what actually arrived, and the project page shows what was quoted, billed and delivered, and what is still to send.

**Charges.** Add delivery and labour to a bill as separate charges, apart from the goods.

**Contractor udhaar.** Each contractor has a khata with the age of each amount, a credit limit and terms such as days, a guarantor or a cheque. When he is over his limit, the counter knows before more goods leave.

**Brands and sizes.** Pipes by size, paint by shade, fittings by brand, with each dealer's phone number saved on the brand.`,
  table: {
    heading: 'Hardware jobs in Gujranwala: pad and challan book or Nafaa',
    caption: 'Where a busy counter loses money, and what the app keeps.',
    columns: ['Pad and challan book', 'In Nafaa'],
    rows: [
      ['Price for a whole bathroom', 'Estimate pad, rewritten for each change', 'Quotation revised, sent on WhatsApp, billed when accepted'],
      ['Plumber\'s rate', 'Remembered by the owner', 'Contractor rate on the item'],
      ['Goods in several trips', 'Challans stapled together', 'Challan per trip, balance to send per project'],
      ['Contractor\'s old udhaar', 'Totals in a register', 'Age, limit and terms per contractor'],
      ['Running out of a size', 'Noticed when a customer asks', 'Reorder list per supplier'],
    ],
  },
  shotB: {
    heading: 'Contractor udhaar you can collect',
    body: 'The total contractor udhaar, how old each amount is, and each contractor\'s credit limit and days. Record a payment as it comes in, and see who to call first.',
  },
  steps: {
    heading: 'Moving a Gujranwala hardware shop onto Nafaa',
    items: [
      ['Import your item list', 'Send it in Excel with sizes, brands and rates; it is checked in a dry run before import.'],
      ['Set your three rates', 'Retail, contractor and bulk on the items that need them.'],
      ['Add contractors', 'Each with the balance from your register, a limit and terms.'],
      ['Set reorder points', 'For the sizes you cannot afford to run out of.'],
    ],
  },
  questions: `## Questions from Gujranwala hardware shops

### We buy straight from local makers. Can I keep their numbers with the brand?
Yes. Each brand keeps the dealer's phone, and the reorder list groups items by supplier, so the order goes to the right person.

### A contractor wants a quotation valid for 15 days. Can I set that?
Yes. Quotations carry their validity and your terms, and you can revise them before they turn into a bill.

### How many items can I keep?
Hardware shops often have thousands of items. Import them from Excel, then use sizes, shades and brands to find them at the counter. See the guide on [hardware inventory with many items](/blog/hardware-store-inventory-many-skus).

### Can a cashier change the contractor rate?
Only if his role allows it. Staff roles decide who can give discounts or change rates, so the counter follows the prices the owner has set.

### Do I need tax integration?
Most shops do not. Optional FBR/PRA integration is there for a business that is required to report. See the [hardware page](/industries/hardware) and [Gujranwala](/pos-software/gujranwala) for the other trades on the same account.`,
  cta: {
    heading: 'Put your Gujranwala counter and your contractors on one screen',
    body: 'Free trial on the device you already have. Send your item list on WhatsApp and we set it up with you.',
  },
  siblings: ['gujranwala/appliances', 'lahore/hardware', 'sialkot/sports'],
  related: ['BLOG_POST:hardware-store-inventory-many-skus'],
  faqKeys: ['kiryana-import', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Gujranwala')],
  factNote:
    'Gujranwala as third-largest industrial centre after Karachi and Faisalabad, centre of sanitary fittings with over 200 producers, third-largest iron and steel centre with roots in the blacksmith (Lohar) migration, and other manufactures (cutlery, agricultural tools, plastic, machinery) from Wikipedia, opened 26 Oct 2026. Grand Trunk Road location is general geography. No makers or shops named. Product claims checked against the hardware pack (quotations, three rates, delivery challans, projects, contractor credit accounts, reorder rules, brands) and the product import page.',
};

const appliances: PairCopy = {
  city: 'gujranwala',
  cityName: 'Gujranwala',
  industry: 'appliances',
  title: 'Appliance and fan shop POS in Gujranwala',
  summary:
    'Nafaa is POS for Gujranwala appliance and fan shops: every fan, cooler and AC by serial, warranty from the bill date, installations booked with a technician, complaints and AMC from the serial, heavy deliveries, qist plans with a guarantor and old units taken in trade. It keeps billing without internet.',
  seoDescription: 'Appliance shop POS for Gujranwala: fans, coolers and ACs by serial, installations, service requests, qist with guarantor, trade-ins and brand claims.',
  focusKeyword: 'appliance shop pos gujranwala',
  sub: 'Fans and coolers made in the city, ACs and heaters for the seasons either side: serials, fitting, complaints and qist in one app.',
  badges: ['Serial and warranty', 'Fitting and service', 'Qist with guarantor'],
  facts: [
    ['Built for', 'Fan, cooler, AC and home appliance dealers'],
    ['Units', 'Serial, warranty and AMC on every unit sold'],
    ['After sale', 'Installations, service requests, technicians and brand claims'],
    ['Price', 'Paid plans from {{price:min.monthly}} a month, with a free trial first'],
  ],
  romanUrdu:
    'Gujranwala ki fan aur appliance dukaan ke liye: har pankha, cooler ya AC serial ke saath, bill ki tareekh se warranty, fitting aur shikayat technician ke paas, qist zamin ke saath, aur purana maal trade-in me.',
  local: `## Fans, coolers and the season in Gujranwala

[Gujranwala](https://en.wikipedia.org/wiki/Gujranwala) is well known for making electric fans, with around 150 small and medium firms tied to the fan industry. The city's workshops also make coolers and heaters and other domestic appliances, alongside its larger metal, steel and sanitary trades. Together with Sialkot and Gujrat, it forms what is called the "Golden Triangle" of export-minded industrial cities in northern Punjab.

For an appliance dealer in the city, the year has two peaks. Before summer, ceiling fans, pedestal fans and air coolers move in quantity, much of it from local brands, along with ACs. Before winter, geysers and heaters take over. Between the peaks, the work is service: complaints, warranty repairs, fitting and the instalments still being paid on last season's sales.

Selling a fan or AC is only half the job. The unit has to reach the customer's home, sometimes up several floors, and an AC or geyser has to be fitted by a technician who has his own schedule. Months later, when the unit stops working, the customer expects the shop to know when it was sold and whether the warranty still holds.

Many families in the area buy larger appliances on monthly instalments, often with a relative or employer standing as guarantor. Old units are commonly traded in against new ones.`,
  shotA: {
    heading: 'Complaints and repairs from the serial',
    body: 'Log a complaint with the product, the address and whether it is under warranty or AMC, which the serial fills in. Give the visit to a technician, track jobs waiting for parts and close with the charges taken.',
  },
  work: `## How a Gujranwala appliance shop runs

**Stock in.** Enter units by serial as they arrive: scan them or paste a list in one go. Each fan, cooler or AC shows as on the shelf, sold or waiting for fitting.

**Selling the unit.** Scan the serial on the bill and that exact unit is sold to the customer. Its warranty starts on the bill date and a warranty card prints for each unit.

**Fitting.** Right after the bill, book the installation with a technician and a time slot. The job slip prints for him, and finishing the job posts its charge.

**Delivery.** Book the trip with the address, floor and lift, the vehicle and driver, and record who received the goods.

**Qist.** For a bill on instalments, make a monthly plan with the guarantor's details and print the agreement for both to sign.

**Trade-in.** Take an old cooler or AC at an agreed value off the new bill, then sell it on, scrap it or give it back.

**Brand claims.** When you repair a unit under the brand's warranty, claim the parts and labour from the brand and follow the claim until it is paid.`,
  table: {
    heading: 'Appliance jobs in Gujranwala: register or Nafaa',
    caption: 'What an appliance dealer tracks, and where Nafaa keeps it.',
    columns: ['With a register', 'With Nafaa'],
    rows: [
      ['Which fan went to whom', 'Serial written by hand, if at all', 'Serial scanned on the bill, linked to the customer'],
      ['Warranty when a cooler fails', 'Customer looks for the card', 'Serial lookup fills warranty and AMC'],
      ['AC fitting', 'Phone calls and a whiteboard', 'Job with technician, slot and charges'],
      ['Instalment buyers', 'Register and a CNIC photocopy', 'Plan with schedule, guarantor and printed agreement'],
      ['Money owed by the brand', 'Remembered, sometimes', 'Brand warranty claims followed to payment'],
    ],
  },
  shotB: {
    heading: 'Technicians and staff in one place',
    body: 'Technicians have their skills, area, visit rate and commission, with who is free today. Counter staff have roles and permissions, so a salesman cannot give a refund the owner has not allowed.',
  },
  steps: {
    heading: 'Setting up a Gujranwala appliance shop',
    items: [
      ['Scan units in stock', 'Fans, coolers and ACs by serial, with brand and model.'],
      ['Add your technicians', 'With their area, visit rate and commission.'],
      ['Move open qist plans', 'Each customer with the balance, next due date and guarantor.'],
      ['Set AMC contracts', 'Yearly service contracts with free visits and renewal dates.'],
    ],
  },
  questions: `## Questions from Gujranwala appliance dealers

### Do cheap items like regulators need serials?
No. Only units you want to track need a serial. Small parts and accessories sell like any other item.

### Can I see which technician is free this afternoon?
Yes. The technician list shows who is free and who has too much work today, with their open jobs.

### What about AMC customers?
Yearly service contracts list their free visits, renewals coming up and money still to collect. A complaint from an AMC customer shows the contract from the serial.

### We sell local fan brands and big brands side by side. Can I compare them?
Yes. The profit report breaks sales down by product, brand and supplier, so after the summer you can see which brands earned and which only filled the godown, and plan the next season's order from that.

### A customer wants to pay for a cooler in three months. Is that possible without a guarantor?
Yes. A qist plan can be set up after the bill with or without guarantor details; the schedule, payments made and the amount still due stay on the plan, and late payments show on the list. Reminders go out on WhatsApp.

### Does it keep working in a power cut?
Yes. The counter bills without internet and syncs later. See the [appliance page](/industries/appliances), [Gujranwala](/pos-software/gujranwala) and the [Gujranwala hardware page](/pos-software/gujranwala/hardware).`,
  cta: {
    heading: 'Get ready for the next fan season',
    body: 'Free trial on your own device, with setup help on WhatsApp.',
  },
  siblings: ['gujranwala/hardware', 'lahore/electronics', 'faisalabad/electronics'],
  faqKeys: ['devices', 'offline', 'khata-reminders', 'pricing'],
  sources: [wiki('Gujranwala')],
  factNote:
    'Gujranwala as a centre of electric fan manufacturing with about 150 SMEs, coolers, heaters and domestic appliances, and the Golden Triangle with Sialkot and Gujrat, from Wikipedia, opened 26 Oct 2026. Seasonal demand and instalment buying described in general terms, without counts. No brands or shops named. Product claims checked against the appliances pack (serials, installations, service requests, technicians, AMC, deliveries, qist plan, trade-ins, warranty claims) and the staff module.',
};

export const gujranwalaPairs: PairCopy[] = [hardware, appliances];
export const gujranwala = gujranwalaPairs.map(pair);
