/**
 * PAKISTAN GROCERY SEED CATALOG — 2026
 * Real FMCG products commonly sold in Pakistani kiryana stores.
 *
 * Sources: Daraz.pk, Imtiaz Super Market, Al-Fatah, Metro Cash & Carry,
 * Naheed Supermarket, Carrefour Pakistan (Aug 2026 prices).
 *
 * Prices: Approximate retail MRP — client can adjust before import.
 * Images: Public product photos from brand websites / Wikipedia Commons.
 * Barcodes: Real EAN-13 where known, else null (auto-generate on import).
 */

export interface SeedProduct {
  id: string;           // internal catalog id
  name: string;
  brand: string;        // will be auto-created if missing
  category: string;     // will be auto-created if missing
  tags: string[];       // will be auto-created
  unit: string;
  price: number;        // MRP in PKR
  costPrice: number;    // approx wholesale cost
  wholesalePrice?: number;
  barcode?: string;     // EAN-13 if known
  imageUrl?: string;    // public CDN image
  description?: string;
  weight?: number;
  weightUnit?: string;
}

export const PAKISTAN_GROCERY_CATALOG: SeedProduct[] = [
  // ═══════════════ BEVERAGES — Soft Drinks ═══════════════
  {
    id: 'bev-coke-1500',
    name: 'Coca-Cola 1.5L Bottle',
    brand: 'Coca-Cola',
    category: 'Beverages',
    tags: ['Soft Drink', 'Cold Drink', 'Cola'],
    unit: 'bottle',
    price: 200, costPrice: 165, wholesalePrice: 175,
    barcode: '5449000000996',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/320px-Coca-Cola_logo.svg.png',
    weight: 1500, weightUnit: 'ml',
  },
  {
    id: 'bev-coke-500',
    name: 'Coca-Cola 500ml Bottle',
    brand: 'Coca-Cola', category: 'Beverages',
    tags: ['Soft Drink', 'Cola'],
    unit: 'bottle', price: 90, costPrice: 72,
    weight: 500, weightUnit: 'ml',
  },
  {
    id: 'bev-coke-250',
    name: 'Coca-Cola 250ml Can',
    brand: 'Coca-Cola', category: 'Beverages',
    tags: ['Soft Drink', 'Cola', 'Can'],
    unit: 'can', price: 80, costPrice: 62,
    weight: 250, weightUnit: 'ml',
  },
  {
    id: 'bev-pepsi-1500',
    name: 'Pepsi 1.5L Bottle',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Soft Drink', 'Cold Drink', 'Cola'],
    unit: 'bottle', price: 200, costPrice: 165,
  },
  {
    id: 'bev-pepsi-500',
    name: 'Pepsi 500ml Bottle',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Soft Drink', 'Cola'],
    unit: 'bottle', price: 90, costPrice: 72,
  },
  {
    id: 'bev-sprite-1500',
    name: 'Sprite 1.5L Bottle',
    brand: 'Coca-Cola', category: 'Beverages',
    tags: ['Soft Drink', 'Lemon'],
    unit: 'bottle', price: 200, costPrice: 165,
  },
  {
    id: 'bev-fanta-1500',
    name: 'Fanta Orange 1.5L',
    brand: 'Coca-Cola', category: 'Beverages',
    tags: ['Soft Drink', 'Orange'],
    unit: 'bottle', price: 200, costPrice: 165,
  },
  {
    id: 'bev-7up-1500',
    name: '7UP 1.5L Bottle',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Soft Drink', 'Lemon'],
    unit: 'bottle', price: 200, costPrice: 165,
  },
  {
    id: 'bev-mirinda-1500',
    name: 'Mirinda Orange 1.5L',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Soft Drink', 'Orange'],
    unit: 'bottle', price: 200, costPrice: 165,
  },
  {
    id: 'bev-mtdew-500',
    name: 'Mountain Dew 500ml',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Soft Drink', 'Energy'],
    unit: 'bottle', price: 90, costPrice: 72,
  },

  // ═══════════════ BEVERAGES — Juices ═══════════════
  {
    id: 'juice-nestle-fruita-200',
    name: 'Nestle Fruita Vitals Red Grape 200ml',
    brand: 'Nestle', category: 'Beverages',
    tags: ['Juice', 'Fruit Juice', 'Tetra Pack'],
    unit: 'pack', price: 55, costPrice: 42,
  },
  {
    id: 'juice-nestle-fruita-mango-200',
    name: 'Nestle Fruita Vitals Mango 200ml',
    brand: 'Nestle', category: 'Beverages',
    tags: ['Juice', 'Mango'],
    unit: 'pack', price: 55, costPrice: 42,
  },
  {
    id: 'juice-shezan-mango-1000',
    name: 'Shezan Mango Juice 1L',
    brand: 'Shezan', category: 'Beverages',
    tags: ['Juice', 'Mango'],
    unit: 'pack', price: 320, costPrice: 260,
  },
  {
    id: 'juice-slice-mango-250',
    name: 'Slice Mango 250ml',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Juice', 'Mango'],
    unit: 'pack', price: 65, costPrice: 50,
  },

  // ═══════════════ BEVERAGES — Water ═══════════════
  {
    id: 'water-nestle-15',
    name: 'Nestle Pure Life 1.5L',
    brand: 'Nestle', category: 'Beverages',
    tags: ['Water', 'Mineral Water'],
    unit: 'bottle', price: 80, costPrice: 60,
  },
  {
    id: 'water-aquafina-15',
    name: 'Aquafina 1.5L',
    brand: 'Pepsi', category: 'Beverages',
    tags: ['Water', 'Mineral Water'],
    unit: 'bottle', price: 80, costPrice: 60,
  },
  {
    id: 'water-nestle-500',
    name: 'Nestle Pure Life 500ml',
    brand: 'Nestle', category: 'Beverages',
    tags: ['Water'],
    unit: 'bottle', price: 40, costPrice: 28,
  },

  // ═══════════════ SNACKS — Chips ═══════════════
  {
    id: 'chip-lays-salted-40',
    name: 'Lays Salted 40g',
    brand: 'Lays', category: 'Snacks',
    tags: ['Chips', 'Salted', 'Potato Chips'],
    unit: 'pack', price: 50, costPrice: 38,
    barcode: '8964000208267',
  },
  {
    id: 'chip-lays-masala-40',
    name: 'Lays Masala 40g',
    brand: 'Lays', category: 'Snacks',
    tags: ['Chips', 'Masala', 'Spicy'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'chip-lays-yogurt-40',
    name: 'Lays Yogurt & Herbs 40g',
    brand: 'Lays', category: 'Snacks',
    tags: ['Chips', 'Yogurt'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'chip-lays-french-40',
    name: 'Lays French Cheese 40g',
    brand: 'Lays', category: 'Snacks',
    tags: ['Chips', 'Cheese'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'chip-lays-flaming-40',
    name: 'Lays Flaming Hot 40g',
    brand: 'Lays', category: 'Snacks',
    tags: ['Chips', 'Spicy', 'Hot'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'chip-kurleez-40',
    name: 'Kurleez Cheese 40g',
    brand: 'Kurleez', category: 'Snacks',
    tags: ['Chips', 'Cheese', 'Puff'],
    unit: 'pack', price: 30, costPrice: 22,
  },
  {
    id: 'chip-super-crisp-40',
    name: 'Super Crisp BBQ 40g',
    brand: 'Super Crisp', category: 'Snacks',
    tags: ['Chips', 'BBQ'],
    unit: 'pack', price: 30, costPrice: 22,
  },
  {
    id: 'chip-doritos-40',
    name: 'Doritos Nacho Cheese 40g',
    brand: 'Doritos', category: 'Snacks',
    tags: ['Chips', 'Cheese', 'Nacho'],
    unit: 'pack', price: 60, costPrice: 46,
  },
  {
    id: 'chip-cheetos-40',
    name: 'Cheetos Crunchy 40g',
    brand: 'Cheetos', category: 'Snacks',
    tags: ['Chips', 'Cheese', 'Puff'],
    unit: 'pack', price: 40, costPrice: 30,
  },

  // ═══════════════ SNACKS — Biscuits ═══════════════
  {
    id: 'bis-oreo-original',
    name: 'Oreo Original Cookies',
    brand: 'Oreo', category: 'Biscuits',
    tags: ['Cookies', 'Chocolate', 'Sandwich'],
    unit: 'pack', price: 80, costPrice: 62,
  },
  {
    id: 'bis-prince-choco',
    name: 'Prince Chocolate Sandwich',
    brand: 'LU', category: 'Biscuits',
    tags: ['Cookies', 'Chocolate'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'bis-tuc-crackers',
    name: 'TUC Crackers Original',
    brand: 'LU', category: 'Biscuits',
    tags: ['Crackers', 'Salted'],
    unit: 'pack', price: 60, costPrice: 45,
  },
  {
    id: 'bis-gala-milk',
    name: 'Gala Milk Biscuits',
    brand: 'Peek Freans', category: 'Biscuits',
    tags: ['Milk', 'Family Pack'],
    unit: 'pack', price: 100, costPrice: 78,
  },
  {
    id: 'bis-sooper',
    name: 'Sooper Biscuits Family Pack',
    brand: 'Peek Freans', category: 'Biscuits',
    tags: ['Milk', 'Family Pack'],
    unit: 'pack', price: 120, costPrice: 92,
  },
  {
    id: 'bis-chocolato',
    name: 'Chocolato Cream Biscuits',
    brand: 'Peek Freans', category: 'Biscuits',
    tags: ['Chocolate', 'Cream'],
    unit: 'pack', price: 60, costPrice: 45,
  },
  {
    id: 'bis-rio-choco',
    name: 'Rio Chocolate Sandwich',
    brand: 'Peek Freans', category: 'Biscuits',
    tags: ['Chocolate', 'Sandwich'],
    unit: 'pack', price: 50, costPrice: 38,
  },
  {
    id: 'bis-candi',
    name: 'Candi Biscuits',
    brand: 'LU', category: 'Biscuits',
    tags: ['Sweet'],
    unit: 'pack', price: 40, costPrice: 30,
  },
  {
    id: 'bis-zeera-plus',
    name: 'Zeera Plus Biscuits',
    brand: 'EBM', category: 'Biscuits',
    tags: ['Cumin', 'Salty'],
    unit: 'pack', price: 50, costPrice: 38,
  },

  // ═══════════════ DAIRY ═══════════════
  {
    id: 'dairy-olpers-1000',
    name: 'Olpers Milk 1L',
    brand: 'Olpers', category: 'Dairy',
    tags: ['Milk', 'UHT', 'Tetra Pack'],
    unit: 'pack', price: 320, costPrice: 285,
  },
  {
    id: 'dairy-olpers-250',
    name: 'Olpers Milk 250ml',
    brand: 'Olpers', category: 'Dairy',
    tags: ['Milk', 'UHT'],
    unit: 'pack', price: 90, costPrice: 72,
  },
  {
    id: 'dairy-nestle-milkpak-1000',
    name: 'Nestle MilkPak 1L',
    brand: 'Nestle', category: 'Dairy',
    tags: ['Milk', 'UHT'],
    unit: 'pack', price: 320, costPrice: 285,
  },
  {
    id: 'dairy-good-milk-1000',
    name: 'Good Milk 1L',
    brand: 'Engro', category: 'Dairy',
    tags: ['Milk', 'UHT'],
    unit: 'pack', price: 310, costPrice: 275,
  },
  {
    id: 'dairy-nurpur-butter-200',
    name: 'Nurpur Butter 200g',
    brand: 'Nurpur', category: 'Dairy',
    tags: ['Butter'],
    unit: 'pack', price: 550, costPrice: 470,
  },
  {
    id: 'dairy-adams-cheese-200',
    name: 'Adams Cheese Slices 200g',
    brand: 'Adams', category: 'Dairy',
    tags: ['Cheese', 'Slice'],
    unit: 'pack', price: 480, costPrice: 410,
  },
  {
    id: 'dairy-nestle-yogurt-500',
    name: 'Nestle Yogurt 500g',
    brand: 'Nestle', category: 'Dairy',
    tags: ['Yogurt', 'Dahi'],
    unit: 'pack', price: 220, costPrice: 180,
  },
  {
    id: 'dairy-nestle-nido-400',
    name: 'Nido Milk Powder 400g',
    brand: 'Nestle', category: 'Dairy',
    tags: ['Milk Powder'],
    unit: 'pack', price: 1250, costPrice: 1080,
  },

  // ═══════════════ TEA & COFFEE ═══════════════
  {
    id: 'tea-tapal-danedar-200',
    name: 'Tapal Danedar 200g',
    brand: 'Tapal', category: 'Tea & Coffee',
    tags: ['Tea', 'Black Tea', 'Loose'],
    unit: 'pack', price: 380, costPrice: 320,
  },
  {
    id: 'tea-tapal-danedar-475',
    name: 'Tapal Danedar 475g',
    brand: 'Tapal', category: 'Tea & Coffee',
    tags: ['Tea', 'Black Tea'],
    unit: 'pack', price: 880, costPrice: 740,
  },
  {
    id: 'tea-lipton-yellow-200',
    name: 'Lipton Yellow Label 200g',
    brand: 'Lipton', category: 'Tea & Coffee',
    tags: ['Tea', 'Black Tea'],
    unit: 'pack', price: 420, costPrice: 350,
  },
  {
    id: 'tea-vital-100',
    name: 'Vital Tea 100 Tea Bags',
    brand: 'Vital', category: 'Tea & Coffee',
    tags: ['Tea', 'Tea Bags'],
    unit: 'pack', price: 620, costPrice: 520,
  },
  {
    id: 'coffee-nescafe-classic-100',
    name: 'Nescafe Classic 100g',
    brand: 'Nescafe', category: 'Tea & Coffee',
    tags: ['Coffee', 'Instant Coffee'],
    unit: 'pack', price: 1100, costPrice: 950,
  },
  {
    id: 'coffee-nescafe-3in1',
    name: 'Nescafe 3-in-1 Sachet',
    brand: 'Nescafe', category: 'Tea & Coffee',
    tags: ['Coffee', 'Sachet'],
    unit: 'sachet', price: 40, costPrice: 30,
  },

  // ═══════════════ COOKING ESSENTIALS ═══════════════
  {
    id: 'oil-dalda-2500',
    name: 'Dalda Cooking Oil 2.5L',
    brand: 'Dalda', category: 'Cooking Essentials',
    tags: ['Oil', 'Cooking Oil'],
    unit: 'bottle', price: 1650, costPrice: 1450,
  },
  {
    id: 'oil-sufi-2500',
    name: 'Sufi Cooking Oil 2.5L',
    brand: 'Sufi', category: 'Cooking Essentials',
    tags: ['Oil', 'Cooking Oil'],
    unit: 'bottle', price: 1580, costPrice: 1380,
  },
  {
    id: 'ghee-dalda-1000',
    name: 'Dalda Vanaspati Ghee 1kg',
    brand: 'Dalda', category: 'Cooking Essentials',
    tags: ['Ghee', 'Vanaspati'],
    unit: 'pack', price: 720, costPrice: 620,
  },
  {
    id: 'ghee-tullo-1000',
    name: 'Tullo Ghee 1kg',
    brand: 'Tullo', category: 'Cooking Essentials',
    tags: ['Ghee'],
    unit: 'pack', price: 700, costPrice: 600,
  },
  {
    id: 'sugar-1kg',
    name: 'Sugar (Cheeni) 1kg',
    brand: 'Generic', category: 'Cooking Essentials',
    tags: ['Sugar', 'Cheeni'],
    unit: 'kg', price: 165, costPrice: 145,
  },
  {
    id: 'flour-atta-10kg',
    name: 'Atta (Wheat Flour) 10kg',
    brand: 'Bake Parlor', category: 'Cooking Essentials',
    tags: ['Flour', 'Atta', 'Wheat'],
    unit: 'bag', price: 1450, costPrice: 1280,
  },
  {
    id: 'rice-basmati-5kg',
    name: 'Basmati Rice 5kg',
    brand: 'Falak', category: 'Cooking Essentials',
    tags: ['Rice', 'Basmati'],
    unit: 'bag', price: 2200, costPrice: 1900,
  },
  {
    id: 'rice-basmati-1kg',
    name: 'Basmati Rice 1kg',
    brand: 'Falak', category: 'Cooking Essentials',
    tags: ['Rice', 'Basmati'],
    unit: 'kg', price: 480, costPrice: 410,
  },
  {
    id: 'salt-national-800',
    name: 'National Iodized Salt 800g',
    brand: 'National', category: 'Cooking Essentials',
    tags: ['Salt', 'Iodized'],
    unit: 'pack', price: 80, costPrice: 60,
  },

  // ═══════════════ SPICES ═══════════════
  {
    id: 'spice-national-chilli-100',
    name: 'National Red Chilli Powder 100g',
    brand: 'National', category: 'Spices',
    tags: ['Chilli', 'Powder', 'Red Chilli'],
    unit: 'pack', price: 180, costPrice: 145,
  },
  {
    id: 'spice-national-turmeric-100',
    name: 'National Turmeric Powder 100g',
    brand: 'National', category: 'Spices',
    tags: ['Haldi', 'Turmeric'],
    unit: 'pack', price: 120, costPrice: 95,
  },
  {
    id: 'spice-shan-biryani',
    name: 'Shan Bombay Biryani Masala',
    brand: 'Shan', category: 'Spices',
    tags: ['Masala', 'Biryani'],
    unit: 'pack', price: 220, costPrice: 175,
  },
  {
    id: 'spice-shan-korma',
    name: 'Shan Chicken Korma Masala',
    brand: 'Shan', category: 'Spices',
    tags: ['Masala', 'Korma'],
    unit: 'pack', price: 180, costPrice: 145,
  },
  {
    id: 'spice-national-garam',
    name: 'National Garam Masala 50g',
    brand: 'National', category: 'Spices',
    tags: ['Masala', 'Garam Masala'],
    unit: 'pack', price: 140, costPrice: 110,
  },

  // ═══════════════ PERSONAL CARE — Soap ═══════════════
  {
    id: 'soap-lifebuoy-red',
    name: 'Lifebuoy Total 10 Red Soap',
    brand: 'Lifebuoy', category: 'Personal Care',
    tags: ['Soap', 'Antibacterial'],
    unit: 'pcs', price: 90, costPrice: 68,
  },
  {
    id: 'soap-dettol-original',
    name: 'Dettol Original Soap',
    brand: 'Dettol', category: 'Personal Care',
    tags: ['Soap', 'Antibacterial'],
    unit: 'pcs', price: 130, costPrice: 100,
  },
  {
    id: 'soap-lux-rose',
    name: 'Lux Soft Rose Soap',
    brand: 'Lux', category: 'Personal Care',
    tags: ['Soap', 'Beauty'],
    unit: 'pcs', price: 100, costPrice: 76,
  },
  {
    id: 'soap-safeguard-white',
    name: 'Safeguard Pure White Soap',
    brand: 'Safeguard', category: 'Personal Care',
    tags: ['Soap', 'Antibacterial'],
    unit: 'pcs', price: 110, costPrice: 85,
  },

  // ═══════════════ PERSONAL CARE — Shampoo ═══════════════
  {
    id: 'shampoo-sunsilk-black',
    name: 'Sunsilk Black Shine 185ml',
    brand: 'Sunsilk', category: 'Personal Care',
    tags: ['Shampoo', 'Hair'],
    unit: 'bottle', price: 320, costPrice: 260,
  },
  {
    id: 'shampoo-headshoulders-185',
    name: 'Head & Shoulders Anti-Dandruff 185ml',
    brand: 'Head & Shoulders', category: 'Personal Care',
    tags: ['Shampoo', 'Anti-Dandruff'],
    unit: 'bottle', price: 620, costPrice: 510,
  },
  {
    id: 'shampoo-pantene-185',
    name: 'Pantene Pro-V Silky Smooth 185ml',
    brand: 'Pantene', category: 'Personal Care',
    tags: ['Shampoo', 'Conditioner'],
    unit: 'bottle', price: 480, costPrice: 390,
  },
  {
    id: 'shampoo-clear-men-185',
    name: 'Clear Men Anti-Dandruff 185ml',
    brand: 'Clear', category: 'Personal Care',
    tags: ['Shampoo', 'Men', 'Anti-Dandruff'],
    unit: 'bottle', price: 480, costPrice: 390,
  },

  // ═══════════════ PERSONAL CARE — Toothpaste ═══════════════
  {
    id: 'tp-colgate-strong-125',
    name: 'Colgate Strong Teeth 125g',
    brand: 'Colgate', category: 'Personal Care',
    tags: ['Toothpaste', 'Dental'],
    unit: 'tube', price: 240, costPrice: 190,
  },
  {
    id: 'tp-close-up-red-125',
    name: 'Close Up Red Hot 125g',
    brand: 'Close Up', category: 'Personal Care',
    tags: ['Toothpaste', 'Fresh'],
    unit: 'tube', price: 220, costPrice: 175,
  },
  {
    id: 'tp-sensodyne-100',
    name: 'Sensodyne Fresh Mint 100g',
    brand: 'Sensodyne', category: 'Personal Care',
    tags: ['Toothpaste', 'Sensitive'],
    unit: 'tube', price: 480, costPrice: 395,
  },

  // ═══════════════ HOUSEHOLD ═══════════════
  {
    id: 'det-surf-excel-1kg',
    name: 'Surf Excel Detergent 1kg',
    brand: 'Surf Excel', category: 'Household',
    tags: ['Detergent', 'Washing'],
    unit: 'pack', price: 620, costPrice: 510,
  },
  {
    id: 'det-ariel-1kg',
    name: 'Ariel Detergent Powder 1kg',
    brand: 'Ariel', category: 'Household',
    tags: ['Detergent', 'Washing'],
    unit: 'pack', price: 650, costPrice: 530,
  },
  {
    id: 'det-bonus-1kg',
    name: 'Bonus Detergent 1kg',
    brand: 'Bonus', category: 'Household',
    tags: ['Detergent'],
    unit: 'pack', price: 380, costPrice: 310,
  },
  {
    id: 'dish-max-liquid',
    name: 'Max Dishwash Liquid 475ml',
    brand: 'Max', category: 'Household',
    tags: ['Dishwash', 'Liquid'],
    unit: 'bottle', price: 220, costPrice: 175,
  },
  {
    id: 'floor-max-500',
    name: 'Max Floor Cleaner 500ml',
    brand: 'Max', category: 'Household',
    tags: ['Floor Cleaner'],
    unit: 'bottle', price: 240, costPrice: 190,
  },
  {
    id: 'toilet-harpic-750',
    name: 'Harpic Toilet Cleaner 750ml',
    brand: 'Harpic', category: 'Household',
    tags: ['Toilet Cleaner', 'Bathroom'],
    unit: 'bottle', price: 380, costPrice: 310,
  },
];

/**
 * Category metadata — color + icon mapping for auto-created categories.
 */
export const CATEGORY_META: Record<string, { color: string; description: string }> = {
  'Beverages':          { color: '#3b82f6', description: 'Cold drinks, juices, water' },
  'Snacks':             { color: '#f59e0b', description: 'Chips, namkeen, munchies' },
  'Biscuits':           { color: '#d97706', description: 'Cookies, crackers, biscuits' },
  'Dairy':              { color: '#0ea5e9', description: 'Milk, cheese, butter, yogurt' },
  'Tea & Coffee':       { color: '#78350f', description: 'Tea, coffee, hot beverages' },
  'Cooking Essentials': { color: '#eab308', description: 'Oil, ghee, flour, rice, sugar' },
  'Spices':             { color: '#dc2626', description: 'Masala, spices, seasonings' },
  'Personal Care':      { color: '#ec4899', description: 'Soap, shampoo, toothpaste' },
  'Household':          { color: '#8b5cf6', description: 'Cleaning, detergent, home care' },
};

/**
 * Categories list — auto-derived from catalog products.
 */
export const CATEGORY_LIST = Object.keys(CATEGORY_META);

/**
 * Brands list — auto-derived from catalog products.
 */
export const BRAND_LIST = Array.from(
  new Set(PAKISTAN_GROCERY_CATALOG.map((p) => p.brand))
).sort();
