/** Urdu: Udhaar (khata) ageing calculator (/ur/tools/khata-ageing-calculator). Translation of content/tools/money.ts (khata-ageing-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic. Bands copied from the khata book (KhataBookPage.tsx AGING: under 7, 7-30, 30-90, 90+ days; sort "Purana udhaar pehle"). Reminders: WhatsApp reminder wizard on the khata book (KhataTools ReminderWizard). Stock value on any date: stock-report LedgerView.';
const faqEvidence = [
  'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
  'apps/web/src/modules/customers/khata/index.ts',
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-khata-ageing-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کھاتے یا ادھار میں ایجنگ کا کیا مطلب ہے؟',
    answer:
      'ایجنگ کا مطلب ہے گاہکوں کے ذمے پیسوں کو اس حساب سے الگ کرنا کہ وہ کتنے عرصے سے ادا نہیں ہوئے۔ ایک کل رقم کے بجائے آپ دیکھتے ہیں کہ کتنا چند دن پرانا ہے اور کتنا مہینوں سے رکا ہے۔ نیا ادھار عام کاروباری ادھار ہے؛ پرانا ادھار خطرے میں پڑا پیسہ ہے جس کے پیچھے لگنا پڑتا ہے۔ یہاں کے دنوں کے خانے وہی ہیں جو Nafaa اپنے کھاتے میں استعمال کرتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-khata-ageing-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-khata-ageing-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'دن بل کی تاریخ سے گنوں یا آخری ادائیگی سے؟',
    answer:
      'جو گاہک ہر بل الگ سے چکاتا ہے، اس کے لیے سب سے پرانے بقایا بل کی تاریخ سے گنیں۔ چلتے کھاتے میں، جہاں گاہک کبھی کبھار کچھ دے دیتا ہے، آخری ادائیگی سے گزرے دن زیادہ کام کا اشارہ ہیں۔ جو بھی طریقہ لیں، سب گاہکوں پر ایک ہی رکھیں تاکہ خانوں کا موازنہ برابر کی چیزوں میں ہو۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-khata-ageing-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-khata-ageing-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کتنا پرانا ادھار بہت زیادہ ہے؟',
    answer:
      'یہ آپ کے مارجن اور کیش کی ضرورت پر منحصر ہے، لیکن دو نمبر دیکھتے رہیں: 30 دن سے پرانے ادھار کا حصہ، اور کل ادھار ایک ہفتے کی سیل کے مقابلے میں۔ اگر پرانا حصہ بڑھتا جائے، یا ادھار اس کیش سے زیادہ ہو جو دوبارہ مال لانے کو چاہیے، تو سب سے پرانے بقایا والوں کا نیا ادھار بند کریں اور مزید دینے سے پہلے وصولی کریں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-khata-ageing-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'khata-ageing-calculator',
  title: 'ادھار (کھاتہ) ایجنگ کیلکولیٹر',
  summary:
    'ہر گاہک کا بقایا اور وہ کتنے دن سے ادا نہیں ہوا، لکھیں، اور اپنا ادھار دنوں کے خانوں میں بٹا دیکھیں: 7 دن سے کم، 7 سے 30، 30 سے 90 اور 90 دن سے زیادہ۔ یہ دکھاتا ہے کہ کتنا پیسہ پرانا ہو رہا ہے، بقایا رقم کی اوسط عمر کیا ہے، اور پہلے کسے فون کرنا ہے۔',
  data: {
    toolKey: 'khata-ageing-calculator',
    kind: 'ادھار ایجنگ',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        {
          label: 'خانے',
          value: '7 دن سے کم، 7-30، 30-90، 90+ دن (وہی خانے جو Nafaa کے کھاتے میں ہیں)',
        },
        { label: 'اوسط عمر', value: '(رقم × دن) کا جوڑ ÷ کل بقایا' },
        { label: 'پہلے فون کریں', value: '30 دن سے پرانے بقایا، سب سے پرانا پہلے' },
        { label: 'پرائیویسی', value: 'نام اور رقمیں آپ کے براؤزر میں ہی رہتی ہیں' },
      ],
      romanUrdu:
        'Har customer ka baqi udhaar aur kitne din purana hai likhein. Pata chal jayega ke kitna paisa purana ho raha hai, aur kis se pehle wasooli karni hai.',
      id: 'b4a109aa3c73',
    },
    {
      type: 'steps',
      heading: 'ادھار (کھاتہ) ایجنگ کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'ہر وہ گاہک لکھیں جس کے ذمے پیسے ہیں',
          body: 'ہر گاہک کی ایک لائن: کھاتہ رجسٹر سے اس کا بقایا۔',
        },
        {
          title: 'کتنے دن سے ادا نہیں ہوا، لکھیں',
          body: 'سب سے پرانے بقایا بل سے گزرے دن، یا اگر گاہک قسطوں میں دیتا ہے تو آخری ادائیگی سے۔ اندازاً نمبر بھی چلے گا۔',
        },
        {
          title: 'خانے پڑھیں',
          body: 'ہر خانہ رقم، گاہکوں کی تعداد اور کل میں اپنا حصہ دکھاتا ہے۔ اوپر کی لائن بتاتی ہے کہ کتنا 30 دن سے پرانا ہے۔',
        },
        {
          title: 'نیچے والی لسٹ کو فون کریں',
          body: '**پہلے انہیں فون کریں** لسٹ 30 دن سے پرانے بقایا دکھاتی ہے، سب سے پرانا پہلے۔ واٹس ایپ یاد دہانیاں یہیں سے شروع کریں۔',
        },
      ],
      howTo: true,
      id: 'bd46b8f6b5e0',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\nہر بقایا اپنے دنوں کے حساب سے ایک خانے میں جاتا ہے: **7 سے کم**، **7 سے 30**، **30 سے 90** اور **90 یا زیادہ**۔ کیلکولیٹر ہر خانے کی رقم جوڑتا اور گاہک گنتا ہے، اور ساری بقایا رقم کی **اوسط عمر** رقم کے وزن سے نکالتا ہے:\n\nاوسط عمر = (بقایا × دن) کا جوڑ ÷ کل ادھار\n\nرقم کا وزن دینا ضروری ہے۔ ایک ہفتہ پرانے دس چھوٹے بقایا اور تین مہینے پرانا ایک بڑا بقایا، سادہ اوسط میں کم نظر آ سکتے ہیں، حالانکہ زیادہ تر پیسہ اصل میں اسی پرانے بقایا میں پھنسا ہے۔',
      id: 'bbf36bcda0db',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک گروسری اسٹور کے کھاتے پر پانچ گاہک ہیں:\n\n| گاہک | بقایا | دن |\n|---|---|---|\n| نسرین | 8,200 | 6 |\n| بلال اسٹور | 12,600 | 14 |\n| اسلم | 3,450 | 25 |\n| کاشف | 2,750 | 48 |\n| راشد | 5,000 | 95 |\n\nکل ادھار **32,000 روپے** ہے۔ 7 دن سے کم: 8,200۔ 7 سے 30 دن: 16,050۔ 30 سے 90 دن: 2,750۔ 90 دن سے زیادہ: 5,000۔ یعنی **7,750 روپے (24%) 30 دن سے پرانے ہیں**، اور وزن والی اوسط عمر تقریباً **29 دن** ہے۔ فون کی لسٹ میں پہلے راشد، پھر کاشف۔\n\nNafaa کا [ڈیجیٹل کھاتہ](/ur/product/khata) یہ تقسیم خود تازہ رکھتا ہے: کھاتہ یہی چار خانے ہر ایک کی رقم اور گاہکوں کے ساتھ دکھاتا ہے، گاہکوں کو سب سے پرانے ادھار کے حساب سے ترتیب دیتا ہے، اور واٹس ایپ پر ادائیگی کی یاد دہانی بھیجتا ہے۔',
      id: 'bbd9f3cb58e8',
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'پرانا ادھار وصول کرنا مشکل ہوتا ہے',
      body: 'ہر گاہک کی ادھار کی حد رکھیں اور مقررہ دنوں پر یاد دلائیں۔ جو بقایا بغیر ادائیگی کے 30 دن پار کر جائے، اس پر فون بنتا ہے، ادھار پر مزید مال نہیں۔',
      id: 'b092428d476b',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'b16bd9aee55f',
    },
  ],
  faqKeys: ['ur-khata-ageing-calculator-1', 'ur-khata-ageing-calculator-2', 'ur-khata-ageing-calculator-3'],
  relations: [
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:khata-udhaar-register@ur', kind: 'RELATED' },
  ],
  seoTitle: 'ادھار (کھاتہ) ایجنگ کیلکولیٹر: پہلے کس سے وصولی کریں',
  seoDescription:
    'دکانوں کے لیے فری ادھار ایجنگ کیلکولیٹر: گاہکوں کے کھاتے کے بقایا 0-7، 7-30، 30-90 اور 90+ دن کے خانوں میں، اوسط عمر اور پہلے کسے فون کرنا ہے۔',
  focusKeyword: 'ادھار ایجنگ',
  sortOrder: 80,
  origin: 'translation of content/tools/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/khata/index.ts',
  ],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
