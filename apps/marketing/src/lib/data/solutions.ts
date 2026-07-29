export interface Solution {
  slug: string;
  emoji: string;
  titleEn: string;
  titleUr: string;
  headlineEn: string;
  headlineUr: string;
  descEn: string;
  descUr: string;
  directAnswerEn: string;
  directAnswerUr: string;
  benefits: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string }>;
  recommendedFeatures: string[];
  recommendedIntegrations: string[];
  idealFor: Array<{ en: string; ur: string }>;
  color: string;
}

export const solutions: Solution[] = [
  {
    slug: 'small-business',
    emoji: '🏪',
    titleEn: 'Small Business', titleUr: 'چھوٹا کاروبار',
    headlineEn: 'Everything a small shop needs, nothing it can\'t afford',
    headlineUr: 'چھوٹی دکان کو جو چاہیے، بس وہی',
    descEn: 'Start free, pay as you grow. One device, full POS, digital khata, and WhatsApp receipts.',
    descUr: 'مفت شروع کریں، بڑھنے پر ادائیگی۔',
    directAnswerEn: 'Nafaa\'s small business plan gives a single shop a complete POS, digital khata, WhatsApp receipts, and basic reports — starting free with no credit card. It runs on any phone you already own.',
    directAnswerUr: 'نفع کا چھوٹے کاروبار کا پلان ایک دکان کو مکمل پی او ایس، ڈجیٹل کھاتہ، اور واٹس ایپ رسیدیں دیتا ہے۔',
    benefits: [
      { titleEn: 'Free to start', titleUr: 'مفت آغاز', descEn: 'No credit card, no commitment, no risk.', descUr: 'کوئی کارڈ نہیں، کوئی خطرہ نہیں۔' },
      { titleEn: 'Runs on your phone', titleUr: 'آپ کے فون پر چلتا ہے', descEn: 'No expensive hardware needed.', descUr: 'مہنگا ہارڈ ویئر نہیں چاہیے۔' },
      { titleEn: 'Learn in one hour', titleUr: 'ایک گھنٹے میں سیکھیں', descEn: 'If you use WhatsApp, you can use Nafaa.', descUr: 'واٹس ایپ چلانا آتا ہے تو نفع بھی آئے گا۔' },
      { titleEn: 'Grow without switching', titleUr: 'بغیر تبدیلی کے بڑھیں', descEn: 'Same platform scales to enterprise.', descUr: 'وہی پلیٹ فارم انٹرپرائز تک۔' },
    ],
    recommendedFeatures: ['pos', 'khata', 'inventory', 'reports'],
    recommendedIntegrations: ['jazzcash', 'easypaisa', 'whatsapp-business'],
    idealFor: [
      { en: 'Kiryana and general stores', ur: 'کریانہ اور جنرل اسٹورز' },
      { en: 'Home-based businesses', ur: 'گھر پر چلنے والے کاروبار' },
      { en: 'Single-counter retail shops', ur: 'ایک کاؤنٹر والی دکانیں' },
    ],
    color: '#12b76a',
  },
  {
    slug: 'multi-location',
    emoji: '🏢',
    titleEn: 'Multi-Location Chains', titleUr: 'ملٹی لوکیشن چینز',
    headlineEn: 'Run every branch like it\'s your only branch',
    headlineUr: 'ہر برانچ کو واحد برانچ کی طرح چلائیں',
    descEn: 'Centralized control with local flexibility. Consolidated reports, transfers, and role-based access.',
    descUr: 'مرکزی کنٹرول، مقامی لچک۔',
    directAnswerEn: 'Nafaa Multi-Location gives chains a central dashboard over every branch: consolidated reporting, inter-shop stock transfers, per-shop pricing, and role-based staff access — with offline capability at each location.',
    directAnswerUr: 'نفع ملٹی لوکیشن چینز کو ہر برانچ پر مرکزی ڈیش بورڈ دیتا ہے۔',
    benefits: [
      { titleEn: 'One command center', titleUr: 'ایک کمانڈ سینٹر', descEn: 'Every branch visible in real time.', descUr: 'ہر برانچ حقیقی وقت میں۔' },
      { titleEn: 'Inter-branch transfers', titleUr: 'انٹر برانچ ٹرانسفر', descEn: 'Balance stock across locations.', descUr: 'مقامات پر اسٹاک متوازن کریں۔' },
      { titleEn: 'Regional managers', titleUr: 'علاقائی منتظمین', descEn: 'Hierarchical access for large teams.', descUr: 'بڑی ٹیموں کے لیے درجہ بند رسائی۔' },
      { titleEn: 'Branch benchmarking', titleUr: 'برانچ موازنہ', descEn: 'Compare performance across shops.', descUr: 'دکانوں کی کارکردگی کا موازنہ۔' },
    ],
    recommendedFeatures: ['multi-shop', 'analytics', 'staff', 'inventory'],
    recommendedIntegrations: ['fbr', 'raast', 'whatsapp-business'],
    idealFor: [
      { en: 'Retail chains with 3-50 branches', ur: '۳-۵۰ برانچز والی چینز' },
      { en: 'Franchise networks', ur: 'فرنچائز نیٹ ورکس' },
      { en: 'Restaurant groups', ur: 'ریسٹورنٹ گروپس' },
    ],
    color: '#f97316',
  },
  {
    slug: 'enterprise',
    emoji: '🏛️',
    titleEn: 'Enterprise', titleUr: 'انٹرپرائز',
    headlineEn: 'Enterprise-grade power with Pakistani roots',
    headlineUr: 'پاکستانی جڑوں کے ساتھ انٹرپرائز طاقت',
    descEn: 'Custom SLAs, dedicated infrastructure, on-premise options, API access, and a dedicated success team.',
    descUr: 'کسٹم ایس ایل اے، وقف انفراسٹرکچر، اے پی آئی رسائی۔',
    directAnswerEn: 'Nafaa Enterprise provides large organizations with dedicated infrastructure, custom SLAs, on-premise or private cloud deployment, full API access, SSO, audit logs, and a dedicated customer success team.',
    directAnswerUr: 'نفع انٹرپرائز بڑے اداروں کو وقف انفراسٹرکچر اور مکمل اے پی آئی رسائی فراہم کرتا ہے۔',
    benefits: [
      { titleEn: 'Dedicated infrastructure', titleUr: 'وقف انفراسٹرکچر', descEn: 'Your own isolated environment.', descUr: 'آپ کا اپنا الگ ماحول۔' },
      { titleEn: 'Full API access', titleUr: 'مکمل اے پی آئی', descEn: 'Integrate with any ERP or system.', descUr: 'کسی بھی سسٹم سے انضمام۔' },
      { titleEn: 'SSO and audit logs', titleUr: 'ایس ایس او اور آڈٹ لاگز', descEn: 'Enterprise security standards.', descUr: 'انٹرپرائز سیکورٹی معیارات۔' },
      { titleEn: 'Dedicated success team', titleUr: 'وقف ٹیم', descEn: 'Named account manager, 24/7.', descUr: 'نامزد اکاؤنٹ منیجر، ۲۴/۷۔' },
    ],
    recommendedFeatures: ['api', 'multi-shop', 'analytics', 'fraud-detection'],
    recommendedIntegrations: ['fbr', 'custom-website', 'raast'],
    idealFor: [
      { en: 'Nationwide retail chains', ur: 'ملک گیر ریٹیل چینز' },
      { en: 'Manufacturers with distribution', ur: 'ڈسٹریبیوشن والے مینوفیکچررز' },
      { en: 'Public sector organizations', ur: 'پبلک سیکٹر ادارے' },
    ],
    color: '#8b5cf6',
  },
  {
    slug: 'online-first',
    emoji: '🌐',
    titleEn: 'Online-First Sellers', titleUr: 'آن لائن فرسٹ سیلرز',
    headlineEn: 'Built for businesses that live on the internet',
    headlineUr: 'انٹرنیٹ پر رہنے والے کاروبار کے لیے',
    descEn: 'Daraz, Shopify, custom website, and Nafaa Bazaar — sell on every channel from one inventory.',
    descUr: 'دراز، شاپیفائی، کسٹم سائٹ، اور نفع بازار۔',
    directAnswerEn: 'Nafaa Online-First unifies every sales channel — Daraz, Shopify, WooCommerce, your custom website, and Nafaa Bazaar — into one inventory, one order queue, and one analytics dashboard.',
    directAnswerUr: 'نفع آن لائن فرسٹ ہر سیلز چینل کو ایک انوینٹری اور ایک ڈیش بورڈ میں یکجا کرتا ہے۔',
    benefits: [
      { titleEn: 'One inventory, every channel', titleUr: 'ایک انوینٹری، ہر چینل', descEn: 'Sell everywhere without overselling.', descUr: 'اوور سیلنگ کے بغیر ہر جگہ بیچیں۔' },
      { titleEn: 'Unified order queue', titleUr: 'متحد آرڈر قطار', descEn: 'Every order in one screen.', descUr: 'ہر آرڈر ایک اسکرین میں۔' },
      { titleEn: 'Courier automation', titleUr: 'کوریئر آٹومیشن', descEn: 'Book TCS or Leopards in one click.', descUr: 'ایک کلک میں ٹی سی ایس بک کریں۔' },
      { titleEn: 'Channel analytics', titleUr: 'چینل تجزیات', descEn: 'Know which channel earns most.', descUr: 'جانیں کون سا چینل سب سے زیادہ کمانے والا ہے۔' },
    ],
    recommendedFeatures: ['inventory', 'marketplace-selling', 'reports', 'notifications'],
    recommendedIntegrations: ['daraz', 'shopify', 'tcs', 'jazzcash'],
    idealFor: [
      { en: 'E-commerce brands', ur: 'ای کامرس برانڈز' },
      { en: 'Instagram and TikTok sellers', ur: 'انسٹاگرام اور ٹک ٹاک سیلرز' },
      { en: 'Dropshippers', ur: 'ڈراپ شپرز' },
    ],
    color: '#0284c7',
  },
  {
    slug: 'coming-from-tally',
    emoji: '🔄',
    titleEn: 'Switching from Tally', titleUr: 'ٹیلی سے تبدیلی',
    headlineEn: 'Moving from Tally? We\'ll carry your data for you',
    headlineUr: 'ٹیلی سے آ رہے ہیں؟ ڈیٹا ہم منتقل کریں گے',
    descEn: 'Free AI-assisted migration. Your items, ledgers, and balances moved in days, not weeks.',
    descUr: 'مفت اے آئی منتقلی۔ دنوں میں، ہفتوں میں نہیں۔',
    directAnswerEn: 'Nafaa offers free AI-assisted migration from Tally: upload your exports and our system maps items, ledgers, customers, and opening balances automatically. Most migrations complete within 3 business days with zero data loss.',
    directAnswerUr: 'نفع ٹیلی سے مفت اے آئی منتقلی پیش کرتا ہے — زیادہ تر ۳ دن میں مکمل۔',
    benefits: [
      { titleEn: 'Free migration', titleUr: 'مفت منتقلی', descEn: 'Zero cost, zero data loss.', descUr: 'صفر لاگت، صفر نقصان۔' },
      { titleEn: 'AI field mapping', titleUr: 'اے آئی فیلڈ میپنگ', descEn: 'Automatic column matching.', descUr: 'خودکار کالم میچنگ۔' },
      { titleEn: 'Modern interface', titleUr: 'جدید انٹرفیس', descEn: 'Your team will love the upgrade.', descUr: 'آپ کی ٹیم کو اپ گریڈ پسند آئے گا۔' },
      { titleEn: 'Mobile access included', titleUr: 'موبائل رسائی شامل', descEn: 'Something Tally never gave you.', descUr: 'جو ٹیلی نے کبھی نہیں دیا۔' },
    ],
    recommendedFeatures: ['reports', 'inventory', 'khata', 'analytics'],
    recommendedIntegrations: ['fbr', 'jazzcash', 'whatsapp-business'],
    idealFor: [
      { en: 'Businesses stuck on desktop Tally', ur: 'ڈیسک ٹاپ ٹیلی پر پھنسے کاروبار' },
      { en: 'Accountants managing multiple clients', ur: 'متعدد کلائنٹس والے اکاؤنٹنٹس' },
    ],
    color: '#059669',
  },
  {
    slug: 'coming-from-excel',
    emoji: '📊',
    titleEn: 'Switching from Excel', titleUr: 'ایکسل سے تبدیلی',
    headlineEn: 'Your Excel sheets deserve an upgrade',
    headlineUr: 'آپ کی ایکسل شیٹس اپ گریڈ کی حقدار ہیں',
    descEn: 'Import every sheet. Keep your structure. Gain automation, backup, and multi-user access.',
    descUr: 'ہر شیٹ امپورٹ کریں۔ آٹومیشن اور بیک اپ پائیں۔',
    directAnswerEn: 'Nafaa imports your Excel product lists, customer ledgers, and sales history in minutes. Your data structure is preserved, but you gain real-time sync, automatic backup, multi-user access, and reports that Excel could never produce.',
    directAnswerUr: 'نفع آپ کی ایکسل شیٹس منٹوں میں امپورٹ کرتا ہے — حقیقی وقت ہم آہنگی اور بیک اپ کے ساتھ۔',
    benefits: [
      { titleEn: 'Direct Excel import', titleUr: 'براہ راست ایکسل امپورٹ', descEn: 'Your sheets become live data.', descUr: 'آپ کی شیٹس لائیو ڈیٹا بن جائیں۔' },
      { titleEn: 'No more version chaos', titleUr: 'ورژن الجھن ختم', descEn: 'One source of truth for everyone.', descUr: 'سب کے لیے ایک سچائی۔' },
      { titleEn: 'Automatic backup', titleUr: 'خودکار بیک اپ', descEn: 'Never lose a sheet again.', descUr: 'کبھی شیٹ نہ کھوئیں۔' },
      { titleEn: 'Real formulas, live', titleUr: 'حقیقی فارمولے، لائیو', descEn: 'Reports update themselves.', descUr: 'رپورٹس خود اپ ڈیٹ ہوتی ہیں۔' },
    ],
    recommendedFeatures: ['inventory', 'khata', 'reports', 'pos'],
    recommendedIntegrations: ['whatsapp-business', 'jazzcash'],
    idealFor: [
      { en: 'Shops running on notebooks and Excel', ur: 'نوٹ بکس اور ایکسل پر چلنے والی دکانیں' },
      { en: 'Accountants with Excel workflows', ur: 'ایکسل ورک فلو والے اکاؤنٹنٹس' },
    ],
    color: '#0d9488',
  },
  {
    slug: 'franchise',
    emoji: '🤝',
    titleEn: 'Franchise Networks', titleUr: 'فرنچائز نیٹ ورکس',
    headlineEn: 'Franchise control without franchise headaches',
    headlineUr: 'فرنچائز کنٹرول، بغیر فرنچائز سر درد',
    descEn: 'Brand consistency, royalty tracking, and franchisee autonomy — balanced perfectly.',
    descUr: 'برانڈ مستقل مزاجی، رائلٹی ٹریکنگ، اور خود مختاری۔',
    directAnswerEn: 'Nafaa Franchise gives franchisors central brand control — locked pricing, mandatory products, and brand standards — while franchisees get operational freedom with their own staff, local stock, and daily management. Royalty calculations are automatic.',
    directAnswerUr: 'نفع فرنچائز فرنچائزرز کو مرکزی برانڈ کنٹرول اور خودکار رائلٹی حساب دیتا ہے۔',
    benefits: [
      { titleEn: 'Brand lock controls', titleUr: 'برانڈ لاک کنٹرولز', descEn: 'Lock menus, prices, standards.', descUr: 'مینیو، قیمتیں، معیارات لاک کریں۔' },
      { titleEn: 'Automatic royalties', titleUr: 'خودکار رائلٹی', descEn: 'Percentage or fixed, auto-calculated.', descUr: 'فیصد یا مقررہ، خودکار حساب۔' },
      { titleEn: 'Franchisee dashboards', titleUr: 'فرنچائزی ڈیش بورڈز', descEn: 'Each owner sees only their data.', descUr: 'ہر مالک صرف اپنا ڈیٹا دیکھے۔' },
      { titleEn: 'Network-wide analytics', titleUr: 'نیٹ ورک تجزیات', descEn: 'Compare every location instantly.', descUr: 'ہر مقام کا فوری موازنہ۔' },
    ],
    recommendedFeatures: ['multi-shop', 'analytics', 'staff', 'reports'],
    recommendedIntegrations: ['fbr', 'raast'],
    idealFor: [
      { en: 'Food franchise chains', ur: 'فوڈ فرنچائز چینز' },
      { en: 'Retail franchise networks', ur: 'ریٹیل فرنچائز نیٹ ورکس' },
    ],
    color: '#dc2626',
  },
  {
    slug: 'wholesale',
    emoji: '📦',
    titleEn: 'Wholesale & Distribution', titleUr: 'ہول سیل و ڈسٹریبیوشن',
    headlineEn: 'Wholesale pricing, bulk orders, credit accounts — solved',
    headlineUr: 'ہول سیل قیمتیں، بلک آرڈرز، کریڈٹ اکاؤنٹس — حل شدہ',
    descEn: 'Tiered pricing, carton-level inventory, salesman routes, and structured credit terms for retailers.',
    descUr: 'درجہ بند قیمتیں، کارٹن سطح انوینٹری، سیلز مین روٹس۔',
    directAnswerEn: 'Nafaa Wholesale handles tiered customer pricing, carton-and-piece inventory math, salesman route management, and structured credit accounts with aging reports — purpose-built for Pakistani distributors and wholesale markets.',
    directAnswerUr: 'نفع ہول سیل درجہ بند قیمتیں، کارٹن انوینٹری، سیلز مین روٹس، اور کریڈٹ اکاؤنٹس سنبھالتا ہے۔',
    benefits: [
      { titleEn: 'Customer price tiers', titleUr: 'کسٹمر قیمت درجات', descEn: 'Retailer, sub-dealer, distributor rates.', descUr: 'ریٹیلر، سب ڈیلر، ڈسٹریبیوٹر ریٹس۔' },
      { titleEn: 'Carton math built-in', titleUr: 'کارٹن حساب شامل', descEn: 'Sell cartons, track pieces automatically.', descUr: 'کارٹن بیچیں، پیس خودکار ٹریک۔' },
      { titleEn: 'Credit aging reports', titleUr: 'کریڈٹ ایجنگ رپورٹس', descEn: '30/60/90 day buckets, auto-reminders.', descUr: '۳۰/۶۰/۹۰ دن، خودکار یاد دہانیاں۔' },
      { titleEn: 'Route management', titleUr: 'روٹ مینجمنٹ', descEn: 'Assign salesmen, track coverage.', descUr: 'سیلز مین تفویض، کوریج ٹریک۔' },
    ],
    recommendedFeatures: ['inventory', 'khata', 'multi-shop', 'reports'],
    recommendedIntegrations: ['raast', 'whatsapp-business', 'fbr'],
    idealFor: [
      { en: 'FMCG distributors', ur: 'ایف ایم سی جی ڈسٹریبیوٹرز' },
      { en: 'Wholesale market traders', ur: 'ہول سیل مارکیٹ تاجر' },
      { en: 'Brand distribution companies', ur: 'برانڈ ڈسٹریبیوشن کمپنیاں' },
    ],
    color: '#7c3aed',
  },
];

export const getSolution = (slug: string) => solutions.find((s) => s.slug === slug);
