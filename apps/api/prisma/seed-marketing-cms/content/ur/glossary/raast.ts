/** Urdu: Glossary term Raast (/ur/glossary/raast). Translation of content/glossary/payments-online.ts (raast). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'raast',
  title: 'Raast (راست)',
  seoTitle: 'Raast (راست) کیا ہے؟ مطلب اور مثال',
  summary:
    'Raast اسٹیٹ بینک آف پاکستان کا فوری ادائیگی کا نظام ہے، جس سے بینک اور والیٹ اکاؤنٹس کے درمیان اسی وقت پیسے جاتے ہیں، موبائل نمبر جیسی Raast ID کے ذریعے۔',
  seoDescription:
    'Raast اسٹیٹ بینک آف پاکستان کا فوری ادائیگی کا نظام ہے، جس سے Raast ID کے ذریعے بینک اور والیٹ اکاؤنٹس کے درمیان اسی وقت پیسے جاتے ہیں۔',
  data: {
    term: 'Raast (راست)',
    definition:
      'Raast اسٹیٹ بینک آف پاکستان کا فوری ادائیگی کا نظام ہے، جس سے بینک اور والیٹ اکاؤنٹس کے درمیان اسی وقت پیسے جاتے ہیں، موبائل نمبر جیسی Raast ID کے ذریعے۔',
    definitionRomanUrdu:
      'Raast State Bank ka instant payment system hai jis se bank aur wallet accounts me foran paise jaate hain, mobile number jaisi Raast ID se.',
    example:
      'ایک گاہک فرنیچر کی دکان کو اپنی بینک ایپ سے 35,000 روپے دکان کی Raast ID پر بھیجتی ہے، جو مالک کا رجسٹرڈ موبائل نمبر ہے۔ پیسے سیکنڈوں میں آ جاتے ہیں اور دکان سامان دینے سے پہلے بھیجنے والے کا نام دیکھ لیتی ہے۔',
    alsoKnownAs: ['راست', 'Raast ID', 'راست آئی ڈی', 'SBP Raast', 'Raast payment'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'bc64281eb7ab',
      markdown: `## یہ کیسے کام کرتا ہے

Raast بینکوں اور بہت سے والیٹس کو ایک قومی نظام پر جوڑتا ہے جو اسٹیٹ بینک آف پاکستان چلاتا ہے۔ ہر اکاؤنٹ ہولڈر ایک Raast ID، عام طور پر اپنا موبائل نمبر، ایک اکاؤنٹ سے جوڑ سکتا ہے، اس لیے ادا کرنے والے کو لمبا IBAN نہیں چاہیے۔ ادائیگیاں اسی وقت پہنچتی ہیں، دن ہو یا رات۔

دکانوں کے لیے Raast گاہک کی ادائیگی (فرد سے مرچنٹ) کے لیے بھی چلتا ہے اور سپلائر کی ادائیگی کے لیے بھی۔ گاہک Raast ID ڈال کر یا QR کوڈ اسکین کر کے ادا کر سکتے ہیں۔ سامان دینے سے پہلے ہمیشہ اپنی بینک ایپ میں ادائیگی کنفرم کریں، کیونکہ اسکرین شاٹ جعلی بن سکتے ہیں۔

## Nafaa میں

دکان اپنا Raast یا بینک QR Nafaa میں محفوظ کر سکتی ہے، اسے بلوں پر پرنٹ کر سکتی ہے، جہاں QR اجازت دے وہاں رقم سمیت، اور کسٹمر ڈسپلے پر دکھا سکتی ہے۔ ادائیگی بل پر طریقے کے ساتھ درج ہوتی ہے، اور Shop accounts بینک اور والیٹ کے بیلنس رکھتا ہے۔

## سرکاری ذریعہ

[State Bank of Pakistan: Raast](https://www.sbp.org.pk/dfs/Raast.html)۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:jazzcash@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:easypaisa@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:payments@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-payments-jazzcash-easypaisa-raast@ur', kind: 'RELATED' },
  ],
  sortOrder: 83,
  origin: 'translation of content/glossary/payments-online.ts, raast (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/core/payments/emvQr.ts',
    'apps/web/src/modules/finance/money',
  ],
  sources: [
    {
      title: 'State Bank of Pakistan: Raast',
      url: 'https://www.sbp.org.pk/dfs/Raast.html',
      publisher: 'State Bank of Pakistan',
      accessedAt: '2026-10-26',
    },
  ],
  factCheck: {
    checkedOn: '2026-10-26',
    note: 'Urdu translation of the English entry; claims unchanged. Checked against the official source listed.',
  },
  dropped: [],
  needsOwner: [],
};
