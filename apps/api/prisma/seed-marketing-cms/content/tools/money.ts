/**
 * Money tools: udhaar (khata) ageing, zakat on business wealth and the
 * receipt maker.
 */

import { src, type ToolSpec } from './_tool';

const PUNJAB_ZAKAT = src(
  'Mathematics Grade 7, Financial Arithmetic: Zakat at 2.5%, nisab 7.5 tolas of gold or 52.5 tolas of silver',
  'https://www.elearn.gov.pk/onlinepdf/math/7math/chapter7/files/basic-html/page10.html',
  'Government of the Punjab (elearn.gov.pk)',
);
const WIKI_NISAB = src('Nisab: gold and silver standards', 'https://en.wikipedia.org/wiki/Nisab', 'Wikipedia');
const WIKI_TOLA = src('Tola (unit): 11.6638038 grams', 'https://en.wikipedia.org/wiki/Tola_(unit)', 'Wikipedia');

export const khataAgeing: ToolSpec = {
  slug: 'khata-ageing-calculator',
  toolKey: 'khata-ageing-calculator',
  kind: 'Udhaar ageing',
  title: 'Udhaar (Khata) Ageing Calculator',
  summary:
    'List what each customer owes and how long it has been unpaid, and see your udhaar split into age bands: under 7 days, 7 to 30, 30 to 90 and over 90 days. It shows how much is getting old, the average age of the money owed, and who to call first.',
  seoTitle: 'Udhaar (Khata) Ageing Calculator: Who to Collect From First',
  seoDescription: 'Free udhaar ageing calculator for shops: split customer khata balances into 0-7, 7-30, 30-90 and 90+ day bands, see the average age and who to call first.',
  focusKeyword: 'udhaar ageing',
  facts: [
    ['Bands', 'Under 7 days, 7-30, 30-90, 90+ days (the same bands as Nafaa\'s khata book)'],
    ['Average age', 'Sum of (amount × days) ÷ total owed'],
    ['Call first', 'Balances over 30 days, oldest first'],
    ['Privacy', 'Names and amounts stay in your browser'],
  ],
  romanUrdu: 'Har customer ka baqi udhaar aur kitne din purana hai likhein. Pata chal jayega ke kitna paisa purana ho raha hai, aur kis se pehle wasooli karni hai.',
  steps: [
    ['Add each customer who owes you', 'One line per customer: the balance from your khata register.'],
    ['Enter the days unpaid', 'Days since the oldest unpaid bill, or since the last payment if the customer pays in parts. A rough figure is fine.'],
    ['Read the bands', 'Each band shows the money, the number of customers and its share of the total. The headline tells you how much is over 30 days old.'],
    ['Call the list at the bottom', 'The **Call first** list shows balances over 30 days, oldest first. Start your WhatsApp reminders there.'],
  ],
  sections: [
    `## How it's calculated

Each balance goes into one band by its age in days: **under 7**, **7 to 30**, **30 to 90** and **90 or more**. The calculator adds the money and counts the customers in each band, and works out the **average age** of all the money owed, weighted by amount:

Average age = sum of (balance × days) ÷ total udhaar

Weighting by amount matters. Ten small balances a week old and one large balance three months old can give a low simple average, while most of the money is in fact stuck in the old balance.`,
    `## Worked example

A grocery store has five customers on khata:

| Customer | Owes | Days |
|---|---|---|
| Nasreen | 8,200 | 6 |
| Bilal Store | 12,600 | 14 |
| Aslam | 3,450 | 25 |
| Kashif | 2,750 | 48 |
| Rashid | 5,000 | 95 |

Total udhaar is **32,000 rupees**. Under 7 days: 8,200. 7 to 30 days: 16,050. 30 to 90 days: 2,750. Over 90 days: 5,000. So **7,750 rupees (24%) is over 30 days old**, and the weighted average age is about **29 days**. Rashid comes first on the call list, then Kashif.

Nafaa's [digital khata](/product/khata) keeps this split up to date by itself: the khata book shows the same four bands with the money and customers in each, sorts customers by oldest udhaar, and sends payment reminders on WhatsApp.`,
  ],
  callout: { tone: 'tip', title: 'Old udhaar is harder to collect', body: 'Set a credit limit per customer and follow up on fixed days. Balances that cross 30 days without a payment deserve a call, not another round of goods on credit.' },
  faqs: [
    { q: 'What does ageing mean in khata or udhaar?', a: 'Ageing means sorting the money customers owe by how long it has been unpaid. Instead of one total, you see how much is a few days old and how much has been waiting for months. Recent udhaar is normal trade credit; old udhaar is money at risk that needs follow-up. The age bands here match the ones Nafaa uses in its khata book.' },
    { q: 'Should I count days from the bill or from the last payment?', a: 'For a customer who clears each bill separately, count from the date of the oldest unpaid bill. For a running khata where the customer pays something now and then, days since the last payment is the more useful signal. Either way, be consistent across customers so the bands compare like with like.' },
    { q: 'How much old udhaar is too much?', a: 'It depends on your margin and cash needs, but watch two numbers: the share of udhaar over 30 days, and the total compared with a week of sales. If the old share keeps growing, or the udhaar is larger than the cash you need to restock, stop new credit for the oldest balances and collect before you give more.' },
  ],
  relations: ['PRODUCT:khata', 'GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:accounts-receivable', 'BLOG_POST:how-to-reduce-udhaar', 'TEMPLATE:khata-udhaar-register'],
  evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/khata/index.ts'],
  factNote: 'Plain arithmetic. Bands copied from the khata book (KhataBookPage.tsx AGING: under 7, 7-30, 30-90, 90+ days; sort "Purana udhaar pehle"). Reminders: WhatsApp reminder wizard on the khata book (KhataTools ReminderWizard). Stock value on any date: stock-report LedgerView.',
  sortOrder: 80,
};

