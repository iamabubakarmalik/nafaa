/** Urdu: Glossary term wholesale price (/ur/glossary/wholesale-price). Translation of content/glossary/products.ts (wholesale-price). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'wholesale-price',
  title: 'ہول سیل ریٹ (Wholesale Price)',
  seoTitle: 'ہول سیل ریٹ (Wholesale Price) کیا ہے؟ مطلب اور مثال',
  summary: 'ہول سیل ریٹ وہ کم قیمت ہے جو زیادہ مقدار میں خریدنے والوں یا مال آگے بیچنے والوں سے لی جاتی ہے، جیسے دکاندار، ٹھیکیدار یا ادارے۔',
  data: {
    term: 'ہول سیل ریٹ (Wholesale Price)',
    definition: 'ہول سیل ریٹ وہ کم قیمت ہے جو زیادہ مقدار میں خریدنے والوں یا مال آگے بیچنے والوں سے لی جاتی ہے، جیسے دکاندار، ٹھیکیدار یا ادارے۔',
    definitionRomanUrdu: 'Wholesale price woh kam qeemat hai jo zyada maal lene walon ya aage bechne walon se li jati hai, jaise dukandar, contractor ya idaray.',
    example: 'ایک اسٹیشنری شاپ کاغذ کا ایک ریم عام گاہک کو 1,450 روپے میں اور 50 ریم خریدنے والے اسکولوں کو 1,350 روپے میں دیتی ہے۔ دونوں قیمتیں پروڈکٹ پر محفوظ ہیں، اور اسکول کے بل پر کیشیئر ہول سیل ریٹ چن لیتا ہے۔',
    alsoKnownAs: ['ہول سیل قیمت', 'ڈیلر ریٹ', 'trade price', 'TP', 'bulk price', 'dealer price'],
  },
  blocks: [
    {
      id: 'b62c19799adb',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں بہت سی دکانیں ایک ہی کاؤنٹر سے ریٹیل بھی کرتی ہیں اور ہول سیل بھی: ہارڈویئر اسٹور جو گھر والوں کو بھی بیچتا ہے اور ٹھیکیداروں کو بھی، کریانہ جو اپنے محلے کی دوسری دکانوں کو مال دیتا ہے، فارمیسی جو کسی کلینک کو سپلائی کرتی ہے۔ اگر ہول سیل ریٹ محفوظ نہ ہو تو کیشیئر یا تو یادداشت سے ریٹ دیتا ہے یا مالک کو فون کرتا ہے، اور ہول سیل بلوں کا پرافٹ کبھی واضح نہیں ہوتا۔

ہول سیل ریٹ پروڈکٹ پر رکھیں، طے کریں کہ یہ ریٹ کسے ملے گا (گاہک کی قسم یا کم از کم مقدار)، اور ہول سیل کا مارجن الگ سے دیکھیں، کیونکہ وہ عام طور پر کم ہوتا ہے۔ ہول سیل گاہک اکثر ادھار پر بھی خریدتے ہیں، اس لیے کھاتے کی حد اور زیادہ اہم ہو جاتی ہے۔

## Nafaa میں

Nafaa میں پروڈکٹس اور ان کے ویریئنٹس پر الگ ہول سیل ریٹ ہوتا ہے، اور کاؤنٹر کسی بھی لائن کو ریٹیل کے بجائے ہول سیل ریٹ پر بل کر سکتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:mrp@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:markup@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
  ],
  sortOrder: 117,
  origin: 'translation of content/glossary/products.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/products/components/VariantCard.tsx',
    'apps/web/src/modules/pos/hooks/useSharedPosCart.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
