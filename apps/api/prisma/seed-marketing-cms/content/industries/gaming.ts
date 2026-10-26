/** Industry: Gaming Shop & Cyber Cafe (/industries/gaming). Imported from apps/marketing and checked against the gaming pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "gaming",
  title: "Gaming Shop & Cyber Cafe",
  shortName: "Gaming",
  shopNoun: "gaming shops and cyber cafes",
  romanUrduName: "Gaming zone / cyber cafe",
  group: "lifestyle",
  icon: "gamepad-2",
  color: "#7c3aed",
  appIndustryKey: "gaming",
  businessType: "GAMING",
  sortOrder: 25,
  summary:
    "Nafaa runs gaming shops and cyber cafes: live billing for PC and console stations, console rentals, top-up cards such as PUBG UC, PSN and Google Play, tournaments, and sales of consoles, games and PC parts at the counter, with stock and khata in the same app.",
  builtFor: "Gaming shops, gaming zones and cyber cafes",
  romanUrdu:
    "Gaming zone aur cyber cafe ke liye: stations ki live billing, console rental, top-ups, tournaments, aur consoles aur games ki sale.",
  features: [
    { icon: "timer", title: "Cafe Live", body: "Every station with its clock: start, pause, resume and bill a session, here or at the counter." },
    { icon: "monitor", title: "Stations and rates", body: "Each PS5, PC, simulator or room with normal, half-hour, peak and off-peak rates and a minimum billed time." },
    { icon: "receipt", title: "One bill for everything", body: "Station time, top-up cards, snacks and games on one bill, paid in cash, wallet, split or on the player's khata." },
    { icon: "credit-card", title: "Top-up cards by code", body: "Load card codes one by one or in a batch; the code and PIN show after the bill to hand to the customer." },
    { icon: "repeat", title: "Console and game rentals", body: "Rent by the day with a security deposit; late and damage fees come out of the deposit on return." },
    { icon: "trophy", title: "Tournaments", body: "Each entry fee is its own bill, and prizes are paid from the drawer as expenses." },
    { icon: "gamepad-2", title: "Consoles, games and PC parts", body: "Platform, condition (new or used), edition and what is in the box on every item." },
    { icon: "wrench", title: "Stations under repair", body: "Mark a station as under repair so nobody can start a session on it." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/gaming/GamingPack.tsx",
    "apps/web/src/industries/gaming/pos/config.ts",
    "apps/web/src/industries/gaming/pos/CardCodes.tsx",
    "apps/web/src/industries/gaming/pages/GamingCafeLivePage.tsx",
    "apps/web/src/industries/gaming/pages/GamingStationsPage.tsx",
    "apps/web/src/industries/gaming/pages/GamingTopupsPage.tsx",
    "apps/web/src/industries/gaming/pages/GamingRentalsPage.tsx",
    "apps/web/src/industries/gaming/pages/GamingTournamentsPage.tsx",
    "apps/web/src/industries/gaming/pages/GamingProductWizardPage.tsx",
    "apps/web/src/industries/gaming/dashboard/useGamingOps.ts",
  ],
  dropped: ["\"Xbox\" top-ups named in the old copy: the app takes any card kind the shop adds; the code names PUBG UC, PSN and Google Play as examples."],
  heroOverride: {
    heading: "Station clocks, top-up cards and the counter on one bill",
    sub: "Run every PC and console station on a live clock, sell PUBG UC and PSN cards by code, rent consoles against a deposit and hold tournaments, with one bill for time, cards and snacks.",
    badges: ["Live station billing", "Card codes", "Rentals with deposit"],
    media: { mediaId: SHOT.gamingStations, url: "app.nafaa.pk/gaming/stations" },
  },
  deepBlocks: [
    steps("An evening at the gaming zone", [
      ["Players arrive", "Start a session on a free PS5 with the player and the game, and pick the normal, peak or off-peak rate set for that station."],
      ["During play", "Pause the clock for a break and resume it. A session started by mistake is cancelled with a reason."],
      ["Snacks and cards", "At the counter, tap the running session to put its time on the bill, add a drink and a PUBG UC card, and take the money."],
      ["Card handed over", "The card's code and PIN appear after the bill is saved; copy or print it for the player."],
      ["Closing", "See each station's hours and money, and revenue split between cafe time, top-ups and rentals."],
    ]),
    shot({
      heading: "Every station's clock and bill, live",
      body: "Start a session on a PC, PS5 or simulator and the time runs against that station's hourly rate. The live view shows which stations are busy, who is playing what, the time played and the running bill, and the session is billed with snacks in one step.",
      id: SHOT.gamingCafe,
      url: "app.nafaa.pk/gaming/cafe",
      layout: "full",
      callouts: [
        { x: 20, y: 19.5, label: "Stations running now" },
        { x: 29.8, y: 20.3, label: "Running bill" },
        { x: 25, y: 65, label: "Time played, player and game" },
        { x: 27.7, y: 72.4, label: "Bill the session" },
        { x: 88.1, y: 72.2, label: "Start a free station" },
      ],
    }),
    shot({
      heading: "Regular players who pay later",
      body: "Station time, rent and tournament entries can go on a player's khata. See who owes what, for how long, and send a reminder on WhatsApp.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "The shared khata, shown with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 90, y: 55, label: "Payment or reminder" },
      ],
    }),
    table("Wall clock and notebook, or Nafaa?", "How the everyday jobs of a gaming zone compare on paper and on Nafaa.", [
      { key: "paper", label: "Wall clock and notebook" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Station time", "Start time written down, totals argued over", "A clock per station with your rates"],
      ["Top-up cards", "Codes in a phone note or a diary", "Codes in stock, shown again if a card must be re-sent"],
      ["Console rentals", "Deposit in the galla, mixed with sales", "Rent billed, deposit kept aside, fees taken from it"],
      ["Tournament money", "Entry fees in a pocket, prizes from the drawer", "Entries as bills, prizes as expenses"],
      ["Which station earns", "Nobody knows", "Hours and money for every station"],
    ]),
    prose(`## What to look for in gaming zone software

A gaming zone sells time, not just things. Most of its money comes from stations billed by the hour, with digital cards, snacks and rentals on the side. Regular retail software cannot run a clock, and cafe timers cannot sell a card or keep a khata. Before you choose, check that it can:

- **Bill stations by time.** Different rates for normal and peak hours, half-hour billing and a minimum, with pause and resume for breaks.
- **Put time and goods on one bill.** A player should pay once for two hours on the PS5, a drink and a UC card.
- **Keep card codes safe.** Codes held in stock, handed out only after payment, and shown again if a customer loses the message.
- **Handle rentals with a deposit.** The deposit is not income; late and damage fees should come out of it and the rest go back.
- **Account for tournaments.** Entry fees as sales and prizes as expenses, so the event's real result is visible.
- **Show which stations earn.** Hours and money per station decide whether to add another PS5 or another PC.

Nafaa does this on the computer or phone at your counter, with the same stock, khata and reports as any shop.`),
    pricing("Plans for one zone or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and khata with demo data; no gaming-specific screenshots exist yet.",
});

/** Internal links: the products gaming zones use, the matching solution and related trades. */
export default {
  ...entry,
  seoDescription: 'Software for gaming shops and cyber cafes: live billing for PC and console stations, console rentals, top-up cards, tournaments and counter sales.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics', kind: 'RELATED' },
    { ref: 'INDUSTRY:toystore', kind: 'RELATED' },
    { ref: 'INDUSTRY:mobile-shop', kind: 'RELATED' },
  ],
} satisfies typeof entry;
