/** Urdu: Faisalabad city page (/ur/pos-software/faisalabad). Translation of content/cities/faisalabad.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-faisalabad-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'فیصل آباد میں FESCO کی لوڈ شیڈنگ کے دوران نیٹ نہ ہو تو کیا Nafaa پر بل بنیں گے؟',
    answer:
      'جی ہاں، نیٹ چلا جائے تو بھی کاؤنٹر پر بلنگ نہیں رکتی۔ آف لائن بنی سیل اسی ڈیوائس میں محفوظ رہتی ہے اور کنکشن بحال ہوتے ہی اپنے آپ آپ کے اکاؤنٹ میں چلی جاتی ہے۔ کون سی سیل ابھی بھیجنی ہے، اس کی لسٹ آپ دیکھ سکتے ہیں۔ سنک ہونے کے بعد یہ سیل رپورٹس اور باقی برانچوں میں نظر آنے لگتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-faisalabad-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'فیصل آباد کا کپڑا ڈیلر دکاندار اور عام گاہک کے لیے ہول سیل اور ریٹیل ریٹ الگ رکھ سکتا ہے؟',
    answer:
      'جی ہاں۔ ایک پروڈکٹ پر ریٹیل اور ہول سیل دونوں قیمتیں رکھی جا سکتی ہیں، اور ہر یونٹ، جیسے پیس، درجن یا کارٹن، کی قیمت بھی اپنی ہوتی ہے۔ کاؤنٹر سیل دیکھ کر مناسب قیمت لگا دیتا ہے، اور کھاتے میں ہر تاجر گاہک کا بیلنس اور اس کی ادھار حد لکھی رہتی ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-faisalabad-khata-limit',
    locale: 'ur',
    topic: 'khata',
    question: 'فیصل آباد کا دھاگہ یا کپڑا ڈیلر ہر خریدار کی ادھار حد مقرر کر سکتا ہے؟',
    answer:
      'جی ہاں۔ کھاتے کے ہر گاہک کی الگ ادھار حد ہو سکتی ہے۔ جب نئی ادھار سیل اسے حد سے اوپر لے جائے تو کاؤنٹر بل کو روک لیتا ہے، اور مینیجر کے PIN سے منظوری کے بعد ہی بل بنتا ہے۔ کھاتہ باقی رقم کو اس کی عمر کے حساب سے گروپ بھی کرتا ہے، تاکہ دکھے کون سا بیلنس تازہ ہے اور کون سا مہینوں سے رکا ہے۔',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: 'translation of faq mp-khata-limit',
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'ur-faisalabad-manufacturing-scope',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا فیصل آباد کی فیکٹری یا مل Nafaa سے پوری مینوفیکچرنگ (MRP) چلا سکتی ہے؟',
    answer:
      'ابھی عام ماڈیول کے طور پر نہیں۔ آج Nafaa کھانے کی پروڈکشن، جیسے بیکری اور کچن، کے لیے کچا مال، کاسٹ کے ساتھ ریسیپیاں اور روز کا پروڈکشن پلان سنبھالتا ہے، اور کسی بھی فیکٹری کے لیے خریداری، اسٹاک اور سیل۔ ہر پروڈکٹ کے لیے بل آف میٹیریلز اور ورک آرڈر روڈ میپ پر ہیں۔ ہماری ٹیم کسٹم ماڈیول بھی بنا سکتی ہے۔',
    sourceNote: 'industries/bakery (IngredientsPage, ProductionPage, RecipeCosting, PlanBuilder); restaurant RecipesPage. General BOM/work orders not found in apps/web.',
    origin: 'translation of faq mp-manufacturing-scope',
    evidence: ['apps/web/src/industries/bakery/pages/ProductionPage.tsx', 'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx', 'apps/web/src/industries/restaurant/pages/RecipesPage.tsx'],
  },
  {
    key: 'ur-faisalabad-units',
    locale: 'ur',
    topic: 'kiryana',
    question: 'فیصل آباد کا کریانہ اسٹور ایک ہی چیز پیس، درجن اور کارٹن میں بیچ سکتا ہے؟',
    answer:
      'جی ہاں۔ ایک پروڈکٹ کئی یونٹ میں بیچی جا سکتی ہے، جیسے پیس، درجن اور کارٹن، اور ہر یونٹ کی قیمت الگ ہوتی ہے۔ یوں ایک ہی بسکٹ کسی گاہک کو اکیلے پیکٹ میں جاتا ہے اور تھوک خریدنے والے دکاندار کو پورے کارٹن میں، دونوں اپنی اپنی قیمت پر۔',
    sourceNote: 'Retail pack: multi-unit pricing (piece/dozen/carton).',
    origin: 'translation of faq kiryana-units',
    evidence: ['apps/web/src/industries/retail/RetailPack.tsx'],
  },
  {
    key: 'ur-faisalabad-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'فیصل آباد کے کپڑا ڈیلر یا دکاندار کے لیے Nafaa کی قیمت کتنی ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہوتے ہیں۔ پرائسنگ پیج پر ہر پلان اپنی قیمت اور حد کے ساتھ لکھا ہے، اور یہ معلومات سیدھی ہماری پلان سیٹنگز سے آتی ہیں، اس لیے ہمیشہ موجودہ رہتی ہیں۔ آپ پہلے فری ٹرائل سے آغاز کر سکتے ہیں، اور سائن اپ میں کریڈٹ کارڈ نہیں لگتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'faisalabad',
  title: 'فیصل آباد',
  seoTitle: 'فیصل آباد میں کپڑا، دھاگہ اور دکان کے لیے POS سافٹ ویئر',
  seoDescription: 'فیصل آباد کے کپڑا اور دھاگہ ڈیلرز، گارمنٹس شاپس اور ایگری اسٹورز کے لیے Nafaa: میٹر، بوری یا پیس میں بل، ادھار حد والا کھاتہ، اور لوڈ شیڈنگ میں بھی بلنگ۔',
  focusKeyword: 'فیصل آباد POS سافٹ ویئر',
  summary:
    'Nafaa فیصل آباد کے کپڑا اور دھاگہ ڈیلرز، گارمنٹس شاپس، ایگری اسٹورز اور کریانہ والوں کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے اپنے فون یا کمپیوٹر پر چلتا ہے، میٹر، بوری یا پیس میں بیچتا ہے، تاجروں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے، اور FESCO کی لوڈ شیڈنگ میں بھی بل بناتا رہتا ہے۔',
  data: {
    name: 'فیصل آباد',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q173985',
    geo: { lat: 31.4504, lng: 73.135 },
    markets: [
      {
        name: 'گھنٹہ گھر کے بازار',
        area: 'شہر کا مرکز',
        note: 'گھنٹہ گھر سے آٹھ بازار نکلتے ہیں، جن کا نقشہ برطانوی جھنڈے یونین جیک جیسا ہے: کچہری، ریل، کارخانہ، منٹگمری، جھنگ، بھوانہ، امین پور اور چنیوٹ بازار، جو کپڑے، گارمنٹس، برتنوں اور عام سامان کی دکانوں سے بھرے رہتے ہیں۔',
      },
      {
        name: 'یارن مارکیٹ',
        note: 'دھاگے کی تجارت کا مرکز، جہاں ڈیلر اسپننگ ملوں سے خرید کر بُنکروں کو بیچتے ہیں، اکثر ادھار پر اور بوری کے حساب سے۔',
      },
      {
        name: 'گھنٹہ گھر کے آس پاس کپڑے کی مارکیٹیں',
        note: 'ہول سیل فیبرک کی دکانیں، جو پورے پنجاب کے دکانداروں اور درزیوں کو لان، کاٹن اور مکس کپڑا دیتی ہیں۔',
      },
      {
        name: 'غلہ منڈی',
        note: 'گندم، چاول اور آس پاس کی زرعی زمینوں سے آنے والی دوسری فصلوں کی ہول سیل منڈی۔',
      },
    ],
    areas: [
      {
        name: 'ڈی گراؤنڈ اور پیپلز کالونی',
        note: 'شہر کا بڑا جدید خریداری کا علاقہ، جہاں برانڈڈ کپڑوں کے آؤٹ لیٹ، ریسٹورنٹس، کیفے اور بیکریاں ہیں۔',
      },
      {
        name: 'سوسن روڈ اور مدینہ ٹاؤن',
        note: 'رہائشی اور کمرشل بلاک، جہاں سپر مارکیٹس، فارمیسیاں، سیلون اور کھانے کی دکانیں ہیں۔',
      },
      {
        name: 'ستیانہ روڈ',
        note: 'لمبی کمرشل سڑک، جس پر شو روم، ہارڈ ویئر اور تعمیراتی سامان کی دکانیں ہیں، اور قریب تیزی سے بڑھتی ہاؤسنگ اسکیمیں۔',
      },
      {
        name: 'سرگودھا روڈ اور جڑانوالہ روڈ کی انڈسٹریل اسٹیٹس',
        note: 'ملیں، لومز اور پروسیسنگ یونٹ، اور ان کا کام کرنے والے سپلائر، ورکشاپس اور ڈیلر۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا منتقل کرنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ فیصل آباد میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر مدد کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'فیصل آباد میں POS سافٹ ویئر',
      heading: 'فیصل آباد',
      sub: 'گھنٹہ گھر والے شہر کے لیے: کپڑا میٹر میں، دھاگہ بوری میں، کھاد فصل کے ادھار پر اور کریانہ کھاتے پر، سب کا بل ایک ایپ سے جو بجلی جانے پر بھی نہیں رکتی۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['حد والا تاجروں کا کھاتہ', 'یونٹ اور ہول سیل ریٹ', 'لوڈ شیڈنگ میں بھی بل'],
      media: { kind: 'screenshot', mediaId: SHOT.khata, frame: 'browser', url: 'app.nafaa.pk/customers/khata' },
      layout: 'centered',
      id: 'bf796857d79f',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا کوئی بھی فون، ٹیبلٹ یا کمپیوٹر؛ کاؤنٹر آف لائن چلتا ہے' },
        { label: 'کن کے لیے بہتر', value: 'کپڑا اور دھاگہ ڈیلر، گارمنٹس شاپس، ایگری اسٹور، کریانہ، ہارڈ ویئر کی دکانیں' },
        { label: 'کس کے لیے نہیں', value: 'مل یا لوم کی پروڈکشن چلانا؛ Nafaa بیچنے، خریدنے اور اسٹاک کا حصہ سنبھالتا ہے' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Faisalabad ke kapra aur dhaga dealers, garment shops aur agri stores ke liye Nafaa: metre, bori ya piece me bill, trade ka khata aur stock ek app me. Bijli jaye to bhi counter chalta rehta hai.',
      id: 'b1407fde1c8b',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'فیصل آباد میں سیلز ٹیکس', id: 'bf27ba9f32ec' },
    {
      type: 'richText',
      markdown:
        '## فیصل آباد کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nفیصل آباد کو اکثر پاکستان کا مانچسٹر کہا جاتا ہے۔ شہر کے گرد اسپننگ اور ویونگ ملیں، پاور لومز، رنگائی اور پروسیسنگ یونٹ ہیں، اور ان کا مال کپڑے اور دھاگے کی منڈیوں سے ہو کر ملک بھر کی دکانوں تک جاتا ہے۔ یہ شہر پنجاب کے سب سے زرخیز زرعی ضلعوں میں سے ایک کا تجارتی مرکز بھی ہے اور یہاں زرعی یونیورسٹی ہے، اس لیے بیج، کھاد اور اسپرے کے ڈیلر مقامی کاروبار کا بڑا حصہ ہیں۔\n\nNafaa مل یا لوم کی پروڈکشن کی پلاننگ نہیں کرتا۔ یہ وہ کام سنبھالتا ہے جو کاؤنٹر اور گودام کے دروازے پر ہوتا ہے: بیچنا، سپلائرز سے خریدنا، اسٹاک، اور وہ ادھار جو ان دونوں میں چلتا ہے۔\n\n- **کپڑا اور فیبرک ڈیلر** میٹر اور تھان کے حساب سے بیچتے ہیں، دکانداروں کے لیے ہول سیل ریٹ اور عام گاہک کے لیے ریٹیل ریٹ رکھتے ہیں، اور ہر تاجر خریدار کا بیلنس دیکھتے ہیں۔\n- **دھاگہ ڈیلر** بوری کے حساب سے خریدتے اور بیچتے ہیں، سپلائر کے بل اور ادائیگیاں درج کرتے ہیں، اور ایک نظر میں دیکھتے ہیں کہ ہر خریدار پر کتنا باقی ہے۔\n- **گارمنٹس اور بوتیک** سائز اور رنگ کے حساب سے اسٹاک رکھتے ہیں اور محفوظ ناپ کے ساتھ سلائی کے آرڈر لیتے ہیں۔\n- **ایگری اسٹور** کسانوں کے کھاتے فصل تک ادھار کے ساتھ رکھتے ہیں، تھوک آرڈر لیتے ہیں اور سیزن کے حساب سے اسٹاک کی تیاری کرتے ہیں۔\n- **کریانہ اور ہارڈ ویئر کی دکانیں** شہر کی کالونیوں میں یہی کاؤنٹر، کھاتہ اور کم اسٹاک کی لسٹ استعمال کرتی ہیں۔',
      id: 'b76b2fdb4e00',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'bcfc1cd6478e' },
    {
      type: 'richText',
      markdown:
        '## فیصل آباد میں کام کے حالات\n\n**لوڈ شیڈنگ۔** فیصل آباد کو بجلی FESCO دیتی ہے، اور بندش کام کے دن کا معمول ہے، خاص کر گرمیوں میں۔ جو کاؤنٹر ہر وقت کنکشن مانگتا ہے وہ ہر بار راؤٹر بند ہونے پر سیل گنواتا ہے۔ Nafaa ڈیوائس پر بل بناتا رہتا ہے اور انٹرنیٹ واپس آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔\n\n**سب کچھ ادھار پر چلتا ہے۔** کپڑے اور دھاگے کا بہت سا کاروبار کھاتے پر ہوتا ہے، اور مال جانے کے کئی ہفتے بعد پیسے آتے ہیں۔ Nafaa کا کھاتہ ہر خریدار کے بل اور ادائیگیاں ایک جگہ رکھتا ہے، ہر خریدار کی ادھار حد لگاتا ہے، اور باقی رقم کو عمر کے حساب سے گروپ کرتا ہے تاکہ نظر آئے کون سا بیلنس نیا ہے اور کون سا مہینوں سے انتظار میں ہے۔\n\n**سیزن۔** کپڑے کی سیل دونوں عیدوں اور شادیوں کے سیزن سے پہلے عروج پر ہوتی ہے؛ ایگری اسٹور گندم اور کپاس کی بوائی کے وقت سب سے مصروف ہوتے ہیں۔ دن اور پروڈکٹ کے حساب سے رپورٹس بتاتی ہیں کہ پچھلے سال کے سیزن میں کیا بکا، جو اگلے سیزن کا مال منگواتے وقت کام آتا ہے۔\n\n**زبان۔** فیصل آباد کے بازاروں کی روز مرہ زبان پنجابی ہے، اور لکھنے اور بل بنانے میں اردو چلتی ہے۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھائی جا سکتی ہیں۔',
      id: 'bb4c2b38dd48',
    },
    {
      type: 'screenshot',
      heading: 'ہر تاجر خریدار پر کتنا باقی ہے، کب سے',
      body: 'کپڑے یا دھاگے کا ڈیلر ہر خریدار کا بیلنس اس کے پیچھے کے بلوں اور ادائیگیوں کے ساتھ دیکھتا ہے، اس ترتیب سے کہ کون سا کتنی دیر سے رکا ہے۔ جب نیا بل کسی خریدار کی ادھار حد سے آگے جائے تو کاؤنٹر اسے مینیجر کی منظوری تک روک دیتا ہے۔',
      mediaId: SHOT.khata,
      frame: 'browser',
      url: 'app.nafaa.pk/customers/khata',
      layout: 'split-left',
      id: 'b4fff6191c43',
    },
    {
      type: 'comparisonTable',
      heading: 'فیصل آباد کے کاروباروں میں بیچنے کے یونٹ',
      caption: 'ہر پروڈکٹ کے کئی یونٹ ہو سکتے ہیں، ہر ایک کی اپنی قیمت۔ فیصل آباد کے کاروبار انہیں کیسے سیٹ کرتے ہیں، اس کی مثالیں۔',
      columns: [
        { key: 'units', label: 'استعمال ہونے والے یونٹ' },
        { key: 'prices', label: 'کون سی قیمتیں رکھی جاتی ہیں' },
      ],
      rows: [
        { label: 'کپڑا ڈیلر', cells: { units: { value: 'میٹر اور پورا تھان' }, prices: { value: 'ہر یونٹ کی ریٹیل اور ہول سیل قیمت' } } },
        { label: 'دھاگہ ڈیلر', cells: { units: { value: 'بوری اور کلو' }, prices: { value: 'فی بوری ریٹیل اور ہول سیل قیمت' } } },
        { label: 'ایگری اسٹور', cells: { units: { value: 'بوری، بوتل اور پیکٹ' }, prices: { value: 'کاؤنٹر قیمت؛ کسان کا ادھار کھاتے میں' } } },
        { label: 'کریانہ اسٹور', cells: { units: { value: 'پیس، درجن اور کارٹن' }, prices: { value: 'ریٹیل قیمت اور دکاندار قیمت' } } },
        { label: 'گارمنٹس شاپ', cells: { units: { value: 'سائز اور رنگ کے حساب سے پیس' }, prices: { value: 'فکس قیمت، ڈسکاؤنٹ کا ریکارڈ ساتھ' } } },
      ],
      id: 'ba8dc2c2a79d',
    },
    {
      type: 'steps',
      heading: 'فیصل آباد میں Nafaa سے شروعات',
      items: [
        { title: 'فری ٹرائل کھولیں', body: 'جو ڈیوائس پہلے سے استعمال کرتے ہیں اسی پر سائن اپ کریں اور اپنا کاروبار چنیں: کپڑا، گارمنٹس، ایگری، کریانہ یا ہارڈ ویئر۔' },
        { title: 'اپنے یونٹ اور ریٹ لگائیں', body: 'پروڈکٹس ان یونٹس کے ساتھ ڈالیں جن میں آپ بیچتے ہیں، ہر ایک کی اپنی ریٹیل اور ہول سیل قیمت کے ساتھ۔' },
        { title: 'اپنے خریدار منتقل کریں', body: 'ہر تاجر خریدار کو اس کے پرانے بیلنس اور ادھار حد کے ساتھ ڈالیں، یا مدد کے لیے لسٹ واٹس ایپ پر بھیج دیں۔' },
        { title: 'سپلائر کے بل درج کریں', body: 'ملوں اور سپلائرز سے جو خریدتے ہیں وہ درج کریں، تاکہ پہلے ہفتے سے اسٹاک اور دینے والی رقم ٹھیک رہے۔' },
      ],
      id: 'b1e284edae29',
    },
    {
      type: 'richText',
      markdown:
        '## فیصل آباد کے کاروباری لوگوں کے سوال\n\n### کیا Nafaa میری پاور لوم یا مل کی پروڈکشن چلا سکتا ہے؟\nنہیں۔ Nafaa لومز، اسپننگ یا پروسیسنگ کی پلاننگ نہیں کرتا۔ یہ آپ کا سیل کاؤنٹر، خریداری، اسٹاک اور کھاتہ سنبھالتا ہے۔ عام مینوفیکچرنگ کے لیے بل آف میٹیریلز اور ورک آرڈر روڈ میپ پر ہیں۔\n\n### کیا کپڑا میٹر میں بھی اور پورے تھان میں بھی بیچ سکتا ہوں؟\nجی ہاں۔ دونوں کو ایک ہی پروڈکٹ کے یونٹ کے طور پر ڈالیں، ہر ایک کی اپنی قیمت کے ساتھ، اور اسٹاک کی گنتی ایک ہی جگہ رہتی ہے۔\n\n### کیا کسان فصل آنے تک ادھار پر خرید سکتے ہیں؟\nجی ہاں۔ ہر کسان کو حد کے ساتھ کھاتے کا گاہک بنا لیں؛ فصل کے بعد کی ادائیگیاں بل بہ بل بیلنس صاف کرتی جاتی ہیں۔',
      id: 'b8280271be9f',
    },
    { type: 'cityFacts', show: ['support'], heading: 'فیصل آباد میں سپورٹ', id: 'b00833cb99ee' },
    { type: 'pricingTable', heading: 'فیصل آباد کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b3efc60e7523' },
    { type: 'faq', heading: 'مزید سوال', id: 'bca5abce6c58' },
    {
      type: 'cta',
      heading: 'فیصل آباد میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے فون یا کمپیوٹر پر مفت آزمائیں۔ سیٹ اپ میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'bbc40313e060',
    },
  ],
  featured: true,
  sortOrder: 5,
  origin: 'translation of content/cities/faisalabad.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/agri',
    'apps/web/src/modules/inventory/product-units',
    'apps/web/src/modules/purchasing',
    'apps/web/src/modules/customers/khata/api/customer-ledger.api.ts',
  ],
  sources: [
    { title: 'Faisalabad (Wikidata Q173985)', url: 'https://www.wikidata.org/wiki/Q173985', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Faisalabad (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Faisalabad', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Clock Tower, Faisalabad (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Clock_Tower,_Faisalabad', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Faisalabad Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Faisalabad_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'University of Agriculture, Faisalabad (Wikipedia)', url: 'https://en.wikipedia.org/wiki/University_of_Agriculture,_Faisalabad', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; FESCO; the eight Clock Tower bazaars).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-faisalabad-offline', 'ur-faisalabad-wholesale-prices', 'ur-faisalabad-khata-limit', 'ur-faisalabad-manufacturing-scope', 'ur-faisalabad-units', 'ur-faisalabad-pricing'],
  relations: [
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:agri@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware@ur', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:manufacturing@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing@ur', kind: 'RELATED' },
  ],
};
