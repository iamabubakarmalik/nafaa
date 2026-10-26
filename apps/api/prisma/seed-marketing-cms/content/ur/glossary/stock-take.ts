/** Urdu: Glossary term stock take (/ur/glossary/stock-take). Translation of content/glossary/stock.ts (stock-take). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'stock-take',
  title: 'اسٹاک ٹیک (Stock Take)',
  seoTitle: 'اسٹاک ٹیک (Stock Take) کیا ہے؟ مطلب اور مثال',
  summary:
    'اسٹاک ٹیک شیلف اور گودام میں موجود سامان کی ہاتھ سے گنتی ہے، جسے اس سے ملایا جاتا ہے جو سسٹم کہتا ہے کہ ہونا چاہیے۔',
  data: {
    term: 'اسٹاک ٹیک (Stock Take)',
    definition:
      'اسٹاک ٹیک شیلف اور گودام میں موجود سامان کی ہاتھ سے گنتی ہے، جسے اس سے ملایا جاتا ہے جو سسٹم کہتا ہے کہ ہونا چاہیے۔',
    definitionRomanUrdu:
      'Stock take matlab shelf aur godown me maujood maal ko hath se ginna aur system ke hisaab se milana.',
    example:
      'ایک کاسمیٹکس کی دکان مہینے کے پہلے اتوار کو اپنی لپ اسٹکس گنتی ہے۔ سسٹم 214 کہتا ہے، شیلف پر 206 ہیں۔ غائب 8 پیس، جن کی کاسٹ 9,600 روپے ہے، اسٹاک سے نکالے جاتے ہیں اور فرق کی وجہ ڈھونڈی جاتی ہے۔',
    alsoKnownAs: ['اسٹاک ٹیک', 'اسٹاک کی گنتی', 'stock count', 'physical count', 'inventory count', 'cycle count', 'stocktaking'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b014808fcaff',
      markdown: `## یہ کیسے کام کرتا ہے

ہر اسٹاک سسٹم وقت کے ساتھ اصل سے ہٹ جاتا ہے: چیزیں اسکین کیے بغیر بک جاتی ہیں، اندراج کے بغیر آ جاتی ہیں، خراب ہوتی ہیں یا چوری ہو جاتی ہیں۔ اسٹاک ٹیک نمبر دوبارہ ٹھیک کرتا ہے، اور اس سے بھی اہم، یہ دکھاتا ہے کہ کتنا نقصان ہو رہا ہے۔ پوری گنتی سے کام رکتا ہے، اس لیے بہت سی دکانیں سائیکل کاؤنٹ کرتی ہیں: ہر ہفتے ایک کیٹیگری یا ایک لائن گنیں، تاکہ ایک مہینے میں پوری دکان گنی جائے۔

گنتی تب کریں جب دکان بند ہو یا رش کم ہو، جس حصے کی گنتی ہو رہی ہے وہاں سامان کی آمد و رفت روک دیں، اور بڑے فرق دوسرا آدمی دوبارہ گنے۔ مالک کے لیے اصل بات فرق کی قیمت ہے، صرف تعداد نہیں۔

## Nafaa میں

Nafaa میں اسٹاک کی گنتی تلاش، اسکین یا پوری کیٹیگری سے ہوتی ہے: اسٹاف شیلف پر موجود تعداد لکھتا ہے اور ساتھ ہی سسٹم کی تعداد، فرق اور اس کی قیمت دیکھتا ہے۔ محفوظ کرنے سے پہلے ایک خلاصہ کنفرم ہوتا ہے، اور ہر فرق ایڈجسٹمنٹ کے طور پر اسٹاک میں ڈالا یا نکالا جاتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'TEMPLATE:stock-take-sheet@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:dead-stock@ur', kind: 'RELATED' },
  ],
  sortOrder: 102,
  origin: 'translation of content/glossary/stock.ts, stock-take (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/stock-adjustments/components/StockCountPanel.tsx',
    'apps/web/src/modules/inventory/stock-adjustments/pages/StockAdjustmentsPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
