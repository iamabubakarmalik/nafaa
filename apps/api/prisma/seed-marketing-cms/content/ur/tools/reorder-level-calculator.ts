/** Urdu: Reorder level calculator (/ur/tools/reorder-level-calculator). Translation of content/tools/stock.ts (reorder-level-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Reorder point formula checked against Wikipedia "Reorder point" (curl 200, 26 Oct 2026). Nafaa claims: low stock lines with days of cover and suggested order quantity, order per supplier (inventory/low-stock api.ts, OrderModal.tsx).';
const faqEvidence = [
  'apps/web/src/modules/inventory/low-stock/api.ts',
  'apps/web/src/modules/inventory/low-stock/components/OrderModal.tsx',
  'apps/web/src/modules/inventory/products/import/columns.ts',
];

const reorderSource = {
  title: 'Reorder point',
  url: 'https://en.wikipedia.org/wiki/Reorder_point',
  publisher: 'Wikipedia',
  accessedAt: '2026-10-26',
};

export const faqs: SeedFaq[] = [
  {
    key: 'ur-reorder-level-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'ری آرڈر لیول اور کم از کم اسٹاک میں کیا فرق ہے؟',
    answer:
      'کم از کم اسٹاک، یا سیفٹی اسٹاک، وہ گنجائش ہے جس سے آپ کبھی نیچے نہیں جانا چاہتے۔ ری آرڈر لیول اس سے اوپر ہے: یہ سیفٹی اسٹاک جمع وہ مال ہے جو آرڈر راستے میں ہونے تک بک جائے گا۔ اگر آپ صرف کم از کم اسٹاک پر پہنچ کر آرڈر کریں تو ہر ڈیلیوری پر اس گنجائش میں سے کھائیں گے۔ لو اسٹاک الرٹ ری آرڈر لیول پر رکھیں، کم از کم پر نہیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-reorder-level-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-reorder-level-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'ری آرڈر لیول کتنی بار دوبارہ نکالنا چاہیے؟',
    answer:
      'کم از کم ہر سیزن میں، اور جب بھی سپلائر ڈیلیوری کے دن بدلے۔ رمضان، عید، اسکول کھلنے اور سردیوں کے آس پاس بہت سی چیزوں کی سیل تیزی سے بدلتی ہے، اس لیے ٹھنڈے مہینے میں رکھا لیول مصروف مہینے میں کم پڑ جاتا ہے۔ جو سسٹم روز تازہ سیل سے دوبارہ حساب کرے وہ یہ مسئلہ نہیں ہونے دیتا؛ اس کیلکولیٹر کے ساتھ اپنی زیادہ بکنے والی چیزیں ہر مہینے دوبارہ نکالیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-reorder-level-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-reorder-level-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا ہر پروڈکٹ کے سیفٹی دن ایک جیسے ہونے چاہییں؟',
    answer:
      'نہیں۔ ان چیزوں کو زیادہ سیفٹی دن دیں جن کے لیے گاہک انتظار نہیں کرتے اور جو آپ ساتھ والی دکان سے ادھار نہیں لے سکتے، جیسے دودھ، ڈبل روٹی، کوکنگ آئل اور دوائیں، اور ان چیزوں کو بھی جو سست یا بے اعتبار سپلائر سے آتی ہیں۔ آہستہ بکنے والی یا مہنگی چیزوں کے کم دن رکھ سکتے ہیں، کیونکہ فالتو اسٹاک کیش اور شیلف کی جگہ روک لیتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-reorder-level-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'reorder-level-calculator',
  title: 'ری آرڈر لیول کیلکولیٹر',
  summary:
    'وہ اسٹاک لیول معلوم کریں جس پر اگلا آرڈر دینا ہے، تاکہ سپلائر کے مال پہنچانے تک کوئی پروڈکٹ ختم نہ ہو۔ جتنا بیچا، سپلائر کے پہنچانے کے دن اور تھوڑی گنجائش لکھیں؛ آج کا اسٹاک ڈالیں تو دکھے گا کہ ابھی آرڈر کرنا ہے یا نہیں، اور کتنا۔',
  data: {
    toolKey: 'reorder-level-calculator',
    kind: 'ری آرڈر لیول',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'ری آرڈر لیول', value: 'روز کی اوسط سیل × پہنچنے کے دن + سیفٹی اسٹاک' },
        { label: 'سیفٹی اسٹاک (سادہ)', value: 'روز کی اوسط سیل × اضافی دن' },
        {
          label: 'سیفٹی اسٹاک (مصروف ہفتے سے)',
          value: 'ایک دن کی سب سے زیادہ سیل × سب سے لمبے پہنچنے کے دن − عام دنوں میں پہنچنے تک کی سیل',
        },
        { label: 'آرڈر کی مقدار', value: 'پہنچنے کے دنوں اور آپ کے چنے دنوں کے لیے کافی، سیفٹی اسٹاک تک پورا' },
      ],
      romanUrdu:
        'Maal kab mangwana hai, ye yahan nikalein: roz ki Sale, supplier ke maal pohanchane ke din aur thora extra. Abhi ka Stock likhein to pata chalega ke abhi order karna hai ya nahi, aur kitna.',
      id: 'bb2ce2818b4b',
    },
    {
      type: 'steps',
      heading: 'ری آرڈر لیول کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'جتنا بیچا وہ لکھیں',
          body: 'کتنا بیچا اور کتنے دنوں میں: مثلاً 30 دن میں 240 پیکٹ۔ عام مہینہ لیں، رمضان یا سیل والا ہفتہ نہیں۔',
        },
        {
          title: 'پہنچنے کے دن لکھیں',
          body: 'آرڈر دینے سے لے کر مال شیلف پر آنے تک کے دن، جس میں سیلز مین کے آنے کا دن اور منڈی میں کوئی دیر بھی شامل ہو۔',
        },
        {
          title: 'سیفٹی اسٹاک چنیں',
          body: '**سیل کے اضافی دن** سب سے آسان ہے۔ **رش والے ہفتے سے** وہ سب سے زیادہ سیل لیتا ہے جو کبھی ایک دن میں ہوئی، اور سپلائر کا سب سے لمبا وقت۔',
        },
        {
          title: 'موجودہ اسٹاک لکھیں',
          body: 'اختیاری۔ آپ دیکھتے ہیں کہ یہ کتنے دن چلے گا، ابھی آرڈر کرنا ہے یا نہیں، اور پہنچنے کے دن جمع آپ کے چنے دنوں کے لیے مشورے والی مقدار۔',
        },
      ],
      howTo: true,
      id: 'b22c3139bcf6',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\nمال پہنچنے تک آپ بیچتے رہتے ہیں، اس لیے آرڈر تب جانا چاہیے جب ابھی اتنا مال باقی ہو جو ڈیلیوری تک چلے۔ یہ مقدار ہے **روز کی اوسط سیل × پہنچنے کے دن**۔ سیل اور ڈیلیوری اوپر نیچے ہوتی رہتی ہیں، اس لیے اوپر سے **سیفٹی اسٹاک** جوڑا جاتا ہے:\n\n- سادہ: سیفٹی اسٹاک = روز کی اوسط سیل × جتنے اضافی دن رکھنا چاہیں\n- مصروف ہفتے سے: سیفٹی اسٹاک = (ایک دن کی سب سے زیادہ سیل × سب سے لمبے پہنچنے کے دن) − (روز کی اوسط سیل × عام پہنچنے کے دن)\n\n**ری آرڈر لیول = روز کی اوسط سیل × پہنچنے کے دن + سیفٹی اسٹاک۔** جب اسٹاک اس نمبر پر آئے، آرڈر دیں۔ اسٹاک کنٹرول میں یہی عام ری آرڈر پوائنٹ کا طریقہ ہے (نیچے حوالہ دیکھیں)۔',
      id: 'be8e98ff2dd5',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nآپ نے ایک بسکٹ کے 30 دن میں 240 پیکٹ بیچے: **روزانہ 8**۔ ڈسٹری بیوٹر آرڈر کے 4 دن بعد مال دیتا ہے، اور آپ سیفٹی کے لیے 3 اضافی دن چاہتے ہیں۔\n\n- پہنچنے تک کی سیل = 8 × 4 = **32**\n- سیفٹی اسٹاک = 8 × 3 = **24**\n- ری آرڈر لیول = 32 + 24 = **56 پیکٹ**\n\nشیلف پر 70 ہیں، جو تقریباً 8 دن چلیں گے، اس لیے ابھی آرڈر نہیں کرنا۔ جب کریں، اور ڈیلیوری کے بعد 15 دن کا مال منگوائیں، تو 8 × (4 + 15) + 24 − 70 = **106 پیکٹ**۔ مصروف ہفتے والے طریقے سے (سب سے اچھے دن 14 بکے، سب سے سست ڈیلیوری 6 دن) سیفٹی اسٹاک 84 − 32 = 52 اور ری آرڈر لیول 84 بنتا ہے۔\n\nسینکڑوں پروڈکٹس کے لیے یہ ہاتھ سے کرنا ممکن نہیں۔ Nafaa کی [لو اسٹاک لسٹ](/ur/product/inventory) ہر پروڈکٹ کی اپنی سیل سے نکالتی ہے کہ اسٹاک کتنے دن چلے گا، اور سپلائر کے حساب سے گروپ کر کے منگوانے کی مقدار بتاتی ہے، تاکہ آپ ایک قدم میں اسے [پرچیز آرڈر](/ur/product/purchasing) بنا سکیں۔',
      id: 'b5e35b505d18',
    },
    {
      type: 'sources',
      heading: 'حوالے',
      items: [reorderSource],
      id: 'bb6dbf4e935b',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'bc35d4d57fbf',
    },
  ],
  faqKeys: ['ur-reorder-level-calculator-1', 'ur-reorder-level-calculator-2', 'ur-reorder-level-calculator-3'],
  relations: [
    { ref: 'GLOSSARY_TERM:reorder-level@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:stock-take-sheet@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:purchase-order-template@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:purchasing@ur', kind: 'RELATED' },
  ],
  seoTitle: 'ری آرڈر لیول کیلکولیٹر: اسٹاک کب منگوائیں (فری)',
  seoDescription:
    'دکانوں کے لیے فری ری آرڈر لیول کیلکولیٹر: روز کی اوسط سیل × پہنچنے کے دن + سیفٹی اسٹاک، باقی اسٹاک کے دن اور منگوانے کی مقدار کے ساتھ۔',
  focusKeyword: 'ری آرڈر لیول کیلکولیٹر',
  sortOrder: 50,
  origin: 'translation of content/tools/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/inventory/low-stock/api.ts',
    'apps/web/src/modules/inventory/low-stock/components/OrderModal.tsx',
    'apps/web/src/modules/inventory/products/import/columns.ts',
  ],
  sources: [reorderSource],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
