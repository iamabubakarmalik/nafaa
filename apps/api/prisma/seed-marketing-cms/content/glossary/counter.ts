/**
 * Glossary: the sales counter (billing, cash, receipts, returns, customers
 * at the till, branches and how the POS runs).
 */

import { EV, type TermSpec } from './_term';

export const counterTerms: TermSpec[] = [
  {
    slug: 'pos',
    seoDescription: 'A point of sale (POS) is where a sale is completed: items are scanned, payment is taken and a receipt is given. Here is what POS software does for a shop.',
    imported: true,
    term: 'POS (Point of Sale)',
    definition: 'The point of sale is where a sale is completed: items are scanned or picked, payment is taken and a receipt is given.',
    definitionRomanUrdu: 'POS woh jagah ya system hai jahan sale mukammal hoti hai: cheezein scan hoti hain, payment li jati hai aur raseed di jati hai.',
    example: `A kiryana store scans a packet of biscuits and a bottle of oil, the total shows on screen, the customer pays part in cash and part by JazzCash, and the counter prints the bill.`,
    body: `## How it works

In a Pakistani shop the POS is usually a computer or tablet at the counter, a barcode scanner and a small thermal printer, with the galla (cash box) under it. The software keeps the price list, works out the total, records how the bill was paid and takes the sold items out of stock. Because every bill is saved, the owner can see the day's sale, profit and cash in the drawer without adding up a register by hand.

A good POS also handles the things that happen at a busy counter: a customer who wants udhaar, a bill put on hold while someone fetches one more item, a return from yesterday, or a power cut in the middle of a sale.

## In Nafaa

The Nafaa counter works fully from the keyboard: search, change quantity, add a customer, discount, hold and pay without the mouse, with a shortcut list on the ? key. Shops choose a layout (Classic, Express, Cart-focus or Touch), take split payments, put bills on khata and keep billing offline.`,
    alsoKnownAs: ['point of sale', 'billing system', 'counter software', 'billing software'],
    related: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:offline-pos', 'GLOSSARY_TERM:cloud-pos', 'PRODUCT:pos'],
    evidence: [EV.pos, EV.posShortcuts, EV.posSplit, EV.posHold, EV.offline],
    dropped: ['"Modern POS systems like Nafaa" sales line.'],
  },
  {
    slug: 'galla',
    seoDescription: 'A galla is the cash drawer at a shop counter where the day\'s cash sales are kept and change is given. Here is how shops count and close it each day.',
    term: 'Galla',
    definition: 'A galla is the cash box or drawer at a shop counter where the day\'s cash sales are kept and change is given from.',
    definitionRomanUrdu: 'Galla counter ka woh dabba ya drawer hai jis me din bhar ka cash rakha jata hai aur jis se change diya jata hai.',
    example: `A general store starts the morning with 3,000 rupees of change in the galla. By night the owner counts 48,600 rupees, while the bills say 46,100 rupees of cash sales, so 500 rupees are missing.`,
    body: `## How it works

In most Pakistani shops the galla is the only cash control: the owner or a trusted family member sits on it, and at night the cash is counted and taken home. Problems start when more than one person handles it. Money goes out for tea, a supplier's rider or a customer refund and nobody writes it down, so the night count never matches and nobody can say why.

A simple routine fixes most of this. Count the change at opening, record every cash payout as it happens, and at closing compare the count with what the bills say should be there. A small difference every day is normal; a pattern is a signal.

## In Nafaa

The Cash register page treats each galla as a till with shifts. A shift opens with the counted float, cash in and out is recorded with a reason, and closing shows expected cash against the count, with short or over and a reason when they differ.`,
    alsoKnownAs: ['galla', 'gallah', 'cash box', 'till'],
    related: ['GLOSSARY_TERM:cash-drawer', 'GLOSSARY_TERM:opening-float', 'GLOSSARY_TERM:z-report', 'GLOSSARY_TERM:cash-over-short', 'GLOSSARY_TERM:pos'],
    evidence: [EV.cashRegister, EV.openShift, EV.closeShift, EV.cashMove],
  },
  {
    slug: 'cash-drawer',
    term: 'Cash Drawer',
    definition: 'A cash drawer is the lockable drawer under the counter that holds notes and coins and opens when a cash sale is completed.',
    definitionRomanUrdu: 'Cash drawer counter ke neeche woh tala-band drawer hai jis me note aur sikke hote hain aur jo cash sale par khulta hai.',
    example: `A pharmacy connects its drawer to the receipt printer. When a cash bill prints, the printer sends a pulse and the drawer opens; on a card or Easypaisa bill it stays shut.`,
    body: `## How it works

Most cash drawers sold in Pakistan connect to the receipt printer with an RJ11 cable, not to the computer. The POS tells the printer to "kick" the drawer, so it only opens when a sale is saved. That small rule matters: a drawer that anyone can open with a key at any time makes the night count meaningless.

Drawers have slots for each note size (5,000, 1,000, 500, 100, 50, 20 and 10 rupee notes) and a coin tray. Keeping notes sorted makes the closing count faster and mistakes in change less likely. Shops with two counters should have two drawers, each counted on its own, so a shortage can be traced to one shift.

## In Nafaa

Under Settings, Hardware, each counter can set up its cash drawer with a test button and choose whether it opens by itself on cash sales. The setting is stored per computer, so every counter keeps its own printer and drawer.`,
    alsoKnownAs: ['till drawer', 'cash register drawer', 'galla drawer'],
    related: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:thermal-printer', 'GLOSSARY_TERM:opening-float'],
    evidence: [EV.hardware, EV.hardwareSettings],
  },
  {
    slug: 'opening-float',
    term: 'Opening Float',
    definition: 'The opening float is the fixed amount of change placed in the cash drawer at the start of a shift, before any sale is made.',
    definitionRomanUrdu: 'Opening float woh khulla cash hai jo shift shuru hone se pehle galle me rakha jata hai, taake change diya ja sake.',
    example: `A bakery keeps a float of 5,000 rupees in small notes. At closing, the cashier counts the drawer, takes out the float for tomorrow, and the rest is the day's cash to deposit.`,
    body: `## How it works

Without a float, the first customer with a 5,000 rupee note sends a salesman running to the next shop for change. With one, the drawer starts with a known amount, so the closing count has a clear starting point: expected cash is the float plus cash sales, minus cash refunds and payouts.

Keep the float the same every day and in the same notes, so a shortfall is easy to see. Write it down when it is counted, by whom and at what time. If two cashiers share a day, each shift should start with its own counted float, so a difference belongs to one person, not to the whole day.

## In Nafaa

Opening a shift on the Cash register page asks for the cash in the galla, as one amount or counted note by note. Nafaa compares it with what the last shift left behind, and the closing count is checked against this opening figure.`,
    alsoKnownAs: ['float', 'opening cash', 'change fund', 'opening balance'],
    related: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:z-report', 'GLOSSARY_TERM:cash-over-short'],
    evidence: [EV.openShift, EV.denominations],
  },
  {
    slug: 'z-report',
    term: 'Z-Report',
    definition: 'A Z-report is the end-of-shift or end-of-day summary that totals the sales, payments, returns and cash for a till and closes it.',
    definitionRomanUrdu: 'Z-report shift ya din ke aakhir ki report hai jo sale, payments, returns aur cash ka hisaab de kar till band karti hai.',
    example: `At 11 pm a restaurant prints the Z-report: 212 bills, cash 96,400 rupees, card 31,000, JazzCash 12,500, two voids and one refund. The manager signs it and staples the counted cash slip to it.`,
    body: `## How it works

The name comes from old cash registers, where an X-report was a mid-day reading and the Z-report reset the totals to zero. Today it is the closing document for a shift: what was sold, how it was paid, what was refunded or voided, and how much cash should be in the drawer.

Owners use it to compare days, catch unusual voids and check that cash taken home matches the bills. In a shop with several counters, each till gets its own Z-report, which makes it easy to see which counter was short.

## In Nafaa

Closing a shift on the Cash register page asks for the cash count, shows expected cash and the difference, then opens the Z-report for that shift. The Day book shows the whole business day across counters, with cash, sales and each staff member's bills.`,
    alsoKnownAs: ['end of day report', 'day close report', 'shift report', 'closing report'],
    related: ['GLOSSARY_TERM:opening-float', 'GLOSSARY_TERM:cash-over-short', 'GLOSSARY_TERM:day-book', 'GLOSSARY_TERM:void'],
    evidence: [EV.closeShift, EV.dayBook],
  },
  {
    slug: 'cash-over-short',
    term: 'Cash Over and Short',
    definition: 'Cash over and short is the difference between the cash counted in the drawer at closing and the cash the bills say should be there.',
    definitionRomanUrdu: 'Cash over/short closing par gine hue cash aur bills ke hisaab se hone wale cash ka farq hai: kam ho to short, zyada ho to over.',
    example: `Expected cash for the evening shift is 62,300 rupees but the cashier counts 61,800. The shift is 500 rupees short, and the reason recorded is "change given twice on a 1,000 note".`,
    body: `## How it works

Small differences happen at every busy counter: wrong change, a coin dropped, a refund paid without being entered. What matters is the pattern. A shop that records the difference every shift, with who was on the till and a reason, can see whether shortages follow one person, one time of day or one kind of sale.

Overs are worth watching too. Cash that is over often means a sale was taken without a bill, or a payout was recorded that never happened. Agree a small tolerance with staff, investigate anything beyond it, and never "fix" a difference by changing old bills.

## In Nafaa

When a shift closes, Nafaa shows the expected cash, the counted cash and the difference before saving, and asks for a reason when it is short or over. The Cash register page lists shorts by shift and period, with analytics of where they come from.`,
    alsoKnownAs: ['cash short', 'cash over', 'cash difference', 'drawer variance'],
    related: ['GLOSSARY_TERM:galla', 'GLOSSARY_TERM:z-report', 'GLOSSARY_TERM:shrinkage'],
    evidence: [EV.closeShift, EV.cashRegister],
  },
  {
    slug: 'receipt',
    term: 'Receipt',
    definition: 'A receipt is the slip given to a customer as proof of payment, listing what was bought, the prices, any discount, the total and how it was paid.',
    definitionRomanUrdu: 'Receipt (raseed) woh parchi hai jo gahak ko payment ke saboot ke taur par di jati hai, jis me saman, qeemat, discount, total aur payment ka tareeqa hota hai.',
    example: `A shoe shop's receipt shows the shop name and phone, bill number, date, two pairs with sizes, a discount, the total, "Paid: cash 4,000, Easypaisa 2,500", the exchange policy and a QR code for payment.`,
    body: `## How it works

Customers in Pakistan often say "bill" and "receipt" for the same thing. For the shop, the receipt is what makes returns and exchanges fair: the bill number ties the item, date and price together, so staff do not have to argue from memory. A clear receipt also shows the return policy and the shop's contact number, which brings customers back.

Most counters print on 58 mm or 80 mm thermal paper. Many shops now also send the bill on WhatsApp, which the customer cannot lose. A sales tax invoice is a stricter document with legal fields; an ordinary receipt does not need them unless the shop is registered and the law requires it.

## In Nafaa

Every Nafaa bill is printed from one receipt engine, so the layout, logo, footer and payment lines are set once in settings and used across every industry. Split payments are listed part by part, and the shop's payment QR can be printed on the bill.`,
    alsoKnownAs: ['raseed', 'bill', 'sales receipt', 'cash memo'],
    related: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:thermal-printer', 'GLOSSARY_TERM:sales-return'],
    evidence: [EV.receipt, EV.payQr],
  },
  {
    slug: 'invoice',
    term: 'Invoice',
    definition: 'An invoice is a document a seller issues to a buyer that lists the goods or services supplied, their prices and the amount due, usually with payment terms.',
    definitionRomanUrdu: 'Invoice woh document hai jo bechne wala khareedar ko deta hai, jis me saman ya service, qeemat aur wajib-ul-ada raqam aur payment ki shart hoti hai.',
    example: `A hardware distributor supplies 40 bags of cement to a contractor and issues an invoice for 52,000 rupees, payable in 15 days. The contractor pays half now and half on the due date.`,
    body: `## How it works

A receipt says "this has been paid"; an invoice says "this is what you owe". In wholesale and business-to-business trade in Pakistan, goods often go out on credit, so the invoice is the record both sides use to settle the account. It carries the seller's and buyer's names, a unique number, the date, item lines and the terms, such as payment within 15 or 30 days.

If the seller is registered for sales tax, invoices to other businesses usually need to be sales tax invoices with the extra fields the law asks for. Unpaid invoices are the shop's receivables; unpaid supplier invoices are its payables.

## In Nafaa

A Nafaa bill can be printed on 58 mm or 80 mm thermal paper or as a full-page A4 invoice for business customers, and a bill left unpaid goes to the customer's khata so the balance is tracked until it is cleared.`,
    alsoKnownAs: ['bill', 'sales invoice', 'tax invoice'],
    related: ['GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:credit-note'],
    evidence: ['apps/web/src/core/receipt/types.ts', EV.khata],
  },
  {
    slug: 'void',
    term: 'Void (Bill Void)',
    definition: 'To void a bill is to cancel a completed sale so it no longer counts, while keeping a record that it existed and who cancelled it.',
    definitionRomanUrdu: 'Bill void karna matlab mukammal sale ko cancel karna, taake woh hisaab me na gine, magar record rahe ke bill bana tha aur kis ne cancel kiya.',
    example: `A cashier rings up a carton instead of a single pack, the customer objects, and the manager voids the bill with the reason "wrong unit" before a correct bill is made.`,
    body: `## How it works

A void is different from a return. A return means goods came back after a sale; a void means the sale should not have happened, usually because of a mistake at the counter. Voids put the stock back and take the money out of the day's totals.

Because a void removes a sale, it is also the easiest way to hide cash. Many owners in Pakistan have found that a counter with many voids at closing time is a warning sign. Good practice: only senior staff can void, every void needs a reason, and voids are reviewed on the day's report. Deleting bills, instead of voiding them, should never be possible.

## In Nafaa

Voiding a sale needs the separate sales.void permission, which an owner gives to chosen staff only. A voided bill stays in sales history, and in restaurants a void of dishes the kitchen already cooked needs a reason and a PIN and is booked as kitchen waste.`,
    alsoKnownAs: ['bill cancel', 'void sale', 'cancel bill'],
    related: ['GLOSSARY_TERM:sales-return', 'GLOSSARY_TERM:refund', 'GLOSSARY_TERM:z-report'],
    evidence: [EV.permissions, 'apps/web/src/modules/sales/history/api.ts', EV.orderDialogs],
  },
  {
    slug: 'hold-bill',
    term: 'Hold Bill',
    definition: 'Holding a bill means parking an unfinished sale at the counter so the cashier can serve the next customer and resume the first bill later.',
    definitionRomanUrdu: 'Bill hold karna matlab adhoora bill side par rakh dena, taake agle gahak ko serve kiya ja sake aur pehla bill baad me wapas khola ja sake.',
    example: `A customer at a grocery store realises she forgot milk. The cashier holds her bill, serves two people in the queue, then reopens her bill when she returns and adds the milk.`,
    body: `## How it works

Busy counters in Pakistan rarely serve one customer at a time. A customer goes to fetch one more item, calls home to ask what is needed, or waits for a salesman to bring a size from the godown. Without a hold option, the cashier either makes everyone wait or cancels the bill and types it again, which is where mistakes and lost items come from.

Held bills should stay on the counter's screen with a name or note, and anything held for too long should be cleared at closing so it does not sit in stock as "reserved".

## In Nafaa

On the Nafaa counter, F6 puts the current bill on hold and opens a fresh one. The held bills list shows each one with its items and total, ready to resume or remove.`,
    alsoKnownAs: ['park sale', 'suspend bill', 'hold cart'],
    related: ['GLOSSARY_TERM:pos', 'GLOSSARY_TERM:layaway', 'PRODUCT:pos'],
    evidence: [EV.posHold, EV.posShortcuts],
  },
  {
    slug: 'sales-return',
    term: 'Sales Return',
    definition: 'A sales return is goods coming back from a customer after a sale, with the stock put back and the money refunded, adjusted in khata or exchanged.',
    definitionRomanUrdu: 'Sales return matlab sale ke baad gahak ka saman wapas karna; stock wapas aata hai aur paise lautaye jate hain, khata me adjust hote hain ya exchange hota hai.',
    example: `A customer returns a shirt bought two days ago because of a stitching fault. The shop finds the bill by its number, takes the shirt back into stock and gives an exchange for another size.`,
    body: `## How it works

Returns are where counters lose the most money without noticing. Common problems: a refund given without the original bill, a return at today's higher price instead of the price paid, or a damaged item put back on the shelf as sellable. A clear return policy printed on the receipt, and returns made only against a bill, solve most of these.

The money side matters as much as the stock. If the original sale was on khata, the return should reduce the customer's balance, not give cash. If it was paid by Easypaisa, refunding cash from the galla makes the drawer short.

## In Nafaa

In Nafaa a return starts from the bill, typed or scanned, so prices come from the original sale. The returns page shows what went back on the shelf, how the money was returned and who approved it, and the drawer only counts cash actually handed back.`,
    alsoKnownAs: ['return', 'customer return', 'wapsi', 'exchange'],
    related: ['GLOSSARY_TERM:refund', 'GLOSSARY_TERM:credit-note', 'GLOSSARY_TERM:void', 'GLOSSARY_TERM:receipt'],
    evidence: [EV.returns],
  },
  {
    slug: 'refund',
    seoDescription: 'A refund is money paid back to a customer for a returned item or a cancelled order. Here is how shops record refunds and keep the cash drawer right.',
    term: 'Refund',
    definition: 'A refund is money paid back to a customer for a returned item or a cancelled order.',
    definitionRomanUrdu: 'Refund matlab wapas kiye gaye saman ya cancel order ke paise gahak ko lautana.',
    example: `An online customer cancels a COD order after it was paid by bank transfer. The store refunds the amount to the same account and keeps the transfer reference with the order.`,
    body: `## How it works

A refund is the money half of a return. The safest rule is to refund the same way the customer paid: cash for cash, wallet for wallet, and a khata adjustment for a sale on credit. Mixing them causes trouble: a cash refund for a JazzCash sale makes the drawer short, and a cash refund for an udhaar sale pays out money the shop never received.

Refunds are also a common way for cash to leak. Many shops require a manager's approval for any refund and review the day's refunds at closing, along with voids and large discounts.

## In Nafaa

Refunds in Nafaa are made through a return against the original bill, and only staff with the returns permission can make them. The return records how the money went back, and the cash register counts only cash actually handed out.`,
    alsoKnownAs: ['money back', 'paise wapas'],
    related: ['GLOSSARY_TERM:sales-return', 'GLOSSARY_TERM:void', 'GLOSSARY_TERM:chargeback', 'GLOSSARY_TERM:credit-note'],
    evidence: [EV.returns, EV.permissions],
  },
  {
    slug: 'discount',
    term: 'Discount',
    definition: 'A discount is a reduction from the normal selling price, given as a fixed amount or a percentage on an item or a whole bill.',
    definitionRomanUrdu: 'Discount normal qeemat me kami hai, jo kisi item ya poore bill par fixed raqam ya percentage me di jati hai.',
    example: `A regular customer buys 8,400 rupees of groceries. The owner gives 400 rupees off the bill. On a 20% margin, that discount takes almost a quarter of the profit on the sale.`,
    body: `## How it works

Discounts in Pakistani retail are often given by feel: a round-off for a regular customer, a bargain on a big bill, a festival offer at Eid. Each one is small, but together they are usually the biggest gap between the price list and what the shop actually earns.

Two rules keep them under control. First, set a limit, such as a maximum percentage per bill, above which the owner must approve. Second, track discounts by staff member and reason, so the owner can see where they go. Planned offers, such as a discount code shared on WhatsApp, are easier to measure than ad hoc ones.

## In Nafaa

At the Nafaa counter, F4 opens the discount on the bill. Shops can set a discount limit; going above it needs a PIN, or a person the owner has given the "discount above limit" permission. Discount codes can be limited by branch, customer and date, and the profit report shows what discounts took from profit.`,
    alsoKnownAs: ['price reduction', 'offer', 'rebate', 'round-off'],
    related: ['GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:combo-deal', 'GLOSSARY_TERM:loyalty-points', 'GLOSSARY_TERM:markup'],
    evidence: [EV.posDiscount, EV.discounts, EV.permissions, EV.profitReport],
  },
  {
    slug: 'combo-deal',
    seoDescription: 'A combo deal is a set of products sold together at one price, usually lower than buying each item on its own. Here is how shops set and track them.',
    term: 'Combo Deal',
    definition: 'A combo deal is a set of products sold together at one price, usually lower than buying each item separately.',
    definitionRomanUrdu: 'Combo deal kuch products ka set hai jo ek qeemat par becha jata hai, aksar alag alag khareedne se sasta.',
    example: `A fast food outlet sells a burger, fries and a drink for 950 rupees instead of 1,150 separately. A stationery shop sells a "back to school" pack of notebooks, pencils and a geometry box.`,
    body: `## How it works

Combos move slower items with faster ones, raise the average bill and make pricing simple at the counter. Restaurants call them deals; retailers call them bundles or packs. The risk is that the combo price is set without checking cost, so a popular deal quietly earns less than selling the items one by one.

Before launching a combo, check three things: the cost of all parts together, the saving the customer sees, and whether you have stock of every part. When a combo sells, each part should leave stock, not a separate "combo" item that never matches the shelf.

## In Nafaa

Combos in Nafaa are built from existing products, including variants and packs. The form shows the parts' separate price, the customer's saving, cost, profit, margin and how many can be made from stock. When a combo sells, each part leaves stock, and combos open at the counter with F7.`,
    alsoKnownAs: ['bundle', 'deal', 'meal deal', 'pack offer'],
    related: ['GLOSSARY_TERM:discount', 'GLOSSARY_TERM:average-bill-value', 'GLOSSARY_TERM:food-cost'],
    evidence: [EV.combos, EV.posShortcuts],
  },
  {
    slug: 'loyalty-points',
    term: 'Loyalty Points',
    definition: 'Loyalty points are credits a customer earns on purchases and can later redeem for a discount or a gift, to encourage repeat visits.',
    definitionRomanUrdu: 'Loyalty points woh points hain jo gahak khareedari par kamata hai aur baad me discount ya gift ke liye istemal karta hai, taake woh baar baar aaye.',
    example: `A bakery gives 1 point for every 100 rupees spent; 100 points are worth 100 rupees off. A family that spends 12,000 rupees a month earns 120 points and uses them at Eid.`,
    body: `## How it works

Points work best when the rules are simple enough to explain at the counter in one sentence. The shop decides how many points per rupee, what a point is worth, the minimum to redeem and when points expire. Unredeemed points are a promise the shop owes, so the owner should know their total value at any time.

In Pakistan the customer's mobile number is the natural loyalty card. A WhatsApp message with the balance after each visit reminds customers to come back. Measure the programme: compare what points cost with the repeat sales of members.

## In Nafaa

The Loyalty page in Nafaa sets the rules, member levels and points expiry, and shows points outstanding with their rupee value, points given and redeemed by day and branch, each member's history, and manual gifts or corrections.`,
    alsoKnownAs: ['reward points', 'loyalty programme', 'loyalty card'],
    related: ['GLOSSARY_TERM:discount', 'GLOSSARY_TERM:average-bill-value', 'PRODUCT:loyalty', 'BLOG_POST:whatsapp-customer-retention'],
    evidence: [EV.loyalty],
  },
  {
    slug: 'average-bill-value',
    term: 'Average Bill Value',
    definition: 'Average bill value is total sales for a period divided by the number of bills, showing how much a customer spends per visit on average.',
    definitionRomanUrdu: 'Average bill value kisi muddat ki kul sale ko bills ki tadaad se taqseem karne par milti hai; yeh batati hai ke ek gahak aam taur par kitna kharch karta hai.',
    example: `A pharmacy sold 1,240,000 rupees in a month across 2,480 bills, an average of 500 rupees a bill. After adding vitamins near the counter, the average rose to 540 rupees.`,
    body: `## How it works

Sales grow in only two ways: more bills or bigger bills. Average bill value (also called average transaction value or basket size) shows the second. It is a useful daily number because it moves with things the shop controls: what sits near the counter, whether staff suggest the larger pack, and whether combos make sense.

Compare it by day of week, by branch and by cashier. A branch with many bills but a low average may be busy but under-selling. Be careful with discounts: pushing the average up with deep offers can lower profit even as sales rise, so look at it alongside gross margin.

## In Nafaa

The Nafaa reports centre and dashboards show bills and sales for any period, and the profit report compares periods, so the average per bill can be followed against margin over time.`,
    alsoKnownAs: ['average transaction value', 'ATV', 'basket size', 'average order value', 'AOV'],
    related: ['GLOSSARY_TERM:combo-deal', 'GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:loyalty-points'],
    evidence: [EV.profitReport, 'apps/web/src/modules/reports/center'],
  },
  {
    slug: 'customer-display',
    term: 'Customer Display',
    definition: 'A customer display is a second screen facing the customer at the counter that shows the items, the total and the change as the bill is made.',
    definitionRomanUrdu: 'Customer display counter par gahak ki taraf doosri screen hai jo bill bante waqt items, total aur change dikhati hai.',
    example: `A supermarket puts a small monitor facing the queue. Customers see each item and price as it is scanned, and a payment QR appears so they can pay by Raast or a wallet without asking for an account number.`,
    body: `## How it works

A customer display builds trust: the customer sees the price of every item as it is scanned, which ends most "I was charged twice" arguments at the counter. It also speeds up payment, because the total and any QR code are already in front of the customer when the cashier says the amount.

Hardware can be a pole display with two lines of text, a small second monitor, or an old tablet. When nobody is at the counter, the screen can show the shop's own messages, such as offers or opening hours.

## In Nafaa

Nafaa has a customer display page that runs on a second screen of the same computer. It follows the POS window and shows the live bill, the payment QR, the change to hand back and the shop's own messages while waiting.`,
    alsoKnownAs: ['pole display', 'second screen', 'customer facing display'],
    related: ['GLOSSARY_TERM:raast-qr', 'GLOSSARY_TERM:pos', 'GLOSSARY_TERM:cash-drawer'],
    evidence: ['apps/web/src/core/hardware/CustomerDisplayPage.tsx', EV.hardware],
  },
  {
    slug: 'thermal-printer',
    seoDescription: 'A thermal receipt printer prints bills on heat-sensitive paper rolls without ink, usually 58 mm or 80 mm wide. Here is how shops choose and use one.',
    term: 'Thermal Receipt Printer',
    definition: 'A thermal receipt printer prints bills on heat-sensitive paper rolls without ink, usually 58 mm or 80 mm wide.',
    definitionRomanUrdu: 'Thermal printer garmi se chhapne wala printer hai jo bina ink ke kaghaz ke roll par bill chhapta hai, aam taur par 58 ya 80 mm chaura.',
    example: `A small kiryana uses a 58 mm USB printer for short bills. A restaurant uses 80 mm printers: one at the counter for bills and one in the kitchen for KOTs.`,
    body: `## How it works

Thermal printers are the standard at Pakistani counters because they are fast, quiet and need no ink, only paper rolls. The 80 mm size fits more text and a logo; 58 mm is cheaper and enough for short bills. Most use the ESC/POS command set, connect by USB, network or Bluetooth, and many have a port that opens the cash drawer.

Thermal paper fades with heat and sunlight over months, so a customer who needs a lasting record for warranty should also get the bill on WhatsApp or a full-page invoice. Store paper rolls away from heat.

## In Nafaa

Nafaa prints bills through the browser by default, and each counter can also set up its own receipt printer under Settings, Hardware, with setup steps and a test button. The same printer can open the cash drawer on cash sales.`,
    alsoKnownAs: ['receipt printer', 'POS printer', 'bill printer', '80mm printer'],
    related: ['GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:cash-drawer', 'GLOSSARY_TERM:kot'],
    evidence: [EV.hardware, EV.hardwareSettings],
  },
  {
    slug: 'cloud-pos',
    term: 'Cloud POS',
    definition: 'A cloud POS is billing software whose data is stored on internet servers, so sales and stock can be seen from any device and branch.',
    definitionRomanUrdu: 'Cloud POS woh billing software hai jis ka data internet servers par hota hai, is liye sale aur stock kisi bhi device aur branch se dekha ja sakta hai.',
    example: `A shop owner in Faisalabad checks the day's sale and the cash in each galla from his phone while visiting a supplier in Lahore, without calling the counter.`,
    body: `## How it works

Older POS software in Pakistan was installed on one counter computer, with data on its hard drive. If the computer failed or was stolen, the records went with it, and the owner could only see sales by sitting at that computer. A cloud POS keeps the data on servers and makes regular backups, so the owner can check sales from home, add a branch without new servers, and replace a broken counter computer by logging in on another one.

The concern most shops raise is the internet. A good cloud POS keeps billing when the connection drops and sends the bills when it returns. Ask any vendor what happens offline and who owns the data.

## In Nafaa

Nafaa runs in the browser and as a desktop app, with the same account across branches. The counter keeps billing offline and syncs saved bills when the internet comes back.`,
    alsoKnownAs: ['online POS', 'web POS', 'SaaS POS'],
    related: ['GLOSSARY_TERM:offline-pos', 'GLOSSARY_TERM:multi-branch', 'GLOSSARY_TERM:pos', 'PRODUCT:offline-pos'],
    evidence: [EV.offline, 'apps/web/src/core/lib/offline/syncEngine.ts', 'apps/web/src/modules/desktop'],
  },
  {
    slug: 'offline-pos',
    term: 'Offline POS',
    definition: 'An offline POS keeps making bills when the internet is down, saving them on the device and sending them to the server when the connection returns.',
    definitionRomanUrdu: 'Offline POS internet band hone par bhi bill banata rehta hai; bill device par save hote hain aur internet aane par server par chale jaate hain.',
    example: `During load-shedding the shop's router goes off but the counter laptop runs on battery. The cashier makes 35 bills offline; when the power returns, they upload and the owner's report catches up.`,
    body: `## How it works

In Pakistan load-shedding and patchy internet are normal, so a counter that stops when the connection drops is a real cost. An offline POS keeps a copy of products, prices and customers on the counter device. Bills made offline are stored locally with their own numbers and synced later.

Some things depend on the server: stock levels across branches update only after sync, and actions that need a live check, such as confirming a customer's latest khata balance from another branch, may wait. Check what a system does offline before buying, and never log out of a counter with unsynced bills.

## In Nafaa

The Nafaa counter keeps products, customers and settings on the device and saves offline bills, with a receipt, in a local queue that syncs when the internet returns. Logging out never discards unsynced bills.`,
    alsoKnownAs: ['offline billing', 'offline mode', 'POS without internet'],
    related: ['GLOSSARY_TERM:cloud-pos', 'GLOSSARY_TERM:pos', 'PRODUCT:offline-pos'],
    evidence: [EV.offline, 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/syncEngine.ts'],
  },
  {
    slug: 'multi-branch',
    term: 'Multi-Branch Management',
    definition: 'Multi-branch management is running several shops or outlets from one system, with each branch\'s stock, cash and sales kept separately and seen together.',
    definitionRomanUrdu: 'Multi-branch management matlab kai dukaanein ek system se chalana, jahan har branch ka stock, cash aur sale alag rahe magar ek jagah nazar aaye.',
    example: `A mobile accessories business has three outlets in Hafeez Centre, Liberty and Johar Town. The owner sees which branch sold most this week and moves slow chargers from Liberty to Johar Town.`,
    body: `## How it works

The jump from one shop to two is where many Pakistani businesses lose control: the owner cannot be at both counters, stock is counted differently in each place, and cash is sent home by different people. A multi-branch system keeps one product list and price list, but stock and cash per branch, with staff limited to the branch they work in.

The useful reports compare branches: sales, profit, stock value, slow items and cash shorts. Stock moves between branches should be recorded as transfers, so neither branch's count goes wrong.

## In Nafaa

Nafaa keeps branches under one account, with branch analytics, stock per branch, transfers that record what was sent and what actually arrived, and staff who can be tied to one branch so they only see its data.`,
    alsoKnownAs: ['multi-shop', 'multi-store', 'chain store management', 'multi-location'],
    related: ['GLOSSARY_TERM:stock-transfer', 'GLOSSARY_TERM:cloud-pos', 'PRODUCT:multi-shop', 'BLOG_POST:multi-shop-management-guide'],
    evidence: [EV.nav, EV.transfers],
  },
];
