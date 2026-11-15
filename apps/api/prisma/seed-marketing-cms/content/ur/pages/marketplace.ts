/** Urdu: Nafaa Market marketplace page (/ur/marketplace). Translation of content/main-pages/pages.ts (marketplace). */
import type { SeedEntry, SeedFaq } from '../../../lib/types';
import { SHOT } from '../../main-pages/_build';

export const faqs: SeedFaq[] = [
  {
    key: 'ur-page-marketplace-what',
    locale: 'ur',
    topic: 'marketplace',
    question: 'Nafaa Market کیا ہے؟',
    answer:
      'Nafaa Market وہ مارکیٹ پلیس ہے جو Nafaa بنا رہا ہے، اور یہ ابھی کھلی نہیں ہے۔ جب کھلے گی تو خریدار Nafaa استعمال کرنے والی دکانوں کا سامان دیکھ کر آرڈر کریں گے۔ آپ خود چنیں گے کہ کون سی پروڈکٹس لگانی ہیں، ان کی قیمت اور اسٹاک آپ کے Nafaa اکاؤنٹ سے آئیں گے، اور آرڈر اسی ایپ میں آئیں گے جس میں آپ کی کاؤنٹر سیل اور آن لائن آرڈر آتے ہیں۔',
    sourceNote: 'apps/marketplace (buyer app); apps/api/src/marketplace (publishing, orders); apps/web/src/marketplace (seller screens).',
    origin: 'translation of faq mp-bazaar-what',
    evidence: [
      'apps/marketplace',
      'apps/api/src/marketplace/publishing',
      'apps/api/src/marketplace/orders',
      'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx',
    ],
  },
  {
    key: 'ur-page-marketplace-delivery',
    locale: 'ur',
    topic: 'marketplace',
    question: 'Nafaa Market کے آرڈر کی ڈیلیوری کون کرتا ہے؟',
    answer:
      'Nafaa Market ابھی کھلی نہیں ہے۔ جب کھلے گی تو ڈیلیوری آپ خود اپنے رائیڈرز کے ساتھ کریں گے: Nafaa میں رائیڈرز شامل کریں گے، دیکھیں گے کون فارغ ہے اور کون ڈیلیوری پر ہے، اور آرڈر ان کے حوالے کریں گے۔ آرڈر اور اس کی رقم اسی ایپ میں رہیں گے جس میں آپ کی کاؤنٹر سیل ہوتی ہے۔',
    sourceNote: 'MarketplaceDeliveryPage (riders and statuses); RiderTrackingPage.',
    origin: 'translation of faq hub-bazaar-delivery',
    evidence: ['apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx', 'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx'],
  },
  {
    key: 'ur-page-marketplace-who',
    locale: 'ur',
    topic: 'marketplace',
    question: 'کیا کوئی بھی دکان Nafaa Market پر بیچ سکتی ہے؟',
    answer:
      'Nafaa Market ابھی کھلی نہیں ہے۔ جب کھلے گی تو یہ ان دکانوں کے لیے ہو گی جو Nafaa پر چلتی ہیں، کیونکہ لسٹنگ، قیمت اور اسٹاک آپ کے Nafaa اکاؤنٹ سے آئیں گے۔ ابھی فری ٹرائل شروع کریں اور اپنی پروڈکٹس ڈالیں، تاکہ کھلتے ہی آپ کی دکان تیار ہو۔ جو پروڈکٹس آپ نہیں لگائیں گے وہ صرف آپ کے کاؤنٹر تک رہیں گی۔',
    sourceNote: 'Marketplace publishing reads the tenant catalogue.',
    origin: 'translation of faq hub-bazaar-who',
    evidence: ['apps/api/src/marketplace/publishing', 'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx'],
  },
  {
    key: 'ur-page-marketplace-stock',
    locale: 'ur',
    topic: 'solutions',
    question: 'کیا Nafaa Market، میرا آن لائن اسٹور اور دکان ایک ہی اسٹاک استعمال کرتے ہیں؟',
    answer:
      'جی ہاں۔ Nafaa Stores کی ویب سائٹ، Shopify، WooCommerce اور Daraz کے آرڈر انہی پروڈکٹس سے اسٹاک کم کرتے ہیں جن سے کاؤنٹر کرتا ہے۔ Nafaa Market ابھی کھلی نہیں ہے؛ کھلنے پر وہ بھی اسی اسٹاک سے چلے گی، تو جو چیز آپ کے پاس رہی ہی نہیں وہ نہیں بکے گی۔',
    sourceNote: 'stock-push.service and channel-catalog.service; marketplace publishing from Nafaa products.',
    origin: 'translation of faq mp-ecommerce-stock',
    evidence: [
      'apps/api/src/integrations/online-orders/stock-push.service.ts',
      'apps/api/src/integrations/online-orders/channel-catalog.service.ts',
      'apps/api/src/marketplace/publishing',
    ],
  },
  {
    key: 'ur-page-marketplace-sell-online',
    locale: 'ur',
    topic: 'getting-started',
    question: 'Nafaa Market کے علاوہ Nafaa سے آن لائن اور کہاں بیچ سکتا ہوں؟',
    answer:
      'آج آپ Nafaa Stores سے اپنی ویب سائٹ بنا سکتے ہیں، یا Shopify، WooCommerce اور Daraz جوڑ سکتے ہیں۔ ان کے آرڈر Nafaa میں کاؤنٹر کی سیل کے ساتھ آتے ہیں اور اسٹاک اسی شیلف سے کم ہوتا ہے۔ نئے خریداروں تک پہنچنے کے لیے Nafaa Market جلد آ رہی ہے، مگر ابھی کھلی نہیں ہے۔',
    sourceNote: 'Online orders (website, Shopify, WooCommerce normaliser) and marketplace publishing.',
    origin: 'translation of faq sell-online',
    evidence: [
      'apps/api/src/integrations/online-orders/order-normalizer.ts',
      'apps/api/src/integrations/channels/custom-website',
      'apps/api/src/marketplace/publishing',
    ],
  },
];

