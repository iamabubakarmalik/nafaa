/** Industry: Florist & Flower Shop (/industries/florist). Imported from apps/marketing and checked against the florist pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "florist",
  title: "Florist & Flower Shop",
  shortName: "Florist",
  shopNoun: "florists and flower shops",
  romanUrduName: "Phoolon ki dukaan",
  group: "lifestyle",
  icon: "flower-2",
  color: "#e11d48",
  appIndustryKey: "florist",
  businessType: "FLORIST",
  sortOrder: 23,
  summary:
    "Nafaa runs florists and flower shops: bouquet and occasion orders, today's delivery list, wedding decoration contracts, regular flower subscriptions, and freshness tracking so ageing stock is sold or written off in time, with the counter and khata built in. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Florists, flower shops and event decorators",
  romanUrdu:
    "Phoolon ki dukaan ke liye: bouquet aur mauqe ke order, aaj ki delivery, shaadi ke contract, subscriptions, aur phoolon ki freshness.",
  features: [
    { icon: "flower-2", title: "Stems, bunches and dozens", body: "Each flower with its colour, stem count and how many days it stays fresh; sell by the stem, bunch or dozen." },
    { icon: "gift", title: "Bouquets from stems", body: "A bouquet is a recipe of stems, so selling one takes every stem off stock." },
    { icon: "truck", title: "Delivery orders", body: "Recipient, address, card message, day and time slot on the bill; move the order from being made to with the rider to delivered." },
    { icon: "calendar-check", title: "Today's deliveries", body: "Everything going out today, with the busy slots and areas, and a delivery slip that prints the card message." },
    { icon: "heart", title: "Wedding contracts", body: "Quote, confirm with an advance, take payments on the family's khata, and bill when the decoration is done." },
    { icon: "repeat", title: "Flower subscriptions", body: "Daily, weekly, fortnightly or monthly rounds to a home or office; each delivery is a bill on the customer's khata." },
    { icon: "clock", title: "Freshness", body: "Flowers past or near their fresh-until day, ready to sell cheaper, write off as wastage, or restock." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/florist/FloristPack.tsx",
    "apps/web/src/industries/florist/pos/config.ts",
    "apps/web/src/industries/florist/pos/DeliveryCard.tsx",
    "apps/web/src/industries/florist/pages/FloristOrdersPage.tsx",
    "apps/web/src/industries/florist/pages/FloristWeddingsPage.tsx",
    "apps/web/src/industries/florist/pages/FloristSubscriptionsPage.tsx",
    "apps/web/src/industries/florist/pages/FloristFreshnessPage.tsx",
    "apps/web/src/industries/florist/pages/FloristProductWizardPage.tsx",
    "apps/web/src/industries/florist/dashboard/useFloristOps.ts",
  ],
  dropped: [],
  heroOverride: {
    heading: "Bouquets, deliveries and wedding decoration in one app",
    sub: "Sell stems and bouquets at the counter, send deliveries with the card message and time slot, run wedding decoration from quote to final bill, and catch flowers before they wilt.",
    badges: ["Delivery slots", "Shaadi contracts", "Freshness alerts"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    steps("A day at the flower shop", [
      ["Morning", "The dashboard shows today's deliveries, wedding bookings, flowers about to wilt and subscription bouquets due."],
      ["Mandi stock in", "Mark the new delivery of roses as arrived; their fresh-until day starts again from today."],
      ["Counter and phone orders", "Sell a bouquet, add the recipient, card message, day and slot, and put the delivery charge on the same bill."],
      ["Out for delivery", "Print the slip with the card message, hand it to the rider and mark the order delivered when he calls back."],
      ["Closing", "Write wilted stems off as wastage for the manager to approve, or put them on sale cheaper tomorrow."],
    ]),
    shot({
      heading: "Today's orders, weddings and wilting stock on one screen",
      body: "The florist dashboard adds the trade's own numbers to the normal day: deliveries due, wedding work coming up, stems near their last day and subscription rounds, next to today's sale, profit and cash.",
      id: SHOT.dashboard,
      url: "app.nafaa.pk/dashboard",
      layout: "full",
      caption: "The shared dashboard, shown with demo shop data; florist widgets sit on the same page.",
      callouts: [
        { x: 28, y: 27, label: "Today's sale and bills" },
        { x: 24, y: 52, label: "Profit after cost and expenses" },
        { x: 40, y: 72, label: "What needs you today" },
      ],
    }),
    shot({
      heading: "Wedding families and office clients on khata",
      body: "Advances and payments for a wedding contract land on the family's khata the day they come in, and subscription deliveries become bills on the customer's khata. See every balance by age and remind on WhatsApp.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "The shared khata, shown with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 90, y: 55, label: "Payment or reminder" },
      ],
    }),
    table("Order book or Nafaa?", "How the everyday jobs of a flower shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Order book and WhatsApp chats" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Delivery orders", "Scattered across chats and a notebook", "One list by day and slot, with status and rider"],
      ["Card message", "Written on a scrap and sometimes lost", "Printed on the delivery slip"],
      ["Bouquet stock", "Stems counted by eye", "Each bouquet takes its stems off stock"],
      ["Wilted flowers", "Thrown out, never counted", "Written off as wastage and seen in the loss report"],
      ["Wedding advances", "Remembered by the owner", "On the family's khata from the day they are paid"],
    ]),
    prose(`## What to look for in florist software

Flowers are stock that loses value every hour, and much of a florist's work happens away from the counter: deliveries across town, stage and car decoration at weddings, and standing orders for offices. Software made for shelf goods misses most of it. Before you choose, check that it can:

- **Track freshness, not just quantity.** You need to see which flowers are on their last day so they are sold, discounted or written off, and that loss should show in your reports.
- **Build bouquets from stems.** If a bouquet does not take its roses and fillers off stock, your stem count is wrong by the evening.
- **Turn a bill into a delivery.** Recipient, address, card message, day and time slot belong on the order, with a slip the rider can carry.
- **Run event contracts.** Wedding decoration starts as a quote, takes advances over weeks and is billed at the end. Each payment should be recorded the day it arrives.
- **Handle repeat orders.** Weekly flowers for an office or a home should bill themselves onto the customer's khata.

Nafaa does this on the phone or computer you already have, and the counter keeps working when the internet drops.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and khata with demo data; no florist-specific screenshots exist yet.",
});

/** Internal links: the products florists use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:online-store', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
} satisfies typeof entry;
