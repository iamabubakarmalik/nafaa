/** Urdu: Gujranwala city page (/ur/pos-software/gujranwala). Translation of content/cities/gujranwala.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-gujranwala-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'گوجرانوالہ کے شو روم میں GEPCO کی بجلی جانے سے انٹرنیٹ بند ہو تو Nafaa کا کاؤنٹر کیسے چلے گا؟',
    answer:
      'کاؤنٹر رکتا نہیں۔ کنکشن نہ ہونے پر بھی سیلز مین بل بناتا رہتا ہے اور ہر بل اسی فون یا کمپیوٹر کے اندر سنبھال لیا جاتا ہے۔ نیٹ بحال ہوتے ہی یہ بل بغیر کچھ دبائے آپ کے اکاؤنٹ تک پہنچ جاتے ہیں۔ بیچ میں آپ ایک فہرست کھول کر دیکھ سکتے ہیں کہ کتنے بل ابھی رکے ہوئے ہیں۔ دوسری برانچ اور رپورٹس میں یہ سیل سنک ہونے کے بعد نظر آتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-gujranwala-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'گوجرانوالہ کا سینیٹری ڈیلر عام گاہک اور ٹھیکیدار کے لیے دو الگ ریٹ کیسے رکھے؟',
    answer:
      'ہر پروڈکٹ کے ساتھ دو ریٹ لکھے جا سکتے ہیں: ایک ریٹیل کا، دوسرا ہول سیل کا۔ اس کے علاوہ پیس، درجن یا کارٹن، ہر یونٹ کا اپنا ریٹ بھی الگ رکھا جاتا ہے۔ بل بناتے وقت کاؤنٹر خود وہ ریٹ اٹھاتا ہے جو اس سیل پر لاگو ہے۔ ٹھیکیدار اور دوسرے تاجر گاہکوں کا باقی بیلنس اور ان کی ادھار حد کھاتے میں درج رہتی ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-gujranwala-khata-limit',
    locale: 'ur',
    topic: 'khata',
    question: 'گوجرانوالہ کے چاول کے تاجر کسی خریدار کا ادھار ایک حد پر روک سکتے ہیں؟',
    answer:
      'بالکل۔ ہر خریدار کے کھاتے پر ایک ادھار حد لگا دیں۔ اگر نیا ادھار والا بل اسے اس حد سے اوپر لے جا رہا ہو تو کاؤنٹر وہ بل آگے نہیں بڑھنے دیتا، جب تک مینیجر اپنا PIN ڈال کر اجازت نہ دے۔ کھاتہ بقایا رقم کو اس کی عمر کے حساب سے بھی بانٹ کر دکھاتا ہے، تاکہ نیا ادھار اور مہینوں پرانا ادھار الگ الگ سامنے ہو۔',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: 'translation of faq mp-khata-limit',
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'ur-gujranwala-manufacturing',
    locale: 'ur',
    topic: 'solutions',
    question: 'گوجرانوالہ کی پنکھا یا برتن بنانے والی فیکٹری کی پوری پروڈکشن (MRP) Nafaa سنبھال سکتا ہے؟',
    answer:
      'ابھی عام فیکٹری کے لیے یہ الگ ماڈیول کی شکل میں موجود نہیں۔ آج Nafaa کھانے کی پروڈکشن، جیسے بیکری اور کچن، کے لیے خام مال، کاسٹ کے ساتھ ریسیپی اور روز کا پروڈکشن پلان رکھتا ہے، اور کسی بھی فیکٹری کی خریداری، اسٹاک اور سیل سنبھالتا ہے۔ ہر پروڈکٹ کے لیے بل آف میٹیریلز اور ورک آرڈر روڈ میپ پر ہیں۔ ضرورت ہو تو ہماری ٹیم کسٹم ماڈیول بھی بنا سکتی ہے۔',
    sourceNote: 'industries/bakery (IngredientsPage, ProductionPage, RecipeCosting, PlanBuilder); restaurant RecipesPage. General BOM/work orders not found in apps/web.',
    origin: 'translation of faq mp-manufacturing-scope',
    evidence: ['apps/web/src/industries/bakery/pages/ProductionPage.tsx', 'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx', 'apps/web/src/industries/restaurant/pages/RecipesPage.tsx'],
  },
  {
    key: 'ur-gujranwala-excel-import',
    locale: 'ur',
    topic: 'product',
    question: 'گوجرانوالہ کے ہارڈویئر اسٹور کی Excel میں بنی آئٹم لسٹ Nafaa میں کیسے آئے گی؟',
    answer:
      'پہلے امپورٹ کا ٹیمپلیٹ ڈاؤن لوڈ کریں، اس میں آئٹم کا نام، قیمت، کاسٹ، اسٹاک اور بارکوڈ بھریں، پھر فائل اپ لوڈ کر دیں۔ محفوظ کرنے سے پہلے Nafaa فائل جانچتا ہے اور ہر وہ لائن دکھاتا ہے جو نئی بنے گی یا بدلے گی، تاکہ غلطی پہلے ہی پکڑی جائے۔ جب چاہیں پروڈکٹس واپس Excel میں ایکسپورٹ بھی کر سکتے ہیں۔',
    sourceNote: 'ProductBulkImportPage and import/columns.ts; reports/exports.',
    origin: 'translation of faq mp-inventory-import',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/inventory/products/import/columns.ts', 'apps/web/src/modules/reports/exports'],
  },
  {
    key: 'ur-gujranwala-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'گوجرانوالہ کے شو روم یا ڈیلر کو Nafaa کا ماہانہ کتنا خرچ آئے گا؟',
    answer:
      'ماہانہ پیڈ پلان {{price:min.monthly}} سے شروع ہوتا ہے۔ پرائسنگ پیج پر ہر پلان کا ریٹ اور اس میں کیا شامل ہے، سب لکھا ہے؛ یہ معلومات براہ راست ہماری پلان سیٹنگز سے آتی ہیں، اس لیے پرانی نہیں ہوتیں۔ چاہیں تو پہلے مفت ٹرائل پر کام چلا کر دیکھیں۔ سائن اپ کرتے وقت کوئی کریڈٹ کارڈ نہیں مانگا جاتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'gujranwala',
  title: 'گوجرانوالہ',
  seoTitle: 'گوجرانوالہ میں شو روم، ڈیلر اور دکان کے لیے POS سافٹ ویئر',
  seoDescription: 'گوجرانوالہ کے پنکھا اور اپلائنس شو رومز، سینیٹری ڈیلرز اور چاول کے تاجروں کے لیے Nafaa: سیریل نمبر، وارنٹی، قسط اور ٹھیکیدار ریٹ، بجلی جائے تو بھی بل۔',
  focusKeyword: 'گوجرانوالہ POS سافٹ ویئر',
  summary:
    'Nafaa گوجرانوالہ کے اپلائنس اور پنکھوں کے شو رومز، سینیٹری اور ہارڈویئر ڈیلرز، چاول کے تاجروں، ریسٹورنٹس اور کریانہ اسٹورز کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے اپنے فون یا کمپیوٹر پر چلتا ہے، سیریل نمبر، وارنٹی اور قسط کا حساب رکھتا ہے، اور GEPCO کی لوڈ شیڈنگ میں بھی بل بناتا رہتا ہے۔',
  data: {
    name: 'گوجرانوالہ',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q243322',
    geo: { lat: 32.1877, lng: 74.1945 },
    markets: [
      {
        name: 'جی ٹی روڈ کے شو روم',
        note: 'پنکھوں، گھریلو مشینوں، فرنیچر اور سینیٹری کے شو روموں کی لمبی قطار، جن میں سے بہت سے شہر اور آس پاس کا بنا ہوا مال بیچتے ہیں۔',
      },
      {
        name: 'اندرون شہر کے بازار',
        note: 'پرانے شہر کے گنجان بازار، جہاں کپڑا، برتن، عام سامان اور تھوک کا کاروبار ہوتا ہے۔',
      },
      {
        name: 'غلہ اور چاول منڈی',
        note: 'تھوک کی منڈیاں جہاں ضلع بھر سے آنے والا چاول اور دوسری فصل بوری اور ٹرک کے حساب سے بکتی ہے۔',
      },
      {
        name: 'ہارڈویئر اور سینیٹری مارکیٹیں',
        note: 'دکانوں کے جھرمٹ جو پائپ، فٹنگ، ٹونٹیاں، ٹائلیں اور اوزار ٹھیکیداروں اور گھر بنانے والوں کو بیچتے ہیں۔',
      },
    ],
    areas: [
      {
        name: 'سیٹلائٹ ٹاؤن',
        note: 'رہائشی اور کمرشل بلاک، جن میں ریسٹورنٹس، بیکریاں، فارمیسیاں اور جنرل اسٹور ہیں۔',
      },
      {
        name: 'ماڈل ٹاؤن',
        note: 'محلے کی مارکیٹیں، جہاں کریانہ، کپڑوں کی دکانیں اور سیلون اپنے مستقل گاہکوں کو نام سے جانتے ہیں۔',
      },
      {
        name: 'ڈی سی روڈ اور سیالکوٹ روڈ',
        note: 'کمرشل سڑکیں، جن پر شو روم، بینک، ہارڈویئر ڈیلر اور کھانے پینے کی جگہیں ہیں۔',
      },
      {
        name: 'صنعتی علاقے',
        note: 'ورکشاپیں اور کارخانے، اور ان کا کام چلانے والے سپلائر، ڈیلر اور ٹرانسپورٹر۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا ڈالنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں، آپ کے اپنے کاؤنٹر پر۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'گوجرانوالہ میں POS سافٹ ویئر',
      heading: 'گوجرانوالہ',
      sub: 'جی ٹی روڈ کے شو روموں اور ڈیلروں کے لیے: پنکھے اور اپلائنس سیریل نمبر کے ساتھ، سینیٹری فٹنگ سائز اور شیڈ کے حساب سے، ٹھیکیدار ریٹ، قسطیں اور بوری کے حساب سے چاول، سب ایک ہی ایپ سے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['سیریل اور وارنٹی', 'قسط کے پلان', 'ٹھیکیدار ریٹ'],
      media: { kind: 'screenshot', mediaId: SHOT.inventory, frame: 'browser', url: 'app.nafaa.pk/products' },
      layout: 'centered',
      id: 'b72f41d8c8bb',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا کوئی بھی فون، ٹیبلٹ یا کمپیوٹر؛ نیٹ نہ ہو تو بھی بل بنتے ہیں' },
        { label: 'کن کے لیے بہتر', value: 'اپلائنس اور پنکھوں کے شو روم، ہارڈویئر اور سینیٹری ڈیلر، چاول کے تاجر، ریسٹورنٹس، کریانہ اسٹور' },
        { label: 'قسطیں', value: 'ضامن کے ساتھ قسط کا پلان، اور ہر گاہک کا اپنا کھاتہ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Gujranwala ke appliance showrooms, sanitary dealers aur chawal ke traders ke liye Nafaa: serial number, warranty, qist aur contractor rate ek app me. Bijli jaye to bhi bill bante hain.',
      id: 'b51fad983dba',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'گوجرانوالہ میں سیلز ٹیکس', id: 'b6ff9f2f4bd0' },
    {
      type: 'richText',
      markdown:
        '## گوجرانوالہ میں کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nگوجرانوالہ جی ٹی روڈ پر لاہور اور شمال کے شہروں کے بیچ واقع ہے، اور پنجاب کے بڑے صنعتی مرکزوں میں گنا جاتا ہے۔ یہ شہر بجلی کے پنکھوں، سینیٹری فٹنگ، کٹلری، دھات کے سامان اور دوسرے انجینئرنگ کے کام کے لیے مشہور ہے، جس کا بڑا حصہ چھوٹی اور درمیانی ورکشاپوں میں بنتا ہے۔ شہر کے ارد گرد کی زمین پنجاب کی چاول پٹی کا حصہ ہے۔ اور یہاں کا کھانا بھی مشہور ہے، صبح سویرے کے ناشتے سے لے کر رات گئے کے تکے کباب تک۔\n\nNafaa فیکٹری کی پروڈکشن پلان نہیں کرتا۔ یہ بیچنے والا حصہ سنبھالتا ہے: شو روم، ڈیلر، ریٹیل کاؤنٹر، اور ان کے پیچھے کا اسٹاک اور ادھار۔\n\n- **اپلائنس اور پنکھوں کے شو روم** ہر یونٹ اس کے سیریل نمبر اور وارنٹی کے ساتھ درج کرتے ہیں، ضامن کے ساتھ قسط پر بیچتے ہیں، پرانی مشین بدلے میں لیتے ہیں، اور انسٹالیشن اور کمپنی کی وارنٹی کلیم سنبھالتے ہیں۔\n- **ہارڈویئر اور سینیٹری ڈیلر** فٹنگ سائز اور شیڈ کے حساب سے رکھتے ہیں، ریٹیل، ٹھیکیدار اور بلک ریٹ الگ دیتے ہیں، کوٹیشن کو بل میں بدلتے ہیں اور سائٹ پر مال کے ساتھ ڈلیوری چالان بھیجتے ہیں۔\n- **چاول اور غلے کے تاجر** بوری اور کلو کے حساب سے ہول سیل ریٹ پر بیچتے ہیں اور ہر خریدار کا بیلنس اور حد رکھتے ہیں۔\n- **ریسٹورنٹس اور کھانے کی دکانیں** ٹیبل، کچن ٹکٹ اور ڈلیوری ایک ہی اسکرین سے چلاتی ہیں۔\n- **کریانہ اسٹور اور فارمیسیاں** شہر کی کالونیوں میں بارکوڈ سے بیچتی ہیں اور گھرانوں کا کھاتہ رکھتی ہیں۔',
      id: 'b203f5944a39',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'b4a97f22465a' },
    {
      type: 'richText',
      markdown:
        '## گوجرانوالہ میں کام کے حالات\n\n**بجلی۔** گوجرانوالہ کو بجلی GEPCO دیتی ہے، اور کئی علاقوں میں لوڈ شیڈنگ روز کے کام کا حصہ ہے، خاص طور پر گرمیوں میں۔ بل بنانے کے لیے Nafaa کو انٹرنیٹ کی ضرورت نہیں۔ سیل ڈیوائس پر رکھی جاتی ہے اور کنکشن واپس آنے پر آپ کے اکاؤنٹ میں چلی جاتی ہے۔\n\n**قسطوں پر سیل۔** پنکھے، کولر، واشنگ مشین اور فریج اکثر قسط پر بکتے ہیں، خاص طور پر گرمیاں شروع ہونے سے پہلے۔ Nafaa بقایا رقم کو ماہانہ تاریخوں میں بانٹتا ہے، ضامن کو پلان کے ساتھ رکھتا ہے اور ہر وصولی اسی پلان کے سامنے درج کرتا ہے، اس لیے شو روم کو قسطوں کا الگ رجسٹر نہیں رکھنا پڑتا۔\n\n**ٹھیکیدار اور سائٹیں۔** سینیٹری اور ہارڈویئر ڈیلر ایسے ٹھیکیداروں کو مال دیتے ہیں جو ایک وقت میں کئی سائٹیں چلا رہے ہوتے ہیں۔ ٹھیکیدار کے نیچے ہر سائٹ کا اپنا کھاتہ ہو سکتا ہے، اور ہر ڈلیوری کا چالان، تاکہ کام ختم ہونے پر بل وہی بنے جو مال واقعی بھیجا گیا۔\n\n**زبان۔** گوجرانوالہ کے بازاروں میں روز کی بول چال پنجابی ہے، اور لکھائی پڑھائی اردو میں ہوتی ہے۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھتی ہیں، اور سپورٹ کی بات چیت بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b63cf7e9301e',
    },
    {
      type: 'screenshot',
      heading: 'ہر پنکھا اور ہر مشین اپنے سیریل نمبر کے ساتھ',
      body: 'شو روم ہر یونٹ اس کے سیریل نمبر اور وارنٹی کے ساتھ درج کرتا ہے۔ بیچتے وقت سیریل بل پر آ جاتا ہے، اس لیے مہینوں بعد وارنٹی کلیم آئے تو صحیح یونٹ، صحیح گاہک اور صحیح تاریخ فوراً مل جاتی ہے۔',
      mediaId: SHOT.inventory,
      frame: 'browser',
      url: 'app.nafaa.pk/products',
      layout: 'split-right',
      id: 'b43be85ba775',
    },
    {
      type: 'comparisonTable',
      heading: 'گوجرانوالہ کے کاروبار اور ان کے لیے Nafaa کی اسکرینیں',
      caption: 'گوجرانوالہ کے عام کاروباروں کے لیے Nafaa کی کون سی انڈسٹری اسکرینیں ٹھیک رہتی ہیں۔ کاؤنٹر، اسٹاک اور کھاتہ ہر پلان میں شامل ہیں۔',
      columns: [
        { key: 'screens', label: 'Nafaa کی اسکرینیں' },
        { key: 'credit', label: 'ادھار اور ادائیگی' },
      ],
      rows: [
        { label: 'پنکھا اور اپلائنس شو روم', cells: { screens: { value: 'اپلائنسز: سیریل، وارنٹی، انسٹالیشن' }, credit: { value: 'ضامن کے ساتھ قسط، پرانی مشین بدلے میں' } } },
        { label: 'سینیٹری اور ہارڈویئر ڈیلر', cells: { screens: { value: 'ہارڈویئر: سائز، شیڈ، کوٹیشن، چالان' }, credit: { value: 'ٹھیکیدار اور سائٹ کا کھاتہ' } } },
        { label: 'چاول کا تاجر', cells: { screens: { value: 'کریانہ کے یونٹ: بوری اور کلو' }, credit: { value: 'ہول سیل ریٹ، خریدار کی ادھار حد' } } },
        { label: 'ریسٹورنٹ', cells: { screens: { value: 'ٹیبل، کچن ٹکٹ، رائیڈر' }, credit: { value: 'بل تقسیم کرنا، والٹ QR' } } },
        { label: 'گروسری اسٹور', cells: { screens: { value: 'بارکوڈ کاؤنٹر، کم اسٹاک کی لسٹ' }, credit: { value: 'گھرانوں کا کھاتہ، واٹس ایپ یاد دہانی' } } },
      ],
      id: 'b4199c369323',
    },
    {
      type: 'steps',
      heading: 'گوجرانوالہ کے شو روم یا ڈیلر کا سیٹ اپ',
      items: [
        { title: 'فری ٹرائل کھولیں', body: 'فون یا کمپیوٹر پر سائن اپ کریں اور اپلائنسز، ہارڈویئر یا کریانہ چنیں۔' },
        { title: 'اسٹاک سیریل یا سائز کے ساتھ ڈالیں', body: 'اپنی لسٹ Excel سے امپورٹ کریں؛ شو روم یونٹ آنے پر ان کے سیریل نمبر ڈالتے جائیں۔' },
        { title: 'چلتی قسطیں اور کھاتے منتقل کریں', body: 'ہر گاہک کی باقی قسطیں اور ہر ٹھیکیدار کا بیلنس درج کریں۔' },
        { title: 'کاؤنٹر کے عملے کو سکھائیں', body: 'سیلز مین اور کیشیئر کے لیے ایک چھوٹی ویڈیو کال، اردو یا انگریزی میں۔' },
      ],
      id: 'b67ad7e8ef85',
    },
    {
      type: 'richText',
      markdown:
        '## گوجرانوالہ کے کاروباری لوگوں کے سوال\n\n### کیا میں پنکھے اور اپلائنس قسط پر بیچ سکتا ہوں؟\nجی ہاں۔ اپلائنس والی اسکرینیں ایڈوانس لیتی ہیں، باقی رقم ماہانہ تاریخوں میں بانٹتی ہیں، اور ضامن کی تفصیل پلان کے ساتھ رکھتی ہیں۔\n\n### کیا ایک ٹھیکیدار کی ہر سائٹ کا الگ حساب رکھا جا سکتا ہے؟\nجی ہاں۔ ہارڈویئر ڈیلر ایک ٹھیکیدار کے نیچے کئی سائٹیں بنا سکتے ہیں، ہر ایک کا اپنا کھاتہ اور ڈلیوری چالان۔\n\n### کیا Nafaa میری ورکشاپ یا فیکٹری کی پروڈکشن چلاتا ہے؟\nنہیں۔ Nafaa سیل، خریداری، اسٹاک اور کھاتہ سنبھالتا ہے۔ عام مینوفیکچرنگ کے لیے بل آف میٹیریلز اور ورک آرڈر روڈ میپ پر ہیں۔',
      id: 'bc1269b435bf',
    },
    { type: 'cityFacts', show: ['support'], heading: 'گوجرانوالہ میں سپورٹ', id: 'bb27162f76e0' },
    { type: 'pricingTable', heading: 'گوجرانوالہ کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b51f3b78b8fc' },
    { type: 'faq', heading: 'مزید سوال', id: 'bb8ed19ec1cf' },
    {
      type: 'cta',
      heading: 'گوجرانوالہ میں آج ہی بل بنانا شروع کریں',
      body: 'جو ڈیوائس آپ پہلے سے استعمال کرتے ہیں اسی پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b0728f149cad',
    },
  ],
  featured: false,
  sortOrder: 9,
  origin: 'translation of content/cities/gujranwala.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/appliances',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/restaurant',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  sources: [
    { title: 'Gujranwala (Wikidata Q243322)', url: 'https://www.wikidata.org/wiki/Q243322', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Gujranwala (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gujranwala', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Gujranwala Electric Power Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gujranwala_Electric_Power_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; GEPCO). No office named.' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: ['HQ address and on-site support (O4) before the hub names an office.'],
  faqKeys: [
    'ur-gujranwala-offline',
    'ur-gujranwala-wholesale-prices',
    'ur-gujranwala-khata-limit',
    'ur-gujranwala-manufacturing',
    'ur-gujranwala-excel-import',
    'ur-gujranwala-pricing',
  ],
  relations: [
    { ref: 'INDUSTRY:appliances@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics@ur', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:manufacturing@ur', kind: 'RELATED' },
  ],
};
