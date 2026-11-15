/**
 * Demo catalogue for MARKET_MOCK=1: the six gates, about three shops each in
 * Lahore, and products in the shapes lib/types.ts describes. Gate labels and
 * filters follow apps/api/src/marketplace/_shared/market-config.ts.
 */
import type { Flow, Gate, GateDef, ModifierGroup, ProductLine, ProductSummary, Review, ShopDetail } from '../types';

const f = (id: string, en: string, roman: string, ur: string) => ({ id, label: { en, roman, ur } });

export const GATES: GateDef[] = [
  {
    id: 'FOOD', slug: 'food', mode: 'INSTANT', businessOnly: false,
    label: { en: 'Food', roman: 'Khana', ur: 'کھانا' },
    tagline: { en: 'Restaurants, cafes and bakeries', roman: 'Restaurants, cafe aur bakery', ur: 'ریسٹورنٹ، کیفے اور بیکری' },
    filters: [f('fast-food', 'Fast food', 'Fast food', 'فاسٹ فوڈ'), f('desi', 'Desi', 'Desi khana', 'دیسی کھانا'), f('bbq', 'BBQ', 'BBQ', 'باربی کیو'), f('pizza', 'Pizza', 'Pizza', 'پیزا'), f('cafe', 'Cafe', 'Cafe', 'کیفے'), f('chai', 'Chai', 'Chai', 'چائے'), f('bakery', 'Bakery', 'Bakery', 'بیکری'), f('sweets', 'Sweets', 'Mithai', 'مٹھائی')],
  },
  {
    id: 'GROCERY', slug: 'grocery', mode: 'INSTANT', businessOnly: false,
    label: { en: 'Grocery', roman: 'Grocery', ur: 'گروسری' },
    tagline: { en: 'Kiryana, milk, meat and daily needs', roman: 'Kiryana, doodh, gosht aur rozana ka saman', ur: 'کریانہ، دودھ، گوشت اور روزمرہ کا سامان' },
    filters: [f('kiryana', 'Kiryana', 'Kiryana', 'کریانہ'), f('dairy', 'Dairy', 'Doodh, dahi', 'دودھ، دہی'), f('meat', 'Meat', 'Gosht', 'گوشت'), f('fruit-veg', 'Fruit & veg', 'Phal aur sabzi', 'پھل اور سبزی')],
  },
  {
    id: 'PHARMACY', slug: 'pharmacy', mode: 'INSTANT', businessOnly: false,
    label: { en: 'Pharmacy', roman: 'Pharmacy', ur: 'فارمیسی' },
    tagline: { en: 'Medicines with prescription upload', roman: 'Dawaiyan, nuskha upload ke saath', ur: 'دوائیں، نسخہ اپ لوڈ کے ساتھ' },
    filters: [f('medicines', 'Medicines', 'Dawaiyan', 'دوائیں'), f('baby', 'Baby care', 'Bachon ka saman', 'بچوں کا سامان'), f('personal', 'Personal care', 'Personal care', 'پرسنل کیئر')],
  },
  {
    id: 'SHOPPING', slug: 'shopping', mode: 'SHIPPED', businessOnly: false,
    label: { en: 'Shopping', roman: 'Shopping', ur: 'شاپنگ' },
    tagline: { en: 'Fashion, electronics, home and more', roman: 'Kapre, electronics, ghar ka saman aur bohat kuch', ur: 'کپڑے، الیکٹرانکس، گھر کا سامان اور بہت کچھ' },
    filters: [f('fashion', 'Fashion', 'Fashion', 'فیشن'), f('shoes', 'Shoes', 'Joote', 'جوتے'), f('beauty', 'Beauty', 'Beauty', 'بیوٹی'), f('electronics', 'Electronics', 'Electronics', 'الیکٹرانکس'), f('mobiles', 'Mobiles', 'Mobile', 'موبائل'), f('home', 'Home & furniture', 'Ghar aur furniture', 'گھر اور فرنیچر'), f('flowers', 'Flowers', 'Phool', 'پھول')],
  },
  {
    id: 'BOOKING', slug: 'booking', mode: 'BOOKING', businessOnly: false,
    label: { en: 'Booking', roman: 'Booking', ur: 'بکنگ' },
    tagline: { en: 'Salon, clinic, gym and services', roman: 'Salon, clinic, gym aur services', ur: 'سیلون، کلینک، جم اور سروسز' },
    filters: [f('salon', 'Salon', 'Salon', 'سیلون'), f('clinic', 'Clinic', 'Clinic', 'کلینک'), f('gym', 'Gym', 'Gym', 'جم'), f('optical', 'Optical', 'Optical', 'آپٹیکل'), f('services', 'Services', 'Services', 'سروسز')],
  },
  {
    id: 'WHOLESALE', slug: 'wholesale', mode: 'SHIPPED', businessOnly: true,
    label: { en: 'Wholesale', roman: 'Wholesale', ur: 'ہول سیل' },
    tagline: { en: 'Stock for your shop at wholesale rates', roman: 'Dukaan ke liye maal, thok rate par', ur: 'دکان کے لیے مال، تھوک ریٹ پر' },
    filters: [f('fmcg', 'FMCG', 'FMCG', 'ایف ایم سی جی'), f('pharma', 'Pharma', 'Pharma', 'فارما'), f('textile', 'Textile', 'Kapra', 'کپڑا')],
  },
];

