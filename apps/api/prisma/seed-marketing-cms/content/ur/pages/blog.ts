/** Urdu: blog hub (/ur/blog). Translation of content/main-pages (blog hub). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'blog',
  title: 'بلاگ',
  summary:
    'پاکستان کے کاروباری لوگوں کے لیے کام کی باتیں: بلنگ، اسٹاک، کھاتہ، ادھار، قیمت لگانا اور بڑھتا ہوا کاروبار چلانا۔ ہر مضمون شائع ہونے سے پہلے ایپ اور سرکاری ذرائع سے ملا کر چیک کیا جاتا ہے، اور اردو میں وہ مضامین ہیں جو دکانداروں کے سب سے زیادہ کام آتے ہیں۔',
  data: { template: 'hub' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'بلاگ',
      heading: 'بلاگ',
      sub: 'پاکستان کے کاروباری لوگوں کے لیے کام کی باتیں: بلنگ، اسٹاک، کھاتہ، قیمتیں، ڈیجیٹل پیمنٹ، رمضان اور عید کا سیزن، اور کاروبار بڑھانا۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      layout: 'centered',
      id: 'ba673445dae2',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'موضوع', value: 'طریقہ کار گائیڈز، کاروبار کے لحاظ سے گائیڈز، کاروبار چلانا' },
        { label: 'چیک شدہ', value: 'ہر بات ایپ اور سرکاری ذرائع سے ملا کر چیک کی گئی' },
      ],
      romanUrdu: 'Dukaan aur karobar chalane ke asaan guides: bill, stock, khata, FBR/PRA, online sale aur Nafaa ki nayi cheezein.',
      id: 'b8eefb8668d6',
    },
    {
      type: 'cta',
      heading: 'یہ باتیں اپنے کاروبار میں آزمائیں',
      body: '7 دن کا فری ٹرائل شروع کریں اور اپنا کاروبار Nafaa پر چلائیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'bb98d3660c86',
    },
  ],
  faqKeys: [],
  relations: [
    { ref: 'PAGE:glossary@ur', kind: 'RELATED' },
    { ref: 'PAGE:tools@ur', kind: 'RELATED' },
    { ref: 'PAGE:templates@ur', kind: 'RELATED' },
  ],
  seoTitle: 'Nafaa بلاگ: پاکستان کی دکانوں اور کاروبار کے لیے گائیڈز',
  seoDescription: 'پاکستان میں بلنگ، اسٹاک، کھاتہ، ادھار، قیمت لگانے اور کاروبار بڑھانے پر آسان اردو گائیڈز، ہر بات ایپ اور سرکاری ذرائع سے چیک کی ہوئی۔',
  focusKeyword: 'دکانداری کے طریقے',
  sortOrder: 20,
  origin: 'translation of the English blog hub PAGE:blog (26 Oct 2026)',
  evidence: ['apps/site/src/templates/article/HubTemplates.tsx'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
