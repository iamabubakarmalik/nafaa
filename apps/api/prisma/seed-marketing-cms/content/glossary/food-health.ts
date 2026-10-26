/**
 * Glossary: restaurants and food service, and pharmacies and medicines.
 */

import { EV, SRC, type TermSpec } from './_term';

export const foodHealthTerms: TermSpec[] = [
  {
    slug: 'kot',
    seoDescription: 'A KOT (Kitchen Order Ticket) tells the kitchen what to cook for an order, on paper or on a screen. Here is how restaurants route KOTs to each station.',
    imported: true,
    term: 'KOT (Kitchen Order Ticket)',
    definition: 'A KOT is the ticket, printed or on a screen, that tells the kitchen what to cook for an order.',
    definitionRomanUrdu: 'KOT woh parchi ya screen hai jo kitchen ko batati hai ke order me kya pakana hai.',
    example: `A waiter takes an order for table 7: two chicken karahi, six naan and three drinks. The karahi goes to the main kitchen's KOT, the naan to the tandoor, and the drinks to the counter.`,
    body: `## How it works

Without KOTs, orders reach the kitchen by shouting or handwritten slips, which leads to forgotten dishes, wrong items and arguments about what was ordered. With a POS, the waiter enters the order once and a ticket goes to each station that has to prepare something, with the table or token number, the time and any notes such as "less spicy".

When a table adds more food, only the new items should go to the kitchen, not the whole order again. A cancelled dish should send a clear cancel ticket so the kitchen stops cooking it. The KOT also protects the owner: food leaves the kitchen only against a ticket, so dishes cannot go out without a bill.

## In Nafaa

The Nafaa restaurant pack sends KOTs per station, with only new items sent when a table adds more. Tickets can print or show on the kitchen display, and voids of dishes the kitchen has already cooked need a reason and a PIN.`,
    alsoKnownAs: ['kitchen order ticket', 'kitchen ticket', 'order slip', 'kitchen parchi'],
    related: ['GLOSSARY_TERM:kitchen-display-system', 'GLOSSARY_TERM:modifiers', 'GLOSSARY_TERM:table-turnover', 'INDUSTRY:restaurant', 'BLOG_POST:restaurant-kot-system-guide'],
    evidence: [EV.kotDisplay, EV.stations],
  },
  {
    slug: 'kitchen-display-system',
    seoDescription: 'A kitchen display system (KDS) is a kitchen screen that shows incoming orders instead of printed tickets, where cooks mark dishes as cooking and ready.',
    term: 'Kitchen Display System (KDS)',
    definition: 'A kitchen display system is a screen in the kitchen that shows incoming orders in place of printed tickets, and lets cooks mark dishes as cooking and ready.',
    definitionRomanUrdu: 'Kitchen display system kitchen me lagi screen hai jo printed parchi ki jagah order dikhati hai aur cook dishes ko "ban raha" aur "tayyar" mark karte hain.',
    example: `A busy fast food outlet mounts a screen above the grill. New orders appear with the time; a ticket turns amber after 10 minutes and red after 20, so the chef sees which order is late.`,
    body: `## How it works

Printed KOTs get lost, splashed and torn, and nobody knows how long an order has been waiting. A KDS keeps tickets in lanes (new, cooking, ready), times each one, and shows the front of house when food is ready, which matters for takeaway tokens and delivery riders.

A KDS needs a screen that can stand heat and grease, and a stable connection to the POS. Many kitchens in Pakistan use a cheap TV with a small computer or an Android box. Keep a printer as backup for power or network failures.

## In Nafaa

The Nafaa kitchen display shows tickets per station in new, cooking and ready lanes, with minutes since each came in (amber after 10, red after 20), dish options and notes, cancel tickets for voided dishes at the top in red, ready takeaway tokens, and a beep for each new ticket.`,
    alsoKnownAs: ['KDS', 'kitchen screen', 'kitchen display'],
    related: ['GLOSSARY_TERM:kot', 'GLOSSARY_TERM:table-turnover', 'INDUSTRY:restaurant'],
    evidence: [EV.kotDisplay],
  },
  {
    slug: 'table-turnover',
    seoDescription: 'Table turnover is how many times a restaurant table is used by new guests during a meal period or a day. Here is how to measure and improve it.',
    term: 'Table Turnover',
    definition: 'Table turnover is how many times a restaurant table is used by new guests during a meal period or a day.',
    definitionRomanUrdu: 'Table turnover batata hai ke ek khane ke waqt ya din me ek table par kitni baar naye mehman baithe.',
    example: `A restaurant with 20 tables serves 70 tables of guests between 7 pm and 11 pm on Saturday. Turnover is 3.5 for the dinner period. Cutting 10 minutes from each sitting could add several more tables a night.`,
    body: `## How it works

For dine-in restaurants, the number of tables is fixed, so turnover is the main way to grow sales on busy nights. Slow points are usually the same: waiting to order, waiting for food, and waiting for the bill. Faster ordering on a handheld, KOTs that reach the kitchen at once, and bills ready when guests ask all help.

Turnover is not everything: a family dinner at a fine-dining place should not be rushed. Measure it alongside average bill per table. In Pakistan, Ramadan iftar and weekend dinners are when turnover matters most.

## In Nafaa

The Nafaa table floor shows each table as free or seated, with a running timer, guests, waiter, running bill and kitchen state. Day close breaks sales down by waiter, table and order type.`,
    alsoKnownAs: ['table turns', 'table turn rate', 'covers per table'],
    related: ['GLOSSARY_TERM:kot', 'GLOSSARY_TERM:split-bill', 'GLOSSARY_TERM:average-bill-value', 'INDUSTRY:restaurant'],
    evidence: [EV.tables],
  },
  {
    slug: 'food-cost',
    term: 'Food Cost Percentage',
    definition: 'Food cost percentage is the cost of the ingredients in a dish or in all food sold, divided by the selling price or food sales.',
    definitionRomanUrdu: 'Food cost percentage kisi dish ya kul khane ke ingredients ki cost ko selling price ya food sale se taqseem karne par milta hai.',
    example: `A chicken biryani plate sells for 650 rupees and its rice, chicken, oil, spices and raita cost 240 rupees. Food cost is 240 divided by 650, about 37%.`,
    body: `## How it works

Food cost is the restaurant version of gross margin. Owners usually aim for a target range for each type of dish, then check actual food cost each week: opening stock of ingredients plus purchases minus closing stock, divided by food sales. If the actual figure is much higher than the recipes say it should be, the difference is waste, over-portioning or theft.

Prices of chicken, cooking oil, ghee and vegetables change often in Pakistan, so a dish that was profitable last month may not be now. Recheck plate costs whenever major ingredient prices move.

## In Nafaa

Nafaa restaurant recipes show each dish's plate cost at today's purchase rates and its food cost percentage, which can be edited in place. Voided bills with dishes already cooked are booked as kitchen waste.`,
    alsoKnownAs: ['food cost', 'food cost %', 'plate cost'],
    related: ['GLOSSARY_TERM:recipe-costing', 'GLOSSARY_TERM:menu-engineering', 'GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:wastage'],
    evidence: [EV.recipes],
  },
  {
    slug: 'recipe-costing',
    term: 'Recipe Costing',
    definition: 'Recipe costing works out the cost of one portion or batch of a dish by adding up the cost of every ingredient in the quantity the recipe uses.',
    definitionRomanUrdu: 'Recipe costing ek plate ya batch ki cost nikalti hai, recipe me istemal hone wale har ingredient ki miqdar aur qeemat jod kar.',
    example: `A cafe costs its club sandwich: bread 45 rupees, chicken 120, egg 30, cheese 40, vegetables and sauce 25, fries 55, packing 15. The plate costs 330 rupees, so a menu price of 850 leaves a food cost of about 39%.`,
    body: `## How it works

Every dish needs a written recipe with exact quantities, in the same units the shop buys in, converted where needed (a 5 kg bag of rice, used 250 g per plate). Include everything that goes on the plate, including oil, garnish and packing for takeaway. Then multiply by current purchase prices.

Recipe costing does three jobs: it sets menu prices, it shows which dishes earn the most per plate, and it lets the owner compare what ingredients should have been used with what was actually used. Recipes also keep taste consistent when cooks change.

## In Nafaa

In Nafaa, recipes are set on the shared product editor and their cost follows purchase rates. The recipes page shows plate cost, how many plates the branch's stock still covers, what runs out first, and raw material used by sales against purchases and stock.`,
    alsoKnownAs: ['plate costing', 'recipe cost', 'dish costing'],
    related: ['GLOSSARY_TERM:food-cost', 'GLOSSARY_TERM:bom', 'GLOSSARY_TERM:menu-engineering'],
    evidence: [EV.recipes],
  },
  {
    slug: 'menu-engineering',
    seoDescription: 'Menu engineering reviews each dish by how often it sells and how much it earns, to decide which dishes to promote, reprice, change or drop.',
    term: 'Menu Engineering',
    definition: 'Menu engineering is the review of each dish by how often it sells and how much profit it earns, to decide which dishes to promote, reprice, change or remove.',
    definitionRomanUrdu: 'Menu engineering har dish ko is hisaab se dekhti hai ke woh kitni bikti hai aur kitna profit deti hai, taake faisla ho ke kis ko aage karein, qeemat badlein ya menu se hatayein.',
    example: `A restaurant finds that its mutton handi sells little but earns a lot per plate, while its chicken tikka sells a lot but earns little. It moves the handi to the top of the menu and adjusts the tikka's portion and price.`,
    body: `## How it works

The classic method sorts dishes into four groups. Popular and profitable dishes are kept and protected. Popular but low-profit dishes need a better price or cost. Profitable but unpopular dishes need better placement or a waiter recommendation. Dishes that are neither are candidates to remove, which also simplifies the kitchen and cuts waste.

It needs two inputs: plates sold per dish from the POS, and profit per plate from recipe costing. Review it each season and after big ingredient price changes.

## In Nafaa

The Nafaa restaurant menu page shows each dish's plate cost and how many plates the stock covers, and its analytics rank dishes by sales and profit from the same bill math the reports use.`,
    alsoKnownAs: ['menu analysis', 'menu mix analysis', 'dish profitability'],
    related: ['GLOSSARY_TERM:food-cost', 'GLOSSARY_TERM:recipe-costing', 'GLOSSARY_TERM:abc-analysis'],
    evidence: [EV.menuBoard],
  },
  {
    slug: 'split-bill',
    term: 'Split Bill',
    definition: 'Splitting a bill means dividing one table\'s order into separate bills, by item or by equal shares, so each guest pays their own part.',
    definitionRomanUrdu: 'Split bill matlab ek table ke order ko alag alag bills me baantna, items ke hisaab se ya barabar hisson me, taake har mehman apna hissa de.',
    example: `Four colleagues at a cafe ask to pay separately. The waiter moves each person's items to their own bill; two pay by card and two by cash, and the table closes when all four are paid.`,
    body: `## How it works

Groups of friends and office colleagues often want to split, and doing it by hand on a calculator slows the table down and creates mistakes. A POS can split by moving items to new bills or by dividing the total equally, then take each part with its own payment method.

A split bill is different from a split payment: a split payment is one bill paid with more than one method, while a split bill creates separate bills. Service charge and tax should be worked out on each bill so the totals still match the original order.

## In Nafaa

The Nafaa restaurant pack can split a table's order by items into separate bills, move and merge tables, and take each bill through the shared checkout with split payments.`,
    alsoKnownAs: ['separate bills', 'split the check', 'go Dutch'],
    related: ['GLOSSARY_TERM:split-payment', 'GLOSSARY_TERM:service-charge', 'GLOSSARY_TERM:table-turnover'],
    evidence: [EV.orderDialogs, EV.posSplit],
  },
  {
    slug: 'service-charge',
    seoDescription: 'A service charge is a percentage or fixed amount a restaurant or service business adds to the bill for service, separate from food prices and tax.',
    term: 'Service Charge',
    definition: 'A service charge is a percentage or fixed amount a restaurant or service business adds to the bill for service, separate from the price of food and from tax.',
    definitionRomanUrdu: 'Service charge woh percentage ya fixed raqam hai jo restaurant ya service karobar bill par service ke liye lagata hai, khane ki qeemat aur tax se alag.',
    example: `A restaurant adds a 5% service charge to dine-in bills only. A 4,000 rupee dinner shows 200 rupees service charge, then sales tax on services is worked out as the provincial rules require.`,
    body: `## How it works

Service charges are common in sit-down restaurants and some salons. The menu or a notice at the entrance should say clearly whether a service charge applies and to which orders, because customers often confuse it with a tip or with tax. Whether staff receive the service charge is the business's own policy, so be clear with staff too.

How a service charge is taxed depends on the province and the business's registration, so registered restaurants should confirm the treatment with their provincial revenue authority or tax adviser.

## In Nafaa

An open restaurant order in Nafaa can carry a service charge percentage along with tax, discount, packing, delivery and tip. Service businesses can add service charge lines at the counter, and the profit report and reports centre show service charges.`,
    alsoKnownAs: ['service fee', 'SC'],
    related: ['GLOSSARY_TERM:split-bill', 'GLOSSARY_TERM:sales-tax-on-services', 'INDUSTRY:restaurant'],
    evidence: [EV.orderDialogs, EV.posServiceCharges],
  },
  {
    slug: 'modifiers',
    seoDescription: 'Modifiers are options chosen with a menu item, such as extras, removals, spice level or size. They can change the price and go to the kitchen with the order.',
    term: 'Modifiers (Add-ons)',
    definition: 'Modifiers are options a customer chooses with an item, such as extras, removals, spice level or size, which may change the price and are passed to the kitchen.',
    definitionRomanUrdu: 'Modifiers woh options hain jo gahak item ke saath chunta hai, jaise extra cheese, pyaz ke baghair, mirch ka level ya size, jo qeemat badal sakte hain aur kitchen tak jaate hain.',
    example: `A pizza is ordered large, with extra cheese (plus 250 rupees) and no olives. The bill shows the extras, and the kitchen ticket shows "LARGE, + cheese, NO olives" so the cook makes it right the first time.`,
    body: `## How it works

Without modifiers, waiters write requests by hand and extras are often forgotten on the bill, which loses money every day. With them, each dish has groups of choices: some required (size, spice), some optional (extras), each with rules on how many can be picked and any price.

Keep modifier groups short and consistent across dishes. Review which extras sell; popular extras may deserve their own menu item, and paid extras that are rarely charged show where staff are giving them away.

## In Nafaa

The Nafaa restaurant pack has add-on groups for extras, removals, spice, cooking style, size and free notes, each with rules (required, how many may be picked). Groups are put on dishes from the add-ons page or the dish editor, and groups used on past orders are switched off rather than deleted.`,
    alsoKnownAs: ['add-ons', 'extras', 'options', 'variations'],
    related: ['GLOSSARY_TERM:kot', 'GLOSSARY_TERM:product-variant', 'INDUSTRY:restaurant'],
    evidence: [EV.modifiers],
  },
  {
    slug: 'drap',
    seoDescription: 'DRAP, the Drug Regulatory Authority of Pakistan, is the federal body that regulates medicines. Here is what it means for pharmacies and medical stores.',
    imported: true,
    term: 'DRAP',
    definition: 'DRAP, the Drug Regulatory Authority of Pakistan, is the federal body that regulates medicines in Pakistan.',
    definitionRomanUrdu: 'DRAP (Drug Regulatory Authority of Pakistan) woh federal idara hai jo Pakistan me dawaiyon ko regulate karta hai.',
    example: `DRAP issues a recall notice for a specific batch of a cough syrup. Pharmacies check their stock for that batch number, stop selling it and return it through their distributor.`,
    body: `## How it works

DRAP was set up under the DRAP Act, 2012. It registers medicines and their manufacturers and importers, sets rules on drug pricing, and publishes alerts and recalls for products that fail quality tests. Licences to sell medicines at a pharmacy or medical store are issued by the provincial health departments under the Drugs Act and provincial rules, so a pharmacy deals with both levels.

For a pharmacy, the practical link with DRAP is mostly recalls, registered products and prices. Keeping batch numbers on stock is what makes acting on a recall possible within minutes rather than days.

## In Nafaa

The Nafaa pharmacy pack records batches with expiry on every purchase and sale, so a recalled batch can be found in stock and on bills. Nafaa does not connect to DRAP systems.

## Official source

[Drug Regulatory Authority of Pakistan](https://www.dra.gov.pk/), including its recall and alert notices.`,
    alsoKnownAs: ['Drug Regulatory Authority of Pakistan'],
    related: ['GLOSSARY_TERM:batch-tracking', 'GLOSSARY_TERM:controlled-drugs-register', 'INDUSTRY:pharmacy', 'BLOG_POST:drap-compliance-pharmacy'],
    evidence: [EV.posBatch, EV.expiring],
    sources: [SRC.drap],
    dropped: ['"Licenses pharmacies" (drug sale licences are issued by the provinces).'],
  },
  {
    slug: 'generic-name',
    term: 'Generic Name (Salt)',
    definition: 'A generic name, called the salt or formula in Pakistani pharmacies, is the active ingredient of a medicine, as opposed to the brand name it is sold under.',
    definitionRomanUrdu: 'Generic name, jise pharmacy me salt ya formula kehte hain, dawai ka asal jaz hai, us brand name ke muqable me jis se woh bikti hai.',
    example: `A prescription says a paracetamol brand that is out of stock. The pharmacist looks up the salt, paracetamol 500 mg, and shows the customer two other brands with the same salt and strength, at different prices.`,
    body: `## How it works

Many brands in Pakistan carry the same salt at the same strength, at very different prices. Customers often ask "is there a cheaper one?", and doctors sometimes prescribe by brand when that brand is short. Searching stock by salt and strength lets the counter offer a substitute quickly, within the pharmacist's professional judgement and the prescriber's instructions.

Salt data is also useful for safety: two products with the same salt should not be sold together by mistake, and some salt combinations interact. Keeping salts and strengths accurate on each product is the foundation.

## In Nafaa

The Nafaa pharmacy pack records each medicine's salts and strength. The salts page lists every formula the shop stocks with the brands that carry it, their price and shelf stock, its schedule, and salts that clash with each other.`,
    alsoKnownAs: ['salt', 'formula', 'active ingredient', 'generic'],
    related: ['GLOSSARY_TERM:prescription', 'GLOSSARY_TERM:loose-sale', 'INDUSTRY:pharmacy'],
    evidence: [EV.salts],
  },
  {
    slug: 'controlled-drugs-register',
    seoDescription: 'A controlled drugs register is a pharmacy\'s record of every purchase and sale of narcotic and restricted medicines, with patient and prescriber details.',
    term: 'Controlled Drugs Register',
    definition: 'A controlled drugs register is a record a pharmacy keeps of every purchase and sale of narcotic and other restricted medicines, with patient and prescriber details.',
    definitionRomanUrdu: 'Controlled drugs register woh record hai jo pharmacy narcotic aur doosri pabandi wali dawaiyon ki har khareed aur bikri ka rakhti hai, mareez aur doctor ki tafseel ke saath.',
    example: `A pharmacy sells a strip of a restricted sedative against a prescription. The register line records the date, bill number, quantity, patient name, doctor and the balance left, ready for an inspector.`,
    body: `## How it works

Certain medicines, including narcotics and psychotropics, may only be sold against a prescription and must be accounted for unit by unit. Drug inspectors can ask to see the register and compare it with stock on the shelf. Missing patient or doctor details, or a balance that does not match, are common findings.

The register is easiest to keep when it is built from the bills themselves, rather than written separately at the end of the day. The rules on which medicines are covered and what must be recorded come from federal and provincial drug laws, so pharmacies should follow their own province's current requirements.

## In Nafaa

The Nafaa pharmacy pack records register medicines on the bill line. The controlled register page shows each medicine's stock, what came in and went out in a period, sales still missing the patient or doctor, and a printable line-by-line register with opening and closing balances.`,
    alsoKnownAs: ['narcotics register', 'controlled log', 'schedule drugs register'],
    related: ['GLOSSARY_TERM:prescription', 'GLOSSARY_TERM:drap', 'INDUSTRY:pharmacy'],
    evidence: [EV.controlledLog],
  },
  {
    slug: 'prescription',
    term: 'Prescription',
    definition: 'A prescription is a written instruction from a doctor or other licensed prescriber naming the medicines, strength, dose and duration for a patient.',
    definitionRomanUrdu: 'Prescription (nuskha) doctor ki likhi hidayat hai jis me mareez ke liye dawaiyan, strength, khuraak aur muddat likhi hoti hai.',
    example: `A patient brings a prescription for an antibiotic, a painkiller and a syrup for 5 days. The pharmacy saves it against the patient's record, so when she returns for a refill, the same items and doctor are on file.`,
    body: `## How it works

In Pakistan many medicines are sold over the counter, but prescription-only and controlled medicines should be dispensed only against a valid prescription. Keeping a copy or record of prescriptions protects the pharmacy in an inspection, helps with refills for chronic patients, and lets the pharmacist check for duplicate or clashing medicines.

Clinics and pharmacies that work together benefit from a shared record: the doctor's prescription goes straight to the counter, which removes errors from reading handwriting.

## In Nafaa

The Nafaa pharmacy pack records prescriptions with the patient and doctor, keeps a list of doctors, and links controlled medicines on the bill to the patient and prescriber. Clinics on Nafaa write prescriptions as part of the visit.`,
    alsoKnownAs: ['nuskha', 'Rx', 'doctor prescription'],
    related: ['GLOSSARY_TERM:controlled-drugs-register', 'GLOSSARY_TERM:generic-name', 'INDUSTRY:pharmacy', 'INDUSTRY:clinic'],
    evidence: [EV.prescriptions, 'apps/web/src/industries/pharmacy/pages/PharmacyDoctorsPage.tsx'],
  },
  {
    slug: 'loose-sale',
    term: 'Loose Sale',
    definition: 'A loose sale is selling part of a pack, such as single tablets from a strip, single cigarettes or a few eggs from a tray, at a per-unit price.',
    definitionRomanUrdu: 'Loose sale matlab pack ka hissa bechna, jaise strip me se kuch goliyan, ya tray me se kuch ande, ek ek ki qeemat par.',
    example: `A customer needs 6 tablets of a medicine sold in strips of 10. The pharmacy sells 6 loose tablets; stock goes down by 0.6 of a strip, and the remaining 4 tablets stay on record.`,
    body: `## How it works

Loose sales are everyday business in Pakistan, especially in pharmacies and kiryana stores, where customers buy what they can afford that day. The problem is stock: if the system only knows strips or packs, loose sales are either not recorded or recorded as whole packs, and the count drifts quickly.

The fix is to keep stock in the smallest unit sold (tablets, pieces) and define the pack as a multiple of it, with its own price. Loose prices are often a little higher per unit than full packs, which the price list should reflect.

## In Nafaa

The Nafaa pharmacy counter sells loose tablets and full packs from the same product, taking stock in the base unit from the right batch. Other shops sell in any defined unit through the multi-units page.`,
    alsoKnownAs: ['khulla', 'loose items', 'part pack sale', 'single tablet sale'],
    related: ['GLOSSARY_TERM:unit-of-measure', 'GLOSSARY_TERM:batch-tracking', 'INDUSTRY:pharmacy', 'INDUSTRY:kiryana'],
    evidence: [EV.pharmacyPos, EV.units],
  },
];
