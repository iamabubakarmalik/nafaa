/**
 * Nafaa vs Odoo. Odoo facts from odoo.com/pricing (plans, what is and is not
 * included), the Point of Sale app page and the Odoo 18.0 Point of Sale
 * documentation, read on CHECKED_ON. Prices are quoted as shown in US
 * dollars on that date; Odoo may show other prices by country.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { compareTable, disclosure, src, type CompareSpec } from '../_compare';

const ODOO_PRICING = src('Odoo pricing (One App Free, Standard, Custom; inclusions)', 'https://www.odoo.com/pricing', 'Odoo');
const ODOO_POS = src('Odoo Point of Sale for shops', 'https://www.odoo.com/app/point-of-sale-shop', 'Odoo');
const ODOO_POS_DOC = src('Odoo 18.0 documentation: Point of Sale', 'https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale.html', 'Odoo');
const SOURCES = [ODOO_PRICING, ODOO_POS, ODOO_POS_DOC];

const SUMMARY =
  'Odoo is an open source suite of business apps, from accounting and inventory to manufacturing, HR and websites, with a Point of Sale app among them. Nafaa is a POS-first system for Pakistani shops and restaurants. This page compares them for a business in Pakistan and is clear about when Odoo is the better fit.';

const spec: CompareSpec = {
  slug: 'nafaa-vs-odoo',
  title: 'Nafaa vs Odoo',
  seoTitle: 'Nafaa vs Odoo POS: Which Suits a Pakistani Business?',
  seoDescription:
    'Nafaa vs Odoo for businesses in Pakistan: a ready-to-use POS with khata against a full ERP suite. Pricing, setup, offline POS and when Odoo fits better.',
  competitorName: 'Odoo',
  competitorUrl: 'https://www.odoo.com/',
  verdict:
    'Odoo is the stronger choice for a company that needs a full ERP, such as manufacturing, HR, CRM and full accounting, and has the budget for an implementation partner. Nafaa is the faster and simpler choice for shops, restaurants and distributors that need the counter, stock and khata working this week.',
  summary: SUMMARY,
  blocks: [
    hero(SUMMARY, { eyebrow: 'Compare', heading: 'Nafaa vs Odoo for a business in Pakistan' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Odoo for a company-wide ERP with a partner to set it up; Nafaa for a shop or restaurant that wants to bill today.' },
        { label: 'Choose Odoo if', value: 'You manufacture, run HR and CRM in one system, need full double-entry accounting, or want to customise the code.' },
        { label: 'Choose Nafaa if', value: 'Your day is the counter, the stock room and udhaar, and you want to set it up yourself without a project.' },
        { label: 'Odoo price', value: 'One App Free; Standard and Custom priced per user per month in US dollars (odoo.com/pricing, 26 Oct 2026)' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Odoo poori company ka ERP hai: factory, HR, CRM aur accounting, aksar partner ki madad se lagta hai. Nafaa dukaan aur restaurant ke counter, Stock aur khata ke liye hai, jo aap aaj khud shuru kar sakte hain.',
      'Which one should you choose?',
    ),
    disclosure('Odoo', 'odoo.com (pricing, Point of Sale app page) and Odoo\'s own documentation'),
    prose(`## What each one is

**Odoo** describes itself as "a suite of open source business apps that cover all your company needs: CRM, eCommerce, accounting, inventory, point of sale, project management, etc." Its pricing page offers three plans. **One App Free** gives one app with unlimited users at no cost. **Standard** includes all apps for a price per user per month on Odoo Online, Odoo's cloud. **Custom** adds Odoo Studio, multi-company, the external API and the choice of hosting on Odoo.sh or on your own servers. The page says all plans include hosting, support and upgrades, while implementation services, maintenance of custom code and in-app credits such as SMS are not included. Odoo's documentation says its Point of Sale "works on any device with a web browser, even if you are temporarily offline", that product moves go straight into stock, and that data is consolidated across shops.

**Nafaa** is narrower and ready on day one. It is built for a business in Pakistan where the counter is the centre: billing with barcode and quick keys, cash, card, JazzCash, Easypaisa and udhaar on one bill, a khata with credit limits and reminders, purchasing, staff roles, branches and Profit reports. Industry packs add the screens a pharmacy, restaurant, garment store or mobile shop needs. There is no implementation project: you sign up, import products and start.`),
    compareTable(
      'Nafaa and Odoo side by side',
      'Odoo details are from odoo.com/pricing, the Point of Sale app page and the Odoo 18.0 documentation, checked on the date shown. Nafaa details are from the product as it is today.',
      'Odoo',
      [
        ['Scope', 'Counter, stock, khata, purchasing, staff, branches and reports', 'Full suite: accounting, inventory, POS, CRM, manufacturing, HR, websites and more'],
        ['Pricing model', 'Monthly plan per business, in rupees', 'One App Free; Standard and Custom per user per month, in US dollars'],
        ['Price shown', 'From {{price:min.monthly}} a month after a 7-day free trial', 'Standard from US$7.25 per user per month on yearly billing with a 12-month first-year discount'],
        ['Setup', 'Self-serve: sign up, import products, bill', 'Self-serve possible; implementation services sold separately by Odoo or partners'],
        ['Without internet', 'Counter keeps billing; sales sync later', 'POS works in a browser "even if you are temporarily offline"'],
        ['Customer udhaar', 'Khata from the bill, credit limits, WhatsApp reminders by age', 'Customer invoices and receivables in accounting'],
        ['Accounting', 'Sales, expenses, cash and Profit; daily journal to QuickBooks, Xero, Zoho Books or Tally', 'Full accounting app'],
        ['Customisation', 'Settings, industry packs and roles; no custom code', 'Odoo Studio, external API and custom modules on the Custom plan'],
        ['Local payments', 'JazzCash, Easypaisa and bank transfer as their own methods; your own payment QR', 'Not listed for Pakistan on the pages checked'],
        ['Support', 'WhatsApp and video calls, in Urdu or English', 'Email support 24/5 in English, French, Spanish or Dutch'],
      ],
      SOURCES,
    ),
    prose(`## When Odoo is the better choice

- **You need more than a shop.** If you manufacture, run payroll and recruitment, manage projects or need a CRM in the same system, Odoo covers those and Nafaa does not.
- **You need full double-entry accounting** with a balance sheet in the same database as your POS. Nafaa keeps operational money records and sends a summary to accounting software instead.
- **You will customise.** Odoo's Custom plan opens Studio, the API and custom modules. A company with its own developers or a partner can shape it to its process.
- **You run several companies** and need multi-company accounting.
- **You want open source** and the option to host it yourself.

## When Nafaa is the better choice

- **You want to bill this week, not after a project.** Nafaa has no implementation phase. Most shops add products and bill the same day.
- **Udhaar is daily business.** Nafaa's [khata](/product/khata) is part of the bill, with credit limits, ageing and WhatsApp reminders.
- **The cost should not grow with every user.** Odoo charges per user. Nafaa charges per plan, with staff logins included up to the plan's limit.
- **You want local payment methods and rupee pricing,** with support on WhatsApp in Urdu.
- **Your staff are not trained in ERP software.** Nafaa's counter is designed for a cashier to learn in an afternoon, with keyboard shortcuts for speed. See [POS](/product/pos).`),
    shot({
      heading: 'The owner\'s view without an ERP',
      body: 'Today\'s sale, Profit, cash in the drawer and udhaar to collect, on the owner\'s phone, from the same data the counter writes.',
      id: SHOT.dashboardPhone,
      frame: 'phone',
      layout: 'split-right',
    }),
    prose(`## A common path: Nafaa now, ERP later

Many growing businesses in Pakistan start with a POS and add an ERP years later, when they open a factory or a large distribution arm. If that is your plan, start where the money comes in. Nafaa can send a balanced daily journal to QuickBooks Online, Xero or Zoho Books, or a voucher file to Tally, so your accountant has clean figures. When the day comes to move to a full ERP, products, customers and opening balances can be exported from Nafaa as spreadsheets.

If you already know you need manufacturing, HR and full accounting in one place, it is usually cheaper to start in Odoo from the beginning than to move later.`),
    steps(
      'Questions to answer before choosing',
      [
        ['What must the system do in the first month?', 'If the answer is billing, stock and udhaar, a POS is enough. If it includes production orders or payroll, look at Odoo.'],
        ['Who will set it up?', 'Odoo projects often use a partner. Ask for a quote that includes setup, training and the first year of support.'],
        ['How many users will log in?', 'Multiply by Odoo\'s per-user price and compare with a Nafaa plan.'],
        ['What happens when the internet drops?', 'Test both at the counter with Wi-Fi turned off.'],
        ['Where does your accountant work?', 'If in QuickBooks, Xero, Zoho Books or Tally, Nafaa can feed them.'],
      ],
      undefined,
      true,
    ),
  ],
  relations: [
    { ref: 'PRODUCT:pos', kind: 'TAG' },
    { ref: 'PRODUCT:inventory', kind: 'TAG' },
    { ref: 'PRODUCT:khata', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution', kind: 'RELATED' },
    { ref: 'BEST_OF:inventory-software-pakistan', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-zoho-inventory', kind: 'RELATED' },
    { ref: 'COMPARE:nafaa-vs-loyverse', kind: 'RELATED' },
  ],
  sources: SOURCES,
  evidence: [
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/integrations/accounting/AccountingPage.tsx',
    'apps/api/src/integrations/accounting/registry.ts',
    'apps/api/src/integrations/accounting/tally.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/hr/staff/components/RolesPanel.tsx',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/reports/exports/pages/ExportsPage.tsx',
    'apps/web/src/industries',
  ],
  factNote:
    'Odoo facts read on 2026-10-26: odoo.com/pricing (One App Free: one app, unlimited users; Standard: all apps, US$7.25 per user per month yearly / US$9.10 monthly with a 12-month discount on initial users, regular US$8.95 / US$11.20; Custom: Odoo Online, Odoo.sh or on-premise, Studio, multi-company, external API; support, hosting and upgrades included; implementation, custom code maintenance and IAP credits not included; email support 24/5 in English, French, Spanish or Dutch), odoo.com/app/point-of-sale-shop and the Odoo 18.0 Point of Sale documentation ("works on any device with a web browser, even if you are temporarily offline"). Odoo footer: "suite of open source business apps".',
  topics: ['Scope', 'Pricing model', 'Price', 'Setup', 'Offline', 'Udhaar', 'Accounting', 'Customisation', 'Local payments', 'Support'],
  dropped: ['Third-party Pakistan tax modules on the Odoo Apps store (not Odoo\'s own product).'],
  needsOwner: [
    'Fact-check stamp in the admin (NOT_FACT_CHECKED blocks publish until then).',
    'Verify: Odoo Standard price as shown (US$7.25 per user per month yearly with the 12-month discount); Odoo may show different prices by country, so re-check from Pakistan before publishing.',
    'Verify: Odoo support languages and hours (email 24/5, English, French, Spanish, Dutch).',
    'Confirm Nafaa staff login limits per plan, since the page says staff logins are included "up to the plan\'s limit".',
  ],
};

export default spec;
