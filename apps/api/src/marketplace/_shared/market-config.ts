/**
 * Nafaa Market category engine (server side).
 *
 * The Market has six sections ("gates"). A shop belongs to one gate, picked
 * from its POS business type unless the owner chose one. Each gate decides
 * the customer flow: how products are shown, what the cart needs and which
 * extra checkout steps apply. Shops switch individual flow features on or
 * off in `ShopMarketplaceProfile.flowSettings`; the platform can rename,
 * reorder or hide gates from the admin panel (SystemSetting MARKET_CONFIG_KEY).
 *
 * Clients read the merged result from GET /marketplace/config, so web,
 * mobile and admin never keep their own copy of these rules.
 */

export const MARKET_GATES = ['FOOD', 'GROCERY', 'PHARMACY', 'SHOPPING', 'BOOKING', 'WHOLESALE'] as const;
export type MarketGate = (typeof MARKET_GATES)[number];

/** How an order is fulfilled: delivered now, shipped (rider or courier), or a visit booked. */
export type OrderMode = 'INSTANT' | 'SHIPPED' | 'BOOKING';

/** Per-shop switches. Every key is optional; missing keys take the gate default. */
export interface FlowSettings {
  /** Restaurant add-ons from the POS modifier groups. */
  modifiers?: boolean;
  /** Customer may allow a replacement when an item is short. */
  substitutes?: boolean;
  /** Customer picks a delivery time window. */
  deliverySlots?: boolean;
  /** Prescription-only products need a photo of the prescription. */
  prescription?: boolean;
  /** Custom cake form (weight, flavour, message, date). */
  customCake?: boolean;
  /** Visit booking with a time slot instead of delivery. */
  booking?: boolean;
  /** Size and colour picker from product variants. */
  sizeColour?: boolean;
  /** Ship Pakistan-wide through the shop's couriers. */
  courier?: boolean;
  /** Pickup from the shop. */
  pickup?: boolean;
  /** Dine-in pre-order. */
  dineIn?: boolean;
  /** Delivery date and gift message (florists, gifts). */
  giftMessage?: boolean;
  /** Orders below this need not be accepted (0 = no minimum). Wholesale uses carton minimums instead. */
  minOrderAmount?: number;
}

export interface GateDefinition {
  id: MarketGate;
  /** Display names; clients pick by language. */
  label: { en: string; roman: string; ur: string };
  /** Short line under the gate tile. */
  tagline: { en: string; roman: string; ur: string };
  mode: OrderMode;
  /** Business-only gate: only signed-in Nafaa businesses may buy. */
  businessOnly?: boolean;
  defaults: FlowSettings;
  /** Sub-filters shown inside the gate (customers filter shops by these). */
  filters: Array<{ id: string; label: { en: string; roman: string; ur: string } }>;
}

const f = (id: string, en: string, roman: string, ur: string) => ({ id, label: { en, roman, ur } });