const DEFAULT_FLOW: Record<Gate, Omit<Flow, 'minOrderAmount'>> = {
  FOOD: { modifiers: true, pickup: true },
  GROCERY: { substitutes: true, deliverySlots: true, pickup: true },
  PHARMACY: { prescription: true, substitutes: true, pickup: true },
  SHOPPING: { sizeColour: true, courier: true, pickup: true },
  BOOKING: { booking: true },
  WHOLESALE: { courier: true, pickup: true },
};

const ALL_DAYS = (open: string, close: string) =>
  Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { open, close }]));

const REVIEWS: Review[] = [
  { id: 'r1', rating: 5, title: null, comment: 'Bohat acha khana, time par delivery. Dobara order karunga.', imageUrls: [], verified: true, reply: 'Shukriya! Phir aaiye.', createdAt: '2026-11-10T14:00:00Z', customerName: 'Ahmed K.' },
  { id: 'r2', rating: 4, title: null, comment: 'Taste great, packing could be better.', imageUrls: [], verified: true, reply: null, createdAt: '2026-11-07T10:00:00Z', customerName: 'Sana M.' },
  { id: 'r3', rating: 5, title: null, comment: 'Fresh items and the rider was polite.', imageUrls: [], verified: false, reply: null, createdAt: '2026-11-02T18:30:00Z', customerName: 'Usman R.' },
];

interface ShopSeed {
  slug: string; name: string; tagline: string; gate: Gate; filter: string; area: string; rating: number; count: number; orders: number;
  fee: number; min: number; eta: number | null; open?: boolean; flow?: Partial<Flow>; freeAbove?: number; hours?: [string, string];
}

