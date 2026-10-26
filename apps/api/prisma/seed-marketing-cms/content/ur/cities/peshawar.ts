/** Urdu: Peshawar city page (/ur/pos-software/peshawar). Translation of content/cities/peshawar.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-peshawar-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'پشاور میں موبائل ڈیٹا معطل ہو یا PESCO کی بجلی جائے تو Nafaa پر بلنگ ہوتی رہے گی؟',
    answer:
      'جی ہاں۔ نیٹ ورک غائب ہو تب بھی کاؤنٹر بل نکالتا رہتا ہے۔ آف لائن سیل اسی ڈیوائس پر جمع رہتی ہے اور جب کنکشن بحال ہو تو بغیر کچھ کیے آپ کے اکاؤنٹ میں منتقل ہو جاتی ہے۔ جو سیل ابھی منتقل ہونی ہے وہ ایک لسٹ میں دکھتی ہے۔ رپورٹس اور باقی برانچیں سنک مکمل ہونے کے بعد یہ سیل دیکھ پاتی ہیں۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-peshawar-restaurant-split',
    locale: 'ur',
    topic: 'restaurant',
    question: 'پشاور کے کڑاہی ہاؤس میں ایک ٹیبل کا بل کئی طریقوں سے ادا ہو سکتا ہے؟',
    answer:
      'جی ہاں۔ بل کیش، کارڈ یا والٹ سے ادا ہو سکتا ہے، کئی طریقوں میں بانٹا جا سکتا ہے، کچھ ابھی اور باقی بعد میں دیا جا سکتا ہے، یا پورا گاہک کے کھاتے میں ڈالا جا سکتا ہے۔ جو رقم رہ جائے وہ اسی گاہک پر ادھار بن کر دکھتی ہے، اس لیے شفٹ بدلنے میں کچھ گم نہیں ہوتا۔',
    sourceNote: 'useOrderPayment (cash, card, wallet, split, part payment, full udhaar).',
    origin: 'translation of faq restaurant-split',
    evidence: ['apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx'],
  },
  {
    key: 'ur-peshawar-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'پشاور کا ڈرائی فروٹ ڈیلر تاجروں کے لیے ہول سیل اور عام گاہک کے لیے ریٹیل ریٹ رکھ سکتا ہے؟',
    answer:
      'جی ہاں۔ ہر پروڈکٹ میں ریٹیل قیمت اور ہول سیل قیمت دونوں ڈالی جا سکتی ہیں، اور پیس، درجن یا کارٹن جیسے ہر یونٹ کی قیمت بھی الگ رہتی ہے۔ کاؤنٹر ہر سیل پر ٹھیک قیمت لگاتا ہے، اور کھاتہ ہر تاجر گاہک کا بیلنس اور اس کی ادھار حد سنبھالتا ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-peshawar-hardware',
    locale: 'ur',
    topic: 'product',
    question: 'پشاور کی دکان میں Nafaa POS کے ساتھ کون سے پرنٹر اور اسکینر چلتے ہیں؟',
    answer:
      'کوئی بھی USB یا Bluetooth بارکوڈ اسکینر جو کی بورڈ کی طرح ٹائپ کرتا ہو، بغیر سیٹنگ کے چل جاتا ہے۔ رسیدیں 58 mm اور 80 mm تھرمل پرنٹر پر چھپتی ہیں، اور Windows ڈیسک ٹاپ ایپ بغیر ڈائیلاگ کے پرنٹ کرتی ہے اور کیش دراز بھی کھول سکتی ہے۔ چاہیں تو کاغذ چھوڑ کر رسید واٹس ایپ پر بھیج دیں۔',
    sourceNote: 'core/hardware (scanner input), core/print (58/80 mm), desktop app printing, WhatsApp receipt templates.',
    origin: 'translation of faq mp-pos-hardware',
    evidence: ['apps/web/src/core/hardware', 'apps/web/src/core/print', 'apps/desktop', 'apps/web/src/core/lib/whatsapp/templates.ts'],
  },
  {
    key: 'ur-peshawar-imei',
    locale: 'ur',
    topic: 'mobile-shop',
    question: 'پشاور کے موبائل اور الیکٹرانکس تاجر Nafaa میں IMEI کیسے ٹریک کرتے ہیں؟',
    answer:
      'ہر فون اس کے IMEI سے رکھا جاتا ہے۔ مال آئے تو IMEI درج ہوتے ہیں، اور سیل پر IMEI بل میں لکھا جاتا ہے، اس لیے ہمیشہ پتہ رہتا ہے کہ کون سا سیٹ اسٹاک میں ہے، کون سا بک چکا اور کون سا مرمت میں ہے۔ ہر IMEI پر اس کا PTA اسٹیٹس بھی رکھا جا سکتا ہے۔',
    sourceNote: 'Mobile pack: IMEI stock, PTA compliance per IMEI, repair tickets.',
    origin: 'translation of faq mobile-imei',
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx'],
  },
  {
    key: 'ur-peshawar-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'پشاور کے ریسٹورنٹ، جیولر یا دکان کے لیے Nafaa کتنے کا پڑتا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہیں۔ قیمتوں والے صفحے پر ہر پلان کی قیمت اور حدیں دی گئی ہیں، جو ہماری پلان سیٹنگز سے سیدھی آتی ہیں اور اسی لیے ہمیشہ درست رہتی ہیں۔ آپ فری ٹرائل سے شروع کر سکتے ہیں، اور سائن اپ پر کریڈٹ کارڈ نہیں مانگا جاتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'peshawar',
  title: 'پشاور',
  seoTitle: 'پشاور میں ریسٹورنٹ، جیولر اور دکان کے لیے POS سافٹ ویئر',
  seoDescription: 'پشاور کے ریسٹورنٹس، قصائیوں، جیولرز، ڈرائی فروٹ اور قالین ڈیلرز کے لیے Nafaa: کلو کے حساب سے بل، روز کا سونے کا ریٹ، تاجروں کا کھاتہ، اور انٹرنیٹ کے بغیر بل۔',
  focusKeyword: 'پشاور POS سافٹ ویئر',
  summary:
    'Nafaa پشاور کے ریسٹورنٹس، گوشت کی دکانوں، جیولرز، ڈرائی فروٹ اور قالین کے ڈیلرز اور الیکٹرانکس تاجروں کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ کاؤنٹر والے فون یا کمپیوٹر پر چلتا ہے، بجلی یا نیٹ ورک جانے پر بھی بل بناتا رہتا ہے، اور تاجروں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'پشاور',
    province: 'Khyber Pakhtunkhwa',
    authority: 'KPRA',
    wikidataId: 'Q1113311',
    geo: { lat: 34.0151, lng: 71.5249 },
    markets: [
      {
        name: 'قصہ خوانی بازار',
        area: 'پرانا شہر',
        note: 'قصہ گوؤں کا بازار، ایک تاریخی بازار جہاں ڈرائی فروٹ، چائے، مٹھائی، کپڑے اور عام سامان کی دکانیں ہیں۔',
      },
      {
        name: 'اندر شہر',
        area: 'پرانا شہر',
        note: 'فصیل والے شہر کا جیولری بازار، جہاں سونا اور چاندی دن کے ریٹ پر لگتے ہیں اور وزن سے بکتے ہیں۔',
      },
      {
        name: 'نمک منڈی',
        area: 'پرانا شہر',
        note: 'دنبے کی کڑاہی، تکے اور گوشت کے دوسرے کھانوں کے لیے ملک بھر میں مشہور، جو آرڈر پر پکتے ہیں اور اکثر کلو کے حساب سے بکتے ہیں۔',
      },
      {
        name: 'کارخانو مارکیٹ',
        area: 'جمرود روڈ',
        note: 'شہر کے مغربی کنارے کے قریب بڑی مارکیٹیں، جہاں الیکٹرانکس، کپڑا، کراکری اور باہر سے آیا مال پرچون اور تھوک دونوں میں بکتا ہے۔',
      },
      {
        name: 'چوک یادگار',
        area: 'پرانا شہر',
        note: 'شہر کا مرکزی چوک، جس کے گرد کپڑے، جوتوں اور عام سامان کی دکانیں اور شہر کے منی چینجر ہیں۔',
      },
    ],
    areas: [
      {
        name: 'صدر',
        note: 'کینٹ کا خریداری کا علاقہ، جہاں کپڑے، جوتے، بیکریاں، فارمیسیاں اور ریسٹورنٹس ہیں۔',
      },
      {
        name: 'یونیورسٹی ٹاؤن',
        note: 'کیفے، ریسٹورنٹس، کتابوں کی دکانیں اور سیلون، جو طالب علموں، گھرانوں اور دفتروں کا کام کرتے ہیں۔',
      },
      {
        name: 'حیات آباد',
        note: 'بڑی پلان کی گئی بستی، جہاں سپر مارکیٹس، فارمیسیاں اور کھانے کی دکانیں ہیں، اور اس کے کنارے ایک انڈسٹریل اسٹیٹ۔',
      },
      {
        name: 'گلبہار',
        note: 'پرانے رہائشی بلاک، جہاں کریانہ اسٹور، درزی اور محلے کی مارکیٹیں کھاتے پر بیچتی ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا منتقل کرنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ پشاور میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر آپ کے ساتھ کام کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'پشاور میں POS سافٹ ویئر',
      heading: 'پشاور',
      sub: 'نمک منڈی کے کڑاہی ہاؤسز سے اندر شہر کی سونے والی گلیوں اور جمرود روڈ کی مارکیٹوں تک: پشاور کے کاروبار کے لیے بل، وزن سے سیل، سونے کا ریٹ اور تاجروں کا ادھار۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['وزن سے سیل', 'روز کا سونے کا ریٹ', 'انٹرنیٹ کے بغیر بل'],
      media: { kind: 'screenshot', mediaId: SHOT.tables, frame: 'browser', url: 'app.nafaa.pk/restaurant/tables' },
      layout: 'centered',
      id: 'ba859c56495c',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'آپ کا فون، ٹیبلٹ یا کمپیوٹر؛ کاؤنٹر آف لائن بھی چلتا ہے' },
        { label: 'کن کے لیے بہتر', value: 'ریسٹورنٹس، قصائی، جیولر، ڈرائی فروٹ اور قالین ڈیلر، الیکٹرانکس اور موبائل شاپس' },
        { label: 'وزن اور ریٹ', value: 'آج کے ریٹ پر کلو کے حساب سے بیچیں؛ ہر صبح سونے کا ریٹ لگائیں' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Peshawar ke restaurants, qasai, sunar aur dry fruit dealers ke liye Nafaa: kilo ke hisaab se bill, aaj ka rate, aur trade ka khata ek app me. Bijli ya network jaye to bhi bill bante hain.',
      id: 'baafe1cba4c8',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'پشاور میں سیلز ٹیکس', id: 'b49a92bb7ee5' },
    {
      type: 'richText',
      markdown:
        '## پشاور کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nپشاور جنوبی ایشیا کے ان قدیم ترین شہروں میں سے ہے جو آج بھی آباد ہیں، اور صدیوں سے افغانستان اور وسطی ایشیا کے راستے پر تجارتی پڑاؤ رہا ہے۔ یہ تاریخ اس کے بازاروں میں آج بھی نظر آتی ہے: ڈرائی فروٹ، قالین، قیمتی پتھر اور باہر کا مال روز کے کریانے اور کپڑے کے کاروبار کے ساتھ ساتھ بکتا ہے، اور بہت سا لین دین ان تاجروں کے بیچ ہوتا ہے جو ایک دوسرے کو اچھی طرح جانتے ہیں۔\n\n- **ریسٹورنٹس اور تکہ ہاؤس** نمک منڈی اور یونیورسٹی روڈ کے آس پاس ٹیبل، کچن ٹکٹ اور ٹیک اوے چلاتے ہیں، اور جہاں گاہک گوشت خود چنتا ہے وہاں کھانے کی قیمت وزن سے لگاتے ہیں۔\n- **قصائی اور گوشت سپلائر** دن کا ریٹ لگاتے ہیں، وزن سے بیچتے ہیں، منڈی سے خریدے جانور درج کرتے ہیں اور ریسٹورنٹس کو کھاتے پر مال دیتے ہیں۔\n- **جیولر** اندر شہر میں ہر صبح سونے اور چاندی کا ریٹ لگاتے ہیں، ہر زیور اس کے وزن اور نگینوں کے ساتھ رکھتے ہیں، پرانا سونا واپس خریدتے ہیں اور کاریگر کا کام لکھتے ہیں۔\n- **ڈرائی فروٹ ڈیلر** کلو اور بوری کے حساب سے بیچتے ہیں، ہول سیل اور ریٹیل ریٹ رکھتے ہیں، اور دوسرے شہروں کے خریداروں سے ادھار کا لین دین کرتے ہیں۔\n- **قالین اور دری بیچنے والے** اسٹاک میں ہر رول کی لمبائی رکھتے ہیں اور کٹے ٹکڑوں کی قیمت مربع فٹ سے لگاتے ہیں۔\n- **الیکٹرانکس اور موبائل تاجر** سیریل نمبر اور IMEI، وارنٹی کلیم اور پرانے سامان کی حالت درج کرتے ہیں۔',
      id: 'bff9e395679a',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'bf194abfb989' },
    {
      type: 'richText',
      markdown:
        '## پشاور میں کام کے حالات\n\n**بجلی اور نیٹ ورک۔** پشاور کو بجلی PESCO دیتی ہے، اور بہت سے فیڈرز پر لوڈ شیڈنگ لمبی ہوتی ہے، جبکہ پرانے شہر میں موبائل ڈیٹا کمزور رہتا ہے اور کئی بار پورے شہر میں معطل بھی کیا گیا ہے۔ Nafaa بل بنانے کے لیے انٹرنیٹ کا انتظار نہیں کرتا۔ سیل ڈیوائس پر رہتی ہے اور کنکشن لوٹنے پر آپ کے اکاؤنٹ میں چلی جاتی ہے۔\n\n**وزن اور ریٹ سے بیچنا۔** گوشت، ڈرائی فروٹ اور سونا سب وزن سے بکتے ہیں، ایسے ریٹ پر جو بدلتا رہتا ہے۔ کاؤنٹر وزن پوچھتا ہے اور دن کے لیے آپ کے لگائے ریٹ پر قیمت نکال دیتا ہے، اس لیے کیشیئر کو ہاتھ سے حساب نہیں کرنا پڑتا۔\n\n**زبان۔** پشاور کی بڑی زبان پشتو ہے، پرانے شہر میں ہندکو بولی جاتی ہے، اور لکھنے اور زیادہ تر دفتروں میں اردو چلتی ہے۔ Nafaa کی اسکرینیں اردو یا انگریزی میں آتی ہیں، اور سپورٹ ٹیم اردو یا انگریزی میں کام کرتی ہے۔\n\n**دوسرے شہروں سے تجارت۔** یہاں کے ڈرائی فروٹ، قالین اور سامان کے ڈیلر ملک بھر کے خریداروں کو بیچتے ہیں، اکثر کھاتے پر۔ ہر خریدار کو ادھار حد والا کھاتہ ملتا ہے، اور اگلے آرڈر سے پہلے ایک ٹیپ میں بیلنس واٹس ایپ یاد دہانی بن کر جا سکتا ہے۔',
      id: 'b741c1c30b07',
    },
    {
      type: 'screenshot',
      heading: 'مصروف شاموں کے لیے ٹیبل اور کچن ٹکٹ',
      body: 'پشاور کا ریسٹورنٹ ٹیبل کھولتا ہے، وزن کے حساب سے کڑاہی، تکے اور نان ڈالتا ہے، اور آرڈر کچن میں ٹکٹ بن کر جاتا ہے۔ بل دوستوں میں بانٹا جا سکتا ہے اور کیش یا والٹ سے ادا ہو سکتا ہے۔',
      mediaId: SHOT.tables,
      frame: 'browser',
      url: 'app.nafaa.pk/restaurant/tables',
      layout: 'split-left',
      id: 'b696f8355af0',
    },
    {
      type: 'comparisonTable',
      heading: 'پشاور میں وزن اور ریٹ سے بیچنا',
      caption: 'وہ کاروبار جو وزن یا روز کے ریٹ سے قیمت لگاتے ہیں، اور Nafaa ہر ایک کو کیسے سنبھالتا ہے۔',
      columns: [
        { key: 'how', label: 'قیمت کیسے لگتی ہے' },
        { key: 'nafaa', label: 'Nafaa میں' },
      ],
      rows: [
        { label: 'قصائی', cells: { how: { value: 'آج کے ریٹ پر فی کلو' }, nafaa: { value: 'ریٹ لگائیں؛ وزن سے قیمت بنتی ہے' } } },
        { label: 'جیولر', cells: { how: { value: 'وزن کے حساب سے سونے کا ریٹ، ساتھ بنوائی' }, nafaa: { value: 'روز کا سونے اور چاندی کا ریٹ، ہر زیور کا وزن' } } },
        { label: 'ڈرائی فروٹ ڈیلر', cells: { how: { value: 'فی کلو، ریٹیل اور ہول سیل' }, nafaa: { value: 'دو قیمتوں کے ساتھ وزن سے سیل' } } },
        { label: 'قالین فروش', cells: { how: { value: 'فی مربع فٹ' }, nafaa: { value: 'اسٹاک میں رول کی لمبائی، سائز کیلکولیٹر' } } },
        { label: 'ریسٹورنٹ', cells: { how: { value: 'کڑاہی کلو کے حساب سے، باقی کھانے فکس' }, nafaa: { value: 'مینیو آئٹم وزن سے یا پلیٹ سے' } } },
      ],
      id: 'b2ae384ba21a',
    },
    {
      type: 'steps',
      heading: 'پشاور میں Nafaa سے شروعات',
      items: [
        { title: 'فری ٹرائل کھولیں', body: 'اپنے فون یا کمپیوٹر پر سائن اپ کریں اور اپنا کاروبار چنیں۔' },
        { title: 'آج کے ریٹ لگائیں', body: 'قصائی گوشت کا ریٹ، جیولر سونے کا ریٹ، اور ڈرائی فروٹ ڈیلر فی کلو ریٹ لگائیں۔' },
        { title: 'تاجر خریدار ڈالیں', body: 'مستقل خریداروں کو ان کے پرانے بیلنس اور ادھار حد کے ساتھ درج کریں۔' },
        { title: 'تیار ہوں تو ترازو یا پرنٹر جوڑیں', body: 'صرف فون سے شروع کریں؛ رسید پرنٹر یا ترازو بعد میں لگائیں۔' },
      ],
      id: 'b60cce9c3856',
    },
    {
      type: 'richText',
      markdown:
        '## پشاور کے کاروباری لوگوں کے سوال\n\n### موبائل انٹرنیٹ معطل ہو تو کیا میں بل بنا سکتا ہوں؟\nجی ہاں۔ بل بنانے کے لیے کنکشن نہیں چاہیے۔ سیل ڈیوائس پر انتظار کرتی ہے اور انٹرنیٹ بحال ہونے پر سنک ہو جاتی ہے۔\n\n### کیا Nafaa روز کا سونے کا ریٹ سنبھالتا ہے؟\nجی ہاں۔ ہر صبح سونے اور چاندی کا ریٹ لگائیں، اور ہر زیور کی قیمت اس ریٹ پر اس کے وزن سے بنتی ہے۔\n\n### کیا میں گوشت اور ڈرائی فروٹ کلو کے حساب سے بیچ سکتا ہوں؟\nجی ہاں۔ کاؤنٹر وزن لیتا ہے اور آپ کے لگائے ریٹ پر اس کی قیمت بناتا ہے۔',
      id: 'b6759c1c0015',
    },
    { type: 'cityFacts', show: ['support'], heading: 'پشاور میں سپورٹ', id: 'bac8718f2f5c' },
    { type: 'pricingTable', heading: 'پشاور کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'bfcbd7885396' },
    { type: 'faq', heading: 'مزید سوال', id: 'b58e98bc06b5' },
    {
      type: 'cta',
      heading: 'پشاور میں آج ہی بل بنانا شروع کریں',
      body: 'جو ڈیوائس پہلے سے ہے اسی پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b2283cbbdffc',
    },
  ],
  featured: false,
  sortOrder: 7,
  origin: 'translation of content/cities/peshawar.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/meat',
    'apps/web/src/industries/jewelry',
    'apps/web/src/industries/carpet',
    'apps/web/src/industries/electronics',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/core/hardware',
  ],
  sources: [
    { title: 'Peshawar (Wikidata Q1113311)', url: 'https://www.wikidata.org/wiki/Q1113311', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Peshawar (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Peshawar', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Qissa Khwani Bazaar (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Qissa_Khwani_Bazaar', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Peshawar Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Peshawar_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; PESCO; widely reported mobile data suspensions).' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-peshawar-offline', 'ur-peshawar-restaurant-split', 'ur-peshawar-wholesale-prices', 'ur-peshawar-hardware', 'ur-peshawar-imei', 'ur-peshawar-pricing'],
  relations: [
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:meat@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:carpet@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos@ur', kind: 'RELATED' },
  ],
};
