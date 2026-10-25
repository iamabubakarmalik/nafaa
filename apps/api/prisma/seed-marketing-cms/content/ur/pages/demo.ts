/** Urdu: demo booking page (/ur/demo). Translation of content/pages/contact.ts (export `demo`). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'demo',
  title: 'ڈیمو بک کریں',
  summary:
    'Nafaa کا مفت لائیو ڈیمو بک کریں۔ ہماری ٹیم کا کوئی فرد آپ کے کاروبار کے حساب سے کاؤنٹر، اسٹاک، کھاتہ، آن لائن آرڈر اور رپورٹس دکھاتا ہے، اور آپ کے سوالوں کے جواب دیتا ہے۔',
  data: { template: 'contact' },
  seoTitle: 'Nafaa کا مفت ڈیمو بک کریں: POS اور بزنس سافٹ ویئر',
  seoDescription:
    'اپنے کاروبار کے لیے Nafaa چلتا ہوا دیکھیں: POS، اسٹاک، کھاتہ، آن لائن اسٹور اور رپورٹس۔ دن اور وقت چنیں، ڈیمو مفت ہے۔',
  focusKeyword: 'POS سافٹ ویئر ڈیمو',
  blocks: [
    {
      id: 'demo-hero',
      type: 'hero',
      layout: 'centered',
      eyebrow: 'مفت ڈیمو',
      heading: 'اپنے جیسے کاروبار پر Nafaa چلتا ہوا دیکھیں',
      sub: 'دن اور وقت چنیں۔ ہم آپ کو وہی اسکرینیں دکھاتے ہیں جو آپ کا کاروبار استعمال کرے گا، اور آپ کے سوالوں کے جواب وہیں دیتے ہیں، انگریزی، اردو یا رومن اردو میں۔',
      primaryCta: { label: 'وقت چنیں', href: '#demo-form', variant: 'primary', trackAs: 'demo-hero:form' },
      secondaryCta: { label: '7 دن کا فری ٹرائل شروع کریں', href: 'signup', variant: 'secondary', trackAs: 'demo-hero:trial' },
      badges: ['مفت', 'آن لائن یا واٹس ایپ ویڈیو پر', 'کارڈ کی ضرورت نہیں'],
    },
    {
      id: 'demo-steps',
      type: 'steps',
      heading: 'ڈیمو کیسے ہوتا ہے',
      items: [
        { title: 'وقت بک کریں', body: 'فارم میں وہ دن اور وقت لکھیں جو آپ کے لیے ٹھیک ہو۔' },
        { title: 'ہم کنفرم کرتے ہیں', body: 'ہماری ٹیم واٹس ایپ یا ای میل پر وقت کنفرم کرتی ہے اور پوچھتی ہے کہ آپ کیا بیچتے ہیں۔' },
        { title: 'لائیو دیکھیں', body: 'ہم آپ کے کاروبار کے لیے بلنگ، اسٹاک، کھاتہ اور رپورٹس چلا کر دکھاتے ہیں۔' },
        { title: 'جب چاہیں شروع کریں', body: '7 دن کا فری ٹرائل شروع کریں۔ آپ کی پروڈکٹ لسٹ لانے میں ہم مدد کر سکتے ہیں۔' },
      ],
    },
    {
      id: 'demo-form',
      anchor: 'demo-form',
      type: 'leadForm',
      form: 'demo',
      heading: 'اپنا ڈیمو بک کریں',
      intro: 'بتائیں کہ ہم کب کال کریں، اور اپنے کاروبار کے بارے میں تھوڑا سا: آپ کیا بیچتے ہیں، کتنی برانچیں ہیں، اور کیا آپ کو FBR یا PRA انوائس کی ضرورت ہے۔',
      successMessage: 'آپ کی ڈیمو کی درخواست مل گئی ہے۔ ہم واٹس ایپ یا ای میل پر آپ سے وقت کنفرم کریں گے۔ شکریہ!',
      whatsapp: true,
    },
  ] as SeedEntry['blocks'],
  origin: 'translation of content/pages/contact.ts (26 Oct 2026)',
  evidence: [
    'apps/api/src/admin-marketing/public-tracking/public-tracking.controller.ts',
    'apps/site/src/components/islands/LeadForm.tsx',
    'apps/api/prisma/seed-marketing-cms/content/settings.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [
    'Summary, SEO description and the "See it live" step: FBR/PRA and tax invoices left out under the Urdu brief (FBR at most once per generic page); the form intro keeps the neutral question.',
  ],
  needsOwner: ['Demo channel: "آن لائن یا واٹس ایپ ویڈیو پر" (online or on WhatsApp video) is the assumed format, as on the English page; confirm.'],
};
