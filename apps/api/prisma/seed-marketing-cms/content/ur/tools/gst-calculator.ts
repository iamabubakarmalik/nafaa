/** Urdu: GST calculator (/ur/tools/gst-calculator). Translation of content/tools/pricing.ts (gst-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Standard rate 18% checked on 26 Oct 2026 against FBR Circular 1 of 2023 (URL loads, curl 200). Nafaa claims: tax line on bills (core/receipt), optional FBR/PRA integration per settings wording.';
const faqEvidence = ['apps/site/src/components/islands/tools/facts.ts', 'apps/web/src/core/receipt/setup.ts'];

const fbrCircular = {
  title: 'Circular No. 1 of 2023 (Sales Tax and Federal Excise): standard rate raised from 17% to 18%',
  url: 'https://download1.fbr.gov.pk/Docs/20232281524459451Circular01-2023SalesTaxFederalExcise.pdf',
  publisher: 'Federal Board of Revenue',
  accessedAt: '2026-10-26',
};

export const faqs: SeedFaq[] = [
  {
    key: 'ur-gst-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'پاکستان میں GST کی شرح 17% ہے یا 18%؟',
    answer:
      'اشیا پر وفاقی سیلز ٹیکس کی عام شرح FBR Circular No. 1 of 2023 کے بعد سے 18% ہے، جس نے اسے 17% سے بڑھایا۔ کچھ اشیا پر Sales Tax Act کے شیڈولز کے تحت کم یا خاص شرح لگتی ہے، اور سروسز پر صوبے اپنی اپنی شرح سے ٹیکس لیتے ہیں۔ اسی لیے یہ کیلکولیٹر آپ کو کوئی بھی شرح لکھنے دیتا ہے، اور اسی لیے اپنی اشیا کی شرح کی تصدیق کر لیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-gst-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-gst-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'جس قیمت میں GST پہلے سے شامل ہو، اس میں سے ٹیکس کیسے نکالوں؟',
    answer:
      'ٹیکس والی قیمت کو 1 جمع شرح (اعشاریہ میں) سے تقسیم کریں، پھر فرق نکال لیں۔ 18% پر 1.18 سے تقسیم کریں: 590 روپے کی قیمت میں ٹیکس سے پہلے 500 روپے اور ٹیکس 90 روپے ہے۔ 590 کا 18% نہ لیں، کیونکہ اس سے ٹیکس پر بھی ٹیکس لگ جاتا ہے اور رقم زیادہ آتی ہے۔ Remove GST والا طریقہ یہ تقسیم آپ کے لیے کر دیتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-gst-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-gst-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا یہ سروسز پر صوبائی سیلز ٹیکس کے لیے بھی چلتا ہے؟',
    answer:
      'جی ہاں۔ Other rate چنیں اور وہ شرح لکھیں جو آپ کا صوبہ آپ کی سروس پر لیتا ہے، مثلاً جو آپ کی رجسٹریشن یا کسی حالیہ ٹیکس انوائس پر لکھی ہو۔ ٹیکس جوڑنے یا نکالنے کا حساب وہی ہے؛ صرف شرح بدلتی ہے۔ ریسٹورنٹ، سیلون اور دوسرے سروس کاروبار اپنی شرح صوبائی ریونیو اتھارٹی سے پکی کر لیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-gst-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'gst-calculator',
  title: 'GST کیلکولیٹر',
  summary:
    'قیمت پر سیلز ٹیکس جوڑیں یا ٹیکس والی قیمت میں سے ٹیکس نکالیں۔ 18% وفاقی عام شرح اپنے FBR حوالے کے ساتھ پہلے سے لگی ہے، اور کم شرح والی اشیا یا سروسز پر صوبائی ٹیکس کے لیے کوئی بھی شرح لکھ سکتے ہیں۔ نتیجے میں ٹیکس سے پہلے کی قیمت، ٹیکس اور کل رقم دکھتی ہے۔',
  data: {
    toolKey: 'gst-calculator',
    kind: 'GST',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'ٹیکس جوڑیں', value: 'ٹیکس = قیمت × شرح ÷ 100' },
        { label: 'ٹیکس نکالیں', value: 'ٹیکس سے پہلے کی قیمت = ٹیکس والی قیمت ÷ (1 + شرح ÷ 100)' },
        {
          label: 'پہلے سے لگی شرح',
          value: 'اشیا پر 18% عام شرح، Sales Tax Act, 1990 کی section 3(1) (FBR Circular 1 of 2023)',
        },
        { label: 'دوسری شرحیں', value: 'خود لکھیں: کم شرح والی اشیا اور سروسز پر صوبائی ٹیکس کی شرح الگ ہوتی ہے' },
      ],
      romanUrdu:
        'Price par sales tax jorna ho ya tax wali price se tax nikalna ho, dono yahan hote hain. 18% standard rate FBR ke hawale ke saath pehle se hai, koi aur rate khud likh sakte hain.',
      id: 'b743382a3825',
    },
    {
      type: 'steps',
      heading: 'GST کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'جوڑنا ہے یا نکالنا، چنیں',
          body: 'اگر ٹیکس سے پہلے کی قیمت معلوم ہے تو **قیمت میں GST جوڑیں** چنیں۔ اگر قیمت میں ٹیکس پہلے سے شامل ہے، جیسے پیکٹ پر چھپی ریٹیل قیمت، تو **قیمت سے GST نکالیں** چنیں۔',
        },
        {
          title: 'قیمت لکھیں',
          body: 'رقم روپے میں لکھیں۔ کاما لگا سکتے ہیں۔',
        },
        {
          title: 'شرح چنیں',
          body: '18% عام شرح رہنے دیں، یا **کوئی اور ریٹ** چن کر وہ شرح لکھیں جو آپ کی اشیا یا سروس پر لگتی ہے۔',
        },
        {
          title: 'حصے پڑھیں',
          body: 'نتیجے میں ٹیکس سے پہلے کی قیمت، ٹیکس کی رقم اور کل رقم پیسوں تک دکھتی ہے۔',
        },
      ],
      howTo: true,
      id: 'bda2207d574b',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\n**ٹیکس جوڑنا:** ٹیکس = قیمت × شرح ÷ 100، اور کل رقم = قیمت + ٹیکس۔\n\n**ٹیکس نکالنا:** ٹیکس سے پہلے کی قیمت = ٹیکس والی قیمت ÷ (1 + شرح ÷ 100)، اور ٹیکس دونوں کا فرق ہے۔ ایک عام غلطی یہ ہے کہ ٹیکس والی قیمت کا 18% لے لیا جائے؛ اس سے ٹیکس زیادہ گنا جاتا ہے، کیونکہ جس قیمت میں ٹیکس پہلے سے ہو اس کے 18% میں ٹیکس پر ٹیکس بھی آ جاتا ہے۔\n\n18% کی شرح Sales Tax Act, 1990 کی section 3(1) کے تحت عام شرح ہے، جسے FBR Circular No. 1 of 2023 (نیچے لنک) نے 17% سے بڑھایا۔ کچھ اشیا پر شیڈولز کے تحت دوسری شرحیں لگتی ہیں، اور سروسز پر سیلز ٹیکس صوبے اپنی اپنی شرح سے لیتے ہیں، اس لیے کیلکولیٹر کوئی شرح فرض کرنے کے بجائے آپ کو کوئی بھی شرح لکھنے دیتا ہے۔',
      id: 'b4c7241cb65e',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک ہول سیلر ٹیکس سے پہلے 1,000 روپے بتاتا ہے۔ 18% پر: ٹیکس = 1,000 × 18 ÷ 100 = **180 روپے**، کل **1,180 روپے**۔\n\nاب الٹا: ایک کارٹن کا بل 18% ٹیکس سمیت 1,180 روپے ہے۔ ٹیکس سے پہلے کی قیمت = 1,180 ÷ 1.18 = **1,000 روپے**، ٹیکس = **180 روپے**۔ اگر 1,180 کا 18% لیتے تو 212.40 روپے آتا، جو ایک ہی کارٹن پر 32.40 روپے غلط ہے۔\n\nاگر آپ کی دکان کو ٹیکس انوائس دینی ہوتی ہے تو Nafaa میں FBR/PRA انٹیگریشن اختیاری ہے اور ہر بل پر ٹیکس چھپتا ہے؛ یہ کس پر لاگو ہوتا ہے، اس کے لیے [FBR انٹیگریشن](/ur/product/fbr) دیکھیں۔',
      id: 'b7095cf7a7f2',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'شرحیں بدلتی رہتی ہیں',
      body: 'سیلز ٹیکس کی شرحیں Finance Acts اور نوٹیفکیشنز سے طے ہوتی ہیں۔ پہلے سے لگی شرح نیچے دیے FBR سرکلر سے 26 اکتوبر 2026 کو چیک کی گئی؛ بل بنانے سے پہلے اپنی اشیا کی شرح FBR یا اپنے ٹیکس ایڈوائزر سے پکی کر لیں۔',
      id: 'b1198e074235',
    },
    {
      type: 'sources',
      heading: 'حوالے',
      items: [fbrCircular],
      id: 'bf692993a2e5',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'b755500b7b78',
    },
  ],
  faqKeys: ['ur-gst-calculator-1', 'ur-gst-calculator-2', 'ur-gst-calculator-3'],
  relations: [
    { ref: 'GLOSSARY_TERM:sales-tax@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:fbr@ur', kind: 'RELATED' },
    { ref: 'TOOL:receipt-maker@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:strn@ur', kind: 'RELATED' },
  ],
  seoTitle: 'GST کیلکولیٹر پاکستان: 18% سیلز ٹیکس جوڑیں یا نکالیں',
  seoDescription:
    'پاکستان کے لیے فری GST کیلکولیٹر۔ 18% عام شرح یا اپنی لکھی کسی بھی شرح پر قیمت میں سیلز ٹیکس جوڑیں، یا ٹیکس والی قیمت میں سے نکالیں۔',
  focusKeyword: 'GST کیلکولیٹر پاکستان',
  sortOrder: 20,
  featured: true,
  origin: 'translation of content/tools/pricing.ts (26 Oct 2026)',
  evidence: ['apps/site/src/components/islands/tools/facts.ts', 'apps/web/src/core/receipt/setup.ts'],
  sources: [fbrCircular],
  factCheck: {
    checkedOn: '2026-10-26',
    note: 'Urdu translation of the English entry; claims unchanged. English check: standard rate 18% checked on 26 Oct 2026 against FBR Circular 1 of 2023.',
  },
  dropped: [],
  needsOwner: [],
};