export const GATE_DEFINITIONS: Record<MarketGate, GateDefinition> = {
  FOOD: {
    id: 'FOOD',
    label: { en: 'Food', roman: 'Khana', ur: 'کھانا' },
    tagline: { en: 'Restaurants, cafes and bakeries', roman: 'Restaurants, cafe aur bakery', ur: 'ریسٹورنٹ، کیفے اور بیکری' },
    mode: 'INSTANT',
    defaults: { modifiers: true, pickup: true, dineIn: false, customCake: false, deliverySlots: false },
    filters: [
      f('fast-food', 'Fast food', 'Fast food', 'فاسٹ فوڈ'), f('desi', 'Desi', 'Desi khana', 'دیسی کھانا'),
      f('bbq', 'BBQ', 'BBQ', 'باربی کیو'), f('pizza', 'Pizza', 'Pizza', 'پیزا'), f('cafe', 'Cafe', 'Cafe', 'کیفے'),
      f('chai', 'Chai', 'Chai', 'چائے'), f('bakery', 'Bakery', 'Bakery', 'بیکری'), f('sweets', 'Sweets', 'Mithai', 'مٹھائی'),
    ],
  },
  GROCERY: {
    id: 'GROCERY',
    label: { en: 'Grocery', roman: 'Grocery', ur: 'گروسری' },
    tagline: { en: 'Kiryana, milk, meat and daily needs', roman: 'Kiryana, doodh, gosht aur rozana ka saman', ur: 'کریانہ، دودھ، گوشت اور روزمرہ کا سامان' },
    mode: 'INSTANT',
    defaults: { substitutes: true, deliverySlots: true, pickup: true },
    filters: [
      f('kiryana', 'Kiryana', 'Kiryana', 'کریانہ'), f('dairy', 'Dairy', 'Doodh, dahi', 'دودھ، دہی'),
      f('meat', 'Meat', 'Gosht', 'گوشت'), f('fruit-veg', 'Fruit & veg', 'Phal aur sabzi', 'پھل اور سبزی'),
    ],
  },
  PHARMACY: {
    id: 'PHARMACY',
    label: { en: 'Pharmacy', roman: 'Pharmacy', ur: 'فارمیسی' },
    tagline: { en: 'Medicines with prescription upload', roman: 'Dawaiyan, nuskha upload ke saath', ur: 'دوائیں، نسخہ اپ لوڈ کے ساتھ' },
    mode: 'INSTANT',
    defaults: { prescription: true, substitutes: true, pickup: true },
    filters: [f('medicines', 'Medicines', 'Dawaiyan', 'دوائیں'), f('baby', 'Baby care', 'Bachon ka saman', 'بچوں کا سامان'), f('personal', 'Personal care', 'Personal care', 'پرسنل کیئر')],
  },
  SHOPPING: {
    id: 'SHOPPING',
    label: { en: 'Shopping', roman: 'Shopping', ur: 'شاپنگ' },
    tagline: { en: 'Fashion, electronics, home and more', roman: 'Kapre, electronics, ghar ka saman aur bohat kuch', ur: 'کپڑے، الیکٹرانکس، گھر کا سامان اور بہت کچھ' },
    mode: 'SHIPPED',
    defaults: { sizeColour: true, courier: true, pickup: true },
    filters: [
      f('fashion', 'Fashion', 'Fashion', 'فیشن'), f('shoes', 'Shoes', 'Joote', 'جوتے'), f('jewellery', 'Jewellery', 'Jewellery', 'زیورات'),
      f('beauty', 'Beauty', 'Beauty', 'بیوٹی'), f('electronics', 'Electronics', 'Electronics', 'الیکٹرانکس'), f('mobiles', 'Mobiles', 'Mobile', 'موبائل'),
      f('home', 'Home & furniture', 'Ghar aur furniture', 'گھر اور فرنیچر'), f('hardware', 'Hardware', 'Hardware', 'ہارڈویئر'),
      f('auto', 'Auto parts', 'Auto parts', 'آٹو پارٹس'), f('books', 'Books', 'Kitaben', 'کتابیں'), f('toys', 'Toys', 'Khilone', 'کھلونے'),
      f('sports', 'Sports', 'Sports', 'اسپورٹس'), f('pets', 'Pets', 'Pets', 'پالتو جانور'), f('flowers', 'Flowers', 'Phool', 'پھول'),
      f('agri', 'Agri & seeds', 'Beej aur khaad', 'بیج اور کھاد'),
    ],
  },
  BOOKING: {
    id: 'BOOKING',
    label: { en: 'Booking', roman: 'Booking', ur: 'بکنگ' },
    tagline: { en: 'Salon, clinic, gym and services', roman: 'Salon, clinic, gym aur services', ur: 'سیلون، کلینک، جم اور سروسز' },
    mode: 'BOOKING',
    defaults: { booking: true },
    filters: [
      f('salon', 'Salon', 'Salon', 'سیلون'), f('clinic', 'Clinic', 'Clinic', 'کلینک'), f('gym', 'Gym', 'Gym', 'جم'),
      f('optical', 'Optical', 'Optical', 'آپٹیکل'), f('hotel', 'Hotel', 'Hotel', 'ہوٹل'), f('gaming', 'Gaming', 'Gaming', 'گیمنگ'),
      f('services', 'Services', 'Services', 'سروسز'),
    ],
  },
  WHOLESALE: {
    id: 'WHOLESALE',
    label: { en: 'Wholesale', roman: 'Wholesale', ur: 'ہول سیل' },
    tagline: { en: 'Stock for your shop at wholesale rates', roman: 'Dukaan ke liye maal, thok rate par', ur: 'دکان کے لیے مال، تھوک ریٹ پر' },
    mode: 'SHIPPED',
    businessOnly: true,
    defaults: { courier: true, pickup: true },
    filters: [f('fmcg', 'FMCG', 'FMCG', 'ایف ایم سی جی'), f('pharma', 'Pharma', 'Pharma', 'فارما'), f('textile', 'Textile', 'Kapra', 'کپڑا'), f('electronics', 'Electronics', 'Electronics', 'الیکٹرانکس')],
  },
};

