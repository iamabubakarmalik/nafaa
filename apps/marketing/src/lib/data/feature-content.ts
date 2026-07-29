export interface FeatureContent {
  slug: string;
  heroTitleEn: string;
  heroTitleUr: string;
  heroSubtitleEn: string;
  heroSubtitleUr: string;
  directAnswerEn: string;
  directAnswerUr: string;
  capabilities: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string; icon: string }>;
  showcaseTitleEn: string;
  showcaseTitleUr: string;
  showcaseDescEn: string;
  showcaseDescUr: string;
  showcasePoints: Array<{ en: string; ur: string }>;
  compareTable?: {
    titleEn: string;
    titleUr: string;
    rows: Array<{ featureEn: string; featureUr: string; nafaa: string; others: string }>;
  };
  keyMetrics: Array<{ valueEn: string; valueUr: string; labelEn: string; labelUr: string }>;
  faqs: Array<{ qEn: string; qUr: string; aEn: string; aUr: string }>;
  relatedSlugs: string[];
}

export const featureContent: Record<string, FeatureContent> = {
  pos: {
    slug: 'pos',
    heroTitleEn: 'The fastest point of sale ever built for Pakistan',
    heroTitleUr: 'پاکستان کے لیے اب تک کا سب سے تیز پوائنٹ آف سیل',
    heroSubtitleEn: 'Barcode scanning under three seconds. Works fully offline. Accepts every Pakistani payment method. Prints receipts, sends WhatsApp copies, and syncs live to your dashboard — all at counter speed.',
    heroSubtitleUr: 'تین سیکنڈ سے کم میں بار کوڈ اسکیننگ۔ مکمل آف لائن۔ ہر پاکستانی ادائیگی طریقہ قبول۔',
    directAnswerEn: 'Nafaa Point of Sale is the fastest and most reliable POS system in Pakistan. It handles barcode scanning, multiple payment methods including JazzCash and Easypaisa, offline mode for unreliable internet, customer displays, thermal printer support, and real-time inventory updates. Every transaction completes in under three seconds.',
    directAnswerUr: 'نفع پوائنٹ آف سیل پاکستان کا سب سے تیز اور قابل اعتماد پی او ایس سسٹم ہے۔',
    capabilities: [
      { icon: 'Zap', titleEn: 'Sub-three-second checkout', titleUr: 'تین سیکنڈ سے کم چیک آؤٹ', descEn: 'Scan, tap, done. Optimized for high-volume counter operations.', descUr: 'اسکین، ٹیپ، ہو گیا۔' },
      { icon: 'Wifi', titleEn: 'Full offline mode', titleUr: 'مکمل آف لائن موڈ', descEn: 'Sell without internet. Everything syncs automatically when connection returns.', descUr: 'انٹرنیٹ کے بغیر فروخت۔' },
      { icon: 'CreditCard', titleEn: 'Every payment method', titleUr: 'ہر ادائیگی طریقہ', descEn: 'Cash, JazzCash, Easypaisa, Raast, cards, bank transfer, split payments — all supported.', descUr: 'نقد، جاز کیش، ایزی پیسہ، راست، کارڈز۔' },
      { icon: 'Printer', titleEn: 'Thermal & A4 printing', titleUr: 'تھرمل اور اے فور پرنٹنگ', descEn: 'Compatible with every major thermal printer. WhatsApp PDF fallback included.', descUr: 'ہر بڑا تھرمل پرنٹر مطابق۔' },
      { icon: 'Monitor', titleEn: 'Customer display', titleUr: 'کسٹمر ڈسپلے', descEn: 'Show customers their cart in real time on a second screen. Optional but powerful.', descUr: 'گاہکوں کو ان کا کارٹ دکھائیں۔' },
      { icon: 'ScanLine', titleEn: 'Any barcode scanner', titleUr: 'کوئی بھی بار کوڈ اسکینر', descEn: 'USB, Bluetooth, or phone camera. Works with every scanner sold in Pakistan.', descUr: 'یو ایس بی، بلوٹوتھ، یا فون کیمرہ۔' },
    ],
    showcaseTitleEn: 'Built for real Pakistani counters',
    showcaseTitleUr: 'حقیقی پاکستانی کاؤنٹرز کے لیے',
    showcaseDescEn: 'We spent thousands of hours in kiryana stores, bakeries, and pharmacies watching real cashiers work. Every keystroke, every tap, every decision — we optimized for the reality of Pakistani retail.',
    showcaseDescUr: 'ہم نے ہزاروں گھنٹے حقیقی دکانوں میں گزارے۔',
    showcasePoints: [
      { en: 'Hotkeys designed for one-handed operation', ur: 'ایک ہاتھ سے کام کے لیے ہاٹ کیز' },
      { en: 'Works on cheap Android phones and old computers', ur: 'سستے اینڈرائیڈ فون اور پرانے کمپیوٹرز پر' },
      { en: 'Handles slow 3G networks gracefully', ur: 'سست تھری جی نیٹ ورکس کو خوبصورتی سے سنبھالتا ہے' },
      { en: 'Urdu keyboard support with auto-suggestions', ur: 'خودکار تجاویز کے ساتھ اردو کی بورڈ' },
      { en: 'Multi-cashier mode with individual tracking', ur: 'انفرادی ٹریکنگ کے ساتھ ملٹی کیشیئر موڈ' },
      { en: 'Refunds and returns in under fifteen seconds', ur: 'پندرہ سیکنڈ میں رقم واپسی اور واپسی' },
    ],
    compareTable: {
      titleEn: 'Nafaa POS vs traditional POS systems',
      titleUr: 'نفع پی او ایس بمقابلہ روایتی سسٹمز',
      rows: [
        { featureEn: 'Transaction speed', featureUr: 'ٹرانزیکشن رفتار', nafaa: 'Under 3 seconds', others: '15-30 seconds' },
        { featureEn: 'Offline mode', featureUr: 'آف لائن موڈ', nafaa: 'Full', others: 'None or limited' },
        { featureEn: 'Pakistani payments', featureUr: 'پاکستانی ادائیگیاں', nafaa: 'All supported', others: 'Cards only' },
        { featureEn: 'Setup cost', featureUr: 'سیٹ اپ لاگت', nafaa: 'Rs 0', others: 'Rs 50K-500K' },
        { featureEn: 'Hardware requirement', featureUr: 'ہارڈ ویئر ضرورت', nafaa: 'Any device', others: 'Specific hardware' },
        { featureEn: 'Language support', featureUr: 'زبان سپورٹ', nafaa: 'English + Urdu', others: 'English only' },
      ],
    },
    keyMetrics: [
      { valueEn: '<3 sec', valueUr: '<۳ سیکنڈ', labelEn: 'per transaction', labelUr: 'فی لین دین' },
      { valueEn: '100%', valueUr: '۱۰۰٪', labelEn: 'offline capable', labelUr: 'آف لائن قابل' },
      { valueEn: '99.99%', valueUr: '۹۹.۹۹٪', labelEn: 'transaction success', labelUr: 'ٹرانزیکشن کامیابی' },
      { valueEn: '15+', valueUr: '۱۵+', labelEn: 'payment methods', labelUr: 'ادائیگی طریقے' },
    ],
    faqs: [
      { qEn: 'Does the POS work without internet?', qUr: 'کیا پی او ایس انٹرنیٹ کے بغیر کام کرتا ہے؟', aEn: 'Yes, completely. Nafaa POS is offline-first. You can process sales, look up products, check inventory, and print receipts without any internet connection. When your connection returns, everything syncs automatically to the cloud.', aUr: 'جی ہاں، مکمل طور پر۔ نفع پی او ایس آف لائن پہلے کے اصول پر بنایا گیا ہے۔' },
      { qEn: 'What hardware do I need?', qUr: 'مجھے کون سا ہارڈ ویئر چاہیے؟', aEn: 'Just a phone, tablet, or computer. That is it. Optional accessories include a barcode scanner (any USB one works), a thermal receipt printer, and a customer display. All optional.', aUr: 'صرف فون، ٹیبلٹ، یا کمپیوٹر۔' },
      { qEn: 'How does the POS handle multiple cashiers?', qUr: 'پی او ایس متعدد کیشیئرز کو کیسے سنبھالتا ہے؟', aEn: 'Each cashier logs in with their own PIN or account. All sales, refunds, and cash drawer actions are tracked per cashier. End-of-shift reports show exactly who did what.', aUr: 'ہر کیشیئر اپنے پن یا اکاؤنٹ سے لاگ اِن کرتا ہے۔' },
    ],
    relatedSlugs: ['inventory', 'khata', 'fbr', 'multi-shop'],
  },
  inventory: {
    slug: 'inventory',
    heroTitleEn: 'Smart inventory management that thinks like your business',
    heroTitleUr: 'ذہین انوینٹری مینجمنٹ جو آپ کے کاروبار کی طرح سوچے',
    heroSubtitleEn: 'Multi-unit pricing, batch and expiry tracking, IMEI serial numbers, low-stock alerts, bulk Excel import, and even square-foot inventory for carpets. Every Pakistani business is covered.',
    heroSubtitleUr: 'متعدد یونٹ قیمتیں، بیچ اور ایکسپائری، آئی ایم ای آئی، کم اسٹاک الرٹس، بلک ایکسل امپورٹ۔',
    directAnswerEn: 'Nafaa Inventory is the most flexible inventory management system for Pakistani businesses. It handles multi-unit pricing (piece, dozen, carton, kg, gram), batch and expiry tracking for pharmacies and bakeries, IMEI tracking for mobile shops, roll-based inventory for carpet shops, and unlimited product variants for garments.',
    directAnswerUr: 'نفع انوینٹری پاکستانی کاروبار کے لیے سب سے لچکدار انوینٹری مینجمنٹ سسٹم ہے۔',
    capabilities: [
      { icon: 'Package', titleEn: 'Multi-unit pricing', titleUr: 'متعدد یونٹ قیمتیں', descEn: 'Sell same item as piece, dozen, or carton. Automatic conversion and pricing.', descUr: 'ایک ہی آئٹم پیس، درجن، یا کارٹن میں فروخت کریں۔' },
      { icon: 'Calendar', titleEn: 'Batch & expiry tracking', titleUr: 'بیچ اور ایکسپائری ٹریکنگ', descEn: 'Every batch tracked separately. FIFO logic. Alerts 30/60/90 days before expiry.', descUr: 'ہر بیچ الگ ٹریک۔' },
      { icon: 'Smartphone', titleEn: 'IMEI & serial numbers', titleUr: 'آئی ایم ای آئی و سیریل نمبر', descEn: 'Track each phone, appliance, or serialized item individually. Prevent fraud.', descUr: 'ہر فون یا سیریلائزڈ آئٹم انفرادی ٹریک۔' },
      { icon: 'AlertCircle', titleEn: 'Low stock alerts', titleUr: 'کم اسٹاک الرٹس', descEn: 'Never run out. Automatic notifications when items hit reorder points.', descUr: 'خودکار اطلاعات۔' },
      { icon: 'FileSpreadsheet', titleEn: 'Bulk Excel import', titleUr: 'بلک ایکسل امپورٹ', descEn: 'Upload thousands of products in seconds. Templates for every industry.', descUr: 'سیکنڈوں میں ہزاروں پروڈکٹس۔' },
      { icon: 'Layers', titleEn: 'Unlimited variants', titleUr: 'لامحدود تغیرات', descEn: 'Size and color matrix for garments. Every combination tracked separately.', descUr: 'گارمنٹس کے لیے سائز اور رنگ میٹرکس۔' },
    ],
    showcaseTitleEn: 'From one product to one hundred thousand',
    showcaseTitleUr: 'ایک پروڈکٹ سے ایک لاکھ تک',
    showcaseDescEn: 'Whether you sell three items or thirty thousand SKUs across fifty categories, Nafaa Inventory scales with you. Real-time updates. Zero lag. Zero data loss.',
    showcaseDescUr: 'چاہے آپ تین آئٹمز بیچیں یا تیس ہزار۔',
    showcasePoints: [
      { en: 'Real-time stock updates across all shops', ur: 'تمام دکانوں میں حقیقی وقت اسٹاک اپ ڈیٹس' },
      { en: 'Automatic stock deduction on every sale', ur: 'ہر سیل پر خودکار اسٹاک کٹوتی' },
      { en: 'Stock transfers between shops with audit trail', ur: 'دکانوں کے درمیان ٹرانسفر' },
      { en: 'Purchase orders and supplier management', ur: 'خریداری آرڈرز اور سپلائر مینجمنٹ' },
      { en: 'Barcode auto-generation for products without one', ur: 'بار کوڈ خودکار تیاری' },
      { en: 'Product cost tracking for accurate profit margins', ur: 'درست منافع کے لیے لاگت ٹریکنگ' },
    ],
    keyMetrics: [
      { valueEn: '100K+', valueUr: '۱ لاکھ+', labelEn: 'products supported', labelUr: 'پروڈکٹس سپورٹ' },
      { valueEn: 'Real-time', valueUr: 'حقیقی وقت', labelEn: 'stock updates', labelUr: 'اسٹاک اپ ڈیٹس' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'expired stock', labelUr: 'ایکسپائرڈ اسٹاک' },
      { valueEn: '95%', valueUr: '۹۵٪', labelEn: 'less shrinkage', labelUr: 'کم سکڑاؤ' },
    ],
    faqs: [
      { qEn: 'Can I import products from Excel?', qUr: 'کیا میں ایکسل سے پروڈکٹس امپورٹ کر سکتا ہوں؟', aEn: 'Yes. Nafaa provides Excel templates for every industry. Upload thousands of products in seconds. Nafaa handles barcodes, categories, prices, stock levels, and variants automatically.', aUr: 'جی ہاں۔ نفع ہر صنعت کے لیے ایکسل ٹیمپلیٹس فراہم کرتا ہے۔' },
      { qEn: 'How does batch tracking work for pharmacies?', qUr: 'فارمیسیز کے لیے بیچ ٹریکنگ کیسے کام کرتی ہے؟', aEn: 'Each purchase creates a batch record with expiry date. FIFO ensures oldest stock sells first. Automatic alerts fire at 30, 60, and 90 days before expiry so you can act early.', aUr: 'ہر خریداری ایکسپائری کے ساتھ بیچ ریکارڈ بناتی ہے۔' },
      { qEn: 'Can I track products by IMEI?', qUr: 'کیا میں آئی ایم ای آئی سے پروڈکٹس ٹریک کر سکتا ہوں؟', aEn: 'Absolutely. Mobile shops, electronics stores, and appliance dealers can track each unit by IMEI or serial number. Scan at purchase, scan at sale, know exactly which unit is where.', aUr: 'بالکل۔ ہر یونٹ آئی ایم ای آئی سے ٹریک کریں۔' },
    ],
    relatedSlugs: ['pos', 'multi-shop', 'reports', 'analytics'],
  },
  khata: {
    slug: 'khata',
    heroTitleEn: 'Digital khata that retires your paper register forever',
    heroTitleUr: 'ڈجیٹل کھاتہ جو آپ کے کاغذی رجسٹر کو ہمیشہ کے لیے ریٹائر کر دے',
    heroSubtitleEn: 'Track every udhaar automatically. Send WhatsApp reminders that actually work. PDF statements on demand. Credit limits and overdue tracking. Ninety-five percent recovery rate.',
    heroSubtitleUr: 'ہر ادھار خودکار ٹریک۔ واٹس ایپ یاد دہانیاں جو واقعی کام کریں۔ ۹۵٪ وصولی۔',
    directAnswerEn: 'Nafaa Digital Khata replaces the traditional paper udhaar register with a bilingual digital ledger. It automatically sends WhatsApp payment reminders to customers, generates professional PDF statements, tracks credit limits and overdue amounts, and delivers a proven ninety-five percent recovery rate.',
    directAnswerUr: 'نفع ڈجیٹل کھاتہ روایتی کاغذی ادھار رجسٹر کو دو لسانی ڈجیٹل کھاتے سے بدلتا ہے۔',
    capabilities: [
      { icon: 'BookOpen', titleEn: 'Bilingual ledger', titleUr: 'دو لسانی کھاتہ', descEn: 'Every entry in English and Urdu. Customers see receipts in their language.', descUr: 'ہر اندراج انگریزی اور اردو میں۔' },
      { icon: 'MessageSquare', titleEn: 'WhatsApp reminders', titleUr: 'واٹس ایپ یاد دہانیاں', descEn: 'Automatic gentle reminders on due dates. Customers appreciate the professionalism.', descUr: 'مقررہ تاریخوں پر خودکار نرم یاد دہانیاں۔' },
      { icon: 'FileText', titleEn: 'PDF statements', titleUr: 'پی ڈی ایف اسٹیٹمنٹس', descEn: 'Professional monthly statements. Send with one tap. Perfect for wholesale accounts.', descUr: 'پیشہ ورانہ ماہانہ اسٹیٹمنٹس۔' },
      { icon: 'AlertTriangle', titleEn: 'Overdue tracking', titleUr: 'بقایاجات ٹریکنگ', descEn: 'See exactly which customers are overdue and by how much. Prioritize collection.', descUr: 'دیکھیں کون سے گاہک بقایا ہیں۔' },
      { icon: 'Shield', titleEn: 'Credit limits', titleUr: 'ادھار حد', descEn: 'Set per-customer credit limits. System warns before extending credit beyond safe amounts.', descUr: 'فی گاہک ادھار حد سیٹ کریں۔' },
      { icon: 'History', titleEn: 'Complete history', titleUr: 'مکمل تاریخ', descEn: 'Every khata entry preserved forever. Never worry about lost or torn pages again.', descUr: 'ہر کھاتہ اندراج ہمیشہ محفوظ۔' },
    ],
    showcaseTitleEn: 'Why WhatsApp khata reminders actually work',
    showcaseTitleUr: 'واٹس ایپ یاد دہانیاں کیوں کام کرتی ہیں',
    showcaseDescEn: 'A paper reminder gets lost. A phone call feels aggressive. But a polite WhatsApp message with the exact amount and a payment link? That gets paid. Ninety-five percent of the time.',
    showcaseDescUr: 'کاغذی یاد دہانی کھو جاتی ہے۔ فون کال جارحانہ لگتی ہے۔',
    showcasePoints: [
      { en: 'Culturally appropriate polite tone', ur: 'ثقافتی طور پر مناسب شائستہ لہجہ' },
      { en: 'Includes exact balance and last transaction', ur: 'درست بیلنس اور آخری لین دین شامل' },
      { en: 'One-tap payment link via JazzCash or Raast', ur: 'جاز کیش یا راست کے ذریعے ایک ٹیپ ادائیگی' },
      { en: 'Escalating reminder sequence (day 3, 7, 15, 30)', ur: 'بڑھتی یاد دہانیاں (دن ۳، ۷، ۱۵، ۳۰)' },
      { en: 'Automatic pause on payment', ur: 'ادائیگی پر خودکار توقف' },
      { en: 'Customer never feels harassed', ur: 'گاہک کبھی پریشان محسوس نہیں کرتا' },
    ],
    keyMetrics: [
      { valueEn: '95%', valueUr: '۹۵٪', labelEn: 'khata recovery rate', labelUr: 'کھاتہ وصولی' },
      { valueEn: 'Rs 80K', valueUr: '۸۰ ہزار', labelEn: 'average first-year recovery', labelUr: 'اوسط پہلے سال کی وصولی' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost khata records', labelUr: 'کھوئے ریکارڈز' },
      { valueEn: '4 hours', valueUr: '۴ گھنٹے', labelEn: 'saved weekly', labelUr: 'ہفتہ وار بچت' },
    ],
    faqs: [
      { qEn: 'Do customers accept digital khata reminders?', qUr: 'کیا گاہک ڈجیٹل یاد دہانیاں قبول کرتے ہیں؟', aEn: 'Overwhelmingly yes. Our data shows a 95% recovery rate, versus 60% for paper khata. Customers appreciate the professionalism and the ability to pay instantly via link.', aUr: 'زبردست ہاں۔ ہمارا ڈیٹا ۹۵٪ وصولی کی شرح دکھاتا ہے۔' },
      { qEn: 'What if a customer does not have WhatsApp?', qUr: 'اگر گاہک کے پاس واٹس ایپ نہیں ہے تو؟', aEn: 'Nafaa automatically falls back to SMS. If they have no phone at all, you can print a khata slip that looks like a professional statement.', aUr: 'نفع خودکار طور پر ایس ایم ایس پر واپس آتا ہے۔' },
      { qEn: 'Can I set different credit limits per customer?', qUr: 'کیا میں مختلف گاہکوں کے لیے مختلف حدیں رکھ سکتا ہوں؟', aEn: 'Yes. Every customer can have their own credit limit. The system prevents cashiers from extending credit beyond the limit without owner approval.', aUr: 'جی ہاں۔ ہر گاہک کی اپنی حد۔' },
    ],
    relatedSlugs: ['pos', 'notifications', 'reports', 'analytics'],
  },
  'multi-shop': {
    slug: 'multi-shop',
    heroTitleEn: 'One dashboard, unlimited shops, complete control',
    heroTitleUr: 'ایک ڈیش بورڈ، لامحدود دکانیں، مکمل کنٹرول',
    heroSubtitleEn: 'Manage two shops or two hundred from a single command center. Consolidated reports, stock transfers, per-shop pricing, role-based staff access, and centralized inventory — all built in.',
    heroSubtitleUr: 'ایک کمانڈ سینٹر سے دو دکانیں یا دو سو چلائیں۔',
    directAnswerEn: 'Nafaa Multi-Shop lets you manage unlimited branches from one central dashboard. Each shop maintains its own inventory, staff, and pricing, while consolidated reports show your complete business performance. Stock transfers between shops are automated, and role-based access keeps every location secure.',
    directAnswerUr: 'نفع ملٹی شاپ آپ کو ایک مرکزی ڈیش بورڈ سے لامحدود برانچز چلانے دیتا ہے۔',
    capabilities: [
      { icon: 'Building2', titleEn: 'Unlimited shops', titleUr: 'لامحدود دکانیں', descEn: 'Add as many locations as you need. No per-shop fees or artificial limits.', descUr: 'جتنے مقامات چاہیں شامل کریں۔' },
      { icon: 'BarChart3', titleEn: 'Consolidated reports', titleUr: 'متحد رپورٹس', descEn: 'See total business performance or drill down into any single shop.', descUr: 'کل کاروباری کارکردگی یا کسی ایک دکان کی تفصیل۔' },
      { icon: 'ArrowRightLeft', titleEn: 'Stock transfers', titleUr: 'اسٹاک ٹرانسفر', descEn: 'Move inventory between shops with full audit trail. Track in-transit stock.', descUr: 'دکانوں کے درمیان انوینٹری منتقل کریں۔' },
      { icon: 'DollarSign', titleEn: 'Per-shop pricing', titleUr: 'فی دکان قیمتیں', descEn: 'Same product, different prices per location. Perfect for city-specific pricing.', descUr: 'ایک ہی پروڈکٹ، مختلف قیمتیں۔' },
      { icon: 'Users', titleEn: 'Role-based access', titleUr: 'رول بیسڈ رسائی', descEn: 'Cashiers see only their shop. Managers see their region. Owners see everything.', descUr: 'کیشیئرز صرف اپنی دکان دیکھیں۔' },
      { icon: 'Package', titleEn: 'Centralized inventory', titleUr: 'مرکزی انوینٹری', descEn: 'One master product catalog, applied across all shops with local stock levels.', descUr: 'ایک ماسٹر کیٹلاگ، تمام دکانوں پر۔' },
    ],
    showcaseTitleEn: 'From single shop to nationwide chain',
    showcaseTitleUr: 'ایک دکان سے ملک گیر چین تک',
    showcaseDescEn: 'Many Nafaa customers started with one location and grew to ten, twenty, or fifty. The system scales seamlessly. Opening a new shop takes minutes, not weeks.',
    showcaseDescUr: 'بہت سے نفع گاہک ایک مقام سے شروع ہوئے اور دس، بیس، یا پچاس تک بڑھے۔',
    showcasePoints: [
      { en: 'Open a new shop in under five minutes', ur: 'پانچ منٹ سے کم میں نئی دکان کھولیں' },
      { en: 'Clone existing shop settings to new location', ur: 'موجودہ ترتیبات نئی جگہ کاپی کریں' },
      { en: 'Assign managers and staff per shop', ur: 'ہر دکان کے لیے منتظمین اور اسٹاف' },
      { en: 'Shop-specific promotions and discounts', ur: 'دکان کے لیے مخصوص پروموشنز' },
      { en: 'Cross-shop customer loyalty programs', ur: 'کراس شاپ لائلٹی پروگرام' },
      { en: 'Regional grouping for franchise management', ur: 'فرنچائز کے لیے علاقائی گروپنگ' },
    ],
    keyMetrics: [
      { valueEn: '∞', valueUr: '∞', labelEn: 'shops supported', labelUr: 'دکانیں سپورٹ' },
      { valueEn: '5 min', valueUr: '۵ منٹ', labelEn: 'to open new shop', labelUr: 'نئی دکان کھولنے میں' },
      { valueEn: '1 view', valueUr: '۱ ویو', labelEn: 'for all locations', labelUr: 'تمام مقامات' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'per-shop fees', labelUr: 'فی دکان فیس' },
    ],
    faqs: [
      { qEn: 'Is there a limit to how many shops I can manage?', qUr: 'دکانوں کی تعداد کی کوئی حد ہے؟', aEn: 'No. You can manage unlimited shops on Nafaa. Some of our customers manage over fifty branches. There are no per-shop fees on any plan.', aUr: 'نہیں۔ آپ نفع پر لامحدود دکانیں چلا سکتے ہیں۔' },
      { qEn: 'Can each shop have different products?', qUr: 'کیا ہر دکان کے مختلف پروڈکٹس ہو سکتے ہیں؟', aEn: 'Absolutely. Master products live centrally, but each shop chooses which to carry. Some products can be shop-specific, others available everywhere.', aUr: 'بالکل۔ ماسٹر پروڈکٹس مرکزی ہیں، ہر دکان چنے۔' },
      { qEn: 'How do stock transfers work?', qUr: 'اسٹاک ٹرانسفر کیسے کام کرتے ہیں؟', aEn: 'Initiate a transfer from any shop. Stock immediately shows as in-transit. When the receiving shop confirms receipt, it moves to their inventory. Full audit trail included.', aUr: 'کسی بھی دکان سے ٹرانسفر شروع کریں۔' },
    ],
    relatedSlugs: ['inventory', 'pos', 'staff', 'analytics'],
  },
  fbr: {
    slug: 'fbr',
    heroTitleEn: 'FBR compliance without paperwork, panic, or penalties',
    heroTitleUr: 'کاغذی کارروائی، گھبراہٹ، اور جرمانوں کے بغیر ایف بی آر تعمیل',
    heroSubtitleEn: 'Real-time invoice submission, automatic QR code generation, retry logic for failed submissions, and audit-ready records — all built in. Approved FBR POS integration partner.',
    heroSubtitleUr: 'حقیقی وقت انوائس جمع، خودکار کیو آر، ناکام جمع پر دوبارہ کوشش۔',
    directAnswerEn: 'Nafaa is a certified FBR POS integration partner. Every sale flows to the Federal Board of Revenue in real time with automatic QR verification, retry logic for network issues, and complete audit trail. Compliance is fully automated — you never touch a form.',
    directAnswerUr: 'نفع تصدیق شدہ ایف بی آر پی او ایس انضمام پارٹنر ہے۔',
    capabilities: [
      { icon: 'Landmark', titleEn: 'Real-time submission', titleUr: 'حقیقی وقت جمع', descEn: 'Every sale reaches FBR within seconds. Zero delay, zero risk.', descUr: 'ہر سیل سیکنڈوں میں ایف بی آر تک۔' },
      { icon: 'QrCode', titleEn: 'QR on every receipt', titleUr: 'ہر رسید پر کیو آر', descEn: 'Customers scan to verify authenticity on the official FBR portal.', descUr: 'گاہک ایف بی آر پورٹل پر تصدیق کر سکیں۔' },
      { icon: 'RefreshCw', titleEn: 'Automatic retry', titleUr: 'خودکار دوبارہ کوشش', descEn: 'If FBR is down, submissions queue locally and retry until accepted.', descUr: 'اگر ایف بی آر بند ہو، مقامی طور پر قطار میں۔' },
      { icon: 'FileCheck', titleEn: '72-month archive', titleUr: '۷۲ ماہ آرکائیو', descEn: 'Six years of records kept securely. Ready for any audit at any time.', descUr: 'چھ سال کے ریکارڈز محفوظ۔' },
      { icon: 'Sliders', titleEn: 'Flexible modes', titleUr: 'لچکدار موڈز', descEn: 'Submit all sales, only above threshold, or manually. Full control.', descUr: 'تمام سیلز، حد سے اوپر، یا دستی طور پر۔' },
      { icon: 'Shield', titleEn: 'Sandbox testing', titleUr: 'سینڈ باکس ٹیسٹنگ', descEn: 'Test everything safely before going live with real submissions.', descUr: 'لائیو جانے سے پہلے محفوظ ٹیسٹنگ۔' },
    ],
    showcaseTitleEn: 'FBR compliance without ever touching a form',
    showcaseTitleUr: 'فارم چھوئے بغیر ایف بی آر تعمیل',
    showcaseDescEn: 'Traditional FBR compliance requires manual monthly returns, sales register maintenance, and constant paperwork. Nafaa automates every single step. You just do business — compliance handles itself.',
    showcaseDescUr: 'روایتی ایف بی آر تعمیل دستی ماہانہ ریٹرنز چاہتی ہے۔',
    showcasePoints: [
      { en: 'Automatic sales register generation', ur: 'خودکار سیلز رجسٹر تیاری' },
      { en: 'Monthly return data pre-filled', ur: 'ماہانہ ریٹرن ڈیٹا پہلے سے بھرا' },
      { en: 'Tax rate configuration per product', ur: 'فی پروڈکٹ ٹیکس ریٹ' },
      { en: 'Buyer type handling (registered vs unregistered)', ur: 'خریدار قسم سنبھالنا' },
      { en: 'Provincial tax authority support (PRA, SRB, KPRA)', ur: 'صوبائی ٹیکس اتھارٹیز' },
      { en: 'Digital signature on every invoice', ur: 'ہر انوائس پر ڈجیٹل دستخط' },
    ],
    keyMetrics: [
      { valueEn: '100%', valueUr: '۱۰۰٪', labelEn: 'FBR compliant', labelUr: 'ایف بی آر تعمیل' },
      { valueEn: 'Real-time', valueUr: 'حقیقی وقت', labelEn: 'submission', labelUr: 'جمع' },
      { valueEn: '72 months', valueUr: '۷۲ ماہ', labelEn: 'audit archive', labelUr: 'آڈٹ آرکائیو' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'penalties', labelUr: 'جرمانے' },
    ],
    faqs: [
      { qEn: 'Am I required to integrate with FBR?', qUr: 'کیا مجھے ایف بی آر سے منسلک ہونا ضروری ہے؟', aEn: 'If you are classified as a Tier 1 retailer by FBR, yes. Nafaa handles the entire integration process, from POS ID registration to going live in production.', aUr: 'اگر آپ ٹیئر ون ریٹیلر ہیں، تو ہاں۔' },
      { qEn: 'What happens if FBR servers are down?', qUr: 'اگر ایف بی آر سرورز بند ہوں؟', aEn: 'Your sales continue normally. Nafaa queues submissions locally and retries automatically every few minutes. When FBR is back online, everything catches up. Zero data loss.', aUr: 'آپ کی سیلز عام طور پر جاری۔' },
      { qEn: 'Can I choose which sales to submit?', qUr: 'کیا میں چن سکتا ہوں کون سی سیلز جمع کروں؟', aEn: 'Yes. Nafaa supports four modes: disabled, manual (per invoice), automatic for all sales, or automatic above a configurable amount threshold. Full control.', aUr: 'جی ہاں۔ چار موڈز ہیں۔' },
    ],
    relatedSlugs: ['pos', 'reports', 'analytics', 'multi-shop'],
  },
  'ai-assistant': {
    slug: 'ai-assistant',
    heroTitleEn: 'The AI assistant that actually understands your business',
    heroTitleUr: 'اے آئی معاون جو واقعی آپ کے کاروبار کو سمجھے',
    heroSubtitleEn: 'Ask anything in English or Urdu — voice or text. Which product is my best seller? What was last month\'s profit? Which customers should I focus on? Get answers in seconds.',
    heroSubtitleUr: 'انگریزی یا اردو میں کچھ بھی پوچھیں — آواز یا متن۔',
    directAnswerEn: 'Nafaa AI Assistant is the first bilingual business AI built specifically for Pakistani businesses. Ask questions in plain English or Urdu, use voice or text, and get instant answers backed by your actual business data. It reads your sales, inventory, customers, and reports live.',
    directAnswerUr: 'نفع اے آئی معاون پاکستانی کاروبار کے لیے خاص طور پر بنایا گیا پہلا دو لسانی بزنس اے آئی ہے۔',
    capabilities: [
      { icon: 'Sparkles', titleEn: 'Natural language queries', titleUr: 'قدرتی زبان کے سوالات', descEn: 'Ask like you would ask a colleague. No commands, no syntax, no learning curve.', descUr: 'ساتھی سے پوچھنے کی طرح پوچھیں۔' },
      { icon: 'Mic', titleEn: 'Voice input', titleUr: 'آواز ان پٹ', descEn: 'Tap and speak. Especially useful while managing a counter with hands full.', descUr: 'ٹیپ کریں اور بولیں۔' },
      { icon: 'Globe', titleEn: 'Bilingual', titleUr: 'دو لسانی', descEn: 'Full English and Urdu understanding. Ask in either language, get answers in either.', descUr: 'مکمل انگریزی اور اردو سمجھ۔' },
      { icon: 'TrendingUp', titleEn: 'Live business insights', titleUr: 'لائیو کاروباری بصیرت', descEn: 'Reads your real-time data. Not generic advice — specific answers about your business.', descUr: 'حقیقی وقت ڈیٹا پڑھتا ہے۔' },
      { icon: 'Lightbulb', titleEn: 'Proactive suggestions', titleUr: 'فعال تجاویز', descEn: 'AI notices patterns you missed. Suggests promotions, restocks, and optimizations.', descUr: 'اے آئی پیٹرن نوٹس کرتا ہے۔' },
      { icon: 'Lock', titleEn: 'Your data stays yours', titleUr: 'آپ کا ڈیٹا آپ کا', descEn: 'Never used for training models. Never shared. End-to-end encrypted.', descUr: 'ماڈلز کی تربیت کے لیے استعمال نہیں۔' },
    ],
    showcaseTitleEn: 'Real questions Pakistani business owners ask every day',
    showcaseTitleUr: 'روزانہ کے حقیقی سوالات',
    showcaseDescEn: 'The AI Assistant is trained on the actual questions Pakistani shopkeepers, restaurant owners, and pharmacists ask. It understands context, industry-specific terminology, and cultural nuances.',
    showcaseDescUr: 'اے آئی معاون حقیقی سوالات پر تربیت یافتہ ہے۔',
    showcasePoints: [
      { en: '"Show me last month\'s top ten selling products"', ur: '"پچھلے مہینے کے ٹاپ ۱۰ پروڈکٹس دکھاؤ"' },
      { en: '"Which customers have not visited in 30 days?"', ur: '"کون سے گاہک ۳۰ دن سے نہیں آئے؟"' },
      { en: '"How much profit did I make on biryani orders?"', ur: '"بریانی آرڈرز پر کتنا منافع؟"' },
      { en: '"Compare this Eid to last Eid sales"', ur: '"اس عید کا مقابلہ پچھلی عید سے کرو"' },
      { en: '"Which stock items are running low?"', ur: '"کون سے اسٹاک آئٹمز کم ہو رہے ہیں؟"' },
      { en: '"What should I stock more of for Ramzan?"', ur: '"رمضان کے لیے کیا زیادہ رکھوں؟"' },
    ],
    keyMetrics: [
      { valueEn: '2 sec', valueUr: '۲ سیکنڈ', labelEn: 'average response', labelUr: 'اوسط جواب' },
      { valueEn: '2 languages', valueUr: '۲ زبانیں', labelEn: 'English & Urdu', labelUr: 'انگریزی و اردو' },
      { valueEn: 'Voice + text', valueUr: 'آواز + متن', labelEn: 'input modes', labelUr: 'ان پٹ موڈز' },
      { valueEn: '100%', valueUr: '۱۰۰٪', labelEn: 'private', labelUr: 'نجی' },
    ],
    faqs: [
      { qEn: 'How is my data protected?', qUr: 'میرا ڈیٹا کیسے محفوظ ہے؟', aEn: 'Your business data is never used to train AI models. Every conversation is end-to-end encrypted. Data stays within Nafaa\'s secure infrastructure and is never shared with third parties.', aUr: 'آپ کا ڈیٹا ماڈلز کی تربیت کے لیے استعمال نہیں۔' },
      { qEn: 'Does it work in Urdu?', qUr: 'کیا یہ اردو میں کام کرتا ہے؟', aEn: 'Yes, fully. Ask questions in Urdu, get answers in Urdu. The AI understands Pakistani business context — kiryana, khata, udhaar, mandi rates, and industry-specific terms.', aUr: 'جی ہاں، مکمل طور پر۔' },
      { qEn: 'Can it access all my business data?', qUr: 'کیا یہ میرا سب ڈیٹا دیکھ سکتا ہے؟', aEn: 'Only the data you explicitly grant access to. You control what the AI can read (sales, inventory, customers, reports). You can revoke access anytime.', aUr: 'صرف وہ ڈیٹا جس کی آپ اجازت دیں۔' },
    ],
    relatedSlugs: ['analytics', 'reports', 'pos', 'inventory'],
  },
};

export function getFeatureContent(slug: string): FeatureContent | null {
  return featureContent[slug] ?? null;
}
