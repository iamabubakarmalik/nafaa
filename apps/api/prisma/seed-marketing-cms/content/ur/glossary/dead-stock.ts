/** Urdu: Glossary term dead stock (/ur/glossary/dead-stock). Translation of content/glossary/stock.ts (dead-stock). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'dead-stock',
  title: 'ڈیڈ اسٹاک (Dead Stock)',
  seoTitle: 'ڈیڈ اسٹاک (Dead Stock) کیا ہے؟ مطلب اور مثال',
  summary: 'ڈیڈ اسٹاک وہ مال ہے جو کافی عرصے سے نہیں بکا اور اپنی عام قیمت پر بکنے کا امکان کم ہے۔',
  seoDescription: 'ڈیڈ اسٹاک وہ مال ہے جو کافی عرصے سے نہیں بکا اور عام قیمت پر بکنے کا امکان کم ہے۔ اسے جلدی پہچاننے اور شیلف سے نکالنے کا طریقہ یہاں پڑھیں۔',
  data: {
    term: 'ڈیڈ اسٹاک (Dead Stock)',
    definition: 'ڈیڈ اسٹاک وہ مال ہے جو کافی عرصے سے نہیں بکا اور اپنی عام قیمت پر بکنے کا امکان کم ہے۔',
    definitionRomanUrdu: 'Dead stock woh maal hai jo kaafi arse se nahi bika aur normal qeemat par bikne ka imkaan kam hai.',
    example: 'موبائل ایکسسریز کی ایک دکان کو پتہ چلتا ہے کہ اس کے پاس 140 فون کور ایسے ماڈلز کے ہیں جو اب نہیں بکتے، اور 180 دن سے کسی نے انہیں ہاتھ نہیں لگایا۔ کاسٹ کے حساب سے ان میں 42,000 روپے کا کیش پھنسا ہے۔ مالک انہیں اسکرین پروٹیکٹر کے ساتھ مفت تحفے کے طور پر دے کر شیلف خالی کرتا ہے۔',
    alsoKnownAs: ['پھنسا ہوا مال', 'phansa hua maal', 'non-moving stock', 'slow-moving stock', 'obsolete stock'],
  },
  blocks: [
    {
      id: 'bd18d40f6a73',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ڈیڈ اسٹاک جتنا نظر آتا ہے اس سے زیادہ مہنگا پڑتا ہے: یہ کیش روکتا ہے، شیلف کی جگہ گھیرتا ہے، اور فیشن، ماڈل اور موسم بدلنے کے ساتھ اس کی ویلیو اور گرتی جاتی ہے۔ زیادہ تر دکانوں میں یہ ان کے خیال سے زیادہ ہوتا ہے، کیونکہ کوئی یہ نہیں دیکھتا کہ کیا نہیں بکا۔

اسے ایک مقررہ وقفے سے دیکھیں، مثلاً وہ چیزیں جن کی 60، 90 یا 180 دن میں کوئی سیل نہیں ہوئی۔ پھر قدم اٹھائیں: ہو سکے تو سپلائر کو واپس کریں، اس برانچ میں بھیجیں جہاں یہ بکتا ہے، تیزی سے بکنے والی چیزوں کے ساتھ جوڑ کر بیچیں، قیمت کم کریں، یا رائٹ آف کریں۔ بچاؤ اس سے بہتر ہے: نئی یا موسمی چیزیں شروع میں کم مقدار میں خریدیں، جب تک وہ بک کر نہ دکھا دیں۔

## Nafaa میں

Nafaa کی اسٹاک رپورٹ ڈیڈ اسٹاک (اتنی مدت سے کوئی سیل نہیں جتنی آپ چنیں: 30، 60، 90 یا 180 دن) اور آہستہ بکنے والے اسٹاک کو تیزی سے بکنے والی چیزوں سے الگ دکھاتی ہے، اور ہر ایک میں پھنسی ہوئی ویلیو بھی بتاتی ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:reorder-level@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cash-flow@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:stock-taking-guide@ur', kind: 'RELATED' },
  ],
  sortOrder: 24,
  origin: 'translation of content/glossary/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/stock-report/components/meta.ts',
    'apps/web/src/modules/inventory/stock-report',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
