/**
 * Interface text of the site shell (header, footer, mobile menu, theme and
 * language controls, newsletter, WhatsApp button) per locale, and the
 * helpers that put the Urdu shell together.
 *
 * Page copy always comes from the CMS; these are only the words around it.
 * `ur` is Urdu script, written the way shop owners speak, with common
 * business words (POS, stock, WhatsApp) kept as they are said and the brand
 * in Latin letters (نفع would read as "profit").
 * Unknown locales fall back to English.
 *
 * This module is imported by client islands, so it must stay free of server
 * and contract imports.
 */

export type SiteLocale = 'en' | 'ur';

const en = {
  skipToContent: 'Skip to content',
  homeLabel: (name: string) => `${name} home`,
  getStarted: 'Get started',
  bookDemo: 'Book a demo',
  logIn: 'Log in',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  menu: 'Menu',
  mainNav: 'Main',
  footerNav: 'Footer',
  themeSwitch: 'Switch light or dark theme',
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  language: 'Language',
  urduSoon: 'Urdu: jald aa raha hai',
  soon: 'Soon',
  readIn: 'Read this page in',
  newsletterTitle: 'Guides and product news for growing businesses',
  newsletterBody: 'Practical tips on stock, khata, tax and selling online. Unsubscribe any time.',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@business.com',
  subscribe: 'Subscribe',
  sending: 'Sending…',
  emailInvalid: 'Please enter a valid email address.',
  sendFailed: 'That did not go through. Please try again in a moment.',
  subscribed: 'Shukriya! You are on the list. We write rarely and only when it is useful.',
  whatsappUs: 'WhatsApp us',
  socialProfiles: 'Social profiles',
  whatsappFabLabel: 'Chat with Nafaa on WhatsApp',
  whatsappFabTitle: 'Chat on WhatsApp',
  whatsappFabNote: 'English ya Roman Urdu me',
  learnMore: 'Learn more',
  statusBeta: 'Beta',
  statusComing: 'Coming soon',
  exploreAll: (label: string) => `Explore all ${label.toLowerCase()}`,
  goTo: (label: string) => `Go to ${label.toLowerCase()}`,
  /** Footer "about" line in this language; null keeps the entity description from settings. */
  about: null as string | null,
  notFoundTitle: 'Page not found',
  notFoundBody: 'This page does not exist or has moved.',
  notFoundHome: 'Go to the home page',
};

export type ShellStrings = typeof en;

const ur: ShellStrings = {
  skipToContent: 'سیدھا مواد پر جائیں',
  homeLabel: (name: string) => `${name} ہوم پیج`,
  getStarted: 'مفت شروع کریں',
  bookDemo: 'ڈیمو بک کریں',
  logIn: 'لاگ اِن',
  openMenu: 'مینو کھولیں',
  closeMenu: 'مینو بند کریں',
  menu: 'مینو',
  mainNav: 'مین مینو',
  footerNav: 'فوٹر',
  themeSwitch: 'لائٹ یا ڈارک تھیم بدلیں',
  theme: 'تھیم',
  themeSystem: 'سسٹم',
  themeLight: 'لائٹ',
  themeDark: 'ڈارک',
  language: 'زبان',
  urduSoon: 'اردو جلد آ رہی ہے',
  soon: 'جلد',
  readIn: 'یہ صفحہ اس زبان میں پڑھیں',
  newsletterTitle: 'کاروبار بڑھانے کے لیے گائیڈز اور نئی خبریں',
  newsletterBody: 'اسٹاک، کھاتہ، ٹیکس اور آن لائن بیچنے کے کام کے طریقے۔ جب چاہیں بند کر دیں۔',
  emailLabel: 'ای میل ایڈریس',
  emailPlaceholder: 'you@business.com',
  subscribe: 'سبسکرائب کریں',
  sending: 'بھیج رہے ہیں…',
  emailInvalid: 'براہِ کرم صحیح ای میل لکھیں۔',
  sendFailed: 'یہ نہیں جا سکا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
  subscribed: 'شکریہ! آپ لسٹ میں شامل ہو گئے۔ ہم کم لکھتے ہیں، اور صرف کام کی بات۔',
  whatsappUs: 'واٹس ایپ کریں',
  socialProfiles: 'سوشل پروفائل',
  whatsappFabLabel: 'Nafaa سے واٹس ایپ پر بات کریں',
  whatsappFabTitle: 'واٹس ایپ پر بات کریں',
  whatsappFabNote: 'اردو، انگریزی یا رومن اردو میں',
  learnMore: 'مزید دیکھیں',
  statusBeta: 'بیٹا',
  statusComing: 'جلد آ رہا ہے',
  exploreAll: (label: string) => `تمام ${label} دیکھیں`,
  goTo: (label: string) => `${label} دیکھیں`,
  about:
    'Nafaa پاکستان کا بزنس سافٹ ویئر ہے: دکانوں، ریسٹورنٹس، سروس والے کاروبار اور کئی برانچوں والی کمپنیوں کے لیے POS، اسٹاک، کھاتہ، خریداری، اسٹاف اور رپورٹس۔ آن لائن آرڈر اور آن لائن بیچنے والوں کے لیے مارکیٹ پلیس بھی، اور انٹرنیٹ نہ ہو تو بھی بلنگ چلتی رہتی ہے۔',
  notFoundTitle: 'یہ صفحہ نہیں ملا',
  notFoundBody: 'یہ صفحہ موجود نہیں یا کسی اور جگہ چلا گیا ہے۔',
  notFoundHome: 'ہوم پیج پر جائیں',
};

