/** Urdu: Daily cash (galla) closing sheet template page (/ur/templates/daily-cash-closing-sheet). Translation of content/templates/index.ts (daily-cash-closing-sheet). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const EVIDENCE = [
  'apps/api/prisma/seed-marketing-cms/content/templates/build-files.ts',
  'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
];
const SOURCE_NOTE =
  'Note denominations 5000-10 are the current Pakistani notes in common use (public fact). Nafaa claims: shift close with expected cash, note count and reason for short/over (CloseShiftModal.tsx).';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-daily-cash-closing-sheet-1',
    locale: 'ur',
    topic: 'templates',
    question: 'اوپننگ فلوٹ کیا ہوتا ہے؟',
    answer:
      'اوپننگ فلوٹ وہ کیش ہے جو دن کے شروع میں دراز میں رکھا جاتا ہے تاکہ کیشیئر گاہک کو بقایا واپس دے سکے، عام طور پر چھوٹے نوٹ اور سکے۔ یہ دن کی سیل کا حصہ نہیں ہوتا۔ اسے شروع کا کیش لکھیں، اور ہر رات طے کریں کہ کل کے لیے کتنا چھوڑنا ہے؛ باقی سیف یا بینک میں جائے۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-daily-cash-closing-sheet-1',
    evidence: EVIDENCE,
  },
  {
    key: 'ur-daily-cash-closing-sheet-2',
    locale: 'ur',
    topic: 'templates',
    question: 'گلہ کم نکلے تو کیا کروں؟',
    answer:
      'پہلے دوبارہ گنیں، پھر عام وجوہات دیکھیں: دراز سے کوئی ایکسپینس دیا گیا مگر لکھا نہیں گیا، بقایا غلط واپس ہوا، کوئی ریفنڈ ہوا، کارڈ یا والیٹ کی ادائیگی کیش میں درج ہو گئی، یا بل ہی نہیں بنا۔ وجہ لاگ میں لکھیں۔ اگر ایک ہی کاؤنٹر یا شفٹ پر بار بار کمی ہو تو غور سے دیکھیں کہ کیش کس کے ہاتھ میں تھا۔',
    sourceNote: SOURCE_NOTE,
    origin: 'translation of faq template-daily-cash-closing-sheet-2',
    evidence: EVIDENCE,
  },
];

export const entry: SeedEntry = {
  type: 'TEMPLATE',
  locale: 'ur',
  slug: 'daily-cash-closing-sheet',
  title: 'روزانہ کیش (گلہ) کلوزنگ شیٹ',
  summary:
    'ایک صفحے کی گلہ کلوزنگ شیٹ: شروع کا کیش، کیش سیل اور باقی آنے والا کیش، اس میں سے ایکسپینس، سپلائر کی ادائیگیاں، ریفنڈ اور نکالی گئی رقم گھٹا کر وہ کیش نکلتا ہے جو دراز میں ہونا چاہیے۔ نوٹ گنیں تو شیٹ بتاتی ہے کہ گلہ زیادہ ہے یا کم۔ مہینے کا لاگ دکھاتا ہے کہ ایسا کب کب ہوتا ہے۔',
  data: { fileMediaId: 'media_template-cash-closing', format: 'xlsx' },
  blocks: [
    {
      type: 'richText',
      id: 'bd30c26f85fb',
      markdown:
        '## فائل میں کیا ہے\n\n- **Closing**: دن میں آیا کیش (شروع کا کیش یا فلوٹ، کیش سیل، کیش میں واپس آیا ادھار، اور دوسرا) اور گیا کیش (ایکسپینس، سپلائر کی ادائیگیاں، ریفنڈ، مالک کی نکالی رقم، بینک بھیجا گیا کیش)۔ ان سے **وہ کیش نکلتا ہے جو ہونا چاہیے** (expected cash)۔ اس کے نیچے 5000، 1000، 500، 100، 50، 20 اور 10 روپے کے نوٹوں اور سکوں کی گنتی سے **گنا ہوا کیش** (counted cash) بنتا ہے، اور شیٹ **زیادہ یا کم** (over یا short) رقم دکھاتی ہے۔ کارڈ، JazzCash، Easypaisa، بینک اور ادھار کی سیل الگ لکھی جاتی ہے، کیونکہ وہ دراز میں نہیں ہوتی۔\n- **Month log**: ہر دن کی ایک لائن جس میں expected، counted اور فرق ہے، مہینے کا ٹوٹل، اور کمی لال رنگ میں۔\n\nفائل میں خانوں کے نام انگریزی میں ہیں۔\n\nفائل کا سیدھا لنک: [nafaa-daily-cash-closing-sheet.xlsx](/downloads/nafaa-daily-cash-closing-sheet.xlsx)۔ مفت ہے: استعمال کریں، کاپی کریں اور آگے بھیجیں۔',
    },
    {
      type: 'steps',
      id: 'b3d24029035c',
      heading: 'اسے کیسے استعمال کریں',
      items: [
        {
          title: 'فلوٹ سے شروع کریں',
          body: 'پچھلی رات دراز میں جو کیش چھوڑا تھا، اسے شروع کا کیش لکھیں۔',
        },
        {
          title: 'آیا اور گیا کیش لکھیں',
          body: 'کیش سیل دن کی رپورٹ سے لیں، اور گلے سے ہونے والی ہر ادائیگی لکھیں۔',
        },
        {
          title: 'نوٹ گنیں',
          body: 'ہر نوٹ کتنے ہیں، یہ لکھیں؛ گنا ہوا ٹوٹل اور فرق خود بھر جاتے ہیں۔',
        },
        {
          title: 'دن کا اندراج کریں',
          body: 'expected، counted اور فرق Month log میں لکھیں، اور جو بھی فرق ہو اس کی وجہ ساتھ لکھیں۔',
        },
      ],
    },
    {
      type: 'richText',
      id: 'b72a4bab2938',
      markdown:
        '## روزانہ کلوزنگ کیوں ضروری ہے\n\nروز کی تھوڑی سی کمی مہینے کے آخر تک بڑی رقم بن جاتی ہے، اور اس کا سراغ تبھی ملتا ہے جب دن ابھی تازہ ہو۔ ہماری [روزانہ کیش کلوزنگ روٹین](/ur/blog/daily-cash-closing-routine) والی گائیڈ بتاتی ہے کہ یہ دس منٹ میں کیسے ہو۔ Nafaa ہر کاؤنٹر کی شفٹ اس طرح بند کرتا ہے کہ جتنا کیش ہونا چاہیے وہ بلوں سے پہلے ہی نکلا ہوتا ہے، نوٹوں کی گنتی لیتا ہے، اور گلہ کم یا زیادہ ہو تو وجہ پوچھتا ہے؛ [POS](/ur/product/pos) دیکھیں۔',
    },
  ],
  faqKeys: ['ur-daily-cash-closing-sheet-1', 'ur-daily-cash-closing-sheet-2'],
  relations: [
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:z-report@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:daily-cash-closing-routine@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
  ],
  seoTitle: 'روزانہ کیش کلوزنگ شیٹ (گلے کا حساب) Excel ٹیمپلیٹ',
  seoDescription:
    'مفت روزانہ کیش کلوزنگ شیٹ: آنے اور جانے والے کیش سے ہونے والا کیش، 5000 سے سکوں تک نوٹوں کی گنتی، اور کم یا زیادہ رقم، ساتھ میں مہینے کا لاگ۔',
  focusKeyword: 'روزانہ کیش کلوزنگ شیٹ',
  sortOrder: 40,
  origin: 'translation of content/templates/index.ts, daily-cash-closing-sheet (26 Oct 2026)',
  evidence: EVIDENCE,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
