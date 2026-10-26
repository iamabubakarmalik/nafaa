/** Urdu: Glossary term IMEI (/ur/glossary/imei). Translation of content/glossary/products.ts (imei). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'imei',
  title: 'IMEI نمبر (IMEI)',
  seoTitle: 'IMEI نمبر (IMEI) کیا ہے؟ مطلب اور مثال',
  summary: 'IMEI وہ 15 ہندسوں کا نمبر ہے جس سے ہر موبائل فون سیٹ کی الگ پہچان ہوتی ہے۔',
  seoDescription: 'IMEI وہ 15 ہندسوں کا نمبر ہے جو ہر موبائل فون سیٹ کی پہچان ہے۔ پاکستان میں موبائل شاپس اسے اسٹاک، PTA اسٹیٹس، وارنٹی اور چوری کی جانچ کے لیے استعمال کرتی ہیں۔',
  data: {
    term: 'IMEI نمبر (IMEI)',
    definition: 'IMEI وہ 15 ہندسوں کا نمبر ہے جس سے ہر موبائل فون سیٹ کی الگ پہچان ہوتی ہے۔',
    definitionRomanUrdu: 'IMEI 15 hindson ka number hai jo har mobile phone ki alag pehchan hai.',
    example: 'ایک موبائل شاپ ہر خریدے اور بیچے گئے فون کا IMEI درج کرتی ہے۔ جب کوئی گاہک وارنٹی میں فون واپس لاتا ہے، تو دکان IMEI ٹائپ کرتی ہے اور چند سیکنڈ میں بل، تاریخ اور قیمت سامنے آ جاتی ہے۔',
    alsoKnownAs: ['IMEI number', 'International Mobile Equipment Identity', 'آئی ایم ای آئی نمبر'],
  },
  blocks: [
    {
      id: 'b73d5824cba0',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ہر فون سیٹ کا اپنا IMEI ہوتا ہے، اور ڈوئل سم فون کے دو ہوتے ہیں۔ آپ اسے *#06# ڈائل کر کے، ڈبے کے لیبل پر، اور بیٹری یا سم ٹرے کے نیچے دیکھ سکتے ہیں۔ پاکستان میں IMEI دو وجوہات سے اہم ہے۔ پہلی، PTA اسی سے طے کرتا ہے کہ فون مقامی نیٹ ورک پر چل سکتا ہے یا نہیں۔ دوسری، ایک ہی ماڈل کے دو فونوں کو الگ پہچاننے کا یہی ایک پکا طریقہ ہے، چاہے بات وارنٹی کی ہو، ریٹرن کی، چوری کی جانچ کی یا پرانے فون کی خرید و فروخت کی۔

موبائل شاپ کو فون اسٹاک میں آتے وقت بھی IMEI درج کرنا چاہیے اور سیل کے بل پر بھی۔ IMEI درج کیے بغیر فون بیچنے سے وارنٹی کلیم اور پولیس کے سوالوں کا جواب دینا مشکل ہو جاتا ہے۔

## Nafaa میں

Nafaa کا موبائل پیک IMEI رجسٹر رکھتا ہے: ہر فون اپنے IMEI اور PTA اسٹیٹس کے ساتھ درج ہوتا ہے، کاؤنٹر IMEI سے بیچتا ہے، اور ریٹرنز IMEI سے تلاش کیے جا سکتے ہیں۔ بلک امپورٹ میں بھی فونز کے لیے IMEI کالم ہوتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'INDUSTRY:mobile-shop@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:barcode@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku@ur', kind: 'RELATED' },
  ],
  sortOrder: 47,
  origin: 'translation of content/glossary/products.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx',
    'apps/web/src/industries/mobile/api/imei.api.ts',
    'apps/web/src/modules/sales/returns/pages/ReturnsPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
