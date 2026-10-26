/** Urdu: roadmap page (/ur/roadmap). Translation of content/main-pages/hubs.ts (roadmap). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-roadmap-dates',
    locale: 'ur',
    topic: 'roadmap',
    question: 'Nafaa کے روڈ میپ پر "جلد آ رہا ہے" والے فیچر کب تیار ہوں گے؟',
    answer:
      'ہم تاریخ صرف تب بتاتے ہیں جب کوئی فیچر تیار ہونے کے قریب ہو، اور جیسے ہی وہ لائیو ہوتا ہے روڈ میپ پر نظر آ جاتا ہے۔ اس سے پہلے "جلد آ رہا ہے" والا فیچر کبھی موجود کہہ کر نہیں بیچا جاتا۔ اگر آپ کو کوئی چیز ابھی چاہیے تو ہماری ٹیم اکثر اسے کسٹم پراجیکٹ کے طور پر بنا سکتی ہے۔',
    sourceNote: 'Roadmap policy; status badges on product, solution and integration entries.',
    origin: 'translation of faq hub-roadmap-dates',
    evidence: ['apps/site/src/templates/roadmap'],
  },
  {
    key: 'ur-page-roadmap-every-business',
    locale: 'ur',
    topic: 'getting-started',
    question: 'روڈ میپ کے علاوہ، کیا Nafaa آج صرف دکانوں کے لیے ہے؟',
    answer:
      'نہیں۔ Nafaa کی شروعات دکان کے کاؤنٹر سے ہوئی، لیکن یہی اکاؤنٹ ریسٹورنٹ (میزیں، کچن ٹکٹ، ڈیلیوری)، آن لائن سیلر (اپنا اسٹور اور Nafaa Bazaar مارکیٹ پلیس)، سروس والے کاروبار (بکنگ، ممبرشپ، کمیشن)، ہول سیلر (کارٹن کی قیمت، ادھار کی حد، سپلائر) اور کئی برانچوں والی کمپنیاں بھی چلاتا ہے۔ ہر کاروبار کو اسی POS، اسٹاک، کھاتے اور رپورٹس پر اپنی الگ اسکرینیں ملتی ہیں۔',
    sourceNote: 'apps/web/src/industries (31 packs), restaurant, multi-branch, online orders and marketplace publishing modules.',
    origin: 'translation of faq every-business',
    evidence: ['apps/web/src/industries', 'apps/web/src/modules/multi-branch', 'apps/api/src/integrations/online-orders', 'apps/api/src/marketplace/publishing'],
  },
  {
    key: 'ur-page-roadmap-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'آج Nafaa چلانے کے لیے کیا کمپیوٹر ضروری ہے، یا یہ ابھی روڈ میپ پر ہے؟',
    answer:
      'کمپیوٹر ضروری نہیں، اور یہ آج ہی ہو سکتا ہے۔ Nafaa ویب براؤزر میں چلتا ہے، اس لیے آپ کا موجودہ فون، ٹیبلٹ یا کمپیوٹر کافی ہے۔ بارکوڈ اسکینر اور رسید پرنٹر بعد میں لگ سکتے ہیں، شروع کرنے کے لیے ضروری نہیں۔ انٹرنیٹ نہ ہو تو بھی کاؤنٹر چلتا رہتا ہے اور کنکشن واپس آنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'roadmap',
  relations: [
    { ref: 'PAGE:product@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:ai-assistant@ur', kind: 'RELATED' },
    { ref: 'PAGE:pricing@ur', kind: 'RELATED' },
  ],
  title: 'روڈ میپ',
  seoTitle: 'Nafaa روڈ میپ: کیا بیٹا میں ہے اور کیا جلد آ رہا ہے',
  seoDescription:
    'Nafaa نے حال میں کیا لانچ کیا اور آگے کیا بن رہا ہے۔ بیٹا فیچر آج چلتے ہیں؛ "جلد آ رہا ہے" والے فیچر صرف منصوبہ ہیں اور کبھی موجود کہہ کر نہیں بیچے جاتے۔',
  focusKeyword: 'Nafaa روڈ میپ',
  summary:
    'Nafaa کا روڈ میپ بتاتا ہے کہ حال میں کیا لانچ ہوا، کیا بیٹا میں ہے اور کیا جلد آ رہا ہے۔ بیٹا فیچر ایپ میں چلتے ہیں اور شروع کے صارفین کے ساتھ بہتر کیے جا رہے ہیں؛ "جلد آ رہا ہے" والے فیچر منصوبے میں ہیں اور ابھی بنے نہیں، اور ہم انہیں کبھی موجود کہہ کر نہیں بیچتے۔',
  data: { template: 'roadmap' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'سب کے سامنے بن رہا ہے',
      heading: 'ہم آگے کیا بنا رہے ہیں',
      sub: 'دیکھیں کیا بیٹا میں ہے، کیا جلد آ رہا ہے، اور ہمیں بتائیں آپ کے کاروبار کو کیا چاہیے۔ اس صفحے کی کوئی چیز تب تک موجود کہہ کر نہیں بیچی جاتی جب تک وہ ایپ میں لائیو نہ ہو۔',
      primaryCta: { label: 'فیچر کی فرمائش کریں', href: 'whatsapp', variant: 'primary', trackAs: 'hero_whatsapp' },
      secondaryCta: { label: 'لائیو فیچر دیکھیں', href: '/ur/product', variant: 'secondary', trackAs: 'hero_product' },
      layout: 'centered',
      id: 'b20943f6a800',
    },
    {
      type: 'answerBox',
      heading: 'یہ صفحہ کیسے پڑھیں',
      facts: [
        { label: 'لائیو', value: 'آج ایپ میں چلتا ہے؛ سائٹ پر کہیں کوئی نشان نہیں' },
        { label: 'بیٹا', value: 'ایپ میں چلتا ہے اور شروع کے صارفین کے ساتھ بہتر کیا جا رہا ہے' },
        { label: 'جلد آ رہا ہے', value: 'منصوبے میں ہے، ابھی بنا نہیں؛ کبھی موجود کہہ کر نہیں بیچا جاتا' },
      ],
      romanUrdu: 'Live: aaj kaam karta hai. Beta: kaam karta hai, behtar ho raha hai. Jald aa raha hai: abhi bana nahi, sirf mansooba hai.',
      id: 'bf16c864abe2',
    },
    {
      type: 'diagram',
      heading: 'لانچ ہو چکا اور آگے',
      caption: 'حال کی ریلیز اور آگے کیا آ رہا ہے۔ تاریخ وہ دن ہے جب تبدیلی لائیو ہوئی؛ منصوبے والی چیزوں کی تاریخ لانچ ہونے تک نہیں ہوتی۔',
      diagram: {
        kind: 'timeline',
        items: [
          { date: '13 اکتوبر 2026', label: 'ایپ کا نیا ڈیزائن', note: 'صاف سائیڈ بار، ٹاپ بار اور سیٹنگز، لائٹ اور ڈارک دونوں میں۔' },
          { date: '14 اکتوبر 2026', label: 'Shopify ایپ انسٹال', note: 'Shopify کے انسٹال والے طریقے سے Shopify اسٹور جوڑیں۔' },
          { date: 'نیا', label: 'AI بزنس اسسٹنٹ', note: 'اپنی سیل، اسٹاک اور کھاتے کے بارے میں سادہ انگریزی یا رومن اردو میں پوچھیں۔' },
        ],
        animate: true,
      },
      theme: 'muted',
      id: 'bf97013d8ab8',
    },
    {
      type: 'entryGrid',
      heading: 'پروڈکٹ',
      entryType: 'PRODUCT',
      filter: { status: ['beta', 'coming'] },
      sort: 'order',
      limit: 60,
      layout: 'list',
      id: 'b2b902bc9be2',
    },
    {
      type: 'entryGrid',
      heading: 'سلوشنز',
      entryType: 'SOLUTION',
      filter: { status: ['beta', 'coming'] },
      sort: 'order',
      limit: 60,
      layout: 'list',
      id: 'b2388eb0c644',
    },
    {
      type: 'entryGrid',
      heading: 'انٹیگریشنز',
      entryType: 'INTEGRATION',
      filter: { status: ['beta', 'coming'] },
      sort: 'order',
      limit: 60,
      layout: 'list',
      id: 'ba1de1c8a810',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'b5d931b90687' },
    {
      type: 'cta',
      heading: 'جو چاہیے وہ یہاں نہیں؟',
      body: 'ہمیں بتائیں آج آپ کا کاروبار کیسے چلتا ہے اور آگے آپ کو کیا چاہیے۔',
      primaryCta: { label: 'واٹس ایپ پر میسج کریں', href: 'whatsapp', variant: 'primary', trackAs: 'cta_whatsapp' },
      secondaryCta: { label: 'ہم سے رابطہ کریں', href: '/ur/contact', variant: 'ghost', trackAs: 'cta_contact' },
      id: 'b027cafb1e2d',
    },
  ],
  faqKeys: ['ur-page-roadmap-dates', 'ur-page-roadmap-every-business', 'ur-page-roadmap-devices'],
  sortOrder: 6,
  origin: 'translation of content/main-pages/hubs.ts (26 Oct 2026)',
  evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
