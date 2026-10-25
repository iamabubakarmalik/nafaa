/** Urdu: contact page (/ur/contact). Translation of content/pages/contact.ts (export `contact`). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'contact',
  title: 'Nafaa سے رابطہ',
  summary:
    'Nafaa کی ٹیم سے واٹس ایپ، ای میل یا فون پر بات کریں، یا فارم سے پیغام بھیجیں۔ ہم پلان، سیٹ اپ، دوسرے سسٹم سے ڈیٹا لانے اور آپ کے اپنے سافٹ ویئر پروجیکٹ میں مدد کرتے ہیں۔',
  data: { template: 'contact' },
  seoTitle: 'Nafaa سے رابطہ: واٹس ایپ، ای میل اور سیلز',
  seoDescription:
    'Nafaa کی ٹیم سے واٹس ایپ، ای میل یا فون پر رابطہ کریں۔ پلان، سیٹ اپ، ڈیٹا منتقلی یا اپنے سافٹ ویئر پروجیکٹ کے بارے میں پوچھیں۔',
  focusKeyword: 'Nafaa سے رابطہ',
  blocks: [
    {
      id: 'contact-hero',
      type: 'hero',
      layout: 'centered',
      eyebrow: 'رابطہ',
      heading: 'Nafaa بنانے والوں سے بات کریں',
      sub: 'پلان، سیٹ اپ یا اپنے کسی پروجیکٹ کے بارے میں سوال ہے؟ جلدی جواب کے لیے واٹس ایپ پر پیغام بھیجیں، یا نیچے فارم میں لکھیں۔',
      primaryCta: { label: 'واٹس ایپ پر پیغام بھیجیں', href: 'whatsapp', variant: 'primary', trackAs: 'contact-hero:whatsapp' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'contact-hero:demo' },
      badges: ['انگریزی، اردو اور رومن اردو', 'واٹس ایپ پر مدد'],
    },
    {
      id: 'contact-topics',
      type: 'featuresGrid',
      heading: 'ہم کن کاموں میں مدد کرتے ہیں',
      columns: 3,
      items: [
        { icon: 'tag', title: 'پلان اور قیمت', body: 'آپ کے پروڈکٹس، یوزرز اور برانچوں کے حساب سے کون سا پلان ٹھیک رہے گا۔', href: '/pricing' },
        { icon: 'shield-check', title: 'FBR اور PRA انوائس', body: 'FBR، PRA، SRB یا KPRA سے جوڑنا اور بل پر QR کوڈ پرنٹ کرنا۔', href: '/product/fbr' },
        { icon: 'database', title: 'اپنا ڈیٹا لانا', body: 'Excel یا کسی اور سسٹم سے پروڈکٹس، کسٹمرز اور کھاتہ۔', href: '/services/data-migration' },
        { icon: 'building-2', title: 'زیادہ برانچیں', body: 'چین اور بڑی ٹیموں کے لیے سیٹ اپ، رولز اور ٹریننگ۔', href: '/solutions/enterprise' },
        { icon: 'code-xml', title: 'اپنا سافٹ ویئر بنوائیں', body: 'ویب سائٹ، آن لائن اسٹور، موبائل ایپ اور دوسرے ٹولز، آپ کے لیے، دنیا میں کہیں بھی۔', href: '/services/custom-software' },
        { icon: 'circle-question-mark', title: 'ایپ میں مدد', body: 'پہلے سے Nafaa استعمال کر رہے ہیں؟ ایپ کے اندر ہیلپ سینٹر دیکھیں، یا واٹس ایپ کریں۔' },
      ],
    },
    {
      id: 'contact-form',
      type: 'leadForm',
      form: 'contact',
      formType: 'GENERAL',
      heading: 'ہمیں پیغام بھیجیں',
      intro: 'اپنے کاروبار اور اپنی ضرورت کے بارے میں بتائیں۔ ہم ای میل یا واٹس ایپ پر جواب دیتے ہیں، عام طور پر اسی کام کے دن۔',
      successMessage: 'شکریہ۔ آپ کا پیغام Nafaa کی ٹیم تک پہنچ گیا ہے، ہم جلد آپ سے رابطہ کریں گے۔',
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
    'Summary, SEO description and hero: "FBR and PRA invoicing" / "tax invoicing" left out under the Urdu brief (FBR at most once per generic page); the FBR topic card stays.',
  ],
  needsOwner: ['"عام طور پر اسی کام کے دن" (usually the same working day) reply time: confirm the team can keep it, as on the English page.'],
};
