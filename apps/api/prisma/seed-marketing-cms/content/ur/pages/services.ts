/** Urdu: services hub page (/ur/services). Translation of content/main-pages/hubs.ts (services). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-services-price',
    locale: 'ur',
    topic: 'services',
    question: 'Nafaa کی ٹیم کسی سافٹ ویئر پروجیکٹ کی قیمت کیسے طے کرتی ہے؟',
    answer:
      'ایک چھوٹی کال کے بعد ہم لکھتے ہیں کہ کیا بنے گا اور اس کام کی ایک طے شدہ قیمت بھیجتے ہیں، PKR یا USD میں۔ کام بنتے ہوئے آپ اسے مرحلہ وار دیکھتے ہیں۔ اگر بعد میں آپ کام بدلنا چاہیں تو ہم پہلے اس تبدیلی کی قیمت بتاتے ہیں، اور آپ کی رضامندی کے بعد ہی شروع کرتے ہیں۔',
    sourceNote: 'Service process (owner decision: worldwide services via "Quote lein" form; quote form takes PKR or USD).',
    origin: 'translation of faq mp-services-price',
    evidence: ['apps/site/src/components/islands/LeadForm.tsx'],
  },
  {
    key: 'ur-page-services-worldwide',
    locale: 'ur',
    topic: 'services',
    question: 'کیا Nafaa کی ٹیم پاکستان سے باہر کے کاروباروں کے لیے بھی کسٹم سافٹ ویئر بناتی ہے؟',
    answer:
      'جی ہاں۔ Nafaa بنانے والی ٹیم پاکستان اور باہر کے کاروباروں کے لیے کسٹم سافٹ ویئر، ویب سائٹس، آن لائن اسٹور اور موبائل ایپس بناتی ہے۔ سروسز کے صفحے پر "کوٹیشن لیں" فارم سے انگریزی یا اردو میں بتائیں کہ آپ کو کیا چاہیے، اور کام شروع ہونے سے پہلے ہم پلان، وقت اور قیمت کے ساتھ جواب دیتے ہیں۔',
    sourceNote: 'Owner decision (20 Oct 2026): worldwide services through the "Quote lein" form.',
    origin: 'translation of faq services-worldwide',
    evidence: ['docs/marketing-site/PLAN.md'],
  },
  {
    key: 'ur-page-services-need',
    locale: 'ur',
    topic: 'services',
    question: 'کیا Nafaa استعمال شروع کرنے کے لیے کوئی سروس لینا ضروری ہے؟',
    answer:
      'نہیں۔ Nafaa آپ خود شروع کر سکتے ہیں: فری ٹرائل کے لیے سائن اپ کریں، اپنی پروڈکٹس ڈالیں اور بل بنانا شروع کریں۔ سروسز تب کے لیے ہیں جب آپ چاہیں کہ کام ہماری ٹیم کرے، جیسے آپ کا ڈیٹا منتقل کرنا، ہارڈ ویئر یا ٹیکس انوائس سیٹ کرنا، اسٹاف کو ٹریننگ دینا، یا کچھ کسٹم بنانا۔',
    sourceNote: 'Self-serve signup and onboarding; services optional.',
    origin: 'translation of faq hub-services-need',
    evidence: ['apps/web/src/modules/onboarding', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx'],
  },
  {
    key: 'ur-page-services-migration',
    locale: 'ur',
    topic: 'services',
    question: 'Nafaa کی سروس ٹیم میرے پرانے سسٹم سے کیا کیا منتقل کر سکتی ہے؟',
    answer:
      'قیمت، کاسٹ، بارکوڈ اور اسٹاک کے ساتھ پروڈکٹس، پرانے ادھار کے ساتھ کسٹمرز، اور سپلائرز اس کے ساتھ جو آپ نے انہیں دینا ہے۔ ہم Excel یا CSV فائلیں، پرانے سافٹ ویئر کا ایکسپورٹ یا رجسٹر کی تصویریں لیتے ہیں۔ پروڈکٹس ایپ کے اپنے امپورٹ سے پہلے آزمائشی چلا کر جاتی ہیں، بیلنس پرانے کھاتے اور سپلائر بیلنس کے طور پر جاتے ہیں، اور شروع کرنے سے پہلے ہم آپ کے ساتھ ٹوٹل چیک کرتے ہیں۔',
    sourceNote: 'Product bulk import (dry run); customer opening balance (Purana khata); supplier opening balance.',
    origin: 'translation of faq mp-migration-what',
    evidence: [
      'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
      'apps/web/src/modules/customers',
      'apps/web/src/modules/purchasing/suppliers',
    ],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'services',
  relations: [
    { ref: 'SOLUTION:enterprise@ur', kind: 'RELATED' },
    { ref: 'PAGE:product@ur', kind: 'RELATED' },
    { ref: 'PAGE:contact@ur', kind: 'RELATED' },
  ],
  title: 'سروسز',
  summary:
    'Nafaa بنانے والی ٹیم کی سروسز، پاکستان اور دنیا بھر کے کاروباروں کے لیے: کسٹم سافٹ ویئر، ویب سائٹس، ای کامرس اسٹور اور موبائل ایپس، اور Nafaa کے سیٹ اپ میں مدد جیسے ڈیٹا منتقلی، ہارڈ ویئر اور ٹریننگ۔ ہر پروجیکٹ "کوٹیشن لیں" درخواست سے شروع ہوتا ہے اور PKR یا USD میں ایک طے شدہ قیمت ملتی ہے۔',
  data: { template: 'hub', hubOf: 'SERVICE' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'سافٹ ویئر سروسز',
      heading: 'جس سافٹ ویئر پر آپ کا کاروبار چلتا ہے، وہ ہم بناتے ہیں',
      sub: 'Nafaa بنانے والے انجینئر پاکستان اور باہر کے کلائنٹس کے لیے کسٹم سافٹ ویئر، ویب سائٹس، آن لائن اسٹور اور موبائل ایپس بناتے ہیں، اور Nafaa کے کسٹمرز کو منتقل ہونے، سیٹ اپ کرنے اور ٹیم کو ٹریننگ دینے میں مدد کرتے ہیں۔ بتائیں آپ کو کیا چاہیے اور ایک طے شدہ قیمت لیں۔',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'secondary', trackAs: 'whatsapp' },
      badges: ['پاکستان اور دنیا بھر', 'PKR یا USD میں طے شدہ قیمت', 'نظر آنے والے مرحلوں میں کام'],
      layout: 'centered',
      id: 'b038d864670a',
    },
    {
      type: 'answerBox',
      heading: 'ہماری سروسز کیسے کام کرتی ہیں',
      facts: [
        { label: 'کہاں', value: 'پاکستان اور دنیا بھر، کال، ای میل اور واٹس ایپ پر' },
        { label: 'کیا', value: 'کسٹم سافٹ ویئر، ویب سائٹس، ای کامرس اسٹور، موبائل ایپس اور Nafaa کا سیٹ اپ' },
        { label: 'قیمت', value: 'طے شدہ کام کی ایک طے شدہ قیمت، PKR یا USD میں' },
        { label: 'طریقہ', value: 'سمجھنا، ڈیزائن، بنانا، لانچ اور سپورٹ، نظر آنے والے مرحلوں میں' },
      ],
      romanUrdu:
        'Nafaa ki team Pakistan aur bahar ke clients ke liye custom software, website, online store aur mobile app banati hai. Form bharein, "Quote lein" aur PKR ya USD me ek fixed qeemat payein.',
      id: 'b0fca700118c',
    },
    {
      type: 'entryGrid',
      heading: 'ہم آپ کے لیے کیا کر سکتے ہیں',
      intro: 'بنانے کی سروسز دنیا بھر میں کسی بھی کاروبار کے لیے ہیں۔ سیٹ اپ کی سروسز پاکستان میں Nafaa کے کسٹمرز کو جلدی کام شروع کرنے میں مدد دیتی ہیں۔',
      entryType: 'SERVICE',
      sort: 'order',
      limit: 60,
      layout: 'cards',
      id: 'b177f677ca90',
    },
    {
      type: 'diagram',
      heading: 'کوٹ، بنانا، لانچ',
      caption: 'ہر پروجیکٹ ایک چھوٹے فارم سے شروع ہوتا ہے اور ایسے سافٹ ویئر پر ختم ہوتا ہے جو آپ کی ٹیم روز استعمال کرتی ہے۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'quote', label: 'کوٹیشن لیں', icon: 'message-square', note: 'موٹا سا خیال کافی ہے' },
          { id: 'scope', label: 'لکھا ہوا کام', icon: 'file-text', note: 'اسکرینیں، ڈیٹا، مرحلے' },
          { id: 'price', label: 'طے شدہ قیمت', icon: 'handshake', note: 'PKR یا USD میں' },
          { id: 'build', label: 'مرحلہ وار بنانا', icon: 'code-xml', note: 'ہر مرحلے پر چلتا سافٹ ویئر' },
          { id: 'launch', label: 'لانچ اور سپورٹ', icon: 'rocket', note: 'ٹریننگ شامل' },
        ],
        edges: [
          { from: 'quote', to: 'scope' },
          { from: 'scope', to: 'price' },
          { from: 'price', to: 'build' },
          { from: 'build', to: 'launch' },
        ],
        animate: true,
      },
      theme: 'muted',
      id: 'bd0d5c97d4b4',
    },
    {
      type: 'diagram',
      heading: 'ہر پروجیکٹ کیسے چلتا ہے',
      caption: 'ہر پروجیکٹ پانچ مرحلوں سے گزرتا ہے: سمجھنا، ڈیزائن، بنانا، لانچ اور سپورٹ۔',
      diagram: { kind: 'service-process' },
      theme: 'muted',
      id: 'b1bdbfa83cbb',
    },
    {
      type: 'featuresGrid',
      heading: 'ٹیمیں Nafaa کی ٹیم کیوں چنتی ہیں',
      columns: 3,
      items: [
        { icon: 'code-xml', title: 'اصل کام میں آزمایا ہوا', body: 'ہم اسی ٹیکنالوجی سے بناتے ہیں جس پر Nafaa چلتا ہے: React اور Next.js، React Native، Electron، NestJS اور PostgreSQL۔' },
        { icon: 'plug-zap', title: 'انٹیگریشن ہمارا روز کا کام ہے', body: 'ٹیکس اتھارٹیز، پیمنٹ گیٹ وے، کوریئر، اکاؤنٹنگ اور مارکیٹ پلیس۔' },
        { icon: 'calendar-check', title: 'نظر آنے والے مرحلے', body: 'ہر مرحلے پر آپ چلتا ہوا سافٹ ویئر دیکھتے ہیں، صرف آخر میں نہیں۔' },
        { icon: 'handshake', title: 'ایک طے شدہ قیمت', body: 'طے شدہ کام کی ایک قیمت؛ تبدیلی کی قیمت شروع ہونے سے پہلے بتائی جاتی ہے۔' },
        { icon: 'languages', title: 'انگریزی یا اردو', body: 'کال، دستاویزات اور ٹریننگ اس زبان میں جو آپ کی ٹیم چاہے۔' },
        { icon: 'shield-check', title: 'پہلے دن سے سیکیورٹی', body: 'رول، آڈٹ لاگ اور خفیہ معلومات انکرپٹ، جیسے خود Nafaa میں۔' },
      ],
      id: 'b39846864353',
    },
    {
      type: 'comparisonTable',
      heading: 'بنانے کی سروسز اور سیٹ اپ کی سروسز',
      caption: 'دو قسم کا کام، ایک طریقہ۔ ہر درخواست اسی چھوٹے فارم سے شروع ہوتی ہے۔',
      columns: [
        { key: 'build', label: 'بنانے کی سروسز', highlight: true },
        { key: 'setup', label: 'سیٹ اپ کی سروسز' },
      ],
      rows: [
        {
          label: 'کیا',
          cells: {
            build: {
              value:
                '[کسٹم سافٹ ویئر](/ur/services/custom-software)، [ویب سائٹس](/ur/services/websites)، [ای کامرس اسٹور](/ur/services/online-store-setup)، [موبائل ایپس](/ur/services/mobile-apps)',
            },
            setup: {
              value:
                '[ڈیٹا منتقلی](/ur/services/data-migration)، [FBR سیٹ اپ](/ur/services/fbr-integration-setup)، [ہارڈ ویئر](/ur/services/hardware)، [ٹریننگ](/ur/services/training)',
            },
          },
        },
        { label: 'کس کے لیے', cells: { build: { value: 'کوئی بھی کاروبار، Nafaa کے ساتھ یا اس کے بغیر' }, setup: { value: 'Nafaa پر آنے والے یا اس پر چلنے والے کاروبار' } } },
        { label: 'کہاں', cells: { build: { value: 'پاکستان اور دنیا بھر' }, setup: { value: 'پاکستان' } } },
        { label: 'قیمت', cells: { build: { value: 'طے شدہ، PKR یا USD میں' }, setup: { value: 'طے شدہ، PKR میں' } } },
        { label: 'آخر میں', cells: { build: { value: 'لانچ، ٹریننگ اور سپورٹ' }, setup: { value: 'آپ کی ٹیم Nafaa پر کام کر رہی ہو' } } },
      ],
      id: 'b123099b85cb',
    },
    {
      type: 'richText',
      markdown:
        '## ہر پروجیکٹ میں کیا شامل ہے\n\nہر پروجیکٹ کو، بڑا ہو یا چھوٹا، یہی بنیادی چیزیں ملتی ہیں: کام شروع ہونے سے پہلے لکھا ہوا اسکوپ، اس اسکوپ کی ایک طے شدہ قیمت، ہر مرحلے کے آخر میں چلتا ہوا نتیجہ، اور جو بنایا اسے استعمال کرنے والوں کے حوالے کرنا۔ تبدیلیاں قبول ہیں، اور ہر ایک کی قیمت شروع ہونے سے پہلے بتائی جاتی ہے، تو قیمت آپ کی مرضی کے بغیر کبھی نہیں بدلتی۔\n\nہم قیمتوں کی لسٹ شائع نہیں کرتے، کیونکہ ایک ہی نام کے پیچھے بہت مختلف پروجیکٹ ہو سکتے ہیں۔ اصل قیمت جاننے کے لیے موٹے سے خیال کے ساتھ ایک چھوٹا پیغام کافی ہے۔ خود Nafaa استعمال کرنے کے لیے کوئی سروس ضروری نہیں: ایپ آپ خود [فری ٹرائل](/ur/pricing) سے شروع کر سکتے ہیں، اور سروسز تب کے لیے ہیں جب آپ چاہیں کہ کام آپ کے لیے کر دیا جائے۔',
      id: 'bad3c7f9ecdc',
    },
    {
      type: 'leadForm',
      anchor: 'quote',
      heading: 'کوٹیشن لیں',
      intro: 'بتائیں آپ کیا بنانا یا سیٹ کرنا چاہتے ہیں۔ ہم سوالات، پلان اور PKR یا USD میں طے شدہ قیمت کے ساتھ جواب دیتے ہیں، عام طور پر ایک کاروباری دن میں۔',
      form: 'quote',
      formType: 'SALES',
      subjectPrefix: 'Services',
      successMessage: 'شکریہ! آپ کی درخواست ہمیں مل گئی ہے، ہم ایک کاروباری دن میں ای میل یا واٹس ایپ پر جواب دیں گے۔',
      currencies: ['PKR', 'USD'],
      whatsapp: true,
      id: 'b778047b1f56',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'bea241af5b2c' },
    {
      type: 'cta',
      heading: 'کوئی پروجیکٹ ذہن میں ہے؟',
      body: 'شروع کرنے کے لیے موٹا سا خیال کافی ہے۔ ہم اسے شکل دینے میں مدد کریں گے۔',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b695c22badde',
    },
  ],
  faqKeys: ['ur-page-services-price', 'ur-page-services-worldwide', 'ur-page-services-need', 'ur-page-services-migration'],
  seoTitle: 'سافٹ ویئر ڈویلپمنٹ سروسز: ویب سائٹس، اسٹور، ایپس',
  seoDescription:
    'Nafaa کی ٹیم سے کسٹم سافٹ ویئر، ویب سائٹس، ای کامرس اسٹور اور موبائل ایپس، پاکستان اور دنیا بھر کے کلائنٹس کے لیے۔ PKR یا USD میں طے شدہ قیمت۔',
  focusKeyword: 'سافٹ ویئر ڈویلپمنٹ سروسز',
  sortOrder: 3,
  origin: 'translation of content/main-pages/hubs.ts (26 Oct 2026)',
  evidence: ['apps/web', 'apps/api', 'apps/mobile/package.json', 'apps/desktop/package.json', 'apps/api/src/integrations'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ['Reply time "usually within one working day" is the team\'s target; confirm.'],
};
