/** Urdu: Glossary term loyalty points (/ur/glossary/loyalty-points). Translation of content/glossary/counter.ts (loyalty-points). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'loyalty-points',
  title: 'لائلٹی پوائنٹس (Loyalty Points)',
  seoTitle: 'لائلٹی پوائنٹس (Loyalty Points) کیا ہے؟ مطلب اور مثال',
  summary: 'لائلٹی پوائنٹس وہ پوائنٹس ہیں جو گاہک خریداری پر کماتا ہے اور بعد میں ڈسکاؤنٹ یا تحفے کے لیے استعمال کرتا ہے، تاکہ وہ بار بار آئے۔',
  data: {
    term: 'لائلٹی پوائنٹس (Loyalty Points)',
    definition: 'لائلٹی پوائنٹس وہ پوائنٹس ہیں جو گاہک خریداری پر کماتا ہے اور بعد میں ڈسکاؤنٹ یا تحفے کے لیے استعمال کرتا ہے، تاکہ وہ بار بار آئے۔',
    definitionRomanUrdu: 'Loyalty points woh points hain jo gahak khareedari par kamata hai aur baad me discount ya gift ke liye istemal karta hai, taake woh baar baar aaye.',
    example: 'ایک بیکری ہر 100 روپے کی خریداری پر 1 پوائنٹ دیتی ہے؛ 100 پوائنٹس کا مطلب 100 روپے کا ڈسکاؤنٹ ہے۔ جو فیملی مہینے میں 12,000 روپے خرچ کرتی ہے وہ 120 پوائنٹس کماتی ہے اور انہیں عید پر استعمال کرتی ہے۔',
    alsoKnownAs: ['ریوارڈ پوائنٹس', 'reward points', 'loyalty programme', 'loyalty card'],
  },
  blocks: [
    {
      id: 'bcb40c3ccedc',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پوائنٹس تب اچھے چلتے ہیں جب اصول اتنے آسان ہوں کہ کاؤنٹر پر ایک جملے میں سمجھائے جا سکیں۔ دکان طے کرتی ہے کہ فی روپیہ کتنے پوائنٹس ملیں گے، ایک پوائنٹ کی ویلیو کیا ہے، کم از کم کتنے پوائنٹس پر استعمال ہو سکتے ہیں، اور پوائنٹس کب ختم ہوں گے۔ جو پوائنٹس استعمال نہیں ہوئے وہ دکان کا ایک وعدہ ہیں جو اسے پورا کرنا ہے، اس لیے مالک کو ہر وقت ان کی کل ویلیو معلوم ہونی چاہیے۔

پاکستان میں گاہک کا موبائل نمبر ہی قدرتی لائلٹی کارڈ ہے۔ ہر بار خریداری کے بعد بیلنس کے ساتھ واٹس ایپ میسج گاہک کو واپس آنے کی یاد دلاتا ہے۔ پروگرام کا نتیجہ ناپیں: پوائنٹس کی کاسٹ کا موازنہ ممبرز کی بار بار کی سیل سے کریں۔

## Nafaa میں

Nafaa کا لائلٹی پیج اصول، ممبر لیولز اور پوائنٹس ختم ہونے کی مدت سیٹ کرتا ہے۔ یہ باقی پوائنٹس ان کی روپے میں ویلیو کے ساتھ دکھاتا ہے، ساتھ ہی دن اور برانچ کے حساب سے دیے اور استعمال ہوئے پوائنٹس، ہر ممبر کی ہسٹری، اور ہاتھ سے دیے گئے تحفے یا درستگیاں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:discount@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:loyalty@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms@ur', kind: 'RELATED' },
  ],
  sortOrder: 58,
  origin: 'translation of content/glossary/counter.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
