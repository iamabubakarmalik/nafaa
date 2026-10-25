/** Industry: Hardware & Building Materials (/industries/hardware). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "hardware",
  title: "Hardware & Building Materials",
  shortName: "Hardware",
  shopNoun: "hardware and building material shops",
  romanUrduName: "Hardware / building material",
  group: "specialty",
  icon: "hammer",
  color: "#57534e",
  appIndustryKey: "hardware",
  businessType: "HARDWARE",
  featured: true,
  sortOrder: 11,
  summary:
    "Nafaa runs hardware and building material shops: items by size and shade, retail, contractor and bulk rates, quotations that turn into bills, delivery challans, contractor sites with their own khata, brands, and reorder rules that flag what to buy before it runs out.",
  builtFor: "Hardware, paint, sanitary and building material shops",
  romanUrdu:
    "Hardware aur building material ke liye: size aur shade, retail, thekedar aur bulk rate, quotation se bill, delivery challan, thekedar ka khata aur reorder.",
  features: [
    { icon: "file-text", title: "Quotations to bills", body: "Estimates at retail or contractor rate with validity and terms, revised as the customer asks, sent on WhatsApp and billed when accepted." },
    { icon: "tags", title: "Three rates", body: "Retail, contractor and bulk rates on the same item; quantity rates apply by themselves." },
    { icon: "truck", title: "Delivery challans", body: "Goods to a site in one trip or several, with the vehicle, the trip and what actually arrived." },
    { icon: "hand-coins", title: "Contractor khata", body: "Each contractor's udhaar with its age, credit limit and terms such as days, guarantor or cheque." },
    { icon: "building", title: "Sites and projects", body: "What was quoted, billed and delivered to each site, and what is still to send." },
    { icon: "receipt", title: "Delivery and labour charges", body: "Add delivery and labour to a bill as charges, apart from the goods." },
    { icon: "package-search", title: "Reorder list", body: "Items at or below their reorder point, how much to order and from whom, printed per supplier." },
    { icon: "paintbrush", title: "Sizes, shades and brands", body: "Pipes by size, paint by shade, cement by brand, with the dealer's phone kept on each brand." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: [
    "apps/web/src/industries/hardware/HardwarePack.tsx",
    "apps/web/src/industries/hardware/pages/NewQuotationPage.tsx",
    "apps/web/src/industries/hardware/pages/QuotationDetailPage.tsx",
    "apps/web/src/industries/hardware/pages/QuotationsPage.tsx",
    "apps/web/src/industries/hardware/pages/DeliveryFormPage.tsx",
    "apps/web/src/industries/hardware/pages/DeliveryDetailPage.tsx",
    "apps/web/src/industries/hardware/pages/CreditAccountsPage.tsx",
    "apps/web/src/industries/hardware/pages/ProjectsPage.tsx",
    "apps/web/src/industries/hardware/pages/ReorderRulesPage.tsx",
    "apps/web/src/industries/hardware/pages/BrandsPage.tsx",
    "apps/web/src/industries/hardware/products/HardwareProducts.tsx",
  ],
  dropped: [
  ],
  heroOverride: {
    heading: "Quotations, site deliveries and contractor khata in one app",
    sub: "Quote a contractor at his rate, turn the quotation into a bill, send the goods to site in as many trips as it takes, and see every contractor's udhaar with its age and limit.",
    badges: ["Quotation to bill", "Delivery challans", "Contractor khata"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/hardware/dashboard" },
  },
  deepBlocks: [
    steps("A day at the hardware store", [
      ["Morning", "Print the reorder list per supplier: cement, pipes and fittings at or below their reorder point, with how much to order. Call the dealer from the brand page."],
      ["A contractor calls", "Make a quotation for his site at contractor rates; bulk rates apply on large quantities. Send it on WhatsApp with its validity and terms."],
      ["He accepts", "Bill the quotation at the quoted rates, with delivery and labour as charges, for cash, card, split or on his khata."],
      ["Loading the truck", "Make a delivery challan from the bill. Half the steel goes today; the challan shows what is left for the next trip."],
      ["Evening", "Check which contractors are past their credit days and which sites still have goods to send, then count the galla."],
    ]),
    shot({
      heading: "Reorder before the cement runs out",
      body: "The low-stock list shows how many days each item will last at its recent selling rate, how much to order and from which supplier, and turns the lines into a purchase order.",
      id: SHOT.lowStock,
      url: "app.nafaa.pk/inventory/low-stock",
      layout: "full",
      caption: "Shared low-stock screen, shown with a demo store's data.",
      callouts: [
        { x: 61, y: 61, label: "How many days the stock will last" },
        { x: 71, y: 61, label: "How much to order" },
        { x: 85, y: 61, label: "Which supplier to order from" },
        { x: 92, y: 12, label: "Turn the list into a purchase order" },
      ],
    }),
    shot({
      heading: "Contractor udhaar you can actually collect",
      body: "Contractors buy on credit for weeks. The khata shows the total out, how old each amount is and who has crossed their limit, with a reminder one tap away.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "Shared khata screen, shown with demo data.",
      callouts: [
        { x: 33, y: 19.5, label: "Total udhaar to collect" },
        { x: 49, y: 31, label: "How long each amount has been pending" },
      ],
    }),
    table("Estimate pad or Nafaa?", "How the main jobs of a hardware store compare on an estimate pad and in Nafaa.", [
      { key: "paper", label: "Estimate pad and challan book" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Quotations", "Written by hand, rates from memory", "Contractor and bulk rates applied, sent on WhatsApp"],
      ["Quotation to bill", "Copied line by line onto a bill", "Billed at the quoted rates in one step"],
      ["Part deliveries", "Two challan books that never agree", "Each challan shows what is left on the bill"],
      ["Contractor udhaar", "A ledger page per contractor", "Balance, age, limit and terms per contractor"],
      ["Reordering", "When the godown is empty", "Reorder list per supplier with quantities"],
    ]),
    prose(`## What to look for in hardware store software

A hardware or building material shop sells to two kinds of customer: the walk-in who needs one tap washer, and the contractor who buys a truckload on credit for a site. Most shop software only handles the first. Before you choose, check that it can:

- **Keep more than one rate.** Retail, contractor and bulk rates on the same item, with the right one chosen for the customer and the quantity.
- **Make quotations that become bills.** Contractors compare estimates; once they agree, the bill should carry the quoted rates without retyping.
- **Deliver in parts.** Large orders go to site over several trips. Each challan should know what the bill still owes.
- **Track contractors and sites.** Udhaar per contractor with limits and terms, and what each site has received.
- **Handle sizes, shades and brands.** Pipe sizes, paint shades and cement brands each need their own stock.
- **Tell you what to reorder.** Fast items like cement and fittings should never run out on a busy morning.

Nafaa covers each of these in the hardware setup, together with purchasing, expenses and reports used by every Nafaa business.`),
    pricing("Plans for one store or a building material business"),
  ],
});

/** Internal links: the products a hardware store uses, related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'TAG' },
    { ref: 'INDUSTRY:retail', kind: 'RELATED' },
    { ref: 'INDUSTRY:electronics', kind: 'RELATED' },
    { ref: 'INDUSTRY:autoparts', kind: 'RELATED' },
  ],
} satisfies typeof entry;
