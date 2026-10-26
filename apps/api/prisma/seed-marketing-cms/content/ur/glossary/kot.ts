/** Urdu: Glossary term KOT (/ur/glossary/kot). Translation of content/glossary/food-health.ts (kot). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'kot',
  title: 'KOT (کچن آرڈر ٹکٹ)',
  seoTitle: 'KOT (کچن آرڈر ٹکٹ) کیا ہے؟ مطلب اور مثال',
  summary: 'KOT وہ ٹکٹ ہے، پرنٹ شدہ یا اسکرین پر، جو کچن کو بتاتا ہے کہ کسی آرڈر میں کیا پکانا ہے۔',
  seoDescription: 'KOT (کچن آرڈر ٹکٹ) کچن کو بتاتا ہے کہ آرڈر میں کیا پکانا ہے، کاغذ پر یا اسکرین پر۔ ریسٹورنٹ ہر اسٹیشن تک KOT کیسے بھیجتے ہیں، یہاں پڑھیں۔',
  data: {
    term: 'KOT (کچن آرڈر ٹکٹ)',
    definition: 'KOT وہ ٹکٹ ہے، پرنٹ شدہ یا اسکرین پر، جو کچن کو بتاتا ہے کہ کسی آرڈر میں کیا پکانا ہے۔',
    definitionRomanUrdu: 'KOT woh parchi ya screen hai jo kitchen ko batati hai ke order me kya pakana hai.',
    example: 'ایک ویٹر ٹیبل 7 کا آرڈر لیتا ہے: دو چکن کڑاہی، چھ نان اور تین ڈرنکس۔ کڑاہی مین کچن کے KOT پر جاتی ہے، نان تندور پر، اور ڈرنکس کاؤنٹر پر۔',
    alsoKnownAs: ['کچن پرچی', 'kitchen order ticket', 'kitchen ticket', 'order slip', 'kitchen parchi'],
  },
  blocks: [
    {
      id: 'b8c3f520dfce',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

KOT کے بغیر آرڈر کچن تک آواز لگا کر یا ہاتھ سے لکھی پرچیوں سے پہنچتے ہیں، جس سے ڈشیں بھول جاتی ہیں، غلط چیزیں بنتی ہیں، اور اس پر بحث ہوتی ہے کہ آرڈر کیا تھا۔ POS کے ساتھ ویٹر آرڈر ایک بار درج کرتا ہے، اور ہر اس اسٹیشن کو ٹکٹ جاتا ہے جسے کچھ تیار کرنا ہے، ٹیبل یا ٹوکن نمبر، وقت اور "کم مرچ" جیسے نوٹس کے ساتھ۔

جب ٹیبل مزید کھانا منگوائے تو کچن کو صرف نئی چیزیں جانی چاہییں، پورا آرڈر دوبارہ نہیں۔ کینسل ہونے والی ڈش کا صاف کینسل ٹکٹ جانا چاہیے تاکہ کچن اسے پکانا بند کر دے۔ KOT مالک کو بھی بچاتا ہے: کچن سے کھانا صرف ٹکٹ کے بدلے نکلتا ہے، اس لیے کوئی ڈش بغیر بل کے باہر نہیں جا سکتی۔

## Nafaa میں

Nafaa کا ریسٹورنٹ پیک ہر اسٹیشن کو الگ KOT بھیجتا ہے، اور جب ٹیبل مزید آرڈر کرے تو صرف نئی چیزیں جاتی ہیں۔ ٹکٹ پرنٹ بھی ہو سکتے ہیں اور کچن ڈسپلے پر بھی دکھ سکتے ہیں، اور جو ڈش کچن پکا چکا ہو اسے void کرنے کے لیے وجہ اور PIN چاہیے۔`,
    },
  ],
  relations: [
    { ref: 'INDUSTRY:restaurant@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:restaurants@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:recipe-costing@ur', kind: 'RELATED' },
  ],
  sortOrder: 54,
  origin: 'translation of content/glossary/food-health.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
    'apps/web/src/industries/restaurant/pages/StationsPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
