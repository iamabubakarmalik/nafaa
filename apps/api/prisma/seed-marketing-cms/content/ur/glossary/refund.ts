/** Urdu: Glossary term refund (/ur/glossary/refund). Translation of content/glossary/counter.ts (refund). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'refund',
  title: 'ریفنڈ (Refund)',
  seoTitle: 'ریفنڈ (Refund) کیا ہے؟ مطلب اور مثال',
  summary: 'ریفنڈ وہ رقم ہے جو واپس کی گئی چیز یا کینسل آرڈر کے بدلے گاہک کو لوٹائی جاتی ہے۔',
  seoDescription: 'ریفنڈ وہ رقم ہے جو واپس کی گئی چیز یا کینسل آرڈر پر گاہک کو لوٹائی جاتی ہے۔ دکانیں ریفنڈ کیسے درج کریں اور کیش دراز کا حساب کیسے ٹھیک رکھیں، یہاں پڑھیں۔',
  data: {
    term: 'ریفنڈ (Refund)',
    definition: 'ریفنڈ وہ رقم ہے جو واپس کی گئی چیز یا کینسل آرڈر کے بدلے گاہک کو لوٹائی جاتی ہے۔',
    definitionRomanUrdu: 'Refund matlab wapas kiye gaye saman ya cancel order ke paise gahak ko lautana.',
    example: 'ایک آن لائن گاہک COD آرڈر کینسل کرتا ہے، جبکہ اس کی ادائیگی بینک ٹرانسفر سے ہو چکی تھی۔ اسٹور رقم اسی اکاؤنٹ میں واپس بھیجتا ہے اور ٹرانسفر کا ریفرنس آرڈر کے ساتھ محفوظ رکھتا ہے۔',
    alsoKnownAs: ['پیسے واپس', 'paise wapas', 'money back'],
  },
  blocks: [
    {
      id: 'bc0c9a5c579a',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ریفنڈ واپسی کا پیسوں والا حصہ ہے۔ سب سے محفوظ اصول یہ ہے کہ ریفنڈ اسی طرح دیں جیسے گاہک نے ادائیگی کی تھی: کیش کے بدلے کیش، والٹ کے بدلے والٹ، اور ادھار سیل پر کھاتے میں ایڈجسٹمنٹ۔ انہیں آپس میں ملانے سے مسئلے بنتے ہیں: JazzCash والی سیل پر کیش ریفنڈ دیں تو دراز کم پڑ جاتا ہے، اور ادھار سیل پر کیش ریفنڈ دیں تو دکان وہ پیسہ دے دیتی ہے جو اسے کبھی ملا ہی نہیں۔

ریفنڈ کیش کے غائب ہونے کا بھی ایک عام راستہ ہے۔ بہت سی دکانیں ہر ریفنڈ کے لیے مینیجر کی منظوری رکھتی ہیں، اور دکان بند کرتے وقت دن کے ریفنڈ، void اور بڑے ڈسکاؤنٹ ایک ساتھ دیکھتی ہیں۔

## Nafaa میں

Nafaa میں ریفنڈ اصل بل کے خلاف ریٹرن کے ذریعے ہوتا ہے، اور صرف وہی اسٹاف کر سکتا ہے جس کے پاس ریٹرنز کی اجازت ہو۔ ریٹرن میں درج ہوتا ہے کہ پیسے کس طرح واپس گئے، اور کیش رجسٹر صرف وہی کیش گنتا ہے جو اصل میں ہاتھ میں دیا گیا۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:receipt@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:cod@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:staff-theft-prevention-counter@ur', kind: 'RELATED' },
  ],
  sortOrder: 87,
  origin: 'translation of content/glossary/counter.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/sales/returns/pages/ReturnsPage.tsx',
    'apps/web/src/core/lib/permissions.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
