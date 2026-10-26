/** Urdu: Bahawalpur city page (/ur/pos-software/bahawalpur). Translation of content/cities/bahawalpur.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-bahawalpur-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'بہاولپور کی گرمی میں MEPCO کی لوڈ شیڈنگ کے دوران نیٹ نہ ہو تو Nafaa بل بنائے گا؟',
    answer:
      'بنائے گا۔ انٹرنیٹ غائب ہو تب بھی کاؤنٹر پر بل بننا نہیں رکتا۔ اس دوران کی ہر سیل دکان کے فون یا کمپیوٹر پر جمع ہوتی رہتی ہے، اور نیٹ آتے ہی بغیر کسی بٹن کے آپ کے اکاؤنٹ میں منتقل ہو جاتی ہے۔ کتنی سیل ابھی منتقل ہونی ہیں، یہ ایک لسٹ میں دیکھا جا سکتا ہے۔ سنک مکمل ہونے پر یہی سیل رپورٹس اور دوسری برانچوں میں بھی آ جاتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-bahawalpur-khata-reminders',
    locale: 'ur',
    topic: 'khata',
    question: 'بہاولپور کا ایگری ڈیلر کسانوں کو ان کے ادھار کی یاد واٹس ایپ پر کیسے دلائے؟',
    answer:
      'کھاتہ ہر کسان اور گاہک کا ادھار، اس کی جمع کرائی ہوئی رقمیں اور پرانی کاپی سے اٹھایا ہوا بیلنس رکھتا ہے۔ کھاتہ کھولیں اور ایک ٹیپ پر اس کسان کو اس کے بقایا کے ساتھ واٹس ایپ میسج تیار ہو جاتا ہے۔ ہر میسج آپ کے اپنے واٹس ایپ نمبر سے ایک ایک کر کے جاتا ہے، اور ادھار جتنا پرانا ہو، میسج کے الفاظ اتنے ہی سخت ہوتے جاتے ہیں۔',
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'translation of faq khata-reminders',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },
  {
    key: 'ur-bahawalpur-khata-limit',
    locale: 'ur',
    topic: 'khata',
    question: 'بہاولپور کی دودھ کی دکان کسی گھرانے یا ہوٹل کے ادھار کی حد مقرر کر سکتی ہے؟',
    answer:
      'کر سکتی ہے۔ کھاتے میں ہر گاہک کے آگے اس کی ادھار حد لکھ دیں۔ نیا ادھار بل اگر اس حد کو پار کرے تو کاؤنٹر وہیں رک جاتا ہے، اور بل صرف مینیجر کے PIN سے منظور ہونے پر آگے جاتا ہے۔ ساتھ میں کھاتہ واجب رقم کو پرانے پن کے لحاظ سے خانوں میں رکھتا ہے، جس سے پتا چلتا ہے کون سا بیلنس تازہ ہے اور کون سا کئی مہینوں سے پڑا ہے۔',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: 'translation of faq mp-khata-limit',
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'ur-bahawalpur-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'بہاولپور میں یونیورسٹی کے پاس کیفے کھولا ہے، کیا Nafaa کے لیے الگ کمپیوٹر خریدنا پڑے گا؟',
    answer:
      'ضرورت نہیں۔ Nafaa براؤزر میں کھلتا ہے، اس لیے آپ کا موجودہ فون، ٹیبلٹ یا کمپیوٹر ہی کام دے گا۔ بارکوڈ اسکینر یا رسید پرنٹر چاہیں تو بعد میں جوڑ لیں؛ شروع کرنے کے لیے یہ لازمی نہیں۔ اور نیٹ نہ ہو تو بھی کاؤنٹر چلتا رہتا ہے، کنکشن آنے پر ساری سیل آپ کے اکاؤنٹ میں چلی جاتی ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'ur-bahawalpur-excel-import',
    locale: 'ur',
    topic: 'kiryana',
    question: 'بہاولپور کے کریانہ اسٹور کی پروڈکٹ لسٹ Excel سے Nafaa میں کیسے منتقل ہو؟',
    answer:
      'اپنے کاروبار کے لیے بنا ہوا ٹیمپلیٹ ڈاؤن لوڈ کریں، اسے بھریں یا اپنی لسٹ اس میں پیسٹ کریں، اور اپ لوڈ کر دیں۔ پہلے Nafaa ایک ٹیسٹ رن میں ہر لائن جانچتا ہے اور کچھ محفوظ نہیں کرتا؛ نام، SKU یا بارکوڈ سے دہری آئٹم اور غلط قیمتیں نشان زد ہو جاتی ہیں۔ پھر امپورٹ حصوں میں چلتا ہے، اور جن لائنوں میں غلطی ہو وہ وجہ کے ساتھ Excel فائل میں ڈاؤن لوڈ ہو جاتی ہیں۔',
    sourceNote: 'ProductBulkImportPage (template, column match, dry run, chunked import, error file).',
    origin: 'translation of faq kiryana-import',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  },
  {
    key: 'ur-bahawalpur-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'بہاولپور میں ایگری ڈیلر یا دودھ کی دکان کو Nafaa کتنے پیسوں میں ملتا ہے؟',
    answer:
      'پیڈ پلان کم از کم {{price:min.monthly}} مہینہ سے شروع ہیں۔ ہر پلان کی قیمت اور حدیں پرائسنگ پیج پر لکھی ہیں؛ یہ ہماری پلان سیٹنگز سے خود بخود آتی ہیں، اس لیے وہاں ہمیشہ موجودہ قیمت ہوتی ہے۔ پیسے دینے سے پہلے فری ٹرائل پر اپنی دکان چلا کر دیکھیں۔ سائن اپ میں کریڈٹ کارڈ کا خانہ ہی نہیں ہوتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'bahawalpur',
  title: 'بہاولپور',
  seoTitle: 'بہاولپور میں دکان اور کاروبار کے لیے POS سافٹ ویئر',
  seoDescription: 'بہاولپور کے ایگری ڈیلرز، دودھ اور گوشت کی دکانوں، کپڑے کے بازاروں اور کیفے کے لیے Nafaa: بل، اسٹاک اور کسان کا ادھار ایک ایپ میں، بجلی جائے تو بھی۔',
  focusKeyword: 'بہاولپور POS سافٹ ویئر',
  summary:
    'Nafaa بہاولپور کے ایگری ڈیلرز، دودھ اور گوشت کی دکانوں، کپڑے اور جوتوں کی دکانوں، کریانہ اسٹورز اور طلبہ کے کیفے کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے اپنے فون یا کمپیوٹر پر چلتا ہے، MEPCO کی لوڈ شیڈنگ میں بھی بل بناتا ہے، اور کسانوں اور گھرانوں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'بہاولپور',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q318156',
    geo: { lat: 29.3956, lng: 71.6836 },
    markets: [
      {
        name: 'شاہی بازار',
        area: 'اندرون شہر',
        note: 'فصیل والے شہر کا بڑا بازار، جہاں کپڑا، ریڈی میڈ کپڑے، جوتے، برتن اور زیورات کی دکانیں ہیں۔',
      },
      {
        name: 'فرید گیٹ',
        area: 'اندرون شہر',
        note: 'ایک تاریخی دروازہ اور اس کے ارد گرد کی مصروف گلیاں، جہاں کپڑوں، عام سامان اور کھانے کی دکانیں ہیں۔',
      },
      {
        name: 'غلہ منڈی',
        note: 'جہاں آس پاس کے کھیتوں کی گندم، کپاس اور دوسری فصل تاجروں اور ملوں کو بکتی ہے۔',
      },
      {
        name: 'مویشی اور دودھ کا کاروبار',
        note: 'چولستان اور قریبی دیہات کے جانور اور دودھ شہر کی مویشی منڈیوں اور دودھ کی دکانوں تک آتے ہیں۔',
      },
    ],
    areas: [
      {
        name: 'ماڈل ٹاؤن اے اور بی',
        note: 'رہائشی علاقے، جن میں سپر مارکیٹیں، بیکریاں، فارمیسیاں اور کلینک ہیں۔',
      },
      {
        name: 'سیٹلائٹ ٹاؤن',
        note: 'ایک بڑا رہائشی علاقہ، جہاں کریانہ اسٹور، دودھ کی دکانیں اور محلے کی مارکیٹیں کھاتے پر مال دیتی ہیں۔',
      },
      {
        name: 'یونیورسٹی کا علاقہ',
        note: 'کیفے، فوٹو کاپی اور اسٹیشنری کی دکانیں، کتابوں کی دکانیں اور فاسٹ فوڈ، جو طلبہ کا کام کرتے ہیں۔',
      },
      {
        name: 'کینٹ',
        note: 'پلان کی گئی مارکیٹیں، جن میں جنرل اسٹور، کپڑوں کے آؤٹ لیٹ اور کھانے کے کاروبار ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، اوپننگ بیلنس اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ بہاولپور میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر مدد کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'بہاولپور میں POS سافٹ ویئر',
      heading: 'بہاولپور',
      sub: 'اندرون شہر کے بازاروں، کپاس اور گندم کے کھیتوں کا کام کرنے والے ایگری ڈیلروں، چولستان کے ریوڑوں سے چلنے والے دودھ اور گوشت کے کاروبار، اور یونیورسٹی کے ارد گرد کے کیفے کے لیے: بل، اسٹاک اور کھاتہ ایک ایپ میں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['کسان اور گھرانوں کا کھاتہ', 'دودھ اور گوشت وزن سے', 'آف لائن بھی چلتا ہے'],
      media: { kind: 'screenshot', mediaId: SHOT.khataPhone, frame: 'browser', url: 'app.nafaa.pk/customers/khata' },
      layout: 'centered',
      id: 'bf9571c8f969',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا فون، ٹیبلٹ یا کمپیوٹر؛ نیٹ کے بغیر بھی بل بنتے ہیں' },
        { label: 'کن کے لیے بہتر', value: 'ایگری ڈیلر، دودھ کی دکانیں، قصاب، کپڑے اور جوتوں کی دکانیں، کریانہ اسٹور، کیفے' },
        { label: 'ادھار', value: 'ہر گاہک یا کسان کا کھاتہ، ادھار حد اور واٹس ایپ یاد دہانی کے ساتھ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Bahawalpur ke agri dealers, doodh aur gosht walon, kapre ki dukaanon aur cafés ke liye Nafaa: bill, stock aur kisaan ka udhaar ek app me. Bijli jaye to bhi counter chalta hai.',
      id: 'bc492412e1df',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'بہاولپور میں سیلز ٹیکس', id: 'bb34ef097ad4' },
    {
      type: 'richText',
      markdown:
        '## بہاولپور میں کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nبہاولپور 1955 تک ایک ریاست کا دارالحکومت تھا، اور اس کے محل، جن میں نور محل بھی ہے، آج بھی پرانے شہر کے قریب کھڑے ہیں۔ آج یہ ڈویژن کا ہیڈکوارٹر ہے اور ایک بڑے زرعی علاقے کی منڈی۔ شمال میں ستلج سے نکلنے والی نہریں کپاس، گندم اور گنے کو پانی دیتی ہیں، جبکہ جنوب میں چولستان کا صحرا گائے، بکری، بھیڑ اور اونٹ کے ریوڑ پالتا ہے۔ اسلامیہ یونیورسٹی کی وجہ سے شہر میں طلبہ کی بڑی تعداد ہے، اور ان کے ساتھ کیفے، اسٹیشنری کی دکانیں اور ہاسٹل۔\n\n- **ایگری ڈیلر** بیج، کھاد، زرعی دوائی اور جانوروں کی خوراک بیچتے ہیں، فصل آنے تک کسانوں کا ادھار کھاتے میں رکھتے ہیں اور بوائی کے سیزن کے لیے مال کا اندازہ لگاتے ہیں۔\n- **دودھ کی دکانیں** گوالوں سے خریدا گیا دودھ درج کرتی ہیں، روٹ کے حساب سے گھروں تک پہنچاتی ہیں، ہر گھرانے کو مہینے کا بل بھیجتی ہیں اور کاؤنٹر پر کھلا دودھ اور دہی بیچتی ہیں۔\n- **قصاب** دن کا ریٹ طے کرتے ہیں، وزن سے بیچتے ہیں اور ہوٹلوں اور ریسٹورنٹس کو کھاتے پر گوشت دیتے ہیں، اور عید الاضحیٰ کے آس پاس اضافی آرڈر لیتے ہیں۔\n- **کپڑے، جوتے اور ریڈی میڈ کی دکانیں** پرانے بازاروں میں اسٹاک سائز اور رنگ کے حساب سے رکھتی ہیں اور سلائی کے آرڈر لیتی ہیں۔\n- **کیفے، کتابوں کی دکانیں اور اسٹیشنری والے** یونیورسٹی کے پاس جلدی بل بناتے ہیں، نصابی کتابیں جماعت کے حساب سے رکھتے ہیں اور ہر سمسٹر سے پہلے مال بھر لیتے ہیں۔\n- **کریانہ اسٹور** ماڈل ٹاؤن اور سیٹلائٹ ٹاؤن میں بارکوڈ سے بیچتے ہیں اور گھرانوں کا کھاتہ رکھتے ہیں۔',
      id: 'bb54a36a8522',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'bb18aa2a5eb6' },
    {
      type: 'richText',
      markdown:
        '## بہاولپور میں کام کے حالات\n\n**گرمی اور بجلی۔** بہاولپور کی گرمیاں بہت سخت ہوتی ہیں، اور کئی علاقوں میں MEPCO کی لوڈ شیڈنگ عام ہے۔ بجلی جائے تو Nafaa کاؤنٹر کو ڈیوائس پر بل بناتے رہنے دیتا ہے، اور انٹرنیٹ واپس آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔\n\n**فصل کے ساتھ چلنے والا ادھار۔** کسان اور بہت سے گھرانے کپاس اور گندم کی فصل کے بعد ادائیگی کرتے ہیں۔ Nafaa کا کھاتہ ہر گاہک کے بل اور ادائیگیاں ادھار حد کے ساتھ رکھتا ہے اور دکھاتا ہے کہ ہر بیلنس کتنے عرصے سے باقی ہے۔ ایک ٹیپ پر آپ کے اپنے نمبر سے واٹس ایپ یاد دہانی چلی جاتی ہے۔\n\n**دودھ کے ماہانہ بل۔** جو دودھ کی دکانیں گھروں تک دودھ پہنچاتی ہیں وہ ہر گھرانے کو ایک روٹ پر رکھتی ہیں، روز کی ڈلیوری درج کرتی ہیں اور مہینے میں ایک بار بل بناتی ہیں، ہر گلی کی الگ کاپی رکھنے کے بجائے۔\n\n**زبان۔** بہاولپور کی بڑی زبان سرائیکی ہے، اور پنجابی اور اردو بھی عام بولی جاتی ہیں۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھتی ہیں؛ سپورٹ کی بات چیت بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b4a8016e8a83',
    },
    {
      type: 'screenshot',
      heading: 'ادھار کا حساب جیب والے فون میں',
      body: 'ایگری ڈیلر یا دودھ والا فون پر کھاتہ کھولتا ہے، ہر گاہک کا بیلنس اور وہ کتنا پرانا ہے دیکھتا ہے، اور واٹس ایپ پر یاد دہانی بھیج دیتا ہے۔ دکان پر یا کھیت پر ملنے والی رقم وہیں اسی وقت درج ہو جاتی ہے۔',
      mediaId: SHOT.khataPhone,
      frame: 'phone',
      url: 'app.nafaa.pk/customers/khata',
      layout: 'split-right',
      id: 'b748b855d0bc',
    },
    {
      type: 'comparisonTable',
      heading: 'بہاولپور کے کاروبار اور ان کے لیے Nafaa کا مناسب سیٹ اپ',
      caption: 'بہاولپور کے عام کاروبار Nafaa میں کہاں سے شروع کریں۔ کاؤنٹر، اسٹاک اور کھاتہ ہر پلان میں ہیں۔',
      columns: [
        { key: 'start', label: 'پہلے یہ' },
        { key: 'later', label: 'بعد میں یہ' },
      ],
      rows: [
        { label: 'ایگری ڈیلر', cells: { start: { value: 'کسان کا کھاتہ، بوری اور بوتل بطور یونٹ' }, later: { value: 'سیزن کے حساب سے اسٹاک، بڑے آرڈر' } } },
        { label: 'دودھ کی دکان', cells: { start: { value: 'گوالوں سے خریداری، گھروں کے ڈلیوری روٹ' }, later: { value: 'ماہانہ بل، کوالٹی ٹیسٹ' } } },
        { label: 'قصاب', cells: { start: { value: 'روز کا ریٹ، وزن سے سیل' }, later: { value: 'ہوٹلوں کے کھاتے، عید الاضحیٰ کے آرڈر' } } },
        { label: 'کپڑے یا جوتوں کی دکان', cells: { start: { value: 'سائز اور رنگ، بارکوڈ' }, later: { value: 'سلائی کے آرڈر، تبادلہ' } } },
        { label: 'یونیورسٹی کے پاس کیفے', cells: { start: { value: 'چھوٹا مینو، کاؤنٹر بل' }, later: { value: 'ٹیبل، ڈلیوری آرڈر' } } },
      ],
      id: 'b61159ae41be',
    },
    {
      type: 'steps',
      heading: 'بہاولپور کا کاروبار Nafaa پر کیسے لائیں',
      items: [
        { title: 'فری ٹرائل کے لیے سائن اپ کریں', body: 'کاؤنٹر والا فون یا کمپیوٹر استعمال کریں اور اپنا کاروبار چنیں۔' },
        { title: 'لکھیں کس پر کتنا ادھار ہے', body: 'ہر کسان، گھرانہ یا ہوٹل اس کے بیلنس اور ادھار حد کے ساتھ ڈالیں۔' },
        { title: 'جو بیچتے ہیں وہ ڈالیں', body: 'پروڈکٹس ان کے یونٹ، سائز یا روز کے ریٹ کے ساتھ؛ لسٹ ہو تو Excel سے امپورٹ کر لیں۔' },
        { title: 'پہلا ہفتہ چلائیں', body: 'ہر سیل کا بل Nafaa پر بنائیں اور مہینہ ختم ہونے سے پہلے پہلی یاد دہانیاں بھیج دیں۔' },
      ],
      id: 'bb71543c82c8',
    },
    {
      type: 'richText',
      markdown:
        '## بہاولپور کے کاروباری لوگوں کے سوال\n\n### کیا میری دودھ کی دکان گھرانوں کو مہینے میں ایک بار بل دے سکتی ہے؟\nجی ہاں۔ ڈیری والی اسکرینیں ڈلیوری والے گاہکوں کو روٹ پر رکھتی ہیں، ہر دن کی ڈلیوری درج کرتی ہیں اور ہر گھرانے کا ماہانہ بل بناتی ہیں۔\n\n### کیا قصاب روز کا ریٹ بدل سکتا ہے؟\nجی ہاں۔ صبح دن کا ریٹ ڈالیں، اور کاؤنٹر ہر سیل کی قیمت وزن کے حساب سے لگائے گا۔\n\n### کیا لوڈ شیڈنگ میں چلے گا؟\nجی ہاں۔ کاؤنٹر انٹرنیٹ کے بغیر بل بناتا ہے اور بعد میں سنک کر لیتا ہے۔',
      id: 'b84bbbc47611',
    },
    { type: 'cityFacts', show: ['support'], heading: 'بہاولپور میں سپورٹ', id: 'b1e0270daa82' },
    { type: 'pricingTable', heading: 'بہاولپور کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b04cb34b5644' },
    { type: 'faq', heading: 'مزید سوال', id: 'b10cf2aad3d9' },
    {
      type: 'cta',
      heading: 'بہاولپور میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے فون یا کمپیوٹر پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b82fb94eb5ed',
    },
  ],
  featured: false,
  sortOrder: 12,
  origin: 'translation of content/cities/bahawalpur.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/agri',
    'apps/web/src/industries/dairy',
    'apps/web/src/industries/meat',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/bookstore',
  ],
  sources: [
    { title: 'Bahawalpur (Wikidata Q318156)', url: 'https://www.wikidata.org/wiki/Q318156', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Bahawalpur (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bahawalpur', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Bahawalpur (princely state) (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bahawalpur_(princely_state)', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Cholistan Desert (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Cholistan_Desert', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Multan Electric Power Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Multan_Electric_Power_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia: princely state merged 1955, Noor Mahal, Cholistan, Islamia University, Saraiki; MEPCO).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: [
    'ur-bahawalpur-offline',
    'ur-bahawalpur-khata-reminders',
    'ur-bahawalpur-khata-limit',
    'ur-bahawalpur-devices',
    'ur-bahawalpur-excel-import',
    'ur-bahawalpur-pricing',
  ],
  relations: [
    { ref: 'INDUSTRY:agri@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:meat@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
  ],
};
