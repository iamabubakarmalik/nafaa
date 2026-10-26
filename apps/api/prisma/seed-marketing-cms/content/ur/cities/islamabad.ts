/** Urdu: Islamabad city page (/ur/pos-software/islamabad). Translation of content/cities/islamabad.ts (built in content/cities/index.ts). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-islamabad-devices',
    locale: 'ur',
    topic: 'getting-started',
    question: 'اسلام آباد کے کیفے یا اسٹور میں Nafaa چلانے کے لیے کمپیوٹر خریدنا پڑے گا؟',
    answer:
      'نہیں۔ Nafaa ویب براؤزر میں کھلتا ہے، اس لیے آپ کا موجودہ فون، ٹیبلٹ یا لیپ ٹاپ ہی کافی ہے۔ بارکوڈ اسکینر اور رسید پرنٹر بعد میں جوڑے جا سکتے ہیں، شروع میں ان کی ضرورت نہیں۔ انٹرنیٹ نہ ہو تو بھی کاؤنٹر کام کرتا ہے اور کنکشن لوٹنے پر سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔',
    sourceNote: 'Web app; offline sales queue (core/lib/offline/offlineSales.ts); hardware and print modules.',
    origin: 'translation of faq devices',
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/hardware', 'apps/web/src/core/print'],
  },
  {
    key: 'ur-islamabad-payments',
    locale: 'ur',
    topic: 'product',
    question: 'اسلام آباد میں گاہک ایک ہی بل کارڈ اور والٹ میں بانٹ کر دے سکتا ہے؟',
    answer:
      'جی ہاں۔ چیک آؤٹ پر ایک بل کو کیش، کارڈ، JazzCash، Easypaisa، بینک ٹرانسفر اور گاہک کے کھاتے میں تقسیم کیا جا سکتا ہے۔ ہر حصہ اپنے ادائیگی کے طریقے کے ساتھ لکھا جاتا ہے، اس لیے روزنامچے میں کیش دراز، والٹ کا ٹوٹل اور کھاتے کا بیلنس سب درست رہتے ہیں۔',
    sourceNote: 'PosSplitTender and PosCheckoutModal; accounting PayMethod list (CASH, CARD, BANK_TRANSFER, JAZZCASH, EASYPAISA).',
    origin: 'translation of faq mp-pos-payments',
    evidence: ['apps/web/src/modules/pos/components/PosSplitTender.tsx', 'apps/web/src/modules/pos/components/PosCheckoutModal.tsx', 'apps/web/src/integrations/accounting/accounting.api.ts'],
  },
  {
    key: 'ur-islamabad-branches-transfer',
    locale: 'ur',
    topic: 'product',
    question: 'اسلام آباد کی ایک مرکز والی برانچ سے دوسری برانچ میں اسٹاک کیسے بھیجیں؟',
    answer:
      'ایک برانچ سے اسٹاک ٹرانسفر بنائیں، اور وصول کرنے والی برانچ تصدیق کرتی ہے کہ کیا پہنچا۔ مال ایک دکان سے نکل کر دوسری میں درج ہو جاتا ہے، اور ریکارڈ رہتا ہے کہ کس نے بھیجا اور کس نے وصول کیا۔ ہیڈ آفس ہر برانچ کا اسٹاک، سیل اور پرافٹ اینڈ لاس ساتھ ساتھ دیکھتا ہے۔',
    sourceNote: 'inventory/transfers; multi-branch center, pnl and day-book pages.',
    origin: 'translation of faq mp-branches-transfer',
    evidence: ['apps/web/src/modules/inventory/transfers', 'apps/web/src/modules/multi-branch'],
  },
  {
    key: 'ur-islamabad-staff-permissions',
    locale: 'ur',
    topic: 'product',
    question: 'اسلام آباد کی دکان کا مالک اسٹاف کو ڈسکاؤنٹ یا ریفنڈ دینے سے روک سکتا ہے؟',
    answer:
      'جی ہاں۔ ہر اسٹاف ممبر کو ایک رول ملتا ہے جس کی اپنی اجازتیں ہوتی ہیں، اور کاؤنٹر کے اصول طے کرتے ہیں کہ کس کام کے لیے مینیجر چاہیے۔ شروع سے ریفنڈ پر مینیجر کا PIN لگتا ہے، اور آپ کی رکھی حد سے بڑے ڈسکاؤنٹ پر بھی۔ ہر حساس کام ایکٹیویٹی لاگ میں کرنے والے کے نام کے ساتھ لکھا جاتا ہے۔',
    sourceNote: 'core/security/ManagerPin.tsx; counter rules (refund PIN default on, discount limit); reports/activity-log.',
    origin: 'translation of faq mp-staff-permissions',
    evidence: ['apps/web/src/core/security/ManagerPin.tsx', 'apps/web/src/modules/reports/activity-log', 'apps/web/src/modules/hr/staff'],
  },
  {
    key: 'ur-islamabad-fbr-who',
    locale: 'ur',
    topic: 'compliance',
    question: 'اسلام آباد کے کاروبار کے لیے Nafaa کن ٹیکس اداروں کو انوائس بھیجتا ہے؟',
    answer:
      'Nafaa ایک FBR اور PRA سے منظور شدہ POS انٹیگریٹر ہے۔ یہ Tier-1 ریٹیلرز کی سیل انوائسز FBR کو بھیجتا ہے، اور سروسز کی انوائسز صوبائی اداروں کو: پنجاب میں PRA، سندھ میں SRB اور خیبر پختونخوا میں KPRA۔ ہر بل کو اس کا فِسکل انوائس نمبر ملتا ہے اور رسید پر QR کوڈ چھپتا ہے۔',
    sourceNote: 'integrations/fbr (IMS PostData) and integrations/tax-authority adapters (PRA, SRB, KPRA, FBR).',
    origin: 'translation of faq mp-fbr-who',
    evidence: ['apps/api/src/integrations/fbr/fbr.service.ts', 'apps/api/src/integrations/tax-authority/adapters.ts'],
  },
  {
    key: 'ur-islamabad-pricing',
    locale: 'ur',
    topic: 'pricing',
    question: 'اسلام آباد کے کیفے، فارمیسی یا سیلون کے لیے Nafaa کی ماہانہ قیمت کیا ہے؟',
    answer:
      'پیڈ پلان {{price:min.monthly}} ماہانہ سے شروع ہوتے ہیں۔ قیمتوں والا صفحہ ہر پلان کی قیمت اور اس کی حدیں دکھاتا ہے، جو سیدھی ہماری پلان سیٹنگز سے آتی ہیں اور ہمیشہ تازہ رہتی ہیں۔ پہلے فری ٹرائل آزما لیں؛ سائن اپ کرتے وقت کریڈٹ کارڈ نہیں مانگا جاتا۔',
    sourceNote: 'Plan table (GET /api/plans): free-trial description "koi credit card nahi chahiye". Prices come from tokens.',
    origin: 'translation of faq pricing',
    evidence: ['apps/api/src/modules/billing/plans/plans.service.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'CITY',
  locale: 'ur',
  slug: 'islamabad',
  title: 'اسلام آباد',
  seoTitle: 'اسلام آباد میں کیفے، اسٹور اور برانچوں کے لیے POS سافٹ ویئر',
  seoDescription: 'اسلام آباد کے کیفے، سپر مارکیٹس، فارمیسیوں، سیلونز اور کلینکس کے لیے Nafaa: بل، اپائنٹمنٹ، اسٹاک اور ہر برانچ کی رپورٹ ایک ایپ میں، اردو یا انگریزی میں۔',
  focusKeyword: 'اسلام آباد POS سافٹ ویئر',
  summary:
    'Nafaa اسلام آباد کے کیفے، سپر مارکیٹس، فارمیسیوں، سیلونز اور کلینکس کے لیے POS، اسٹاک اور کھاتہ سافٹ ویئر ہے۔ یہ براؤزر میں آپ کی موجودہ ڈیوائسز پر چلتا ہے، بجلی یا انٹرنیٹ کی خرابی میں بھی بل بناتا رہتا ہے، اور ہر مرکز کی برانچ ایک ہی اکاؤنٹ میں دکھاتا ہے۔',
  data: {
    name: 'اسلام آباد',
    province: 'Islamabad Capital Territory',
    authority: 'ICT',
    wikidataId: 'Q1362',
    geo: { lat: 33.6844, lng: 73.0479 },
    markets: [
      {
        name: 'جناح سپر مارکیٹ',
        area: 'F-7 مرکز',
        note: 'ایک کھلے چوک کے گرد کپڑوں، جوتوں اور کتابوں کی دکانیں، کیفے اور ریسٹورنٹس، جہاں شام اور ویک اینڈ پر رونق ہوتی ہے۔',
      },
      {
        name: 'سپر مارکیٹ',
        area: 'F-6 مرکز',
        note: 'شہر کی پرانی مارکیٹوں میں سے ایک، جہاں گروسری، فارمیسیاں، کتابوں کی دکانیں، درزی اور چھوٹے کھانے کے ہوٹل آس پاس کے سیکٹرز کا کام کرتے ہیں۔',
      },
      {
        name: 'بلیو ایریا',
        note: 'جناح ایونیو کے ساتھ شہر کی مرکزی کاروباری پٹی، جہاں دفتر، بینک، شو روم اور ریسٹورنٹس دوپہر کو دفتر والوں کو کھانا کھلاتے ہیں۔',
      },
      {
        name: 'آبپارہ مارکیٹ',
        area: 'G-6',
        note: 'سرکاری دفتروں کے قریب ایک پرانی مارکیٹ، جہاں گروسری، کپڑے اور گھریلو سامان کی دکانیں اور سستے کھانے کی جگہیں ہیں۔',
      },
      {
        name: 'کراچی کمپنی',
        area: 'G-9 مرکز',
        note: 'کپڑوں، جوتوں، موبائل فون اور عام سامان کی مصروف مارکیٹ، جس کی قیمتیں گھرانوں اور طالب علموں کے حساب سے ہیں۔',
      },
      {
        name: 'ہفتہ وار بازار',
        area: 'H-9',
        note: 'پھل، سبزی، کپڑوں اور گھریلو سامان کا ہفتہ وار بازار، جہاں بیچنے والے جلدی بل بناتے ہیں اور زیادہ تر کیش لیتے ہیں۔',
      },
    ],
    areas: [
      {
        name: 'F-10 اور F-11 مرکز',
        note: 'رہائشی سیکٹرز کے لیے ریسٹورنٹس، کیفے، بیکریاں اور سیلون، جہاں شام اور ڈیلیوری کا کام بہت ہوتا ہے۔',
      },
      {
        name: 'I-8 مرکز',
        note: 'بڑھتا ہوا کمرشل مرکز، جس میں فارمیسیاں، کلینک، سپر مارکیٹس اور کھانے کی دکانیں ہیں۔',
      },
      {
        name: 'G-11 اور G-13',
        note: 'نئے مرکز، جہاں جنرل اسٹور، موبائل شاپس، ٹیوشن سینٹر اور ٹیک اوے اپنی پہلی یا دوسری برانچ کھول رہے ہیں۔',
      },
      {
        name: 'I-9 اور I-10 انڈسٹریل ایریا',
        note: 'ورکشاپس، پرنٹنگ پریس، ڈسٹری بیوٹر اور چھوٹی فیکٹریاں جو کھاتے پر خریدتی اور بیچتی ہیں۔',
      },
    ],
    support: {
      onsite: false,
      note: 'سیٹ اپ، ڈیٹا منتقل کرنا اور اسٹاف کی ٹریننگ واٹس ایپ اور ویڈیو کال پر دور سے ہوتی ہے، انگریزی یا اردو میں۔ اسلام آباد میں Nafaa کا کوئی دفتر نہیں؛ ہم آپ کے اپنے کاؤنٹر پر آپ کے ساتھ کام کرتے ہیں۔',
    },
    nearbyCityIds: [],
  },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'اسلام آباد میں POS سافٹ ویئر',
      heading: 'اسلام آباد',
      sub: 'اسلام آباد کے مرکز والے کاروباروں کے لیے، F-7 کے کیفے سے G-9 کے اسٹورز اور بلیو ایریا کے دفتروں تک: بل، اپائنٹمنٹ، اسٹاک اور برانچ رپورٹس ایک ایپ میں، انگریزی یا اردو میں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['سب برانچیں ایک نظر میں', 'کارڈ اور والٹ سے ادائیگی', 'انگریزی یا اردو اسکرین'],
      media: { kind: 'screenshot', mediaId: SHOT.dashboard, frame: 'browser', url: 'app.nafaa.pk/dashboard' },
      layout: 'centered',
      id: 'b4a7e0120466',
    },
    {
      type: 'answerBox',
      facts: [
        { label: 'کس پر چلتا ہے', value: 'براؤزر والا لیپ ٹاپ، ٹیبلٹ یا فون، کنکشن ٹوٹ جائے تب بھی' },
        { label: 'کن کے لیے بہتر', value: 'کیفے، سپر مارکیٹس، فارمیسیاں، سیلون، کلینک، کتابوں کی دکانیں اور سروس والے ادارے' },
        { label: 'برانچیں', value: 'ہر سیکٹر کی برانچ کا اپنا اسٹاک اور اسٹاف؛ مالک سب کو اکٹھا دیکھتا ہے' },
        { label: 'قیمت', value: 'پیڈ پلان {{price:min.monthly}} ماہانہ سے، پہلے فری ٹرائل' },
      ],
      romanUrdu:
        'Islamabad ke cafés, stores, pharmacies aur salons ke liye Nafaa: bill, appointment, stock aur har branch ki report ek app me. Screen English ya Urdu me, aur internet jaye to bhi bill bante rehte hain.',
      id: 'bce32f111b15',
    },
    { type: 'cityFacts', show: ['tax'], heading: 'اسلام آباد میں سیلز ٹیکس', id: 'be0284897768' },
    {
      type: 'richText',
      markdown:
        '## اسلام آباد کا کاروبار کیسے چلتا ہے، اور Nafaa کہاں کام آتا ہے\n\nاسلام آباد دارالحکومت کے طور پر نقشے سے بسایا گیا، اس لیے اس کا زیادہ تر کاروبار ہر سیکٹر کے مرکز یعنی کمرشل سینٹر میں اور بلیو ایریا کے ساتھ ہے۔ ایک عام مرکز میں چند قدم کے فاصلے پر ایک سپر مارکیٹ، دو تین فارمیسیاں، ایک بیکری، کیفے، ایک سیلون، ایک کلینک اور موبائل اور کمپیوٹر کی دکانیں ہوتی ہیں۔ گاہکوں میں سرکاری اور پرائیویٹ نوکری والے، طالب علم اور گھرانے سب شامل ہیں، اور ان میں سے بہت سے کیش کی بجائے کارڈ یا والٹ سے ادائیگی کرتے ہیں۔\n\n- **کیفے اور ریسٹورنٹس** F-6، F-7 اور نئے سیکٹرز میں ڈائن اِن، ٹیک اوے اور ڈیلیوری ایک اسکرین سے چلاتے ہیں، ٹیبل، کچن ٹکٹ، ایڈ آنز اور بل بانٹنے کے ساتھ۔\n- **سپر مارکیٹس اور کریانہ اسٹور** تیزی سے بارکوڈ اسکین کرتے ہیں، کم اسٹاک کی لسٹ رکھتے ہیں اور مستقل گھرانوں کا بیلنس واٹس ایپ پر بھیجتے ہیں۔\n- **فارمیسیاں** سالٹ سے دوا ڈھونڈتی ہیں، متبادل بتاتی ہیں، اور بیچ اور ایکسپائری کی تاریخیں رکھتی ہیں تاکہ کم مدت والا مال وقت پر بک جائے یا واپس ہو جائے۔\n- **سیلون اور باربر** کیلنڈر پر اپائنٹمنٹ لیتے ہیں، ہر سروس پر اسٹائلسٹ کا کمیشن دیتے ہیں اور ممبرشپ اور پیکج بیچتے ہیں۔\n- **کلینک** ریسیپشن پر ٹوکن دیتے ہیں، ہر وزٹ کے ساتھ نسخہ محفوظ رکھتے ہیں اور اسی ایپ میں ڈاکٹر کی فیس کے ساتھ دن بند کرتے ہیں۔\n- **کتابوں اور اسٹیشنری کی دکانیں** کتابیں ISBN سے اور نصابی کتابیں جماعت کے حساب سے رکھتی ہیں، جو ہر نئے تعلیمی سال کے شروع میں کام آتا ہے۔',
      id: 'b447220297f2',
    },
    { type: 'cityFacts', show: ['markets', 'areas'], heading: 'بازار اور علاقے', id: 'b6bcc99c17ac' },
    {
      type: 'richText',
      markdown:
        '## اسلام آباد میں کام کے حالات\n\n**بجلی اور انٹرنیٹ۔** سیکٹرز کو بجلی IESCO دیتی ہے۔ یہاں بجلی کی بندش عموماً بہت سے دوسرے شہروں سے کم دیر کی ہوتی ہے، لیکن طے شدہ مرمت کی بندش، آندھی طوفان کا نقصان اور انٹرنیٹ کی خرابی پھر بھی دن کے سب سے مصروف وقت میں کاؤنٹر روک دیتی ہے۔ Nafaa کنکشن کے بغیر ڈیوائس پر بل بناتا رہتا ہے اور لائن بحال ہوتے ہی سیل آپ کے اکاؤنٹ میں بھیج دیتا ہے۔\n\n**ادائیگی کی عادتیں۔** اسلام آباد کے گاہکوں کا بڑا حصہ کارڈ، بینک ایپ یا موبائل والٹ سے دیتا ہے۔ کاؤنٹر پوری رقم کا JazzCash، Easypaisa یا Raast QR دکھاتا ہے، کارڈ اور کیش لیتا ہے، اور ایک بل کئی طریقوں میں بانٹنے دیتا ہے۔ دن بند کرنے کی رپورٹ ہر طریقہ الگ دکھاتی ہے، اس لیے کیش گننا جلدی ہو جاتا ہے۔\n\n**زبان۔** اسلام آباد میں دکانوں کے بورڈ اور مینیو اکثر انگریزی میں ہوتے ہیں اور کاؤنٹر پر بات اردو میں، جبکہ بہت سے اسٹاف اور گاہک پنجابی، پشتو اور ہندکو بھی بولتے ہیں۔ Nafaa کی اسکرین ہر ڈیوائس پر انگریزی اور اردو میں بدلی جا سکتی ہے، اس لیے کیشیئر اور مالک دونوں اپنی پسند کی زبان میں پڑھ سکتے ہیں۔\n\n**جڑواں شہروں والے کاروبار۔** بہت سے مالکان کی ایک دکان اسلام آباد میں اور دوسری راولپنڈی میں ہے۔ دونوں برانچیں ایک Nafaa اکاؤنٹ میں رہتی ہیں، ہر ایک کا اپنا اسٹاک، اپنی قیمتیں اور اپنے کیشیئر، اور مال ٹرانسفر سے ایک سے دوسری میں جاتا ہے جسے وصول کرنے والی برانچ تصدیق کرتی ہے۔',
      id: 'b999a9d9293f',
    },
    {
      type: 'screenshot',
      heading: 'ہر مرکز کی برانچ ایک ڈیش بورڈ پر',
      body: 'جس مالک کا ایک کیفے F-7 میں اور دوسرا F-11 میں ہے، وہ دونوں کی آج کی سیل، پرافٹ، کیش اور اسٹاک لائیو دیکھتا ہے، اور تفصیل کے لیے کسی کو بھی کھول سکتا ہے۔ ہر اسٹاف ممبر اسی برانچ سے جڑا ہوتا ہے جہاں وہ کام کرتا ہے۔',
      mediaId: SHOT.branches,
      frame: 'browser',
      url: 'app.nafaa.pk/branches',
      layout: 'full',
      id: 'b0ba431612d6',
    },
    {
      type: 'comparisonTable',
      heading: 'اسلام آباد کے کاروبار اور ان کی سب سے زیادہ استعمال ہونے والی اسکرینیں',
      caption: 'اسلام آباد کے عام کاروبار Nafaa میں عموماً کہاں سے شروع کرتے ہیں۔ ہر پلان میں کاؤنٹر، اسٹاک اور کھاتہ شامل ہے۔',
      columns: [
        { key: 'screens', label: 'اہم اسکرینیں' },
        { key: 'busy', label: 'رش کے وقت کیا کام آتا ہے' },
      ],
      rows: [
        { label: 'کیفے یا ریسٹورنٹ', cells: { screens: { value: 'ٹیبل، کچن ٹکٹ، ایڈ آنز والا مینیو' }, busy: { value: 'ٹیبل پر بل بانٹنا اور والٹ QR' } } },
        { label: 'سپر مارکیٹ', cells: { screens: { value: 'بارکوڈ کاؤنٹر، کم اسٹاک کی لسٹ، خریداری' }, busy: { value: 'کھلے سامان کے لیے کوئیک کیز اور کی بورڈ سے بل' } } },
        { label: 'فارمیسی', cells: { screens: { value: 'سالٹ سے تلاش، بیچ اور ایکسپائری' }, busy: { value: 'برانڈ ختم ہو تو متبادل کی تجویز' } } },
        { label: 'سیلون یا باربر', cells: { screens: { value: 'اپائنٹمنٹ کیلنڈر، سروسز، کمیشن' }, busy: { value: 'پیکج اور ممبرشپ کا بل سیکنڈوں میں' } } },
        { label: 'کلینک', cells: { screens: { value: 'ٹوکن، وزٹ، نسخے' }, busy: { value: 'ریسیپشن پر لائیو قطار' } } },
        { label: 'کتابوں کی دکان', cells: { screens: { value: 'ISBN والی کتابیں، جماعت کے حساب سے نصاب' }, busy: { value: 'سیشن شروع ہونے سے پہلے اسکول کی کتابوں کی لسٹیں تیار' } } },
      ],
      id: 'bd80b9556c05',
    },
    {
      type: 'steps',
      heading: 'برانچوں والے اسلام آبادی کاروبار کا سیٹ اپ',
      items: [
        { title: 'اپنی بڑی برانچ سے شروع کریں', body: 'فری ٹرائل کھولیں، اپنے کاروبار کی قسم چنیں اور اس برانچ کی پروڈکٹس یا سروسز ڈالیں جسے آپ سب سے اچھی طرح جانتے ہیں۔' },
        { title: 'دوسرا سیکٹر شامل کریں', body: 'اگلی برانچ بنائیں، اس کا اسٹاف لگائیں اور اس کا شروع کا اسٹاک ڈالیں، یا Excel سے امپورٹ کر لیں۔' },
        { title: 'اسٹاف کو ان کا اپنا لاگ اِن دیں', body: 'کیشیئر، اسٹائلسٹ یا فارماسسٹ کو صرف ضرورت کے اختیار والا لاگ اِن ملتا ہے، تاکہ ریفنڈ اور ڈسکاؤنٹ قابو میں رہیں۔' },
        { title: 'برانچ رپورٹس پڑھیں', body: 'ہر شام برانچوں کی سیل، پرافٹ اور اسٹاک کا موازنہ کریں، اور جہاں مال کم ہو وہاں بھیج دیں۔' },
      ],
      id: 'be7836509ae1',
    },
    {
      type: 'richText',
      markdown:
        '## اسلام آباد کے کاروباری لوگوں کے سوال\n\n### اسلام آباد میں سروسز کا ٹیکس کون سا ادارہ دیکھتا ہے؟\nاسلام آباد کیپیٹل ٹیریٹری میں سروسز پر سیلز ٹیکس FBR کے پاس ہے، کسی صوبائی ادارے کے پاس نہیں۔ Nafaa میں ٹیکس انٹیگریشن اختیاری ہے؛ آپ کے کاروبار کو اس کی ضرورت ہے یا نہیں، یہ اپنے ٹیکس ایڈوائزر سے پوچھ لیں۔\n\n### کیا گاہک ایک ہی بل پر کارڈ اور والٹ دونوں سے دے سکتے ہیں؟\nجی ہاں۔ ایک بل کو کارڈ، کیش، JazzCash، Easypaisa یا بینک ٹرانسفر میں بانٹ دیں۔ ہر حصہ اپنے طریقے کے ساتھ درج ہوتا ہے۔\n\n### ہماری ایک برانچ اسلام آباد میں اور ایک راولپنڈی میں ہے۔ کیا یہ دو اکاؤنٹ ہوں گے؟\nنہیں۔ ایک اکاؤنٹ میں دونوں برانچیں رہتی ہیں، ہر ایک کا اپنا اسٹاک اور اسٹاف، اور مالک دونوں کو اکٹھا دیکھتا ہے۔',
      id: 'b06735510fcd',
    },
    { type: 'cityFacts', show: ['support'], heading: 'اسلام آباد میں سپورٹ', id: 'bd3f75d2368c' },
    { type: 'pricingTable', heading: 'اسلام آباد کے کاروبار کے لیے پلان', showToggle: true, highlightPlan: 'pro', compact: true, id: 'b7030b0665a7' },
    { type: 'faq', heading: 'مزید سوال', id: 'b58b6bef9a8d' },
    {
      type: 'cta',
      heading: 'اسلام آباد میں آج ہی بل بنانا شروع کریں',
      body: 'جو لیپ ٹاپ، ٹیبلٹ یا فون آپ پہلے سے استعمال کرتے ہیں اسی پر مفت آزمائیں۔ مدد واٹس ایپ پر۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'b3acc5013a90',
    },
  ],
  featured: true,
  sortOrder: 3,
  origin: 'translation of content/cities/islamabad.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/modules/customers/khata',
    'apps/web/src/core/payments/payQr.ts',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
    'apps/web/src/core/i18n/messages/ur.json',
    'apps/web/src/modules/organization/shops',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/industries/restaurant',
    'apps/web/src/industries/pharmacy',
    'apps/web/src/industries/salon',
    'apps/web/src/industries/clinic',
    'apps/web/src/industries/bookstore',
    'apps/web/src/core/stores/locale.store.ts',
    'apps/web/src/modules/organization/team/api/team.api.ts',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
    'apps/web/src/modules/pos/components/PosTiles.tsx',
  ],
  sources: [
    { title: 'Islamabad (Wikidata Q1362)', url: 'https://www.wikidata.org/wiki/Q1362', publisher: 'Wikidata', accessedAt: '2026-10-20' },
    { title: 'Islamabad (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Islamabad', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Blue Area (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Blue_Area', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Islamabad Electric Supply Company (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Islamabad_Electric_Supply_Company', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    { title: 'Islamabad Capital Territory (Tax on Services) Ordinance, 2001', url: 'https://www.fbr.gov.pk', publisher: 'Federal Board of Revenue', accessedAt: '2026-10-26' },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged. Public facts as in the English entry (Wikipedia; IESCO; FBR administers ICT sales tax on services, fbr.gov.pk). No tax rate is stated.' },
  dropped: ['activeShops count and the "topIndustries" list (invented).', 'Urdu Nastaliq name.'],
  needsOwner: [],
  faqKeys: ['ur-islamabad-devices', 'ur-islamabad-payments', 'ur-islamabad-branches-transfer', 'ur-islamabad-staff-permissions', 'ur-islamabad-fbr-who', 'ur-islamabad-pricing'],
  relations: [
    { ref: 'INDUSTRY:restaurant@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:pharmacy@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:salon@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:clinic@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:bookstore@ur', kind: 'TAG' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'TAG' },
    { ref: 'PRODUCT:multi-shop@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains@ur', kind: 'RELATED' },
  ],
};
