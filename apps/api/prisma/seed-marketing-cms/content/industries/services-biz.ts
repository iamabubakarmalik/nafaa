/** Industry: Field Service Business (/industries/services-biz). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "services-biz",
  title: "Field Service Business",
  shortName: "Services",
  shopNoun: "service businesses",
  romanUrduName: "Service ka kaam",
  group: "service",
  icon: "briefcase",
  color: "#0369a1",
  appIndustryKey: "services-biz",
  businessType: "SERVICE",
  sortOrder: 18,
  summary:
    "Nafaa runs field service businesses such as plumbers, electricians, AC technicians, IT support and cleaners: create jobs, dispatch technicians, send quotes, keep a service catalogue, manage AMC contracts and warranties, and bill and collect payment in the same app. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Plumbers, electricians, AC technicians, IT support and cleaning companies",
  romanUrdu:
    "Service business ke liye: naya job, technician bhejna, quote, service catalog, AMC contract, warranty, aur bill aur payment.",
  features: [
    { icon: "clipboard-list", title: "Jobs", body: "Create a job and follow it to the bill." },
    { icon: "navigation", title: "Dispatch", body: "Send the right technician." },
    { icon: "file-text", title: "Quotes", body: "Send a quote before the work." },
    { icon: "list", title: "Service catalogue", body: "Your services and rates." },
    { icon: "calendar-check", title: "AMC contracts", body: "Contracts with regular visits." },
    { icon: "shield-check", title: "Warranty", body: "Work under warranty." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/services-biz/ServicesBizPack.tsx"],
  dropped: [
  ],
});
