/** Urdu: Glossary term markup (/ur/glossary/markup). Translation of content/glossary/money.ts (markup). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'markup',
  title: 'مارک اپ (Markup)',
  seoTitle: 'مارک اپ (Markup) کیا ہے؟ مطلب اور مثال',
  summary:
    'مارک اپ وہ رقم ہے جو کاسٹ پرائس میں جوڑ کر سیلنگ پرائس بنتی ہے، اور عام طور پر کاسٹ کے فیصد میں بتائی جاتی ہے۔',
  seoDescription:
    'مارک اپ وہ رقم ہے جو کاسٹ پرائس میں جوڑ کر سیلنگ پرائس بنتی ہے، عام طور پر کاسٹ کا فیصد۔ جانیں مارک اپ اور مارجن میں کیا فرق ہے۔',
  data: {
    term: 'مارک اپ (Markup)',
    definition:
      'مارک اپ وہ رقم ہے جو کاسٹ پرائس میں جوڑ کر سیلنگ پرائس بنتی ہے، اور عام طور پر کاسٹ کے فیصد میں بتائی جاتی ہے۔',
    definitionRomanUrdu:
      'Markup woh raqam hai jo cost price par laga kar selling price banti hai, aam taur par cost ka percentage.',
    example:
      'گارمنٹس کی دکان ایک شرٹ 1,600 روپے میں خریدتی ہے اور 50% مارک اپ لگاتی ہے، تو وہ 2,400 روپے میں بکتی ہے۔ اس سیل پر مارجن 800 کو 2,400 سے تقسیم کرنے پر 33% ہے، 50% نہیں۔',
    alsoKnownAs: ['مارک اپ', 'mark-up', 'markup', 'cost plus', 'منافع فیصد', 'munafa percentage'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b295079a6f70',
      markdown: `## یہ کیسے کام کرتا ہے

بہت سے پاکستانی دکاندار مارک اپ سے قیمت رکھتے ہیں کیونکہ خریداری کے وقت یہ آسان ہے: "کاسٹ جمع 20%"۔ جب کاسٹ معلوم اور مستحکم ہو تو یہ ٹھیک چلتا ہے۔ خطرہ یہ ہے کہ پلاننگ کرتے وقت اسے مارجن سمجھ لیا جائے: اگر دکان کو کرایہ اور تنخواہیں پوری کرنے کے لیے 25% مارجن چاہیے، تو 25% مارک اپ کم پڑے گا۔

بدلنے کا طریقہ: مارجن برابر ہے مارک اپ تقسیم (100 جمع مارک اپ)۔ 20% مارک اپ 16.7% مارجن ہے؛ 100% مارک اپ 50% مارجن ہے۔ قیمت رکھنے کے لیے مارک اپ استعمال کریں، اور یہ دیکھنے کے لیے مارجن کہ کاروبار کافی کما رہا ہے یا نہیں۔

## Nafaa میں

Nafaa کے پروڈکٹ ایڈیٹر میں قیمت والے مرحلے پر مارک اپ کے بٹن ہیں (مثلاً 10%، 15%، 20%، 25%) جو ایک ٹچ میں کاسٹ سے سیلنگ پرائس بنا دیتے ہیں، اور ساتھ بننے والا پرافٹ اور مارجن دکھاتے ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:wholesale-price@ur', kind: 'RELATED' },
    { ref: 'TOOL:profit-margin-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 60,
  origin: 'translation of content/glossary/money.ts, markup (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/editor/coreSteps.tsx',
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
