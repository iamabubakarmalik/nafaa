/**
 * Glossary: money and accounting words a shop owner meets (credit, margin,
 * profit, cash flow, receivables, payables, notes, books and expenses).
 */

import { EV, type TermSpec } from './_term';

const DIRECTORY = 'apps/web/src/modules/customers/directory/api.ts';
const REMINDERS = 'apps/web/src/modules/customers/directory/messages.ts';

export const moneyTerms: TermSpec[] = [
  {
    slug: 'khata',
    imported: true,
    term: 'Khata',
    definition: 'A khata is a ledger, traditionally a paper register, that records what each customer owes a shop on credit and what they have paid back.',
    definitionRomanUrdu: 'Khata woh register hai jis me dukandar likhta hai ke kis gahak ne kitna udhaar liya aur kitna wapas kiya.',
    example: `A shopkeeper writes 2,350 rupees against a regular customer who will pay at the end of the month. On the 1st, the customer pays 2,000, and the khata shows 350 still due.`,
    body: `## How it works

Almost every neighbourhood shop in Pakistan runs a khata. It keeps customers loyal, but it is also where shops lose the most money: entries are missed when the counter is busy, pages are hard to read, totals are added by hand, and customers dispute amounts because they have no copy. The register can also be lost, wet or torn.

A good khata, paper or digital, records every credit sale against the bill, every payment with how it was paid, and a running balance. Sending the customer a balance after each entry ends most disputes. Set a limit for each customer, and follow up early on old balances, since the older a balance gets, the less likely it is to be paid.

## In Nafaa

Nafaa keeps a khata for every customer. Bills left unpaid post to it automatically, payments record their method (cash, bank or wallet), customers can have a credit limit, and the directory shows balances by age with WhatsApp reminders in ready templates.`,
    alsoKnownAs: ['ledger', 'udhaar register', 'digital khata', 'khata book', 'bahi khata'],
    related: ['GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:accounts-receivable', 'PRODUCT:khata', 'BLOG_POST:digital-khata-vs-paper-ledger'],
    evidence: [EV.khata, EV.customerForm, DIRECTORY, REMINDERS],
  },
  {
    slug: 'udhaar',
    imported: true,
    term: 'Udhaar',
    definition: 'Udhaar is credit given to a customer: goods are taken now and paid for later.',
    definitionRomanUrdu: 'Udhaar ka matlab hai saman abhi le lena aur paise baad me dena.',
    example: `A construction contractor takes 30,000 rupees of fittings on udhaar from a hardware store and promises to pay when his client releases the next payment, in about three weeks.`,
    body: `## How it works

Udhaar is part of how business works in Pakistan, from mohalla shops to wholesale markets. It brings regular customers and bigger orders, but every rupee given on credit is the shop's own working capital sitting in someone else's pocket. Many shops that look profitable are short of cash because too much is out on udhaar.

Sensible rules: decide who gets credit and how much, write every udhaar sale against the customer at the moment it happens, agree a payment date, and remind early. Track the total udhaar outstanding each week alongside sales. If it grows faster than sales, the shop is funding its customers.

## In Nafaa

At the Nafaa counter, a bill can be paid fully or partly on khata. The unpaid part goes to the customer's khata with the bill, a bill that would take a customer over their credit limit needs a manager's PIN, and the customer list sorts by balance and by how long it has been due.`,
    alsoKnownAs: ['udhar', 'credit sale', 'buy now pay later', 'ادھار'],
    related: ['GLOSSARY_TERM:khata', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:working-capital', 'GLOSSARY_TERM:qist'],
    evidence: [EV.khata, EV.customerForm, DIRECTORY, 'apps/api/src/modules/sales/sales/sales.service.ts'],
  },
  {
    slug: 'gross-margin',
    term: 'Gross Margin',
    definition: 'Gross margin is gross profit shown as a percentage of the selling price: (selling price minus cost) divided by selling price.',
    definitionRomanUrdu: 'Gross margin gross profit ko selling price ke percentage me dikhata hai: (qeemat minus cost) taqseem qeemat.',
    example: `A shop buys a cooking oil bottle for 520 rupees and sells it for 580. Gross profit is 60 rupees, and gross margin is 60 divided by 580, about 10.3%.`,
    body: `## How it works

Margin answers "out of every 100 rupees I take at the counter, how much is mine before expenses?" It is the number to compare across products and categories. In Pakistani retail, staples like flour, sugar and oil run on thin margins, while cosmetics, accessories and stationery usually carry wider ones.

Margin and markup are often mixed up. A 25% markup on cost is only a 20% margin on price. Discounts come straight out of margin: a 5% discount on a 10% margin item takes half the profit. Watch margin by category every month; a fall usually means costs rose and selling prices were not updated.

## In Nafaa

The Nafaa product editor shows margin as the price is typed, and the profit report shows earnings by product, category, brand and supplier at the cost saved on each bill line, after discounts and returns.`,
    alsoKnownAs: ['margin', 'profit margin', 'GP margin', 'gross profit margin'],
    related: ['GLOSSARY_TERM:markup', 'GLOSSARY_TERM:gross-profit', 'GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:discount'],
    evidence: [EV.variantCard, EV.profitReport],
  },
  {
    slug: 'markup',
    term: 'Markup',
    definition: 'Markup is the amount added to the cost price to get the selling price, usually expressed as a percentage of cost.',
    definitionRomanUrdu: 'Markup woh raqam hai jo cost price par laga kar selling price banti hai, aam taur par cost ka percentage.',
    example: `A garments shop buys a shirt for 1,600 rupees and applies a 50% markup, so it sells for 2,400. The margin on that sale is 800 divided by 2,400, which is 33%, not 50%.`,
    body: `## How it works

Many Pakistani shopkeepers price by markup because it is easy at purchase time: "cost plus 20%". It works well when costs are known and stable. The risk is confusing it with margin when planning: if the shop needs a 25% margin to cover rent and salaries, a 25% markup will fall short.

To convert: margin equals markup divided by (100 plus markup). A 20% markup is a 16.7% margin; a 100% markup is a 50% margin. Use markup to set prices, and margin to judge whether the business earns enough.

## In Nafaa

The price step of the Nafaa product editor has markup chips (for example 10%, 15%, 20%, 25%) that set the selling price from the cost in one tap, and shows the resulting profit and margin.`,
    alsoKnownAs: ['mark-up', 'cost plus', 'munafa percentage'],
    related: ['GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:landed-cost', 'GLOSSARY_TERM:wholesale-price'],
    evidence: [EV.priceStep, EV.variantCard],
  },
  {
    slug: 'cogs',
    term: 'COGS (Cost of Goods Sold)',
    definition: 'Cost of goods sold is the purchase cost of the items a business actually sold in a period, which is subtracted from sales to find gross profit.',
    definitionRomanUrdu: 'COGS kisi muddat me bikne wale saman ki khareed ki qeemat hai, jo sale me se nikal kar gross profit nikalta hai.',
    example: `In October a shop sold goods for 900,000 rupees. Those exact items had cost it 720,000 rupees. COGS is 720,000 and gross profit is 180,000, regardless of how much stock was bought in October.`,
    body: `## How it works

A common mistake is to treat purchases as cost: "I bought 800,000 of stock this month and sold 900,000, so I made 100,000". Purchases build stock; only what is sold becomes COGS. The classic formula is opening stock plus purchases minus closing stock.

In a POS the easier way is to save the cost on each bill line at the moment of sale, then add those up. Cost should include freight and other landed costs, otherwise profit looks better than it is. Damage, expiry and theft are usually shown separately as stock written off, so the owner can see them.

## In Nafaa

Nafaa saves the cost on every bill line when the sale is made, at landed cost from purchases, and the profit and P&L reports use those figures, with stock written off shown as its own line.`,
    alsoKnownAs: ['cost of sales', 'cost of goods sold', 'COS'],
    related: ['GLOSSARY_TERM:gross-profit', 'GLOSSARY_TERM:landed-cost', 'GLOSSARY_TERM:stock-valuation', 'GLOSSARY_TERM:profit-and-loss'],
    evidence: [EV.profitReport, EV.pnl, EV.purchasesService],
  },
  {
    slug: 'gross-profit',
    term: 'Gross Profit',
    definition: 'Gross profit is sales minus the cost of the goods sold, before rent, salaries, bills and other expenses are taken off.',
    definitionRomanUrdu: 'Gross profit sale minus bikne wale saman ki cost hai, kiraya, tankhwah aur bills nikalne se pehle.',
    example: `A bakery's sales for the week are 410,000 rupees and the ingredients and packing in what it sold cost 250,000. Gross profit is 160,000 rupees, which must still pay staff, gas and rent.`,
    body: `## How it works

Gross profit shows whether the buying and pricing work. If gross profit is too thin, no amount of cost cutting on expenses will make the shop healthy. It is the right figure for comparing products, categories, suppliers and staff, because expenses are not split between them.

Watch three things that reduce it without anyone noticing: discounts given at the counter, returns, and cost increases that were never passed on to selling prices. Comparing gross profit with the same period last month or last year shows whether the business is improving or just selling more.

## In Nafaa

The Nafaa profit report shows what each product, variant, category, brand, supplier, staff member and day earned in a period after discounts and returns, compares it with the previous period, and lists loss-making items.`,
    alsoKnownAs: ['GP', 'gross income', 'trading profit'],
    related: ['GLOSSARY_TERM:net-profit', 'GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:gross-margin', 'PRODUCT:reports'],
    evidence: [EV.profitReport],
  },
  {
    slug: 'net-profit',
    term: 'Net Profit',
    definition: 'Net profit is what is left from sales after the cost of goods and all business expenses have been taken off.',
    definitionRomanUrdu: 'Net profit woh hai jo sale me se saman ki cost aur karobar ke tamam kharchay nikalne ke baad bachta hai.',
    example: `A shop's gross profit for the month is 310,000 rupees. Rent, two salaries, electricity, internet and bank charges add up to 205,000. Net profit is 105,000 rupees before tax.`,
    body: `## How it works

Net profit is the real earning of the business. Many owners in Pakistan judge the month by the cash taken home, which mixes in udhaar collections, stock bought and personal spending. Net profit separates them: sales minus cost of goods, minus expenses, minus stock lost to damage or expiry.

The owner's own drawings are not an expense; they are taken out of profit. Paying household bills from the galla without recording them makes net profit impossible to measure. Track it monthly and compare with the same month last year, since many businesses have strong seasons such as Ramadan, Eid and school openings.

## In Nafaa

The Nafaa P&L page shows profit for any period against the previous one or the same dates last year, month by month and branch by branch, with net profit after expenses and stock written off.`,
    alsoKnownAs: ['net income', 'bottom line', 'asal munafa'],
    related: ['GLOSSARY_TERM:gross-profit', 'GLOSSARY_TERM:operating-expenses', 'GLOSSARY_TERM:profit-and-loss', 'GLOSSARY_TERM:break-even-point'],
    evidence: [EV.pnl, EV.profitReport],
  },
  {
    slug: 'profit-and-loss',
    term: 'Profit and Loss Statement (P&L)',
    definition: 'A profit and loss statement is a report of sales, costs and expenses over a period that shows whether the business made a profit or a loss.',
    definitionRomanUrdu: 'Profit and loss statement ek muddat ki sale, cost aur kharchon ki report hai jo batati hai ke karobar ne munafa kamaya ya nuqsan kiya.',
    example: `A clinic's P&L for September: fees and pharmacy sales 1,150,000 rupees, medicines sold at cost 380,000, salaries 340,000, rent 150,000, utilities 60,000. Net profit is 220,000 rupees.`,
    body: `## How it works

The P&L, also called the income statement, follows a fixed order: sales, minus cost of goods sold, gives gross profit; minus operating expenses gives operating profit; then other income and costs, and tax, give net profit. It covers a period, usually a month or a year, unlike a balance sheet, which shows a single date.

For a small business, the monthly P&L answers the questions owners ask most: did we make money, where did it go, and is this month better than last? Banks and investors also ask for it when a business applies for finance.

## In Nafaa

The Nafaa P&L page builds the statement from bills, purchases and expenses for any period, compares it with the previous period or last year, shows it month by month for up to two years and branch by branch, and prints to A4, PDF or thermal paper or exports to CSV.`,
    alsoKnownAs: ['P&L', 'income statement', 'profit and loss account', 'nafa nuqsan'],
    related: ['GLOSSARY_TERM:net-profit', 'GLOSSARY_TERM:gross-profit', 'GLOSSARY_TERM:cash-flow', 'GLOSSARY_TERM:break-even-point'],
    evidence: [EV.pnl],
  },
  {
    slug: 'break-even-point',
    term: 'Break-Even Point',
    definition: 'The break-even point is the level of sales at which gross profit exactly covers fixed expenses, so the business makes neither profit nor loss.',
    definitionRomanUrdu: 'Break-even point sale ki woh had hai jahan gross profit bilkul fixed kharchon ke barabar ho jata hai, na munafa na nuqsan.',
    example: `A cafe's fixed costs are 450,000 rupees a month and its average gross margin is 60%. Break-even sales are 450,000 divided by 0.6, which is 750,000 rupees a month, or about 25,000 a day.`,
    body: `## How it works

Break-even turns a vague goal into a daily target. Divide fixed monthly costs (rent, salaries, generator fuel, internet, loan payments) by the gross margin percentage. Every rupee of sales above that point is profit at the gross margin rate.

It is especially useful before opening a branch or taking a bigger shop: if the new rent pushes break-even above what the location can realistically sell, the move is risky. It also shows why discounts are expensive, since a lower margin raises the sales needed just to cover costs.

## In Nafaa

The analytics on the Nafaa P&L page include margins and break-even, worked out from the shop's own expenses and gross margin for the chosen period.`,
    alsoKnownAs: ['break even', 'BEP', 'break-even sales'],
    related: ['GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:operating-expenses', 'GLOSSARY_TERM:profit-and-loss'],
    evidence: [EV.pnl],
  },
  {
    slug: 'cash-flow',
    term: 'Cash Flow',
    definition: 'Cash flow is the movement of money into and out of a business over a period, which shows whether it has enough cash to pay its bills on time.',
    definitionRomanUrdu: 'Cash flow karobar me paise aane aur jaane ka hisaab hai, jo batata hai ke bill waqt par dene ke liye cash hai ya nahi.',
    example: `A wholesaler made a good profit in November but had to pay suppliers 1.8 million rupees in advance for winter stock while 1.1 million was stuck in udhaar. Profit was positive, but cash flow was negative.`,
    body: `## How it works

Profit and cash are not the same. Profit is earned when a sale is made; cash arrives when the customer pays. Stock bought today, udhaar given to customers, credit from suppliers and loan repayments all move cash without changing profit. That is why a growing shop can run out of money.

Look at cash flow weekly: cash in from sales and khata collections, cash out to suppliers, salaries, rent and the owner. Plan ahead for seasonal peaks, such as buying for Eid or school season, when stock must be paid for weeks before it sells.

## In Nafaa

The Nafaa P&L page has a cash in and cash out view, and Shop accounts shows money in and out of each account (cash, bank, card, JazzCash, Easypaisa), the real balances, what the shop owns and owes, and a ledger of every movement.`,
    alsoKnownAs: ['cash flow statement', 'paise ki aamad o raft'],
    related: ['GLOSSARY_TERM:working-capital', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:profit-and-loss'],
    evidence: [EV.pnl, EV.money],
  },
  {
    slug: 'accounts-receivable',
    term: 'Accounts Receivable',
    definition: 'Accounts receivable is the money customers owe a business for goods or services already supplied on credit.',
    definitionRomanUrdu: 'Accounts receivable woh raqam hai jo gahakon ne udhaar par liye gaye saman ya service ke badle dukaan ko deni hai.',
    example: `A pharmacy supplies three clinics on monthly credit. On the 30th, receivables are 410,000 rupees: 180,000 under 30 days, 150,000 between 30 and 90 days, and 80,000 older than 90 days.`,
    body: `## How it works

In a Pakistani shop, receivables are simply the total of all khata balances. Accountants split them by age, called an ageing report: amounts due under 7 days, under 30, under 90 and older. The older the balance, the less likely it is to be paid, so collection efforts should start with the oldest amounts from customers who are still buying.

Compare receivables with monthly credit sales. If customers on average take longer and longer to pay, the shop is lending more of its working capital. A balance that has not moved in months may need to be written off as a bad debt rather than counted as an asset.

## In Nafaa

Every customer's khata balance in Nafaa adds up to the shop's receivables. The customer directory sorts and filters balances by age (current, 7, 30 and 90 days), shows the oldest due date, and sends WhatsApp reminders from templates.`,
    alsoKnownAs: ['receivables', 'debtors', 'AR', 'lena', 'baqaya'],
    related: ['GLOSSARY_TERM:khata', 'GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:cash-flow'],
    evidence: [DIRECTORY, REMINDERS, EV.khata],
  },
  {
    slug: 'accounts-payable',
    term: 'Accounts Payable',
    definition: 'Accounts payable is the money a business owes its suppliers for goods or services it has received but not yet paid for.',
    definitionRomanUrdu: 'Accounts payable woh raqam hai jo dukaan ne suppliers ko deni hai, un saman ya services ke liye jo mil chuki hain magar paise abhi nahi diye.',
    example: `A kiryana owes the oil distributor 95,000 rupees, the biscuit distributor 42,000 and a local dairy 18,000. Total payables are 155,000 rupees, with the oil bill due on Friday.`,
    body: `## How it works

Supplier credit is how most Pakistani shops finance their stock: the distributor's salesman leaves goods and collects next visit. Payables are the shop's side of the khata. Managing them well means paying on the agreed date (to keep credit and discounts), not paying too early (which drains cash), and checking every supplier statement against your own purchase records before paying.

Disputes usually come from returns and short deliveries that were never adjusted. Recording each purchase, payment and purchase return against the supplier keeps the balance agreed by both sides.

## In Nafaa

Each supplier in Nafaa has a ledger of purchases, payments and returns with a running balance. Purchases can be paid fully or partly, a purchase return lowers what is owed, and the purchases list filters bills still on credit.`,
    alsoKnownAs: ['payables', 'creditors', 'AP', 'dena', 'supplier dues'],
    related: ['GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:debit-note', 'GLOSSARY_TERM:cash-flow'],
    evidence: [EV.supplierLedger, EV.purchasesApi],
  },
  {
    slug: 'credit-note',
    term: 'Credit Note',
    definition: 'A credit note is a document a seller issues to reduce what a buyer owes, usually because goods were returned or an invoice was overcharged.',
    definitionRomanUrdu: 'Credit note woh document hai jo bechne wala khareedar ka wajib raqam kam karne ke liye deta hai, aam taur par return ya zyada charge hone par.',
    example: `A distributor invoiced a retailer for 10 cartons but only 9 arrived. Instead of changing the original invoice, it issues a credit note for one carton, and the retailer's balance drops by that amount.`,
    body: `## How it works

Once an invoice is issued, good practice (and tax law for registered businesses) says it should not be edited. Corrections are made with a separate document: a credit note reduces the amount due, and a debit note increases it or records the buyer's claim. Each carries its own number and refers to the original invoice.

For a shop, every customer return on a credit sale is in effect a credit note: the khata balance goes down. For sales tax registered businesses, credit notes also reduce the output tax of the period, under conditions set in the Sales Tax Act, 1990, so they must be recorded properly.

## In Nafaa

A return in Nafaa is made against the original bill, so the customer's khata or the money returned is adjusted without editing the sale. The tax module's monthly report lists returns as credit notes with their tax, alongside the period's sales.`,
    alsoKnownAs: ['credit memo', 'return note', 'sales credit note'],
    related: ['GLOSSARY_TERM:debit-note', 'GLOSSARY_TERM:sales-return', 'GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:sales-tax-invoice'],
    evidence: [EV.returns, EV.taxPrint],
  },
  {
    slug: 'debit-note',
    term: 'Debit Note',
    definition: 'A debit note is a document a buyer sends a supplier when returning goods or claiming a deduction, recording that the amount owed should go down.',
    definitionRomanUrdu: 'Debit note woh document hai jo khareedar supplier ko maal wapas karte waqt ya katauti ka dawa karte waqt bhejta hai, ke wajib raqam kam honi chahiye.',
    example: `A medical store sends back 20 strips that arrived near expiry. It gives the distributor a debit note for their value, and its supplier balance drops once the distributor accepts the return.`,
    body: `## How it works

The debit note is the buyer's side of a return to the supplier, while the credit note is the seller's side. Usage varies, and in Pakistani trade both words are sometimes used loosely, so what matters is the record: which goods went back, from which purchase, at what value, and whether the supplier agreed.

Purchase returns are common for near-expiry medicines, damaged cartons, wrong sizes and short-dated food. If they are not recorded, the shop pays the full supplier bill for goods it no longer has. Value returns at what the goods actually cost, including freight, not at today's price list.

## In Nafaa

A purchase return in Nafaa sends goods back to the supplier, takes them out of stock (including from their batches) and lowers the supplier's balance by their landed cost.`,
    alsoKnownAs: ['debit memo', 'purchase return note'],
    related: ['GLOSSARY_TERM:credit-note', 'GLOSSARY_TERM:purchase-return', 'GLOSSARY_TERM:accounts-payable'],
    evidence: [EV.purchasesService, EV.supplierLedger],
  },
  {
    slug: 'day-book',
    term: 'Day Book',
    definition: 'A day book is the daily record of every transaction in a business, in the order they happened: sales, receipts, payments and expenses.',
    definitionRomanUrdu: 'Day book (roznamcha) karobar ka rozana record hai jis me har len den usi tarteeb se likha jata hai: sale, wasooli, payment aur kharchay.',
    example: `At closing, a hardware store's day book shows 74 bills, 3 khata payments received, one supplier paid by bank transfer, two expenses for loading and tea, and the cash that should be in the galla.`,
    body: `## How it works

Before computers, every Pakistani business kept a roznamcha: one page per day, every entry as it happened. Accountants later posted those entries to ledgers. The idea is still useful because it answers the owner's first question each evening: what happened today, and does the cash match?

A good day book brings together sales by payment method, collections, payments, expenses and staff activity, and it ends with a checklist: drawers closed, differences explained, nothing left on hold. Reviewing it daily catches mistakes while staff still remember what happened.

## In Nafaa

The Nafaa Day book shows one business day across counters: overview, items sold, cash, money by account, checks, each staff member's bills, and a closing checklist.`,
    alsoKnownAs: ['roznamcha', 'daily register', 'daybook', 'daily journal'],
    related: ['GLOSSARY_TERM:z-report', 'GLOSSARY_TERM:galla', 'GLOSSARY_TERM:cash-flow'],
    evidence: [EV.dayBook, 'apps/web/src/modules/reports/day-book/components/CloseChecklist.tsx'],
  },
  {
    slug: 'petty-cash',
    term: 'Petty Cash',
    definition: 'Petty cash is a small amount of cash kept for minor business expenses such as tea, transport, cleaning and small repairs.',
    definitionRomanUrdu: 'Petty cash thora sa cash hai jo chhote kharchon ke liye rakha jata hai, jaise chai, kiraya, safai aur chhoti marammat.',
    example: `An office keeps 10,000 rupees of petty cash. Over two weeks it spends 9,200 on tea, courier and a plumber, with a slip for each. The owner tops it back up to 10,000 against the slips.`,
    body: `## How it works

In many shops petty expenses come straight out of the galla, which is why the night count rarely matches. The fix is simple: either keep a separate petty cash box with a fixed amount, or record every payout from the drawer with a reason at the moment it happens.

The classic method is the imprest system: start with a fixed amount, spend against slips, then refill exactly what was spent. At any moment, cash plus slips should equal the fixed amount. Review the categories monthly, since small items like tea and fuel add up to large amounts over a year.

## In Nafaa

In Nafaa, cash taken out of an open till is recorded with a reason, and cash expenses come out of the open shift, so the drawer's expected cash stays correct. Shops can also move money between the drawer and a separate cash account.`,
    alsoKnownAs: ['petty expenses', 'chhote kharchay', 'imprest'],
    related: ['GLOSSARY_TERM:operating-expenses', 'GLOSSARY_TERM:galla', 'GLOSSARY_TERM:cash-over-short'],
    evidence: [EV.cashMove, EV.expenses, EV.money],
  },
  {
    slug: 'operating-expenses',
    term: 'Operating Expenses',
    definition: 'Operating expenses are the regular costs of running a business that are not part of the goods sold, such as rent, salaries, electricity and internet.',
    definitionRomanUrdu: 'Operating expenses karobar chalane ke rozmarra kharchay hain jo bechne wale saman me shamil nahi, jaise kiraya, tankhwah, bijli aur internet.',
    example: `A salon's monthly operating expenses: rent 120,000 rupees, staff salaries 260,000, electricity and generator 70,000, products for in-house use 35,000, internet and phone 8,000.`,
    body: `## How it works

Operating expenses (often called overheads) are what gross profit must cover before the owner earns anything. Some are fixed, such as rent and salaries; others move with sales, such as packing bags, delivery and card fees. Load-shedding adds a cost many shops forget to count: generator or UPS fuel and maintenance.

Record expenses by category and branch, every time, not from memory at month end. Then compare each category with sales. Recurring bills such as rent, internet and committee payments should be set up to remind you when they are due.

## In Nafaa

The Nafaa Expenses page records expenses with category, payment method, branch and staff, tracks bills that come back every month, compares this month with last, and takes cash expenses out of the open cash shift. The P&L takes them off gross profit.`,
    alsoKnownAs: ['opex', 'overheads', 'running costs', 'kharchay', 'expenses'],
    related: ['GLOSSARY_TERM:net-profit', 'GLOSSARY_TERM:petty-cash', 'GLOSSARY_TERM:break-even-point'],
    evidence: [EV.expenses, EV.pnl],
  },
  {
    slug: 'working-capital',
    term: 'Working Capital',
    definition: 'Working capital is the money tied up in running the business day to day: stock plus money owed by customers plus cash, minus what is owed to suppliers.',
    definitionRomanUrdu: 'Working capital woh paisa hai jo rozana karobar me laga hai: stock, gahakon ka udhaar aur cash, minus suppliers ka dena.',
    example: `A distributor holds 2.4 million rupees of stock, is owed 900,000 by shops and has 300,000 in cash, but owes suppliers 1.5 million. Its working capital is 2.1 million rupees.`,
    body: `## How it works

Working capital is why growing businesses often feel short of money. Every extra rupee of stock or udhaar must be paid for before it turns back into cash. Three levers free it up: hold less slow stock, collect udhaar faster, and get longer credit from suppliers. Each one returns cash without needing more sales.

The cash conversion cycle measures the gap in days: how long stock sits, plus how long customers take to pay, minus how long suppliers give. Shortening it by even a week can release more cash than a bank loan would provide.

## In Nafaa

Nafaa shows the parts of working capital in one place: stock value in the stock report, customer balances in the khata and directory, supplier balances in their ledgers, and what the shop owns and owes on the Shop accounts page.`,
    alsoKnownAs: ['operating capital', 'karobari sarmaya'],
    related: ['GLOSSARY_TERM:cash-flow', 'GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:inventory-turnover'],
    evidence: [EV.stockReport, EV.money, EV.supplierLedger, DIRECTORY],
  },
];
