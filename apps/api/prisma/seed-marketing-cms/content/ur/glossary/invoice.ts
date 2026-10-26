/** Urdu: Glossary term invoice (/ur/glossary/invoice). Translation of content/glossary/counter.ts (invoice). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'invoice',
  title: 'انوائس (Invoice)',
  seoTitle: 'انوائس (Invoice) کیا ہے؟ مطلب اور مثال',
  summary:
    'انوائس وہ دستاویز ہے جو بیچنے والا خریدار کو دیتا ہے، جس میں دیا گیا سامان یا سروس، ان کی قیمتیں اور واجب رقم لکھی ہوتی ہے، عام طور پر ادائیگی کی شرائط کے ساتھ۔',
  data: {
    term: 'انوائس (Invoice)',
    definition:
      'انوائس وہ دستاویز ہے جو بیچنے والا خریدار کو دیتا ہے، جس میں دیا گیا سامان یا سروس، ان کی قیمتیں اور واجب رقم لکھی ہوتی ہے، عام طور پر ادائیگی کی شرائط کے ساتھ۔',
    definitionRomanUrdu:
      'Invoice woh document hai jo bechne wala khareedar ko deta hai, jis me saman ya service, qeemat aur wajib-ul-ada raqam aur payment ki shart hoti hai.',
    example:
      'ایک ہارڈویئر ڈسٹری بیوٹر ٹھیکیدار کو سیمنٹ کی 40 بوریاں دیتا ہے اور 52,000 روپے کی انوائس بناتا ہے، جو 15 دن میں ادا ہونی ہے۔ ٹھیکیدار آدھی رقم ابھی اور آدھی مقررہ تاریخ پر دیتا ہے۔',
    alsoKnownAs: ['انوائس', 'بل', 'bill', 'sales invoice', 'tax invoice'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b6d58a8cf86a',
      markdown: `## یہ کیسے کام کرتا ہے

رسید کہتی ہے "یہ ادا ہو چکا"؛ انوائس کہتی ہے "یہ آپ کے ذمے ہے"۔ پاکستان میں ہول سیل اور کاروبار سے کاروبار کی تجارت میں سامان اکثر ادھار پر جاتا ہے، اس لیے دونوں طرف حساب برابر کرنے کے لیے انوائس ہی ریکارڈ ہوتی ہے۔ اس پر بیچنے والے اور خریدار کے نام، ایک الگ نمبر، تاریخ، سامان کی لائنیں اور شرائط ہوتی ہیں، جیسے 15 یا 30 دن میں ادائیگی۔

اگر بیچنے والا سیلز ٹیکس میں رجسٹرڈ ہے، تو دوسرے کاروباروں کو دی جانے والی انوائسز کو عام طور پر سیلز ٹیکس انوائس ہونا چاہیے، ان اضافی خانوں کے ساتھ جو قانون مانگتا ہے۔ جو انوائسز ابھی ادا نہیں ہوئیں وہ دکان کی وصولیاں (receivables) ہیں؛ جو سپلائر کی انوائسز ادا نہیں ہوئیں وہ اس کی ادائیگیاں (payables) ہیں۔

## Nafaa میں

Nafaa کا بل 58 mm یا 80 mm تھرمل کاغذ پر، یا کاروباری گاہکوں کے لیے پورے صفحے کی A4 انوائس کے طور پر پرنٹ ہو سکتا ہے، اور جو بل ادا نہ ہو وہ گاہک کے کھاتے میں چلا جاتا ہے تاکہ ادا ہونے تک بقایا نظر میں رہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:receipt@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:khata@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:simple-invoice-template@ur', kind: 'RELATED' },
  ],
  sortOrder: 50,
  origin: 'translation of content/glossary/counter.ts, invoice (26 Oct 2026)',
  evidence: ['apps/web/src/core/receipt/types.ts', 'apps/web/src/modules/customers/khata'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
