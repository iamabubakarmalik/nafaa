/**
 * Conversion bridges: every informational entry (glossary term, help
 * article, tool, template, blog post, guide) ends with one short call to
 * action that points to the money page matching its reader, and carries a
 * RELATED relation to that page.
 *
 * The target is chosen from the entry slug (first matching rule wins), so a
 * term about IMEI sends the reader to the mobile-shop page and a term about
 * IBFT to the payments page. Headings are 60 characters or fewer, wording
 * rotates by slug so the same sentence is not pasted everywhere, and the
 * Urdu entries get Urdu copy and link only to Urdu pages.
 */

import { blockId } from '../lib/blocks';
import type { EntryRef, SeedEntry } from '../lib/types';

export type Target =
  | 'mobile' | 'electronics' | 'payments' | 'restaurant' | 'inventory' | 'khata' | 'tax' | 'pos'
  | 'purchasing' | 'pharmacy' | 'bakery' | 'jewelry' | 'garments' | 'reports' | 'wholesale' | 'manufacturing'
  | 'online' | 'multishop' | 'loyalty' | 'whatsapp' | 'staff' | 'offline' | 'hardware' | 'ai' | 'kiryana';

export const REF: Record<Target, { ref: EntryRef; path: string }> = {
  mobile: { ref: 'INDUSTRY:mobile-shop', path: '/industries/mobile-shop' },
  electronics: { ref: 'INDUSTRY:electronics', path: '/industries/electronics' },
  payments: { ref: 'PRODUCT:payments', path: '/product/payments' },
  restaurant: { ref: 'INDUSTRY:restaurant', path: '/industries/restaurant' },
  inventory: { ref: 'PRODUCT:inventory', path: '/product/inventory' },
  khata: { ref: 'PRODUCT:khata', path: '/product/khata' },
  tax: { ref: 'PRODUCT:fbr', path: '/product/fbr' },
  pos: { ref: 'PRODUCT:pos', path: '/product/pos' },
  purchasing: { ref: 'PRODUCT:purchasing', path: '/product/purchasing' },
  pharmacy: { ref: 'INDUSTRY:pharmacy', path: '/industries/pharmacy' },
  bakery: { ref: 'INDUSTRY:bakery', path: '/industries/bakery' },
  jewelry: { ref: 'INDUSTRY:jewelry', path: '/industries/jewelry' },
  garments: { ref: 'INDUSTRY:garments', path: '/industries/garments' },
  reports: { ref: 'PRODUCT:reports', path: '/product/reports' },
  wholesale: { ref: 'SOLUTION:wholesale-distribution', path: '/solutions/wholesale-distribution' },
  manufacturing: { ref: 'SOLUTION:manufacturing', path: '/solutions/manufacturing' },
  online: { ref: 'PRODUCT:online-store', path: '/product/online-store' },
  multishop: { ref: 'PRODUCT:multi-shop', path: '/product/multi-shop' },
  loyalty: { ref: 'PRODUCT:loyalty', path: '/product/loyalty' },
  whatsapp: { ref: 'PRODUCT:whatsapp-sms', path: '/product/whatsapp-sms' },
  staff: { ref: 'PRODUCT:staff', path: '/product/staff' },
  offline: { ref: 'PRODUCT:offline-pos', path: '/product/offline-pos' },
  hardware: { ref: 'SERVICE:hardware', path: '/services/hardware' },
  ai: { ref: 'PRODUCT:ai-assistant', path: '/product/ai-assistant' },
  kiryana: { ref: 'INDUSTRY:kiryana', path: '/industries/kiryana' },
};

