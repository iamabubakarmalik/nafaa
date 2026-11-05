/**
 * Glossary: words a business owner searches while choosing or running billing
 * and stock software (POS machine, ledger, SKU vs barcode, vendor, margin,
 * GST, NTN vs STRN and similar). Tax terms cite FBR and quote no rates.
 * Nafaa claims are limited to what the evidence files show.
 */

import { EV, SRC, type TermSpec } from './_term';
import type { EntryRef } from '../../lib/types';

interface Row {
  slug: string;
  term: string;
  urdu: string;
  /** Meta description tail after "meaning in Urdu (…): ". */
  hook: string;
  def: string;
  roman: string;
  example: string;
  body: string;
  also?: string[];
  rel?: EntryRef[];
  ev?: string[];
  src?: TermSpec['sources'];
}

const rows: Row[] = [
  {
    slug: 'billing-software', term: 'Billing Software', urdu: 'بلنگ سافٹ ویئر',
    hook: 'software that makes bills, takes payment, tracks stock and shows daily sales for a shop or business.',
    def: 'Billing software is a program that makes bills or invoices, records how each one was paid and updates stock and sales totals at the same time.',
    roman: 'Billing software woh program hai jo bill banata hai, payment likhta hai aur saath hi stock aur Sale ka hisaab update karta hai.',
    example: 'A pharmacy counter scans three medicines, applies a Discount, takes cash and prints the bill. The software has already reduced the stock and added the sale to the day report.',
    body: `## What to look for

A notebook and calculator can add a bill, but they cannot tell you what is left on the shelf or what you earned today. Billing software does both from the same entry. When you compare products, check four things: how fast a bill is made at a busy counter, whether it works when the internet drops, whether returns and Discounts are controlled by permission, and whether the day report matches the cash in the drawer.

Most Pakistani shops also need udhaar (credit) and printed or WhatsApp receipts, so look for a customer khata and a receipt design you can change.

## In Nafaa

Nafaa bills at the counter with scan or search, hold and recall, split payments and printed receipts, and the day report is built from those same bills. See [POS and billing software](/product/pos).`,
    also: ['billing app', 'bill banane wali app', 'invoicing software'],
    rel: ['GLOSSARY_TERM:pos', 'GLOSSARY_TERM:receipt'], ev: [EV.pos, EV.posHold, EV.posSplit, EV.receipt],
  },
  {
    slug: 'pos-machine', term: 'POS Machine', urdu: 'پی او ایس مشین',
    hook: 'the counter device or computer set up to make bills and take payment. Here is what it includes and what to buy.',
    def: 'A POS machine is the device at a shop counter, a computer, tablet or all-in-one terminal, that runs billing software and is usually connected to a receipt printer, barcode scanner and cash drawer.',
    roman: 'POS machine dukaan ke counter ka woh device hai jis par bill banta hai, aksar printer, scanner aur cash drawer ke saath.',
    example: 'A grocery store buys a small all-in-one terminal, a thermal printer and a scanner for the counter. The same billing app also runs on the owner\'s phone.',
    body: `## What you actually need

"POS machine" can mean the whole counter kit or only the terminal. The software matters more than the box: a basic computer or tablet runs good billing software well. Add a thermal receipt printer, a barcode scanner and a cash drawer if you bill more than a few customers an hour.

Separate from this, a card terminal is the device that reads bank cards. It is a different machine from the billing counter.

## In Nafaa

Nafaa runs in the browser and on Android, so you can start on a device you already own. Receipt printers, scanners and cash drawers are set up from the hardware settings. See [hardware setup](/services/hardware).`,
    also: ['POS terminal', 'POS system', 'billing machine'],
    rel: ['GLOSSARY_TERM:pos', 'GLOSSARY_TERM:thermal-printer', 'GLOSSARY_TERM:card-terminal'], ev: [EV.pos, EV.hardware, EV.hardwareSettings],
  },
  {
    slug: 'barcode-printer', term: 'Barcode Printer', urdu: 'بار کوڈ پرنٹر',
    hook: 'a label printer for product stickers. See how it differs from a receipt printer and when a shop needs one.',
    def: 'A barcode printer is a label printer that prints barcodes and prices on stickers you attach to products, different from a receipt printer that prints bills.',
    roman: 'Barcode printer woh printer hai jo products par lagane ke liye barcode aur price ke sticker chhapta hai. Ye bill wale printer se alag hai.',
    example: 'A garment shop receives 200 shirts with no barcodes. It prints one sticker per shirt with the article name, size and price, and sticks them on before display.',
    body: `## When you need one

If your products come with a printed barcode, you do not need a label printer. You need one when you sell loose items, repack goods, buy from suppliers who do not label, or want your own price on each item, which is common in garments, shoes and cosmetics.

Label printers use thermal sticker rolls, so check the roll size your printer takes before you design labels. A normal receipt printer cannot print on label stock in the same way.

## In Nafaa

Nafaa has a label designer for product barcodes with sizes you can choose, and it prints labels from the product list. See [barcodes and labels](/help/products-and-stock/barcodes-and-labels).`,
    also: ['label printer', 'sticker printer'],
    rel: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:thermal-printer', 'GLOSSARY_TERM:sku-vs-barcode'], ev: [EV.labels, EV.labelRender],
  },
  {
    slug: 'barcode-scanner', term: 'Barcode Scanner', urdu: 'بار کوڈ اسکینر',
    hook: 'the device that reads a barcode at the counter, its main types and how it works with billing software.',
    def: 'A barcode scanner is a handheld or counter device that reads a product barcode and sends the code to the billing software, which finds the product and adds it to the bill.',
    roman: 'Barcode scanner woh device hai jo product ka barcode padhta hai aur billing software me wohi product bill me daal deta hai.',
    example: 'A cashier passes a packet of biscuits over the scanner. The product name and price appear on the screen and the quantity goes up by one.',
    body: `## How it works

Most scanners behave like a keyboard: they "type" the barcode number into the billing screen and press Enter. That is why almost any USB or Bluetooth scanner works with billing software. The software looks up the number, so the product must already be saved with that barcode.

Choose a scanner by how you scan: a handheld for most shops, a fixed counter scanner for fast supermarket lines, and a 2D scanner if you need to read QR codes from a phone screen.

## In Nafaa

The Nafaa counter accepts a scanner at the search box, so scanning adds the item to the bill. Setup notes are in [hardware setup](/services/hardware).`,
    also: ['barcode reader', 'scanner gun'],
    rel: ['GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:pos-machine', 'GLOSSARY_TERM:ean-13'], ev: [EV.pos, EV.hardware],
  },
  {
    slug: 'stock-register', term: 'Stock Register', urdu: 'اسٹاک رجسٹر',
    hook: 'the record of every item bought, sold and left in hand, and how software replaces the paper one.',
    def: 'A stock register is the record of each item a business holds: what came in, what went out and what is left on hand.',
    roman: 'Stock register me likha jata hai ke har cheez kitni aayi, kitni gayi aur kitni bachi hai.',
    example: 'A hardware store notes 50 bags of cement received on Monday and 12 sold by Wednesday. The register shows 38 on hand, which the owner checks against the shelf each month.',
    body: `## Why it breaks down on paper

A paper register works until the counter is busy. Sales are not written, returns are forgotten and the balance drifts away from the shelf. The fix is to make every movement come from a document: a purchase adds stock, a bill removes it, a return adds it back, and a count corrects the difference with a reason.

## In Nafaa

Nafaa updates stock from purchases, bills, returns, transfers and adjustments, and keeps a movement history for each product. A stock count compares the shelf with the system and records the difference. See [inventory management](/product/inventory).`,
    also: ['stock book', 'godown register', 'inventory register'],
    rel: ['GLOSSARY_TERM:stock-take', 'GLOSSARY_TERM:stock-adjustment', 'TEMPLATE:stock-take-sheet'], ev: [EV.movements, EV.stockCount, EV.adjustments],
  },
  {
    slug: 'ledger', term: 'Ledger', urdu: 'لیجر',
    hook: 'the book that records every transaction by account. Learn how a ledger differs from a khata and a day book.',
    def: 'A ledger is a book or file that records transactions grouped by account, such as a customer, a supplier or an expense, with a running balance for each.',
    roman: 'Ledger woh bahi hai jisme har account ka alag hisaab likha jata hai, jaise customer, supplier ya Expense, aur har ek ka balance saath chalta hai.',
    example: 'A wholesaler keeps one ledger page per supplier. Each purchase adds to what is owed, each payment reduces it, and the last line shows the balance.',
    body: `## Ledger, khata and day book

A ledger is organised by account. A khata is a customer ledger for credit sales. A day book is organised by date and lists everything that happened in a day, which the ledger accounts then pick up. Supplier ledgers show what you owe, customer ledgers show what you are owed.

Keep the ledger balance and the physical records in agreement: every ledger entry should point to a bill, a purchase or a payment receipt.

## In Nafaa

Nafaa keeps a customer khata and a supplier ledger, each with a running balance, and a day book that lists the day's movements. See [digital khata](/product/khata) and [day book](/glossary/day-book).`,
    also: ['account book', 'bahi', 'general ledger'],
    rel: ['GLOSSARY_TERM:khata', 'GLOSSARY_TERM:day-book', 'GLOSSARY_TERM:accounts-payable'], ev: [EV.khata, EV.supplierLedger, EV.dayBook],
  },
  {
    slug: 'balance-sheet', term: 'Balance Sheet', urdu: 'بیلنس شیٹ',
    hook: 'a statement of what a business owns, owes and what is left for the owner. Learn how to read one in simple words.',
    def: 'A balance sheet is a statement showing, on one date, what a business owns (assets), what it owes (liabilities) and what is left for the owner (equity).',
    roman: 'Balance sheet ek tareekh par dikhati hai ke karobar ke paas kya hai, kis ka kitna dena hai aur malik ka hissa kitna bacha.',
    example: 'On 30 June a shop has stock worth 800,000 rupees, 100,000 in cash and 150,000 due from customers. It owes suppliers 300,000. The owner\'s share is the difference.',
    body: `## How to read it

Assets minus liabilities equals the owner's equity. For a shop, the main assets are cash, stock, money customers owe you and equipment. The main liabilities are supplier balances and loans. A profit and loss statement shows what happened over a period; the balance sheet is a photograph on one day.

Small shops often skip a full balance sheet, but the three numbers behind it are easy to track: stock value, receivables and payables.

## In Nafaa

Nafaa shows stock value, customer balances and supplier balances in its reports, which are the working numbers an accountant uses to build a balance sheet. See [business reports](/product/reports).`,
    also: ['statement of financial position'],
    rel: ['GLOSSARY_TERM:profit-and-loss', 'GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:accounts-payable'], ev: [EV.stockReport, EV.pnl, EV.khata],
  },
  {
    slug: 'invoice-vs-bill', term: 'Invoice vs Bill', urdu: 'انوائس اور بل',
    hook: 'the difference between an invoice and a bill, who issues each one, and when a shop should use which document.',
    def: 'An invoice is the document a seller gives a buyer asking for payment for goods or services, and the same document is a bill from the buyer\'s side.',
    roman: 'Seller jo kaghaz de kar paisa maangta hai usay invoice kehte hain, aur buyer ke liye wohi kaghaz bill hai.',
    example: 'A supplier sends a shop an invoice for 40 cartons. For the shop, the same paper is a purchase bill it must pay. At the counter, the shop gives its own customer a sale bill.',
    body: `## Same document, two sides

In everyday Pakistani speech "bill" is used for almost everything, including the receipt a customer gets at the counter. In accounting, the seller's document is an invoice, the buyer records it as a bill to pay, and a receipt proves payment was made. A sales tax invoice has extra required fields; see [sales tax invoice](/glossary/sales-tax-invoice).

## In Nafaa

Nafaa makes the sale bill at the counter, records supplier bills as purchases, and prints receipts from one design. See [receipt](/glossary/receipt).`,
    also: ['bill vs invoice', 'invoice meaning', 'bill meaning'],
    rel: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:sales-tax-invoice'], ev: [EV.receipt, EV.purchaseEditor],
  },
  {
    slug: 'gst', term: 'GST (General Sales Tax)', urdu: 'جی ایس ٹی',
    hook: 'the common name for sales tax in Pakistan, how it is charged on a bill and the FBR source to check.',
    def: 'GST, or General Sales Tax, is the common name in Pakistan for sales tax charged on the supply of goods and charged by registered businesses on their sales.',
    roman: 'GST ka matlab General Sales Tax hai, jo registered karobar apni Sale par bill me lagate hain aur FBR ya sooba ko jama karwate hain.',
    example: 'A registered shop sells an item and adds sales tax on the invoice. At month end it files a return, subtracting the tax it paid on its own purchases.',
    body: `## How it works

Federal sales tax on goods comes from the Sales Tax Act, 1990, which FBR administers. Provincial revenue authorities (PRA, SRB, KPRA) collect tax on many services. A registered business charges tax on its sales, can claim the tax it paid on business purchases (input tax), and pays the difference. Rates and exemptions change with each Finance Act, so this page quotes none; check FBR or a tax adviser. See [sales tax](/glossary/sales-tax) and [GST calculator](/tools/gst-calculator).

## In Nafaa

Nafaa can set tax on products and bills and offers optional FBR and provincial integration from its Tax page. See [FBR integration](/product/fbr).

## Official source

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149). Rates and rules change with Finance Acts; confirm the current position with FBR or a tax adviser.`,
    also: ['General Sales Tax', 'sales tax Pakistan'],
    rel: ['GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:input-tax', 'TOOL:gst-calculator'], ev: [EV.tax, EV.fbr], src: [SRC.fbrStBasics, SRC.fbrActs],
  },
  {
    slug: 'ntn-vs-strn', term: 'NTN vs STRN', urdu: 'این ٹی این اور ایس ٹی آر این',
    hook: 'NTN is for income tax and STRN is for sales tax. See the difference and the official FBR sources.',
    def: 'An NTN (National Tax Number) identifies a taxpayer for income tax with FBR, while an STRN (Sales Tax Registration Number) identifies a business registered for sales tax.',
    roman: 'NTN income tax ke liye taxpayer ki pehchan hai, aur STRN sales tax ke liye registered karobar ka number hai. Dono alag hain.',
    example: 'A shop owner has an NTN as a taxpayer. Only when the business registers for sales tax does it also get an STRN to print on its tax invoices.',
    body: `## The difference

One person or business can hold both numbers. The NTN is tied to income tax, filing and the Active Taxpayer List. The STRN is tied to sales tax registration and appears on sales tax invoices. Being on one list does not put you on the other. Whether you must register for sales tax depends on your business type and law at the time, so ask FBR or a tax adviser.

See the single entries for [NTN](/glossary/ntn) and [STRN](/glossary/strn).

## In Nafaa

You can store your business tax details in Nafaa settings so they appear on bills. See [FBR integration](/product/fbr).

## Official source

[FBR: Active Taxpayer List (Income Tax)](https://fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71167) and [FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149).`,
    also: ['NTN or STRN', 'difference between NTN and STRN'],
    rel: ['GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:strn', 'GLOSSARY_TERM:active-taxpayer-list'], ev: [EV.tax], src: [SRC.fbrAtl, SRC.fbrStBasics, SRC.iris],
  },
  {
    slug: 'reseller', term: 'Reseller', urdu: 'ری سیلر',
    hook: 'a person or shop that buys goods to sell again. See how resellers differ from retailers and how reseller pricing works.',
    def: 'A reseller is a person or business that buys products from a maker or wholesaler and sells them again, often without making the product themselves.',
    roman: 'Reseller woh hai jo maal kisi maker ya wholesaler se khareed kar aage bechta hai.',
    example: 'A reseller buys 100 phone covers at a wholesale price and sells them through a WhatsApp group and a market stall at a higher price.',
    body: `## How reselling works

A reseller earns the gap between the wholesale buying price and the selling price, so the numbers that matter are cost, margin and how quickly stock sells. Many suppliers give a lower price to resellers who buy in bulk. Resellers include shopkeepers, online sellers and people who sell on credit to a small circle.

Keep a price list per buyer type, and record who owes you what.

## In Nafaa

Nafaa lets a product carry separate prices for different customers, and the khata records credit sales. See [wholesale and distribution](/solutions/wholesale-distribution).`,
    also: ['re-seller', 'trader'],
    rel: ['GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:dropshipping', 'GLOSSARY_TERM:wholesale-vs-retail'], ev: [EV.priceStep, EV.khata],
  },
  {
    slug: 'franchise', term: 'Franchise', urdu: 'فرنچائز',
    hook: 'a business model where you use a brand and its method for a fee. Learn how a franchise works and what to track.',
    def: 'A franchise is an arrangement where a brand owner (the franchisor) lets another person (the franchisee) run an outlet under its name and system, usually for a fee or share of sales.',
    roman: 'Franchise me brand ka malik kisi doosre ko apne naam aur tareeqe se outlet chalane ki ijazat deta hai, aksar fees ya Sale ke hissay par.',
    example: 'A pizza brand lets a family open an outlet in Multan. The family pays an agreed fee and follows the brand\'s menu and rules.',
    body: `## What matters in the numbers

A franchisee needs its own clean records: sales, stock, expenses and what is owed to the franchisor, because the agreement may depend on those figures. A franchisor needs to see outlet sales and stock without waiting for a monthly sheet. Agreements differ, so read the contract carefully.

## In Nafaa

Nafaa can run several branches under one account with per-branch sales and stock, which helps owners of multiple outlets. See [multi-branch POS](/product/multi-shop).`,
    also: ['franchising', 'franchise business'],
    rel: ['GLOSSARY_TERM:multi-branch', 'PRODUCT:multi-shop'], ev: [EV.transfers, EV.stockReport],
  },
  {
    slug: 'wholesale-vs-retail', term: 'Wholesale vs Retail', urdu: 'ہول سیل اور ریٹیل',
    hook: 'how wholesale and retail selling differ in price, margin and quantity, and which one suits your shop.',
    def: 'Wholesale is selling goods in large quantities to businesses that resell them, while retail is selling single items or small quantities directly to the final customer.',
    roman: 'Wholesale me bari miqdar doosre dukandaron ko bechi jati hai, aur retail me chhoti miqdar seedha aakhri gahak ko.',
    example: 'A distributor sells a carton of 24 packs at a lower rate per pack to a shopkeeper. The shopkeeper sells single packs at the printed retail price.',
    body: `## Prices and margins

Wholesale has a lower price per unit and a smaller margin per unit, but more units and often credit terms. Retail has a higher price and margin per unit, but fewer units per sale. Many shops do both, so one product needs two prices and the software must pick the right one for the right customer. See [wholesale price](/glossary/wholesale-price) and [wholesale vs retail pricing](/blog/wholesale-vs-retail-pricing).

## In Nafaa

Nafaa products can carry retail and wholesale prices, and units and packs such as carton and piece. See [units and packs](/help/products-and-stock/units-and-packs).`,
    also: ['wholesale and retail', 'thok aur retail'],
    rel: ['GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:retail-margin', 'BLOG_POST:wholesale-vs-retail-pricing'], ev: [EV.priceStep, EV.units],
  },
  {
    slug: 'retail-margin', term: 'Retail Margin', urdu: 'ریٹیل مارجن',
    hook: 'the share of the selling price a shop keeps as profit before expenses. Learn the formula with a worked example.',
    def: 'Retail margin is the part of the selling price a shop keeps after paying for the goods, usually shown as a percentage of the selling price.',
    roman: 'Retail margin woh hissa hai jo dukaan Sale price me se maal ki Cost nikaal kar rakhti hai, aam taur par percentage me.',
    example: 'A shop buys a shirt for 1,200 rupees and sells it for 1,600. The margin is 400 rupees, which is 25 percent of the selling price.',
    body: `## The formula

Margin percentage = (selling price minus cost) divided by selling price. Markup uses cost as the base instead, so the same shirt has a 33 percent markup but a 25 percent margin. Use one and stay with it. Margin is before expenses such as rent, salaries and electricity; what is left after them is net profit. See [gross margin](/glossary/gross-margin) and [markup](/glossary/markup).

## In Nafaa

Nafaa shows price, cost and margin on each product card and profit by product in reports. Try the [profit margin calculator](/tools/profit-margin-calculator).`,
    also: ['shop margin', 'profit margin'],
    rel: ['GLOSSARY_TERM:gross-margin', 'GLOSSARY_TERM:markup', 'TOOL:profit-margin-calculator'], ev: [EV.variantCard, EV.profitReport],
  },
  {
    slug: 'bulk-purchase', term: 'Bulk Purchase', urdu: 'بلک خریداری',
    hook: 'buying goods in large quantities for a lower unit price. Learn when a bulk buy helps and when it ties up cash.',
    def: 'A bulk purchase is buying goods in large quantities, usually to get a lower price per unit from the supplier.',
    roman: 'Bulk purchase ka matlab hai bari miqdar me maal khareedna, aksar supplier se sasti rate par.',
    example: 'A kiryana store buys 20 cartons of cooking oil instead of 5 and gets a better rate. It also has to find shelf space and pay sooner.',
    body: `## Is it worth it?

A lower unit cost raises margin, but a bulk buy ties up cash, takes space and carries the risk of expiry or damage. Compare the saving with how long the stock will take to sell. Items that sell daily and do not expire are the safest to buy in bulk. Check cost on the purchase bill so your profit report uses the real cost.

## In Nafaa

Nafaa purchases record quantity, cost and discount per item, update stock and keep the supplier balance. See [purchase orders and GRN](/help/products-and-stock/purchase-orders-and-grn).`,
    also: ['bulk buying', 'bulk order', 'bulk'],
    rel: ['GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:landed-cost', 'GLOSSARY_TERM:minimum-order-quantity'], ev: [EV.purchaseEditor, EV.purchasesService],
  },
  {
    slug: 'inventory', term: 'Inventory', urdu: 'انوینٹری',
    hook: 'the goods a business holds for sale. See how inventory is counted, valued and kept accurate in a shop.',
    def: 'Inventory is the stock of goods, materials or parts a business holds to sell or use.',
    roman: 'Inventory woh saara maal hai jo karobar ke paas bechne ya istemal ke liye mojood hota hai.',
    example: 'A mobile accessories shop has 300 chargers, 150 covers and 80 earphones on its shelves and in its back room. That total is its inventory.',
    body: `## Counting and valuing

Inventory has a quantity and a value. Quantity comes from purchases minus sales plus returns and counts. Value is usually quantity times cost; see [stock valuation](/glossary/stock-valuation). Healthy inventory means enough of what sells and little of what does not; see [dead stock](/glossary/dead-stock) and [inventory turnover](/glossary/inventory-turnover).

## In Nafaa

Nafaa updates stock on every bill and purchase, flags low stock and shows stock value at cost. See [inventory management](/product/inventory).`,
    also: ['stock', 'stock in hand', 'maal'],
    rel: ['GLOSSARY_TERM:stock-valuation', 'GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:stock-take'], ev: [EV.stockReport, EV.lowStock, EV.stockCount],
  },
  {
    slug: 'procurement', term: 'Procurement', urdu: 'پروکیورمنٹ',
    hook: 'the process of finding suppliers and buying what a business needs. See the steps from request to payment.',
    def: 'Procurement is the process a business follows to choose suppliers, order goods or services and pay for them.',
    roman: 'Procurement woh tareeqa hai jisse karobar supplier chunta hai, maal ka order deta hai aur payment karta hai.',
    example: 'A restaurant asks three suppliers for rates, orders from the cheapest reliable one, checks the delivery against the order and pays on the due date.',
    body: `## The usual steps

Decide what is needed, ask suppliers for prices, place an order, receive and check the goods, then pay. Checking the delivery against the order before paying avoids short supply and price disputes. Record each purchase with its cost so margins stay correct. See [purchase order](/glossary/purchase-order) and [GRN](/glossary/grn).

## In Nafaa

Nafaa creates purchase orders, receives goods against them, updates cost and stock, and keeps a ledger for each supplier. See [purchasing](/product/purchasing).`,
    also: ['purchasing', 'buying process'],
    rel: ['GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:grn', 'GLOSSARY_TERM:vendor'], ev: [EV.purchaseEditor, EV.supplierLedger],
  },
  {
    slug: 'vendor', term: 'Vendor', urdu: 'وینڈر',
    hook: 'the supplier a business buys from. See how vendors differ from customers and how to track what you owe them.',
    def: 'A vendor is a person or company that sells goods or services to a business, also called a supplier.',
    roman: 'Vendor woh hai jo karobar ko maal ya service bechta hai. Isay supplier bhi kehte hain.',
    example: 'A cosmetics shop buys creams from two vendors. One gives 15 days credit, the other wants cash on delivery.',
    body: `## What to track per vendor

Keep the vendor's contact, the items they supply, the cost from each purchase and the balance you owe. Compare vendors by price, delivery time and how often goods arrive damaged or short. A good record makes it easy to ask for a better rate at the next order.

## In Nafaa

Nafaa stores suppliers with a ledger of purchases and payments, so you can see what you owe each one. See [purchasing](/product/purchasing) and [accounts payable](/glossary/accounts-payable).`,
    also: ['supplier', 'seller'],
    rel: ['GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:procurement', 'GLOSSARY_TERM:credit-terms'], ev: [EV.supplierLedger, EV.purchaseEditor],
  },
  {
    slug: 'supply-chain', term: 'Supply Chain', urdu: 'سپلائی چین',
    hook: 'the path goods take from maker to customer. See the main links and where a small business can find delays.',
    def: 'A supply chain is the series of steps and businesses that move a product from the maker, through wholesalers and shops, to the final customer.',
    roman: 'Supply chain woh silsila hai jisme maal maker se wholesaler, phir dukaan, aur phir gahak tak pohanchta hai.',
    example: 'Biscuits move from the factory to a distributor, then to a shopkeeper and finally to a child buying a packet.',
    body: `## Where small businesses feel it

Delays or price jumps at any link reach the shop: late delivery, a missing item, a higher cost. Track lead time per supplier, keep a little safety stock for fast sellers and know a second supplier for key items. See [lead time](/glossary/lead-time) and [safety stock](/glossary/safety-stock).

## In Nafaa

Nafaa tracks purchases, stock and low-stock alerts so you can see when to reorder. See [inventory management](/product/inventory).`,
    also: ['logistics chain'],
    rel: ['GLOSSARY_TERM:lead-time', 'GLOSSARY_TERM:safety-stock', 'GLOSSARY_TERM:vendor'], ev: [EV.lowStock, EV.reorder],
  },
  {
    slug: 'sku-vs-barcode', term: 'SKU vs Barcode', urdu: 'ایس کے یو اور بار کوڈ',
    hook: 'a SKU is your own item code and a barcode is the scannable code. See why shops use both.',
    def: 'A SKU is the internal code a business gives an item to track it, while a barcode is the printed pattern a scanner reads, which may carry a manufacturer\'s code or your own.',
    roman: 'SKU karobar ka apna code hai jo item track karne ke liye hota hai, aur barcode woh chhapa hua nishan hai jo scanner padhta hai.',
    example: 'A shop calls a blue medium T-shirt "TSH-BLU-M". That is the SKU. The sticker on it has a barcode that the scanner reads to find the SKU.',
    body: `## Why both exist

A SKU is for you and your team. A barcode is for the machine. One SKU can have several barcodes, for example a packet and a carton, and one product from a maker keeps the same barcode in every shop. Use a clear SKU pattern such as category, colour and size, and print barcodes when the product does not have one. See [SKU](/glossary/sku) and [barcode](/glossary/barcode).

## In Nafaa

Nafaa stores a SKU and barcode on each product and variant and prints labels. See [barcodes and labels](/help/products-and-stock/barcodes-and-labels).`,
    also: ['SKU and barcode difference'],
    rel: ['GLOSSARY_TERM:sku', 'GLOSSARY_TERM:barcode', 'GLOSSARY_TERM:product-variant'], ev: [EV.variantCard, EV.labels],
  },
  {
    slug: 'qr-code', term: 'QR Code', urdu: 'کیو آر کوڈ',
    hook: 'a square code a phone camera reads. Learn how shops use QR codes for payments, menus and product links.',
    def: 'A QR code is a square pattern of dots that a phone camera can read, used to open a link or carry information such as a payment request.',
    roman: 'QR code dots ka chokor nishan hai jisay phone ka camera padhta hai, aur us me link ya payment ki maloomat hoti hai.',
    example: 'A shop prints a payment QR at the counter. The customer scans it with a banking or wallet app and confirms the amount.',
    body: `## Uses in a shop

Common uses are payment QR (for example Raast QR and wallet QR), a digital menu, a link to your website or a product page and a bill verification code. A QR code is only a container: the payment still has to be confirmed in your bank or wallet account before you hand over goods. See [Raast QR](/glossary/raast-qr).

## In Nafaa

Nafaa can show a payment QR for the amount of the bill at the counter. See [payments in Nafaa](/product/payments).`,
    also: ['QR', 'quick response code'],
    rel: ['GLOSSARY_TERM:raast-qr', 'GLOSSARY_TERM:barcode', 'PRODUCT:payments'], ev: [EV.payQr, EV.emvQr],
  },
  {
    slug: 'card-terminal', term: 'Card Terminal', urdu: 'کارڈ ٹرمنل',
    hook: 'the device that reads debit and credit cards. See how it differs from a POS machine and what a shop should record.',
    def: 'A card terminal is the device that reads a debit or credit card and asks the bank to approve the payment.',
    roman: 'Card terminal woh machine hai jo debit ya credit card padhti hai aur bank se payment ki manzoori leti hai.',
    example: 'A customer taps a card on the terminal for 4,500 rupees. The terminal prints a slip and the shop records the bill as paid by card.',
    body: `## Card terminal and POS

The card terminal belongs to a bank or payment company, and the billing system belongs to you, so they are two separate things. Record on each bill that the payment was by card, so the card total in your day report matches the bank settlement. Keep the terminal slip for disputes. Fees and settlement time come from your bank, so ask them.

## In Nafaa

Nafaa records the payment method on each bill, including split payments across cash, card and wallet. See [payments in Nafaa](/product/payments).`,
    also: ['card machine', 'EDC machine', 'swipe machine'],
    rel: ['GLOSSARY_TERM:pos-machine', 'GLOSSARY_TERM:split-payment', 'PRODUCT:payments'], ev: [EV.posSplit, EV.pos],
  },
  {
    slug: 'depreciation', term: 'Depreciation', urdu: 'فرسودگی',
    hook: 'the way an asset loses value over time. See how depreciation is counted for shop equipment with an example.',
    def: 'Depreciation is the way the cost of an asset such as a machine or vehicle is spread over the years it is used, as it loses value.',
    roman: 'Depreciation ka matlab hai kisi cheez, jaise machine ya gari, ki Cost ko uske istemal ke saalon me taqseem karna jaise uski qeemat ghatti hai.',
    example: 'A bakery buys an oven for 600,000 rupees and expects it to last six years. Spread evenly, the yearly depreciation is 100,000 rupees.',
    body: `## Why it matters

Depreciation is a cost even though no cash leaves your pocket in that year. Counting it makes profit more honest: an oven that wears out is part of the cost of selling bread. It applies to equipment, furniture and vehicles, not to stock you sell. Tax rules on depreciation differ from the simple method here, so use an accountant for filing.

## In Nafaa

Nafaa tracks expenses and profit; depreciation is an accounting entry that your accountant can add from the expense and equipment records. See [business reports](/product/reports).`,
    also: ['asset wear', 'value loss'],
    rel: ['GLOSSARY_TERM:operating-expenses', 'GLOSSARY_TERM:net-profit', 'GLOSSARY_TERM:balance-sheet'], ev: [EV.expenses, EV.pnl],
  },
  {
    slug: 'e-commerce', term: 'E-commerce', urdu: 'ای کامرس',
    hook: 'buying and selling goods over the internet. See the main models used by Pakistani sellers and what stock tools they need.',
    def: 'E-commerce is buying and selling goods or services over the internet, through a website, an app, a marketplace or social media.',
    roman: 'E-commerce ka matlab hai internet par saman ya service khareedna aur bechna, website, app, marketplace ya social media ke zariye.',
    example: 'A shoe shop takes orders from its own website and a marketplace, and ships with cash on delivery.',
    body: `## Common models

Sellers use their own website, a marketplace, social media shops, or dropshipping. The common problem is stock: the same pair sold in the shop and online can be sold twice. A single stock count and a clear order status for every channel prevent that. Cash on delivery adds the work of collecting money from couriers. See [COD](/glossary/cod) and [dropshipping](/glossary/dropshipping).

## In Nafaa

Nafaa connects an online store to your shop stock and shows online orders with status and area. See [online store](/product/online-store).`,
    also: ['ecommerce', 'online selling', 'online business'],
    rel: ['GLOSSARY_TERM:cod', 'GLOSSARY_TERM:dropshipping', 'GLOSSARY_TERM:marketplace'], ev: [EV.channels, EV.cod],
  },
  {
    slug: 'safety-stock', term: 'Safety Stock', urdu: 'سیفٹی اسٹاک',
    hook: 'the extra stock kept so a shop does not run out while waiting for a delivery. Learn a simple way to set it.',
    def: 'Safety stock is the extra quantity of an item kept in hand so the shop does not run out if sales are higher than expected or a delivery is late.',
    roman: 'Safety stock woh extra maal hai jo is liye rakha jata hai ke delivery late ho ya Sale zyada ho to dukaan khali na ho.',
    example: 'A shop sells 10 packs a day and the supplier takes 4 days. It orders when 40 packs are left and keeps 10 more as safety stock, so the reorder point is 50.',
    body: `## A simple way to set it

Reorder level = average daily sales times lead time, plus safety stock. Keep more safety stock for fast-selling items and unreliable suppliers, and less for slow or expensive items. Review it each season, since sales change at Ramadan and Eid. See [reorder level](/glossary/reorder-level) and the [reorder level calculator](/tools/reorder-level-calculator).

## In Nafaa

Nafaa lets you set a reorder level per product and lists low-stock items with how much to order. See [low-stock alerts](/help/products-and-stock/low-stock-alerts).`,
    also: ['buffer stock', 'reserve stock'],
    rel: ['GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:lead-time', 'TOOL:reorder-level-calculator'], ev: [EV.lowStock, EV.reorder],
  },
  {
    slug: 'lead-time', term: 'Lead Time', urdu: 'لیڈ ٹائم',
    hook: 'the wait between placing an order and getting the goods. See why it sets when you must reorder.',
    def: 'Lead time is the number of days between placing an order with a supplier and receiving the goods.',
    roman: 'Lead time order dene se maal milne tak ke dinon ko kehte hain.',
    example: 'A shop orders shampoo on Monday and the supplier delivers on Saturday. The lead time is five days.',
    body: `## Why it matters

Lead time decides when to reorder. If an item sells 8 a day and lead time is 5 days, you need 40 in hand when you order, or you will run out. Lead time varies by supplier and season, so record the real dates from past purchases instead of the promised ones. See [safety stock](/glossary/safety-stock).

## In Nafaa

Nafaa stores purchase dates and shows low-stock items with what to order, so you can reorder before the shelf is empty. See [purchasing](/product/purchasing).`,
    also: ['delivery time', 'supply time'],
    rel: ['GLOSSARY_TERM:safety-stock', 'GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:purchase-order'], ev: [EV.purchaseEditor, EV.lowStock],
  },
  {
    slug: 'backorder', term: 'Backorder', urdu: 'بیک آرڈر',
    hook: 'an order accepted for an item that is out of stock, to be filled later. See when a shop can use backorders.',
    def: 'A backorder is a customer order accepted for an item that is out of stock now and will be delivered when new stock arrives.',
    roman: 'Backorder ka matlab hai woh order jo us cheez ka liya gaya jo abhi stock me nahi, aur naya maal aane par diya jayega.',
    example: 'A customer wants a laptop bag in black. It is out of stock, so the shop takes the order and a small advance and delivers when the supplier ships.',
    body: `## When it works

Backorders suit items with a short lead time and customers who are willing to wait. Tell the customer the expected date, take an advance if the item is costly and record the order so it is not forgotten. Do not promise a date the supplier has not confirmed.

## In Nafaa

Nafaa products show stock levels, and customers waiting for an item can be tracked using the advance and order features of your industry setup, for example shoe size requests. See [inventory management](/product/inventory).`,
    also: ['pending order', 'out-of-stock order'],
    rel: ['GLOSSARY_TERM:stock-out', 'GLOSSARY_TERM:lead-time', 'GLOSSARY_TERM:layaway'], ev: [EV.lowStock],
  },
  {
    slug: 'cash-register', term: 'Cash Register', urdu: 'کیش رجسٹر',
    hook: 'the till or drawer that holds a shop\'s cash and records sales. See how a register is opened and closed each day.',
    def: 'A cash register is the till or drawer at the counter where cash is kept, together with the daily record of money in and out.',
    roman: 'Cash register counter ka woh galla hai jahan cash rakha jata hai, aur roz ka cash aane jaane ka record.',
    example: 'A cashier opens the register with 5,000 rupees in notes. At night the system expects 38,000. The cashier counts 37,800, so the register is short by 200.',
    body: `## Opening and closing

Open the register with a counted float, record cash in and out during the day, then count and compare with the expected amount at closing. The difference is cash over or short. Doing this every day by the same person and with a signed record catches mistakes early. See [opening float](/glossary/opening-float) and [cash over/short](/glossary/cash-over-short).

## In Nafaa

Nafaa opens a shift with a counted float, records cash movements, counts notes by denomination at close and shows the difference. See [cash closing](/help/reports-and-cash/cash-closing).`,
    also: ['till', 'galla', 'cash drawer'],
    rel: ['GLOSSARY_TERM:opening-float', 'GLOSSARY_TERM:cash-over-short', 'GLOSSARY_TERM:galla'], ev: [EV.cashRegister, EV.openShift, EV.closeShift, EV.denominations],
  },
  {
    slug: 'credit-terms', term: 'Credit Terms', urdu: 'کریڈٹ ٹرمز',
    hook: 'the days a supplier or shop allows before payment is due. See how credit terms affect cash and how to record them.',
    def: 'Credit terms are the conditions on which goods are sold on credit, mainly the number of days allowed before payment is due and any limit or discount for early payment.',
    roman: 'Credit terms woh shartein hain jin par udhaar maal diya jata hai, jaise kitne din me paisa dena hai aur limit kitni hai.',
    example: 'A distributor gives a shop 30 days to pay and a small discount for paying in 10. The shop pays on day 9 to take the discount.',
    body: `## Both directions

Suppliers give you credit terms and you give them to customers. Longer terms to customers delay your cash, while longer terms from suppliers help it. Set a limit and a due date for each credit customer and follow up on the due date. See [accounts receivable](/glossary/accounts-receivable) and [accounts payable](/glossary/accounts-payable).

## In Nafaa

Nafaa customers can have a credit limit, and the khata shows balances by age with WhatsApp reminders. See [credit limit](/help/khata-and-customers/credit-limit).`,
    also: ['payment terms', 'credit days'],
    rel: ['GLOSSARY_TERM:accounts-receivable', 'GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:udhaar'], ev: [EV.khata, EV.customerForm],
  },
  {
    slug: 'markdown', term: 'Markdown (Price)', urdu: 'مارک ڈاؤن',
    hook: 'a lasting cut in an item\'s price to sell it faster, and how a markdown differs from a discount.',
    def: 'A markdown is a lasting reduction in the selling price of an item, usually to clear slow or old stock, unlike a discount, which is applied to a particular sale.',
    roman: 'Markdown ka matlab hai kisi item ki Sale price hamesha ke liye kam kar dena, aksar purana ya na bikne wala maal nikalne ke liye.',
    example: 'A garment shop reduces last season\'s kurtas from 3,000 rupees to 2,200 rupees on the price tag. Every customer pays the new price.',
    body: `## Markdown or discount?

A discount is given at the counter on a specific bill and can depend on the customer. A markdown changes the price itself. Use a markdown for stock that is not moving, but check that the new price still covers cost. See [discount](/glossary/discount) and [dead stock](/glossary/dead-stock).

## In Nafaa

Nafaa lets you change a product price, and gives Discounts at the counter with permission rules. See [discounts at the counter](/help/pos-counter/discounts-at-the-counter).`,
    also: ['price reduction', 'sale price cut'],
    rel: ['GLOSSARY_TERM:discount', 'GLOSSARY_TERM:dead-stock', 'GLOSSARY_TERM:mrp'], ev: [EV.discounts, EV.priceStep],
  },
  {
    slug: 'overhead', term: 'Overhead', urdu: 'اوور ہیڈ',
    hook: 'the running costs of a business that are not tied to one sale, such as rent and electricity. See how to count overhead.',
    def: 'Overhead is the ongoing cost of running a business that is not tied to making or selling a single item, such as rent, electricity, salaries and internet.',
    roman: 'Overhead karobar chalane ke woh Expense hain jo kisi ek item se nahi jurte, jaise kiraya, bijli, tankhwah aur internet.',
    example: 'A shop pays 60,000 rupees rent, 25,000 electricity and 90,000 salaries each month. Those 175,000 rupees are its overhead, whether it sells much or little.',
    body: `## Why track it

Gross profit must cover overhead before there is any net profit. To price correctly, know your monthly overhead and how many sales you need to cover it; see [break-even point](/glossary/break-even-point). Record each expense under a clear head so you can see which ones grow.

## In Nafaa

Nafaa records expenses by category and shows them in the profit and loss report. See [expenses and reports](/product/reports).`,
    also: ['running costs', 'fixed expenses', 'overheads'],
    rel: ['GLOSSARY_TERM:operating-expenses', 'GLOSSARY_TERM:break-even-point', 'GLOSSARY_TERM:net-profit'], ev: [EV.expenses, EV.pnl],
  },
  {
    slug: 'fixed-cost', term: 'Fixed Cost', urdu: 'فکسڈ کاسٹ',
    hook: 'a cost that stays the same however much you sell, like rent. See how fixed costs differ from variable costs.',
    def: 'A fixed cost is an expense that stays about the same each month whatever the amount sold, such as shop rent or a salaried employee.',
    roman: 'Fixed cost woh Expense hai jo Sale kam ho ya zyada, har mahine taqreeban ek jaisa rehta hai, jaise kiraya ya tankhwah.',
    example: 'A bakery pays 80,000 rupees rent every month. It is the same in a slow week or in Eid week.',
    body: `## Why it matters

Fixed costs set the minimum you must earn each month. The more fixed costs you have, the more sales you need to break even; see [break-even point](/glossary/break-even-point). Compare with [variable cost](/glossary/variable-cost), which moves with sales.

## In Nafaa

Nafaa lets you record recurring expenses by category and read them against profit in reports. See [business reports](/product/reports).`,
    also: ['fixed expense', 'monthly cost'],
    rel: ['GLOSSARY_TERM:variable-cost', 'GLOSSARY_TERM:overhead', 'TOOL:break-even-calculator'], ev: [EV.expenses],
  },
  {
    slug: 'variable-cost', term: 'Variable Cost', urdu: 'ویری ایبل کاسٹ',
    hook: 'a cost that rises and falls with sales, like the goods you buy to sell. See how it differs from fixed cost.',
    def: 'A variable cost is an expense that rises and falls with the amount sold or produced, such as the cost of goods, packaging or delivery.',
    roman: 'Variable cost woh Expense hai jo Sale ke saath badhta aur ghatta hai, jaise maal ki Cost, packing ya delivery.',
    example: 'A bakery uses flour, sugar and boxes for each cake. If it bakes twice as many cakes, those costs roughly double.',
    body: `## Using it in pricing

Selling price minus variable cost is the contribution each sale makes toward your fixed costs. If the price barely covers variable cost, no volume will save the business. Track the cost of each item so the margin is real. See [fixed cost](/glossary/fixed-cost) and [COGS](/glossary/cogs).

## In Nafaa

Nafaa stores a cost for each product and shows profit by item. Restaurants and bakeries can also use recipe costing. See [reports](/product/reports).`,
    also: ['direct cost', 'cost per unit'],
    rel: ['GLOSSARY_TERM:fixed-cost', 'GLOSSARY_TERM:cogs', 'GLOSSARY_TERM:recipe-costing'], ev: [EV.profitReport, EV.recipes],
  },
  {
    slug: 'stock-out', term: 'Stock-out', urdu: 'اسٹاک آؤٹ',
    hook: 'when an item is sold out and customers ask for it. See what a stock-out costs a shop and how to avoid one.',
    def: 'A stock-out is when an item a customer wants is not available because the shop has sold all of it.',
    roman: 'Stock-out ka matlab hai jab gahak ko jo cheez chahiye woh dukaan me khatam ho chuki ho.',
    example: 'A pharmacy runs out of a common cough syrup on a Friday. Customers go to the next shop and some do not come back.',
    body: `## The cost of running out

A stock-out loses the sale and sometimes the customer. It usually comes from a late reorder or a wrong estimate of sales. Set a reorder level for fast sellers, keep a little safety stock and review the low-stock list daily. Keep a note of items customers ask for that you do not have. See [safety stock](/glossary/safety-stock) and [reorder level](/glossary/reorder-level).

## In Nafaa

Nafaa lists low-stock items and what to reorder, and some industry setups track customer requests for out-of-stock items. See [low-stock alerts](/help/products-and-stock/low-stock-alerts).`,
    also: ['out of stock', 'stockout'],
    rel: ['GLOSSARY_TERM:reorder-level', 'GLOSSARY_TERM:safety-stock', 'GLOSSARY_TERM:backorder'], ev: [EV.lowStock, EV.reorder],
  },
  {
    slug: 'saas', term: 'SaaS (Software as a Service)', urdu: 'سافٹ ویئر ایز اے سروس',
    hook: 'software you use online and pay for monthly, not buy once, and what that means for a shop.',
    def: 'SaaS, or Software as a Service, is software you use over the internet and pay for on a monthly or yearly plan, instead of buying and installing it once.',
    roman: 'SaaS wohi software hai jo internet par chalta hai aur jis ka mahana ya salana fees diya jata hai, ek baar khareed kar install nahi hota.',
    example: 'A shop owner signs up for a billing app, pays a monthly fee and opens it on any device. The company keeps it updated.',
    body: `## What it changes

You do not buy a licence or a server. Updates, backups and fixes are the provider's job, and you can use the app from a computer, tablet or phone. In return you pay on a plan, so compare the monthly cost with what you get and ask what happens to your data if you stop. See [cloud POS](/glossary/cloud-pos).

## In Nafaa

Nafaa is subscription software with a 7-day free trial. See [pricing](/pricing).`,
    also: ['cloud software', 'subscription software'],
    rel: ['GLOSSARY_TERM:cloud-pos', 'GLOSSARY_TERM:offline-pos', 'PAGE:pricing'], ev: [EV.offline],
  },
  {
    slug: 'purchase-bill', term: 'Purchase Bill', urdu: 'پرچیز بل',
    hook: 'the bill a supplier gives you for goods you bought. See what to record and why it sets your cost price.',
    def: 'A purchase bill is the document a supplier gives a business for goods it has bought, showing the items, quantities, prices and amount due.',
    roman: 'Purchase bill woh bill hai jo supplier maal dene par deta hai, jisme items, miqdar, rate aur dena wali raqam likhi hoti hai.',
    example: 'A shop receives 10 cartons with a bill of 85,000 rupees. It enters the items and cost, and the supplier\'s balance goes up by 85,000.',
    body: `## What to record

Enter every item with its quantity and cost, plus any freight or discount, so stock and the cost price are right. Compare the bill with the goods received before paying. If you pay in parts, record each payment against the bill. See [landed cost](/glossary/landed-cost) and [GRN](/glossary/grn).

## In Nafaa

Nafaa purchases record items, cost, discount and payment, update stock and add to the supplier ledger. See [purchasing](/product/purchasing).`,
    also: ['supplier bill', 'purchase invoice'],
    rel: ['GLOSSARY_TERM:invoice-vs-bill', 'GLOSSARY_TERM:grn', 'GLOSSARY_TERM:landed-cost'], ev: [EV.purchaseEditor, EV.purchasesService],
  },
  {
    slug: 'credit-sale', term: 'Credit Sale', urdu: 'کریڈٹ سیل',
    hook: 'a sale where the customer pays later. See how credit sales differ from cash sales and how to record them safely.',
    def: 'A credit sale is a sale where the customer takes the goods now and pays later, so the amount is recorded as money owed to the shop.',
    roman: 'Credit sale ka matlab hai gahak maal abhi le aur paise baad me de, aur woh raqam dukaan ke liye udhaar me likhi jaye.',
    example: 'A contractor takes materials worth 30,000 rupees on credit. The shop records it against his name with a due date and a limit.',
    body: `## Keep it safe

A credit sale is a profit only when the money comes back. Set a limit per customer, write the due date and record every payment. Check old balances before giving more credit. See [udhaar](/glossary/udhaar), [khata](/glossary/khata) and [cash vs credit sales](/blog/cash-vs-credit-sales).

## In Nafaa

Nafaa posts an unpaid bill to the customer's khata, shows balances by age and sends WhatsApp reminders. See [digital khata](/product/khata).`,
    also: ['sale on credit', 'udhaar sale'],
    rel: ['GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:credit-terms'], ev: [EV.khata],
  },
  {
    slug: 'cash-memo', term: 'Cash Memo', urdu: 'کیش میمو',
    hook: 'the simple bill given when a customer pays cash. See what a cash memo should show and how it differs from an invoice.',
    def: 'A cash memo is a simple bill given to a customer who pays in cash at the time of sale, showing the items, prices and total.',
    roman: 'Cash memo woh seedha sa bill hai jo cash payment par diya jata hai, jisme items, rate aur total likha hota hai.',
    example: 'A grocer gives a cash memo for three items totalling 1,350 rupees. The customer pays and takes it along.',
    body: `## What it should show

Shop name and phone, date, bill number, items with quantity and price, total and how it was paid. A numbered bill helps with returns and with your own records; handwritten bills often skip numbers or get lost. A tax invoice needs more fields; see [invoice vs bill](/glossary/invoice-vs-bill).

## In Nafaa

Nafaa prints a numbered receipt for every bill, with your shop details and a Nafaa line. See [receipts and printers](/help/pos-counter/receipts-and-printers).`,
    also: ['cash bill', 'cash receipt'],
    rel: ['GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:invoice-vs-bill', 'GLOSSARY_TERM:invoice'], ev: [EV.receipt],
  },
  {
    slug: 'price-list', term: 'Price List', urdu: 'پرائس لسٹ',
    hook: 'the list of items with their selling prices. See how shops keep retail, wholesale and pack prices in one list.',
    def: 'A price list is a list of products with their selling prices, often with separate columns for retail, wholesale and pack prices.',
    roman: 'Price list products ke bechne ke rate ki list hai, aksar retail, wholesale aur pack rate ke alag columns ke saath.',
    example: 'A distributor sends shopkeepers a price list with the carton price and the per-pack price for each item.',
    body: `## Keeping it current

Prices change with supplier costs, so a price list needs a date and one owner. Update the list in one place and let billing read from it, instead of editing shelf tags and notebooks separately. Our [price list template](/templates/price-list-template) gives a starting layout.

## In Nafaa

Nafaa stores retail and wholesale prices on each product, and you can import or bulk edit them from a sheet. See [bulk edit products](/help/products-and-stock/bulk-edit-products).`,
    also: ['rate list', 'price sheet'],
    rel: ['GLOSSARY_TERM:wholesale-price', 'GLOSSARY_TERM:mrp', 'TEMPLATE:price-list-template'], ev: [EV.priceStep, EV.productImport],
  },
  {
    slug: 'minimum-order-quantity', term: 'MOQ (Minimum Order Quantity)', urdu: 'کم از کم آرڈر مقدار',
    hook: 'the smallest amount a supplier sells in one order, and how it affects price, cash and storage.',
    def: 'MOQ, or minimum order quantity, is the smallest amount of an item that a supplier is willing to sell in one order.',
    roman: 'MOQ woh kam se kam miqdar hai jo supplier ek order me dene ko tayyar hota hai.',
    example: 'A supplier sells phone covers only in packs of 100. A shop that needs 30 must buy 100 or find another supplier.',
    body: `## How to deal with it

A high MOQ lowers the unit price but locks up cash and space. Ask whether the supplier mixes items to reach the minimum, share an order with another shop, or check a nearby wholesaler. Record the MOQ with the supplier or product so your reorder suggestions respect it. See [bulk purchase](/glossary/bulk-purchase).

## In Nafaa

Nafaa lists what to order from low-stock items and lets you create purchase orders with your chosen quantity. See [purchase orders](/help/products-and-stock/purchase-orders-and-grn).`,
    also: ['minimum order', 'minimum quantity'],
    rel: ['GLOSSARY_TERM:bulk-purchase', 'GLOSSARY_TERM:purchase-order', 'GLOSSARY_TERM:vendor'], ev: [EV.reorder, EV.purchaseEditor],
  },
];

export const softwareBusinessTerms: TermSpec[] = rows.map((r) => {
  const seoDescription = `${r.term} meaning in Urdu (${r.urdu}): ${r.hook}`;
  return {
    slug: r.slug,
    term: r.term,
    definition: r.def,
    definitionRomanUrdu: r.roman,
    seoDescription,
    example: r.example,
    body: r.body,
    alsoKnownAs: r.also,
    related: r.rel,
    evidence: r.ev,
    ...(r.src ? { sources: r.src } : {}),
  };
});
