/** Urdu: Lahore city page (/ur/pos-software/lahore). Translation of content/cities/lahore.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-lahore-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'کیا Nafaa چلانے کے لیے کمپیوٹر ضروری ہے؟',
    answer:
      'نہیں۔ Nafaa ویب براؤزر میں چلتا ہے، اس لیے جو فون، ٹیبلٹ یا کمپیوٹر آپ کے پاس پہلے سے ہے وہی کافی ہے۔ بارکوڈ اسکینر اور رسید پرنٹر بعد میں لگائے جا سکتے ہیں، شروع کرنے کے لیے ضروری نہیں۔ کاؤنٹر انٹرنیٹ کے بغیر بھی چلتا رہتا ہے اور کنکشن واپس آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'ur-lahore-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'کیا Nafaa انٹرنیٹ کے بغیر چلتا ہے؟',
    answer:
      'جی ہاں، انٹرنیٹ چلا جائے تو بھی کاؤنٹر پر بل بنتے رہتے ہیں۔ آف لائن سیل اسی ڈیوائس پر محفوظ رہتی ہے اور کنکشن واپس آتے ہی خود بخود آپ کے اکاؤنٹ میں چلی جاتی ہے۔ جو سیل ابھی بھیجی جانی باقی ہے وہ بھی آپ دیکھ سکتے ہیں۔ رپورٹس اور دوسری برانچیں یہ سیل تب دیکھتی ہیں جب وہ سنک ہو جائے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-lahore-fbr-who',
    locale: 'ur',
    topic: 'compliance',
    question: 'Nafaa انوائس کن ٹیکس اداروں کو بھیجتا ہے؟',
    answer:
      'Nafaa ایک FBR اور PRA سے منظور شدہ POS انٹیگریٹر ہے۔ یہ Tier-1 ریٹیلرز کی سیل انوائس FBR کو بھیجتا ہے، اور سروسز کی انوائس صوبائی اداروں کو: پنجاب میں PRA، سندھ میں SRB اور خیبر پختونخوا میں KPRA۔ ہر بل کو اس کا فسکل انوائس نمبر اور QR کوڈ ملتا ہے جو رسید پر پرنٹ ہوتا ہے۔',
    sourceNote: 'integrations/fbr (IMS PostData) and integrations/tax-authority adapters (PRA, SRB, KPRA, FBR).',
    origin: 'translation of faq mp-fbr-who',
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-lahore-khata-reminders',
    locale: 'ur',
    topic: 'khata',
    question: 'کیا Nafaa ادھار کی یاد دہانی واٹس ایپ پر بھیج سکتا ہے؟',
    answer:
      'جی ہاں۔ کھاتے میں ہر گاہک کا ادھار، پیمنٹس اور پرانے رجسٹر سے لائے گئے بیلنس رہتے ہیں۔ کھاتے سے ہی آپ ایک ٹیپ میں گاہک کو اس کے بیلنس کے ساتھ واٹس ایپ یاد دہانی بھیجتے ہیں۔ یاد دہانیاں آپ کے اپنے واٹس ایپ سے ایک ایک کر کے جاتی ہیں، اور ادھار جتنا پرانا ہو، الفاظ اتنے سخت ہوتے جاتے ہیں۔',
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'translation of faq khata-reminders',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },
  {
    key: 'ur-lahore-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'Nafaa کی قیمت کتنی ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہوتے ہیں۔ پرائسنگ والے صفحے پر ہر پلان اپنی قیمت اور حدود کے ساتھ لکھا ہے، اور یہ سب سیدھا ہماری پلان سیٹنگز سے آتا ہے، اس لیے ہمیشہ تازہ رہتا ہے۔ آپ پہلے فری ٹرائل سے شروع کر سکتے ہیں، اور سائن اپ کے لیے کریڈٹ کارڈ کی ضرورت نہیں۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'lahore',
  title: 'لاہور',
  seoTitle: 'لاہور میں دکان اور کاروبار کے لیے POS سافٹ ویئر',
  seoDescription: 'لاہور کی دکانوں اور کاروبار کے لیے Nafaa: POS، اسٹاک، کھاتہ اور رپورٹس، مقامی مارکیٹوں کی معلومات اور واٹس ایپ پر سپورٹ۔',
  focusKeyword: 'لاہور POS سافٹ ویئر',
  summary:
    'Nafaa لاہور کی دکانوں، ریسٹورنٹس اور کاروباروں کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ اسی فون یا کمپیوٹر پر چلتا ہے جو آپ کے پاس پہلے سے ہے، انٹرنیٹ کے بغیر بھی بل بناتا ہے، اور ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔ سیٹ اپ میں مدد واٹس ایپ پر ملتی ہے۔',
  data: {
    name: 'لاہور',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q11739',
    geo: { lat: 31.5204, lng: 74.3587 },
    markets: [
      {
        name: 'ہال روڈ',
        note: 'شہر کی الیکٹرانکس، موبائل اور ایکسیسریز کی مارکیٹ، جہاں ہول سیل اور ریٹیل کاؤنٹر ساتھ ساتھ ہیں، اور سیریل نمبر، وارنٹی اور تاجروں کا ادھار اتنا ہی اہم ہے جتنی رفتار۔',
      },
      {
        name: 'انارکلی بازار',
        area: 'اندرون شہر',
        note: 'لاہور کے پرانے بازاروں میں سے ایک، کپڑے، جوتوں، فیبرک اور گھریلو سامان کی دکانوں سے بھرا ہوا، جہاں ایک ہی چیز کئی سائز اور رنگوں میں بکتی ہے۔',
      },
      {
        name: 'لبرٹی مارکیٹ',
        area: 'گلبرگ',
        note: 'ایک مصروف مارکیٹ اسکوائر کے گرد کپڑے، جوتوں اور کاسمیٹکس کے بوتیک، قریب ہی کھانے پینے کی جگہیں، اور یہاں کارڈ اور والٹ سے پیمنٹ عام ہے۔',
      },
      {
        name: 'شاہ عالم مارکیٹ',
        area: 'اندرون شہر',
        note: 'جنرل سامان، کاسمیٹکس، کھلونوں اور گھریلو چیزوں کا ہول سیل مرکز جو پورے پنجاب کے دکانداروں کو مال دیتا ہے، زیادہ تر کارٹن میں اور ادھار پر۔',
      },
      {
        name: 'اکبری منڈی',
        area: 'اندرون شہر',
        note: 'مصالحوں، ڈرائی فروٹ، اناج اور کریانہ سامان کی ہول سیل منڈی، جہاں وزن اور بوری کے حساب سے خرید و فروخت عام ہے۔',
      },
      {
        name: 'اعظم کلاتھ مارکیٹ',
        note: 'کپڑے کی ایک بڑی ہول سیل مارکیٹ جہاں تاجر دکانوں اور درزیوں کو میٹر اور تھان کے حساب سے فیبرک بیچتے ہیں۔',
      },
    ],
    areas: [
      {
        name: 'گلبرگ',
        note: 'بڑی سڑکوں پر ریسٹورنٹس، کیفے اور برانڈڈ آؤٹ لیٹس؛ یہاں کئی برانچوں والے کاروبار اکثر ایک ہی اکاؤنٹ سے کئی کاؤنٹر چلاتے ہیں۔',
      },
      {
        name: 'DHA',
        note: 'رہائشی فیزز کے لیے سپر مارکیٹس، فارمیسیاں، سیلون اور کیفے، جہاں ہوم ڈیلیوری اور آن لائن آرڈر بہت ہوتے ہیں۔',
      },
      {
        name: 'جوہر ٹاؤن',
        note: 'ایک بڑا رہائشی اور کمرشل علاقہ، جہاں ہر بڑی سڑک پر گروسری اسٹور، موبائل شاپس، بیکریاں اور کھانے کی دکانیں ہیں۔',
      },
      {
        name: 'ماڈل ٹاؤن',
        note: 'محلے کی مارکیٹس جن میں کریانہ اسٹور، فارمیسیاں اور کپڑوں کی دکانیں ہیں، جو برسوں پرانے مستقل گاہکوں کو کھاتے پر مال دیتی ہیں۔',
      },
      {
        name: 'بحریہ ٹاؤن',
        note: 'پلان کیے گئے کمرشل ایریاز، جہاں ریسٹورنٹس، جنرل اسٹور اور سروس والے کاروبار نئی برانچیں کھول رہے ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، Excel یا پرانے سافٹ ویئر سے ڈیٹا منتقل کرنا اور ٹریننگ، سب واٹس ایپ اور ویڈیو کال پر دور سے ہوتا ہے، اردو یا انگریزی میں۔ زیادہ تر دکانیں اسی دن بل بنانا شروع کر دیتی ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'لاہور میں POS سافٹ ویئر',
      heading: 'لاہور',
      sub: 'ہال روڈ کے کاؤنٹر سے گلبرگ کے کیفے تک: لاہور کے کاروباروں کے لیے بل، اسٹاک، کھاتہ اور آن لائن آرڈر، اسی فون یا کمپیوٹر پر جو آپ کے پاس پہلے سے ہے، لوڈ شیڈنگ میں بھی۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['آف لائن بھی چلتا ہے', 'ڈیجیٹل کھاتہ', 'واٹس ایپ پر سیٹ اپ'],
      media: { kind: 'screenshot', mediaId: 'media_retail-dashboard', frame: 'browser', url: 'app.nafaa.pk/dashboard' },
      layout: 'centered',
      id: 'be45a9ae1486',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'جو فون، ٹیبلٹ یا کمپیوٹر آپ کے پاس پہلے سے ہے، انٹرنیٹ کے بغیر بھی' },
        { label: 'کس کے لیے', value: 'دکانیں، ریسٹورنٹس، ہول سیلرز، آن لائن بیچنے والے اور سروس والے کاروبار' },
        { label: 'سیٹ اپ', value: 'واٹس ایپ اور ویڈیو کال پر دور سے سیٹ اپ اور ٹریننگ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Lahore ki dukaanon, restaurants aur karobar ke liye Nafaa: bill, stock aur khata ek app me. Bijli ya internet jaye to bhi counter chalta rehta hai, aur setup WhatsApp par.',
      id: 'b76273271a32',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'لاہور میں سیلز ٹیکس', id: 'b525009a6054' },
    {
      type: 'richText',
      markdown:
        '## لاہور کے کاروبار جو Nafaa پر چلتے ہیں\n\nلاہور کی تجارت اندرون شہر کی ہول سیل منڈیوں سے لے کر گلبرگ کی ریسٹورنٹ والی سڑکوں اور ہاؤسنگ سوسائٹیوں کی سپر مارکیٹس تک پھیلی ہوئی ہے۔ ایک ہی Nafaa اکاؤنٹ ان سب کو سنبھالتا ہے، ہر کاروبار کے لیے بنی اسکرینوں کے ساتھ:\n\n- **کریانہ اور جنرل اسٹور** دانہ، درجن اور کارٹن کے حساب سے بیچتے ہیں، مستقل گاہکوں کو کھاتے پر رکھتے ہیں اور واٹس ایپ پر یاد دہانی بھیجتے ہیں۔\n- **ریسٹورنٹس اور کیفے** ٹیبل، کچن کی پرچیاں اور ڈیلیوری ایک ہی اسکرین سے چلاتے ہیں۔\n- **ہال روڈ کی موبائل اور الیکٹرانکس شاپس** فون IMEI سے ٹریک کرتی ہیں، اور تاجر گاہکوں کو ادھار پر مال دیتی ہیں۔\n- **انارکلی اور لبرٹی کی کپڑے اور جوتوں کی دکانیں** اسٹاک سائز اور رنگ کے حساب سے رکھتی ہیں۔\n- **شاہ عالم اور اکبری منڈی کے ہول سیلرز** کارٹن کی قیمتیں، ادھار کی حد اور سپلائرز کے کھاتے رکھتے ہیں۔\n- **پورے شہر کی فارمیسیاں، سیلون اور بیکریاں** اسی کاؤنٹر کے اوپر اپنی اپنی Nafaa اسکرینیں استعمال کرتی ہیں۔',
      id: 'be19ccc71b74',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'مارکیٹس اور علاقے', id: 'bbf2adf5c9fd' },
    {
      type: 'screenshot',
      heading: 'لاہور کی ہر برانچ کے لیے ایک ڈیش بورڈ',
      body: 'جن مالکان کی ایک دکان اندرون شہر میں اور دوسری کسی ہاؤسنگ سوسائٹی میں ہے، وہ دونوں برانچیں ساتھ ساتھ دیکھتے ہیں: سیل، پرافٹ، کیش اور اسٹاک، لائیو۔',
      mediaId: 'media_retail-branches',
      frame: 'browser',
      url: 'app.nafaa.pk/branches',
      layout: 'full',
      id: 'ba7d1d656082',
    },
    {
      type: 'steps',
      heading: 'لاہور میں شروع کیسے کریں',
      items: [
        { title: 'فری ٹرائل شروع کریں', body: 'اپنے کاؤنٹر والے فون یا کمپیوٹر پر سائن اپ کریں۔ کارڈ کی ضرورت نہیں۔' },
        { title: 'اپنی لسٹ بھیجیں', body: 'اپنے پراڈکٹس اور کھاتے کے بیلنس Excel میں، یا رجسٹر کی تصویریں، واٹس ایپ پر بھیج دیں۔' },
        { title: 'کام شروع کریں', body: 'ہم واٹس ایپ پر آپ کے ساتھ رسید، پرنٹر اور پہلے بل چیک کرتے ہیں۔' },
        { title: 'ٹیم کو سکھائیں', body: 'کیشیئرز اور مینیجرز کے لیے ایک مختصر ویڈیو کال، اردو یا انگریزی میں۔' },
      ],
      id: 'baec66feea10',
    },
    {
      type: 'featuresGrid',
      heading: 'لاہور کے کاروبار Nafaa کیوں چنتے ہیں',
      columns: 3,
      items: [
        { icon: 'wifi-off', title: 'لوڈ شیڈنگ میں بھی', body: 'کاؤنٹر انٹرنیٹ کے بغیر بل بناتا رہتا ہے اور بعد میں سنک کر لیتا ہے۔' },
        { icon: 'receipt-text', title: 'ٹیکس انوائس', body: 'FBR/PRA انٹیگریشن اختیاری ہے، صرف اگر آپ کے کاروبار کو ضرورت ہو۔' },
        { icon: 'notebook-pen', title: 'مستقل گاہکوں کا کھاتہ', body: 'ہر گاہک کا ادھار، ایک ٹیپ میں واٹس ایپ یاد دہانی کے ساتھ۔' },
        { icon: 'building-2', title: 'کئی برانچیں', body: 'اندرون شہر اور سوسائٹی کی برانچیں ایک ہی اکاؤنٹ میں۔' },
        { icon: 'truck', title: 'آن لائن آرڈر', body: 'ویب سائٹ، Shopify، WooCommerce اور Foodpanda کے آرڈر کاؤنٹر کی سیل کے ساتھ۔' },
        { icon: 'languages', title: 'اردو اور انگریزی', body: 'اسکرینیں اور سپورٹ اس زبان میں جو آپ کی ٹیم پڑھتی ہے۔' },
      ],
      id: 'b53d73e3877b',
    },
    { type: 'cityFacts', show: ['support'], heading: 'لاہور میں سپورٹ', id: 'bd0622706dff' },
    { type: 'pricingTable', heading: 'لاہور کے کاروباروں کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'bdffe91ba8a5' },
    { type: 'faq', heading: 'عام سوالات', id: 'bf39ef6d3007' },
    {
      type: 'cta',
      heading: 'لاہور میں آج ہی بل بنانا شروع کریں',
      body: 'جو ڈیوائس آپ کے پاس ہے اسی پر سات دن فری۔ سیٹ اپ میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b9a7320eed6e',
    },
  ],
  featured: true,
  sortOrder: 2,
  origin: 'translation of content/cities/lahore.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/industries',
  ],
  sources: [
    { title: 'Lahore (Wikidata Q11739)', url: 'https://www.wikidata.org/wiki/Q11739', publisher: 'Wikidata', accessedAt: '2026-10-20' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. No services-tax rate is stated, as in the English entry.' },
  dropped: [],
  needsOwner: [],
  faqKeys: ['ur-lahore-devices', 'ur-lahore-offline', 'ur-lahore-fbr-who', 'ur-lahore-khata-reminders', 'ur-lahore-pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
  ],
};
