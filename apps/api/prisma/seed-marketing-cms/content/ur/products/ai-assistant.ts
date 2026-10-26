/** Urdu: AI business assistant product page (/ur/product/ai-assistant). Translation of content/main-pages/hubs.ts (ai-assistant). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

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
    { ref: 'PAGE:product@ur', kind: 'RELATED' },
  ],
  title: 'AI بزنس اسسٹنٹ',
  seoTitle: 'Nafaa AI اسسٹنٹ: اپنے کاروبار سے سیدھے الفاظ میں پوچھیں',
  seoDescription: 'Nafaa کا AI بزنس اسسٹنٹ آپ کی سیل، اسٹاک اور کھاتے کے بارے میں سوالوں کے جواب انگریزی یا رومن اردو میں دیتا ہے، آپ کے اپنے کاروبار کے ڈیٹا سے۔',
  focusKeyword: 'AI بزنس اسسٹنٹ',
  summary:
    'Nafaa کا AI بزنس اسسٹنٹ آپ کی اپنی سیل، اسٹاک اور کھاتے کے بارے میں سوالوں کے جواب سیدھی انگریزی یا رومن اردو میں دیتا ہے۔ اپنے الفاظ میں پوچھیں اور اپنے Nafaa ڈیٹا سے مختصر جواب لیں، پیچھے کے نمبروں کے ساتھ۔ یہ صرف وہی ڈیٹا پڑھتا ہے جو آپ کا اکاؤنٹ دیکھ سکتا ہے۔',
  data: {
    icon: 'sparkles',
    shortName: 'AI اسسٹنٹ',
    benefit: 'اپنے کاروبار سے سیدھے الفاظ میں پوچھیں',
    status: 'live',
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'Nafaa میں نیا',
      heading: 'اپنے کاروبار سے سوال پوچھیں، اپنے الفاظ میں',
      sub: 'Nafaa کا AI اسسٹنٹ آپ کی اپنی سیل، اسٹاک اور کھاتے کے بارے میں سوالوں کے جواب دیتا ہے۔ انگریزی یا رومن اردو میں لکھیں اور کئی رپورٹیں کھولے بغیر نمبروں کے ساتھ مختصر جواب پائیں۔',
      primaryCta: { label: '7 دن کا فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_trial' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['انگریزی اور رومن اردو', 'صرف آپ کا اپنا ڈیٹا پڑھتا ہے', 'جواب نمبروں کے ساتھ'],
      layout: 'centered',
      id: 'bb6049a8eed3',
    },
    {
      type: 'answerBox',
      heading: 'مختصر میں',
      facts: [
        { label: 'یہ کیا کرتا ہے', value: 'آپ کے اپنے Nafaa ڈیٹا سے سیل، اسٹاک اور کھاتے کے سوالوں کے جواب دیتا ہے' },
        { label: 'زبانیں', value: 'انگریزی اور رومن اردو' },
        { label: 'ڈیٹا تک رسائی', value: 'صرف وہ کاروباری ڈیٹا جو پوچھنے والا اکاؤنٹ دیکھ سکتا ہے' },
      ],
      romanUrdu:
        'Nafaa AI assistant se apni Sale, Stock aur khata ke baare me apne alfaaz me sawal poochein, English ya Roman Urdu me, aur seedha jawab payein.',
      id: 'bcdca58b04d9',
    },
    {
      type: 'featuresGrid',
      heading: 'یہ کیا کرتا ہے',
      columns: 3,
      items: [
        { icon: 'message-square', title: 'سیدھے الفاظ میں سوال', body: 'پوچھیں "Is mahine sab se zyada Profit kin cheezon par hua?" اور نمبروں کے ساتھ جواب پائیں۔' },
        { icon: 'chart-line', title: 'فرق کی وجہ', body: 'دیکھیں کہ آج کی سیل پچھلے ہفتے کے مقابلے میں کیوں بڑھی یا گھٹی۔' },
        { icon: 'boxes', title: 'اسٹاک کی یاد دہانی', body: 'مال ختم ہونے سے پہلے پتا چلے کہ کیا دوبارہ منگوانا ہے۔' },
      ],
      id: 'bb0d3dbe0349',
    },
    {
      type: 'richText',
      markdown:
        '## وہ سوال جو مالک روز پوچھتے ہیں\n\nزیادہ تر مالک دکان کھولنے سے پہلے اور بند کرنے کے بعد وہی چند باتیں جاننا چاہتے ہیں۔ اسسٹنٹ یہ جواب ایک لائن میں دیتا ہے، انہی نمبروں سے جو ایپ پہلے سے رکھتی ہے:\n\n- "Aaj ki sale kitni hui, aur kal se zyada hai ya kam?"\n- "Which products made the most profit this month?"\n- "Kis gahak ka udhaar ek mahine se purana hai?"\n- "What should I reorder before the weekend?"\n- "Which branch sold the most yesterday?"\n\nہر جواب کے ساتھ اس کے پیچھے کے نمبر ہوتے ہیں تاکہ آپ انہیں جانچ سکیں، اور اس اسکرین کا لنک بھی جہاں پوری تفصیل ہے۔\n\n## جواب کہاں سے آتے ہیں\n\nاسسٹنٹ وہی پڑھتا ہے جو پہلے سے Nafaa پر چل رہا ہے: [POS کاؤنٹر](/ur/product/pos) کے بل، [انوینٹری](/ur/product/inventory) سے اسٹاک اور خریداری، [ڈیجیٹل کھاتے](/ur/product/khata) سے ادھار اور ادائیگیاں، اور [رپورٹس](/ur/product/reports) کے اعداد۔ یہ اندازہ نہیں لگاتا۔ اگر کوئی نمبر آپ کے Nafaa ڈیٹا میں نہیں ہے تو یہ صاف بتا دیتا ہے، اپنی طرف سے نہیں بناتا۔ آپ کا جتنا کاروبار Nafaa پر چلتا ہے، یہ اتنے زیادہ سوالوں کے جواب دے سکتا ہے۔\n\n## انگریزی یا رومن اردو، جو آپ چاہیں\n\nNafaa استعمال کرنے والے زیادہ تر لوگ رومن اردو میں لکھتے ہیں، اور بہت سے ایک ہی جملے میں دونوں ملا لیتے ہیں۔ اسسٹنٹ دونوں سمجھتا ہے، اس لیے "is hafte sab se zyada kya bika?" بھی اتنا ہی چلتا ہے جتنا "what sold the most this week?"۔ [کھاتہ](/ur/glossary/khata) اور [ادھار](/ur/glossary/udhaar) جیسے الفاظ کا وہی مطلب ہے جو آپ کی دکان میں ہے۔\n\n## آپ کا ڈیٹا آپ ہی کا رہتا ہے\n\nاسسٹنٹ صرف آپ کا اپنا کاروباری ڈیٹا پڑھتا ہے، اور وہ بھی پوچھنے والے اکاؤنٹ کی اجازتوں کے اندر۔ جو کیشیئر ایپ میں پرافٹ نہیں دیکھ سکتا، وہ اسسٹنٹ سے بھی پرافٹ نہیں پوچھ سکتا۔ یہ خود سے قیمت، اسٹاک یا بل نہیں بدلتا؛ کوئی بھی تبدیلی اب بھی کسی بندے کو ایپ میں خود کرنی ہوتی ہے۔ جب پوری تفصیل چاہیے تو [رپورٹس](/ur/product/reports) ہمیشہ موجود ہیں: ہر پروڈکٹ کا پرافٹ، پرافٹ اینڈ لاس اور اسٹاک ایک جگہ۔\n\n## ہر طرح کے کاروبار کے لیے\n\n[کریانہ اسٹور](/ur/industries/kiryana) پوچھتا ہے کون سی چیزیں کم ہو رہی ہیں۔ [فارمیسی](/ur/industries/pharmacy) پوچھتی ہے کون سے بیچ جلد ایکسپائر ہوں گے۔ [ریسٹورنٹ](/ur/industries/restaurant) پوچھتا ہے دوپہر کو کون سی ڈش سب سے زیادہ بکی۔ [کپڑے کی دکان](/ur/industries/garments) پوچھتی ہے کون سے سائز چل رہے ہیں۔ [بیکری](/ur/industries/bakery) پوچھتی ہے شام سے پہلے کیا ختم ہو گیا، اور [موبائل شاپ](/ur/industries/mobile-shop) پوچھتی ہے کون سے ماڈل سب سے زیادہ کماتے ہیں۔ سوال بدلتے ہیں؛ جواب اسی کاؤنٹر، اسٹاک اور کھاتے سے آتے ہیں۔\n\n## شروع کیسے کریں\n\nNafaa کے اندر سے اسسٹنٹ کھولیں اور اپنا پہلا سوال لکھیں۔ کچھ سیٹ اپ نہیں کرنا: یہ آپ کی پروڈکٹس، گاہکوں اور برانچوں کو پہلے سے جانتا ہے کیونکہ یہ سب اسی اکاؤنٹ میں ہیں۔ کل کی سیل سے شروع کریں، پھر ادھار اور کم اسٹاک کے بارے میں پوچھیں، اور ایک منٹ میں آپ دیکھ لیں گے کہ یہ آپ کے کاروبار کے لیے کیا کر سکتا ہے۔',
      id: 'bbde15ad68e9',
    },
    {
      type: 'cta',
      heading: 'اپنا پہلا سوال پوچھیں',
      body: '7 دن کا فری ٹرائل شروع کریں اور اپنے کاروبار کے بارے میں سیدھے الفاظ میں پوچھیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'cta_trial' },
      secondaryCta: { label: 'واٹس ایپ پر پیغام بھیجیں', href: 'whatsapp', variant: 'ghost', trackAs: 'cta_whatsapp' },
      id: 'b5efe4174fc2',
    },
  ],
  sortOrder: 99,
  origin: 'translation of content/main-pages/hubs.ts (26 Oct 2026)',
  evidence: ['apps/web/src/modules/ai-assistant/index.ts'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ["Marketed as available on the owner's instruction (21 Oct 2026). Confirm plan availability before launch."],
};
