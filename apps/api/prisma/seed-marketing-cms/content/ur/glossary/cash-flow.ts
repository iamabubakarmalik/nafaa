/** Urdu: Glossary term cash flow (/ur/glossary/cash-flow). Translation of content/glossary/money.ts (cash-flow). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'cash-flow',
  title: 'کیش فلو (Cash Flow)',
  seoTitle: 'کیش فلو (Cash Flow) کیا ہے؟ مطلب اور مثال',
  summary: 'کیش فلو کسی مدت میں کاروبار میں پیسے آنے اور جانے کا حساب ہے، جو بتاتا ہے کہ بل وقت پر ادا کرنے کے لیے کیش موجود ہے یا نہیں۔',
  data: {
    term: 'کیش فلو (Cash Flow)',
    definition: 'کیش فلو کسی مدت میں کاروبار میں پیسے آنے اور جانے کا حساب ہے، جو بتاتا ہے کہ بل وقت پر ادا کرنے کے لیے کیش موجود ہے یا نہیں۔',
    definitionRomanUrdu: 'Cash flow karobar me paise aane aur jaane ka hisaab hai, jo batata hai ke bill waqt par dene ke liye cash hai ya nahi.',
    example: 'ایک ہول سیلر نے نومبر میں اچھا پرافٹ کمایا، مگر اسے سردیوں کے اسٹاک کے لیے سپلائرز کو 1.8 ملین روپے ایڈوانس دینے پڑے، جبکہ 1.1 ملین ادھار میں پھنسا ہوا تھا۔ پرافٹ مثبت تھا، مگر کیش فلو منفی۔',
    alsoKnownAs: ['پیسے کی آمد و رفت', 'paise ki aamad o raft', 'cash flow statement'],
  },
  blocks: [
    {
      id: 'b659fb9be044',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پرافٹ اور کیش ایک چیز نہیں۔ پرافٹ سیل ہوتے ہی بنتا ہے؛ کیش تب آتا ہے جب گاہک پیسے دیتا ہے۔ آج خریدا گیا اسٹاک، گاہکوں کو دیا گیا ادھار، سپلائرز سے ملا ادھار اور قرض کی قسطیں، سب کیش کو ہلاتے ہیں مگر پرافٹ کو نہیں بدلتے۔ اسی لیے بڑھتی ہوئی دکان کے پاس بھی پیسے ختم ہو سکتے ہیں۔

کیش فلو ہر ہفتے دیکھیں: اندر آنے والا کیش سیل اور کھاتے کی وصولی سے، باہر جانے والا کیش سپلائرز، تنخواہوں، کرائے اور مالک کی طرف۔ موسمی رش کے لیے پہلے سے پلان کریں، جیسے عید یا اسکول سیزن کی خریداری، جب اسٹاک بکنے سے کئی ہفتے پہلے اس کی ادائیگی کرنی پڑتی ہے۔

## Nafaa میں

Nafaa کے P&L پیج پر کیش اِن اور کیش آؤٹ کا ویو ہے۔ شاپ اکاؤنٹس ہر اکاؤنٹ (کیش، بینک، کارڈ، JazzCash، Easypaisa) میں آنے اور جانے والے پیسے، اصل بیلنس، دکان کے پاس کیا ہے اور اس نے کس کو کیا دینا ہے، اور ہر لین دین کا لیجر دکھاتا ہے۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:profit-and-loss@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:udhaar@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:petty-cash@ur', kind: 'RELATED' },
    { ref: 'BLOG_POST:cash-vs-credit-sales@ur', kind: 'RELATED' },
  ],
  sortOrder: 11,
  origin: 'translation of content/glossary/money.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/reports/pnl',
    'apps/web/src/modules/finance/money',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