export const zakat: ToolSpec = {
  slug: 'zakat-calculator',
  toolKey: 'zakat-calculator',
  kind: 'Zakat',
  title: 'Zakat Calculator for Business Stock',
  summary:
    'Estimate zakat on a shop or business: cash in the galla and bank, stock for sale, udhaar you expect to recover and gold, less debts due now, checked against the nisab. Choose silver or gold for the nisab and type the day\'s rate per tola; zakat is 2.5% of net wealth.',
  seoTitle: 'Zakat Calculator for Business Stock & Shop (Pakistan)',
  seoDescription: 'Free zakat calculator for shops in Pakistan: stock, cash, bank and receivables less debts, nisab on silver or gold at your rate per tola, 2.5% zakat.',
  focusKeyword: 'zakat calculator business',
  facts: [
    ['Rate', '2.5% of net zakatable wealth held for a lunar year'],
    ['Nisab', '52.5 tola silver or 7.5 tola gold, valued at the day\'s rate you enter'],
    ['Included', 'Cash, bank and wallets, stock for sale, recoverable udhaar, gold and silver'],
    ['Deducted', 'Supplier bills and other debts due now'],
  ],
  romanUrdu: 'Dukaan ki Zakat ka andaza lagayein: galla aur bank ka cash, bechne wala Stock aur wasool hone wala udhaar jorein, jo qarz abhi dena hai wo nikalein. Nisab chandi ya sone par, aaj ke rate se.',
  steps: [
    ['Pick your zakat date', 'Use the same date each year and take every value as on that day.'],
    ['Enter what the business owns', 'Cash in the galla and in hand, bank and JazzCash or Easypaisa balances, stock for sale, udhaar you expect to recover, and gold or silver.'],
    ['Enter what it owes now', 'Supplier bills due and other debts already due, such as rent or salaries.'],
    ['Choose the nisab metal and type the rate', 'Silver (52.5 tola) or gold (7.5 tola), with the day\'s rate per tola from your local sarafa market. The result shows the nisab, your net wealth and the zakat due.'],
  ],
  sections: [
    `## How it's calculated

1. **Zakatable assets** = cash + bank and wallet balances + stock for sale + recoverable receivables + gold and silver + other zakatable assets
2. **Net zakatable wealth** = zakatable assets − debts due now
3. **Nisab** = 52.5 tola × silver rate per tola, or 7.5 tola × gold rate per tola
4. If net wealth is at or above the nisab, **zakat = net wealth × 2.5%**

The 2.5% rate and the nisab of 7.5 tolas of gold or 52.5 tolas of silver are as given in the Punjab government's Grade 7 mathematics text (source below). One tola is 11.6638 grams. Because silver is far cheaper than gold, the silver nisab is much lower, and scholars differ on which to use; the calculator lets you choose.`,
    `## Worked example

On its zakat date a shop has 85,000 rupees in the galla, 240,000 in the bank and JazzCash, stock worth 1,600,000 and udhaar of 180,000 it expects to recover. It owes suppliers 420,000 and has 60,000 of rent and salaries due.

- Zakatable assets = **2,105,000 rupees**
- Debts due now = **480,000 rupees**
- Net zakatable wealth = **1,625,000 rupees**

Suppose the day's silver rate were 5,000 rupees a tola (an example only; use the real rate): nisab = 52.5 × 5,000 = 262,500 rupees. Net wealth is above it, so zakat = 1,625,000 × 2.5% = **40,625 rupees**.

The hardest number is usually the stock value. With stock and cost prices kept in [Nafaa](/product/inventory), the stock report gives you the stock value on any day, so the figure is counted, not guessed.`,
  ],
  callout: { tone: 'info', title: 'Ask your scholar', body: 'This is an estimate to help you prepare. Scholars differ on the nisab metal, on valuing stock at cost or sale value, on doubtful receivables and on debts. Confirm your calculation with a scholar you trust.' },
  sources: [PUNJAB_ZAKAT, WIKI_NISAB, WIKI_TOLA],
  faqs: [
    { q: 'Is zakat due on shop stock?', a: 'Stock held for sale is generally treated as zakatable trade goods, and is valued on your zakat date together with cash and receivables. Shop fittings, furniture, machines, vehicles used in the business and the building itself are usually not counted, because they are not for sale. Scholars differ on details such as valuing stock at cost or at sale price, so confirm with your scholar.' },
    { q: 'Should I use the silver or the gold nisab?', a: 'Both come from the classical sources, and scholars differ. The silver nisab is much lower in rupees, so more people pass it and more zakat is paid; many in Pakistan follow it. The gold nisab is higher. Choose the one your scholar advises; the calculator shows the nisab in rupees for either metal at the rate you type.' },
    { q: 'Does this calculator know today\'s gold or silver rate?', a: 'No. Rates change daily and differ between cities, so the tool never shows a rate of its own. Type the rate per tola from your local sarafa market or a trusted daily rate list on your zakat date. The nisab and the result update as you type, and nothing you enter is sent or saved.' },
  ],
  relations: ['TOOL:khata-ageing-calculator', 'GLOSSARY_TERM:stock-valuation', 'GLOSSARY_TERM:tola', 'BLOG_POST:ramadan-eid-retail-strategy', 'PRODUCT:inventory'],
  evidence: ['apps/site/src/components/islands/tools/facts.ts', 'apps/web/src/modules/inventory/stock-report/components/LedgerView.tsx'],
  factNote: 'Rate 2.5% and nisab 7.5 tola gold / 52.5 tola silver from the Punjab government Grade 7 maths text on elearn.gov.pk (curl 200, text read 26 Oct 2026); gold vs silver difference of opinion from Wikipedia "Nisab"; tola grams from Wikipedia "Tola (unit)". The 5,000 rupees silver rate is labelled as an example. Nafaa claim: stock value in the stock report (inventory/stock-report).',
  needsOwner: ['Religious content: owner may want a scholar to review the zakat page wording before publishing.'],
  sortOrder: 90,
};

