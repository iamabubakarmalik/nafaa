/** Urdu: Glossary term receipt (/ur/glossary/receipt). Translation of content/glossary/counter.ts (receipt). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'receipt',
  title: 'رسید (Receipt)',
  seoTitle: 'رسید (Receipt) کیا ہے؟ مطلب اور مثال',
  summary:
    'رسید وہ پرچی ہے جو گاہک کو ادائیگی کے ثبوت کے طور پر دی جاتی ہے، جس میں خریدا گیا سامان، قیمتیں، کوئی ڈسکاؤنٹ، ٹوٹل اور ادائیگی کا طریقہ لکھا ہوتا ہے۔',
  data: {
    term: 'رسید (Receipt)',
    definition:
      'رسید وہ پرچی ہے جو گاہک کو ادائیگی کے ثبوت کے طور پر دی جاتی ہے، جس میں خریدا گیا سامان، قیمتیں، کوئی ڈسکاؤنٹ، ٹوٹل اور ادائیگی کا طریقہ لکھا ہوتا ہے۔',
    definitionRomanUrdu:
      'Receipt (raseed) woh parchi hai jo gahak ko payment ke saboot ke taur par di jati hai, jis me saman, qeemat, discount, total aur payment ka tareeqa hota hai.',
    example:
      'جوتوں کی دکان کی رسید پر دکان کا نام اور فون، بل نمبر، تاریخ، سائز کے ساتھ دو جوڑے، ایک ڈسکاؤنٹ، ٹوٹل، "ادا شدہ: کیش 4,000، Easypaisa 2,500"، تبدیلی کی پالیسی اور ادائیگی کے لیے QR کوڈ ہوتا ہے۔',
    alsoKnownAs: ['رسید', 'raseed', 'بل', 'bill', 'sales receipt', 'کیش میمو', 'cash memo'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b6085e8805d5',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں گاہک اکثر "بل" اور "رسید" ایک ہی چیز کو کہتے ہیں۔ دکان کے لیے رسید ہی واپسی اور تبدیلی کو منصفانہ بناتی ہے: بل نمبر چیز، تاریخ اور قیمت کو جوڑ دیتا ہے، اس لیے اسٹاف کو یادداشت سے بحث نہیں کرنی پڑتی۔ صاف رسید پر واپسی کی پالیسی اور دکان کا رابطہ نمبر بھی ہوتا ہے، جس سے گاہک دوبارہ آتے ہیں۔

زیادہ تر کاؤنٹر 58 mm یا 80 mm تھرمل کاغذ پر پرنٹ کرتے ہیں۔ اب بہت سی دکانیں بل واٹس ایپ پر بھی بھیجتی ہیں، جو گاہک سے گم نہیں ہوتا۔ سیلز ٹیکس انوائس قانونی خانوں والی زیادہ سخت دستاویز ہے؛ عام رسید میں ان کی ضرورت نہیں، جب تک دکان رجسٹرڈ نہ ہو اور قانون نہ مانگے۔

## Nafaa میں

Nafaa کا ہر بل ایک ہی رسید انجن سے پرنٹ ہوتا ہے، اس لیے لے آؤٹ، لوگو، فوٹر اور ادائیگی کی لائنیں سیٹنگز میں ایک بار رکھی جاتی ہیں اور ہر انڈسٹری میں وہی چلتی ہیں۔ ایک بل کی کئی طریقوں والی ادائیگی حصہ بہ حصہ لکھی جاتی ہے، اور دکان کا ادائیگی والا QR بل پر پرنٹ ہو سکتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:invoice@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:refund@ur', kind: 'RELATED' },
    { ref: 'TOOL:receipt-maker@ur', kind: 'RELATED' },
  ],
  sortOrder: 85,
  origin: 'translation of content/glossary/counter.ts, receipt (26 Oct 2026)',
  evidence: ['apps/web/src/core/receipt', 'apps/web/src/core/payments/payQr.ts'],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