/**
 * POS business type → gate and sub-filter. Matched by keyword, the same way
 * the web industry packs match (apps/web/src/industries/<pack>/<Pack>.tsx).
 * Order matters: the first rule whose keyword appears in the type wins.
 */
const INDUSTRY_RULES: Array<{ words: string[]; gate: MarketGate; filter?: string }> = [
  { words: ['DISTRIBUT', 'WHOLESALE'], gate: 'WHOLESALE' },
  { words: ['BAKERY', 'CAKE'], gate: 'FOOD', filter: 'bakery' },
  { words: ['SWEET', 'MITHAI'], gate: 'FOOD', filter: 'sweets' },
  { words: ['CAFE', 'COFFEE'], gate: 'FOOD', filter: 'cafe' },
  { words: ['CHAI', 'TEA'], gate: 'FOOD', filter: 'chai' },
  { words: ['PIZZA'], gate: 'FOOD', filter: 'pizza' },
  { words: ['BBQ', 'GRILL', 'TIKKA'], gate: 'FOOD', filter: 'bbq' },
  { words: ['FAST_FOOD', 'FASTFOOD', 'BURGER'], gate: 'FOOD', filter: 'fast-food' },
  { words: ['RESTAURANT', 'DHABA', 'FOOD', 'KITCHEN', 'CATER', 'HOTEL_RESTAURANT'], gate: 'FOOD', filter: 'desi' },
  { words: ['PHARMACY', 'MEDICAL', 'CHEMIST', 'DRUG'], gate: 'PHARMACY', filter: 'medicines' },
  { words: ['DAIRY', 'MILK', 'LABAN'], gate: 'GROCERY', filter: 'dairy' },
  { words: ['MEAT', 'BUTCHER', 'POULTRY', 'CHICKEN'], gate: 'GROCERY', filter: 'meat' },
  { words: ['FRUIT', 'VEGETABLE', 'SABZI'], gate: 'GROCERY', filter: 'fruit-veg' },
  { words: ['GROCERY', 'KIRYANA', 'KIRANA', 'SUPERMARKET', 'MART', 'GENERAL_STORE', 'RETAIL', 'STANDARD'], gate: 'GROCERY', filter: 'kiryana' },
  { words: ['SALON', 'BARBER', 'PARLOUR', 'PARLOR', 'SPA'], gate: 'BOOKING', filter: 'salon' },
  { words: ['CLINIC', 'DOCTOR', 'HOSPITAL', 'DENTAL', 'LAB'], gate: 'BOOKING', filter: 'clinic' },
  { words: ['GYM', 'FITNESS', 'YOGA', 'CROSSFIT'], gate: 'BOOKING', filter: 'gym' },
  { words: ['OPTICAL', 'EYEWEAR', 'OPTICIAN'], gate: 'BOOKING', filter: 'optical' },
  { words: ['HOTEL', 'GUEST_HOUSE', 'GUESTHOUSE', 'RESORT'], gate: 'BOOKING', filter: 'hotel' },
  { words: ['GAMING', 'GAME', 'CYBER', 'ESPORT'], gate: 'BOOKING', filter: 'gaming' },
  { words: ['SERVICE', 'REPAIR', 'LAUNDRY', 'TAILOR'], gate: 'BOOKING', filter: 'services' },
  { words: ['SHOE', 'FOOTWEAR'], gate: 'SHOPPING', filter: 'shoes' },
  { words: ['JEWEL', 'SONAR', 'GOLD'], gate: 'SHOPPING', filter: 'jewellery' },
  { words: ['COSMETIC', 'BEAUTY', 'MAKEUP', 'PERFUME', 'FRAGRANCE'], gate: 'SHOPPING', filter: 'beauty' },
  { words: ['GARMENT', 'BOUTIQUE', 'FASHION', 'CLOTH'], gate: 'SHOPPING', filter: 'fashion' },
  { words: ['MOBILE', 'PHONE'], gate: 'SHOPPING', filter: 'mobiles' },
  { words: ['ELECTRONIC', 'APPLIANCE', 'COMPUTER', 'LAPTOP'], gate: 'SHOPPING', filter: 'electronics' },
  { words: ['FURNITURE', 'CARPET', 'INTERIOR', 'FLOORING'], gate: 'SHOPPING', filter: 'home' },
  { words: ['HARDWARE', 'BUILDING', 'PAINT', 'SANITARY', 'ELECTRIC'], gate: 'SHOPPING', filter: 'hardware' },
  { words: ['AUTO', 'SPARE', 'MOTOR', 'TYRE'], gate: 'SHOPPING', filter: 'auto' },
  { words: ['BOOK', 'STATIONERY'], gate: 'SHOPPING', filter: 'books' },
  { words: ['TOY'], gate: 'SHOPPING', filter: 'toys' },
  { words: ['SPORT'], gate: 'SHOPPING', filter: 'sports' },
  { words: ['PET', 'AQUARIUM', 'VET'], gate: 'SHOPPING', filter: 'pets' },
  { words: ['FLORIST', 'FLOWER', 'BOUQUET'], gate: 'SHOPPING', filter: 'flowers' },
  { words: ['AGRI', 'SEED', 'FERTILIZER', 'FARM'], gate: 'SHOPPING', filter: 'agri' },
];

