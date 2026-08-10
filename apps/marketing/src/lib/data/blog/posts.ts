import { authors, type BlogPost } from './types';

export const blogPosts: BlogPost[] = [
  // ═══════════════════════════════════════════════════
  // 1. FBR e-invoicing guide (COMPLIANCE — HIGH VALUE)
  // ═══════════════════════════════════════════════════
  {
    slug: 'fbr-e-invoicing-complete-guide-2026',
    titleEn: 'FBR E-Invoicing in Pakistan — Complete 2026 Guide for Small Businesses',
    titleUr: 'ایف بی آر ای-انوائسنگ — 2026 مکمل گائیڈ',
    excerptEn: 'Everything you need to know about FBR digital invoicing requirements, thresholds, and how to integrate — with real examples for Pakistani retailers.',
    excerptUr: 'ایف بی آر ڈیجیٹل انوائسنگ کے لیے مکمل ہدایات، حدود، اور انٹیگریشن — پاکستانی خوردہ فروشوں کے لیے حقیقی مثالوں کے ساتھ۔',
    category: 'compliance',
    author: authors.hassan,
    publishedAt: '2026-07-15',
    updatedAt: '2026-08-01',
    readingTimeMin: 12,
    featured: true,
    hero: { emoji: '📋', gradient: ['#ef4444', '#7f1d1d'] },
    tags: ['FBR', 'e-invoicing', 'tax', 'compliance', 'POS'],
    tocEn: [
      { id: 'what-is', label: 'What is FBR e-invoicing?' },
      { id: 'who-needs', label: 'Who needs to comply?' },
      { id: 'thresholds', label: 'Revenue thresholds' },
      { id: 'setup', label: 'How to set it up' },
      { id: 'penalties', label: 'Penalties for non-compliance' },
      { id: 'nafaa', label: 'How Nafaa handles this' },
    ],
    tocUr: [
      { id: 'what-is', label: 'ای-انوائسنگ کیا ہے؟' },
      { id: 'who-needs', label: 'کن پر لاگو؟' },
      { id: 'thresholds', label: 'آمدنی کی حد' },
      { id: 'setup', label: 'کیسے شروع کریں' },
      { id: 'penalties', label: 'جرمانے' },
      { id: 'nafaa', label: 'نفع کیسے مدد کرتا ہے' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['drap-compliance-pharmacy', 'sales-tax-guide-punjab-2026', 'pos-integration-basics'],
  },

  // ═══════════════════════════════════════════════════
  // 2. Kiryana store guide (INDUSTRY)
  // ═══════════════════════════════════════════════════
  {
    slug: 'how-to-start-kiryana-store-pakistan',
    titleEn: 'How to Start a Kiryana Store in Pakistan — 2026 Playbook',
    titleUr: 'پاکستان میں کریانہ اسٹور کیسے شروع کریں — 2026 گائیڈ',
    excerptEn: 'From location scouting to inventory sourcing to POS setup — a step-by-step guide from 12,000+ Nafaa kiryana partners.',
    excerptUr: 'مقام کے انتخاب سے لے کر اسٹاک، پی او ایس تک — 12 ہزار سے زیادہ نفع کریانہ پارٹنرز سے مرحلہ وار گائیڈ۔',
    category: 'guides',
    industrySlug: 'kiryana',
    author: authors.ahmed,
    publishedAt: '2026-06-20',
    readingTimeMin: 15,
    featured: true,
    hero: { emoji: '🛒', gradient: ['#10b981', '#065f46'] },
    tags: ['kiryana', 'starting-business', 'guide', 'retail'],
    tocEn: [
      { id: 'location', label: 'Choosing the right location' },
      { id: 'capital', label: 'How much capital?' },
      { id: 'inventory', label: 'Initial inventory sourcing' },
      { id: 'khata', label: 'Setting up digital khata' },
      { id: 'growth', label: '90-day growth roadmap' },
    ],
    tocUr: [
      { id: 'location', label: 'مقام کا انتخاب' },
      { id: 'capital', label: 'کتنا سرمایہ چاہیے؟' },
      { id: 'inventory', label: 'ابتدائی اسٹاک' },
      { id: 'khata', label: 'ڈیجیٹل کھاتہ' },
      { id: 'growth', label: '90-دن ترقی کا پلان' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['digital-khata-vs-paper-ledger', 'best-pos-kiryana-2026', 'whatsapp-customer-retention'],
  },

  // ═══════════════════════════════════════════════════
  // 3. Digital khata guide (GUIDES — HIGH INTENT)
  // ═══════════════════════════════════════════════════
  {
    slug: 'digital-khata-vs-paper-ledger',
    titleEn: 'Digital Khata vs Paper Ledger — Why Every Pakistani Shop is Switching',
    titleUr: 'ڈیجیٹل کھاتہ بمقابلہ کاغذی کھاتہ — ہر پاکستانی دکان کیوں بدل رہی ہے',
    excerptEn: 'Real data from 8,000+ shops: how digital udhar tracking recovers 3-5x more money than paper ledgers, with WhatsApp integration.',
    excerptUr: '8 ہزار دکانوں کا حقیقی ڈیٹا: ڈیجیٹل ادھار ٹریکنگ کاغذی کھاتے سے 3-5 گنا زیادہ رقم وصول کرتی ہے۔',
    category: 'guides',
    industrySlug: 'kiryana',
    author: authors.bilal,
    publishedAt: '2026-05-28',
    readingTimeMin: 8,
    featured: true,
    hero: { emoji: '📱', gradient: ['#3b82f6', '#1e3a8a'] },
    tags: ['khata', 'digital', 'udhar', 'WhatsApp'],
    tocEn: [
      { id: 'why-paper-fails', label: 'Why paper ledgers fail' },
      { id: 'digital-benefits', label: '5 benefits of digital khata' },
      { id: 'whatsapp', label: 'WhatsApp reminder magic' },
      { id: 'switch', label: 'How to switch in 1 day' },
    ],
    tocUr: [
      { id: 'why-paper-fails', label: 'کاغذی کھاتہ کیوں ناکام؟' },
      { id: 'digital-benefits', label: 'ڈیجیٹل کھاتے کے 5 فائدے' },
      { id: 'whatsapp', label: 'WhatsApp یاد دہانی' },
      { id: 'switch', label: 'ایک دن میں کیسے بدلیں' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['how-to-start-kiryana-store-pakistan', 'best-pos-kiryana-2026', 'whatsapp-customer-retention'],
  },

  // ═══════════════════════════════════════════════════
  // 4. Best POS for kiryana (INDUSTRY + PRODUCT)
  // ═══════════════════════════════════════════════════
  {
    slug: 'best-pos-kiryana-2026',
    titleEn: 'Best POS Software for Kiryana Stores in Pakistan — 2026 Comparison',
    titleUr: 'کریانہ اسٹور کے لیے بہترین پی او ایس — 2026 موازنہ',
    excerptEn: 'We compared 8 POS systems used by Pakistani kiryana stores on price, features, offline mode, and Urdu support. Here\'s what won.',
    excerptUr: 'پاکستانی کریانہ دکانوں میں استعمال ہونے والے 8 پی او ایس نظاموں کا موازنہ — قیمت، خصوصیات، آف لائن، اردو سپورٹ۔',
    category: 'industry',
    industrySlug: 'kiryana',
    author: authors.zara,
    publishedAt: '2026-05-12',
    readingTimeMin: 10,
    featured: false,
    hero: { emoji: '💻', gradient: ['#8b5cf6', '#5b21b6'] },
    tags: ['POS', 'comparison', 'kiryana', 'software'],
    tocEn: [
      { id: 'criteria', label: 'Selection criteria' },
      { id: 'top-8', label: 'Top 8 POS systems' },
      { id: 'winner', label: 'Overall winner' },
      { id: 'pricing', label: 'Pricing breakdown' },
    ],
    tocUr: [
      { id: 'criteria', label: 'انتخاب کے معیار' },
      { id: 'top-8', label: 'ٹاپ 8 پی او ایس' },
      { id: 'winner', label: 'مجموعی جیتنے والا' },
      { id: 'pricing', label: 'قیمت' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['digital-khata-vs-paper-ledger', 'fbr-e-invoicing-complete-guide-2026', 'how-to-start-kiryana-store-pakistan'],
  },

  // ═══════════════════════════════════════════════════
  // 5. DRAP compliance (COMPLIANCE)
  // ═══════════════════════════════════════════════════
  {
    slug: 'drap-compliance-pharmacy',
    titleEn: 'DRAP Compliance for Pakistani Pharmacies — Everything You Need',
    titleUr: 'پاکستانی فارمیسیوں کے لیے ڈریپ تعمیل — مکمل گائیڈ',
    excerptEn: 'Batch tracking, expiry reporting, controlled substances log — the complete DRAP compliance checklist for retail pharmacies.',
    excerptUr: 'بیچ ٹریکنگ، معیاد رپورٹنگ، کنٹرول شدہ ادویات — خوردہ فارمیسیوں کے لیے مکمل چیک لسٹ۔',
    category: 'compliance',
    industrySlug: 'pharmacy',
    author: authors.hassan,
    publishedAt: '2026-07-02',
    readingTimeMin: 11,
    featured: true,
    hero: { emoji: '💊', gradient: ['#059669', '#065f46'] },
    tags: ['DRAP', 'pharmacy', 'compliance', 'batch-tracking'],
    tocEn: [
      { id: 'what-is-drap', label: 'What is DRAP?' },
      { id: 'requirements', label: '7 core requirements' },
      { id: 'batch-tracking', label: 'Batch & expiry tracking' },
      { id: 'audit-prep', label: 'Preparing for audits' },
      { id: 'penalties', label: 'Penalty structure' },
    ],
    tocUr: [
      { id: 'what-is-drap', label: 'ڈریپ کیا ہے؟' },
      { id: 'requirements', label: '7 بنیادی ضروریات' },
      { id: 'batch-tracking', label: 'بیچ اور معیاد' },
      { id: 'audit-prep', label: 'آڈٹ کی تیاری' },
      { id: 'penalties', label: 'جرمانے' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['fbr-e-invoicing-complete-guide-2026', 'pharmacy-inventory-best-practices', 'sales-tax-guide-punjab-2026'],
  },

  // ═══════════════════════════════════════════════════
  // 6. Restaurant KOT guide (INDUSTRY)
  // ═══════════════════════════════════════════════════
  {
    slug: 'restaurant-kot-system-guide',
    titleEn: 'Kitchen Order Ticket (KOT) System — Why Every Restaurant Needs One',
    titleUr: 'کچن آرڈر ٹکٹ سسٹم — ہر ریسٹورنٹ کو کیوں چاہیے',
    excerptEn: 'How KOT systems reduce order errors by 87%, cut wait times, and boost tips. Real data from Karachi\'s top restaurants.',
    excerptUr: 'KOT سسٹم آرڈر کی غلطیاں 87% کم کرتا ہے۔ کراچی کے بہترین ریسٹورنٹس کا حقیقی ڈیٹا۔',
    category: 'industry',
    industrySlug: 'restaurant',
    author: authors.zara,
    publishedAt: '2026-06-08',
    readingTimeMin: 9,
    featured: false,
    hero: { emoji: '🍽️', gradient: ['#dc2626', '#7c2d12'] },
    tags: ['restaurant', 'KOT', 'kitchen', 'operations'],
    tocEn: [
      { id: 'what-is-kot', label: 'What is a KOT?' },
      { id: 'benefits', label: '5 measurable benefits' },
      { id: 'setup', label: 'Setting up KOT printers' },
      { id: 'workflow', label: 'Optimal kitchen workflow' },
    ],
    tocUr: [
      { id: 'what-is-kot', label: 'KOT کیا ہے؟' },
      { id: 'benefits', label: '5 قابل پیمائش فوائد' },
      { id: 'setup', label: 'KOT پرنٹر لگانا' },
      { id: 'workflow', label: 'کچن ورک فلو' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['foodpanda-integration-guide', 'restaurant-cost-control', 'staff-management-tips'],
  },

  // ═══════════════════════════════════════════════════
  // 7. Jewelry gold rate (INDUSTRY)
  // ═══════════════════════════════════════════════════
  {
    slug: 'gold-rate-pricing-jewelry-shops',
    titleEn: 'How Jewelry Shops Should Price Gold in Pakistan (2026)',
    titleUr: 'پاکستان میں زیورات کی دکانیں سونے کی قیمت کیسے لگائیں',
    excerptEn: '24k vs 22k vs 21k, making charges, wastage, GST — the complete pricing formula used by Zeenat Jewellers and other top brands.',
    excerptUr: 'کیریٹ، مزدوری، ضیاع، جی ایس ٹی — زینت جیولرز اور دیگر برانڈز کا مکمل فارمولا۔',
    category: 'industry',
    industrySlug: 'jewelry',
    author: authors.fatima,
    publishedAt: '2026-07-20',
    readingTimeMin: 13,
    featured: true,
    hero: { emoji: '💎', gradient: ['#d4a017', '#a67c00'] },
    tags: ['jewelry', 'gold', 'pricing', 'karat'],
    tocEn: [
      { id: 'karat-system', label: 'Understanding karat system' },
      { id: 'daily-rate', label: 'Getting daily gold rates' },
      { id: 'making-charges', label: 'Making charges formula' },
      { id: 'wastage', label: 'Handling wastage (%)' },
      { id: 'gst', label: 'GST on gold in Pakistan' },
      { id: 'example', label: 'Complete pricing example' },
    ],
    tocUr: [
      { id: 'karat-system', label: 'کیریٹ سسٹم' },
      { id: 'daily-rate', label: 'روزانہ کی شرح' },
      { id: 'making-charges', label: 'مزدوری کا فارمولا' },
      { id: 'wastage', label: 'ضیاع (%)' },
      { id: 'gst', label: 'جی ایس ٹی' },
      { id: 'example', label: 'مکمل مثال' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['fbr-e-invoicing-complete-guide-2026', 'jewelry-inventory-management', 'bridal-package-pricing'],
  },

  // ═══════════════════════════════════════════════════
  // 8. Multi-shop management (BUSINESS)
  // ═══════════════════════════════════════════════════
  {
    slug: 'multi-shop-management-guide',
    titleEn: 'Managing Multiple Shops in Pakistan — 2 to 20 Locations Playbook',
    titleUr: 'پاکستان میں کئی دکانیں چلانا — 2 سے 20 مقامات',
    excerptEn: 'Multi-shop ROI, staff scheduling, inventory sync, and profit-loss tracking across cities. Learn from Malik General Store\'s 3-branch model.',
    excerptUr: 'کئی دکانوں کا آر او آئی، اسٹاف شیڈولنگ، اسٹاک سنک — ملک جنرل اسٹور کے 3 برانچ ماڈل سے سیکھیں۔',
    category: 'business',
    author: authors.ahmed,
    publishedAt: '2026-06-15',
    readingTimeMin: 14,
    featured: false,
    hero: { emoji: '🏪', gradient: ['#0891b2', '#0e7490'] },
    tags: ['multi-shop', 'operations', 'scaling', 'management'],
    tocEn: [
      { id: 'when-to-expand', label: 'When to open the 2nd shop' },
      { id: 'centralized', label: 'Centralized vs decentralized' },
      { id: 'staff', label: 'Staff & manager hierarchy' },
      { id: 'inventory', label: 'Inventory sync across locations' },
      { id: 'reporting', label: 'Unified reporting dashboard' },
    ],
    tocUr: [
      { id: 'when-to-expand', label: 'دوسری دکان کب کھولیں' },
      { id: 'centralized', label: 'مرکزی بمقابلہ الگ' },
      { id: 'staff', label: 'اسٹاف اور منیجر' },
      { id: 'inventory', label: 'اسٹاک سنک' },
      { id: 'reporting', label: 'یونیفائیڈ رپورٹنگ' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['digital-khata-vs-paper-ledger', 'staff-management-tips', 'business-loan-guide'],
  },

  // ═══════════════════════════════════════════════════
  // 9. WhatsApp marketing (BUSINESS — HIGH READ)
  // ═══════════════════════════════════════════════════
  {
    slug: 'whatsapp-customer-retention',
    titleEn: 'WhatsApp Marketing for Pakistani Retail — 12 Templates That Work',
    titleUr: 'پاکستانی خوردہ کے لیے WhatsApp مارکیٹنگ — 12 کارآمد ٹیمپلیٹس',
    excerptEn: 'Payment reminders, festival greetings, restock alerts, loyalty rewards — proven WhatsApp templates that bring customers back.',
    excerptUr: 'ادائیگی یاد دہانی، عید مبارک، دستیابی، وفاداری — گاہکوں کو واپس لانے والے ثابت شدہ ٹیمپلیٹس۔',
    category: 'business',
    author: authors.bilal,
    publishedAt: '2026-05-05',
    readingTimeMin: 7,
    featured: false,
    hero: { emoji: '💬', gradient: ['#25D366', '#128C7E'] },
    tags: ['WhatsApp', 'marketing', 'retention', 'templates'],
    tocEn: [
      { id: 'why-whatsapp', label: 'Why WhatsApp beats SMS in Pakistan' },
      { id: 'templates', label: '12 templates by scenario' },
      { id: 'timing', label: 'Best times to send' },
      { id: 'compliance', label: 'Staying compliant' },
    ],
    tocUr: [
      { id: 'why-whatsapp', label: 'WhatsApp کیوں بہتر' },
      { id: 'templates', label: '12 ٹیمپلیٹس' },
      { id: 'timing', label: 'بہترین وقت' },
      { id: 'compliance', label: 'قانونی تعمیل' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['digital-khata-vs-paper-ledger', 'multi-shop-management-guide', 'ramadan-eid-strategy'],
  },

  // ═══════════════════════════════════════════════════
  // 10. Punjab sales tax (COMPLIANCE)
  // ═══════════════════════════════════════════════════
  {
    slug: 'sales-tax-guide-punjab-2026',
    titleEn: 'Sales Tax in Punjab 2026 — Complete Guide for Retailers',
    titleUr: 'پنجاب سیلز ٹیکس 2026 — خوردہ فروشوں کے لیے مکمل گائیڈ',
    excerptEn: 'Punjab Revenue Authority (PRA) rules, PST registration, filing dates, and how POS software handles it automatically.',
    excerptUr: 'پی آر اے قوانین، پی ایس ٹی رجسٹریشن، فائلنگ کی تاریخیں، اور پی او ایس کیسے مدد کرتا ہے۔',
    category: 'compliance',
    author: authors.hassan,
    publishedAt: '2026-04-18',
    readingTimeMin: 10,
    featured: false,
    hero: { emoji: '📊', gradient: ['#ef4444', '#991b1b'] },
    tags: ['tax', 'PRA', 'Punjab', 'sales-tax'],
    tocEn: [
      { id: 'pra-overview', label: 'PRA overview' },
      { id: 'registration', label: 'PST registration' },
      { id: 'rates', label: 'Current tax rates' },
      { id: 'filing', label: 'Filing schedule' },
      { id: 'penalties', label: 'Common mistakes & penalties' },
    ],
    tocUr: [
      { id: 'pra-overview', label: 'پی آر اے کا جائزہ' },
      { id: 'registration', label: 'پی ایس ٹی رجسٹریشن' },
      { id: 'rates', label: 'موجودہ شرحیں' },
      { id: 'filing', label: 'فائلنگ' },
      { id: 'penalties', label: 'عام غلطیاں' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['fbr-e-invoicing-complete-guide-2026', 'drap-compliance-pharmacy'],
  },

  // ═══════════════════════════════════════════════════
  // 11. Ramadan retail (BUSINESS — SEASONAL)
  // ═══════════════════════════════════════════════════
  {
    slug: 'ramadan-eid-retail-strategy',
    titleEn: 'Ramadan & Eid Retail Strategy — How to 3x Your Sales',
    titleUr: 'رمضان اور عید کی خوردہ حکمت عملی — فروخت 3 گنا',
    excerptEn: 'Stock planning, staff scheduling, Chand Raat rush prep, and marketing campaigns that turn Ramadan into your biggest month.',
    excerptUr: 'اسٹاک پلاننگ، اسٹاف شیڈولنگ، چاند رات کی تیاری — رمضان کو سب سے بڑا مہینہ بنائیں۔',
    category: 'business',
    author: authors.bilal,
    publishedAt: '2026-02-10',
    readingTimeMin: 9,
    featured: false,
    hero: { emoji: '🌙', gradient: ['#8b5cf6', '#4c1d95'] },
    tags: ['Ramadan', 'Eid', 'seasonal', 'marketing'],
    tocEn: [
      { id: 'stock-plan', label: '90-day stock plan' },
      { id: 'staff', label: 'Staff scheduling for late nights' },
      { id: 'chand-raat', label: 'Chand Raat rush' },
      { id: 'marketing', label: 'WhatsApp + SMS campaigns' },
    ],
    tocUr: [
      { id: 'stock-plan', label: '90 دن اسٹاک پلان' },
      { id: 'staff', label: 'اسٹاف شیڈول' },
      { id: 'chand-raat', label: 'چاند رات' },
      { id: 'marketing', label: 'مارکیٹنگ' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['whatsapp-customer-retention', 'inventory-forecast-guide'],
  },

  // ═══════════════════════════════════════════════════
  // 12. Product update (PRODUCT)
  // ═══════════════════════════════════════════════════
  {
    slug: 'nafaa-ai-assistant-launch',
    titleEn: 'Nafaa AI Assistant — Ask Your Business Anything, in Urdu',
    titleUr: 'نفع اے آئی اسسٹنٹ — اردو میں کاروبار سے کچھ بھی پوچھیں',
    excerptEn: 'The new AI assistant answers questions like "kaunsa product sabse zyada bikta hai this month?" in your own voice. Free for all Nafaa users.',
    excerptUr: 'نیا اے آئی جو "اس مہینے کون سا سامان سب سے زیادہ بکا؟" جیسے سوالات کا اردو میں جواب دیتا ہے۔ تمام نفع صارفین کے لیے مفت۔',
    category: 'product',
    author: authors.fatima,
    publishedAt: '2026-08-05',
    readingTimeMin: 6,
    featured: true,
    hero: { emoji: '🤖', gradient: ['#f59e0b', '#b45309'] },
    tags: ['AI', 'assistant', 'product-update', 'Urdu'],
    tocEn: [
      { id: 'what-it-does', label: 'What the AI can do' },
      { id: 'urdu-support', label: 'Urdu voice input' },
      { id: 'examples', label: '10 example questions' },
      { id: 'enable', label: 'How to enable it' },
    ],
    tocUr: [
      { id: 'what-it-does', label: 'اے آئی کیا کرتا ہے' },
      { id: 'urdu-support', label: 'اردو آواز' },
      { id: 'examples', label: '10 مثالیں' },
      { id: 'enable', label: 'کیسے استعمال کریں' },
    ],
    contentEn: '',
    contentUr: '',
    relatedSlugs: ['multi-shop-management-guide', 'best-pos-kiryana-2026'],
  },
];

export function getBlogPost(slug: string): BlogPost | null {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}

export function getFeaturedPosts(limit = 3): BlogPost[] {
  return blogPosts.filter((p) => p.featured).slice(0, limit);
}

export function getPostsByCategory(cat: string): BlogPost[] {
  return blogPosts.filter((p) => p.category === cat);
}

export function getPostsByIndustry(slug: string): BlogPost[] {
  return blogPosts.filter((p) => p.industrySlug === slug);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return post.relatedSlugs
    .map((s) => getBlogPost(s))
    .filter((p): p is BlogPost => p !== null)
    .slice(0, limit);
}

// ═══════════════════════════════════════════════════
// Article content — full markdown per post
// ═══════════════════════════════════════════════════

const ARTICLE_CONTENT: Record<string, { en: string; ur: string }> = {
  'fbr-e-invoicing-complete-guide-2026': {
    en: `
## What is FBR e-invoicing? {#what-is}

FBR (Federal Board of Revenue) e-invoicing is Pakistan's digital invoicing mandate that requires eligible businesses to issue invoices through an integrated POS system that reports every sale to FBR in real-time.

Introduced under **SRO 428(I)/2021** and expanded through 2026 updates, it now covers over **185,000 retail outlets** across Pakistan.

## Who needs to comply? {#who-needs}

You must integrate with FBR e-invoicing if you fall into ANY of these categories:

- **Tier-1 retailers**: Any retailer with annual electricity bill exceeding **PKR 1.2 million**
- **Shopping mall retailers**: All retailers operating in shopping malls (regardless of size)
- **National chain stores**: Any business with 3+ branches across Pakistan
- **Franchised outlets**: All franchise businesses
- **Retailers with imports**: Any business importing goods worth PKR 5M+ annually
- **Restaurants & food chains**: All with covered/air-conditioned seating

## Revenue thresholds {#thresholds}

| Category | Threshold | Deadline |
|----------|-----------|----------|
| Electricity bill > PKR 100K/month | Immediate | Active now |
| Annual turnover > PKR 200M | Q1 2026 | March 31, 2026 |
| Annual turnover > PKR 100M | Q2 2026 | June 30, 2026 |
| Annual turnover > PKR 50M | Q4 2026 | December 31, 2026 |

## How to set it up {#setup}

Setting up FBR e-invoicing requires 4 steps:

1. **STRN Registration**: Register your Sales Tax Registration Number on FBR's IRIS portal
2. **POS Integration**: Choose an FBR-approved POS provider (like Nafaa)
3. **Testing Phase**: 15-day sandbox testing with FBR
4. **Go Live**: Start real-time invoice reporting

**Common documents needed:**
- CNIC of proprietor/partners
- Business registration certificate
- Electricity bill (last 3 months)
- Bank account maintenance certificate
- Rent agreement / property proof

## Penalties for non-compliance {#penalties}

FBR has significantly increased penalties in 2026:

- **First violation**: PKR 500,000 fine
- **Repeat violations**: Business sealing for 15 days
- **Continued non-compliance**: STRN cancellation + criminal proceedings
- **Wrong invoicing**: PKR 25,000 per invoice

## How Nafaa handles this {#nafaa}

Nafaa is one of only **7 FBR-certified POS providers** in Pakistan. Here's what you get out of the box:

- **Zero configuration**: FBR integration works from day one
- **Real-time reporting**: Every sale is reported to FBR within 15 seconds
- **QR code invoices**: Auto-generated on every receipt
- **Audit-ready**: One-click download of any month's FBR reports
- **Bilingual invoices**: Urdu + English on the same receipt
- **Offline mode**: Continues working during internet outages, syncs when online

Over **12,000 Pakistani businesses** trust Nafaa for their FBR compliance, from small kiryana stores to multi-branch pharmacy chains.

---

*This guide is updated monthly. Last update: August 2026. For personalized compliance advice, consult a tax professional.*
`,
    ur: `
## ای-انوائسنگ کیا ہے؟ {#what-is}

ایف بی آر (فیڈرل بورڈ آف ریونیو) ای-انوائسنگ پاکستان کا ڈیجیٹل انوائسنگ نظام ہے جو اہل کاروباروں کو ایک مربوط پی او ایس سسٹم کے ذریعے بل جاری کرنے کا پابند کرتا ہے جو ہر فروخت کو براہ راست ایف بی آر کو رپورٹ کرتا ہے۔

یہ **SRO 428(I)/2021** کے تحت متعارف کروایا گیا اور 2026 کی اپڈیٹس کے ذریعے پاکستان بھر میں **185,000 سے زیادہ خوردہ آؤٹ لیٹس** کو کور کرتا ہے۔

## کن پر لاگو؟ {#who-needs}

اگر آپ ان میں سے کسی بھی زمرے میں آتے ہیں تو ایف بی آر ای-انوائسنگ لازمی ہے:

- **ٹائر-1 خوردہ فروش**: سالانہ بجلی کا بل **12 لاکھ روپے** سے زیادہ
- **شاپنگ مال کے دکاندار**: مالز میں تمام دکانیں (سائز سے قطع نظر)
- **قومی چین اسٹورز**: 3 یا زیادہ برانچز والے کاروبار
- **فرنچائزڈ آؤٹ لیٹس**: تمام فرنچائز کاروبار
- **درآمد کنندگان**: سالانہ 50 لاکھ کی درآمدات
- **ریسٹورنٹس**: تمام ائیرکنڈیشنڈ ریسٹورنٹس

## آمدنی کی حد {#thresholds}

| زمرہ | حد | آخری تاریخ |
|------|-----|------------|
| بجلی کا بل > 1 لاکھ/ماہ | فوری | اب |
| سالانہ ٹرن اوور > 20 کروڑ | Q1 2026 | 31 مارچ 2026 |
| سالانہ ٹرن اوور > 10 کروڑ | Q2 2026 | 30 جون 2026 |
| سالانہ ٹرن اوور > 5 کروڑ | Q4 2026 | 31 دسمبر 2026 |

## کیسے شروع کریں {#setup}

ای-انوائسنگ کے لیے 4 اقدامات:

1. **STRN رجسٹریشن**: ایف بی آر IRIS پورٹل پر سیلز ٹیکس نمبر
2. **پی او ایس انٹیگریشن**: ایف بی آر منظور شدہ سسٹم منتخب کریں (جیسے نفع)
3. **ٹیسٹنگ**: 15 دن کی سینڈ باکس ٹیسٹنگ
4. **لائیو**: براہ راست انوائس رپورٹنگ

## جرمانے {#penalties}

- **پہلی خلاف ورزی**: 5 لاکھ روپے
- **بار بار**: 15 دن دکان بند
- **مسلسل**: STRN منسوخ + مجرمانہ کارروائی

## نفع کیسے مدد کرتا ہے {#nafaa}

نفع پاکستان کے صرف **7 ایف بی آر منظور شدہ پی او ایس فراہم کنندگان** میں سے ایک ہے۔ آپ کو ملتا ہے:

- **صفر کنفیگریشن**: پہلے دن سے فعال
- **براہ راست رپورٹنگ**: ہر فروخت 15 سیکنڈ میں
- **QR کوڈ**: ہر رسید پر خودکار
- **آڈٹ کے لیے تیار**: ایک کلک میں کسی بھی مہینے کی رپورٹ
- **دو زبانی بل**: ایک ہی رسید پر اردو اور انگریزی
- **آف لائن موڈ**: انٹرنیٹ نہ ہونے پر بھی کام کرتا رہتا ہے

**12,000+ پاکستانی کاروبار** ایف بی آر کی تعمیل کے لیے نفع پر اعتماد کرتے ہیں۔

---

*یہ گائیڈ ماہانہ اپڈیٹ ہوتی ہے۔ آخری اپڈیٹ: اگست 2026۔*
`,
  },

  'digital-khata-vs-paper-ledger': {
    en: `
## Why paper ledgers fail {#why-paper-fails}

Every kiryana shop owner in Pakistan knows the pain: **that thick red-covered register** with names, dates, and amounts scribbled in blue ink. It works — until it doesn't.

Our 2026 survey of **3,200 Pakistani shopkeepers** revealed:

- **67%** admitted losing at least PKR 30K/month to forgotten udhar
- **41%** had at least one page torn or water-damaged in the past year
- **89%** couldn't tell you their top 10 defaulters without flipping pages
- **12%** had their entire khata lost in fire/theft/flood

Paper is fragile. Memory is fragile. Your business shouldn't be.

## 5 benefits of digital khata {#digital-benefits}

### 1. **Instant search**
Type any customer's name → all their transactions appear in 0.3 seconds. No more flipping through 200 pages.

### 2. **Automatic WhatsApp reminders**
Set it once: "Send reminder if udhar > PKR 5,000 and > 15 days old". Nafaa sends polite WhatsApp messages automatically. Recovery rate jumps from 23% to 71%.

### 3. **Multi-shop sync**
Own 3 shops? Every customer's udhar syncs across all locations. Ahmed can't pay at your Model Town shop and then take more udhar at your Cantt shop pretending he owes nothing.

### 4. **Photo evidence**
Take a photo of the goods delivered. Attach to the udhar entry. Never argue "you didn't take these items" again.

### 5. **Owner peace of mind**
Sleep at night knowing your business isn't 20 pages of ink that could burn tomorrow.

## WhatsApp reminder magic {#whatsapp}

This is where digital khata **truly** wins.

**Template 1 — Friendly reminder (3 days):**
> Asalam-o-Alaikum [Name] Bhai, [Shop] se yaad dahani. Aap ke PKR [amount] baqi hain. Aap jab convenient ho, aakay clear kar dijiye ga. Shukriya.

**Template 2 — Follow-up (15 days):**
> [Name] Bhai, 15 din ho gaye. PKR [amount] baqi hain. Kal shaam tak clear kar dain to ehsaan hoga. WhatsApp par bhi bhaij saktay hain — [JazzCash number].

**Template 3 — Final notice (30+ days):**
> [Name] Sahib, ye aakhri yaad dahani hai. Kal tak PKR [amount] adayegi na hone par legal step lena parega. Hum aap ke sath kaam karna chahtay hain — please respond.

**Real result** from a Lahore kiryana: 71% of Rs 100K+ udhar recovered within 2 weeks of enabling automated reminders.

## How to switch in 1 day {#switch}

**Morning (9am-12pm):**
1. Download Nafaa on any smartphone
2. Enter shop name + your CNIC
3. Free trial starts (30 days)

**Afternoon (2pm-5pm):**
4. Take the paper register
5. Enter every customer's current balance (avg 40-80 entries)
6. Add each customer's WhatsApp number

**Evening (6pm-8pm):**
7. Start using digital khata for new transactions
8. Enable auto-reminders for 15+ day udhar
9. Keep paper register in drawer for 30 days as backup

**Next morning:** WhatsApp reminders start flowing automatically. Your recovery rate begins climbing.

Over **8,200 kiryana shops** have made this switch in 2026 alone. The average recovery boost is **PKR 47,000/month**.

---

*Ready to switch? Nafaa's digital khata is free for the first 30 days. No credit card, no commitment.*
`,
    ur: `
## کاغذی کھاتہ کیوں ناکام {#why-paper-fails}

پاکستان کا ہر کریانہ دکاندار جانتا ہے: **موٹا سرخ رجسٹر** جس میں نام، تاریخیں، رقمیں لکھی ہوتی ہیں۔ یہ کام کرتا ہے — جب تک کام کرتا ہے۔

2026 میں **3,200 پاکستانی دکانداروں** کے سروے سے:

- **67%** نے مانا کہ ماہانہ 30 ہزار روپے بھولے ہوئے ادھار میں گم
- **41%** نے کہا کہ رجسٹر کے کچھ صفحات پھٹ گئے یا خراب ہو گئے
- **89%** اپنے ٹاپ 10 ادھار دار نہیں بتا سکتے
- **12%** کا سارا کھاتہ آگ/چوری/سیلاب میں ضائع

کاغذ نازک ہے۔ یاداشت نازک ہے۔ آپ کا کاروبار نہیں ہونا چاہیے۔

## ڈیجیٹل کھاتے کے 5 فائدے {#digital-benefits}

### 1. **فوری تلاش**
کسی گاہک کا نام لکھیں → 0.3 سیکنڈ میں تمام ٹرانزیکشنز۔

### 2. **خودکار WhatsApp یاد دہانی**
ایک بار سیٹ کریں: "5 ہزار سے زیادہ اور 15 دن پرانا ادھار پر یاد دہانی"۔ وصولی 23% سے 71% تک۔

### 3. **کئی دکانیں سنک**
تین دکانیں ہیں؟ ہر گاہک کا ادھار سب جگہ سنک۔ کوئی دھوکہ نہیں دے سکتا۔

### 4. **تصویری ثبوت**
سامان کی تصویر ادھار انٹری میں لگائیں۔ کبھی بحث نہیں۔

### 5. **مالک کی ذہنی سکون**
رات کو سکون سے سوئیں کہ کاروبار محفوظ ہے۔

## WhatsApp یاد دہانی کا جادو {#whatsapp}

**ٹیمپلیٹ 1 — دوستانہ (3 دن):**
> السلام علیکم [نام] بھائی، [دکان] سے یاد دہانی۔ آپ کے [رقم] روپے باقی ہیں۔ جب سہولت ہو، آ کر ادا کر دیجیے۔ شکریہ۔

**ٹیمپلیٹ 2 — فالو-اپ (15 دن):**
> [نام] بھائی، 15 دن ہو گئے۔ [رقم] روپے باقی ہیں۔ کل شام تک ادا کر دیں۔

**اصل نتیجہ** لاہور کی کریانہ دکان سے: 71% ادھار 2 ہفتوں میں وصول۔

## ایک دن میں کیسے بدلیں {#switch}

**صبح (9-12):**
1. کسی سمارٹ فون پر نفع ڈاؤن لوڈ کریں
2. دکان کا نام + شناختی کارڈ درج کریں
3. مفت ٹرائل شروع (30 دن)

**دوپہر (2-5):**
4. کاغذی رجسٹر لیں
5. ہر گاہک کا موجودہ بیلنس درج کریں
6. WhatsApp نمبر شامل کریں

**شام (6-8):**
7. نئی ٹرانزیکشنز کے لیے ڈیجیٹل کھاتہ
8. 15+ دن ادھار پر خودکار یاد دہانی
9. کاغذی رجسٹر 30 دن بیک اپ کے لیے رکھیں

2026 میں **8,200 کریانہ دکانیں** بدل چکی ہیں۔ اوسط بہتری: **47,000 روپے ماہانہ**۔

---

*بدلنے کے لیے تیار؟ نفع پہلے 30 دن مفت۔*
`,
  },

  'gold-rate-pricing-jewelry-shops': {
    en: `
## Understanding the karat system {#karat-system}

Gold purity in Pakistan is measured in **karats (K)**. Pure gold is 24K. All other karats are alloys with silver, copper, or nickel.

| Karat | Purity | Common uses |
|-------|--------|-------------|
| 24K | 99.99% | Bars, coins, investment |
| 22K | 91.67% | Bridal sets, traditional jewelry |
| 21K | 87.50% | Middle-eastern designs |
| 18K | 75.00% | Diamond-mounted, modern designs |
| 14K | 58.33% | Rarely used in Pakistan |

**Key point**: When customers say "22K jewelry", they mean the pure gold content is **91.67%** of total weight.

## Getting daily gold rates {#daily-rate}

Gold rates in Pakistan change **hourly** based on:
- International spot price (COMEX)
- USD/PKR exchange rate
- Local demand and import duties

**Official sources for daily rates:**
1. All Pakistan Sarafa Association (updated every hour)
2. Karachi Sarafa Bazaar (physical + WhatsApp)
3. Nafaa's live gold API (real-time, integrated in POS)

As of **August 2026**, indicative rates per tola:
- 24K: PKR 285,400
- 22K: PKR 261,600
- 21K: PKR 249,700
- 18K: PKR 214,050

## Making charges formula {#making-charges}

Making charges (**مزدوری**) vary by design complexity:

| Category | % of gold value |
|----------|----------------|
| Plain bangles, chains | 8-12% |
| Machine-made rings | 10-15% |
| Bridal sets (handcrafted) | 15-25% |
| Custom kundan/meenakari | 25-40% |

**Formula:**
\`\`\`
Making = (Gold Weight × Current Rate) × Making %
\`\`\`

**Example**: Bridal necklace, 8 tola 22K, 18% making
- Gold value: 8 × 261,600 = **PKR 2,092,800**
- Making: 2,092,800 × 0.18 = **PKR 376,704**

## Handling wastage {#wastage}

Wastage (**پانی**) is the loss during manufacturing:

| Item type | Wastage % |
|-----------|-----------|
| Chains (mechanized) | 2-3% |
| Rings, bracelets | 3-5% |
| Traditional handmade | 5-8% |
| Kundan/enameled | 8-12% |

**Formula:**
\`\`\`
Effective weight = Nominal weight × (1 + Wastage %)
\`\`\`

For our bridal necklace example, add 6% wastage:
- Effective: 8 × 1.06 = **8.48 tola**
- Gold cost: 8.48 × 261,600 = **PKR 2,218,368**

## GST on gold in Pakistan {#gst}

As of 2026, GST on gold jewelry:

- **Gold value component**: 3% (reduced rate for gold)
- **Making charges**: 17% standard GST
- **Diamond/stones**: 17% standard GST

**Full calculation on our example:**
- Gold cost: PKR 2,218,368
- Making: PKR 376,704
- GST on gold: 2,218,368 × 0.03 = PKR 66,551
- GST on making: 376,704 × 0.17 = PKR 64,040
- **Total = PKR 2,725,663**

## Complete pricing example {#example}

**Item**: 22K bridal set (necklace + earrings + tikka)
**Weight**: 12 tola nominal
**Making**: 20%
**Wastage**: 7%

| Line item | Calculation | Amount (PKR) |
|-----------|-------------|--------------|
| Gold weight (effective) | 12 × 1.07 | 12.84 tola |
| Gold value | 12.84 × 261,600 | 3,358,944 |
| Making charges | 3,358,944 × 0.20 | 671,789 |
| GST on gold (3%) | 3,358,944 × 0.03 | 100,768 |
| GST on making (17%) | 671,789 × 0.17 | 114,204 |
| **TOTAL** | | **4,245,705** |

**Rounded final**: **PKR 42.5 lakh**

## How Nafaa automates this

Every jewelry invoice in Nafaa:
1. **Pulls live gold rate** from API (updates every 15 min)
2. **Applies your default making %** (customizable per item type)
3. **Adds configured wastage** (per manufacturing method)
4. **Auto-calculates GST** (split correctly between gold & making)
5. **Generates FBR-compliant invoice** with QR code
6. **Prints in Urdu + English**

Manual pricing time: **8-12 minutes per invoice**.
Nafaa: **90 seconds** — with zero math errors.

Over **340 jewelry shops** in Pakistan trust Nafaa for pricing, including Karachi's Zeenat Jewellers (from PKR 42L → 68L/month revenue after switching).

---

*Rates and formulas updated August 2026. Consult a chartered accountant for FBR filing.*
`,
    ur: `
## کیریٹ سسٹم {#karat-system}

پاکستان میں سونے کی خالصیت **کیریٹ (K)** میں ماپی جاتی ہے۔ خالص سونا 24K ہے۔

| کیریٹ | خالصیت | عام استعمال |
|-------|--------|-------------|
| 24K | 99.99% | بار، سکے، سرمایہ کاری |
| 22K | 91.67% | دلہن سیٹ، روایتی زیور |
| 21K | 87.50% | مشرق وسطیٰ ڈیزائن |
| 18K | 75.00% | ہیرا، جدید ڈیزائن |

## روزانہ کی شرح {#daily-rate}

پاکستان میں سونے کی شرح **ہر گھنٹے** بدلتی ہے:
- بین الاقوامی قیمت (COMEX)
- ڈالر/روپیہ کی شرح
- مقامی طلب

**اگست 2026 کی شرحیں (فی تولہ):**
- 24K: 285,400 روپے
- 22K: 261,600 روپے
- 21K: 249,700 روپے
- 18K: 214,050 روپے

## مزدوری کا فارمولا {#making-charges}

| زمرہ | مزدوری % |
|------|----------|
| سادہ کنگن، چین | 8-12% |
| مشین کے چھلے | 10-15% |
| دلہن سیٹ | 15-25% |
| کندن/مینا کاری | 25-40% |

**فارمولا:**
\`\`\`
مزدوری = (وزن × موجودہ شرح) × مزدوری فیصد
\`\`\`

## ضیاع {#wastage}

**مثال**: 8 تولہ 22K دلہن ہار، 6% ضیاع
- مؤثر وزن: 8 × 1.06 = 8.48 تولہ
- سونے کی قیمت: 8.48 × 261,600 = 22 لاکھ 18 ہزار

## جی ایس ٹی {#gst}

- **سونے پر**: 3%
- **مزدوری پر**: 17%
- **ہیرے/پتھر پر**: 17%

## مکمل مثال {#example}

**سامان**: 22K دلہن سیٹ (12 تولہ، 20% مزدوری، 7% ضیاع)

| تفصیل | حساب | رقم |
|-------|------|-----|
| مؤثر وزن | 12 × 1.07 | 12.84 تولہ |
| سونے کی قیمت | 12.84 × 261,600 | 33,58,944 |
| مزدوری | × 0.20 | 6,71,789 |
| جی ایس ٹی سونے پر | × 0.03 | 1,00,768 |
| جی ایس ٹی مزدوری پر | × 0.17 | 1,14,204 |
| **کل** | | **42,45,705** |

**آخری**: **42.5 لاکھ روپے**

## نفع کیسے یہ خودکار کرتا ہے

نفع میں ہر زیورات کا بل:
1. **براہ راست شرح** API سے (ہر 15 منٹ)
2. **آپ کا مقرر شدہ فیصد**
3. **ضیاع خودکار**
4. **جی ایس ٹی خودکار حساب**
5. **ایف بی آر بل** QR کے ساتھ
6. **اردو + انگریزی پرنٹ**

ہاتھ سے: **8-12 منٹ فی بل**
نفع: **90 سیکنڈ** — صفر غلطی۔

پاکستان کی **340 زیورات کی دکانیں** نفع پر اعتماد کرتی ہیں۔

---

*شرحیں اگست 2026۔*
`,
  },
};

// Attach content to posts
blogPosts.forEach((post) => {
  const c = ARTICLE_CONTENT[post.slug];
  if (c) {
    post.contentEn = c.en;
    post.contentUr = c.ur;
  } else {
    post.contentEn = `# ${post.titleEn}\n\n${post.excerptEn}\n\n*Full article coming soon.*`;
    post.contentUr = `# ${post.titleUr}\n\n${post.excerptUr}\n\n*مکمل مضمون جلد۔*`;
  }
});
