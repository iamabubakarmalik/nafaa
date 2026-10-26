/** Urdu: Glossary term NTN (/ur/glossary/ntn). Translation of content/glossary/tax.ts (ntn). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'ntn',
  title: 'NTN (نیشنل ٹیکس نمبر)',
  seoTitle: 'NTN (نیشنل ٹیکس نمبر) کیا ہے؟ مطلب اور مثال',
  summary: 'نیشنل ٹیکس نمبر FBR کے ہاں ٹیکس دہندہ کی پہچان کا نمبر ہے، جو FBR کے IRIS پورٹل سے ملتا ہے۔',
  seoDescription:
    'نیشنل ٹیکس نمبر (NTN) FBR کے ہاں ٹیکس دہندہ کی پہچان کا نمبر ہے، جو IRIS پورٹل سے ملتا ہے۔ جانیں کاروبار کو اس کی ضرورت کب پڑتی ہے۔',
  data: {
    term: 'NTN (نیشنل ٹیکس نمبر)',
    definition: 'نیشنل ٹیکس نمبر FBR کے ہاں ٹیکس دہندہ کی پہچان کا نمبر ہے، جو FBR کے IRIS پورٹل سے ملتا ہے۔',
    definitionRomanUrdu: 'NTN FBR ke saath taxpayer ki pehchan ka number hai, jo IRIS portal se milta hai.',
    example:
      'ایک دکان کا مالک اپنے CNIC، موبائل نمبر اور ای میل سے IRIS پر رجسٹر ہوتا ہے، کاروبار کی تفصیل ڈالتا ہے، اور اسے NTN مل جاتا ہے۔ وہ اسے اپنا سالانہ انکم ٹیکس ریٹرن جمع کرانے کے لیے استعمال کرتا ہے، اور ان سپلائرز کو دیتا ہے جنہیں اپنے ریکارڈ کے لیے اس کی ضرورت ہو۔',
    alsoKnownAs: ['این ٹی این', 'نیشنل ٹیکس نمبر', 'national tax number', 'tax number', 'FBR registration number'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b3982773d47e',
      markdown: `## یہ کیسے کام کرتا ہے

رجسٹریشن آن لائن IRIS پر ہوتی ہے، جو FBR کا ٹیکس دہندگان کا پورٹل ہے۔ افراد اپنے CNIC سے رجسٹر ہوتے ہیں؛ کمپنیاں اور ایسوسی ایشن آف پرسنز اپنی انکارپوریشن یا رجسٹریشن کی دستاویزات سے۔ افراد کے لیے FBR خود CNIC نمبر کو ہی رجسٹریشن نمبر کے طور پر استعمال کرتا ہے۔

انکم ٹیکس ریٹرن جمع کرانے کے لیے NTN چاہیے، اور ریٹرن جمع کرانے سے ہی کوئی فرد Active Taxpayer List میں آتا ہے، جس کا اثر بہت سے لین دین پر ودہولڈنگ ٹیکس کی شرحوں پر پڑتا ہے۔ سیلز ٹیکس کی رجسٹریشن اور زیادہ تر صوبائی ٹیکس رجسٹریشنز کے لیے بھی کاروبار کو NTN چاہیے۔

## Nafaa میں

Nafaa کی Tax سیٹنگز ہر POS ٹرمینل کے ساتھ NTN محفوظ رکھتی ہیں، جہاں کسی اتھارٹی کی انٹیگریشن اسے مانگے۔ Nafaa ٹیکس دہندگان کو رجسٹر نہیں کرتا اور نہ ریٹرن جمع کراتا ہے۔

## سرکاری ذریعہ

[FBR IRIS taxpayer portal](https://iris.fbr.gov.pk/public/txplogin.xhtml)۔ شرحیں، حدیں اور تاریخیں Finance Acts اور S.R.O.s کے ساتھ بدلتی رہتی ہیں؛ موجودہ صورتحال اتھارٹی یا ٹیکس ایڈوائزر سے چیک کریں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:strn@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sales-tax@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-start-kiryana-store-pakistan@ur', kind: 'RELATED' },
  ],
  sortOrder: 66,
  origin: 'translation of content/glossary/tax.ts, ntn (26 Oct 2026)',
  evidence: ['apps/web/src/modules/tax/components/SettingsView.tsx'],
  sources: [
    {
      title: 'FBR IRIS taxpayer portal',
      url: 'https://iris.fbr.gov.pk/public/txplogin.xhtml',
      publisher: 'Federal Board of Revenue',
      accessedAt: '2026-10-26',
    },
  ],
  factCheck: {
    checkedOn: '2026-10-26',
    note: 'Urdu translation of the English entry; claims unchanged. Rules and bodies checked against the official sources listed; no rates or thresholds quoted because they change with Finance Acts.',
  },
  dropped: [],
  needsOwner: [],
};
