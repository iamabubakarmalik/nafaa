/** Urdu: Product import template page (/ur/templates/product-import-template). Translation of content/templates/index.ts (product-import-template). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/inventory/products/import/columns.ts',
];
const SOURCE_NOTE =
  'Headers copied from FIELDS[k].label in apps/web/src/modules/inventory/products/import/columns.ts (CREATE_FIELDS minus Description, Variant, Size, Color, Pack Barcode and IMEI); header aliases incl. Roman Urdu/Urdu, existing-product choice and price sheet export checked in the same file.';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-product-import-template-1',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا ہر کالم بھرنا ضروری ہے؟',
    answer:
      'نہیں۔ صرف پراڈکٹ کا نام ضروری ہے۔ چھوٹی دکان نام، قیمت اور اسٹاک سے شروع کر سکتی ہے، اور کاسٹ پرائس، بارکوڈ اور کیٹیگری بعد میں دوسری امپورٹ سے یا پراڈکٹ ایڈٹ کر کے ڈال سکتی ہے۔ جو کالم آپ کبھی استعمال نہیں کریں گے، جیسے کپڑے کی دکان کے لیے بیچ اور ایکسپائری، انہیں مٹا دیں تاکہ شیٹ بھرنا آسان رہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-product-import-template-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-product-import-template-2',
    locale: 'ur',
    topic: 'templates',
    question: 'اگر میرے کالم کسی اور ترتیب یا زبان میں ہوں تو کیا امپورٹ چلے گا؟',
    answer:
      'جی ہاں۔ Nafaa کالموں کو ان کی جگہ سے نہیں، ہیڈر کے نام سے ملاتا ہے، اور عام انگریزی، رومن اردو اور اردو نام پہچانتا ہے، جیسے qeemat، stock یا naam۔ اس ٹیمپلیٹ میں پہلے سے وہی نام ہیں، اس لیے کچھ ملانا نہیں پڑتا۔ آپ کی اپنی شیٹ، جس کے ہیڈر الگ ہوں، عام طور پر کالموں کا ملاپ ایک بار دیکھ کر امپورٹ ہو جاتی ہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-product-import-template-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'product-import-template',
  title: 'پراڈکٹ امپورٹ ٹیمپلیٹ (Excel)',
  summary:
    'پراڈکٹ لسٹ کے لیے Excel شیٹ، جس کے کالموں کے نام وہی ہیں جو Nafaa کا امپورٹ پڑھتا ہے: نام، قیمت، کاسٹ، اسٹاک، یونٹ، کیٹیگری، برانڈ، SKU، بارکوڈ، کم اسٹاک الرٹ، پیک، بیچ اور ایکسپائری۔ ایک بار بھر کر اپلوڈ کریں، پوری دکان ایک ہی بار میں Nafaa میں آ جائے گی۔',
  data: { fileMediaId: 'media_template-product-import', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'b4c901f5dbcf',
      markdown:
        '## فائل میں کیا ہے\n\n**Products** شیٹ میں 17 کالم ہیں: Name, Price, Cost Price, Wholesale Price, Stock, Unit, Category, Brand, SKU, Barcode, Low Stock Alert, Tax %, Pack Name, Pack Qty, Pack Price, Batch No اور Expiry Date۔ فائل میں کالموں کے نام انگریزی میں ہیں۔ صرف Name ضروری ہے؛ جو کالم آپ استعمال نہیں کرتے انہیں مٹا دیں یا خالی چھوڑ دیں۔ نمونے کی تین لائنیں دکھاتی ہیں کہ کیسے لکھنا ہے، اور SKU اور Barcode کالم ٹیکسٹ پر سیٹ ہیں تاکہ شروع کے صفر نہ مٹیں۔\n\n**Hidayat** شیٹ ہر کالم آسان الفاظ میں سمجھاتی ہے: کیا لکھنا ہے، کون سا یونٹ لکھنا ہے، اور پیک، بیچ اور ایکسپائری کی تاریخ کیسے کام کرتے ہیں۔\n\nفائل کا سیدھا لنک: [nafaa-product-import-template.xlsx](/downloads/nafaa-product-import-template.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b4278f2cba32',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'نمونے کی لائنیں مٹا دیں',
          body: 'لائن 2 سے 4 تک مثال ہے۔ سب سے اوپر والی ہیڈر لائن بالکل ویسی ہی رہنے دیں۔',
        },
        {
          title: 'ہر لائن میں ایک پراڈکٹ لکھیں',
          body: 'نام، قیمت اور اسٹاک سے شروع کریں۔ پرافٹ کی رپورٹ چاہیے تو کاسٹ پرائس بھی لکھیں، اور اسکین کرتے ہیں تو بارکوڈ بھی۔',
        },
        {
          title: 'اسٹاک کھلے یونٹ میں لکھیں',
          body: '24 والے کارٹن کے لیے Pack Qty میں 24 لکھیں، اور Stock میں کل پیس لکھیں، کارٹن کی گنتی نہیں۔',
        },
        {
          title: 'Nafaa میں اپلوڈ کریں',
          body: 'Products کھولیں، Import چنیں، پھر فائل اور وہ برانچ چنیں جس میں شروع کا اسٹاک جانا ہے۔ کالم نام سے ملائے جاتے ہیں؛ جو پراڈکٹس پہلے سے موجود ہیں ان کا کیا کرنا ہے، یہ آپ خود چنتے ہیں۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'bee119a91a32',
      markdown:
        '## صاف امپورٹ کے لیے مشورے\n\nہر پراڈکٹ کو الگ SKU یا بارکوڈ دیں، تاکہ امپورٹ دو پراڈکٹس میں فرق کر سکے اور بعد میں قیمت بدلتے وقت صحیح لائن ملے۔ کیٹیگری کا نام ہر بار ایک ہی طرح لکھیں ("Ghee / Oil"، کبھی صرف "Oil" نہیں)، کیونکہ ہر نئی اسپیلنگ ایک نئی کیٹیگری بن جاتی ہے۔ قیمتیں سادہ نمبر میں لکھیں؛ روپے کا نشان اور کامے بھی چل جاتے ہیں، امپورٹ انہیں خود ہٹا دیتا ہے۔\n\nیہی فائل زیادہ تر اسپریڈشیٹ ایپس میں چلتی ہے، Google Sheets میں بھی۔ بعد میں قیمتیں بدلنی ہوں تو Nafaa آپ کی موجودہ لسٹ پرائس شیٹ کی شکل میں نکال دیتا ہے، جو اسی طرح واپس امپورٹ ہو جاتی ہے۔',
    },
  ],
  faqKeys: ['ur-product-import-template-1', 'ur-product-import-template-2'],
  relations: [
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku@ur', kind: 'RELATED' },
    { ref: 'TOOL:barcode-generator@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:price-list-template@ur', kind: 'RELATED' },
  ],
  seoTitle: 'پراڈکٹ لسٹ Excel ٹیمپلیٹ، POS امپورٹ کے لیے (مفت)',
  seoDescription:
    'مفت Excel پراڈکٹ لسٹ ٹیمپلیٹ: قیمت، کاسٹ، اسٹاک، بارکوڈ، پیک، بیچ اور ایکسپائری کے کالم۔ Nafaa کے پراڈکٹ امپورٹ سے میل کھاتی ہے، اس لیے کالم خود مل جاتے ہیں۔',
  focusKeyword: 'پراڈکٹ لسٹ Excel ٹیمپلیٹ',
  sortOrder: 10,
  origin: 'translation of content/templates/index.ts, product-import-template (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