/** Gate and sub-filter for a POS business type. Unknown types land in Shopping. */
export function gateForBusinessType(businessType: string | null | undefined): { gate: MarketGate; filter: string | null } {
  const type = (businessType ?? '').toUpperCase();
  for (const rule of INDUSTRY_RULES) {
    if (rule.words.some((w) => type.includes(w))) return { gate: rule.gate, filter: rule.filter ?? null };
  }
  return { gate: 'SHOPPING', filter: null };
}

export function isMarketGate(v: unknown): v is MarketGate {
  return typeof v === 'string' && (MARKET_GATES as readonly string[]).includes(v);
}

/** The shop's gate: the owner's choice, else from the POS business type. */
export function resolveGate(profileGate: string | null | undefined, businessType: string | null | undefined): MarketGate {
  return isMarketGate(profileGate) ? profileGate : gateForBusinessType(businessType).gate;
}

const BOOL_KEYS: Array<keyof FlowSettings> = ['modifiers', 'substitutes', 'deliverySlots', 'prescription', 'customCake', 'booking', 'sizeColour', 'courier', 'pickup', 'dineIn', 'giftMessage'];

/** Gate defaults overlaid with the shop's saved switches (unknown keys dropped). */
export function resolveFlow(gate: MarketGate, saved: unknown): Required<Pick<FlowSettings, 'minOrderAmount'>> & FlowSettings {
  const base: FlowSettings = { ...GATE_DEFINITIONS[gate].defaults };
  const raw = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  for (const k of BOOL_KEYS) if (typeof raw[k] === 'boolean') (base as Record<string, unknown>)[k] = raw[k];
  const min = Number(raw.minOrderAmount);
  return { ...base, minOrderAmount: Number.isFinite(min) && min > 0 ? Math.round(min) : 0 };
}

