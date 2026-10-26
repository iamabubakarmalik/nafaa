/** Urdu: glossary hub (/ur/glossary). Translation of content/main-pages (glossary hub). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'glossary',
  title: 'الفاظ کی لغت',
  summary:
    'کاروبار اور دکانداری کے الفاظ آسان اردو میں: کھاتہ، ادھار، POS، SKU، مارجن، COD، Z رپورٹ اور بہت کچھ۔ ہر لفظ کے ساتھ Roman Urdu میں مطلب، کسی پاکستانی کاروبار کی مثال، اور یہ کہ Nafaa میں یہ کام کیسے ہوتا ہے۔',
  data: { template: 'hub' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'الفاظ کی لغت',
      heading: 'الفاظ کی لغت',
      sub: 'کاروبار کے الفاظ آسان اردو میں، Roman Urdu میں مطلب کے ساتھ، اور اصل دکان کی ایک مثال کے ساتھ تاکہ بات فوراً سمجھ آ جائے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      layout: 'centered',
      id: 'b0b3f8dacdbb',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'ہر لفظ کے ساتھ', value: 'مطلب، Roman Urdu، ایک مثال، اور Nafaa میں یہ کیسے ہوتا ہے' },
        { label: 'زبان', value: 'اردو، ساتھ میں انگریزی لفظ اور Roman Urdu' },
      ],
      romanUrdu: 'Karobar ke alfaaz asaan zubaan me: khata, udhaar, POS, SKU aur bohat kuch, misaal ke saath.',
      id: 'b1c054483762',
    },
    {
      type: 'cta',
      heading: 'یہ سب ایپ میں دیکھیں',
      body: 'یہاں کے ہر لفظ کی Nafaa میں ایک اسکرین ہے۔ 7 دن کے فری ٹرائل میں خود آزمائیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b31295594f4c',
    },
  ],
  faqKeys: [],
  relations: [
    { ref: 'PAGE:blog@ur', kind: 'RELATED' },
    { ref: 'PAGE:tools@ur', kind: 'RELATED' },
    { ref: 'PAGE:templates@ur', kind: 'RELATED' },
  ],
  seoTitle: 'کاروباری الفاظ کی لغت: POS، کھاتہ اور ٹیکس کے الفاظ اردو میں',
  seoDescription: 'POS، کھاتہ، ادھار، SKU، مارجن، COD اور دوسرے کاروباری الفاظ کے آسان مطلب اردو میں، Roman Urdu اور پاکستانی دکانوں کی مثالوں کے ساتھ۔',
  focusKeyword: 'کاروباری الفاظ اردو میں',
  sortOrder: 20,
  origin: 'translation of the English glossary hub PAGE:glossary (26 Oct 2026)',
  evidence: ['apps/site/src/templates/article/HubTemplates.tsx'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
