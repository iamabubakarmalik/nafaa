/** Urdu: Sialkot city page (/ur/pos-software/sialkot). Translation of content/cities/sialkot.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-sialkot-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'سیالکوٹ کی اسپورٹس شاپ پر دن میں نیٹ چلا جائے تو کیا Nafaa میں بل کٹتے رہیں گے؟',
    answer:
      'ہاں، کاؤنٹر کو بل کاٹنے کے لیے کنکشن کی ضرورت نہیں۔ نیٹ کے بغیر جو سیل ہو وہ اسی ڈیوائس کی میموری میں لکھ لی جاتی ہے، اور جیسے ہی انٹرنیٹ لوٹے، اکاؤنٹ میں اپنے آپ اپ لوڈ ہو جاتی ہے۔ اسکرین پر ایک چھوٹی لسٹ یہ بھی بتاتی ہے کہ کون سے بل ابھی بھیجے جانے ہیں۔ رپورٹس اور باقی برانچوں کو یہ سیل سنک کے بعد دکھنے لگتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-sialkot-manufacturing',
    locale: 'ur',
    topic: 'solutions',
    question: 'سیالکوٹ میں فٹ بال یا سرجیکل آلات بنانے والا یونٹ کیا Nafaa سے اپنی مینوفیکچرنگ (MRP) چلا سکتا ہے؟',
    answer:
      'ابھی نہیں، کم از کم ایک عام ماڈیول کے طور پر نہیں۔ اس وقت Nafaa بیکری اور کچن جیسی کھانے کی پروڈکشن کے لیے خام مال، کاسٹنگ والی ریسیپی اور روزانہ کا پروڈکشن پلان سنبھالتا ہے۔ کسی بھی فیکٹری کی خریداری، اسٹاک اور سیل بھی اس میں چلتی ہے۔ ہر طرح کی پروڈکٹ کے بل آف میٹیریلز اور ورک آرڈر روڈ میپ میں شامل ہیں، اور ہماری ٹیم آپ کے لیے کسٹم ماڈیول بھی تیار کر سکتی ہے۔',
    sourceNote: 'industries/bakery (IngredientsPage, ProductionPage, RecipeCosting, PlanBuilder); restaurant RecipesPage. General BOM/work orders not found in apps/web.',
    origin: 'translation of faq mp-manufacturing-scope',
    evidence: ['apps/web/src/industries/bakery/pages/ProductionPage.tsx', 'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx', 'apps/web/src/industries/restaurant/pages/RecipesPage.tsx'],
  },
  {
    key: 'ur-sialkot-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'سیالکوٹ کا پیکیجنگ سپلائر ورکشاپوں کو ہول سیل اور دکان پر آنے والے کو ریٹیل ریٹ کیسے دے؟',
    answer:
      'پروڈکٹ پر دونوں قیمتیں ساتھ ساتھ رہتی ہیں، ریٹیل والی اور ہول سیل والی۔ پیس، درجن اور کارٹن کی قیمت بھی ہر یونٹ کے لیے الگ ڈالی جاتی ہے۔ سیل کی نوعیت کے مطابق کاؤنٹر درست قیمت خود لگا دیتا ہے۔ ورکشاپ والے اور دوسرے تجارتی خریدار کتنے کے مقروض ہیں اور ان کی ادھار حد کیا ہے، یہ سب کھاتے میں موجود رہتا ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-sialkot-excel-import',
    locale: 'ur',
    topic: 'product',
    question: 'سیالکوٹ کے فیکٹری آؤٹ لیٹ کا سائز اور رنگ والا مال Excel شیٹ سے Nafaa میں ڈالا جا سکتا ہے؟',
    answer:
      'جی ہاں۔ Nafaa کا امپورٹ ٹیمپلیٹ اتاریں اور اس میں ہر آئٹم کا نام، قیمت، کاسٹ، اسٹاک اور بارکوڈ لکھیں، پھر شیٹ اپ لوڈ کریں۔ کچھ بھی سیو ہونے سے پہلے Nafaa پوری شیٹ چیک کر کے دکھاتا ہے کہ کون سی لائن نئی بنے گی اور کون سی تبدیل ہو گی، اس لیے غلط لائن وقت پر ٹھیک ہو جاتی ہے۔ پروڈکٹ لسٹ کسی بھی وقت دوبارہ Excel میں نکالی جا سکتی ہے۔',
    sourceNote: 'ProductBulkImportPage and import/columns.ts; reports/exports.',
    origin: 'translation of faq mp-inventory-import',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/inventory/products/import/columns.ts', 'apps/web/src/modules/reports/exports'],
  },
  {
    key: 'ur-sialkot-staff-permissions',
    locale: 'ur',
    topic: 'product',
    question: 'سیالکوٹ کی دکان کا مالک کیسے یقینی بنائے کہ عملہ اپنی مرضی سے ڈسکاؤنٹ یا ریفنڈ نہ دے؟',
    answer:
      'ہر ملازم کو ایک رول دیا جاتا ہے، اور اس رول کی اپنی اجازتیں ہوتی ہیں۔ کاؤنٹر کے قواعد طے کرتے ہیں کہ کس کام پر مینیجر کی منظوری چاہیے۔ شروع سے ہی ریفنڈ کے لیے مینیجر PIN لازمی ہوتا ہے، اور آپ کی رکھی ہوئی حد سے بڑا ڈسکاؤنٹ دینے پر بھی۔ ہر حساس کام ایکٹیویٹی لاگ میں اس شخص کے نام کے ساتھ لکھا جاتا ہے جس نے وہ کیا۔',
    sourceNote: 'core/security/ManagerPin.tsx; counter rules (refund PIN default on, discount limit); reports/activity-log.',
    origin: 'translation of faq mp-staff-permissions',
    evidence: ['apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/reports/activity-log', 'apps/web/src/modules/hr/staff'],
  },
  {
    key: 'ur-sialkot-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'سیالکوٹ کے سپلائر یا آؤٹ لیٹ کے لیے Nafaa کی فیس کیا ہے؟',
    answer:
      'پیڈ پلانوں کی شروعات {{price:min.monthly}} فی مہینہ سے ہوتی ہے۔ پرائسنگ پیج پر ہر پلان کی فیس اور حدیں درج ہیں، جو ہماری پلان سیٹنگز سے سیدھی آتی ہیں، اس لیے وہاں لکھی قیمت ہی اصل قیمت ہوتی ہے۔ آغاز مفت ٹرائل سے کریں؛ اکاؤنٹ بنانے کے لیے کریڈٹ کارڈ کی ضرورت نہیں پڑتی۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'sialkot',
  title: 'سیالکوٹ',
  seoTitle: 'سیالکوٹ میں دکان، آؤٹ لیٹ اور سپلائر کے لیے POS سافٹ ویئر',
  seoDescription: 'سیالکوٹ کی اسپورٹس شاپس، فیکٹری آؤٹ لیٹس اور سپلائرز کے لیے Nafaa: ٹیم آرڈر ایڈوانس کے ساتھ، خریداری اور سپلائر کا حساب، اور نیٹ کے بغیر بل۔',
  focusKeyword: 'سیالکوٹ POS سافٹ ویئر',
  summary:
    'Nafaa سیالکوٹ کی اسپورٹس گڈز شاپس، فیکٹری آؤٹ لیٹس، ایکسپورٹ انڈسٹری کو مال دینے والے سپلائرز، ریسٹورنٹس اور کریانہ اسٹورز کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے موجودہ فون یا کمپیوٹر پر چلتا ہے، خریداری اور اسٹاک کا حساب رکھتا ہے، اور سپلائر اور گاہک دونوں کا ادھار ایک کھاتے میں رکھتا ہے۔',
  data: {
    name: 'سیالکوٹ',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q643883',
    geo: { lat: 32.4945, lng: 74.5229 },
    markets: [
      {
        name: 'ٹرنک بازار',
        area: 'اندرون شہر',
        note: 'پرانے شہر کے بڑے بازاروں میں سے ایک، جہاں کپڑا، برتن، عام سامان اور گھریلو چیزوں کی دکانیں ہیں۔',
      },
      {
        name: 'سیالکوٹ کینٹ صدر',
        area: 'کینٹ',
        note: 'خریداری کا علاقہ جہاں کپڑوں، جوتوں، بیکری، فارمیسی اور ریسٹورنٹس کی دکانیں کینٹ اور قریبی کالونیوں کا کام کرتی ہیں۔',
      },
      {
        name: 'اسپورٹس گڈز کی دکانیں اور آؤٹ لیٹس',
        note: 'شہر بھر میں کرکٹ، فٹ بال، باکسنگ اور جم کا سامان بیچنے والی دکانیں، جن میں کچھ مال مقامی بنانے والوں کا ہوتا ہے، اور جو پرچون میں بھی بیچتی ہیں اور ٹیموں کو بھی۔',
      },
      {
        name: 'کشمیر روڈ اور پیرس روڈ',
        note: 'کمرشل سڑکیں، جن پر شو روم، بینک، کیفے اور ایکسپورٹ کمپنیوں کے دفتر ہیں۔',
      },
    ],
    areas: [
      {
        name: 'کینٹ',
        note: 'پلان کی گئی مارکیٹیں، جن میں کیفے، سپر مارکیٹیں، سیلون اور کپڑوں کے آؤٹ لیٹ ہیں۔',
      },
      {
        name: 'ماڈل ٹاؤن اور ڈیفنس روڈ',
        note: 'رہائشی علاقے، جن میں جنرل اسٹور، فارمیسیاں اور کھانے پینے کی دکانیں ہیں۔',
      },
      {
        name: 'اسمال انڈسٹریل اسٹیٹ',
        note: 'ورکشاپیں اور یونٹ جو اسپورٹس کا سامان، آلات اور چمڑے کی چیزیں بناتے ہیں، اور ان کے قریب ان کے سپلائر۔',
      },
      {
        name: 'اگوکی اور سمبڑیال روڈ کے قصبے',
        note: 'شہر کے کنارے بڑھتے قصبے، جہاں ورکشاپیں، ڈیلر اور محلے کی دکانیں ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا ڈالنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ سیالکوٹ میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر مدد کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'سیالکوٹ میں POS سافٹ ویئر',
      heading: 'سیالکوٹ',
      sub: 'سیالکوٹ دنیا کے لیے فٹ بال، کرکٹ کا سامان اور سرجیکل آلات بناتا ہے۔ Nafaa اس کاروبار کے ارد گرد کے کاؤنٹر چلاتا ہے: اسپورٹس شاپس، فیکٹری آؤٹ لیٹس، پیکیجنگ اور ہارڈویئر کے سپلائر، اور شہر کے کیفے اور اسٹور۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['ٹیم آرڈر ایڈوانس کے ساتھ', 'خریداری اور سپلائر', 'انٹرنیٹ کے بغیر بل'],
      media: { kind: 'screenshot', mediaId: SHOT.inventory, frame: 'browser', url: 'app.nafaa.pk/products' },
      layout: 'centered',
      id: 'b7e40df0767f',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا کوئی بھی فون، ٹیبلٹ یا کمپیوٹر؛ آف لائن بل بھی شامل' },
        { label: 'کن کے لیے بہتر', value: 'اسپورٹس گڈز شاپس، فیکٹری آؤٹ لیٹس، ہارڈویئر اور پیکیجنگ سپلائر، ریسٹورنٹس، کریانہ اسٹور' },
        { label: 'کس کام کا نہیں', value: 'ایکسپورٹ کی پروڈکشن پلاننگ یا شپنگ کے کاغذات' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Sialkot ki sports shops, factory outlets aur suppliers ke liye Nafaa: team orders, khareed, stock aur khata ek app me. Export ki production ya shipping papers Nafaa nahi banata.',
      id: 'b6aa44c51105',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'سیالکوٹ میں سیلز ٹیکس', id: 'bfa961e6cf73' },
    {
      type: 'richText',
      markdown:
        '## سیالکوٹ میں کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nسیالکوٹ پاکستان کے سب سے جانے پہچانے ایکسپورٹ شہروں میں سے ہے۔ اس کی ورکشاپیں اور فیکٹریاں ہاتھ سے سلے اور مشین سے بنے فٹ بال، کرکٹ بیٹ اور سامان، دستانے، سرجیکل اور ڈینٹل آلات، چمڑے کے کپڑے اور موسیقی کے آلات بناتی ہیں، اور زیادہ تر مال باہر کے ملکوں کو بیچتی ہیں۔ یہاں کی کاروباری برادری مل کر کام کرنے کے لیے بھی مشہور ہے: سیالکوٹ انٹرنیشنل ایئرپورٹ مقامی کاروباری لوگوں کے پیسے سے بنا، اور سیالکوٹ ڈرائی پورٹ ملک کے پہلے ڈرائی پورٹس میں سے تھا۔\n\nایکسپورٹ کی پروڈکشن پلاننگ، غیر ملکی کرنسی میں کاسٹنگ اور شپنگ کے کاغذات Nafaa کا کام نہیں۔ Nafaa وہ مقامی کاروبار چلاتا ہے جو ایکسپورٹ انڈسٹری کے گرد چلتا ہے:\n\n- **اسپورٹس گڈز شاپس** کرکٹ، فٹ بال اور جم کا سامان کاؤنٹر پر بیچتی ہیں، پرنٹنگ اور ایڈوانس کے ساتھ ٹیم آرڈر لیتی ہیں، بیٹ اور ریکٹ مرمت کرتی ہیں اور برانڈ کا ریکارڈ رکھتی ہیں۔\n- **فیکٹری آؤٹ لیٹس** فالتو اور سیکنڈ کوالٹی کا مال مقامی خریداروں کو بارکوڈ کاؤنٹر سے بیچتے ہیں، اسٹاک سائز اور رنگ کے حساب سے۔\n- **ہارڈویئر، اوزار اور پیکیجنگ کے سپلائر** ورکشاپوں کو کھاتے پر مال دیتے ہیں، ٹھیکیدار اور بلک ریٹ کے ساتھ، کوٹیشن اور ڈلیوری چالان سمیت۔\n- **چھوٹے یونٹوں کی خریداری والی ٹیمیں** سپلائر کے بل درج کرتی ہیں، مال اسٹاک میں لیتی ہیں اور حساب رکھتی ہیں کہ کس سپلائر کا کتنا دینا ہے۔\n- **ریسٹورنٹس، بیکریاں اور کریانہ اسٹور** کینٹ، پیرس روڈ اور کشمیر روڈ پر ریسٹورنٹ، بیکری اور کریانہ والی اسکرینیں استعمال کرتے ہیں۔',
      id: 'b5907bacf03d',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'b35a3c5b77dd' },
    {
      type: 'richText',
      markdown:
        '## سیالکوٹ میں کام کے حالات\n\n**بجلی۔** سیالکوٹ کی بجلی GEPCO سے آتی ہے، اور دن میں بجلی جانے سے دکانوں کا کام اب بھی رکتا ہے۔ Nafaa کے کاؤنٹر کو بل بنانے کے لیے کنکشن نہیں چاہیے؛ سیل ڈیوائس پر انتظار کرتی ہے اور انٹرنیٹ واپس آنے پر خود چلی جاتی ہے۔\n\n**کاروبار سے کاروبار کا ادھار۔** یہاں کا زیادہ تر مقامی لین دین کاروباروں کے بیچ ہوتا ہے: سپلائر ورکشاپوں کو دھاگا، چمڑا، پیکیجنگ اور اوزار بیچتے ہیں، اور ورکشاپیں مہینے کے مہینے ادائیگی کرتی ہیں۔ Nafaa ہر گاہک کا کھاتہ اور ہر سپلائر کا واجب الادا حساب رکھتا ہے، بل، ادائیگیاں اور بیلنس ساتھ ساتھ۔\n\n**ٹیم اور کلب کے آرڈر۔** اسپورٹس شاپس اسکولوں، کلبوں اور مقامی ٹیموں سے کٹ اور سامان کے آرڈر لیتی ہیں جن پر نام اور نمبر چھپتے ہیں۔ Nafaa ہر ٹیم آرڈر اس کے ایڈوانس کے ساتھ درج کرتا ہے، تاکہ آرڈر اٹھاتے وقت باقی رقم صاف ہو۔\n\n**زبان۔** سیالکوٹ کے بازاروں میں روز کی بول چال پنجابی ہے، لکھائی اردو میں ہوتی ہے، اور ایکسپورٹ کے دفتروں میں انگریزی عام ہے۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھتی ہیں، اور سپورٹ کی بات چیت بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b990d7dcd37d',
    },
    {
      type: 'screenshot',
      heading: 'خریداری اور سپلائر کے بیلنس ایک جگہ',
      body: 'سیالکوٹ کا سپلائر یا آؤٹ لیٹ ہر خریداری کا بل درج کرتا ہے، مال اسٹاک میں لیتا ہے اور دیکھتا ہے کہ کس سپلائر کا کتنا دینا ہے۔ اسی ایپ میں یہ بھی نظر آتا ہے کہ اپنے گاہکوں سے کتنا لینا ہے، اس لیے کیش کا اندازہ ایک ہی جگہ لگ جاتا ہے۔',
      mediaId: SHOT.reports,
      frame: 'browser',
      url: 'app.nafaa.pk/reports',
      layout: 'split-left',
      id: 'bc8c612d9fc3',
    },
    {
      type: 'comparisonTable',
      heading: 'سیالکوٹ کے کاروبار کے لیے Nafaa کیا کرتا ہے، اور کیا نہیں',
      caption: 'ایکسپورٹ کے کاروبار کے گرد کام کرنے والوں کے لیے صاف صاف تقسیم۔',
      columns: [
        { key: 'covered', label: 'Nafaa میں شامل' },
        { key: 'notcovered', label: 'شامل نہیں' },
      ],
      rows: [
        { label: 'اسپورٹس گڈز شاپ', cells: { covered: { value: 'کاؤنٹر، اسٹاک، ٹیم آرڈر، مرمت' }, notcovered: { value: 'سامان بنانا' } } },
        { label: 'فیکٹری آؤٹ لیٹ', cells: { covered: { value: 'بارکوڈ کاؤنٹر، سائز اور رنگ، کھاتہ' }, notcovered: { value: 'پروڈکشن پلاننگ' } } },
        { label: 'ورکشاپوں کا سپلائر', cells: { covered: { value: 'کوٹیشن، چالان، تجارتی کھاتہ' }, notcovered: { value: 'ایکسپورٹ شپنگ کے کاغذات' } } },
        { label: 'چھوٹا مینوفیکچرنگ یونٹ', cells: { covered: { value: 'خریداری، سپلائر کے واجبات، اسٹاک' }, notcovered: { value: 'بل آف میٹیریلز، ورک آرڈر (روڈ میپ پر)' } } },
        { label: 'ریسٹورنٹ یا کیفے', cells: { covered: { value: 'ٹیبل، کچن ٹکٹ، ڈلیوری' }, notcovered: { value: 'مقامی ریسٹورنٹ کے لیے کوئی بڑی کمی نہیں' } } },
      ],
      id: 'bac99e640322',
    },
    {
      type: 'steps',
      heading: 'سیالکوٹ میں Nafaa سے شروعات',
      items: [
        { title: 'فری ٹرائل کھولیں', body: 'جو ڈیوائس پاس ہے اسی پر سائن اپ کریں اور اسپورٹس، ہارڈویئر، ریٹیل یا ریسٹورنٹ چنیں۔' },
        { title: 'سپلائر اور خریدار ڈالیں', body: 'ہر سپلائر اور ہر مستقل خریدار کو اس کے اوپننگ بیلنس کے ساتھ درج کریں۔' },
        { title: 'اسٹاک ڈالیں', body: 'پروڈکٹس سائز، رنگ اور یونٹ کے ساتھ Excel سے امپورٹ کریں۔' },
        { title: 'پہلے ہفتے کی خریداری درج کریں', body: 'مال آتے ہی سپلائر کے بل ڈالیں، تاکہ اسٹاک اور واجبات شروع سے ٹھیک رہیں۔' },
      ],
      id: 'b5f9184ac14c',
    },
    {
      type: 'richText',
      markdown:
        '## سیالکوٹ کے کاروباری لوگوں کے سوال\n\n### کیا Nafaa میرے ایکسپورٹ آرڈر اور شپنگ کے کاغذات سنبھال سکتا ہے؟\nنہیں۔ Nafaa ایکسپورٹ کی پروڈکشن پلاننگ، غیر ملکی کرنسی کی کاسٹنگ یا شپنگ کے کاغذات نہیں بناتا۔ یہ مقامی سیل، خریداری، اسٹاک اور کھاتہ چلاتا ہے۔\n\n### کیا میری اسپورٹس شاپ ایڈوانس لے کر ٹیم آرڈر بک کر سکتی ہے؟\nجی ہاں۔ اسپورٹس والی اسکرینیں ٹیم آرڈر کو پرنٹنگ کی تفصیل اور دیے گئے ایڈوانس کے ساتھ درج کرتی ہیں، اور باقی رقم آخری بل پر آ جاتی ہے۔\n\n### کیا میں دیکھ سکتا ہوں کہ ہر سپلائر کا کتنا دینا ہے؟\nجی ہاں۔ ہر سپلائر کے سامنے خریداری کے بل اور ادائیگیاں درج کریں، اور جب چاہیں اس کا بیلنس دیکھیں۔',
      id: 'b824461e2b28',
    },
    { type: 'cityFacts', show: ['support'], heading: 'سیالکوٹ میں سپورٹ', id: 'bfc259f55bfd' },
    { type: 'pricingTable', heading: 'سیالکوٹ کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b99137e2c88a' },
    { type: 'faq', heading: 'مزید سوال', id: 'b3b69b927c62' },
    {
      type: 'cta',
      heading: 'سیالکوٹ میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے فون یا کمپیوٹر پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'ba5d3567e853',
    },
  ],
  featured: false,
  sortOrder: 10,
  origin: 'translation of content/cities/sialkot.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/sports',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/retail',
    'apps/web/src/modules/purchasing',
  ],
  sources: [
    { title: 'Sialkot (Wikidata Q643883)', url: 'https://www.wikidata.org/wiki/Q643883', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Sialkot (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sialkot', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Sialkot International Airport (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sialkot_International_Airport', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Sialkot Dry Port (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sialkot_Dry_Port', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Gujranwala Electric Power Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Gujranwala_Electric_Power_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia: export industries, business-funded airport, dry port; GEPCO).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: [
    'ur-sialkot-offline',
    'ur-sialkot-manufacturing',
    'ur-sialkot-wholesale-prices',
    'ur-sialkot-excel-import',
    'ur-sialkot-staff-permissions',
    'ur-sialkot-pricing',
  ],
  relations: [
    { ref: 'INDUSTRY:sports@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:retail@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'SOLUTION:manufacturing@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing@ur', kind: 'RELATED' },
  ],
};