const SHOP_SEEDS: ShopSeed[] = [
  { slug: 'karahi-house', name: 'Karahi House', tagline: 'Desi karahi, BBQ aur garam naan', gate: 'FOOD', filter: 'desi', area: 'Gulberg III', rating: 4.6, count: 812, orders: 5400, fee: 99, min: 500, eta: 35, hours: ['12:00', '23:59'] },
  { slug: 'smash-burger-co', name: 'Smash Burger Co.', tagline: 'Smashed patties, loaded fries', gate: 'FOOD', filter: 'fast-food', area: 'DHA Phase 5', rating: 4.4, count: 530, orders: 3100, fee: 120, min: 600, eta: 30 },
  { slug: 'chai-khana', name: 'Chai Khana', tagline: 'Doodh patti, paratha aur samosay', gate: 'FOOD', filter: 'chai', area: 'Model Town', rating: 4.7, count: 340, orders: 2200, fee: 60, min: 300, eta: 25 },
  { slug: 'sweet-crust-bakery', name: 'Sweet Crust Bakery', tagline: 'Cakes, pastries and fresh bread', gate: 'FOOD', filter: 'bakery', area: 'Johar Town', rating: 4.5, count: 268, orders: 1800, fee: 80, min: 400, eta: 40, flow: { customCake: true }, open: false, hours: ['09:00', '10:00'] },
  { slug: 'al-madina-kiryana', name: 'Al-Madina Kiryana Store', tagline: 'Rozana ka saman, munasib rate', gate: 'GROCERY', filter: 'kiryana', area: 'Faisal Town', rating: 4.5, count: 410, orders: 6100, fee: 50, min: 800, eta: 30, freeAbove: 3000 },
  { slug: 'fresh-dairy-point', name: 'Fresh Dairy Point', tagline: 'Taaza doodh, dahi aur makhan', gate: 'GROCERY', filter: 'dairy', area: 'Garden Town', rating: 4.8, count: 220, orders: 4300, fee: 40, min: 300, eta: 20 },
  { slug: 'green-basket', name: 'Green Basket', tagline: 'Fresh fruit and vegetables daily', gate: 'GROCERY', filter: 'fruit-veg', area: 'Township', rating: 4.3, count: 150, orders: 1200, fee: 70, min: 500, eta: 35 },
  { slug: 'shifa-pharmacy', name: 'Shifa Pharmacy', tagline: 'Asli dawaiyan, 24 ghante', gate: 'PHARMACY', filter: 'medicines', area: 'Gulberg II', rating: 4.7, count: 390, orders: 3900, fee: 60, min: 0, eta: 25, hours: ['00:00', '23:59'] },
  { slug: 'care-plus-chemist', name: 'Care Plus Chemist', tagline: 'Medicines, baby care and more', gate: 'PHARMACY', filter: 'baby', area: 'Wapda Town', rating: 4.4, count: 120, orders: 900, fee: 80, min: 200, eta: 35 },
  { slug: 'libaas-boutique', name: 'Libaas Boutique', tagline: 'Lawn, kurtas and formal wear', gate: 'SHOPPING', filter: 'fashion', area: 'Liberty Market', rating: 4.6, count: 610, orders: 2500, fee: 200, min: 0, eta: null, freeAbove: 5000 },
  { slug: 'volt-mobiles', name: 'Volt Mobiles', tagline: 'PTA approved phones and accessories', gate: 'SHOPPING', filter: 'mobiles', area: 'Hafeez Centre', rating: 4.3, count: 280, orders: 1400, fee: 250, min: 0, eta: null },
  { slug: 'bloom-florist', name: 'Bloom Florist', tagline: 'Fresh bouquets with same-day delivery', gate: 'SHOPPING', filter: 'flowers', area: 'MM Alam Road', rating: 4.9, count: 95, orders: 600, fee: 150, min: 1500, eta: 90, flow: { giftMessage: true, sizeColour: false } },
  { slug: 'style-studio', name: 'Style Studio Salon', tagline: 'Haircuts, grooming and skin care', gate: 'BOOKING', filter: 'salon', area: 'Gulberg III', rating: 4.8, count: 330, orders: 2100, fee: 0, min: 0, eta: null },
  { slug: 'city-care-clinic', name: 'City Care Clinic', tagline: 'General physician and child specialist', gate: 'BOOKING', filter: 'clinic', area: 'Johar Town', rating: 4.6, count: 180, orders: 1300, fee: 0, min: 0, eta: null },
  { slug: 'iron-fit-gym', name: 'Iron Fit Gym', tagline: 'Monthly plans and personal training', gate: 'BOOKING', filter: 'gym', area: 'DHA Phase 6', rating: 4.5, count: 140, orders: 700, fee: 0, min: 0, eta: null },
  { slug: 'hamza-traders', name: 'Hamza Traders', tagline: 'FMCG cartons at wholesale rates', gate: 'WHOLESALE', filter: 'fmcg', area: 'Shah Alam Market', rating: 4.4, count: 75, orders: 950, fee: 500, min: 20000, eta: null },
];

