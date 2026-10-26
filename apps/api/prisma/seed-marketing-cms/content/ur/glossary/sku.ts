/** Urdu: Glossary term SKU (/ur/glossary/sku). Translation of content/glossary/products.ts (sku). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'sku',
  title: 'SKU (اسٹاک کیپنگ یونٹ)',
  seoTitle: 'SKU (اسٹاک کیپنگ یونٹ) کیا ہے؟ مطلب اور مثال',
  summary:
    'SKU اسٹاک میں کسی پروڈکٹ کی ایک خاص قسم کا کوڈ ہے، تاکہ ہر سائز، رنگ یا پیک الگ گنا جائے۔',
  seoDescription:
    'SKU (Stock Keeping Unit) کسی پروڈکٹ کی ایک خاص قسم کا کوڈ ہے، تاکہ ہر سائز، رنگ یا پیک الگ گنا جائے۔ جانیں دکان میں SKU کیسے بنائیں۔',
  data: {
    term: 'SKU (اسٹاک کیپنگ یونٹ)',
    definition: 'SKU اسٹاک میں کسی پروڈکٹ کی ایک خاص قسم کا کوڈ ہے، تاکہ ہر سائز، رنگ یا پیک الگ گنا جائے۔',
    definitionRomanUrdu: 'SKU har product ki har qism ka alag code hai, taake har size, rang ya pack alag gina jaye.',
    example:
      'میڈیم سائز ہرا کرتا اور وہی کرتا لارج سائز ہرا، یہ دو SKU ہیں۔ شیمپو کی 185 ml اور 360 ml بوتلیں بھی دو SKU ہیں، چاہے برانڈ اور نام ایک ہی ہو۔',
    alsoKnownAs: ['ایس کے یو', 'stock keeping unit', 'آئٹم کوڈ', 'item code', 'product code'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b49f49bebadb',
      markdown: `## یہ کیسے کام کرتا ہے

SKU دکان کا اپنا کوڈ ہوتا ہے، بارکوڈ کی طرح نہیں جو عام طور پر بنانے والی کمپنی دیتی ہے۔ یہ ایک سوال کا جواب دیتا ہے: "یہ بالکل کون سی چیز ہے؟" الگ SKU کے بغیر دکان کو پتا ہوتا ہے کہ 40 کرتے پڑے ہیں، لیکن یہ نہیں کہ سارے میڈیم بک چکے ہیں اور صرف XXL بچا ہے۔ اسی طرح دوبارہ آرڈر غلط ہوتے ہیں۔

پڑھنے میں آسان SKU اسٹاف کے کام آتا ہے: شروع میں کیٹیگری کا چھوٹا سا نشان، پھر اسٹائل، رنگ اور سائز، جیسے KUR-021-GRN-M۔ ہر کوڈ الگ رکھیں، پرانا کوڈ نئی پروڈکٹ کو کبھی نہ دیں، اور کوڈ میں قیمت نہ ڈالیں، کیونکہ قیمتیں بدلتی رہتی ہیں۔

## Nafaa میں

Nafaa میں ہر پروڈکٹ اور اس کی ہر قسم کا اپنا SKU ہوتا ہے، اور کاؤنٹر کی تلاش نام، SKU یا بارکوڈ سے چیز ڈھونڈ لیتی ہے۔ دواؤں جیسی پروڈکٹ اقسام کو تیار پری فکس ملتا ہے، اور بلک امپورٹ اور بلک ایڈٹ سے دکان اپنی پوری فہرست کے SKU ایک ساتھ بھر سکتی ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:barcode@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:product-import-template@ur', kind: 'RELATED' },
  ],
  sortOrder: 98,
  origin: 'translation of content/glossary/products.ts, sku (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
    'apps/web/src/modules/inventory/products/import',
    'apps/web/src/modules/pos',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
