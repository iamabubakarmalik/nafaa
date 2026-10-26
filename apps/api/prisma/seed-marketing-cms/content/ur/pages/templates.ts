/** Urdu: free templates hub (/ur/templates). Translation of content/templates/index.ts (hub). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-templates-free',
    locale: 'ur',
    topic: 'templates',
    question: 'کیا یہ ٹیمپلیٹس مفت استعمال اور شیئر کر سکتے ہیں؟',
    answer:
      'جی ہاں۔ انہیں ڈاؤن لوڈ کریں، بدلیں، پرنٹ کریں اور جتنی بار چاہیں شیئر کریں، اپنے کاروبار کے لیے یا اپنے گاہکوں کے لیے۔ نہ اکاؤنٹ چاہیے نہ ای میل۔ یہ عام Excel فائلیں ہیں، اس لیے Google Sheets اور زیادہ تر دوسری اسپریڈشیٹ ایپس میں بھی کھلتی ہیں۔ نیچے فٹر میں ایک چھوٹی سی لائن لکھی ہے کہ ٹیمپلیٹ کہاں سے آیا۔',
    sourceNote: 'Files in apps/site/public/downloads, built by build-files.ts with a footer credit.',
    origin: 'translation of faq templates-hub-free',
    evidence: ['apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts'],
  },
  {
    key: 'ur-page-templates-software',
    locale: 'ur',
    topic: 'templates',
    question: 'کاروبار کو اسپریڈشیٹ چھوڑ کر سافٹ ویئر پر کب آنا چاہیے؟',
    answer:
      'جب ایک ہی نمبر دو بار لکھنا پڑے: ایک بار کاؤنٹر پر اور پھر شیٹ میں۔ ایسا عام طور پر تب ہوتا ہے جب بل، ادھار اور اسٹاک کی تبدیلیاں دن میں بہت بار ہوں، یا جب ایک سے زیادہ بندے یا برانچ کو وہی حساب چاہیے۔ سافٹ ویئر ہر سیل ایک بار لکھتا ہے اور اسی سے اسٹاک، کھاتہ اور رپورٹس اپ ڈیٹ کرتا ہے، پھر شیٹس کی ضرورت نہیں رہتی۔',
    sourceNote: 'General guidance; Nafaa features referenced on the hub link to their product pages.',
    origin: 'translation of faq templates-hub-software',
    evidence: ['apps/web/src/modules/pos/engine/PosScreen.tsx'],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'templates',
  title: 'کاروبار کے مفت ٹیمپلیٹس',
  summary:
    'پاکستان کی دکانوں اور چھوٹے کاروبار کے لیے مفت Excel ٹیمپلیٹس: پروڈکٹ امپورٹ شیٹ، کھاتہ (ادھار) رجسٹر، اسٹاک گنتی کی شیٹ، روز کی گلہ کلوزنگ، پرائس لسٹ، پرچیز آرڈر اور انوائس۔ فارمولے پہلے سے لگے ہیں، A4 پر پرنٹ ہوتے ہیں، اور ہر ایک کے ساتھ مختصر گائیڈ ہے۔',
  data: { template: 'hub' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'مفت ٹیمپلیٹس',
      heading: 'کاروبار کے مفت ٹیمپلیٹس',
      sub: 'ان رجسٹروں کی تیار Excel شیٹس جو ہر دکان رکھتی ہے، حساب پہلے سے لگا ہوا۔ ڈاؤن لوڈ کریں، بھریں اور پرنٹ کریں۔ کوئی سائن اپ نہیں، کوئی ای میل نہیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      layout: 'centered',
      id: 'bf64fa8bc405',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'گاہک اور کیش', value: 'کھاتہ (ادھار) رجسٹر، روز کی گلہ کلوزنگ شیٹ' },
        { label: 'اسٹاک اور خریداری', value: 'اسٹاک گنتی کی شیٹ، پرچیز آرڈر، پروڈکٹ امپورٹ شیٹ' },
        { label: 'بیچنا', value: 'پرائس لسٹ، سادہ انوائس' },
        { label: 'فارمیٹ', value: 'Excel (.xlsx): Excel اور Google Sheets میں کھلتی ہے، A4 پر پرنٹ ہوتی ہے' },
      ],
      romanUrdu: 'Dukaan ke registers ke free Excel templates: khata, galla closing, Stock ginti, price list, purchase order aur invoice. Hisaab khud lagta hai, A4 par print hota hai, sign-up nahi chahiye.',
      id: 'b43b74f99152',
    },
    {
      type: 'richText',
      markdown:
        '## دکانوں کے حساب رکھنے کے طریقے کے مطابق بنے\n\n' +
        'ہر ٹیمپلیٹ اس کاغذی رجسٹر کی جگہ لیتا ہے جو زیادہ تر دکانیں پہلے سے رکھتی ہیں۔ ٹوٹل آپ کے لیے خود بنتے ہیں، اور فائل کے اندر ایک گائیڈ شیٹ بھی ہے۔ نمونے کی لائنیں دکھاتی ہیں کہ کیسے بھرنا ہے؛ انہیں مٹائیں اور شروع کریں۔ فائلوں میں کالم کے نام انگریزی میں ہیں۔ اسپریڈشیٹ کے بغیر جلدی حساب کے لیے مفت [ٹولز](/ur/tools) دیکھیں۔\n\n' +
        'جب ایک ہی نمبر دو بار لکھنے سے تھک جائیں، تو [Nafaa](/ur/product/pos) ہر سیل ایک بار لکھتا ہے اور اسی سے [کھاتہ](/ur/product/khata)، [اسٹاک](/ur/product/inventory) اور [خریداری](/ur/product/purchasing) اپ ڈیٹ رکھتا ہے۔ [پروڈکٹ امپورٹ ٹیمپلیٹ](/ur/templates/product-import-template) آپ کی پروڈکٹ لسٹ ایک ہی اپ لوڈ میں Nafaa میں لے آتا ہے۔ ادھار کم کرنے کے عملی طریقے ہمارے [بلاگ](/ur/blog/how-to-reduce-udhaar) میں ہیں۔',
      id: 'b93abf1b4e41',
    },
    { type: 'faq', heading: 'عام سوال', id: 'bd833c93fd6e' },
    {
      type: 'cta',
      heading: 'ہر بل سے آپ کے رجسٹر خود بھریں',
      body: '7 دن کا فری ٹرائل شروع کریں: سیل، اسٹاک اور کھاتہ کاؤنٹر سے ہی اپ ڈیٹ ہوتے ہیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'be1b04021cdc',
    },
  ],
  faqKeys: ['ur-page-templates-free', 'ur-page-templates-software'],
  relations: [
    { ref: 'PAGE:tools@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar@ur', kind: 'RELATED' },
  ],
  seoTitle: 'دکان کے لیے مفت Excel ٹیمپلیٹس: کھاتہ، اسٹاک، انوائس',
  seoDescription: 'پاکستانی دکانوں کے لیے مفت Excel ٹیمپلیٹس: کھاتہ ادھار رجسٹر، اسٹاک گنتی شیٹ، گلہ کلوزنگ، پرائس لسٹ، پرچیز آرڈر، انوائس اور پروڈکٹ امپورٹ شیٹ۔',
  focusKeyword: 'دکان کے لیے Excel ٹیمپلیٹ',
  sortOrder: 22,
  origin: 'translation of content/templates/index.ts hub (26 Oct 2026)',
  evidence: ['apps/site/src/templates/article/HubTemplates.tsx', 'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
