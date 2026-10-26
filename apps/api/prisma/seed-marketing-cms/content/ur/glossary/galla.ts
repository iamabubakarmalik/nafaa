/** Urdu: Glossary term galla (/ur/glossary/galla). Translation of content/glossary/counter.ts (galla). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'galla',
  title: 'گلہ (Galla)',
  seoTitle: 'گلہ (Galla) کیا ہے؟ مطلب اور مثال',
  summary:
    'گلہ دکان کے کاؤنٹر کا کیش باکس یا دراز ہے جس میں دن بھر کی کیش سیل رکھی جاتی ہے اور جس سے گاہک کو بقایا دیا جاتا ہے۔',
  seoDescription:
    'گلہ دکان کے کاؤنٹر کا کیش دراز ہے جس میں دن کی کیش سیل رکھی جاتی ہے اور بقایا دیا جاتا ہے۔ جانیں دکانیں روز گلہ کیسے گنتی اور بند کرتی ہیں۔',
  data: {
    term: 'گلہ (Galla)',
    definition:
      'گلہ دکان کے کاؤنٹر کا کیش باکس یا دراز ہے جس میں دن بھر کی کیش سیل رکھی جاتی ہے اور جس سے گاہک کو بقایا دیا جاتا ہے۔',
    definitionRomanUrdu:
      'Galla counter ka woh dabba ya drawer hai jis me din bhar ka cash rakha jata hai aur jis se change diya jata hai.',
    example:
      'ایک جنرل اسٹور صبح گلے میں 3,000 روپے کھلے پیسے رکھ کر شروع کرتا ہے۔ رات کو مالک 48,600 روپے گنتا ہے، جبکہ بل کہتے ہیں کہ 46,100 روپے کی کیش سیل ہوئی، اس لیے 500 روپے کم ہیں۔',
    alsoKnownAs: ['گلہ', 'گلا', 'galla', 'gallah', 'کیش باکس', 'cash box', 'till'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'b3ae156c2763',
      markdown: `## یہ کیسے کام کرتا ہے

زیادہ تر پاکستانی دکانوں میں گلہ ہی کیش پر واحد کنٹرول ہوتا ہے: مالک یا گھر کا کوئی بھروسے والا فرد اس پر بیٹھتا ہے، اور رات کو کیش گن کر گھر لے جایا جاتا ہے۔ مسئلہ تب شروع ہوتا ہے جب ایک سے زیادہ لوگ اسے سنبھالیں۔ چائے، سپلائر کے رائیڈر یا گاہک کی واپسی کے لیے پیسے نکلتے ہیں اور کوئی لکھتا نہیں، اس لیے رات کی گنتی کبھی نہیں ملتی اور کوئی نہیں بتا سکتا کیوں۔

ایک سادہ معمول زیادہ تر مسئلہ حل کر دیتا ہے۔ دکان کھولتے وقت کھلے پیسے گنیں، کیش کی ہر ادائیگی اسی وقت لکھیں، اور بند کرتے وقت گنتی کو اس سے ملائیں جو بل کہتے ہیں کہ ہونا چاہیے۔ روز تھوڑا سا فرق عام بات ہے؛ بار بار ایک جیسا فرق خطرے کی نشانی ہے۔

## Nafaa میں

Nafaa کا Cash register صفحہ ہر گلے کو شفٹوں والا ایک کیش دراز مانتا ہے۔ شفٹ گنے ہوئے کھلے پیسوں (float) سے کھلتی ہے، کیش اندر یا باہر جائے تو وجہ کے ساتھ لکھا جاتا ہے، اور بند کرتے وقت متوقع کیش گنتی کے سامنے دکھتا ہے، کم یا زیادہ کے ساتھ، اور فرق ہو تو اس کی وجہ کے ساتھ۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:z-report@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:pos@ur', kind: 'RELATED' },
    { ref: 'TEMPLATE:daily-cash-closing-sheet@ur', kind: 'RELATED' },
  ],
  sortOrder: 39,
  origin: 'translation of content/glossary/counter.ts, galla (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx',
    'apps/web/src/modules/finance/cash-register/components/OpenShiftModal.tsx',
    'apps/web/src/modules/finance/cash-register/components/CloseShiftModal.tsx',
    'apps/web/src/modules/finance/cash-register/components/CashMoveModal.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
