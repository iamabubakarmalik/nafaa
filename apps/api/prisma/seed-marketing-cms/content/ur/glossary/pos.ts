/** Urdu: Glossary term POS (/ur/glossary/pos). Translation of content/glossary/counter.ts (pos). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'pos',
  title: 'POS (پوائنٹ آف سیل)',
  seoTitle: 'POS (پوائنٹ آف سیل) کیا ہے؟ مطلب اور مثال',
  summary:
    'پوائنٹ آف سیل وہ جگہ ہے جہاں سیل مکمل ہوتی ہے: چیزیں اسکین یا منتخب ہوتی ہیں، ادائیگی لی جاتی ہے اور رسید دی جاتی ہے۔',
  seoDescription:
    'پوائنٹ آف سیل (POS) وہ جگہ ہے جہاں سیل مکمل ہوتی ہے: چیزیں اسکین ہوتی ہیں، ادائیگی لی جاتی ہے اور رسید ملتی ہے۔ جانیں POS سافٹ ویئر دکان کے لیے کیا کرتا ہے۔',
  data: {
    term: 'POS (پوائنٹ آف سیل)',
    definition:
      'پوائنٹ آف سیل وہ جگہ ہے جہاں سیل مکمل ہوتی ہے: چیزیں اسکین یا منتخب ہوتی ہیں، ادائیگی لی جاتی ہے اور رسید دی جاتی ہے۔',
    definitionRomanUrdu:
      'POS woh jagah ya system hai jahan sale mukammal hoti hai: cheezein scan hoti hain, payment li jati hai aur raseed di jati hai.',
    example:
      'کریانہ اسٹور بسکٹ کا ایک پیکٹ اور تیل کی ایک بوتل اسکین کرتا ہے، اسکرین پر ٹوٹل آ جاتا ہے، گاہک کچھ کیش اور کچھ JazzCash سے ادا کرتا ہے، اور کاؤنٹر بل پرنٹ کر دیتا ہے۔',
    alsoKnownAs: ['پوائنٹ آف سیل', 'point of sale', 'بلنگ سسٹم', 'billing software', 'کاؤنٹر سافٹ ویئر'],
  },
  blocks: [
    {
      type: 'richText',
      id: 'bad54672599e',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستانی دکان میں POS عام طور پر کاؤنٹر پر ایک کمپیوٹر یا ٹیبلٹ، ایک بارکوڈ اسکینر اور ایک چھوٹا تھرمل پرنٹر ہوتا ہے، اور اس کے نیچے گلہ (کیش باکس)۔ سافٹ ویئر قیمتوں کی فہرست رکھتا ہے، ٹوٹل نکالتا ہے، لکھتا ہے کہ بل کیسے ادا ہوا، اور بکی ہوئی چیزیں اسٹاک سے نکال دیتا ہے۔ ہر بل محفوظ ہوتا ہے، اس لیے مالک دن کی سیل، پرافٹ اور دراز میں کیش دیکھ سکتا ہے، رجسٹر ہاتھ سے جوڑے بغیر۔

اچھا POS وہ کام بھی سنبھالتا ہے جو رش والے کاؤنٹر پر ہوتے ہیں: گاہک جو ادھار چاہتا ہے، بل جو روک لیا جائے جب تک کوئی ایک اور چیز لا رہا ہے، کل کی کوئی واپسی، یا سیل کے بیچ میں بجلی چلی جانا۔

## Nafaa میں

Nafaa کاؤنٹر پورا کی بورڈ سے چلتا ہے: تلاش، مقدار بدلنا، گاہک ڈالنا، ڈسکاؤنٹ، بل روکنا اور ادائیگی، سب ماؤس کے بغیر، اور ? کی دبانے سے شارٹ کٹ کی فہرست کھلتی ہے۔ دکانیں اپنا لے آؤٹ چنتی ہیں (Classic، Express، Cart-focus یا Touch)، ایک بل کی ادائیگی کئی طریقوں میں لیتی ہیں، بل کھاتے پر ڈالتی ہیں اور انٹرنیٹ کے بغیر بھی بل بناتی رہتی ہیں۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:galla@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:receipt@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
  ],
  sortOrder: 74,
  origin: 'translation of content/glossary/counter.ts, pos (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/pos',
    'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx',
    'apps/web/src/modules/pos/components/PosSplitTender.tsx',
    'apps/web/src/modules/pos/components/PosHoldCartsModal.tsx',
    'apps/web/src/core/lib/offline/db.ts',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
