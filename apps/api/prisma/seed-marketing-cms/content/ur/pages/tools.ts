/** Urdu: free tools hub (/ur/tools). Translation of content/tools/index.ts (hub). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-tools-free',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا یہ ٹولز واقعی مفت ہیں؟',
    answer:
      'جی ہاں۔ اس صفحے کا ہر کیلکولیٹر اور جنریٹر بغیر اکاؤنٹ کے مفت ہے، جتنی بار چاہیں استعمال کریں۔ یہ آپ کے براؤزر میں چلتے ہیں، اس لیے جو نمبر، نام اور رقم آپ لکھتے ہیں وہ Nafaa کو نہیں جاتی اور کسی سرور پر محفوظ نہیں ہوتی۔ کچھ ٹولز آپ کی دکان کی تفصیل آپ کے اپنے فون یا کمپیوٹر پر یاد رکھتے ہیں تاکہ بار بار نہ لکھنی پڑے۔',
    sourceNote: 'Islands are client components with no network calls; localStorage only in ReceiptMaker and InvoiceGenerator.',
    origin: 'translation of faq tools-hub-free',
    evidence: ['apps/site/src/components/islands/tools/ReceiptMaker.tsx', 'apps/site/src/components/islands/tools/kit.tsx'],
  },
  {
    key: 'ur-page-tools-accuracy',
    locale: 'ur',
    topic: 'tools',
    question: 'ٹولز میں ریٹ اور اصول کہاں سے آتے ہیں؟',
    answer:
      'زیادہ تر ٹولز سیدھا حساب ہیں، اور ہر صفحہ وہ فارمولا دکھاتا ہے جو ٹول استعمال کرتا ہے۔ جہاں ٹول کسی باہر کی بات پر چلتا ہے، جیسے سیلز ٹیکس کا عام ریٹ یا زکوٰۃ کا نصاب، وہاں صفحہ اس کا سرکاری یا عام ذریعہ اور چیک کرنے کی تاریخ لکھتا ہے۔ سونے چاندی کا ریٹ کبھی خود سے نہیں لیا جاتا: اس دن کا ریٹ آپ خود لکھتے ہیں۔',
    sourceNote: 'facts.ts holds every sourced value with its URL and checked date; each TOOL entry lists its sources.',
    origin: 'translation of faq tools-hub-accuracy',
    evidence: ['apps/site/src/components/islands/tools/facts.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'tools',
  title: 'کاروبار کے مفت ٹولز',
  summary:
    'پاکستان کی دکانوں، ریسٹورنٹس اور چھوٹے کاروبار کے لیے مفت کیلکولیٹر اور جنریٹر: پرافٹ مارجن، GST، ڈسکاؤنٹ، بریک ایون، دوبارہ آرڈر کا لیول، فوڈ کاسٹ، ادھار کتنا پرانا ہے اور زکوٰۃ، ساتھ میں بارکوڈ جنریٹر اور رسید بنانے کا ٹول۔ کوئی سائن اپ نہیں، رقم روپے میں، اور سب کچھ آپ کے براؤزر میں چلتا ہے۔',
  data: { template: 'hub' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'مفت ٹولز',
      heading: 'کاروبار کے مفت ٹولز',
      sub: 'وہ کیلکولیٹر اور جنریٹر جو دکاندار کے ہر ہفتے کے سوالوں کا جواب دیتے ہیں، روپے میں اور فارمولے کے ساتھ۔ کوئی سائن اپ نہیں، بس کھولیں اور حساب لگائیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      layout: 'centered',
      id: 'b48eea6f5831',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'قیمت لگانا', value: 'پرافٹ مارجن، ڈسکاؤنٹ، GST اور بریک ایون کیلکولیٹر' },
        { label: 'اسٹاک اور کچن', value: 'دوبارہ آرڈر کا لیول، فوڈ کاسٹ اور بارکوڈ جنریٹر' },
        { label: 'پیسہ', value: 'ادھار کتنا پرانا ہے، کاروباری اسٹاک پر زکوٰۃ اور پرنٹ ہونے والی رسید' },
        { label: 'پرائیویسی', value: 'آپ کے براؤزر میں چلتا ہے؛ جو لکھیں وہ نہ کہیں جاتا ہے نہ محفوظ ہوتا ہے' },
      ],
      romanUrdu: 'Dukaan ke rozana hisaab ke free tools: Profit, Discount, tax, Stock order, khata aur Zakat. Koi sign-up nahi, sab rupay me, aur aap ka data aap ke browser me hi rehta hai.',
      id: 'bd84dcefe805',
    },
    {
      type: 'richText',
      markdown:
        '## یہ ٹولز کیسے بنے ہیں\n\n' +
        'ہر ٹول ایک سوال کا جواب دیتا ہے۔ صفحے پر اس کا فارمولا ہے، روپے میں حل کی ہوئی ایک مثال ہے، اور وہ سوال ہیں جو لوگ اس کے بارے میں پوچھتے ہیں۔ جہاں کوئی اصول یا ریٹ باہر سے آتا ہے، جیسے سیلز ٹیکس کا عام ریٹ یا زکوٰۃ کا نصاب، وہاں نتیجے کے نیچے اس کا ذریعہ اور چیک کرنے کی تاریخ لکھی ہے۔ کچھ بھی سرور پر محفوظ نہیں ہوتا۔\n\n' +
        'جب یہی حساب ہر پروڈکٹ اور ہر بل پر کرنا ہو تو کیلکولیٹر کافی نہیں رہتا۔ [Nafaa](/ur/product/pos) یہ حساب سیل کے ساتھ ساتھ خود کرتا ہے: ہر پروڈکٹ کا مارجن [رپورٹس](/ur/product/reports) میں، دوبارہ آرڈر کی مقدار [کم اسٹاک کی لسٹ](/ur/product/inventory) میں، ادھار کتنا پرانا ہے یہ [کھاتے](/ur/product/khata) میں، اور [ریسٹورنٹ](/ur/industries/restaurant) کے لیے ریسپی کی کاسٹ۔ ساتھ رکھنے کے لیے پرنٹ ہونے والی شیٹس چاہئیں تو مفت [ٹیمپلیٹس](/ur/templates) دیکھیں، اور مشکل لفظوں کے آسان مطلب [الفاظ کی لغت](/ur/glossary) میں ہیں۔',
      id: 'b152dc31873d',
    },
    { type: 'faq', heading: 'عام سوال', id: 'bcdbb13d7343' },
    {
      type: 'cta',
      heading: 'یہ حساب خود بخود کروائیں',
      body: '7 دن کا فری ٹرائل شروع کریں، اور ہر بل سے آپ کا پرافٹ، اسٹاک اور کھاتہ خود اپ ڈیٹ ہو۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b8284d7ba1cd',
    },
  ],
  faqKeys: ['ur-page-tools-free', 'ur-page-tools-accuracy'],
  relations: [
    { ref: 'PAGE:templates@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-calculate-profit-margin@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:reports@ur', kind: 'RELATED' },
    { ref: 'PAGE:glossary@ur', kind: 'RELATED' },
  ],
  seoTitle: 'دکان کے لیے مفت کیلکولیٹر اور ٹولز (پاکستان)',
  seoDescription: 'پاکستانی دکانوں کے لیے مفت ٹولز: پرافٹ مارجن، GST، ڈسکاؤنٹ، بریک ایون، دوبارہ آرڈر، فوڈ کاسٹ، ادھار اور زکوٰۃ کیلکولیٹر، بارکوڈ اور رسید۔ کوئی سائن اپ نہیں۔',
  focusKeyword: 'مفت کاروباری ٹولز',
  sortOrder: 21,
  origin: 'translation of content/tools/index.ts hub (26 Oct 2026)',
  evidence: ['apps/site/src/templates/article/HubTemplates.tsx', 'apps/site/src/components/islands/tools/ToolIsland.tsx'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
