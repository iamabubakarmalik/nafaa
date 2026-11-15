/** Urdu: Nafaa POS mobile app page (/ur/mobile-app). Translation of content/main-pages/features-nov.ts (mobile-app). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { withIds } from '../../../lib/blocks';
import { MOBILE_SHOT, STORE } from '../../main-pages/features-nov';

const M = 'apps/mobile/src';
const ORIGIN = 'translation of faq nov-app-* (15 Nov 2026)';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-mobile-app-cost',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'کیا Nafaa موبائل ایپ فری ہے؟',
    answer:
      'ایپ Google Play اور App Store سے فری ڈاؤن لوڈ ہوتی ہے۔ یہ آپ کے Nafaa اکاؤنٹ سے چلتی ہے، اس لیے Nafaa پر جو پلان آپ کے پاس ہے وہی ایپ کے لیے بھی کافی ہے۔ فون پر Nafaa چلانے کا الگ کوئی چارج نہیں۔',
    sourceNote: 'Play and App Store listings; the app signs in to the same account and plan as the web app.',
    origin: ORIGIN,
    evidence: [`${M}/modules/auth`, `${M}/modules/billing`],
  },
  {
    key: 'ur-page-mobile-app-offline',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'کیا ایپ انٹرنیٹ کے بغیر چلتی ہے؟',
    answer:
      'جی ہاں۔ پروڈکٹس، اسٹاک، کسٹمرز، کھاتے کے بیلنس اور پچھلے 30 دن کے بل فون پر رکھے جاتے ہیں۔ آف لائن بنے ہوئے بل فون میں محفوظ رہتے ہیں اور انٹرنیٹ واپس آتے ہی خود بھیج دیے جاتے ہیں۔ ہر بل اپنی الگ key کے ساتھ جاتا ہے، اس لیے دوبارہ بھیجنے سے دوسرا بل نہیں بنتا، اور جو چیز سرور قبول نہ کرے وہ گم ہونے کے بجائے سیدھے الفاظ میں sync issue کے طور پر نظر آتی ہے۔',
    sourceNote: 'apps/mobile/src/core/offline/README.md (mirror, outbox with Idempotency-Key, sync issues).',
    origin: ORIGIN,
    evidence: [`${M}/core/offline/README.md`, `${M}/core/offline/engine`],
  },
  {
    key: 'ur-page-mobile-app-iphone',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'کیا iPhone ایپ میں نیا اکاؤنٹ بنا سکتا ہوں؟',
    answer:
      'iPhone اور iPad پر ایپ پہلے سے بنے ہوئے Nafaa اکاؤنٹ میں سائن ان کرنے کے لیے ہے۔ پہلے nafaa.pk پر یا Android ایپ میں اپنا اکاؤنٹ بنائیں، پھر iPhone پر اسی لاگ ان سے سائن ان کریں۔ سائن ان کرتے ہی آپ کا پلان، پروڈکٹس، کسٹمرز اور کھاتہ وہاں موجود ہوتے ہیں۔',
    sourceNote: 'iOS build is sign-in only (commit a9dc75fd, App Review 3.1.1).',
    origin: ORIGIN,
    evidence: [`${M}/modules/auth`, 'apps/mobile/app.json'],
  },
  {
    key: 'ur-page-mobile-app-same-data',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'کیا ایپ کا ڈیٹا کمپیوٹر والا ہی ہے؟',
    answer:
      'جی ہاں۔ فون، ویب ایپ اور Windows ڈیسک ٹاپ ایپ ایک ہی Nafaa اکاؤنٹ استعمال کرتے ہیں۔ فون پر بنا ہوا بل کمپیوٹر کی رپورٹس میں نظر آتا ہے، اور کمپیوٹر پر بدلی ہوئی قیمت اگلے sync پر فون تک پہنچ جاتی ہے۔ ایپ کھلتے وقت، انٹرنیٹ واپس آنے پر اور آن لائن ہوتے ہوئے ہر چند منٹ بعد sync کرتی ہے۔',
    sourceNote: 'Offline engine sync triggers: app start and resume, connection back, every 3 minutes, after any change.',
    origin: ORIGIN,
    evidence: [`${M}/core/offline/README.md`],
  },
  {
    key: 'ur-page-mobile-app-print',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'کیا فون سے بل پرنٹ کر سکتا ہوں؟',
    answer:
      'جی ہاں۔ ایپ بل کو فون کی اپنی پرنٹ سروس سے پرنٹ کرتی ہے (iPhone پر AirPrint، Android پر پرنٹ سروس)، اسی رسید کے ڈیزائن میں جو ویب ایپ میں ہے۔ آپ بل کو PDF کے طور پر شیئر بھی کر سکتے ہیں، یا گاہک کو WhatsApp پر ٹیکسٹ کی صورت میں بھیج سکتے ہیں۔',
    sourceNote: 'apps/mobile/src/core/receipt/print.ts (expo-print, PDF share, WhatsApp text).',
    origin: ORIGIN,
    evidence: [`${M}/core/receipt/print.ts`],
  },
  {
    key: 'ur-page-mobile-app-notifications',
    locale: 'ur',
    topic: 'mobile-app',
    question: 'ایپ کون سی نوٹیفکیشن بھیجتی ہے؟',
    answer:
      'ایپ آپ کو نئی سیل، ملنے والی ادائیگیوں، کم اور ختم اسٹاک، ریٹرن، نئے کسٹمرز، اسٹاک ٹرانسفر، کیش رجسٹر کھلنے اور بند ہونے، کریڈٹ الرٹ، آن لائن آرڈرز اور صبح کی سمری کی اطلاع دے سکتی ہے۔ ہر شخص خود چنتا ہے کہ اسے کون سے الرٹ چاہییں، اور یہ بھی کہ اپنے ہی کاموں کی اطلاع ملے یا نہیں۔',
    sourceNote: 'Notification types in apps/mobile/src/modules/notifications/api/notifications.ts; own-action toggles (f713ecb5, 991877a6).',
    origin: ORIGIN,
    evidence: [`${M}/modules/notifications/api/notifications.ts`, `${M}/modules/notifications/lib/usePushSetup.ts`],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'mobile-app',
  title: 'Nafaa POS موبائل ایپ',
  seoTitle: 'Nafaa POS ایپ: Android اور iPhone پر بلنگ اور کھاتہ',
  seoDescription:
    'Nafaa POS ایپ Google Play یا App Store سے لیں۔ بلنگ، اسٹاک، کھاتہ، Profit اور آن لائن آرڈر فون پر، انٹرنیٹ کے بغیر بھی چلتے ہیں۔',
  focusKeyword: 'پی او ایس ایپ پاکستان',
  summary:
    'Android اور iPhone کی Nafaa POS ایپ آپ کا کاروبار فون سے چلاتی ہے: کیمرے سے بارکوڈ اسکین کر کے بلنگ، اسٹاک، WhatsApp ریمائنڈر کے ساتھ کھاتہ، Profit اور رپورٹس، آن لائن آرڈر اور الرٹ۔ انٹرنیٹ کے بغیر بھی بلنگ چلتی رہتی ہے اور ایپ خود sync کر لیتی ہے، انگریزی، اردو یا رومن اردو میں۔',
  data: { template: 'default', icon: 'smartphone', shortName: 'موبائل ایپ' },
  blocks: withIds('PAGE:mobile-app@ur', [
    {
      type: 'hero',
      eyebrow: 'Android اور iPhone کے لیے Nafaa POS ایپ',
      heading: 'آپ کا پورا کاروبار آپ کے فون میں',
      sub: 'بل بنائیں، کیمرے سے بارکوڈ اسکین کریں، ہر گاہک کا کھاتہ رکھیں اور آج کا Profit دیکھیں، جیب میں رکھے فون سے۔ انٹرنیٹ چلا جائے تو بھی ایپ چلتی رہتی ہے اور واپس آنے پر خود sync کر لیتی ہے۔',
      primaryCta: { label: 'Google Play سے لیں', href: STORE.play, variant: 'primary', trackAs: 'app_play' },
      secondaryCta: { label: 'App Store سے ڈاؤن لوڈ کریں', href: STORE.appStore, variant: 'secondary', trackAs: 'app_ios' },
      badges: ['Android اور iPhone', 'آف لائن بھی چلتی ہے', 'انگریزی، اردو، رومن اردو'],
      media: { kind: 'screenshot', mediaId: MOBILE_SHOT.ur.feature, frame: 'none' },
      layout: 'split',
    },
    {
      type: 'answerBox',
      heading: 'ایپ مختصراً',
      facts: [
        { label: 'Android', value: 'Google Play پر Nafaa POS' },
        { label: 'iPhone اور iPad', value: 'App Store پر Nafaa POS، پہلے سے بنے ہوئے اکاؤنٹ میں سائن ان کے لیے' },
        { label: 'انٹرنیٹ کے بغیر', value: 'بل، اسٹاک اور کھاتہ آف لائن چلتے ہیں اور خود sync ہو جاتے ہیں' },
        { label: 'زبانیں', value: 'انگریزی، اردو (دائیں سے بائیں) اور رومن اردو' },
        { label: 'قیمت', value: 'ڈاؤن لوڈ فری ہے؛ یہ آپ کے Nafaa اکاؤنٹ اور پلان سے چلتی ہے' },
      ],
      romanUrdu:
        'Nafaa POS app Android aur iPhone par: bill, barcode, stock, khata, Profit aur online orders, sab phone par. Internet na ho tab bhi bill bante hain aur baad me khud sync ho jate hain.',
    },
    {
      type: 'featuresGrid',
      heading: 'ایپ کیا کرتی ہے',
      intro: 'ایپ وہی Nafaa ہے جو آپ کمپیوٹر پر استعمال کرتے ہیں، بس فون کی اسکرین کے مطابق بنی ہوئی۔ نیچے سب کچھ ویب ایپ اور Windows ڈیسک ٹاپ ایپ کے ساتھ ایک ہی اکاؤنٹ پر چلتا ہے۔',
      columns: 3,
      items: [
        { icon: 'scan-barcode', title: 'سیکنڈوں میں بلنگ', body: 'پروڈکٹس ٹیپ کریں یا کیمرے سے بارکوڈ اسکین کریں۔ Cash، JazzCash، Easypaisa، کارڈ، بینک اور اسپلٹ ادائیگی، Discount، ہولڈ بل اور ریٹرن۔' },
        { icon: 'wifi-off', title: 'آف لائن بھی چلتی ہے', body: 'بل، اسٹاک اور کھاتہ فون پر محفوظ رہتے ہیں اور انٹرنیٹ واپس آتے ہی خود بھیج دیے جاتے ہیں۔' },
        { icon: 'notebook-pen', title: 'کھاتہ اور ادھار', body: 'ہر گاہک کا بیلنس، کریڈٹ لمٹ اور اسٹیٹمنٹ، اور ایک ٹیپ میں WhatsApp ریمائنڈر۔' },
        { icon: 'boxes', title: 'اسٹاک اور بارکوڈ', body: 'پروڈکٹس، پیک اور ویریئنٹ، اسٹاک کی ویلیو، کم اسٹاک کی لسٹ، خریداری، سپلائرز اور ٹرانسفر۔' },
        { icon: 'chart-column', title: 'Profit اور رپورٹس', body: 'ہوم پر آج کی سیل، Profit اور روزانہ ہدف؛ ڈے رپورٹ، پرافٹ اینڈ لاس، Expense اور کیش رجسٹر۔' },
        { icon: 'shopping-bag', title: 'آن لائن آرڈر', body: 'ویب سائٹ اور چینلز کے آرڈر، COD کی تصدیق، کوریئر ٹریکنگ اور ایڈوانس بکنگ ایک ہی ڈیسک میں۔' },
        { icon: 'bell-ring', title: 'فون پر الرٹ', body: 'نئی سیل، ادائیگیاں، کم اسٹاک، آن لائن آرڈر اور صبح کی سمری پش نوٹیفکیشن کی صورت میں۔' },
        { icon: 'sparkles', title: 'Nafaa AI', body: 'اپنے کاروبار کے بارے میں اپنے الفاظ میں پوچھیں اور جواب اپنے ہی نمبروں سے پائیں۔' },
        { icon: 'message-square', title: 'لائیو سپورٹ', body: 'مدد چاہیے ہو تو ایپ کے اندر ہی Nafaa ٹیم سے چیٹ کریں۔' },
      ],
    },
    {
      type: 'screenshot',
      heading: 'سیکنڈوں میں بل',
      body: 'فون کا کاؤنٹر ویب کاؤنٹر جیسا ہی چلتا ہے: تلاش کریں یا اسکین کریں، مقدار بدلیں، Discount یا چارج لگائیں، کسٹمر چنیں اور ادائیگی لیں۔ رسید فون کی پرنٹ سروس سے پرنٹ کریں، PDF کی صورت میں شیئر کریں، یا WhatsApp پر بھیجیں۔',
      mediaId: MOBILE_SHOT.ur.billing,
      frame: 'none',
      layout: 'split-right',
    },
    {
      type: 'screenshot',
      heading: 'انٹرنیٹ نہیں؟ بیچتے رہیں',
      body: 'پروڈکٹس، اسٹاک، کسٹمرز اور پچھلے 30 دن کے بل فون پر رہتے ہیں۔ آف لائن بنا ہوا بل اسی وقت اسٹاک کم کرتا ہے اور کھاتے میں جڑ جاتا ہے، اور sync کی لسٹ میں انتظار کرتا ہے۔ انٹرنیٹ واپس آنے پر وہ اپنی الگ key کے ساتھ بھیجا جاتا ہے، اس لیے دو بار محفوظ نہیں ہوتا، اور جس چیز پر آپ کی توجہ چاہیے وہ سیدھے الفاظ میں sync issue کے طور پر نظر آتی ہے۔',
      mediaId: MOBILE_SHOT.ur.offline,
      frame: 'none',
      layout: 'split-left',
    },
    {
      type: 'screenshot',
      heading: 'ادھار کا حساب صاف',
      body: 'دیکھیں کس کے سب سے زیادہ پیسے باقی ہیں اور کتنے دن سے، کسی کسٹمر کی اسٹیٹمنٹ کھولیں، ادائیگی لیں، یا صحیح بیلنس کے ساتھ شائستہ WhatsApp ریمائنڈر بھیجیں۔ آف لائن بنے نئے کسٹمرز فون کے sync ہونے پر ان کے بلوں کے ساتھ سرور پر بن جاتے ہیں۔',
      mediaId: MOBILE_SHOT.ur.khata,
      frame: 'none',
      layout: 'split-right',
    },
    {
      type: 'screenshot',
      heading: 'اسٹاک اور بارکوڈ',
      body: 'کیمرے سے اسکین کر کے پروڈکٹ ڈھونڈیں، ہر برانچ میں اس کا اسٹاک دیکھیں، جانیں کیا کم ہو رہا ہے اور کیا سب سے زیادہ بکتا ہے۔ سپلائرز سے خریداری، اسٹاک ایڈجسٹمنٹ اور برانچوں کے درمیان ٹرانسفر سب فون پر ہیں۔',
      mediaId: MOBILE_SHOT.ur.stock,
      frame: 'none',
      layout: 'split-left',
    },
    {
      type: 'screenshot',
      heading: 'ہر روز کا Profit',
      body: 'ہوم پر آج کی سیل، بل، بکی ہوئی آئٹمز اور ادھار پر دی گئی سیل، Profit اور آپ کے روزانہ ہدف کا دائرہ نظر آتا ہے۔ پورا پرافٹ اینڈ لاس، Expense، دوسری آمدنی اور ڈے رپورٹ ایک ٹیپ کی دوری پر ہیں۔',
      mediaId: MOBILE_SHOT.ur.profit,
      frame: 'none',
      layout: 'split-right',
    },
    {
      type: 'screenshot',
      heading: 'آپ کے کاروبار کے مطابق',
      body: 'ایپ میں 30 قسم کے کاروباروں کی اسکرینیں ہیں: ریسٹورنٹ کی ٹیبلز اور کچن، فارمیسی کے بیچ اور ایکسپائری، موبائل شاپ کا IMEI اور ریپیئر، بیکری کے آرڈر، سیلون اور کلینک کی بکنگ، اور بھی بہت کچھ۔ ہول سیلرز کو اسی ایپ میں آرڈر بکر، ڈیلیوری اور وین سیل کی اسکرینیں ملتی ہیں۔',
      mediaId: MOBILE_SHOT.ur.industries,
      frame: 'none',
      layout: 'split-left',
    },
    {
      type: 'richText',
      markdown: `## آف لائن انجن کیسے کام کرتا ہے

پاکستان میں زیادہ تر دکانوں کا انٹرنیٹ دن میں کبھی نہ کبھی جاتا ہے: لوڈ شیڈنگ، مارکیٹ میں کمزور سگنل، یا فون کا پیکیج ختم۔ Nafaa ایپ اس طرح بنی ہے کہ ان میں سے کوئی بات سیل نہیں روکتی۔

- **جس سے آپ بیچتے ہیں وہ سب فون پر ہے۔** پہلی بار سائن ان پر آپ کی پروڈکٹس (پیک، ویریئنٹ اور ہر بارکوڈ کے ساتھ)، برانچ کا اسٹاک، کھاتے کے بیلنس کے ساتھ کسٹمرز، کیٹیگریز، اسٹاف، کاؤنٹر رولز، رسید کی سیٹنگز اور پچھلے 30 دن کے بل ڈاؤن لوڈ ہو جاتے ہیں۔ اس کے بعد صرف تبدیلیاں ڈاؤن لوڈ ہوتی ہیں۔
- **ہر تبدیلی محفوظ قطار میں انتظار کرتی ہے۔** آف لائن بنا ہوا بل، نیا کسٹمر یا کھاتے کی ادائیگی فون کی قطار میں چلی جاتی ہے۔ ایپ اسے جیسے ہی ممکن ہو بھیج دیتی ہے: ایپ کھلنے پر، انٹرنیٹ واپس آنے پر، آن لائن ہوتے ہوئے ہر چند منٹ بعد، اور ہر تبدیلی کے فوراً بعد۔
- **کچھ دو بار نہیں بھیجا جاتا۔** قطار کی ہر تبدیلی کی اپنی key ہوتی ہے اور سرور ہر key کا جواب ایک ہی بار دیتا ہے۔ اگر جواب راستے میں گم ہو جائے تو دوبارہ بھیجنے سے دوسرا بل نہیں بنتا۔
- **کچھ خاموشی سے گم نہیں ہوتا۔** اگر سرور کوئی چیز قبول نہ کرے، مثلاً کسی اور کاؤنٹر پر اسٹاک ختم ہو گیا یا کسی رول کے لیے مینیجر PIN چاہیے، تو وہ سیدھے الفاظ میں sync issue کے طور پر نظر آتی ہے۔ آپ اسے ٹھیک کر کے دوبارہ بھیج سکتے ہیں یا ہٹا سکتے ہیں، اور فون اسٹاک اور کھاتے کو پہلے جیسا کر دیتا ہے۔

کریڈٹ لمٹ اور Discount لمٹ جیسے کاؤنٹر رولز فون پر بل محفوظ ہونے سے پہلے چیک ہوتے ہیں، انہی رولز سے جو سرور پر ہیں، اس لیے آف لائن بل بھی دکان کے رولز کی پابندی کرتا ہے۔ مزید [آف لائن POS](/ur/product/offline-pos) کے صفحے پر پڑھیں۔

## Android اور iPhone

**Android** پر Google Play سے Nafaa POS انسٹال کریں، ایپ میں اپنا بزنس اکاؤنٹ بنائیں یا پہلے سے بنے اکاؤنٹ میں سائن ان کریں، اور بلنگ شروع کریں۔

**iPhone اور iPad** پر ایپ پہلے سے بنے ہوئے Nafaa اکاؤنٹ میں سائن ان کرنے کے لیے ہے۔ پہلے nafaa.pk پر یا Android ایپ میں اکاؤنٹ بنائیں، پھر iPhone پر اسی لاگ ان سے سائن ان کریں۔ آپ کا پلان، پروڈکٹس اور کسٹمرز وہاں پہلے سے موجود ہوتے ہیں۔

## ہر ڈیوائس پر ایک اکاؤنٹ

فون، کسی بھی براؤزر میں ویب ایپ اور Windows ڈیسک ٹاپ ایپ ایک ہی Nafaa اکاؤنٹ استعمال کرتے ہیں۔ مالک فون پر آج کی سیل دیکھ سکتا ہے جب کیشیئر دکان کے کمپیوٹر پر بل بنا رہا ہو؛ کمپیوٹر پر بدلی ہوئی قیمت اگلے sync پر فون تک پہنچتی ہے؛ فون پر بنا بل ہر جگہ کی رپورٹس میں آ جاتا ہے۔ اسٹاف اپنے الگ اکاؤنٹ سے لاگ ان کرتا ہے اور وہی دیکھتا ہے جو اس کا رول اجازت دے، اور [کئی برانچوں](/ur/product/multi-shop) والا مالک ایپ میں ان کے درمیان بدل سکتا ہے۔

## فون پر ایپ کیسے لیں

اگر آپ یہ کمپیوٹر پر پڑھ رہے ہیں تو اپنے فون پر **nafaa.pk/mobile-app** کھولیں، یا Google Play یا App Store میں **Nafaa POS** تلاش کریں، اور اپنے فون والا بٹن دبائیں۔ ایپ کھلے تو سب سے پہلے اپنی زبان چنیں: انگریزی، اردو یا رومن اردو۔ بعد میں اسے سیٹنگز میں بدلا جا سکتا ہے۔`,
    },
    {
      type: 'steps',
      heading: 'ایپ کے ساتھ چار قدم میں شروع کریں',
      items: [
        { title: 'انسٹال کریں', body: 'Android پر Google Play سے، یا iPhone اور iPad پر App Store سے Nafaa POS لیں۔' },
        { title: 'سائن ان کریں', body: 'اپنا اکاؤنٹ Android ایپ میں یا nafaa.pk پر بنائیں، یا پہلے سے بنے اکاؤنٹ سے سائن ان کریں۔' },
        { title: 'پروڈکٹس ڈالیں', body: 'کیمرے سے بارکوڈ اسکین کریں، ویب پر Excel سے امپورٹ کریں، یا اپنے کاروبار کی قسم کی تیار پروڈکٹس پروڈکٹ لائبریری سے چنیں۔' },
        { title: 'پہلا بل بنائیں', body: 'POS کھولیں، آئٹمز ڈالیں، ادائیگی لیں اور رسید WhatsApp پر بھیجیں۔' },
      ],
    },
    {
      type: 'screenshot',
      heading: 'چلتے پھرتے آن لائن آرڈر',
      body: 'آپ کی ویب سائٹ اور دوسرے چینلز کے آن لائن آرڈر پش الرٹ کے ساتھ فون پر آتے ہیں۔ cash-on-delivery کے آرڈر خریدار سے کنفرم کریں، قبول کریں، کوریئر کے ساتھ پارسل ٹریک کریں اور COD کی باقی وصولی دیکھیں، کمپیوٹر کھولے بغیر۔ اس کے پیچھے جو کچھ چلتا ہے اس کے لیے [آن لائن اسٹور](/ur/product/online-store) دیکھیں۔',
      mediaId: MOBILE_SHOT.ur.online,
      frame: 'none',
      layout: 'split-right',
    },
    {
      type: 'comparisonTable',
      heading: 'فون، کمپیوٹر یا دونوں',
      caption: 'زیادہ تر کاروبار دونوں استعمال کرتے ہیں۔ ڈیوائس کام کے حساب سے چنیں، پلان کے حساب سے نہیں: ہر ڈیوائس ایک ہی اکاؤنٹ استعمال کرتی ہے۔',
      columns: [
        { key: 'phone', label: 'Nafaa POS ایپ', highlight: true },
        { key: 'computer', label: 'ویب یا ڈیسک ٹاپ ایپ' },
      ],
      rows: [
        { label: 'چھوٹے کاؤنٹر پر بلنگ', cells: { phone: { value: 'جی ہاں، کیمرا اسکینر کے طور پر' }, computer: { value: 'جی ہاں، USB اسکینر اور تھرمل پرنٹر کے ساتھ' } } },
        { label: 'دکان سے دور سیل اور Profit دیکھنا', cells: { phone: { value: 'جی ہاں، ہوم اور رپورٹس میں' }, computer: { value: 'جی ہاں' } } },
        { label: 'WhatsApp پر کھاتے کے ریمائنڈر', cells: { phone: { value: 'جی ہاں، کسٹمر سے ایک ٹیپ میں' }, computer: { value: 'جی ہاں' } } },
        { label: 'مارکیٹ میں آرڈر بکنگ', cells: { phone: { value: 'جی ہاں، بکر کی اسکرینیں آف لائن چلتی ہیں اور GPS چیک ان کے ساتھ' }, computer: { value: 'آفس کی طرف: آرڈر، لوڈ شیٹ، سیٹلمنٹ' } } },
        { label: 'بڑا کام: Excel امپورٹ، لیبل، لمبی رپورٹس', cells: { phone: { value: 'ممکن ہے' }, computer: { value: 'بڑی اسکرین پر آسان' } } },
      ],
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'ڈاؤن لوڈ فری ہے',
      body: 'ایپ فری ڈاؤن لوڈ ہوتی ہے۔ یہ آپ کے Nafaa اکاؤنٹ کے پلان سے چلتی ہے، اس لیے فون پر Nafaa چلانے کے لیے الگ کچھ نہیں دینا۔ پلان دیکھنے کے لیے [قیمتیں](/ur/pricing) دیکھیں۔',
    },
    { type: 'faq', heading: 'عام سوالات' },
    {
      type: 'cta',
      heading: 'Nafaa POS اپنے فون پر لیں',
      body: 'Nafaa POS تلاش کریں، یا اپنے فون والا بٹن دبائیں۔ iPhone پر nafaa.pk یا Android پر بنے اکاؤنٹ سے سائن ان کریں۔',
      primaryCta: { label: 'Google Play سے لیں', href: STORE.play, variant: 'primary', trackAs: 'cta_play' },
      secondaryCta: { label: 'App Store سے ڈاؤن لوڈ کریں', href: STORE.appStore, variant: 'ghost', trackAs: 'cta_ios' },
    },
  ]),
  faqKeys: [
    'ur-page-mobile-app-cost',
    'ur-page-mobile-app-offline',
    'ur-page-mobile-app-iphone',
    'ur-page-mobile-app-same-data',
    'ur-page-mobile-app-print',
    'ur-page-mobile-app-notifications',
  ],
  relations: [
    { ref: 'PRODUCT:offline-pos@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'PAGE:languages@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:wholesale-distribution@ur', kind: 'RELATED' },
  ],
  sortOrder: 2,
  origin: 'translation of content/main-pages/features-nov.ts (15 Nov 2026)',
  evidence: [
    'apps/mobile/app.json',
    `${M}/core/offline/README.md`,
    `${M}/core/receipt/print.ts`,
    `${M}/modules/notifications/api/notifications.ts`,
  ],
  factCheck: { checkedOn: '2026-11-15', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
