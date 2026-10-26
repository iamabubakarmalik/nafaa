/** Urdu: manufacturing solution page (/ur/solutions/manufacturing). Translation of content/main-pages/solutions.ts (manufacturing). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-sol-manufacturing-scope',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا Nafaa فیکٹری کے لیے پوری مینوفیکچرنگ (MRP) سنبھالتا ہے؟',
    answer:
      'ابھی عام ماڈیول کے طور پر نہیں۔ آج Nafaa کھانے کی پروڈکشن، جیسے بیکری اور کچن، کے لیے خام مال، کاسٹ کے ساتھ ریسیپیز اور روز کا پروڈکشن پلان سنبھالتا ہے، اور ہر فیکٹری کے لیے خریداری، اسٹاک اور سیل بھی۔ ہر پروڈکٹ کے لیے بل آف میٹیریلز اور ورک آرڈر روڈ میپ پر ہیں۔ ہماری ٹیم کسٹم ماڈیول بھی بنا سکتی ہے۔',
    sourceNote: 'industries/bakery (IngredientsPage, ProductionPage, RecipeCosting, PlanBuilder); restaurant RecipesPage. General BOM/work orders not found in apps/web.',
    origin: 'translation of faq mp-manufacturing-scope',
    evidence: [
      'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
      'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx',
      'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    ],
  },
  {
    key: 'ur-sol-manufacturing-costing',
    locale: 'ur',
    topic: 'bakery',
    question: 'پروڈکشن کرنے والے کاروبار میں Nafaa ریسیپی اور خام مال کی کاسٹ کیسے نکالتا ہے؟',
    answer:
      'اجزاء خام مال کے طور پر رکھے جاتے ہیں، ہر ایک کے اسٹاک اور فی یونٹ کاسٹ کے ساتھ۔ پروڈکٹ پر آپ اس کی ریسیپی ڈالتے ہیں: ہر جز کی مقدار اور اس سے کتنے پیس بنتے ہیں، اور Nafaa بناتے بناتے کاسٹ دکھاتا جاتا ہے۔ اجزاء کی قیمت بدلے تو ریسیپی کی کاسٹ بھی بدل جاتی ہے، تاکہ اصل مارجن نظر آئے۔',
    sourceNote: 'BakeryProductEditor (recipe with live cost, recipeYield) and BakeryRawMaterials.',
    origin: 'translation of faq bakery-costing',
    evidence: ['apps/web/src/industries/bakery/products/BakeryProductEditor.tsx', 'apps/web/src/industries/bakery/products/BakeryRawMaterials.tsx'],
  },
  {
    key: 'ur-sol-manufacturing-dairy',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا ڈیری والے Nafaa میں دودھ سے بنا دہی اور مکھن درج کر سکتے ہیں؟',
    answer:
      'جی ہاں۔ ڈیری کی پروڈکشن اسکرین دودھ کو اسٹاک سے نکالتی ہے اور اس سے بنا دہی، مکھن، لسی یا کھویا دودھ کی کاسٹ پر اسٹاک میں ڈال دیتی ہے۔ دن کے آخر میں خراب مال اسٹاک ایڈجسٹمنٹ کے طور پر درج ہوتا ہے، تو پرافٹ رپورٹ نقصان دکھاتی ہے، اسٹاک میں خاموش کمی نہیں۔',
    sourceNote: 'industries/dairy ProductionPage.',
    origin: 'translation of faq sol-mfg-dairy',
    evidence: ['apps/web/src/industries/dairy/pages/ProductionPage.tsx'],
  },
  {
    key: 'ur-sol-manufacturing-made-to-order',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا Nafaa آرڈر پر بننے والا کام، جیسے فرنیچر، سنبھالتا ہے؟',
    answer:
      'فرنیچر کے لیے جی ہاں۔ کسٹم آرڈر کوٹیشن سے ایڈوانس، پھر کاریگر، پھر تیار اور ڈیلیوری تک جاتا ہے۔ ایڈوانس جس دن ملے اسی دن کسٹمر کے کھاتے میں چلا جاتا ہے، اور بل تب بنتا ہے جب چیز دکان سے نکلتی ہے۔ دراز سے کاریگر کو دی گئی رقم ایکسپینس کے طور پر محفوظ ہوتی ہے، تو روزنامچہ اور پرافٹ اسے دیکھتے ہیں۔',
    sourceNote: 'industries/furniture CustomOrdersPage and CarpentersPage.',
    origin: 'translation of faq sol-mfg-made-to-order',
    evidence: ['apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx', 'apps/web/src/industries/furniture/pages/CarpentersPage.tsx'],
  },
  {
    key: 'ur-sol-manufacturing-prices',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا فیکٹری کا تیار مال Nafaa میں ریٹیل اور ہول سیل کی الگ قیمت پر بیچ سکتے ہیں؟',
    answer:
      'جی ہاں۔ ایک پروڈکٹ کی ریٹیل قیمت بھی ہو سکتی ہے اور ہول سیل قیمت بھی، اور ہر یونٹ (پیس، درجن، کارٹن) کی اپنی قیمت بھی۔ کاؤنٹر سیل کے لیے صحیح قیمت لگاتا ہے، اور کھاتہ ہر دکاندار کسٹمر کا بیلنس اور کریڈٹ لمٹ رکھتا ہے۔',
    sourceNote: 'wholesalePrice on products and units (pos/lib/posUnits.ts, usePosEngine); creditLimit on customers.',
    origin: 'translation of faq mp-wholesale-prices',
    evidence: [
      'apps/web/src/modules/pos/lib/posUnits.ts',
      'apps/web/src/modules/pos/engine/usePosEngine.ts',
      'apps/web/src/core/lib/offline/offlineKhata.ts',
    ],
  },
];

export const entry: SeedEntry = {
  type: 'SOLUTION',
  locale: 'ur',
  slug: 'manufacturing',
  title: 'مینوفیکچرنگ',
  summary:
    'مینوفیکچررز اور کھانا بنانے والوں کے لیے Nafaa: خام مال، ریسیپی کاسٹ، روز کا پروڈکشن پلان، ڈیری میں دودھ سے پروڈکٹ، فرنیچر میں کاریگروں کے ساتھ آرڈر پر کام، خریداری، تیار مال کا اسٹاک، اور کاؤنٹر، کھاتے اور آن لائن سیل۔ عام BOM اور ورک آرڈر جلد آ رہے ہیں۔',
  data: {
    icon: 'factory',
    shortName: 'مینوفیکچرنگ',
    outcome: 'خام مال سے سیل تک ایک سسٹم میں',
    segment: 'پروڈکشن',
    status: 'live',
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'مینوفیکچرنگ کے لیے',
      heading: 'خام مال سے سیل تک، ایک جڑے ہوئے سسٹم میں',
      sub: 'خام مال ادھار پر خریدیں، ہر ریسیپی کی کاسٹ نکالیں، آج کی پروڈکشن کا پلان بنائیں، اور تیار مال کاؤنٹر سے، دکانداروں کو یا آن لائن بیچیں، ایسے اسٹاک اور پرافٹ کے ساتھ جس پر بھروسا ہو۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['ریسیپی کاسٹ', 'پروڈکشن پلان', 'BOM جلد آ رہا ہے'],
      media: {
        kind: 'diagram',
        diagram: {
          kind: 'flow',
          nodes: [
            { id: 'buy', label: 'خام مال', icon: 'truck' },
            { id: 'recipe', label: 'ریسیپی اور کاسٹ', icon: 'calculator' },
            { id: 'plan', label: 'پروڈکشن پلان', icon: 'factory' },
            { id: 'stock', label: 'تیار مال کا اسٹاک', icon: 'boxes' },
            { id: 'sell', label: 'سیل', icon: 'receipt' },
          ],
          edges: [
            { from: 'buy', to: 'recipe' },
            { from: 'recipe', to: 'plan' },
            { from: 'plan', to: 'stock' },
            { from: 'stock', to: 'sell' },
          ],
        },
      },
      layout: 'split',
      id: 'b815e18b983b',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'آج کیا چلتا ہے', value: 'بیکری، ڈیری اور کچن کے لیے خام مال، ریسیپی کاسٹ اور پروڈکشن؛ فرنیچر کے لیے آرڈر پر کام' },
        { label: 'ہر فیکٹری کے لیے', value: 'خریداری، سپلائر کا حساب، تیار مال کا اسٹاک، سیل، کھاتہ اور رپورٹس' },
        { label: 'جلد آ رہا ہے', value: 'ہر پروڈکٹ کے لیے بل آف میٹیریلز، ورک آرڈر اور مشینوں کا حساب' },
        { label: 'کسٹم', value: 'ہماری ٹیم آپ کے طریقے کے مطابق پروڈکشن ماڈیول بناتی ہے' },
      ],
      romanUrdu:
        'Factory aur food production ke liye: kacha maal, recipe ki costing, roz ka production plan, supplier ka hisaab aur tayyar maal ki bikri. Har product ka BOM aur work orders jald aa rahe hain.',
      id: 'b0e448bc315c',
    },
    {
      type: 'steps',
      heading: 'آج Nafaa میں پروڈکشن کیسے چلتی ہے',
      items: [
        { title: 'خام مال خریدیں', body: 'پرچیز بل میدہ، دودھ، لکڑی یا کوئی بھی مال اس کی کاسٹ پر اسٹاک میں ڈالتے ہیں۔' },
        { title: 'ریسیپی کی کاسٹ نکالیں', body: 'ہر ریسیپی میں لکھا ہوتا ہے کیا ڈلتا ہے، اور Nafaa آج کے ریٹ پر فی پیس کاسٹ نکالتا ہے۔' },
        { title: 'پروڈکشن کا پلان', body: 'آنے والے آرڈرز اور متوقع کاؤنٹر سیل سے طے کریں کہ آج کیا بنانا ہے۔' },
        { title: 'بیچیں اور پرافٹ دیکھیں', body: 'تیار مال کاؤنٹر پر، کھاتے میں یا آن لائن بکتا ہے، اصل مارجن کے ساتھ۔' },
      ],
      id: 'bb080a2f92b2',
    },
    {
      type: 'diagram',
      heading: 'خام مال سے سیل تک',
      caption: 'خام مال پرچیز بل پر آتا ہے، پروڈکشن اسے تیار مال کا اسٹاک بناتی ہے اور سیل اصل پرافٹ دکھاتی ہے۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'raw', label: 'خام مال', icon: 'package', note: 'پرچیز بل پر خریدا' },
          { id: 'recipe', label: 'ریسیپی اور کاسٹ', icon: 'calculator', note: 'ہر تیار آئٹم کی کاسٹ' },
          { id: 'produce', label: 'پروڈکشن', icon: 'factory', note: 'روز کا پروڈکشن پلان' },
          { id: 'stock', label: 'تیار مال کا اسٹاک', icon: 'boxes', note: 'گودام یا برانچ کے حساب سے' },
          { id: 'sale', label: 'سیل', icon: 'scan-barcode', note: 'کاؤنٹر، ہول سیل یا آن لائن' },
        ],
        edges: [
          { from: 'raw', to: 'recipe' },
          { from: 'recipe', to: 'produce' },
          { from: 'produce', to: 'stock' },
          { from: 'stock', to: 'sale' },
        ],
        animate: true,
      },
      id: 'b3b27270430c',
    },
    {
      type: 'comparisonTable',
      heading: 'آج کون سی پروڈکشن اسکرینیں موجود ہیں، کاروبار کے حساب سے',
      caption: 'Nafaa میں پروڈکشن ایک ایک کاروبار کے لیے بنائی گئی ہے۔ ہر سیٹ اپ میں ابھی یہ شامل ہے؛ باقی سب روڈ میپ پر ہے۔',
      columns: [
        { key: 'make', label: 'بنانا', highlight: true },
        { key: 'cost', label: 'کاسٹ اور نقصان' },
      ],
      rows: [
        {
          label: '[بیکری اور مٹھائی](/ur/industries/bakery)',
          cells: {
            make: { value: 'بیکنگ پلان، "بن گیا" اور "خراب ہوا" کے ساتھ، اور شادیوں اور دفتروں کے بلک آرڈر' },
            cost: { value: 'خام مال، خریداری کی لسٹ اور آج کے ریٹ پر ریسیپی کاسٹ' },
          },
        },
        {
          label: '[ڈیری](/ur/industries/dairy)',
          cells: {
            make: { value: 'دودھ سے دہی، مکھن، لسی یا کھویا' },
            cost: { value: 'دودھ کی کاسٹ پر؛ دن کے آخر کا خراب مال نقصان کے طور پر درج' },
          },
        },
        {
          label: '[فرنیچر](/ur/industries/furniture)',
          cells: {
            make: { value: 'کسٹم آرڈر، کوٹیشن سے ایڈوانس، کاریگر، تیار اور ڈیلیوری تک' },
            cost: { value: 'دراز سے کاریگر کی ادائیگی ایکسپینس کے طور پر محفوظ' },
          },
        },
        {
          label: '[ریسٹورنٹ کے کچن](/ur/industries/restaurant)',
          cells: {
            make: { value: 'ہر ڈش کی ریسیپی، اور اسٹاک سے ابھی کتنی پلیٹیں بن سکتی ہیں' },
            cost: { value: 'پلیٹ کی کاسٹ اور فوڈ کاسٹ کا فیصد' },
          },
        },
        {
          label: 'کوئی اور فیکٹری',
          cells: {
            make: { value: 'پروڈکشن اسکرینیں فرمائش پر بنتی ہیں' },
            cost: { value: 'خریداری، سپلائر کا حساب، تیار مال کا اسٹاک، سیل اور رپورٹس' },
          },
        },
      ],
      id: 'b14718b9513d',
    },
    {
      type: 'featuresGrid',
      heading: 'آپ کو کیا ملتا ہے',
      columns: 3,
      items: [
        { icon: 'package', title: 'خام مال کا اسٹاک', body: 'اجزاء اور مال، ان کے اپنے یونٹ، ضائع مال اور آنے جانے کے ساتھ۔' },
        { icon: 'calculator', title: 'ریسیپی کاسٹ', body: 'ریسیپی سے ہر آئٹم کی کاسٹ، جو مال کی قیمت بدلنے پر اپ ڈیٹ ہوتی ہے۔' },
        { icon: 'factory', title: 'پروڈکشن پلان', body: 'تجاویز کے ساتھ روز کا پلان، اور پلان، بنا ہوا اور خراب ہوا کا تجزیہ۔' },
        { icon: 'clipboard-list', title: 'خریداری', body: 'پرچیز آرڈر، سپلائر کا حساب، پرچیز بل اور واجب الادا رقم۔' },
        { icon: 'git-branch', title: 'بل آف میٹیریلز', body: 'ہر پروڈکٹ کے لیے کئی سطحوں والا BOM، صرف کھانے کے لیے نہیں۔', status: 'coming' },
        { icon: 'clipboard-check', title: 'ورک آرڈر', body: 'کسی کام کو مال جاری کریں اور اس کی پیداوار اور ضائع مال درج کریں۔', status: 'coming' },
      ],
      id: 'b33571878e2d',
    },
    {
      type: 'diagram',
      heading: 'ہر آئٹم کی اصل کاسٹ جانیں',
      caption: 'جب خام مال کی قیمت بدلتی ہے تو ریسیپی کی کاسٹ اور ہر آئٹم کا پرافٹ بھی ساتھ بدل جاتا ہے۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'price', label: 'جز کی قیمت', icon: 'tag', note: 'آخری خریداری سے' },
          { id: 'recipe', label: 'ریسیپی کاسٹ', icon: 'calculator' },
          { id: 'selling', label: 'بیچنے کی قیمت', icon: 'badge-percent' },
          { id: 'profit', label: 'فی آئٹم پرافٹ', icon: 'trending-up' },
        ],
        edges: [
          { from: 'price', to: 'recipe' },
          { from: 'recipe', to: 'selling' },
          { from: 'selling', to: 'profit' },
        ],
        animate: true,
      },
      theme: 'muted',
      id: 'be9445c9af60',
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'آج Nafaa کہاں کام آتا ہے',
      body: 'آج پروڈکشن اسکرینیں کھانا بنانے والوں اور آرڈر پر بننے والے فرنیچر کے لیے بنی ہیں۔ دوسرے کاروبار کی فیکٹریاں Nafaa کو خریداری، اسٹاک، سیل اور کھاتے کے لیے استعمال کرتی ہیں، اور ہماری ٹیم آپ کے طریقے کے لیے [پروڈکشن ماڈیول بنا سکتی ہے](/ur/services/custom-software)۔',
      id: 'b4e1b1338610',
    },
    {
      type: 'screenshot',
      heading: 'ہر تیار آئٹم کا پرافٹ',
      body: 'جب ریسیپیز میں کاسٹ ہو تو پروڈکٹ کے حساب سے پرافٹ آپ کی بنائی ہر چیز کا اصل مارجن دکھاتا ہے، صرف یہ نہیں کہ کتنے میں بکی۔',
      mediaId: SHOT.profitByProduct,
      frame: 'browser',
      url: 'app.nafaa.pk/reports/profit',
      layout: 'split-right',
      id: 'bd90354e8c3b',
    },
    {
      type: 'richText',
      markdown:
        '## کاؤنٹر سے شروع ہو کر بنا\n\nزیادہ تر مینوفیکچرنگ سافٹ ویئر فیکٹری کے فرش سے شروع ہوتے ہیں اور سیل کو بعد کی بات سمجھتے ہیں۔ پاکستان کے چھوٹے مینوفیکچرر عام طور پر اپنے آؤٹ لیٹ سے بیچتے ہیں، دکانداروں کو ادھار پر دیتے ہیں، اور اب زیادہ سے زیادہ آن لائن بھی بیچتے ہیں۔ Nafaa اسی حقیقت سے شروع ہوتا ہے: جو اکاؤنٹ پروڈکشن کا پلان بناتا ہے وہی کاؤنٹر، دکانداروں کا کھاتہ اور آن لائن آرڈر بھی چلاتا ہے، تو ہر ریسیپی کی کاسٹ سیدھی ہر سیل کے پرافٹ میں جاتی ہے۔\n\n## کاسٹ صحیح نکالنا\n\nکاسٹ دو جگہ غلط ہوتی ہے: مال کی جو قیمت لگائی گئی وہ پرانی ہے، اور ضائع مال کبھی گنا ہی نہیں جاتا۔ Nafaa میں ریسیپی آخری خریداری کے ریٹ پر لگتی ہے، تو جب میدہ یا دودھ مہنگا ہو تو فی پیس کاسٹ اسی دن بدل جاتی ہے۔ ضائع مال، خراب مال اور ناکام بیچ اسٹاک کے خلاف درج ہوتے ہیں، اور پرافٹ رپورٹ انہیں نقصان کے طور پر دکھاتی ہے، کم اسٹاک کی گنتی میں چھپاتی نہیں۔\n\nسپلائر کا حساب پروڈکشن کے ساتھ ہی ہے۔ [خریداری](/ur/product/purchasing) سے سپلائر کا بقایا بڑھتا ہے، اور ادھار پر بکا تیار مال کسٹمر کے [کھاتے](/ur/product/khata) میں جاتا ہے، تو کیش کا آنا جانا دونوں طرف سے نظر آتا ہے۔',
      id: 'b673cd910939',
    },
    { type: 'pricingTable', heading: 'ایک یونٹ ہو یا کئی، ہر ایک کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'bf3e1eae0408' },
    { type: 'faq', heading: 'عام سوالات', id: 'bed360de25de' },
    {
      type: 'cta',
      heading: 'اپنی پروڈکشن لائن کے بارے میں ہم سے بات کریں',
      body: 'ہمیں بتائیں آپ کیسے بناتے اور بیچتے ہیں؛ ہم دکھائیں گے کہ آج کیا چلتا ہے اور ہم کیا بنا سکتے ہیں۔',
      primaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'primary', trackAs: 'cta_demo' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'bc2dc3c32bc1',
    },
  ],
  faqKeys: [
    'ur-sol-manufacturing-scope',
    'ur-sol-manufacturing-costing',
    'ur-sol-manufacturing-dairy',
    'ur-sol-manufacturing-made-to-order',
    'ur-sol-manufacturing-prices',
  ],
  relations: [
    { ref: 'INDUSTRY:bakery@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:dairy@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:furniture@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'PRODUCT:inventory@ur', kind: 'TAG' },
    { ref: 'PRODUCT:purchasing@ur', kind: 'TAG' },
    { ref: 'PRODUCT:reports@ur', kind: 'TAG' },
    { ref: 'SERVICE:custom-software@ur', kind: 'TAG' },
    { ref: 'SERVICE:data-migration@ur', kind: 'TAG' },
  ],
  seoTitle: 'چھوٹے کاروبار کے لیے مینوفیکچرنگ اور پروڈکشن سافٹ ویئر',
  seoDescription:
    'خام مال، ریسیپی کاسٹ، پروڈکشن پلان، آرڈر پر کام، خریداری اور تیار مال کا اسٹاک سیل کے ساتھ ایک سسٹم میں۔ BOM اور ورک آرڈر جلد آ رہے ہیں۔',
  focusKeyword: 'مینوفیکچرنگ سافٹ ویئر پاکستان',
  sortOrder: 6,
  origin: 'translation of content/main-pages/solutions.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/industries/bakery/pages/IngredientsPage.tsx',
    'apps/web/src/industries/bakery/pages/ProductionPage.tsx',
    'apps/web/src/industries/bakery/pages/BakeryBulkOrdersPage.tsx',
    'apps/web/src/industries/bakery/components/raw/RecipeCosting.tsx',
    'apps/web/src/industries/bakery/components/production/PlanBuilder.tsx',
    'apps/web/src/industries/bakery/components/production/ProductionAnalytics.tsx',
    'apps/web/src/industries/dairy/pages/ProductionPage.tsx',
    'apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx',
    'apps/web/src/industries/furniture/pages/CarpentersPage.tsx',
    'apps/web/src/industries/restaurant/pages/RecipesPage.tsx',
    'apps/web/src/modules/purchasing',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ['General manufacturing (multi-level BOM, work orders, machine tracking) is not in apps/web; shown as coming soon. Confirm roadmap wording.'],
};
