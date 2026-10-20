/** Industry: Auto Parts & Workshop (/industries/autoparts). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "autoparts",
  title: "Auto Parts & Workshop",
  shortName: "Auto parts",
  shopNoun: "auto parts shops and workshops",
  romanUrduName: "Auto parts / workshop",
  group: "specialty",
  icon: "wrench",
  color: "#475569",
  appIndustryKey: "autoparts",
  businessType: "AUTO_PARTS",
  sortOrder: 9,
  summary:
    "Nafaa runs auto parts shops and workshops: parts matched to vehicle make and model, customer vehicles, workshop job cards with mechanics, service reminders for oil change, token tax and insurance, and returned old parts, together with the counter, stock and khata.",
  builtFor: "Auto parts shops, workshops and service stations",
  romanUrdu:
    "Auto parts aur workshop ke liye: company aur model ke hisaab se parts, gahak ki gaariyan, workshop job card, mechanic, aur oil, token aur insurance ki yaad-dihani.",
  features: [
    { icon: "car", title: "Make and model fitment", body: "Find the parts that fit a vehicle." },
    { icon: "clipboard-list", title: "Workshop jobs", body: "Open a job card for each vehicle and bill it when done." },
    { icon: "users", title: "Mechanics", body: "Assign jobs to mechanics." },
    { icon: "bell", title: "Service reminders", body: "Reminders for oil change, token tax and insurance." },
    { icon: "rotate-ccw", title: "Old parts", body: "Record old parts returned against new ones." },
    { icon: "car", title: "Customer vehicles", body: "Keep each customer's vehicles and their history." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/autoparts/AutoPartsPack.tsx"],
  dropped: [
  ],
});
