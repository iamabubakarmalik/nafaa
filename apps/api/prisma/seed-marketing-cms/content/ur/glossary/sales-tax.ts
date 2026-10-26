/** Urdu: Glossary term sales tax (/ur/glossary/sales-tax). Translation of content/glossary/tax.ts (sales-tax). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'sales-tax',
  title: 'سیلز ٹیکس (Sales Tax / GST)',
  seoTitle: 'سیلز ٹیکس (Sales Tax / GST) کیا ہے؟ مطلب اور مثال',
  summary:
    'سیلز ٹیکس، جسے پاکستان میں اکثر GST کہتے ہیں، سامان کی سپلائی پر وفاقی Sales Tax Act, 1990 کے تحت لگنے والا ٹیکس ہے، جبکہ سروسز پر صوبے الگ ٹیکس لگاتے ہیں۔',
  seoDescription:
    'سیلز ٹیکس، جسے پاکستان میں اکثر GST کہتے ہیں، سامان پر وفاقی Sales Tax Act, 1990 کے تحت لگتا ہے، جبکہ سروسز پر صوبے الگ ٹیکس لگاتے ہیں۔',
  data: {
    term: 'سیلز ٹیکس (Sales Tax / GST)',
    definition:
      'سیلز ٹیکس، جسے پاکستان میں اکثر GST کہتے ہیں، سامان کی سپلائی پر وفاقی Sales Tax Act, 1990 کے تحت لگنے والا ٹیکس ہے، جبکہ سروسز پر صوبے الگ ٹیکس لگاتے ہیں۔',
    definitionRomanUrdu:
      'Sales tax, jise Pakistan me aam taur par GST kehte hain, saman ki supply par federal Sales Tax Act, 1990 ke tehat lagta hai; services par sooba alag tax lagata hai.',
    example:
      'ایک رجسٹرڈ مینوفیکچرر ڈسٹری بیوٹر کو سامان بیچتا ہے اور انوائس پر سیلز ٹیکس لگاتا ہے۔ ڈسٹری بیوٹر آگے بیچتے وقت پھر سیلز ٹیکس لگاتا ہے، لیکن اپنی خریداری پر دیا گیا ٹیکس منہا کر لیتا ہے، اس طرح ہر مرحلے پر عملاً صرف بڑھائی گئی قیمت (value added) پر ٹیکس ادا ہوتا ہے۔',
    alsoKnownAs: ['سیلز ٹیکس', 'جی ایس ٹی', 'GST', 'general sales tax', 'sales tax on goods', 'VAT'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b62ad73b2493',
      markdown: `## یہ کیسے کام کرتا ہے

سامان پر سیلز ٹیکس FBR وصول کرتا ہے۔ رجسٹرڈ کاروبار اپنی سیل پر آؤٹ پٹ ٹیکس لگاتے ہیں، اپنی خریداری پر دیا گیا ان پٹ ٹیکس منہا کرتے ہیں، اور فرق ماہانہ ریٹرن کے ساتھ ادا کرتے ہیں۔ معیاری شرح Sales Tax Act, 1990 کے سیکشن 3 میں مقرر ہے، اور کم شرحیں، ٹیکس سے مستثنیٰ اشیاء (exemptions) اور خاص نظام اس کے شیڈولز میں ہیں؛ تیسرے شیڈول (Third Schedule) کی اشیاء پر ٹیکس ان کی چھپی ہوئی ریٹیل قیمت پر لگتا ہے۔

18ویں ترمیم کے بعد سے سروسز پر سیلز ٹیکس صوبائی معاملہ ہے: PRA، SRB، KPRA اور BRA اسے اپنے قوانین کے تحت، اپنی شرحوں پر وصول کرتے ہیں۔ اسی لیے لاہور کا ریسٹورنٹ PRA سے واسطہ رکھتا ہے، جبکہ سامان کا ہول سیلر FBR سے۔

## Nafaa میں

Nafaa کا ٹیکس ماڈیول FBR POS، PRA، SRB اور KPRA کو ایک جگہ رکھتا ہے: ہر اتھارٹی کے حساب سے ٹیکس والی سیل اور ٹیکس، بھیجی گئی ہر انوائس، اور شرح، برانچ اور دن کے حساب سے ماہانہ سیلز ٹیکس ریٹرن کے اعداد۔ کسی اتھارٹی سے انٹیگریشن اختیاری ہے۔

## سرکاری ذریعہ

[FBR: Sales Tax Basics](https://fbr.gov.pk/sales-tax-basics/51148/101149) اور Sales Tax Act, 1990 کے لیے [FBR: Acts, Rules and Ordinances](https://fbr.gov.pk/act-rules-ordinances/131226)۔ شرحیں، حدیں اور تاریخیں Finance Acts اور S.R.O.s کے ساتھ بدلتی رہتی ہیں؛ موجودہ صورتحال اتھارٹی یا ٹیکس ایڈوائزر سے چیک کریں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:strn@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:ntn@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:fbr-pos@ur', kind: 'RELATED' },
    { ref: 'TOOL:gst-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 91,
  origin: 'translation of content/glossary/tax.ts, sales-tax (26 Oct 2026)',
  evidence: ['apps/web/src/modules/tax/TaxPage.tsx', 'apps/web/src/modules/tax/components/MonthlyReportView.tsx'],
  sources: [
    {
      title: 'FBR: Sales Tax Basics',
      url: 'https://fbr.gov.pk/sales-tax-basics/51148/101149',
      publisher: 'Federal Board of Revenue',
      accessedAt: '2026-10-26',
    },
    {
      title: 'FBR: Acts, Rules and Ordinances',
      url: 'https://fbr.gov.pk/act-rules-ordinances/131226',
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