/** Slug rules, first match wins. */
const RULES: [RegExp, Target][] = [
  [/imei|pta|emi-|qist|trade-in|mobile-shop|mobile-imei/, 'mobile'],
  [/serial-number|warranty|serials/, 'electronics'],
  [/ibft|easypaisa|jazzcash|raast|qr-code|card-terminal|payment-gateway|chargeback|escrow|digital-payments/, 'payments'],
  [/kot|kitchen|food-cost|menu|recipe|modifiers|table|restaurant|split-bill|service-charge/, 'restaurant'],
  [/expiry|drap|controlled|prescription|generic-name|batch|fefo|pharmacy/, 'pharmacy'],
  [/making-charges|tola|gold|jewel/, 'jewelry'],
  [/bakery|bakeries/, 'bakery'],
  [/garment|clothing|size-and-colour|seasonal/, 'garments'],
  [/fbr|sales-tax|ntn|strn|withholding|e-invoicing|tier-1|gst|input-tax|taxpayer|tax-settings|compliance/, 'tax'],
  [/khata|udhaar|ledger|credit-sale|credit-terms|credit-limit|receivable|ageing|opening-balance|reduce-udhaar|credit-sales|credit-vs/, 'khata'],
  [/bom|work-order|manufactur/, 'manufacturing'],
  [/wholesale|reseller|franchise|consignment|delivery-challan|challan|distribution/, 'wholesale'],
  [/e-commerce|online|dropshipping|marketplace|^cod|cod-|rto|gmv|ecommerce|selling-online/, 'online'],
  [/vendor|supply-chain|lead-time|moq|minimum-order|backorder|purchase|grn|landed|accounts-payable|debit-note|supplier|procure/, 'purchasing'],
  [/thermal|printer|cash-drawer|customer-display|hardware-kit|hardware$|scale-barcode/, 'hardware'],
  [/branch|multi-shop|second-branch/, 'multishop'],
  [/loyalty|birthday/, 'loyalty'],
  [/whatsapp/, 'whatsapp'],
  [/staff|hire|theft/, 'staff'],
  [/offline|load-shedding/, 'offline'],
  [/nafaa-ai|ai-assistant/, 'ai'],
  [/kiryana|grocery/, 'kiryana'],
  [/markdown|cash-register|cash-memo|billing|saas|discount|hold|void|refund|split-payment|make-a-bill|pos|receipt|galla|invoice|layaway|quotation|combo|loose-sale|return/, 'pos'],
  [/balance-sheet|depreciation|overhead|fixed-cost|variable-cost|profit|margin|markup|cogs|break-even|cash-flow|day-book|z-report|cash-over|working-capital|petty|closing|zakat|pricing|report|net-|gross-|average-bill/, 'reports'],
  [/price-list|reorder|stock|inventory|sku|barcode|abc|dead|shrink|wastage|unit|transfer|valuation|turnover|ean|upc|variant|label|festival|ramadan|import|bulk|products|add-a-product/, 'inventory'],
];

const TOPIC_DEFAULT: Record<string, Target> = {
  'getting-started': 'pos',
  'products-and-stock': 'inventory',
  'pos-counter': 'pos',
  'khata-and-customers': 'khata',
  'reports-and-cash': 'reports',
  grow: 'online',
  'by-business-type': 'pos',
};

const TYPE_DEFAULT: Record<string, Target> = {
  GLOSSARY_TERM: 'pos',
  BLOG_POST: 'pos',
  TOOL: 'reports',
  TEMPLATE: 'inventory',
  GUIDE: 'pos',
  PAGE: 'pos',
};

const HELP_TOPICS = new Set(Object.keys(TOPIC_DEFAULT));

function pick(slug: string): Target | undefined {
  for (const [re, t] of RULES) if (re.test(slug)) return t;
  return undefined;
}

