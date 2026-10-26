/** Urdu: Glossary term STRN (/ur/glossary/strn). Translation of content/glossary/tax.ts (strn). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'strn',
  title: 'STRN (سیلز ٹیکس رجسٹریشن نمبر)',
  summary: 'سیلز ٹیکس رجسٹریشن نمبر اس کاروبار کی پہچان ہے جو FBR کے پاس سیلز ٹیکس کے لیے رجسٹرڈ ہو۔',
  seoTitle: 'STRN کیا ہے؟ سیلز ٹیکس رجسٹریشن نمبر اردو میں',
  seoDescription:
    'سیلز ٹیکس رجسٹریشن نمبر (STRN) اس کاروبار کی پہچان ہے جو FBR کے پاس سیلز ٹیکس کے لیے رجسٹرڈ ہو۔ جانیں کسے چاہیے اور بل پر کہاں آتا ہے۔',
  data: {
    term: 'STRN (سیلز ٹیکس رجسٹریشن نمبر)',
    definition: 'سیلز ٹیکس رجسٹریشن نمبر اس کاروبار کی پہچان ہے جو FBR کے پاس سیلز ٹیکس کے لیے رجسٹرڈ ہو۔',
    definitionRomanUrdu: 'STRN us business ka number hai jo FBR ke paas sales tax ke liye registered ho.',
    example:
      'سیلز ٹیکس میں رجسٹرڈ ایک ڈسٹری بیوٹر ہر سیلز ٹیکس انوائس پر اپنا STRN چھاپتا ہے۔ اس سے خریدنے والا ریٹیلر اس انوائس پر ان پٹ ٹیکس کلیم کرنے سے پہلے چیک کرتا ہے کہ سپلائر کا STRN ایکٹو ہے۔',
    alsoKnownAs: ['ایس ٹی آر این', 'سیلز ٹیکس نمبر', 'sales tax registration number', 'sales tax number', 'STN'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b101e0b84e0f',
      markdown: `## یہ کیسے کام کرتا ہے

NTN مل جانے کے بعد کاروبار IRIS پر سیلز ٹیکس کے لیے رجسٹر ہوتا ہے۔ رجسٹر ہونے کے بعد اسے ٹیکس والی سپلائی پر سیلز ٹیکس لگانا، اپنا رجسٹریشن نمبر دکھانے والی سیلز ٹیکس انوائسز جاری کرنا، اور ماہانہ سیلز ٹیکس ریٹرن جمع کرانا ہوتا ہے۔ جو خریدار خود رجسٹرڈ ہوں وہ ان انوائسز کا ٹیکس ان پٹ ٹیکس کے طور پر کلیم کر سکتے ہیں، لیکن صرف تب جب سپلائر ایکٹو ہو اور اس نے وہ سیل ظاہر کی ہو۔

سروسز پر سیلز ٹیکس کے لیے صوبائی اتھارٹیز الگ رجسٹر کرتی ہیں: پنجاب میں PRA، سندھ میں SRB، خیبر پختونخوا میں KPRA اور بلوچستان میں BRA۔ جو کاروبار سامان اور سروسز دونوں بیچتا ہو، اسے وفاقی اور صوبائی دونوں رجسٹریشنز کی ضرورت پڑ سکتی ہے۔

## Nafaa میں

Nafaa کی ٹیکس سیٹنگز وہ رجسٹریشن تفصیلات رکھتی ہیں جو ہر اتھارٹی کی انٹیگریشن کو چاہیے، اور ماہانہ رپورٹ ہر اتھارٹی کے حساب سے سیلز ٹیکس ریٹرن کے اعداد دیتی ہے۔

## سرکاری ذریعہ

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149) اور [FBR: Active Taxpayer List (Sales Tax)](https://fbr.gov.pk/atl-sales-tax/163223)۔ شرحیں، حدیں اور تاریخیں Finance Acts اور S.R.O.s کے ساتھ بدلتی رہتی ہیں؛ موجودہ صورتحال اتھارٹی یا ٹیکس ایڈوائزر سے چیک کریں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:ntn@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sales-tax@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:fbr@ur', kind: 'RELATED' },
  ],
  sortOrder: 105,
  origin: 'translation of content/glossary/tax.ts, strn (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/tax/components/SettingsView.tsx',
    'apps/web/src/modules/tax/components/MonthlyReportView.tsx',
  ],
  sources: [
    {
      title: 'FBR: Sales Tax Basics',
      url: 'https://fbr.gov.pk/sales-tax-basics/51148/101149',
      publisher: 'Federal Board of Revenue',
      accessedAt: '2026-10-26',
    },
    {
      title: 'FBR: Active Taxpayer List (Sales Tax)',
      url: 'https://fbr.gov.pk/atl-sales-tax/163223',
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
