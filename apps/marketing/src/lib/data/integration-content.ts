export interface IntegrationContent {
  slug: string;
  heroTitleEn: string;
  heroTitleUr: string;
  heroSubtitleEn: string;
  heroSubtitleUr: string;
  directAnswerEn: string;
  directAnswerUr: string;
  benefits: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string; icon: string }>;
  setupSteps: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string }>;
  setupTimeMinutes: number;
  codeExample?: {
    language: string;
    title: string;
    code: string;
  };
  useCases: Array<{ en: string; ur: string }>;
  requirements: Array<{ en: string; ur: string }>;
  supportedFeatures: Array<{ en: string; ur: string; available: boolean }>;
  faqs: Array<{ qEn: string; qUr: string; aEn: string; aUr: string }>;
  relatedSlugs: string[];
}

export const integrationContent: Record<string, IntegrationContent> = {
  foodpanda: {
    slug: 'foodpanda',
    heroTitleEn: 'Connect Foodpanda to Nafaa in under five minutes',
    heroTitleUr: 'فوڈ پانڈا کو نفع سے پانچ منٹ میں جوڑیں',
    heroSubtitleEn: 'Sync your menu automatically, receive orders directly in your kitchen, update statuses in real time, and never miss a Foodpanda order again.',
    heroSubtitleUr: 'اپنا مینو خودکار ہم آہنگ کریں، آرڈرز براہ راست کچن میں وصول کریں، حقیقی وقت میں اسٹیٹس اپ ڈیٹ کریں۔',
    directAnswerEn: 'Nafaa integrates directly with Foodpanda\'s merchant API to enable full two-way sync. Your menu, prices, and stock levels stay in sync automatically. Incoming orders arrive in your Nafaa kitchen display system, and status updates flow back to Foodpanda in real time.',
    directAnswerUr: 'نفع فوڈ پانڈا کے مرچنٹ اے پی آئی سے براہ راست منسلک ہے تاکہ مکمل دو طرفہ ہم آہنگی ممکن ہو۔',
    benefits: [
      { icon: 'Zap', titleEn: 'Automatic menu sync', titleUr: 'خودکار مینو ہم آہنگی', descEn: 'Update prices and items in Nafaa, and Foodpanda updates automatically within minutes.', descUr: 'نفع میں قیمتیں اور آئٹمز اپ ڈیٹ کریں، فوڈ پانڈا خودکار اپ ڈیٹ ہو جائے گا۔' },
      { icon: 'Bell', titleEn: 'Orders in your kitchen', titleUr: 'آرڈرز آپ کے کچن میں', descEn: 'New Foodpanda orders trigger a KOT print automatically. Zero manual entry.', descUr: 'نئے فوڈ پانڈا آرڈرز خودکار کے او ٹی پرنٹ کرتے ہیں۔' },
      { icon: 'RefreshCw', titleEn: 'Real-time status updates', titleUr: 'حقیقی وقت اسٹیٹس اپ ڈیٹس', descEn: 'When you mark an order as ready or dispatched, Foodpanda\'s app updates instantly.', descUr: 'جب آپ آرڈر کو تیار یا بھیج دیا کے طور پر نشان زد کرتے ہیں، فوڈ پانڈا کی ایپ فوری اپ ڈیٹ ہو جاتی ہے۔' },
      { icon: 'Package', titleEn: 'Stock auto-pause', titleUr: 'اسٹاک خودکار توقف', descEn: 'When an item runs out in Nafaa, it automatically hides on Foodpanda. No more angry customers.', descUr: 'جب کوئی آئٹم ختم ہو، وہ فوڈ پانڈا پر خودکار چھپ جاتا ہے۔' },
      { icon: 'BarChart3', titleEn: 'Unified reporting', titleUr: 'متحد رپورٹنگ', descEn: 'See Foodpanda sales alongside dine-in and walk-in in one dashboard.', descUr: 'فوڈ پانڈا سیلز کو ڈائن اِن اور واک اِن کے ساتھ ایک ڈیش بورڈ میں دیکھیں۔' },
      { icon: 'Wallet', titleEn: 'Commission tracking', titleUr: 'کمیشن ٹریکنگ', descEn: 'Automatic Foodpanda commission calculation. Know your true profit per order.', descUr: 'فوڈ پانڈا کمیشن کا خودکار حساب۔ فی آرڈر حقیقی منافع جانیں۔' },
    ],
    setupSteps: [
      { titleEn: 'Open Nafaa Settings', titleUr: 'نفع کی ترتیبات کھولیں', descEn: 'Navigate to Settings → Integrations → Foodpanda in your Nafaa dashboard.', descUr: 'اپنے نفع ڈیش بورڈ میں ترتیبات → انضمام → فوڈ پانڈا پر جائیں۔' },
      { titleEn: 'Enter your Foodpanda credentials', titleUr: 'اپنے فوڈ پانڈا کریڈنشلز درج کریں', descEn: 'Provide your Foodpanda vendor ID and API key (available in your Foodpanda merchant portal).', descUr: 'اپنی فوڈ پانڈا وینڈر آئی ڈی اور اے پی آئی کلید فراہم کریں۔' },
      { titleEn: 'Map your menu items', titleUr: 'اپنے مینو آئٹمز کو نقشہ کریں', descEn: 'Match your Nafaa products with Foodpanda menu items. Nafaa suggests matches automatically.', descUr: 'اپنے نفع پروڈکٹس کو فوڈ پانڈا مینو کے ساتھ ملائیں۔' },
      { titleEn: 'Enable and go live', titleUr: 'فعال کریں اور لائیو جائیں', descEn: 'Turn the integration on. Test with a sandbox order. You are ready.', descUr: 'انضمام آن کریں۔ سینڈ باکس آرڈر سے ٹیسٹ کریں۔' },
    ],
    setupTimeMinutes: 5,
    codeExample: {
      language: 'json',
      title: 'Webhook payload example',
      code: `{
  "event": "order.created",
  "order": {
    "id": "FP-2026-084521",
    "customer": {
      "name": "Ahmad Raza",
      "phone": "+923001234567",
      "address": "House 45, Block B, Gulberg III, Lahore"
    },
    "items": [
      {
        "sku": "CHK-BIRYANI-01",
        "name": "Chicken Biryani",
        "quantity": 2,
        "price": 550,
        "modifiers": ["extra raita", "medium spice"]
      }
    ],
    "subtotal": 1100,
    "delivery_fee": 90,
    "total": 1190,
    "payment_method": "cash_on_delivery",
    "created_at": "2026-07-29T14:32:00+05:00"
  }
}`,
    },
    useCases: [
      { en: 'Restaurants receiving hundreds of daily orders', ur: 'روزانہ سیکڑوں آرڈرز وصول کرنے والے ریسٹورنٹس' },
      { en: 'Bakeries with cake and pastry delivery', ur: 'کیک اور پیسٹری ڈیلیوری والی بیکریاں' },
      { en: 'Cloud kitchens serving multiple brands', ur: 'کلاؤڈ کچنز جو متعدد برانڈز کی خدمت کرتی ہیں' },
      { en: 'Cafes with mixed dine-in and delivery revenue', ur: 'ڈائن اِن اور ڈیلیوری آمدنی والے کیفے' },
    ],
    requirements: [
      { en: 'Active Foodpanda vendor account', ur: 'فعال فوڈ پانڈا وینڈر اکاؤنٹ' },
      { en: 'API access from Foodpanda merchant portal', ur: 'فوڈ پانڈا مرچنٹ پورٹل سے اے پی آئی رسائی' },
      { en: 'Nafaa Pro plan or higher', ur: 'نفع پرو پلان یا اس سے اوپر' },
    ],
    supportedFeatures: [
      { en: 'Menu sync', ur: 'مینو ہم آہنگی', available: true },
      { en: 'Order webhooks', ur: 'آرڈر ویب ہکس', available: true },
      { en: 'Status updates', ur: 'اسٹیٹس اپ ڈیٹس', available: true },
      { en: 'Stock auto-pause', ur: 'اسٹاک خودکار توقف', available: true },
      { en: 'Commission tracking', ur: 'کمیشن ٹریکنگ', available: true },
      { en: 'Rider assignment', ur: 'رائیڈر تفویض', available: true },
      { en: 'Customer reviews sync', ur: 'گاہک ریویو ہم آہنگی', available: false },
    ],
    faqs: [
      { qEn: 'Does Foodpanda charge extra for API integration?', qUr: 'کیا فوڈ پانڈا اے پی آئی انضمام کے لیے اضافی چارج کرتا ہے؟', aEn: 'No. Foodpanda\'s merchant API is included with your vendor account. Standard commission rates apply per order as usual.', aUr: 'نہیں۔ فوڈ پانڈا کا مرچنٹ اے پی آئی آپ کے وینڈر اکاؤنٹ میں شامل ہے۔' },
      { qEn: 'What happens if my internet goes down?', qUr: 'اگر میرا انٹرنیٹ بند ہو جائے تو کیا ہوگا؟', aEn: 'Nafaa queues all Foodpanda communications locally. When your connection returns, everything syncs automatically without any data loss.', aUr: 'نفع تمام مواصلات مقامی طور پر قطار میں رکھتا ہے۔ کنیکشن واپس آنے پر ہم آہنگ ہو جاتا ہے۔' },
      { qEn: 'Can I use multiple Foodpanda locations?', qUr: 'کیا میں متعدد فوڈ پانڈا مقامات استعمال کر سکتا ہوں؟', aEn: 'Yes. Each Nafaa shop can connect to its own Foodpanda vendor account. Multi-branch restaurants are fully supported.', aUr: 'جی ہاں۔ ہر نفع دکان اپنے فوڈ پانڈا وینڈر اکاؤنٹ سے منسلک ہو سکتی ہے۔' },
    ],
    relatedSlugs: ['whatsapp-business', 'jazzcash', 'easypaisa', 'raast'],
  },
  daraz: {
    slug: 'daraz',
    heroTitleEn: 'Sell on Daraz with automatic inventory and order sync',
    heroTitleUr: 'دراز پر خودکار انوینٹری اور آرڈر ہم آہنگی کے ساتھ فروخت کریں',
    heroSubtitleEn: 'OAuth-based Daraz Seller Center integration. List products, sync inventory across all your channels, and process orders in one place.',
    heroSubtitleUr: 'او آتھ پر مبنی دراز سیلر سینٹر انضمام۔ پروڈکٹس درج کریں، تمام چینلز میں انوینٹری ہم آہنگ کریں۔',
    directAnswerEn: 'Nafaa\'s Daraz integration uses secure OAuth to connect your Daraz Seller Center account. Products, prices, and inventory sync bidirectionally. Orders from Daraz flow into your Nafaa dashboard alongside your other channels for unified fulfillment.',
    directAnswerUr: 'نفع کا دراز انضمام محفوظ او آتھ استعمال کرتا ہے۔ پروڈکٹس، قیمتیں، اور انوینٹری دو طرفہ ہم آہنگ ہوتے ہیں۔',
    benefits: [
      { icon: 'Package', titleEn: 'Bidirectional inventory sync', titleUr: 'دو طرفہ انوینٹری ہم آہنگی', descEn: 'When you sell offline in Nafaa, Daraz stock updates. When Daraz sells, your Nafaa stock updates. Perfect harmony.', descUr: 'جب آپ نفع میں آف لائن بیچیں، دراز اسٹاک اپ ڈیٹ ہو۔ جب دراز بیچے، نفع اسٹاک اپ ڈیٹ ہو۔' },
      { icon: 'Upload', titleEn: 'Bulk product publishing', titleUr: 'بلک پروڈکٹ اشاعت', descEn: 'List hundreds of products on Daraz in minutes. Category mapping and variant support built in.', descUr: 'منٹوں میں سیکڑوں پروڈکٹس درج کریں۔ کیٹگری اور تغیرات کی سپورٹ شامل۔' },
      { icon: 'ShoppingCart', titleEn: 'Unified order fulfillment', titleUr: 'متحد آرڈر تکمیل', descEn: 'Daraz orders arrive in Nafaa with customer details, payment status, and shipping labels ready to print.', descUr: 'دراز آرڈرز نفع میں گاہک کی تفصیلات، ادائیگی اسٹیٹس کے ساتھ آتے ہیں۔' },
      { icon: 'Tag', titleEn: 'Dynamic pricing', titleUr: 'متحرک قیمتیں', descEn: 'Set channel-specific pricing. Charge premium on Daraz to cover commissions. All automatic.', descUr: 'چینل کے لیے مخصوص قیمتیں سیٹ کریں۔ دراز پر پریمیم چارج کریں۔' },
      { icon: 'TrendingUp', titleEn: 'Marketplace analytics', titleUr: 'مارکیٹ پلیس تجزیات', descEn: 'Which products sell best on Daraz vs offline? Nafaa shows you exactly.', descUr: 'کون سے پروڈکٹس دراز پر بہتر بکتے ہیں؟' },
      { icon: 'Star', titleEn: 'Review notifications', titleUr: 'ریویو نوٹیفیکیشنز', descEn: 'Get notified in Nafaa when a customer leaves a Daraz review. Respond quickly to protect ratings.', descUr: 'جب گاہک دراز ریویو چھوڑے، نفع میں مطلع ہوں۔' },
    ],
    setupSteps: [
      { titleEn: 'Click Connect Daraz', titleUr: 'دراز جوڑیں پر کلک کریں', descEn: 'In Nafaa, go to Integrations → Daraz → Connect.', descUr: 'نفع میں انضمام → دراز → جوڑیں پر جائیں۔' },
      { titleEn: 'Authorize via OAuth', titleUr: 'او آتھ کے ذریعے اجازت دیں', descEn: 'You are redirected to Daraz Seller Center to grant Nafaa secure access. No passwords shared.', descUr: 'آپ دراز سیلر سینٹر پر بھیجے جائیں گے تاکہ نفع کو محفوظ رسائی دیں۔' },
      { titleEn: 'Map categories', titleUr: 'اقسام کو نقشہ کریں', descEn: 'Match your Nafaa product categories with Daraz\'s taxonomy for optimal search placement.', descUr: 'اپنی نفع اقسام کو دراز کی درجہ بندی سے ملائیں۔' },
      { titleEn: 'Publish and sync', titleUr: 'شائع کریں اور ہم آہنگ کریں', descEn: 'Push products live to Daraz. Sync runs every fifteen minutes automatically.', descUr: 'پروڈکٹس دراز پر لائیو کریں۔ ہر پندرہ منٹ میں خودکار ہم آہنگی۔' },
    ],
    setupTimeMinutes: 8,
    codeExample: {
      language: 'javascript',
      title: 'OAuth callback handler',
      code: `// Nafaa handles the Daraz OAuth flow automatically
// This is what happens behind the scenes:

async function handleDarazCallback(code, state) {
  const tokens = await fetch('https://auth.daraz.pk/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://app.nafaa.pk/oauth/daraz/callback',
    }),
  }).then(r => r.json());

  // Store encrypted tokens in Nafaa tenant config
  await nafaa.integrations.daraz.save({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    sellerId: tokens.seller_id,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  // Trigger initial product and order sync
  await nafaa.integrations.daraz.sync({ full: true });
}`,
    },
    useCases: [
      { en: 'Fashion and garments retailers', ur: 'فیشن اور گارمنٹس ریٹیلرز' },
      { en: 'Electronics and mobile accessories', ur: 'الیکٹرانکس اور موبائل لوازمات' },
      { en: 'Home goods and lifestyle products', ur: 'گھریلو اشیاء اور طرز زندگی کے پروڈکٹس' },
      { en: 'Beauty and personal care brands', ur: 'خوبصورتی اور ذاتی نگہداشت' },
    ],
    requirements: [
      { en: 'Active Daraz Seller Center account', ur: 'فعال دراز سیلر سینٹر اکاؤنٹ' },
      { en: 'Verified seller status on Daraz', ur: 'دراز پر تصدیق شدہ سیلر اسٹیٹس' },
      { en: 'Nafaa Pro plan or higher', ur: 'نفع پرو پلان یا اس سے اوپر' },
    ],
    supportedFeatures: [
      { en: 'Product catalog sync', ur: 'پروڈکٹ کیٹلاگ ہم آہنگی', available: true },
      { en: 'Inventory sync', ur: 'انوینٹری ہم آہنگی', available: true },
      { en: 'Order import', ur: 'آرڈر امپورٹ', available: true },
      { en: 'Shipping label printing', ur: 'شپنگ لیبل پرنٹنگ', available: true },
      { en: 'Variant support', ur: 'تغیرات سپورٹ', available: true },
      { en: 'Review notifications', ur: 'ریویو نوٹیفیکیشنز', available: true },
      { en: 'Sponsored ads management', ur: 'اسپانسرڈ اشتہارات', available: false },
    ],
    faqs: [
      { qEn: 'How often does inventory sync?', qUr: 'انوینٹری کتنی بار ہم آہنگ ہوتی ہے؟', aEn: 'Every fifteen minutes by default, but critical stock changes (like an item going out of stock) sync in real time via webhooks.', aUr: 'ہر پندرہ منٹ میں پہلے سے، لیکن اہم اسٹاک تبدیلیاں حقیقی وقت میں۔' },
      { qEn: 'Can I sell different products on Daraz than in-store?', qUr: 'کیا میں دکان اور دراز پر مختلف پروڈکٹس بیچ سکتا ہوں؟', aEn: 'Yes. In Nafaa, you can mark each product as available on specific channels only. Some items can be Daraz-only, some in-store-only, some both.', aUr: 'جی ہاں۔ نفع میں آپ ہر پروڈکٹ کو مخصوص چینلز کے لیے نشان زد کر سکتے ہیں۔' },
      { qEn: 'What about Daraz Mall products?', qUr: 'دراز مال پروڈکٹس کا کیا؟', aEn: 'Fully supported. If your account is on Daraz Mall, Nafaa handles the additional metadata and branding requirements automatically.', aUr: 'مکمل سپورٹ۔ نفع اضافی میٹا ڈیٹا اور برانڈنگ ضروریات خودکار سنبھالتا ہے۔' },
    ],
    relatedSlugs: ['tcs', 'leopards', 'jazzcash', 'shopify'],
  },
  fbr: {
    slug: 'fbr',
    heroTitleEn: 'FBR POS integration with real-time invoice submission',
    heroTitleUr: 'حقیقی وقت انوائس جمع کے ساتھ ایف بی آر پی او ایس انضمام',
    heroSubtitleEn: 'Pakistan\'s Federal Board of Revenue compliance made effortless. Automatic invoice submission with QR verification, retry logic, and full audit trail — all built in.',
    heroSubtitleUr: 'پاکستان کے ایف بی آر کی تعمیل آسان۔ کیو آر تصدیق، دوبارہ کوشش، اور مکمل آڈٹ ٹریل۔',
    directAnswerEn: 'Nafaa is a certified FBR POS integration partner. Every sale is submitted to FBR in real time with automatic QR code generation, verification URL, and audit-ready record keeping. Both sandbox and production modes are supported, with configurable submission thresholds and manual override options.',
    directAnswerUr: 'نفع تصدیق شدہ ایف بی آر پی او ایس انضمام پارٹنر ہے۔ ہر سیل حقیقی وقت میں ایف بی آر کو جمع کی جاتی ہے۔',
    benefits: [
      { icon: 'Landmark', titleEn: 'Real-time submission', titleUr: 'حقیقی وقت جمع', descEn: 'Every sale reaches FBR within seconds. No batch uploads, no delays, no compliance risk.', descUr: 'ہر سیل سیکنڈوں میں ایف بی آر تک۔ کوئی تاخیر نہیں، کوئی تعمیل خطرہ نہیں۔' },
      { icon: 'QrCode', titleEn: 'QR code on every receipt', titleUr: 'ہر رسید پر کیو آر کوڈ', descEn: 'Customers can scan the QR to verify authenticity on the FBR portal instantly.', descUr: 'گاہک کیو آر اسکین کر کے ایف بی آر پورٹل پر تصدیق کر سکتے ہیں۔' },
      { icon: 'RefreshCw', titleEn: 'Automatic retry logic', titleUr: 'خودکار دوبارہ کوشش', descEn: 'If FBR is temporarily down, Nafaa queues submissions and retries automatically. Zero data loss.', descUr: 'اگر ایف بی آر عارضی طور پر بند ہو، نفع خودکار دوبارہ کوشش کرتا ہے۔' },
      { icon: 'Shield', titleEn: 'Sandbox and production', titleUr: 'سینڈ باکس اور پروڈکشن', descEn: 'Test in sandbox before going live. Switch to production with one toggle when ready.', descUr: 'پروڈکشن جانے سے پہلے سینڈ باکس میں ٹیسٹ کریں۔' },
      { icon: 'Sliders', titleEn: 'Configurable thresholds', titleUr: 'قابل تشکیل حدود', descEn: 'Submit all sales, only above a threshold, or manually. Full control over your compliance workflow.', descUr: 'تمام سیلز جمع کریں، صرف حد سے اوپر، یا دستی طور پر۔' },
      { icon: 'FileCheck', titleEn: 'Audit-ready records', titleUr: 'آڈٹ کے لیے تیار ریکارڈز', descEn: 'Seventy-two months of records kept securely. Instantly downloadable for any FBR audit.', descUr: 'بہتر ماہ کے ریکارڈز محفوظ۔ کسی بھی ایف بی آر آڈٹ کے لیے فوری قابل ڈاؤن لوڈ۔' },
    ],
    setupSteps: [
      { titleEn: 'Enter your FBR credentials', titleUr: 'اپنے ایف بی آر کریڈنشلز درج کریں', descEn: 'Provide your POS ID, NTN, STRN, and API token from the FBR IRIS portal.', descUr: 'اپنی پی او ایس آئی ڈی، این ٹی این، ایس ٹی آر این، اور اے پی آئی ٹوکن فراہم کریں۔' },
      { titleEn: 'Configure business details', titleUr: 'کاروباری تفصیلات تشکیل دیں', descEn: 'Business name, address, province, and default tax rate (usually 17%).', descUr: 'کاروبار کا نام، پتہ، صوبہ، اور ڈیفالٹ ٹیکس ریٹ (عام طور پر ۱۷٪)۔' },
      { titleEn: 'Test in sandbox mode', titleUr: 'سینڈ باکس موڈ میں ٹیسٹ کریں', descEn: 'Run test transactions to verify everything works. FBR provides a dedicated test environment.', descUr: 'ٹیسٹ ٹرانزیکشنز چلائیں تاکہ ہر چیز کام کرے۔' },
      { titleEn: 'Go live with production', titleUr: 'پروڈکشن کے ساتھ لائیو جائیں', descEn: 'Once verified, switch to production mode. Every sale now flows to FBR automatically.', descUr: 'تصدیق کے بعد، پروڈکشن موڈ پر جائیں۔' },
    ],
    setupTimeMinutes: 12,
    codeExample: {
      language: 'json',
      title: 'FBR invoice payload',
      code: `{
  "invoiceType": "Sale Invoice",
  "invoiceDate": "2026-07-29",
  "sellerNTNCNIC": "1234567-8",
  "sellerBusinessName": "Ahmad Bakery",
  "sellerProvince": "Punjab",
  "sellerAddress": "Main Boulevard, Gulberg III, Lahore",
  "buyerNTNCNIC": "9876543-2",
  "buyerBusinessName": "Retail Customer",
  "buyerProvince": "Punjab",
  "buyerAddress": "Walk-in Customer",
  "buyerRegistrationType": "Unregistered",
  "invoiceRefNo": "NAFAA-2026-084521",
  "items": [
    {
      "hsCode": "1905.9090",
      "productDescription": "Chocolate Fudge Cake 1kg",
      "rate": "17%",
      "uoM": "Nos",
      "quantity": 1,
      "totalValues": 2500,
      "valueSalesExcludingST": 2136.75,
      "salesTaxApplicable": 363.25
    }
  ],
  "totalAmount": 2500
}`,
    },
    useCases: [
      { en: 'Tier 1 retail businesses required to integrate', ur: 'ٹیئر ون ریٹیل کاروبار جن کو انضمام لازمی' },
      { en: 'Restaurants and food service establishments', ur: 'ریسٹورنٹس اور فوڈ سروس' },
      { en: 'Pharmacies and medical stores', ur: 'فارمیسیز اور میڈیکل اسٹورز' },
      { en: 'Any business seeking full FBR compliance', ur: 'مکمل ایف بی آر تعمیل چاہنے والا کوئی بھی کاروبار' },
    ],
    requirements: [
      { en: 'Active FBR NTN registration', ur: 'فعال ایف بی آر این ٹی این رجسٹریشن' },
      { en: 'Sales Tax Registration (STRN)', ur: 'سیلز ٹیکس رجسٹریشن (ایس ٹی آر این)' },
      { en: 'POS ID from FBR IRIS portal', ur: 'ایف بی آر آئرس پورٹل سے پی او ایس آئی ڈی' },
      { en: 'API token from FBR', ur: 'ایف بی آر سے اے پی آئی ٹوکن' },
    ],
    supportedFeatures: [
      { en: 'Real-time invoice submission', ur: 'حقیقی وقت انوائس جمع', available: true },
      { en: 'QR code generation', ur: 'کیو آر کوڈ تیاری', available: true },
      { en: 'Automatic retry on failure', ur: 'ناکامی پر خودکار دوبارہ کوشش', available: true },
      { en: 'Sandbox mode', ur: 'سینڈ باکس موڈ', available: true },
      { en: 'Manual override', ur: 'دستی اوور رائیڈ', available: true },
      { en: 'Bulk historical submission', ur: 'بلک تاریخی جمع', available: true },
      { en: 'Invoice cancellation', ur: 'انوائس منسوخی', available: true },
    ],
    faqs: [
      { qEn: 'Is Nafaa officially approved by FBR?', qUr: 'کیا نفع ایف بی آر سے سرکاری منظور شدہ ہے؟', aEn: 'Yes. Nafaa is a registered FBR POS integration provider. All submissions follow the official FBR IRIS specification and are approved for Tier 1 retailer compliance.', aUr: 'جی ہاں۔ نفع رجسٹرڈ ایف بی آر پی او ایس انضمام فراہم کنندہ ہے۔' },
      { qEn: 'What happens if FBR servers are down?', qUr: 'اگر ایف بی آر سرورز بند ہوں تو کیا ہوگا؟', aEn: 'Sales continue normally. Nafaa queues the submissions locally and retries automatically every few minutes until FBR accepts them. Your business never stops.', aUr: 'سیلز عام طور پر جاری رہتی ہیں۔ نفع خودکار دوبارہ کوشش کرتا ہے۔' },
      { qEn: 'Can I submit only some sales to FBR?', qUr: 'کیا میں صرف کچھ سیلز ایف بی آر کو جمع کر سکتا ہوں؟', aEn: 'Yes. Nafaa supports four submission modes: disabled, manual (per invoice), automatic for all, or automatic above a configurable amount threshold.', aUr: 'جی ہاں۔ نفع چار جمع موڈز سپورٹ کرتا ہے۔' },
      { qEn: 'How long are FBR records kept?', qUr: 'ایف بی آر ریکارڈز کتنی دیر رکھے جاتے ہیں؟', aEn: 'By default, seventy-two months (six years) as required by law. This is configurable in advanced settings.', aUr: 'پہلے سے، بہتر ماہ (چھ سال) قانون کے مطابق۔' },
    ],
    relatedSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business'],
  },
  jazzcash: {
    slug: 'jazzcash',
    heroTitleEn: 'Accept JazzCash payments in Nafaa — mobile wallet and card',
    heroTitleUr: 'نفع میں جاز کیش ادائیگیاں قبول کریں — موبائل والیٹ اور کارڈ',
    heroSubtitleEn: 'Pakistan\'s largest mobile wallet, integrated directly. Accept payments via QR, wallet-to-wallet, and card. Instant settlement, low fees.',
    heroSubtitleUr: 'پاکستان کا سب سے بڑا موبائل والیٹ، براہ راست منسلک۔ کیو آر، والیٹ ٹو والیٹ، اور کارڈ کے ذریعے ادائیگیاں۔',
    directAnswerEn: 'Nafaa integrates with JazzCash Merchant Services to accept all forms of JazzCash payments: mobile wallet transfers, QR code scanning, and JazzCash-linked cards. Settlement happens directly to your bank account, and every transaction reconciles automatically in Nafaa.',
    directAnswerUr: 'نفع جاز کیش مرچنٹ سروسز سے منسلک ہے تاکہ جاز کیش کی تمام اقسام کی ادائیگیاں قبول کر سکے۔',
    benefits: [
      { icon: 'QrCode', titleEn: 'QR code payments', titleUr: 'کیو آر کوڈ ادائیگیاں', descEn: 'Print a QR at your counter. Customers scan and pay in seconds. No card readers needed.', descUr: 'کاؤنٹر پر کیو آر پرنٹ کریں۔ گاہک اسکین کر کے سیکنڈوں میں ادائیگی کریں۔' },
      { icon: 'Smartphone', titleEn: 'Wallet-to-wallet', titleUr: 'والیٹ ٹو والیٹ', descEn: 'Direct transfers from customer JazzCash wallet to your merchant account. Real-time confirmation.', descUr: 'گاہک کے جاز کیش والیٹ سے آپ کے مرچنٹ اکاؤنٹ میں براہ راست منتقلی۔' },
      { icon: 'CreditCard', titleEn: 'JazzCash cards', titleUr: 'جاز کیش کارڈز', descEn: 'Accept payments from customers who have JazzCash-linked debit cards.', descUr: 'ان گاہکوں سے ادائیگیاں قبول کریں جن کے پاس جاز کیش لنکڈ کارڈز ہیں۔' },
      { icon: 'Zap', titleEn: 'Instant settlement', titleUr: 'فوری تصفیہ', descEn: 'Money reaches your bank account instantly, not tomorrow. Cash flow protected.', descUr: 'پیسہ آپ کے بینک اکاؤنٹ میں فوری، کل نہیں۔' },
      { icon: 'Percent', titleEn: 'Low transaction fees', titleUr: 'کم ٹرانزیکشن فیس', descEn: 'Some of the lowest merchant rates in Pakistan. Special pricing for Nafaa customers.', descUr: 'پاکستان میں سب سے کم مرچنٹ ریٹس۔ نفع گاہکوں کے لیے خصوصی قیمتیں۔' },
      { icon: 'FileText', titleEn: 'Auto reconciliation', titleUr: 'خودکار مصالحت', descEn: 'Every JazzCash transaction matches automatically with your Nafaa sale. Zero manual bookkeeping.', descUr: 'ہر جاز کیش ٹرانزیکشن خودکار طور پر نفع سیل سے میل کھاتا ہے۔' },
    ],
    setupSteps: [
      { titleEn: 'Apply for merchant account', titleUr: 'مرچنٹ اکاؤنٹ کے لیے درخواست', descEn: 'Nafaa can help you apply directly. Approval usually within 3-5 business days.', descUr: 'نفع آپ کو براہ راست درخواست میں مدد کر سکتا ہے۔ منظوری عام طور پر ۳-۵ کاروباری دنوں میں۔' },
      { titleEn: 'Enter merchant credentials', titleUr: 'مرچنٹ کریڈنشلز درج کریں', descEn: 'Add your JazzCash Merchant ID, Password, and Integrity Salt in Nafaa settings.', descUr: 'اپنی جاز کیش مرچنٹ آئی ڈی، پاس ورڈ، اور انٹیگرٹی سالٹ شامل کریں۔' },
      { titleEn: 'Generate your QR code', titleUr: 'اپنا کیو آر کوڈ بنائیں', descEn: 'Nafaa generates a branded QR code with your logo. Print and display at counter.', descUr: 'نفع آپ کے لوگو کے ساتھ کیو آر کوڈ بناتا ہے۔' },
      { titleEn: 'Accept your first payment', titleUr: 'اپنی پہلی ادائیگی قبول کریں', descEn: 'Test with a small transaction. Once confirmed, you are live.', descUr: 'ایک چھوٹے ٹرانزیکشن کے ساتھ ٹیسٹ کریں۔' },
    ],
    setupTimeMinutes: 10,
    useCases: [
      { en: 'Any retail business accepting mobile payments', ur: 'موبائل ادائیگیاں قبول کرنے والا کوئی ریٹیل کاروبار' },
      { en: 'Restaurants and cafes for quick checkout', ur: 'تیز چیک آؤٹ کے لیے ریسٹورنٹس اور کیفے' },
      { en: 'Service businesses with on-site payments', ur: 'سائٹ پر ادائیگیوں والے سروس کاروبار' },
      { en: 'Delivery businesses for cashless collection', ur: 'بغیر نقد وصولی کے لیے ڈیلیوری کاروبار' },
    ],
    requirements: [
      { en: 'CNIC and business registration', ur: 'سی این آئی سی اور کاروباری رجسٹریشن' },
      { en: 'Bank account for settlement', ur: 'تصفیہ کے لیے بینک اکاؤنٹ' },
      { en: 'Physical business location verification', ur: 'کاروباری مقام کی تصدیق' },
    ],
    supportedFeatures: [
      { en: 'QR payments', ur: 'کیو آر ادائیگیاں', available: true },
      { en: 'Wallet-to-wallet', ur: 'والیٹ ٹو والیٹ', available: true },
      { en: 'Card acceptance', ur: 'کارڈ قبولیت', available: true },
      { en: 'Refunds', ur: 'رقم واپسی', available: true },
      { en: 'Recurring payments', ur: 'مکرر ادائیگیاں', available: true },
      { en: 'Payment links', ur: 'ادائیگی لنکس', available: true },
    ],
    faqs: [
      { qEn: 'How fast does the money reach my bank?', qUr: 'پیسہ کتنی جلدی میرے بینک تک پہنچتا ہے؟', aEn: 'Instantly. JazzCash settles to your linked bank account in real time via IBFT, so cash flow is never delayed.', aUr: 'فوری۔ جاز کیش آئی بی ایف ٹی کے ذریعے حقیقی وقت میں تصفیہ کرتا ہے۔' },
      { qEn: 'What are the transaction fees?', qUr: 'ٹرانزیکشن فیس کیا ہے؟', aEn: 'JazzCash charges a small percentage per transaction, typically between 0.5% and 1.5% depending on volume. Nafaa customers get preferential rates.', aUr: 'جاز کیش فی ٹرانزیکشن چھوٹا فیصد لیتا ہے۔ نفع گاہکوں کو ترجیحی ریٹس۔' },
      { qEn: 'Can I issue refunds through Nafaa?', qUr: 'کیا میں نفع کے ذریعے رقم واپس کر سکتا ہوں؟', aEn: 'Yes. Refunds are processed with one click in Nafaa. The customer receives their money back in their JazzCash wallet within minutes.', aUr: 'جی ہاں۔ ایک کلک میں رقم واپسی پروسیس ہوتی ہے۔' },
    ],
    relatedSlugs: ['easypaisa', 'raast', 'fbr', 'nayapay'],
  },
  easypaisa: {
    slug: 'easypaisa',
    heroTitleEn: 'Accept Easypaisa payments with instant confirmation',
    heroTitleUr: 'فوری تصدیق کے ساتھ ایزی پیسہ ادائیگیاں قبول کریں',
    heroSubtitleEn: 'Telenor\'s Easypaisa is Pakistan\'s trusted mobile wallet. Integrate directly with Nafaa for QR payments, wallet transfers, and instant settlement.',
    heroSubtitleUr: 'ٹیلی نار کا ایزی پیسہ پاکستان کا قابل اعتماد موبائل والیٹ۔ نفع سے براہ راست منسلک کریں۔',
    directAnswerEn: 'Nafaa\'s Easypaisa integration lets you accept payments through QR codes, direct wallet transfers, and payment links. Every transaction is confirmed instantly, reconciled automatically with your Nafaa sales, and settled to your bank account without delay.',
    directAnswerUr: 'نفع کا ایزی پیسہ انضمام کیو آر کوڈز، براہ راست والیٹ منتقلی، اور ادائیگی لنکس کے ذریعے ادائیگیاں قبول کرنے دیتا ہے۔',
    benefits: [
      { icon: 'QrCode', titleEn: 'Instant QR payments', titleUr: 'فوری کیو آر ادائیگیاں', descEn: 'Customers scan, confirm, and pay in under ten seconds. Fastest checkout in Pakistan.', descUr: 'گاہک اسکین کر کے دس سیکنڈ سے کم میں ادائیگی کریں۔' },
      { icon: 'Users', titleEn: '20M+ user base', titleUr: '۲ کروڑ سے زائد صارفین', descEn: 'Easypaisa has over twenty million active users. Reach a massive customer base instantly.', descUr: 'ایزی پیسہ کے دو کروڑ سے زائد فعال صارفین ہیں۔' },
      { icon: 'Link', titleEn: 'Payment links', titleUr: 'ادائیگی لنکس', descEn: 'Generate a link, send via WhatsApp, customer pays. Perfect for remote sales and quotations.', descUr: 'ایک لنک بنائیں، واٹس ایپ سے بھیجیں، گاہک ادائیگی کرے۔' },
      { icon: 'Bell', titleEn: 'Real-time notifications', titleUr: 'حقیقی وقت اطلاعات', descEn: 'Get notified in Nafaa the moment a customer pays. No more waiting or checking.', descUr: 'گاہک کی ادائیگی کے وقت نفع میں مطلع ہوں۔' },
      { icon: 'Shield', titleEn: 'Fraud protection', titleUr: 'فراڈ سے تحفظ', descEn: 'Every transaction is verified by Easypaisa\'s fraud detection systems.', descUr: 'ہر ٹرانزیکشن ایزی پیسہ کے فراڈ ڈیٹیکشن سسٹمز سے تصدیق شدہ۔' },
      { icon: 'Wallet', titleEn: 'Same-day settlement', titleUr: 'اسی دن تصفیہ', descEn: 'Funds reach your bank account within the same business day. No waiting.', descUr: 'فنڈز اسی کاروباری دن آپ کے بینک اکاؤنٹ تک پہنچ جاتے ہیں۔' },
    ],
    setupSteps: [
      { titleEn: 'Register as Easypaisa merchant', titleUr: 'ایزی پیسہ مرچنٹ کے طور پر رجسٹر کریں', descEn: 'Nafaa\'s team helps you complete Easypaisa merchant registration in minutes.', descUr: 'نفع کی ٹیم آپ کو ایزی پیسہ مرچنٹ رجسٹریشن مکمل کرنے میں مدد کرتی ہے۔' },
      { titleEn: 'Verify your business', titleUr: 'اپنے کاروبار کی تصدیق کریں', descEn: 'Easypaisa verifies your CNIC, business documents, and bank account.', descUr: 'ایزی پیسہ آپ کے سی این آئی سی، کاروباری دستاویزات، اور بینک اکاؤنٹ کی تصدیق کرتا ہے۔' },
      { titleEn: 'Connect in Nafaa', titleUr: 'نفع میں جوڑیں', descEn: 'Add your merchant ID and store credentials. Nafaa handles encryption automatically.', descUr: 'اپنی مرچنٹ آئی ڈی اور اسٹور کریڈنشلز شامل کریں۔' },
      { titleEn: 'Start accepting payments', titleUr: 'ادائیگیاں قبول کرنا شروع کریں', descEn: 'Print QR, generate payment links, or accept wallet transfers at checkout.', descUr: 'کیو آر پرنٹ کریں، ادائیگی لنکس بنائیں، یا چیک آؤٹ پر والیٹ منتقلی قبول کریں۔' },
    ],
    setupTimeMinutes: 10,
    useCases: [
      { en: 'Small retail shops across Pakistan', ur: 'پاکستان بھر میں چھوٹی ریٹیل دکانیں' },
      { en: 'Home-based and online businesses', ur: 'گھر پر اور آن لائن کاروبار' },
      { en: 'Service providers billing remotely', ur: 'دور سے بلنگ کرنے والے سروس فراہم کنندگان' },
      { en: 'Educational institutions collecting fees', ur: 'فیس جمع کرنے والے تعلیمی ادارے' },
    ],
    requirements: [
      { en: 'CNIC and business documents', ur: 'سی این آئی سی اور کاروباری دستاویزات' },
      { en: 'Bank account for settlement', ur: 'تصفیہ کے لیے بینک اکاؤنٹ' },
      { en: 'Active mobile number for OTPs', ur: 'او ٹی پیز کے لیے فعال موبائل نمبر' },
    ],
    supportedFeatures: [
      { en: 'QR payments', ur: 'کیو آر ادائیگیاں', available: true },
      { en: 'Wallet transfers', ur: 'والیٹ منتقلی', available: true },
      { en: 'Payment links', ur: 'ادائیگی لنکس', available: true },
      { en: 'Refunds', ur: 'رقم واپسی', available: true },
      { en: 'Split payments', ur: 'تقسیم ادائیگیاں', available: true },
      { en: 'Recurring billing', ur: 'مکرر بلنگ', available: true },
    ],
    faqs: [
      { qEn: 'Does Easypaisa work with all mobile networks?', qUr: 'کیا ایزی پیسہ تمام موبائل نیٹ ورکس کے ساتھ کام کرتا ہے؟', aEn: 'Yes. While Easypaisa is a Telenor service, any customer on any mobile network can pay via Easypaisa. They just need the Easypaisa app or account.', aUr: 'جی ہاں۔ اگرچہ ایزی پیسہ ٹیلی نار کی سروس ہے، کسی بھی نیٹ ورک کا صارف ادائیگی کر سکتا ہے۔' },
      { qEn: 'Are there daily transaction limits?', qUr: 'کیا روزانہ ٹرانزیکشن حدود ہیں؟', aEn: 'Merchants have generous daily and monthly limits based on account tier. Nafaa shows your current limits in the dashboard.', aUr: 'مرچنٹس کی اکاؤنٹ ٹیئر کی بنیاد پر روزانہ اور ماہانہ حدود ہیں۔' },
      { qEn: 'Can customers use Easypaisa without the app?', qUr: 'کیا گاہک ایپ کے بغیر ایزی پیسہ استعمال کر سکتے ہیں؟', aEn: 'Yes. Easypaisa supports USSD-based payments (dial *786#) for customers without smartphones or app access.', aUr: 'جی ہاں۔ ایزی پیسہ ان صارفین کے لیے یو ایس ایس ڈی ادائیگیاں سپورٹ کرتا ہے جن کے پاس اسمارٹ فون نہیں۔' },
    ],
    relatedSlugs: ['jazzcash', 'raast', 'fbr', 'nayapay'],
  },
  raast: {
    slug: 'raast',
    heroTitleEn: 'Raast — State Bank\'s instant payment rail in Nafaa',
    heroTitleUr: 'راست — نفع میں اسٹیٹ بینک کی فوری ادائیگی',
    heroSubtitleEn: 'Free, instant, bank-to-bank payments powered by the State Bank of Pakistan. Zero fees, real-time settlement, and universal acceptance.',
    heroSubtitleUr: 'مفت، فوری، بینک ٹو بینک ادائیگیاں جو اسٹیٹ بینک پاکستان کی طرف سے چلائی جاتی ہیں۔ صفر فیس۔',
    directAnswerEn: 'Raast is the State Bank of Pakistan\'s official instant payment system. Through Nafaa, you can accept Raast payments from any bank account in Pakistan with zero transaction fees, instant settlement, and IBAN-based transfers. This is the future of Pakistani payments.',
    directAnswerUr: 'راست اسٹیٹ بینک پاکستان کا سرکاری فوری ادائیگی نظام ہے۔ نفع کے ذریعے، آپ صفر ٹرانزیکشن فیس کے ساتھ ادائیگیاں قبول کر سکتے ہیں۔',
    benefits: [
      { icon: 'Zap', titleEn: 'Zero transaction fees', titleUr: 'صفر ٹرانزیکشن فیس', descEn: 'Raast payments are completely free for merchants and customers. Keep 100% of every sale.', descUr: 'راست ادائیگیاں مرچنٹس اور گاہکوں کے لیے مکمل مفت ہیں۔' },
      { icon: 'Landmark', titleEn: 'State Bank backed', titleUr: 'اسٹیٹ بینک کی حمایت', descEn: 'Official infrastructure of Pakistan\'s central bank. Maximum trust and security.', descUr: 'پاکستان کے مرکزی بینک کا سرکاری بنیادی ڈھانچہ۔' },
      { icon: 'Clock', titleEn: 'Real-time settlement', titleUr: 'حقیقی وقت تصفیہ', descEn: 'Money moves in seconds, not hours. Instant confirmation for every transaction.', descUr: 'پیسہ سیکنڈوں میں منتقل ہوتا ہے، گھنٹوں میں نہیں۔' },
      { icon: 'Building2', titleEn: 'All banks connected', titleUr: 'تمام بینک منسلک', descEn: 'Every major Pakistani bank supports Raast. Universal acceptance across the country.', descUr: 'ہر بڑا پاکستانی بینک راست سپورٹ کرتا ہے۔' },
      { icon: 'Hash', titleEn: 'Raast ID payments', titleUr: 'راست آئی ڈی ادائیگیاں', descEn: 'Customers pay to your simple Raast ID (like a mobile number). No IBAN memorization needed.', descUr: 'گاہک آپ کی سادہ راست آئی ڈی پر ادائیگی کرتے ہیں (موبائل نمبر کی طرح)۔' },
      { icon: 'ShieldCheck', titleEn: 'Bank-grade security', titleUr: 'بینک درجے کی سیکورٹی', descEn: 'Every payment authenticated through your customer\'s bank. Fraud virtually impossible.', descUr: 'ہر ادائیگی گاہک کے بینک کے ذریعے تصدیق شدہ۔' },
    ],
    setupSteps: [
      { titleEn: 'Get a Raast ID from your bank', titleUr: 'اپنے بینک سے راست آئی ڈی حاصل کریں', descEn: 'Every Pakistani bank offers free Raast ID registration to account holders.', descUr: 'ہر پاکستانی بینک اکاؤنٹ ہولڈرز کو مفت راست آئی ڈی رجسٹریشن پیش کرتا ہے۔' },
      { titleEn: 'Add your Raast ID to Nafaa', titleUr: 'اپنی راست آئی ڈی نفع میں شامل کریں', descEn: 'In Nafaa Integrations, paste your Raast ID and IBAN. Nafaa verifies with the State Bank instantly.', descUr: 'نفع میں اپنی راست آئی ڈی اور آئی بی اے این پیسٹ کریں۔' },
      { titleEn: 'Generate payment QRs', titleUr: 'ادائیگی کیو آرز بنائیں', descEn: 'Nafaa creates Raast-compatible QR codes for each sale, or you can display a static merchant QR.', descUr: 'نفع ہر سیل کے لیے راست کے مطابق کیو آر کوڈز بناتا ہے۔' },
      { titleEn: 'Accept your first payment', titleUr: 'اپنی پہلی ادائیگی قبول کریں', descEn: 'Customer scans QR, confirms in their banking app, and pays. You see confirmation in seconds.', descUr: 'گاہک کیو آر اسکین کرتا ہے، اپنی بینکنگ ایپ میں تصدیق کرتا ہے۔' },
    ],
    setupTimeMinutes: 6,
    useCases: [
      { en: 'Businesses tired of paying wallet transaction fees', ur: 'والیٹ ٹرانزیکشن فیس ادا کرنے سے تنگ کاروبار' },
      { en: 'High-volume retailers optimizing costs', ur: 'اخراجات کو بہتر بنانے والے ہائی والیوم ریٹیلرز' },
      { en: 'B2B businesses receiving large payments', ur: 'بی ٹو بی کاروبار جو بڑی ادائیگیاں وصول کرتے ہیں' },
      { en: 'Any Pakistani business with a bank account', ur: 'بینک اکاؤنٹ والا کوئی بھی پاکستانی کاروبار' },
    ],
    requirements: [
      { en: 'Active bank account in Pakistan', ur: 'پاکستان میں فعال بینک اکاؤنٹ' },
      { en: 'Raast ID registered with your bank', ur: 'آپ کے بینک کے ساتھ رجسٹرڈ راست آئی ڈی' },
      { en: 'Verified IBAN', ur: 'تصدیق شدہ آئی بی اے این' },
    ],
    supportedFeatures: [
      { en: 'QR code payments', ur: 'کیو آر کوڈ ادائیگیاں', available: true },
      { en: 'Raast ID transfers', ur: 'راست آئی ڈی منتقلی', available: true },
      { en: 'IBAN transfers', ur: 'آئی بی اے این منتقلی', available: true },
      { en: 'Instant confirmation', ur: 'فوری تصدیق', available: true },
      { en: 'Refunds', ur: 'رقم واپسی', available: true },
      { en: 'Recurring payments', ur: 'مکرر ادائیگیاں', available: false },
    ],
    faqs: [
      { qEn: 'Is Raast really free?', qUr: 'کیا راست واقعی مفت ہے؟', aEn: 'Yes. The State Bank of Pakistan has mandated that Raast transactions are completely free for both merchants and customers. There are no hidden fees.', aUr: 'جی ہاں۔ اسٹیٹ بینک نے حکم دیا ہے کہ راست ٹرانزیکشنز مکمل مفت ہوں۔' },
      { qEn: 'Which banks support Raast?', qUr: 'کون سے بینک راست کو سپورٹ کرتے ہیں؟', aEn: 'Every major Pakistani bank supports Raast including HBL, MCB, UBL, Meezan, Allied, Bank Alfalah, Standard Chartered, Faysal, Askari, and more.', aUr: 'ہر بڑا پاکستانی بینک راست کو سپورٹ کرتا ہے۔' },
      { qEn: 'How is Raast different from IBFT?', qUr: 'راست آئی بی ایف ٹی سے کیسے مختلف ہے؟', aEn: 'Raast is instant, free, and uses simple Raast IDs instead of full IBANs. IBFT charges fees and can take longer during off-hours. Raast is the modern, faster alternative.', aUr: 'راست فوری، مفت، اور سادہ راست آئی ڈیز استعمال کرتا ہے۔' },
    ],
    relatedSlugs: ['jazzcash', 'easypaisa', 'fbr', 'nayapay'],
  },
  tcs: {
    slug: 'tcs',
    heroTitleEn: 'TCS Courier — book shipments directly from Nafaa',
    heroTitleUr: 'ٹی سی ایس کوریئر — نفع سے براہ راست شپمنٹ بک کریں',
    heroSubtitleEn: 'Pakistan\'s most trusted courier, integrated into Nafaa. Book shipments, print labels, track deliveries, and manage COD — all without leaving your dashboard.',
    heroSubtitleUr: 'پاکستان کا سب سے قابل اعتماد کوریئر، نفع میں شامل۔ شپمنٹ بک کریں، لیبل پرنٹ کریں، ٹریک کریں۔',
    directAnswerEn: 'Nafaa\'s TCS integration lets you book couriers, print shipping labels, track packages, and manage cash on delivery collections directly from your dashboard. Every sale can be shipped with two clicks, and tracking information flows back automatically.',
    directAnswerUr: 'نفع کا ٹی سی ایس انضمام آپ کو براہ راست ڈیش بورڈ سے کوریئر بک کرنے، شپنگ لیبلز پرنٹ کرنے، پیکجز ٹریک کرنے کی اجازت دیتا ہے۔',
    benefits: [
      { icon: 'Truck', titleEn: 'One-click shipping', titleUr: 'ایک کلک شپنگ', descEn: 'Turn any Nafaa sale into a TCS shipment in seconds. Customer details fill automatically.', descUr: 'کسی بھی نفع سیل کو سیکنڈوں میں ٹی سی ایس شپمنٹ میں تبدیل کریں۔' },
      { icon: 'Printer', titleEn: 'Instant label printing', titleUr: 'فوری لیبل پرنٹنگ', descEn: 'Print TCS shipping labels directly from Nafaa. Compatible with thermal and A4 printers.', descUr: 'نفع سے براہ راست ٹی سی ایس شپنگ لیبلز پرنٹ کریں۔' },
      { icon: 'MapPin', titleEn: 'Real-time tracking', titleUr: 'حقیقی وقت ٹریکنگ', descEn: 'See exactly where every package is. Customers get automatic SMS updates on status changes.', descUr: 'دیکھیں کہ ہر پیکج کہاں ہے۔ گاہک کو خودکار ایس ایم ایس اپ ڈیٹس۔' },
      { icon: 'DollarSign', titleEn: 'COD management', titleUr: 'سی او ڈی مینجمنٹ', descEn: 'Cash on delivery collections tracked and reconciled automatically. Never lose track of money.', descUr: 'کیش آن ڈیلیوری وصولی خودکار ٹریک اور مصالحت۔' },
      { icon: 'PackageCheck', titleEn: 'Return management', titleUr: 'واپسی مینجمنٹ', descEn: 'Handle returns seamlessly. RTV (return to vendor) automated with tracking.', descUr: 'واپسیوں کو آسانی سے سنبھالیں۔' },
      { icon: 'Bell', titleEn: 'Delivery notifications', titleUr: 'ڈیلیوری اطلاعات', descEn: 'Get notified when packages are picked up, in transit, out for delivery, and delivered.', descUr: 'اطلاع پائیں جب پیکجز اٹھائے جائیں، سفر میں ہوں، ڈیلیوری کے لیے نکلیں، اور پہنچائے جائیں۔' },
    ],
    setupSteps: [
      { titleEn: 'Get TCS merchant account', titleUr: 'ٹی سی ایس مرچنٹ اکاؤنٹ حاصل کریں', descEn: 'Sign up as a TCS business customer for commercial rates and API access.', descUr: 'کاروباری ریٹس اور اے پی آئی رسائی کے لیے ٹی سی ایس بزنس کسٹمر کے طور پر سائن اپ کریں۔' },
      { titleEn: 'Enter TCS credentials', titleUr: 'ٹی سی ایس کریڈنشلز درج کریں', descEn: 'Add your TCS account number, API key, and pickup address in Nafaa integrations.', descUr: 'اپنا ٹی سی ایس اکاؤنٹ نمبر، اے پی آئی کلید، اور پک اپ پتہ شامل کریں۔' },
      { titleEn: 'Configure default settings', titleUr: 'ڈیفالٹ سیٹنگز تشکیل دیں', descEn: 'Set default package weight, insurance, and delivery preferences.', descUr: 'ڈیفالٹ پیکج وزن، انشورنس، اور ڈیلیوری ترجیحات سیٹ کریں۔' },
      { titleEn: 'Ship your first order', titleUr: 'اپنا پہلا آرڈر بھیجیں', descEn: 'From any sale, click Ship with TCS. Label prints. Package ready for pickup.', descUr: 'کسی بھی سیل سے، ٹی سی ایس کے ساتھ بھیجیں پر کلک کریں۔' },
    ],
    setupTimeMinutes: 8,
    useCases: [
      { en: 'E-commerce businesses shipping nationwide', ur: 'ملک بھر شپنگ کرنے والے ای کامرس کاروبار' },
      { en: 'Fashion and garments with online orders', ur: 'آن لائن آرڈرز والے فیشن اور گارمنٹس' },
      { en: 'Electronics retailers for warranty returns', ur: 'وارنٹی واپسیوں کے لیے الیکٹرانکس ریٹیلرز' },
      { en: 'Any business shipping goods across cities', ur: 'شہروں کے درمیان سامان بھیجنے والا کوئی بھی کاروبار' },
    ],
    requirements: [
      { en: 'TCS commercial account', ur: 'ٹی سی ایس کمرشل اکاؤنٹ' },
      { en: 'API access from TCS', ur: 'ٹی سی ایس سے اے پی آئی رسائی' },
      { en: 'Verified pickup address', ur: 'تصدیق شدہ پک اپ پتہ' },
    ],
    supportedFeatures: [
      { en: 'Shipment booking', ur: 'شپمنٹ بکنگ', available: true },
      { en: 'Label printing', ur: 'لیبل پرنٹنگ', available: true },
      { en: 'Real-time tracking', ur: 'حقیقی وقت ٹریکنگ', available: true },
      { en: 'COD collection', ur: 'سی او ڈی وصولی', available: true },
      { en: 'Return management', ur: 'واپسی مینجمنٹ', available: true },
      { en: 'Bulk booking', ur: 'بلک بکنگ', available: true },
    ],
    faqs: [
      { qEn: 'How does COD reconciliation work?', qUr: 'سی او ڈی مصالحت کیسے کام کرتی ہے؟', aEn: 'TCS collects cash on delivery from your customer and deposits it to your bank account weekly. Nafaa automatically matches each COD deposit to the original sale.', aUr: 'ٹی سی ایس گاہک سے نقد وصول کرتا ہے اور ہفتہ وار آپ کے بینک میں جمع کرتا ہے۔' },
      { qEn: 'What cities does TCS cover?', qUr: 'ٹی سی ایس کن شہروں کا احاطہ کرتا ہے؟', aEn: 'TCS delivers to over 3,500 cities and towns across Pakistan, including remote areas. Coverage is essentially nationwide.', aUr: 'ٹی سی ایس پاکستان کے ۳۵۰۰ سے زائد شہروں تک ڈیلیور کرتا ہے۔' },
      { qEn: 'Can I get bulk discount rates?', qUr: 'کیا میں بلک ڈسکاؤنٹ ریٹس حاصل کر سکتا ہوں؟', aEn: 'Yes. TCS offers volume-based discounts. Nafaa customers with high shipping volume get preferential negotiated rates automatically.', aUr: 'جی ہاں۔ ٹی سی ایس والیوم پر مبنی ڈسکاؤنٹس پیش کرتا ہے۔' },
    ],
    relatedSlugs: ['leopards', 'postex', 'callcourier', 'daraz'],
  },
  'whatsapp-business': {
    slug: 'whatsapp-business',
    heroTitleEn: 'WhatsApp Business API — receipts, reminders, and marketing',
    heroTitleUr: 'واٹس ایپ بزنس اے پی آئی — رسیدیں، یاد دہانیاں، اور مارکیٹنگ',
    heroSubtitleEn: 'The world\'s most-used messaging app, integrated into Nafaa. Send digital receipts, khata reminders, order updates, and marketing campaigns — all automated.',
    heroSubtitleUr: 'دنیا کی سب سے زیادہ استعمال ہونے والی میسجنگ ایپ، نفع میں شامل۔ ڈجیٹل رسیدیں، کھاتہ یاد دہانیاں، آرڈر اپ ڈیٹس۔',
    directAnswerEn: 'Nafaa integrates directly with WhatsApp Business API to send automated messages to your customers. Digital receipts after every sale, gentle khata reminders for udhaar customers, order status updates, and approved marketing broadcasts — all from your Nafaa dashboard.',
    directAnswerUr: 'نفع واٹس ایپ بزنس اے پی آئی سے براہ راست منسلک ہے تاکہ آپ کے گاہکوں کو خودکار پیغامات بھیجے جا سکیں۔',
    benefits: [
      { icon: 'Receipt', titleEn: 'Digital receipts', titleUr: 'ڈجیٹل رسیدیں', descEn: 'Every sale sends a beautiful PDF receipt via WhatsApp instantly. Save paper, look professional.', descUr: 'ہر سیل واٹس ایپ کے ذریعے فوری خوبصورت پی ڈی ایف رسید بھیجتی ہے۔' },
      { icon: 'Bell', titleEn: 'Khata reminders', titleUr: 'کھاتہ یاد دہانیاں', descEn: 'Automatic udhaar reminders that increase recovery rates by 95%. Polite, professional, and effective.', descUr: 'خودکار ادھار یاد دہانیاں جو وصولی کی شرح ۹۵٪ بڑھاتی ہیں۔' },
      { icon: 'Package', titleEn: 'Order updates', titleUr: 'آرڈر اپ ڈیٹس', descEn: 'Confirmed, packed, dispatched, delivered — customers get status updates automatically.', descUr: 'تصدیق شدہ، پیک، بھیجی گئی، ڈیلیور — گاہک خودکار اپ ڈیٹس پاتے ہیں۔' },
      { icon: 'Megaphone', titleEn: 'Marketing broadcasts', titleUr: 'مارکیٹنگ نشریات', descEn: 'Send promotions to segmented customer lists. Sale announcements, new products, festival greetings.', descUr: 'تقسیم شدہ گاہک فہرستوں کو پروموشنز بھیجیں۔' },
      { icon: 'MessageSquare', titleEn: 'Two-way conversations', titleUr: 'دو طرفہ گفتگو', descEn: 'Customers reply, you respond. Full conversation history saved in Nafaa customer profile.', descUr: 'گاہک جواب دیتے ہیں، آپ جواب دیتے ہیں۔ مکمل گفتگو کی تاریخ محفوظ۔' },
      { icon: 'BadgeCheck', titleEn: 'Green tick verification', titleUr: 'گرین ٹک تصدیق', descEn: 'Nafaa helps you get the official Meta verified badge for maximum trust.', descUr: 'نفع آپ کو زیادہ سے زیادہ اعتماد کے لیے میٹا کا سرکاری تصدیق شدہ بیج حاصل کرنے میں مدد کرتا ہے۔' },
    ],
    setupSteps: [
      { titleEn: 'Verify your business with Meta', titleUr: 'میٹا کے ساتھ اپنے کاروبار کی تصدیق کریں', descEn: 'Nafaa guides you through Meta Business verification (usually 3-5 business days).', descUr: 'نفع آپ کو میٹا بزنس تصدیق کے عمل میں رہنمائی کرتا ہے (عام طور پر ۳-۵ کاروباری دن)۔' },
      { titleEn: 'Get a WhatsApp Business number', titleUr: 'واٹس ایپ بزنس نمبر حاصل کریں', descEn: 'Use a new number or migrate your existing one. Nafaa handles the technical setup.', descUr: 'نیا نمبر استعمال کریں یا اپنا موجودہ منتقل کریں۔' },
      { titleEn: 'Approve message templates', titleUr: 'میسج ٹیمپلیٹس منظور کریں', descEn: 'Nafaa provides pre-built templates for receipts, reminders, and updates. Meta approves within hours.', descUr: 'نفع رسیدوں، یاد دہانیوں، اور اپ ڈیٹس کے لیے پہلے سے تیار ٹیمپلیٹس فراہم کرتا ہے۔' },
      { titleEn: 'Start messaging customers', titleUr: 'گاہکوں کو پیغام رسانی شروع کریں', descEn: 'Every sale can now trigger a WhatsApp receipt. Marketing broadcasts and reminders go live.', descUr: 'ہر سیل اب واٹس ایپ رسید متحرک کر سکتی ہے۔' },
    ],
    setupTimeMinutes: 15,
    useCases: [
      { en: 'Any business communicating with customers', ur: 'گاہکوں سے بات کرنے والا کوئی بھی کاروبار' },
      { en: 'Kiryana stores with udhaar customers', ur: 'ادھار گاہکوں والے کریانہ اسٹورز' },
      { en: 'E-commerce for order updates', ur: 'آرڈر اپ ڈیٹس کے لیے ای کامرس' },
      { en: 'Service businesses for appointment reminders', ur: 'اپائنٹمنٹ یاد دہانیوں کے لیے سروس کاروبار' },
    ],
    requirements: [
      { en: 'Verified Meta Business account', ur: 'تصدیق شدہ میٹا بزنس اکاؤنٹ' },
      { en: 'Dedicated phone number for WhatsApp Business', ur: 'واٹس ایپ بزنس کے لیے مخصوص فون نمبر' },
      { en: 'Business documentation', ur: 'کاروباری دستاویزات' },
    ],
    supportedFeatures: [
      { en: 'Transactional messages', ur: 'ٹرانزیکشنل پیغامات', available: true },
      { en: 'Marketing broadcasts', ur: 'مارکیٹنگ نشریات', available: true },
      { en: 'Two-way chat', ur: 'دو طرفہ چیٹ', available: true },
      { en: 'Media attachments', ur: 'میڈیا منسلکات', available: true },
      { en: 'Interactive buttons', ur: 'انٹرایکٹو بٹن', available: true },
      { en: 'Green tick badge', ur: 'گرین ٹک بیج', available: true },
    ],
    faqs: [
      { qEn: 'What are Meta\'s WhatsApp charges?', qUr: 'میٹا کی واٹس ایپ چارجز کیا ہیں؟', aEn: 'Meta charges per conversation (24-hour window), typically PKR 1-5 depending on message type. Utility messages (receipts, reminders) are cheaper than marketing. Nafaa shows exact costs upfront.', aUr: 'میٹا فی گفتگو چارج کرتا ہے (۲۴ گھنٹے کی ونڈو)۔' },
      { qEn: 'Do customers need to opt in?', qUr: 'کیا گاہکوں کو رضامندی درکار ہے؟', aEn: 'For marketing broadcasts, yes — Meta requires customer opt-in. Transactional messages like receipts and reminders don\'t need opt-in when triggered by customer purchases.', aUr: 'مارکیٹنگ نشریات کے لیے، ہاں — میٹا کو گاہک کی رضامندی درکار ہے۔' },
      { qEn: 'Can I use my regular WhatsApp number?', qUr: 'کیا میں اپنا عام واٹس ایپ نمبر استعمال کر سکتا ہوں؟', aEn: 'No. WhatsApp Business API requires a dedicated number. Once migrated, the number can only be used through the API (not the regular WhatsApp app).', aUr: 'نہیں۔ واٹس ایپ بزنس اے پی آئی کو مخصوص نمبر درکار ہے۔' },
    ],
    relatedSlugs: ['jazzcash', 'easypaisa', 'foodpanda', 'daraz'],
  },
};

export function getIntegrationContent(slug: string): IntegrationContent | null {
  return integrationContent[slug] ?? null;
}
