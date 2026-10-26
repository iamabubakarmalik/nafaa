/** Urdu: Quetta city page (/ur/pos-software/quetta). Translation of content/cities/quetta.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-quetta-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'کوئٹہ میں موبائل انٹرنیٹ بند ہو تو کیا Nafaa چلتا رہتا ہے؟',
    answer:
      'جی ہاں، انٹرنیٹ چلا جائے تو بھی کاؤنٹر پر بل بنتے رہتے ہیں۔ آف لائن سیل اسی ڈیوائس پر محفوظ رہتی ہے اور کنکشن واپس آتے ہی خود آپ کے اکاؤنٹ میں چلی جاتی ہے۔ جو سیل ابھی بھیجنی باقی ہے اس کی لسٹ بھی آپ دیکھ سکتے ہیں۔ رپورٹس اور دوسری برانچیں یہ سیل تب دیکھتی ہیں جب وہ سنک ہو جائے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-quetta-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'کوئٹہ کی دکان میں Nafaa کے لیے کمپیوٹر لینا ضروری ہے؟',
    answer:
      'نہیں۔ Nafaa ویب براؤزر میں چلتا ہے، اس لیے جو فون، ٹیبلٹ یا کمپیوٹر آپ کے پاس پہلے سے ہے وہی کافی ہے۔ بارکوڈ اسکینر اور رسید پرنٹر بعد میں لگ سکتے ہیں، شروع کرنے کے لیے ضروری نہیں۔ کاؤنٹر انٹرنیٹ کے بغیر بھی چلتا ہے اور کنکشن آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'ur-quetta-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'کوئٹہ کے ڈرائی فروٹ ڈیلر ریٹیل اور ہول سیل ریٹ الگ رکھ سکتے ہیں؟',
    answer:
      'جی ہاں۔ ایک پروڈکٹ پر ریٹیل قیمت بھی ہو سکتی ہے اور ہول سیل قیمت بھی، اور ہر یونٹ (پیس، درجن، کارٹن) کی اپنی قیمت بھی ہوتی ہے۔ کاؤنٹر سیل کے حساب سے صحیح قیمت لگاتا ہے، اور کھاتہ ہر تاجر گاہک کا بیلنس اور اس کی ادھار حد رکھتا ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-quetta-units',
    locale: 'ur',
    topic: 'kiryana',
    question: 'کوئٹہ کے کریانہ اسٹور پر ایک ہی چیز پیس، درجن اور کارٹن میں بیچ سکتے ہیں؟',
    answer:
      'جی ہاں۔ ایک پروڈکٹ ایک سے زیادہ یونٹ میں بک سکتی ہے، جیسے پیس، درجن اور کارٹن، اور ہر یونٹ کی اپنی قیمت ہوتی ہے۔ یعنی وہی بسکٹ ایک گاہک کو ایک پیکٹ میں جاتا ہے اور تھوک لینے والے دکاندار کو پورے کارٹن میں، ہر ایک اپنی قیمت پر۔',
    sourceNote: 'Retail pack: multi-unit pricing (piece/dozen/carton).',
    origin: 'translation of faq kiryana-units',
    evidence: ['apps/web/src/industries/retail/RetailPack.tsx'],
  },
  {
    key: 'ur-quetta-used-phones',
    locale: 'ur',
    topic: 'mobile-shop',
    question: 'کوئٹہ کی موبائل شاپ پرانے فون خرید سکتی ہے اور ٹریڈ اِن لے سکتی ہے؟',
    answer:
      'جی ہاں۔ پرانے فون والی اسکرین پر وہ فون درج ہوتے ہیں جو آپ گاہکوں سے خریدتے ہیں یا نئی سیل کے بدلے لیتے ہیں، اس لیے وہ اپنے IMEI اور کاسٹ کے ساتھ اسٹاک میں آ جاتے ہیں۔ جب آپ انہیں دوبارہ بیچتے ہیں تو وہ کاؤنٹر پر عام فون کی طرح بکتے ہیں، اور بل پر IMEI لکھا ہوتا ہے۔',
    sourceNote: 'Mobile pack: used phones (used-phones route) and trade-in.',
    origin: 'translation of faq mobile-used',
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx'],
  },
  {
    key: 'ur-quetta-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'کوئٹہ کے کاروبار کے لیے Nafaa کا خرچہ کتنا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہوتے ہیں۔ قیمت والے صفحے پر ہر پلان اپنی قیمت اور حدوں کے ساتھ لکھا ہے، اور یہ سب سیدھا ہماری پلان سیٹنگز سے آتا ہے، اس لیے ہمیشہ تازہ رہتا ہے۔ آپ پہلے فری ٹرائل سے شروع کر سکتے ہیں، اور سائن اپ کے لیے کریڈٹ کارڈ نہیں چاہیے۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'quetta',
  title: 'کوئٹہ',
  seoTitle: 'کوئٹہ میں دکان اور کاروبار کے لیے POS سافٹ ویئر',
  seoDescription: 'کوئٹہ کے ڈرائی فروٹ ڈیلرز، چائے ہوٹلوں اور دکانوں کے لیے Nafaa: نیٹ ورک بند ہو تو بھی بل، کلو اور بوری میں سیل، اور تاجروں کا کھاتہ۔',
  focusKeyword: 'کوئٹہ POS سافٹ ویئر',
  summary:
    'Nafaa کوئٹہ کے ڈرائی فروٹ اور فروٹ کے تاجروں، چائے ہوٹلوں اور ریسٹورنٹس، کپڑے اور کمبل بیچنے والوں اور کریانہ اسٹورز کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے اپنے فون یا کمپیوٹر پر انٹرنیٹ کے بغیر بل بناتا ہے، اور تاجروں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'کوئٹہ',
    province: 'Balochistan',
    authority: 'BRA',
    wikidataId: 'Q185458',
    geo: { lat: 30.1798, lng: 66.9749 },
    markets: [
      {
        name: 'لیاقت بازار',
        area: 'شہر کا مرکز',
        note: 'کوئٹہ کی سب سے بڑی خریداری والی سڑک، جہاں کپڑوں، جوتوں، الیکٹرانکس، کاسمیٹکس اور عام سامان کی دکانیں ہیں۔',
      },
      {
        name: 'قندھاری بازار',
        area: 'شہر کا مرکز',
        note: 'ڈرائی فروٹ، قالین، ہاتھ کے بنے سامان اور افغانستان سے آنے والے مال کے لیے مشہور، جو پرچون میں بھی بکتا ہے اور تاجروں کو بھی۔',
      },
      {
        name: 'جناح روڈ',
        note: 'شہر کی بیچ والی کمرشل سڑک، جس پر شو روم، فارمیسیاں، کتابوں کی دکانیں، بیکریاں اور ریسٹورنٹس ہیں۔',
      },
      {
        name: 'فروٹ اور سبزی منڈی',
        note: 'جہاں صوبے بھر کے باغوں کا پھل کریٹ اور ٹرک کے حساب سے کوئٹہ اور دوسرے شہروں کی دکانوں کے لیے خریدا جاتا ہے۔',
      },
    ],
    areas: [
      {
        name: 'سیٹلائٹ ٹاؤن',
        note: 'ایک بڑا رہائشی علاقہ، جہاں جنرل اسٹور، بیکریاں، فارمیسیاں اور محلے کی مارکیٹیں ہیں۔',
      },
      {
        name: 'کوئٹہ کینٹ',
        note: 'پلان کی گئی مارکیٹیں، جن میں کپڑے، گروسری اور کھانے کی دکانیں گھرانوں اور دفتروں کا کام کرتی ہیں۔',
      },
      {
        name: 'سمنگلی روڈ اور ایئرپورٹ روڈ',
        note: 'بڑھتی ہوئی کمرشل سڑکیں، جن پر ریسٹورنٹس، سجی ہاؤس اور شو روم ہیں۔',
      },
      {
        name: 'ہزارہ ٹاؤن اور مری آباد',
        note: 'رہائشی محلے، جن کے اپنے کریانہ، سلائی اور کھانے کے کاروبار ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا ڈالنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ کوئٹہ میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر مدد کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'کوئٹہ میں POS سافٹ ویئر',
      heading: 'کوئٹہ',
      sub: 'لیاقت بازار کی دکانوں، قندھاری بازار کے ڈرائی فروٹ ڈیلرز اور شہر کے چائے ہوٹلوں کے لیے: ایسا کاؤنٹر جو موبائل ڈیٹا بند ہو یا بجلی چلی جائے تب بھی بل بناتا رہے، اور اسٹاک اور ادھار ایک جگہ رکھے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['نیٹ ورک کے بغیر بل', 'کلو کے حساب سے سیل', 'تاجروں کا کھاتہ'],
      media: { kind: 'screenshot', mediaId: SHOT.posPhone, frame: 'browser', url: 'app.nafaa.pk/pos' },
      layout: 'centered',
      id: 'b24a0d53895e',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'فون، ٹیبلٹ یا کمپیوٹر؛ بل بنانے کے لیے کنکشن ضروری نہیں' },
        { label: 'کن کے لیے بہتر', value: 'ڈرائی فروٹ اور فروٹ کے تاجر، چائے ہوٹل، ریسٹورنٹس، کپڑے اور کمبل کی دکانیں، کریانہ اسٹور' },
        { label: 'سیزن', value: 'سردیوں کا مال اور گرمیوں کا پھل، پروڈکٹ اور مہینے کے حساب سے' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Quetta ke dry fruit dealers, chai hotels aur dukaanon ke liye Nafaa: internet band ho to bhi bill bante hain, aur stock aur udhaar ek app me rehta hai.',
      id: 'b011a05ed65e',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'کوئٹہ میں سیلز ٹیکس', id: 'bda1192f08ef' },
    {
      type: 'richText',
      markdown:
        '## کوئٹہ میں کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nکوئٹہ بلوچستان کا دارالحکومت اور اس کا سب سے بڑا بازار والا شہر ہے، جو پہاڑوں میں گھری ایک وادی میں ہے۔ آس پاس کے ضلعوں کے باغوں میں سیب، انگور، انار، خوبانی اور بادام اگتے ہیں، اور شہر کی منڈیوں میں یہ پھل تازہ بھی بکتا ہے اور خشک بھی، ساتھ وہ مال بھی جو افغانستان اور ایران سے آتا ہے۔ شہر کے اندر چائے ہوٹل اور سجی والے ریسٹورنٹ صبح سویرے سے رات دیر تک تاجروں اور مسافروں کو کھانا کھلاتے ہیں۔\n\n- **ڈرائی فروٹ اور فروٹ کے تاجر** قندھاری بازار اور فروٹ منڈی میں کلو، ڈبے اور بوری کے حساب سے بیچتے ہیں، ریٹیل اور ہول سیل ریٹ الگ رکھتے ہیں، اور دوسرے شہروں کے خریداروں کو ادھار دیتے ہیں۔\n- **چائے ہوٹل اور ریسٹورنٹس** کاؤنٹر پر جلدی بل بناتے ہیں یا کچن ٹکٹ کے ساتھ ٹیبل چلاتے ہیں، اور ہر ڈش اور ہر کپ کی ریسیپی رکھتے ہیں کہ اس میں کیا جاتا ہے۔\n- **کپڑے، شال اور کمبل کی دکانیں** سائز اور رنگ کے حساب سے اسٹاک رکھتی ہیں اور سردیوں کے رش کی تیاری کرتی ہیں، جب گرم کپڑا سب سے تیز بکتا ہے۔\n- **کریانہ اسٹور اور ہول سیلر** پیس اور کارٹن میں بیچتے ہیں، گھرانوں کو کھاتے پر رکھتے ہیں، اور خراب موسم میں سڑکیں بند ہونے سے پہلے سپلائر سے مال منگوا لیتے ہیں۔\n- **موبائل اور الیکٹرانکس کی دکانیں** ہر فون اس کے IMEI کے ساتھ درج کرتی ہیں اور پرانے فون ٹریڈ اِن میں لیتی ہیں۔',
      id: 'b60a5d90b334',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'bf0cb73ce943' },
    {
      type: 'richText',
      markdown:
        '## کوئٹہ میں کام کے حالات\n\n**نیٹ ورک کی بندش۔** کوئٹہ اور بلوچستان کے دوسرے حصوں میں سیکیورٹی کی وجہ سے کئی بار موبائل انٹرنیٹ بند کیا گیا ہے، کبھی کئی دن کے لیے۔ ایسے میں جو کلاؤڈ کاؤنٹر کنکشن کے بغیر نہیں چلتا وہ رک جاتا ہے۔ Nafaa ڈیوائس پر بل بناتا رہتا ہے؛ سیل وہیں انتظار کرتی ہے اور کنکشن واپس آنے پر آپ کے اکاؤنٹ میں چلی جاتی ہے، اور ایک لسٹ بتاتی ہے کہ ابھی کیا بھیجنا باقی ہے۔\n\n**بجلی اور گیس۔** بجلی QESCO دیتی ہے اور لوڈ شیڈنگ عام ہے، اور سردیوں میں گیس کا پریشر اکثر کم رہتا ہے۔ بیٹری پر چلنے والا فون یا لیپ ٹاپ کاؤنٹر چلائے رکھتا ہے۔\n\n**اصلی سردی۔** کوئٹہ پاکستان کے سب سے ٹھنڈے بڑے شہروں میں سے ہے۔ جو مال بکتا ہے وہ موسم کے ساتھ بدلتا ہے: سردیوں میں شال، کمبل اور ڈرائی فروٹ، گرمیوں اور خزاں میں تازہ پھل۔ مہینے کے حساب سے پروڈکٹ وار سیل رپورٹ بتاتی ہے کہ پچھلے سیزن میں کیا چلا، تاکہ اگلے سیزن کا مال سوچ کر منگوائیں۔\n\n**زبانیں۔** کوئٹہ کے بازاروں میں پشتو، بلوچی، براہوی، ہزارگی اور اردو سب بولی جاتی ہیں۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھتی ہیں، اور سپورٹ کی بات چیت بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b087d3c84c7a',
    },
    {
      type: 'screenshot',
      heading: 'دیکھیں کیا ابھی سنک ہونا باقی ہے',
      body: 'نیٹ ورک بند ہو تو ہر بل ڈیوائس پر محفوظ ہو جاتا ہے۔ ایک چھوٹی لسٹ بتاتی ہے کون سی سیل بھیجنی باقی ہے، اور موبائل ڈیٹا یا دکان کا انٹرنیٹ واپس آتے ہی وہ خود اپ لوڈ ہو جاتی ہیں۔',
      mediaId: SHOT.pos,
      frame: 'browser',
      url: 'app.nafaa.pk/pos',
      layout: 'split-right',
      id: 'b68e46cbc722',
    },
    {
      type: 'comparisonTable',
      heading: 'کوئٹہ میں سال بھر کا کاروبار',
      caption: 'کوئٹہ کے عام کاروبار کب سب سے مصروف ہوتے ہیں، اور Nafaa ان کے لیے کیا حساب رکھتا ہے۔',
      columns: [
        { key: 'season', label: 'سب سے زیادہ رش' },
        { key: 'tracks', label: 'Nafaa کیا رکھتا ہے' },
      ],
      rows: [
        { label: 'ڈرائی فروٹ ڈیلر', cells: { season: { value: 'خزاں اور سردیاں' }, tracks: { value: 'کلو اور بوری کے ریٹ، تاجر خریداروں کا کھاتہ' } } },
        { label: 'تازہ فروٹ کا تاجر', cells: { season: { value: 'گرمیوں اور خزاں کی فصل' }, tracks: { value: 'کریٹ اور ڈبے کے یونٹ، خریداروں کے بیلنس' } } },
        { label: 'شال اور کمبل کی دکان', cells: { season: { value: 'سردیاں' }, tracks: { value: 'سائز اور رنگ کے حساب سے اسٹاک، دوبارہ منگوانے کی لسٹ' } } },
        { label: 'چائے ہوٹل یا سجی ہاؤس', cells: { season: { value: 'سارا سال، رات دیر تک' }, tracks: { value: 'تیز کاؤنٹر بل، ٹیبل، ریسیپیز' } } },
        { label: 'کریانہ اسٹور', cells: { season: { value: 'خراب موسم میں سڑکیں بند ہونے سے پہلے' }, tracks: { value: 'سپلائر آرڈر، کم اسٹاک کی لسٹ، کھاتہ' } } },
      ],
      id: 'b8aa2fe7c7b6',
    },
    {
      type: 'steps',
      heading: 'کوئٹہ میں Nafaa سے شروعات',
      items: [
        { title: 'کنکشن ہو تو سائن اپ کر لیں', body: 'اکاؤنٹ بنائیں اور اپنا کاروبار چنیں۔ اس کے بعد کاؤنٹر آف لائن بھی بل بنا سکتا ہے۔' },
        { title: 'پروڈکٹس ان کے یونٹ کے ساتھ ڈالیں', body: 'ڈرائی فروٹ اور فروٹ کے لیے کلو، ڈبہ اور بوری، کریانے کے لیے پیس اور کارٹن، کپڑوں کے لیے سائز۔' },
        { title: 'تاجر خریدار اور ان کے بیلنس ڈالیں', body: 'مستقل خریدار ڈالیں، آج ان پر کتنا باقی ہے وہ بھی، اور ان کی ادھار حد بھی۔' },
        { title: 'بل بنائیں، پھر سنک لسٹ دیکھیں', body: 'ایک دن چلائیں؛ اگر نیٹ ورک بند رہا تھا تو دکان بند کرنے سے پہلے دیکھ لیں کہ انتظار والی سیل اپ لوڈ ہو گئی۔' },
      ],
      id: 'b9873c6c8ddb',
    },
    {
      type: 'richText',
      markdown:
        '## کوئٹہ کے کاروباری لوگوں کے سوال\n\n### اگر موبائل انٹرنیٹ کئی دن بند رہے تو میرے بلوں کا کیا ہو گا؟\nکاؤنٹر بل بناتا رہتا ہے اور ہر سیل ڈیوائس پر محفوظ کرتا ہے۔ کنکشن واپس آئے تو سیل خود اپ لوڈ ہو جاتی ہے۔ اس کے بعد دوسری ڈیوائسز اور برانچوں کی رپورٹس اپ ڈیٹ ہو جاتی ہیں۔\n\n### کیا میں ڈرائی فروٹ کلو کے حساب سے بھی اور بوری کے حساب سے بھی بیچ سکتا ہوں؟\nجی ہاں۔ پروڈکٹ پر دونوں یونٹ ان کی اپنی قیمت کے ساتھ ڈالیں، ریٹیل بھی اور ہول سیل بھی۔\n\n### کیا کمپیوٹر چاہیے؟\nنہیں۔ شروع کرنے کے لیے براؤزر والا فون کافی ہے۔ پرنٹر یا ترازو بعد میں لگ سکتا ہے۔',
      id: 'b40ddd19806c',
    },
    { type: 'cityFacts', show: ['support'], heading: 'کوئٹہ میں سپورٹ', id: 'b4e68c7ebbf0' },
    { type: 'pricingTable', heading: 'کوئٹہ کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b8dcd5592d1c' },
    { type: 'faq', heading: 'مزید سوال', id: 'b1e1c339bc1f' },
    {
      type: 'cta',
      heading: 'کوئٹہ میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے فون یا کمپیوٹر پر مفت آزمائیں۔ سیٹ اپ میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'ba3c51668e13',
    },
  ],
  featured: false,
  sortOrder: 8,
  origin: 'translation of content/cities/quetta.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/mobile',
  ],
  sources: [
    { title: 'Quetta (Wikidata Q185458)', url: 'https://www.wikidata.org/wiki/Q185458', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Quetta (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Quetta', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Quetta Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Quetta_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; QESCO; widely reported mobile internet suspensions).' },
  dropped: [],
  needsOwner: [],
  faqKeys: ['ur-quetta-offline', 'ur-quetta-devices', 'ur-quetta-wholesale-prices', 'ur-quetta-units', 'ur-quetta-used-phones', 'ur-quetta-pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:carpet@ur', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
  ],
};
