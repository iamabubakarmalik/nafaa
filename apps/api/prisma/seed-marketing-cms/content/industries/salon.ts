/** Industry: Salon & Beauty Parlour (/industries/salon). Imported from apps/marketing and checked against the app. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "calendar-check", title: "Appointments", body: "Book and move appointments on a day board with one column per stylist; tap a free slot to book it." },
    { icon: "users", title: "Walk-ins and queue", body: "Today's floor at a glance: waiting, in the chair, late and done, with advances held." },
    { icon: "list", title: "Services", body: "Rate, time, commission and who each service is for: men, women or kids." },
    { icon: "receipt", title: "Salon counter", body: "Bill services with their stylist and retail products on one bill, with membership discount or a package session." },
    { icon: "percent", title: "Stylist commission", body: "Commission per stylist and service from billed work, with returned services taken back, paid from the drawer." },
    { icon: "id-card", title: "Memberships and packages", body: "Memberships with a discount on services, and prepaid packages such as 5 facials or a bridal package with trials." },
    { icon: "gift", title: "Gift vouchers", body: "Sell a voucher, print it, and take it as payment by typing its code on the bill." },
    { icon: "clipboard-list", title: "Customer profiles", body: "Visit history, colour formula notes, products used and allergies, read by the stylist before starting." },
    { icon: "message-circle", title: "WhatsApp reminders", body: "Send a customer a reminder of their appointment in one tap." },
  ],
  faqKeys: ["salon-commission","salon-membership","pricing"],
  evidence: [
    "apps/web/src/industries/salon/SalonPack.tsx",
    "apps/web/src/industries/salon/pos/BillPanel.tsx",
    "apps/web/src/industries/salon/pages/CalendarViewPage.tsx",
    "apps/web/src/industries/salon/pages/AppointmentsPage.tsx",
    "apps/web/src/industries/salon/pages/NewAppointmentPage.tsx",
    "apps/web/src/industries/salon/pages/SalonPosPage.tsx",
    "apps/web/src/industries/salon/pages/ServicesPage.tsx",
    "apps/web/src/industries/salon/pages/StaffPage.tsx",
    "apps/web/src/industries/salon/pages/CommissionPayoutPage.tsx",
    "apps/web/src/industries/salon/pages/MembershipsPage.tsx",
    "apps/web/src/industries/salon/pages/PackagesPage.tsx",
    "apps/web/src/industries/salon/pages/GiftVouchersPage.tsx",
    "apps/web/src/industries/salon/pages/CustomersPage.tsx",
    "apps/web/src/industries/salon/components/appointments.tsx",
  ],
  dropped: [
    "Online booking by customers with SMS confirmation (not found in the salon pack).",
    "Automatic Bronze/Silver/Gold/Platinum tiers (not checked).",
  ],
  heroOverride: {
    heading: "Bookings, stylists and the salon counter in one app",
    sub: "See every stylist's day on one board, take walk-ins without double-booking, bill services and products together, and pay commission from the work that was actually billed.",
    badges: ["Stylist day board", "Commission", "Packages and vouchers"],
    media: { mediaId: SHOT.salonCounter, url: "app.nafaa.pk/pos" },
  },
  deepBlocks: [
    steps("A day at the salon", [
      ["Morning", "Open the day board: one column per stylist, today's bookings as blocks, and a red line at the current time. Send WhatsApp reminders to the afternoon's customers."],
      ["A regular arrives", "Mark her arrived. Her profile shows the last visits, the colour formula used and an allergy note before the stylist starts."],
      ["A walk-in", "Find a free slot on the board for a stylist who is not busy, and book it with one tap."],
      ["At the counter", "Pick the customer from the queue, add the services with their stylist, a shampoo she is buying, and her membership discount or a package session."],
      ["Month end", "Each stylist's commission statement lists the billed services, leaves out voided bills and takes back returned services. Pay it from the drawer and print the slip."],
    ]),
    shot({
      heading: "Your team, on duty and selling",
      body: "The staff screen shows who is working today, who is on duty now and what each person sold. Stylists who never log in still appear on the list, with their calls and WhatsApp one tap away.",
      id: SHOT.salonStaff,
      url: "app.nafaa.pk/staff",
      layout: "full",
      callouts: [
        { x: 38, y: 20, label: "Today's sale by staff" },
        { x: 32, y: 63.7, label: "Who is on duty now" },
        { x: 85.5, y: 59.4, label: "Stylists without a login still listed" },
        { x: 53, y: 69.7, label: "Call or WhatsApp a team member" },
      ],
    }),
    shot({
      heading: "Package and membership balances on the khata",
      body: "A bridal package can be sold with an advance and the rest on the customer's khata. The khata shows what each customer still owes and how long it has been pending.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "Shared khata screen, shown with demo data.",
      callouts: [
        { x: 33, y: 19.5, label: "Total still to collect" },
        { x: 90.5, y: 62, label: "Record a payment or send a reminder" },
      ],
    }),
    table("Appointment diary or Nafaa?", "How the main jobs of a salon compare in a diary and in Nafaa.", [
      { key: "paper", label: "Appointment diary" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Bookings", "One diary, crossed out and rewritten", "A board per stylist with free slots visible"],
      ["Commission", "Worked out at month end from slips", "From billed services, returns taken back"],
      ["Packages", "Sessions ticked on a card the customer loses", "Sessions left, used on counter bills"],
      ["Customer history", "Remembered by one stylist", "Visits, formula notes and allergies on the profile"],
      ["Gift vouchers", "A printed card with no record", "Each voucher's balance and the bills it paid"],
    ]),
    prose(`## What to look for in salon software

A salon sells time, skill and a few products. Most of the money comes through appointments, and most disputes come from commission. Before you choose, check that the software can:

- **Show each stylist's day.** A column per stylist makes double-booking obvious and free slots easy to find for walk-ins.
- **Bill services and products together.** A haircut by one stylist, a facial by another and a bottle of serum should be one bill.
- **Work out commission from billed work.** Not from a list someone types at month end, and with voided bills and returned services handled.
- **Sell memberships, packages and vouchers.** Each with its own balance, used at the counter rather than tracked on paper cards.
- **Keep customer notes that matter.** Colour formulas, products used and allergies, read before the service starts.
- **Remind customers.** A WhatsApp message the day before cuts no-shows.

Nafaa covers each of these in the salon setup, with the same khata, expenses and reports every Nafaa business uses. Customers cannot book themselves online yet; bookings are made by the salon.`),
    pricing("Plans for one salon or several branches"),
  ],
});

/** Internal links: the products a salon uses, related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:loyalty', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'INDUSTRY:cosmetics', kind: 'RELATED' },
    { ref: 'INDUSTRY:gym', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
  ],
} satisfies typeof entry;
