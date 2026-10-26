/** Urdu: Glossary term FBR POS integration (/ur/glossary/fbr-pos). Translation of content/glossary/tax.ts (fbr-pos). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'fbr-pos',
  title: 'FBR POS انٹیگریشن (FBR POS Integration)',
  seoTitle: 'FBR POS انٹیگریشن (FBR POS Integration) کیا ہے؟',
  summary:
    'FBR POS انٹیگریشن ریٹیلر کے پوائنٹ آف سیل اور فیڈرل بورڈ آف ریونیو کے درمیان لائیو رابطہ ہے، تاکہ ہر سیل انوائس FBR کو رپورٹ ہو اور اس پر FBR انوائس نمبر اور QR کوڈ ہو۔',
  seoDescription:
    'FBR POS انٹیگریشن ریٹیلر کے POS کو FBR سے جوڑتی ہے، تاکہ ہر سیل انوائس لائیو رپورٹ ہو اور اس پر FBR انوائس نمبر اور QR کوڈ ہو۔',
  data: {
    term: 'FBR POS انٹیگریشن (FBR POS Integration)',
    definition:
      'FBR POS انٹیگریشن ریٹیلر کے پوائنٹ آف سیل اور فیڈرل بورڈ آف ریونیو کے درمیان لائیو رابطہ ہے، تاکہ ہر سیل انوائس FBR کو رپورٹ ہو اور اس پر FBR انوائس نمبر اور QR کوڈ ہو۔',
    definitionRomanUrdu:
      'FBR POS integration ka matlab hai dukaan ka POS FBR se juda ho, taake har bill FBR ko jaye aur us par FBR invoice number aur QR code ho.',
    example:
      'ایک چین اسٹور کا کاؤنٹر بل بناتا ہے۔ POS اسے FBR کو بھیجتا ہے، FBR انوائس نمبر لیتا ہے، اور اسے QR کوڈ کے ساتھ پرنٹ کرتا ہے۔ گاہک FBR کی تصدیق والی سروس سے انوائس چیک کر سکتا ہے۔',
    alsoKnownAs: ['ایف بی آر POS', 'FBR POS', 'FBR integration', 'POS integration', 'FBR invoice', 'FBR انوائس'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'bcc5167d0f6a',
      markdown: `## یہ کیسے کام کرتا ہے

جو ریٹیلرز Tier-1 کیٹیگری میں آتے ہیں، انہیں Sales Tax Rules, 2006 کے تحت ہر سیل ایک انٹیگریٹڈ POS کے ذریعے اسی وقت FBR کو رپورٹ کرنی ہوتی ہے۔ ہر POS ٹرمینل FBR کے پاس رجسٹر ہوتا ہے، اور بھیجی گئی ہر انوائس کو ایک فِسکل نمبر ملتا ہے۔ انٹیگریٹڈ POS سے جاری ہونے والی ہر انوائس پر FBR ایک چھوٹی سروس فیس لیتا ہے (S.R.O. 1279(I)/2021 کے تحت فی انوائس ایک روپیہ، جیسا کہ FBR کے POS صفحے پر درج ہے)، اور FBR انوائس رکھنے والے گاہکوں کے لیے انعامی اسکیم بھی چلاتا ہے۔

اگر انٹرنیٹ چلا جائے تو POS کو انوائسز محفوظ رکھنی چاہییں اور کنکشن واپس آتے ہی بھیج دینی چاہییں، تاکہ کوئی بل رپورٹ ہونے سے نہ رہ جائے۔

## Nafaa میں

Nafaa اپنے Tax صفحے سے اختیاری FBR اور صوبائی انٹیگریشن دیتا ہے: ہر کاؤنٹر کا POS ID برانچ کے حساب سے رکھا جاتا ہے، بھیجا گیا ہر بل اپنا فِسکل نمبر، QR اور FBR کا جواب دکھاتا ہے، اور ناکام بل دوبارہ بھیجے جا سکتے ہیں۔ دیکھیں [FBR انٹیگریشن](/ur/product/fbr)۔

## سرکاری ذریعہ

[FBR: Point of Sale legal provisions](https://fbr.gov.pk/pos-legal-provisions/163085/163086) اور [POS invoice verification](https://fbr.gov.pk/pos-invoice-verification/163085/163142)۔ شرحیں، حدیں اور تاریخیں Finance Acts اور S.R.O.s کے ساتھ بدلتی رہتی ہیں؛ موجودہ صورتحال اتھارٹی یا ٹیکس ایڈوائزر سے چیک کریں۔`,
    },
  ],
  relations: [
    { ref: 'PRODUCT:fbr@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sales-tax@ur', kind: 'RELATED' },
    { ref: 'SERVICE:fbr-integration-setup@ur', kind: 'RELATED' },
  ],
  sortOrder: 35,
  origin: 'translation of content/glossary/tax.ts, fbr-pos (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/tax/TaxPage.tsx',
    'apps/web/src/integrations/fbr',
    'apps/web/src/modules/tax/components/SettingsView.tsx',
  ],
  sources: [
    {
      title: 'FBR: Point of Sale legal provisions',
      url: 'https://fbr.gov.pk/pos-legal-provisions/163085/163086',
      publisher: 'Federal Board of Revenue',
      accessedAt: '2026-10-26',
    },
    {
      title: 'FBR: POS invoice verification',
      url: 'https://fbr.gov.pk/pos-invoice-verification/163085/163142',
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