export function targetFor(e: SeedEntry): Target | undefined {
  if (!['GLOSSARY_TERM', 'BLOG_POST', 'TOOL', 'TEMPLATE', 'GUIDE', 'PAGE'].includes(e.type)) return undefined;
  const parent = typeof e.parent === 'string' ? e.parent.replace('PAGE:', '') : '';
  if (e.type === 'PAGE' && !HELP_TOPICS.has(parent)) return undefined;
  const slug = e.slug;
  // Hardcoded exceptions where the slug rules would misread the topic.
  const fixed: Record<string, Target> = {
    'discount-calculator': 'pos',
    'receipt-maker': 'pos',
    'barcode-generator': 'inventory',
    'profit-margin-calculator': 'reports',
    'break-even-calculator': 'reports',
    'khata-ageing-calculator': 'khata',
    'reorder-level-calculator': 'inventory',
    'food-cost-calculator': 'restaurant',
    'gst-calculator': 'tax',
    'zakat-calculator': 'reports',
    'purchase-order-template': 'purchasing',
    'simple-invoice-template': 'pos',
    'price-list-template': 'inventory',
    'daily-cash-closing-sheet': 'reports',
    'khata-udhaar-register': 'khata',
    'stock-take-sheet': 'inventory',
    'product-import-template': 'inventory',
    'serial-number': 'electronics',
    'invoice': 'pos',
    'sales-tax-invoice': 'tax',
    'best-pos-kiryana-2026': 'kiryana',
    'barcode-setup-guide': 'inventory',
    'barcode-vs-no-barcode-store': 'inventory',
    'choosing-a-pos-printer': 'hardware',
    'pos-hardware-kit-guide': 'hardware',
    'hardware-store-inventory-many-skus': 'inventory',
    'how-to-start-kiryana-store-pakistan': 'kiryana',
    'how-to-start-a-pharmacy-pakistan': 'pharmacy',
    'how-to-start-a-bakery-pakistan': 'bakery',
    'running-a-retail-shop-pakistan': 'pos',
    'managing-udhaar-and-khata': 'khata',
    'inventory-management-small-business': 'inventory',
    'start-selling-online-pakistan': 'online',
    'selling-online-pakistan': 'online',
    'reduce-bakery-wastage': 'bakery',
    'how-to-read-profit-and-loss-report': 'reports',
    'cash-vs-credit-sales': 'khata',
    'stock-taking-guide': 'inventory',
    'staff-theft-prevention-counter': 'staff',
    'daily-cash-closing-routine': 'reports',
    'whatsapp-business-for-shops': 'whatsapp',
    'whatsapp-customer-retention': 'whatsapp',
    'loyalty-programs-pakistan': 'loyalty',
    'digital-khata-vs-paper-ledger': 'khata',
    'gold-rate-pricing-jewelry-shops': 'jewelry',
    'wholesale-vs-retail-pricing': 'wholesale',
    'pricing-strategy-small-shop': 'reports',
    'how-to-calculate-profit-margin': 'reports',
    'multi-shop-management-guide': 'multishop',
    'opening-a-second-branch': 'multishop',
    'hire-and-train-counter-staff': 'staff',
    'load-shedding-proof-billing': 'offline',
    'festival-season-planning-pakistan': 'inventory',
    'ramadan-eid-retail-strategy': 'inventory',
    'restaurant-kot-system-guide': 'restaurant',
    'restaurant-menu-engineering': 'restaurant',
    'nafaa-ai-assistant-launch': 'ai',
    'sales-tax-guide-punjab-2026': 'tax',
    'drap-compliance-pharmacy': 'pharmacy',
    'pharmacy-expiry-management': 'pharmacy',
    'mobile-shop-imei-records': 'mobile',
    'digital-payments-jazzcash-easypaisa-raast': 'payments',
    'fbr-e-invoicing-complete-guide-2026': 'tax',
    'clothing-size-inventory-guide': 'garments',
    'garment-shop-seasonal-stock-planning': 'garments',
    'cod-reconciliation': 'online',
    'reorder-level': 'inventory',
    'recipe-costing': 'restaurant',
  };
  if (fixed[slug]) return fixed[slug];
  return pick(slug) ?? (e.type === 'PAGE' ? TOPIC_DEFAULT[parent] : TYPE_DEFAULT[e.type]);
}

interface Copy { heading: string; body: string; button: string }

