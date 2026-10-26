/** Urdu: mobile app development service page (/ur/services/mobile-apps). Translation of content/main-pages/services.ts. */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-svc-mobile-apps-price',
    locale: 'ur',
    topic: 'services',
    question: 'موبائل ایپ بنوانے کی قیمت کیسے طے ہوتی ہے؟',
    answer:
      'ایک مختصر کال کے بعد ہم لکھ دیتے ہیں کہ ایپ میں کیا بنے گا، اور اس کام کے لیے ایک طے شدہ کوٹیشن بھیجتے ہیں، PKR یا USD میں۔ ایپ بنتے بنتے آپ اسے مرحلہ وار دیکھتے رہتے ہیں۔ بعد میں اسکرینیں یا کام بڑھانا ہو تو پہلے اس تبدیلی کی قیمت بتاتے ہیں، اور آپ کی ہاں کے بعد ہی شروع کرتے ہیں۔',
    sourceNote: 'Service process (owner decision: worldwide services via "Quote lein" form; quote form takes PKR or USD).',
    origin: 'translation of faq mp-services-price',
    evidence: ['apps/site/src/components/islands/LeadForm.tsx'],
  },
  {
    key: 'ur-svc-mobile-apps-abroad',
    locale: 'ur',
    topic: 'services',
    question: 'کیا آپ پاکستان سے باہر کے کاروبار کے لیے موبائل ایپ بھی بناتے ہیں؟',
    answer:
      'جی ہاں۔ Nafaa بنانے والی ٹیم پاکستان اور باہر کے کاروبار کے لیے موبائل ایپس، ویب سائٹس، آن لائن اسٹور اور کسٹم سافٹ ویئر بناتی ہے۔ [سروسز کے صفحے](/ur/services) پر "کوٹیشن لیں" فارم میں انگریزی یا اردو میں بتائیں کہ کیا چاہیے۔ کام شروع ہونے سے پہلے ہم پلان، وقت اور قیمت بھیج دیتے ہیں۔',
    sourceNote: 'Owner decision (20 Oct 2026): worldwide services through the "Quote lein" form.',
    origin: 'translation of faq services-worldwide',
    evidence: ['docs/marketing-site/PLAN.md'],
  },
  {
    key: 'ur-svc-mobile-apps-offline',
    locale: 'ur',
    topic: 'services',
    question: 'کیا آپ کی بنائی موبائل ایپ انٹرنیٹ کے بغیر چل سکتی ہے؟',
    answer:
      'جی ہاں، اگر کام کو اس کی ضرورت ہو۔ رائیڈرز اور فیلڈ اسٹاف کی اسکرینیں ڈیٹا فون پر محفوظ کر سکتی ہیں اور سگنل واپس آنے پر بھیج دیتی ہیں، بالکل جیسے Nafaa کا کاؤنٹر انٹرنیٹ کے بغیر بل بناتا رہتا ہے۔ کن اسکرینوں کو یہ چاہیے، یہ ہم کام طے کرتے وقت مل کر فیصلہ کرتے ہیں۔',
    sourceNote: 'Offline pattern used in Nafaa (core/lib/offline).',
    origin: 'translation of faq svc-app-offline',
    evidence: ['apps/web/src/core/lib/offline'],
  },
  {
    key: 'ur-svc-mobile-apps-both-stores',
    locale: 'ur',
    topic: 'services',
    question: 'موبائل ایپ Android اور iOS دونوں پر ملے گی یا ایک پر؟',
    answer:
      'دونوں پر، ایک ہی React Native کوڈ سے، جب تک آپ کو صرف ایک نہ چاہیے ہو۔ ایک کوڈ کی وجہ سے فیچر بدلنے پر دونوں ایپس ساتھ ساتھ رہتی ہیں۔ ہم اسٹور کی لسٹنگ تیار کرتے ہیں اور ایپ آپ کے اپنے Google Play اور App Store اکاؤنٹ سے شائع کرتے ہیں، جو آپ کے ساتھ مل کر سیٹ ہوتے ہیں۔',
    sourceNote: 'apps/mobile uses Expo / React Native.',
    origin: 'translation of faq svc-app-both-stores',
    evidence: ['apps/mobile/package.json'],
  },
];

