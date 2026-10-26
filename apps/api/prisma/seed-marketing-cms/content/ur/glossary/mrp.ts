/** Urdu: Glossary term MRP (/ur/glossary/mrp). Translation of content/glossary/products.ts (mrp). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'mrp',
  title: 'MRP (پیک پر چھپی ریٹیل قیمت)',
  seoTitle: 'MRP (پیک پر چھپی ریٹیل قیمت) کیا ہے؟ مطلب اور مثال',
  summary: 'MRP وہ ریٹیل قیمت ہے جو کمپنی پروڈکٹ کے پیک پر چھاپتی ہے، اور دکان سے توقع ہوتی ہے کہ وہ گاہک سے اس سے زیادہ نہ لے۔',
  data: {
    term: 'MRP (پیک پر چھپی ریٹیل قیمت)',
    definition: 'MRP وہ ریٹیل قیمت ہے جو کمپنی پروڈکٹ کے پیک پر چھاپتی ہے، اور دکان سے توقع ہوتی ہے کہ وہ گاہک سے اس سے زیادہ نہ لے۔',
    definitionRomanUrdu: 'MRP woh retail qeemat hai jo company pack par chhapti hai; dukaan gahak se is se zyada nahi le sakti.',
    example: 'جوس کے ایک پیک پر لکھا ہے "ریٹیل قیمت 120 روپے"۔ دکان اسے ٹریڈ پرائس پر خریدتی ہے اور چھپی ہوئی قیمت پر بیچتی ہے؛ اس کا مارجن ان دونوں کا فرق ہے، جو دکان نہیں بلکہ کمپنی طے کرتی ہے۔',
    alsoKnownAs: ['چھپی ہوئی قیمت', 'کمپنی ریٹ', 'maximum retail price', 'printed price', 'retail price', 'company rate'],
  },
  blocks: [
    {
      id: 'b8eedece3dd9',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں بہت سی پیک شدہ چیزوں پر ریٹیل قیمت چھپی ہوتی ہے، جیسے مشروبات، کوکنگ آئل، ٹوائلٹری کا سامان اور دوائیں۔ ان میں قیمت دکان طے نہیں کرتی: اس کا پرافٹ ڈسٹری بیوٹر کی ٹریڈ پرائس اور چھپی ہوئی قیمت کا فرق ہے۔ چھپی ہوئی قیمت سے زیادہ لینے پر شکایتیں آتی ہیں، اور یہ صارفین کے حقوق اور قیمتوں کے کنٹرول کے قوانین کی خلاف ورزی بھی ہو سکتی ہے۔ سیلز ٹیکس ایکٹ، 1990 کے تیسرے شیڈول (Third Schedule) میں شامل چیزوں پر سیلز ٹیکس چھپی ہوئی ریٹیل قیمت پر لگتا ہے۔

جب کمپنی قیمت بڑھاتی ہے تو پرانے اسٹاک پر پرانی قیمت ہی چھپی ہوتی ہے۔ دکانوں کو بیچنے کی قیمت تب ہی بدلنی چاہیے جب نیا اسٹاک آئے، اور یہ تب آسان ہوتا ہے جب خریداری بیچ (batch) کے حساب سے درج ہو۔

## Nafaa میں

Nafaa ہر پروڈکٹ کی کاسٹ پرائس اور سیل پرائس محفوظ کرتا ہے، اور پروڈکٹ ایڈیٹر قیمت ٹائپ کرتے ہی مارجن دکھاتا ہے، تاکہ چھپی ہوئی قیمت والی چیزوں پر دیکھا جا سکے کہ ڈسٹری بیوٹر اصل میں کتنا مارجن چھوڑتا ہے۔

## سرکاری ذریعہ

سیلز ٹیکس ایکٹ، 1990 اور اس کے شیڈول [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226) پر شائع ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:wholesale-price@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sales-tax@ur', kind: 'RELATED' },
  ],
  sortOrder: 63,
  sources: [
    { title: 'FBR: Acts, Rules and Ordinances', url: 'https://fbr.gov.pk/act-rules-ordinances/131226', publisher: 'Federal Board of Revenue', accessedAt: '2026-10-26' },
  ],
  origin: 'translation of content/glossary/products.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
    'apps/web/src/modules/inventory/products/editor/coreSteps.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
