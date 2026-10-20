/** Industry: General Retail Shop (/industries/retail). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "retail",
  title: "General Retail Shop",
  shortName: "Retail",
  shopNoun: "retail shops",
  romanUrduName: "Koi bhi dukaan",
  group: "retail",
  icon: "shopping-bag",
  color: "#047857",
  appIndustryKey: "standard",
  businessType: "GENERAL",
  sortOrder: 28,
  summary:
    "Nafaa works for any shop that does not fit a specific industry: a fast counter with quick keys and barcodes, combos, stock with low-stock and damage records, bulk import from Excel, a digital khata for udhaar, and reports on sales and profit, all in one app.",
  builtFor: "Any shop that sells goods over a counter",
  romanUrdu:
    "Agar aap ki dukaan kisi khaas industry me nahi aati to bhi Nafaa chalta hai: tez counter, quick keys, barcode, combo, stock, khata aur reports.",
  features: [
    { icon: "zap", title: "Quick keys", body: "One tap for the items you sell most." },
    { icon: "gift", title: "Combos", body: "Bundle items with their own price." },
    { icon: "triangle-alert", title: "Damage and low stock", body: "Record damage and see what is running low." },
    { icon: "file-spreadsheet", title: "Excel import", body: "Bring your product list in from a spreadsheet." },
    { icon: "notebook-pen", title: "Khata", body: "Udhaar per customer with WhatsApp reminders." },
    { icon: "chart-column", title: "Reports", body: "Sales and profit reports." },
  ],
  faqKeys: ["devices","khata-reminders","offline","pricing"],
  evidence: ["apps/web/src/industries/retail/RetailPack.tsx","apps/web/src/modules/pos/quick-keys"],
  dropped: [
    "\"Fastest general retail POS in Pakistan, 3 sec checkout\" (unmeasured).",
    "\"Auto reorder\" (the general setup shows low stock; it does not place orders).",
  ],
});
