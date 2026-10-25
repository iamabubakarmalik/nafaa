/** Industry: Gym & Fitness Club (/industries/gym). Imported from apps/marketing and checked against the gym pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "user-check", title: "Front-desk check-in", body: "Scan a card or QR, or type the number or phone. A running member goes in with one key; an ended or frozen card is stopped with the reason." },
    { icon: "id-card", title: "Memberships", body: "Sell, renew, freeze, unfreeze or cancel, and take dues. Unpaid fees go on the member's khata." },
    { icon: "target", title: "Plans", body: "Monthly, quarterly, yearly, couple or student plans with admission fee, deposit, visit limit, gym hours and freeze rules." },
    { icon: "dumbbell", title: "Personal training", body: "Single sessions, sessions from a plan, or PT packages sold ahead; each completed session earns the trainer's commission." },
    { icon: "calendar", title: "Group classes", body: "Yoga, zumba, aerobics or boxing on a repeat schedule, with seats booked and attendance." },
    { icon: "lock", title: "Lockers", body: "Who has which locker and until when; one tap puts a month's rent on khata for every locker that ran out." },
    { icon: "activity", title: "Machines", body: "Treadmills, cycles and racks with their next service date and repair costs as expenses." },
    { icon: "bell", title: "Renewal reminders", body: "Members ending soon or with fees due, each with a WhatsApp reminder link." },
    { icon: "shopping-bag", title: "Supplements and day passes", body: "Sell shakes, supplements, day passes and towels at the counter, with the member's plan and dues shown on the bill." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/gym/GymPack.tsx",
    "apps/web/src/industries/gym/pages/AttendancePage.tsx",
    "apps/web/src/industries/gym/pages/MembershipsPage.tsx",
    "apps/web/src/industries/gym/components/MembershipModals.tsx",
    "apps/web/src/industries/gym/pages/PlansPage.tsx",
    "apps/web/src/industries/gym/pages/PTSessionsPage.tsx",
    "apps/web/src/industries/gym/pages/TrainersPage.tsx",
    "apps/web/src/industries/gym/pages/ClassesPage.tsx",
    "apps/web/src/industries/gym/pages/LockersPage.tsx",
    "apps/web/src/industries/gym/pages/EquipmentPage.tsx",
    "apps/web/src/industries/gym/pages/MemberDetailPage.tsx",
    "apps/web/src/industries/gym/pos/config.ts",
    "apps/web/src/industries/gym/dashboard/useGymOps.ts",
  ],
  dropped: [],
  needsOwner: ["Diet plans: a feature flag exists (gymDietPlans) but no page was found; confirm before the page mentions it."],
  heroOverride: {
    heading: "Memberships, check-in and fees for your gym in one app",
    sub: "Check members in at the desk in seconds, stop expired cards politely, renew and freeze memberships, pay trainers their PT commission, and see who owes fees before the month ends.",
    badges: ["Fast check-in", "Renewals and freezes", "PT commission"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    steps("A day at the gym desk", [
      ["Opening", "The dashboard shows who is inside, today's classes, memberships about to run out, unpaid dues and machines due for service."],
      ["Check-in", "A member scans his card. Days left and any fee due show on screen; if the membership has ended, the desk sees why and can renew it there."],
      ["Guests and classes", "Log a guest against the member who brought him, and mark attendance for the 7 pm zumba class."],
      ["Personal training", "Mark the trainer's session as done. It counts against the member's PT package and earns the trainer's commission."],
      ["Day close", "Check everyone out, take the day's renewals, and send WhatsApp reminders to members whose fees are due."],
    ]),
    shot({
      heading: "Fees owed, by member and by age",
      body: "Every membership, renewal, PT package and locker rent posts a bill. Whatever is not paid goes on the member's khata, so the fee register is always the same as the accounts, and overdue members stand out.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "full",
      caption: "The shared khata, shown with demo data.",
      callouts: [
        { x: 25, y: 19, label: "Total fees to collect" },
        { x: 58, y: 30, label: "Dues by age" },
        { x: 90, y: 55, label: "Take a payment or remind" },
      ],
    }),
    shot({
      heading: "Trainers and desk staff with the right access",
      body: "Staff and roles decide who can sell memberships, take fees or pay commission. Trainer commission is earned on each completed session, and paying it is recorded as an expense.",
      id: SHOT.staff,
      url: "app.nafaa.pk/staff",
      layout: "split-right",
      caption: "The shared staff screen, shown with demo data.",
      callouts: [
        { x: 22, y: 19, label: "Who is at work" },
        { x: 32, y: 48, label: "Roles and permissions" },
      ],
    }),
    table("Fee register or Nafaa?", "How the everyday jobs of a gym compare on a paper register and on Nafaa.", [
      { key: "paper", label: "Fee register" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Checking a member in", "Search the register, or just wave him in", "Scan the card; days left and dues on screen"],
      ["Expired memberships", "Found weeks later", "Stopped at the desk with a Renew button"],
      ["Freezing a membership", "A note in the margin", "Freeze and unfreeze under the plan's rules"],
      ["Trainer commission", "Counted from memory at month end", "Earned per completed session, paid as an expense"],
      ["Locker rent", "Chased member by member", "One tap bills every locker whose rent ran out"],
    ]),
    prose(`## What to look for in gym software

A gym earns from members who pay every month, so its software is really a membership and fee system with a front desk attached. Shop billing software can sell a supplement but cannot tell you who walked in on an expired card. Before you choose, check that it can:

- **Check members in quickly.** A card, a QR code or a phone number at the desk, with days left and fees due on screen, and a clear stop for ended or frozen memberships.
- **Model your real plans.** Monthly, quarterly, yearly, couple and student plans, admission fees on the first membership only, deposits, visit limits and freeze rules.
- **Keep fees and accounts the same.** Every membership and renewal should be a bill, with unpaid parts on the member's khata, so the fee list matches your profit.
- **Pay trainers fairly.** PT packages counted session by session, with commission earned only on completed sessions.
- **Bring members back.** A list of memberships ending soon and a reminder on WhatsApp keeps renewals coming.
- **Cover the rest of the floor.** Classes, lockers, machines and the supplement counter belong in the same app.

Nafaa does this on a phone, tablet or computer at the desk, with the same reports as every Nafaa business.`),
    pricing("Plans for one gym or several"),
  ],
  writerNotes: "Screenshots are the shared khata and staff screens with demo data; no gym-specific screenshots exist yet.",
});

/** Internal links: the products gyms use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:salon', kind: 'RELATED' },
    { ref: 'INDUSTRY:sports', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-customer-retention', kind: 'RELATED' },
  ],
} satisfies typeof entry;
