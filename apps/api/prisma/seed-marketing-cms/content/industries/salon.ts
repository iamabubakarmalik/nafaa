/** Industry: Salon & Beauty Parlour (/industries/salon). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "salon",
  title: "Salon & Beauty Parlour",
  shortName: "Salon",
  shopNoun: "salons and beauty parlours",
  romanUrduName: "Salon / beauty parlour",
  group: "service",
  icon: "scissors",
  color: "#a21caf",
  appIndustryKey: "salon",
  businessType: "SALON",
  sortOrder: 7,
  summary:
    "Nafaa runs salons and beauty parlours: book appointments on a calendar, keep a service list with prices, pay stylists commission per service, sell memberships, prepaid packages and gift vouchers, keep customer profiles, and bill services and products together at the salon counter.",
  builtFor: "Salons, beauty parlours and barber shops",
  romanUrdu:
    "Salon aur parlour ke liye: calendar par appointment, services aur rates, stylist ki commission, membership, package, gift voucher, aur gahak ki profile.",
  features: [
    { icon: "calendar-check", title: "Appointments", body: "Book and move appointments on a calendar." },
    { icon: "list", title: "Services", body: "A service list with prices, billed at the salon counter." },
    { icon: "percent", title: "Stylist commission", body: "Commission per stylist and service, worked out for you." },
    { icon: "id-card", title: "Memberships and packages", body: "Sell memberships and prepaid packages." },
    { icon: "gift", title: "Gift vouchers", body: "Sell vouchers and take them as payment." },
    { icon: "users", title: "Customer profiles", body: "Each customer's visits and services in one place." },
  ],
  faqKeys: ["salon-commission","salon-membership","pricing"],
  evidence: ["apps/web/src/industries/salon/SalonPack.tsx","apps/web/src/industries/salon/pos/BillPanel.tsx"],
  dropped: [
    "Online booking by customers with SMS confirmation (not found in the salon pack).",
    "Automatic Bronze/Silver/Gold/Platinum tiers (not checked).",
  ],
});
