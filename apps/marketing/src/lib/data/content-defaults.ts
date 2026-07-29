import type { IndustryContent } from './industry-content';
import type { IntegrationContent } from './integration-content';
import type { FeatureContent } from './feature-content';
import type { Industry } from './industries';
import type { Integration } from './integrations';
import type { Feature } from './features';

/* ─── INDUSTRY DEFAULT ──────────────────────────── */
export function buildIndustryContent(ind: Industry): IndustryContent {
  return {
    slug: ind.slug,
    heroTitleEn: `${ind.nameEn} software built for Pakistan — ${ind.tagEn.split(',')[0].toLowerCase()}`,
    heroTitleUr: `پاکستان کے لیے ${ind.nameUr} سافٹ ویئر`,
    heroSubtitleEn: ind.descriptionEn,
    heroSubtitleUr: ind.descriptionUr,
    directAnswerEn: `Nafaa is Pakistan's most complete ${ind.nameEn.toLowerCase()} platform, offering ${ind.keyFeatures.join(', ').toLowerCase()} with offline capability, Urdu support, and FBR compliance built in. It runs on any device and starts free with no credit card.`,
    directAnswerUr: `نفع پاکستان کا سب سے مکمل ${ind.nameUr} پلیٹ فارم ہے۔`,
    pains: [
      { en: 'Manual record-keeping wastes hours every day', ur: 'دستی ریکارڈ روزانہ گھنٹے ضائع کرتا ہے' },
      { en: 'No visibility into real profit and losses', ur: 'حقیقی منافع اور نقصان نظر نہیں آتا' },
      { en: 'Customer credit tracked on paper gets lost', ur: 'کاغذ پر ادھار کھو جاتا ہے' },
      { en: 'Stock levels are always a guessing game', ur: 'اسٹاک ہمیشہ اندازے پر ہوتا ہے' },
      { en: 'End-of-day reconciliation takes forever', ur: 'دن کے آخر کا حساب بہت وقت لیتا ہے' },
      { en: 'Compliance paperwork is overwhelming', ur: 'تعمیل کی کاغذی کارروائی بہت زیادہ ہے' },
    ],
    solutions: ind.keyFeatures.map((f) => ({
      icon: 'CheckCircle2',
      titleEn: f,
      titleUr: f,
      descEn: `${f} — purpose-built for ${ind.nameEn.toLowerCase()} workflows in Pakistan, designed with real shop owners.`,
      descUr: `${f} — پاکستانی ${ind.nameUr} کے لیے خاص طور پر بنایا گیا۔`,
    })),
    workflowSteps: [
      { titleEn: 'Sign up in two minutes', titleUr: 'دو منٹ میں سائن اپ', descEn: 'No credit card. Free trial starts instantly.', descUr: 'کریڈٹ کارڈ نہیں۔ مفت آزمائش فوری۔' },
      { titleEn: 'Set up your catalog', titleUr: 'کیٹلاگ سیٹ اپ کریں', descEn: 'Import from Excel or add products manually with industry templates.', descUr: 'ایکسل سے امپورٹ یا صنعتی ٹیمپلیٹس سے۔' },
      { titleEn: 'Start operating', titleUr: 'کام شروع کریں', descEn: `Sell, track, and manage your ${ind.nameEn.toLowerCase()} from day one.`, descUr: 'پہلے دن سے فروخت اور انتظام۔' },
      { titleEn: 'Grow with insights', titleUr: 'بصیرت کے ساتھ بڑھیں', descEn: 'Live reports show exactly what drives your profit.', descUr: 'لائیو رپورٹس منافع دکھاتی ہیں۔' },
    ],
    keyMetrics: [
      { valueEn: '4+ hours', valueUr: '۴+ گھنٹے', labelEn: 'saved daily', labelUr: 'روزانہ بچت' },
      { valueEn: '95%', valueUr: '۹۵٪', labelEn: 'khata recovery', labelUr: 'کھاتہ وصولی' },
      { valueEn: 'Zero', valueUr: 'صفر', labelEn: 'lost records', labelUr: 'کھوئے ریکارڈز' },
      { valueEn: '+35%', valueUr: '+۳۵٪', labelEn: 'average profit lift', labelUr: 'اوسط منافع اضافہ' },
    ],
    integrationSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business', 'fbr'],
    faqs: [
      { qEn: `Is Nafaa good for a small ${ind.nameEn.toLowerCase()}?`, qUr: 'کیا نفع چھوٹے کاروبار کے لیے اچھا ہے؟', aEn: `Yes. Nafaa starts free and scales with you. Most ${ind.nameEn.toLowerCase()} owners are fully operational within their first day, using just a phone.`, aUr: 'جی ہاں۔ نفع مفت شروع ہوتا ہے اور آپ کے ساتھ بڑھتا ہے۔' },
      { qEn: 'Does it work without internet?', qUr: 'کیا یہ انٹرنیٹ کے بغیر کام کرتا ہے؟', aEn: 'Completely. Nafaa is offline-first — sell, manage, and track without internet. Everything syncs automatically when your connection returns.', aUr: 'مکمل طور پر۔ نفع آف لائن پہلے کے اصول پر ہے۔' },
      { qEn: `What makes Nafaa different for ${ind.nameEn.toLowerCase()}?`, qUr: 'نفع کیسے مختلف ہے؟', aEn: `${ind.nameEn} has unique requirements — ${ind.tagEn.toLowerCase()}. Nafaa was built with real Pakistani ${ind.nameEn.toLowerCase()} owners to handle exactly these workflows, in English and Urdu.`, aUr: 'نفع حقیقی پاکستانی مالکان کے ساتھ بنایا گیا۔' },
    ],
    testimonialIds: [],
  };
}

