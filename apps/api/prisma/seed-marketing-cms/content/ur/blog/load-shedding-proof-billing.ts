/** Urdu: Blog post on billing through load-shedding and internet cuts (/ur/blog/load-shedding-proof-billing). Translation of content/blog/posts/load-shedding-proof-billing.ts. */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'BLOG_POST',
  locale: 'ur',
  slug: 'load-shedding-proof-billing',
  title: 'لوڈ شیڈنگ میں بھی بلنگ: کاؤنٹر چلتا رہے',
  summary:
    'بجلی اور انٹرنیٹ جانے پر بھی بلنگ چلتی رہے، اس کے لیے کاؤنٹر کی ڈیوائس، پرنٹر اور راؤٹر بیک اپ بجلی پر رکھیں، دوسرا انٹرنیٹ کنکشن رکھیں، ایسا POS لیں جو آف لائن بل بنائے اور بعد میں سنک کرے، اور مکمل بندش کے لیے کاغذ کا انتظام رکھیں۔ یہ گائیڈ ہر حصہ سیٹ کرنا اور بجلی آنے کے بعد کی جانچ بتاتی ہے۔',
  data: { toc: true },
  blocks: [
    {
      type: 'screenshot',
      mediaId: 'media_blog-load-shedding-proof-billing',
      frame: 'none',
      layout: 'full',
      caption: 'فیصل آباد کے ایک بازار میں رات کو روشن دکانیں · Photo: Aa Dil, Pexels (Pexels License)',
      id: 'b38d8bb3ef6c',
    },
    {
      type: 'richText',
      markdown:
        'پاکستان کے زیادہ تر علاقوں میں کاؤنٹر پر بجلی جانا کوئی ایمرجنسی نہیں؛ یہ دن کا حصہ ہے۔ [لوڈ شیڈنگ](https://en.wikipedia.org/wiki/Load_shedding) کا مطلب ہے کہ جب طلب سپلائی سے زیادہ ہو تو بجلی کا نظام جان بوجھ کر باری باری علاقوں کی بجلی بند کرتا ہے، اور بجلی کے شعبے کی نگرانی [NEPRA](https://nepra.org.pk/) کرتا ہے۔ دکان پر اس کا اثر سیدھا ہے: بتیاں ایسے وقت بند ہوتی ہیں جو آپ نے نہیں چنا، اکثر جب شام کا رش شروع ہوتا ہے۔\n\n' +
        'جو کاؤنٹر بجلی جانے پر بل بنانا بند کر دے، وہ صرف اس گھنٹے کی سیل نہیں کھوتا۔ گاہک چلے جاتے ہیں، اسٹاف کاغذ کے ٹکڑوں پر بل لکھتا ہے جو کبھی سسٹم تک نہیں پہنچتے، اور رات کو کیش کی گنتی نہیں ملتی۔ حل یہ ہے کہ کاؤنٹر کو تہوں میں پلان کریں، تاکہ ایک چیز فیل ہو تو اگلی تہہ سنبھال لے۔\n\n' +
        '## پہلی تہہ: کاؤنٹر کے لیے بجلی\n\n' +
        'طے کریں کہ کون سی ڈیوائسز کا چلتے رہنا ضروری ہے اور صرف انہیں بیک اپ پر لگائیں:\n\n' +
        '- کاؤنٹر کی ڈیوائس (PC، لیپ ٹاپ، ٹیبلٹ یا فون)\n' +
        '- رسید کا پرنٹر\n' +
        '- انٹرنیٹ راؤٹر یا موڈیم\n' +
        '- بارکوڈ اسکینر (عموماً PC سے ہی بجلی لیتا ہے)\n\n' +
        'کیش دراز اگر پرنٹر کے ذریعے کھلتا ہے تو اسے اپنی الگ بجلی نہیں چاہیے۔ بتیاں، پنکھے اور فریج دکان کے بڑے انورٹر یا جنریٹر پر ہونے چاہییں، کاؤنٹر کے بیک اپ پر نہیں۔\n\n' +
        '**UPS، انورٹر یا سولر؟** UPS تقریباً فوراً بجلی سنبھال لیتا ہے، اس لیے PC ری اسٹارٹ نہیں ہوتا۔ چھوٹے UPS تھوڑی دیر کے لیے بنے ہوتے ہیں، عموماً [5 سے 15 منٹ](https://en.wikipedia.org/wiki/Uninterruptible_power_supply)، جو چلتے بل مکمل کرنے یا جنریٹر چلنے تک کا وقفہ نکالنے کے لیے کافی ہے۔ گھنٹے بھر کی لوڈ شیڈنگ کے لیے کاؤنٹر کو دکان کے انورٹر یا سولر سسٹم سے جوڑیں، اور بیچ میں چھوٹا UPS رکھیں تاکہ بجلی بدلنے پر PC ری اسٹارٹ نہ ہو۔\n\n' +
        '**بیک اپ کا سائز لیبل سے نکالیں۔** ہر ڈیوائس کے اڈاپٹر یا لیبل پر اس کی بجلی کی ریٹنگ لکھی ہوتی ہے۔ سب جمع کریں۔ مثال کے طور پر، اگر کاؤنٹر کی ڈیوائس، پرنٹر اور راؤٹر مل کر تقریباً 150 واٹ لیتے ہیں، تو ایک گھنٹے کے بیک اپ کے لیے تقریباً 150 واٹ آور کی قابل استعمال بیٹری چاہیے، ساتھ میں ضیاع اور پرانی بیٹری کے لیے کچھ گنجائش۔ انسٹالر سے کہیں کہ اسی نمبر سے سائز نکالے، پوری دکان کے لوڈ سے نہیں۔\n\n' +
        'لیپ ٹاپ یا ٹیبلٹ کی اپنی بیٹری ہوتی ہے، اسی لیے بہت سی چھوٹی دکانیں انہی پر بل بناتی ہیں: پھر صرف پرنٹر اور راؤٹر کو بیک اپ چاہیے۔\n\n' +
        '## دوسری تہہ: انٹرنیٹ کا بیک اپ\n\n' +
        'بجلی جائے تو اکثر علاقے کا انٹرنیٹ بھی چلا جاتا ہے، کیونکہ گلی کے کیبنٹ اور ٹاور کی بجلی بھی بند ہو جاتی ہے۔ انٹرنیٹ کا دوسرا راستہ رکھیں:\n\n' +
        '- کسی دوسرے موبائل نیٹ ورک کا فون ہاٹ اسپاٹ، جو آپ کی مین لائن والا نہ ہو\n' +
        '- ڈیٹا SIM والا چھوٹا بیٹری سے چلنے والا پورٹیبل راؤٹر\n' +
        '- بڑے اسٹورز کے لیے کسی دوسری کمپنی کی دوسری فکسڈ لائن\n\n' +
        'بیک اپ ہر مہینے آزمائیں۔ جو SIM مہینوں سے استعمال نہیں ہوئی، اس کا ڈیٹا ختم یا بیلنس صفر ہو سکتا ہے۔',
      id: 'bca32c80b1fa',
    },
    {
      type: 'diagram',
      heading: 'آف لائن بنے بل کا کیا ہوتا ہے',
      caption: 'آف لائن ہونے پر بل کاؤنٹر کی ڈیوائس پر محفوظ ہوتے ہیں اور کنکشن آتے ہی اکاؤنٹ میں چلے جاتے ہیں؛ دوسری برانچیں سنک کے بعد انہیں دیکھتی ہیں۔',
      diagram: { kind: 'offline-sync', animate: true },
      id: 'b3b200445449',
    },
    {
      type: 'richText',
      markdown:
        '## تیسری تہہ: ایسا POS جو آف لائن بل بنائے\n\n' +
        'بیک اپ کے باوجود ایسا وقت آئے گا جب بجلی ہوگی مگر انٹرنیٹ نہیں۔ تب بھی آپ کا POS بل بناتا رہے۔ [آف لائن POS](/glossary/offline-pos) پروڈکٹس، ریٹ اور گاہکوں کی کاپی ڈیوائس پر رکھتا ہے، ہر نیا بل اپنے نمبر کے ساتھ وہیں محفوظ کرتا ہے، رسید پرنٹ کرتا ہے، اور کنکشن آتے ہی سب کچھ اکاؤنٹ میں بھیج دیتا ہے۔\n\n' +
        'کسی بھی سسٹم پر بھروسہ کرنے سے پہلے یہ باتیں چیک کریں:\n\n' +
        '- جس ڈیوائس پر پہلے لاگ ان ہو چکا ہو، کیا اس پر کیشیئر بغیر انٹرنیٹ کے لاگ ان کر کے کاؤنٹر کھول سکتا ہے؟\n' +
        '- کیا سرچ، بارکوڈ اسکین اور رسید آف لائن پوری طرح چلتے ہیں، یا صرف آدھی ادھوری اسکرین ملتی ہے؟\n' +
        '- کیا ادھار کی انٹری اور کھاتے کی ادائیگی آف لائن درج ہو سکتی ہے؟\n' +
        '- اگر دو کاؤنٹر ایک ساتھ آف لائن بل بنائیں تو کیا ان کے بل نمبر ٹکرا سکتے ہیں؟\n' +
        '- لمبے عرصے آف لائن رہنے کے بعد، کیا آپ دیکھ سکتے ہیں کہ کیا ابھی بھیجنا باقی ہے؟\n\n' +
        'صرف آن لائن چلنے والا POS عین مشکل وقت پر رک جاتا ہے۔ ٹھیک آف لائن موڈ والا [کلاؤڈ POS](/glossary/cloud-pos) دونوں فائدے دیتا ہے: کاؤنٹر ڈیوائس پر چلتا ہے اور سنک ہونے کے بعد مالک سب کچھ دیکھ لیتا ہے۔',
      id: 'bf7167d0b86f',
    },
    {
      type: 'screenshot',
      heading: 'کاؤنٹر بتاتا ہے کہ وہ آن لائن ہے یا نہیں',
      body: 'اوپر کی پٹی بتاتی ہے کہ کاؤنٹر کب آف لائن ہے اور کتنے بل بھیجنے باقی ہیں۔ سرچ، اسکین اور رسید ڈیوائس پر رکھی کاپی سے چلتے ہیں۔',
      mediaId: 'media_retail-pos',
      frame: 'browser',
      url: 'app.nafaa.pk/pos',
      callouts: [
        { x: 30, y: 12, label: 'آن لائن یا آف لائن کا نشان' },
        { x: 82, y: 3, label: 'سنک کی صورتحال' },
      ],
      layout: 'full',
      caption: 'ایک ڈیمو گروسری اسٹور کی کاؤنٹر اسکرین۔',
      id: 'bf7b58889c91',
    },
    {
      type: 'steps',
      heading: 'چوتھی تہہ: کاغذ کا انتظام',
      intro: 'صرف مکمل بندش کے لیے: نہ بجلی، نہ بیٹری، نہ ڈیوائس۔ اس کی نوبت کبھی کبھار ہی آنی چاہیے۔',
      items: [
        {
          title: 'کاؤنٹر پر نمبر والی پرچی بک رکھیں',
          body: 'پہلے سے نمبر لگے صفحے، تاکہ کوئی پرچی غائب ہو تو پتا چل جائے۔ ساتھ میں قلم رکھیں۔',
        },
        {
          title: 'ضروری باتیں لکھیں',
          body: 'پرچی نمبر، وقت، آئٹم مقدار اور ریٹ کے ساتھ، ٹوٹل، نقد یا ادھار، اور ادھار ہو تو گاہک کا نام۔',
        },
        {
          title: 'کاغذی بلوں کی نقدی الگ رکھیں',
          body: 'کاغذی بلوں کا کیش پرچیوں کے ساتھ ایک لفافے میں رکھیں، تاکہ بعد میں گنتی آسان ہو۔',
        },
        {
          title: 'ہر پرچی اسی دن درج کریں',
          body: 'کاؤنٹر واپس چل پڑے تو ہر پرچی کو بل کے طور پر درج کریں اور سسٹم کا بل نمبر پرچی پر لکھ دیں۔',
        },
        {
          title: 'گنتی چیک کریں',
          body: 'دکان بند کرتے وقت کاغذی بلوں کا کیش اور سسٹم کا کیش مل کر گلے کے برابر ہونا چاہیے۔ پرچیاں دن کے کاغذات کے ساتھ رکھیں۔',
        },
      ],
      howTo: true,
      id: 'bfba01fdcf57',
    },
    {
      type: 'richText',
      markdown:
        '## بجلی آنے کے بعد: سنک چیک کریں\n\n' +
        'کنکشن واپس آتے ہی آف لائن بل اکاؤنٹ میں چلے جاتے ہیں۔ دن بند کرنے سے پہلے:\n\n' +
        '1. سنک کی صورتحال کھولیں اور تسلی کریں کہ کچھ بھی رکا ہوا یا فیل نہیں۔\n' +
        '2. اگر کوئی آف لائن سیل محفوظ نہ ہو سکی، مثلاً اس لیے کہ وہ مال دوسرے کاؤنٹر پر پہلے ہی بک چکا تھا، تو وجہ پڑھیں، ٹھیک کریں اور دوبارہ بھیجیں۔ اسے ڈیلیٹ نہ کریں۔\n' +
        '3. پھر اپنی معمول کی [روز کی کیش کلوزنگ](/ur/blog/daily-cash-closing-routine) کریں، تاکہ آف لائن کیش بھی باقی کے ساتھ گنا جائے۔\n\n' +
        '## ہر مہینے کی مشق\n\n' +
        'مہینے میں ایک بار، کسی ہلکے گھنٹے میں، کاؤنٹر کی مین بجلی اور راؤٹر ایک ساتھ بند کریں۔ دیکھیں بیک اپ کو سنبھالنے میں کتنا وقت لگتا ہے، ایک ٹیسٹ سیل کا آف لائن بل بنائیں، پرنٹ کریں، پھر بجلی واپس لگائیں اور اسے سنک ہوتے دیکھیں۔ دس منٹ کی مشق سے اسٹاف کو پتا ہوتا ہے کہ اصل لوڈ شیڈنگ میں کیا کرنا ہے۔\n\n' +
        '## Nafaa کیسے مدد کرتا ہے\n\n' +
        'Nafaa انٹرنیٹ جانے پر بھی بل بناتا رہتا ہے۔ پروڈکٹس، ریٹ، گاہک اور سیٹنگز ڈیوائس پر رہتے ہیں؛ نئے بل، کھاتے کی ادائیگیاں، نئے گاہک اور ایکسپینس آف لائن قطار میں انتظار کرتے ہیں اور کنکشن آتے ہی خود سنک ہو جاتے ہیں۔ جس ڈیوائس پر ایک بار لاگ ان ہو چکا ہو، وہ بغیر انٹرنیٹ کے کاؤنٹر کھول سکتی ہے، اور ہر ڈیوائس اپنے آف لائن بلوں کو اپنے کوڈ کے ساتھ نمبر دیتی ہے تاکہ دو کاؤنٹرز کے نمبر کبھی نہ ٹکرائیں۔ اوپر کی پٹی بتاتی ہے کہ آپ آن لائن ہیں یا نہیں اور کتنی چیزیں باقی ہیں، اور Sync Center ہر تبدیلی کی لسٹ دکھاتا ہے، فیل ہونے والی چیزیں ڈیلیٹ کرنے کی بجائے دوبارہ بھیجتا ہے، اور جب اسٹاک کی وجہ سے کوئی سیل رکی ہو تو وجہ دکھاتا ہے۔ Nafaa ہر ہفتے ڈیوائس کے ڈیٹا کا بیک اپ لینے کی یاد بھی دلاتا ہے۔ مزید [آف لائن POS](/ur/product/offline-pos) پر پڑھیں، اور کاؤنٹر کے نیچے رکھنے والے بیک اپ کے لیے ہماری [POS ہارڈویئر کٹ گائیڈ](/blog/pos-hardware-kit-guide) دیکھیں۔',
      id: 'b570a9d36152',
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'دکان بند کرتے وقت چارج کریں',
      body: 'بیک اپ فون اور پورٹیبل راؤٹر ہر شام دکان بند کرتے وقت چارج پر لگائیں، اسی وقت جب آپ گلہ گنتے ہیں۔ اسے روز کے معمول کا حصہ بنائیں، ایسی چیز نہیں جو بجلی جانے پر یاد آئے۔',
      id: 'b151b9581a05',
    },
    {
      type: 'sources',
      heading: 'حوالے',
      items: [
        { title: 'Load shedding', url: 'https://en.wikipedia.org/wiki/Load_shedding', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
        {
          title: 'Uninterruptible power supply',
          url: 'https://en.wikipedia.org/wiki/Uninterruptible_power_supply',
          publisher: 'Wikipedia',
          accessedAt: '2026-10-26',
        },
        {
          title: 'National Electric Power Regulatory Authority (NEPRA)',
          url: 'https://nepra.org.pk/',
          publisher: 'NEPRA',
          accessedAt: '2026-10-26',
        },
      ],
      id: 'bccaee107809',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Writer notes (hidden)',
      body: 'Outline: Why plan in layers · Power for the counter · Internet backup · Offline POS · Paper fallback · Checking the sync · Monthly drill · How Nafaa helps.\n\nEvery number needs a source with a date. No fake authors, customers or surveys.',
      hidden: true,
      id: 'b50f30911a67',
    },
  ],
  relations: [
    { ref: 'BLOG_CATEGORY:guides@ur', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos@ur', kind: 'TAG' },
    { ref: 'PRODUCT:offline-pos@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:daily-cash-closing-routine@ur', kind: 'RELATED' },
    { ref: 'SERVICE:hardware@ur', kind: 'RELATED' },
    { ref: 'INDUSTRY:kiryana@ur', kind: 'RELATED' },
  ],
  imageId: 'media_blog-load-shedding-proof-billing',
  ogImageId: 'media_blog-load-shedding-proof-billing',
  seoTitle: 'پاکستان میں دکانوں کے لیے لوڈ شیڈنگ میں بلنگ',
  seoDescription:
    'لوڈ شیڈنگ اور انٹرنیٹ جانے پر بھی بلنگ چلائیں: کاؤنٹر کے لیے بیک اپ بجلی، دوسرا کنکشن، آف لائن POS، کاغذ کا انتظام اور بعد میں سنک۔',
  focusKeyword: 'لوڈ شیڈنگ میں بلنگ',
  sortOrder: 37,
  origin: 'translation of content/blog/posts/load-shedding-proof-billing.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/core/lib/offline/syncEngine.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/lib/offline/offlineAuth.ts',
    'apps/web/src/core/lib/offline/offlineDevice.ts',
    'apps/web/src/core/lib/offline/offlineAutoBackup.ts',
    'apps/web/src/core/lib/offline/ui/SyncCenterPage.tsx',
    'apps/web/src/app/shell/topbar/SyncStatusIndicator.tsx',
  ],
  sources: [
    { title: 'Load shedding', url: 'https://en.wikipedia.org/wiki/Load_shedding', publisher: 'Wikipedia', accessedAt: '2026-10-26' },
    {
      title: 'Uninterruptible power supply',
      url: 'https://en.wikipedia.org/wiki/Uninterruptible_power_supply',
      publisher: 'Wikipedia',
      accessedAt: '2026-10-26',
    },
    {
      title: 'National Electric Power Regulatory Authority (NEPRA)',
      url: 'https://nepra.org.pk/',
      publisher: 'NEPRA',
      accessedAt: '2026-10-26',
    },
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ['Author: a real PERSON entry (O4).'],
};
