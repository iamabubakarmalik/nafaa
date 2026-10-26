/** Urdu: Glossary term recipe costing (/ur/glossary/recipe-costing). Translation of content/glossary/food-health.ts (recipe-costing). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'recipe-costing',
  title: 'ریسیپی کاسٹنگ (Recipe Costing)',
  seoTitle: 'ریسیپی کاسٹنگ (Recipe Costing) کیا ہے؟ مطلب اور مثال',
  summary: 'ریسیپی کاسٹنگ کسی ڈش کی ایک پلیٹ یا ایک بیچ کی کاسٹ نکالتی ہے، ریسیپی میں لگنے والی ہر چیز کی مقدار کے حساب سے اس کی کاسٹ جوڑ کر۔',
  data: {
    term: 'ریسیپی کاسٹنگ (Recipe Costing)',
    definition: 'ریسیپی کاسٹنگ کسی ڈش کی ایک پلیٹ یا ایک بیچ کی کاسٹ نکالتی ہے، ریسیپی میں لگنے والی ہر چیز کی مقدار کے حساب سے اس کی کاسٹ جوڑ کر۔',
    definitionRomanUrdu: 'Recipe costing ek plate ya batch ki cost nikalti hai, recipe me istemal hone wale har ingredient ki miqdar aur qeemat jod kar.',
    example: 'ایک کیفے اپنے کلب سینڈوچ کی کاسٹ نکالتا ہے: ڈبل روٹی 45 روپے، چکن 120، انڈا 30، چیز 40، سبزی اور ساس 25، فرائز 55، پیکنگ 15۔ پلیٹ کی کاسٹ 330 روپے بنتی ہے، اس لیے مینو قیمت 850 ہو تو فوڈ کاسٹ تقریباً 39% بنتی ہے۔',
    alsoKnownAs: ['پلیٹ کاسٹنگ', 'plate costing', 'recipe cost', 'dish costing'],
  },
  blocks: [
    {
      id: 'bcb603be6330',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ہر ڈش کی لکھی ہوئی ریسیپی ہونی چاہیے جس میں ٹھیک مقداریں ہوں، انہی یونٹس میں جن میں دکان مال خریدتی ہے، اور ضرورت ہو تو تبدیل کر کے (5 kg چاول کا تھیلا، فی پلیٹ 250 g)۔ پلیٹ پر جانے والی ہر چیز شامل کریں، جیسے تیل، سجاوٹ، اور ٹیک اوے کی پیکنگ۔ پھر خریداری کے موجودہ ریٹ سے ضرب دیں۔

ریسیپی کاسٹنگ تین کام کرتی ہے: مینو کی قیمت طے کرتی ہے، دکھاتی ہے کہ کون سی ڈش فی پلیٹ زیادہ کماتی ہے، اور مالک کو یہ ملانے دیتی ہے کہ کتنا مال لگنا چاہیے تھا اور اصل میں کتنا لگا۔ ریسیپی لکھی ہو تو باورچی بدلنے پر بھی ذائقہ ایک جیسا رہتا ہے۔

## Nafaa میں

Nafaa میں ریسیپیاں مشترکہ پروڈکٹ ایڈیٹر میں بنتی ہیں اور ان کی کاسٹ خریداری کے ریٹ کے ساتھ بدلتی ہے۔ ریسیپیز پیج پلیٹ کی کاسٹ دکھاتا ہے، بتاتا ہے کہ برانچ کے اسٹاک سے ابھی کتنی پلیٹیں بن سکتی ہیں اور کیا پہلے ختم ہوگا، اور سیل میں لگنے والا خام مال خریداری اور اسٹاک کے مقابلے میں دکھاتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'TOOL:food-cost-calculator@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:bakery@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cogs@ur', kind: 'RELATED' },
  ],
  sortOrder: 86,
  origin: 'translation of content/glossary/food-health.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
