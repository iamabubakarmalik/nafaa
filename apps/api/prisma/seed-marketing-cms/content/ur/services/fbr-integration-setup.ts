/** Urdu: FBR and PRA integration setup service page (/ur/services/fbr-integration-setup). Translation of content/main-pages/services.ts (fbr-integration-setup). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-svc-fbr-integration-setup-who',
    locale: 'ur',
    topic: 'compliance',
    question: 'FBR سیٹ اپ کے بعد Nafaa کن ٹیکس اداروں کو انوائس بھیجتا ہے؟',
    answer:
      'Nafaa ایک FBR اور PRA سے منظور شدہ POS انٹیگریٹر ہے۔ یہ Tier-1 ریٹیلرز کی سیل کی انوائسیں FBR کو بھیجتا ہے، اور سروسز کی انوائسیں صوبائی اداروں کو: پنجاب میں PRA، سندھ میں SRB اور خیبر پختونخوا میں KPRA۔ ہر بل کو اس کا فِسکل انوائس نمبر اور QR کوڈ ملتا ہے جو رسید پر پرنٹ ہوتا ہے۔',
    sourceNote: 'integrations/fbr (IMS PostData) and integrations/tax-authority adapters (PRA, SRB, KPRA, FBR).',
    origin: 'translation of faq mp-fbr-who',
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-svc-fbr-integration-setup-offline',
    locale: 'ur',
    topic: 'compliance',
    question: 'انٹرنیٹ بند ہو تو FBR اور PRA کی فِسکل انوائسوں کا کیا ہوتا ہے؟',
    answer:
      'کاؤنٹر بل بناتا رہتا ہے۔ جو انوائسیں ٹیکس ادارے تک نہیں پہنچ سکیں وہ ایک قطار میں رکھی جاتی ہیں اور کنکشن واپس آتے ہی خود دوبارہ بھیجی جاتی ہیں۔ جو ناکام ہوں وہ وجہ کے ساتھ لسٹ میں نظر آتی ہیں تاکہ آپ انہیں ٹھیک کر سکیں۔ ٹیکس کا سرور سست ہو تو بھی آپ کو سیل روکنی نہیں پڑتی۔',
    sourceNote: 'FbrService retry cron (shouldRetry, parseFbrResponse) and FbrInvoiceStatus.',
    origin: 'translation of faq mp-fbr-offline',
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/fbr/fbr-errors.ts'],
  },
  {
    key: 'ur-svc-fbr-integration-setup-ready',
    locale: 'ur',
    topic: 'services',
    question: 'FBR یا PRA انٹیگریشن سیٹ اپ کے لیے مجھے کیا کچھ تیار رکھنا ہوگا؟',
    answer:
      'اپنا NTN، اگر آپ سروسز بیچتے ہیں تو صوبائی ادارے کے ساتھ رجسٹریشن، ہر کاؤنٹر یا برانچ کے لیے جاری ہونے والا POS ID، اور برانچوں کی لسٹ ان کے پتوں کے ساتھ۔ اگر ابھی آپ کے پاس POS ID نہیں ہے تو کام شروع کرنے سے پہلے ہم سمجھا دیتے ہیں کہ یہ کہاں سے ملتا ہے۔',
    sourceNote: 'Tax settings fields (NTN, POS ID per authority).',
    origin: 'translation of faq svc-fbr-ready',
    evidence: ['apps/web/src/integrations/fbr', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-svc-fbr-integration-setup-branches',
    locale: 'ur',
    topic: 'services',
    question: 'کیا FBR سیٹ اپ میں مختلف برانچیں مختلف ٹیکس اداروں کو رپورٹ کر سکتی ہیں؟',
    answer:
      'جی ہاں۔ ہر برانچ اپنے ادارے اور اپنے POS ID کے ساتھ سیٹ ہوتی ہے، اس لیے لاہور کی برانچ PRA کو رپورٹ کر سکتی ہے اور کراچی کی برانچ SRB کو۔ ہر رسید پر اسی ادارے کا فِسکل نمبر ہوتا ہے جس کے تحت وہ برانچ آتی ہے جس نے بل بنایا۔',
    sourceNote: 'Tax-authority POS settings are per shop (FbrModeIndicator uses the active shop).',
    origin: 'translation of faq svc-fbr-branches',
    evidence: ['apps/web/src/integrations/fbr/components/FbrModeIndicator.tsx', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-svc-fbr-integration-setup-price',
    locale: 'ur',
    topic: 'services',
    question: 'FBR انٹیگریشن سیٹ اپ کے کام کی قیمت کیسے طے ہوتی ہے؟',
    answer:
      'ایک مختصر کال کے بعد ہم لکھ دیتے ہیں کہ کیا سیٹ اپ ہوگا، اور اسی کام کی ایک طے شدہ کوٹیشن بھیجتے ہیں، PKR یا USD میں۔ کام مرحلوں میں آپ کے سامنے ہوتا ہے۔ بعد میں کوئی برانچ یا کام بڑھانا ہو تو ہم پہلے اس تبدیلی کی قیمت بتاتے ہیں، اور آپ کی رضامندی کے بعد ہی شروع کرتے ہیں۔',
    sourceNote: 'Service process (owner decision: worldwide services via "Quote lein" form; quote form takes PKR or USD).',
    origin: 'translation of faq mp-services-price',
    evidence: ['apps/site/src/components/islands/LeadForm.tsx'],
  },
];

export const entry: SeedEntry = {
  type: 'SERVICE',
  locale: 'ur',
  slug: 'fbr-integration-setup',
  title: 'FBR اور PRA انٹیگریشن سیٹ اپ',
  summary:
    'ہماری ٹیم آپ کے ساتھ مل کر Nafaa میں FBR، PRA، SRB یا KPRA انوائسنگ سیٹ کرتی ہے: رجسٹریشن کی تفصیل اور POS ID کی جانچ، سینڈ باکس سے کنکشن، انوائس اور رسید کی ٹیسٹنگ، اور پھر لائیو، تاکہ پہلے اصل بل سے فِسکل انوائس پرنٹ ہو۔',
  data: {
    icon: 'shield-check',
    shortName: 'FBR سیٹ اپ',
    areaServed: 'PK',
    pricingModel: 'ہر کاروبار یا برانچ کے حساب سے کوٹیشن',
    timeline: 'پلان میں طے ہوتا ہے؛ اس پر منحصر کہ آپ کی رجسٹریشن کی تفصیل تیار ہو',
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'FBR انٹیگریشن سیٹ اپ',
      heading: 'پہلے اصل بل سے فِسکل انوائس چالو',
      sub: 'Nafaa ایک FBR اور PRA سے منظور شدہ POS انٹیگریٹر ہے۔ ہماری ٹیم آپ کا POS ID جوڑتی ہے، سینڈ باکس میں انوائس ٹیسٹ کرتی ہے، رسید چیک کرتی ہے، پھر برانچ بہ برانچ آپ کو لائیو پر لے جاتی ہے۔',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'secondary', trackAs: 'whatsapp' },
      badges: ['FBR اور PRA سے منظور شدہ POS انٹیگریٹر', 'SRB اور KPRA بھی'],
      media: { kind: 'screenshot', mediaId: SHOT.taxSetup, frame: 'browser', url: 'app.nafaa.pk/settings/tax' },
      layout: 'centered',
      id: 'be621c42049f',
    },
    {
      type: 'steps',
      heading: 'ہم یہ سیٹ اپ کیسے کرتے ہیں',
      items: [
        { title: 'آپ کی تفصیل کی جانچ', body: 'NTN، POS ID، اور کون سا ادارہ کس برانچ پر لاگو ہوتا ہے۔' },
        { title: 'سینڈ باکس سے کنکشن', body: 'لاگ اِن کی تفصیل ڈالی جاتی ہے اور ادارے کے سینڈ باکس پر ٹیسٹ کی جاتی ہے۔' },
        { title: 'ٹیسٹ بل', body: 'سیل اور واپسی رپورٹ کی جاتی ہیں، اور رسید پر فِسکل نمبر اور QR چیک کیا جاتا ہے۔' },
        { title: 'لائیو', body: 'لائیو پر جائیں اور پہلی اصل انوائسیں جاتی ہوئی دیکھیں۔' },
        { title: 'حوالگی', body: 'آپ کی ٹیم سیکھتی ہے کہ رسید کے بیج کا کیا مطلب ہے، اور اگر کوئی بل ابھی قطار میں ہو تو کیا کرنا ہے۔' },
      ],
      id: 'be492db1e488',
    },
    {
      type: 'diagram',
      heading: 'ٹیکس انوائس کیسے بنتی ہے',
      caption: 'سیل پیچھے پیچھے رپورٹ ہو جاتی ہے؛ فِسکل نمبر اور QR کوڈ رسید پر پرنٹ ہوتے ہیں۔',
      diagram: { kind: 'fbr-invoice', animate: true },
      theme: 'muted',
      id: 'b8d57e801064',
    },
    {
      type: 'comparisonTable',
      heading: 'کون سا ادارہ، کس چیز کے لیے',
      caption: 'ٹیکس کا ادارہ اس پر منحصر ہے کہ آپ کیا بیچتے ہیں اور کہاں۔ اپنی ذمہ داریاں اپنے ٹیکس ایڈوائزر سے پکی کر لیں؛ ہر برانچ پر جو ادارہ لاگو ہو، ہم وہی سیٹ کرتے ہیں۔',
      columns: [
        { key: 'covers', label: 'کیا آتا ہے', highlight: true },
        { key: 'where', label: 'کہاں' },
      ],
      rows: [
        { label: 'FBR', cells: { covers: { value: 'سامان پر وفاقی سیلز ٹیکس، بشمول انٹیگریٹڈ Tier-1 ریٹیلرز' }, where: { value: 'پورا پاکستان' } } },
        { label: 'PRA', cells: { covers: { value: 'سروسز پر صوبائی سیلز ٹیکس، جیسے ریسٹورنٹ' }, where: { value: 'پنجاب' } } },
        { label: 'SRB', cells: { covers: { value: 'سروسز پر صوبائی سیلز ٹیکس' }, where: { value: 'سندھ' } } },
        { label: 'KPRA', cells: { covers: { value: 'سروسز پر صوبائی سیلز ٹیکس' }, where: { value: 'خیبر پختونخوا' } } },
      ],
      id: 'b2498d56dda7',
    },
    {
      type: 'featuresGrid',
      heading: 'اس میں کیا شامل ہے',
      columns: 3,
      items: [
        { icon: 'landmark', title: 'ہر ادارہ', body: 'FBR، PRA، SRB یا KPRA، ہر برانچ کے لیے۔' },
        { icon: 'qr-code', title: 'رسید کی جانچ', body: 'پرنٹ شدہ رسید پر فِسکل نمبر اور تصدیق کا QR۔' },
        { icon: 'rotate-ccw', title: 'واپسی', body: 'واپسی اصل انوائس کے حوالے سے رپورٹ ہوتی ہے۔' },
        { icon: 'refresh-cw', title: 'دوبارہ بھیجنے کی جانچ', body: 'ہم آپ کی ٹیم کو دکھاتے ہیں کہ آف لائن میں قطار اور دوبارہ بھیجنا کیسے کام کرتا ہے۔' },
        { icon: 'file-spreadsheet', title: 'ٹیکس رپورٹس', body: 'ریٹرن کے لیے سیلز ٹیکس کا خلاصہ کہاں ملتا ہے۔' },
        { icon: 'graduation-cap', title: 'ٹیم کی ٹریننگ', body: 'کیشیئر اور مینیجر جانتے ہیں کہ کچھ ناکام ہو تو کیا کرنا ہے۔' },
      ],
      id: 'be29e9ed30ee',
    },
    {
      type: 'richText',
      markdown:
        '## شروع کرنے سے پہلے\n\nیہ چیزیں تیار ہوں تو سیٹ اپ جلدی ہو جاتا ہے:\n\n- **آپ کا NTN**، اور صوبائی اداروں کے لیے PRA، SRB یا KPRA کے ساتھ آپ کی رجسٹریشن۔\n- **ادارے کے ساتھ آپ کی POS رجسٹریشن**، جس سے ہر کاؤنٹر یا برانچ کا POS ID ملتا ہے۔\n- **برانچوں کی لسٹ** ان کے پتوں کے ساتھ، تاکہ ہر برانچ صحیح ادارے سے جڑے۔\n\nاگر آپ کو یقین نہیں کہ آپ کے کاروبار پر انٹیگریشن لازمی ہے یا نہیں، تو پہلے سرکاری رہنمائی پڑھ لیں: [FBR](https://www.fbr.gov.pk)، [Punjab Revenue Authority](https://pra.punjab.gov.pk)، [Sindh Revenue Board](https://www.srb.gos.pk/srb/) اور [Khyber Pakhtunkhwa Revenue Authority](https://kpra.kp.gov.pk)۔ ہمارا [FBR انٹیگریشن](/ur/product/fbr) کا صفحہ بتاتا ہے کہ انوائسیں کیسے رپورٹ ہوتی ہیں، اور انٹرنیٹ چلا جائے تو کیا ہوتا ہے: بل قطار میں رہتے ہیں اور کنکشن آنے پر بھیج دیے جاتے ہیں۔',
      id: 'b8cb0a4d7da9',
    },
    {
      type: 'leadForm',
      anchor: 'quote',
      heading: 'کوٹیشن لیں',
      intro: 'اپنے کاروبار کی قسم، شہر اور برانچوں کی تعداد بتائیں، اور اگر معلوم ہو تو یہ کہ آپ کس ادارے کو رپورٹ کرتے ہیں۔ ہم ایک پلان اور قیمت کے ساتھ جواب دیتے ہیں۔',
      form: 'quote',
      formType: 'SALES',
      subjectPrefix: 'FBR integration setup',
      successMessage: 'شکریہ! آپ کی درخواست مل گئی ہے۔ ہم ایک کام کے دن کے اندر ای میل یا واٹس ایپ پر جواب دیں گے۔',
      currencies: ['PKR', 'USD'],
      whatsapp: true,
      id: 'b791e12a983b',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'bbc6e62058c8' },
    {
      type: 'cta',
      heading: 'ہماری ٹیم کے ساتھ ٹیکس کے قواعد پورے کریں',
      primaryCta: { label: 'کوٹیشن لیں', href: '#quote', variant: 'primary', trackAs: 'hero_quote' },
      secondaryCta: { label: 'واٹس ایپ پر بات کریں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b897005ef3e7',
    },
  ],
  faqKeys: [
    'ur-svc-fbr-integration-setup-who',
    'ur-svc-fbr-integration-setup-offline',
    'ur-svc-fbr-integration-setup-ready',
    'ur-svc-fbr-integration-setup-branches',
    'ur-svc-fbr-integration-setup-price',
  ],
  relations: [
    { ref: 'PRODUCT:fbr@ur', kind: 'TAG' },
    { ref: 'SOLUTION:restaurants@ur', kind: 'TAG' },
    { ref: 'SERVICE:training@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:fbr-pos@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:ntn@ur', kind: 'RELATED' },
  ],
  seoTitle: 'پاکستان میں FBR اور PRA POS انٹیگریشن سیٹ اپ سروس',
  seoDescription:
    'ہم Nafaa میں FBR، PRA، SRB یا KPRA انوائسنگ سیٹ کرتے ہیں: POS ID، سینڈ باکس ٹیسٹ، فِسکل نمبر اور QR والی رسید، پھر لائیو۔ FBR اور PRA سے منظور شدہ انٹیگریٹر۔',
  focusKeyword: 'FBR POS انٹیگریشن سیٹ اپ',
  sortOrder: 6,
  origin: 'translation of content/main-pages/services.ts (26 Oct 2026)',
  evidence: [
    'apps/api/src/integrations/fbr',
    'apps/api/src/integrations/tax-authority/adapters.ts',
    'apps/web/src/integrations/fbr',
    'apps/web/src/integrations/tax-authority/TaxAuthorityReceiptBadge.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [
    'Authority table is general public knowledge (FBR goods, provincial authorities services); confirm wording with the compliance pages before publishing.',
  ],
};