const STRINGS: Record<SiteLocale, ShellStrings> = { en, ur };

export function shellStrings(locale: string | undefined): ShellStrings {
  return locale === 'ur' ? STRINGS.ur : STRINGS.en;
}

/** Locale of a request path: '/ur' and '/ur/...' are Urdu, everything else English. */
export function localeOfPath(pathname: string | null | undefined): SiteLocale {
  return pathname === '/ur' || pathname?.startsWith('/ur/') ? 'ur' : 'en';
}

/** CMS path (no prefix) of a request path: '/ur/pricing' → '/pricing', '/ur' → '/'. */
export function cmsPathOf(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (localeOfPath(clean) !== 'ur') return clean;
  return clean.slice(3) || '/';
}

/** Request path of a CMS path in a locale: ('ur', '/pricing') → '/ur/pricing'. */
export function pathIn(locale: SiteLocale, cmsPath: string): string {
  if (locale === 'en') return cmsPath;
  return cmsPath === '/' ? '/ur' : `/ur${cmsPath}`;
}

// ─── Urdu menus ───
//
// Menus are saved per locale in the CMS and an Urdu menu falls back to the
// English one. Until editors save Urdu menus, the Urdu shell shows these
// translations of the English labels. A label without an entry (for example
// one an editor already wrote in Urdu) is shown as it is.

