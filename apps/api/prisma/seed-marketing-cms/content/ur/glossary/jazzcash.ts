/** Urdu: Glossary term JazzCash (/ur/glossary/jazzcash). Translation of content/glossary/payments-online.ts (jazzcash). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'jazzcash',
  title: 'JazzCash (جاز کیش)',
  seoTitle: 'JazzCash (جاز کیش) کیا ہے؟ مطلب اور مثال',
  summary:
    'JazzCash پاکستان میں ایک موبائل والیٹ اور برانچ لیس بینکنگ سروس ہے، جس سے پیسے بھیجے اور لیے جاتے ہیں، بل ادا ہوتے ہیں اور دکانوں کو نمبر یا QR کوڈ سے ادائیگی ہوتی ہے۔',
  data: {
    term: 'JazzCash (جاز کیش)',
    definition:
      'JazzCash پاکستان میں ایک موبائل والیٹ اور برانچ لیس بینکنگ سروس ہے، جس سے پیسے بھیجے اور لیے جاتے ہیں، بل ادا ہوتے ہیں اور دکانوں کو نمبر یا QR کوڈ سے ادائیگی ہوتی ہے۔',
    definitionRomanUrdu:
      'JazzCash Pakistan ka mobile wallet hai jis se paise bheje aur liye jaate hain, bill diye jaate hain aur dukaan ko number ya QR se payment hoti hai.',
    example:
      'موبائل شاپ پر ایک گاہک دکان کا QR اسکین کر کے اپنے JazzCash والیٹ سے 12,500 روپے ادا کرتی ہے۔ بل "JazzCash" کے طور پر محفوظ ہوتا ہے، اور دکان بند کرتے وقت یہ رقم گلے میں نہیں، والیٹ میں گنی جاتی ہے۔',
    alsoKnownAs: ['جاز کیش', 'Jazz Cash', 'JazzCash', 'موبائل والیٹ', 'mobile wallet'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b7590ee83cc5',
      markdown: `## یہ کیسے کام کرتا ہے

JazzCash اور دوسرے والیٹس سے وہ گاہک بھی ڈیجیٹل ادائیگی کر سکتے ہیں جن کا بینک اکاؤنٹ نہیں، اور بہت سے گاہک کیش اٹھانے کے بجائے فون سے ادا کرنا پسند کرتے ہیں۔ دکان کے لیے اہم بات درج کرنا ہے: ہر والیٹ ادائیگی بل پر صحیح طریقے کے ساتھ محفوظ ہونی چاہیے۔ ورنہ دراز میں کیش زیادہ یا کم لگتا ہے، اور والیٹ کا بیلنس کبھی سیل سے نہیں ملتا۔

دکانیں ذاتی والیٹ نمبر پر یا QR والے مرچنٹ اکاؤنٹ پر ادائیگی لے سکتی ہیں۔ مرچنٹ اکاؤنٹ کاروبار کے پیسے ذاتی ٹرانسفرز سے الگ رکھتا ہے، جس سے حساب ملانا کہیں آسان ہو جاتا ہے۔

## Nafaa میں

Nafaa کاؤنٹر JazzCash کو الگ ادائیگی کے طریقے کے طور پر درج کرتا ہے، اس صورت میں بھی جب یہ ایک بل کی کئی طریقوں والی ادائیگی کا ایک حصہ ہو۔ دکان کا JazzCash مرچنٹ QR بلوں پر پرنٹ ہو سکتا ہے، اور Shop accounts کیش اور بینک کے ساتھ JazzCash اکاؤنٹ میں آنے اور جانے والے پیسے دکھاتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:easypaisa@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:split-payment@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:raast@ur', kind: 'RELATED' },
  ],
  sortOrder: 51,
  origin: 'translation of content/glossary/payments-online.ts, jazzcash (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/finance/money',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
