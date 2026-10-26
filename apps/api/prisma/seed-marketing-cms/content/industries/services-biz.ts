/** Industry: Field Service Business (/industries/services-biz). Imported from apps/marketing and checked against the services-biz pack. */
import { SHOT, pricing, prose, shot, steps, table } from '../main-pages/_build';
import { industry } from './_industry';

const entry = industry({
  slug: "services-biz",
  title: "Field Service Business",
  shortName: "Services",
  shopNoun: "service businesses",
  romanUrduName: "Service ka kaam",
  group: "service",
  icon: "briefcase",
  color: "#0369a1",
  appIndustryKey: "services-biz",
  businessType: "SERVICE",
  sortOrder: 18,
  summary:
    "Nafaa runs field service businesses such as plumbers, electricians, AC technicians, IT support and cleaners: create jobs, dispatch technicians, send quotes, keep a service catalogue, manage AMC contracts and warranties, and bill and collect payment in the same app. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Plumbers, electricians, AC technicians, IT support and cleaning companies",
  romanUrdu:
    "Service business ke liye: naya job, technician bhejna, quote, service catalog, AMC contract, warranty, aur bill aur payment.",
  features: [
    { icon: "clipboard-list", title: "Job cards", body: "Customer found by phone, the service, the item, where and when, who does it, the estimate and any advance; a printed card for the customer." },
    { icon: "navigation", title: "Dispatch board", body: "Jobs still needing a technician, urgent and earliest first; technicians with the right skill and area shown first." },
    { icon: "file-text", title: "Quotes", body: "Visit, labour and parts lines with a discount and validity, sent on WhatsApp; an accepted quote becomes a job." },
    { icon: "list", title: "Service rate list", body: "Fixed, per hour, per visit or by quote, with extra charges for emergency, night, weekend and out of city." },
    { icon: "package", title: "Parts on the job", body: "From your shelf, bought outside for the job, or brought by the customer; shelf parts leave stock with the bill." },
    { icon: "hand-coins", title: "Technician commission", body: "Commission on the work part of each billed job, a fixed amount per job, or both; paid from the drawer with a slip to sign." },
    { icon: "calendar-check", title: "AMC contracts", body: "Yearly maintenance with visits done and due, money owed on the fee, and contracts ending soon." },
    { icon: "shield-check", title: "Work warranty", body: "Jobs still under warranty with days left; a valid claim opens a free job for the same technician." },
  ],
  faqKeys: ["devices", "offline", "khata-reminders", "pricing"],
  evidence: [
    "apps/web/src/industries/services-biz/ServicesBizPack.tsx",
    "apps/web/src/industries/services-biz/pages/NewJobPage.tsx",
    "apps/web/src/industries/services-biz/pages/JobsListPage.tsx",
    "apps/web/src/industries/services-biz/pages/DispatchPage.tsx",
    "apps/web/src/industries/services-biz/components/AssignModal.tsx",
    "apps/web/src/industries/services-biz/pages/QuotesPage.tsx",
    "apps/web/src/industries/services-biz/pages/ServicesBizServiceWizardPage.tsx",
    "apps/web/src/industries/services-biz/components/AddPartModal.tsx",
    "apps/web/src/industries/services-biz/components/TechnicianModal.tsx",
    "apps/web/src/industries/services-biz/pages/TechniciansPage.tsx",
    "apps/web/src/industries/services-biz/pages/AmcPage.tsx",
    "apps/web/src/industries/services-biz/pages/WarrantyPage.tsx",
    "apps/web/src/industries/services-biz/components/BillJobModal.tsx",
  ],
  dropped: [],
  heroOverride: {
    heading: "Jobs, technicians and payments for your service business",
    sub: "Take the call, send the right technician, quote on WhatsApp, add the parts used on site, and close the job with its bill, while commission, AMC visits and warranty claims keep themselves in order.",
    badges: ["Dispatch board", "Quotes on WhatsApp", "AMC and warranty"],
    media: { mediaId: SHOT.servicesJobs, url: "app.nafaa.pk/services-biz/jobs" },
  },
  deepBlocks: [
    steps("A job from the phone call to the bill", [
      ["The call", "Find the customer by phone, pick \"AC gas refill\" from the rate list, note the address and the time, and take an advance if agreed."],
      ["Dispatch", "On the dispatch board, the technicians on duty with AC skills in that area come first. Give him the job in two clicks."],
      ["On site", "He finds a bad capacitor. Send the updated estimate on WhatsApp; when the customer gives the go-ahead, add the part from the shelf to the job."],
      ["Bill", "Take what is left in cash, card or wallet, set the work warranty and close the job. Advances come off first; anything unpaid goes on the khata."],
    ]),
    shot({
      heading: "Quotes that turn into jobs",
      body: "Price a large job before starting it: labour, parts and the site visit on separate lines, with a validity date and terms. Send it on WhatsApp, mark it accepted or refused, and turn an accepted quote into a job in one click.",
      id: SHOT.servicesQuotes,
      url: "app.nafaa.pk/services-biz/quotes",
      layout: "full",
      callouts: [
        { x: 20, y: 19.5, label: "Quotes waiting for a reply" },
        { x: 27.8, y: 54.6, label: "Job and customer" },
        { x: 68.8, y: 54.6, label: "Quoted amount" },
        { x: 86, y: 55.2, label: "Mark accepted" },
        { x: 92.8, y: 55.2, label: "Turn it into a job" },
      ],
    }),
    shot({
      heading: "Your technicians, their roles and their access",
      body: "Any staff member can be made a technician with a level, skills, working days, areas and pay terms. Roles decide who can book jobs, give discounts or pay commission.",
      id: SHOT.staff,
      url: "app.nafaa.pk/staff",
      layout: "split-right",
      caption: "The shared staff screen, shown with demo data.",
      callouts: [
        { x: 22, y: 19, label: "Who is at work" },
        { x: 32, y: 48, label: "Roles and permissions" },
      ],
    }),
    table("Diary and phone calls, or Nafaa?", "How the everyday jobs of a service business compare on paper and on Nafaa.", [
      { key: "paper", label: "Diary and phone calls" },
      { key: "nafaa", label: "Nafaa", highlight: true },
    ], [
      ["Who goes where", "The owner phones each technician", "Dispatch board with skills, areas and workload"],
      ["Quotes", "Told on the phone, then argued about", "Written quote on WhatsApp that becomes the job"],
      ["Parts used", "Remembered after the job, or not", "Added to the job; shelf parts leave stock with the bill"],
      ["Commission", "Worked out at month end with a calculator", "Earned per billed job, paid with a signed slip"],
      ["A repeat fault", "Free work nobody records", "Warranty claim with its cost shown in profit"],
    ]),
    prose(`## What to look for in field service software

A service business sells time and skill, usually at the customer's place. The money leaks in the gaps: a job nobody was sent to, a part fitted but never billed, a promised warranty visit that turns into an argument. Shop billing software cannot see any of this. Before you choose, check that it can:

- **Keep a job card for every call.** Who, what, where, when, the estimate and any advance, with a status everyone can see.
- **Dispatch by skill and area.** The right technician is the one who has the skill, works that area and is not already overloaded.
- **Quote in writing.** A quote with visit, labour and parts lines, sent on WhatsApp, that turns into the job when accepted.
- **Price services your way.** Fixed, hourly, per visit or by quote, with extra charges for emergencies, nights and weekends.
- **Pay technicians clearly.** Commission on the work part of each job, or a fixed rate, recorded as an expense when paid.
- **Handle AMC and warranty.** Yearly contracts with visits due, and warranty claims that open a free job without losing track of the cost.

Nafaa covers each of these on a phone or computer, with the khata, reports and counter every Nafaa business uses.`),
    pricing("Plans for one team or several"),
  ],
  writerNotes: "Screenshots are the shared dashboard and staff screens with demo data; no services-specific screenshots exist yet.",
});

/** Internal links: the products service businesses use, the matching solution and related trades. */
export default {
  ...entry,
  seoDescription: 'Software for plumbers, electricians, AC technicians and other field services: jobs, technician dispatch, quotes, AMC contracts, warranties and payments.',
  relations: [
    { ref: 'PRODUCT:staff', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'TAG' },
    { ref: 'PRODUCT:reports', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'SOLUTION:single-shop', kind: 'TAG' },
    { ref: 'INDUSTRY:appliances', kind: 'RELATED' },
    { ref: 'INDUSTRY:autoparts', kind: 'RELATED' },
    { ref: 'INDUSTRY:electronics', kind: 'RELATED' },
  ],
} satisfies typeof entry;
