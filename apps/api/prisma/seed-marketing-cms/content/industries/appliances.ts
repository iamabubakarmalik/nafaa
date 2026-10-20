/** Industry: Home Appliances (/industries/appliances). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "appliances",
  title: "Home Appliances",
  shortName: "Appliances",
  shopNoun: "home appliance shops",
  romanUrduName: "Home appliances ki dukaan",
  group: "retail",
  icon: "refrigerator",
  color: "#0e7490",
  appIndustryKey: "appliances",
  businessType: "APPLIANCES",
  sortOrder: 20,
  summary:
    "Nafaa runs home appliance shops: serial numbers and warranties, installations, repairs with technicians, AMC contracts, heavy deliveries, qist plans with a guarantor, trade-ins of old appliances, and brand warranty claims, alongside the normal counter, stock and khata. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Home appliance and electronics showrooms",
  romanUrdu:
    "Appliances ki dukaan ke liye: serial aur warranty, installation, repair, technician, AMC, delivery, guarantor ke saath qist plan, purana saman aur warranty claim.",
  features: [
    { icon: "barcode", title: "Serials and warranty", body: "Serial register with warranty by branch." },
    { icon: "wrench", title: "Installations and repairs", body: "Installations and repair requests with technicians." },
    { icon: "truck", title: "Deliveries", body: "Heavy deliveries." },
    { icon: "calendar", title: "Qist plans", body: "Instalments with a guarantor." },
    { icon: "arrow-left-right", title: "Trade-in", body: "Take old appliances in exchange." },
    { icon: "shield-check", title: "Warranty claims", body: "Brand warranty claims." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/appliances/AppliancesPack.tsx"],
  dropped: [
  ],
});
