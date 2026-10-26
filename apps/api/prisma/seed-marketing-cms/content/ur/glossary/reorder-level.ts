/** Urdu: Glossary term reorder level (/ur/glossary/reorder-level). Translation of content/glossary/stock.ts (reorder-level). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'reorder-level',
  title: 'ری آرڈر لیول (Reorder Level)',
  seoTitle: 'ری آرڈر لیول (Reorder Level) کیا ہے؟ مطلب اور مثال',
  summary: 'ری آرڈر لیول اسٹاک کی وہ مقدار ہے جس پر نیا آرڈر دے دینا چاہیے، تاکہ شیلف خالی ہونے سے پہلے مال پہنچ جائے۔',
  data: {
    term: 'ری آرڈر لیول (Reorder Level)',
    definition: 'ری آرڈر لیول اسٹاک کی وہ مقدار ہے جس پر نیا آرڈر دے دینا چاہیے، تاکہ شیلف خالی ہونے سے پہلے مال پہنچ جائے۔',
    definitionRomanUrdu: 'Reorder level stock ki woh had hai jis par naya order dena chahiye, taake shelf khali hone se pehle maal aa jaye.',
    example: 'ایک دکان روزانہ ایک شیمپو کی تقریباً 6 بوتلیں بیچتی ہے، اور ڈسٹری بیوٹر آرڈر کے 4 دن بعد مال دیتا ہے۔ 2 دن کا سیفٹی اسٹاک رکھیں تو ری آرڈر لیول 6 ضرب 6، یعنی 36 بوتلیں بنتا ہے۔',
    alsoKnownAs: ['ری آرڈر پوائنٹ', 'reorder point', 'minimum stock', 'low stock alert', 'safety stock'],
  },
  blocks: [
    {
      id: 'bd39b3e542e0',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

سیدھا فارمولا یہ ہے: روزانہ کی سیل ضرب سپلائر کا ڈیلیوری ٹائم، اور اس میں رش والے دنوں اور دیر سے آنے والی ڈیلیوری کے لیے سیفٹی اسٹاک جمع کریں۔ اندازے سے لیول رکھنے کے دو مہنگے نتیجے نکلتے ہیں: تیزی سے بکنے والی چیزیں ختم ہو جاتی ہیں (ایسی سیل ہاتھ سے جاتی ہے جو کسی رپورٹ میں نظر نہیں آتی)، یا آہستہ بکنے والی چیزیں ضرورت سے زیادہ آ جاتی ہیں (کیش شیلف پر پھنس جاتا ہے)۔

ری آرڈر لیول موسم کے ساتھ بدلنا چاہیے۔ ٹھنڈے مشروبات، اسکول کی اسٹیشنری اور رمضان کی چیزوں کی سیل بہت اوپر نیچے ہوتی ہے، اس لیے پچھلے 30 دن کی سیل پر بنا لیول ایک بار رکھے گئے پکے نمبر سے بہتر ہے۔ ری آرڈر لسٹ کو سپلائر کے حساب سے گروپ کریں، کیونکہ ایک آرڈر ایک ہی ڈسٹری بیوٹر کو جاتا ہے۔

## Nafaa میں

Nafaa میں ہر پروڈکٹ کی اپنی لو اسٹاک حد رکھی جا سکتی ہے۔ لو اسٹاک پیج یہ بھی نکالتا ہے کہ حالیہ سیل کی رفتار سے ہر چیز کتنے دن چلے گی، بتاتا ہے کہ کیا جلد ختم ہونے والا ہے، جو چیزیں ختم ہو چکی ہیں ان پر ہاتھ سے جانے والی سیل کا اندازہ لگاتا ہے، اور جتنے دن آپ چنیں اتنے دنوں کے لیے آرڈر کی مقدار تجویز کرتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:dead-stock@ur', kind: 'RELATED' },
    { ref: 'TOOL:reorder-level-calculator@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:purchase-order-template@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing@ur', kind: 'RELATED' },
  ],
  sortOrder: 88,
  origin: 'translation of content/glossary/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/editor/coreSteps.tsx',
    'apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx',
    'apps/web/src/modules/inventory/low-stock/components/SettingsModal.tsx',
    'apps/web/src/modules/inventory/low-stock/components/ReorderView.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
