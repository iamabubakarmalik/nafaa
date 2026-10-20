/** Industry: Bookstore & Stationery (/industries/bookstore). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
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
    "Nafaa runs bookstores, stationery and art supply shops: books with ISBN, authors and publishers, textbooks by grade and board, school book lists, stationery and art supplies, and book rentals, with the same counter, stock and khata as every Nafaa shop.",
  builtFor: "Bookstores, stationery shops and art supply shops",
  romanUrdu:
    "Kitabon aur stationery ki dukaan ke liye: ISBN ke saath kitabein, author aur publisher, grade aur board ki textbooks, school book lists, aur kitab kiraye par.",
  features: [
    { icon: "book-open", title: "Books with ISBN", body: "Books with ISBN, author and publisher." },
    { icon: "graduation-cap", title: "Textbooks", body: "Textbooks by grade and board." },
    { icon: "school", title: "School book lists", body: "Keep each school's book list and sell it as a set." },
    { icon: "paintbrush", title: "Stationery and art supplies", body: "Stationery and art supplies in their own sections." },
    { icon: "repeat", title: "Book rentals", body: "Rent books out and take them back." },
    { icon: "users", title: "Authors and publishers", body: "Browse stock by author or publisher." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/bookstore/BookstorePack.tsx"],
  dropped: [
  ],
});