const UR_LABELS: Record<string, string> = {
  Products: 'پروڈکٹس',
  Product: 'پروڈکٹ',
  Sell: 'بیچیں',
  'POS & billing': 'POS اور بلنگ',
  Payments: 'پیمنٹس',
  'Online store': 'آن لائن اسٹور',
  'Works offline': 'انٹرنیٹ کے بغیر',
  Manage: 'سنبھالیں',
  Inventory: 'اسٹاک',
  Purchasing: 'خریداری',
  'Digital khata': 'ڈیجیٹل کھاتہ',
  'Staff & payroll': 'اسٹاف اور تنخواہ',
  'Multi-branch': 'کئی برانچیں',
  'Grow & comply': 'ترقی اور ٹیکس',
  Reports: 'رپورٹس',
  'Tax invoicing': 'ٹیکس انوائس',
  'WhatsApp & SMS': 'واٹس ایپ اور SMS',
  Loyalty: 'لائلٹی پوائنٹس',
  'AI assistant': 'AI اسسٹنٹ',
  'Plans and pricing': 'پلان اور قیمتیں',
  Solutions: 'سولوشنز',
  'By business type': 'کاروبار کے حساب سے',
  'Retail & shops': 'دکانیں اور ریٹیل',
  'Retail chains': 'ریٹیل چینز',
  'E-commerce sellers': 'آن لائن بیچنے والے',
  'Restaurants & cafés': 'ریسٹورنٹ اور کیفے',
  'Growing companies': 'بڑھتی کمپنیاں',
  'Wholesale & distribution': 'ہول سیل اور ڈسٹری بیوشن',
  Wholesale: 'ہول سیل',
  Manufacturing: 'مینوفیکچرنگ',
  'Service businesses': 'سروس والے کاروبار',
  Enterprise: 'بڑی کمپنیاں',
  'Book a demo': 'ڈیمو بک کریں',
  'Need it custom?': 'اپنی مرضی کا سسٹم چاہیے؟',
  Industries: 'کاروبار',
  'Retail shops': 'ریٹیل دکانیں',
  'Food & beverage': 'کھانا پینا',
  'Health & medical': 'صحت اور میڈیکل',
  Services: 'سروسز',
  'Specialty trade': 'خاص کاروبار',
  'Lifestyle & leisure': 'لائف اسٹائل',
  'Don’t see your business?': 'آپ کا کاروبار نظر نہیں آیا؟',
  'Solutions by business type': 'کاروبار کے حساب سے سولوشنز',
  Marketplace: 'مارکیٹ پلیس',
  'Sell online': 'آن لائن بیچیں',
  'Sell on Nafaa Bazaar': 'Nafaa Bazaar پر بیچیں',
  'Your own online store': 'اپنا آن لائن اسٹور',
  'Shopify & WooCommerce': 'Shopify اور WooCommerce',
  'Ship every order': 'ہر آرڈر بھیجیں',
  'Order pipeline': 'آرڈرز ایک اسکرین پر',
  'Couriers & COD': 'کورئیر اور COD',
  'Payment links': 'پیمنٹ لنک',
  'For e-commerce sellers': 'آن لائن بیچنے والوں کے لیے',
  'We build': 'ہم بناتے ہیں',
  'Custom software': 'کسٹم سافٹ ویئر',
  Websites: 'ویب سائٹس',
  'E-commerce stores': 'آن لائن اسٹورز',
  'Mobile apps': 'موبائل ایپس',
  'We set up': 'ہم سیٹ اپ کرتے ہیں',
  'Data migration': 'پرانا ڈیٹا منتقل کرنا',
  'Tax integration setup': 'ٹیکس انٹیگریشن سیٹ اپ',
  Hardware: 'ہارڈویئر',
  Training: 'ٹریننگ',
  'Quote lein': 'قیمت معلوم کریں',
  Resources: 'معلومات',
  Learn: 'سیکھیں',
  Blog: 'بلاگ',
  Guides: 'گائیڈز',
  Glossary: 'الفاظ کے معنی',
  'Free tools': 'مفت ٹولز',
  'Compare & comply': 'موازنہ اور ٹیکس',
  Compare: 'موازنہ',
  'Tax compliance': 'ٹیکس کے قوانین',
  'POS by city': 'شہر کے حساب سے POS',
  Company: 'کمپنی',
  Roadmap: 'روڈ میپ',
  Changelog: 'نئی تبدیلیاں',
  FAQ: 'سوال جواب',
  Contact: 'رابطہ',
  Developers: 'ڈویلپرز',
  'API reference': 'API ریفرنس',
  Integrations: 'انٹیگریشنز',
  Pricing: 'قیمتیں',
  'All industries': 'تمام کاروبار',
  Cities: 'شہر',
  About: 'ہمارے بارے میں',
  Privacy: 'پرائیویسی',
  Terms: 'شرائط',
  'Refund policy': 'ریفنڈ پالیسی',
};