export const receiptMaker: ToolSpec = {
  slug: 'receipt-maker',
  toolKey: 'receipt-maker',
  kind: 'Receipt',
  title: 'Receipt Maker',
  summary:
    'Make a shop receipt and print it on a 58 mm or 80 mm thermal printer, or any printer. Add your shop details once, then the items, discount, optional sales tax and payment method; for cash it works out the change. Free, no sign-up, and nothing leaves your browser.',
  seoTitle: 'Free Receipt Maker: Print Shop Bills on 58mm or 80mm',
  seoDescription: 'Free receipt maker for shops in Pakistan: add items, discount and tax, choose cash, card, JazzCash or Easypaisa, and print on a 58mm or 80mm thermal printer.',
  focusKeyword: 'receipt maker',
  facts: [
    ['Paper', '58 mm or 80 mm thermal roll, or plain paper'],
    ['On the receipt', 'Shop name, address, phone, bill number, date and time, items, discount, tax, payment, change'],
    ['Payment methods', 'Cash (with change), card, JazzCash, Easypaisa, bank transfer'],
    ['Saved', 'Shop details on this device only; items are not saved'],
  ],
  romanUrdu: 'Dukaan ki raseed banayein aur 58 ya 80 mm thermal printer par print karein. Items, Discount aur payment likhein, cash par wapsi ki raqam khud nikal aati hai.',
  steps: [
    ['Add your shop details once', 'Name, address, phone and the message at the bottom. They are remembered on this device for next time.'],
    ['Set the bill number and paper width', 'Pick 58 mm or 80 mm to match your printer roll. The preview changes to the same width.'],
    ['Add the items', 'Name, quantity and price for each. The subtotal and item count update as you type.'],
    ['Add discount, tax and payment, then print', 'For cash, type the amount received to print the change. Press **Print receipt**, choose your printer and set margins to none. **Next bill** clears the items and moves to the next number.'],
  ],
  sections: [
    `## How the total is worked out

- Subtotal = sum of (quantity × price)
- Total = subtotal − discount + sales tax on (subtotal − discount)
- Change = cash received − total

The date and time are taken from Pakistan time when you print. The receipt uses a fixed-width layout, so it reads the same on a thermal printer as on screen.`,
    `## Worked example

A customer buys 2 packs of tea at 390 rupees, a litre of cooking oil at 610 and 5 kg of rice at 420 a kilo.

- Subtotal = 780 + 610 + 2,100 = **3,490 rupees** for 8 items
- You round off with a 40-rupee discount: total **3,450 rupees**
- The customer pays with a 5,000 note: change **1,550 rupees**

Printing receipts by hand works for a few bills a day. A busy counter needs the bill made by scanning, stock reduced with each sale, and the receipt printed in one step. That is what the [Nafaa POS](/product/pos) does: it prints on 58 mm, 80 mm and A4, keeps working when the internet drops, and every bill feeds your stock, khata and day report.`,
  ],
  callout: { tone: 'info', title: 'Not a fiscal invoice', body: 'This is a plain receipt. Retailers who must issue FBR fiscal invoices need an integrated POS that prints the FBR invoice number and QR code.' },
  faqs: [
    { q: 'Can I print this on a thermal receipt printer?', a: 'Yes. Choose the paper width that matches your roll, 58 mm or 80 mm, press Print receipt and pick the thermal printer in the print dialog. Set margins to none and scale to 100% so the text is not shrunk. Most USB and Bluetooth thermal printers with a working driver print from the browser this way.' },
    { q: 'Is this receipt valid for tax purposes?', a: 'It is a plain sales receipt, fine as proof of purchase for customers. It is not an FBR fiscal invoice: retailers covered by FBR\'s point of sale rules must issue invoices from an integrated POS, with an FBR invoice number and QR code. If you only need to show sales tax on the bill, add the rate in the tax field.' },
    { q: 'Are my receipts saved anywhere?', a: 'No. The items and totals exist only on the page until you print or close it, and nothing is sent to a server. Only your shop name, address, phone and footer message are remembered in this browser, so you do not retype them. To keep a record of every sale, use a POS that stores each bill.' },
  ],
  relations: ['GLOSSARY_TERM:receipt', 'GLOSSARY_TERM:thermal-printer', 'BLOG_POST:choosing-a-pos-printer', 'PRODUCT:pos', 'TOOL:gst-calculator', 'TEMPLATE:simple-invoice-template'],
  evidence: ['apps/web/src/core/receipt/setup.ts', 'apps/web/src/core/receipt/print.ts', 'apps/web/src/core/lib/offline/offlineSales.ts'],
  factNote: 'Plain arithmetic. Nafaa claims: receipts on 58 mm, 80 mm and A4 (core/receipt/setup.ts paper "58" | "80" | "A4"), offline billing (core/lib/offline/offlineSales.ts).',
  sortOrder: 100,
};
