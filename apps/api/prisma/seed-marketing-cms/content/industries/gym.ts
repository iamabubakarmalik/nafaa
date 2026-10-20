/** Industry: Gym & Fitness Club (/industries/gym). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "gym",
  title: "Gym & Fitness Club",
  shortName: "Gym",
  shopNoun: "gyms and fitness clubs",
  romanUrduName: "Gym",
  group: "service",
  icon: "dumbbell",
  color: "#dc2626",
  appIndustryKey: "gym",
  businessType: "GYM",
  sortOrder: 16,
  summary:
    "Nafaa runs gyms and fitness clubs: fast member check-in, memberships and renewals, plans, personal training packages with trainer commission, group classes, lockers and machine records, with fees and payments kept in one place. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Gyms, fitness clubs and training studios",
  romanUrdu:
    "Gym ke liye Nafaa: member check-in, membership aur renewal, personal training aur trainer ki commission, group classes, lockers aur machines.",
  features: [
    { icon: "user-check", title: "Check-in", body: "Fast member check-in at the door." },
    { icon: "id-card", title: "Memberships", body: "Memberships, plans and renewals." },
    { icon: "dumbbell", title: "Personal training", body: "PT packages with trainer commission." },
    { icon: "users", title: "Group classes", body: "Classes and who attends them." },
    { icon: "lock", title: "Lockers", body: "Locker assignment." },
    { icon: "settings", title: "Machines", body: "Records for each machine." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/gym/GymPack.tsx"],
  dropped: [
  ],
});
