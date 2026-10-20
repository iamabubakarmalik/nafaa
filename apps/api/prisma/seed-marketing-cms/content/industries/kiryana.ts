/** Industry: Kiryana & Grocery Store (/industries/kiryana). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "kiryana",
  title: "Kiryana & Grocery Store",
  shortName: "Kiryana",
  shopNoun: "kiryana and grocery stores",
  romanUrduName: "Kiryana / general store",
  group: "retail",
  icon: "store",
  color: "#065f46",
  colorNote: "App identity #059669 is 3.77:1 with white text; seeded #065f46 instead (Phase 1 issue 7); emerald-700 is taken by the General store identity.",
  appIndustryKey: "retail",
  businessType: "GROCERY",
  featured: true,
  sortOrder: 1,
  summary:
    "Nafaa is POS and khata software for kiryana and grocery stores in Pakistan. Scan barcodes at the counter, sell by piece, dozen or carton, keep every customer's udhaar in a digital khata with WhatsApp reminders, import products from Excel, and keep billing when the internet drops.",
  builtFor: "Kiryana, grocery and general stores, from one counter to several branches",
  romanUrdu:
    "Nafaa kiryana aur grocery store ke liye POS aur khata app hai. Barcode se bill banayein, piece, darjan ya carton me bechein, udhaar digital khata me rakhein aur WhatsApp par yaad-dihani bhejein. Internet na ho to bhi counter chalta rehta hai.",
  features: [
    { icon: "scan-barcode", title: "Barcode counter", body: "Scan with a barcode scanner, search by name, or tap a quick key for loose items." },
    { icon: "layers", title: "Piece, dozen and carton", body: "Sell one product in more than one unit, each with its own price." },
    { icon: "notebook-pen", title: "Digital khata", body: "Udhaar, payments and old-register balances per customer, with WhatsApp reminders sent one by one." },
    { icon: "file-spreadsheet", title: "Import from Excel", body: "Download a template, upload your list, check it in a dry run, then import." },
    { icon: "gift", title: "Combos and deals", body: "Bundle items into a combo with its own price." },
    { icon: "triangle-alert", title: "Damage and low stock", body: "Record broken or expired stock and see what is running low." },
  ],
  faqKeys: ["devices","kiryana-units","kiryana-import","khata-reminders","offline","pricing"],
  evidence: ["apps/web/src/industries/retail/RetailPack.tsx","apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx","apps/web/src/modules/pos/quick-keys"],
  dropped: [
    "\"95% udhaar recovery\" and other uncounted results.",
    "\"#1 kiryana store software in Pakistan\" claim.",
    "Voice input and \"every screen in proper Urdu\" (not found in the app).",
    "Key metrics (3 seconds per sale, 4 hours saved daily, zero lost records): no measurement behind them.",
    "Testimonial t5 (no recorded consent).",
  ],
  needsOwner: ["Separate wholesale and retail price lists for the same product: confirm before claiming."],
  writerNotes: "Owner decision O11 (pending): slug stays /industries/kiryana; use \"grocery\" in the copy.",
});
