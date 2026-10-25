/** Industry: Auto Parts & Workshop (/industries/autoparts). Imported from apps/marketing and checked against the autoparts pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
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
    { icon: "car", title: "Make, model and year fitment", body: "Each part lists the vehicles it fits, so \"corolla 2016 brake\" or a part number finds it at the counter." },
    { icon: "tags", title: "Genuine, local or used", body: "Part number, OEM and other numbers, brand, condition and warranty on every part card." },
    { icon: "clipboard-list", title: "Workshop job cards", body: "Vehicle, meter, complaint, mechanic, promised time, advance, then labour and parts as the work goes on." },
    { icon: "user-cog", title: "Mechanics", body: "Skills, rate and commission, open jobs, and this month's labour and commission due." },
    { icon: "car", title: "Customer vehicles", body: "Every vehicle by number plate with its owner, visits, money spent and full service history." },
    { icon: "bell", title: "Service reminders", body: "Oil changes due by date or meter, and insurance, token tax and fitness renewals, sent on WhatsApp in one click." },
    { icon: "rotate-ccw", title: "Old parts (cores)", body: "An old part the customer hands back comes off the bill as a trade-in, then goes back to the supplier or scrap." },
    { icon: "list", title: "Pakistani makes and models", body: "Add common Pakistani cars and bikes in one click and type in anything missing." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/autoparts/AutoPartsPack.tsx",
    "apps/web/src/industries/autoparts/pos/config.ts",
    "apps/web/src/industries/autoparts/components/FitmentEditor.tsx",
    "apps/web/src/industries/autoparts/components/AddWorkModal.tsx",
    "apps/web/src/industries/autoparts/components/DeliverJobModal.tsx",
    "apps/web/src/industries/autoparts/pages/NewWorkshopJobPage.tsx",
    "apps/web/src/industries/autoparts/pages/WorkshopJobsPage.tsx",
    "apps/web/src/industries/autoparts/pages/CustomerVehiclesPage.tsx",
    "apps/web/src/industries/autoparts/pages/ServiceRemindersPage.tsx",
    "apps/web/src/industries/autoparts/pages/MechanicsPage.tsx",
    "apps/web/src/industries/autoparts/pages/CoreReturnsPage.tsx",
    "apps/web/src/industries/autoparts/pages/VehicleMakesPage.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "Parts counter and workshop job cards in one app",
    sub: "Find the part that fits by model and year, open a job card for every vehicle, credit labour to the mechanic who did it, and remind owners when the next oil change or token tax is due.",
    badges: ["Fits by make and model", "Job cards", "WhatsApp service reminders"],
    media: { mediaId: SHOT.dashboard, url: "app.nafaa.pk/dashboard" },
  },
  deepBlocks: [
    steps("A vehicle's day in the workshop", [
      ["Drop-off", "Pick the vehicle by its number plate, note the meter, the complaint and what was left inside, set the mechanic and the promised time, and take an advance. The customer keeps a printed job card."],
      ["Work", "Add labour as a fixed amount or hours at a rate, credited to the mechanic. Shelf parts leave stock when added; outside work (painter, machine shop, rewinding) goes on with its cost."],
      ["Waiting", "The job board shows what is waiting for parts or for the customer's go-ahead, and what is late against its promised time."],
      ["Hand-over", "Take what is left, set the next service reminder and the work warranty, and post the bill. Anything unpaid goes on the customer's khata."],
    ]),
    shot({
      heading: "The counter and the workshop on one dashboard",
      body: "The auto parts dashboard puts the job board, promised dates, service reminders and mechanic output next to the day's counter sale, profit and cash, so the owner sees both halves of the business at once.",
      id: SHOT.dashboard,
      url: "app.nafaa.pk/dashboard",
      layout: "full",
      caption: "The shared dashboard, shown with demo shop data; workshop widgets sit on the same page.",
      callouts: [
        { x: 28, y: 27, label: "Today's sale and bills" },
        { x: 57, y: 52, label: "Cash in the galla" },
        { x: 40, y: 72, label: "What needs you today" },
      ],
    }),
    shot({
      heading: "Which parts actually make money",
      body: "Profit by product sorts filters, pads and bulbs by what they earn after cost. Use it to decide which brands to stock in genuine and which in local quality.",
      id: SHOT.profitByProduct,
      url: "app.nafaa.pk/reports/profit",
      layout: "split-right",
      caption: "The shared profit report, shown with demo shop data.",
      callouts: [
        { x: 52, y: 21, label: "Gross profit and margin" },
        { x: 86, y: 62, label: "Profit per item" },
      ],
    }),
    table("Job book or Nafaa?", "How the everyday jobs of a parts shop and workshop compare on paper and on Nafaa.", [
      { key: "paper", label: "Job book and memory" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Finding the right part", "Ask the senior salesman", "Search by model, year or part number"],
      ["Parts used on a job", "Written later, some forgotten", "Leave stock the moment they are added to the job"],
      ["Mechanic's labour", "Totalled by hand at month end", "Credited per job with commission due"],
      ["Next oil change", "The customer has to remember", "Reminder on WhatsApp by date or meter"],
      ["Old parts handed back", "A pile in the corner", "Recorded as a trade-in, then returned or scrapped"],
    ]),
    prose(`## What to look for in auto parts and workshop software

A parts shop with a workshop runs two businesses on one khata: a counter that sells thousands of small parts, and a workshop that sells labour and time. Software built only for billing handles the first and ignores the second. Before you choose, check that it can:

- **Search by vehicle.** Customers ask for "Mehran ka clutch plate" or "City 2018 brake pads", not a code. Fitment by company, model and years is what makes the counter fast.
- **Tell genuine, local and used apart.** The same part comes in three qualities at three prices, and the customer should see which one he is paying for.
- **Run job cards properly.** Complaint, meter, promised time, advance, labour and parts on one card, with stock going out when a part is fitted, not when someone remembers.
- **Pay mechanics fairly.** Labour lines credited to the mechanic who did them make commission a report, not an argument.
- **Bring customers back.** Oil change, token tax, insurance and fitness dates turn into WhatsApp reminders that fill the workshop on quiet days.
- **Handle cores.** An old battery or alternator handed back has value; it should come off the bill and be tracked until it goes back to the supplier.

Nafaa does all of this on a phone or computer, and the counter keeps billing when the internet drops.`),
    pricing("Plans for one shop or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and profit report with demo data; no autoparts-specific screenshots exist yet.",
});

/** Internal links: the products parts shops and workshops use, the matching solution and related trades. */
export default {
  ...entry,
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware', kind: 'RELATED' },
    { ref: 'INDUSTRY:services-biz', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-customer-retention', kind: 'RELATED' },
  ],
} satisfies typeof entry;
