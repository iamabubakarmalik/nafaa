/**
 * Interface text of the page templates (home, industry, city, contact, FAQ
 * hub and the shared core and showcase parts): eyebrows, kickers, link
 * labels, notices and accessible names around the CMS copy.
 *
 * Page copy always comes from the CMS; these are only the words around it.
 * `ur` is Urdu script in simple everyday words, with business words written
 * the way people say them and the brand name "Nafaa" in Latin letters.
 * Unknown locales fall back to English.
 *
 * Some values are functions, so call `uiStrings` in server components only.
 * Client components receive the `locale` string and call it themselves.
 * Block-level text (forms, pricing, callouts) lives in
 * components/blocks/lib/i18n.ts; the S4 template labels in
 * templates/city/common/strings.ts.
 */

const en = {
  // Shared
  homeCrumb: 'Home',
  breadcrumb: 'Breadcrumb',
  updated: 'Updated',
  nextSteps: 'Next steps',
  learnMore: 'Learn more',
  seePricing: 'See pricing',
  bookDemo: 'Book a demo',
  allIndustries: 'All industries',
  insideTheApp: 'Inside the app',
  howItWorks: 'How it works',
  gettingStarted: 'Getting started',
  seeRoadmap: 'See the roadmap',
  comingNote: 'This is planned and not available yet.',
  betaNote: 'This works today and is still being improved with early users.',

  /** Owner-approved facts of the showcase trust ribbon (templates/showcase/kit.tsx). */
  trust: {
    trial: '7 din Free Trial',
    offline: 'Keeps billing offline',
    whatsapp: 'Help on WhatsApp',
    languages: 'English and Roman Urdu',
    devices: 'Phone, tablet or computer',
  },

  industry: {
    pill: 'Industry',
    defaultNoun: 'shops',
    forNoun: (noun: string) => `For ${noun}`,
    productsFor: (noun: string) => `Products ${noun} use`,
    solutions: 'Solutions',
    compliance: 'Tax and compliance',
    cities: 'In your city',
    guides: 'Guides',
    posts: 'From the blog',
    compare: 'Compare',
    best: 'Best software lists',
    related: 'Related industries',
    dayAtCounter: 'A day at the counter',
  },

  contact: {
    heading: 'Ways to reach us',
    whatsapp: 'WhatsApp',
    whatsappValue: 'Chat with the team',
    email: 'Email',
    phone: 'Phone',
  },

  faqHub: {
    region: 'Questions by topic',
    nav: 'FAQ topics',
    topics: 'Topics',
    /** Topic labels by key; English uses the label the API sends. */
    topicLabels: {} as Record<string, string>,
  },

  home: {
    trialNote: (days: number) => `${days}-day free trial`,
    paidFrom: (price: string) => `paid plans from ${price} a month`,
    builtFor: 'Built for',
    shortAnswer: 'Short answer',
    whatIs: (title: string) => `What is ${title}?`,
    coreTag: 'One account for the whole business',
    coreChips: ['POS', 'Stock', 'Khata', 'Online store', 'Staff', 'Reports'],
    romanUrdu: 'Roman Urdu mein',
    howTitle: 'Built for power cuts, tax rules and busy counters',
    diagramLinks: {
      offlineHow: 'How offline billing works',
      seePos: 'See the POS',
      seeOnline: 'See online selling',
      seeFbr: 'See FBR & PRA invoicing',
      seeKhata: 'See the digital khata',
      multiBranch: 'Run more than one branch',
    },
    tourEyebrow: 'Product tour',
    tourTitle: 'See the real app, not a mock-up',
    screen: (n: number) => `Screen ${n}`,
    platformEyebrow: 'The platform',
    allProducts: 'All products',
    solutionsEyebrow: 'Solutions',
    allSolutions: 'All solutions',
    businessTypes: 'Business types',
    explorePrefix: 'Explore ',
    exploreSuffix: '',
    startTrial: 'Start free trial',
    industriesHeading: 'Industries',
    industriesCount: (n: number) => `${n} industries`,
    servicesEyebrow: 'Services · Worldwide',
    allServices: 'All services',
    aiNew: 'New',
    aiAsk: 'Ask in English or Roman Urdu',
    seeAi: 'See the AI assistant',
    pricingEyebrow: 'Pricing',
    notIncluded: 'Not included: ',
    pricesPkr: 'Prices in PKR, from our price list',
    comparePlans: 'Compare all plans',
    faqEyebrow: 'FAQ',
    faqHeading: 'Questions people ask first',
    faqIntro: 'Short, straight answers. Anything else, ask us directly.',
    stillQuestions: 'Still have questions?',
    /** "Message ... in English or <span lang=ur-Latn>Roman Urdu</span>." */
    askBefore: 'Message the Nafaa team on WhatsApp, in English or ',
    askLang: 'Roman Urdu',
    askAfter: '.',
    whatsappUs: 'WhatsApp us',
    /**
     * Key points per solution tab, keyed by the item link. Each line restates
     * what the item's CMS text and the product pages say (checked 21 Oct 2026).
     */
    solutionPoints: {
      '/solutions/single-shop': ['Barcode, quick keys and units', 'Stock in every unit, low-stock alerts', 'Digital khata with WhatsApp reminders', 'Keeps billing without internet'],
      '/solutions/retail-chains': ['Branch-wise stock and sales', 'Stock transfers between branches', 'Staff roles and permissions', 'One view of every branch'],
      '/solutions/ecommerce': ['Your own online store', 'Listing on Nafaa Bazaar', 'Shopify and WooCommerce orders', 'Courier and cash-on-delivery tracking'],
      '/solutions/restaurants': ['Tables by section', 'Kitchen tickets per station', 'Dine-in, takeaway and delivery', 'Split bills'],
      '/solutions/wholesale-distribution': ['Carton and piece prices', 'Supplier purchases', 'Customer credit limits', 'Khata and recovery'],
      '/solutions/manufacturing': ['Raw and finished stock', 'Purchasing from suppliers', 'Stock and profit reports', 'Modules built around your process'],
      '/industries/services-biz': ['Bookings', 'Memberships', 'Staff commission', 'Invoices and receipts'],
      '/solutions/enterprise': ['Many branches in one account', 'Roles and permissions', 'Accounting export and API access', 'A team that sets it up with you'],
    } as Record<string, string[]>,
  },
};

