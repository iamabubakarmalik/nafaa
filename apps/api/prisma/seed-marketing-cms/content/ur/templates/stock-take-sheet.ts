/** Urdu: Stock take sheet template page (/ur/templates/stock-take-sheet). Translation of content/templates/index.ts (stock-take-sheet). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
];
const SOURCE_NOTE =
  'Formulas in build-files.ts. Nafaa claims: stock count by search, scan or category with live difference and value, differences booked on confirm (StockCountPanel.tsx header).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-stock-take-sheet-1',
    locale: 'ur',
    topic: 'templates',
    question: 'دکان کو اسٹاک کی گنتی کتنی بار کرنی چاہیے؟',
    answer:
      'سال میں کم از کم ایک بار پوری گنتی، اور ہر ہفتے یا ہر مہینے چند سیکشنز کی باری باری گنتی۔ جلدی بکنے والی اور مہنگی چیزیں، اور جو چیزیں اکثر غائب ہوتی ہیں، انہیں زیادہ بار گنیں۔ باقاعدہ چھوٹی گنتیاں چوری، بلنگ کی غلطیاں اور بغیر اندراج آئی ڈلیوری اس وقت پکڑ لیتی ہیں جب ان کا سراغ لگانا ابھی آسان ہو۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-stock-take-sheet-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-stock-take-sheet-2',
    locale: 'ur',
    topic: 'templates',
    question: 'منفی فرق کا کیا مطلب ہے؟',
    answer:
      'منفی فرق کا مطلب ہے کہ شیلف پر اتنا مال نہیں جتنا سسٹم کہتا ہے۔ عام وجوہات: بغیر بل کے بکا مال، خراب یا ایکسپائر مال جو درج نہیں ہوا، چوری، یا کوئی ڈلیوری جو زیادہ مقدار کے ساتھ درج ہو گئی۔ مثبت فرق کا مطلب عام طور پر یہ ہوتا ہے کہ مال آیا مگر درج نہیں ہوا۔ اسٹاک درست کرنے سے پہلے دوبارہ گنیں۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-stock-take-sheet-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'stock-take-sheet',
  title: 'اسٹاک ٹیک شیٹ (Excel، پرنٹ کے لیے)',
  summary:
    'پرنٹ ہونے والی اسٹاک گنتی شیٹ: پراڈکٹ، SKU، یونٹ، سسٹم اسٹاک اور گنی ہوئی مقدار کا خانہ۔ گنتی واپس ٹائپ کریں تو شیٹ فرق اور کاسٹ کے حساب سے اس کی قیمت نکال دیتی ہے، اور نیچے کل کمی یا زیادتی بتاتی ہے۔',
  data: { fileMediaId: 'media_template-stock-take', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'bd4a38146e3f',
      markdown:
        '## فائل میں کیا ہے\n\n**Stock count** شیٹ کے اوپر دکان، تاریخ، سیکشن اور گنتی کرنے والے دو لوگوں کے نام کی جگہ ہے۔ پھر 150 نمبر والی لائنیں ہیں جن میں Product, SKU or barcode, Unit, System stock, Counted, Difference, Cost price, Difference value اور Note کے کالم ہیں (فائل میں کالموں کے نام انگریزی میں ہیں)۔ Counted کالم پر ہلکا رنگ ہے تاکہ کاغذ پر بھرنا آسان ہو۔ ہیڈر لائن ہر پرنٹ صفحے پر دوبارہ آتی ہے، اور شیٹ A4 پر لیٹی (landscape) پرنٹ ہوتی ہے۔\n\nDifference میں گنی ہوئی مقدار سے سسٹم اسٹاک نکالا جاتا ہے؛ Difference value اس فرق کو کاسٹ پرائس سے ضرب دیتی ہے۔ نیچے والا ٹوٹل بتاتا ہے کہ گنتی میں کتنی مالیت کا اسٹاک کم نکلا یا زیادہ۔\n\nفائل کا سیدھا لنک: [nafaa-stock-take-sheet.xlsx](/downloads/nafaa-stock-take-sheet.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'bb062736d8c1',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'گنتی سے پہلے لسٹ بھریں',
          body: 'جس سیکشن کی گنتی کرنی ہے، اس کی پراڈکٹس، SKU، یونٹ، سسٹم اسٹاک اور کاسٹ پرائس پیسٹ یا ٹائپ کریں۔',
        },
        {
          title: 'پرنٹ کریں اور گنیں',
          body: 'ایک وقت میں ایک شیلف گنیں، کھلے یونٹ میں۔ ایک آدمی گنے، دوسرا لکھے۔',
        },
        {
          title: 'گنتی ٹائپ کریں',
          body: 'جیسے جیسے ٹائپ کریں گے، فرق اور اس کی قیمت خود نکلتی جائے گی۔',
        },
        {
          title: 'بڑا فرق دوبارہ گنیں، پھر درست کریں',
          body: 'سسٹم میں اسٹاک ٹھیک کرنے سے پہلے بڑے فرق دوبارہ چیک کریں، اور شیٹ ریکارڈ کے طور پر رکھ لیں۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'b67b4a17c1f8',
      markdown:
        '## کم محنت سے گنتی\n\nسیکشن وار گنتی، یعنی ہر ہفتے چند شیلف، پوری دکان بند کر کے گننے سے آسان ہے، اور مسئلے جلدی پکڑتی ہے۔ اس کی پلاننگ کیسے کریں، یہ ہماری [اسٹاک ٹیکنگ گائیڈ](/ur/blog/stock-taking-guide) میں ہے۔ Nafaa کے [اسٹاک کاؤنٹ](/ur/product/inventory) میں پراڈکٹس سرچ، اسکین یا پوری کیٹیگری سے ڈالی جاتی ہیں، ٹائپ کرتے ہوئے سسٹم کا فگر، فرق اور اس کی قیمت سامنے آتی ہے، اور کنفرم کرنے پر ہر فرق درج ہو جاتا ہے۔ اس لیے کوئی فگر دو بار ٹائپ نہیں کرنا پڑتا۔',
    },
  ],
  faqKeys: ['ur-stock-take-sheet-1', 'ur-stock-take-sheet-2'],
  relations: [
    { ref: 'GLOSSARY_TERM:stock-take@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
  seoTitle: 'اسٹاک ٹیک شیٹ ٹیمپلیٹ: پرنٹ ہونے والی اسٹاک گنتی Excel',
  seoDescription:
    'Excel میں مفت اسٹاک ٹیک شیٹ: پرنٹ کریں، ہر شیلف گنیں، پھر ہر پراڈکٹ کا اور کل فرق، اور کاسٹ کے حساب سے اس کی قیمت دیکھیں۔',
  focusKeyword: 'اسٹاک ٹیک شیٹ',
  sortOrder: 30,
  origin: 'translation of content/templates/index.ts, stock-take-sheet (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
