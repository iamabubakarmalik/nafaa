/** Urdu: Price list template page (/ur/templates/price-list-template). Translation of content/templates/index.ts (price-list-template). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/inventory/products/import/columns.ts',
];
const SOURCE_NOTE = 'Nafaa claim: price sheet export and price update import (columns.ts downloadPriceSheet, PRICE_FIELDS).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-price-list-template-1',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا ریٹیل اور ہول سیل قیمت ایک ہی لسٹ پر ہونی چاہیے؟',
    answer:
      'صرف تب جب دونوں طرح کے گاہک اسے دیکھیں گے۔ بہت سی دکانیں ایک ہی فائل سے دو لسٹیں پرنٹ کرتی ہیں: ایک عام گاہکوں کے لیے، جس سے ہول سیل کالم مٹا دیا جاتا ہے، اور ایک دونوں قیمتوں والی، دکانداروں اور سیلز مین کے لیے۔ ایک ہی ماسٹر فائل رکھیں تاکہ دونوں لسٹیں ہمیشہ ایک ہی قیمتوں سے بنیں۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-price-list-template-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-price-list-template-2',
    locale: 'ur',
    topic: 'templates',
    question: 'پرائس لسٹ واٹس ایپ پر کیسے بھیجوں؟',
    answer:
      'پرنٹ مینیو سے، یا Excel میں File پھر Save As سے، شیٹ کو PDF میں محفوظ کریں، پھر PDF کسی چیٹ میں یا اپنے WhatsApp Business کیٹلاگ پر بھیجیں۔ PDF ہر فون پر ایک جیسی دکھتی ہے، جو چھپے ہوئے صفحے کی تصویر میں نہیں ہوتا، اور گاہک زوم کر کے آرام سے پڑھ سکتا ہے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-price-list-template-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'price-list-template',
  title: 'پرائس لسٹ ٹیمپلیٹ (ریٹیل اور ہول سیل)',
  summary:
    'پرنٹ ہونے والی پرائس لسٹ جس میں ریٹیل اور ہول سیل قیمت، پیک کا سائز اور پیک کی قیمت کیٹیگری وار ہیں۔ اپنی دکان کی تفصیل اور قیمتیں لاگو ہونے کی تاریخ لکھیں، پھر کاؤنٹر کے لیے پرنٹ کریں، سیلز مین کو دیں، یا PDF بنا کر واٹس ایپ پر بھیجیں۔',
  data: { fileMediaId: 'media_template-price-list', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'b60c9f90353c',
      markdown:
        '## فائل میں کیا ہے\n\nایک **Price list** شیٹ، جس کے اوپر آپ کی دکان کا نام، فون یا واٹس ایپ، پتہ اور "prices valid from" (قیمتیں کس تاریخ سے لاگو ہیں) لکھنے کی جگہ ہے۔ پھر 120 لائنیں ہیں جن میں Category, Product, Unit, Retail price, Wholesale price, Pack (مثلاً "Carton of 24")، Pack price اور Note کے کالم ہیں؛ فائل میں کالموں کے نام انگریزی میں ہیں۔ لائنوں پر ہلکی دھاریاں ہیں تاکہ کاغذ پر پڑھنا آسان ہو، فلٹر لگے ہوئے ہیں تاکہ کیٹیگری کے حساب سے ترتیب دے سکیں، اور ہیڈر لائن ہر پرنٹ صفحے پر دوبارہ آتی ہے۔\n\nفائل کا سیدھا لنک: [nafaa-price-list-template.xlsx](/downloads/nafaa-price-list-template.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b5492ffce920',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'اپنی تفصیل اور تاریخ لکھیں',
          body: 'تاریخ سے گاہک کو پتہ چلتا ہے کہ کون سی لسٹ نئی ہے۔',
        },
        {
          title: 'پراڈکٹس کیٹیگری وار لکھیں',
          body: 'ایک کیٹیگری کی چیزیں ساتھ ساتھ رکھیں تاکہ گاہک جلدی ڈھونڈ لے۔',
        },
        {
          title: 'ہول سیل اور پیک کی قیمت ڈالیں، اگر بیچتے ہیں',
          body: 'اگر صرف ریٹیل بیچتے ہیں تو یہ کالم خالی چھوڑیں یا مٹا دیں۔',
        },
        {
          title: 'پرنٹ کریں یا PDF بنائیں',
          body: 'File پھر Print، یا PDF بنا کر واٹس ایپ پر بھیجیں۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'b038e17904e0',
      markdown:
        '## قیمتیں ایک ہی جگہ رکھیں\n\nچھپی ہوئی لسٹ کا خطرہ یہ ہے کہ وہ پرانی ہو جاتی ہے جبکہ کاؤنٹر نئی قیمت لے رہا ہوتا ہے۔ قیمتیں ایک ہی جگہ بدلیں اور ہر بار نئی لسٹ پرنٹ کریں۔ Nafaa میں آپ اپنی موجودہ پراڈکٹس قیمتوں سمیت شیٹ کی شکل میں ڈاؤن لوڈ کر سکتے ہیں، Excel میں قیمتیں بدل کر شیٹ واپس امپورٹ کر سکتے ہیں، تاکہ کاؤنٹر، لسٹ اور [آن لائن اسٹور](/ur/product/online-store) پر ایک ہی قیمت ہو۔ کسی قیمت کے پیچھے مارجن کتنا ہے، یہ دیکھنے کے لیے [پرافٹ مارجن کیلکولیٹر](/ur/tools/profit-margin-calculator) استعمال کریں۔',
    },
  ],
  faqKeys: ['ur-price-list-template-1', 'ur-price-list-template-2'],
  relations: [
    { ref: 'TOOL:profit-margin-calculator@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:wholesale-price@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:whatsapp-business-for-shops@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
  ],
  seoTitle: 'پرائس لسٹ ٹیمپلیٹ Excel: ریٹیل اور ہول سیل (مفت)',
  seoDescription:
    'Excel میں مفت پرائس لسٹ ٹیمپلیٹ، ریٹیل قیمت، ہول سیل قیمت، پیک اور پیک کی قیمت کے کالموں کے ساتھ۔ پرنٹ کریں یا PDF بنا کر واٹس ایپ پر بھیجیں۔',
  focusKeyword: 'پرائس لسٹ ٹیمپلیٹ',
  sortOrder: 50,
  origin: 'translation of content/templates/index.ts, price-list-template (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
