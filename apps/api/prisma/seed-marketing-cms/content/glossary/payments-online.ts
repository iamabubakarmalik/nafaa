/**
 * Glossary: getting paid (wallets, Raast, bank transfers, split tender,
 * installments, trade-ins) and selling online (COD, returns, disputes,
 * gateways, marketplaces).
 */

import { EV, SRC, type TermSpec } from './_term';

const PAY_QR_PAGE = 'apps/web/src/core/payments/PayQrPage.tsx';
const PAYMENT_LINKS = 'apps/api/src/integrations/online-orders/payment-links.service.ts';

export const paymentTerms: TermSpec[] = [
  {
    slug: 'raast',
    seoDescription: 'Raast is the State Bank of Pakistan\'s instant payment system for real-time transfers between bank and wallet accounts using a Raast ID.',
    imported: true,
    term: 'Raast',
    definition: "Raast is the State Bank of Pakistan's instant payment system for real-time transfers between bank and wallet accounts, using a Raast ID such as a mobile number.",
    definitionRomanUrdu: 'Raast State Bank ka instant payment system hai jis se bank aur wallet accounts me foran paise jaate hain, mobile number jaisi Raast ID se.',
    example: `A customer pays a furniture shop 35,000 rupees from her bank app to the shop's Raast ID, which is the owner's registered mobile number. The money arrives in seconds and the shop sees the sender's name before handing over the goods.`,
    body: `## How it works

Raast connects banks and many wallets on one national system run by the State Bank of Pakistan. Each account holder can link a Raast ID, usually their mobile number, to one account, so payers do not need a long IBAN. Payments settle in real time, day and night.

For shops, Raast works for customer payments (person to merchant) as well as supplier payments. Customers can pay by entering the Raast ID or by scanning a QR code. Always confirm a payment in your own bank app before handing over goods, since screenshots can be faked.

## In Nafaa

A shop can save its Raast or bank QR in Nafaa, print it on bills with the amount included where the QR supports it, and show it on the customer display. The payment is recorded on the bill by method, and Shop accounts tracks bank and wallet balances.

## Official source

[State Bank of Pakistan: Raast](https://www.sbp.org.pk/dfs/Raast.html).`,
    alsoKnownAs: ['Raast ID', 'SBP Raast', 'Raast payment'],
    related: ['GLOSSARY_TERM:raast-qr', 'GLOSSARY_TERM:ibft', 'GLOSSARY_TERM:jazzcash', 'GLOSSARY_TERM:easypaisa', 'PRODUCT:payments'],
    evidence: [EV.payQr, EV.emvQr, EV.money],
    sources: [SRC.raast],
    dropped: ['"Free" (fees depend on the transfer type; not cited).'],
  },
  {
    slug: 'raast-qr',
    term: 'Raast QR (Merchant QR)',
    definition: 'A merchant QR is a code displayed at the counter or printed on the bill that customers scan with a banking or wallet app to pay the shop directly.',
    definitionRomanUrdu: 'Merchant QR woh code hai jo counter par laga ya bill par chhapa hota hai; gahak bank ya wallet app se scan kar ke seedha dukaan ko payment karta hai.',
    example: `A bakery prints its QR on every bill with the bill amount inside it. The customer scans, sees 1,840 rupees already filled in, confirms, and the cashier checks the alert on the shop's phone.`,
    body: `## How it works

Pakistani merchant QRs follow the EMV QR standard used worldwide. A static QR holds only the shop's account; the customer types the amount, which causes mistakes. A dynamic QR also holds the exact bill amount, so the customer only confirms. Banks, JazzCash and Easypaisa each offer merchant QRs, and many apps can pay QRs from other providers through Raast.

QR payments avoid the change problem, reduce cash in the galla and leave a digital record. The risk is fake confirmation screens, so the cashier should check the shop's own alert or app before closing the bill.

## In Nafaa

Nafaa stores the shop's Raast or bank, JazzCash and Easypaisa merchant QRs. Each can put the bill amount into the QR, be printed on bills and be shown on the customer display at payment time.`,
    alsoKnownAs: ['merchant QR', 'payment QR', 'QR code payment', 'Raast P2M'],
    related: ['GLOSSARY_TERM:raast', 'GLOSSARY_TERM:customer-display', 'GLOSSARY_TERM:jazzcash', 'GLOSSARY_TERM:easypaisa'],
    evidence: [EV.payQr, EV.emvQr, PAY_QR_PAGE, 'apps/web/src/core/hardware/CustomerDisplayPage.tsx'],
  },
  {
    slug: 'jazzcash',
    term: 'JazzCash',
    definition: 'JazzCash is a mobile wallet and branchless banking service in Pakistan, used to send and receive money, pay bills and pay shops by number or QR code.',
    definitionRomanUrdu: 'JazzCash Pakistan ka mobile wallet hai jis se paise bheje aur liye jaate hain, bill diye jaate hain aur dukaan ko number ya QR se payment hoti hai.',
    example: `A customer at a mobile shop pays 12,500 rupees from her JazzCash wallet by scanning the shop's QR. The bill is saved as "JazzCash", and at closing that amount is counted in the wallet, not in the galla.`,
    body: `## How it works

JazzCash and other wallets let customers without bank accounts pay digitally, and many customers prefer paying from their phone over carrying cash. For a shop, the important part is recording: every wallet payment must be saved on the bill with the right method. Otherwise the drawer looks over or short, and the wallet balance never matches sales.

Shops can receive payments on a personal wallet number or a merchant account with a QR. A merchant account keeps business money separate from personal transfers, which makes reconciliation much easier.

## In Nafaa

The Nafaa counter records JazzCash as its own payment method, including as one part of a split payment. A shop's JazzCash merchant QR can be printed on bills, and Shop accounts shows money in and out of the JazzCash account alongside cash and bank.`,
    alsoKnownAs: ['Jazz Cash', 'mobile wallet'],
    related: ['GLOSSARY_TERM:easypaisa', 'GLOSSARY_TERM:raast-qr', 'GLOSSARY_TERM:split-payment'],
    evidence: [EV.payQr, EV.money, EV.posSplit],
  },
  {
    slug: 'easypaisa',
    seoDescription: 'Easypaisa is a Pakistani mobile wallet and digital bank used to send money, pay bills and pay shops by account number or QR code.',
    term: 'Easypaisa',
    definition: 'Easypaisa is a mobile wallet and digital banking service in Pakistan, used to send and receive money, pay bills and pay merchants by account number or QR code.',
    definitionRomanUrdu: 'Easypaisa Pakistan ka mobile wallet aur digital banking service hai, jis se paise bheje aur liye jaate hain, bill diye jaate hain aur dukaan ko QR se payment hoti hai.',
    example: `A grocery store receives 40 Easypaisa payments on a Saturday. At closing, the owner checks the Easypaisa total in the app against the Easypaisa total on the day's bills; both show 86,300 rupees.`,
    body: `## How it works

Easypaisa works much like other wallets: customers pay by number, by QR or through Raast from their bank app. For shops, the same discipline applies to every digital method: record the method on the bill, check receipts in the shop's own app rather than on the customer's screen, and reconcile the total daily.

Wallet money can also pay suppliers and bills, so keep track of what goes out of the wallet as well as what comes in. Otherwise the wallet balance becomes a second, unrecorded galla.

## In Nafaa

The Nafaa counter records Easypaisa as its own payment method and in split payments, the shop's Easypaisa merchant QR can be printed on bills, and Shop accounts tracks the Easypaisa account's money in and out with a ledger of every movement.`,
    alsoKnownAs: ['Easy Paisa', 'mobile wallet'],
    related: ['GLOSSARY_TERM:jazzcash', 'GLOSSARY_TERM:raast-qr', 'GLOSSARY_TERM:split-payment'],
    evidence: [EV.payQr, EV.money, EV.posSplit],
  },
  {
    slug: 'ibft',
    term: 'IBFT (Interbank Funds Transfer)',
    definition: 'IBFT is an instant transfer of money from an account at one bank to an account at another bank in Pakistan, using the account number or IBAN.',
    definitionRomanUrdu: 'IBFT ek bank ke account se doosre bank ke account me foran paise bhejna hai, account number ya IBAN ke zariye.',
    example: `A wholesaler receives 210,000 rupees from a retailer by IBFT. The retailer sends a screenshot, but the wholesaler waits until the amount shows in its own bank app, then records the payment against the retailer's khata.`,
    body: `## How it works

IBFT runs through Pakistan's interbank switch networks and arrives within seconds for most banks, at any time of day. It is widely used for supplier payments, wholesale trade and large retail purchases. Raast is the newer State Bank system that also moves money instantly between banks and wallets, using a Raast ID instead of the full account number.

For shops, the main risk with any transfer is fake or edited screenshots. Confirm in the shop's own bank app or SMS alert, and record the sender's reference with the payment, so it can be traced later if there is a dispute.

## In Nafaa

Nafaa records bank transfers as their own payment method on bills, on khata payments and on supplier payments, and Shop accounts shows each bank account's balance and movements.`,
    alsoKnownAs: ['interbank funds transfer', 'bank transfer', 'online transfer', 'IBAN transfer'],
    related: ['GLOSSARY_TERM:raast', 'GLOSSARY_TERM:accounts-payable', 'GLOSSARY_TERM:khata'],
    evidence: [EV.money, EV.khata, EV.supplierLedger],
  },
  {
    slug: 'split-payment',
    seoDescription: 'A split payment is one bill paid by more than one method, such as part cash and part card, wallet or khata. Here is how shops record it correctly.',
    term: 'Split Payment',
    definition: 'A split payment is one bill paid with more than one method, such as part cash and part card, wallet or khata.',
    definitionRomanUrdu: 'Split payment matlab ek bill ko ek se zyada tareeqon se ada karna, jaise kuch cash aur kuch card, wallet ya khata.',
    example: `A bill of 18,700 rupees is paid 10,000 in cash, 7,000 by JazzCash, and 1,700 on khata. The receipt lists all three, the galla expects only the 10,000 in cash, and the khata grows by 1,700.`,
    body: `## How it works

Customers often do not have the full amount in one place, especially on large bills. If the POS can only record one method, the cashier picks one (usually cash) and the drawer, wallet and khata all go wrong at closing. A proper split records each part with its method and amount.

Change comes only from cash. If a customer pays 10,000 rupees in cash on a 9,500 bill, the 500 change should come out of cash, not reduce the card or wallet amount. Each part then reaches the right account: drawer, bank, wallet or khata.

## In Nafaa

The Nafaa checkout takes split payments across cash, card, bank, JazzCash, Easypaisa, khata and trade-in. Each part is saved as its own payment row, receipts list each part, drawer cash and account balances read those rows, and offline bills carry them too.`,
    alsoKnownAs: ['split tender', 'mixed payment', 'multiple payment methods', 'partial payment'],
    related: ['GLOSSARY_TERM:split-bill', 'GLOSSARY_TERM:trade-in', 'GLOSSARY_TERM:galla', 'GLOSSARY_TERM:jazzcash'],
    evidence: [EV.posSplit, EV.money, EV.receipt],
  },
  {
    slug: 'qist',
    term: 'Qist (Installment Plan)',
    definition: 'Qist is selling an item on installments: the customer pays an advance, takes the item, and pays the rest in fixed monthly amounts.',
    definitionRomanUrdu: 'Qist matlab cheez qiston par bechna: gahak advance de kar cheez le jata hai aur baqi raqam har mahine muqarrara qiston me deta hai.',
    example: `A customer buys a refrigerator worth 150,000 rupees on qist: 30,000 advance and 12 monthly installments of 11,000. The shop records her CNIC and a guarantor, and sends a WhatsApp reminder three days before each due date.`,
    body: `## How it works

Installment selling is common in Pakistan for phones, appliances, motorbikes and furniture. The installment price is usually higher than the cash price to cover the risk and the wait. Good practice: take a reasonable advance, verify the customer's CNIC, address and income, take a guarantor, and give a written schedule with dates and amounts.

The work is in collection. Every installment must be recorded against the plan, late ones followed up early, and the remaining balance always clear. A shop with many plans needs to see what is due this week and what is overdue at a glance.

## In Nafaa

Nafaa's mobile and appliance packs run qist plans: what is late, what falls due this week, money collected and still to come, with taking an installment and a WhatsApp reminder in one tap. Appliance plans can record a guarantor.`,
    alsoKnownAs: ['installment', 'instalment plan', 'EMI', 'easy installments', 'aqsaat'],
    related: ['GLOSSARY_TERM:udhaar', 'GLOSSARY_TERM:layaway', 'INDUSTRY:mobile-shop', 'INDUSTRY:appliances'],
    evidence: [EV.emiPlans, 'apps/web/src/industries/appliances/AppliancesPack.tsx'],
  },
  {
    slug: 'trade-in',
    term: 'Trade-In',
    definition: 'A trade-in is when a customer hands over an old item, such as a used phone or old gold, and its agreed value is counted towards the price of a new one.',
    definitionRomanUrdu: 'Trade-in matlab gahak purani cheez, jaise purana phone ya purana sona, de kar us ki tay shuda qeemat naye saman ki qeemat me shamil karwata hai.',
    example: `A customer buys a new phone for 95,000 rupees and trades in his old phone, valued at 32,000. He pays 63,000 in cash. The old phone enters stock as a used phone at a cost of 32,000.`,
    body: `## How it works

Trade-ins are common in mobile shops, jewellery (old gold exchange) and appliances. They make the sale easier for the customer, but they are often recorded badly: the shop treats the trade-in value as a discount. That makes profit look lower than it is, and the old item enters stock with no cost, so its later sale looks like pure profit.

The right way is to treat the trade-in as a form of payment: the new item is sold at full price, the old item is "paid" for at its agreed value and enters stock at that cost. For phones, record the IMEI of the traded-in unit.

## In Nafaa

Nafaa records a trade-in as a payment, not a discount, so profit stays correct and the discount PIN is not triggered. It is used for old gold in jewellery and exchange phones in mobile shops, and appliance trade-ins carry a code that pays at checkout.`,
    alsoKnownAs: ['exchange', 'part exchange', 'old for new', 'purana do naya lo'],
    related: ['GLOSSARY_TERM:split-payment', 'GLOSSARY_TERM:consignment', 'GLOSSARY_TERM:making-charges', 'INDUSTRY:mobile-shop', 'INDUSTRY:jewelry'],
    evidence: [EV.posSplit, 'apps/web/src/core/receipt/types.ts'],
  },
  {
    slug: 'cod',
    seoDescription: 'Cash on delivery (COD) means the customer pays when the parcel arrives, not when the order is placed. Here is how sellers in Pakistan manage COD and returns.',
    imported: true,
    term: 'COD (Cash on Delivery)',
    definition: 'Cash on delivery means the customer pays when the order is delivered, not when it is placed.',
    definitionRomanUrdu: 'COD ka matlab hai gahak order milne par paise deta hai, order dete waqt nahi.',
    example: `A clothing brand sells a 4,500 rupee kurta on its website with COD. The courier collects the cash at the door and pays the brand in its next weekly settlement, minus its charges.`,
    body: `## How it works

Many online shoppers in Pakistan prefer to pay on delivery, because they want to see the product before paying. For the seller, COD brings two costs. First, the money arrives late: the courier collects it and settles on its own schedule. Second, some customers refuse the parcel, and the seller pays delivery both ways with nothing sold.

Sellers reduce the risk by confirming orders by call or WhatsApp before dispatch, asking for an advance on large or risky orders, blocking repeat refusers, and offering a small benefit for paying online.

## In Nafaa

Nafaa's COD page tracks money still with couriers, money collected but not yet paid in, settlements received, and parcels that came back. Online orders show a customer risk badge, and repeat problem customers can be put on a blocklist.`,
    alsoKnownAs: ['cash on delivery', 'pay on delivery'],
    related: ['GLOSSARY_TERM:cod-reconciliation', 'GLOSSARY_TERM:rto', 'GLOSSARY_TERM:payment-gateway', 'PRODUCT:online-store'],
    evidence: [EV.cod, EV.blocklist, 'apps/web/src/integrations/online-orders/components/RiskBadge.tsx'],
    dropped: ['"The dominant e-commerce payment method in Pakistan" (no source).', 'Named couriers.'],
  },
  {
    slug: 'cod-reconciliation',
    term: 'COD Reconciliation',
    definition: 'COD reconciliation is matching the cash a courier collected for your orders with the payments it actually sent you, order by order.',
    definitionRomanUrdu: 'COD reconciliation matlab courier ne jo cash orders par wasool kiya, usay courier ki taraf se aane wali payments se order-wise milana.',
    example: `A courier's weekly settlement sheet lists 186 delivered parcels and pays 612,000 rupees after charges. The seller matches each consignment number to its orders and finds 4 delivered orders missing from the sheet, worth 13,800 rupees.`,
    body: `## How it works

Couriers in Pakistan settle COD in batches, with a sheet listing consignment numbers, amounts collected and charges deducted. Without matching each line to an order, sellers lose money in small amounts: parcels marked delivered but not paid, wrong charges, returns charged as deliveries, and settlements that never arrived.

A weekly routine works: download or paste the settlement sheet, match by consignment number, mark matched orders paid, and raise every unmatched or short line with the courier straight away. Track the total still with each courier; it is money the business has earned but cannot spend.

## In Nafaa

The Nafaa COD page shows what is still on the road, what each courier has collected but not paid in, settlements received by reference and day, and parcels that came back. Orders are marked paid from the courier's settlement sheet, by hand or by pasting its consignment numbers.`,
    alsoKnownAs: ['courier settlement', 'COD remittance matching', 'COD payment matching'],
    related: ['GLOSSARY_TERM:cod', 'GLOSSARY_TERM:rto', 'GLOSSARY_TERM:cash-flow'],
    evidence: [EV.cod],
  },
  {
    slug: 'rto',
    seoDescription: 'RTO (Return to Origin) is a parcel the courier could not deliver, or the customer refused, sent back to the seller. Here is how sellers cut RTO losses.',
    term: 'RTO (Return to Origin)',
    definition: 'RTO is a parcel that the courier could not deliver, or the customer refused, and that is sent back to the seller.',
    definitionRomanUrdu: 'RTO woh parcel hai jo courier deliver na kar saka ya gahak ne lene se inkar kiya, aur woh wapas bechne wale ke paas bheja jata hai.',
    example: `An online store dispatches 500 COD orders in a month and 60 come back as RTO. It paid delivery and return charges on all 60, and 8 came back with damaged packaging that cannot be resold as new.`,
    body: `## How it works

RTO is one of the biggest hidden costs of selling online in Pakistan. Common causes are fake or impulse orders, wrong addresses, customers who are not reachable, and slow delivery. Each RTO costs the shipping both ways, packaging, and sometimes the product itself if it comes back damaged.

Reduce it by confirming orders before dispatch, checking addresses and phone numbers, asking for advance payment from customers with a history of refusals, and shipping fast. When a parcel comes back, check it in, put sellable goods back into stock and record the loss on the rest.

## In Nafaa

Nafaa's COD page lists parcels that came back, and online order customers carry a risk badge based on their history, with a blocklist for repeat problems.`,
    alsoKnownAs: ['return to origin', 'return to sender', 'returned parcel', 'refused order'],
    related: ['GLOSSARY_TERM:cod', 'GLOSSARY_TERM:cod-reconciliation', 'GLOSSARY_TERM:sales-return'],
    evidence: [EV.cod, EV.blocklist],
  },
  {
    slug: 'chargeback',
    term: 'Chargeback',
    definition: 'A chargeback is when a card payment is reversed by the customer\'s bank after the customer disputes it, and the money is taken back from the merchant.',
    definitionRomanUrdu: 'Chargeback tab hota hai jab gahak card payment par aitraaz kare aur us ka bank paise merchant se wapas le le.',
    example: `An online store sells a 25,000 rupee watch by card. Three weeks later the cardholder says the purchase was not his. The bank reverses the payment, and the store loses both the money and the watch unless it can prove delivery.`,
    body: `## How it works

Chargebacks protect cardholders from fraud and from sellers who do not deliver. For merchants, they arrive weeks after the sale, and the bank asks for evidence: an order confirmation, proof of delivery with signature or OTP, and communication with the customer. Without these, the merchant usually loses.

Online sellers in Pakistan face them mainly on card payments through payment gateways. Reduce the risk by using 3-D Secure (OTP) on cards, confirming large orders, shipping only to verified addresses, and keeping delivery proof for every card order.

## In Nafaa

Nafaa does not process card payments itself, so chargebacks are handled with the shop's bank or payment provider; Nafaa keeps the bill, the payment method and the order history that serve as evidence.`,
    alsoKnownAs: ['payment dispute', 'card dispute', 'payment reversal'],
    related: ['GLOSSARY_TERM:payment-gateway', 'GLOSSARY_TERM:refund', 'GLOSSARY_TERM:escrow'],
  },
  {
    slug: 'payment-gateway',
    term: 'Payment Gateway',
    definition: 'A payment gateway is a service that lets a website or app accept card, wallet or bank payments online and passes the money to the seller\'s account.',
    definitionRomanUrdu: 'Payment gateway woh service hai jis se website ya app online card, wallet ya bank payment le sakti hai aur paise bechne wale ke account me pohanchte hain.',
    example: `An online pharmacy adds a payment gateway to its checkout. Customers can now pay by card or wallet; the gateway takes a fee per transaction and settles the rest to the pharmacy's bank account every few days.`,
    body: `## How it works

In Pakistan, gateways are offered by banks, wallet companies and payment service providers licensed by the State Bank. Setting one up usually needs a registered business, a business bank account and documents, and the gateway charges a percentage or fixed fee per payment.

Before choosing, compare fees, settlement time, which methods are supported (cards, wallets, Raast), the checkout experience on mobile, and how refunds and disputes work. Offering online payment alongside COD reduces refused parcels, because customers who pay up front rarely refuse delivery.

## In Nafaa

For online orders, Nafaa can create a payment link for the full amount or an advance through a payment account the shop connects. Links expire after three days and can be shared on WhatsApp.`,
    alsoKnownAs: ['online payment gateway', 'PSP', 'payment service provider', 'checkout'],
    related: ['GLOSSARY_TERM:cod', 'GLOSSARY_TERM:chargeback', 'GLOSSARY_TERM:raast'],
    evidence: [PAYMENT_LINKS, 'apps/web/src/integrations/online-orders/components/PaymentLinkSection.tsx'],
  },
  {
    slug: 'escrow',
    seoDescription: 'Escrow is when a neutral party holds a payment until both buyer and seller have done their part. Here is how it works on marketplaces in Pakistan.',
    imported: true,
    term: 'Escrow',
    definition: 'Escrow is when a neutral party holds a payment until both buyer and seller have done their part.',
    definitionRomanUrdu: 'Escrow me ek beech ka fareeq paise tab tak rakhta hai jab tak khareedar aur bechne wala dono apna kaam poora na kar dein.',
    example: `A buyer orders a used laptop from a seller in another city through a platform with escrow. The buyer pays the platform, the seller ships, and the platform releases the money to the seller once the buyer confirms the laptop works.`,
    body: `## How it works

Escrow solves the trust problem between strangers. The buyer does not want to pay before seeing the goods; the seller does not want to ship before being paid. With escrow, both are protected: the money exists, but neither side can take it until the deal is done. Disputes go to the escrow holder, who decides based on evidence.

It is used in property deals, freelance platforms, high-value used goods and some online marketplaces. Escrow services charge a fee, and their rules on how long the buyer has to raise a problem matter as much as the fee.

## In Nafaa

Nafaa does not offer an escrow service.`,
    alsoKnownAs: ['escrow payment', 'amanat payment'],
    related: ['GLOSSARY_TERM:marketplace', 'GLOSSARY_TERM:chargeback', 'GLOSSARY_TERM:payment-gateway'],
    dropped: ['"Nafaa Bazaar uses escrow" (owner decision O14: marketplace status not confirmed).'],
  },
  {
    slug: 'gmv',
    seoDescription: 'GMV (Gross Merchandise Value) is the total value of goods sold through a platform before fees, returns and discounts. Here is why it differs from revenue.',
    imported: true,
    term: 'GMV (Gross Merchandise Value)',
    definition: 'GMV is the total value of goods sold through a platform before fees, returns and discounts are taken off.',
    definitionRomanUrdu: 'GMV platform par bikne wale saman ki kul qeemat hai, fees aur returns katne se pehle.',
    example: `A seller's store on a marketplace shows a GMV of 2 million rupees for the month. After 12% returns and cancellations, marketplace commission and shipping fees, the money actually received is much less.`,
    body: `## How it works

GMV is a headline number used by marketplaces and online stores to show size. It counts orders at their selling price, including orders that are later cancelled or returned. That makes it useful for comparing activity over time but misleading as a measure of income.

For a seller, the numbers that matter come after GMV: net sales after returns and cancellations, then what the platform pays out after commission, payment and shipping fees, and finally profit after the cost of goods. When comparing channels, compare profit per order, not GMV.

## In Nafaa

Nafaa reports online orders next to counter sales, and its profit report works from completed bills after discounts and returns, so channel comparisons use net figures rather than GMV.`,
    alsoKnownAs: ['gross merchandise value', 'gross merchandise volume', 'GMS'],
    related: ['GLOSSARY_TERM:marketplace', 'GLOSSARY_TERM:net-profit', 'GLOSSARY_TERM:rto'],
    evidence: [EV.profitReport, 'apps/web/src/integrations/online-orders/pages/ChannelsListPage.tsx'],
  },
  {
    slug: 'dropshipping',
    seoDescription: 'Dropshipping is selling online without holding stock: the seller passes each order to a supplier, who ships it straight to the customer.',
    term: 'Dropshipping',
    definition: 'Dropshipping is selling products online without holding stock: when an order comes in, the seller buys the item from a supplier who ships it straight to the customer.',
    definitionRomanUrdu: 'Dropshipping matlab stock rakhe baghair online bechna: order aane par bechne wala supplier se cheez khareedta hai aur supplier seedha gahak ko bhejta hai.',
    example: `A seller lists kitchen gadgets on her Instagram page. When a customer orders a chopper, she places the order with a Karachi wholesaler who ships it with her COD amount, and she keeps the difference after charges.`,
    body: `## How it works

Dropshipping needs little capital, which is why it is popular with new online sellers in Pakistan. The trade-off is control: the seller depends on the supplier's stock, packing and speed, but the customer blames the seller for every late or wrong parcel. Margins are usually thin, and RTO costs on COD orders can wipe them out.

If you dropship, test the supplier with your own orders first, keep a written agreement on returns and damaged goods, sync stock often so you do not sell what the supplier has run out of, and reconcile every COD settlement.

## In Nafaa

Nafaa is built for businesses that hold their own stock; it does not run supplier-shipped orders as a separate flow.`,
    alsoKnownAs: ['drop shipping', 'drop ship'],
    related: ['GLOSSARY_TERM:cod', 'GLOSSARY_TERM:rto', 'GLOSSARY_TERM:marketplace'],
  },
  {
    slug: 'marketplace',
    seoDescription: 'An online marketplace is a website or app where many sellers list products and customers buy from them, with the platform running the storefront.',
    term: 'Online Marketplace',
    definition: 'An online marketplace is a website or app where many sellers list products and customers buy from them, with the platform handling the storefront and often payment and delivery.',
    definitionRomanUrdu: 'Online marketplace woh website ya app hai jahan bohat se seller apne products lagate hain aur gahak un se khareedte hain; platform dukaan, aur aksar payment aur delivery sambhalta hai.',
    example: `A shoe shop in Lahore lists 80 styles on a marketplace as well as selling at its counter. Every online order must come out of the same stock, so a pair sold at the counter is not also sold online.`,
    body: `## How it works

Marketplaces bring customers a shop could not reach on its own, but they charge commission and fees, set the rules on pricing and returns, and own the customer relationship. Many Pakistani sellers use them alongside a counter, a social media page and their own website.

The main operational risk is stock. Selling the same items in several places from separate stock counts leads to cancelled orders, which marketplaces penalise. One stock across all channels, updated as each sale happens, prevents it. Compare channels by profit after fees and returns, not by sales.

## In Nafaa

Nafaa brings online orders into the same account as the shop, so they take stock from the same shelf as counter sales; the channels connected are listed under Settings, Sales channels.`,
    alsoKnownAs: ['marketplace', 'e-commerce platform', 'online bazaar'],
    related: ['GLOSSARY_TERM:gmv', 'GLOSSARY_TERM:cod', 'GLOSSARY_TERM:escrow', 'PRODUCT:online-store', 'SOLUTION:ecommerce'],
    evidence: ['apps/web/src/integrations/online-orders/pages/ChannelsListPage.tsx'],
    needsOwner: ['Nafaa Bazaar (own marketplace) not mentioned until its launch status is confirmed (owner decision O14).'],
  },
];