/* ─── INTEGRATION DEFAULT ───────────────────────── */
export function buildIntegrationContent(it: Integration): IntegrationContent {
  return {
    slug: it.slug,
    heroTitleEn: `Connect ${it.name} to Nafaa in minutes`,
    heroTitleUr: `${it.nameUr} کو نفع سے منٹوں میں جوڑیں`,
    heroSubtitleEn: it.descriptionEn,
    heroSubtitleUr: it.descriptionUr,
    directAnswerEn: `Nafaa's ${it.name} integration ${it.descriptionEn.toLowerCase()} Setup takes minutes with no developers required, and every transaction syncs automatically with your Nafaa dashboard.`,
    directAnswerUr: `نفع کا ${it.nameUr} انضمام — سیٹ اپ منٹوں میں۔`,
    benefits: [
      { icon: 'Zap', titleEn: 'Automatic sync', titleUr: 'خودکار ہم آہنگی', descEn: `Data flows between ${it.name} and Nafaa automatically — no manual entry ever.`, descUr: 'ڈیٹا خودکار بہتا ہے — کوئی دستی اندراج نہیں۔' },
      { icon: 'Clock', titleEn: 'Minutes to set up', titleUr: 'منٹوں میں سیٹ اپ', descEn: 'Guided setup with no code and no developer required.', descUr: 'کوئی کوڈ نہیں، کوئی ڈویلپر نہیں۔' },
      { icon: 'Shield', titleEn: 'Secure by default', titleUr: 'محفوظ', descEn: 'Encrypted credentials and bank-grade security on every connection.', descUr: 'انکرپٹڈ کریڈنشلز اور بینک درجے کی سیکورٹی۔' },
      { icon: 'RefreshCw', titleEn: 'Self-healing', titleUr: 'خود درستگی', descEn: 'Failed syncs queue and retry automatically. Zero data loss.', descUr: 'ناکام ہم آہنگی خودکار دوبارہ کوشش کرتی ہے۔' },
      { icon: 'BarChart3', titleEn: 'Unified reporting', titleUr: 'متحد رپورٹنگ', descEn: `See ${it.name} activity inside your Nafaa reports alongside everything else.`, descUr: 'نفع رپورٹس میں سرگرمی دیکھیں۔' },
      { icon: 'Bell', titleEn: 'Smart alerts', titleUr: 'ذہین الرٹس', descEn: 'Get notified about important events without noise.', descUr: 'اہم واقعات کی اطلاع پائیں۔' },
    ],
    setupSteps: [
      { titleEn: 'Open integrations in Nafaa', titleUr: 'نفع میں انضمام کھولیں', descEn: `Go to Settings → Integrations → ${it.name} in your dashboard.`, descUr: 'ڈیش بورڈ میں ترتیبات → انضمام پر جائیں۔' },
      { titleEn: `Connect your ${it.name} account`, titleUr: `اپنا ${it.nameUr} اکاؤنٹ جوڑیں`, descEn: 'Enter your credentials or authorize securely — guided step by step.', descUr: 'کریڈنشلز درج کریں یا محفوظ اجازت دیں۔' },
      { titleEn: 'Configure your preferences', titleUr: 'ترجیحات سیٹ کریں', descEn: 'Choose what syncs and how. Sensible defaults are pre-selected.', descUr: 'چنیں کیا ہم آہنگ ہو۔' },
      { titleEn: 'Go live', titleUr: 'لائیو جائیں', descEn: 'Run a quick test, then enable. You are live.', descUr: 'ٹیسٹ کریں، فعال کریں۔' },
    ],
    setupTimeMinutes: 7,
    useCases: [
      { en: `Businesses already using ${it.name} daily`, ur: `${it.nameUr} پہلے سے استعمال کرنے والے` },
      { en: 'Shops wanting everything in one dashboard', ur: 'ایک ڈیش بورڈ چاہنے والے' },
      { en: 'Owners tired of manual double-entry', ur: 'دستی دہرے اندراج سے تنگ مالکان' },
      { en: 'Teams that need real-time accuracy', ur: 'حقیقی وقت درستگی چاہنے والی ٹیمیں' },
    ],
    requirements: [
      { en: `Active ${it.name} account`, ur: `فعال ${it.nameUr} اکاؤنٹ` },
      { en: 'Nafaa account (free to start)', ur: 'نفع اکاؤنٹ (مفت)' },
      { en: 'Five minutes of setup time', ur: 'پانچ منٹ' },
    ],
    supportedFeatures: [
      { en: 'Automatic sync', ur: 'خودکار ہم آہنگی', available: true },
      { en: 'Real-time updates', ur: 'حقیقی وقت اپ ڈیٹس', available: true },
      { en: 'Unified dashboard', ur: 'متحد ڈیش بورڈ', available: true },
      { en: 'Error retry logic', ur: 'دوبارہ کوشش', available: true },
      { en: 'Activity logs', ur: 'سرگرمی لاگز', available: true },
      { en: 'Custom field mapping', ur: 'کسٹم فیلڈ میپنگ', available: it.status === 'live' },
    ],
    faqs: [
      { qEn: `How long does ${it.name} setup take?`, qUr: 'سیٹ اپ میں کتنا وقت لگتا ہے؟', aEn: 'Typically under ten minutes. Our guided wizard walks you through each step, and our support team can do it with you on a call if you prefer.', aUr: 'عام طور پر دس منٹ سے کم۔' },
      { qEn: 'What happens if the connection drops?', qUr: 'اگر کنیکشن ٹوٹ جائے؟', aEn: 'Nafaa queues everything locally and retries automatically when the connection returns. You never lose data, and you never need to re-enter anything.', aUr: 'نفع مقامی طور پر قطار میں رکھتا ہے اور خودکار دوبارہ کوشش کرتا ہے۔' },
      { qEn: 'Which Nafaa plan do I need?', qUr: 'کون سا پلان چاہیے؟', aEn: `${it.name} integration is available on Growth plan and above. The free Starter plan lets you explore the platform first.`, aUr: 'گروتھ پلان یا اس سے اوپر۔' },
    ],
    relatedSlugs: ['jazzcash', 'easypaisa', 'raast', 'whatsapp-business'].filter((s) => s !== it.slug).slice(0, 4),
  };
}

