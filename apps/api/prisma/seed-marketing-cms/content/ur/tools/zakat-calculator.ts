/** Urdu: Zakat calculator for business stock (/ur/tools/zakat-calculator). Translation of content/tools/money.ts (zakat-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Rate 2.5% and nisab 7.5 tola gold / 52.5 tola silver from the Punjab government Grade 7 maths text on elearn.gov.pk (curl 200, text read 26 Oct 2026); gold vs silver difference of opinion from Wikipedia "Nisab"; tola grams from Wikipedia "Tola (unit)". The 5,000 rupees silver rate is labelled as an example. Nafaa claim: stock value in the stock report (inventory/stock-report).';
const faqEvidence = [
  'apps/site/src/components/islands/tools/facts.ts',
  'apps/web/src/modules/inventory/stock-report/components/LedgerView.tsx',
];

const zakatSources = [
  {
    title: 'Mathematics Grade 7, Financial Arithmetic: Zakat at 2.5%, nisab 7.5 tolas of gold or 52.5 tolas of silver',
    url: 'https://www.elearn.gov.pk/onlinepdf/math/7math/chapter7/files/basic-html/page10.html',
    publisher: 'Government of the Punjab (elearn.gov.pk)',
    accessedAt: '2026-10-26',
  },
  {
    title: 'Nisab: gold and silver standards',
    url: 'https://en.wikipedia.org/wiki/Nisab',
    publisher: 'Wikipedia',
    accessedAt: '2026-10-26',
  },
  {
    title: 'Tola (unit): 11.6638038 grams',
    url: 'https://en.wikipedia.org/wiki/Tola_(unit)',
    publisher: 'Wikipedia',
    accessedAt: '2026-10-26',
  },
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-zakat-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا دکان کے اسٹاک پر زکوٰۃ ہے؟',
    answer:
      'بیچنے کے لیے رکھا اسٹاک عام طور پر مالِ تجارت مانا جاتا ہے، اور زکوٰۃ کی تاریخ پر کیش اور وصول ہونے والی رقم کے ساتھ اس کی قیمت لگتی ہے۔ دکان کا فرنیچر، فٹنگز، مشینیں، کاروبار کی گاڑیاں اور خود عمارت عموماً نہیں گنی جاتیں، کیونکہ یہ بیچنے کے لیے نہیں۔ اسٹاک کی قیمت کاسٹ پر لگے یا بیچنے کی قیمت پر، ایسی تفصیلات میں علما کی رائے الگ ہے، اس لیے اپنے عالم سے پوچھ لیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-zakat-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-zakat-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'چاندی کا نصاب لوں یا سونے کا؟',
    answer:
      'دونوں بنیادی ذرائع سے آتے ہیں، اور علما کی رائے الگ ہے۔ چاندی کا نصاب روپوں میں بہت کم بنتا ہے، اس لیے زیادہ لوگ اس تک پہنچتے ہیں اور زیادہ زکوٰۃ ادا ہوتی ہے؛ پاکستان میں بہت سے لوگ اسی پر چلتے ہیں۔ سونے کا نصاب زیادہ ہے۔ جو آپ کا عالم بتائے وہ چنیں؛ کیلکولیٹر آپ کے لکھے ریٹ پر دونوں دھاتوں کا نصاب روپوں میں دکھاتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-zakat-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-zakat-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا اس کیلکولیٹر کو آج کا سونے یا چاندی کا ریٹ معلوم ہے؟',
    answer:
      'نہیں۔ ریٹ روز بدلتے ہیں اور ہر شہر میں الگ ہوتے ہیں، اس لیے یہ ٹول اپنا کوئی ریٹ نہیں دکھاتا۔ زکوٰۃ کی تاریخ پر اپنے مقامی صرافہ بازار یا کسی بھروسے والی روزانہ ریٹ لسٹ سے فی تولہ ریٹ لکھیں۔ لکھتے ہی نصاب اور نتیجہ بدل جاتے ہیں، اور آپ کا لکھا کچھ بھی نہ بھیجا جاتا ہے نہ محفوظ ہوتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-zakat-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'zakat-calculator',
  title: 'کاروباری اسٹاک کے لیے زکوٰۃ کیلکولیٹر',
  summary:
    'دکان یا کاروبار کی زکوٰۃ کا اندازہ لگائیں: گلے اور بینک کا کیش، بیچنے والا اسٹاک، وصول ہونے والا ادھار اور سونا جوڑیں، ابھی ادا ہونے والے قرض نکالیں، اور نصاب سے ملائیں۔ نصاب کے لیے چاندی یا سونا چنیں اور اس دن کا فی تولہ ریٹ لکھیں؛ زکوٰۃ خالص مال کا 2.5% ہے۔',
  data: {
    toolKey: 'zakat-calculator',
    kind: 'زکوٰۃ',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'شرح', value: 'ایک قمری سال رکھے گئے خالص قابلِ زکوٰۃ مال کا 2.5%' },
        { label: 'نصاب', value: '52.5 تولہ چاندی یا 7.5 تولہ سونا، آپ کے لکھے اس دن کے ریٹ پر' },
        { label: 'شامل', value: 'کیش، بینک اور والٹ، بیچنے والا اسٹاک، وصول ہونے والا ادھار، سونا اور چاندی' },
        { label: 'منفی', value: 'سپلائر کے بل اور ابھی ادا ہونے والے دوسرے قرض' },
      ],
      romanUrdu:
        'Dukaan ki Zakat ka andaza lagayein: galla aur bank ka cash, bechne wala Stock aur wasool hone wala udhaar jorein, jo qarz abhi dena hai wo nikalein. Nisab chandi ya sone par, aaj ke rate se.',
      id: 'b8e611e70344',
    },
    {
      type: 'steps',
      heading: 'کاروباری اسٹاک کے لیے زکوٰۃ کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'زکوٰۃ کی تاریخ چنیں',
          body: 'ہر سال ایک ہی تاریخ رکھیں اور ہر چیز کی قیمت اسی دن کی لیں۔',
        },
        {
          title: 'کاروبار کی ملکیت لکھیں',
          body: 'گلے اور ہاتھ کا کیش، بینک اور JazzCash یا Easypaisa کا بیلنس، بیچنے والا اسٹاک، جو ادھار وصول ہونے کی امید ہے، اور سونا یا چاندی۔',
        },
        {
          title: 'ابھی جو دینا ہے وہ لکھیں',
          body: 'سپلائر کے واجب بل اور دوسرے قرض جو ادا ہونے کا وقت آ چکا ہو، جیسے کرایہ یا تنخواہیں۔',
        },
        {
          title: 'نصاب کی دھات چنیں اور ریٹ لکھیں',
          body: 'چاندی (52.5 تولہ) یا سونا (7.5 تولہ)، اپنے مقامی صرافہ بازار کے اس دن کے فی تولہ ریٹ کے ساتھ۔ نتیجہ نصاب، آپ کا خالص مال اور واجب زکوٰۃ دکھاتا ہے۔',
        },
      ],
      howTo: true,
      id: 'b78176a2ed67',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\n1. **قابلِ زکوٰۃ مال** = کیش + بینک اور والٹ بیلنس + بیچنے والا اسٹاک + وصول ہونے والی رقم + سونا اور چاندی + دوسرا قابلِ زکوٰۃ مال\n2. **خالص قابلِ زکوٰۃ مال** = قابلِ زکوٰۃ مال − ابھی ادا ہونے والے قرض\n3. **نصاب** = 52.5 تولہ × چاندی کا فی تولہ ریٹ، یا 7.5 تولہ × سونے کا فی تولہ ریٹ\n4. اگر خالص مال نصاب کے برابر یا زیادہ ہے تو **زکوٰۃ = خالص مال × 2.5%**\n\n2.5% کی شرح اور 7.5 تولہ سونا یا 52.5 تولہ چاندی کا نصاب حکومتِ پنجاب کی ساتویں جماعت کی ریاضی کی کتاب میں اسی طرح دیا گیا ہے (حوالہ نیچے)۔ ایک تولہ 11.6638 گرام کا ہوتا ہے۔ چونکہ چاندی سونے سے بہت سستی ہے، اس لیے چاندی کا نصاب بہت کم بنتا ہے، اور کون سا لیا جائے اس پر علما کی رائے الگ ہے؛ کیلکولیٹر آپ کو چننے دیتا ہے۔',
      id: 'b7c5f9d63430',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nزکوٰۃ کی تاریخ پر ایک دکان کے گلے میں 85,000 روپے، بینک اور JazzCash میں 240,000، 1,600,000 کا اسٹاک اور 180,000 کا وہ ادھار ہے جس کے وصول ہونے کی امید ہے۔ اسے سپلائرز کو 420,000 دینے ہیں اور 60,000 کرایہ اور تنخواہیں واجب ہیں۔\n\n- قابلِ زکوٰۃ مال = **2,105,000 روپے**\n- ابھی ادا ہونے والے قرض = **480,000 روپے**\n- خالص قابلِ زکوٰۃ مال = **1,625,000 روپے**\n\nفرض کریں اس دن چاندی کا ریٹ 5,000 روپے فی تولہ ہو (یہ صرف مثال ہے؛ اصل ریٹ لکھیں): نصاب = 52.5 × 5,000 = 262,500 روپے۔ خالص مال اس سے زیادہ ہے، اس لیے زکوٰۃ = 1,625,000 × 2.5% = **40,625 روپے**۔\n\nسب سے مشکل نمبر عموماً اسٹاک کی قیمت ہوتا ہے۔ اگر اسٹاک اور کاسٹ کی قیمتیں [Nafaa](/ur/product/inventory) میں رکھی ہوں تو اسٹاک رپورٹ کسی بھی دن کی اسٹاک ویلیو دے دیتی ہے، تاکہ یہ نمبر گنا جائے، اندازے سے نہ لگے۔',
      id: 'b72323a5a522',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'اپنے عالم سے پوچھیں',
      body: 'یہ تیاری میں مدد کے لیے ایک اندازہ ہے۔ نصاب کی دھات، اسٹاک کی قیمت کاسٹ پر یا بیچنے کی قیمت پر، مشکوک وصولیوں اور قرضوں پر علما کی رائے الگ ہے۔ اپنا حساب کسی بھروسے والے عالم سے پکا کر لیں۔',
      id: 'b2fb7e5ee610',
    },
    {
      type: 'sources',
      heading: 'حوالے',
      items: zakatSources,
      id: 'b7c7582a72fc',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'b27c9be8ff1a',
    },
  ],
  faqKeys: ['ur-zakat-calculator-1', 'ur-zakat-calculator-2', 'ur-zakat-calculator-3'],
  relations: [
    { ref: 'TOOL:khata-ageing-calculator@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:ramadan-eid-retail-strategy@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:stock-take@ur', kind: 'RELATED' },
  ],
  seoTitle: 'کاروباری اسٹاک اور دکان کے لیے زکوٰۃ کیلکولیٹر (پاکستان)',
  seoDescription:
    'پاکستان کی دکانوں کے لیے فری زکوٰۃ کیلکولیٹر: اسٹاک، کیش، بینک اور وصولیاں منفی قرض، آپ کے فی تولہ ریٹ پر چاندی یا سونے کا نصاب، 2.5% زکوٰۃ۔',
  focusKeyword: 'کاروبار زکوٰۃ کیلکولیٹر',
  sortOrder: 90,
  origin: 'translation of content/tools/money.ts (26 Oct 2026)',
  evidence: [
    'apps/site/src/components/islands/tools/facts.ts',
    'apps/web/src/modules/inventory/stock-report/components/LedgerView.tsx',
  ],
  sources: zakatSources,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [
    'Religious content: owner may want a scholar to review the zakat page wording before publishing.',
    'Urdu religious terms (زکوٰۃ، نصاب، مالِ تجارت، قابلِ زکوٰۃ مال) should be part of the same scholar review.',
  ],
};
