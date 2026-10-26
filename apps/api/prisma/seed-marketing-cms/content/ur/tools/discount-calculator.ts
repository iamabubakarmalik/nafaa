/** Urdu: Discount calculator (/ur/tools/discount-calculator). Translation of content/tools/pricing.ts (discount-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic, no outside facts. Nafaa claims: discounts page (sales/discounts) and profit report.';
const faqEvidence = [
  'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
  'apps/web/src/modules/finance/profit-report/api.ts',
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-discount-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کسی قیمت پر 20% ڈسکاؤنٹ کیسے نکالیں؟',
    answer:
      'قیمت کو 0.8 سے ضرب دیں۔ 2,500 روپے پر 20% ڈسکاؤنٹ: 2,500 × 0.8 = 2,000 روپے، یعنی 500 روپے کی بچت۔ کسی بھی فیصد کے لیے اسے 100 میں سے نفی کریں، 100 سے تقسیم کریں اور قیمت کو اس نتیجے سے ضرب دیں۔ اس کیلکولیٹر کا % off والا طریقہ یہ خود کر دیتا ہے اور روپوں میں بچت بھی دکھاتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-discount-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-discount-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'فیصد والا ڈسکاؤنٹ بہتر ہے یا روپوں والا؟',
    answer:
      'دونوں ایک ہی چیز ہیں، بس الگ طرح لکھی ہوئی، لیکن گاہک انہیں الگ طرح پڑھتے ہیں۔ سستی چیزوں پر فیصد اکثر بڑا لگتا ہے، اور مہنگی چیزوں پر روپوں والی رقم۔ آپ کے پرافٹ کے لیے اصل بات یہ ہے کہ ہر چیز پر کتنے روپے کم ہوئے اور اس چیز پر پرافٹ کتنا تھا۔ دونوں طریقے اپنی کاسٹ کے ساتھ یہاں لکھیں اور باقی بچا پرافٹ ملا کر دیکھیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-discount-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-discount-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'ڈسکاؤنٹ پورا کرنے کے لیے کتنا زیادہ بیچنا ہوگا؟',
    answer:
      'ڈسکاؤنٹ سے پہلے ایک چیز کے پرافٹ کو ڈسکاؤنٹ کے بعد والے پرافٹ سے تقسیم کریں۔ اگر ایک چیز پر 100 روپے کماتے تھے اور ڈسکاؤنٹ کے بعد 60 بچتے ہیں، تو صرف برابر رہنے کے لیے 100 ÷ 60، یعنی تقریباً 1.67 گنا چیزیں بیچنی ہوں گی۔ کاسٹ لکھنے پر کیلکولیٹر یہ نمبر دکھاتا ہے، تاکہ آپ فیصلہ کر سکیں کہ سیل لگانا فائدے کا ہے یا نہیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-discount-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'discount-calculator',
  title: 'ڈسکاؤنٹ کیلکولیٹر',
  summary:
    'فیصد یا روپوں والے ڈسکاؤنٹ کے بعد سیل کی قیمت نکالیں، یا دو قیمتوں کے بیچ ڈسکاؤنٹ % معلوم کریں۔ اپنی کاسٹ ڈالیں تو سیل کا اعلان کرنے سے پہلے دکھ جائے گا کہ ڈسکاؤنٹ کے بعد کتنا پرافٹ بچتا ہے اور اتنا ہی پرافٹ کمانے کو کتنی زیادہ چیزیں بیچنی ہوں گی۔',
  data: {
    toolKey: 'discount-calculator',
    kind: 'ڈسکاؤنٹ',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'سیل کی قیمت', value: 'قیمت × (1 − ڈسکاؤنٹ ÷ 100)' },
        { label: 'ڈسکاؤنٹ %', value: '(پرانی قیمت − نئی قیمت) ÷ پرانی قیمت × 100' },
        { label: 'کتنی زیادہ سیل چاہیے', value: 'پہلے کا پرافٹ ÷ بعد کا پرافٹ' },
        { label: 'طریقے', value: '% off، روپے off، یا دو قیمتوں سے % نکالیں' },
      ],
      romanUrdu:
        'Discount ke baad price kitni banegi, aur Profit kitna bachega, yahan dekhein. Cost likhenge to ye bhi pata chalega ke wohi Profit kamane ke liye kitna zyada bechna hoga.',
      id: 'b89a318fef3e',
    },
    {
      type: 'steps',
      heading: 'ڈسکاؤنٹ کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'طریقہ چنیں',
          body: '"15% off" کے لیے **% ڈسکاؤنٹ**، "200 روپے off" کے لیے **Rs ڈسکاؤنٹ**، اور اگر پہلے اور بعد کی قیمت معلوم ہے تو **% معلوم کریں** چنیں۔',
        },
        {
          title: 'اصل قیمت لکھیں',
          body: 'شیلف یا مینیو پر لکھی عام قیمت۔',
        },
        {
          title: 'ڈسکاؤنٹ یا نئی قیمت لکھیں',
          body: 'سیل کی قیمت اور بچنے والے روپے فوراً سامنے آ جاتے ہیں۔',
        },
        {
          title: 'اپنی کاسٹ لکھیں',
          body: 'یہ اختیاری ہے، لیکن کام کی بات یہیں ہے: ایک چیز پر پہلے اور بعد کا پرافٹ، نیا مارجن، اور یہ کہ اتنا ہی پرافٹ رکھنے کو کتنے گنا چیزیں بیچنی ہوں گی۔',
        },
      ],
      howTo: true,
      id: 'bcd919a4d6b5',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\n- سیل کی قیمت = اصل قیمت × (1 − ڈسکاؤنٹ % ÷ 100)\n- ڈسکاؤنٹ % = (اصل قیمت − سیل کی قیمت) ÷ اصل قیمت × 100\n- ڈسکاؤنٹ کے بعد پرافٹ = سیل کی قیمت − کاسٹ\n- اتنا ہی پرافٹ رکھنے کے لیے سیل = پہلے کا پرافٹ ÷ بعد کا پرافٹ\n\nآخری لائن وہ ہے جو اکثر سیل لگاتے وقت بھول جاتی ہے۔ ڈسکاؤنٹ پوری قیمت میں سے نہیں، سیدھا آپ کے پرافٹ میں سے کٹتا ہے، اس لیے چھوٹا سا لگنے والا ڈسکاؤنٹ بھی ہر چیز کی کمائی آدھی کر سکتا ہے۔',
      id: 'b482e6a8cfd2',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک شرٹ 1,200 روپے میں بکتی ہے اور آپ کو 900 روپے میں پڑتی ہے۔ آپ عید پر 15% ڈسکاؤنٹ لگانا چاہتے ہیں۔\n\n- ڈسکاؤنٹ = 1,200 × 15 ÷ 100 = **180 روپے**، سیل کی قیمت **1,020 روپے**\n- پہلے کا پرافٹ = 1,200 − 900 = **300 روپے**؛ بعد کا = 1,020 − 900 = **120 روپے**\n- مارجن 25% سے گر کر 11.8% رہ جاتا ہے\n- اتنا ہی پرافٹ کمانے کے لیے 300 ÷ 120 = **2.5 گنا** شرٹس بیچنی ہوں گی\n\nاگر سیل سے ڈھائی گنا مال نہیں نکلے گا تو کم ڈسکاؤنٹ، صرف آہستہ بکنے والے اسٹاک پر ڈسکاؤنٹ، یا بنڈل بہتر رہ سکتا ہے۔ Nafaa میں [ڈسکاؤنٹ](/ur/product/pos) فیصد یا رقم دونوں طرح رکھا جا سکتا ہے، اور بعد میں [پرافٹ رپورٹ](/ur/product/reports) دکھاتی ہے کہ سیل نے اصل میں کتنا کمایا۔',
      id: 'b463a45bc237',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'ba09af4fa66e',
    },
  ],
  faqKeys: ['ur-discount-calculator-1', 'ur-discount-calculator-2', 'ur-discount-calculator-3'],
  relations: [
    { ref: 'TOOL:profit-margin-calculator@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:discount@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:ramadan-eid-retail-strategy@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:pricing-strategy-small-shop@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
  ],
  seoTitle: 'ڈسکاؤنٹ اور سیل قیمت کیلکولیٹر (ڈسکاؤنٹ کے بعد پرافٹ)',
  seoDescription:
    'فری ڈسکاؤنٹ کیلکولیٹر: فیصد یا روپوں کے ڈسکاؤنٹ سے سیل کی قیمت، دو قیمتوں کے بیچ %، اور ڈسکاؤنٹ کے بعد بچا پرافٹ، پاکستانی دکانوں کے لیے۔',
  focusKeyword: 'ڈسکاؤنٹ کیلکولیٹر',
  sortOrder: 30,
  origin: 'translation of content/tools/pricing.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/sales/discounts/pages/DiscountsPage.tsx',
    'apps/web/src/modules/finance/profit-report/api.ts',
  ],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
