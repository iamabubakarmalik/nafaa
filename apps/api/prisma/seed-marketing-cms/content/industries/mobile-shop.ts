/** Industry: Mobile Phone Shop (/industries/mobile-shop). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "mobile-shop",
  title: "Mobile Phone Shop",
  shortName: "Mobile shop",
  shopNoun: "mobile phone shops",
  romanUrduName: "Mobile shop",
  group: "retail",
  icon: "smartphone",
  color: "#1d4ed8",
  appIndustryKey: "mobile",
  businessType: "MOBILE",
  featured: true,
  sortOrder: 5,
  summary:
    "Nafaa runs mobile phone shops: keep stock by IMEI, record each phone's PTA status, buy used phones and take trade-ins, open repair job cards, and sell on instalments with a qist plan, while the counter, khata and reports work the same as in any shop.",
  builtFor: "Mobile phone shops, accessory shops and repair counters",
  romanUrdu:
    "Mobile shop ke liye Nafaa: IMEI ke hisaab se stock, har phone ka PTA status, used phone ki khareed aur trade-in, repair job card, aur qist plan.",
  features: [
    { icon: "barcode", title: "IMEI stock", body: "Every phone is kept by its IMEI, from purchase to sale." },
    { icon: "shield-check", title: "PTA status", body: "Record the PTA status of each IMEI." },
    { icon: "arrow-left-right", title: "Used phones and trade-in", body: "Buy used phones and take them in part-exchange." },
    { icon: "wrench", title: "Repair job cards", body: "Open a repair ticket, follow it and hand the phone back." },
    { icon: "calendar", title: "Qist plans", body: "Sell on instalments and follow up what is due." },
    { icon: "notebook-pen", title: "Khata", body: "Udhaar and payments per customer, with WhatsApp reminders." },
  ],
  faqKeys: ["mobile-imei","mobile-used","offline","pricing"],
  evidence: ["apps/web/src/industries/mobile/MobilePack.tsx"],
  dropped: [
    "Automatic PTA tax calculation (the app records PTA status per IMEI only).",
    "Inspection checklist and buyback price claims (not checked).",
  ],
});
