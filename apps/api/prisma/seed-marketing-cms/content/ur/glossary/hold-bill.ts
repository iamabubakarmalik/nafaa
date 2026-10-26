/** Urdu: Glossary term hold bill (/ur/glossary/hold-bill). Translation of content/glossary/counter.ts (hold-bill). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'hold-bill',
  title: 'بل ہولڈ کرنا (Hold Bill)',
  seoTitle: 'بل ہولڈ کرنا (Hold Bill) کیا ہے؟ مطلب اور مثال',
  summary: 'بل ہولڈ کرنے کا مطلب ہے کاؤنٹر پر ادھورا بل ایک طرف رکھ دینا، تاکہ کیشیئر اگلے گاہک کو نمٹا سکے اور پہلا بل بعد میں دوبارہ کھول سکے۔',
  data: {
    term: 'بل ہولڈ کرنا (Hold Bill)',
    definition: 'بل ہولڈ کرنے کا مطلب ہے کاؤنٹر پر ادھورا بل ایک طرف رکھ دینا، تاکہ کیشیئر اگلے گاہک کو نمٹا سکے اور پہلا بل بعد میں دوبارہ کھول سکے۔',
    definitionRomanUrdu: 'Bill hold karna matlab adhoora bill side par rakh dena, taake agle gahak ko serve kiya ja sake aur pehla bill baad me wapas khola ja sake.',
    example: 'گروسری اسٹور پر ایک خاتون کو یاد آتا ہے کہ وہ دودھ لینا بھول گئی ہیں۔ کیشیئر ان کا بل ہولڈ کرتا ہے، قطار میں کھڑے دو لوگوں کو نمٹاتا ہے، پھر جب وہ واپس آتی ہیں تو ان کا بل دوبارہ کھول کر دودھ شامل کر دیتا ہے۔',
    alsoKnownAs: ['بل ہولڈ', 'park sale', 'suspend bill', 'hold cart'],
  },
  blocks: [
    {
      id: 'bfbd30e73939',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

پاکستان میں رش والے کاؤنٹر پر کم ہی ایک وقت میں ایک گاہک ہوتا ہے۔ کوئی گاہک ایک اور چیز لینے جاتا ہے، گھر فون کر کے پوچھتا ہے کہ کیا چاہیے، یا سیلز مین کا انتظار کرتا ہے جو گودام سے سائز لا رہا ہے۔ ہولڈ کا آپشن نہ ہو تو کیشیئر یا تو سب کو انتظار کرواتا ہے یا بل کینسل کر کے دوبارہ ٹائپ کرتا ہے، اور یہیں سے غلطیاں ہوتی ہیں اور چیزیں گم ہوتی ہیں۔

ہولڈ کیے گئے بل کاؤنٹر کی اسکرین پر کسی نام یا نوٹ کے ساتھ رہنے چاہییں، اور جو بل بہت دیر سے ہولڈ پر ہو اسے دکان بند کرتے وقت صاف کر دینا چاہیے، تاکہ وہ اسٹاک میں "ریزرو" بن کر نہ پڑا رہے۔

## Nafaa میں

Nafaa کاؤنٹر پر F6 دبانے سے موجودہ بل ہولڈ ہو جاتا ہے اور نیا بل کھل جاتا ہے۔ ہولڈ بلوں کی لسٹ میں ہر بل اپنی چیزوں اور ٹوٹل کے ساتھ نظر آتا ہے، دوبارہ کھولنے یا ہٹانے کے لیے تیار۔`,
    },
  ],
  relations: [
    { ref: 'GLOSSARY_TERM:pos@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:split-payment@ur', kind: 'RELATED' },
  ],
  sortOrder: 45,
  origin: 'translation of content/glossary/counter.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/modules/pos/components/PosHoldCartsModal.tsx',
    'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
