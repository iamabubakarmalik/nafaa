/** Industry: Bookstore & Stationery (/industries/bookstore). Imported from apps/marketing and checked against the bookstore pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "bookstore",
  title: "Bookstore & Stationery",
  shortName: "Bookstore",
  shopNoun: "bookstores and stationery shops",
  romanUrduName: "Kitabon aur stationery ki dukaan",
  group: "retail",
  icon: "book-open",
  color: "#a16207",
  appIndustryKey: "bookstore",
  businessType: "STATIONERY",
  sortOrder: 10,
  summary:
    "Nafaa runs bookstores and stationery shops: books with ISBN, authors and publishers, textbooks by class, school book lists sold as one set at the counter, schools on credit, book rentals with a deposit, and stationery sold loose or by the dozen, alongside the counter, stock and khata.",
  builtFor: "Bookstores, stationery shops and art supply shops",
  romanUrdu:
    "Kitabon aur stationery ki dukaan ke liye: ISBN, author aur publisher, class ke hisaab se textbooks, school ki book list ek set me, schools ka khata, kitab kiraye par, aur stationery khuli ya darjan me.",
  features: [
    { icon: "book-open", title: "Books by ISBN", body: "Title, ISBN, authors, publisher, edition, and class, subject and board for textbooks. Search by any of them at the counter." },
    { icon: "list-checks", title: "School book lists", body: "The books and stationery for each school, session and class, sold at the counter as one set or only the books a child still needs." },
    { icon: "school", title: "Schools on credit", body: "Each school gets its own discount, credit terms and khata; its bills and payments land there." },
    { icon: "building-2", title: "Publishers", body: "Usual discount and credit days per publisher; a purchase from them fills each book at list price less that discount." },
    { icon: "timer", title: "Book rentals", body: "Issue a copy with rent and a deposit; on return, any late fine comes out of the deposit and the rest goes back." },
    { icon: "layers", title: "Stationery loose or by the pack", body: "Copies, pens and registers sold by the piece, the pack or the dozen, each with its own price." },
    { icon: "palette", title: "Art supplies", body: "Colours, brushes and canvas with type, brand, rate and stock, printed as an order sheet." },
    { icon: "users", title: "Authors", body: "Link books to their writers so \"any book by this author\" is one search." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/bookstore/BookstorePack.tsx",
    "apps/web/src/industries/bookstore/pos/config.tsx",
    "apps/web/src/industries/bookstore/pos/SchoolSetPicker.tsx",
    "apps/web/src/industries/bookstore/pages/SchoolListsPage.tsx",
    "apps/web/src/industries/bookstore/components/SchoolListEditor.tsx",
    "apps/web/src/industries/bookstore/pages/SchoolsPage.tsx",
    "apps/web/src/industries/bookstore/pages/PublishersPage.tsx",
    "apps/web/src/industries/bookstore/purchases/usePublisherCosts.ts",
    "apps/web/src/industries/bookstore/pages/RentalsPage.tsx",
    "apps/web/src/industries/bookstore/pages/BooksPage.tsx",
    "apps/web/src/industries/bookstore/components/SuppliesList.tsx",
    "apps/web/src/industries/bookstore/pages/AuthorsPage.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "School sets, books and stationery on one counter",
    sub: "Sell a whole class's book list in one tap during admission season, keep schools and publishers on their own khata, rent books against a deposit, and know what every title earns.",
    badges: ["School book lists", "ISBN search", "Book rentals"],
    media: { mediaId: SHOT.inventory, url: "app.nafaa.pk/products" },
  },
  deepBlocks: [
    steps("Admission season at the bookstore", [
      ["Before the session", "Copy last year's list for each school and class, and change only the books the school changed. Print the lists for parents."],
      ["At the counter", "Tap the school set: the whole set goes on the bill at the set price, or tick only the books the child still needs."],
      ["School orders", "Pick the school as the customer and put the bill on udhaar. It lands on the school's khata, where its payments are also taken."],
      ["Restocking", "Print a stock or order sheet for a publisher. When the books arrive, each one is costed at list price less that publisher's discount."],
    ]),
    shot({
      heading: "Every title, priced and counted",
      body: "The products page shows author, publisher, edition and class under each book, with the price, cost and stock on every card and the total stock value at the top. Filter by class, publisher or textbooks, and see what is running low before the rush.",
      id: SHOT.inventory,
      url: "app.nafaa.pk/products",
      layout: "full",
      caption: "The shared products page, shown with demo shop data.",
      callouts: [
        { x: 26, y: 19, label: "Stock value at cost" },
        { x: 40, y: 33, label: "Items running low" },
        { x: 30, y: 80, label: "Price, cost and margin per item" },
      ],
    }),
    shot({
      heading: "Schools and parents who pay later",
      body: "A school that buys on credit gets a khata of its own, and so can a regular parent. See every balance by age and send a polite reminder on WhatsApp.",
      id: SHOT.khata,
      url: "app.nafaa.pk/khata",
      layout: "split-right",
      caption: "The shared khata, shown with demo shop data.",
      callouts: [
        { x: 25, y: 19, label: "Total to collect" },
        { x: 90, y: 55, label: "Payment or reminder" },
      ],
    }),
    table("Register and lists on paper, or Nafaa?", "How the everyday jobs of a bookstore compare on paper and on Nafaa.", [
      { key: "paper", label: "Register and photocopied lists" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Selling a class set", "Pick each book from the list, add up by hand", "One tap for the set, or tick only what is needed"],
      ["New session lists", "Rewrite every list", "Copy last year's list and change what changed"],
      ["Publisher discount", "Worked out on each bill", "Filled in on the purchase from the publisher's discount"],
      ["Rented books", "Names in a notebook, deposits mixed with cash", "Rent, deposit and late fine each recorded"],
      ["School accounts", "A separate register per school", "A khata per school with bills and payments"],
    ]),
    prose(`## What to look for in bookstore software

A bookstore's year is uneven. Most of the money comes in a few weeks around the new school session, when parents arrive with a list and want everything at once. The rest of the year is stationery, general books and slow titles. Before you choose software, check that it can:

- **Sell a school list as a set.** The busiest days depend on billing a whole class's books in one step, and on handling the parent who already has half of them.
- **Find books the way customers ask.** By title, author, publisher, class or ISBN, not only by a code you made up.
- **Cost books from the publisher's discount.** Books are bought at list price less a discount; entering cost by hand on every title is where mistakes start.
- **Keep schools and publishers on credit.** Schools buy on terms and publishers give credit days. Both need their own khata, not a note in the margin.
- **Sell stationery loose and by the pack.** One pen, a packet of ten or a dozen copies, each at its own price.
- **Handle rentals honestly.** Rent and late fines as sales, the deposit kept apart and returned.

Nafaa does all of this on a phone or computer, and the counter keeps billing during load-shedding and admission-day rush.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared products and khata screens with demo data; no bookstore-specific screenshots exist yet.",
});

/** Internal links: the products bookstores use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:toystore', kind: 'RELATED' },
    { ref: 'INDUSTRY:retail', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'RELATED' },
  ],
} satisfies typeof entry;