/** Clean a flowSettings body from the merchant before saving. */
export function sanitizeFlow(body: unknown): FlowSettings {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const out: FlowSettings = {};
  for (const k of BOOL_KEYS) if (typeof raw[k] === 'boolean') (out as Record<string, unknown>)[k] = raw[k];
  const min = Number(raw.minOrderAmount);
  if (Number.isFinite(min) && min >= 0) out.minOrderAmount = Math.round(min);
  return out;
}

// ─── Platform overrides (admin panel) ──────────────────────────────────────

export const MARKET_CONFIG_KEY = 'market:config';

/** What Nafaa staff can change without code. */
export interface MarketPlatformConfig {
  /** Gates in display order; a gate left out is hidden. */
  gates: MarketGate[];
  /** Label overrides per gate. */
  labels: Partial<Record<MarketGate, Partial<GateDefinition['label']>>>;
  /** Cities where the Market is open; empty = everywhere. */
  launchCities: string[];
  /** Nafaa commission on Market orders, percent of the item subtotal (0 at launch). */
  commissionPercent: number;
  /** Payment methods offered to customers. */
  payments: { cod: boolean; jazzcash: boolean; easypaisa: boolean; card: boolean; bankTransfer: boolean };
  /** New shops need staff approval before they appear. */
  requireApproval: boolean;
  /**
   * Customers may spend wallet money / loyalty points at checkout. Off until
   * Nafaa pays shops back for the part it funds; points are still earned.
   */
  walletSpend: boolean;
  loyaltySpend: boolean;
}

export const DEFAULT_PLATFORM_CONFIG: MarketPlatformConfig = {
  gates: ['FOOD', 'GROCERY', 'PHARMACY', 'SHOPPING', 'BOOKING', 'WHOLESALE'],
  labels: {},
  launchCities: [],
  commissionPercent: 0,
  payments: { cod: true, jazzcash: false, easypaisa: false, card: false, bankTransfer: false },
  requireApproval: false,
  walletSpend: false,
  loyaltySpend: false,
};

/** Merge a stored override over the defaults, ignoring anything malformed. */
export function readPlatformConfig(raw: string | null | undefined): MarketPlatformConfig {
  let v: Record<string, any> = {};
  try { v = raw ? JSON.parse(raw) : {}; } catch { v = {}; }
  const gates = Array.isArray(v.gates) ? (v.gates.filter(isMarketGate) as MarketGate[]) : DEFAULT_PLATFORM_CONFIG.gates;
  const pct = Number(v.commissionPercent);
  const pay = v.payments && typeof v.payments === 'object' ? v.payments : {};
  return {
    gates: gates.length ? [...new Set(gates)] : DEFAULT_PLATFORM_CONFIG.gates,
    labels: v.labels && typeof v.labels === 'object' ? v.labels : {},
    launchCities: Array.isArray(v.launchCities) ? v.launchCities.filter((c: unknown) => typeof c === 'string' && c.trim()).map((c: string) => c.trim()) : [],
    commissionPercent: Number.isFinite(pct) && pct >= 0 && pct <= 50 ? pct : 0,
    payments: {
      cod: pay.cod !== false,
      jazzcash: pay.jazzcash === true,
      easypaisa: pay.easypaisa === true,
      card: pay.card === true,
      bankTransfer: pay.bankTransfer === true,
    },
    requireApproval: v.requireApproval === true,
    walletSpend: v.walletSpend === true,
    loyaltySpend: v.loyaltySpend === true,
  };
}