/* ─── FEATURE DEFAULT ───────────────────────────── */
export function buildFeatureContent(f: Feature): FeatureContent {
  return {
    slug: f.slug,
    heroTitleEn: `${f.nameEn} — ${f.taglineEn}`,
    heroTitleUr: `${f.nameUr} — ${f.taglineUr}`,
    heroSubtitleEn: `${f.taglineEn} Built for Pakistani businesses with offline capability, Urdu support, and setup in minutes — no training required.`,
    heroSubtitleUr: `${f.taglineUr} پاکستانی کاروبار کے لیے۔`,
    directAnswerEn: `Nafaa ${f.nameEn} delivers exactly what it promises: ${f.taglineEn.toLowerCase()} It works offline, supports English and Urdu, syncs in real time across all your devices, and is included from the free plan upward.`,
    directAnswerUr: `نفع ${f.nameUr} — ${f.taglineUr}`,
    capabilities: [
      { icon: 'Zap', titleEn: 'Instant to use', titleUr: 'فوری استعمال', descEn: 'No training manual needed. If you use a smartphone, you already know how.', descUr: 'تربیت کی ضرورت نہیں۔' },
      { icon: 'Wifi', titleEn: 'Works offline', titleUr: 'آف لائن کام', descEn: 'Full functionality without internet. Syncs automatically when connected.', descUr: 'انٹرنیٹ کے بغیر مکمل۔' },
      { icon: 'Globe', titleEn: 'Fully bilingual', titleUr: 'مکمل دو لسانی', descEn: 'Every screen in proper English and proper Urdu — your choice.', descUr: 'ہر اسکرین انگریزی اور اردو میں۔' },
      { icon: 'RefreshCw', titleEn: 'Real-time sync', titleUr: 'حقیقی وقت ہم آہنگی', descEn: 'Phone, tablet, desktop — every device stays perfectly in sync.', descUr: 'ہر ڈیوائس ہم آہنگ۔' },
      { icon: 'Shield', titleEn: 'Secure by design', titleUr: 'محفوظ ڈیزائن', descEn: 'Bank-grade encryption and role-based access on everything.', descUr: 'بینک درجے کی انکرپشن۔' },
      { icon: 'Sparkles', titleEn: 'Gets smarter weekly', titleUr: 'ہفتہ وار بہتر', descEn: 'New improvements ship every week based on real shopkeeper feedback.', descUr: 'حقیقی دکانداروں کی رائے پر ہفتہ وار بہتری۔' },
    ],
    showcaseTitleEn: `Why Pakistani businesses love ${f.nameEn.toLowerCase()}`,
    showcaseTitleUr: `پاکستانی کاروبار ${f.nameUr} کیوں پسند کرتے ہیں`,
    showcaseDescEn: `We built ${f.nameEn.toLowerCase()} with hundreds of real Pakistani shop owners, testing every workflow on real counters before shipping. The result feels obvious — because it was designed around your actual day.`,
    showcaseDescUr: 'ہم نے حقیقی پاکستانی دکان مالکان کے ساتھ بنایا۔',
    showcasePoints: [
      { en: 'Designed with real Pakistani shopkeepers', ur: 'حقیقی پاکستانی دکانداروں کے ساتھ ڈیزائن' },
      { en: 'Works on the devices you already own', ur: 'آپ کے موجودہ آلات پر کام کرتا ہے' },
      { en: 'Handles slow networks gracefully', ur: 'سست نیٹ ورک خوبصورتی سے سنبھالتا ہے' },
      { en: 'Support in Urdu and English, 24/7', ur: 'اردو اور انگریزی میں ۲۴/۷ سپورٹ' },
      { en: 'Free onboarding call for every new customer', ur: 'ہر نئے گاہک کے لیے مفت آن بورڈنگ' },
      { en: 'Your data is always exportable — no lock-in', ur: 'ڈیٹا ہمیشہ ایکسپورٹ ایبل — کوئی لاک اِن نہیں' },
    ],
    keyMetrics: [
      { valueEn: 'Minutes', valueUr: 'منٹ', labelEn: 'to set up', labelUr: 'سیٹ اپ میں' },
      { valueEn: 'Offline', valueUr: 'آف لائن', labelEn: 'fully capable', labelUr: 'مکمل قابل' },
      { valueEn: '2', valueUr: '۲', labelEn: 'languages', labelUr: 'زبانیں' },
      { valueEn: 'Weekly', valueUr: 'ہفتہ وار', labelEn: 'improvements', labelUr: 'بہتریاں' },
    ],
    faqs: [
      { qEn: `Is ${f.nameEn} included in the free plan?`, qUr: 'کیا یہ مفت پلان میں شامل ہے؟', aEn: `Core capabilities of ${f.nameEn.toLowerCase()} are available from the free Starter plan. Advanced capabilities unlock on Growth and Pro plans — see the pricing page for exact details.`, aUr: 'بنیادی صلاحیتیں مفت پلان میں، ایڈوانسڈ پرو میں۔' },
      { qEn: 'Does it work offline?', qUr: 'کیا یہ آف لائن کام کرتا ہے؟', aEn: 'Yes. Nafaa is offline-first across the entire platform. Everything works without internet and syncs when the connection returns.', aUr: 'جی ہاں۔ پورا پلیٹ فارم آف لائن فرسٹ ہے۔' },
      { qEn: 'How hard is it to learn?', qUr: 'سیکھنا کتنا مشکل ہے؟', aEn: 'Most customers are fully comfortable within their first hour. Every screen is bilingual, and free onboarding calls in Urdu or English are included for every new customer.', aUr: 'زیادہ تر گاہک پہلے گھنٹے میں سیکھ جاتے ہیں۔' },
    ],
    relatedSlugs: ['pos', 'inventory', 'khata', 'analytics'].filter((s) => s !== f.slug).slice(0, 4),
  };
}
