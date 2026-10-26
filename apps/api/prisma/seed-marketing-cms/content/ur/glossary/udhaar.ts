/** Urdu: Glossary term udhaar (/ur/glossary/udhaar). Translation of content/glossary/money.ts (udhaar). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'udhaar',
  title: 'ادھار (Udhaar)',
  seoTitle: 'ادھار (Udhaar) کیا ہے؟ مطلب اور مثال',
  summary: 'ادھار وہ کریڈٹ ہے جو گاہک کو دیا جاتا ہے: سامان ابھی لے لیا جاتا ہے اور پیسے بعد میں دیے جاتے ہیں۔',
  seoDescription:
    'ادھار وہ کریڈٹ ہے جو گاہک کو دیا جاتا ہے: سامان ابھی، پیسے بعد میں۔ جانیں پاکستانی دکانیں کھاتے کے ذریعے ادھار کو قابو میں کیسے رکھتی ہیں۔',
  data: {
    term: 'ادھار (Udhaar)',
    definition: 'ادھار وہ کریڈٹ ہے جو گاہک کو دیا جاتا ہے: سامان ابھی لے لیا جاتا ہے اور پیسے بعد میں دیے جاتے ہیں۔',
    definitionRomanUrdu: 'Udhaar ka matlab hai saman abhi le lena aur paise baad me dena.',
    example:
      'ایک کنسٹرکشن ٹھیکیدار ہارڈویئر اسٹور سے 30,000 روپے کی فٹنگز ادھار پر لیتا ہے، اور وعدہ کرتا ہے کہ جب اس کا کلائنٹ اگلی قسط دے گا، یعنی تقریباً تین ہفتے میں، تو ادائیگی کر دے گا۔',
    alsoKnownAs: ['ادھار', 'udhar', 'udhaar', 'کریڈٹ سیل', 'credit sale', 'buy now pay later'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b066298be287',
      markdown: `## یہ کیسے کام کرتا ہے

ادھار پاکستان میں کاروبار کا حصہ ہے، محلے کی دکان سے لے کر ہول سیل مارکیٹ تک۔ اس سے مستقل گاہک اور بڑے آرڈر آتے ہیں، لیکن ادھار پر دیا گیا ہر روپیہ دکان کا اپنا ورکنگ کیپیٹل ہے جو کسی اور کی جیب میں پڑا ہے۔ بہت سی دکانیں جو پرافٹ میں لگتی ہیں، ان کے پاس کیش کم ہوتا ہے کیونکہ بہت زیادہ پیسہ ادھار میں پھنسا ہوتا ہے۔

سمجھداری کے اصول یہ ہیں: طے کریں کس کو ادھار ملے گا اور کتنا، ہر ادھار سیل اسی وقت گاہک کے نام لکھیں، ادائیگی کی تاریخ طے کریں، اور جلدی یاد دلائیں۔ ہر ہفتے سیل کے ساتھ کل باقی ادھار بھی دیکھیں۔ اگر ادھار سیل سے تیز بڑھ رہا ہے تو دکان اپنے گاہکوں کو پیسہ دے رہی ہے۔

## Nafaa میں

Nafaa کاؤنٹر پر بل پورا یا کچھ حصہ کھاتے پر ڈالا جا سکتا ہے۔ جو حصہ ادا نہ ہو وہ بل کے ساتھ گاہک کے کھاتے میں چلا جاتا ہے۔ جو بل گاہک کو اس کی ادھار کی حد سے اوپر لے جائے، اس کے لیے مینیجر کا PIN چاہیے، اور گاہکوں کی فہرست بقایا کے حساب سے اور اس حساب سے ترتیب دی جا سکتی ہے کہ کتنی دیر سے واجب ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:khata@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:khata@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar@ur', kind: 'RELATED' },
    { ref: 'TOOL:khata-ageing-calculator@ur', kind: 'RELATED' },
  ],
  sortOrder: 111,
  origin: 'translation of content/glossary/money.ts, udhaar (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/customers/khata',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/modules/customers/directory/api.ts',
    'apps/api/src/modules/sales/sales/sales.service.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