export const SHOPS: ShopDetail[] = SHOP_SEEDS.map((s, i) => {
  const flow: Flow = { ...DEFAULT_FLOW[s.gate], ...s.flow, minOrderAmount: 0 };
  return {
    shopId: `s-${s.slug}`,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    logoUrl: null,
    coverUrl: null,
    city: 'Lahore',
    area: s.area,
    gate: s.gate,
    gateFilter: s.filter,
    flow,
    rating: s.rating,
    ratingCount: s.count,
    totalOrders: s.orders,
    open: s.open ?? true,
    paused: false,
    deliveryFee: s.fee,
    freeDeliveryAbove: s.freeAbove ?? null,
    minOrder: s.min,
    etaMinutes: s.eta,
    distanceKm: Math.round((0.8 + ((i * 7) % 9) * 0.6) * 10) / 10,
    offersDelivery: s.gate !== 'BOOKING',
    offersPickup: s.gate !== 'BOOKING',
    verification: i % 3 === 0 ? 'GOLD' : 'SILVER',
    description: `${s.name} serves ${s.area}, Lahore. ${s.tagline}.`,
    phone: '03001234567',
    whatsapp: '03001234567',
    address: `Main Boulevard, ${s.area}, Lahore`,
    lat: 31.5204 + i * 0.004,
    lng: 74.3587 + i * 0.003,
    gallery: [],
    workingHours: ALL_DAYS(...(s.hours ?? ['10:00', '22:00'])),
    holidayDates: [],
    followers: 120 + i * 37,
    productCount: 0,
    pickupMinutes: s.eta ? Math.max(10, s.eta - 15) : null,
    offersDineIn: false,
    reviews: REVIEWS,
  };
});

type P = [name: string, category: string, price: number, opts?: { compare?: number; rx?: boolean; out?: boolean; desc?: string; lines?: Array<Partial<ProductLine>> }];

