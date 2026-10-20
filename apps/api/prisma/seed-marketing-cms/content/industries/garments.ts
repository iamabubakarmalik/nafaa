/** Industry: Garments & Boutique (/industries/garments). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "garments",
  title: "Garments & Boutique",
  shortName: "Garments",
  shopNoun: "garment shops and boutiques",
  romanUrduName: "Kapre ki dukaan / boutique",
  group: "retail",
  icon: "shirt",
  color: "#db2777",
  appIndustryKey: "garments",
  businessType: "CLOTHING",
  featured: true,
  sortOrder: 6,
  summary:
    "Nafaa runs garment shops and boutiques that sell ready-made and custom-stitched clothes: stock by size and colour, tailoring (silai) orders, alterations, saved customer measurements, items put on hold, qist plans, exchanges, collections and size charts, alongside the counter, khata and reports.",
  builtFor: "Garment shops, boutiques and tailors",
  romanUrdu:
    "Garments aur boutique ke liye: size aur rang ke hisaab se stock, silai order, alteration, gahak ka naap, hold, qist plan, exchange aur size chart.",
  features: [
    { icon: "shirt", title: "Size and colour", body: "Each size and colour is its own stock line." },
    { icon: "scissors", title: "Silai orders", body: "Tailoring orders with the customer's measurements." },
    { icon: "clipboard-list", title: "Measurements", body: "Save each customer's measurements and reuse them on the next order." },
    { icon: "repeat", title: "Alterations and exchanges", body: "Record alterations and exchange items at the counter." },
    { icon: "tag", title: "Hold and qist", body: "Hold an item for a customer or sell it on a qist plan." },
    { icon: "layers", title: "Collections and size charts", body: "Group stock by collection and keep size charts." },
  ],
  faqKeys: ["garments-variants","garments-measurements","garments-layaway","pricing"],
  evidence: ["apps/web/src/industries/garments/GarmentsPack.tsx","apps/web/src/industries/garments/components/MeasurementModal.tsx"],
  dropped: [
    "Automatic reminders on layaway plans (not checked).",
    "\"Unlimited\" variants wording.",
  ],
});
