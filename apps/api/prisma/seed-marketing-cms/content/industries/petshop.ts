/** Industry: Pet Shop & Vet Store (/industries/petshop). Imported from apps/marketing and checked against the petshop pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "petshop",
  title: "Pet Shop & Vet Store",
  shortName: "Pet shop",
  shopNoun: "pet shops and vet stores",
  romanUrduName: "Pet shop",
  group: "lifestyle",
  icon: "paw-print",
  color: "#b45309",
  appIndustryKey: "petshop",
  businessType: "PETSHOP",
  sortOrder: 27,
  summary:
    "Nafaa runs pet shops and vet stores: pet food, accessories, aquarium items and vet medicine at the counter, live animals with health records, and grooming appointments with groomers, with the stock, khata and reports that every Nafaa shop uses. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Pet shops, aquarium shops and vet stores",
  romanUrdu:
    "Pet shop ke liye: khana, accessories, aquarium aur dawaiyan, zinda janwar aur unki sehat ka record, aur grooming.",
  features: [
    { icon: "paw-print", title: "Live animals", body: "Every puppy, kitten, bird or fish with species, breed, age, cage, feeding, photos, cost and asking price." },
    { icon: "syringe", title: "Health records", body: "Vaccines, deworming and vet visits on each animal; a vet fee paid now is recorded as a shop expense." },
    { icon: "shopping-cart", title: "Animals at the counter", body: "Each animal is its own card on the counter and is marked sold with the bill; a void or return puts it back on sale." },
    { icon: "scissors", title: "Grooming visits", body: "Book the pet, the service and fee, the groomer and an open slot; then bath, ready and pickup, with the bill at pickup." },
    { icon: "users", title: "Groomers", body: "Days and hours, rate and commission, and this month's visits for each groomer." },
    { icon: "pill", title: "Vet medicine", body: "Active ingredient, dose, whether a vet's slip is needed, and expiry per batch." },
    { icon: "package", title: "Food by pack or loose", body: "Sell food and litter by the pack or loose by weight, for the right animal, age and brand." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/petshop/PetshopPack.tsx",
    "apps/web/src/industries/petshop/pos/config.ts",
    "apps/web/src/industries/petshop/pos/animalBill.ts",
    "apps/web/src/industries/petshop/pages/LiveAnimalsPage.tsx",
    "apps/web/src/industries/petshop/pages/LiveAnimalFormPage.tsx",
    "apps/web/src/industries/petshop/pages/LiveAnimalDetailPage.tsx",
    "apps/web/src/industries/petshop/pages/GroomingPage.tsx",
    "apps/web/src/industries/petshop/pages/GroomingFormPage.tsx",
    "apps/web/src/industries/petshop/pages/GroomersPage.tsx",
    "apps/web/src/industries/petshop/pages/PetshopProductWizardPage.tsx",
    "apps/web/src/industries/petshop/dashboard/usePetshopOps.ts",
  ],
  dropped: [],
  heroOverride: {
    heading: "Pet food, live animals and grooming in one app",
    sub: "Keep a health record for every animal you sell, book grooming visits with your groomers, sell food by the pack or by weight, and catch vet medicine before it expires.",
    badges: ["Animal health records", "Grooming slots", "Medicine expiry"],
    media: { mediaId: SHOT.petshopAnimals, url: "app.nafaa.pk/petshop/live-animals" },
  },
  deepBlocks: [
    steps("A day at the pet shop", [
      ["Morning", "The dashboard shows today's grooming visits and pickups, animals that need a vaccine or check, and medicine near expiry."],
      ["New arrivals", "Add the litter of kittens with breed, age, health on arrival, cage, cost and asking price, with photos."],
      ["Grooming", "Start the bath for the 11 am Persian cat, mark it ready with any extra charge, and take the money when the owner comes."],
      ["A sale", "A family buys a puppy, food and a leash on one bill. The puppy's record is marked sold and leaves the counter."],
      ["Closing", "Check animals on hold for customers and write the day's vaccine and vet visits on their records."],
    ]),
    shot({
      heading: "Grooming bookings for the day",
      body: "Book each grooming with the pet's name, breed, the owner's phone and the service, from a bath to full grooming. The day's list shows the time, the charge and what is still to collect, and each booking moves from start to pickup.",
      id: SHOT.petshopGrooming,
      url: "app.nafaa.pk/petshop/grooming",
      layout: "full",
      callouts: [
        { x: 24.4, y: 54.6, label: "Pet and breed" },
        { x: 27, y: 56.6, label: "Owner and service" },
        { x: 69, y: 55.5, label: "Booked time" },
        { x: 80.3, y: 55.5, label: "Charge and balance" },
        { x: 94, y: 55.5, label: "Start the grooming" },
      ],
    }),
    shot({
      heading: "Food and supplies before they run out",
      body: "The low-stock list shows which foods, litter and medicines are below their alert level, how fast they sell and how much to order.",
      id: SHOT.lowStock,
      url: "app.nafaa.pk/low-stock",
      layout: "split-left",
      caption: "The shared low-stock list, shown with demo data.",
      callouts: [
        { x: 28, y: 62, label: "Stock against its alert level" },
        { x: 75, y: 62, label: "Suggested order quantity" },
      ],
    }),
    table("Notebook or Nafaa?", "How the everyday jobs of a pet shop compare on paper and on Nafaa.", [
      { key: "paper", label: "Notebook and memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Animal health", "Vaccine dates in someone's head", "Vaccines, deworming and vet visits on each animal's record"],
      ["Selling an animal", "Crossed off a list, if remembered", "Marked sold with the bill; back on sale if returned"],
      ["An animal lost", "Never counted", "Record closed and its cost written off as a loss"],
      ["Grooming bookings", "Phone calls and clashes", "Groomer's open slots offered when booking"],
      ["Medicine expiry", "Found when a customer complains", "Expiry per batch and a dashboard warning"],
    ]),
    prose(`## What to look for in pet shop software

A pet shop sells three very different things: packaged food and accessories, living animals, and services such as grooming. Most shop software handles only the first. Before you choose, check that it can:

- **Treat each animal as one record.** A puppy is not a quantity in stock. It needs its breed, age, cage, cost, asking price and health history, and it should leave the counter the moment it is sold.
- **Keep health records.** Vaccines, deworming and vet visits on the animal, so you can answer a buyer's questions and show what you spent.
- **Count losses honestly.** When an animal dies or goes back, its cost should show as a loss, not disappear.
- **Book grooming properly.** Groomers' days and hours, open slots, fees and commission, with the bill made at pickup.
- **Watch expiry.** Vet medicine and some foods expire; batches with dates, and whether a vet's slip is needed, protect your customers and your stock value.
- **Sell food the way people buy it.** By the bag or loose by weight.

Nafaa covers each of these on the phone or computer at your counter, and keeps billing when the internet drops.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and low-stock list with demo data; no petshop-specific screenshots exist yet.",
});

/** Internal links: the products pet shops use, the matching solution and related trades. */
export default {
  ...entry,
  seoDescription: 'Software for pet shops and vet stores: food, accessories and vet medicine at the counter, live animals with health records, and grooming appointments.',
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:agri', kind: 'RELATED' },
    { ref: 'INDUSTRY:salon', kind: 'RELATED' },
    { ref: 'INDUSTRY:pharmacy', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:batch-tracking', kind: 'RELATED' },
  ],
} satisfies typeof entry;
