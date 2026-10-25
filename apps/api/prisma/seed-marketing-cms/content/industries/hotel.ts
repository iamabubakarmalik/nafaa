/** Industry: Hotel & Guest House (/industries/hotel). Imported from apps/marketing and checked against the hotel pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "hotel",
  title: "Hotel & Guest House",
  shortName: "Hotel",
  shopNoun: "hotels and guest houses",
  romanUrduName: "Hotel / guest house",
  group: "service",
  icon: "hotel",
  color: "#4f46e5",
  appIndustryKey: "hotel",
  businessType: "HOTEL",
  sortOrder: 15,
  summary:
    "Nafaa runs hotels, guest houses, motels and resorts: a room board, bookings and guests, housekeeping, room types, seasonal and weekend rates, extra charges posted to the room bill, and a night audit report, with billing and khata built in. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Hotels, guest houses, motels and resorts",
  romanUrdu:
    "Hotel aur guest house ke liye: room board, booking, guests, housekeeping, season ke rate, room bill par extra charges aur night audit.",
  features: [
    { icon: "bed", title: "Room board", body: "Every room by floor: the guest in it, today's arrival, cleaning or repair, with one tap to book, check in a walk-in or open the stay." },
    { icon: "calendar-check", title: "Bookings and walk-ins", body: "Pick rooms free on every night of the stay, find an old guest by name, phone or CNIC, and take an advance." },
    { icon: "id-card", title: "Guest register", body: "ID for the police record, company, VIP and blacklist flags, every stay and its bill; prints as the register." },
    { icon: "receipt-text", title: "Folio charges", body: "Room service, laundry and minibar on the room's folio; check out with one bill, split payment or the company's khata." },
    { icon: "arrow-left-right", title: "Extend and change rooms", body: "Extend a stay, move the guest to another room, or record a cancellation or no-show with the advance refund." },
    { icon: "sparkles", title: "Housekeeping", body: "Check-out creates the cleaning job; when the cleaner finishes, an empty room is ready to sell. Problems send a room to repair." },
    { icon: "calendar-clock", title: "Season rates", body: "Weekend rates and Eid, summer, off-season, corporate or long-stay plans over a date range. Bookings already made keep their price." },
    { icon: "chart-bar", title: "Night audit", body: "Who should have arrived or left, who is in and owes how much, the night's occupancy and ADR, then close the day." },
  ],
  faqKeys: ["devices", "offline", "pricing"],
  evidence: [
    "apps/web/src/industries/hotel/HotelPack.tsx",
    "apps/web/src/industries/hotel/pages/RoomsPage.tsx",
    "apps/web/src/industries/hotel/pages/NewBookingPage.tsx",
    "apps/web/src/industries/hotel/pages/BookingsPage.tsx",
    "apps/web/src/industries/hotel/pages/HotelBookingDetailPage.tsx",
    "apps/web/src/industries/hotel/components/StayModals.tsx",
    "apps/web/src/industries/hotel/pages/GuestsPage.tsx",
    "apps/web/src/industries/hotel/pages/HousekeepingPage.tsx",
    "apps/web/src/industries/hotel/pages/RatePlansPage.tsx",
    "apps/web/src/industries/hotel/pages/HotelReportsPage.tsx",
    "apps/web/src/industries/hotel/components/OccupancyPanel.tsx",
    "apps/web/src/industries/hotel/pages/HotelPosPage.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "Rooms, guests and the front desk in one app",
    sub: "See every room's state on one board, book and check in guests with their ID, post room service and laundry to the folio, and close each night with an audit that matches the cash.",
    badges: ["Room board", "Folio and check-out", "Night audit"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    steps("A guest's stay, from booking to check-out", [
      ["Booking", "A family calls for two nights over Eid. Pick rooms free on both nights at the Eid rate, note the guest and take an advance on JazzCash."],
      ["Check-in", "Record the guest's ID and print the registration card. The room board shows the room as occupied."],
      ["During the stay", "Room service, laundry and minibar go on the folio. A meal at the hotel's restaurant counter can go on the guest's khata. Extend a night or change rooms if needed."],
      ["Check-out", "Print the folio bill and take payment, split between methods or on the company's khata. The cleaning job is created at once."],
      ["Night audit", "Before closing the day, check missed arrivals and departures, who is in and owes how much, and the day's money by method."],
    ]),
    shot({
      heading: "The front desk's day on one screen",
      body: "The hotel dashboard adds rooms, today's check-ins and check-outs, guests in house, housekeeping and booking sources to the day's sale, profit and cash.",
      id: SHOT.dashboard,
      url: "app.nafaa.pk/dashboard",
      layout: "full",
      caption: "The shared dashboard, shown with demo data; hotel widgets sit on the same page.",
      callouts: [
        { x: 28, y: 27, label: "Today's sale and bills" },
        { x: 57, y: 52, label: "Cash in the drawer" },
        { x: 40, y: 72, label: "What needs you today" },
      ],
    }),
    shot({
      heading: "Companies and guests who settle later",
      body: "A company that books rooms for its staff can pay through its own khata. Restaurant and tuck-shop bills for an in-house guest also land on the khata the desk sees at check-out.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "The shared khata, shown with demo data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 58, y: 30, label: "Balances by age" },
      ],
    }),
    table("Register and room chart, or Nafaa?", "How the everyday jobs of a hotel compare on paper and on Nafaa.", [
      { key: "paper", label: "Register and room chart" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Which rooms are free", "A chart on the wall, updated by hand", "A room board that changes with every booking and check-out"],
      ["Season and weekend rates", "Remembered by the manager", "Applied night by night from the rate plans"],
      ["Extra charges", "Slips that reach the desk late", "Posted to the folio during the stay"],
      ["Room cleaning", "Shouted down the corridor", "A job made at check-out, finished by the cleaner"],
      ["End of the day", "Cash counted, rooms not reconciled", "Night audit with occupancy, dues and money by method"],
    ]),
    prose(`## What to look for in hotel software

A small hotel or guest house sells room-nights, and every empty night is gone for good. The front desk has to know at a glance which rooms are free, clean and ready, and the owner needs to trust that every charge reached the bill. Before you choose software, check that it can:

- **Show rooms, not just bookings.** A board by floor with who is in each room, who arrives today and which rooms are being cleaned or repaired.
- **Price by night.** Weekend rates and seasonal plans such as Eid or summer holidays should apply to each night automatically, without changing bookings already made.
- **Keep a proper guest register.** ID details for the police record, repeat guests found by phone or CNIC, and VIP or blacklist flags.
- **Carry charges to the folio.** Room service, laundry and minibar should be on the bill before the guest reaches the desk.
- **Handle companies.** Corporate guests often pay later; their bills need a khata of their own.
- **Close the day properly.** A night audit that checks arrivals, departures, dues and the cash by method, with occupancy, ADR and RevPAR over time.

Nafaa does all of this in the browser on the desk computer or a phone, and its counter also runs the hotel's restaurant or tuck shop.`),
    pricing("Plans for one property or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and khata with demo data; no hotel-specific screenshots exist yet.",
});

/** Internal links: the products hotels use, the matching solutions and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:payments', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
  ],
} satisfies typeof entry;
