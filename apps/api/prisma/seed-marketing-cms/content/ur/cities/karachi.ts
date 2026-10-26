/** Urdu: Karachi city page (/ur/pos-software/karachi). Translation of content/cities/karachi.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-karachi-offline',
    locale: 'ur',
    topic: 'getting-started',
    question: 'کراچی میں K-Electric کی بجلی جائے اور راؤٹر بند ہو جائے تو کیا Nafaa پر بل بنتے رہیں گے؟',
    answer:
      'جی ہاں۔ انٹرنیٹ نہ ہو تب بھی کاؤنٹر بل کاٹتا رہتا ہے۔ ہر آف لائن سیل اسی فون یا کمپیوٹر میں محفوظ ہو جاتی ہے اور کنکشن لوٹتے ہی خود بخود آپ کے اکاؤنٹ میں پہنچ جاتی ہے۔ جو سیل ابھی جانی باقی ہیں ان کی لسٹ سامنے رہتی ہے۔ رپورٹ اور باقی برانچیں ان سیلز کو سنک ہونے کے بعد دکھاتی ہیں۔',
    sourceNote: 'PosScreen offline handling, offlineSales and PendingSalesDrawer.',
    origin: 'translation of faq offline',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx', 'apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/ui/PendingSalesDrawer.tsx'],
  },
  {
    key: 'ur-karachi-wholesale-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'جوڑیا بازار کا ہول سیلر Nafaa میں ریٹیل اور ہول سیل ریٹ الگ الگ رکھ سکتا ہے؟',
    answer:
      'جی ہاں۔ ہر پروڈکٹ پر ایک ریٹیل قیمت اور ایک ہول سیل قیمت رکھی جا سکتی ہے، اور ہر یونٹ یعنی پیس، درجن یا کارٹن کا ریٹ بھی الگ ہوتا ہے۔ کاؤنٹر سیل کی قسم دیکھ کر صحیح ریٹ لگاتا ہے، اور کھاتے میں ہر تاجر گاہک کا بیلنس اور اس کی ادھار حد محفوظ رہتی ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: ['apps/web/src/modules/pos/lib/posUnits.ts', 'apps/web/src/modules/pos/engine/usePosEngine.ts', 'apps/web/src/core/lib/offline/offlineKhata.ts'],
  },
  {
    key: 'ur-karachi-khata-limit',
    locale: 'ur',
    topic: 'khata',
    question: 'کراچی کے ڈیلر اپنے تاجر گاہکوں کی ادھار حد کیسے لگائیں؟',
    answer:
      'کھاتے کے ہر گاہک کی ایک ادھار حد مقرر ہو سکتی ہے۔ اگر نئی ادھار سیل اس حد سے آگے لے جائے تو کاؤنٹر بل روک دیتا ہے، جب تک مینیجر اپنے PIN سے منظوری نہ دے۔ کھاتہ واجب رقم کو پرانے پن کے حساب سے بھی الگ کرتا ہے، تاکہ پتہ چلے کون سا بیلنس نیا ہے اور کون سا مہینوں سے پڑا ہے۔',
    sourceNote: 'creditLimit on customers (offlineKhata.ts, customers directory); ageing buckets on the khata screen.',
    origin: 'translation of faq mp-khata-limit',
    evidence: ['apps/web/src/core/lib/offline/offlineKhata.ts', 'apps/web/src/modules/customers/directory/KhataBookPage.tsx'],
  },
  {
    key: 'ur-karachi-imei',
    locale: 'ur',
    topic: 'mobile-shop',
    question: 'صدر کی موبائل مارکیٹ کی دکان کے لیے Nafaa میں IMEI کا حساب کیسے چلتا ہے؟',
    answer:
      'ہر فون اپنے IMEI سے پہچانا جاتا ہے۔ مال خریدتے وقت آپ IMEI درج کرتے ہیں، اور بیچتے وقت وہی IMEI بل پر چھپتا ہے۔ یوں ہر وقت معلوم رہتا ہے کہ کون سا سیٹ اسٹاک میں ہے، کون سا بک گیا اور کون سا مرمت کے لیے آیا ہوا ہے۔ ہر IMEI کے ساتھ اس کا PTA اسٹیٹس بھی لکھا جا سکتا ہے۔',
    sourceNote: 'Mobile pack: IMEI stock, PTA compliance per IMEI, repair tickets.',
    origin: 'translation of faq mobile-imei',
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx'],
  },
  {
    key: 'ur-karachi-payments',
    locale: 'ur',
    topic: 'product',
    question: 'کراچی کا گاہک ایک بل کا کچھ حصہ کیش اور کچھ کارڈ یا JazzCash سے دے سکتا ہے؟',
    answer:
      'جی ہاں۔ ادائیگی کے وقت ایک ہی بل کو کیش، کارڈ، JazzCash، Easypaisa، بینک ٹرانسفر اور گاہک کے کھاتے میں بانٹا جا سکتا ہے۔ ہر حصہ اپنے طریقے کے ساتھ درج ہوتا ہے، اس لیے روزنامچے میں کیش دراز، والٹ کی رقم اور کھاتے کا بیلنس تینوں ٹھیک رہتے ہیں۔',
    sourceNote: 'PosSplitTender and PosCheckoutModal; accounting PayMethod list (CASH, CARD, BANK_TRANSFER, JAZZCASH, EASYPAISA).',
    origin: 'translation of faq mp-pos-payments',
    evidence: ['apps/web/src/modules/pos/components/PosSplitTender.tsx', 'apps/web/src/modules/pos/components/PosCheckoutModal.tsx', 'apps/web/src/integrations/accounting/accounting.api.ts'],
  },
  {
    key: 'ur-karachi-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'کراچی کی دکان یا ہول سیل کاروبار کے لیے Nafaa کتنے کا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہیں۔ قیمتوں کے صفحے پر ہر پلان کی قیمت اور حدیں لکھی ہیں، جو براہ راست ہماری پلان سیٹنگز سے آتی ہیں، اس لیے وہاں ہمیشہ آج کی قیمت ملتی ہے۔ شروع میں فری ٹرائل لے لیں؛ سائن اپ کے لیے کریڈٹ کارڈ کی ضرورت نہیں۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'karachi',
  title: 'کراچی',
  seoTitle: 'کراچی میں دکان، ہول سیل اور ریسٹورنٹ کے لیے POS سافٹ ویئر',
  seoDescription: 'کراچی کے ہول سیلرز، موبائل دکانوں اور ریسٹورنٹس کے لیے Nafaa: لوڈ شیڈنگ میں بھی بل، کارٹن اور ہول سیل ریٹ، IMEI اسٹاک اور ادھار کا کھاتہ۔',
  focusKeyword: 'کراچی POS سافٹ ویئر',
  summary:
    'Nafaa کراچی کی دکانوں، ہول سیلرز اور ریسٹورنٹس کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ آپ کے کاؤنٹر والے فون یا کمپیوٹر پر بل بناتا ہے، K-Electric کی لوڈ شیڈنگ اور کمزور سگنل میں بھی چلتا رہتا ہے، اور تاجروں کا ادھار اور گاہکوں کا کھاتہ ایک ڈیجیٹل کھاتے میں رکھتا ہے۔',
  data: {
    name: 'کراچی',
    province: 'Sindh',
    authority: 'SRB',
    wikidataId: 'Q8660',
    geo: { lat: 24.8607, lng: 67.0011 },
    markets: [
      {
        name: 'جوڑیا بازار',
        area: 'پرانا شہر',
        note: 'مصالحے، ڈرائی فروٹ، دالیں، چاول، چینی اور دوسری اجناس کی ملک کی بڑی ہول سیل منڈیوں میں سے ایک، جہاں مال بوری اور ٹرک کے حساب سے چلتا ہے اور زیادہ تر تاجر خریداروں کا کھاتہ چلتا ہے۔',
      },
      {
        name: 'صدر کی الیکٹرانکس اور موبائل مارکیٹیں',
        area: 'صدر',
        note: 'عبداللہ ہارون روڈ اور ریگل چوک کے آس پاس کے پلازے، جو موبائل فون، ایکسیسریز، کمپیوٹر اور الیکٹرانکس ڈیلرز سے بھرے ہیں اور پرچون کے ساتھ چھوٹی دکانوں کو بھی مال دیتے ہیں۔',
      },
      {
        name: 'بوہری بازار اور زینب مارکیٹ',
        area: 'صدر',
        note: 'کپڑے، ریڈی میڈ، چادروں اور گھریلو سامان کی دکانوں والی تنگ گلیاں، جن میں عید اور شادیوں کے سیزن سے پہلے سب سے زیادہ رش ہوتا ہے۔',
      },
      {
        name: 'طارق روڈ',
        area: 'PECHS',
        note: 'کپڑوں، جوتوں، زیورات اور کاسمیٹکس کی دکانوں کی لمبی سڑک، جن میں بہت سے برانڈڈ اسٹور کارڈ اور والٹ سے ادائیگی لیتے ہیں۔',
      },
      {
        name: 'حیدری مارکیٹ',
        area: 'نارتھ ناظم آباد',
        note: 'کپڑوں، جوتوں، چوڑیوں اور کھانے پینے کی جگہوں والا محلے کا بازار، جہاں پورے ڈسٹرکٹ سینٹرل سے گھرانے آتے ہیں۔',
      },
      {
        name: 'اردو بازار اور پیپر مارکیٹ',
        note: 'کتابوں، اسٹیشنری اور چھپائی کا کاروبار، جہاں پبلشر اور ہول سیلر اسکولوں اور چھوٹی کتابوں کی دکانوں کو مال دیتے ہیں۔',
      },
      {
        name: 'برنس روڈ',
        area: 'صدر',
        note: 'پرانی فوڈ اسٹریٹ جو نہاری، حلیم، ربڑی اور کراچی کے دوسرے کھانوں کے لیے مشہور ہے، جہاں رات گئے تک رش اور تیز ٹیک اوے چلتا ہے۔',
      },
    ],
    areas: [
      {
        name: 'کلفٹن اور DHA',
        note: 'بڑی سڑکوں اور کمرشل گلیوں پر کیفے، ریسٹورنٹس، سپر مارکیٹس، سیلون اور بوتیک، جہاں ڈیلیوری اور کارڈ سے ادائیگی بہت ہوتی ہے۔',
      },
      {
        name: 'گلشن اقبال اور گلستان جوہر',
        note: 'گنجان رہائشی بلاک، جہاں تقریباً ہر بڑی سڑک پر بیکری، کریانہ اسٹور، فارمیسی اور موبائل شاپ ملتی ہے۔',
      },
      {
        name: 'نارتھ ناظم آباد اور فیڈرل بی ایریا',
        note: 'پرانی جمی ہوئی مارکیٹیں اور خاندانی کاروبار، جن میں سے کئی برسوں سے انہی گاہکوں کو کھاتے پر مال دے رہے ہیں۔',
      },
      {
        name: 'کورنگی اور سائٹ',
        note: 'شہر کے بڑے صنعتی علاقے، جہاں فیکٹری آؤٹ لیٹ، ڈسٹری بیوٹر اور سپلائر تاجر گاہکوں کو تھوک میں بیچتے ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا منتقل کرنا اور ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، اردو یا انگریزی میں۔ کراچی میں Nafaa کا دفتر نہیں؛ ٹیم آپ کے اپنے کاؤنٹر پر آپ کے ساتھ کام کرتی ہے۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'کراچی میں POS سافٹ ویئر',
      heading: 'کراچی',
      sub: 'جوڑیا بازار کے اجناس ڈیلرز سے لے کر صدر کے موبائل کاؤنٹرز اور کلفٹن کے کیفے تک: بل، کارٹن، IMEI اسٹاک اور ادھار کے لیے ایک ایپ، جو بجلی یا سگنل جانے پر بھی بل بناتی رہتی ہے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['لوڈ شیڈنگ میں بھی بل', 'کارٹن اور ہول سیل ریٹ', 'JazzCash اور Easypaisa QR'],
      media: { kind: 'screenshot', mediaId: SHOT.pos, frame: 'browser', url: 'app.nafaa.pk/pos' },
      layout: 'centered',
      id: 'b815c181cdac',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا کوئی بھی فون، ٹیبلٹ یا کمپیوٹر؛ کاؤنٹر آف لائن بھی بل بناتا ہے' },
        { label: 'کن کے لیے بہتر', value: 'ہول سیل ڈیلر، کریانہ اسٹور، موبائل اور الیکٹرانکس کی دکانیں، کپڑوں کی دکانیں، ریسٹورنٹس' },
        { label: 'ادائیگی', value: 'کیش، کارڈ، JazzCash، Easypaisa، بینک ٹرانسفر اور کھاتہ، ایک ہی بل میں ملا کر بھی' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Karachi ke wholesale dealers, dukaanon aur restaurants ke liye Nafaa: bill, carton stock aur khata ek app me. K-Electric ki bijli jaye ya signal kamzor ho, counter chalta rehta hai.',
      id: 'be31bd2c35ad',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'کراچی میں سیلز ٹیکس', id: 'b532890ef9d7' },
    {
      type: 'richText',
      markdown:
        '## کراچی کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nکراچی پاکستان کا سب سے بڑا شہر اور اس کی بڑی بندرگاہ ہے، اس لیے ملک میں باہر سے آنے والے مال کا بڑا حصہ، مصالحوں اور ڈرائی فروٹ سے لے کر موبائل فون اور بجلی کے سامان تک، پہلے یہاں کی ہول سیل منڈیوں سے گزرتا ہے، پھر اوپر کے شہروں کی دکانوں تک پہنچتا ہے۔ اسی وجہ سے یہاں بہت سے کاروبار ایک خاص انداز میں بیچتے ہیں: تھوک میں، ادھار پر، اور ان تاجروں کو جو ہر ہفتے لوٹ کر آتے ہیں۔\n\n- **اجناس اور کریانے کے ہول سیلر** جوڑیا بازار والے علاقے میں بوری، کارٹن اور کلو کے حساب سے بیچتے ہیں۔ Nafaa ہر پروڈکٹ پر ایک ریٹیل اور ایک ہول سیل قیمت رکھتا ہے، ہر یونٹ کی الگ قیمت، اور ہر تاجر خریدار کے لیے ادھار حد والا کھاتہ۔\n- **موبائل اور الیکٹرانکس کاؤنٹر** صدر میں ہر سیٹ اس کے IMEI سے درج کرتے ہیں، اس کا PTA اسٹیٹس لکھتے ہیں، پرانے فون بدلے میں لیتے ہیں اور قسط پر بیچتے ہیں، موبائل شاپ والی اسکرینوں سے۔\n- **کپڑے اور فیبرک کی دکانیں** طارق روڈ، بوہری بازار اور حیدری مارکیٹ میں سائز اور رنگ کے حساب سے اسٹاک رکھتی ہیں، سلائی کے آرڈر لیتی ہیں، اور قسطوں میں پیسے دینے والے گاہکوں کا سامان سنبھال کر رکھتی ہیں۔\n- **ریسٹورنٹس اور فوڈ اسٹریٹس** جیسے برنس روڈ اور کلفٹن کی پٹیاں، ایک ہی اسکرین سے ٹیبل، کچن ٹکٹ اور رائیڈر چلاتے ہیں، جہاں Foodpanda اور ویب سائٹ کے آرڈر ڈائن اِن کے ساتھ ساتھ نظر آتے ہیں۔\n- **محلے کے اسٹور اور فارمیسیاں** گلشن، نارتھ ناظم آباد اور DHA کے فیزوں میں بارکوڈ سے بیچتی ہیں، مستقل گاہکوں کو کھاتے پر رکھتی ہیں اور بیلنس واٹس ایپ پر بھیجتی ہیں۔',
      id: 'b50664672fcd',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'b7443ccc48cd' },
    {
      type: 'richText',
      markdown:
        '## کراچی میں کام کے حالات\n\n**بجلی۔** کراچی کو بجلی K-Electric دیتی ہے، اور لوڈ شیڈنگ اب بھی فیڈر کے حساب سے ہوتی ہے، کچھ محلوں میں دوسروں سے زیادہ لمبی۔ Nafaa براؤزر میں چلتا ہے اور بجلی کے ساتھ راؤٹر بند ہو جائے تب بھی کاؤنٹر پر بل بنتے رہتے ہیں۔ سیل ڈیوائس پر رکی رہتی ہے اور کنکشن آتے ہی خود آپ کے اکاؤنٹ میں چلی جاتی ہے، اس لیے شام کی رپورٹ کا حساب پورا رہتا ہے۔\n\n**پرانی مارکیٹوں میں سگنل۔** صدر کے اونچے پلازوں اور پرانے شہر کی بھیڑ والی گلیوں میں موبائل ڈیٹا ٹوٹتا رہتا ہے۔ چونکہ بل بنانا انٹرنیٹ کا انتظار نہیں کرتا، ڈیلر کمزور 4G پر بھی فون سے بل کاٹتا رہ سکتا ہے اور سنک بعد میں پورا ہو جاتا ہے۔\n\n**کاؤنٹر پر کئی زبانیں۔** کراچی کے بازاروں کی عام زبان اردو ہے، اور تاجر اور گاہک سندھی، پشتو، پنجابی، گجراتی، میمنی اور بلوچی بھی بولتے ہیں۔ Nafaa کی اسکرینیں اردو اور انگریزی میں بدلی جا سکتی ہیں، اس لیے دونوں میں سے کوئی ایک پڑھنے والا کیشیئر بھی کاؤنٹر چلا سکتا ہے، اور سپورٹ سے بات بھی اردو یا انگریزی میں ہوتی ہے۔\n\n**ادائیگی۔** کراچی کے گاہک کیش اور کارڈ سے دیتے ہیں، اور موبائل والٹ سے دینے والے بڑھتے جا رہے ہیں۔ کاؤنٹر JazzCash، Easypaisa یا Raast کا QR دکھاتا ہے، اور ایک بل کیش، والٹ اور گاہک کے کھاتے میں بانٹا جا سکتا ہے۔',
      id: 'b9329fbf6c26',
    },
    {
      type: 'screenshot',
      heading: 'ایک ہی کاؤنٹر پر ہول سیل بھی اور ریٹیل بھی',
      body: 'جوڑیا بازار کا ڈیلر ایک ہی پروڈکٹ لسٹ سے تاجر کو ہول سیل ریٹ پر پورا کارٹن اور راہ چلتے گاہک کو ریٹیل ریٹ پر ایک پیکٹ بیچ سکتا ہے۔ کھاتہ لکھتا ہے کہ ہر تاجر پر کتنا باقی ہے، اور جو بل ادھار حد سے آگے جائے اسے مینیجر کی منظوری تک روک دیتا ہے۔',
      mediaId: SHOT.khata,
      frame: 'browser',
      url: 'app.nafaa.pk/customers/khata',
      layout: 'split-left',
      id: 'b280cb884c3c',
    },
    {
      type: 'comparisonTable',
      heading: 'کراچی کے کاروبار اور ان کے لیے Nafaa کا سیٹ اپ',
      caption: 'کراچی کے عام کاروباروں کے لیے پہلے کیا چلائیں۔ ہر پلان میں کاؤنٹر، اسٹاک اور کھاتہ شامل ہے۔',
      columns: [
        { key: 'where', label: 'عام جگہ' },
        { key: 'first', label: 'پہلے یہ سیٹ کریں' },
        { key: 'then', label: 'بعد میں شامل کریں' },
      ],
      rows: [
        { label: 'اجناس کا ہول سیلر', cells: { where: { value: 'جوڑیا بازار، بولٹن مارکیٹ' }, first: { value: 'بوری اور کارٹن کے یونٹ، ہول سیل قیمت، تاجروں کا کھاتہ' }, then: { value: 'ادھار حدیں، سپلائر کے بل' } } },
        { label: 'موبائل فون ڈیلر', cells: { where: { value: 'صدر کے پلازے' }, first: { value: 'IMEI اسٹاک، PTA اسٹیٹس، وارنٹی' }, then: { value: 'پرانے فون کی خرید، قسط پلان' } } },
        { label: 'فیبرک اور کپڑوں کی دکان', cells: { where: { value: 'بوہری بازار، طارق روڈ' }, first: { value: 'سائز اور رنگ کی ورائٹی، بارکوڈ' }, then: { value: 'سلائی کے آرڈر، قسطوں پر سامان رکھنا' } } },
        { label: 'ریسٹورنٹ یا ٹیک اوے', cells: { where: { value: 'برنس روڈ، کلفٹن' }, first: { value: 'ٹیبل، کچن ٹکٹ، مینیو' }, then: { value: 'رائیڈر، Foodpanda آرڈر' } } },
        { label: 'محلے کا اسٹور', cells: { where: { value: 'گلشن، نارتھ ناظم آباد' }, first: { value: 'بارکوڈ سے بل، کھاتہ' }, then: { value: 'واٹس ایپ یاد دہانی، کم اسٹاک کی لسٹ' } } },
      ],
      id: 'b52d890896f0',
    },
    {
      type: 'steps',
      heading: 'کراچی کا کاروبار Nafaa پر کیسے لائیں',
      intro: 'زیادہ کام پروڈکٹ لسٹ اور پرانے بیلنس ڈالنے کا ہے؛ باقی ایک دوپہر میں ہو جاتا ہے۔',
      items: [
        { title: 'کاؤنٹر پر فری ٹرائل کھولیں', body: 'جس فون یا کمپیوٹر سے بل بناتے ہیں اسی پر سائن اپ کریں۔ اپنا کاروبار چنیں تاکہ صحیح اسکرینیں کھلیں۔' },
        { title: 'اسٹاک اور تاجروں کے بیلنس ڈالیں', body: 'اپنی پروڈکٹ لسٹ Excel فائل میں، یا رجسٹر کی تصویریں، واٹس ایپ پر بھیج دیں۔ ہر تاجر خریدار کا پرانا بیلنس کھاتے میں چلا جاتا ہے۔' },
        { title: 'یونٹ اور دو ریٹ لسٹیں بنائیں', body: 'ہر پروڈکٹ کا کارٹن، بوری یا درجن اس کی اپنی قیمت کے ساتھ ڈالیں، اور جہاں دکانوں کو بیچتے ہیں وہاں ہول سیل ریٹ بھی۔' },
        { title: 'ایک دن چلائیں، پھر ٹیم شامل کریں', body: 'ایک دن خود بل بنائیں، دن بند کرنے کی رپورٹ دیکھیں، پھر کیشیئرز کو ان کا اپنا لاگ اِن دیں جس میں صرف ضرورت کے اختیار ہوں۔' },
      ],
      id: 'b127401531d2',
    },
    {
      type: 'richText',
      markdown:
        '## کراچی کے کاروباری لوگوں کے سوال\n\n### کیا K-Electric کی لوڈ شیڈنگ کے لیے کچھ خاص چاہیے؟\nکوئی الگ سافٹ ویئر نہیں۔ بل بنانے والی ڈیوائس چارج رکھیں یا UPS پر لگا دیں، جیسے بلب کے لیے کرتے ہیں۔ راؤٹر بند ہو تو بھی کاؤنٹر بل بناتا رہتا ہے اور واپسی پر سنک کر لیتا ہے۔ لیپ ٹاپ یا موبائل ڈیٹا والا فون کافی ہے۔\n\n### کیا دوسرے شہروں کے تاجر کھاتے پر مال لے سکتے ہیں؟\nجی ہاں۔ اوپر کے ہر خریدار کو ادھار حد کے ساتھ کھاتے کا گاہک بنا لیں۔ اس کا بیلنس، ہر بل اور ہر ادائیگی ایک ہی لیجر میں رہتی ہے، اور ایک ٹیپ سے اگلی آمد سے پہلے اسے واٹس ایپ پر بیلنس کی یاد دہانی چلی جاتی ہے۔\n\n### کیا کراچی کے ریسٹورنٹس کو SRB انٹیگریشن چاہیے؟\nسندھ کے ریسٹورنٹس سروسز پر سیلز ٹیکس کے لیے سندھ ریونیو بورڈ سے واسطہ رکھتے ہیں۔ Nafaa میں ٹیکس انٹیگریشن اختیاری ہے؛ آپ کے ریسٹورنٹ کو اس کی ضرورت ہے یا نہیں، یہ آپ کی رجسٹریشن پر ہے، اس لیے پہلے اپنے ٹیکس ایڈوائزر سے پوچھ لیں۔',
      id: 'b9a43af5ccde',
    },
    { type: 'cityFacts', show: ['support'], heading: 'کراچی میں سپورٹ', id: 'be9e3038a91f' },
    { type: 'pricingTable', heading: 'کراچی کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b8c4d28c03cc' },
    { type: 'faq', heading: 'مزید سوال', id: 'baacbd63cd9b' },
    {
      type: 'cta',
      heading: 'کراچی میں آج ہی بل بنانا شروع کریں',
      body: 'اپنے کاؤنٹر والے فون یا کمپیوٹر پر مفت آزمائیں۔ سیٹ اپ میں مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'bc0a52d61b96',
    },
  ],
  featured: true,
  sortOrder: 1,
  origin: 'translation of content/cities/karachi.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/mobile',
    'apps/web/src/industries/garments',
    'apps/web/src/industries/restaurant',
    'apps/web/src/modules/pos/components/PosUnitPickerModal.tsx',
    'apps/web/src/modules/customers/khata/api/customer-ledger.api.ts',
    'apps/web/src/app/shell/navigation/nav-config.ts',
  ],
  sources: [
    { title: 'Karachi (Wikidata Q8660)', url: 'https://www.wikidata.org/wiki/Q8660', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Karachi (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Karachi', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Jodia Bazaar (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Jodia_Bazaar', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'K-Electric (Wikipedia)', url: 'https://en.wikipedia.org/wiki/K-Electric', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Burnes Road (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Burnes_Road', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; K-Electric). No SRB rate is stated.' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-karachi-offline', 'ur-karachi-wholesale-prices', 'ur-karachi-khata-limit', 'ur-karachi-imei', 'ur-karachi-payments', 'ur-karachi-pricing'],
  relations: [
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:mobile-shop@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:electronics@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:garments@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:offline-pos@ur', kind: 'RELATED' },
  ],
};
