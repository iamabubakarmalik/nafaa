/**
 * Words for the plan finder on /pricing (and /ur/pricing). Questions and
 * labels only: plan names, prices, limits and add-ons come from the pricing
 * catalog. Plain data so the island can take it as a prop. Also the catalog
 * keys the finder reads (add-ons per need, the multi-shop feature).
 */

export type BusinessType = 'shop' | 'food' | 'wholesale' | 'online' | 'service';
export type FinderNeed = 'store' | 'marketplaces' | 'wholesale';

/** Catalog add-on keys per need, in order of preference: the first set the plan offers in full wins. */
export const NEED_ADDONS: Record<FinderNeed, string[][]> = {
  store: [['online_store']],
  marketplaces: [['online_seller_bundle'], ['shopify', 'daraz', 'woocommerce']],
  wholesale: [['distribution']],
};
export const EXTRA_SHOP = 'extra_shop';
export const EXTRA_USER = 'extra_user';
/** Catalog feature a plan needs for more than one shop. */
export const MULTI_SHOP = 'multi_shop';
/** Every add-on key the finder reads (the page passes only these to the island). */
export const FINDER_ADDON_KEYS = new Set([EXTRA_SHOP, EXTRA_USER, ...Object.values(NEED_ADDONS).flat(2)]);

export interface PlanFinderStrings {
  kicker: string;
  heading: string;
  intro: string;
  qType: string;
  types: Record<BusinessType, string>;
  qBranches: string;
  qBranchesHint: string;
  branches: [string, string, string, string];
  qUsers: string;
  qUsersHint: string;
  users: [string, string, string, string];
  qNeeds: string;
  needs: Record<FinderNeed, string>;
  resultKicker: string;
  /** "{price}" is a formatted number. */
  perMonth: string;
  includes: string;
  /** "{users}" and "{shops}" are limits (or the word for unlimited). */
  limits: string;
  /** The same for a plan with one shop. */
  limitsOneShop: string;
  unlimited: string;
  /** "{n}" extra branches. */
  extraShops: string;
  /** "{n}" extra users. */
  extraUsers: string;
  addOns: string;
  total: string;
  /** "{price}". */
  totalValue: string;
  freeNote: string;
  /** "{days}". */
  cta: string;
  compare: string;
  calculator: string;
  tour: string;
  tourLink: string;
  priceNote: string;
}

const en: PlanFinderStrings = {
  kicker: 'Plan finder',
  heading: 'Which plan fits your business?',
  intro: 'Answer four quick questions. We match them against the plans and add-ons below and show what you would pay.',
  qType: 'What kind of business is it?',
  types: {
    shop: 'Shop or store',
    food: 'Restaurant, café or bakery',
    wholesale: 'Wholesale or distribution',
    online: 'Mostly online',
    service: 'Services (salon, clinic, repairs)',
  },
  qBranches: 'How many shops or branches?',
  qBranchesHint: 'Count every location that sells.',
  branches: ['1', '2–3', '4–6', '7 or more'],
  qUsers: 'How many people will use Nafaa?',
  qUsersHint: 'Counter staff, managers and you.',
  users: ['1', '2–3', '4–10', '11 or more'],
  qNeeds: 'Do you also need',
  needs: {
    store: 'Your own online store',
    marketplaces: 'Selling on Shopify, Daraz or WooCommerce',
    wholesale: 'Wholesale orders and order bookers',
  },
  resultKicker: 'Our suggestion',
  perMonth: 'Rs {price} / month',
  includes: 'What you get',
  limits: 'Up to {users} users and {shops} shops',
  limitsOneShop: 'Up to {users} users in one shop',
  unlimited: 'unlimited',
  extraShops: '{n} extra shops or branches',
  extraUsers: '{n} extra users',
  addOns: 'Add-ons',
  total: 'About',
  totalValue: 'Rs {price} a month',
  freeNote: 'Very small shop? The Free plan covers one shop and one user with the core counter tools.',
  cta: 'Try free for {days} days',
  compare: 'Compare plans',
  calculator: 'Make your own bill',
  tour: 'Want to see the app first?',
  tourLink: 'Take the product tour',
  priceNote: 'Monthly prices in PKR. Longer periods cost less.',
};

const ur: PlanFinderStrings = {
  kicker: 'پلان فائنڈر',
  heading: 'آپ کے کاروبار کے لیے کون سا پلان ٹھیک ہے؟',
  intro: 'چار آسان سوالوں کے جواب دیں۔ ہم انہیں نیچے والے پلانز اور ایڈ آنز سے ملا کر بتاتے ہیں کہ آپ کا خرچ کتنا ہو گا۔',
  qType: 'کاروبار کس قسم کا ہے؟',
  types: {
    shop: 'دکان یا اسٹور',
    food: 'ریسٹورنٹ، کیفے یا بیکری',
    wholesale: 'ہول سیل یا ڈسٹری بیوشن',
    online: 'زیادہ تر آن لائن',
    service: 'سروس (سیلون، کلینک، مرمت)',
  },
  qBranches: 'کتنی دکانیں یا برانچیں ہیں؟',
  qBranchesHint: 'ہر وہ جگہ گنیں جہاں سیل ہوتی ہے۔',
  branches: ['1', '2–3', '4–6', '7 یا زیادہ'],
  qUsers: 'Nafaa کتنے لوگ استعمال کریں گے؟',
  qUsersHint: 'کاؤنٹر اسٹاف، مینیجر اور آپ خود۔',
  users: ['1', '2–3', '4–10', '11 یا زیادہ'],
  qNeeds: 'کیا یہ بھی چاہیے؟',
  needs: {
    store: 'اپنا آن لائن اسٹور',
    marketplaces: 'Shopify، Daraz یا WooCommerce پر بیچنا',
    wholesale: 'ہول سیل آرڈر اور آرڈر بکر',
  },
  resultKicker: 'ہمارا مشورہ',
  perMonth: 'Rs {price} / ماہ',
  includes: 'کیا ملے گا',
  limits: '{users} یوزرز اور {shops} دکانوں تک',
  limitsOneShop: 'ایک دکان میں {users} یوزرز تک',
  unlimited: 'لا محدود',
  extraShops: '{n} اضافی دکانیں یا برانچیں',
  extraUsers: '{n} اضافی یوزرز',
  addOns: 'ایڈ آنز',
  total: 'تقریباً',
  totalValue: 'Rs {price} ماہانہ',
  freeNote: 'بہت چھوٹی دکان ہے؟ Free پلان میں ایک دکان اور ایک یوزر کے ساتھ بنیادی کاؤنٹر ٹولز ہیں۔',
  cta: '{days} دن مفت آزمائیں',
  compare: 'پلانز کا موازنہ',
  calculator: 'اپنا بل خود بنائیں',
  tour: 'پہلے ایپ دیکھنا چاہتے ہیں؟',
  tourLink: 'پروڈکٹ ٹور دیکھیں',
  priceNote: 'ماہانہ قیمتیں PKR میں۔ لمبی مدت پر کم پڑتی ہیں۔',
};

export function planFinderStrings(locale?: string): PlanFinderStrings {
  return locale === 'ur' ? ur : en;
}
