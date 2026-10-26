/** Urdu: Multan city page (/ur/pos-software/multan). Translation of content/cities/multan.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-multan-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'ملتان میں MEPCO کی بجلی جانے سے انٹرنیٹ بند ہو تو Nafaa کا کاؤنٹر چلے گا؟',
    answer:
      'جی ہاں، انٹرنیٹ ٹوٹنے پر بھی کاؤنٹر بل بناتا رہتا ہے۔ بغیر نیٹ کے بنی سیل ڈیوائس پر ہی رکھی جاتی ہے، اور جیسے ہی کنکشن واپس آئے وہ خود آپ کے اکاؤنٹ تک پہنچ جاتی ہے۔ ابھی کون سی سیل بھیجنی رہتی ہے، یہ لسٹ میں نظر آتا ہے۔ رپورٹس اور دوسری برانچوں تک یہ سیل سنک کے بعد پہنچتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-multan-khata-reminders',
    locale: 'ur',
    topic: 'khata',
    question: 'ملتان کا دکاندار کسانوں اور گاہکوں کو ادھار کی یاد دہانی واٹس ایپ سے بھیج سکتا ہے؟',
    answer:
      'جی ہاں۔ کھاتے میں ہر گاہک کا ادھار، اس کی ادائیگیاں اور پرانے رجسٹر سے آیا بیلنس محفوظ رہتا ہے۔ وہیں سے ایک ٹیپ میں گاہک کو اس کے بیلنس والی واٹس ایپ یاد دہانی بھیجی جاتی ہے۔ میسج آپ کے اپنے واٹس ایپ سے ایک ایک گاہک کو جاتے ہیں، اور ادھار جتنا پرانا ہو لہجہ اتنا سخت ہوتا ہے۔',
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'translation of faq khata-reminders',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },
  {
    key: 'ur-multan-bakery-costing',
    locale: 'ur',
    topic: 'bakery',
    question: 'ملتان کی مٹھائی یا سوہن حلوے کی دکان Nafaa میں ریسیپی اور اجزا کی کاسٹ کیسے نکالتی ہے؟',
    answer:
      'اجزا کچے مال کے طور پر اپنے اسٹاک اور فی یونٹ کاسٹ کے ساتھ رکھے جاتے ہیں۔ پروڈکٹ پر اس کی ریسیپی ڈالیں، یعنی ہر جز کی مقدار اور اس سے کتنے پیس بنتے ہیں، اور بناتے بناتے Nafaa کاسٹ دکھاتا جاتا ہے۔ اجزا کی کاسٹ بدلے تو ریسیپی کی کاسٹ بھی ساتھ بدلتی ہے، اس لیے آپ کو اصل مارجن دکھتا ہے۔',
    sourceNote: 'BakeryProductEditor (recipe with live cost, recipeYield) and BakeryRawMaterials.',
    origin: 'translation of faq bakery-costing',
    evidence: ['apps/web/src/industries/bakery/products/BakeryProductEditor.tsx', 'apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx'],
  },
  {
    key: 'ur-multan-bakery-bulk',
    locale: 'ur',
    topic: 'bakery',
    question: 'ملتان کی مٹھائی کی دکان شادی اور تقریب کے بڑے آرڈر Nafaa میں کیسے رکھے؟',
    answer:
      'شادی اور تقریب کے بڑے آرڈر کاؤنٹر سیل سے الگ رکھے جاتے ہیں، اور آرڈر پر ایڈوانس درج ہوتا ہے۔ اگر آرڈر پکا ہو گیا مگر ایڈوانس نہیں آیا، تو Nafaa اس کا سامان خریدنے سے پہلے آپ کو خبردار کرتا ہے۔ آرڈر کینسل ہو تو اس کا ایڈوانس کیش میں واپس کیا جا سکتا ہے۔',
    sourceNote: 'Bakery bulk orders (BulkViews.tsx: advance, no-advance warning, advance refund).',
    origin: 'translation of faq bakery-bulk',
    evidence: ['apps/web/src/industries/bakery/components/bulk/BulkViews.tsx'],
  },
  {
    key: 'ur-multan-khata-limit',
    locale: 'ur',
    topic: 'khata',
    question: 'ملتان کا ایگری ڈیلر ہر کسان کی ادھار حد کیسے مقرر کرے؟',
    answer:
      'کھاتے کے ہر گاہک پر ادھار کی حد لگائی جا سکتی ہے۔ اگر نئی ادھار سیل سے بیلنس اس حد سے بڑھنے لگے تو کاؤنٹر بل روک لیتا ہے، اور مینیجر اپنے PIN سے منظوری دے تو ہی آگے چلتا ہے۔ کھاتہ باقی رقم کو پرانے پن کے حساب سے خانوں میں بھی دکھاتا ہے، کون سا ادھار نیا ہے اور کون سا کئی مہینوں سے باقی۔',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: 'translation of faq mp-khata-limit',
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'ur-multan-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'ملتان کی دکان کے لیے Nafaa کا ماہانہ خرچ کتنا آتا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے ہیں۔ پرائسنگ کے صفحے پر سارے پلان اپنی قیمت اور حدوں سمیت درج ہیں، جو سیدھی ہماری پلان سیٹنگز سے لی جاتی ہیں، اس لیے ہمیشہ اپ ٹو ڈیٹ رہتی ہیں۔ چاہیں تو پہلے فری ٹرائل لیں؛ سائن اپ کرنے کے لیے کوئی کریڈٹ کارڈ نہیں چاہیے۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'multan',
  title: 'ملتان',
  seoTitle: 'ملتان میں دکان، مٹھائی اور ایگری ڈیلر کے لیے POS سافٹ ویئر',
  seoDescription: 'ملتان کی دکانوں، مٹھائی والوں، کھسہ شاپس اور ایگری ڈیلرز کے لیے Nafaa: بل، سائز کے حساب سے اسٹاک، فصل تک کا ادھار اور تہوار کے آرڈر، لوڈ شیڈنگ میں بھی۔',
  focusKeyword: 'ملتان POS سافٹ ویئر',
  summary:
    'Nafaa ملتان کی دکانوں، مٹھائی بنانے والوں، کھسہ بیچنے والوں، ایگری ڈیلرز اور ریسٹورنٹس کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ کاؤنٹر والے فون یا کمپیوٹر پر چلتا ہے، MEPCO کی بجلی جانے پر بھی بل بناتا رہتا ہے، اور کسانوں اور گاہکوں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'ملتان',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q185453',
    geo: { lat: 30.1575, lng: 71.5249 },
    markets: [
      {
        name: 'حسین آگاہی بازار',
        area: 'پرانا شہر',
        note: 'فصیل والے شہر کا سب سے مشہور بازار، جس کی تنگ اور بھیڑ بھری گلیوں میں کپڑا، گارمنٹس، جوتے، چوڑیاں، کراکری اور گھریلو سامان ملتا ہے۔',
      },
      {
        name: 'گھنٹہ گھر کا علاقہ',
        area: 'پرانا شہر',
        note: 'گھنٹہ گھر کے گرد کی گلیاں، جہاں جنرل اسٹور، مٹھائی کی دکانیں، دستکاری اور چھوٹے ہول سیل کاؤنٹر ہیں۔',
      },
      {
        name: 'بوہڑ گیٹ اور حرم گیٹ',
        area: 'پرانا شہر',
        note: 'پرانے شہر کے دروازے، جن کے ساتھ کھسہ، کڑھائی والا سامان، ڈرائی فروٹ اور روز مرہ کی چیزیں بیچنے والی دکانیں ہیں۔',
      },
      {
        name: 'فروٹ اور غلہ منڈیاں',
        note: 'ہول سیل منڈیاں جہاں آم، دوسرا پھل، گندم اور ضلع بھر کی پیداوار تھوک میں خریدی اور بیچی جاتی ہے۔',
      },
    ],
    areas: [
      {
        name: 'گلگشت کالونی',
        note: 'مصروف رہائشی اور کمرشل علاقہ، جہاں ریسٹورنٹس، بیکریاں، سپر مارکیٹس، فارمیسیاں اور موبائل شاپس ہیں۔',
      },
      {
        name: 'ملتان کینٹ',
        note: 'پلان کی گئی مارکیٹیں، جن میں کپڑوں کے آؤٹ لیٹ، کیفے، جنرل اسٹور اور سروس والے کاروبار ہیں۔',
      },
      {
        name: 'بوسن روڈ',
        note: 'یونیورسٹی کے قریب لمبی کمرشل سڑک، جہاں کھانے کی دکانیں، اسٹیشنری شاپس، سیلون اور شو روم ہیں۔',
      },
      {
        name: 'شاہ رکن عالم کالونی',
        note: 'بڑا رہائشی علاقہ، جس کا کام کریانہ اسٹور، فارمیسیاں اور محلے کی مارکیٹیں چلاتی ہیں جو کھاتے پر بیچتی ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، پرانے بیلنس ڈالنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ ملتان میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر مدد کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'ملتان میں POS سافٹ ویئر',
      heading: 'ملتان',
      sub: 'حسین آگاہی بازار سے شہر کے کنارے کھاد ڈیلروں تک: ملتان کے کاروبار کے لیے بل، سائز کے حساب سے اسٹاک، فصل کے وقت کا ادھار اور تہوار کے آرڈر، اسی ڈیوائس پر جو آپ کے پاس پہلے سے ہے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['کسانوں کا ادھار کھاتہ', 'جوتوں کے سائز اور رنگ', 'بجلی جائے تب بھی چلے'],
      media: { kind: 'screenshot', mediaId: SHOT.posPhone, frame: 'browser', url: 'app.nafaa.pk/pos' },
      layout: 'centered',
      id: 'be981ef7f9db',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا فون، ٹیبلٹ یا کمپیوٹر؛ بل آف لائن بھی بنتے ہیں' },
        { label: 'کن کے لیے بہتر', value: 'ایگری ڈیلر، مٹھائی کی دکانیں، کھسہ اور جوتوں کی دکانیں، گارمنٹس، کریانہ اسٹور، ریسٹورنٹس' },
        { label: 'ادھار', value: 'ہر کسان یا گاہک کا حد والا کھاتہ، واٹس ایپ یاد دہانی کے ساتھ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Multan ki dukaanon, mithai walon, khussa shops aur agri dealers ke liye Nafaa: bill, stock aur fasal tak ka udhaar ek app me. Bijli jaye to bhi counter chalta hai.',
      id: 'b909b8db8355',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'ملتان میں سیلز ٹیکس', id: 'bb5f44f32cd4' },
    {
      type: 'richText',
      markdown:
        '## ملتان کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nملتان برصغیر کے قدیم ترین شہروں میں سے ہے اور جنوبی پنجاب کا بڑا تجارتی شہر۔ اس کا فصیل والا شہر، بہاءالدین زکریا اور شاہ رکن عالم کے مزار اور اس کی دستکاریاں سارا سال لوگوں کو کھینچتی ہیں، جبکہ آس پاس کی زمینوں میں کپاس، گندم اور وہ آم اگتے ہیں جن کے لیے یہ شہر مشہور ہے۔ یہاں کاروبار فصل کے ساتھ چلتا ہے: جب فصل کا پیسہ آتا ہے تو کھاتوں کے بیلنس صاف ہوتے ہیں اور دکانیں نیا مال بھرتی ہیں۔\n\n- **ایگری ڈیلر** بیج، کھاد، اسپرے اور چارہ بیچتے ہیں، کسانوں کے کھاتے فصل تک ادھار پر رکھتے ہیں، اور ایگری والی اسکرینوں سے بوائی کے سیزن کا اسٹاک پلان کرتے ہیں۔\n- **مٹھائی کی دکانیں اور بیکریاں** جو سوہن حلوہ اور دوسری مٹھائیاں بناتی ہیں، کچا مال اس کی کاسٹ کے ساتھ درج کرتی ہیں، ہر ریسیپی کی تازہ کاسٹ دیکھتی ہیں، اور شادیوں اور عید کے بڑے آرڈر لیتی ہیں۔\n- **کھسہ اور جوتوں کی دکانیں** ہر جوڑا سائز اور رنگ کے ساتھ اس کے اپنے بارکوڈ پر رکھتی ہیں، اور دیکھتی ہیں کہ اسٹاک ختم ہونے پر گاہکوں نے کون سے سائز مانگے۔\n- **گارمنٹس اور فیبرک کی دکانیں** پرانے بازاروں میں ڈیزائن سائز اور رنگ کے حساب سے رکھتی ہیں اور محفوظ ناپ کے ساتھ سلائی کے آرڈر لیتی ہیں۔\n- **ریسٹورنٹس اور کریانہ اسٹور** گلگشت، کینٹ اور نئی کالونیوں میں اسی کاؤنٹر پر ریسٹورنٹ اور گروسری والی اسکرینیں چلاتے ہیں۔',
      id: 'b9a945f19518',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'b6bc4a9f4ed9' },
    {
      type: 'richText',
      markdown:
        '## ملتان میں کام کے حالات\n\n**گرمی اور بجلی کی بندش۔** ملتان کی گرمیاں پاکستان کی سب سے سخت گرمیوں میں سے ہیں، اور بہت سے محلوں میں MEPCO کی لوڈ شیڈنگ روز کا معمول ہے۔ بجلی جائے تو راؤٹر بھی عموماً ساتھ ہی بند ہو جاتا ہے۔ Nafaa ڈیوائس پر کاؤنٹر چلائے رکھتا ہے اور کنکشن لوٹنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے، اس لیے دن کی رپورٹ پوری رہتی ہے۔\n\n**فصل والا ادھار۔** کسان اور شہر کے بہت سے گاہک گندم اور کپاس کی فصل کے بعد حساب چکاتے ہیں۔ Nafaa کا کھاتہ ہر گاہک کے بل اور ادائیگیاں ادھار حد کے ساتھ ایک جگہ رکھتا ہے، اور بیلنس کو عمر کے حساب سے گروپ کرتا ہے تاکہ دکھے کون پچھلی فصل سے ادا نہیں کر پایا۔ ایک ٹیپ والی واٹس ایپ یاد دہانی آپ کے اپنے نمبر سے جاتی ہے۔\n\n**تہواروں کا رش۔** مٹھائی والے اور کھسہ بیچنے والے سال کی بڑی کمائی عید، شادیوں اور شہر کے مزاروں کے عرس سے پہلے کرتے ہیں۔ ایڈوانس والے بڑے آرڈر، اور پروڈکٹ اور دن کے حساب سے رپورٹس، یہ طے کرنے میں مدد دیتی ہیں کہ کیا بنانا اور کتنا رکھنا ہے۔\n\n**زبان۔** ملتان کی بڑی بولی سرائیکی ہے، اور پنجابی اور اردو بھی عام ہیں۔ Nafaa کی اسکرینیں اردو یا انگریزی میں آتی ہیں؛ سپورٹ سے بات بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b636de1ff671',
    },
    {
      type: 'screenshot',
      heading: 'ایڈوانس کے ساتھ مٹھائی کے بڑے آرڈر',
      body: 'ملتان کی مٹھائی کی دکان شادی کا آرڈر تاریخ، مقدار اور دیے گئے ایڈوانس کے ساتھ درج کرتی ہے، اور ڈیلیوری والے دن باقی رقم گاہک کے بل پر آ جاتی ہے۔ چینی، گھی اور دودھ کی قیمت بدلے تو ریسیپی کی کاسٹ بھی بدل جاتی ہے۔',
      mediaId: SHOT.dashboard,
      frame: 'browser',
      url: 'app.nafaa.pk/dashboard',
      layout: 'split-right',
      id: 'bd740d51e7b1',
    },
    {
      type: 'comparisonTable',
      heading: 'ملتان کا سال اور Nafaa میں کیا تیار رکھیں',
      caption: 'ملتان کے عام کاروباروں کے مصروف موسم Nafaa کی کن چیزوں سے جڑتے ہیں۔ ہر پلان میں کاؤنٹر، اسٹاک اور کھاتہ شامل ہے۔',
      columns: [
        { key: 'peak', label: 'مصروف وقت' },
        { key: 'prepare', label: 'کیا تیار رکھیں' },
      ],
      rows: [
        { label: 'ایگری ڈیلر', cells: { peak: { value: 'گندم اور کپاس کی بوائی' }, prepare: { value: 'سیزن کا اسٹاک پلان، کسانوں کی ادھار حدیں' } } },
        { label: 'مٹھائی کی دکان', cells: { peak: { value: 'عید، شادیاں، عرس' }, prepare: { value: 'ایڈوانس والے بڑے آرڈر، ریسیپی کاسٹ' } } },
        { label: 'کھسہ اور جوتوں کی دکان', cells: { peak: { value: 'عید اور شادیوں کا سیزن' }, prepare: { value: 'سائز وار اسٹاک اور دوبارہ منگوانے کی لسٹ' } } },
        { label: 'گارمنٹس شاپ', cells: { peak: { value: 'دونوں عیدوں سے پہلے' }, prepare: { value: 'سائز اور رنگ کے ساتھ ڈیزائن، سلائی کے آرڈر' } } },
        { label: 'کریانہ اسٹور', cells: { peak: { value: 'فصل کی ادائیگی کے بعد' }, prepare: { value: 'کھاتہ یاد دہانیاں اور پرانے بیلنس' } } },
      ],
      id: 'b33d42ad58a9',
    },
    {
      type: 'steps',
      heading: 'ملتان کی دکان کو چالو کرنا',
      items: [
        { title: 'فری ٹرائل کے لیے سائن اپ کریں', body: 'کاؤنٹر والا فون یا کمپیوٹر استعمال کریں اور اپنا کاروبار چنیں تاکہ صحیح اسکرینیں کھلیں۔' },
        { title: 'اپنا رجسٹر کھاتے میں اتاریں', body: 'ہر مستقل گاہک یا کسان کو اس کے موجودہ بیلنس اور ادھار حد کے ساتھ ڈالیں۔' },
        { title: 'سائز یا ریسیپی کے ساتھ پروڈکٹس ڈالیں', body: 'جوتوں کی دکانیں سائز اور رنگ ڈالیں؛ مٹھائی والے کچا مال اور ریسیپیاں؛ ایگری ڈیلر بوری اور بوتل۔' },
        { title: 'بل بنائیں اور شام کی رپورٹ دیکھیں', body: 'ایک دن Nafaa پر چلائیں اور آخری کیش اپنے دراز سے ملا لیں۔' },
      ],
      id: 'b75963723251',
    },
    {
      type: 'richText',
      markdown:
        '## ملتان کے کاروباری لوگوں کے سوال\n\n### کیا لوڈ شیڈنگ میں بل بننا رک جائے گا؟\nنہیں۔ کاؤنٹر انٹرنیٹ کے بغیر بل بناتا ہے۔ ڈیوائس چارج رکھیں یا UPS پر لگائیں، اور کنکشن واپس آنے پر سیل سنک ہو جاتی ہے۔\n\n### کیا کسان فصل کے بعد پیسے دے سکتے ہیں؟\nجی ہاں۔ ہر کسان کو ادھار حد کے ساتھ کھاتے میں رکھیں؛ ادائیگی تک بیلنس اور اس کی عمر اس کے اکاؤنٹ پر دکھتی رہتی ہے۔\n\n### کیا میری مٹھائی کی دکان دیکھ سکتی ہے کہ ہر چیز بنانے میں کتنا لگتا ہے؟\nجی ہاں۔ کچا مال اس کی کاسٹ کے ساتھ ڈالیں اور ریسیپیاں بنائیں؛ اجزا کی قیمت بدلنے پر ہر چیز کی کاسٹ بدل جاتی ہے۔',
      id: 'b0654b05b5cc',
    },
    { type: 'cityFacts', show: ['support'], heading: 'ملتان میں سپورٹ', id: 'b2defffb2a91' },
    { type: 'pricingTable', heading: 'ملتان کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'bd297814c933' },
    { type: 'faq', heading: 'مزید سوال', id: 'b76c6de889b6' },
    {
      type: 'cta',
      heading: 'ملتان میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے فون یا کمپیوٹر پر مفت آزمائیں۔ سیٹ اپ میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'ba8089d33ebc',
    },
  ],
  featured: false,
  sortOrder: 6,
  origin: 'translation of content/cities/multan.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/agri',
    'apps/web/src/industries/bakery',
    'apps/web/src/industries/shoe',
    'apps/web/src/industries/garments',
    'apps/web/src/modules/customers/directory/messages.ts',
  ],
  sources: [
    { title: 'Multan (Wikidata Q185453)', url: 'https://www.wikidata.org/wiki/Q185453', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Multan (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Multan', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Multan Electric Power Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Multan_Electric_Power_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Sohan halwa (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Sohan_halwa', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; MEPCO; Saraiki as the main language).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-multan-offline', 'ur-multan-khata-reminders', 'ur-multan-bakery-costing', 'ur-multan-bakery-bulk', 'ur-multan-khata-limit', 'ur-multan-pricing'],
  relations: [
    { ref: 'INDUSTRY:agri@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:shoe@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
  ],
};
