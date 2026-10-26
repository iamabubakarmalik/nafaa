/** Urdu: Purchase order template page (/ur/templates/purchase-order-template). Translation of content/templates/index.ts (purchase-order-template). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/purchasing/purchases/components/PurchasePrintModal.tsx',
  'apps/web/src/modules/inventory/low-stock/components/OrderModal.tsx',
];
const SOURCE_NOTE =
  'Formulas in build-files.ts. Nafaa claims: purchase order, GRN and purchase bill prints (PurchasePrintModal.tsx TITLES), order from the low stock list (OrderModal.tsx).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-purchase-order-template-1',
    locale: 'ur',
    topic: 'templates',
    question: 'پرچیز آرڈر اور پرچیز بل میں کیا فرق ہے؟',
    answer:
      'پرچیز آرڈر وہ ہے جو آپ ڈلیوری سے پہلے سپلائر کو بھیجتے ہیں: کون سے آئٹم، کتنی مقدار اور کس ریٹ پر خریدنا طے ہوا۔ پرچیز بل یا انوائس وہ ہے جو سپلائر مال کے ساتھ یا بعد میں ادائیگی مانگنے کے لیے بھیجتا ہے۔ ان دونوں کو، اور جو مال اصل میں آیا اسے، آپس میں ملانے سے کم یا غلط ڈلیوری پکڑی جاتی ہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-purchase-order-template-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-purchase-order-template-2',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا چھوٹی دکانوں کو پرچیز آرڈر کی ضرورت ہے؟',
    answer:
      'سیلز مین سے ہر چھوٹی خریداری کے لیے نہیں، لیکن بڑے آرڈر، نئے سپلائر، اور ہر اس آرڈر میں کام آتا ہے جہاں ریٹ یا ڈلیوری کی تاریخ پر بات ہوئی ہو۔ واٹس ایپ پر PDF کی شکل میں بھیجا گیا PO بھی ریکارڈ بن جاتا ہے کہ کیا طے ہوا تھا، اگر بعد میں ڈلیوری یا بل میل نہ کھائے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-purchase-order-template-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'purchase-order-template',
  title: 'پرچیز آرڈر ٹیمپلیٹ (Excel)',
  summary:
    'سپلائرز کے لیے ایک صفحے کا پرچیز آرڈر: PO نمبر، تاریخ، ڈلیوری کی تاریخ اور ادائیگی کی شرائط، سپلائر کی تفصیل، اور مقدار، ریٹ اور رقم کے ساتھ 20 لائنیں تک۔ سب ٹوٹل، ڈسکاؤنٹ، سیلز ٹیکس، کرایہ اور ٹوٹل خود حساب ہوتے ہیں؛ پرنٹ کریں یا PDF بنا کر بھیجیں۔',
  data: { fileMediaId: 'media_template-purchase-order', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'b69d4544b70d',
      markdown:
        '## فائل میں کیا ہے\n\n**Purchase order** شیٹ کے اوپر آپ کے کاروبار کا نام اور پتہ ہے، دائیں طرف PO نمبر، تاریخ، ڈلیوری کی تاریخ اور ادائیگی کی شرائط، اور سپلائر کا نام، پتہ اور فون۔ بیس آئٹم لائنوں میں Item, SKU, Unit, Qty اور Rate لکھے جاتے ہیں؛ Amount خود نکلتا ہے۔ ان کے نیچے Subtotal, Discount, Sales tax % اور اس کی رقم، Freight اور Total ہیں، ساتھ میں سپلائر کے لیے تین عام ہدایات اور دستخط کی لائنیں۔ یہ A4 صفحے کی چوڑائی میں آ جاتا ہے۔ **How to use** شیٹ ہر حصہ سمجھاتی ہے۔ فائل میں سب خانوں کے نام انگریزی میں ہیں۔\n\nفائل کا سیدھا لنک: [nafaa-purchase-order-template.xlsx](/downloads/nafaa-purchase-order-template.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b6acd3c3a963',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'اپنی تفصیل ایک بار ڈالیں',
          body: 'کاروبار کا نام اور پتے والی لائن بدلیں، پھر فائل کو اپنے ٹیمپلیٹ کے طور پر محفوظ کر لیں۔',
        },
        {
          title: 'ہر آرڈر کو نمبر دیں',
          body: 'PO-0001، PO-0002 اور اسی طرح آگے، تاکہ سپلائر کا بل آرڈر سے ملایا جا سکے۔',
        },
        {
          title: 'آئٹم ڈالیں',
          body: 'ہر لائن میں Qty اور Rate لکھیں؛ ٹوٹل خود بن جاتے ہیں۔',
        },
        {
          title: 'بھیج دیں',
          body: 'پرنٹ کریں، یا PDF بنا کر سپلائر کو واٹس ایپ یا ای میل پر بھیجیں۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'b2345e9622f4',
      markdown:
        '## پرچیز آرڈر کیوں استعمال کریں\n\nلکھا ہوا آرڈر مال آنے سے پہلے مقدار اور ریٹ طے کر دیتا ہے، اس لیے کم ڈلیوری، غلط آئٹم اور بدلے ہوئے ریٹ ادائیگی کے بعد نہیں، دروازے پر ہی پکڑے جاتے ہیں۔ مال آئے تو اسے PO سے ملائیں، اور جو بھی فرق ہو بل پر لکھ دیں۔ کتنا آرڈر کرنا ہے، یہ طے کرنے کے لیے [ری آرڈر لیول کیلکولیٹر](/ur/tools/reorder-level-calculator) استعمال کریں۔ Nafaa میں [پرچیزنگ](/ur/product/purchasing) آپ کی کم اسٹاک لسٹ سے آرڈر بناتی ہے، اسے پرچیز آرڈر کے طور پر پرنٹ کرتی ہے، اور مال آنے پر اسے گڈز ریسیوڈ نوٹ (GRN) اور پرچیز بل میں بدل دیتی ہے۔',
    },
  ],
  faqKeys: ['ur-purchase-order-template-1', 'ur-purchase-order-template-2'],
  relations: [
    { ref: 'PRODUCT:purchasing@ur', kind: 'RELATED' },
    { ref: 'TOOL:reorder-level-calculator@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:simple-invoice-template@ur', kind: 'RELATED' },
  ],
  seoTitle: 'پرچیز آرڈر ٹیمپلیٹ Excel (مفت، پرنٹ ہونے والا PO)',
  seoDescription:
    'Excel میں مفت پرچیز آرڈر ٹیمپلیٹ: PO نمبر، سپلائر کی تفصیل، آئٹم لائنیں، ڈسکاؤنٹ، سیلز ٹیکس، کرایہ اور ٹوٹل۔ پرنٹ کریں یا PDF بنا کر بھیجیں۔',
  focusKeyword: 'پرچیز آرڈر ٹیمپلیٹ',
  sortOrder: 60,
  origin: 'translation of content/templates/index.ts, purchase-order-template (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
