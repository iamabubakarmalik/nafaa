/** Urdu: Glossary term split payment (/ur/glossary/split-payment). Translation of content/glossary/payments-online.ts (split-payment). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'split-payment',
  title: 'اسپلٹ پیمنٹ (Split Payment)',
  seoTitle: 'اسپلٹ پیمنٹ (Split Payment) کیا ہے؟ مطلب اور مثال',
  summary: 'اسپلٹ پیمنٹ کا مطلب ہے ایک بل کی ادائیگی ایک سے زیادہ طریقوں سے کرنا، جیسے کچھ کیش اور کچھ کارڈ، والٹ یا کھاتے پر۔',
  seoDescription: 'اسپلٹ پیمنٹ میں ایک بل کی ادائیگی ایک سے زیادہ طریقوں سے ہوتی ہے، جیسے کچھ کیش اور کچھ کارڈ، والٹ یا کھاتہ۔ دکانیں اسے صحیح طرح کیسے درج کریں، یہاں پڑھیں۔',
  data: {
    term: 'اسپلٹ پیمنٹ (Split Payment)',
    definition: 'اسپلٹ پیمنٹ کا مطلب ہے ایک بل کی ادائیگی ایک سے زیادہ طریقوں سے کرنا، جیسے کچھ کیش اور کچھ کارڈ، والٹ یا کھاتے پر۔',
    definitionRomanUrdu: 'Split payment matlab ek bill ko ek se zyada tareeqon se ada karna, jaise kuch cash aur kuch card, wallet ya khata.',
    example: '18,700 روپے کا بل یوں ادا ہوتا ہے: 10,000 کیش، 7,000 JazzCash سے، اور 1,700 کھاتے پر۔ رسید پر تینوں حصے لکھے ہوتے ہیں، گلے میں صرف 10,000 کیش آنا چاہیے، اور کھاتہ 1,700 بڑھ جاتا ہے۔',
    alsoKnownAs: ['ملی جلی ادائیگی', 'split tender', 'mixed payment', 'multiple payment methods', 'partial payment'],
  },
  blocks: [
    {
      id: 'be28fdebb113',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

گاہکوں کے پاس اکثر پوری رقم ایک جگہ نہیں ہوتی، خاص طور پر بڑے بلوں پر۔ اگر POS صرف ایک طریقہ درج کر سکے تو کیشیئر ایک چن لیتا ہے (عام طور پر کیش)، اور دکان بند کرتے وقت دراز، والٹ اور کھاتہ تینوں کا حساب غلط نکلتا ہے۔ صحیح اسپلٹ ہر حصے کو اس کے طریقے اور رقم کے ساتھ درج کرتا ہے۔

بقایا صرف کیش سے دیا جاتا ہے۔ اگر گاہک 9,500 کے بل پر 10,000 روپے کیش دے، تو 500 کا بقایا کیش سے نکلنا چاہیے، کارڈ یا والٹ کی رقم کم کر کے نہیں۔ پھر ہر حصہ صحیح اکاؤنٹ میں جاتا ہے: دراز، بینک، والٹ یا کھاتہ۔

## Nafaa میں

Nafaa کا چیک آؤٹ کیش، کارڈ، بینک، JazzCash، Easypaisa، کھاتہ اور ٹریڈ اِن میں اسپلٹ پیمنٹ لیتا ہے۔ ہر حصہ اپنی الگ پیمنٹ لائن کے طور پر محفوظ ہوتا ہے، رسید پر ہر حصہ لکھا جاتا ہے، دراز کا کیش اور اکاؤنٹس کے بیلنس انہی لائنوں سے بنتے ہیں، اور آف لائن بل بھی یہ حصے ساتھ رکھتے ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:jazzcash@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:payments@ur', kind: 'RELATED' },
  ],
  sortOrder: 100,
  origin: 'translation of content/glossary/payments-online.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/modules/finance/money',
    'apps/web/src/core/receipt',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
