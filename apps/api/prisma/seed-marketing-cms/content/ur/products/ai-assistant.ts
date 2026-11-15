/** Urdu: Nafaa AI business assistant product page (/ur/product/ai-assistant). Translation of content/main-pages/hubs.ts (ai-assistant, rewritten 15 Nov 2026). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { withIds } from '../../../lib/blocks';

// The English page uses no FAQs.
export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'PRODUCT',
  locale: 'ur',
  slug: 'ai-assistant',
  relations: [
    { ref: 'PRODUCT:reports@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'PAGE:languages@ur', kind: 'RELATED' },
    { ref: 'PAGE:mobile-app@ur', kind: 'RELATED' },
    { ref: 'PAGE:product@ur', kind: 'RELATED' },
  ],
  title: 'Nafaa AI بزنس اسسٹنٹ',
  seoTitle: 'Nafaa AI: اردو اور انگریزی میں بزنس اسسٹنٹ',
  seoDescription:
    'Nafaa AI سے اپنی سیل، Profit، اسٹاک اور کھاتے کے بارے میں انگریزی، اردو یا رومن اردو میں پوچھیں۔ جواب آپ کے اپنے ڈیٹا سے، اور کام آپ کی تصدیق کے بعد۔',
  focusKeyword: 'اے آئی بزنس اسسٹنٹ',
  summary:
    'Nafaa AI آپ کے اپنے کاروبار کے سوالوں کے جواب انگریزی، اردو یا رومن اردو میں دیتا ہے: سیل، Profit، اسٹاک، کھاتہ اور Expense۔ یہ ہر صفحے سے کھلتا ہے، جواب کے پیچھے کے نمبر اور چارٹ دکھاتا ہے، اور بل یا اسٹاک کی تبدیلی آپ کے کنفرم کرنے کے لیے تیار کرتا ہے۔',
  data: {
    icon: 'sparkles',
    shortName: 'Nafaa AI',
    benefit: 'اپنے کاروبار سے سیدھے الفاظ میں پوچھیں',
    status: 'live',
  },
  blocks: withIds('PRODUCT:ai-assistant@ur', [
    {
      type: 'hero',
      eyebrow: 'Nafaa AI',
      heading: 'اپنے کاروبار سے سوال پوچھیں، اپنے الفاظ میں',
      sub: 'Nafaa AI ایپ کے ہر صفحے پر موجود ہے۔ آج کی سیل، کس کے پیسے باقی ہیں یا کیا دوبارہ منگوانا ہے، انگریزی، اردو یا رومن اردو میں پوچھیں اور نمبروں کے ساتھ مختصر جواب پائیں۔ جب آپ کوئی کام کروانا چاہیں تو یہ اسے تیار کر کے آپ کے کنفرم کرنے کا انتظار کرتا ہے۔',
      primaryCta: { label: '7 دن کا فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_trial' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['انگریزی، اردو اور رومن اردو', 'صرف وہی پڑھتا ہے جو آپ دیکھ سکتے ہیں', 'آپ کی اجازت کے بغیر کچھ نہیں بدلتا'],
      layout: 'centered',
    },
    {
      type: 'answerBox',
      heading: 'مختصر میں',
      facts: [
        { label: 'یہ کیا کرتا ہے', value: 'آپ کے اپنے Nafaa ڈیٹا سے کاروبار کے سوالوں کے جواب نمبروں اور چارٹ کے ساتھ دیتا ہے' },
        { label: 'کہاں', value: 'ویب ایپ کے ہر صفحے پر سائیڈ پینل، ایک مکمل صفحہ، اور Nafaa POS موبائل ایپ' },
        { label: 'کام', value: 'بل، پروڈکٹس، کسٹمرز، کھاتے کی ادائیگیاں، Expense، اسٹاک کی تبدیلیاں اور پرچیز آرڈر آپ کے کنفرم کرنے کے لیے تیار کرتا ہے' },
        { label: 'زبانیں', value: 'انگریزی، اردو اور رومن اردو' },
        { label: 'ڈیٹا تک رسائی', value: 'صرف وہ جو پوچھنے والے کو ایپ میں دیکھنے کی اجازت ہے' },
      ],
      romanUrdu:
        'Nafaa AI se apni Sale, Profit, Stock aur khata ke baare me apne alfaaz me poochein, English, Urdu ya Roman Urdu me. Jawab aap ke apne data se aata hai, aur koi bhi kaam aap ke confirm karne ke baad hi hota hai.',
    },
    {
      type: 'featuresGrid',
      heading: 'Nafaa AI کیا کرتا ہے',
      columns: 3,
      items: [
        { icon: 'message-square', title: 'سیدھے الفاظ میں جواب', body: 'پوچھیں "Is mahine sab se zyada Profit kis cheez par hua?" اور جواب پیچھے کے نمبروں کے ساتھ پائیں۔' },
        { icon: 'chart-line', title: 'چارٹ اور موازنے', body: 'آج کا پچھلے ہفتے سے، ایک برانچ کا دوسری سے، یا اس مہینے کا پچھلے سے موازنہ کریں، جواب میں چارٹ کے ساتھ۔' },
        { icon: 'boxes', title: 'ری آرڈر اور اسٹاک', body: 'کیا کم ہو رہا ہے، کتنے دن کا اسٹاک باقی ہے اور کیا منگوانا ہے، جسے پرچیز آرڈر بنایا جا سکتا ہے۔' },
        { icon: 'circle-check', title: 'وہ کام جو آپ کنفرم کریں', body: 'اس سے بل بنانے، کسٹمر ڈالنے، Expense لکھنے یا قیمت ٹھیک کرنے کو کہیں۔ یہ ایک کارڈ بھر دیتا ہے؛ آپ دیکھ کر Confirm دباتے ہیں۔' },
        { icon: 'bell-ring', title: 'صبح کی سمری', body: 'کل کی سیل، Profit، Expense، ادھار اور کم اسٹاک ہر صبح ایک پیغام میں۔' },
        { icon: 'languages', title: 'تین زبانیں اور آواز', body: 'انگریزی، اردو یا رومن اردو میں لکھیں یا بول کر پوچھیں، اور جواب بلند آواز میں سنیں۔' },
      ],
    },
    {
      type: 'richText',
      markdown: `## وہ سوال جو مالک روز پوچھتے ہیں

زیادہ تر مالک دکان کھولنے سے پہلے اور بند کرنے کے بعد وہی چند جواب چاہتے ہیں۔ Nafaa AI یہ ایک لائن میں دیتا ہے، انہی نمبروں سے جو ایپ پہلے سے رکھتی ہے:

- "Aaj ki sale kitni hui, aur kal se zyada hai ya kam?"
- "Which products made the most profit this month?"
- "Kis customer ka udhaar ek mahine se purana hai?"
- "What should I reorder before the weekend?"
- "Which branch sold the most yesterday, and which cashier?"
- "Kitne online orders courier ke paas phanse hue hain?"

ہر جواب کے ساتھ اس کے پیچھے کے اعداد نظر آتے ہیں، اکثر ایک چھوٹے چارٹ کے ساتھ، اور یہ دو تین اگلے سوال بھی سجھاتا ہے۔ آپ جواب کاپی کر سکتے ہیں یا WhatsApp پر بھیج سکتے ہیں، اور ہر چیٹ محفوظ رہتی ہے، اس لیے بعد میں اسے تلاش کر سکتے ہیں، نام بدل سکتے ہیں، پن کر سکتے ہیں یا ڈیلیٹ کر سکتے ہیں۔

## یہ پورے کاروبار کو جانتا ہے

Nafaa AI وہی پڑھتا ہے جو پہلے سے Nafaa پر چل رہا ہے، انہی رپورٹس کے ذریعے جو ایپ استعمال کرتی ہے، اس لیے اس کا "کل" وہی ہے جو ڈیش بورڈ کا "کل" ہے:

- **کاؤنٹر اور Profit:** سیل، بل، Discount، ریٹرن، پروڈکٹ اور کیٹیگری کے حساب سے Profit، کیش دراز اور Expense۔
- **اسٹاک:** اسٹاک کی ویلیو، کم اسٹاک، اسٹاک کی حرکت اور اس کا اندازہ کہ کیا ختم ہونے والا ہے۔
- **کسٹمرز:** [کھاتہ](/ur/product/khata)، سب سے پرانا ادھار، بہترین کسٹمرز اور لائلٹی پوائنٹس۔
- **خریداری:** پرچیز، سپلائرز اور ان کو دینے والی رقم۔
- **ٹیم اور برانچیں:** اسٹاف کی کارکردگی اور برانچوں کا ساتھ ساتھ موازنہ۔
- **آن لائن:** آرڈر، چھوڑی ہوئی کارٹس، ہر کوریئر کے ساتھ COD، شہر کے حساب سے ڈیلیوری اور اشتہار کا خرچ سیل کے مقابلے میں۔
- **ڈسٹری بیوشن:** [ہول سیل اور ڈسٹری بیوشن](/ur/solutions/wholesale-distribution) کے لیے روزانہ سیل رپورٹ، روٹ کی وصولی، وین کا اسٹاک اور ہدف۔

اگر کوئی نمبر آپ کے Nafaa ڈیٹا میں نہیں ہے تو یہ بنانے کے بجائے صاف بتا دیتا ہے۔ آپ کا جتنا زیادہ کاروبار Nafaa پر چلتا ہے، یہ اتنے زیادہ سوالوں کے جواب دے سکتا ہے۔

## کام، اور فیصلہ آپ کا

Nafaa AI روزمرہ کے کام بھی کر سکتا ہے۔ اس سے سیل بنانے، پروڈکٹ یا کسٹمر ڈالنے، کھاتے کی ادائیگی، Expense یا دوسری آمدنی لکھنے، اسٹاک ایڈجسٹ کرنے، قیمت بدلنے یا پرچیز آرڈر کا مسودہ بنانے کو کہیں۔ آپ نے جو نام بولے وہ آپ کی اصل پروڈکٹس اور کسٹمرز سے ملاتا ہے (نام واضح نہ ہو تو پوچھتا ہے)، ٹوٹل اور اسٹاک نکالتا ہے، اور ایک کارڈ دکھاتا ہے جس کی ہر فیلڈ آپ بدل سکتے ہیں۔ جب تک آپ **Confirm** نہ دبائیں کچھ نہیں ہوتا۔ اس کے بعد کام اسی اسکرین لاجک سے چلتا ہے جو ایپ استعمال کرتی ہے، انہی کاؤنٹر رولز اور اجازتوں کے ساتھ، اور ایکٹیویٹی لاگ میں لکھا جاتا ہے کہ یہ Nafaa AI کے ذریعے ہوا۔

کچھ کام یہ کبھی نہیں کرتا: کوئی چیز ڈیلیٹ کرنا، بل void یا refund کرنا، یا سیٹنگز، یوزرز، اجازتیں یا آپ کا پلان بدلنا۔

## انگریزی، اردو یا رومن اردو

انگریزی میں پوچھیں تو انگریزی میں جواب دیتا ہے؛ رومن اردو میں پوچھیں تو رومن اردو میں؛ اور اگر آپ کی ایپ اردو پر ہے تو جواب اردو رسم الخط میں آتا ہے۔ Sale، Profit، Stock اور Discount جیسے کاروباری الفاظ انگریزی میں ہی رہتے ہیں، جیسے دکانوں میں بولے جاتے ہیں۔ Chrome یا Edge والے کمپیوٹر پر آپ بول کر سوال پوچھ سکتے ہیں، اور کوئی بھی جواب بلند آواز میں سنا جا سکتا ہے۔ باقی ایپ کے لیے [Nafaa تین زبانوں میں](/ur/languages) دیکھیں۔

## آپ کا ڈیٹا آپ ہی کا رہتا ہے

Nafaa AI صرف آپ کا اپنا کاروباری ڈیٹا پڑھتا ہے، اور وہ بھی صرف جو پوچھنے والے کو دیکھنے کی اجازت ہو۔ جو کیشیئر ایپ میں Profit نہیں دیکھ سکتا وہ Nafaa AI سے بھی Profit نہیں پوچھ سکتا۔ مالک اسٹاف کی اجازتوں سے طے کرتے ہیں کہ اسے کون استعمال کرے۔ پوری تفصیل چاہیے تو [رپورٹس](/ur/product/reports) ہمیشہ موجود ہیں۔

## فون پر بھی

Nafaa AI [Nafaa POS موبائل ایپ](/ur/mobile-app) میں بھی ہے، اس لیے دکان سے دور مالک پوچھ سکتا ہے کہ دن کیسا جا رہا ہے۔ صبح کی سمری سیٹنگز میں رکھے گئے رپورٹ کے وقت پر فون اور ایپ میں نوٹیفکیشن کی صورت میں آتی ہے۔

## پلان اور حدیں

Nafaa AI [قیمتوں کے صفحے](/ur/pricing) پر دکھائے گئے پلانز کا حصہ ہے، ہر پلان میں روزانہ سوالوں کی ایک تعداد کے ساتھ۔ جو دکانیں اسے بہت زیادہ استعمال کرتی ہیں وہ زیادہ سوالوں اور رپورٹس کے لیے **Nafaa AI Plus** شامل کر سکتی ہیں۔ صبح کی سمری جیسے سادہ سوالوں کے جواب سیدھے آپ کے نمبروں سے آتے ہیں، جس سے یہ تیز رہتا ہے۔`,
    },
    {
      type: 'cta',
      heading: 'اپنا پہلا سوال پوچھیں',
      body: '7 دن کا فری ٹرائل شروع کریں اور اپنے کاروبار کے بارے میں سیدھے الفاظ میں پوچھیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'cta_trial' },
      secondaryCta: { label: 'واٹس ایپ پر پیغام بھیجیں', href: 'whatsapp', variant: 'ghost', trackAs: 'cta_whatsapp' },
    },
  ]),
  sortOrder: 99,
  origin: 'translation of content/main-pages/hubs.ts (15 Nov 2026)',
  evidence: [
    'apps/web/src/modules/ai-assistant/index.ts',
    'apps/web/src/modules/ai-assistant/components/AiDrawer.tsx',
    'apps/web/src/modules/ai-assistant/components/AiActionCard.tsx',
    'apps/api/src/modules/ai-assistant/ai-actions.service.ts',
    'apps/api/src/modules/ai-assistant/morning-summary.service.ts',
    'apps/mobile/src/modules/ai-assistant',
  ],
  factCheck: { checkedOn: '2026-11-15', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ['Which plans include Nafaa AI and the daily question limits come from the plan table; the page does not state them.'],
};
