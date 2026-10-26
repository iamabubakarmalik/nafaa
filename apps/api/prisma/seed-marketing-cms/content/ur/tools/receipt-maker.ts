/** Urdu: Receipt maker (/ur/tools/receipt-maker). Translation of content/tools/money.ts (receipt-maker). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic. Nafaa claims: receipts on 58 mm, 80 mm and A4 (core/receipt/setup.ts paper "58" | "80" | "A4"), offline billing (core/lib/offline/offlineSales.ts).';
const faqEvidence = [
  'apps/web/src/core/receipt/setup.ts',
  'apps/web/src/core/receipt/print.ts',
  'apps/web/src/core/lib/offline/offlineSales.ts',
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-receipt-maker-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا یہ تھرمل رسید پرنٹر پر پرنٹ ہو سکتی ہے؟',
    answer:
      'جی ہاں۔ اپنے رول کے حساب سے کاغذ کی چوڑائی چنیں، 58 mm یا 80 mm، Print receipt دبائیں اور پرنٹ والی ونڈو میں تھرمل پرنٹر چنیں۔ مارجن none اور اسکیل 100% رکھیں تاکہ لکھائی چھوٹی نہ ہو۔ جن USB اور Bluetooth تھرمل پرنٹرز کا ڈرائیور ٹھیک چل رہا ہو، ان میں سے اکثر براؤزر سے اسی طرح پرنٹ کر دیتے ہیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-receipt-maker-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-receipt-maker-2',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا یہ رسید ٹیکس کے لیے مانی جاتی ہے؟',
    answer:
      'یہ ایک سادہ سیل کی رسید ہے، گاہک کے لیے خرید کے ثبوت کے طور پر ٹھیک ہے۔ یہ FBR فِسکل انوائس نہیں: جن ریٹیلرز پر FBR کے point of sale قواعد لاگو ہیں، انہیں انٹیگریٹڈ POS سے FBR انوائس نمبر اور QR کوڈ کے ساتھ انوائس دینی ہوتی ہے۔ اگر بل پر صرف سیلز ٹیکس دکھانا ہے تو ٹیکس والے خانے میں شرح لکھ دیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-receipt-maker-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-receipt-maker-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا میری رسیدیں کہیں محفوظ ہوتی ہیں؟',
    answer:
      'نہیں۔ آئٹمز اور ٹوٹل صرف پیج پر رہتے ہیں جب تک آپ پرنٹ نہ کریں یا پیج بند نہ کریں، اور کچھ بھی سرور پر نہیں جاتا۔ صرف دکان کا نام، پتہ، فون اور نیچے والا پیغام اس براؤزر میں یاد رہتے ہیں، تاکہ دوبارہ نہ لکھنے پڑیں۔ ہر سیل کا ریکارڈ رکھنا ہو تو ایسا POS استعمال کریں جو ہر بل محفوظ کرے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-receipt-maker-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'receipt-maker',
  title: 'رسید میکر',
  summary:
    'دکان کی رسید بنائیں اور 58 mm یا 80 mm تھرمل پرنٹر، یا کسی بھی پرنٹر پر پرنٹ کریں۔ دکان کی تفصیل ایک بار لکھیں، پھر آئٹمز، ڈسکاؤنٹ، اختیاری سیلز ٹیکس اور ادائیگی کا طریقہ؛ کیش پر واپسی کی رقم خود نکل آتی ہے۔ فری، سائن اپ کے بغیر، اور کچھ بھی آپ کے براؤزر سے باہر نہیں جاتا۔',
  data: {
    toolKey: 'receipt-maker',
    kind: 'رسید',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'کاغذ', value: '58 mm یا 80 mm تھرمل رول، یا سادہ کاغذ' },
        {
          label: 'رسید پر کیا آتا ہے',
          value: 'دکان کا نام، پتہ، فون، بل نمبر، تاریخ اور وقت، آئٹمز، ڈسکاؤنٹ، ٹیکس، ادائیگی، واپسی',
        },
        { label: 'ادائیگی کے طریقے', value: 'کیش (واپسی کے ساتھ)، کارڈ، JazzCash، Easypaisa، بینک ٹرانسفر' },
        { label: 'کیا محفوظ ہوتا ہے', value: 'دکان کی تفصیل صرف اسی ڈیوائس پر؛ آئٹمز محفوظ نہیں ہوتے' },
      ],
      romanUrdu:
        'Dukaan ki raseed banayein aur 58 ya 80 mm thermal printer par print karein. Items, Discount aur payment likhein, cash par wapsi ki raqam khud nikal aati hai.',
      id: 'b6ba8b3df50d',
    },
    {
      type: 'steps',
      heading: 'رسید میکر کیسے استعمال کریں',
      items: [
        {
          title: 'دکان کی تفصیل ایک بار لکھیں',
          body: 'نام، پتہ، فون اور نیچے والا پیغام۔ یہ اگلی بار کے لیے اسی ڈیوائس پر یاد رہتے ہیں۔',
        },
        {
          title: 'بل نمبر اور کاغذ کی چوڑائی رکھیں',
          body: 'اپنے پرنٹر کے رول کے حساب سے 58 mm یا 80 mm چنیں۔ پیش منظر بھی اسی چوڑائی کا ہو جاتا ہے۔',
        },
        {
          title: 'آئٹمز لکھیں',
          body: 'ہر ایک کا نام، تعداد اور قیمت۔ لکھتے ہی سب ٹوٹل اور آئٹمز کی گنتی بدلتی جاتی ہے۔',
        },
        {
          title: 'ڈسکاؤنٹ، ٹیکس اور ادائیگی لکھیں، پھر پرنٹ کریں',
          body: 'کیش ہو تو ملی ہوئی رقم لکھیں تاکہ واپسی چھپے۔ **رسید پرنٹ کریں** دبائیں، اپنا پرنٹر چنیں اور مارجن none رکھیں۔ **اگلا بل** آئٹمز صاف کر کے اگلے نمبر پر چلا جاتا ہے۔',
        },
      ],
      howTo: true,
      id: 'b7f398594c9f',
    },
    {
      type: 'richText',
      markdown:
        '## ٹوٹل کیسے بنتا ہے\n\n- سب ٹوٹل = (تعداد × قیمت) کا جوڑ\n- ٹوٹل = سب ٹوٹل − ڈسکاؤنٹ + (سب ٹوٹل − ڈسکاؤنٹ) پر سیلز ٹیکس\n- واپسی = ملا ہوا کیش − ٹوٹل\n\nپرنٹ کرتے وقت تاریخ اور وقت پاکستان کے وقت سے لیے جاتے ہیں۔ رسید کا لے آؤٹ ایک مقررہ چوڑائی کا ہے، اس لیے تھرمل پرنٹر پر بھی ویسی ہی دکھتی ہے جیسی اسکرین پر۔',
      id: 'bc434fb785a6',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک گاہک 390 روپے والے چائے کے 2 پیک، 610 کا ایک لیٹر کوکنگ آئل اور 420 روپے کلو والے 5 کلو چاول لیتا ہے۔\n\n- سب ٹوٹل = 780 + 610 + 2,100 = **3,490 روپے**، 8 آئٹمز\n- آپ 40 روپے کا ڈسکاؤنٹ دے کر رقم گول کرتے ہیں: ٹوٹل **3,450 روپے**\n- گاہک 5,000 کا نوٹ دیتا ہے: واپسی **1,550 روپے**\n\nدن میں چند بلوں کے لیے ہاتھ سے رسید بنانا چل جاتا ہے۔ مصروف کاؤنٹر کو چاہیے کہ بل اسکین سے بنے، ہر سیل کے ساتھ اسٹاک کم ہو، اور رسید ایک ہی قدم میں پرنٹ ہو۔ [Nafaa POS](/ur/product/pos) یہی کرتا ہے: یہ 58 mm، 80 mm اور A4 پر پرنٹ کرتا ہے، انٹرنیٹ چلا جائے تو بھی چلتا رہتا ہے، اور ہر بل آپ کے اسٹاک، کھاتے اور دن کی رپورٹ میں جاتا ہے۔',
      id: 'bacfb889b01c',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'یہ فِسکل انوائس نہیں',
      body: 'یہ ایک سادہ رسید ہے۔ جن ریٹیلرز کو FBR فِسکل انوائس دینی ہوتی ہے، انہیں انٹیگریٹڈ POS چاہیے جو FBR انوائس نمبر اور QR کوڈ چھاپے۔',
      id: 'b43b36041b2c',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'bfbc9cc3f385',
    },
  ],
  faqKeys: ['ur-receipt-maker-1', 'ur-receipt-maker-2', 'ur-receipt-maker-3'],
  relations: [
    { ref: 'GLOSSARY_TERM:receipt@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
    { ref: 'TOOL:gst-calculator@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:simple-invoice-template@ur', kind: 'RELATED' },
  ],
  seoTitle: 'فری رسید میکر: 58mm یا 80mm پر دکان کا بل پرنٹ کریں',
  seoDescription:
    'پاکستان کی دکانوں کے لیے فری رسید میکر: آئٹمز، ڈسکاؤنٹ اور ٹیکس لکھیں، کیش، کارڈ، JazzCash یا Easypaisa چنیں، اور 58mm یا 80mm تھرمل پرنٹر پر پرنٹ کریں۔',
  focusKeyword: 'رسید میکر',
  sortOrder: 100,
  origin: 'translation of content/tools/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/receipt/setup.ts',
    'apps/web/src/core/receipt/print.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
  ],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