export const entry: SeedEntry = {
  type: 'PAGE',
  locale: 'ur',
  slug: 'marketplace',
  title: 'Nafaa Market',
  seoTitle: 'Nafaa Market: Nafaa کی مارکیٹ پلیس، جلد آ رہی ہے',
  seoDescription:
    'Nafaa Market، Nafaa استعمال کرنے والی دکانوں کی مارکیٹ پلیس، جلد کھلے گی: اپنے Nafaa اسٹاک سے پروڈکٹس لگائیں اور آرڈر کاؤنٹر سیل والی ایپ میں لیں۔',
  focusKeyword: 'آن لائن مارکیٹ پلیس پاکستان',
  summary:
    'Nafaa Market وہ مارکیٹ پلیس ہے جو Nafaa ان دکانوں کے لیے بنا رہا ہے جو Nafaa استعمال کرتی ہیں، اور یہ جلد کھلے گی۔ دکانیں اپنے اسٹاک سے پروڈکٹس لگائیں گی، خریدار دیکھ کر آرڈر کریں گے، اور ہر آرڈر اسی ایپ میں آئے گا جس میں کاؤنٹر سیل اور آن لائن آرڈر آتے ہیں، ساتھ میں دکان کی پروفائل، ریویوز، پروموشن اور ڈیلیوری ایک جگہ۔',
  data: { template: 'default' },
  blocks: [
    {
      type: 'hero',
      eyebrow: 'جلد آ رہا ہے: Nafaa Market',
      heading: 'آپ کی دکان، اپنی گلی سے کہیں دور کے خریداروں کے لیے کھلی ہوئی',
      sub: 'Nafaa Market وہ مارکیٹ پلیس ہے جو ہم Nafaa چلانے والی دکانوں کے لیے بنا رہے ہیں۔ آپ وہی اسٹاک لگائیں گے جو پہلے سے Nafaa میں ہے، خریدار آپ کی دکان ڈھونڈیں گے، اور آرڈر آپ کی کاؤنٹر سیل کے ساتھ آئیں گے۔ یہ ابھی کھلی نہیں ہے؛ آج ہی Nafaa شروع کریں تو آپ کی دکان پہلے دن تیار ہو گی۔',
      primaryCta: { label: 'Nafaa سے شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'ڈیمو بک کریں', href: 'demo', variant: 'secondary', trackAs: 'hero_demo' },
      badges: ['جلد آ رہا ہے', 'آپ کے اسٹاک سے لسٹنگ', 'آرڈر اسی ایپ میں'],
      media: {
        kind: 'diagram',
        diagram: {
          kind: 'flow',
          nodes: [
            { id: 'stock', label: 'آپ کا Nafaa اسٹاک', icon: 'boxes' },
            { id: 'list', label: 'Nafaa Market پر لسٹ', icon: 'store' },
            { id: 'buyer', label: 'خریدار کا آرڈر', icon: 'shopping-cart' },
            { id: 'order', label: 'آرڈر Nafaa میں', icon: 'bell-ring' },
            { id: 'deliver', label: 'ڈیلیور', icon: 'truck' },
          ],
          edges: [
            { from: 'stock', to: 'list' },
            { from: 'list', to: 'buyer' },
            { from: 'buyer', to: 'order' },
            { from: 'order', to: 'deliver' },
          ],
        },
      },
      layout: 'split',
      id: 'b645445c3292',
    },
    {
      type: 'answerBox',
      heading: 'Nafaa Market مختصراً',
      facts: [
        { label: 'یہ کیا ہے', value: 'Nafaa استعمال کرنے والی دکانوں کے لیے Nafaa کی مارکیٹ پلیس، جلد کھلے گی' },
        { label: 'لسٹنگ', value: 'اپنے Nafaa اسٹاک سے پروڈکٹس چنیں گے؛ قیمت اور اسٹاک خود ملتے رہیں گے' },
        { label: 'آرڈر', value: 'Nafaa ایپ میں کاؤنٹر سیل اور آن لائن آرڈر کے ساتھ آئیں گے' },
        { label: 'سنبھالنا', value: 'دکان کی پروفائل، ریویوز، پروموشن، خریداروں کے میسج اور ڈیلیوری' },
      ],
      romanUrdu:
        'Nafaa Market Nafaa ka marketplace hai jo jald khul raha hai. Apne stock se products list honge, khareedar order karenge, aur order usi app me aayega jahan counter ki Sale hoti hai.',
      id: 'bbf50f1074e2',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'جلد آ رہا ہے',
      body: 'Nafaa Market ابھی خریداروں کے لیے کھلی نہیں ہے۔ نیچے لکھے سیلر کے اوزار مکمل کیے جا رہے ہیں، اور لانچ کا اعلان ہم [روڈ میپ](/ur/roadmap) پر کریں گے۔ آج آپ اپنی [Nafaa Stores ویب سائٹ](/ur/product/online-store)، Shopify، WooCommerce اور Daraz سے آن لائن بیچ سکتے ہیں۔',
      id: 'b6e1d03a95c4',
    },
    {
      type: 'featuresGrid',
      heading: 'مارکیٹ پلیس پر بیچنے والوں کو کیا ملے گا',
      columns: 2,
      items: [
        { icon: 'boxes', title: 'اپنے اسٹاک سے لسٹ کریں', body: 'Nafaa سے پروڈکٹس چنیں؛ قیمت اور اسٹاک آپ کے کاؤنٹر کے ساتھ چلتے ہیں۔' },
        { icon: 'store', title: 'دکان کی پروفائل', body: 'خریداروں کے لیے آپ کی دکان کا نام، تصویریں، اوقات اور تفصیل۔' },
        { icon: 'bell-ring', title: 'سارے آرڈر ایک جگہ', body: 'مارکیٹ پلیس کے آرڈر آپ کے باقی سیل چینلز کے ساتھ آتے ہیں۔' },
        { icon: 'star', title: 'ریویوز', body: 'دیکھیں خریدار آپ کی دکان کے بارے میں کیا کہتے ہیں، اور جواب دیں۔' },
        { icon: 'badge-percent', title: 'پروموشن اور کوپن', body: 'مارکیٹ پلیس کے خریداروں کے لیے آفر چلائیں۔' },
        { icon: 'message-square', title: 'خریداروں کے میسج', body: 'خریداروں کے سوالوں کا جواب Nafaa ایپ سے دیں۔' },
        { icon: 'truck', title: 'ڈیلیوری', body: 'آپ کے اپنے رائیڈرز، ان کی حالت اور ان کے پاس موجود آرڈرز کے ساتھ۔' },
        { icon: 'chart-line', title: 'اینالیٹکس', body: 'مارکیٹ پلیس سے آنے والے ویوز، آرڈر اور سیل۔' },
      ],
      id: 'b05ac522a560',
    },
    {
      type: 'diagram',
      heading: 'دکان، ویب سائٹ اور مارکیٹ پلیس کے لیے ایک ہی اسٹاک',
      caption: 'ہر چینل کے آرڈر Nafaa میں آتے ہیں؛ اسٹاک کی تبدیلی واپس ہر چینل تک جاتی ہے۔',
      diagram: { kind: 'store-sync', animate: true },
      theme: 'muted',
      id: 'bd80e8d7beaa',
    },
    {
      type: 'steps',
      heading: 'چار قدم میں بیچنا شروع کریں',
      items: [
        { title: 'اپنی دکان کے لیے Nafaa چلائیں', body: 'فری ٹرائل شروع کریں اور اپنی پروڈکٹس ڈالیں۔' },
        { title: 'دکان کی پروفائل بنائیں', body: 'نام، تصویریں، علاقہ اور کھلنے کے اوقات۔' },
        { title: 'چنیں کیا لگانا ہے', body: 'وہ پروڈکٹس چنیں جو Nafaa Market پر دکھانی ہیں۔' },
        { title: 'آرڈر لیں', body: 'قبول کریں، پیک کریں اور ڈیلیور کریں؛ اسٹاک خود اپ ڈیٹ ہو گا۔' },
      ],
      id: 'ba23674a6448',
    },
    {
      type: 'comparisonTable',
      heading: 'آپ کا اپنا آن لائن اسٹور اور Nafaa Market',
      caption: 'دونوں ایک ہی Nafaa اسٹاک سے چلتے ہیں اور آرڈر ایک ہی لسٹ میں آتے ہیں۔ زیادہ تر بیچنے والے دونوں چلاتے ہیں: اسٹور ان خریداروں کے لیے جو انہیں پہلے سے جانتے ہیں، اور مارکیٹ پلیس تاکہ نئے خریدار انہیں ڈھونڈ سکیں۔',
      columns: [
        { key: 'own', label: 'آپ کا اپنا اسٹور' },
        { key: 'bazaar', label: 'Nafaa Market', highlight: true },
      ],
      rows: [
        { label: 'آپ تک کون پہنچتا ہے', cells: { own: { value: 'جنہیں آپ خود لاتے ہیں: فالوورز، گاہک، سرچ' }, bazaar: { value: 'مارکیٹ پلیس پر سامان دیکھتے خریدار' } } },
        { label: 'سیٹ اپ', cells: { own: { value: 'ویب سائٹ، Shopify یا WooCommerce جوڑیں، یا Nafaa کا آرڈر لنک شیئر کریں' }, bazaar: { value: 'دکان کی پروفائل بھریں اور پروڈکٹس چنیں' } } },
        { label: 'اسٹاک اور قیمت', cells: { own: { value: 'Nafaa سے' }, bazaar: { value: 'Nafaa سے' } } },
        { label: 'آرڈر', cells: { own: { value: 'Nafaa کے آن لائن آرڈرز میں' }, bazaar: { value: 'Nafaa میں، باقی ہر چینل کے ساتھ' } } },
        { label: 'ڈیلیوری', cells: { own: { value: 'آرڈر سے کوریئر کی بکنگ، یا آپ کے اپنے رائیڈرز' }, bazaar: { value: 'آپ کے اپنے رائیڈرز' } } },
      ],
      id: 'b1edd1fa1b7b',
    },
    {
      type: 'diagram',
      heading: 'مارکیٹ پلیس کا آرڈر کیسے چلتا ہے',
      caption: 'کھلنے پر خریدار Nafaa Market پر آپ کی دکان ڈھونڈیں گے؛ آرڈر اسی ایپ میں آئے گا جس میں آپ کی کاؤنٹر سیل ہوتی ہے۔',
      diagram: {
        kind: 'flow',
        nodes: [
          { id: 'list', label: 'پروڈکٹس لسٹ کریں', icon: 'tags', note: 'آپ کے اسٹاک سے' },
          { id: 'browse', label: 'خریدار دیکھتے ہیں', icon: 'search' },
          { id: 'order', label: 'آرڈر Nafaa میں', icon: 'bell-ring' },
          { id: 'deliver', label: 'پیک اور ڈیلیور', icon: 'truck' },
          { id: 'stock', label: 'اسٹاک اپ ڈیٹ', icon: 'boxes' },
        ],
        edges: [
          { from: 'list', to: 'browse' },
          { from: 'browse', to: 'order' },
          { from: 'order', to: 'deliver' },
          { from: 'deliver', to: 'stock' },
        ],
        animate: true,
      },
      id: 'bc23350e776a',
    },
    {
      type: 'screenshot',
      heading: 'ہر چینل کے لیے ایک آرڈر لسٹ',
      body: 'مارکیٹ پلیس کے آرڈر ویب سائٹ اور باقی آن لائن آرڈرز کے ساتھ ہوں گے، ہر ایک اپنی حالت اور خریدار کے ساتھ، اس لیے ایک ہی بندہ کاؤنٹر کی سیل کے بیچ میں یہ سب سنبھال سکے گا۔',
      mediaId: SHOT.onlineOrders,
      frame: 'browser',
      url: 'app.nafaa.pk/online-orders',
      layout: 'split-right',
      id: 'b21ab208a801',
    },
    {
      type: 'richText',
      markdown:
        '## کاؤنٹر، آپ کی ویب سائٹ اور مارکیٹ پلیس کے لیے ایک اسٹاک\n\nNafaa Market کوئی الگ سیلر اکاؤنٹ نہیں ہو گی جسے الگ سے اپ ڈیٹ رکھنا پڑے۔ یہ وہی پروڈکٹس، قیمتیں اور اسٹاک پڑھے گی جو آپ کا کاؤنٹر اور آپ کا اپنا آن لائن اسٹور پڑھتے ہیں، اس لیے جو پیس دکان میں بک گیا وہ مارکیٹ پلیس سے بھی ہٹ جائے گا۔ مارکیٹ پلیس کے آرڈر ویب سائٹ، Shopify اور WooCommerce کے آرڈرز والی لسٹ میں ہی ہوں گے، اور رقم انہی رپورٹس میں نظر آئے گی۔\n\n## یہ کس کے لیے ٹھیک ہے\n\nNafaa Market ان دکانوں کے لیے ٹھیک ہو گی جن کا سامان آسانی سے بھیجا جا سکے اور جن کے خریدار پیدل فاصلے سے باہر ہوں: [کپڑے](/ur/industries/garments)، [کاسمیٹکس](/ur/industries/cosmetics)، [الیکٹرانکس](/ur/industries/electronics)، [کتابیں](/ur/industries/bookstore) اور ایسے ہی کاروبار۔ اگر آپ پہلے سے آن لائن بیچتے ہیں تو [ای کامرس کا صفحہ](/ur/solutions/ecommerce) دکھاتا ہے کہ مارکیٹ پلیس آپ کی ویب سائٹ، کوریئر اور COD کے ساتھ کیسے جڑتی ہے۔',
      id: 'b38a835729b6',
    },
    { type: 'faq', heading: 'عام سوالات', id: 'b2a8ba5b4ec6' },
    {
      type: 'cta',
      heading: 'اپنی دکان کو Nafaa Market کے لیے تیار کریں',
      body: 'ابھی Nafaa شروع کریں: مارکیٹ پلیس کھلنے پر آپ کی پروڈکٹس اور اسٹاک لسٹ کرنے کے لیے تیار ہوں گے۔',
      primaryCta: { label: 'فری ٹرائل شروع کریں', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
      secondaryCta: { label: 'واٹس ایپ پر پوچھیں', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      id: 'be828f3d327c',
    },
  ],
  faqKeys: [
    'ur-page-marketplace-what',
    'ur-page-marketplace-delivery',
    'ur-page-marketplace-who',
    'ur-page-marketplace-stock',
    'ur-page-marketplace-sell-online',
  ],
  relations: [
    { ref: 'SOLUTION:ecommerce@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:online-store@ur', kind: 'RELATED' },
    { ref: 'PRODUCT:inventory@ur', kind: 'RELATED' },
    { ref: 'SERVICE:online-store-setup@ur', kind: 'RELATED' },
  ],
  origin: 'translation of content/main-pages/pages.ts (15 Nov 2026)',
  evidence: [
    'apps/marketplace/package.json',
    'apps/api/src/marketplace/publishing',
    'apps/api/src/marketplace/orders',
    'apps/web/src/marketplace/products/MarketplaceProductsPage.tsx',
    'apps/web/src/marketplace/shop-profile/ShopProfilePage.tsx',
    'apps/web/src/marketplace/reviews/MarketplaceReviewsPage.tsx',
    'apps/web/src/marketplace/promotions/MarketplacePromotionsPage.tsx',
    'apps/web/src/marketplace/messages/MarketplaceMessagesPage.tsx',
    'apps/web/src/marketplace/delivery/MarketplaceDeliveryPage.tsx',
    'apps/web/src/marketplace/rider-tracking/RiderTrackingPage.tsx',
    'apps/web/src/marketplace/analytics/MarketplaceAnalyticsPage.tsx',
    'apps/web/src/integrations/online-orders/public/PublicOrderPage.tsx',
  ],
  factCheck: { checkedOn: '2026-11-15', note: 'Urdu translation of the English entry; Nafaa Market is marked coming soon.' },
  dropped: [],
  needsOwner: [
    'No marketplace screenshot yet: the seller screen shows prices as "Rs Rs" and the dashboard shows a "12,000+ Nafaa Market customers" figure that looks made up (apps/web bugs). Capture after those are fixed.',
    'Buyer reach and how buyers find Nafaa Market (app or website URL) are not stated until the owner confirms them.',
  ],
};