/** English copy: two or three variants per target, picked by slug hash. */
const EN: Record<Target, Copy[]> = {
  mobile: [
    { heading: 'Track every phone by IMEI in Nafaa', body: 'Record IMEI 1 and 2, PTA status, cost and price for each handset, and see which phones are still on the shelf. 7-day free trial.', button: 'See Nafaa for mobile shops' },
    { heading: 'Run your mobile shop with IMEI-level stock', body: 'Sell by IMEI, keep instalment khata for phones sold on qist, and see profit per handset. Try it free for 7 days.', button: 'Mobile shop software' },
  ],
  electronics: [
    { heading: 'Keep serial numbers and warranty in one register', body: 'Nafaa stores each unit by serial number with its bill, warranty days left and any open claim. Try it free for 7 days.', button: 'Software for electronics shops' },
    { heading: 'Find any unit by serial number in seconds', body: 'Look up a customer\'s bill and warranty from the serial number instead of a paper register. 7-day free trial.', button: 'See the electronics shop setup' },
  ],
  payments: [
    { heading: 'Take mobile wallet and bank payments at the counter', body: 'Record cash, card and wallet payments on one bill, including split payments, and see each method in your day report. 7-day free trial.', button: 'See Nafaa payments' },
    { heading: 'Know which payments actually reached you', body: 'Nafaa keeps every payment method separate on the bill and in the cash closing, so the counts match at night. Try it free for 7 days.', button: 'How payments work in Nafaa' },
    { heading: 'Accept QR and wallet payments without extra paperwork', body: 'Show a payment QR at the counter and record the sale in the same bill. 7-day free trial, no card needed to look around.', button: 'Payments in Nafaa' },
  ],
  restaurant: [
    { heading: 'Send orders to the kitchen with Nafaa KOT', body: 'Tables, kitchen order tickets, recipe cost and split bills in one restaurant POS. Start a 7-day free trial.', button: 'Restaurant POS for Pakistan' },
    { heading: 'Know your food cost per dish', body: 'Link recipes to stock and see the cost and margin of every item on your menu. Try it free for 7 days.', button: 'See Nafaa for restaurants' },
    { heading: 'A restaurant POS built for tables and KOT', body: 'Open tables, send items to the kitchen screen and close the bill with service charge. 7-day free trial.', button: 'Restaurant billing software' },
  ],
  inventory: [
    { heading: 'Get low-stock alerts before the shelf is empty', body: 'Set a reorder level per item, count stock and move it between branches. Start a 7-day free trial.', button: 'Inventory management in Nafaa' },
    { heading: 'Stop guessing your stock', body: 'Nafaa updates stock on every bill and purchase, and shows what to reorder and what has not sold. Try it free for 7 days.', button: 'See inventory software' },
    { heading: 'Put your product list and stock in one place', body: 'Import products from a sheet, print barcode labels and watch stock value at cost. 7-day free trial.', button: 'Inventory software for Pakistan' },
  ],
  khata: [
    { heading: 'Keep your udhaar in a digital khata', body: 'Each customer gets a balance, credit limit and WhatsApp reminder, and every payment is on record. 7-day free trial.', button: 'See Nafaa Khata' },
    { heading: 'Collect udhaar without chasing it by memory', body: 'See who owes what by age of the balance and send a reminder in one tap. Try it free for 7 days.', button: 'Digital khata software' },
  ],
  tax: [
    { heading: 'Bill with optional FBR and provincial integration', body: 'Nafaa can send bills to FBR or your provincial authority from the Tax page and shows the answer on each bill. Try it free for 7 days.', button: 'See FBR integration' },
    { heading: 'Keep your sales tax records tidy', body: 'Set tax on products, print tax invoices and see a monthly tax report. Check rules with the authority or your tax adviser. 7-day free trial.', button: 'Tax and FBR in Nafaa' },
  ],
  pos: [
    { heading: 'Make bills faster at your counter', body: 'Scan or search, hold a bill, split the payment and print a receipt, even when the internet drops. 7-day free trial.', button: 'See Nafaa POS' },
    { heading: 'Try Nafaa POS on your own products', body: 'Add a few items and make a test bill in minutes. The free trial runs for 7 days.', button: 'POS software in Pakistan' },
    { heading: 'Billing software for a Pakistani counter', body: 'Discounts, returns with a PIN, hold and recall, and printed receipts in one screen. Start a 7-day free trial.', button: 'Billing software' },
  ],
  purchasing: [
    { heading: 'Record purchases and supplier balances in Nafaa', body: 'Create purchase orders, receive goods, update cost and see what you owe each supplier. Try it free for 7 days.', button: 'See purchasing in Nafaa' },
    { heading: 'Know what you bought and what you still owe', body: 'Purchases change stock and cost automatically, and each supplier has a ledger. 7-day free trial.', button: 'Purchase and supplier tools' },
  ],
  pharmacy: [
    { heading: 'Track batch and expiry in your pharmacy', body: 'Nafaa lists batches by expiry date, warns before they run out and keeps controlled-drug entries. 7-day free trial.', button: 'Pharmacy software for Pakistan' },
    { heading: 'Sell the oldest batch first', body: 'See what expires in 30 and 90 days and keep prescription and khata records together. Try it free for 7 days.', button: 'See Nafaa for pharmacies' },
  ],
  bakery: [
    { heading: 'Plan production and cake orders in one place', body: 'Track ingredients, daily production, cake orders with advance and your profit by item. 7-day free trial.', button: 'Bakery software' },
    { heading: 'Cut bakery wastage with real numbers', body: 'See what you made, sold and threw away, and the recipe cost behind each item. Try it free for 7 days.', button: 'See Nafaa for bakeries' },
  ],
  jewelry: [
    { heading: 'Bill gold by weight, karat and making charges', body: 'Set the daily gold rate, record weight and making charges on every bill and keep custom orders with advance. 7-day free trial.', button: 'Jewellery shop software' },
  ],
  garments: [
    { heading: 'Manage stock by size and colour', body: 'Keep every article with its sizes and colours, see which sizes ran out and sell with a barcode. 7-day free trial.', button: 'Garment shop software' },
    { heading: 'See which sizes and articles actually sell', body: 'Profit by article, stock per variant and discount given in one report. Try it free for 7 days.', button: 'See Nafaa for garments' },
  ],
  reports: [
    { heading: 'See your real profit every day', body: 'Nafaa shows sale, cost, expenses and profit by day, item and branch, without a separate sheet. 7-day free trial.', button: 'See Nafaa reports' },
    { heading: 'Close the day and know the numbers', body: 'Day report, cash closing and profit by product from the same bills your counter makes. Try it free for 7 days.', button: 'Reports and cash closing' },
  ],
  wholesale: [
    { heading: 'Run wholesale orders, delivery and customer balances', body: 'Price lists, challans, credit limits and route-wise delivery for distributors and wholesalers. 7-day free trial.', button: 'Wholesale and distribution' },
  ],
  manufacturing: [
    { heading: 'Track raw material, production and finished stock', body: 'Use recipes or bills of material and see the cost of what you make. Ask for a demo on your own process.', button: 'Software for manufacturers' },
  ],
  online: [
    { heading: 'Sell online from the same stock as your shop', body: 'Connect your website, take COD orders and see them at the counter with one stock count. 7-day free trial.', button: 'See the Nafaa online store' },
    { heading: 'Manage COD orders without double stock', body: 'Online orders arrive in Nafaa with status and area, and stock changes once. Try it free for 7 days.', button: 'Online store and COD' },
  ],
  multishop: [
    { heading: 'See every branch from one login', body: 'Compare sale and stock across branches, transfer stock and set who can see what. 7-day free trial.', button: 'Multi-shop management' },
  ],
  loyalty: [
    { heading: 'Give points to customers who come back', body: 'Set how points are earned and used at the counter, and see members and balances. Try it free for 7 days.', button: 'See Nafaa loyalty' },
  ],
  whatsapp: [
    { heading: 'Send bills and reminders on WhatsApp and SMS', body: 'Share a bill or an udhaar reminder with the customer straight from Nafaa. 7-day free trial.', button: 'WhatsApp and SMS in Nafaa' },
  ],
  staff: [
    { heading: 'Give each staff member only the access they need', body: 'Roles, permissions, PIN-protected refunds and sales by staff member. Start a 7-day free trial.', button: 'Staff and permissions' },
  ],
  offline: [
    { heading: 'Keep billing when the internet or power drops', body: 'Nafaa saves bills on the device and syncs when the connection returns. Try it free for 7 days.', button: 'Offline POS' },
  ],
  hardware: [
    { heading: 'Get printers and scanners that work with Nafaa', body: 'We can supply and set up counter hardware so the first bill prints on day one. Ask us on WhatsApp.', button: 'Counter hardware setup' },
  ],
  ai: [
    { heading: 'Ask Nafaa AI about your own shop numbers', body: 'Ask about sales, stock and customers in plain words and get answers from your data. Try it in the 7-day free trial.', button: 'Meet Nafaa AI' },
  ],
  kiryana: [
    { heading: 'POS and khata for a kiryana store', body: 'Fast billing, loose items by weight, udhaar khata and low-stock alerts in one app. 7-day free trial.', button: 'See Nafaa for kiryana stores' },
  ],
};

