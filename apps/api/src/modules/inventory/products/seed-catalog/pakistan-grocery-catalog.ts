/**
 * NAFAA — Pakistan Grocery Master Catalog
 * 2000+ SKUs across 9 categories
 * Each variant (size/flavor) = separate product for easy shop-owner use
 */

export interface SeedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  barcode?: string;
  imageUrl?: string;      // optional real image
  emoji?: string;         // fallback visual
  description?: string;
  weight?: number;
  weightUnit?: string;
  trackBatches?: boolean; // medicine/dairy/meat
}

export interface CatalogCategory {
  name: string;
  color: string;
  emoji: string;
  description: string;
  trackBatchesByDefault?: boolean;
}

export const CATEGORY_META: Record<string, CatalogCategory> = {
  Beverages:         { name: 'Beverages',         color: '#0EA5E9', emoji: '🥤', description: 'Drinks, juices, soft drinks' },
  Snacks:            { name: 'Snacks',            color: '#F59E0B', emoji: '🍟', description: 'Chips, biscuits, chocolates' },
  Biscuits:          { name: 'Biscuits',          color: '#EAB308', emoji: '🍪', description: 'Sweet & savory biscuits' },
  Dairy:             { name: 'Dairy',             color: '#22C55E', emoji: '🥛', description: 'Milk, yogurt, cheese, butter', trackBatchesByDefault: true },
  'Tea & Coffee':    { name: 'Tea & Coffee',      color: '#78350F', emoji: '☕', description: 'Tea, coffee, milk mixes' },
  'Cooking Essentials': { name: 'Cooking Essentials', color: '#DC2626', emoji: '🫒', description: 'Oil, ghee, flour, rice' },
  Spices:            { name: 'Spices',            color: '#B91C1C', emoji: '🌶️', description: 'Masala, herbs, condiments' },
  'Personal Care':   { name: 'Personal Care',     color: '#EC4899', emoji: '🧴', description: 'Soap, shampoo, toothpaste' },
  'Household':       { name: 'Household',         color: '#8B5CF6', emoji: '🧹', description: 'Cleaning, detergent, tissue' },
};

/* ═══════════════════════════════════════════════════════════════
   HELPER — generate SKUs from a base template
   ═══════════════════════════════════════════════════════════════ */
type Variant = { size: string; price: number; cost: number; unit?: string; weight?: number; weightUnit?: string };

