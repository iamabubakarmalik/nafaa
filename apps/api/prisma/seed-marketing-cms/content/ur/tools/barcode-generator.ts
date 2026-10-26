/** Urdu: Barcode generator (/ur/tools/barcode-generator). Translation of content/tools/stock.ts (barcode-generator). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';

const faqSourceNote =
  'EAN-13 check digit and GS1 restricted range 200-299 checked against Wikipedia (International Article Number; List of GS1 country codes), Code 128 against Wikipedia, all curl 200 on 26 Oct 2026. Encoder output compared with jsbarcode 3.12.3 for EAN-13 and Code 128 samples. Nafaa claims: barcode field per product, label designer with Code 128 / EAN-13 / QR (inventory/barcodes LabelDesigner.tsx).';
const faqEvidence = [
  'apps/site/src/components/islands/tools/barcode.ts',
  'apps/web/src/modules/inventory/barcodes/components/LabelDesigner.tsx',
  'apps/web/src/modules/inventory/products/import/columns.ts',
];

const barcodeSources = [
  {
    title: 'International Article Number (EAN-13 structure and check digit)',
    url: 'https://en.wikipedia.org/wiki/International_Article_Number',
    publisher: 'Wikipedia',
    accessedAt: '2026-10-26',
  },
  {
    title: 'List of GS1 country codes (200-299: restricted circulation numbers)',
    url: 'https://en.wikipedia.org/wiki/List_of_GS1_country_codes',
    publisher: 'Wikipedia',
    accessedAt: '2026-10-26',
  },
  {
    title: 'Code 128',
    url: 'https://en.wikipedia.org/wiki/Code_128',
    publisher: 'Wikipedia',
    accessedAt: '2026-10-26',
  },
];

export const faqs: SeedFaq[] = [
  {
    key: 'ur-barcode-generator-1',
    locale: 'ur',
    topic: 'tools',
    question: 'کیا اپنی پروڈکٹس کے بارکوڈ رجسٹر کروانے ضروری ہیں؟',
    answer:
      'صرف تب جب مال دوسری دکانیں، سپر مارکیٹس یا آن لائن مارکیٹ پلیس بیچیں گی۔ انہیں ایسے نمبر چاہییں جو پوری دنیا میں ایک ہی ہوں، اور یہ GS1 Pakistan دیتا ہے۔ جو چیزیں آپ خود پیک کر کے صرف اپنی دکان پر بیچتے ہیں، جیسے تولے ہوئے ڈرائی فروٹ یا بیکری کے تھیلے، ان کے لیے 200 سے 299 والی محدود رینج کے نمبر کافی ہیں، بس ایک نمبر کبھی دو پروڈکٹس پر نہ لگائیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-barcode-generator-1',
    evidence: faqEvidence,
  },
  {
    key: 'ur-barcode-generator-2',
    locale: 'ur',
    topic: 'tools',
    question: 'دکان کے لیے EAN-13 بہتر ہے یا Code 128؟',
    answer:
      'پروڈکٹس پر EAN-13 لگائیں، کیونکہ یہ ریٹیل کا عام معیار ہے اور ہر بارکوڈ اسکینر اسے پڑھتا ہے۔ Code 128 تب لگائیں جب کوڈ میں حروف ہوں، جیسے آپ کے اپنے SKU کوڈ، یا دکان کے اندر شیلف اور خانوں کے لیبل کے لیے۔ دکانوں کے اکثر اسکینر دونوں پڑھ لیتے ہیں، اس لیے مال پر EAN-13 اور اندر کے لیبلز پر Code 128 رکھ سکتے ہیں۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-barcode-generator-2',
    evidence: faqEvidence,
  },
  {
    key: 'ur-barcode-generator-3',
    locale: 'ur',
    topic: 'tools',
    question: 'میرا پرنٹ کیا ہوا بارکوڈ اسکین کیوں نہیں ہوتا؟',
    answer:
      'عام وجوہات یہ ہیں: چھوٹے اسکیل پر پرنٹ، لکیروں کے لیے بہت چھوٹا لیبل، تھرمل ربن کا ہلکا پڑ جانا، یا لکیروں کے ساتھ سفید جگہ نہ ہونا۔ 100% اسکیل پر پرنٹ کریں، ایک قطار میں کم لیبل رکھیں، کنارے خالی رکھیں، اور پہلے ایک لیبل آزمائیں۔ EAN-13 میں نمبر بھی چیک کریں: 13واں ہندسہ غلط ہو تو اسکینر رد کر دیتا ہے، اور یہ ٹول پرنٹ سے پہلے ہی بتا دیتا ہے۔',
    sourceNote: faqSourceNote,
    origin: 'translation of faq tool-barcode-generator-3',
    evidence: faqEvidence,
  },
];

export const entry: SeedEntry = {
  type: 'TOOL',
  locale: 'ur',
  slug: 'barcode-generator',
  title: 'بارکوڈ جنریٹر',
  summary:
    'اپنی پروڈکٹس کے لیے EAN-13 یا Code 128 بارکوڈ بنائیں اور A4 پر لیبل شیٹ پرنٹ کریں، یا پیکنگ کے لیے SVG میں ڈاؤن لوڈ کریں۔ چیک ڈجٹ خود لگ جاتا ہے، دکان کے اندر والے نمبر بھرے جا سکتے ہیں، اور آپ کا لکھا کچھ بھی براؤزر سے باہر نہیں جاتا۔',
  data: {
    toolKey: 'barcode-generator',
    kind: 'بارکوڈ',
  },
  blocks: [
    {
      type: 'answerBox',
      facts: [
        { label: 'قسمیں', value: 'EAN-13 (ریٹیل پیک) اور Code 128 (SKU، حروف اور نمبر)' },
        { label: 'EAN-13 چیک ڈجٹ', value: '12 ہندسوں پر لگ جاتا ہے، 13 پر چیک ہوتا ہے' },
        { label: 'نتیجہ', value: 'پرنٹ ہونے والی A4 لیبل شیٹ (ایک قطار میں 3، 4 یا 5) اور SVG ڈاؤن لوڈ' },
        { label: 'دکان کے اندر والے نمبر', value: '200-299 والی محدود رینج سے نمبر بھر دیتا ہے' },
      ],
      romanUrdu:
        'Apne products ke liye EAN-13 ya Code 128 barcode banayein aur A4 sheet par label print karein. Aakhri check digit khud lag jata hai, aur aap ka data browser se bahar nahi jata.',
      id: 'b4998a7ab864',
    },
    {
      type: 'steps',
      heading: 'بارکوڈ جنریٹر کیسے استعمال کریں',
      items: [
        {
          title: 'قسم چنیں',
          body: 'دکان میں بکنے والی پروڈکٹس کے لیے **EAN-13**، جو اکثر اسکینر اور سپر مارکیٹس پڑھتے ہیں۔ اپنے SKU کوڈ، شیلف لیبل اور حروف والی ہر چیز کے لیے **Code 128**۔',
        },
        {
          title: 'کوڈ لکھیں، ہر لائن پر ایک',
          body: 'لکیروں کے اوپر نام یا قیمت چھاپنی ہو تو کاما لگا کر لیبل لکھیں: `200000000101, Chai 190g`۔ EAN-13 میں 12 ہندسے لکھیں، چیک ڈجٹ خود لگ جائے گا۔',
        },
        {
          title: 'ابھی نمبر نہیں؟ دکان کے اندر والے نمبر بھریں',
          body: '**دکان کے اندر والے 10 نمبر شامل کریں** کا بٹن ان چیزوں کے لیے 200-299 رینج سے نمبر بھر دیتا ہے جو آپ خود پیک کر کے لیبل لگاتے ہیں۔',
        },
        {
          title: 'کاپیاں اور ایک قطار کے لیبل رکھیں، پھر پرنٹ کریں',
          body: 'A4 اسٹیکر پیپر یا سادہ کاغذ پر 100% اسکیل پر پرنٹ کریں، یا PDF میں محفوظ کریں۔ پوری شیٹ پرنٹ کرنے سے پہلے ایک لیبل اسکین کر کے آزمائیں۔',
        },
      ],
      howTo: true,
      id: 'b7fa882711e6',
    },
    {
      type: 'richText',
      markdown:
        '## EAN-13 اور Code 128 کیسے کام کرتے ہیں\n\n**EAN-13** نمبر میں 12 ڈیٹا ہندسے اور 13واں چیک ڈجٹ ہوتا ہے۔ چیک ڈجٹ نکالنے کے لیے بائیں سے ہندسوں کو باری باری 1 اور 3 سے ضرب دیں، سب جمع کریں، اور دیکھیں کہ اگلے 10 کے پہاڑے تک پہنچنے کو کتنا چاہیے۔ 200000000101 کا یہ جوڑ 8 ہے، اس لیے چیک ڈجٹ 2 ہے اور پورا نمبر **2000000001012** بنتا ہے۔ اسکینر ہر اسکین پر یہ ہندسہ دوبارہ نکالتا ہے، اور اسی سے غلط پڑھا گیا نمبر پکڑتا ہے۔\n\nپہلے تین ہندسے GS1 پری فکس ہیں۔ 200 سے 299 سے شروع ہونے والے نمبر محدود استعمال کے نمبر ہیں: یہ کسی کے نام رجسٹر نہیں، اور صرف آپ کے اپنے کاروبار کے اندر کے لیے ہیں، جیسے کھلی چیزیں جو آپ تول کر پیک کرتے ہیں۔ جو مال آپ دوسری دکانوں یا سپر مارکیٹس کو دیتے ہیں، اس کے لیے **GS1 Pakistan** کے نمبر چاہییں تاکہ وہ ہر جگہ ایک ہی ہوں۔\n\n**Code 128** حروف، ہندسے اور نشان سب لکھ سکتا ہے، اس لیے KUR-M-WHT جیسے SKU کوڈ کے لیے ٹھیک ہے۔ جن کوڈز میں صرف نمبر ہوں، ان کے لیے جنریٹر اس کا مختصر ہندسوں والا طریقہ استعمال کرتا ہے، جس سے لیبل چھوٹے رہتے ہیں۔',
      id: 'bc5f39387e51',
    },
    {
      type: 'richText',
      markdown:
        '## ایک مثال\n\nایک بیکری رس، کیک رس اور نمکو اپنے تھیلوں میں پیک کرتی ہے۔ وہ 2000000001 سے شروع ہونے والے تین 12 ہندسوں کے نمبر لکھتی ہے، ہر ایک کے ساتھ لیبل اور قیمت، ایک قطار میں 4 لیبل اور ہر ایک کی 12 کاپیاں چنتی ہے، اور ایک A4 اسٹیکر شیٹ پر 36 لیبل پرنٹ کرتی ہے۔ کاؤنٹر کا اسکینر انہیں کسی بھی پیک شدہ پروڈکٹ کی طرح پڑھتا ہے۔\n\nNafaa میں یہی نمبر ہر پروڈکٹ پر محفوظ کر سکتے ہیں، [POS کاؤنٹر](/ur/product/pos) پر اسکین کر سکتے ہیں، اور ایپ کے اپنے [لیبل ڈیزائنر](/ur/product/inventory) سے پروڈکٹ لسٹ کے نام اور قیمت کے ساتھ شیلف اور پروڈکٹ لیبل پرنٹ کر سکتے ہیں، دوبارہ لکھے بغیر۔',
      id: 'b23ac4fa6879',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'کسی دوسری کمپنی کا بارکوڈ نقل نہ کریں',
      body: 'کسی برانڈ کا نمبر اپنے مال پر چھاپنے سے ہر اس دکان پر غلط قیمت اور غلط اسٹاک آتا ہے جہاں وہ اسکین ہو۔ اپنی دکان کے لیے اندر والے نمبر رکھیں، اور جو مال دوسروں کو بیچتے ہیں اس کے لیے GS1 میں رجسٹر نمبر۔',
      id: 'bc7b7c686a93',
    },
    {
      type: 'sources',
      heading: 'حوالے',
      items: barcodeSources,
      id: 'ba70a2f5ffe0',
    },
    {
      type: 'faq',
      heading: 'عام سوالات',
      id: 'ba3e2b7c5d32',
    },
  ],
  faqKeys: ['ur-barcode-generator-1', 'ur-barcode-generator-2', 'ur-barcode-generator-3'],
  relations: [
    { ref: 'GLOSSARY_TERM:barcode@ur', kind: 'RELATED' },
    { ref: 'GLOSSARY_TERM:sku@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:pos@ur', kind: 'RELATED' },
  ],
  seoTitle: 'فری بارکوڈ جنریٹر: EAN-13 اور Code 128 لیبل شیٹ',
  seoDescription:
    'پاکستان کی دکانوں کے لیے فری بارکوڈ جنریٹر: EAN-13 اور Code 128، خودکار چیک ڈجٹ، پرنٹ کے لیے A4 لیبل شیٹ اور SVG ڈاؤن لوڈ۔ سائن اپ کی ضرورت نہیں۔',
  focusKeyword: 'بارکوڈ جنریٹر',
  sortOrder: 60,
  featured: true,
  origin: 'translation of content/tools/stock.ts (26 Oct 2026)',
  evidence: [
    'apps/site/src/components/islands/tools/barcode.ts',
    'apps/web/src/modules/inventory/barcodes/components/LabelDesigner.tsx',
    'apps/web/src/modules/inventory/products/import/columns.ts',
  ],
  sources: barcodeSources,
  factCheck: { checkedOn: '2026-10-26', note: 'Urdu translation of the English entry; claims unchanged.' },
  dropped: [],
  needsOwner: [],
};
