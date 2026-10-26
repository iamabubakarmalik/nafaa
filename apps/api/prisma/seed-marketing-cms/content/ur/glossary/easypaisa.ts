/** Urdu: Glossary term Easypaisa (/ur/glossary/easypaisa). Translation of content/glossary/payments-online.ts (easypaisa). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'easypaisa',
  title: 'Easypaisa (ایزی پیسہ)',
  seoTitle: 'Easypaisa (ایزی پیسہ) کیا ہے؟ مطلب اور مثال',
  summary:
    'Easypaisa پاکستان میں ایک موبائل والیٹ اور ڈیجیٹل بینکنگ سروس ہے، جس سے پیسے بھیجے اور لیے جاتے ہیں، بل ادا ہوتے ہیں اور دکانوں کو اکاؤنٹ نمبر یا QR کوڈ سے ادائیگی ہوتی ہے۔',
  seoDescription:
    'Easypaisa پاکستان کا موبائل والیٹ اور ڈیجیٹل بینک ہے، جس سے پیسے بھیجے جاتے ہیں، بل ادا ہوتے ہیں اور دکانوں کو اکاؤنٹ نمبر یا QR کوڈ سے ادائیگی ہوتی ہے۔',
  data: {
    term: 'Easypaisa (ایزی پیسہ)',
    definition:
      'Easypaisa پاکستان میں ایک موبائل والیٹ اور ڈیجیٹل بینکنگ سروس ہے، جس سے پیسے بھیجے اور لیے جاتے ہیں، بل ادا ہوتے ہیں اور دکانوں کو اکاؤنٹ نمبر یا QR کوڈ سے ادائیگی ہوتی ہے۔',
    definitionRomanUrdu:
      'Easypaisa Pakistan ka mobile wallet aur digital banking service hai, jis se paise bheje aur liye jaate hain, bill diye jaate hain aur dukaan ko QR se payment hoti hai.',
    example:
      'ایک گروسری اسٹور کو ہفتے کے دن 40 Easypaisa ادائیگیاں ملتی ہیں۔ دکان بند کرتے وقت مالک ایپ میں Easypaisa کا ٹوٹل دن کے بلوں کے Easypaisa ٹوٹل سے ملاتا ہے؛ دونوں 86,300 روپے دکھاتے ہیں۔',
    alsoKnownAs: ['ایزی پیسہ', 'Easy Paisa', 'Easypaisa', 'موبائل والیٹ', 'mobile wallet'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b40572409f32',
      markdown: `## یہ کیسے کام کرتا ہے

Easypaisa بھی دوسرے والیٹس کی طرح چلتا ہے: گاہک نمبر سے، QR سے یا اپنی بینک ایپ سے Raast کے ذریعے ادا کرتے ہیں۔ دکانوں کے لیے ہر ڈیجیٹل طریقے پر ایک ہی اصول ہے: بل پر طریقہ درج کریں، ادائیگی گاہک کی اسکرین پر نہیں بلکہ دکان کی اپنی ایپ میں چیک کریں، اور روز ٹوٹل ملائیں۔

والیٹ کے پیسوں سے سپلائرز اور بل بھی ادا ہو سکتے ہیں، اس لیے والیٹ سے جو جاتا ہے اس کا بھی حساب رکھیں، صرف آنے والے کا نہیں۔ ورنہ والیٹ کا بیلنس ایک دوسرا گلہ بن جاتا ہے جس کا کوئی ریکارڈ نہیں۔

## Nafaa میں

Nafaa کاؤنٹر Easypaisa کو الگ ادائیگی کے طریقے کے طور پر اور کئی طریقوں والی ادائیگی میں درج کرتا ہے، دکان کا Easypaisa مرچنٹ QR بلوں پر پرنٹ ہو سکتا ہے، اور Shop accounts Easypaisa اکاؤنٹ میں آنے اور جانے والے پیسے ہر لین دین کے کھاتے کے ساتھ رکھتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:jazzcash@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:split-payment@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:raast@ur', kind: 'RELATED' },
  ],
  sortOrder: 32,
  origin: 'translation of content/glossary/payments-online.ts, easypaisa (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/finance/money',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
