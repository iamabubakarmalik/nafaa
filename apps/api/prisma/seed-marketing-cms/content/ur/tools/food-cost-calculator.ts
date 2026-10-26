/** Urdu: Food cost calculator (/ur/tools/food-cost-calculator). Translation of content/tools/stock.ts (food-cost-calculator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'Plain arithmetic; ingredient rates are labelled as examples, not market prices. Nafaa claims: recipe per menu item with plate cost and food cost % from current raw material rates (RestaurantProductDetail.tsx, RecipeLinesEditor.tsx); ingredients deducted from stock when orders are cooked or billed (api recipes.service.ts consumeForLines).';
const faqEvidence = [
  'apps/web/src/industries/restaurant/products/RestaurantProductDetail.tsx',
  'apps/web/src/industries/restaurant/components/RecipeLinesEditor.tsx',
  'apps/web/src/industries/restaurant/products/RestaurantProductEditor.tsx',
  'apps/api/src/industries/restaurant/recipes/recipes.service.ts',
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-food-cost-calculator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'ریسٹورنٹ کو کتنا فوڈ کاسٹ فیصد رکھنا چاہیے؟',
    answer:
      'کوئی ایک صحیح نمبر نہیں: یہ آپ کے مینیو، قیمتوں اور اسٹاف اور کرائے کے خرچ پر منحصر ہے۔ مہنگے گوشت والی ڈشوں کی فوڈ کاسٹ اکثر زیادہ ہوتی ہے اور وہ زیادہ بکنے سے کماتی ہیں، جبکہ چائے، مشروبات، روٹی اور چاول کی عموماً بہت کم۔ ہر کیٹیگری کا ہدف رکھیں، ہر ڈش کی کاسٹ اس سے ملائیں، اور ہر مہینے خرید اور سیل سے پورا نمبر چیک کریں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-food-cost-calculator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-food-cost-calculator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا ضائع ہونے والا مال فوڈ کاسٹ میں آتا ہے؟',
    answer:
      'جی ہاں۔ گوشت سے نکلی ہڈیاں اور چربی، سبزیوں کے چھلکے، کڑاہی میں بچا تیل اور دن کے آخر میں پھینکا کھانا، سب کے پیسے دیے گئے ہیں۔ اپنے کچن میں جو دیکھتے ہیں اس کے حساب سے ہر ریسیپی میں ضائع ہونے کا فیصد جوڑیں، یا ایک بار کام آنے والا اصل وزن تول لیں اور ریسیپی میں وہی وزن لکھیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-food-cost-calculator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-food-cost-calculator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'ریسیپی کی کاسٹ کتنی بار اپ ڈیٹ کرنی چاہیے؟',
    answer:
      'جب بھی کسی اہم چیز کا ریٹ کافی بدلے، اور پاکستان میں چکن، سبزی اور تیل کا ریٹ ہر ہفتے بدل سکتا ہے۔ کم از کم ہر مہینے اپنی زیادہ بکنے والی ڈشوں کی کاسٹ دوبارہ نکالیں۔ اگر ریسیپیز ایسے سافٹ ویئر میں ہوں جو آپ کی تازہ خرید کے ریٹ پڑھتا ہے تو پلیٹ کی کاسٹ خود اپ ڈیٹ ہوتی ہے، اور آپ کو صرف قیمتیں دیکھنی ہوتی ہیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-food-cost-calculator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'food-cost-calculator',
  title: 'فوڈ کاسٹ کیلکولیٹر',
  summary:
    'ریسیپی کی ہر چیز کی کاسٹ جوڑ کر ایک پلیٹ کی کاسٹ، آپ کی مینیو قیمت پر فوڈ کاسٹ فیصد، اور اپنے ہدف والی فوڈ کاسٹ کے لیے صحیح قیمت نکالیں۔ ریسٹورنٹ، ڈھابے، کیفے اور بیکری کے لیے بنا ہے جو بدلتے منڈی ریٹ پر خریدتے ہیں۔',
  data: {
    toolKey: 'food-cost-calculator',
    kind: 'فوڈ کاسٹ',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'ایک پلیٹ کی کاسٹ', value: '(مقدار × ریٹ) کا جوڑ × (1 + ضائع) ÷ پلیٹیں' },
        { label: 'فوڈ کاسٹ %', value: 'ایک پلیٹ کی کاسٹ ÷ مینیو قیمت × 100' },
        { label: 'ہدف کے لیے قیمت', value: 'ایک پلیٹ کی کاسٹ ÷ ہدف فوڈ کاسٹ %' },
        { label: 'کیا لکھنا ہے', value: 'جتنی چاہیں چیزیں، ایک بیچ کی پلیٹیں، ضائع ہونے کا %' },
      ],
      romanUrdu:
        'Recipe ki har cheez ki Cost jor kar ek plate ki Cost nikalein. Menu price likhein to food cost % aur jitna % chahiye us ke hisaab se sahi price bhi mil jati hai.',
      id: 'b6e23d9cc514',
    },
    {
      type: 'steps',
      heading: 'فوڈ کاسٹ کیلکولیٹر کیسے استعمال کریں',
      items: [
        {
          title: 'ایک بیچ کی چیزیں لکھیں',
          body: 'ہر چیز کی استعمال ہونے والی مقدار اور جس ریٹ پر خریدتے ہیں، ایک ہی یونٹ میں: 1.5 کلو چکن فی کلو ریٹ پر، 0.25 لیٹر تیل فی لیٹر ریٹ پر۔',
        },
        {
          title: 'پلیٹیں اور ضائع لکھیں',
          body: 'ایک بیچ سے کتنی پلیٹیں بنتی ہیں، اور ہڈیوں، کٹائی، گرنے اور کڑاہی میں بچے تیل کے لیے ضائع کا %۔',
        },
        {
          title: 'مینیو قیمت لکھیں',
          body: 'فوڈ کاسٹ % آ جاتا ہے، اور یہ بھی کہ ہر پلیٹ سے اسٹاف، کرائے، گیس اور پرافٹ کے لیے کتنا بچتا ہے۔',
        },
        {
          title: 'ہدف فوڈ کاسٹ رکھیں',
          body: 'جو فیصد آپ نے سوچا ہے وہ لکھیں، کیلکولیٹر اس کے لیے مینیو قیمت بتا دیتا ہے۔',
        },
      ],
      howTo: true,
      id: 'b5ca9730cf27',
    },
    {
      type: 'richText',
      markdown:
        '## حساب کیسے ہوتا ہے\n\n- بیچ کی کاسٹ = ہر چیز کی (استعمال ہونے والی مقدار × خرید کا ریٹ) کا جوڑ\n- ضائع کے ساتھ = بیچ کی کاسٹ × (1 + ضائع % ÷ 100)\n- ایک پلیٹ کی کاسٹ = ضائع کے ساتھ بیچ کی کاسٹ ÷ بیچ سے بننے والی پلیٹیں\n- فوڈ کاسٹ % = ایک پلیٹ کی کاسٹ ÷ مینیو قیمت × 100\n- ہدف کے لیے قیمت = ایک پلیٹ کی کاسٹ ÷ (ہدف % ÷ 100)\n\nہر چیز گنیں، جس میں تیل، مصالحہ، سجاوٹ، ڈش کے ساتھ دی جانے والی نان یا چاول، اور ڈیلیوری آرڈر کا ٹیک اوے ڈبہ بھی شامل ہو۔ چھوٹی چیزیں چھوڑ دینا سب سے عام وجہ ہے کہ ڈش سوچ سے کم کماتی ہے۔',
      id: 'bdc9a12cc408',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nچکن کڑاہی کا ایک بیچ، مثال کے منڈی ریٹ پر:\n\n| چیز | استعمال | ریٹ | کاسٹ |\n|---|---|---|---|\n| چکن | 1 کلو | 750 فی کلو | 750 |\n| ٹماٹر | 0.5 کلو | 160 فی کلو | 80 |\n| کوکنگ آئل | 0.25 لیٹر | 600 فی لیٹر | 150 |\n| مصالحہ، ادرک، لہسن، مرچیں، دہی | 1 حصہ | 120 | 120 |\n\nبیچ کی کاسٹ = **1,100 روپے**؛ 5% ضائع کے ساتھ **1,155 روپے**؛ بیچ سے 4 پلیٹیں بنتی ہیں، تو **ایک پلیٹ 288.75 روپے**۔ 1,000 روپے مینیو قیمت پر فوڈ کاسٹ **28.9%** ہے۔ 30% ہدف کے لیے قیمت 963 روپے ہو سکتی ہے؛ اگر چکن کا ریٹ 900 ہو جائے تو پلیٹ کی کاسٹ تقریباً 328 روپے ہو جاتی ہے اور وہی 1,000 روپے کی قیمت 32.8% پر چلتی ہے۔\n\nریٹ ہر ہفتے بدلتے ہیں، اس لیے ریسیپی کی کاسٹ پرانی ہو جاتی ہے۔ Nafaa کے [ریسٹورنٹ سافٹ ویئر](/ur/industries/restaurant) میں ہر مینیو آئٹم کی ریسیپی رکھی جا سکتی ہے؛ ایپ تازہ خرید کے ریٹ سے پلیٹ کی کاسٹ اور فوڈ کاسٹ % دکھاتی ہے اور پلیٹیں بکنے پر چیزیں اسٹاک سے کم کرتی جاتی ہے۔',
      id: 'b8113dfe4320',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'bcbf4742dc30',
    },
  ],
  faqKeys: ['ur-food-cost-calculator-1', 'ur-food-cost-calculator-2', 'ur-food-cost-calculator-3'],
  relations: [
    { ref: 'GLOSSARY_TERM:recipe-costing@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'RELATED' },
    { ref: 'TOOL:break-even-calculator@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:bakery@ur', kind: 'RELATED' },
  ],
  seoTitle: 'ریسٹورنٹ فوڈ کاسٹ کیلکولیٹر: ایک پلیٹ کی کاسٹ اور مینیو قیمت',
  seoDescription:
    'ریسٹورنٹ کے لیے فری فوڈ کاسٹ کیلکولیٹر: ریسیپی سے ایک پلیٹ کی کاسٹ، مینیو قیمت پر فوڈ کاسٹ %، اور ضائع سمیت ہدف کی قیمت۔ روپوں میں۔',
  focusKeyword: 'فوڈ کاسٹ کیلکولیٹر',
  sortOrder: 70,
  origin: 'translation of content/tools/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/industries/restaurant/products/RestaurantProductDetail.tsx',
    'apps/web/src/industries/restaurant/components/RecipeLinesEditor.tsx',
    'apps/web/src/industries/restaurant/products/RestaurantProductEditor.tsx',
    'apps/api/src/industries/restaurant/recipes/recipes.service.ts',
  ],
  sources: [],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
