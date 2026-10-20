/**
 * Development fixtures: the FAQ library. Questions and answers are copied
 * from the fact-checked CMS seed (seed-marketing-cms/content/faqs/index.ts);
 * prices stay as tokens and are resolved like the API does (build.ts).
 * A few general questions marked `fixture-only` exist so the core templates
 * can show their FAQ sections; they describe only rules already in the seed
 * or the contract (plan limits from the Plan table, the feature-status rule).
 */
export interface FixtureFaq {
  key: string;
  topic: string;
  question: string;
  answer: string;
}

export const FAQ_TOPIC_LABELS: Record<string, string> = {
  'getting-started': 'Getting started',
  pricing: 'Pricing',
  khata: 'Khata',
  kiryana: 'Kiryana & grocery',
  pharmacy: 'Pharmacy',
  bakery: 'Bakery',
  restaurant: 'Restaurant',
  'mobile-shop': 'Mobile shop',
  garments: 'Garments',
  roadmap: 'Roadmap',
};

export const fixtureFaqs: FixtureFaq[] = [
  {
    key: 'devices',
    topic: 'getting-started',
    question: 'Do I need a computer to use Nafaa?',
    answer:
      'No. Nafaa runs in a web browser, so the phone, tablet or computer you already have will do. A barcode scanner and a receipt printer can be added later but are not required to start. The counter also keeps working without internet and sends the sales to your account when the connection returns.',
  },
  {
    key: 'offline',
    topic: 'getting-started',
    question: 'Does Nafaa work without internet?',
    answer:
      'Yes, the counter keeps billing when the internet drops. Sales made offline are saved on the device and sent to your account automatically when the connection comes back, and you can see the sales still waiting to be sent. Reports and other branches see those sales once they have synced.',
  },
  {
    key: 'pricing',
    topic: 'pricing',
    question: 'How much does Nafaa cost?',
    answer:
      'Paid plans start at {{price:min.monthly}} a month. The pricing page lists every plan with its price and limits, taken straight from our plan settings, so it is always current. You can start with the free trial first, and no credit card is needed to sign up.',
  },
  {
    key: 'plan-limits',
    topic: 'pricing',
    question: 'What is the difference between the plans?',
    answer:
      'Plans differ in how many products, users, shops and sales a month they allow. The Basic plan is {{price:basic.monthly}} a month, Pro is {{price:pro.monthly}} and Enterprise is {{price:enterprise.monthly}}. Each plan card on the pricing page shows its limits, read from the same plan settings the app uses.',
  },
  {
    key: 'billing-periods',
    topic: 'pricing',
    question: 'Can I pay quarterly or yearly?',
    answer:
      'Yes. Every paid plan has a monthly, a quarterly and a yearly price. Basic, for example, is {{price:basic.quarterly}} a quarter or {{price:basic.yearly}} a year. Switch the billing period on the pricing page to compare them; the prices come straight from our plan settings.',
  },
  {
    key: 'khata-reminders',
    topic: 'khata',
    question: 'Can Nafaa send udhaar reminders on WhatsApp?',
    answer:
      "Yes. The khata keeps each customer's udhaar, payments and balances brought over from the old register. From the khata you send a customer a WhatsApp reminder with their balance in one tap. Reminders go one by one from your own WhatsApp, and the wording gets firmer as the udhaar gets older.",
  },
  {
    key: 'kiryana-units',
    topic: 'kiryana',
    question: 'Can I sell the same item by piece, dozen and carton?',
    answer:
      'Yes. A product can be sold in more than one unit, such as piece, dozen and carton, and each unit has its own price. So the same biscuit can go out as a single packet to one customer and as a full carton to a shopkeeper who buys in bulk, each at its own price.',
  },
  {
    key: 'kiryana-import',
    topic: 'kiryana',
    question: 'Can I add my products from Excel?',
    answer:
      'Yes. Download the template made for your business, fill it or paste your list, and upload it. Nafaa first checks every line in a dry run, flagging duplicates by name, SKU or barcode and bad prices, without saving anything. Then the import runs in chunks, and lines that need fixing download as Excel with the reason.',
  },
  {
    key: 'pharmacy-salt',
    topic: 'pharmacy',
    question: 'Can I search medicines by salt or formula?',
    answer:
      'Yes. Each medicine carries its salt or formula, so you can search by brand name or by salt. Nafaa can also show the other brands with the same salt, so when one brand is missing the customer can take a substitute. Salts have their own list that you keep up to date.',
  },
  {
    key: 'pharmacy-expiry',
    topic: 'pharmacy',
    question: 'How does batch and expiry tracking work?',
    answer:
      'Stock is kept by batch, each with its expiry date. The expiry screen lists what is close to expiring: items inside 30 days are marked red, inside 90 days amber, and expired stock stands out on its own. That gives you time to return, discount or move stock before it becomes a loss.',
  },
  {
    key: 'pharmacy-register',
    topic: 'pharmacy',
    question: 'Does Nafaa keep a narcotic register?',
    answer:
      "Yes. Medicines marked controlled, narcotic, psychotropic or Schedule X go into a register. When one is sold at the counter, Nafaa asks for the patient's name and CNIC and the doctor's name and PMDC number, and writes them on the bill line. The register then lists every such sale with those details, ready to check at any time.",
  },
  {
    key: 'bakery-bulk',
    topic: 'bakery',
    question: 'Can I handle wedding and event bulk orders?',
    answer:
      'Yes. Bulk orders for weddings and events are kept apart from counter sales, with the advance recorded on the order. If an order is confirmed but no advance has come in, Nafaa warns you before you buy the material for it. A cancelled order can refund its advance in cash.',
  },
  {
    key: 'restaurant-stations',
    topic: 'restaurant',
    question: 'Can each kitchen station get its own tickets?',
    answer:
      'Yes. You set up stations such as grill, tandoor, karahi, Chinese or bar and give each one whole menu categories. Every dish then prints its KOT at its own station, on a printer or a kitchen screen. Categories not given to a station go to the first station, so no order is lost.',
  },
  {
    key: 'mobile-imei',
    topic: 'mobile-shop',
    question: 'How does IMEI tracking work?',
    answer:
      'Every phone is kept by its IMEI. When you buy stock you enter the IMEIs, and when you sell, the IMEI goes on the bill, so you always know which handset is in stock, sold, or in for repair. Each IMEI can also carry its PTA status.',
  },
  {
    key: 'garments-variants',
    topic: 'garments',
    question: 'How are sizes and colours handled?',
    answer:
      'Each size and colour of a product is its own stock line, so you see exactly which sizes and colours are in stock and which are selling. Size charts and collections help you group stock, and exchanges at the counter put the returned size back into stock.',
  },
  {
    key: 'roadmap-status',
    topic: 'roadmap',
    question: 'What do "Beta" and "Coming soon" mean?',
    answer:
      'Beta means the feature works in the app and is still being improved with early users. Coming soon means it is planned but not built yet, so we never sell it as available. When a feature moves to live, the badge disappears from every page at once.',
  },
  {
    key: 'roadmap-request',
    topic: 'roadmap',
    question: 'Can I ask for a feature?',
    answer:
      'Yes. Send us a message on WhatsApp or through the contact page with what you need and how your shop works today. The roadmap page shows what is in beta and what is coming next.',
  },
];
