/** Urdu: Glossary term multi-branch management (/ur/glossary/multi-branch). Translation of content/glossary/counter.ts (multi-branch). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

export const faqs: SeedFaq[] = [];

export const entry: SeedEntry = {
  type: 'GLOSSARY_TERM',
  locale: 'ur',
  slug: 'multi-branch',
  title: 'ملٹی برانچ مینجمنٹ (Multi-Branch Management)',
  seoTitle: 'ملٹی برانچ مینجمنٹ (Multi-Branch Management) کیا ہے؟',
  summary: 'ملٹی برانچ مینجمنٹ کا مطلب ہے کئی دکانیں یا آؤٹ لیٹس ایک سسٹم سے چلانا، جہاں ہر برانچ کا اسٹاک، کیش اور سیل الگ رہے مگر سب ایک جگہ نظر آئے۔',
  data: {
    term: 'ملٹی برانچ مینجمنٹ (Multi-Branch Management)',
    definition: 'ملٹی برانچ مینجمنٹ کا مطلب ہے کئی دکانیں یا آؤٹ لیٹس ایک سسٹم سے چلانا، جہاں ہر برانچ کا اسٹاک، کیش اور سیل الگ رہے مگر سب ایک جگہ نظر آئے۔',
    definitionRomanUrdu: 'Multi-branch management matlab kai dukaanein ek system se chalana, jahan har branch ka stock, cash aur sale alag rahe magar ek jagah nazar aaye.',
    example: 'موبائل ایکسسریز کے ایک کاروبار کے تین آؤٹ لیٹس حفیظ سینٹر، لبرٹی اور جوہر ٹاؤن میں ہیں۔ مالک دیکھتا ہے کہ اس ہفتے کس برانچ نے سب سے زیادہ بیچا، اور آہستہ بکنے والے چارجر لبرٹی سے جوہر ٹاؤن بھیج دیتا ہے۔',
    alsoKnownAs: ['کئی برانچیں', 'multi-shop', 'multi-store', 'chain store management', 'multi-location'],
  },
  blocks: [
    {
      id: 'bd53c898f381',
      type: 'richText',
      markdown: `## یہ کیسے کام کرتا ہے

ایک دکان سے دو دکانوں پر جانا وہ مرحلہ ہے جہاں بہت سے پاکستانی کاروبار قابو کھو دیتے ہیں: مالک دونوں کاؤنٹرز پر نہیں ہو سکتا، ہر جگہ اسٹاک الگ طریقے سے گنا جاتا ہے، اور کیش مختلف لوگ گھر بھیجتے ہیں۔ ملٹی برانچ سسٹم میں پروڈکٹ لسٹ اور پرائس لسٹ ایک ہوتی ہے، مگر اسٹاک اور کیش ہر برانچ کا الگ، اور اسٹاف صرف اسی برانچ تک محدود جہاں وہ کام کرتا ہے۔

کام کی رپورٹس وہ ہیں جو برانچوں کا موازنہ کریں: سیل، پرافٹ، اسٹاک ویلیو، آہستہ بکنے والی چیزیں اور کیش کی کمی۔ برانچوں کے درمیان اسٹاک کی آمد و رفت ٹرانسفر کے طور پر درج ہونی چاہیے، تاکہ کسی برانچ کی گنتی غلط نہ ہو۔

## Nafaa میں

Nafaa سب برانچوں کو ایک اکاؤنٹ میں رکھتا ہے: برانچ اینالیٹکس، ہر برانچ کا اسٹاک، ایسے ٹرانسفر جو درج کرتے ہیں کہ کیا بھیجا گیا اور اصل میں کیا پہنچا، اور ایسا اسٹاف جسے ایک برانچ سے جوڑا جا سکتا ہے تاکہ وہ صرف اسی کا ڈیٹا دیکھے۔`,
    },
  ],
  relations: [
    { ref: 'PRODUCT:multi-shop@ur', kind: 'RELATED' },
    { ref: 'SOLUTION:retail-chains@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:z-report@ur', kind: 'RELATED' },
  ],
  sortOrder: 64,
  origin: 'translation of content/glossary/counter.ts (26 Oct 2026)',
  evidence: [
    'apps/web/src/app/shell/navigation/nav-config.ts',
    'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx',
  ],
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