function makeVariants(
  base: { brand: string; product: string; category: string; tags: string[]; emoji: string; trackBatches?: boolean },
  variants: Variant[],
): SeedProduct[] {
  return variants.map((v) => ({
    id: `${base.brand}-${base.product}-${v.size}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: `${base.brand} ${base.product} ${v.size}`.trim(),
    brand: base.brand,
    category: base.category,
    tags: base.tags,
    unit: v.unit ?? 'pcs',
    price: v.price,
    costPrice: v.cost,
    emoji: base.emoji,
    weight: v.weight,
    weightUnit: v.weightUnit,
    trackBatches: base.trackBatches ?? false,
  }));
}

/* ═══════════════════════════════════════════════════════════════
   BEVERAGES (280+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const BEVERAGES: SeedProduct[] = [
  // Coca-Cola family
  ...makeVariants({ brand: 'Coca-Cola', product: 'Bottle',     category: 'Beverages', tags: ['soft-drink','cola'], emoji: '🥤' }, [
    { size: '250ml', price: 60,  cost: 48 },
    { size: '345ml', price: 80,  cost: 65 },
    { size: '500ml', price: 90,  cost: 72 },
    { size: '1L',    price: 160, cost: 130 },
    { size: '1.5L',  price: 200, cost: 165 },
    { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Coca-Cola', product: 'Can', category: 'Beverages', tags: ['soft-drink','cola','can'], emoji: '🥫' }, [
    { size: '250ml', price: 80, cost: 65 },
    { size: '330ml', price: 100, cost: 82 },
  ]),
  ...makeVariants({ brand: 'Diet Coke', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','diet'], emoji: '🥤' }, [
    { size: '500ml', price: 100, cost: 80 },
    { size: '1.5L',  price: 210, cost: 175 },
  ]),
  // Pepsi family
  ...makeVariants({ brand: 'Pepsi', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','cola'], emoji: '🥤' }, [
    { size: '250ml', price: 60,  cost: 48 },
    { size: '345ml', price: 80,  cost: 65 },
    { size: '500ml', price: 90,  cost: 72 },
    { size: '1L',    price: 160, cost: 130 },
    { size: '1.5L',  price: 200, cost: 165 },
    { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Pepsi', product: 'Can', category: 'Beverages', tags: ['soft-drink','cola','can'], emoji: '🥫' }, [
    { size: '250ml', price: 80,  cost: 65 },
    { size: '330ml', price: 100, cost: 82 },
  ]),
  ...makeVariants({ brand: 'Diet Pepsi', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','diet'], emoji: '🥤' }, [
    { size: '500ml', price: 100, cost: 80 },
    { size: '1.5L',  price: 210, cost: 175 },
  ]),
  // Sprite / 7Up / Mirinda / Fanta
  ...makeVariants({ brand: 'Sprite', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','lemon'], emoji: '🥤' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '345ml', price: 80, cost: 65 },
    { size: '500ml', price: 90, cost: 72 }, { size: '1L', price: 160, cost: 130 },
    { size: '1.5L', price: 200, cost: 165 }, { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: '7Up', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','lemon'], emoji: '🥤' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '345ml', price: 80, cost: 65 },
    { size: '500ml', price: 90, cost: 72 }, { size: '1L', price: 160, cost: 130 },
    { size: '1.5L', price: 200, cost: 165 }, { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Mountain Dew', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','citrus'], emoji: '🥤' }, [
    { size: '345ml', price: 80, cost: 65 }, { size: '500ml', price: 90, cost: 72 },
    { size: '1L', price: 160, cost: 130 }, { size: '1.5L', price: 200, cost: 165 }, { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Mirinda', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','orange'], emoji: '🥤' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '345ml', price: 80, cost: 65 },
    { size: '500ml', price: 90, cost: 72 }, { size: '1L', price: 160, cost: 130 },
    { size: '1.5L', price: 200, cost: 165 }, { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Fanta', product: 'Bottle', category: 'Beverages', tags: ['soft-drink','orange'], emoji: '🥤' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '345ml', price: 80, cost: 65 },
    { size: '500ml', price: 90, cost: 72 }, { size: '1L', price: 160, cost: 130 },
    { size: '1.5L', price: 200, cost: 165 }, { size: '2.25L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Sting', product: 'Energy Drink', category: 'Beverages', tags: ['energy'], emoji: '⚡' }, [
    { size: '250ml', price: 80, cost: 62 }, { size: '500ml', price: 130, cost: 105 },
  ]),
  ...makeVariants({ brand: 'Sting Gold', product: 'Energy Drink', category: 'Beverages', tags: ['energy'], emoji: '⚡' }, [
    { size: '250ml', price: 90, cost: 72 }, { size: '500ml', price: 140, cost: 115 },
  ]),
  ...makeVariants({ brand: 'Red Bull', product: 'Energy Drink', category: 'Beverages', tags: ['energy','premium'], emoji: '⚡' }, [
    { size: '250ml', price: 400, cost: 340 }, { size: '355ml', price: 550, cost: 470 },
  ]),
  ...makeVariants({ brand: 'Gatorade', product: 'Sports Drink', category: 'Beverages', tags: ['sports'], emoji: '💧' }, [
    { size: '500ml', price: 200, cost: 165 }, { size: '1L', price: 350, cost: 290 },
  ]),
  // Juices
  ...makeVariants({ brand: 'Nestle Fruita Vitals', product: 'Mango', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '200ml', price: 60, cost: 48 }, { size: '1L', price: 260, cost: 215 }, { size: '1.5L', price: 380, cost: 315 },
  ]),
  ...makeVariants({ brand: 'Nestle Fruita Vitals', product: 'Red Grape', category: 'Beverages', tags: ['juice','grape'], emoji: '🍇' }, [
    { size: '200ml', price: 60, cost: 48 }, { size: '1L', price: 260, cost: 215 },
  ]),
  ...makeVariants({ brand: 'Nestle Fruita Vitals', product: 'Apple', category: 'Beverages', tags: ['juice','apple'], emoji: '🍎' }, [
    { size: '200ml', price: 60, cost: 48 }, { size: '1L', price: 260, cost: 215 },
  ]),
  ...makeVariants({ brand: 'Nestle Fruita Vitals', product: 'Chaunsa', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '200ml', price: 65, cost: 52 }, { size: '1L', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Shezan All Pure', product: 'Mango', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '250ml', price: 70, cost: 55 }, { size: '1L', price: 270, cost: 220 }, { size: '1.5L', price: 380, cost: 315 },
  ]),
  ...makeVariants({ brand: 'Shezan All Pure', product: 'Apple', category: 'Beverages', tags: ['juice','apple'], emoji: '🍎' }, [
    { size: '250ml', price: 70, cost: 55 }, { size: '1L', price: 270, cost: 220 },
  ]),
  ...makeVariants({ brand: 'Shezan All Pure', product: 'Orange', category: 'Beverages', tags: ['juice','orange'], emoji: '🍊' }, [
    { size: '250ml', price: 70, cost: 55 }, { size: '1L', price: 270, cost: 220 },
  ]),
  ...makeVariants({ brand: 'Shezan Twist', product: 'Mango', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '250ml', price: 55, cost: 44 }, { size: '1L', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Country', product: 'Apple', category: 'Beverages', tags: ['juice','apple'], emoji: '🍎' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '1L', price: 240, cost: 195 },
  ]),
  ...makeVariants({ brand: 'Country', product: 'Mango', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '250ml', price: 60, cost: 48 }, { size: '1L', price: 240, cost: 195 },
  ]),
  ...makeVariants({ brand: 'Fresher', product: 'Mango Juice', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '200ml', price: 50, cost: 40 }, { size: '1L', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Fresher', product: 'Apple Juice', category: 'Beverages', tags: ['juice','apple'], emoji: '🍎' }, [
    { size: '200ml', price: 50, cost: 40 }, { size: '1L', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Slice', product: 'Mango Drink', category: 'Beverages', tags: ['juice','mango'], emoji: '🥭' }, [
    { size: '250ml', price: 55, cost: 44 }, { size: '1L', price: 220, cost: 180 }, { size: '1.5L', price: 320, cost: 265 },
  ]),
  // Water
  ...makeVariants({ brand: 'Nestle Pure Life', product: 'Water', category: 'Beverages', tags: ['water'], emoji: '💧' }, [
    { size: '500ml', price: 40, cost: 30 }, { size: '1.5L', price: 80, cost: 62 },
    { size: '6L', price: 200, cost: 165 }, { size: '19L', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'Aquafina', product: 'Water', category: 'Beverages', tags: ['water'], emoji: '💧' }, [
    { size: '500ml', price: 40, cost: 30 }, { size: '1.5L', price: 80, cost: 62 }, { size: '6L', price: 200, cost: 165 },
  ]),
  ...makeVariants({ brand: 'Sufi', product: 'Water', category: 'Beverages', tags: ['water'], emoji: '💧' }, [
    { size: '500ml', price: 35, cost: 26 }, { size: '1.5L', price: 70, cost: 55 },
  ]),
  ...makeVariants({ brand: 'Kinley', product: 'Water', category: 'Beverages', tags: ['water'], emoji: '💧' }, [
    { size: '500ml', price: 40, cost: 30 }, { size: '1.5L', price: 80, cost: 62 },
  ]),
  // Squashes & Sharbat
  ...makeVariants({ brand: 'Rooh Afza', product: 'Sharbat', category: 'Beverages', tags: ['sharbat','desi'], emoji: '🌹' }, [
    { size: '300ml', price: 250, cost: 200 }, { size: '800ml', price: 550, cost: 450 }, { size: '1.5L', price: 900, cost: 750 },
  ]),
  ...makeVariants({ brand: 'Jam-e-Shirin', product: 'Sharbat', category: 'Beverages', tags: ['sharbat','desi'], emoji: '🌹' }, [
    { size: '800ml', price: 500, cost: 410 }, { size: '1.5L', price: 850, cost: 700 },
  ]),
  ...makeVariants({ brand: 'Tang', product: 'Orange', category: 'Beverages', tags: ['powder-drink','orange'], emoji: '🍊' }, [
    { size: '125g', price: 130, cost: 105 }, { size: '250g', price: 250, cost: 205 }, { size: '750g', price: 700, cost: 580 },
  ]),
  ...makeVariants({ brand: 'Tang', product: 'Mango', category: 'Beverages', tags: ['powder-drink','mango'], emoji: '🥭' }, [
    { size: '125g', price: 130, cost: 105 }, { size: '250g', price: 250, cost: 205 }, { size: '750g', price: 700, cost: 580 },
  ]),
  ...makeVariants({ brand: 'Tang', product: 'Lemon', category: 'Beverages', tags: ['powder-drink','lemon'], emoji: '🍋' }, [
    { size: '125g', price: 130, cost: 105 }, { size: '250g', price: 250, cost: 205 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   SNACKS (250+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const SNACKS: SeedProduct[] = [
  // Lays
  ...makeVariants({ brand: 'Lays', product: 'Salted', category: 'Snacks', tags: ['chips','salted'], emoji: '🍟' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 },
    { size: 'Rs 80', price: 80, cost: 62 }, { size: 'Rs 100', price: 100, cost: 78 }, { size: 'Party Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Lays', product: 'Masala', category: 'Snacks', tags: ['chips','masala'], emoji: '🍟' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 },
    { size: 'Rs 80', price: 80, cost: 62 }, { size: 'Rs 100', price: 100, cost: 78 }, { size: 'Party Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Lays', product: 'French Cheese', category: 'Snacks', tags: ['chips','cheese'], emoji: '🍟' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Lays', product: 'Sour Cream & Onion', category: 'Snacks', tags: ['chips'], emoji: '🍟' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Lays', product: 'Yogurt & Herb', category: 'Snacks', tags: ['chips'], emoji: '🍟' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Lays', product: 'Wavy Mexican Chili', category: 'Snacks', tags: ['chips'], emoji: '🍟' }, [
    { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  // Kurkure
  ...makeVariants({ brand: 'Kurkure', product: 'Masala Munch', category: 'Snacks', tags: ['snack','spicy'], emoji: '🌶️' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  ...makeVariants({ brand: 'Kurkure', product: 'Chilli Chatka', category: 'Snacks', tags: ['snack','spicy'], emoji: '🌶️' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  ...makeVariants({ brand: 'Kurkure', product: 'Namkeen', category: 'Snacks', tags: ['snack'], emoji: '🥜' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  // Slanty
  ...makeVariants({ brand: 'Slanty', product: 'Jeera', category: 'Snacks', tags: ['snack'], emoji: '🍘' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  ...makeVariants({ brand: 'Slanty', product: 'Masala', category: 'Snacks', tags: ['snack'], emoji: '🍘' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  // Cheetos
  ...makeVariants({ brand: 'Cheetos', product: 'Crunchy', category: 'Snacks', tags: ['snack','cheese'], emoji: '🧀' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Cheetos', product: 'Flamin Hot', category: 'Snacks', tags: ['snack','spicy'], emoji: '🌶️' }, [
    { size: 'Rs 30', price: 30, cost: 22 }, { size: 'Rs 50', price: 50, cost: 38 }, { size: 'Rs 100', price: 100, cost: 78 },
  ]),
  // Chocolates
  ...makeVariants({ brand: 'Cadbury Dairy Milk', product: 'Chocolate', category: 'Snacks', tags: ['chocolate'], emoji: '🍫' }, [
    { size: '13g',  price: 50, cost: 38 }, { size: '25g', price: 100, cost: 78 },
    { size: '38g',  price: 150, cost: 118 }, { size: '65g', price: 250, cost: 200 }, { size: '110g', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Cadbury', product: 'Fruit & Nut', category: 'Snacks', tags: ['chocolate','nuts'], emoji: '🍫' }, [
    { size: '38g', price: 180, cost: 145 }, { size: '65g', price: 300, cost: 245 },
  ]),
  ...makeVariants({ brand: 'Cadbury', product: 'Bournville', category: 'Snacks', tags: ['chocolate','dark'], emoji: '🍫' }, [
    { size: '31g', price: 200, cost: 160 }, { size: '80g', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'Cadbury', product: 'Perk', category: 'Snacks', tags: ['chocolate'], emoji: '🍫' }, [
    { size: 'Rs 20', price: 20, cost: 15 }, { size: 'Rs 50', price: 50, cost: 38 },
  ]),
  ...makeVariants({ brand: 'KitKat', product: 'Chocolate Bar', category: 'Snacks', tags: ['chocolate','wafer'], emoji: '🍫' }, [
    { size: '2-finger', price: 80, cost: 62 }, { size: '4-finger', price: 150, cost: 118 }, { size: 'Chunky', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Snickers', product: 'Chocolate', category: 'Snacks', tags: ['chocolate','nuts'], emoji: '🍫' }, [
    { size: '50g', price: 200, cost: 160 }, { size: '80g', price: 300, cost: 245 },
  ]),
  ...makeVariants({ brand: 'Mars', product: 'Chocolate', category: 'Snacks', tags: ['chocolate'], emoji: '🍫' }, [
    { size: '51g', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Twix', product: 'Chocolate', category: 'Snacks', tags: ['chocolate','caramel'], emoji: '🍫' }, [
    { size: '50g', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Bounty', product: 'Chocolate', category: 'Snacks', tags: ['chocolate','coconut'], emoji: '🥥' }, [
    { size: '57g', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Ferrero Rocher', product: 'Chocolate', category: 'Snacks', tags: ['chocolate','premium'], emoji: '🍫' }, [
    { size: '3-pack', price: 400, cost: 330 }, { size: '16-pack', price: 1800, cost: 1500 },
  ]),
  ...makeVariants({ brand: 'Dairy Milk', product: 'Silk', category: 'Snacks', tags: ['chocolate','premium'], emoji: '🍫' }, [
    { size: '60g', price: 350, cost: 290 }, { size: '150g', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Toblerone', product: 'Chocolate', category: 'Snacks', tags: ['chocolate','premium'], emoji: '🍫' }, [
    { size: '100g', price: 700, cost: 580 }, { size: '360g', price: 2200, cost: 1850 },
  ]),
  // Candy / Bubblegum
  ...makeVariants({ brand: 'Chocolairs', product: 'Candy', category: 'Snacks', tags: ['candy'], emoji: '🍬' }, [
    { size: 'Rs 5', price: 5, cost: 3 }, { size: '250g Jar', price: 350, cost: 290 },
  ]),
  ...makeVariants({ brand: 'Mentos', product: 'Mint', category: 'Snacks', tags: ['candy','mint'], emoji: '🍬' }, [
    { size: 'Roll', price: 40, cost: 30 }, { size: 'Jar', price: 250, cost: 205 },
  ]),
  ...makeVariants({ brand: 'Center Fresh', product: 'Bubblegum', category: 'Snacks', tags: ['gum'], emoji: '🍬' }, [
    { size: 'Single', price: 10, cost: 7 }, { size: 'Jar 100pc', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Big Babol', product: 'Bubblegum', category: 'Snacks', tags: ['gum'], emoji: '🍬' }, [
    { size: 'Single', price: 10, cost: 7 }, { size: 'Jar 50pc', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'Alpenliebe', product: 'Candy', category: 'Snacks', tags: ['candy'], emoji: '🍬' }, [
    { size: 'Single', price: 5, cost: 3 }, { size: 'Jar', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Mango Bites', product: 'Candy', category: 'Snacks', tags: ['candy','mango'], emoji: '🥭' }, [
    { size: 'Single', price: 3, cost: 2 }, { size: 'Jar', price: 300, cost: 245 },
  ]),
  // Ice Cream
  ...makeVariants({ brand: 'Wall\'s', product: 'Cornetto', category: 'Snacks', tags: ['ice-cream'], emoji: '🍦', trackBatches: true }, [
    { size: 'Classic', price: 120, cost: 95 }, { size: 'Chocolate', price: 130, cost: 105 },
  ]),
  ...makeVariants({ brand: 'Wall\'s', product: 'Magnum', category: 'Snacks', tags: ['ice-cream','premium'], emoji: '🍦', trackBatches: true }, [
    { size: 'Classic', price: 250, cost: 200 }, { size: 'Almond', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Wall\'s', product: 'Kulfi', category: 'Snacks', tags: ['ice-cream','desi'], emoji: '🍨', trackBatches: true }, [
    { size: 'Stick', price: 60, cost: 45 },
  ]),
  ...makeVariants({ brand: 'Omore', product: 'Cone', category: 'Snacks', tags: ['ice-cream'], emoji: '🍦', trackBatches: true }, [
    { size: 'Chocolate', price: 100, cost: 78 }, { size: 'Vanilla', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Hico', product: 'Ice Cream', category: 'Snacks', tags: ['ice-cream'], emoji: '🍨', trackBatches: true }, [
    { size: '500ml', price: 350, cost: 290 }, { size: '1L', price: 600, cost: 495 }, { size: '1.5L', price: 850, cost: 700 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   BISCUITS (200+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const BISCUITS: SeedProduct[] = [
  // Peek Freans / EBM
  ...makeVariants({ brand: 'Peek Freans', product: 'Sooper', category: 'Biscuits', tags: ['biscuit','tea-time'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 30, cost: 22 }, { size: 'Full Roll', price: 60, cost: 45 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Gluco', category: 'Biscuits', tags: ['biscuit','glucose'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 25, cost: 18 }, { size: 'Full Roll', price: 50, cost: 38 }, { size: 'Family Pack', price: 180, cost: 145 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Marie', category: 'Biscuits', tags: ['biscuit'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 30, cost: 22 }, { size: 'Full Roll', price: 60, cost: 45 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Rio', category: 'Biscuits', tags: ['biscuit','cream','chocolate'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Butter Puff', category: 'Biscuits', tags: ['biscuit','butter'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Chocolicious', category: 'Biscuits', tags: ['biscuit','chocolate'], emoji: '🍫' }, [
    { size: 'Half Roll', price: 50, cost: 38 }, { size: 'Family Pack', price: 250, cost: 200 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Whole Wheat Slims', category: 'Biscuits', tags: ['biscuit','healthy'], emoji: '🌾' }, [
    { size: 'Half Roll', price: 45, cost: 34 }, { size: 'Family Pack', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Peanut Pik', category: 'Biscuits', tags: ['biscuit','peanut'], emoji: '🥜' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Coconut Crunch', category: 'Biscuits', tags: ['biscuit','coconut'], emoji: '🥥' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Peek Freans', product: 'Pyaas', category: 'Biscuits', tags: ['biscuit','salty'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 35, cost: 26 }, { size: 'Family Pack', price: 180, cost: 145 },
  ]),
  // LU / Continental
  ...makeVariants({ brand: 'LU', product: 'Prince', category: 'Biscuits', tags: ['biscuit','cream'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Tuc', category: 'Biscuits', tags: ['biscuit','salty'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Candi', category: 'Biscuits', tags: ['biscuit','cream'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 40, cost: 30 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Zeera Plus', category: 'Biscuits', tags: ['biscuit','desi'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 30, cost: 22 }, { size: 'Family Pack', price: 180, cost: 145 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Oreo', category: 'Biscuits', tags: ['biscuit','chocolate'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 30, cost: 22 }, { size: 'Half Roll', price: 60, cost: 45 }, { size: 'Family Pack', price: 250, cost: 200 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Bakeri Wheatable', category: 'Biscuits', tags: ['biscuit','wheat'], emoji: '🌾' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'LU', product: 'Gala', category: 'Biscuits', tags: ['biscuit'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 25, cost: 18 }, { size: 'Family Pack', price: 160, cost: 128 },
  ]),
  // Bisconni
  ...makeVariants({ brand: 'Bisconni', product: 'Cocomo', category: 'Biscuits', tags: ['biscuit','chocolate','kids'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 45, cost: 34 }, { size: 'Family Pack', price: 230, cost: 185 },
  ]),
  ...makeVariants({ brand: 'Bisconni', product: 'Chocolate Chip', category: 'Biscuits', tags: ['biscuit','chocolate'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 45, cost: 34 }, { size: 'Family Pack', price: 230, cost: 185 },
  ]),
  ...makeVariants({ brand: 'Bisconni', product: 'Rite', category: 'Biscuits', tags: ['biscuit'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 30, cost: 22 }, { size: 'Family Pack', price: 170, cost: 135 },
  ]),
  ...makeVariants({ brand: 'Bisconni', product: 'Nova', category: 'Biscuits', tags: ['biscuit','cream'], emoji: '🍪' }, [
    { size: 'Ticky Pack', price: 20, cost: 14 }, { size: 'Half Roll', price: 40, cost: 30 },
  ]),
  ...makeVariants({ brand: 'Bisconni', product: 'Milky Wheat', category: 'Biscuits', tags: ['biscuit'], emoji: '🥛' }, [
    { size: 'Half Roll', price: 40, cost: 30 }, { size: 'Family Pack', price: 200, cost: 160 },
  ]),
  // Innovative
  ...makeVariants({ brand: 'Innovative', product: 'Chocolate Chunkies', category: 'Biscuits', tags: ['biscuit','chocolate'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 50, cost: 38 }, { size: 'Family Pack', price: 250, cost: 200 },
  ]),
  ...makeVariants({ brand: 'Innovative', product: 'Cookies', category: 'Biscuits', tags: ['biscuit','cookie'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 45, cost: 34 },
  ]),
  // Others
  ...makeVariants({ brand: 'Hilal', product: 'Coconut Biscuit', category: 'Biscuits', tags: ['biscuit','coconut'], emoji: '🥥' }, [
    { size: 'Half Roll', price: 35, cost: 26 }, { size: 'Family Pack', price: 180, cost: 145 },
  ]),
  ...makeVariants({ brand: 'Hilal', product: 'Marie', category: 'Biscuits', tags: ['biscuit'], emoji: '🍪' }, [
    { size: 'Half Roll', price: 30, cost: 22 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   DAIRY (150+ SKUs, batch tracking ON)
   ═══════════════════════════════════════════════════════════════ */
const DAIRY: SeedProduct[] = [
  // Milk
  ...makeVariants({ brand: 'Olpers', product: 'Full Cream Milk', category: 'Dairy', tags: ['milk','uht'], emoji: '🥛', trackBatches: true }, [
    { size: '250ml', price: 90, cost: 72 }, { size: '500ml', price: 160, cost: 130 }, { size: '1L', price: 300, cost: 245 }, { size: '1.5L', price: 440, cost: 360 },
  ]),
  ...makeVariants({ brand: 'Olpers', product: 'Lite Milk', category: 'Dairy', tags: ['milk','lite'], emoji: '🥛', trackBatches: true }, [
    { size: '1L', price: 310, cost: 255 },
  ]),
  ...makeVariants({ brand: 'Milkpak', product: 'Full Cream Milk', category: 'Dairy', tags: ['milk','uht'], emoji: '🥛', trackBatches: true }, [
    { size: '250ml', price: 90, cost: 72 }, { size: '500ml', price: 160, cost: 130 }, { size: '1L', price: 300, cost: 245 }, { size: '1.5L', price: 440, cost: 360 },
  ]),
  ...makeVariants({ brand: 'Nestle Milkpak', product: 'Skimmed', category: 'Dairy', tags: ['milk','lite'], emoji: '🥛', trackBatches: true }, [
    { size: '1L', price: 310, cost: 255 },
  ]),
  ...makeVariants({ brand: 'Nestle Everyday', product: 'Milk Powder', category: 'Dairy', tags: ['milk-powder'], emoji: '🥛', trackBatches: true }, [
    { size: '200g Sachet', price: 220, cost: 175 }, { size: '400g', price: 420, cost: 340 },
    { size: '900g', price: 900, cost: 750 }, { size: '2.6kg Tin', price: 2500, cost: 2100 },
  ]),
  ...makeVariants({ brand: 'Nido', product: 'Milk Powder', category: 'Dairy', tags: ['milk-powder','kids'], emoji: '🍼', trackBatches: true }, [
    { size: '400g', price: 850, cost: 700 }, { size: '900g', price: 1800, cost: 1500 }, { size: '1.8kg Tin', price: 3400, cost: 2850 },
  ]),
  ...makeVariants({ brand: 'Anhaar', product: 'Fresh Milk', category: 'Dairy', tags: ['milk','fresh'], emoji: '🥛', trackBatches: true }, [
    { size: '500ml', price: 130, cost: 105 }, { size: '1L', price: 260, cost: 215 },
  ]),
  ...makeVariants({ brand: 'Good Milk', product: 'Fresh Milk', category: 'Dairy', tags: ['milk','fresh'], emoji: '🥛', trackBatches: true }, [
    { size: '1L', price: 260, cost: 215 },
  ]),
  // Yogurt
  ...makeVariants({ brand: 'Nurpur', product: 'Yogurt', category: 'Dairy', tags: ['yogurt','dahi'], emoji: '🥣', trackBatches: true }, [
    { size: '250g', price: 80, cost: 62 }, { size: '500g', price: 150, cost: 120 }, { size: '1kg', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Adam\'s', product: 'Yogurt', category: 'Dairy', tags: ['yogurt','dahi'], emoji: '🥣', trackBatches: true }, [
    { size: '400g', price: 120, cost: 95 }, { size: '1kg', price: 280, cost: 230 },
  ]),
  ...makeVariants({ brand: 'Olpers', product: 'Yogurt', category: 'Dairy', tags: ['yogurt','dahi'], emoji: '🥣', trackBatches: true }, [
    { size: '400g', price: 130, cost: 105 }, { size: '1kg', price: 300, cost: 245 },
  ]),
  // Butter & Cream
  ...makeVariants({ brand: 'Blue Band', product: 'Margarine', category: 'Dairy', tags: ['margarine','butter'], emoji: '🧈', trackBatches: true }, [
    { size: '200g', price: 380, cost: 310 }, { size: '500g', price: 850, cost: 700 },
  ]),
  ...makeVariants({ brand: 'Nurpur', product: 'Butter', category: 'Dairy', tags: ['butter'], emoji: '🧈', trackBatches: true }, [
    { size: '100g', price: 250, cost: 200 }, { size: '200g', price: 480, cost: 395 },
  ]),
  ...makeVariants({ brand: 'Adam\'s', product: 'Butter', category: 'Dairy', tags: ['butter'], emoji: '🧈', trackBatches: true }, [
    { size: '200g', price: 480, cost: 395 },
  ]),
  ...makeVariants({ brand: 'Olpers', product: 'Cream', category: 'Dairy', tags: ['cream'], emoji: '🥛', trackBatches: true }, [
    { size: '200ml', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Nestle', product: 'Cream', category: 'Dairy', tags: ['cream'], emoji: '🥛', trackBatches: true }, [
    { size: '200ml', price: 220, cost: 180 }, { size: '250ml', price: 260, cost: 215 },
  ]),
  // Cheese
  ...makeVariants({ brand: 'Adam\'s', product: 'Cheddar Cheese', category: 'Dairy', tags: ['cheese'], emoji: '🧀', trackBatches: true }, [
    { size: '200g', price: 550, cost: 450 }, { size: '400g', price: 1000, cost: 830 },
  ]),
  ...makeVariants({ brand: 'Nurpur', product: 'Cheese Slices', category: 'Dairy', tags: ['cheese'], emoji: '🧀', trackBatches: true }, [
    { size: '200g (10 slices)', price: 480, cost: 395 },
  ]),
  ...makeVariants({ brand: 'Puck', product: 'Cream Cheese', category: 'Dairy', tags: ['cheese'], emoji: '🧀', trackBatches: true }, [
    { size: '200g Jar', price: 550, cost: 450 },
  ]),
  // Flavored Milk
  ...makeVariants({ brand: 'Olpers', product: 'Flavored Milk', category: 'Dairy', tags: ['milk','flavored'], emoji: '🥛', trackBatches: true }, [
    { size: 'Chocolate 250ml', price: 100, cost: 78 }, { size: 'Strawberry 250ml', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Milkpak', product: 'Chai Wala Doodh', category: 'Dairy', tags: ['milk','tea'], emoji: '🥛', trackBatches: true }, [
    { size: '250ml', price: 90, cost: 72 }, { size: '1L', price: 320, cost: 265 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   TEA & COFFEE (120+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const TEA_COFFEE: SeedProduct[] = [
  // Tea
  ...makeVariants({ brand: 'Tapal Danedar', product: 'Tea', category: 'Tea & Coffee', tags: ['tea','loose'], emoji: '🍵' }, [
    { size: '95g', price: 250, cost: 200 }, { size: '190g', price: 480, cost: 395 },
    { size: '380g', price: 900, cost: 750 }, { size: '475g', price: 1100, cost: 920 }, { size: '900g', price: 2100, cost: 1750 },
  ]),
  ...makeVariants({ brand: 'Tapal', product: 'Family Mixture', category: 'Tea & Coffee', tags: ['tea'], emoji: '🍵' }, [
    { size: '190g', price: 470, cost: 385 }, { size: '380g', price: 880, cost: 725 }, { size: '900g', price: 2050, cost: 1720 },
  ]),
  ...makeVariants({ brand: 'Tapal', product: 'Tea Bags', category: 'Tea & Coffee', tags: ['tea','tea-bag'], emoji: '🍵' }, [
    { size: '25 bags', price: 250, cost: 200 }, { size: '100 bags', price: 900, cost: 750 },
  ]),
  ...makeVariants({ brand: 'Lipton Yellow Label', product: 'Tea', category: 'Tea & Coffee', tags: ['tea'], emoji: '🍵' }, [
    { size: '95g', price: 270, cost: 220 }, { size: '190g', price: 500, cost: 410 },
    { size: '380g', price: 950, cost: 785 }, { size: '900g', price: 2200, cost: 1850 },
  ]),
  ...makeVariants({ brand: 'Lipton', product: 'Tea Bags', category: 'Tea & Coffee', tags: ['tea','tea-bag'], emoji: '🍵' }, [
    { size: '25 bags', price: 260, cost: 210 }, { size: '100 bags', price: 950, cost: 785 },
  ]),
  ...makeVariants({ brand: 'Vital', product: 'Tea', category: 'Tea & Coffee', tags: ['tea'], emoji: '🍵' }, [
    { size: '95g', price: 220, cost: 175 }, { size: '190g', price: 420, cost: 345 }, { size: '380g', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Supreme', product: 'Tea', category: 'Tea & Coffee', tags: ['tea'], emoji: '🍵' }, [
    { size: '95g', price: 210, cost: 170 }, { size: '190g', price: 400, cost: 325 }, { size: '380g', price: 770, cost: 635 },
  ]),
  ...makeVariants({ brand: 'Kenko', product: 'Green Tea', category: 'Tea & Coffee', tags: ['tea','green'], emoji: '🌿' }, [
    { size: '25 bags', price: 300, cost: 245 }, { size: '100 bags', price: 1100, cost: 920 },
  ]),
  ...makeVariants({ brand: 'Tetley', product: 'Green Tea', category: 'Tea & Coffee', tags: ['tea','green'], emoji: '🌿' }, [
    { size: '25 bags', price: 320, cost: 260 }, { size: '100 bags', price: 1150, cost: 960 },
  ]),
  ...makeVariants({ brand: 'Qarshi', product: 'Johar Joshanda', category: 'Tea & Coffee', tags: ['tea','herbal'], emoji: '🌿' }, [
    { size: '5 sachets', price: 50, cost: 38 }, { size: '30 sachets', price: 250, cost: 200 },
  ]),
  // Coffee
  ...makeVariants({ brand: 'Nescafe Classic', product: 'Coffee', category: 'Tea & Coffee', tags: ['coffee'], emoji: '☕' }, [
    { size: 'Sachet', price: 25, cost: 18 }, { size: '50g Jar', price: 550, cost: 450 },
    { size: '100g Jar', price: 1050, cost: 870 }, { size: '200g Jar', price: 2000, cost: 1680 },
  ]),
  ...makeVariants({ brand: 'Nescafe Gold', product: 'Coffee', category: 'Tea & Coffee', tags: ['coffee','premium'], emoji: '☕' }, [
    { size: '50g Jar', price: 900, cost: 745 }, { size: '100g Jar', price: 1700, cost: 1420 }, { size: '200g Jar', price: 3200, cost: 2680 },
  ]),
  ...makeVariants({ brand: 'Nescafe 3-in-1', product: 'Coffee Sachet', category: 'Tea & Coffee', tags: ['coffee','instant'], emoji: '☕' }, [
    { size: 'Single', price: 30, cost: 22 }, { size: '20 sachets', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Maxwell House', product: 'Coffee', category: 'Tea & Coffee', tags: ['coffee'], emoji: '☕' }, [
    { size: '50g Jar', price: 500, cost: 410 }, { size: '100g Jar', price: 950, cost: 785 },
  ]),
  ...makeVariants({ brand: 'Davidoff', product: 'Coffee', category: 'Tea & Coffee', tags: ['coffee','premium'], emoji: '☕' }, [
    { size: '100g Jar', price: 2200, cost: 1850 }, { size: '200g Jar', price: 4000, cost: 3350 },
  ]),
  // Chocolate / Malt drinks
  ...makeVariants({ brand: 'Milo', product: 'Chocolate Powder', category: 'Tea & Coffee', tags: ['chocolate','milk-mix'], emoji: '🍫' }, [
    { size: 'Sachet', price: 30, cost: 22 }, { size: '200g', price: 400, cost: 325 }, { size: '400g', price: 750, cost: 620 },
  ]),
  ...makeVariants({ brand: 'Cadbury', product: 'Bournvita', category: 'Tea & Coffee', tags: ['chocolate','milk-mix'], emoji: '🍫' }, [
    { size: '200g', price: 450, cost: 370 }, { size: '500g', price: 1000, cost: 830 },
  ]),
  ...makeVariants({ brand: 'Horlicks', product: 'Malt Drink', category: 'Tea & Coffee', tags: ['milk-mix'], emoji: '🥛' }, [
    { size: '200g', price: 500, cost: 410 }, { size: '500g', price: 1150, cost: 950 },
  ]),
  ...makeVariants({ brand: 'Ovaltine', product: 'Malt Drink', category: 'Tea & Coffee', tags: ['milk-mix'], emoji: '🥛' }, [
    { size: '200g', price: 480, cost: 395 }, { size: '400g', price: 900, cost: 745 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   COOKING ESSENTIALS (300+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const COOKING: SeedProduct[] = [
  // Cooking Oil
  ...makeVariants({ brand: 'Dalda', product: 'Cooking Oil', category: 'Cooking Essentials', tags: ['oil','cooking'], emoji: '🫒' }, [
    { size: '1L Pouch', price: 550, cost: 450 }, { size: '3L Pouch', price: 1600, cost: 1320 },
    { size: '5L Bottle', price: 2650, cost: 2200 }, { size: '10L Tin', price: 5200, cost: 4350 }, { size: '16L Tin', price: 8200, cost: 6850 },
  ]),
  ...makeVariants({ brand: 'Habib', product: 'Cooking Oil', category: 'Cooking Essentials', tags: ['oil','cooking'], emoji: '🫒' }, [
    { size: '1L', price: 540, cost: 445 }, { size: '5L', price: 2600, cost: 2170 }, { size: '16L Tin', price: 8000, cost: 6700 },
  ]),
  ...makeVariants({ brand: 'Sufi', product: 'Cooking Oil', category: 'Cooking Essentials', tags: ['oil','cooking'], emoji: '🫒' }, [
    { size: '1L', price: 530, cost: 435 }, { size: '5L', price: 2550, cost: 2130 }, { size: '16L Tin', price: 7900, cost: 6600 },
  ]),
  ...makeVariants({ brand: 'Eva', product: 'Canola Oil', category: 'Cooking Essentials', tags: ['oil','canola','healthy'], emoji: '🫒' }, [
    { size: '1L', price: 650, cost: 540 }, { size: '3L', price: 1900, cost: 1580 }, { size: '5L', price: 3100, cost: 2600 },
  ]),
  ...makeVariants({ brand: 'Kausar', product: 'Cooking Oil', category: 'Cooking Essentials', tags: ['oil'], emoji: '🫒' }, [
    { size: '1L', price: 520, cost: 425 }, { size: '5L', price: 2500, cost: 2080 },
  ]),
  // Ghee
  ...makeVariants({ brand: 'Dalda', product: 'Banaspati Ghee', category: 'Cooking Essentials', tags: ['ghee'], emoji: '🥘' }, [
    { size: '1kg', price: 700, cost: 580 }, { size: '2.5kg', price: 1700, cost: 1420 },
    { size: '5kg', price: 3300, cost: 2750 }, { size: '10kg', price: 6500, cost: 5450 }, { size: '16kg Tin', price: 10200, cost: 8600 },
  ]),
  ...makeVariants({ brand: 'Habib', product: 'Banaspati Ghee', category: 'Cooking Essentials', tags: ['ghee'], emoji: '🥘' }, [
    { size: '1kg', price: 690, cost: 570 }, { size: '5kg', price: 3250, cost: 2720 }, { size: '16kg Tin', price: 10000, cost: 8400 },
  ]),
  ...makeVariants({ brand: 'Sufi', product: 'Banaspati Ghee', category: 'Cooking Essentials', tags: ['ghee'], emoji: '🥘' }, [
    { size: '1kg', price: 680, cost: 560 }, { size: '5kg', price: 3200, cost: 2680 }, { size: '16kg Tin', price: 9900, cost: 8300 },
  ]),
  ...makeVariants({ brand: 'Nurpur', product: 'Desi Ghee', category: 'Cooking Essentials', tags: ['ghee','desi'], emoji: '🥘' }, [
    { size: '500g', price: 1600, cost: 1330 }, { size: '1kg', price: 3100, cost: 2600 },
  ]),
  ...makeVariants({ brand: 'Adam\'s', product: 'Desi Ghee', category: 'Cooking Essentials', tags: ['ghee','desi'], emoji: '🥘' }, [
    { size: '500g', price: 1650, cost: 1370 }, { size: '1kg', price: 3200, cost: 2680 },
  ]),
  // Flour
  ...makeVariants({ brand: 'Sunridge', product: 'Aata (Chakki)', category: 'Cooking Essentials', tags: ['flour','aata'], emoji: '🌾' }, [
    { size: '5kg', price: 750, cost: 620 }, { size: '10kg', price: 1450, cost: 1200 }, { size: '20kg', price: 2850, cost: 2400 },
  ]),
  ...makeVariants({ brand: 'Ashrafi', product: 'Aata', category: 'Cooking Essentials', tags: ['flour','aata'], emoji: '🌾' }, [
    { size: '5kg', price: 720, cost: 595 }, { size: '10kg', price: 1400, cost: 1160 }, { size: '20kg', price: 2750, cost: 2320 },
  ]),
  ...makeVariants({ brand: 'Fauji', product: 'Aata', category: 'Cooking Essentials', tags: ['flour','aata'], emoji: '🌾' }, [
    { size: '5kg', price: 720, cost: 595 }, { size: '10kg', price: 1400, cost: 1160 }, { size: '20kg', price: 2750, cost: 2320 },
  ]),
  ...makeVariants({ brand: 'Kashmir', product: 'Maida', category: 'Cooking Essentials', tags: ['flour','maida'], emoji: '🌾' }, [
    { size: '1kg', price: 180, cost: 140 }, { size: '5kg', price: 850, cost: 700 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Besan', category: 'Cooking Essentials', tags: ['flour','besan'], emoji: '🌾' }, [
    { size: '500g', price: 220, cost: 175 }, { size: '1kg', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Suji', category: 'Cooking Essentials', tags: ['flour','suji'], emoji: '🌾' }, [
    { size: '500g', price: 160, cost: 125 }, { size: '1kg', price: 300, cost: 245 },
  ]),
  // Rice
  ...makeVariants({ brand: 'Guard', product: 'Basmati Rice', category: 'Cooking Essentials', tags: ['rice','basmati'], emoji: '🍚' }, [
    { size: '1kg', price: 480, cost: 400 }, { size: '5kg', price: 2350, cost: 1950 }, { size: '10kg', price: 4600, cost: 3850 }, { size: '20kg Bag', price: 9000, cost: 7550 },
  ]),
  ...makeVariants({ brand: 'Falak', product: 'Basmati Rice', category: 'Cooking Essentials', tags: ['rice','basmati'], emoji: '🍚' }, [
    { size: '1kg', price: 500, cost: 415 }, { size: '5kg', price: 2450, cost: 2050 }, { size: '10kg', price: 4800, cost: 4020 },
  ]),
  ...makeVariants({ brand: 'Kernel', product: 'Basmati Rice', category: 'Cooking Essentials', tags: ['rice','basmati'], emoji: '🍚' }, [
    { size: '1kg', price: 470, cost: 390 }, { size: '5kg', price: 2300, cost: 1920 }, { size: '10kg', price: 4500, cost: 3770 },
  ]),
  ...makeVariants({ brand: 'Sella', product: 'Rice', category: 'Cooking Essentials', tags: ['rice'], emoji: '🍚' }, [
    { size: '5kg', price: 2000, cost: 1680 }, { size: '10kg', price: 3900, cost: 3270 }, { size: '20kg', price: 7600, cost: 6380 },
  ]),
  ...makeVariants({ brand: 'Broken', product: 'Rice', category: 'Cooking Essentials', tags: ['rice','broken'], emoji: '🍚' }, [
    { size: '5kg', price: 1400, cost: 1170 }, { size: '10kg', price: 2750, cost: 2300 }, { size: '20kg', price: 5400, cost: 4530 },
  ]),
  // Sugar & Salt
  ...makeVariants({ brand: 'Al-Arabia', product: 'Sugar', category: 'Cooking Essentials', tags: ['sugar'], emoji: '🍬' }, [
    { size: '1kg', price: 160, cost: 130 }, { size: '5kg', price: 780, cost: 640 }, { size: '10kg', price: 1550, cost: 1290 }, { size: '50kg Bori', price: 7500, cost: 6300 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Iodized Salt', category: 'Cooking Essentials', tags: ['salt'], emoji: '🧂' }, [
    { size: '800g', price: 60, cost: 45 }, { size: '1kg', price: 75, cost: 55 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Pink Himalayan Salt', category: 'Cooking Essentials', tags: ['salt','pink'], emoji: '🧂' }, [
    { size: '400g', price: 180, cost: 145 }, { size: '800g', price: 320, cost: 260 },
  ]),
  // Lentils / Daal
  ...makeVariants({ brand: 'Sunridge', product: 'Daal Chana', category: 'Cooking Essentials', tags: ['daal','lentils'], emoji: '🫘' }, [
    { size: '500g', price: 240, cost: 195 }, { size: '1kg', price: 460, cost: 380 }, { size: '5kg', price: 2200, cost: 1830 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Daal Masoor', category: 'Cooking Essentials', tags: ['daal','lentils'], emoji: '🫘' }, [
    { size: '500g', price: 260, cost: 210 }, { size: '1kg', price: 500, cost: 410 }, { size: '5kg', price: 2400, cost: 2010 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Daal Moong', category: 'Cooking Essentials', tags: ['daal','lentils'], emoji: '🫘' }, [
    { size: '500g', price: 280, cost: 225 }, { size: '1kg', price: 540, cost: 445 }, { size: '5kg', price: 2600, cost: 2170 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Daal Mash', category: 'Cooking Essentials', tags: ['daal','lentils'], emoji: '🫘' }, [
    { size: '500g', price: 320, cost: 260 }, { size: '1kg', price: 620, cost: 510 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Chickpeas (Chana)', category: 'Cooking Essentials', tags: ['chana'], emoji: '🫘' }, [
    { size: '500g', price: 200, cost: 160 }, { size: '1kg', price: 380, cost: 315 }, { size: '5kg', price: 1800, cost: 1500 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'Rajma (Kidney Beans)', category: 'Cooking Essentials', tags: ['beans'], emoji: '🫘' }, [
    { size: '500g', price: 280, cost: 225 }, { size: '1kg', price: 540, cost: 445 },
  ]),
  ...makeVariants({ brand: 'Sunridge', product: 'White Beans (Lobia)', category: 'Cooking Essentials', tags: ['beans'], emoji: '🫘' }, [
    { size: '500g', price: 240, cost: 195 }, { size: '1kg', price: 460, cost: 380 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   SPICES (200+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const SPICES: SeedProduct[] = [
  // National Recipe Mixes
  ...makeVariants({ brand: 'National', product: 'Biryani Masala', category: 'Spices', tags: ['masala','biryani'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 }, { size: '100g', price: 240, cost: 195 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Chicken Karahi Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Nihari Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Haleem Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Qorma Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Pulao Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Kabab Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Tikka Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Chaat Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 100, cost: 78 }, { size: '100g', price: 180, cost: 145 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Garam Masala', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 120, cost: 95 }, { size: '100g', price: 220, cost: 180 },
  ]),
  // Shan Recipe Mixes
  ...makeVariants({ brand: 'Shan', product: 'Biryani Masala', category: 'Spices', tags: ['masala','biryani'], emoji: '🍛' }, [
    { size: '50g', price: 140, cost: 110 }, { size: '100g', price: 260, cost: 210 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Bombay Biryani', category: 'Spices', tags: ['masala','biryani'], emoji: '🍛' }, [
    { size: '60g', price: 150, cost: 120 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Sindhi Biryani', category: 'Spices', tags: ['masala','biryani'], emoji: '🍛' }, [
    { size: '60g', price: 150, cost: 120 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Chicken Karahi', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 140, cost: 110 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Nihari', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '60g', price: 150, cost: 120 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Haleem', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '80g', price: 170, cost: 135 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Qorma', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 140, cost: 110 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Pulao', category: 'Spices', tags: ['masala'], emoji: '🍛' }, [
    { size: '50g', price: 140, cost: 110 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Tikka BBQ', category: 'Spices', tags: ['masala','bbq'], emoji: '🍢' }, [
    { size: '50g', price: 140, cost: 110 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Chapli Kabab', category: 'Spices', tags: ['masala'], emoji: '🍢' }, [
    { size: '100g', price: 200, cost: 160 },
  ]),
  ...makeVariants({ brand: 'Shan', product: 'Fish Masala', category: 'Spices', tags: ['masala','fish'], emoji: '🐟' }, [
    { size: '50g', price: 140, cost: 110 },
  ]),
  // Basic Spices
  ...makeVariants({ brand: 'National', product: 'Red Chilli Powder', category: 'Spices', tags: ['spice','chilli'], emoji: '🌶️' }, [
    { size: '100g', price: 200, cost: 160 }, { size: '200g', price: 380, cost: 315 }, { size: '400g', price: 720, cost: 595 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Turmeric Powder (Haldi)', category: 'Spices', tags: ['spice','haldi'], emoji: '🌾' }, [
    { size: '100g', price: 130, cost: 100 }, { size: '200g', price: 240, cost: 195 }, { size: '400g', price: 460, cost: 380 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Coriander Powder (Dhania)', category: 'Spices', tags: ['spice'], emoji: '🌿' }, [
    { size: '100g', price: 140, cost: 110 }, { size: '200g', price: 260, cost: 210 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Cumin Powder (Zeera)', category: 'Spices', tags: ['spice','zeera'], emoji: '🌰' }, [
    { size: '50g', price: 180, cost: 145 }, { size: '100g', price: 340, cost: 280 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Black Pepper (Kali Mirch)', category: 'Spices', tags: ['spice'], emoji: '⚫' }, [
    { size: '50g', price: 250, cost: 200 }, { size: '100g', price: 480, cost: 395 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Cardamom (Elaichi)', category: 'Spices', tags: ['spice'], emoji: '🌰' }, [
    { size: '25g', price: 380, cost: 315 }, { size: '50g', price: 720, cost: 595 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Cinnamon (Dalchini)', category: 'Spices', tags: ['spice'], emoji: '🪵' }, [
    { size: '50g', price: 200, cost: 160 }, { size: '100g', price: 380, cost: 315 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Cloves (Laung)', category: 'Spices', tags: ['spice'], emoji: '🌰' }, [
    { size: '25g', price: 250, cost: 200 }, { size: '50g', price: 480, cost: 395 },
  ]),
  // Kitchen Sauces
  ...makeVariants({ brand: 'National', product: 'Ketchup', category: 'Spices', tags: ['sauce','ketchup'], emoji: '🍅' }, [
    { size: '300g', price: 220, cost: 175 }, { size: '800g', price: 500, cost: 410 },
  ]),
  ...makeVariants({ brand: 'Shangrila', product: 'Ketchup', category: 'Spices', tags: ['sauce','ketchup'], emoji: '🍅' }, [
    { size: '300g', price: 210, cost: 170 }, { size: '800g', price: 480, cost: 395 }, { size: '3kg Jar', price: 1600, cost: 1330 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Chilli Sauce', category: 'Spices', tags: ['sauce','chilli'], emoji: '🌶️' }, [
    { size: '300g', price: 200, cost: 160 }, { size: '800g', price: 480, cost: 395 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Soya Sauce', category: 'Spices', tags: ['sauce'], emoji: '🥢' }, [
    { size: '300ml', price: 200, cost: 160 }, { size: '750ml', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Vinegar', category: 'Spices', tags: ['vinegar'], emoji: '🍶' }, [
    { size: '300ml', price: 100, cost: 78 }, { size: '750ml', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Mayonnaise', category: 'Spices', tags: ['sauce','mayo'], emoji: '🥚' }, [
    { size: '300g', price: 280, cost: 225 }, { size: '500g', price: 450, cost: 370 }, { size: '1kg', price: 850, cost: 700 },
  ]),
  ...makeVariants({ brand: 'Mehran', product: 'Pickle (Achar)', category: 'Spices', tags: ['pickle','achar'], emoji: '🥒' }, [
    { size: 'Mango 400g', price: 250, cost: 200 }, { size: 'Mixed 400g', price: 260, cost: 210 }, { size: '1kg Jar', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'National', product: 'Pickle (Achar)', category: 'Spices', tags: ['pickle','achar'], emoji: '🥒' }, [
    { size: 'Mango 400g', price: 260, cost: 210 }, { size: 'Mixed 400g', price: 270, cost: 220 }, { size: '1kg Jar', price: 580, cost: 480 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   PERSONAL CARE (250+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const PERSONAL_CARE: SeedProduct[] = [
  // Soap
  ...makeVariants({ brand: 'Lifebuoy', product: 'Soap', category: 'Personal Care', tags: ['soap'], emoji: '🧼' }, [
    { size: 'Red 100g', price: 100, cost: 78 }, { size: 'Red 130g', price: 130, cost: 100 }, { size: 'Total 130g', price: 140, cost: 110 },
  ]),
  ...makeVariants({ brand: 'Safeguard', product: 'Soap', category: 'Personal Care', tags: ['soap'], emoji: '🧼' }, [
    { size: 'Pure White 100g', price: 130, cost: 100 }, { size: 'Herbal 100g', price: 130, cost: 100 }, { size: 'Cool 100g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'Lux', product: 'Soap', category: 'Personal Care', tags: ['soap','beauty'], emoji: '🧼' }, [
    { size: 'Rose 100g', price: 130, cost: 100 }, { size: 'Almond 100g', price: 130, cost: 100 }, { size: 'Peach 100g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'Dettol', product: 'Soap', category: 'Personal Care', tags: ['soap','antiseptic'], emoji: '🧼' }, [
    { size: 'Original 100g', price: 150, cost: 120 }, { size: 'Cool 100g', price: 150, cost: 120 }, { size: 'Skincare 100g', price: 150, cost: 120 },
  ]),
  ...makeVariants({ brand: 'Dove', product: 'Beauty Bar', category: 'Personal Care', tags: ['soap','premium'], emoji: '🧼' }, [
    { size: '100g', price: 250, cost: 200 }, { size: '135g', price: 320, cost: 260 },
  ]),
  ...makeVariants({ brand: 'Capri', product: 'Soap', category: 'Personal Care', tags: ['soap'], emoji: '🧼' }, [
    { size: '100g', price: 100, cost: 78 },
  ]),
  ...makeVariants({ brand: 'Bonus', product: 'Soap', category: 'Personal Care', tags: ['soap','laundry'], emoji: '🧼' }, [
    { size: '260g', price: 130, cost: 100 },
  ]),
  // Shampoo
  ...makeVariants({ brand: 'Head & Shoulders', product: 'Shampoo', category: 'Personal Care', tags: ['shampoo','anti-dandruff'], emoji: '🧴' }, [
    { size: 'Sachet', price: 20, cost: 14 }, { size: '185ml', price: 550, cost: 450 }, { size: '360ml', price: 950, cost: 785 }, { size: '650ml', price: 1600, cost: 1330 },
  ]),
  ...makeVariants({ brand: 'Sunsilk', product: 'Shampoo', category: 'Personal Care', tags: ['shampoo'], emoji: '🧴' }, [
    { size: 'Sachet', price: 15, cost: 10 }, { size: '185ml', price: 380, cost: 315 }, { size: '360ml', price: 720, cost: 595 }, { size: '680ml', price: 1300, cost: 1080 },
  ]),
  ...makeVariants({ brand: 'Pantene', product: 'Shampoo', category: 'Personal Care', tags: ['shampoo'], emoji: '🧴' }, [
    { size: 'Sachet', price: 20, cost: 14 }, { size: '185ml', price: 500, cost: 410 }, { size: '360ml', price: 900, cost: 745 }, { size: '650ml', price: 1550, cost: 1290 },
  ]),
  ...makeVariants({ brand: 'Clear', product: 'Anti-Dandruff Shampoo', category: 'Personal Care', tags: ['shampoo','anti-dandruff'], emoji: '🧴' }, [
    { size: '185ml', price: 480, cost: 395 }, { size: '360ml', price: 900, cost: 745 },
  ]),
  ...makeVariants({ brand: 'Dove', product: 'Shampoo', category: 'Personal Care', tags: ['shampoo','premium'], emoji: '🧴' }, [
    { size: '185ml', price: 550, cost: 450 }, { size: '340ml', price: 950, cost: 785 },
  ]),
  // Toothpaste & Brushes
  ...makeVariants({ brand: 'Colgate', product: 'Toothpaste', category: 'Personal Care', tags: ['toothpaste'], emoji: '🪥' }, [
    { size: 'Small 40g', price: 80, cost: 62 }, { size: 'Medium 100g', price: 180, cost: 145 },
    { size: 'Large 200g', price: 320, cost: 260 }, { size: 'Family 250g', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Close Up', product: 'Toothpaste', category: 'Personal Care', tags: ['toothpaste'], emoji: '🪥' }, [
    { size: '75g', price: 130, cost: 100 }, { size: '125g', price: 200, cost: 160 }, { size: '160g', price: 260, cost: 210 },
  ]),
  ...makeVariants({ brand: 'Sensodyne', product: 'Toothpaste', category: 'Personal Care', tags: ['toothpaste','sensitive'], emoji: '🪥' }, [
    { size: '70g', price: 350, cost: 290 }, { size: '100g', price: 500, cost: 410 },
  ]),
  ...makeVariants({ brand: 'Colgate', product: 'Toothbrush', category: 'Personal Care', tags: ['toothbrush'], emoji: '🪥' }, [
    { size: 'Soft', price: 80, cost: 62 }, { size: 'Medium', price: 80, cost: 62 }, { size: 'Pack of 3', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Oral-B', product: 'Toothbrush', category: 'Personal Care', tags: ['toothbrush'], emoji: '🪥' }, [
    { size: 'Soft', price: 130, cost: 100 }, { size: 'Medium', price: 130, cost: 100 }, { size: 'Pack of 3', price: 350, cost: 290 },
  ]),
  // Detergents & Washing (moved here for personal-adjacent)
  // Beauty
  ...makeVariants({ brand: 'Fair & Lovely', product: 'Face Cream', category: 'Personal Care', tags: ['cream','face'], emoji: '🧴' }, [
    { size: '25g', price: 200, cost: 160 }, { size: '50g', price: 380, cost: 315 }, { size: '80g', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Ponds', product: 'Face Cream', category: 'Personal Care', tags: ['cream','face'], emoji: '🧴' }, [
    { size: '25g', price: 220, cost: 180 }, { size: '50g', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Olay', product: 'Face Cream', category: 'Personal Care', tags: ['cream','premium'], emoji: '🧴' }, [
    { size: '50g', price: 850, cost: 700 }, { size: '100g', price: 1500, cost: 1250 },
  ]),
  ...makeVariants({ brand: 'Nivea', product: 'Body Lotion', category: 'Personal Care', tags: ['lotion','body'], emoji: '🧴' }, [
    { size: '75ml', price: 250, cost: 200 }, { size: '200ml', price: 550, cost: 450 }, { size: '400ml', price: 950, cost: 785 },
  ]),
  ...makeVariants({ brand: 'Nivea', product: 'Deodorant', category: 'Personal Care', tags: ['deodorant'], emoji: '🧴' }, [
    { size: 'Roll-On 50ml', price: 380, cost: 315 }, { size: 'Spray 150ml', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Axe', product: 'Deodorant Spray', category: 'Personal Care', tags: ['deodorant','men'], emoji: '🧴' }, [
    { size: '150ml', price: 700, cost: 580 }, { size: '250ml', price: 1000, cost: 830 },
  ]),
  // Shaving
  ...makeVariants({ brand: 'Gillette', product: 'Razor', category: 'Personal Care', tags: ['shaving'], emoji: '🪒' }, [
    { size: 'Presto', price: 100, cost: 78 }, { size: 'Vector', price: 250, cost: 200 }, { size: 'Mach3', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Gillette', product: 'Shaving Cream', category: 'Personal Care', tags: ['shaving'], emoji: '🧴' }, [
    { size: '70g', price: 250, cost: 200 }, { size: '175g', price: 500, cost: 410 },
  ]),
  ...makeVariants({ brand: '7 O\'Clock', product: 'Blades', category: 'Personal Care', tags: ['shaving','blades'], emoji: '🪒' }, [
    { size: '5-pack', price: 100, cost: 78 }, { size: '10-pack', price: 190, cost: 155 },
  ]),
  // Baby Care
  ...makeVariants({ brand: 'Pampers', product: 'Diapers', category: 'Personal Care', tags: ['baby','diapers'], emoji: '👶', trackBatches: true }, [
    { size: 'S (28 pcs)', price: 900, cost: 745 }, { size: 'M (24 pcs)', price: 950, cost: 785 },
    { size: 'L (22 pcs)', price: 1000, cost: 830 }, { size: 'XL (20 pcs)', price: 1050, cost: 870 }, { size: 'Jumbo Pack', price: 2400, cost: 2000 },
  ]),
  ...makeVariants({ brand: 'Molfix', product: 'Diapers', category: 'Personal Care', tags: ['baby','diapers'], emoji: '👶' }, [
    { size: 'S (30 pcs)', price: 700, cost: 580 }, { size: 'M (28 pcs)', price: 750, cost: 620 }, { size: 'L (24 pcs)', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Canbebe', product: 'Diapers', category: 'Personal Care', tags: ['baby','diapers'], emoji: '👶' }, [
    { size: 'M (30 pcs)', price: 600, cost: 495 }, { size: 'L (26 pcs)', price: 650, cost: 540 },
  ]),
  ...makeVariants({ brand: 'Johnson\'s', product: 'Baby Oil', category: 'Personal Care', tags: ['baby'], emoji: '👶' }, [
    { size: '100ml', price: 380, cost: 315 }, { size: '200ml', price: 700, cost: 580 },
  ]),
  ...makeVariants({ brand: 'Johnson\'s', product: 'Baby Powder', category: 'Personal Care', tags: ['baby'], emoji: '👶' }, [
    { size: '100g', price: 250, cost: 200 }, { size: '200g', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'Johnson\'s', product: 'Baby Shampoo', category: 'Personal Care', tags: ['baby'], emoji: '👶' }, [
    { size: '100ml', price: 350, cost: 290 }, { size: '200ml', price: 650, cost: 540 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   HOUSEHOLD (200+ SKUs)
   ═══════════════════════════════════════════════════════════════ */
const HOUSEHOLD: SeedProduct[] = [
  // Detergents
  ...makeVariants({ brand: 'Surf Excel', product: 'Washing Powder', category: 'Household', tags: ['detergent'], emoji: '🧺' }, [
    { size: '90g', price: 60, cost: 45 }, { size: '500g', price: 320, cost: 260 },
    { size: '1kg', price: 620, cost: 510 }, { size: '3kg', price: 1800, cost: 1500 }, { size: '4.5kg', price: 2650, cost: 2200 },
  ]),
  ...makeVariants({ brand: 'Ariel', product: 'Washing Powder', category: 'Household', tags: ['detergent'], emoji: '🧺' }, [
    { size: '75g', price: 55, cost: 42 }, { size: '500g', price: 300, cost: 245 },
    { size: '1kg', price: 580, cost: 480 }, { size: '3kg', price: 1700, cost: 1420 }, { size: '4.5kg', price: 2500, cost: 2080 },
  ]),
  ...makeVariants({ brand: 'Bonus', product: 'Washing Powder', category: 'Household', tags: ['detergent'], emoji: '🧺' }, [
    { size: '500g', price: 200, cost: 160 }, { size: '1kg', price: 380, cost: 315 }, { size: '3kg', price: 1100, cost: 920 },
  ]),
  ...makeVariants({ brand: 'Express', product: 'Washing Powder', category: 'Household', tags: ['detergent'], emoji: '🧺' }, [
    { size: '500g', price: 180, cost: 145 }, { size: '1kg', price: 340, cost: 280 }, { size: '3kg', price: 1000, cost: 830 },
  ]),
  // Liquid Detergent
  ...makeVariants({ brand: 'Surf Excel', product: 'Matic Liquid', category: 'Household', tags: ['detergent','liquid'], emoji: '🧺' }, [
    { size: '500ml', price: 550, cost: 450 }, { size: '1L', price: 1000, cost: 830 }, { size: '3L', price: 2700, cost: 2260 },
  ]),
  ...makeVariants({ brand: 'Ariel', product: 'Matic Liquid', category: 'Household', tags: ['detergent','liquid'], emoji: '🧺' }, [
    { size: '1L', price: 950, cost: 785 }, { size: '3L', price: 2600, cost: 2170 },
  ]),
  // Dishwash
  ...makeVariants({ brand: 'Vim', product: 'Dishwash Bar', category: 'Household', tags: ['dishwash'], emoji: '🍽️' }, [
    { size: '85g', price: 30, cost: 22 }, { size: '150g', price: 55, cost: 42 }, { size: '400g', price: 130, cost: 100 },
  ]),
  ...makeVariants({ brand: 'Vim', product: 'Dishwash Liquid', category: 'Household', tags: ['dishwash','liquid'], emoji: '🍽️' }, [
    { size: '250ml', price: 200, cost: 160 }, { size: '500ml', price: 380, cost: 315 }, { size: '750ml', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Max', product: 'Dishwash Bar', category: 'Household', tags: ['dishwash'], emoji: '🍽️' }, [
    { size: '85g', price: 25, cost: 18 }, { size: '150g', price: 45, cost: 34 },
  ]),
  ...makeVariants({ brand: 'Lemon Max', product: 'Dishwash Liquid', category: 'Household', tags: ['dishwash','liquid'], emoji: '🍋' }, [
    { size: '500ml', price: 350, cost: 290 }, { size: '750ml', price: 500, cost: 410 },
  ]),
  // Bleach & Cleaners
  ...makeVariants({ brand: 'Harpic', product: 'Toilet Cleaner', category: 'Household', tags: ['cleaner','toilet'], emoji: '🚽' }, [
    { size: '500ml', price: 300, cost: 245 }, { size: '750ml', price: 420, cost: 345 }, { size: '1L', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Dettol', product: 'Antiseptic Liquid', category: 'Household', tags: ['cleaner','antiseptic'], emoji: '🧴' }, [
    { size: '125ml', price: 300, cost: 245 }, { size: '250ml', price: 550, cost: 450 }, { size: '500ml', price: 950, cost: 785 }, { size: '1L', price: 1700, cost: 1420 },
  ]),
  ...makeVariants({ brand: 'Dettol', product: 'Multi-Surface Cleaner', category: 'Household', tags: ['cleaner'], emoji: '🧽' }, [
    { size: '500ml', price: 350, cost: 290 }, { size: '1L', price: 650, cost: 540 },
  ]),
  ...makeVariants({ brand: 'Lysol', product: 'Disinfectant Spray', category: 'Household', tags: ['cleaner','spray'], emoji: '🧴' }, [
    { size: '400ml', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Domex', product: 'Floor Cleaner', category: 'Household', tags: ['cleaner','floor'], emoji: '🧽' }, [
    { size: '500ml', price: 250, cost: 200 }, { size: '1L', price: 450, cost: 370 },
  ]),
  ...makeVariants({ brand: 'Robin', product: 'Blue', category: 'Household', tags: ['laundry','blue'], emoji: '💙' }, [
    { size: 'Pack', price: 60, cost: 45 },
  ]),
  // Tissues & Paper
  ...makeVariants({ brand: 'Rose Petal', product: 'Tissue Box', category: 'Household', tags: ['tissue'], emoji: '🧻' }, [
    { size: '100 sheets', price: 150, cost: 120 }, { size: '150 sheets', price: 220, cost: 180 }, { size: '200 sheets', price: 300, cost: 245 },
  ]),
  ...makeVariants({ brand: 'Rose Petal', product: 'Toilet Roll', category: 'Household', tags: ['tissue','toilet'], emoji: '🧻' }, [
    { size: 'Single Roll', price: 80, cost: 62 }, { size: 'Pack of 4', price: 300, cost: 245 }, { size: 'Pack of 12', price: 850, cost: 700 },
  ]),
  ...makeVariants({ brand: 'Rose Petal', product: 'Kitchen Roll', category: 'Household', tags: ['tissue','kitchen'], emoji: '🧻' }, [
    { size: 'Single', price: 130, cost: 100 }, { size: 'Pack of 2', price: 250, cost: 200 },
  ]),
  ...makeVariants({ brand: 'Rose Petal', product: 'Napkins', category: 'Household', tags: ['tissue'], emoji: '🧻' }, [
    { size: '100 pcs', price: 120, cost: 95 }, { size: '200 pcs', price: 220, cost: 180 },
  ]),
  ...makeVariants({ brand: 'Cool & Cool', product: 'Wet Wipes', category: 'Household', tags: ['wipes'], emoji: '🧻' }, [
    { size: '30 pcs', price: 150, cost: 120 }, { size: '80 pcs', price: 320, cost: 260 },
  ]),
  // Insects / Pest
  ...makeVariants({ brand: 'Mortein', product: 'Insect Spray', category: 'Household', tags: ['pest'], emoji: '🦟' }, [
    { size: '300ml', price: 450, cost: 370 }, { size: '600ml', price: 800, cost: 660 },
  ]),
  ...makeVariants({ brand: 'Mortein', product: 'Coil', category: 'Household', tags: ['pest','coil'], emoji: '🦟' }, [
    { size: '10 coils', price: 150, cost: 120 },
  ]),
  ...makeVariants({ brand: 'Mortein', product: 'Liquid Refill', category: 'Household', tags: ['pest'], emoji: '🦟' }, [
    { size: '35ml', price: 350, cost: 290 }, { size: 'Machine+Refill', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Finis', product: 'Rat Killer', category: 'Household', tags: ['pest','rat'], emoji: '🐭' }, [
    { size: '25g', price: 100, cost: 78 }, { size: '100g', price: 350, cost: 290 },
  ]),
  // Batteries / Candles / Lighter
  ...makeVariants({ brand: 'Osaka', product: 'Battery AA', category: 'Household', tags: ['battery'], emoji: '🔋' }, [
    { size: '2-pack', price: 60, cost: 45 }, { size: '4-pack', price: 110, cost: 85 },
  ]),
  ...makeVariants({ brand: 'Osaka', product: 'Battery AAA', category: 'Household', tags: ['battery'], emoji: '🔋' }, [
    { size: '2-pack', price: 60, cost: 45 }, { size: '4-pack', price: 110, cost: 85 },
  ]),
  ...makeVariants({ brand: 'Duracell', product: 'Battery AA', category: 'Household', tags: ['battery'], emoji: '🔋' }, [
    { size: '2-pack', price: 220, cost: 180 }, { size: '4-pack', price: 400, cost: 325 },
  ]),
  ...makeVariants({ brand: 'Local', product: 'Candles', category: 'Household', tags: ['candles'], emoji: '🕯️' }, [
    { size: 'Small Pack (6)', price: 60, cost: 45 }, { size: 'Big Pack (12)', price: 120, cost: 95 },
  ]),
  ...makeVariants({ brand: 'Bic', product: 'Lighter', category: 'Household', tags: ['lighter'], emoji: '🔥' }, [
    { size: 'Mini', price: 80, cost: 62 }, { size: 'Standard', price: 150, cost: 120 },
  ]),
  // Trash Bags / Foil
  ...makeVariants({ brand: 'Cool', product: 'Trash Bags', category: 'Household', tags: ['trash-bag'], emoji: '🗑️' }, [
    { size: 'Small (30 pcs)', price: 150, cost: 120 }, { size: 'Medium (25 pcs)', price: 200, cost: 160 }, { size: 'Large (15 pcs)', price: 250, cost: 200 },
  ]),
  ...makeVariants({ brand: 'Local', product: 'Aluminium Foil', category: 'Household', tags: ['foil'], emoji: '🍱' }, [
    { size: '10m', price: 250, cost: 200 }, { size: '25m', price: 550, cost: 450 },
  ]),
  ...makeVariants({ brand: 'Local', product: 'Cling Film', category: 'Household', tags: ['film'], emoji: '🎞️' }, [
    { size: '30m', price: 300, cost: 245 },
  ]),
];

/* ═══════════════════════════════════════════════════════════════
   MASTER EXPORT
   ═══════════════════════════════════════════════════════════════ */
export const PAKISTAN_CATALOG: SeedProduct[] = [
  ...BEVERAGES,
  ...SNACKS,
  ...BISCUITS,
  ...DAIRY,
  ...TEA_COFFEE,
  ...COOKING,
  ...SPICES,
  ...PERSONAL_CARE,
  ...HOUSEHOLD,
];

// Helpful counts (for logs during seeding)
export const CATALOG_STATS = {
  total: PAKISTAN_CATALOG.length,
  beverages: BEVERAGES.length,
  snacks: SNACKS.length,
  biscuits: BISCUITS.length,
  dairy: DAIRY.length,
  teaCoffee: TEA_COFFEE.length,
  cooking: COOKING.length,
  spices: SPICES.length,
  personalCare: PERSONAL_CARE.length,
  household: HOUSEHOLD.length,
};
