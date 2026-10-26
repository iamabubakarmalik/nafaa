/** Urdu: Profit margin calculator (/ur/tools/profit-margin-calculator). Translation of content/tools/pricing.ts (profit-margin-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic, no outside facts. Nafaa claims: cost price per product (import columns.ts) and margin in the profit report (finance/profit-report).';
const faqEvidence = [
  'apps/web/src/modules/finance/profit-report/api.ts',
  'apps/web/src/modules/inventory/products/import/columns.ts',
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-profit-margin-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کریانہ یا جنرل اسٹور کے لیے کتنا پرافٹ مارجن ٹھیک ہے؟',
    answer:
      'یہ چیز پر منحصر ہے۔ آٹا، چینی اور تیل جیسی جلدی بکنے والی چیزوں پر مارجن عموماً کم ہوتا ہے، کیونکہ یہ ہر دکان بیچتی ہے۔ اسنیکس، کاسمیٹکس اور کھلی چیزوں پر زیادہ ہوتا ہے۔ پوری دکان کا ایک ہدف رکھنے کے بجائے ہر کیٹیگری کا مارجن دیکھیں، اور یقینی بنائیں کہ آہستہ بکنے والی اور جگہ گھیرنے والی چیزیں اپنی شیلف کے لائق کمائیں۔ یہ کیلکولیٹر ہر چیز پر چلائیں، پھر پرافٹ رپورٹ میں کیٹیگریز ملائیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-profit-margin-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-profit-margin-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'قیمت رکھنے کے لیے مارجن استعمال کروں یا مارک اپ؟',
    answer:
      'ایک ہی طریقہ رکھیں تو دونوں چلتے ہیں، لیکن مارجن زیادہ محفوظ ہے، کیونکہ یہ گاہک کی دی ہوئی قیمت پر ناپا جاتا ہے، وہی بنیاد جس پر سیل اور ایکسپینس ہیں۔ کئی دکاندار کاسٹ پر مارک اپ لگاتے ہیں اور اسے مارجن سمجھ لیتے ہیں، جس سے پرافٹ اصل سے زیادہ لگتا ہے۔ مارک اپ میں سوچتے ہیں تو یہاں Target markup چنیں اور فیصلے سے پہلے اس کا دکھایا مارجن پڑھ لیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-profit-margin-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-profit-margin-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا کاسٹ میں کرایہ اور تنخواہیں شامل ہوتی ہیں؟',
    answer:
      'نہیں۔ یہاں صرف چیز کی اپنی کاسٹ لکھیں: خرید کی قیمت، کرایہ بار برداری، لوڈنگ اور پیکنگ۔ دکان کا کرایہ، تنخواہیں اور بل فکس کاسٹ ہیں؛ یہ بہت سی سیل کے کل پرافٹ سے پورے ہوتے ہیں۔ یہ دیکھنے کے لیے کہ انہیں پورا کرنے کو کتنی سیل چاہیے، اس ٹول سے نکلا ہوا اوسط مارجن بریک ایون کیلکولیٹر میں ڈالیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-profit-margin-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'profit-margin-calculator',
  title: 'پرافٹ مارجن کیلکولیٹر',
  summary:
    'اپنی کاسٹ اور بیچنے کی قیمت سے پرافٹ، مارجن اور مارک اپ نکالیں، یا وہ قیمت معلوم کریں جو آپ کا چاہا ہوا مارجن دے۔ پاکستان کی دکانوں کے لیے بنا ہے: روپے میں رقم لکھیں، کل پرافٹ کے لیے تعداد ڈالیں، اور دیکھیں کہ 25% مارک اپ صرف 20% مارجن کیوں ہوتا ہے۔',
  data: {
    toolKey: 'profit-margin-calculator',
    kind: 'پرافٹ مارجن',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'مارجن', value: 'پرافٹ ÷ بیچنے کی قیمت × 100' },
        { label: 'مارک اپ', value: 'پرافٹ ÷ کاسٹ × 100' },
        { label: 'چاہے ہوئے مارجن کی قیمت', value: 'کاسٹ ÷ (1 − مارجن ÷ 100)' },
        { label: 'کیا آف لائن چلتا ہے؟', value: 'یہ آپ کے براؤزر میں چلتا ہے؛ نہ کچھ بھیجا جاتا ہے نہ محفوظ ہوتا ہے' },
      ],
      romanUrdu:
        'Cost aur bechne ki price likhein: Profit, margin aur markup foran nazar aayega. Jitna margin chahiye wo likhein to sahi price bhi mil jayegi.',
      id: 'b9980763360f',
    },
    {
      type: 'steps',
      heading: 'پرافٹ مارجن کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'جو آپ کو معلوم ہے وہ چنیں',
          body: 'اگر چیز پہلے سے بیچ رہے ہیں تو **قیمت معلوم ہے** چنیں، اور اگر نئی قیمت رکھ رہے ہیں تو **مارجن کا ہدف** یا **مارک اپ کا ہدف** چنیں۔',
        },
        {
          title: 'ایک چیز کی کاسٹ لکھیں',
          body: 'پوری کاسٹ لکھیں: خرید کی قیمت، کرایہ بار برداری، لوڈنگ اور پیکنگ اگر ہو۔ اگر کاسٹ میں ٹرانسپورٹ شامل نہ ہو تو ہر مارجن اصل سے بہتر لگتا ہے۔',
        },
        {
          title: 'قیمت یا چاہا ہوا % لکھیں',
          body: 'لکھتے ہی نتیجہ بدلتا جاتا ہے، اور پرافٹ، مارجن اور مارک اپ ساتھ ساتھ دکھتے ہیں۔',
        },
        {
          title: 'تعداد ڈالیں (اختیاری)',
          body: 'ایک دن یا مہینے میں کتنی بیچتے ہیں، وہ لکھیں تاکہ اس تعداد پر کل پرافٹ دکھے۔',
        },
      ],
      howTo: true,
      id: 'b6d7801ecd03',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\nایک چیز پر پرافٹ ہے **بیچنے کی قیمت − کاسٹ**۔ پھر اسی پرافٹ کو دو طرح پڑھا جاتا ہے:\n\n- **مارجن** پرافٹ کو **بیچنے کی قیمت** سے تقسیم کرتا ہے۔ یہ بتاتا ہے کہ گلے میں آنے والے ہر روپے میں سے کتنا آپ کا ہے۔\n- **مارک اپ** پرافٹ کو **کاسٹ** سے تقسیم کرتا ہے۔ یہ بتاتا ہے کہ جو آپ نے دیا اس کے اوپر کتنا لگایا۔\n\nمارجن سے قیمت رکھنی ہو تو کاسٹ کو (1 − مارجن) سے تقسیم کریں۔ مارک اپ سے رکھنی ہو تو کاسٹ کو (1 + مارک اپ) سے ضرب دیں۔ چونکہ تقسیم کی بنیاد الگ ہے، اس لیے دونوں نمبر کبھی برابر نہیں ہوتے: مارک اپ ہمیشہ بڑا فیصد ہوتا ہے۔',
      id: 'beb2da40bf1e',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nآپ کوکنگ آئل کی ایک بوتل ٹرانسپورٹ سمیت 300 روپے میں خریدتے ہیں اور 375 روپے میں بیچتے ہیں۔\n\n- پرافٹ = 375 − 300 = **75 روپے**\n- مارجن = 75 ÷ 375 = **20%**\n- مارک اپ = 75 ÷ 300 = **25%**\n\nاب ایک نئی چیز کی کاسٹ 480 روپے ہے اور آپ کو 20% مارجن چاہیے۔ قیمت = 480 ÷ (1 − 0.20) = 480 ÷ 0.8 = **600 روپے**۔ اگر آپ اس کے بجائے 20% مارک اپ لگاتے تو قیمت 576 روپے بنتی اور مارجن صرف 16.7% رہتا۔ ہفتے میں ان میں سے 50 بیچیں تو یہ فرق ہر ہفتے 1,200 روپے پرافٹ کا ہے۔\n\nجب آپ کاؤنٹر [Nafaa](/ur/product/inventory) پر چلاتے ہیں تو ہر پروڈکٹ پر کاسٹ اور سیل کی قیمت محفوظ رہتی ہے، اور [پرافٹ رپورٹ](/ur/product/reports) اصل بلوں سے ہر پروڈکٹ اور کیٹیگری کا مارجن دکھاتی ہے، تاکہ اس کیلکولیٹر کے نمبر آپ اصل بکی ہوئی چیزوں سے ملا سکیں۔',
      id: 'b48997aa101c',
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'کھلی چیزوں کی قیمت اصل وزن سے رکھیں',
      body: 'جو چیزیں تول کر بیچتے ہیں (چاول، چینی، دال)، ان میں بوری کی کاسٹ کو اس وزن سے تقسیم کریں جو گرنے بکھرنے کے بعد اصل میں بکتا ہے، بوری پر لکھے وزن سے نہیں۔ پھر وہ کاسٹ یہاں لکھیں۔',
      id: 'be72ce1a1c4f',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'b96980622168',
    },
  ],
  faqKeys: ['ur-profit-margin-calculator-1', 'ur-profit-margin-calculator-2', 'ur-profit-margin-calculator-3'],
  relations: [
    { ref: 'TOOL:discount-calculator@ur', kind: 'RELATED' },
    { ref: 'TOOL:break-even-calculator@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-calculate-profit-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:markup@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:reports@ur', kind: 'RELATED' },
  ],
  seoTitle: 'پرافٹ مارجن اور مارک اپ کیلکولیٹر (فری، روپے میں)',
  seoDescription:
    'پاکستانی دکانوں کے لیے فری پرافٹ مارجن اور مارک اپ کیلکولیٹر۔ کاسٹ اور قیمت، یا چاہا ہوا مارجن لکھیں اور پرافٹ، مارجن %، مارک اپ % اور صحیح قیمت پائیں۔',
  focusKeyword: 'پرافٹ مارجن کیلکولیٹر',
  sortOrder: 10,
  featured: true,
  origin: 'translation of content/tools/pricing.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/profit-report/api.ts',
    'apps/web/src/modules/inventory/products/import/columns.ts',
  ],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
