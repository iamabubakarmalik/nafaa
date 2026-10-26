/** Urdu: Rawalpindi city page (/ur/pos-software/rawalpindi). Translation of content/cities/rawalpindi.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-rawalpindi-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'راولپنڈی کے بازار کی دکان پر Nafaa شروع کرنے کے لیے کیا نیا کمپیوٹر چاہیے؟',
    answer:
      'نہیں۔ Nafaa ویب براؤزر میں چلتا ہے، تو کاؤنٹر پر جو فون، ٹیبلٹ یا کمپیوٹر پہلے سے رکھا ہے وہی کام دے گا۔ بارکوڈ اسکینر اور رسید پرنٹر بعد میں لگا سکتے ہیں، شروع کے لیے لازمی نہیں۔ نیٹ نہ ہو تب بھی کاؤنٹر چلتا رہتا ہے اور کنکشن آنے پر سیل آپ کے اکاؤنٹ میں پہنچا دیتا ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'ur-rawalpindi-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'راجہ بازار کا ڈیلر دکانداروں اور عام گاہکوں کے لیے الگ ریٹ رکھ سکتا ہے؟',
    answer:
      'جی ہاں۔ ہر پروڈکٹ کی ایک ریٹیل اور ایک ہول سیل قیمت ہو سکتی ہے، اور پیس، درجن یا کارٹن ہر یونٹ کی قیمت الگ بھی رکھی جا سکتی ہے۔ سیل کے حساب سے کاؤنٹر خود صحیح ریٹ اٹھاتا ہے، اور کھاتے میں ہر دکاندار خریدار کا بیلنس اور ادھار کی حد درج رہتی ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-rawalpindi-khata-reminders',
    locale: 'ur',
    topic: 'khata',
    question: 'پنڈی کا دکاندار Nafaa سے گاہکوں کو ادھار کی یاد دہانی واٹس ایپ پر بھیج سکتا ہے؟',
    answer:
      'جی ہاں۔ کھاتہ ہر گاہک کا ادھار، اس کی ادائیگیاں اور پرانے رجسٹر سے لایا گیا بیلنس رکھتا ہے۔ کھاتے سے ایک ٹیپ میں گاہک کو اس کے بیلنس کے ساتھ واٹس ایپ یاد دہانی چلی جاتی ہے۔ یاد دہانیاں آپ کے اپنے واٹس ایپ سے ایک ایک کر کے جاتی ہیں، اور ادھار جتنا پرانا ہو، الفاظ اتنے سخت ہوتے جاتے ہیں۔',
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'translation of faq khata-reminders',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },
  {
    key: 'ur-rawalpindi-garments-variants',
    locale: 'ur',
    topic: 'garments',
    question: 'موتی بازار کی کپڑوں کی دکان Nafaa میں سائز اور رنگ کیسے سنبھالتی ہے؟',
    answer:
      'ہر پروڈکٹ کا ہر سائز اور ہر رنگ اسٹاک کی اپنی الگ لائن ہوتا ہے، اس لیے صاف نظر آتا ہے کہ کون سے سائز اور رنگ موجود ہیں اور کون سے بک رہے ہیں۔ سائز چارٹ اور کلیکشن سے اسٹاک کو گروپ کیا جا سکتا ہے، اور کاؤنٹر پر تبدیلی ہو تو واپس آیا سائز دوبارہ اسٹاک میں چلا جاتا ہے۔',
    sourceNote: 'Garments pack: size × colour variants, size charts, collections, exchange.',
    origin: 'translation of faq garments-variants',
    evidence: ['apps/web/src/industries/garments/GarmentsPack.tsx'],
  },
  {
    key: 'ur-rawalpindi-migration-what',
    locale: 'ur',
    topic: 'services',
    question: 'راولپنڈی کی دکان کے پرانے رجسٹر یا سافٹ ویئر سے Nafaa میں کیا کیا منتقل ہو سکتا ہے؟',
    answer:
      'قیمت، کاسٹ، بارکوڈ اور اسٹاک کے ساتھ پروڈکٹس، پرانے ادھار کے ساتھ گاہک، اور جن سپلائرز کا آپ نے دینا ہے وہ بھی۔ ہم Excel یا CSV فائل، پرانے سافٹ ویئر کا ایکسپورٹ یا رجسٹر کی تصویریں لے لیتے ہیں۔ پروڈکٹس ایپ کے اپنے امپورٹ سے پہلے آزمائشی رن کے ساتھ جاتی ہیں، بیلنس شروع کے کھاتے اور سپلائر بیلنس بن کر جاتے ہیں، اور کام شروع ہونے سے پہلے ہم آپ کے ساتھ ٹوٹل ملا لیتے ہیں۔',
    sourceNote: 'Product bulk import (dry run); customer opening balance (Purana khata); supplier opening balance.',
    origin: 'translation of faq mp-migration-what',
    evidence: ['apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/customers', 'apps/web/src/modules/purchasing/suppliers'],
  },
  {
    key: 'ur-rawalpindi-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'راولپنڈی کے ہول سیلر یا دکاندار کو Nafaa کتنے میں پڑے گا؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے ملتے ہیں۔ قیمتوں کے صفحے پر ہر پلان اپنی قیمت اور حدوں کے ساتھ موجود ہے، جو براہ راست ہماری پلان سیٹنگز سے آتی ہیں، اس لیے پرانی نہیں ہوتیں۔ پہلے فری ٹرائل سے دیکھ لیں؛ سائن اپ کے لیے کریڈٹ کارڈ نہیں دینا پڑتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'rawalpindi',
  title: 'راولپنڈی',
  seoTitle: 'راولپنڈی میں ہول سیل، کپڑے اور دکان کے لیے POS سافٹ ویئر',
  seoDescription: 'راولپنڈی کے ہول سیلرز، کپڑے اور جیولری کی دکانوں، کریانہ اور ریسٹورنٹس کے لیے Nafaa: ہول سیل اور ریٹیل ریٹ، سائز اور رنگ کا اسٹاک، اور انٹرنیٹ کے بغیر بل۔',
  focusKeyword: 'راولپنڈی POS سافٹ ویئر',
  summary:
    'Nafaa راولپنڈی کے ہول سیلرز، کپڑے اور جیولری کی دکانوں، کریانہ اسٹورز اور ریسٹورنٹس کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ کاؤنٹر والے فون یا کمپیوٹر پر چلتا ہے، بھیڑ والے بازاروں میں کمزور سگنل پر بھی بل بناتا رہتا ہے، اور تاجروں اور گھرانوں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'راولپنڈی',
    province: 'Punjab',
    authority: 'PRA',
    wikidataId: 'Q93230',
    geo: { lat: 33.5651, lng: 73.0169 },
    markets: [
      {
        name: 'راجہ بازار',
        area: 'پرانا شہر',
        note: 'راولپنڈی کی تجارت کا پرانا دل، ہول سیل اور پرچون کی بھیڑ بھری گلیوں کا جال، جہاں کپڑا، عام سامان، برتن، ڈرائی فروٹ اور گھریلو چیزیں ملتی ہیں۔',
      },
      {
        name: 'موتی بازار',
        area: 'پرانا شہر',
        note: 'زنانہ کپڑوں، فیبرک، لیس، چوڑیوں اور دلہن کی خریداری کے لیے مشہور تنگ بازار، جہاں عید اور شادیوں سے پہلے سب سے زیادہ رش ہوتا ہے۔',
      },
      {
        name: 'گنج منڈی',
        area: 'پرانا شہر',
        note: 'اناج، دالوں اور مصالحوں کی ہول سیل منڈی، جو پورے شہر اور آس پاس کے قصبوں کے کریانہ اسٹورز کو مال دیتی ہے۔',
      },
      {
        name: 'صدر',
        area: 'کینٹ',
        note: 'بینک روڈ اور کشمیر روڈ کے ساتھ کینٹ کا خریداری کا علاقہ، جہاں کپڑوں، جوتوں، الیکٹرانکس اور کتابوں کی دکانیں، بیکریاں اور ریسٹورنٹس ہیں۔',
      },
      {
        name: 'کمرشل مارکیٹ',
        area: 'سیٹلائٹ ٹاؤن',
        note: 'کپڑوں، موبائل، گروسری اور کھانے کی دکانوں والی بڑی محلہ مارکیٹ، جو رات دیر تک مصروف رہتی ہے۔',
      },
      {
        name: 'صرافہ بازار',
        area: 'پرانا شہر',
        note: 'راجہ بازار کے قریب سونے اور زیورات کی گلی، جہاں قیمتیں روز کے صرافہ ریٹ کے ساتھ بدلتی ہیں۔',
      },
    ],
    areas: [
      {
        name: 'سیٹلائٹ ٹاؤن',
        note: 'کمرشل مارکیٹ کے گرد گنجان رہائشی بلاک، جہاں بیکریاں، فارمیسیاں اور کریانہ اسٹور اپنے گاہکوں کو نام سے جانتے ہیں۔',
      },
      {
        name: 'بحریہ ٹاؤن اور DHA',
        note: 'پلان کیے گئے کمرشل علاقے، جہاں پرانے شہر کے بہت سے کاروبار اپنی دوسری برانچ کھولتے ہیں، نئے کیفے، سیلون اور سپر مارکیٹس کے ساتھ۔',
      },
      {
        name: 'چکلالہ اور ویسٹریج',
        note: 'کینٹ کے محلے، جہاں جنرل اسٹور، درزی اور کھانے کی دکانیں گھرانوں اور دفتروں کا کام کرتی ہیں۔',
      },
      {
        name: 'مری روڈ اور کمیٹی چوک',
        note: 'شہر کی بڑی کمرشل شاہراہ، جس کے دونوں طرف شو روم، ہوٹل، ریسٹورنٹس اور ہول سیل دفتر ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، پرانے بیلنس ڈالنا اور اسٹاف کی ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ راولپنڈی میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر رہنمائی کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'راولپنڈی میں POS سافٹ ویئر',
      heading: 'راولپنڈی',
      sub: 'پنڈی کے بیچنے کے انداز کے لیے بنا: راجہ بازار کے ڈیلر کھاتے پر، موتی بازار کے بوتیک سائز اور رنگ کے ساتھ، صدر کے کاؤنٹر کیش اور والٹ پر، اور وہ خاندانی کاروبار جو بحریہ ٹاؤن میں دوسری برانچ کھول رہے ہیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['ہول سیل اور ریٹیل ریٹ', 'سائز اور رنگ کا اسٹاک', 'انٹرنیٹ کے بغیر بل'],
      media: { kind: 'screenshot', mediaId: SHOT.inventory, frame: 'browser', url: 'app.nafaa.pk/products' },
      layout: 'centered',
      id: 'b31afc79464a',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'کاؤنٹر والا فون، ٹیبلٹ یا کمپیوٹر؛ بل آف لائن بھی بنتے رہتے ہیں' },
        { label: 'کن کے لیے بہتر', value: 'ہول سیلر، کپڑے اور گارمنٹس کی دکانیں، جیولر، کریانہ، ہارڈ ویئر کی دکانیں، ریسٹورنٹس' },
        { label: 'کھاتہ', value: 'تاجر خریدار اور گھرانے ادھار پر، حد اور واٹس ایپ یاد دہانی کے ساتھ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Pindi ke bazaaron ke liye Nafaa: Raja Bazaar ke dealer ho ya Moti Bazaar ki boutique, bill, stock aur udhaar ek app me. Rush me signal na ho to bhi counter chalta hai.',
      id: 'bde1add1a18b',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'راولپنڈی میں سیلز ٹیکس', id: 'bb3facc1e46d' },
    {
      type: 'richText',
      markdown:
        '## راولپنڈی کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nراولپنڈی جڑواں شہروں میں پرانا شہر ہے، اور اس کے بازار پوٹھوہار کے بڑے حصے، مری کی طرف کے پہاڑی قصبوں اور اسلام آباد کی بہت سی دکانوں کو مال دیتے ہیں۔ یہاں کاروبار گھنا بھی ہے اور ذاتی بھی: پرانے شہر کے ڈیلر دہائیوں سے انہی دکانداروں کو بیچ رہے ہیں، اکثر کھاتے پر، جبکہ کینٹ اور نئی ہاؤسنگ اسکیمیں سپر مارکیٹس، کیفے اور برانڈڈ آؤٹ لیٹ لا رہی ہیں۔\n\n- **ہول سیل اور عام سامان کے ڈیلر** راجہ بازار اور گنج منڈی کے آس پاس اناج، مصالحے، کپڑا اور گھریلو سامان بوری، درجن اور کارٹن کے حساب سے بیچتے ہیں۔ Nafaa ہول سیل قیمت الگ رکھتا ہے، ہر یونٹ کی اپنی قیمت، اور ادھار حد والا تاجروں کا کھاتہ۔\n- **زنانہ کپڑوں اور فیبرک کی دکانیں** موتی بازار میں ہر ڈیزائن کو سائز اور رنگ کے حساب سے رکھتی ہیں، محفوظ ناپ کے ساتھ سلائی کے آرڈر لیتی ہیں، اور قسطوں میں پیسے دینے والے گاہکوں کا سامان رکھ لیتی ہیں۔\n- **جیولر** دن کا سونے کا ریٹ لگاتے ہیں، ہر زیور اس کے وزن اور نگینوں کے ساتھ رکھتے ہیں، پرانا سونا واپس خریدتے ہیں اور کاریگروں کو دیا گیا کام لکھتے ہیں۔\n- **ہارڈ ویئر اور تعمیراتی سامان کی دکانیں**، جو ہاؤسنگ اسکیموں کی مسلسل تعمیر کا مال دیتی ہیں، سائز اور شیڈ کے حساب سے آئٹم، ٹھیکیدار کے ریٹ، کوٹیشن اور ڈیلیوری چالان رکھتی ہیں۔\n- **ریسٹورنٹس، بیکریاں اور کریانہ اسٹور** صدر، سیٹلائٹ ٹاؤن اور بحریہ ٹاؤن میں اسی کاؤنٹر سافٹ ویئر پر ریسٹورنٹ، بیکری اور کریانہ والی اسکرینیں چلاتے ہیں۔',
      id: 'b0ea72939f43',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'be099b1655cd' },
    {
      type: 'richText',
      markdown:
        '## راولپنڈی میں کام کے حالات\n\n**بھیڑ اور سگنل۔** مصروف دن پر پرانے شہر کی گلیاں کھچا کھچ بھری ہوتی ہیں، اور اونچی، ساتھ ساتھ بنی دکانوں کے بیچ موبائل ڈیٹا مشکل سے چلتا ہے۔ Nafaa کو بل بنانے کے لیے انٹرنیٹ نہیں چاہیے۔ سیل ڈیوائس پر محفوظ رہتی ہے اور سگنل لوٹنے پر آپ کے اکاؤنٹ میں چلی جاتی ہے، اس لیے ڈیلر کو کبھی گاہک کو صفحہ کھلنے کے انتظار میں نہیں روکنا پڑتا۔\n\n**بجلی۔** راولپنڈی کو بجلی IESCO سے ملتی ہے، اور پرانے شہر کے کچھ حصوں میں اور گرمیوں کے زیادہ لوڈ میں بندش اب بھی ہوتی ہے۔ بیٹری پر فون یا لیپ ٹاپ ان گھنٹوں میں بھی کاؤنٹر چلائے رکھتا ہے۔\n\n**زبانیں۔** شہر کے بازاروں میں اردو ہر جگہ بولی جاتی ہے، تاجروں اور گاہکوں میں پنجابی اور پوٹھواری عام ہیں، اور ہول سیل کے بہت سے دکاندار پشتو بولتے ہیں۔ Nafaa کی اسکرینیں اردو اور انگریزی میں بدلتی ہیں، تاکہ اسٹاف اپنی آسانی کی زبان میں پڑھ سکے۔\n\n**پرانے رجسٹر اور پرانے تعلقات۔** پنڈی کے بہت سے کاروبار برسوں کا ادھار کاغذی رجسٹروں میں رکھتے ہیں۔ شروع کرتے وقت ہر گاہک کا پرانا بیلنس ڈالا جا سکتا ہے، اور اس کے بعد ہر بل اور ہر ادائیگی اسی لیجر میں جڑتی ہے۔ ایک ٹیپ والا واٹس ایپ میسج گاہک کو یاد دلاتا ہے کہ اس پر کتنا باقی ہے، اور بیلنس پرانا ہونے کے ساتھ الفاظ سخت ہوتے جاتے ہیں۔',
      id: 'b541bd29283c',
    },
    {
      type: 'screenshot',
      heading: 'ہر ڈیزائن، سائز اور رنگ ایک لسٹ میں',
      body: 'موتی بازار یا صدر کی کپڑوں کی دکان ہر ڈیزائن کو اس کے سائز اور رنگوں سمیت ایک پروڈکٹ کے نیچے رکھتی ہے، ہر ایک کا اپنا بارکوڈ اور اسٹاک گنتی۔ کاؤنٹر سائز پوچھتا ہے، اور کم اسٹاک کی لسٹ بتاتی ہے کہ سیزن سے پہلے کون سے سائز دوبارہ منگوانے ہیں۔',
      mediaId: SHOT.inventory,
      frame: 'browser',
      url: 'app.nafaa.pk/products',
      layout: 'split-right',
      id: 'bf6811deb299',
    },
    {
      type: 'comparisonTable',
      heading: 'راولپنڈی کے کاروبار اور Nafaa ان کا کیا ریکارڈ رکھتا ہے',
      caption: 'پنڈی کا ہر طرح کا کاروبار Nafaa میں کیا رکھتا ہے، ہر پلان کے کاؤنٹر، اسٹاک اور کھاتے کے علاوہ۔',
      columns: [
        { key: 'records', label: 'کیا ریکارڈ ہوتا ہے' },
        { key: 'khata', label: 'ادھار کیسے چلتا ہے' },
      ],
      rows: [
        { label: 'عام سامان کا ہول سیلر', cells: { records: { value: 'درجن اور کارٹن کے یونٹ، ہول سیل ریٹ' }, khata: { value: 'ادھار حد والے تاجر خریدار' } } },
        { label: 'زنانہ کپڑوں کی دکان', cells: { records: { value: 'سائز اور رنگ کے ساتھ ڈیزائن، سلائی کے آرڈر' }, khata: { value: 'گاہک کے پیسے پورے ہونے تک سامان رکھا رہتا ہے' } } },
        { label: 'جیولر', cells: { records: { value: 'سونے کا ریٹ، وزن، نگینے، کاریگر کا کام' }, khata: { value: 'آرڈر پر بنوانے کے لیے ایڈوانس' } } },
        { label: 'ہارڈ ویئر کی دکان', cells: { records: { value: 'سائز، شیڈ، ٹھیکیدار کے ریٹ، چالان' }, khata: { value: 'ہر ٹھیکیدار اور سائٹ کا الگ کھاتہ' } } },
        { label: 'بیکری یا مٹھائی کی دکان', cells: { records: { value: 'کاسٹ کے ساتھ ریسیپیاں، آرڈر والے کیک' }, khata: { value: 'تقریب کے آرڈر پر لیا گیا ایڈوانس' } } },
      ],
      id: 'b12e5a35d9ca',
    },
    {
      type: 'steps',
      heading: 'راولپنڈی میں کاغذی رجسٹر سے Nafaa پر',
      intro: 'پنڈی کے زیادہ تر کاروبار بہی کھاتے یا پرانے ڈیسک ٹاپ پروگرام سے آتے ہیں۔ عام طور پر ترتیب یہ ہوتی ہے۔',
      items: [
        { title: 'فری ٹرائل شروع کریں', body: 'کاؤنٹر والی ڈیوائس پر سائن اپ کریں اور اپنا کاروبار چنیں۔' },
        { title: 'لکھیں کس پر کتنا باقی ہے', body: 'ہر مستقل گاہک کو اپنے رجسٹر والے بیلنس کے ساتھ ڈالیں۔ مدد چاہیے تو صفحوں کی تصویریں واٹس ایپ پر بھیج دیں۔' },
        { title: 'اپنا اسٹاک ڈالیں', body: 'پروڈکٹس Excel یا پرانے سافٹ ویئر سے امپورٹ کریں، جہاں استعمال کرتے ہیں وہاں یونٹ، ہول سیل ریٹ اور سائز کے ساتھ۔' },
        { title: 'پہلے دن بل بنائیں اور دن بند کریں', body: 'پورا ایک دن Nafaa پر چلائیں اور رجسٹر رکھنے سے پہلے آخری کیش کو اپنے دراز سے ملا لیں۔' },
      ],
      id: 'b2209d76afc2',
    },
    {
      type: 'richText',
      markdown:
        '## راولپنڈی کے کاروباری لوگوں کے سوال\n\n### کیا دکانداروں اور راہ چلتے گاہکوں کے لیے ریٹ الگ رکھ سکتا ہوں؟\nجی ہاں۔ ہر پروڈکٹ پر ریٹیل اور ہول سیل دونوں قیمتیں ہو سکتی ہیں، اور ہر یونٹ کی اپنی قیمت۔ کھاتہ ہر تاجر خریدار کا بیلنس اور حد رکھتا ہے۔\n\n### میری ایک دکان پرانے شہر میں اور ایک بحریہ ٹاؤن میں ہے۔ کیا اسٹاک ایک سے دوسری میں جا سکتا ہے؟\nجی ہاں۔ ایک برانچ سے ٹرانسفر بنائیں اور دوسری برانچ تصدیق کرتی ہے کہ کیا پہنچا، اس لیے دونوں کی اسٹاک گنتی ٹھیک رہتی ہے۔\n\n### کیا یہ میرے جیولری کاؤنٹر کے لیے سونے کا ریٹ سنبھالتا ہے؟\nجی ہاں۔ جیولری والی اسکرینوں میں آپ دن کا سونے اور چاندی کا ریٹ لگاتے ہیں اور ہر زیور کی قیمت اس کے وزن سے بنتی ہے۔',
      id: 'be497ac89bc8',
    },
    { type: 'cityFacts', show: ['support'], heading: 'راولپنڈی میں سپورٹ', id: 'ba9c64828ac3' },
    { type: 'pricingTable', heading: 'راولپنڈی کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b2e7953ebf9b' },
    { type: 'faq', heading: 'مزید سوال', id: 'b8948d8d5862' },
    {
      type: 'cta',
      heading: 'راولپنڈی میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے کاؤنٹر والی ڈیوائس پر مفت آزمائیں۔ پرانے رجسٹر میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b9bc2bd25810',
    },
  ],
  featured: false,
  sortOrder: 4,
  origin: 'translation of content/cities/rawalpindi.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/jewelry',
    'apps/web/src/industries/hardware',
    'apps/web/src/industries/bakery',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
  ],
  sources: [
    { title: 'Rawalpindi (Wikidata Q93230)', url: 'https://www.wikidata.org/wiki/Q93230', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Rawalpindi (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Rawalpindi', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Raja Bazaar (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Raja_Bazaar', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Islamabad Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Islamabad_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; IESCO supplies Rawalpindi).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-rawalpindi-devices', 'ur-rawalpindi-wholesale-prices', 'ur-rawalpindi-khata-reminders', 'ur-rawalpindi-garments-variants', 'ur-rawalpindi-migration-what', 'ur-rawalpindi-pricing'],
  relations: [
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:hardware@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery@ur', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration@ur', kind: 'RELATED' },
  ],
};
