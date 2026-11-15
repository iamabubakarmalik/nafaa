/** Urdu: languages page (/ur/languages). Translation of content/main-pages/features-nov.ts (languages). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { withIds } from '../../../lib/blocks';
import { MOBILE_SHOT } from '../../main-pages/features-nov';

const ORIGIN = 'translation of faq nov-lang-* (15 Nov 2026)';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-languages-switch',
    locale: 'ur',
    topic: 'product',
    question: 'ایپ کی زبان کیسے بدلوں؟',
    answer:
      'لاگ ان کے صفحے پر، سائن اپ کے دوران، پروفائل مینو سے یا سیٹنگز میں انگریزی، اردو یا رومن اردو چنیں۔ ہر شخص اپنی زبان خود چنتا ہے، اس لیے ایک ہی اکاؤنٹ پر مالک انگریزی پڑھ سکتا ہے اور کیشیئر اردو استعمال کر سکتا ہے۔',
    sourceNote: 'LanguagePicker in AuthLayout, OnboardingPage, ProfileDropdown and LocalizationSection.',
    origin: ORIGIN,
    evidence: [
      'apps/web/src/core/i18n/components/LanguagePicker.tsx',
      'apps/web/src/modules/organization/settings/sections/LocalizationSection.tsx',
    ],
  },
  {
    key: 'ur-page-languages-rtl',
    locale: 'ur',
    topic: 'product',
    question: 'کیا اردو ورژن دائیں سے بائیں لکھا ہے؟',
    answer:
      'جی ہاں۔ اردو میں پوری اسکرین دائیں سے بائیں ہو جاتی ہے اور اسکرین کے لیے بنا اردو فونٹ (Noto Naskh) استعمال ہوتا ہے۔ اگر آپ کلاسک نستعلیق انداز پسند کرتے ہیں تو Appearance میں اسے چن سکتے ہیں۔ نمبر اور Sale اور Stock جیسے کاروباری الفاظ پڑھنے میں آسان رہتے ہیں۔',
    sourceNote: 'core/i18n/locales.ts (ur: dir rtl); design-system/tokens/typography.ts (Naskh default, Nastaliq and Gulzar options).',
    origin: ORIGIN,
    evidence: ['apps/web/src/core/i18n/locales.ts', 'apps/web/src/design-system/tokens/typography.ts'],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'languages',
  title: 'Nafaa انگریزی، اردو اور رومن اردو میں',
  seoTitle: 'اردو POS سافٹ ویئر: Nafaa اردو اور رومن اردو میں',
  seoDescription:
    'Nafaa انگریزی، اردو (دائیں سے بائیں) یا رومن اردو میں چلائیں۔ ویب، ڈیسک ٹاپ اور موبائل ایپ پر ہر شخص اپنی زبان خود چنتا ہے، آسان الفاظ کے ساتھ۔',
  focusKeyword: 'اردو پی او ایس سافٹ ویئر',
  summary:
    'Nafaa تین زبانوں میں چلتا ہے: انگریزی، دائیں سے بائیں اردو، اور رومن اردو۔ ویب، ڈیسک ٹاپ اور موبائل ایپ پر ہر شخص اپنی اسکرین کی زبان خود چنتا ہے، اور Nafaa AI اسی زبان میں جواب دیتا ہے جس میں آپ پوچھیں۔ Sale، Profit اور Stock جیسے کاروباری الفاظ وہی رہتے ہیں جو دکانوں میں پہلے سے بولے جاتے ہیں۔',
  data: { template: 'default', icon: 'languages', shortName: 'زبانیں' },
  blocks: withIds('PAGE:languages@ur', [
    {
      type: 'hero',
      eyebrow: 'تین زبانیں',
      heading: 'اپنا کاروبار اس زبان میں چلائیں جس میں آپ سوچتے ہیں',
      sub: 'Nafaa پوری ایپ میں انگریزی، اردو اور رومن اردو بولتا ہے۔ ایک ہی اکاؤنٹ پر مالک رپورٹس انگریزی میں پڑھ سکتا ہے اور کیشیئر اردو میں بل بنا سکتا ہے، اور سب کے لیے الفاظ آسان اور روزمرہ کے ہیں۔',
      primaryCta: { label: '7 دن کا فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_trial' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['English', 'اردو', 'Roman Urdu'],
      media: { kind: 'screenshot', mediaId: MOBILE_SHOT.ur.billing, frame: 'none' },
      layout: 'split',
    },
    {
      type: 'answerBox',
      heading: 'زبانیں مختصراً',
      facts: [
        { label: 'زبانیں', value: 'انگریزی، اردو (دائیں سے بائیں) اور رومن اردو' },
        { label: 'کون چنتا ہے', value: 'ہر شخص اپنی زبان خود چنتا ہے؛ دکان بل کی زبان طے کرتی ہے' },
        { label: 'کہاں', value: 'ویب ایپ، Windows ڈیسک ٹاپ ایپ اور Nafaa POS موبائل ایپ' },
        { label: 'Nafaa AI', value: 'سوال یا ایپ کی زبان میں جواب دیتا ہے' },
      ],
      romanUrdu:
        'Nafaa teen zabanon me hai: English, Urdu aur Roman Urdu. Har banda apni zaban khud chunta hai, aur Nafaa AI bhi usi zaban me jawab deta hai.',
    },
    {
      type: 'featuresGrid',
      heading: 'ایک ایپ، تین زبانیں',
      columns: 3,
      items: [
        { icon: 'globe', title: 'انگریزی', body: 'مالکوں، مینیجروں اور اکاؤنٹنٹس کے لیے صاف اور سادہ انگریزی۔' },
        { icon: 'languages', title: 'اردو', body: 'اردو رسم الخط، پوری اسکرین دائیں سے بائیں، اسکرین کے لیے بنے اردو فونٹ میں۔' },
        { icon: 'message-square', title: 'رومن اردو', body: 'انگریزی حروف میں لکھی اردو، جیسے زیادہ تر لوگ فون پر لکھتے ہیں۔' },
        { icon: 'users', title: 'ہر شخص خود چنتا ہے', body: 'ایک ہی اکاؤنٹ پر مالک، مینیجر اور کیشیئر ہر ایک الگ زبان استعمال کر سکتا ہے۔' },
        { icon: 'sparkles', title: 'Nafaa AI بھی', body: 'انگریزی، اردو یا رومن اردو میں سوال پوچھیں اور جواب اسی زبان میں آئے گا۔' },
        { icon: 'smartphone', title: 'ہر ڈیوائس پر', body: 'ویب، Windows ڈیسک ٹاپ ایپ اور موبائل ایپ پر یہی تین زبانیں۔' },
      ],
    },
    {
      type: 'screenshot',
      heading: 'اردو، دائیں سے بائیں',
      body: 'اردو میں پوری ایپ دائیں سے بائیں ہو جاتی ہے: مینو، فارم، ٹیبل اور بل۔ اردو کا ڈیفالٹ فونٹ Noto Naskh ہے جو مصروف اسکرین پر بھی صاف رہتا ہے؛ اگر آپ کلاسک نستعلیق انداز چاہیں تو Appearance میں چن لیں۔',
      mediaId: MOBILE_SHOT.ur.home,
      frame: 'none',
      layout: 'split-right',
    },
    {
      type: 'steps',
      heading: 'اپنی زبان چنیں',
      items: [
        { title: 'سائن اپ یا لاگ ان پر', body: 'زبان چننے کا بٹن لاگ ان کے صفحے اور سائن اپ کے پہلے قدم پر ہے۔' },
        { title: 'پروفائل مینو سے', body: 'اپنے نام کے نیچے والے مینو سے کسی بھی وقت بدلیں۔' },
        { title: 'سیٹنگز میں', body: 'Settings میں Language تینوں زبانیں ایک نمونے کی لائن کے ساتھ دکھاتی ہے، تاکہ ہر کوئی اپنی زبان پہچان لے۔' },
        { title: 'فون پر', body: 'موبائل ایپ پہلی بار کھلنے پر پوچھتی ہے اور انتخاب سیٹنگز میں رکھتی ہے۔' },
      ],
    },
    {
      type: 'richText',
      markdown: `## آسان الفاظ، اور وہ کاروباری لفظ جو لوگ پہلے سے بولتے ہیں

پاکستان کی دکانوں میں روز زبانیں ملتی ہیں۔ کیشیئر "Sale" اور "Stock" انگریزی میں کہتا ہے اور "ادھار" اور "کھاتہ" اردو میں۔ Nafaa بھی یہی عادت اپناتا ہے: روزمرہ کے الفاظ آسان ہیں، اور Sale، Profit، Cost، Expense، Discount اور Stock جیسے عام کاروباری لفظ ہر زبان میں وہی رہتے ہیں، تاکہ ایپ چلانے کے لیے کسی کو نئے الفاظ نہ سیکھنے پڑیں۔ رومن اردو میں مینو کے نام وہی انگریزی نام ہیں جو دکاندار پہلے سے جانتے ہیں، جیسے Day report اور Customer credit۔

## آپ کی زبان، آپ کے ساتھی کی زبان

زبان ہر شخص کی اپنی ہوتی ہے، پوری دکان کی نہیں۔ مالک گھر پر رپورٹس انگریزی میں پڑھ سکتا ہے، مینیجر رومن اردو میں کام کر سکتا ہے، اور کیشیئر کاؤنٹر پر اردو میں بل بنا سکتا ہے، سب ایک ہی اکاؤنٹ اور ایک ہی نمبروں پر۔ نئے اکاؤنٹ انگریزی میں شروع ہوتے ہیں؛ کوئی بھی ایک سیکنڈ میں بدل سکتا ہے۔

اس کے علاوہ، دکان کا مالک Settings میں **بل کی زبان** طے کرتا ہے۔ یہ وہ زبان ہے جو بلوں، رسیدوں اور گاہکوں کو جانے والے پیغامات کے لیے ہے، اور یہ پوری دکان کے لیے ایک ہی سیٹنگ ہے۔

## Nafaa AI آپ کی زبان بولتا ہے

[Nafaa AI اسسٹنٹ](/ur/product/ai-assistant) آپ کے سوال کی زبان میں جواب دیتا ہے۔ "aaj ki sale kitni hui?" پوچھیں تو جواب رومن اردو میں آتا ہے؛ انگریزی میں پوچھیں تو انگریزی میں؛ اور اگر ایپ اردو پر ہے تو جواب اردو رسم الخط میں آتا ہے۔ جواب کے اندر کاروباری الفاظ اسکرینوں کی طرح انگریزی میں ہی رہتے ہیں۔

## کسی بھی ہجے میں کسٹمر ڈھونڈیں

لوگ نام الگ الگ طرح لکھتے ہیں۔ موبائل ایپ میں کسٹمر سرچ انگریزی، رومن اردو اور اردو رسم الخط تینوں سمجھتی ہے، اس لیے "ahmad" سے "Ahmed" بھی مل جاتا ہے، اور فون نمبر کسی بھی انداز میں لکھیں صحیح کسٹمر مل جاتا ہے۔ اس سے آپ کا اسٹاف جس طرح بھی لکھے، [کھاتہ](/ur/product/khata) استعمال کرنا تیز رہتا ہے۔

## ابھی کیا ترجمہ ہو رہا ہے

اسکرینیں، مینو، سرور کے پیغامات اور Nafaa AI تینوں زبانوں میں ہیں۔ چند چیزیں ابھی مکمل ہو رہی ہیں: کچھ چھپے ہوئے کاغذات اور Excel کے کالم کے نام اپنے اصل الفاظ میں رہتے ہیں، اور ہفتے کے دن اور مہینوں کے نام انگریزی میں دکھتے ہیں۔ ہم انہیں اگلے مرحلے میں ترجمہ کر رہے ہیں اور ہر تبدیلی changelog میں لکھتے ہیں۔`,
    },
    {
      type: 'callout',
      tone: 'tip',
      title: 'اس ویب سائٹ کو اردو میں پڑھیں',
      body: 'اس ویب سائٹ کے کئی صفحات کا اردو ورژن بھی ہے۔ صفحے کے نیچے زبان کا بٹن استعمال کریں۔',
    },
    { type: 'faq', heading: 'عام سوالات' },
    {
      type: 'cta',
      heading: 'Nafaa اپنی زبان میں آزمائیں',
      body: '7 دن کا فری ٹرائل شروع کریں اور پہلی اسکرین پر انگریزی، اردو یا رومن اردو چنیں۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'cta_trial' },
      secondaryCta: { label: 'واٹس ایپ پر پیغام بھیجیں', href: 'whatsapp', variant: 'ghost', trackAs: 'cta_whatsapp' },
    },
  ]),
  faqKeys: ['ur-page-languages-switch', 'ur-page-languages-rtl'],
  relations: [
    { ref: 'PAGE:mobile-app@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:ai-assistant@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'PAGE:pricing@ur', kind: 'RELATED' },
  ],
  sortOrder: 41,
  origin: 'translation of content/main-pages/features-nov.ts (15 Nov 2026)',
  evidence: [
    'apps/web/src/core/i18n/locales.ts',
    'apps/web/src/core/i18n/components/LanguagePicker.tsx',
    'apps/web/src/modules/organization/settings/sections/LocalizationSection.tsx',
    'apps/web/src/design-system/tokens/typography.ts',
    'apps/api/src/modules/ai-assistant/ai-prompt.ts',
    'apps/mobile/src/core/i18n/locales.ts',
  ],
  factCheck: { checkedOn: '2026-11-15', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: ['Open translation items from the 2 Nov deploy (printed papers, CSV headers, weekday names) are stated as still being finished; remove that paragraph when they are done.'],
};