export const entry: SeedEntry = {
  type: 'SERVICE',
  locale: 'ur',
  slug: 'mobile-apps',
  title: 'موبائل ایپ ڈویلپمنٹ',
  seoTitle: 'Android اور iOS کے لیے موبائل ایپ ڈویلپمنٹ، دنیا بھر میں',
  seoDescription:
    'گاہکوں، فیلڈ اسٹاف اور رائیڈرز کے لیے Android اور iOS ایپس، Nafaa کی ٹیم React Native سے بناتی اور اسٹور پر شائع کرتی ہے۔ طے شدہ کوٹیشن لیں۔',
  focusKeyword: 'موبائل ایپ ڈویلپمنٹ',
  summary:
    'Nafaa پاکستان اور دنیا بھر کے کاروبار کے لیے Android اور iOS ایپس بناتا ہے: گاہکوں کی ایپ، فیلڈ اسٹاف اور رائیڈرز کی ایپ، اور آپ کے سسٹمز کے ساتھ چلنے والی ایپس، React Native سے بنی اور اسٹورز پر شائع شدہ۔ قیمت PKR یا USD میں ایک طے شدہ کوٹیشن۔',
  data: {
    icon: 'smartphone',
    shortName: 'موبائل ایپس',
    areaServed: 'worldwide',
    pricingModel: 'ہر ایپ کی ایک طے شدہ کوٹیشن، PKR یا USD میں',
    timeline: 'لکھے ہوئے پلان میں طے',
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'موبائل ایپس',
      heading: 'Android اور iOS ایپس جو آپ کے گاہک اور ٹیم واقعی استعمال کریں',
      sub: 'گاہکوں کی ایپ، فیلڈ اسٹاف اور رائیڈرز کی ایپ، اور آپ کے سسٹمز کے ساتھ چلنے والی ایپس، Nafaa بنانے والی ٹیم React Native سے بناتی ہے اور Google Play اور App Store پر شائع کرتی ہے۔',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'secondary', trackAs: 'whatsapp' },
      badges: ['Android اور iOS', 'انٹرنیٹ کے بغیر بھی', 'اسٹور پر شائع'],
      media: { kind: 'screenshot', mediaId: SHOT.dashboardPhone, frame: 'phone' },
      layout: 'split',
      id: 'bc290cf245dd',
    },
    {
      type: 'featuresGrid',
      heading: 'ہم کون سی ایپس بناتے ہیں',
      columns: 3,
      items: [
        { icon: 'shopping-bag', title: 'گاہکوں کی ایپ', body: 'آپ کے گاہکوں کے لیے آرڈر، بکنگ، لائلٹی اور اکاؤنٹ۔' },
        { icon: 'navigation', title: 'فیلڈ اور رائیڈر ایپ', body: 'آرڈر لینا، ڈیلیوری اور دورے، لوکیشن اور تصویروں کے ساتھ۔' },
        { icon: 'layout-dashboard', title: 'مالک کی ایپ', body: 'چلتے پھرتے مینیجرز کے لیے ڈیش بورڈ اور منظوریاں۔' },
        { icon: 'wifi-off', title: 'انٹرنیٹ کے بغیر بھی', body: 'ایسی ایپس جو کمزور سگنل پر چلتی رہیں اور بعد میں سنک کریں۔' },
        { icon: 'bell-ring', title: 'نوٹیفکیشن', body: 'آرڈر، یاد دہانی اور الرٹ کے لیے پش میسج۔' },
        { icon: 'upload', title: 'اسٹور پر شائع کرنا', body: 'ہم آپ کے ساتھ مل کر Google Play اور App Store پر شائع کرتے ہیں۔' },
      ],
      id: 'bbdd269c854e',
    },
    {
      type: 'diagram',
      heading: 'خیال سے ایپ اسٹور تک',
      caption: 'Android اور iOS کے لیے ایک ہی کوڈ، مرحلہ وار بنا اور آپ کے ساتھ شائع۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'idea', label: 'خیال', icon: 'lightbulb' },
          { id: 'screens', label: 'اسکرینیں', icon: 'smartphone', note: 'آپ کے ساتھ ڈیزائن' },
          { id: 'build', label: 'بنانا', icon: 'code-xml', note: 'Android اور iOS' },
          { id: 'store', label: 'اسٹور پر ریلیز', icon: 'upload' },
          { id: 'update', label: 'اپ ڈیٹس', icon: 'refresh-cw' },
        ],
        edges: [
          { from: 'idea', to: 'screens' },
          { from: 'screens', to: 'build' },
          { from: 'build', to: 'store' },
          { from: 'store', to: 'update' },
        ],
        animate: true,
      },
      id: 'bd4dd59e1d38',
    },
    {
      type: 'comparisonTable',
      heading: 'بنانے سے پہلے آپ کے ساتھ کیا طے کرتے ہیں',
      caption: 'ایپ کو کاغذ پر بدلنا کوڈ میں بدلنے سے سستا ہے۔ کام طے کرنے کے مرحلے میں پہلے یہی سوال حل ہوتے ہیں۔',
      columns: [
        { key: 'why', label: 'اس سے کیا بدلتا ہے', highlight: true },
        { key: 'ask', label: 'ہم پوچھتے ہیں' },
      ],
      rows: [
        { label: 'کون استعمال کرے گا', cells: { why: { value: 'ہر قسم کے صارف کو اپنا لاگ اِن اور اپنی اسکرینیں چاہییں' }, ask: { value: 'گاہک، اسٹاف یا دونوں؟' } } },
        { label: 'کیا انٹرنیٹ کے بغیر چلے', cells: { why: { value: 'آف لائن اسکرینیں ڈیٹا فون پر رکھتی ہیں اور بعد میں سنک کرتی ہیں' }, ask: { value: 'آپ کے صارفین کا سگنل کہاں جاتا ہے؟' } } },
        { label: 'کن سسٹمز سے بات کرے', cells: { why: { value: 'ہر کنکشن بنانے اور ٹیسٹ کرنے کا کام بڑھاتا ہے' }, ask: { value: 'Nafaa، آپ کا اپنا بیک اینڈ، پیمنٹ یا نقشے؟' } } },
        { label: 'Android، iOS یا دونوں', cells: { why: { value: 'ایک React Native کوڈ دونوں کے لیے، مگر اسٹورز کے اصول الگ ہیں' }, ask: { value: 'آپ کے صارفین کے پاس کون سے فون ہیں؟' } } },
        { label: 'کون شائع کرے گا', cells: { why: { value: 'ایپ آپ کے اپنے اسٹور اکاؤنٹ سے شائع ہوتی ہے' }, ask: { value: 'کیا آپ کے ڈویلپر اکاؤنٹ بن چکے ہیں؟' } } },
      ],
      id: 'b4e6e67b0349',
    },
    {
      type: 'steps',
      heading: 'ایپ کا پراجیکٹ کیسے چلتا ہے',
      items: [
        { title: 'کام طے کرنا', body: 'صارفین، اسکرینیں، ڈیٹا اور کیا انٹرنیٹ کے بغیر چلنا چاہیے، سب لکھا ہوا اور طے شدہ۔' },
        { title: 'ڈیزائن', body: 'Android اور iOS کے لیے ایسے ڈیزائن جن پر کلک کر کے دیکھ سکیں، آپ کے ساتھ دیکھے ہوئے۔' },
        { title: 'بنانا اور ٹیسٹ', body: 'ہر مرحلے پر اصل فونز پر ٹیسٹ، سستے Android ماڈلز سمیت۔' },
        { title: 'شائع کرنا', body: 'اسٹور کی لسٹنگ، ریویو اور ریلیز، پھر لانچ کے بعد سپورٹ۔' },
      ],
      id: 'b36f0250fd84',
    },
    {
      type: 'diagram',
      heading: 'ہر پراجیکٹ کیسے چلتا ہے',
      caption: 'ہر پراجیکٹ پانچ مرحلوں سے گزرتا ہے: سمجھنا، ڈیزائن، بنانا، لانچ اور سپورٹ۔',
      diagram: { kind: 'service-process' },
      theme: 'muted',
      id: 'b8a9ddde9bc4',
    },
    {
      type: 'richText',
      markdown:
        '## ایسی ٹیم کی بنائی جو روز فونز پر کام پہنچاتی ہے\n\nخود Nafaa انہی فونز پر چلتا ہے جو پاکستانی دکانوں کے پاس پہلے سے ہیں، نئے iPhone سے لے کر سستے Android سیٹ تک، کمزور موبائل ڈیٹا پر۔ اسی وجہ سے ہم ایپس اس طرح بناتے ہیں: اسکرینیں جو عام فون پر بھی تیز رہیں، ڈیٹا جو کنکشن ٹوٹنے پر ضائع نہ ہو، اور متن جو انگریزی یا اردو میں آسانی سے پڑھا جائے۔ ہم وہی ٹولز استعمال کرتے ہیں جن پر خود Nafaa چلتا ہے: ویب پر React اور Next.js، Android اور iOS کے لیے React Native، ڈیسک ٹاپ کے لیے Electron، اور ان کے پیچھے NestJS اور PostgreSQL۔\n\nاگر آپ کی ایپ کو کاروبار کا ڈیٹا چاہیے، جیسے پروڈکٹس، اسٹاک، گاہک یا آرڈر، تو وہ [ڈویلپر API](/developers) کے ذریعے Nafaa سے پڑھ سکتی ہے، تاکہ ایپ اور آپ کا کاؤنٹر ہمیشہ ایک ہی بات کہیں۔\n\n## پاکستان سے باہر سے ہمارے ساتھ کام\n\nباہر کے کلائنٹ بھی ویسے ہی کام کرتے ہیں جیسے پاکستان کے کلائنٹ۔ سب کچھ انگریزی میں ہوتا ہے، ویڈیو کال، ای میل اور واٹس ایپ پر۔ کوٹیشن امریکی ڈالر میں بھی ہو سکتی ہے، اور کال کا وقت ایسا رکھا جاتا ہے جو دونوں طرف کو سوٹ کرے؛ ٹیم پاکستان کے وقت (UTC+5) پر کام کرتی ہے۔ ہر مرحلے کے آخر میں آپ چلتا ہوا سافٹ ویئر دیکھتے ہیں، اس لیے فاصلے کا مطلب یہ نہیں کہ آخر تک انتظار کریں کہ کیا بنا۔',
      id: 'b97c6ad6723b',
    },
    {
      type: 'leadForm',
      anchor: 'quote',
      heading: 'کوٹیشن لیں',
      intro: 'بتائیں آپ کیا بنوانا چاہتے ہیں۔ ہم سوالوں، پلان اور PKR یا USD میں طے شدہ قیمت کے ساتھ جواب دیتے ہیں، عام طور پر ایک کاروباری دن کے اندر۔',
      form: 'quote',
      formType: 'SALES',
      subjectPrefix: 'Mobile app',
      successMessage: 'شکریہ! آپ کی درخواست مل گئی ہے۔ ہم ایک کاروباری دن کے اندر ای میل یا واٹس ایپ پر جواب دیں گے۔',
      currencies: ['PKR', 'USD'],
      whatsapp: true,
      id: 'b085243a6929',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'b4dd81e1d43e' },
    {
      type: 'cta',
      heading: 'اپنی ایپ کا پلان اور طے شدہ قیمت لیں',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b2a098b87af2',
    },
  ],
  faqKeys: ['ur-svc-mobile-apps-price', 'ur-svc-mobile-apps-abroad', 'ur-svc-mobile-apps-offline', 'ur-svc-mobile-apps-both-stores'],
  relations: [
    { ref: 'SERVICE:custom-software@ur', kind: 'RELATED' },
    { ref: 'SERVICE:websites@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:enterprise@ur', kind: 'TAG' },
  ],
  sortOrder: 4,
  origin: 'translation of content/main-pages/services.ts (26 Oct 2026)',
  evidence: ['apps/mobile/package.json', 'apps/web/src/core/lib/offline', 'apps/api/src/integrations/public-api'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
