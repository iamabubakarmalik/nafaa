/** Urdu: Hyderabad city page (/ur/pos-software/hyderabad). Translation of content/cities/hyderabad.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-hyderabad-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'حیدرآباد میں بجلی یا انٹرنیٹ چلا جائے تو کیا Nafaa پر بل بنتے رہیں گے؟',
    answer:
      'جی ہاں۔ انٹرنیٹ نہ ہو تب بھی کاؤنٹر بل بناتا ہے۔ ہر آف لائن سیل اسی ڈیوائس پر رکھی جاتی ہے، اور کنکشن آتے ہی خود بخود آپ کے اکاؤنٹ میں پہنچ جاتی ہے۔ کون سی سیل ابھی جانی باقی ہے، یہ بھی ایک لسٹ میں نظر آتا ہے۔ رپورٹس اور دوسری برانچوں میں یہ سیل سنک ہونے کے بعد دکھتی ہے۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-hyderabad-variants',
    locale: 'ur',
    topic: 'garments',
    question: 'حیدرآباد کی کپڑے اور چوڑی کی دکان میں سائز اور رنگ کیسے رکھے جاتے ہیں؟',
    answer:
      'پروڈکٹ کا ہر سائز اور ہر رنگ اپنی الگ اسٹاک لائن ہوتا ہے، اس لیے صاف دکھتا ہے کہ کون سے سائز اور رنگ موجود ہیں اور کون سے زیادہ بک رہے ہیں۔ سائز چارٹ اور کلیکشن سے اسٹاک کو گروپ کیا جاتا ہے، اور کاؤنٹر پر ایکسچینج ہو تو واپس آیا سائز دوبارہ اسٹاک میں چلا جاتا ہے۔',
    sourceNote: 'Garments pack: size × colour variants, size charts, collections, exchange.',
    origin: 'translation of faq garments-variants',
    evidence: ['apps/web/src/industries/garments/GarmentsPack.tsx'],
  },
  {
    key: 'ur-hyderabad-expiry',
    locale: 'ur',
    topic: 'pharmacy',
    question: 'حیدرآباد کی فارمیسی میں بیچ اور ایکسپائری کا حساب کیسے ہوتا ہے؟',
    answer:
      'اسٹاک بیچ کے حساب سے رکھا جاتا ہے، اور ہر بیچ کی اپنی ایکسپائری تاریخ ہوتی ہے۔ ایکسپائری والی اسکرین بتاتی ہے کیا جلد ختم ہونے والا ہے: 30 دن کے اندر والی دوائیں لال، 90 دن کے اندر والی پیلی، اور ایکسپائر ہو چکا مال الگ نظر آتا ہے۔ اس سے وقت مل جاتا ہے کہ نقصان بننے سے پہلے مال واپس کریں، ڈسکاؤنٹ پر بیچیں یا دوسری جگہ بھیجیں۔',
    sourceNote: 'ExpiringPage tone thresholds (expired, 30, 90 days); pack description "batch tracking".',
    origin: 'translation of faq pharmacy-expiry',
    evidence: ['apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx', 'apps/web/src/industries/pharmacy/PharmacyPack.tsx'],
  },
  {
    key: 'ur-hyderabad-khata-reminders',
    locale: 'ur',
    topic: 'khata',
    question: 'حیدرآباد میں کسانوں اور گاہکوں کو ادھار کی یاد دہانی واٹس ایپ پر جا سکتی ہے؟',
    answer:
      'جی ہاں۔ کھاتے میں ہر گاہک کا ادھار، اس کی ادائیگیاں اور پرانے رجسٹر سے لائے گئے بیلنس محفوظ رہتے ہیں۔ وہیں سے ایک ٹیپ پر گاہک کو اس کے بیلنس کے ساتھ واٹس ایپ پیغام چلا جاتا ہے۔ پیغام آپ کے اپنے واٹس ایپ نمبر سے ایک ایک کر کے جاتے ہیں، اور ادھار جتنا پرانا ہو، بات اتنی سختی سے لکھی جاتی ہے۔',
    sourceNote: 'KhataBookPage (WhatsApp yaad-dihani, tone by age) and directory/messages.ts.',
    origin: 'translation of faq khata-reminders',
    evidence: ['apps/web/src/modules/customers/directory/KhataBookPage.tsx', 'apps/web/src/modules/customers/directory/messages.ts'],
  },
  {
    key: 'ur-hyderabad-fbr-who',
    locale: 'ur',
    topic: 'compliance',
    question: 'حیدرآباد کے کاروبار کے لیے Nafaa کن ٹیکس اداروں کو انوائس بھیجتا ہے؟',
    answer:
      'Nafaa ایک FBR اور PRA سے منظور شدہ POS انٹیگریٹر ہے۔ یہ Tier-1 ریٹیلرز کی سیل انوائس FBR کو بھیجتا ہے، اور سروسز کی انوائس صوبائی اداروں کو: پنجاب میں PRA، سندھ میں SRB اور خیبر پختونخوا میں KPRA۔ ہر بل کو اپنا فسکل انوائس نمبر اور QR کوڈ ملتا ہے جو رسید پر چھپتا ہے۔',
    sourceNote: 'integrations/fbr (IMS PostData) and integrations/tax-authority adapters (PRA, SRB, KPRA, FBR).',
    origin: 'translation of faq mp-fbr-who',
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-hyderabad-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'حیدرآباد کی دکان کے لیے Nafaa کتنے کا پڑتا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہیں۔ قیمت والے صفحے پر ہر پلان کی قیمت اور اس کی حدیں لکھی ہیں، جو سیدھی ہماری پلان سیٹنگز سے آتی ہیں، اس لیے وہاں ہمیشہ تازہ قیمت ملتی ہے۔ پہلے فری ٹرائل لے کر دیکھ لیں؛ سائن اپ کے وقت کریڈٹ کارڈ نہیں مانگا جاتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'hyderabad',
  title: 'حیدرآباد',
  seoTitle: 'حیدرآباد میں دکان اور کاروبار کے لیے POS سافٹ ویئر',
  seoDescription: 'حیدرآباد کی چوڑی، کاسمیٹکس اور کپڑے کی دکانوں، ایگری ڈیلرز اور کریانہ اسٹورز کے لیے Nafaa: رنگ اور سائز کا اسٹاک، کسانوں کا کھاتہ اور بجلی جانے پر بھی بل۔',
  focusKeyword: 'حیدرآباد POS سافٹ ویئر',
  summary:
    'Nafaa حیدرآباد کی چوڑی اور کاسمیٹکس کی دکانوں، کپڑا بیچنے والوں، ایگری ڈیلرز، بیکریوں اور کریانہ اسٹورز کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ اسی فون یا کمپیوٹر پر چلتا ہے جو آپ کے پاس ہے، HESCO کی لوڈ شیڈنگ میں بھی بل بناتا رہتا ہے، اور گاہکوں اور کسانوں کا ادھار ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'حیدرآباد',
    province: 'Sindh',
    authority: 'SRB',
    wikidataId: 'Q1640079',
    geo: { lat: 25.396, lng: 68.3578 },
    markets: [
      {
        name: 'شاہی بازار',
        area: 'پرانا شہر',
        note: 'پاکستان کے سب سے لمبے بازاروں میں سے ایک، جو پرانے شہر کے بیچ سے گزرتا ہے، اور جس میں کپڑا، زیور، چوڑیاں، جوتے اور گھریلو سامان ملتا ہے۔',
      },
      {
        name: 'ریشم گلی',
        area: 'پرانا شہر',
        note: 'بڑے بازار سے نکلتی ایک گلی، جس میں فیبرک، کڑھائی والا کپڑا، لیس اور زنانہ کپڑوں کی دکانیں ہیں۔',
      },
      {
        name: 'چوڑی بازار',
        area: 'پرانا شہر',
        note: 'وہ دکانیں اور کارخانے جہاں حیدرآباد کی مشہور کانچ کی چوڑیاں سیٹ اور درجن کے حساب سے، پرچون میں بھی اور تاجروں کو بھی بکتی ہیں۔',
      },
      {
        name: 'غلہ اور سبزی منڈی',
        note: 'ہول سیل منڈیاں، جہاں آس پاس کے ضلعوں کی پیداوار دکانوں اور تاجروں کو بیچی جاتی ہے۔',
      },
    ],
    areas: [
      {
        name: 'لطیف آباد',
        note: 'ایک بڑا رہائشی علاقہ، جس کی بڑی سڑکوں پر گروسری، کپڑے، موبائل فون اور کھانے کی مارکیٹیں ہیں۔',
      },
      {
        name: 'قاسم آباد',
        note: 'بڑی سڑکوں کے ساتھ نئی آبادیوں کے لیے ریسٹورنٹس، بیکریاں، فارمیسیاں اور سپر مارکیٹیں۔',
      },
      {
        name: 'صدر اور ہیرآباد',
        note: 'پرانے کمرشل علاقے، جن میں کپڑوں کے آؤٹ لیٹ، کتابوں کی دکانیں، کلینک اور جنرل اسٹور ہیں۔',
      },
      {
        name: 'آٹو بھان روڈ',
        note: 'ایک کمرشل سڑک، جس پر ریسٹورنٹس، کیفے، شو روم اور سروس والے کاروبار ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، پرانے بیلنس ڈالنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ حیدرآباد میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر آپ کے ساتھ کام کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'حیدرآباد میں POS سافٹ ویئر',
      heading: 'حیدرآباد',
      sub: 'پرانے شہر کے چوڑی والے کاؤنٹر سے لے کر زیریں سندھ کے کھیتوں کو مال دینے والے ایگری ڈیلرز تک: حیدرآباد کے کاروبار کے لیے بل، رنگ برنگا اسٹاک، فصل والا ادھار اور آن لائن آرڈر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['رنگ اور سائز کا اسٹاک', 'کسانوں کا کھاتہ', 'لوڈ شیڈنگ میں بھی بل'],
      media: { kind: 'screenshot', mediaId: SHOT.lowStock, frame: 'browser', url: 'app.nafaa.pk/inventory/low-stock' },
      layout: 'centered',
      id: 'b32425199867',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا کوئی بھی فون، ٹیبلٹ یا کمپیوٹر؛ آف لائن بلنگ ساتھ' },
        { label: 'کن کے لیے بہتر', value: 'چوڑی اور کاسمیٹکس کی دکانیں، کپڑا بیچنے والے، ایگری ڈیلرز، بیکریاں، کریانہ، فارمیسیاں' },
        { label: 'ادھار', value: 'ہر گاہک یا کسان کا کھاتہ، حد اور واٹس ایپ یاد دہانی کے ساتھ' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Hyderabad ki churi aur cosmetics shops, kapre ki dukaanon aur agri dealers ke liye Nafaa: rang aur size ka stock, kisaan ka udhaar aur bill ek app me. Bijli jaye to bhi counter chalta hai.',
      id: 'b295f8b18bd6',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'حیدرآباد میں سیلز ٹیکس', id: 'bbe0691c7dae' },
    {
      type: 'richText',
      markdown:
        '## حیدرآباد میں کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nحیدرآباد سندھ کا دوسرا سب سے بڑا شہر ہے اور زیریں سندھ کے بڑے حصے کی منڈی بھی۔ شاہی بازار کے آس پاس کا پرانا شہر کپڑے، چوڑی، زیور اور گھریلو سامان کی دکانوں سے بھرا رہتا ہے، اور یہ شہر بہت عرصے سے کانچ کی چوڑیاں بنانے کے لیے جانا جاتا ہے۔ اس کے چاروں طرف کپاس، گنا، گندم، کیلا اور آم اگانے والے کھیت ہیں، اس لیے بیج، کھاد اور اسپرے کے ڈیلر کسانوں کے ساتھ بڑا کاروبار کرتے ہیں جو فصل کے بعد پیسے دیتے ہیں۔\n\n- **چوڑی، کاسمیٹکس اور زیور کی دکانیں** ایک ہی چیز کے بہت سے شیڈ اور سائز رکھتی ہیں، سیٹ اور گفٹ پیک بیچتی ہیں، اور اسکن کیئر اور میک اپ کا بیچ اور ایکسپائری دیکھتی ہیں۔\n- **کپڑے اور گارمنٹس کی دکانیں** ریشم گلی اور پرانے شہر میں سائز اور رنگ کے حساب سے اسٹاک رکھتی ہیں اور محفوظ ناپ کے ساتھ سلائی کے آرڈر لیتی ہیں۔\n- **ایگری ڈیلرز** فصل آنے تک کسانوں کا حساب ادھار پر چلاتے ہیں، بلک آرڈر لیتے ہیں، اور بوائی کے موسم کے حساب سے مال کا پلان بناتے ہیں۔\n- **بیکریاں اور مٹھائی کی دکانیں** خام مال اور ریسیپی کی کاسٹ درج کرتی ہیں اور ایڈوانس لے کر خاص آرڈر لیتی ہیں۔\n- **کریانہ اور فارمیسیاں** لطیف آباد، قاسم آباد اور ہیرآباد میں بارکوڈ سے بیچتی ہیں، گھرانوں کو کھاتے پر رکھتی ہیں، اور دواؤں کی ایکسپائری پر نظر رکھتی ہیں۔',
      id: 'b1e364a03212',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'bae9ea46088b' },
    {
      type: 'richText',
      markdown:
        '## حیدرآباد میں کام کے حالات\n\n**بجلی۔** حیدرآباد کو بجلی HESCO دیتی ہے، اور کئی محلوں میں لوڈ شیڈنگ لمبی ہوتی ہے، خاص کر گرمیوں میں۔ Nafaa ڈیوائس پر کاؤنٹر چلائے رکھتا ہے اور انٹرنیٹ آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے، اس لیے بجلی جانے سے شام بھر کا حساب ضائع نہیں ہوتا۔\n\n**فصل والا ادھار۔** کسان اور شہر کے بہت سے گاہک کپاس، گنے اور گندم کی فصل آنے کے بعد ادائیگی کرتے ہیں۔ ہر گاہک کے کھاتے کی ایک حد ہوتی ہے اور یہ بھی دکھتا ہے کہ بیلنس کب سے رکا ہوا ہے، اور ایک ٹیپ سے آپ کے اپنے نمبر سے واٹس ایپ یاد دہانی چلی جاتی ہے۔\n\n**ایک پروڈکٹ، بہت سے شیڈ۔** چوڑیاں، کاسمیٹکس اور فیبرک درجنوں رنگوں اور سائز میں آتے ہیں۔ ہر شیڈ کو ایک پروڈکٹ کا ویرینٹ بنا کر، اس کے اپنے بارکوڈ اور اسٹاک کے ساتھ رکھیں، تو شادیوں کے سیزن سے پہلے صاف نظر آ جاتا ہے کہ کون سے رنگ ختم ہو رہے ہیں۔\n\n**زبان۔** حیدرآباد کے بازاروں میں سندھی اور اردو دونوں خوب بولی جاتی ہیں۔ Nafaa کی اسکرینیں اردو یا انگریزی میں دکھتی ہیں، اور سپورٹ کی بات چیت بھی اردو یا انگریزی میں ہوتی ہے۔',
      id: 'b97ee001af65',
    },
    {
      type: 'screenshot',
      heading: 'جانیں کون سے شیڈ ختم ہو رہے ہیں',
      body: 'کم اسٹاک کی لسٹ ہر وہ ویرینٹ دکھاتی ہے جو اپنے ری آرڈر لیول سے نیچے آ گیا ہو، اس لیے چوڑی یا کاسمیٹکس کی دکان کو مصروف ہفتے سے پہلے پتا ہوتا ہے کہ کون سے رنگ اور سائز منگوانے ہیں۔',
      mediaId: SHOT.lowStock,
      frame: 'browser',
      url: 'app.nafaa.pk/inventory/low-stock',
      layout: 'split-left',
      id: 'b1b1f617bbcf',
    },
    {
      type: 'comparisonTable',
      heading: 'حیدرآباد کے کاروبار اور Nafaa میں کہاں سے شروع کریں',
      caption: 'حیدرآباد کے عام کاروبار سب سے پہلے کیا سیٹ کرتے ہیں۔ کاؤنٹر، اسٹاک اور کھاتہ ہر پلان میں ہیں۔',
      columns: [
        { key: 'start', label: 'یہاں سے شروع کریں' },
        { key: 'watch', label: 'اس پر نظر رکھیں' },
      ],
      rows: [
        { label: 'چوڑی کی دکان', cells: { start: { value: 'سیٹ اور درجن بطور یونٹ، رنگ بطور ویرینٹ' }, watch: { value: 'شادیوں سے پہلے کم اسٹاک والے رنگ' } } },
        { label: 'کاسمیٹکس کی دکان', cells: { start: { value: 'برانڈ، شیڈ، بیچ' }, watch: { value: 'اسکن کیئر اور میک اپ کی ایکسپائری' } } },
        { label: 'کپڑے کی دکان', cells: { start: { value: 'سائز اور رنگ کے حساب سے ڈیزائن، سلائی کے آرڈر' }, watch: { value: 'جن آرڈرز کی ڈلیوری کا دن آ گیا' } } },
        { label: 'ایگری ڈیلر', cells: { start: { value: 'کسانوں کے کھاتے، سیزن کا مال' }, watch: { value: 'پچھلی فصل سے رکے ہوئے بیلنس' } } },
        { label: 'فارمیسی', cells: { start: { value: 'سالٹ سے تلاش، بیچ' }, watch: { value: 'جلد ایکسپائر ہونے والی دوائیں' } } },
      ],
      id: 'bf874ee7b526',
    },
    {
      type: 'steps',
      heading: 'حیدرآباد کی دکان کا سیٹ اپ',
      items: [
        { title: 'فری ٹرائل شروع کریں', body: 'کاؤنٹر والے فون یا کمپیوٹر پر سائن اپ کریں اور اپنا کاروبار چنیں۔' },
        { title: 'پروڈکٹس ویرینٹ کے ساتھ ڈالیں', body: 'ہر ڈیزائن یا چیز ایک بار ڈالیں، پھر اس کے رنگ اور سائز، ہر ایک اپنے بارکوڈ کے ساتھ۔' },
        { title: 'کھاتہ لے آئیں', body: 'مستقل گاہک اور کسان ان کے موجودہ بیلنس اور ادھار حد کے ساتھ ڈالیں۔' },
        { title: 'بل بنائیں اور کم اسٹاک کی لسٹ دیکھیں', body: 'پہلے چند دن کے بعد سب سے تیز بکنے والے رنگوں اور سائز کے ری آرڈر لیول لگا دیں۔' },
      ],
      id: 'b995df6c61eb',
    },
    {
      type: 'richText',
      markdown:
        '## حیدرآباد کے کاروباری لوگوں کے سوال\n\n### کیا درجنوں رنگوں کی چوڑیوں کے لیے درجنوں پروڈکٹس بنانی پڑیں گی؟\nنہیں۔ ایک پروڈکٹ بنائیں اور اس کے رنگ اور سائز ویرینٹ کے طور پر ڈال دیں۔ ہر ایک کا اپنا اسٹاک اور بارکوڈ ہوتا ہے۔\n\n### حیدرآباد میں سروسز پر سیلز ٹیکس کون سا ادارہ دیکھتا ہے؟\nسندھ میں سروسز سندھ ریونیو بورڈ کے تحت آتی ہیں۔ Nafaa میں ٹیکس انٹیگریشن اختیاری ہے؛ اپنے ٹیکس ایڈوائزر سے پوچھ لیں کہ آپ کے کاروبار کو اس کی ضرورت ہے یا نہیں۔\n\n### کیا کسان فصل کے بعد پیسے دے سکتے ہیں؟\nجی ہاں۔ انہیں ادھار حد کے ساتھ کھاتے پر رکھیں، اور ان کا بیلنس ادا ہونے تک دکھاتا رہتا ہے کہ کتنا پرانا ہے۔',
      id: 'b20fa493d625',
    },
    { type: 'cityFacts', show: ['support'], heading: 'حیدرآباد میں سپورٹ', id: 'b60df5e70c15' },
    { type: 'pricingTable', heading: 'حیدرآباد کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'ba938ee52395' },
    { type: 'faq', heading: 'مزید سوال', id: 'b8d96dde1f52' },
    {
      type: 'cta',
      heading: 'حیدرآباد میں آج ہی بل بنانا شروع کریں',
      body: 'جو ڈیوائس آپ کے پاس ہے اسی پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'ba98b77126a7',
    },
  ],
  featured: false,
  sortOrder: 11,
  origin: 'translation of content/cities/hyderabad.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/cosmetics',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/agri',
    'apps/web/src/industries/bakery',
    'apps/web/src/industries/pharmacy',
    'apps/web/src/modules/inventory/low-stock',
  ],
  sources: [
    { title: 'Hyderabad, Pakistan (Wikidata Q1640079)', url: 'https://www.wikidata.org/wiki/Q1640079', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Hyderabad, Pakistan (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Hyderabad,_Pakistan', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Hyderabad Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Hyderabad_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; HESCO). No SRB rate is stated.' },
  dropped: [],
  needsOwner: [],
  faqKeys: ['ur-hyderabad-offline', 'ur-hyderabad-variants', 'ur-hyderabad-expiry', 'ur-hyderabad-khata-reminders', 'ur-hyderabad-fbr-who', 'ur-hyderabad-pricing'],
  relations: [
    { ref: 'INDUSTRY:cosmetics@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:jewelry@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:agri@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:bakery@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy@ur', kind: 'TAG' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
};