export type UiStrings = typeof en;

const ur: UiStrings = {
  homeCrumb: 'ہوم',
  breadcrumb: 'صفحے کا راستہ',
  updated: 'آخری اپ ڈیٹ',
  nextSteps: 'اگلے قدم',
  learnMore: 'مزید جانیں',
  seePricing: 'قیمت دیکھیں',
  bookDemo: 'ڈیمو بک کریں',
  allIndustries: 'تمام کاروبار',
  insideTheApp: 'ایپ کے اندر',
  howItWorks: 'یہ کیسے کام کرتا ہے',
  gettingStarted: 'شروع کیسے کریں',
  seeRoadmap: 'روڈ میپ دیکھیں',
  comingNote: 'یہ ابھی بن رہا ہے، ابھی دستیاب نہیں۔',
  betaNote: 'یہ آج کام کرتا ہے، اور پہلے یوزرز کے ساتھ اسے مزید بہتر کیا جا رہا ہے۔',

  trust: {
    trial: '7 دن مفت ٹرائل',
    offline: 'انٹرنیٹ کے بغیر بھی بلنگ',
    whatsapp: 'واٹس ایپ پر مدد',
    languages: 'انگریزی اور رومن اردو',
    devices: 'فون، ٹیبلٹ یا کمپیوٹر',
  },

  industry: {
    pill: 'کاروبار',
    defaultNoun: 'دکانوں',
    forNoun: (noun: string) => `${noun} کے لیے`,
    productsFor: (noun: string) => `${noun} کے کام کی پروڈکٹس`,
    solutions: 'سلوشنز',
    compliance: 'ٹیکس اور قواعد',
    cities: 'آپ کے شہر میں',
    guides: 'گائیڈز',
    posts: 'بلاگ سے',
    compare: 'موازنہ',
    best: 'سافٹ ویئر کی فہرستیں',
    related: 'ملتے جلتے کاروبار',
    dayAtCounter: 'کاؤنٹر پر ایک دن',
  },

  contact: {
    heading: 'ہم سے رابطے کے طریقے',
    whatsapp: 'واٹس ایپ',
    whatsappValue: 'ٹیم سے بات کریں',
    email: 'ای میل',
    phone: 'فون',
  },

  faqHub: {
    region: 'موضوع کے حساب سے سوال',
    nav: 'سوالوں کے موضوع',
    topics: 'موضوع',
    topicLabels: {
      'getting-started': 'شروع کیسے کریں',
      pricing: 'قیمت اور پلان',
      product: 'پروڈکٹ',
      solutions: 'سلوشنز',
      khata: 'کھاتہ اور ادھار',
      compliance: 'ٹیکس اور FBR',
      marketplace: 'Nafaa Bazaar',
      services: 'سروسز',
      kiryana: 'کریانہ',
      retail: 'ریٹیل',
      bakery: 'بیکری',
      restaurant: 'ریسٹورنٹ',
      pharmacy: 'فارمیسی',
      garments: 'گارمنٹس',
      'mobile-shop': 'موبائل شاپ',
    },
  },

  home: {
    trialNote: (days: number) => `${days} دن مفت ٹرائل`,
    paidFrom: (price: string) => `پیڈ پلان ${price} ماہانہ سے`,
    builtFor: 'ان کے لیے',
    shortAnswer: 'مختصر جواب',
    whatIs: (title: string) => `${title} کیا ہے؟`,
    coreTag: 'پورے کاروبار کے لیے ایک اکاؤنٹ',
    coreChips: ['POS', 'اسٹاک', 'کھاتہ', 'آن لائن اسٹور', 'اسٹاف', 'رپورٹس'],
    romanUrdu: 'رومن اردو میں',
    howTitle: 'لوڈ شیڈنگ، ٹیکس کے قواعد اور رش والے کاؤنٹر کے لیے بنا',
    diagramLinks: {
      offlineHow: 'آف لائن بلنگ کیسے چلتی ہے',
      seePos: 'POS دیکھیں',
      seeOnline: 'آن لائن سیل دیکھیں',
      seeFbr: 'FBR اور PRA انوائس دیکھیں',
      seeKhata: 'ڈیجیٹل کھاتہ دیکھیں',
      multiBranch: 'ایک سے زیادہ برانچ چلائیں',
    },
    tourEyebrow: 'ایپ کا جائزہ',
    tourTitle: 'اصل ایپ دیکھیں، کوئی نقلی تصویر نہیں',
    screen: (n: number) => `اسکرین ${n}`,
    platformEyebrow: 'پلیٹ فارم',
    allProducts: 'تمام پروڈکٹس',
    solutionsEyebrow: 'سلوشنز',
    allSolutions: 'تمام سلوشنز',
    businessTypes: 'کاروبار کی قسمیں',
    explorePrefix: '',
    exploreSuffix: ' دیکھیں',
    startTrial: 'مفت ٹرائل شروع کریں',
    industriesHeading: 'کاروبار',
    industriesCount: (n: number) => `${n} کاروبار`,
    servicesEyebrow: 'سروسز · دنیا بھر کے لیے',
    allServices: 'تمام سروسز',
    aiNew: 'نیا',
    aiAsk: 'انگریزی یا رومن اردو میں پوچھیں',
    seeAi: 'AI اسسٹنٹ دیکھیں',
    pricingEyebrow: 'قیمت',
    notIncluded: 'شامل نہیں: ',
    pricesPkr: 'قیمتیں روپے میں، ہماری پرائس لسٹ سے',
    comparePlans: 'تمام پلان کا موازنہ کریں',
    faqEyebrow: 'سوال جواب',
    faqHeading: 'لوگ سب سے پہلے یہ پوچھتے ہیں',
    faqIntro: 'مختصر اور سیدھے جواب۔ کچھ اور پوچھنا ہو تو ہم سے سیدھا پوچھیں۔',
    stillQuestions: 'ابھی بھی کوئی سوال ہے؟',
    askBefore: 'Nafaa ٹیم کو واٹس ایپ پر میسج کریں، اردو یا انگریزی میں۔',
    askLang: '',
    askAfter: '',
    whatsappUs: 'واٹس ایپ کریں',
    solutionPoints: {
      '/solutions/single-shop': ['بارکوڈ، کوئیک کیز اور یونٹ', 'ہر یونٹ میں اسٹاک، کم اسٹاک کا الرٹ', 'ڈیجیٹل کھاتہ، واٹس ایپ یاد دہانی کے ساتھ', 'انٹرنیٹ کے بغیر بھی بلنگ'],
      '/solutions/retail-chains': ['برانچ وار اسٹاک اور سیل', 'برانچوں کے درمیان اسٹاک ٹرانسفر', 'اسٹاف کے رول اور اجازتیں', 'ہر برانچ ایک ہی جگہ پر'],
      '/solutions/ecommerce': ['آپ کا اپنا آن لائن اسٹور', 'Nafaa Bazaar پر لسٹنگ', 'Shopify اور WooCommerce کے آرڈر', 'کوریئر اور کیش آن ڈیلیوری کی ٹریکنگ'],
      '/solutions/restaurants': ['سیکشن کے حساب سے ٹیبل', 'ہر اسٹیشن کے لیے کچن ٹکٹ', 'ڈائن اِن، ٹیک اوے اور ڈیلیوری', 'بل تقسیم کریں'],
      '/solutions/wholesale-distribution': ['کارٹن اور پیس کی الگ قیمت', 'سپلائر سے خریداری', 'کسٹمر کی ادھار حد', 'کھاتہ اور وصولی'],
      '/solutions/manufacturing': ['کچے اور تیار مال کا اسٹاک', 'سپلائرز سے خریداری', 'اسٹاک اور پرافٹ رپورٹس', 'آپ کے کام کے حساب سے موڈیول'],
      '/industries/services-biz': ['بکنگ', 'ممبرشپ', 'اسٹاف کمیشن', 'انوائس اور رسید'],
      '/solutions/enterprise': ['ایک اکاؤنٹ میں بہت سی برانچیں', 'رول اور اجازتیں', 'اکاؤنٹنگ ایکسپورٹ اور API', 'ٹیم جو آپ کے ساتھ سیٹ اپ کرتی ہے'],
    },
  },
};

const STRINGS: Record<string, UiStrings> = { en, ur };

export function uiStrings(locale: string | undefined): UiStrings {
  return (locale && STRINGS[locale]) || en;
}