const UR_DESCRIPTIONS: Record<string, string> = {
  'Fast counter with barcode, units and receipts': 'بارکوڈ، یونٹس اور رسید کے ساتھ تیز کاؤنٹر',
  'Cash, card, JazzCash, Easypaisa and QR': 'کیش، کارڈ، JazzCash، Easypaisa اور QR',
  'Website, Shopify and WooCommerce orders': 'ویب سائٹ، Shopify اور WooCommerce کے آرڈر',
  'Sell on the Nafaa marketplace': 'Nafaa مارکیٹ پلیس پر بیچیں',
  'Keep billing when the internet drops': 'انٹرنیٹ چلا جائے تو بھی بل بنتے رہیں',
  'Stock in every unit, transfers and alerts': 'ہر یونٹ میں اسٹاک، ٹرانسفر اور الرٹ',
  'Suppliers, purchase bills and payables': 'سپلائر، خریداری کے بل اور ان کی ادائیگی',
  'Udhaar with WhatsApp reminders': 'ادھار، واٹس ایپ یاد دہانی کے ساتھ',
  'Roles, attendance, commission, payroll': 'رولز، حاضری، کمیشن اور تنخواہ',
  'Every branch in one account': 'ہر برانچ ایک ہی اکاؤنٹ میں',
  'Profit, P&L, stock and day book': 'پرافٹ، P&L، اسٹاک اور روزنامچہ',
  'Optional FBR/PRA integration': 'FBR/PRA انٹیگریشن، اگر چاہیں',
  'Receipts and reminders to customers': 'گاہکوں کو رسید اور یاد دہانی',
  'Points and tiers for regular customers': 'پکے گاہکوں کے لیے پوائنٹس اور درجے',
  'New: ask your business in plain words': 'نیا: اپنے کاروبار کے بارے میں سیدھی بات میں پوچھیں',
  '7-day free trial. Every module in one account.': '7 دن مفت آزمائیں۔ ہر ماڈیول ایک اکاؤنٹ میں۔',
  'One counter, fast billing, stock and khata': 'ایک کاؤنٹر، تیز بلنگ، اسٹاک اور کھاتہ',
  'Branches, transfers and one view of all': 'برانچیں، ٹرانسفر اور سب کچھ ایک نظر میں',
  'Online store + marketplace, one stock': 'آن لائن اسٹور اور مارکیٹ پلیس، ایک ہی اسٹاک',
  'Tables, KOT, delivery and split bills': 'ٹیبل، KOT، ڈیلیوری اور الگ الگ بل',
  'Carton prices, credit limits, suppliers': 'کارٹن ریٹ، ادھار کی حد، سپلائر',
  'Stock and purchasing, built around your process': 'اسٹاک اور خریداری، آپ کے طریقے کے مطابق',
  'Bookings, memberships and commission': 'بکنگ، ممبرشپ اور کمیشن',
  'Roles, API, accounting export, onboarding': 'رولز، API، اکاؤنٹنگ ایکسپورٹ اور سیٹ اپ میں مدد',
  'See Nafaa set up for your kind of business.': 'دیکھیں Nafaa آپ کے کاروبار کے لیے کیسے سیٹ ہوتا ہے۔',
  'Our team builds the parts your business needs.': 'ہماری ٹیم وہ حصے بناتی ہے جو آپ کے کاروبار کو چاہییں۔',
  'The standard setup works for any shop. Tell us what your trade needs.':
    'عام سیٹ اپ ہر دکان پر چلتا ہے۔ ہمیں بتائیں آپ کے کام کو اور کیا چاہیے۔',
  'Retail chains, e-commerce, wholesale, restaurants and enterprise.':
    'ریٹیل چینز، آن لائن کاروبار، ہول سیل، ریسٹورنٹ اور بڑی کمپنیاں۔',
  'List your products on the Nafaa marketplace and reach new buyers': 'اپنی چیزیں Nafaa مارکیٹ پلیس پر لگائیں اور نئے خریدار پائیں',
  'Website orders land on the counter': 'ویب سائٹ کے آرڈر سیدھے کاؤنٹر پر',
  'Bring store orders into the same stock': 'اسٹور کے آرڈر اسی اسٹاک میں',
  'Confirm, prepare, dispatch and deliver from one screen': 'کنفرم، تیاری، روانگی اور ڈیلیوری ایک ہی اسکرین سے',
  'TCS, Leopards, PostEx, Trax or your own rider': 'TCS، Leopards، PostEx، Trax یا اپنا رائیڈر',
  'Send a link with the order and get paid first': 'آرڈر کے ساتھ لنک بھیجیں اور پہلے پیمنٹ لیں',
  'Website, Bazaar and counter sales from one stock, with a risk check on cash-on-delivery customers.':
    'ویب سائٹ، Bazaar اور کاؤنٹر کی سیل ایک اسٹاک سے، اور COD گاہکوں کا رسک چیک بھی۔',
  'ERP modules, portals and internal tools': 'ERP ماڈیول، پورٹل اور اندرونی ٹولز',
  'Company sites, designed and hosted': 'کمپنی کی ویب سائٹ، ڈیزائن اور ہوسٹنگ کے ساتھ',
  'Online stores tied to your stock': 'آپ کے اسٹاک سے جڑے آن لائن اسٹور',
  'Android and iOS apps': 'Android اور iOS ایپس',
  'From Excel or old software': 'Excel یا پرانے سافٹ ویئر سے',
  'Tax integration done for you': 'ٹیکس انٹیگریشن ہم کر دیں',
  'Printers, scanners and cash drawers': 'پرنٹر، اسکینر اور کیش دراز',
  'On-site and online for your team': 'آپ کی ٹیم کے لیے دکان پر یا آن لائن',
  'Worldwide. Tell us your idea; we reply with a plan and a price.': 'دنیا میں کہیں بھی۔ اپنا آئیڈیا بتائیں، ہم پلان اور قیمت بھیجیں گے۔',
  'Guides for running a business': 'کاروبار چلانے کی گائیڈز',
  'Step-by-step playbooks': 'قدم بہ قدم طریقے',
  'Business and tax terms explained': 'کاروبار اور ٹیکس کے الفاظ آسان زبان میں',
  'GST, margin and invoice tools': 'GST، مارجن اور انوائس کے ٹولز',
  'Nafaa next to other tools': 'Nafaa اور دوسرے سافٹ ویئر کا موازنہ',
  'FBR, PRA, SRB and KPRA rules': 'FBR، PRA، SRB اور KPRA کے اصول',
  'Local support and tax facts': 'مقامی سپورٹ اور ٹیکس کی معلومات',
  'What we are building next': 'ہم آگے کیا بنا رہے ہیں',
  'What shipped recently': 'حال ہی میں کیا نیا آیا',
  'Answers to common questions': 'عام سوالوں کے جواب',
  'Sales, support and partnerships': 'سیلز، سپورٹ اور پارٹنرشپ',
  'Products, stock, customers, sales and orders over REST': 'REST کے ذریعے پروڈکٹس، اسٹاک، گاہک، سیل اور آرڈر',
  'Get events when sales and orders change': 'سیل یا آرڈر بدلے تو فوراً اطلاع',
  'Accounting, payments, tax and stores': 'اکاؤنٹنگ، پیمنٹس، ٹیکس اور اسٹورز',
  'API and product updates': 'API اور پروڈکٹ کی اپ ڈیٹس',
};

