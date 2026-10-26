/** Urdu: Khata (udhaar) register template page (/ur/templates/khata-udhaar-register). Translation of content/templates/index.ts (khata-udhaar-register). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
];
const SOURCE_NOTE =
  'Formulas in build-files.ts (SUMIFS, MAXIFS, TODAY). Nafaa claims: khata ledger with ageing bands and WhatsApp reminders (KhataBookPage.tsx).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-khata-udhaar-register-1',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا کھاتہ ٹیمپلیٹ Google Sheets میں چلتی ہے؟',
    answer:
      'جی ہاں۔ فائل Google Drive پر اپلوڈ کریں اور Google Sheets سے کھولیں؛ بقایا، آخری ادائیگی اور گزرے دنوں کے فارمولے وہاں چلتے ہیں۔ Excel میں Excel 2019 یا اس کے بعد کا ورژن، یا Excel for the web چاہیے، کیونکہ آخری ادائیگی والا کالم MAXIFS فنکشن استعمال کرتا ہے۔ پرانے Excel میں صرف اسی ایک کالم میں ایرر آتا ہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-khata-udhaar-register-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-khata-udhaar-register-2',
    locale: 'ur',
    topic: 'templates',
    question: 'تھوڑی سی ادائیگی (partial payment) کیسے لکھوں؟',
    answer:
      'Entries شیٹ پر ایک نئی لائن ڈالیں: تاریخ، گاہک، اور ملنے والی رقم Payment received کالم میں۔ ادھار والی پرانی لائن نہ بدلیں، نہ مٹائیں۔ بقایا اتنی رقم سے کم ہو جاتا ہے، آخری ادائیگی کی تاریخ بدل جاتی ہے، اور دنوں کی گنتی اسی تاریخ سے دوبارہ شروع ہوتی ہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-khata-udhaar-register-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'khata-udhaar-register',
  title: 'کھاتہ (ادھار) رجسٹر ٹیمپلیٹ',
  summary:
    'Excel میں ڈیجیٹل کھاتہ رجسٹر: گاہکوں کی لسٹ ایک بار بنائیں، ہر ادھار اور ہر ادائیگی ایک لائن میں لکھیں، اور ہر گاہک کا بقایا، آخری ادائیگی کی تاریخ اور اس کے بعد گزرے دن خود بھر جاتے ہیں۔ حد سے اوپر بقایا اور 30 دن سے پرانی ادائیگی لال ہو جاتی ہے۔',
  data: { fileMediaId: 'media_template-khata-register', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'b95da09b4b38',
      markdown:
        '## فائل میں کیا ہے\n\n- **Customers**: نام، فون، ادھار کی حد، کل ادھار، کل وصولی، بقایا، آخری ادائیگی کی تاریخ اور آخری ادائیگی کے بعد گزرے دن، 100 گاہکوں تک۔ ادھار کی حد کے بعد والے سب کالم فارمولے ہیں۔\n- **Entries**: ہر دیے گئے ادھار اور ہر ملنے والی رقم کی ایک لائن، جس میں تاریخ، گاہک (آپ کے گاہکوں کی ڈراپ ڈاؤن لسٹ سے چنا ہوا)، تفصیل جیسے سامان یا بل نمبر، اور رقم ہوتی ہے۔\n- **How to use**: نیچے والے چار مرحلے، فائل کے اندر ہی۔\n\nفائل میں شیٹوں اور کالموں کے نام انگریزی میں ہیں۔ 30 سے زیادہ دن اور ادھار کی حد سے اوپر بقایا لال رنگ میں نظر آتے ہیں، تاکہ فائل کھولتے ہی پتہ چل جائے کن گاہکوں کو فون کرنا ہے۔\n\nفائل کا سیدھا لنک: [nafaa-khata-udhaar-register.xlsx](/downloads/nafaa-khata-udhaar-register.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b266629c54d4',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'گاہکوں کی لسٹ بنائیں',
          body: 'Customers شیٹ پر ہر نام ایک بار لکھیں، فون نمبر کے ساتھ، اور چاہیں تو ادھار کی حد بھی۔',
        },
        {
          title: 'ہر لین دین لکھیں',
          body: 'ادھار پر دیا گیا سامان "Udhaar given" میں جائے گا، ملنے والی رقم "Payment received" میں۔ گاہک ڈراپ ڈاؤن سے چنیں تاکہ نام کی اسپیلنگ ایک جیسی رہے۔',
        },
        {
          title: 'بقایا دیکھیں',
          body: 'Customers شیٹ ہر گاہک کے دونوں کالم جوڑ دیتی ہے۔ بقایا یہ ہے: دیا گیا ادھار، اس میں سے ملنے والی رقم نکال کر۔',
        },
        {
          title: 'لال والوں سے رابطہ کریں',
          body: 'ان گاہکوں کو فون کریں جن کی آخری ادائیگی 30 دن سے پرانی ہے یا جن کا بقایا ان کی حد سے اوپر ہے۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'ba0b6f63f1ae',
      markdown:
        '## جب اسپریڈشیٹ کافی نہ ہو\n\nاسپریڈشیٹ حساب ٹھیک رکھتی ہے، لیکن کاؤنٹر کی ہر ادھار سیل کسی کو پھر بھی ٹائپ کرنی پڑتی ہے، اور گاہک کو اپنا بقایا تبھی پتہ چلتا ہے جب آپ اسے بھیجیں۔ Nafaa کا [ڈیجیٹل کھاتہ](/ur/product/khata) ادھار کو بل کے ساتھ ہی لکھ لیتا ہے، ہر گاہک کا کھاتہ رکھتا ہے، بقایا کو پرانا ہونے کے حساب سے الگ الگ خانوں میں دکھاتا ہے، اور واجب رقم کے ساتھ واٹس ایپ یاد دہانی بھیجتا ہے۔ آج آپ کا ادھار کتنا پرانا ہے، یہ دیکھنے کے لیے [ادھار ایجنگ کیلکولیٹر](/ur/tools/khata-ageing-calculator) استعمال کریں۔',
    },
  ],
  faqKeys: ['ur-khata-udhaar-register-1', 'ur-khata-udhaar-register-2'],
  relations: [
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'TOOL:khata-ageing-calculator@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger@ur', kind: 'RELATED' },
  ],
  seoTitle: 'کھاتہ ادھار رجسٹر Excel ٹیمپلیٹ (مفت ڈاؤن لوڈ)',
  seoDescription:
    'Excel میں مفت کھاتہ (ادھار) رجسٹر: گاہکوں کا بقایا، آخری ادائیگی اور اس کے بعد کے دن خود حساب ہوتے ہیں، اور ادھار کی حد سے اوپر جانے پر وارننگ ملتی ہے۔',
  focusKeyword: 'ادھار رجسٹر Excel',
  sortOrder: 20,
  origin: 'translation of content/templates/index.ts, khata-udhaar-register (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
