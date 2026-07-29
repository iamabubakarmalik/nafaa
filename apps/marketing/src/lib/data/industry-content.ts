export interface IndustryContent {
  slug: string;
  heroTitleEn: string;
  heroTitleUr: string;
  heroSubtitleEn: string;
  heroSubtitleUr: string;
  directAnswerEn: string; // for AEO — top of page 2-3 sentence answer
  directAnswerUr: string;
  pains: Array<{ en: string; ur: string }>;
  solutions: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string; icon: string }>;
  workflowSteps: Array<{ titleEn: string; titleUr: string; descEn: string; descUr: string }>;
  keyMetrics: Array<{ valueEn: string; valueUr: string; labelEn: string; labelUr: string }>;
  integrationSlugs: string[];
  faqs: Array<{ qEn: string; qUr: string; aEn: string; aUr: string }>;
  testimonialIds: string[];
}

export const industryContent: Record<string, IndustryContent> = {
  kiryana: {
    slug: 'kiryana',
    heroTitleEn: 'Kiryana store software built for real Pakistani shopkeepers',
    heroTitleUr: 'حقیقی پاکستانی دکانداروں کے لیے کریانہ اسٹور سافٹ ویئر',
    heroSubtitleEn: 'Barcode POS, digital khata with WhatsApp reminders, multi-unit pricing for wholesale and retail, and bulk import from Excel — all in one system that works offline.',
    heroSubtitleUr: 'بار کوڈ پی او ایس، واٹس ایپ یاد دہانیوں کے ساتھ ڈجیٹل کھاتہ، ہول سیل اور ریٹیل کے لیے متعدد یونٹ قیمتیں، اور ایکسل سے بلک امپورٹ — سب ایک نظام میں جو آف لائن بھی کام کرے۔',
    directAnswerEn: 'Nafaa is the #1 kiryana store software in Pakistan, purpose-built for corner shops and general stores. It combines lightning-fast barcode POS, digital khata replacing paper registers, multi-unit pricing for retail and wholesale, and automatic WhatsApp reminders for udhaar customers.',
    directAnswerUr: 'نفع پاکستان کا نمبر ایک کریانہ اسٹور سافٹ ویئر ہے، جو کونے کی دکانوں اور جنرل اسٹورز کے لیے خاص طور پر بنایا گیا ہے۔',
    pains: [
      { en: 'Paper khata gets lost, torn, or destroyed', ur: 'کاغذی کھاتہ گم، پھٹ یا تباہ ہو جاتا ہے' },
      { en: 'Cannot track stock — items run out unexpectedly', ur: 'اسٹاک ٹریک نہیں ہوتا — آئٹمز غیر متوقع طور پر ختم' },
      { en: 'Wholesale versus retail pricing confusion', ur: 'ہول سیل اور ریٹیل کی قیمتوں کا الجھاؤ' },
      { en: 'Customers forget udhaar amounts', ur: 'گاہک ادھار کی رقم بھول جاتے ہیں' },
      { en: 'End of day cash counting takes hours', ur: 'دن کے آخر میں نقد گنتی گھنٹے لیتی ہے' },
      { en: 'No profit visibility — is business growing?', ur: 'منافع نظر نہیں آتا — کاروبار بڑھ رہا ہے؟' },
    ],
    solutions: [
      { icon: 'Zap', titleEn: 'Blazing-fast barcode POS', titleUr: 'برق رفتار بار کوڈ پی او ایس', descEn: 'Scan and sell in under three seconds. Works with any USB barcode scanner or phone camera.', descUr: 'تین سیکنڈ سے کم میں اسکین اور فروخت۔' },
      { icon: 'BookOpen', titleEn: 'Digital khata with WhatsApp', titleUr: 'واٹس ایپ کے ساتھ ڈجیٹل کھاتہ', descEn: 'Every udhaar tracked automatically. Send payment reminders on WhatsApp with one tap.', descUr: 'ہر ادھار خودکار ٹریک۔ ایک ٹیپ سے یاد دہانی۔' },
      { icon: 'Package', titleEn: 'Multi-unit pricing', titleUr: 'متعدد یونٹ قیمتیں', descEn: 'Sell per kilo, per gram, per dozen, per carton — automatic conversion and pricing.', descUr: 'کلو، گرام، درجن، کارٹن — خودکار قیمت۔' },
      { icon: 'FileSpreadsheet', titleEn: 'Excel bulk import', titleUr: 'ایکسل بلک امپورٹ', descEn: 'Upload thousands of products in seconds. Templates provided for easy setup.', descUr: 'سیکنڈوں میں ہزاروں پروڈکٹس اپ لوڈ۔' },
      { icon: 'Wifi', titleEn: 'Works fully offline', titleUr: 'مکمل آف لائن کام', descEn: 'Sell without internet. Data syncs automatically when connection returns.', descUr: 'انٹرنیٹ کے بغیر فروخت۔ کنیکشن پر خودکار ہم آہنگی۔' },
      { icon: 'BarChart3', titleEn: 'Daily profit reports', titleUr: 'روزانہ منافع رپورٹس', descEn: 'See exactly how much you made today, this week, this month. Automatic and always live.', descUr: 'آج، اس ہفتے، اس مہینے کا منافع دیکھیں۔' },
    ],
    workflowSteps: [
      { titleEn: 'Sign up in two minutes', titleUr: 'دو منٹ میں سائن اپ', descEn: 'No credit card required. Free trial starts instantly.', descUr: 'کریڈٹ کارڈ نہیں چاہیے۔ مفت آزمائش فوری شروع۔' },
      { titleEn: 'Import your products', titleUr: 'اپنے پروڈکٹس امپورٹ کریں', descEn: 'Upload Excel file or add manually. Barcode auto-generation available.', descUr: 'ایکسل اپ لوڈ کریں یا دستی طور پر شامل کریں۔' },
      { titleEn: 'Start selling', titleUr: 'فروخت شروع کریں', descEn: 'Scan barcodes, take payments, send WhatsApp receipts. All in seconds.', descUr: 'بار کوڈ اسکین، ادائیگی، واٹس ایپ رسیدیں۔' },
      { titleEn: 'Track everything', titleUr: 'ہر چیز ٹریک کریں', descEn: 'Dashboard shows sales, stock, khata, and profit — updated live.', descUr: 'ڈیش بورڈ سیلز، اسٹاک، کھاتہ، منافع دکھاتا ہے۔' },
    ],
    keyMetrics: [
      { valueEn: '3 seconds', valueUr: '۳ سیکنڈ', labelEn: 'per transaction', labelUr: 'فی لین دین' },
      { valueEn: '95%', valueUr: '۹۵٪', labelEn: 'khata recovery rate', labelUr: 'کھاتہ وصولی' },
      { valueEn: '4 hours', valueUr: '۴ گھنٹے', labelEn: 'saved daily', labelUr: 'روزانہ بچت' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost khata records', labelUr: 'کھوئے ہوئے ریکارڈز' },
    ],
    integrationSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business', 'fbr'],
    faqs: [
      { qEn: 'Do I need a computer to use Nafaa?', qUr: 'کیا نفع استعمال کرنے کے لیے کمپیوٹر چاہیے؟', aEn: 'No. Nafaa runs perfectly on any Android or iOS phone, tablet, or computer. Most Pakistani kiryana shopkeepers use it on their existing smartphone.', aUr: 'نہیں۔ نفع کسی بھی اینڈرائیڈ یا آئی او ایس فون، ٹیبلٹ یا کمپیوٹر پر مکمل چلتا ہے۔' },
      { qEn: 'What if I do not know how to type in English?', qUr: 'اگر میں انگریزی نہیں لکھ سکتا تو کیا ہوگا؟', aEn: 'Nafaa is fully bilingual. Every screen, button, and message is available in proper Urdu. You can type in Urdu, English, or use voice input.', aUr: 'نفع مکمل دو لسانی ہے۔ ہر اسکرین، بٹن، اور پیغام درست اردو میں دستیاب ہے۔' },
      { qEn: 'Can I use it for a wholesale kiryana shop too?', qUr: 'کیا میں اسے ہول سیل کریانہ کے لیے بھی استعمال کر سکتا ہوں؟', aEn: 'Absolutely. Nafaa supports separate wholesale and retail pricing, bulk unit conversion (dozen, carton, ton), and dedicated wholesale customer accounts with credit terms.', aUr: 'بالکل۔ نفع الگ ہول سیل اور ریٹیل قیمتیں، بلک یونٹ تبدیلی، اور ادھار شرائط کے ساتھ ہول سیل اکاؤنٹس سپورٹ کرتا ہے۔' },
    ],
    testimonialIds: ['t5'],
  },
  bakery: {
    slug: 'bakery',
    heroTitleEn: 'Complete bakery management from custom cakes to daily production',
    heroTitleUr: 'خصوصی کیک سے روزانہ پیداوار تک مکمل بیکری مینجمنٹ',
    heroSubtitleEn: 'Custom cake orders with photo cakes, ingredient inventory, daily production planning, expiry alerts, and delivery coordination — everything a modern Pakistani bakery needs.',
    heroSubtitleUr: 'فوٹو کیک کے ساتھ خصوصی آرڈرز، اجزاء کی انوینٹری، روزانہ پیداواری منصوبہ بندی، ایکسپائری الرٹس، اور ڈیلیوری کوآرڈینیشن۔',
    directAnswerEn: 'Nafaa is Pakistan\'s most complete bakery management platform, built for bakeries and sweet shops from Karachi to Peshawar. It handles custom cake orders with photo prints, tracks daily production, manages ingredient inventory with recipe costing, and sends automatic freshness alerts.',
    directAnswerUr: 'نفع پاکستان کا سب سے مکمل بیکری مینجمنٹ پلیٹ فارم ہے، کراچی سے پشاور تک بیکریوں اور مٹھائی کی دکانوں کے لیے۔',
    pains: [
      { en: 'Custom cake orders get lost or forgotten', ur: 'خصوصی کیک آرڈرز کھو یا بھول جاتے ہیں' },
      { en: 'No way to track ingredient costs per item', ur: 'فی آئٹم اجزاء کی لاگت ٹریک نہیں ہوتی' },
      { en: 'Expired items cause daily losses', ur: 'ایکسپائرڈ آئٹمز روزانہ نقصان کا سبب' },
      { en: 'Daily production planning is manual and error-prone', ur: 'روزانہ پیداواری منصوبہ بندی دستی' },
      { en: 'Bulk wedding and event orders overwhelm the team', ur: 'شادی اور تقریب کے بڑے آرڈرز مشکل' },
      { en: 'Photo cake orders need special coordination', ur: 'فوٹو کیک آرڈرز کو خصوصی تعاون چاہیے' },
    ],
    solutions: [
      { icon: 'Cake', titleEn: 'Custom cake order system', titleUr: 'خصوصی کیک آرڈر سسٹم', descEn: 'Capture size, flavor, message, photo, delivery date, and special instructions. Never miss an order.', descUr: 'سائز، ذائقہ، پیغام، تصویر، ڈیلیوری تاریخ، خصوصی ہدایات۔' },
      { icon: 'ChefHat', titleEn: 'Recipe and ingredient costing', titleUr: 'ریسیپی اور اجزاء کی لاگت', descEn: 'Track every ingredient, calculate exact cost per cake, and see real profit margins.', descUr: 'ہر جزو ٹریک، فی کیک لاگت، حقیقی منافع مارجن۔' },
      { icon: 'Clock', titleEn: 'Expiry and freshness tracking', titleUr: 'ایکسپائری اور تازگی ٹریکنگ', descEn: 'Automatic alerts before items expire. Convert near-expiry items to discounts to reduce waste.', descUr: 'ایکسپائر ہونے سے پہلے خودکار الرٹس۔' },
      { icon: 'Calendar', titleEn: 'Production planning', titleUr: 'پیداواری منصوبہ بندی', descEn: 'Plan daily bakes based on historical sales and pending orders. Save hours of manual work.', descUr: 'تاریخی سیلز اور آرڈرز کی بنیاد پر روزانہ منصوبہ بندی۔' },
      { icon: 'Truck', titleEn: 'Delivery coordination', titleUr: 'ڈیلیوری کوآرڈینیشن', descEn: 'Assign delivery boys, track routes, send customer SMS with ETA. Foodpanda integration included.', descUr: 'ڈیلیوری بوائز تفویض، راستے ٹریک، فوڈ پانڈا شامل۔' },
      { icon: 'Camera', titleEn: 'Photo cake support', titleUr: 'فوٹو کیک سپورٹ', descEn: 'Upload customer photos directly to order. Preview edible print sizing before production.', descUr: 'گاہک کی تصاویر براہ راست آرڈر پر اپ لوڈ۔' },
    ],
    workflowSteps: [
      { titleEn: 'Set up your bakery', titleUr: 'اپنی بیکری سیٹ اپ کریں', descEn: 'Add products, recipes, ingredients, and pricing in minutes.', descUr: 'منٹوں میں پروڈکٹس، ریسیپیز، اجزاء، اور قیمتیں شامل کریں۔' },
      { titleEn: 'Take orders anywhere', titleUr: 'کہیں بھی آرڈرز لیں', descEn: 'Walk-in, phone, WhatsApp, Foodpanda — all orders in one dashboard.', descUr: 'واک ان، فون، واٹس ایپ، فوڈ پانڈا — سب ایک ڈیش بورڈ میں۔' },
      { titleEn: 'Plan production', titleUr: 'پیداوار کی منصوبہ بندی', descEn: 'Morning kitchen sheet auto-generated with all items and quantities.', descUr: 'صبح کچن شیٹ خودکار تیار۔' },
      { titleEn: 'Deliver and grow', titleUr: 'ڈیلیور کریں اور بڑھیں', descEn: 'Automated customer follow-ups, birthday reminders, and loyalty rewards.', descUr: 'خودکار پیروی، سالگرہ یاد دہانیاں، اور لائلٹی انعامات۔' },
    ],
    keyMetrics: [
      { valueEn: '+42%', valueUr: '+۴۲٪', labelEn: 'monthly revenue', labelUr: 'ماہانہ آمدنی' },
      { valueEn: '-65%', valueUr: '-۶۵٪', labelEn: 'expired stock waste', labelUr: 'ایکسپائرڈ نقصان' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'missed cake orders', labelUr: 'چھوٹے آرڈرز' },
      { valueEn: '3 hours', valueUr: '۳ گھنٹے', labelEn: 'saved on production planning', labelUr: 'پیداوار میں بچت' },
    ],
    integrationSlugs: ['foodpanda', 'whatsapp-business', 'jazzcash', 'easypaisa', 'fbr'],
    faqs: [
      { qEn: 'Can I handle wedding and corporate bulk orders?', qUr: 'کیا میں شادی اور کارپوریٹ بڑے آرڈرز سنبھال سکتا ہوں؟', aEn: 'Yes. Nafaa supports bulk orders with advance payments, custom pricing, delivery scheduling, and multi-item event packages. Perfect for weddings, birthdays, and corporate events.', aUr: 'جی ہاں۔ نفع بلک آرڈرز، ایڈوانس، خصوصی قیمتیں، اور ملٹی آئٹم پیکجز سپورٹ کرتا ہے۔' },
      { qEn: 'Does it work with Foodpanda for delivery?', qUr: 'کیا یہ ڈیلیوری کے لیے فوڈ پانڈا کے ساتھ کام کرتا ہے؟', aEn: 'Yes. Full Foodpanda integration syncs your menu, receives orders automatically, and updates status in real time. You never miss an online order again.', aUr: 'جی ہاں۔ مکمل فوڈ پانڈا انضمام — مینو ہم آہنگ، خودکار آرڈرز، حقیقی وقت اسٹیٹس۔' },
      { qEn: 'How does the ingredient cost tracking work?', qUr: 'اجزاء کی لاگت ٹریکنگ کیسے کام کرتی ہے؟', aEn: 'You create recipes for each product with ingredient quantities. Nafaa automatically calculates cost per unit based on your purchase prices, so you always know your true profit margin.', aUr: 'ہر پروڈکٹ کے لیے ریسیپیز بنائیں۔ نفع خودکار لاگت حساب کرتا ہے۔' },
    ],
    testimonialIds: ['t1'],
  },
  pharmacy: {
    slug: 'pharmacy',
    heroTitleEn: 'DRAP-compliant pharmacy software with salt search and prescriptions',
    heroTitleUr: 'ڈریپ کے مطابق فارمیسی سافٹ ویئر، سالٹ تلاش اور نسخوں کے ساتھ',
    heroSubtitleEn: 'Batch and expiry tracking, salt-based medicine search, prescription scanning, doctor commission management, and controlled substance registers — everything a modern Pakistani pharmacy needs.',
    heroSubtitleUr: 'بیچ اور ایکسپائری ٹریکنگ، سالٹ پر مبنی تلاش، نسخہ اسکیننگ، ڈاکٹر کمیشن، اور کنٹرول شدہ ادویات کا رجسٹر۔',
    directAnswerEn: 'Nafaa is Pakistan\'s most trusted pharmacy management platform. It offers DRAP compliance, salt-based medicine search, prescription management, batch and expiry tracking with automatic alerts, doctor commission workflows, and legally-required controlled substance registers.',
    directAnswerUr: 'نفع پاکستان کا سب سے قابل اعتماد فارمیسی مینجمنٹ پلیٹ فارم ہے۔',
    pains: [
      { en: 'Finding medicines by salt name is manual', ur: 'سالٹ کے نام سے دوا تلاش دستی' },
      { en: 'Expired medicines cause huge losses and legal risk', ur: 'ایکسپائرڈ دوائیں بڑا نقصان اور قانونی خطرہ' },
      { en: 'Prescriptions get lost or misplaced', ur: 'نسخے کھو جاتے ہیں' },
      { en: 'DRAP compliance is complex and paper-heavy', ur: 'ڈریپ تعمیل پیچیدہ اور کاغذی' },
      { en: 'Controlled substances need government reporting', ur: 'کنٹرول شدہ ادویات کی حکومتی رپورٹنگ' },
      { en: 'Doctor commission tracking is error-prone', ur: 'ڈاکٹر کمیشن ٹریکنگ میں غلطیاں' },
    ],
    solutions: [
      { icon: 'Search', titleEn: 'Salt-based medicine search', titleUr: 'سالٹ پر مبنی دوا تلاش', descEn: 'Search by active ingredient. Find generic alternatives instantly. Match customer prescriptions faster.', descUr: 'سرگرم جزو سے تلاش۔ عام متبادل فوری۔' },
      { icon: 'AlertCircle', titleEn: 'Batch and expiry alerts', titleUr: 'بیچ اور ایکسپائری الرٹس', descEn: 'Every batch tracked separately. Automatic alerts thirty, sixty, and ninety days before expiry.', descUr: 'ہر بیچ الگ ٹریک۔ ۳۰، ۶۰، ۹۰ دن پہلے الرٹس۔' },
      { icon: 'FileText', titleEn: 'Prescription management', titleUr: 'نسخہ مینجمنٹ', descEn: 'Scan and store prescriptions digitally. Attach to customer records. Legal audit trail included.', descUr: 'نسخے ڈجیٹل اسکین اور محفوظ۔' },
      { icon: 'Shield', titleEn: 'DRAP compliance built-in', titleUr: 'ڈریپ تعمیل شامل', descEn: 'All required registers auto-generated. Ready for DRAP inspections at any time.', descUr: 'تمام درکار رجسٹرز خودکار تیار۔' },
      { icon: 'Lock', titleEn: 'Controlled substances register', titleUr: 'کنٹرول شدہ ادویات کا رجسٹر', descEn: 'Automatic register for schedule G and X medicines. Compliant with narcotics regulations.', descUr: 'شیڈول جی اور ایکس ادویات کے لیے خودکار رجسٹر۔' },
      { icon: 'Users', titleEn: 'Doctor commissions', titleUr: 'ڈاکٹر کمیشن', descEn: 'Track referring doctors. Automatic commission calculations. Monthly payment reports.', descUr: 'حوالہ دینے والے ڈاکٹرز ٹریک۔ خودکار کمیشن۔' },
    ],
    workflowSteps: [
      { titleEn: 'Import medicine catalog', titleUr: 'دوا کیٹلاگ امپورٹ', descEn: 'Bulk upload with salts, batches, and expiry dates. Templates for major distributors provided.', descUr: 'سالٹس، بیچز، ایکسپائری کے ساتھ بلک اپ لوڈ۔' },
      { titleEn: 'Scan and store prescriptions', titleUr: 'نسخے اسکین اور محفوظ کریں', descEn: 'Camera-based scanning. Auto-attach to customer profile.', descUr: 'کیمرہ اسکیننگ۔ خودکار گاہک پروفائل۔' },
      { titleEn: 'Sell with compliance', titleUr: 'تعمیل کے ساتھ فروخت', descEn: 'Every sale respects DRAP requirements. Prescription-only medicines flagged automatically.', descUr: 'ہر فروخت ڈریپ ضروریات کا احترام کرتی ہے۔' },
      { titleEn: 'Report and audit', titleUr: 'رپورٹ اور آڈٹ', descEn: 'DRAP-ready reports available anytime. Full audit trail for every action.', descUr: 'ڈریپ کے لیے تیار رپورٹس کسی بھی وقت۔' },
    ],
    keyMetrics: [
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'expired stock', labelUr: 'ایکسپائرڈ اسٹاک' },
      { valueEn: '100%', valueUr: '۱۰۰٪', labelEn: 'DRAP compliant', labelUr: 'ڈریپ تعمیل' },
      { valueEn: '15 seconds', valueUr: '۱۵ سیکنڈ', labelEn: 'to find any medicine', labelUr: 'کسی بھی دوا کی تلاش' },
      { valueEn: '+35%', valueUr: '+۳۵٪', labelEn: 'monthly profit', labelUr: 'ماہانہ منافع' },
    ],
    integrationSlugs: ['whatsapp-business', 'jazzcash', 'easypaisa', 'fbr', 'raast'],
    faqs: [
      { qEn: 'Does Nafaa help with DRAP compliance?', qUr: 'کیا نفع ڈریپ تعمیل میں مدد کرتا ہے؟', aEn: 'Yes. Nafaa is built to be fully DRAP compliant. All required registers, prescription tracking, controlled substances logs, and audit trails are automatic. You are always inspection-ready.', aUr: 'جی ہاں۔ نفع مکمل ڈریپ تعمیل کے لیے بنایا گیا ہے۔' },
      { qEn: 'Can I search medicines by salt or generic name?', qUr: 'کیا میں سالٹ یا جنرک نام سے دوا تلاش کر سکتا ہوں؟', aEn: 'Absolutely. Search by brand name, generic name, or active salt. Nafaa also shows all available alternatives with the same salt to help customers find substitutes.', aUr: 'بالکل۔ برانڈ نام، جنرک نام، یا سرگرم سالٹ سے تلاش کریں۔' },
      { qEn: 'How does batch and expiry tracking work?', qUr: 'بیچ اور ایکسپائری ٹریکنگ کیسے کام کرتی ہے؟', aEn: 'Every purchase creates a batch record with expiry date. FIFO logic ensures oldest stock sells first. Automatic alerts warn you thirty, sixty, and ninety days before expiry.', aUr: 'ہر خریداری ایکسپائری کے ساتھ بیچ ریکارڈ بناتی ہے۔' },
    ],
    testimonialIds: ['t2'],
  },
  restaurant: {
    slug: 'restaurant',
    heroTitleEn: 'Restaurant and cafe management with KOT, delivery, and Foodpanda',
    heroTitleUr: 'کے او ٹی، ڈیلیوری، اور فوڈ پانڈا کے ساتھ ریسٹورنٹ مینجمنٹ',
    heroSubtitleEn: 'Table management, kitchen order tickets, modifier engine, delivery riders, Foodpanda integration, recipe costing, and split billing — everything a modern Pakistani restaurant needs.',
    heroSubtitleUr: 'ٹیبل مینجمنٹ، کچن آرڈر ٹکٹس، موڈیفائر انجن، ڈیلیوری، فوڈ پانڈا انضمام، ریسیپی لاگت، اور سپلٹ بلنگ۔',
    directAnswerEn: 'Nafaa is Pakistan\'s most complete restaurant management platform. It supports dine-in tables, takeaway, delivery, kitchen order tickets to multiple stations, modifiers and add-ons, split billing, Foodpanda integration, rider dispatch, and recipe-based inventory costing.',
    directAnswerUr: 'نفع پاکستان کا سب سے مکمل ریسٹورنٹ مینجمنٹ پلیٹ فارم ہے۔',
    pains: [
      { en: 'Orders get confused between waiters and kitchen', ur: 'ویٹرز اور کچن کے درمیان آرڈرز کنفیوز' },
      { en: 'Split bills for groups are complicated', ur: 'گروپ کے لیے سپلٹ بلز مشکل' },
      { en: 'Delivery orders from multiple apps in different screens', ur: 'مختلف ایپس سے ڈیلیوری آرڈرز' },
      { en: 'No idea which items are profitable', ur: 'کون سے آئٹمز منافع بخش ہیں؟' },
      { en: 'Rider dispatch is manual and slow', ur: 'رائیڈر ڈسپیچ دستی اور سست' },
      { en: 'Modifiers like extra cheese cause errors', ur: 'ایکسٹرا چیز جیسے موڈیفائرز میں غلطیاں' },
    ],
    solutions: [
      { icon: 'Grid', titleEn: 'Visual table management', titleUr: 'بصری ٹیبل مینجمنٹ', descEn: 'See every table status at a glance. Assign waiters, split bills, merge orders — all with taps.', descUr: 'ایک نظر میں ہر ٹیبل کی صورتحال۔' },
      { icon: 'Printer', titleEn: 'KOT to multiple stations', titleUr: 'کے او ٹی متعدد اسٹیشنز', descEn: 'Route orders automatically to bar, grill, cold kitchen, or tandoor. Never lose a ticket.', descUr: 'بار، گرل، کولڈ کچن، تندور کو خودکار روٹنگ۔' },
      { icon: 'Plus', titleEn: 'Modifier engine', titleUr: 'موڈیفائر انجن', descEn: 'Extra cheese, no onion, spice level — all captured cleanly with pricing adjustments.', descUr: 'ایکسٹرا چیز، کوئی پیاز نہیں، مسالہ لیول۔' },
      { icon: 'Motorcycle', titleEn: 'Rider dispatch', titleUr: 'رائیڈر ڈسپیچ', descEn: 'Assign delivery boys, track GPS location, calculate commissions automatically.', descUr: 'ڈیلیوری بوائز تفویض، جی پی ایس ٹریک، خودکار کمیشن۔' },
      { icon: 'Truck', titleEn: 'Foodpanda integration', titleUr: 'فوڈ پانڈا انضمام', descEn: 'Menu sync, orders auto-received in KOT, status updates back to Foodpanda in real time.', descUr: 'مینو ہم آہنگی، خودکار آرڈرز، حقیقی وقت اسٹیٹس۔' },
      { icon: 'ChefHat', titleEn: 'Recipe costing', titleUr: 'ریسیپی لاگت', descEn: 'Know exact cost of every dish. See which items are truly profitable and which are hurting margins.', descUr: 'ہر ڈش کی حقیقی لاگت جانیں۔' },
    ],
    workflowSteps: [
      { titleEn: 'Build your menu', titleUr: 'اپنا مینو بنائیں', descEn: 'Add items, modifiers, categories, and photos. Set kitchen station routing.', descUr: 'آئٹمز، موڈیفائرز، اقسام، اور تصاویر شامل کریں۔' },
      { titleEn: 'Set up tables and stations', titleUr: 'ٹیبلز اور اسٹیشنز سیٹ اپ', descEn: 'Map your restaurant floor. Assign printers to bar, grill, and kitchen.', descUr: 'اپنی ریسٹورنٹ کا فلور بنائیں۔' },
      { titleEn: 'Take orders anywhere', titleUr: 'کہیں بھی آرڈرز لیں', descEn: 'Waiter on tablet, phone at counter, or online via Foodpanda — all sync live.', descUr: 'ویٹر ٹیبلٹ پر، کاؤنٹر پر فون، یا فوڈ پانڈا۔' },
      { titleEn: 'Deliver and analyze', titleUr: 'ڈیلیور اور تجزیہ', descEn: 'Riders deliver, customers rate, and you see complete analytics daily.', descUr: 'رائیڈرز ڈیلیور، گاہک ریٹ، آپ تجزیہ دیکھیں۔' },
    ],
    keyMetrics: [
      { valueEn: '+38%', valueUr: '+۳۸٪', labelEn: 'table turnover', labelUr: 'ٹیبل ٹرن اوور' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost orders', labelUr: 'کھوئے آرڈرز' },
      { valueEn: '4 min', valueUr: '۴ منٹ', labelEn: 'faster food delivery', labelUr: 'کھانا تیز ڈیلیوری' },
      { valueEn: '+52%', valueUr: '+۵۲٪', labelEn: 'delivery revenue', labelUr: 'ڈیلیوری آمدنی' },
    ],
    integrationSlugs: ['foodpanda', 'jazzcash', 'easypaisa', 'raast', 'whatsapp-business'],
    faqs: [
      { qEn: 'Does it work with Foodpanda?', qUr: 'کیا یہ فوڈ پانڈا کے ساتھ کام کرتا ہے؟', aEn: 'Yes. Full two-way integration. Menu items sync automatically, orders arrive directly in your kitchen, and delivery status flows back to Foodpanda in real time.', aUr: 'جی ہاں۔ مکمل دو طرفہ انضمام۔' },
      { qEn: 'Can I handle multiple kitchen stations?', qUr: 'کیا میں متعدد کچن اسٹیشنز سنبھال سکتا ہوں؟', aEn: 'Absolutely. Route bar drinks to the bar printer, tandoor items to the tandoor station, cold kitchen items to cold prep. Each station gets only their tickets.', aUr: 'بالکل۔ بار مشروبات بار پرنٹر پر، تندور آئٹمز تندور اسٹیشن پر۔' },
      { qEn: 'How does split billing work?', qUr: 'سپلٹ بلنگ کیسے کام کرتی ہے؟', aEn: 'Split by item, by seat, or by custom amount. Multiple payment methods on one bill. Each customer can pay their portion via any method.', aUr: 'آئٹم، سیٹ، یا خصوصی رقم کے حساب سے تقسیم کریں۔' },
    ],
    testimonialIds: [],
  },
  'mobile-shop': {
    slug: 'mobile-shop',
    heroTitleEn: 'Mobile shop software with IMEI, PTA, repairs, and EMI',
    heroTitleUr: 'آئی ایم ای آئی، پی ٹی اے، مرمت، اور اقساط کے ساتھ موبائل شاپ سافٹ ویئر',
    heroSubtitleEn: 'IMEI-level inventory tracking, PTA status verification, used phone trade-ins, repair ticket management, EMI installment plans, and warranty tracking — built for Pakistan.',
    heroSubtitleUr: 'آئی ایم ای آئی سطح انوینٹری، پی ٹی اے تصدیق، پرانے فون تبادلہ، مرمت ٹکٹس، قسطی منصوبے۔',
    directAnswerEn: 'Nafaa is Pakistan\'s leading mobile shop management platform. It tracks every phone by IMEI, manages PTA compliance status, handles used phone trade-ins with inspection workflows, coordinates repair tickets with parts and labor, and supports EMI installment plans with automatic reminders.',
    directAnswerUr: 'نفع پاکستان کا سب سے بہترین موبائل شاپ مینجمنٹ پلیٹ فارم ہے۔',
    pains: [
      { en: 'Losing track of which IMEI is in stock', ur: 'کون سا آئی ایم ای آئی اسٹاک میں ہے، ٹریک نہیں' },
      { en: 'PTA tax status confusion causes fines', ur: 'پی ٹی اے ٹیکس اسٹیٹس کنفیوژن' },
      { en: 'Used phone valuation is inconsistent', ur: 'پرانے فون کی قیمت میں تضاد' },
      { en: 'Repair tickets get lost between technicians', ur: 'مرمت ٹکٹس ٹیکنیشنز کے درمیان کھو جاتے ہیں' },
      { en: 'EMI installments hard to track and remind', ur: 'اقساط ٹریک اور یاد دلانا مشکل' },
      { en: 'Multi-branch stock visibility is missing', ur: 'ملٹی برانچ اسٹاک نظر نہیں آتا' },
    ],
    solutions: [
      { icon: 'Smartphone', titleEn: 'IMEI-level inventory', titleUr: 'آئی ایم ای آئی سطح انوینٹری', descEn: 'Every phone tracked by unique IMEI. Scan to check stock, verify authenticity, and prevent fraud.', descUr: 'ہر فون منفرد آئی ایم ای آئی سے۔' },
      { icon: 'Shield', titleEn: 'PTA status tracking', titleUr: 'پی ٹی اے اسٹیٹس ٹریکنگ', descEn: 'Approved, non-PTA, patched — status recorded per device. Tax liability calculated automatically.', descUr: 'منظور، غیر پی ٹی اے، پیچ شدہ۔' },
      { icon: 'RefreshCw', titleEn: 'Used phone trade-ins', titleUr: 'پرانے فون تبادلہ', descEn: 'Structured inspection checklist, condition grading, buyback pricing, and resale profit tracking.', descUr: 'منظم معائنہ چیک لسٹ، حالت گریڈنگ۔' },
      { icon: 'Wrench', titleEn: 'Repair ticket workflow', titleUr: 'مرمت ٹکٹ ورک فلو', descEn: 'From received to delivered — every step tracked with parts, labor, technician, and customer SMS updates.', descUr: 'وصول سے ڈیلیور تک — ہر قدم ٹریک۔' },
      { icon: 'Calendar', titleEn: 'EMI installment plans', titleUr: 'اقساط منصوبے', descEn: 'Structured payment plans with automatic reminders. Late payment notifications via SMS and WhatsApp.', descUr: 'خودکار یاد دہانیوں کے ساتھ منظم منصوبے۔' },
      { icon: 'Building2', titleEn: 'Multi-branch management', titleUr: 'ملٹی برانچ مینجمنٹ', descEn: 'One dashboard for all your shops. Transfer stock, share customers, unified reporting.', descUr: 'تمام دکانوں کے لیے ایک ڈیش بورڈ۔' },
    ],
    workflowSteps: [
      { titleEn: 'Import phones by IMEI', titleUr: 'آئی ایم ای آئی سے فون امپورٹ', descEn: 'Bulk import from purchase invoices. Verify PTA status automatically.', descUr: 'خریداری انوائسز سے بلک امپورٹ۔' },
      { titleEn: 'Sell with confidence', titleUr: 'اعتماد سے فروخت', descEn: 'Scan IMEI at checkout. System verifies, calculates tax, and prints compliant invoice.', descUr: 'چیک آؤٹ پر آئی ایم ای آئی اسکین۔' },
      { titleEn: 'Repair and service', titleUr: 'مرمت اور سروس', descEn: 'Log repair tickets, assign technicians, order parts, notify customers when ready.', descUr: 'مرمت ٹکٹس، ٹیکنیشنز، پارٹس، اطلاعات۔' },
      { titleEn: 'Grow across branches', titleUr: 'برانچز میں ترقی', descEn: 'Open new locations easily. Transfer stock. See consolidated performance instantly.', descUr: 'نئی جگہیں کھولیں۔ اسٹاک ٹرانسفر۔' },
    ],
    keyMetrics: [
      { valueEn: '3 branches', valueUr: '۳ برانچز', labelEn: 'unified in one', labelUr: 'ایک ڈیش بورڈ' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost IMEIs', labelUr: 'کھوئے آئی ایم ای آئیز' },
      { valueEn: '+45%', valueUr: '+۴۵٪', labelEn: 'repair revenue', labelUr: 'مرمت آمدنی' },
      { valueEn: '2 hours', valueUr: '۲ گھنٹے', labelEn: 'daily management time', labelUr: 'روزانہ انتظام' },
    ],
    integrationSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business', 'fbr', 'tcs'],
    faqs: [
      { qEn: 'How does IMEI tracking work?', qUr: 'آئی ایم ای آئی ٹریکنگ کیسے کام کرتی ہے؟', aEn: 'Every phone has a unique IMEI. Nafaa scans the IMEI at purchase and sale. You know exactly which phone is in stock, sold, or under repair at any moment.', aUr: 'ہر فون کا منفرد آئی ایم ای آئی ہے۔' },
      { qEn: 'Can it handle PTA compliance?', qUr: 'کیا یہ پی ٹی اے تعمیل سنبھال سکتا ہے؟', aEn: 'Yes. Every device is tagged as PTA-approved, non-PTA, or patched. Tax liability is calculated automatically. FBR invoicing is included when required.', aUr: 'جی ہاں۔ ہر ڈیوائس ٹیگ ہوتا ہے۔' },
      { qEn: 'What about used phone trade-ins?', qUr: 'پرانے فون کے تبادلے کا کیا؟', aEn: 'Structured workflow: capture customer, inspect phone with checklist (screen, battery, camera), grade condition, offer buyback price, and track resale profit.', aUr: 'منظم ورک فلو — گاہک، معائنہ، درجہ بندی، قیمت۔' },
    ],
    testimonialIds: ['t3'],
  },
  garments: {
    slug: 'garments',
    heroTitleEn: 'Boutique and garments software with size, color, and tailoring',
    heroTitleUr: 'سائز، رنگ، اور سلائی کے ساتھ بوتیک اور گارمنٹس سافٹ ویئر',
    heroSubtitleEn: 'Size and color variant matrix, seasonal collections, custom tailoring orders with measurements, alterations, layaway installment plans, and multi-branch management.',
    heroSubtitleUr: 'سائز اور رنگ میٹرکس، موسمی کلیکشنز، ناپ کے ساتھ سلائی، الٹریشن، قسطی منصوبے۔',
    directAnswerEn: 'Nafaa is the complete platform for Pakistani garments and boutiques. It manages size and color variant matrices, seasonal collections like Eid Luxury and Summer Lawn, custom tailoring orders with saved measurements, alterations, layaway plans, and multi-branch retail operations.',
    directAnswerUr: 'نفع پاکستانی گارمنٹس اور بوتیک کے لیے مکمل پلیٹ فارم ہے۔',
    pains: [
      { en: 'Tracking size and color combinations is a nightmare', ur: 'سائز اور رنگ کے مرکبات ٹریک کرنا ڈراؤنا خواب' },
      { en: 'Seasonal collections need special discount handling', ur: 'موسمی کلیکشنز کی خصوصی رعایت' },
      { en: 'Customer measurements get lost', ur: 'گاہک کی پیمائشیں کھو جاتی ہیں' },
      { en: 'Custom tailoring orders miss deadlines', ur: 'خصوصی سلائی آرڈرز ڈیڈ لائن مِس' },
      { en: 'Alterations and layaway confuse the system', ur: 'الٹریشن اور قسطیں کنفیوز' },
      { en: 'Multi-branch stock movement is invisible', ur: 'ملٹی برانچ اسٹاک نظر نہیں آتا' },
    ],
    solutions: [
      { icon: 'Grid', titleEn: 'Size and color matrix', titleUr: 'سائز اور رنگ میٹرکس', descEn: 'Every variant tracked separately. See exactly which sizes and colors are in stock across all branches.', descUr: 'ہر تغیر الگ ٹریک۔' },
      { icon: 'Sparkles', titleEn: 'Seasonal collections', titleUr: 'موسمی کلیکشنز', descEn: 'Group products into Eid, Summer Lawn, Wedding, and other collections with special pricing.', descUr: 'عید، سمر لان، شادی جیسے کلیکشنز۔' },
      { icon: 'Ruler', titleEn: 'Customer measurements', titleUr: 'گاہک کی پیمائشیں', descEn: 'Save every customer\'s measurements. Reuse for future custom orders. No more paper slips.', descUr: 'ہر گاہک کی پیمائشیں محفوظ۔' },
      { icon: 'Scissors', titleEn: 'Custom tailoring', titleUr: 'خصوصی سلائی', descEn: 'Full workflow: measurement, design reference, tailor assignment, fabric issue, deadline tracking.', descUr: 'مکمل ورک فلو — پیمائش سے ڈیڈ لائن تک۔' },
      { icon: 'Wrench', titleEn: 'Alterations tracking', titleUr: 'الٹریشن ٹریکنگ', descEn: 'Alteration tickets with pickup dates, technician assignment, and customer notifications.', descUr: 'الٹریشن ٹکٹس، پک اپ، اطلاعات۔' },
      { icon: 'Calendar', titleEn: 'Layaway installments', titleUr: 'قسطی منصوبے', descEn: 'Reserve expensive items with structured payment plans. Perfect for bridal wear.', descUr: 'منظم ادائیگی منصوبوں کے ساتھ مہنگے آئٹمز۔' },
    ],
    workflowSteps: [
      { titleEn: 'Build variant catalog', titleUr: 'تغیر کیٹلاگ بنائیں', descEn: 'Add products with size and color combinations. Bulk generate SKUs automatically.', descUr: 'سائز اور رنگ کے مرکبات کے ساتھ پروڈکٹس۔' },
      { titleEn: 'Launch collections', titleUr: 'کلیکشنز لانچ کریں', descEn: 'Create seasonal collections. Set special pricing. Feature on receipts and marketing.', descUr: 'موسمی کلیکشنز۔ خصوصی قیمت۔' },
      { titleEn: 'Sell and stitch', titleUr: 'فروخت اور سلائی', descEn: 'Walk-in sales, custom tailoring orders, alterations — all in one system.', descUr: 'واک ان، سلائی، الٹریشن۔' },
      { titleEn: 'Grow and delight', titleUr: 'بڑھیں اور خوش کریں', descEn: 'Loyalty rewards, birthday reminders, saved measurements for repeat customers.', descUr: 'لائلٹی، سالگرہ یاد دہانیاں، محفوظ پیمائشیں۔' },
    ],
    keyMetrics: [
      { valueEn: '5x', valueUr: '۵ گنا', labelEn: 'faster checkout', labelUr: 'تیز چیک آؤٹ' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost measurements', labelUr: 'کھوئی پیمائشیں' },
      { valueEn: '+58%', valueUr: '+۵۸٪', labelEn: 'custom order accuracy', labelUr: 'خصوصی آرڈر درستگی' },
      { valueEn: '+40%', valueUr: '+۴۰٪', labelEn: 'repeat customers', labelUr: 'دوبارہ آنے والے' },
    ],
    integrationSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business', 'daraz', 'tcs'],
    faqs: [
      { qEn: 'How does variant management work?', qUr: 'تغیر مینجمنٹ کیسے کام کرتی ہے؟', aEn: 'Each product can have unlimited size and color combinations. Nafaa tracks each variant as separate stock. You see exactly which are in stock, out of stock, or selling fast.', aUr: 'ہر پروڈکٹ لامحدود سائز اور رنگ کے مرکبات رکھ سکتا ہے۔' },
      { qEn: 'Can I save customer measurements?', qUr: 'کیا میں گاہک کی پیمائشیں محفوظ کر سکتا ہوں؟', aEn: 'Yes. Save chest, waist, hip, sleeve, and every measurement for each customer. Reuse for future custom orders with a single tap.', aUr: 'جی ہاں۔ ہر گاہک کی پیمائشیں محفوظ کریں۔' },
      { qEn: 'What about layaway plans for expensive bridal items?', qUr: 'مہنگے شادی کے آئٹمز کے لیے قسطی منصوبے؟', aEn: 'Reserve items with structured installment plans. Customer pays over weeks or months. Item held until fully paid. Automatic reminders included.', aUr: 'منظم قسطی منصوبوں سے آئٹمز محفوظ کریں۔' },
    ],
    testimonialIds: ['t4'],
  },
  salon: {
    slug: 'salon',
    heroTitleEn: 'Salon and beauty parlour software with appointments and memberships',
    heroTitleUr: 'اپائنٹمنٹس اور ممبرشپ کے ساتھ سیلون اور بیوٹی پارلر سافٹ ویئر',
    heroSubtitleEn: 'Online appointment booking, staff commissions, membership tiers, prepaid packages, customer preferences, and service history — everything a modern Pakistani salon needs.',
    heroSubtitleUr: 'آن لائن اپائنٹمنٹ بکنگ، اسٹاف کمیشن، ممبرشپ، پری پیڈ پیکجز، گاہک کی ترجیحات۔',
    directAnswerEn: 'Nafaa is the complete salon management platform for Pakistan. It handles online appointment booking, automatic staff commission calculations, membership tiers with benefits, prepaid service packages, customer skin and hair preferences, and comprehensive service history tracking.',
    directAnswerUr: 'نفع پاکستان کے لیے مکمل سیلون مینجمنٹ پلیٹ فارم ہے۔',
    pains: [
      { en: 'Phone appointment booking wastes hours daily', ur: 'فون اپائنٹمنٹ بکنگ روزانہ گھنٹے ضائع' },
      { en: 'Staff commission disputes are common', ur: 'اسٹاف کمیشن پر تنازعات' },
      { en: 'No system for tracking customer preferences', ur: 'گاہک کی ترجیحات کا کوئی نظام نہیں' },
      { en: 'Membership benefits get confused', ur: 'ممبرشپ فوائد الجھ جاتے ہیں' },
      { en: 'Prepaid packages are hard to track manually', ur: 'پری پیڈ پیکجز دستی طور پر مشکل' },
      { en: 'No-shows and cancellations lose money daily', ur: 'نو شوز اور منسوخیاں روزانہ نقصان' },
    ],
    solutions: [
      { icon: 'Calendar', titleEn: 'Online appointment booking', titleUr: 'آن لائن اپائنٹمنٹ بکنگ', descEn: 'Customers book directly online. See availability, staff, and services in real time. Auto-confirmation via SMS.', descUr: 'گاہک براہ راست آن لائن بک کریں۔' },
      { icon: 'Percent', titleEn: 'Automatic staff commissions', titleUr: 'خودکار اسٹاف کمیشن', descEn: 'Configure commission per staff per service. Automatic calculation. Zero disputes.', descUr: 'ہر اسٹاف ہر سروس کے لیے کمیشن۔' },
      { icon: 'Crown', titleEn: 'Membership tiers', titleUr: 'ممبرشپ درجات', descEn: 'Bronze, Silver, Gold, Platinum tiers with benefits like discounts, free services, and priority booking.', descUr: 'برانز، سلور، گولڈ، پلاٹینم فوائد۔' },
      { icon: 'Package', titleEn: 'Prepaid service packages', titleUr: 'پری پیڈ سروس پیکجز', descEn: 'Sell packages upfront. Track usage automatically. Customer sees remaining sessions.', descUr: 'پیش گی پیکجز۔ خودکار استعمال ٹریک۔' },
      { icon: 'User', titleEn: 'Customer preferences', titleUr: 'گاہک کی ترجیحات', descEn: 'Skin type, hair type, allergies, preferred staff, favorite products — everything remembered.', descUr: 'جلد کی قسم، بال، الرجی، ترجیحات۔' },
      { icon: 'Bell', titleEn: 'Automated reminders', titleUr: 'خودکار یاد دہانیاں', descEn: 'SMS and WhatsApp reminders reduce no-shows by 70%. Booking confirmations, follow-ups included.', descUr: 'ایس ایم ایس اور واٹس ایپ یاد دہانیاں۔' },
    ],
    workflowSteps: [
      { titleEn: 'Set up services and staff', titleUr: 'سروسز اور اسٹاف سیٹ اپ', descEn: 'Define services, prices, durations, and commission rates for each staff member.', descUr: 'سروسز، قیمتیں، دورانیہ، کمیشن ریٹس۔' },
      { titleEn: 'Enable online booking', titleUr: 'آن لائن بکنگ فعال کریں', descEn: 'Customers book via your website, WhatsApp, or Instagram. All appointments in one calendar.', descUr: 'ویب سائٹ، واٹس ایپ، انسٹاگرام سے بکنگ۔' },
      { titleEn: 'Serve and delight', titleUr: 'سروس اور خوش کریں', descEn: 'Automatic reminders, service history, personalized recommendations at every visit.', descUr: 'خودکار یاد دہانیاں، سروس تاریخ، سفارشات۔' },
      { titleEn: 'Grow with loyalty', titleUr: 'لائلٹی کے ساتھ ترقی', descEn: 'Membership programs, prepaid packages, birthday specials — customers come back weekly.', descUr: 'ممبرشپ، پیکجز، سالگرہ خصوصی۔' },
    ],
    keyMetrics: [
      { valueEn: '+68%', valueUr: '+۶۸٪', labelEn: 'repeat customers', labelUr: 'دوبارہ آنے والے' },
      { valueEn: '-72%', valueUr: '-۷۲٪', labelEn: 'no-shows', labelUr: 'نو شوز' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'commission disputes', labelUr: 'کمیشن تنازعات' },
      { valueEn: '3 hours', valueUr: '۳ گھنٹے', labelEn: 'saved on phone bookings', labelUr: 'فون بکنگ میں بچت' },
    ],
    integrationSlugs: ['whatsapp-business', 'jazzcash', 'easypaisa', 'raast', 'fbr'],
    faqs: [
      { qEn: 'How does online appointment booking work?', qUr: 'آن لائن اپائنٹمنٹ بکنگ کیسے کام کرتی ہے؟', aEn: 'Customers see your calendar, staff, and services in real time. They pick a slot, confirm, and receive an SMS. You get notified instantly. Zero manual work.', aUr: 'گاہک آپ کا کیلنڈر، اسٹاف، سروسز حقیقی وقت میں دیکھیں۔' },
      { qEn: 'Can I track staff commissions automatically?', qUr: 'کیا میں اسٹاف کمیشن خودکار طور پر ٹریک کر سکتا ہوں؟', aEn: 'Yes. Set commission percentage per staff per service. Nafaa calculates everything automatically. Monthly commission reports ready with one tap.', aUr: 'جی ہاں۔ ہر اسٹاف ہر سروس کا کمیشن سیٹ کریں۔' },
      { qEn: 'What about membership programs?', qUr: 'ممبرشپ پروگرام کا کیا؟', aEn: 'Create Bronze, Silver, Gold, and Platinum tiers with automatic benefits. Members get discounts, free services, priority booking, and birthday specials automatically.', aUr: 'برانز، سلور، گولڈ، پلاٹینم درجات۔' },
    ],
    testimonialIds: ['t6'],
  },
};

// Default content generator for industries without full content
export function getIndustryContent(slug: string): IndustryContent | null {
  return industryContent[slug] ?? null;
}