const COMING_PREFIX = /^coming soon\s*[:–—-]\s*/i;

function urDescription(text: string | undefined): string | undefined {
  if (!text) return text;
  const prefix = COMING_PREFIX.exec(text)?.[0] ?? '';
  const rest = text.slice(prefix.length);
  // The English prefix stays: nav.ts reads it to show the "coming soon" badge and then hides it.
  return prefix + (UR_DESCRIPTIONS[rest] ?? rest);
}

interface ShellMenuItem {
  label: string;
  href: string;
  description?: string;
  children?: ShellMenuItem[];
}

/**
 * The Urdu shell's menus: labels and descriptions in Urdu, links to a page
 * that has an Urdu version moved under /ur (`paired`: CMS paths published in
 * both languages), and groups left empty by the Urdu auto lists dropped.
 */
export function urduMenu<T extends ShellMenuItem>(items: readonly T[], paired: ReadonlySet<string>): T[] {
  const out: T[] = [];
  for (const item of items) {
    const children = item.children ? urduMenu(item.children, paired) : undefined;
    if (!item.href && !children?.length) continue;
    const [path, anchor] = item.href.split('#', 2) as [string, string | undefined];
    const href = path.startsWith('/') && paired.has(path) ? `${pathIn('ur', path)}${anchor ? `#${anchor}` : ''}` : item.href;
    out.push({
      ...item,
      label: UR_LABELS[item.label] ?? item.label,
      href,
      ...(item.description ? { description: urDescription(item.description) } : {}),
      ...(item.children ? { children } : {}),
    });
  }
  return out;
}
