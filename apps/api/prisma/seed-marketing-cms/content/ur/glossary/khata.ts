/** Urdu: Glossary term khata (/ur/glossary/khata). Translation of content/glossary/money.ts (khata). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'khata',
  title: 'کھاتہ (Khata)',
  seoTitle: 'کھاتہ (Khata) کیا ہے؟ مطلب اور مثال',
  summary:
    'کھاتہ ایک رجسٹر ہے، عام طور پر کاغذ کا، جس میں لکھا جاتا ہے کہ ہر گاہک نے دکان سے کتنا ادھار لیا اور کتنا واپس کیا۔',
  data: {
    term: 'کھاتہ (Khata)',
    definition:
      'کھاتہ ایک رجسٹر ہے، عام طور پر کاغذ کا، جس میں لکھا جاتا ہے کہ ہر گاہک نے دکان سے کتنا ادھار لیا اور کتنا واپس کیا۔',
    definitionRomanUrdu:
      'Khata woh register hai jis me dukandar likhta hai ke kis gahak ne kitna udhaar liya aur kitna wapas kiya.',
    example:
      'ایک دکاندار اپنے مستقل گاہک کے نام 2,350 روپے لکھتا ہے، جو مہینے کے آخر میں ادا کرے گا۔ یکم تاریخ کو گاہک 2,000 روپے دیتا ہے، اور کھاتے میں 350 روپے ابھی باقی دکھتے ہیں۔',
    alsoKnownAs: ['کھاتہ', 'ادھار رجسٹر', 'ڈیجیٹل کھاتہ', 'بہی کھاتہ', 'khata book', 'ledger'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'bc854fc9392f',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں تقریباً ہر محلے کی دکان کھاتہ چلاتی ہے۔ اس سے گاہک جڑے رہتے ہیں، لیکن دکان کا سب سے زیادہ پیسہ بھی یہیں ڈوبتا ہے: کاؤنٹر پر رش ہو تو اندراج رہ جاتا ہے، صفحے پڑھنے مشکل ہوتے ہیں، ٹوٹل ہاتھ سے جوڑے جاتے ہیں، اور گاہک کے پاس کوئی کاپی نہیں ہوتی اس لیے رقم پر جھگڑا ہوتا ہے۔ رجسٹر گم بھی ہو سکتا ہے، بھیگ یا پھٹ بھی سکتا ہے۔

اچھا کھاتہ، کاغذ کا ہو یا ڈیجیٹل، ہر ادھار سیل بل کے ساتھ لکھتا ہے، ہر ادائیگی کے ساتھ لکھتا ہے کہ کیسے دی گئی، اور ساتھ ساتھ بقایا دکھاتا ہے۔ ہر اندراج کے بعد گاہک کو اس کا بقایا بھیج دیں تو زیادہ تر جھگڑے ختم ہو جاتے ہیں۔ ہر گاہک کی ایک حد رکھیں اور پرانے بقایا پر جلدی پوچھیں، کیونکہ بقایا جتنا پرانا ہو، اس کے واپس آنے کا امکان اتنا کم ہوتا ہے۔

## Nafaa میں

Nafaa ہر گاہک کا کھاتہ رکھتا ہے۔ جو بل پورا ادا نہ ہو وہ خود کھاتے میں چلا جاتا ہے، ہر ادائیگی کے ساتھ طریقہ (کیش، بینک یا والیٹ) درج ہوتا ہے، گاہک کی ادھار کی حد رکھی جا سکتی ہے، اور گاہکوں کی فہرست بقایا کو پرانا ہونے کے حساب سے دکھاتی ہے، ساتھ تیار واٹس ایپ یاد دہانیاں بھی ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:udhaar@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger@ur', kind: 'RELATED' },
  ],
  sortOrder: 52,
  origin: 'translation of content/glossary/money.ts, khata (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/customers/khata',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/modules/customers/directory/api.ts',
    'apps/web/src/modules/customers/directory/messages.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
