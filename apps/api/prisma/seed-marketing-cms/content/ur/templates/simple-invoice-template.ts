/** Urdu: Simple invoice template page (/ur/templates/simple-invoice-template). Translation of content/templates/index.ts (simple-invoice-template). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/core/receipt/setup.ts',
];
const SOURCE_NOTE =
  'Formulas in build-files.ts. Nafaa claims: A4 invoice layout from the same bill (core/receipt/setup.ts a4Title INVOICE).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-simple-invoice-template-1',
    locale: 'ur',
    topic: 'templates',
    question: 'سادہ انوائس میں کیا کیا ہونا چاہیے؟',
    answer:
      'کم از کم: آپ کے کاروبار کا نام اور رابطہ، ایک الگ انوائس نمبر، تاریخ، گاہک، ہر آئٹم کی مقدار، ریٹ اور رقم، کوئی ڈسکاؤنٹ یا ٹیکس، اور ٹوٹل۔ ادائیگی کی آخری تاریخ، ادائیگی کی تفصیل اور باقی رقم کی لائن ڈالنے سے گاہک کے لیے وقت پر ادائیگی آسان ہوتی ہے، اور آپ کے لیے بعد میں یاد دلانا بھی۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-simple-invoice-template-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-simple-invoice-template-2',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا یہ سیلز ٹیکس انوائس ہے؟',
    answer:
      'نہیں۔ یہ ایک سادہ کاروباری انوائس ہے۔ اگر آپ سیلز ٹیکس میں رجسٹرڈ ہیں تو سیلز ٹیکس انوائس میں قواعد کے مطابق مزید تفصیل چاہیے، جیسے رجسٹریشن نمبر اور ہر آئٹم پر ٹیکس، اور کچھ ریٹیلرز کو FBR سے جڑے POS سے انوائس دینی ہوتی ہے۔ ٹیکس والی سیل کے لیے اسے استعمال کرنے سے پہلے دیکھ لیں کہ آپ کے کاروبار پر کون سے قواعد لاگو ہیں۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-simple-invoice-template-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'simple-invoice-template',
  title: 'سادہ انوائس ٹیمپلیٹ (Excel)',
  summary:
    'دکانوں، ہول سیلرز اور سروس والے کاروبار کے لیے Excel میں ایک صفحے کی صاف انوائس: انوائس نمبر، تاریخیں، ادائیگی کی شرائط، گاہک کی تفصیل اور 20 لائنیں تک۔ سب ٹوٹل، ڈسکاؤنٹ، سیلز ٹیکس، ڈلیوری، ٹوٹل، ادا شدہ رقم اور باقی رقم خود حساب ہوتے ہیں۔',
  data: { fileMediaId: 'media_template-simple-invoice', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'b8aaf0b87892',
      markdown:
        '## فائل میں کیا ہے\n\n**Invoice** شیٹ میں آپ کے کاروبار کا نام، پتہ اور NTN کی لائن، انوائس نمبر، تاریخ، ادائیگی کی آخری تاریخ اور شرائط، گاہک کا نام، پتہ اور فون، اور بیس لائنیں ہیں جن میں Item, SKU, Unit, Qty, Rate اور Amount ہیں۔ ٹوٹل والے حصے میں Subtotal, Discount, Sales tax %, Sales tax, Delivery charges, Total, Paid اور Balance due ہیں۔ نیچے ادائیگی کے لیے آپ کے بینک، JazzCash یا Easypaisa کی تفصیل اور دستخط کی جگہ ہے۔ **How to use** شیٹ ہر حصہ سمجھاتی ہے۔ فائل میں خانوں کے نام انگریزی میں ہیں۔\n\nفائل کا سیدھا لنک: [nafaa-simple-invoice-template.xlsx](/downloads/nafaa-simple-invoice-template.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b03ea86a31b0',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'ہیڈر ایک بار سیٹ کریں',
          body: 'کاروبار کا نام اور پتے والی لائن بدلیں، نیچے ادائیگی کی تفصیل ڈالیں، اور فائل کو اپنے ٹیمپلیٹ کے طور پر محفوظ کر لیں۔',
        },
        {
          title: 'ہر بار نیا نمبر',
          body: 'انوائس نمبر کبھی دوبارہ استعمال نہ کریں؛ گاہک بھی اور آپ کا اپنا ریکارڈ بھی اسی سے ادائیگیاں ڈھونڈتے ہیں۔',
        },
        {
          title: 'لائنیں اور گرے خانے بھریں',
          body: 'ہر لائن میں Qty اور Rate؛ ٹوٹل والے حصے میں ڈسکاؤنٹ، ٹیکس %، ڈلیوری اور ادا شدہ رقم۔',
        },
        {
          title: 'پرنٹ کریں یا PDF بھیجیں',
          body: 'شیٹ A4 صفحے کی چوڑائی میں آ جاتی ہے۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'b9315e414705',
      markdown:
        '## انوائس سے سیل کے ریکارڈ تک\n\nہفتے میں چند انوائس ہوں تو اسپریڈشیٹ ٹھیک ہے، لیکن ہر انوائس الگ فائل ہوتی ہے اور کوئی چیز ان کا ٹوٹل نہیں کرتی۔ Excel کے بغیر براؤزر سے انوائس پرنٹ کرنی ہو تو مفت [رسید میکر](/ur/tools/receipt-maker) استعمال کریں۔ Nafaa کا [POS](/ur/product/pos) A4 انوائس اسی بل سے پرنٹ کرتا ہے جو اسٹاک، کھاتہ اور رپورٹس اپ ڈیٹ کرتا ہے، اور جہاں لاگو ہو وہاں FBR/PRA انٹیگریشن اختیاری ہے۔ یہ ٹیمپلیٹ ایک سادہ انوائس ہے، FBR سیلز ٹیکس انوائس نہیں۔',
    },
  ],
  faqKeys: ['ur-simple-invoice-template-1', 'ur-simple-invoice-template-2'],
  relations: [
    { ref: 'GLOSSARY_TERM:invoice@ur', kind: 'RELATED' },
    { ref: 'TOOL:receipt-maker@ur', kind: 'RELATED' },
    { ref: 'TOOL:gst-calculator@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
  ],
  seoTitle: 'سادہ انوائس ٹیمپلیٹ Excel، چھوٹے کاروبار کے لیے (مفت)',
  seoDescription:
    'Excel میں مفت سادہ انوائس ٹیمپلیٹ: آئٹم لائنیں، ڈسکاؤنٹ، سیلز ٹیکس، ڈلیوری، ٹوٹل اور باقی رقم خود حساب ہوتے ہیں۔ پرنٹ کریں یا PDF بنا کر بھیجیں۔',
  focusKeyword: 'سادہ انوائس ٹیمپلیٹ Excel',
  sortOrder: 70,
  origin: 'translation of content/templates/index.ts, simple-invoice-template (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