const CATALOG: Record<string, P[]> = {
  'karahi-house': [
    ['Chicken Karahi (Half)', 'Karahi', 1250, { desc: 'Tomato, green chilli and ginger, cooked in desi ghee.' }],
    ['Chicken Karahi (Full)', 'Karahi', 2300],
    ['Mutton Karahi (Half)', 'Karahi', 2400],
    ['Chicken Tikka', 'BBQ', 450, { desc: 'Quarter leg piece, charcoal grilled.' }],
    ['Seekh Kabab (4 pcs)', 'BBQ', 650],
    ['Malai Boti', 'BBQ', 850],
    ['Roghni Naan', 'Roti', 80],
    ['Tandoori Roti', 'Roti', 30],
    ['Raita', 'Sides', 120],
    ['Mint Margarita', 'Drinks', 350],
    ['Soft Drink 1.5L', 'Drinks', 220, { out: true }],
  ],
  'smash-burger-co': [
    ['Classic Smash', 'Burgers', 790, { desc: 'Double smashed beef, cheese, house sauce.' }],
    ['Spicy Zinger', 'Burgers', 690],
    ['Truffle Mushroom', 'Burgers', 990, { compare: 1150 }],
    ['Loaded Fries', 'Sides', 490],
    ['Plain Fries', 'Sides', 290],
    ['Chocolate Shake', 'Drinks', 450],
  ],
  'chai-khana': [
    ['Doodh Patti', 'Chai', 120],
    ['Kashmiri Chai', 'Chai', 180],
    ['Aloo Paratha', 'Nashta', 220],
    ['Anda Paratha', 'Nashta', 250],
    ['Samosa (2 pcs)', 'Snacks', 100],
  ],
  'sweet-crust-bakery': [
    ['Chocolate Fudge Cake (2 lb)', 'Cakes', 2400, { desc: 'Custom message and date available.' }],
    ['Red Velvet Cake (2 lb)', 'Cakes', 2600],
    ['Chicken Patties', 'Savoury', 120],
    ['Fresh Bread (Large)', 'Bread', 210],
    ['Plain Cake Rusk', 'Bread', 380],
  ],
  'al-madina-kiryana': [
    ['Sunridge Chakki Atta 10 kg', 'Atta & chawal', 1450, { compare: 1550 }],
    ['Basmati Chawal 5 kg', 'Atta & chawal', 2150],
    ['Dalda Cooking Oil 3 L', 'Oil & ghee', 1690],
    ['Desi Ghee 1 kg', 'Oil & ghee', 2600],
    ['Cheeni 1 kg', 'Basics', 155],
    ['Daal Chana 1 kg', 'Daalain', 320],
    ['Daal Masoor 1 kg', 'Daalain', 340],
    ['Tapal Danedar 450 g', 'Chai patti', 690],
    ['Lays Masala (Large)', 'Snacks', 120, { out: true }],
    ['Surf Excel 1 kg', 'Cleaning', 590],
    ['Dettol Soap (3 pack)', 'Personal care', 450],
  ],
  'fresh-dairy-point': [
    ['Fresh Milk 1 L', 'Doodh', 220],
    ['Dahi 1 kg', 'Dahi', 260],
    ['White Butter 250 g', 'Makhan', 450],
    ['Desi Eggs (Dozen)', 'Anday', 420],
    ['Lassi 500 ml', 'Drinks', 150],
  ],
  'green-basket': [
    ['Aloo 1 kg', 'Sabzi', 90],
    ['Pyaz 1 kg', 'Sabzi', 140],
    ['Tamatar 1 kg', 'Sabzi', 180],
    ['Kela (Dozen)', 'Phal', 220],
    ['Seb Kala Kulu 1 kg', 'Phal', 380],
    ['Kinnow (Dozen)', 'Phal', 480],
  ],
  'shifa-pharmacy': [
    ['Panadol 500 mg (20 tabs)', 'Pain relief', 60, { desc: 'Paracetamol for fever and pain.' }],
    ['Brufen 400 mg (30 tabs)', 'Pain relief', 180],
    ['Augmentin 625 mg (6 tabs)', 'Antibiotics', 520, { rx: true, desc: 'Prescription needed.' }],
    ['Risek 20 mg (14 caps)', 'Stomach', 410, { rx: true }],
    ['ORS Sachet (10)', 'Stomach', 150],
    ['Pampers Size 3 (32)', 'Baby care', 2350],
    ['Dettol Hand Wash 250 ml', 'Personal care', 330],
  ],
  'care-plus-chemist': [
    ['Calpol Syrup 90 ml', 'Baby care', 190],
    ['Johnson Baby Oil 200 ml', 'Baby care', 650],
    ['Arinac Syrup', 'Cough & cold', 230],
    ['Ciproxin 500 mg (10 tabs)', 'Antibiotics', 390, { rx: true }],
  ],
  'libaas-boutique': [
    ['Embroidered Lawn 3-Piece', 'Unstitched', 6500, { compare: 7900, lines: [{ name: 'Mint', color: 'Mint', colorHex: '#a7f3d0' }, { name: 'Peach', color: 'Peach', colorHex: '#fed7aa' }, { name: 'Navy', color: 'Navy', colorHex: '#1e3a8a', availability: 'out_of_stock', maxQty: 0 }] }],
    ['Cotton Kurta', 'Ready to wear', 3200, { lines: [{ name: 'S', size: 'S' }, { name: 'M', size: 'M' }, { name: 'L', size: 'L' }, { name: 'XL', size: 'XL', availability: 'out_of_stock', maxQty: 0 }] }],
    ['Chiffon Dupatta', 'Accessories', 1800],
    ['Formal Silk Suit', 'Formal', 14500, { lines: [{ name: 'M', size: 'M' }, { name: 'L', size: 'L' }] }],
  ],
  'volt-mobiles': [
    ['Samsung Galaxy A15 128 GB', 'Phones', 52999, { desc: 'PTA approved, 1 year warranty.' }],
    ['Redmi 13C 128 GB', 'Phones', 38999, { compare: 41999 }],
    ['20W Fast Charger', 'Accessories', 2200],
    ['Wireless Earbuds', 'Accessories', 4500],
  ],
  'bloom-florist': [
    ['Red Roses Bouquet (12)', 'Bouquets', 3500, { desc: 'Add a card message and delivery date.' }],
    ['Mixed Flowers Basket', 'Baskets', 5500],
    ['Graduation Bouquet', 'Bouquets', 4200],
  ],
  'style-studio': [
    ['Haircut', 'Hair', 1200, { desc: '30 minutes with wash.' }],
    ['Beard Trim and Shape', 'Grooming', 600],
    ['Facial (Classic)', 'Skin', 3500],
    ['Hair Colour', 'Hair', 4500],
  ],
  'city-care-clinic': [
    ['General Physician Visit', 'Consultation', 1500],
    ['Child Specialist Visit', 'Consultation', 2000],
    ['Blood Pressure Check', 'Tests', 300],
  ],
  'iron-fit-gym': [
    ['Monthly Membership', 'Plans', 6000],
    ['Personal Training Session', 'Training', 2500],
    ['Day Pass', 'Plans', 800],
  ],
  'hamza-traders': [
    ['Nestle Milkpak 1 L (Carton of 12)', 'Dairy', 3300],
    ['Shan Masala Assorted (Box of 12)', 'Spices', 1450],
    ['Lipton Tea 950 g (Carton of 6)', 'Tea', 9600],
  ],
};

