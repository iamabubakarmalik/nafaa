/** Urdu: Glossary term COD (/ur/glossary/cod). Translation of content/glossary/payments-online.ts (cod). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'cod',
  title: 'COD (کیش آن ڈیلیوری)',
  seoTitle: 'COD (کیش آن ڈیلیوری) کیا ہے؟ مطلب اور مثال',
  summary: 'کیش آن ڈیلیوری (COD) کا مطلب ہے کہ گاہک پیسے تب دیتا ہے جب آرڈر اس تک پہنچتا ہے، آرڈر دیتے وقت نہیں۔',
  seoDescription: 'کیش آن ڈیلیوری (COD) میں گاہک پارسل ملنے پر پیسے دیتا ہے، آرڈر دیتے وقت نہیں۔ پاکستان میں بیچنے والے COD اور واپس آنے والے پارسل کیسے سنبھالتے ہیں، یہاں پڑھیں۔',
  data: {
    term: 'COD (کیش آن ڈیلیوری)',
    definition: 'کیش آن ڈیلیوری (COD) کا مطلب ہے کہ گاہک پیسے تب دیتا ہے جب آرڈر اس تک پہنچتا ہے، آرڈر دیتے وقت نہیں۔',
    definitionRomanUrdu: 'COD ka matlab hai gahak order milne par paise deta hai, order dete waqt nahi.',
    example: 'کپڑوں کا ایک برانڈ اپنی ویب سائٹ پر 4,500 روپے کا کرتا COD پر بیچتا ہے۔ کورئیر دروازے پر گاہک سے کیش لیتا ہے، اور اپنے چارجز کاٹ کر اگلی ہفتہ وار سیٹلمنٹ میں برانڈ کو پیسے دیتا ہے۔',
    alsoKnownAs: ['کیش آن ڈیلیوری', 'cash on delivery', 'pay on delivery', 'ڈیلیوری پر ادائیگی'],
  },
  blocks: [
    {
      id: 'bc33bc2b1a4f',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں بہت سے آن لائن خریدار ڈیلیوری پر پیسے دینا پسند کرتے ہیں، کیونکہ وہ پیسے دینے سے پہلے چیز دیکھنا چاہتے ہیں۔ بیچنے والے کے لیے COD کے دو خرچے ہیں۔ پہلا، پیسے دیر سے آتے ہیں: کورئیر کیش لیتا ہے اور اپنے حساب سے سیٹلمنٹ کرتا ہے۔ دوسرا، کچھ گاہک پارسل لینے سے انکار کر دیتے ہیں، اور بیچنے والا دونوں طرف کی ڈیلیوری کا خرچہ اٹھاتا ہے جبکہ سیل کچھ نہیں ہوئی۔

بیچنے والے یہ خطرہ یوں کم کرتے ہیں: بھیجنے سے پہلے کال یا واٹس ایپ پر آرڈر کنفرم کرتے ہیں، بڑے یا خطرے والے آرڈر پر ایڈوانس مانگتے ہیں، بار بار پارسل واپس کرنے والوں کو بلاک کرتے ہیں، اور آن لائن ادائیگی پر تھوڑا سا فائدہ دیتے ہیں۔

## Nafaa میں

Nafaa کا COD پیج دکھاتا ہے کہ کتنے پیسے ابھی کورئیر کے پاس ہیں، کتنے وصول ہو چکے مگر ابھی آپ تک نہیں پہنچے، کون سی سیٹلمنٹ مل گئی، اور کون سے پارسل واپس آئے۔ آن لائن آرڈرز پر گاہک کا رسک بیج نظر آتا ہے، اور بار بار مسئلہ کرنے والے گاہکوں کو بلاک لسٹ میں ڈالا جا سکتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'PRODUCT:online-store@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:ecommerce@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:refund@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:split-payment@ur', kind: 'RELATED' },
  ],
  sortOrder: 15,
  origin: 'translation of content/glossary/payments-online.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/integrations/online-orders/pages/CodPage.tsx',
    'apps/web/src/integrations/online-orders/pages/BlocklistPage.tsx',
    'apps/web/src/integrations/online-orders/components/RiskBadge.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