/** Urdu copy: one variant per target, used only on Urdu entries. */
const UR: Record<Target, Copy> = {
  mobile: { heading: 'نفع میں ہر فون کو IMEI سے ٹریک کریں', body: 'ہر ہینڈسیٹ کا IMEI، PTA اسٹیٹس، Cost اور قیمت ریکارڈ کریں۔ 7 دن کا مفت ٹرائل۔', button: 'موبائل شاپ کے لیے نفع دیکھیں' },
  electronics: { heading: 'سیریل نمبر اور وارنٹی ایک رجسٹر میں', body: 'ہر یونٹ سیریل نمبر سے، اس کے بل اور وارنٹی کے ساتھ۔ 7 دن مفت آزمائیں۔', button: 'الیکٹرونکس شاپ کا سیٹ اپ' },
  payments: { heading: 'کاؤنٹر پر موبائل والٹ اور بینک پیمنٹ لیں', body: 'ایک ہی بل پر کیش، کارڈ اور والٹ پیمنٹ ریکارڈ کریں۔ 7 دن کا مفت ٹرائل۔', button: 'نفع پیمنٹس دیکھیں' },
  restaurant: { heading: 'نفع کے KOT سے آرڈر کچن بھیجیں', body: 'ٹیبلز، کچن آرڈر ٹکٹ اور ریسیپی Cost ایک ریسٹورنٹ POS میں۔ 7 دن مفت آزمائیں۔', button: 'ریسٹورنٹ POS دیکھیں' },
  inventory: { heading: 'شیلف خالی ہونے سے پہلے الرٹ پائیں', body: 'ہر آئٹم کا ری آرڈر لیول رکھیں، Stock گنیں اور برانچوں میں منتقل کریں۔ 7 دن کا مفت ٹرائل۔', button: 'نفع انوینٹری دیکھیں' },
  khata: { heading: 'اپنا ادھار ڈیجیٹل کھاتے میں رکھیں', body: 'ہر کسٹمر کا بیلنس، کریڈٹ لمٹ اور WhatsApp ریمائنڈر۔ 7 دن کا مفت ٹرائل۔', button: 'نفع کھاتہ دیکھیں' },
  tax: { heading: 'اختیاری FBR اور صوبائی انٹیگریشن کے ساتھ بل بنائیں', body: 'نفع کے Tax صفحے سے بل بھیجے جا سکتے ہیں۔ قواعد متعلقہ ادارے یا ٹیکس ایڈوائزر سے چیک کریں۔ 7 دن مفت ٹرائل۔', button: 'FBR انٹیگریشن دیکھیں' },
  pos: { heading: 'اپنے کاؤنٹر پر بل تیزی سے بنائیں', body: 'اسکین کریں، بل ہولڈ کریں، پیمنٹ تقسیم کریں اور رسید پرنٹ کریں۔ 7 دن کا مفت ٹرائل۔', button: 'نفع POS دیکھیں' },
  purchasing: { heading: 'خریداری اور سپلائر کا بیلنس نفع میں رکھیں', body: 'پرچیز آرڈر بنائیں، مال وصول کریں اور دیکھیں ہر سپلائر کو کتنا دینا ہے۔ 7 دن مفت آزمائیں۔', button: 'پرچیزنگ دیکھیں' },
  pharmacy: { heading: 'اپنی فارمیسی میں بیچ اور ایکسپائری ٹریک کریں', body: 'ایکسپائری کی تاریخ کے مطابق بیچ کی لسٹ اور پہلے سے خبردار۔ 7 دن کا مفت ٹرائل۔', button: 'فارمیسی کے لیے نفع دیکھیں' },
  bakery: { heading: 'پروڈکشن اور کیک آرڈرز ایک جگہ', body: 'اجزا، روزانہ پروڈکشن، ایڈوانس والے کیک آرڈر اور آئٹم کے حساب سے Profit۔ 7 دن مفت آزمائیں۔', button: 'بیکری سافٹ ویئر دیکھیں' },
  jewelry: { heading: 'سونے کا بل وزن، قیراط اور میکنگ چارجز سے', body: 'روزانہ سونے کا ریٹ لگائیں اور ہر بل پر وزن اور میکنگ چارجز لکھیں۔ 7 دن کا مفت ٹرائل۔', button: 'جیولری شاپ سافٹ ویئر' },
  garments: { heading: 'سائز اور رنگ کے حساب سے Stock سنبھالیں', body: 'ہر آرٹیکل کے سائز اور رنگ، اور ختم ہو چکے سائز ایک نظر میں۔ 7 دن مفت آزمائیں۔', button: 'گارمنٹس شاپ سافٹ ویئر' },
  reports: { heading: 'روزانہ اپنا اصل Profit دیکھیں', body: 'Sale، Cost، Expenses اور Profit دن، آئٹم اور برانچ کے حساب سے۔ 7 دن کا مفت ٹرائل۔', button: 'نفع رپورٹس دیکھیں' },
  wholesale: { heading: 'ہول سیل آرڈر، ڈیلیوری اور کسٹمر بیلنس سنبھالیں', body: 'پرائس لسٹ، چالان اور کریڈٹ لمٹ ڈسٹری بیوٹرز کے لیے۔ 7 دن مفت آزمائیں۔', button: 'ہول سیل اور ڈسٹری بیوشن' },
  manufacturing: { heading: 'خام مال، پروڈکشن اور تیار مال کا حساب', body: 'ریسیپی یا بل آف میٹیریل سے اپنی بنائی چیز کی Cost دیکھیں۔ اپنے کام پر ڈیمو مانگیں۔', button: 'مینوفیکچررز کے لیے نفع' },
  online: { heading: 'دکان کے Stock سے ہی آن لائن بیچیں', body: 'ویب سائٹ جوڑیں، COD آرڈر لیں اور Stock ایک ہی رکھیں۔ 7 دن کا مفت ٹرائل۔', button: 'نفع آن لائن اسٹور دیکھیں' },
  multishop: { heading: 'ایک لاگ اِن سے ہر برانچ دیکھیں', body: 'برانچوں کی Sale اور Stock کا موازنہ کریں اور Stock منتقل کریں۔ 7 دن مفت آزمائیں۔', button: 'ملٹی شاپ مینجمنٹ' },
  loyalty: { heading: 'واپس آنے والے کسٹمرز کو پوائنٹس دیں', body: 'کاؤنٹر پر پوائنٹس کمانے اور استعمال کرنے کا اصول خود طے کریں۔ 7 دن کا مفت ٹرائل۔', button: 'نفع لائلٹی دیکھیں' },
  whatsapp: { heading: 'بل اور ریمائنڈر WhatsApp اور SMS پر بھیجیں', body: 'نفع سے ہی بل یا ادھار کا ریمائنڈر کسٹمر کو بھیجیں۔ 7 دن مفت آزمائیں۔', button: 'WhatsApp اور SMS دیکھیں' },
  staff: { heading: 'ہر اسٹاف ممبر کو صرف ضروری رسائی دیں', body: 'رولز، اجازتیں، PIN والے ریفنڈ اور اسٹاف کے حساب سے Sales۔ 7 دن کا مفت ٹرائل۔', button: 'اسٹاف اور اجازتیں' },
  offline: { heading: 'انٹرنیٹ یا بجلی جانے پر بھی بل بنائیں', body: 'نفع بل ڈیوائس پر محفوظ رکھتا ہے اور کنکشن آنے پر سنک کرتا ہے۔ 7 دن مفت آزمائیں۔', button: 'آف لائن POS دیکھیں' },
  hardware: { heading: 'نفع کے ساتھ چلنے والے پرنٹر اور اسکینر', body: 'ہم کاؤنٹر ہارڈویئر فراہم اور سیٹ اپ کر سکتے ہیں۔ WhatsApp پر پوچھیں۔', button: 'کاؤنٹر ہارڈویئر سیٹ اپ' },
  ai: { heading: 'اپنی دکان کے اعداد نفع AI سے پوچھیں', body: 'Sales، Stock اور کسٹمرز کے بارے میں سادہ الفاظ میں پوچھیں۔ 7 دن کے مفت ٹرائل میں آزمائیں۔', button: 'نفع AI دیکھیں' },
  kiryana: { heading: 'کریانہ اسٹور کے لیے POS اور کھاتہ', body: 'تیز بلنگ، وزن پر کھلا مال، ادھار کھاتہ اور کم Stock الرٹ ایک ایپ میں۔ 7 دن مفت آزمائیں۔', button: 'کریانہ اسٹور کے لیے نفع' },
};

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function applyBridges(all: SeedEntry[]): SeedEntry[] {
  return all.map((e) => {
    const t = targetFor(e);
    if (!t) return e;
    const isUr = e.locale === 'ur';
    const copy = isUr ? UR[t] : EN[t][hash(e.slug) % EN[t].length];
    const { ref: enRef, path } = REF[t];
    const ref = (isUr ? `${enRef}@ur` : enRef) as EntryRef;
    const base = isUr ? `/ur${path}` : path;
    const blocks = [...(e.blocks ?? [])];
    // Insert after the last visible block, before hidden writer notes.
    let at = blocks.length;
    while (at > 0 && (blocks[at - 1] as { hidden?: boolean }).hidden) at -= 1;
    const bridge = {
      type: 'cta',
      id: blockId(`${e.type}:${e.slug}:${e.locale ?? 'en'}`, 900),
      heading: copy.heading,
      body: copy.body,
      primaryCta: { label: copy.button, href: base, variant: 'primary', trackAs: 'bridge_money_page' },
      secondaryCta: { label: isUr ? 'مفت ٹرائل شروع کریں' : 'Start free trial', href: 'signup', variant: 'secondary', trackAs: 'bridge_signup' },
    } as unknown as NonNullable<SeedEntry['blocks']>[number];
    blocks.splice(at, 0, bridge);
    const rels = e.relations ?? [];
    const has = rels.some((r) => r.ref === ref);
    return { ...e, blocks, relations: has ? rels : [...rels, { ref, kind: 'RELATED' as const }] };
  });
}