export interface MockProduct extends ProductSummary {
  lines: ProductLine[];
  brand: string | null;
  modifierGroups: ModifierGroup[];
}

const opt = (id: string, name: string, price = 0, isDefault = false) => ({ id, name, price, isDefault, emoji: null });

/** Restaurant add-ons for the demo menus, keyed by category. */
const MODIFIERS: Record<string, ModifierGroup[]> = {
  Karahi: [
    { id: 'g-spice', name: 'Spice level', type: 'SINGLE', required: true, min: 1, max: 1, options: [opt('o-mild', 'Mild'), opt('o-med', 'Medium', 0, true), opt('o-hot', 'Hot')] },
    { id: 'g-extra', name: 'Extras', type: 'MULTIPLE', required: false, min: 0, max: 3, options: [opt('o-naan', '2 Roghni naan', 160), opt('o-raita', 'Raita', 120), opt('o-salad', 'Salad', 100)] },
  ],
  Burgers: [
    { id: 'g-meal', name: 'Make it a meal', type: 'SINGLE', required: false, min: 0, max: 1, options: [opt('o-fries', 'Fries + drink', 350), opt('o-loaded', 'Loaded fries + drink', 520)] },
    { id: 'g-add', name: 'Add-ons', type: 'MULTIPLE', required: false, min: 0, max: 2, options: [opt('o-cheese', 'Extra cheese', 120), opt('o-patty', 'Extra patty', 300)] },
  ],
};

export const PRODUCTS: MockProduct[] = SHOPS.flatMap((shop) =>
  (CATALOG[shop.slug] ?? []).map(([name, category, price, o = {}], i) => {
    const out = !!o.out;
    const lines: ProductLine[] = o.lines
      ? o.lines.map((l, j) => ({
          variantId: `v-${shop.slug}-${i}-${j}`, name: l.name ?? null, size: l.size ?? null, color: l.color ?? null, colorHex: l.colorHex ?? null,
          price, compareAt: o.compare ?? null, availability: l.availability ?? 'in_stock', maxQty: l.maxQty ?? 10, image: null,
        }))
      : [{ variantId: null, name: null, size: null, color: null, colorHex: null, price, compareAt: o.compare ?? null, availability: out ? 'out_of_stock' : 'in_stock', maxQty: out ? 0 : 20, image: null }];
    return {
      productId: `p-${shop.slug}-${i}`,
      shopId: shop.shopId,
      name,
      description: o.desc ?? null,
      price,
      priceMax: price,
      compareAt: o.compare ?? null,
      image: null,
      category,
      rating: 4 + ((i * 3) % 10) / 10,
      ratingCount: 10 + i * 7,
      availability: out ? 'out_of_stock' : 'in_stock',
      inStock: !out,
      maxQty: out ? 0 : 20,
      requiresPrescription: !!o.rx,
      shop: { slug: shop.slug, name: shop.name, logoUrl: null, city: shop.city },
      lines,
      brand: null,
      modifierGroups: shop.flow.modifiers ? MODIFIERS[category] ?? [] : [],
    } satisfies MockProduct;
  }),
);

for (const s of SHOPS) s.productCount = PRODUCTS.filter((p) => p.shopId === s.shopId).length;
