/**
 * Glossary: tax and registration terms. Every entry cites an official source
 * (FBR, PRA, SRB, KPRA) and quotes no rates or thresholds, because those
 * change with each Finance Act. Readers are pointed to the authority or a
 * tax adviser for their own case.
 */

import { EV, SRC, type TermSpec } from './_term';

const TAX_RULES_NOTE = 'Rates, thresholds and dates change with Finance Acts and S.R.O.s; check the current position with the authority or a tax adviser.';
const TAX_SETTINGS = 'apps/web/src/modules/tax/components/SettingsView.tsx';
const TAX_REPORT = 'apps/web/src/modules/tax/components/MonthlyReportView.tsx';

export const taxTerms: TermSpec[] = [
  {
    slug: 'fbr-pos',
    seoDescription: 'FBR POS integration links a retailer\'s point of sale to FBR, so each sale invoice is reported live and carries an FBR invoice number and QR code.',
    imported: true,
    term: 'FBR POS Integration',
    definition: "FBR POS integration is the live link between a retailer's point of sale and the Federal Board of Revenue, so that each sale invoice is reported to FBR and carries an FBR invoice number and QR code.",
    definitionRomanUrdu: 'FBR POS integration ka matlab hai dukaan ka POS FBR se juda ho, taake har bill FBR ko jaye aur us par FBR invoice number aur QR code ho.',
    example: `A chain store's counter makes a bill. The POS sends it to FBR, receives an FBR invoice number, and prints it with a QR code. The customer can check the invoice through FBR's verification service.`,
    body: `## How it works

Retailers that fall in the Tier-1 category must report every sale to FBR in real time through an integrated POS, under the Sales Tax Rules, 2006. Each POS terminal is registered with FBR, and each invoice sent receives a fiscal number. FBR charges a small service fee per invoice issued through an integrated POS (one rupee per invoice under S.R.O. 1279(I)/2021, as listed on FBR's POS page), and runs a prize scheme for customers who keep FBR invoices.

If the internet drops, the POS should keep the invoices and send them as soon as the connection returns, so no bill is left unreported.

## In Nafaa

Nafaa offers optional FBR and provincial integration from its Tax page: each counter's POS ID is set per branch, every bill sent shows its fiscal number, QR and FBR's answer, and failed bills can be retried. See [FBR integration](/product/fbr).

## Official source

[FBR: Point of Sale legal provisions](https://fbr.gov.pk/pos-legal-provisions/163085/163086) and [POS invoice verification](https://fbr.gov.pk/pos-invoice-verification/163085/163142). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['FBR POS', 'FBR integration', 'POS integration', 'FBR invoice'],
    related: ['GLOSSARY_TERM:tier-1-retailer', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:e-invoicing', 'PRODUCT:fbr', 'BLOG_POST:fbr-e-invoicing-complete-guide-2026'],
    evidence: [EV.tax, EV.fbr, TAX_SETTINGS],
    sources: [SRC.fbrPos, SRC.fbrPosVerify],
    dropped: ['"Mandatory" and "instantly" wording until the rule is cited.'],
  },
  {
    slug: 'tier-1-retailer',
    seoDescription: 'A Tier-1 retailer is a larger retailer, such as a chain outlet or a shop in an air-conditioned mall, that must integrate its POS with FBR.',
    imported: true,
    term: 'Tier-1 Retailer',
    definition: 'Tier-1 retailer is the sales tax category for larger retailers, such as chain-store outlets and shops in air-conditioned malls, that must integrate their POS with FBR.',
    definitionRomanUrdu: 'Tier-1 retailer badi dukaanon ki sales tax category hai, jaise chain stores aur AC malls ki dukaanein, jin ke liye POS ko FBR se jodna zaroori hai.',
    example: `A clothing brand with outlets in several cities is part of a national chain, so its outlets are Tier-1 retailers. Each outlet's counters must be integrated with FBR, and the bills carry FBR invoice numbers.`,
    body: `## How it works

The Sales Tax Act, 1990 defines Tier-1 retailers in section 2(43A). The definition covers, for example, retailers operating as a unit of a national or international chain, retailers in air-conditioned shopping malls or plazas, and retailers above limits for shop area or yearly electricity bill set in the law. Wholesalers-cum-retailers can also be covered. FBR also issues Sales Tax General Orders that name specific retailers and set integration dates.

Tier-1 retailers must register for sales tax, charge it on their sales and report every invoice to FBR in real time through an integrated POS. Retailers that are not Tier-1 are taxed under different provisions, which is why knowing your category is the first step.

## In Nafaa

The Nafaa Tax page includes FBR POS among its optional integrations, with a short guide on which authority applies to which kind of business.

## Official source

[FBR: Sales Tax General Order, Tier-1 retailers](https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442) and the Sales Tax Act, 1990 on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['tier 1', 'tier-I retailer', 'tier one retailer'],
    related: ['GLOSSARY_TERM:fbr-pos', 'GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:strn', 'BLOG_POST:fbr-e-invoicing-complete-guide-2026'],
    evidence: [EV.taxMeta, 'apps/web/src/modules/tax/components/TaxGuide.tsx'],
    sources: [SRC.fbrTier1, SRC.fbrActs, SRC.fbrPos],
    dropped: ['"High-turnover businesses" (not one of the cited criteria).'],
  },
  {
    slug: 'ntn',
    seoDescription: 'The National Tax Number (NTN) is a taxpayer\'s identification number with FBR, obtained through the IRIS portal. Here is when a business needs one.',
    imported: true,
    term: 'NTN (National Tax Number)',
    definition: "The National Tax Number is a taxpayer's identification number with FBR, obtained through FBR's IRIS portal.",
    definitionRomanUrdu: 'NTN FBR ke saath taxpayer ki pehchan ka number hai, jo IRIS portal se milta hai.',
    example: `A shop owner registers on IRIS with his CNIC, mobile number and email, adds his business details, and gets his NTN. He uses it to file his yearly income tax return and gives it to suppliers who need it for their records.`,
    body: `## How it works

Registration is done online on IRIS, FBR's taxpayer portal. Individuals register with their CNIC; companies and associations of persons register with their incorporation or registration documents. For individuals, FBR uses the CNIC number itself as the registration number.

An NTN is needed to file income tax returns, and filing returns is what puts a person on the Active Taxpayer List, which affects withholding tax rates on many transactions. Businesses also need an NTN to register for sales tax and for most provincial tax registrations.

## In Nafaa

The Nafaa Tax settings store the NTN with each POS terminal where an authority's integration asks for it. Nafaa does not register taxpayers or file returns.

## Official source

[FBR IRIS taxpayer portal](https://iris.fbr.gov.pk/public/txplogin.xhtml). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['national tax number', 'tax number', 'FBR registration number'],
    related: ['GLOSSARY_TERM:strn', 'GLOSSARY_TERM:active-taxpayer-list', 'GLOSSARY_TERM:withholding-tax', 'BLOG_POST:how-to-start-kiryana-store-pakistan'],
    evidence: [TAX_SETTINGS],
    sources: [SRC.iris],
    dropped: ['"Required for opening business bank accounts" (not checked).'],
  },
  {
    slug: 'strn',
    seoDescription: 'The Sales Tax Registration Number (STRN) identifies a business registered with FBR for sales tax. Here is who needs one and where it appears on bills.',
    seoTitle: 'What is STRN? Sales Tax Registration Number in Urdu',
    imported: true,
    term: 'STRN (Sales Tax Registration Number)',
    definition: 'The Sales Tax Registration Number identifies a business registered with FBR for sales tax.',
    definitionRomanUrdu: 'STRN us business ka number hai jo FBR ke paas sales tax ke liye registered ho.',
    example: `A distributor registered for sales tax prints its STRN on every sales tax invoice. A retailer buying from it checks that the supplier's STRN is active before claiming the input tax on that invoice.`,
    body: `## How it works

A business registers for sales tax on IRIS after it has an NTN. Once registered, it must charge sales tax on taxable supplies, issue sales tax invoices showing its registration number, and file monthly sales tax returns. Buyers who are themselves registered can claim the tax on those invoices as input tax, but only if the supplier is active and has declared the sale.

Provincial authorities register businesses for sales tax on services separately: PRA in Punjab, SRB in Sindh, KPRA in Khyber Pakhtunkhwa and BRA in Balochistan. A business that sells both goods and services may need both federal and provincial registrations.

## In Nafaa

Nafaa's tax settings hold the registration details each authority's integration needs, and the monthly report gives sales tax return figures per authority.

## Official source

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149) and [FBR: Active Taxpayer List (Sales Tax)](https://fbr.gov.pk/atl-sales-tax/163223). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['sales tax registration number', 'sales tax number', 'STN'],
    related: ['GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:input-tax'],
    evidence: [TAX_SETTINGS, TAX_REPORT],
    sources: [SRC.fbrStBasics, SRC.fbrAtlSt],
  },
  {
    slug: 'sales-tax',
    seoDescription: 'Sales tax, often called GST in Pakistan, is charged on goods under the federal Sales Tax Act, 1990, while the provinces tax services separately.',
    term: 'Sales Tax (GST)',
    definition: 'Sales tax, often called GST in Pakistan, is a tax on the supply of goods charged under the federal Sales Tax Act, 1990, with services taxed separately by the provinces.',
    definitionRomanUrdu: 'Sales tax, jise Pakistan me aam taur par GST kehte hain, saman ki supply par federal Sales Tax Act, 1990 ke tehat lagta hai; services par sooba alag tax lagata hai.',
    example: `A registered manufacturer sells goods to a distributor and charges sales tax on the invoice. The distributor charges sales tax again when it sells on, but deducts the tax it paid on its purchase, so tax is effectively paid on the value added at each step.`,
    body: `## How it works

Sales tax on goods is collected by FBR. Registered businesses charge output tax on their sales, deduct input tax paid on their purchases, and pay the difference with a monthly return. The standard rate is set in section 3 of the Sales Tax Act, 1990, with reduced rates, exemptions and special regimes in its schedules; goods in the Third Schedule are taxed on their printed retail price.

Since the 18th Amendment, sales tax on services is a provincial subject: PRA, SRB, KPRA and BRA collect it under their own laws, at their own rates. That is why a restaurant in Lahore deals with PRA while a wholesaler of goods deals with FBR.

## In Nafaa

Nafaa's tax module covers FBR POS, PRA, SRB and KPRA in one place: taxable sales and tax per authority, each invoice sent, and monthly sales tax return figures by rate, branch and day. Integration with an authority is optional.

## Official source

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149) and the Sales Tax Act, 1990 on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['GST', 'general sales tax', 'sales tax on goods', 'VAT'],
    related: ['GLOSSARY_TERM:input-tax', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:sales-tax-on-services', 'GLOSSARY_TERM:strn', 'BLOG_POST:sales-tax-guide-punjab-2026'],
    evidence: [EV.tax, TAX_REPORT],
    sources: [SRC.fbrStBasics, SRC.fbrActs],
  },
  {
    slug: 'sales-tax-invoice',
    seoDescription: 'A sales tax invoice is the invoice a registered person must issue for a taxable supply, showing both parties\' registration numbers and the tax charged.',
    term: 'Sales Tax Invoice',
    definition: 'A sales tax invoice is the invoice a sales tax registered person must issue for a taxable supply, showing the details the Sales Tax Act, 1990 requires, including both parties\' registration numbers and the tax charged.',
    definitionRomanUrdu: 'Sales tax invoice woh invoice hai jo sales tax registered shakhs taxable supply par deta hai, jis me Sales Tax Act ke mutabiq dono parties ke registration number aur tax ki raqam hoti hai.',
    example: `A registered wholesaler supplies a registered retailer. The invoice shows both names, addresses and registration numbers, the date and serial number, each item with quantity, the value excluding tax, the sales tax and the total including tax.`,
    body: `## How it works

Section 23 of the Sales Tax Act, 1990 lists what a tax invoice must contain, including the supplier's and recipient's names, addresses and registration numbers, the date, a serial number, a description and quantity of goods, the value excluding tax, the tax amount and the value including tax. Invoices must be issued in the form and manner FBR prescribes, which now includes electronic invoices for many registered persons.

The buyer's right to claim input tax depends on holding a valid invoice from an active supplier, so registered buyers check invoices carefully. Corrections are made with credit and debit notes, not by editing the original invoice.

## In Nafaa

Bills reported through Nafaa's optional tax integration print with the authority's fiscal number and QR code, and the Tax page lists every invoice sent with the authority's answer.

## Official source

The Sales Tax Act, 1990 on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226) and [FBR: Digital invoicing legal provisions](https://fbr.gov.pk/di-legal-provisions/173967/173968). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['tax invoice', 'GST invoice', 'sales tax bill'],
    related: ['GLOSSARY_TERM:invoice', 'GLOSSARY_TERM:e-invoicing', 'GLOSSARY_TERM:credit-note', 'GLOSSARY_TERM:input-tax'],
    evidence: [EV.tax, 'apps/web/src/integrations/fbr/components/FbrReceiptBadge.tsx'],
    sources: [SRC.fbrActs, SRC.fbrDi],
  },
  {
    slug: 'input-tax',
    seoDescription: 'Input tax is the sales tax a registered business pays on purchases; output tax is what it charges on sales. The business pays FBR the difference.',
    term: 'Input Tax and Output Tax',
    definition: 'Input tax is the sales tax a registered business pays on its purchases; output tax is the sales tax it charges on its sales. The business pays the difference.',
    definitionRomanUrdu: 'Input tax woh sales tax hai jo registered karobar apni khareedari par deta hai; output tax woh jo apni sale par leta hai. Dono ka farq jama karwaya jata hai.',
    example: `In a month a registered distributor charges 900,000 rupees of output tax on its sales and has valid invoices showing 700,000 rupees of input tax on its purchases. Its return shows 200,000 rupees payable.`,
    body: `## How it works

FBR describes input tax as the tax paid by a registered person on taxable goods and services purchased, including tax paid on imports, and output tax as the sales tax charged on the sale or supply of taxable goods or services. Section 7 of the Sales Tax Act, 1990 lets a registered person deduct input tax from output tax, subject to conditions and limits in the Act.

The conditions matter in practice: the purchase must be for taxable business supplies, backed by a valid sales tax invoice, and the supplier must be active and have declared the sale. Input tax on some items, and above certain limits, cannot be claimed.

## In Nafaa

Nafaa's monthly tax report gives the output side for each authority: taxable sales, tax, and returns as credit notes with their tax. Input tax claims are prepared by the business or its tax adviser.

## Official source

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149) and the Sales Tax Act, 1990 on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['input tax', 'output tax', 'input tax adjustment', 'tax credit'],
    related: ['GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:strn'],
    evidence: [TAX_REPORT, EV.taxPrint],
    sources: [SRC.fbrStBasics, SRC.fbrActs],
  },
  {
    slug: 'withholding-tax',
    term: 'Withholding Tax',
    definition: 'Withholding tax is income tax deducted at source by the payer, such as a company paying a supplier, and deposited with FBR on the recipient\'s behalf.',
    definitionRomanUrdu: 'Withholding tax woh income tax hai jo paise dene wala, jaise koi company supplier ko payment karte waqt, pehle hi kaat kar FBR me jama karwata hai.',
    example: `A stationery supplier bills a company 200,000 rupees. The company pays less than the full amount, deducts withholding tax under the Income Tax Ordinance, deposits it with FBR and gives the supplier a certificate, which the supplier uses when filing its return.`,
    body: `## How it works

The Income Tax Ordinance, 2001 makes many payers act as withholding agents: companies and other prescribed persons paying for goods, services and contracts (section 153), banks on cash withdrawals and profit, and distributors and manufacturers on sales to retailers, among others. Rates differ by transaction, and persons not on the Active Taxpayer List generally face higher rates.

For a shop, withholding appears in two ways: tax deducted from payments it receives from corporate buyers, and advance tax collected on some of its own purchases or bills. Keep every deduction certificate, since the tax withheld can be adjusted against the final tax liability when the return is filed, unless it is a final tax.

## In Nafaa

Nafaa records payments received and paid; withholding tax certificates and returns are handled by the business or its tax adviser.

## Official source

[FBR: Withholding tax rates](https://fbr.gov.pk/withholding-taxes-rate-card/174298/174301) and the Income Tax Ordinance, 2001 on [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['WHT', 'tax deducted at source', 'advance tax', 'tax deduction'],
    related: ['GLOSSARY_TERM:active-taxpayer-list', 'GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:accounts-receivable'],
    sources: [SRC.fbrWht, SRC.fbrActs],
  },
  {
    slug: 'active-taxpayer-list',
    seoDescription: 'The Active Taxpayer List (ATL) is FBR\'s list of people who have filed their income tax return. Being on it decides whether lower filer rates apply.',
    term: 'Active Taxpayer List (ATL)',
    definition: 'The Active Taxpayer List is FBR\'s published list of persons who have filed their income tax return (or are otherwise active), which decides whether lower filer tax rates apply to them.',
    definitionRomanUrdu: 'Active Taxpayer List FBR ki list hai un logon ki jinhon ne income tax return file kiya ho; isi se tay hota hai ke un par filer wale kam tax rates lagenge ya nahi.',
    example: `A shop owner files his return late. Until his name appears on the ATL, his bank deducts withholding tax at the higher non-filer rate on certain transactions. Once he is on the list, the lower rate applies.`,
    body: `## How it works

FBR maintains separate active taxpayer lists for income tax and for sales tax. Being on the income tax ATL is what people mean by "filer". Many withholding provisions in the Income Tax Ordinance, 2001 set higher rates for persons not on the list, so it affects property deals, vehicle registration, banking transactions, purchases from distributors and more.

The list is published on FBR's website, where anyone can check a person or business by NTN or CNIC. Returns filed after the due date can still put a person on the list, subject to the conditions FBR sets. Registered buyers also check the sales tax ATL before claiming input tax on a supplier's invoice.

## In Nafaa

Nafaa does not check ATL status; use FBR's online verification.

## Official source

[FBR: Active Taxpayer List (Income Tax)](https://fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71167) and [FBR: Active Taxpayer List (Sales Tax)](https://fbr.gov.pk/atl-sales-tax/163223). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['ATL', 'filer list', 'active taxpayer', 'filer status'],
    related: ['GLOSSARY_TERM:withholding-tax', 'GLOSSARY_TERM:ntn', 'GLOSSARY_TERM:strn'],
    sources: [SRC.fbrAtl, SRC.fbrAtlSt],
  },
  {
    slug: 'sales-tax-on-services',
    seoDescription: 'Sales tax on services is charged by the provinces on restaurants, salons, gyms, couriers and more, and collected by PRA, SRB, KPRA and BRA.',
    term: 'Sales Tax on Services',
    definition: 'Sales tax on services is the tax provinces charge on services such as restaurants, salons, gyms and courier work, collected by PRA, SRB, KPRA and BRA under provincial laws.',
    definitionRomanUrdu: 'Sales tax on services woh tax hai jo sooba restaurant, salon, gym aur courier jaisi services par lagata hai, aur PRA, SRB, KPRA aur BRA wasool karte hain.',
    example: `A cafe in Lahore is registered with the Punjab Revenue Authority. Each bill shows the PRA tax on the service, and the cafe's POS reports the invoice to PRA's electronic invoice monitoring system so the bill carries a PRA invoice number.`,
    body: `## How it works

After the 18th Amendment, provinces collect sales tax on services under their own laws: the Punjab Revenue Authority (PRA) in Punjab, the Sindh Revenue Board (SRB) in Sindh, the Khyber Pakhtunkhwa Revenue Authority (KPRA) and the Balochistan Revenue Authority (BRA). Each sets which services are taxable, the rates and the registration rules, and they differ, for example between card and cash payments in some provinces.

Restaurants, cafes, salons, gyms, hotels and many other service businesses fall under these rules. Several authorities require real-time reporting of invoices from the POS, as PRA does through its e-IMS system.

## In Nafaa

Nafaa's Tax page supports PRA, SRB and KPRA alongside FBR POS as optional integrations, with POS registration steps for each authority, every invoice's status and monthly return figures per authority.

## Official source

[Punjab Revenue Authority](https://pra.punjab.gov.pk/) and its [e-IMS](https://e.pra.punjab.gov.pk/public/eims.xhtml), [Sindh Revenue Board](https://www.srb.gos.pk/srb/) and [Khyber Pakhtunkhwa Revenue Authority](https://kpra.kp.gov.pk). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['provincial sales tax', 'PST', 'services tax', 'PRA tax', 'SRB tax'],
    related: ['GLOSSARY_TERM:sales-tax', 'GLOSSARY_TERM:service-charge', 'GLOSSARY_TERM:e-invoicing', 'INDUSTRY:restaurant', 'BLOG_POST:sales-tax-guide-punjab-2026'],
    evidence: [EV.taxMeta, TAX_SETTINGS],
    sources: [SRC.pra, SRC.praEims, SRC.srb, SRC.kpra],
  },
  {
    slug: 'e-invoicing',
    seoDescription: 'E-invoicing is issuing sales tax invoices through a system linked to the tax authority, which checks each invoice and gives it a unique number.',
    term: 'E-Invoicing (Digital Invoicing)',
    definition: 'E-invoicing is issuing sales tax invoices electronically through a system connected to the tax authority, which validates each invoice and gives it a unique number.',
    definitionRomanUrdu: 'E-invoicing matlab sales tax invoices ko aise system se banana jo tax authority se juda ho, jo har invoice ko check kar ke usay unique number deta hai.',
    example: `A registered manufacturer's billing software sends each invoice to FBR's digital invoicing system before printing. FBR returns an invoice number and QR code, which go on the printed invoice to the distributor.`,
    body: `## How it works

FBR's digital invoicing applies to sales tax registered persons as notified in the Sales Tax Rules, 2006 and related S.R.O.s, and works alongside the older POS integration for Tier-1 retailers. In practice both work the same way: the billing software sends each invoice, receives a number back, and prints it with a QR code that buyers can verify. Provinces run similar systems for services, such as PRA's e-IMS.

Businesses usually connect through a licensed integrator or approved software. Before going live, check which system applies to you, what fields each invoice needs (buyer details, product codes, tax rates) and how the system handles internet outages.

## In Nafaa

Nafaa's optional tax integration reports invoices to FBR POS, PRA, SRB or KPRA, prints the fiscal number and QR on the bill, and lets failed invoices be retried. Nafaa also offers [FBR integration setup](/services/fbr-integration-setup) as a service.

## Official source

[FBR: Digital invoicing legal provisions](https://fbr.gov.pk/di-legal-provisions/173967/173968) and [FBR: Point of Sale legal provisions](https://fbr.gov.pk/pos-legal-provisions/163085/163086). ${TAX_RULES_NOTE}`,
    alsoKnownAs: ['digital invoicing', 'electronic invoicing', 'DI', 'e-invoice'],
    related: ['GLOSSARY_TERM:fbr-pos', 'GLOSSARY_TERM:sales-tax-invoice', 'GLOSSARY_TERM:sales-tax-on-services', 'SERVICE:fbr-integration-setup', 'BLOG_POST:fbr-e-invoicing-complete-guide-2026'],
    evidence: [EV.tax, EV.fbr],
    sources: [SRC.fbrDi, SRC.fbrPos],
  },
];
