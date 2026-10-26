/** Urdu: Break-even calculator (/ur/tools/break-even-calculator). Translation of content/tools/pricing.ts (break-even-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic, no outside facts. Nafaa claims: daily sales and margin in reports (modules/reports, finance/profit-report).';
const faqEvidence = ['apps/web/src/modules/finance/profit-report/api.ts', 'apps/web/src/modules/reports'];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-break-even-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'فکس کاسٹ میں کیا کیا آتا ہے؟',
    answer:
      'ہر وہ خرچ جو آپ ہر مہینے دیتے ہیں چاہے ایک گاہک بھی نہ آئے: کرایہ، پکے اسٹاف کی تنخواہیں، بجلی اور انٹرنیٹ کے کم از کم بل، سیکیورٹی، سافٹ ویئر، قرض کی قسط اور جنریٹر کی دیکھ بھال۔ جو خرچ ہر سیل کے ساتھ بڑھتے ہیں، جیسے خود مال، پیکنگ، ڈیلیوری اور کارڈ کی فیس، وہ بدلنے والی کاسٹ ہیں اور انہیں ایک چیز کی کاسٹ یا مارجن میں ڈالیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-break-even-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-break-even-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'اپنا اوسط مارجن کہاں سے لوں؟',
    answer:
      'سب سے اچھا ذریعہ اصل بلوں سے بنی پرافٹ رپورٹ ہے، جو مہینے کی سیل اور گراس پرافٹ دکھاتی ہے؛ مارجن پرافٹ کو سیل سے تقسیم کر کے نکلتا ہے۔ رپورٹ نہ ہو تو ایک ہفتے کے بل سیل کی قیمت پر اور کاسٹ پر جمع کریں، اور فرق کو کل سیل سے تقسیم کریں۔ چند اہم چیزیں ہاتھ سے چیک کرنے کے لیے پرافٹ مارجن کیلکولیٹر استعمال کریں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-break-even-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-break-even-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا ریسٹورنٹ یہ کیلکولیٹر استعمال کر سکتا ہے؟',
    answer:
      'جی ہاں۔ One main item چنیں، قیمت میں ایک گاہک کا اوسط بل اور کاسٹ میں اس بل کے کھانے کی کاسٹ لکھیں۔ یا Many products چن کر کھانے کی کاسٹ کے بعد کا گراس مارجن لکھیں۔ اسٹاف کی تنخواہیں، کرایہ، گیس اور بجلی فکس کاسٹ میں ڈالیں۔ پھر روزانہ والا نمبر بتاتا ہے کہ عام دن میں کتنی سیل، یا کتنے گاہک، چاہییں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-break-even-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'break-even-calculator',
  title: 'بریک ایون کیلکولیٹر',
  summary:
    'معلوم کریں کہ کرایہ، تنخواہیں اور بل پورے کرنے کے لیے ہر مہینے اور ہر دن کتنی سیل چاہیے، اور چاہا ہوا پرافٹ کمانے کو کتنی اور۔ ایک چیز کی قیمت اور کاسٹ لکھیں، یا سینکڑوں پروڈکٹس بیچتے ہیں تو دکان کا اوسط مارجن۔',
  data: {
    toolKey: 'break-even-calculator',
    kind: 'بریک ایون',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'بریک ایون سیل', value: 'فکس کاسٹ ÷ ہر سیل کا وہ حصہ جو اس کی کاسٹ کے بعد بچتا ہے' },
        { label: 'بریک ایون تعداد', value: 'فکس کاسٹ ÷ (قیمت − ایک چیز کی کاسٹ)' },
        { label: 'پرافٹ کے ہدف کے ساتھ', value: '(فکس کاسٹ + ہدف) ÷ بچنے والا حصہ' },
        { label: 'دو طریقے', value: 'ایک بڑی چیز، یا بہت سی پروڈکٹس والی دکان کا اوسط مارجن' },
      ],
      romanUrdu:
        'Kiraya, tankhwah aur bill nikalne ke liye mahine aur roz kitni Sale chahiye, ye yahan nikalein. Jitna Profit chahiye wo likhein to us ke liye zaroori Sale bhi dikhegi.',
      id: 'b6a6e3ceb64d',
    },
    {
      type: 'steps',
      heading: 'بریک ایون کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'اپنی فکس کاسٹ لکھیں',
          body: 'کرایہ، تنخواہیں، بجلی، گیس اور انٹرنیٹ، اور ہر وہ خرچ جو سیل ہو یا نہ ہو ہر مہینے دینا پڑتا ہے: جنریٹر کا تیل، سافٹ ویئر، قرض کی قسط۔',
        },
        {
          title: 'چنیں کہ آپ کیسے بیچتے ہیں',
          body: 'جس کاروبار میں ایک پروڈکٹ، ایک عام پلیٹ یا ایک سروس ہو، اس کے لیے **ایک ہی بڑا آئٹم**۔ دکان کے لیے **بہت سی چیزیں**، جہاں آپ اوسط گراس مارجن لکھتے ہیں۔',
        },
        {
          title: 'قیمت اور کاسٹ، یا مارجن لکھیں',
          body: 'ایک چیز ہو تو اس کی بیچنے کی قیمت اور اس کی اپنی کاسٹ۔ بہت سی پروڈکٹس ہوں تو پرافٹ رپورٹ سے، یا ایک ہفتے کے بلوں سے، اوسط مارجن۔',
        },
        {
          title: 'کھلے دن اور پرافٹ کا ہدف لکھیں',
          body: 'کھلے دنوں سے مہینے کا نمبر روزانہ کے نمبر میں بدل جاتا ہے۔ پرافٹ کا ہدف دکھاتا ہے کہ آپ کو بھی کچھ بچانے کے لیے کتنی سیل چاہیے۔',
        },
      ],
      howTo: true,
      id: 'b9d57fdf02f2',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\nہر سیل بکے ہوئے مال کی قیمت دینے کے بعد کچھ چھوڑتی ہے: اسے **کنٹری بیوشن** کہتے ہیں۔ ایک چیز کے لیے یہ قیمت − کاسٹ ہے۔ سیل کے حصے کے طور پر یہ گراس مارجن ہے۔ بریک ایون وہ سیل ہے جس پر یہ سارے کنٹری بیوشن مل کر فکس کاسٹ کے برابر ہو جائیں:\n\n- بریک ایون سیل = فکس کاسٹ ÷ کنٹری بیوشن کا حصہ\n- بریک ایون تعداد = فکس کاسٹ ÷ ایک چیز کا کنٹری بیوشن\n- پرافٹ کے ہدف کے لیے سیل = (فکس کاسٹ + چاہا ہوا پرافٹ) ÷ کنٹری بیوشن کا حصہ\n\nبریک ایون سے اوپر، ہر اضافی سیل کا پورا کنٹری بیوشن پرافٹ ہے۔ اس سے نیچے، دکان اپنے خرچ بچت یا ادھار سے پورے کر رہی ہوتی ہے۔',
      id: 'ba69d4ffa76a',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک جنرل اسٹور 60,000 روپے کرایہ، 90,000 روپے تنخواہیں، 30,000 روپے بل اور 20,000 روپے دوسری فکس کاسٹ دیتا ہے: **مہینے کے 200,000 روپے**۔ تمام پروڈکٹس پر اس کا اوسط گراس مارجن 16% ہے۔\n\n- بریک ایون سیل = 200,000 ÷ 0.16 = **مہینے کے 1,250,000 روپے**\n- مہینے میں 30 دن کھلے، تو یہ تقریباً **روزانہ 41,700 روپے کی سیل** ہے\n- اوپر سے 100,000 روپے پرافٹ کے لیے: 300,000 ÷ 0.16 = **مہینے کے 1,875,000 روپے**، تقریباً 62,500 روزانہ\n\nاگر آہستہ بکنے والی چیزوں کی قیمت بہتر رکھ کر یا ضائع ہونے والا مال کم کر کے اوسط مارجن 16% سے 18% ہو جائے، تو بریک ایون تقریباً 1,111,000 روپے پر آ جاتا ہے: یعنی اسی دکان کو ہر مہینے تقریباً 139,000 روپے کم سیل چاہیے۔ Nafaa کی [رپورٹس](/ur/product/reports) روزانہ کی سیل اور مارجن دکھاتی ہیں، تاکہ آپ ہر دن دیکھ سکیں کہ آپ لائن سے اوپر ہیں یا نہیں۔',
      id: 'bb85b49b6327',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'bbbd505a870a',
    },
  ],
  faqKeys: ['ur-break-even-calculator-1', 'ur-break-even-calculator-2', 'ur-break-even-calculator-3'],
  relations: [
    { ref: 'TOOL:profit-margin-calculator@ur', kind: 'RELATED' },
    { ref: 'TOOL:food-cost-calculator@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:reports@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:gross-margin@ur', kind: 'RELATED' },
  ],
  seoTitle: 'دکانوں اور ریسٹورنٹس کے لیے بریک ایون کیلکولیٹر (فری)',
  seoDescription:
    'پاکستانی دکانوں اور ریسٹورنٹس کے لیے فری بریک ایون کیلکولیٹر: کرایہ، تنخواہیں، بل اور اپنا پرافٹ پورا کرنے کو مہینے اور روزانہ کتنی سیل چاہیے۔',
  focusKeyword: 'بریک ایون کیلکولیٹر',
  sortOrder: 40,
  origin: 'translation of content/tools/pricing.ts (26 Oct 2026)',
  evidence: ['apps/web/src/modules/finance/profit-report/api.ts', 'apps/web/src/modules/reports'],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
