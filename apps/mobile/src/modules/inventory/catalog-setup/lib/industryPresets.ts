/**
 * Industry-specific presets for Categories, Brands, and Tags.
 *
 * Each industry contributes suggested items that appear as "Quick Add"
 * buttons in the Categories/Brands/Tags pages. Clients can click to add
 * with one tap, or edit freely.
 *
 * Adding a new industry? Just add its section here and it auto-appears
 * for that tenant.
 */

export interface CategoryPreset {
  name: string;
  color: string;
  icon?: string;
  description?: string;
}

export interface BrandPreset {
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
}

export interface TagPreset {
  name: string;
  color: string;
}

export interface IndustryPresets {
  categories: CategoryPreset[];
  brands: BrandPreset[];
  tags: TagPreset[];
}

// ═══════════════════════════════════════════════════════════════
// 🧶 CARPET
// ═══════════════════════════════════════════════════════════════
export const CARPET_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Persian Carpets', color: '#8b5cf6' },
    { name: 'Machine Made', color: '#3b82f6' },
    { name: 'Handmade', color: '#f59e0b' },
    { name: 'Wool Carpets', color: '#10b981' },
    { name: 'Silk Carpets', color: '#ec4899' },
    { name: 'Wall to Wall', color: '#06b6d4' },
    { name: 'Prayer Mats', color: '#84cc16' },
    { name: 'Runners', color: '#f97316' },
    { name: 'Rugs', color: '#a855f7' },
    { name: 'Underlay & Foam', color: '#64748b' },
  ],
  brands: [
    { name: 'Al-Karam Carpets', description: 'Premium Pakistani carpet manufacturer' },
    { name: 'Master Carpets', description: 'Traditional Persian designs' },
    { name: 'Sun Fibre', description: 'Machine-made carpet specialist' },
    { name: 'Kaleen', description: 'Turkish imported carpets' },
    { name: 'Shahnawaz Carpets', description: 'Handmade Multan carpets' },
    { name: 'Faisal Carpets', description: 'Wholesale carpet supplier' },
    { name: 'Royal Carpets', description: 'Luxury silk carpets' },
    { name: 'Ideal Carpets', description: 'Budget-friendly range' },
  ],
  tags: [
    { name: 'Handmade', color: '#f59e0b' },
    { name: 'Machine Made', color: '#3b82f6' },
    { name: 'Pure Wool', color: '#10b981' },
    { name: 'Silk Blend', color: '#ec4899' },
    { name: 'Anti-Slip', color: '#06b6d4' },
    { name: 'Water Resistant', color: '#0ea5e9' },
    { name: 'Fire Retardant', color: '#ef4444' },
    { name: 'Custom Size', color: '#8b5cf6' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Export Quality', color: '#a855f7' },
    { name: 'Made in Pakistan', color: '#16a34a' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE / ELECTRONICS
// ═══════════════════════════════════════════════════════════════
export const MOBILE_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Smartphones', color: '#3b82f6' },
    { name: 'Feature Phones', color: '#64748b' },
    { name: 'Tablets', color: '#8b5cf6' },
    { name: 'Smartwatches', color: '#06b6d4' },
    { name: 'Earbuds & Headphones', color: '#ec4899' },
    { name: 'Chargers & Cables', color: '#f59e0b' },
    { name: 'Power Banks', color: '#10b981' },
    { name: 'Mobile Cases', color: '#a855f7' },
    { name: 'Screen Protectors', color: '#0ea5e9' },
    { name: 'Memory Cards', color: '#84cc16' },
    { name: 'Sim Cards', color: '#ef4444' },
    { name: 'Spare Parts', color: '#f97316' },
    { name: 'Used Phones', color: '#78716c' },
  ],
  brands: [
    { name: 'Samsung', description: 'Korean electronics giant', website: 'https://www.samsung.com' },
    { name: 'Apple', description: 'iPhone, iPad, MacBook', website: 'https://www.apple.com' },
    { name: 'Xiaomi', description: 'Redmi, Mi series', website: 'https://www.mi.com' },
    { name: 'OPPO', description: 'Camera-focused smartphones', website: 'https://www.oppo.com' },
    { name: 'Vivo', description: 'Y series, V series', website: 'https://www.vivo.com' },
    { name: 'Infinix', description: 'Budget smartphones', website: 'https://www.infinixmobility.com' },
    { name: 'Tecno', description: 'Camon, Spark series', website: 'https://www.tecno-mobile.com' },
    { name: 'Realme', description: 'Youth-focused brand', website: 'https://www.realme.com' },
    { name: 'Huawei', description: 'Nova, Y series', website: 'https://www.huawei.com' },
    { name: 'OnePlus', description: 'Premium performance', website: 'https://www.oneplus.com' },
    { name: 'Nokia', description: 'HMD Global', website: 'https://www.nokia.com' },
    { name: 'Google', description: 'Pixel phones', website: 'https://store.google.com' },
    { name: 'Motorola', description: 'Moto series', website: 'https://www.motorola.com' },
    { name: 'QMobile', description: 'Local Pakistan brand' },
    { name: 'Itel', description: 'Budget African market brand' },
  ],
  tags: [
    { name: 'PTA Approved', color: '#10b981' },
    { name: 'Non-PTA', color: '#ef4444' },
    { name: 'PTA Patched', color: '#f59e0b' },
    { name: 'Brand New', color: '#3b82f6' },
    { name: 'Used', color: '#78716c' },
    { name: 'Refurbished', color: '#a855f7' },
    { name: 'Warranty Included', color: '#0ea5e9' },
    { name: '5G', color: '#8b5cf6' },
    { name: 'Gaming Phone', color: '#ec4899' },
    { name: 'Camera Focus', color: '#f97316' },
    { name: 'Fast Charging', color: '#eab308' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'EMI Available', color: '#14b8a6' },
    { name: 'Imported', color: '#a855f7' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🍽️ RESTAURANT / CAFE / BAKERY
// ═══════════════════════════════════════════════════════════════
export const RESTAURANT_PRESETS: IndustryPresets = {
  categories: [
    { name: 'BBQ & Grill', color: '#ef4444' },
    { name: 'Biryani & Rice', color: '#f59e0b' },
    { name: 'Karahi & Handi', color: '#f97316' },
    { name: 'Chinese', color: '#dc2626' },
    { name: 'Fast Food', color: '#eab308' },
    { name: 'Burgers', color: '#f97316' },
    { name: 'Pizza', color: '#dc2626' },
    { name: 'Sandwiches', color: '#84cc16' },
    { name: 'Rolls & Wraps', color: '#f59e0b' },
    { name: 'Nashta (Breakfast)', color: '#eab308' },
    { name: 'Desi Food', color: '#dc2626' },
    { name: 'Continental', color: '#8b5cf6' },
    { name: 'Seafood', color: '#06b6d4' },
    { name: 'Soups', color: '#f97316' },
    { name: 'Salads', color: '#22c55e' },
    { name: 'Desserts', color: '#ec4899' },
    { name: 'Ice Cream', color: '#a855f7' },
    { name: 'Cold Drinks', color: '#0ea5e9' },
    { name: 'Hot Drinks (Tea/Coffee)', color: '#78350f' },
    { name: 'Shakes & Smoothies', color: '#ec4899' },
    { name: 'Juices', color: '#f97316' },
    { name: 'Bakery Items', color: '#f59e0b' },
    { name: 'Cakes & Pastries', color: '#ec4899' },
    { name: 'Bread & Rusks', color: '#78716c' },
  ],
  brands: [
    { name: 'Coca-Cola', description: 'Beverages brand', website: 'https://www.coca-cola.com' },
    { name: 'Pepsi', description: 'Cola drinks', website: 'https://www.pepsi.com' },
    { name: 'Nestle', description: 'Food & beverages', website: 'https://www.nestle.com' },
    { name: 'Unilever', description: 'Consumer goods', website: 'https://www.unilever.com' },
    { name: 'National Foods', description: 'Pakistani food brand' },
    { name: 'Shan Foods', description: 'Spices and mixes' },
    { name: 'MilkPak', description: 'Nestle dairy' },
    { name: 'Olpers', description: 'Engro dairy' },
    { name: 'Tarang', description: 'Engro dairy whitener' },
    { name: 'Tapal', description: 'Tea brand' },
    { name: 'Lipton', description: 'Tea brand' },
    { name: 'Rooh Afza', description: 'Hamdard beverages' },
  ],
  tags: [
    { name: 'Chef Special', color: '#f59e0b' },
    { name: 'Best Seller', color: '#10b981' },
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Spicy 🌶️', color: '#ef4444' },
    { name: 'Extra Spicy 🔥', color: '#dc2626' },
    { name: 'Mild', color: '#eab308' },
    { name: 'Vegetarian', color: '#22c55e' },
    { name: 'Halal', color: '#10b981' },
    { name: 'Gluten Free', color: '#f59e0b' },
    { name: 'Dairy Free', color: '#3b82f6' },
    { name: 'Nut Free', color: '#f97316' },
    { name: 'Contains Egg', color: '#f59e0b' },
    { name: 'Beef', color: '#dc2626' },
    { name: 'Chicken', color: '#f97316' },
    { name: 'Mutton', color: '#ef4444' },
    { name: 'Seafood', color: '#06b6d4' },
    { name: 'Deal', color: '#f97316' },
    { name: 'Family Pack', color: '#8b5cf6' },
    { name: 'Kids Menu', color: '#ec4899' },
    { name: 'Ramzan Special', color: '#a855f7' },
    { name: 'Combo', color: '#14b8a6' },
    { name: 'Weekend Special', color: '#f59e0b' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💎 JEWELRY
// ═══════════════════════════════════════════════════════════════
export const JEWELRY_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Gold Jewelry', color: '#eab308' },
    { name: 'Silver Jewelry', color: '#94a3b8' },
    { name: 'Diamond Jewelry', color: '#e2e8f0' },
    { name: 'Rings', color: '#f59e0b' },
    { name: 'Necklaces', color: '#eab308' },
    { name: 'Earrings', color: '#f97316' },
    { name: 'Bangles', color: '#f59e0b' },
    { name: 'Bracelets', color: '#a855f7' },
    { name: 'Chains', color: '#eab308' },
    { name: 'Pendants', color: '#ec4899' },
    { name: 'Anklets', color: '#94a3b8' },
    { name: 'Nose Pins', color: '#f97316' },
    { name: 'Bridal Sets', color: '#dc2626' },
    { name: 'Kids Jewelry', color: '#ec4899' },
    { name: 'Mens Jewelry', color: '#475569' },
    { name: 'Artificial Jewelry', color: '#a855f7' },
    { name: 'Gemstones', color: '#8b5cf6' },
    { name: 'Coins & Bullion', color: '#eab308' },
    { name: 'Watches', color: '#78716c' },
  ],
  brands: [
    { name: 'Damas', description: 'Middle Eastern luxury jeweler' },
    { name: 'Malabar Gold', description: 'Indian gold specialist' },
    { name: 'Tanishq', description: 'Titan Company Ltd' },
    { name: 'Argos Jewellers', description: 'Pakistan-based jeweler' },
    { name: 'Hafeez Centre', description: 'Lahore jewelry hub' },
    { name: 'Sarafa Bazaar', description: 'Traditional gold market' },
    { name: 'Pandora', description: 'Charm bracelets specialist' },
    { name: 'Cartier', description: 'French luxury brand' },
    { name: 'Tiffany & Co', description: 'American luxury jeweler' },
    { name: 'Swarovski', description: 'Austrian crystal brand' },
  ],
  tags: [
    { name: '24K Gold', color: '#eab308' },
    { name: '22K Gold', color: '#f59e0b' },
    { name: '21K Gold', color: '#f97316' },
    { name: '18K Gold', color: '#fbbf24' },
    { name: 'Hallmarked', color: '#10b981' },
    { name: 'BIS Certified', color: '#3b82f6' },
    { name: 'Handmade', color: '#a855f7' },
    { name: 'Antique Design', color: '#78350f' },
    { name: 'Modern Design', color: '#0ea5e9' },
    { name: 'Traditional', color: '#dc2626' },
    { name: 'Bridal', color: '#ec4899' },
    { name: 'Party Wear', color: '#8b5cf6' },
    { name: 'Daily Wear', color: '#22c55e' },
    { name: 'Custom Made', color: '#f97316' },
    { name: 'Diamond Certified', color: '#e2e8f0' },
    { name: 'Kundan Work', color: '#f59e0b' },
    { name: 'Polki Work', color: '#eab308' },
    { name: 'Meenakari', color: '#ec4899' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🚗 AUTO PARTS
// ═══════════════════════════════════════════════════════════════
export const AUTOPARTS_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Engine Parts', color: '#ef4444' },
    { name: 'Brakes', color: '#f59e0b' },
    { name: 'Suspension', color: '#3b82f6' },
    { name: 'Electrical', color: '#eab308' },
    { name: 'Body Parts', color: '#8b5cf6' },
    { name: 'Interior', color: '#a855f7' },
    { name: 'Tyres & Wheels', color: '#78716c' },
    { name: 'Batteries', color: '#22c55e' },
    { name: 'Oils & Lubricants', color: '#f97316' },
    { name: 'Filters', color: '#06b6d4' },
    { name: 'Lights & Bulbs', color: '#eab308' },
    { name: 'Mirrors', color: '#94a3b8' },
    { name: 'Belts & Hoses', color: '#64748b' },
    { name: 'AC Parts', color: '#0ea5e9' },
    { name: 'Exhaust', color: '#78716c' },
    { name: 'Accessories', color: '#ec4899' },
    { name: 'Tools', color: '#f59e0b' },
  ],
  brands: [
    { name: 'Toyota Genuine', description: 'Toyota OEM parts' },
    { name: 'Honda Genuine', description: 'Honda OEM parts' },
    { name: 'Suzuki Genuine', description: 'Suzuki OEM parts' },
    { name: 'Denso', description: 'Japanese automotive supplier' },
    { name: 'Bosch', description: 'German automotive parts' },
    { name: 'NGK', description: 'Spark plugs & sensors' },
    { name: 'Michelin', description: 'Tyre manufacturer' },
    { name: 'Bridgestone', description: 'Tyre manufacturer' },
    { name: 'General Tyre', description: 'Pakistan tyre brand' },
    { name: 'Servis Tyres', description: 'Pakistan tyre brand' },
    { name: 'AGS Battery', description: 'Battery manufacturer' },
    { name: 'Exide', description: 'Battery brand' },
    { name: 'Volta', description: 'Battery brand' },
    { name: 'Shell', description: 'Motor oil' },
    { name: 'Total', description: 'Motor oil' },
    { name: 'Caltex', description: 'Motor oil' },
    { name: 'PSO', description: 'Pakistan State Oil' },
    { name: 'ZIC', description: 'Korean motor oil' },
  ],
  tags: [
    { name: 'OEM', color: '#10b981' },
    { name: 'Aftermarket', color: '#3b82f6' },
    { name: 'Genuine', color: '#22c55e' },
    { name: 'Imported', color: '#a855f7' },
    { name: 'Local', color: '#f59e0b' },
    { name: 'Japanese', color: '#dc2626' },
    { name: 'Korean', color: '#3b82f6' },
    { name: 'German', color: '#eab308' },
    { name: 'Chinese', color: '#ef4444' },
    { name: 'New', color: '#22c55e' },
    { name: 'Used', color: '#78716c' },
    { name: 'Refurbished', color: '#a855f7' },
    { name: 'Warranty', color: '#0ea5e9' },
    { name: 'Bestseller', color: '#f97316' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💊 PHARMACY
// ═══════════════════════════════════════════════════════════════
export const PHARMACY_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Prescription Medicines', color: '#3b82f6' },
    { name: 'OTC (Over-the-Counter)', color: '#22c55e' },
    { name: 'Antibiotics', color: '#ef4444' },
    { name: 'Pain Relief', color: '#f97316' },
    { name: 'Cough & Cold', color: '#06b6d4' },
    { name: 'Digestive Health', color: '#84cc16' },
    { name: 'Diabetes Care', color: '#8b5cf6' },
    { name: 'Blood Pressure', color: '#dc2626' },
    { name: 'Vitamins & Supplements', color: '#eab308' },
    { name: 'Baby Care', color: '#ec4899' },
    { name: 'Skin Care', color: '#f59e0b' },
    { name: 'Personal Care', color: '#a855f7' },
    { name: 'First Aid', color: '#ef4444' },
    { name: 'Surgical Items', color: '#94a3b8' },
    { name: 'Medical Devices', color: '#0ea5e9' },
    { name: 'Ayurvedic', color: '#16a34a' },
    { name: 'Homeopathic', color: '#0ea5e9' },
  ],
  brands: [
    { name: 'GSK', description: 'GlaxoSmithKline' },
    { name: 'Pfizer', description: 'American pharma giant' },
    { name: 'Novartis', description: 'Swiss pharma' },
    { name: 'Getz Pharma', description: 'Pakistani pharma leader' },
    { name: 'Hilton Pharma', description: 'Pakistani pharma' },
    { name: 'Searle', description: 'Pakistan pharmaceuticals' },
    { name: 'PharmEvo', description: 'Pakistani pharma' },
    { name: 'Abbott', description: 'American healthcare' },
    { name: 'Sanofi', description: 'French pharma' },
    { name: 'Bayer', description: 'German pharma' },
    { name: 'Bosch Pharma', description: 'Pakistani pharma' },
    { name: 'Ferozsons', description: 'Pakistani pharma' },
    { name: 'Highnoon', description: 'Pakistani pharma' },
    { name: 'Sami Pharma', description: 'Pakistani pharma' },
    { name: 'Hamdard', description: 'Herbal medicines' },
  ],
  tags: [
    { name: 'Prescription Required', color: '#ef4444' },
    { name: 'OTC', color: '#22c55e' },
    { name: 'Controlled', color: '#dc2626' },
    { name: 'Refrigerated', color: '#0ea5e9' },
    { name: 'Fast Moving', color: '#f97316' },
    { name: 'Life Saving', color: '#ef4444' },
    { name: 'Generic', color: '#3b82f6' },
    { name: 'Branded', color: '#8b5cf6' },
    { name: 'Imported', color: '#a855f7' },
    { name: 'Halal Certified', color: '#10b981' },
    { name: 'Sugar Free', color: '#22c55e' },
    { name: 'Steroid Free', color: '#84cc16' },
    { name: 'Expiring Soon', color: '#f59e0b' },
    { name: 'Bestseller', color: '#f97316' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 👗 GARMENTS / CLOTHING
// ═══════════════════════════════════════════════════════════════
export const GARMENTS_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Men\'s Clothing', color: '#3b82f6' },
    { name: 'Women\'s Clothing', color: '#ec4899' },
    { name: 'Kids Clothing', color: '#f59e0b' },
    { name: 'Shalwar Kameez', color: '#8b5cf6' },
    { name: 'Kurta & Kurti', color: '#a855f7' },
    { name: 'Shirts', color: '#0ea5e9' },
    { name: 'T-Shirts', color: '#f97316' },
    { name: 'Jeans', color: '#1e40af' },
    { name: 'Trousers', color: '#475569' },
    { name: 'Bridal Wear', color: '#dc2626' },
    { name: 'Party Wear', color: '#ec4899' },
    { name: 'Formal Wear', color: '#475569' },
    { name: 'Casual Wear', color: '#22c55e' },
    { name: 'Sportswear', color: '#ef4444' },
    { name: 'Undergarments', color: '#94a3b8' },
    { name: 'Nightwear', color: '#a855f7' },
    { name: 'Winter Wear', color: '#06b6d4' },
    { name: 'Summer Wear', color: '#eab308' },
    { name: 'Fabric (Uncut)', color: '#84cc16' },
    { name: 'Accessories', color: '#f97316' },
    { name: 'Shoes', color: '#78716c' },
    { name: 'Bags', color: '#a855f7' },
  ],
  brands: [
    { name: 'Khaadi', description: 'Pakistani fashion brand' },
    { name: 'Sapphire', description: 'Premium clothing' },
    { name: 'Gul Ahmed', description: 'Textile & fashion' },
    { name: 'Al-Karam Studio', description: 'Ready-to-wear' },
    { name: 'Nishat Linen', description: 'Fabric & clothing' },
    { name: 'Junaid Jamshed', description: 'J. brand' },
    { name: 'Bonanza Satrangi', description: 'Fashion brand' },
    { name: 'Alkaram', description: 'Textile giant' },
    { name: 'Maria B', description: 'Designer wear' },
    { name: 'HSY', description: 'Luxury designer' },
    { name: 'Sana Safinaz', description: 'Designer fashion' },
    { name: 'Nike', description: 'Sportswear', website: 'https://www.nike.com' },
    { name: 'Adidas', description: 'Sportswear', website: 'https://www.adidas.com' },
    { name: 'Levi\'s', description: 'Jeans specialist' },
    { name: 'Servis', description: 'Shoes brand' },
    { name: 'Bata', description: 'Shoes brand' },
    { name: 'Borjan', description: 'Shoes brand' },
  ],
  tags: [
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'Sale', color: '#ef4444' },
    { name: 'Premium', color: '#8b5cf6' },
    { name: 'Bridal Collection', color: '#dc2626' },
    { name: 'Eid Collection', color: '#eab308' },
    { name: 'Ramzan Special', color: '#a855f7' },
    { name: 'Winter Collection', color: '#0ea5e9' },
    { name: 'Summer Collection', color: '#f59e0b' },
    { name: 'Handmade', color: '#f97316' },
    { name: 'Embroidered', color: '#ec4899' },
    { name: 'Printed', color: '#8b5cf6' },
    { name: 'Plain', color: '#94a3b8' },
    { name: 'Stitched', color: '#22c55e' },
    { name: 'Unstitched', color: '#78716c' },
    { name: 'Export Quality', color: '#a855f7' },
    { name: 'Imported', color: '#3b82f6' },
    { name: 'Cotton', color: '#22c55e' },
    { name: 'Lawn', color: '#0ea5e9' },
    { name: 'Chiffon', color: '#ec4899' },
    { name: 'Silk', color: '#a855f7' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🔨 HARDWARE
// ═══════════════════════════════════════════════════════════════
export const HARDWARE_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Hand Tools', color: '#f59e0b' },
    { name: 'Power Tools', color: '#ef4444' },
    { name: 'Plumbing', color: '#0ea5e9' },
    { name: 'Electrical', color: '#eab308' },
    { name: 'Paint & Chemicals', color: '#8b5cf6' },
    { name: 'Sanitary Items', color: '#06b6d4' },
    { name: 'Fasteners (Nuts/Bolts)', color: '#78716c' },
    { name: 'Nails & Screws', color: '#64748b' },
    { name: 'Locks & Keys', color: '#f97316' },
    { name: 'Door Hardware', color: '#a855f7' },
    { name: 'Kitchen Fittings', color: '#22c55e' },
    { name: 'Bathroom Fittings', color: '#06b6d4' },
    { name: 'Safety Equipment', color: '#ef4444' },
    { name: 'Cement & Building', color: '#94a3b8' },
    { name: 'Steel & Rods', color: '#78716c' },
    { name: 'Pipes & Fittings', color: '#0ea5e9' },
    { name: 'Wires & Cables', color: '#eab308' },
    { name: 'Adhesives & Glue', color: '#f97316' },
  ],
  brands: [
    { name: 'Bosch', description: 'German tools' },
    { name: 'Makita', description: 'Japanese power tools' },
    { name: 'Dewalt', description: 'American power tools' },
    { name: 'Stanley', description: 'Hand tools' },
    { name: 'Ingco', description: 'Chinese tools' },
    { name: 'Total Tools', description: 'Chinese tools brand' },
    { name: 'Pel', description: 'Pakistani appliances' },
    { name: 'GFC', description: 'Pakistani fans' },
    { name: 'ITTEHAD', description: 'Pakistani sanitary' },
    { name: 'Master Paints', description: 'Pakistan paint brand' },
    { name: 'Berger Paints', description: 'Paint brand' },
    { name: 'Diamond Paints', description: 'Pakistani paints' },
    { name: 'Nippon Paint', description: 'Japanese paint' },
    { name: 'Ravi Steel', description: 'Steel manufacturer' },
    { name: 'Amreli Steel', description: 'Steel rebar' },
  ],
  tags: [
    { name: 'Heavy Duty', color: '#dc2626' },
    { name: 'Professional', color: '#3b82f6' },
    { name: 'DIY', color: '#22c55e' },
    { name: 'Warranty', color: '#0ea5e9' },
    { name: 'Waterproof', color: '#06b6d4' },
    { name: 'Rust Proof', color: '#a855f7' },
    { name: 'Imported', color: '#8b5cf6' },
    { name: 'Local Made', color: '#f59e0b' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Contractor Rate', color: '#ef4444' },
    { name: 'Wholesale', color: '#a855f7' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🐄 DAIRY
// ═══════════════════════════════════════════════════════════════
export const DAIRY_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Fresh Milk', color: '#0ea5e9' },
    { name: 'Long Life Milk', color: '#3b82f6' },
    { name: 'Yogurt (Dahi)', color: '#22c55e' },
    { name: 'Lassi', color: '#84cc16' },
    { name: 'Butter (Makhan)', color: '#eab308' },
    { name: 'Ghee', color: '#f59e0b' },
    { name: 'Cheese', color: '#f97316' },
    { name: 'Cream (Malai)', color: '#fbbf24' },
    { name: 'Paneer', color: '#e2e8f0' },
    { name: 'Ice Cream', color: '#ec4899' },
    { name: 'Kulfi', color: '#a855f7' },
    { name: 'Flavored Milk', color: '#f97316' },
    { name: 'Milk Powder', color: '#78716c' },
    { name: 'Condensed Milk', color: '#f59e0b' },
    { name: 'Whey Protein', color: '#3b82f6' },
  ],
  brands: [
    { name: 'Olpers', description: 'Engro Foods' },
    { name: 'MilkPak', description: 'Nestle Pakistan' },
    { name: 'Nestle Everyday', description: 'Milk whitener' },
    { name: 'Tarang', description: 'Engro whitener' },
    { name: 'Adam\'s', description: 'Ice cream' },
    { name: 'Omore', description: 'Ice cream' },
    { name: 'Igloo', description: 'Ice cream' },
    { name: 'Walls', description: 'Ice cream' },
    { name: 'Prema', description: 'Dairy products' },
    { name: 'Haleeb', description: 'Pakistani dairy' },
    { name: 'Nurpur', description: 'Fauji Foods' },
    { name: 'Good Milk', description: 'Shakarganj Foods' },
    { name: 'Local Dairy', description: 'Fresh from farm' },
  ],
  tags: [
    { name: 'Fresh Daily', color: '#22c55e' },
    { name: 'Organic', color: '#16a34a' },
    { name: 'Farm Fresh', color: '#84cc16' },
    { name: 'Homogenized', color: '#3b82f6' },
    { name: 'Pasteurized', color: '#0ea5e9' },
    { name: 'Full Cream', color: '#eab308' },
    { name: 'Low Fat', color: '#22c55e' },
    { name: 'Skimmed', color: '#94a3b8' },
    { name: 'Halal', color: '#10b981' },
    { name: 'Cow Milk', color: '#78716c' },
    { name: 'Buffalo Milk', color: '#475569' },
    { name: 'Goat Milk', color: '#f59e0b' },
    { name: 'Sugar Free', color: '#22c55e' },
    { name: 'Bestseller', color: '#f97316' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🥩 MEAT
// ═══════════════════════════════════════════════════════════════
export const MEAT_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Beef', color: '#dc2626' },
    { name: 'Mutton', color: '#ef4444' },
    { name: 'Chicken', color: '#f97316' },
    { name: 'Lamb', color: '#f59e0b' },
    { name: 'Veal', color: '#ec4899' },
    { name: 'Camel Meat', color: '#78716c' },
    { name: 'Fish', color: '#06b6d4' },
    { name: 'Seafood', color: '#0ea5e9' },
    { name: 'Ground/Mince', color: '#ef4444' },
    { name: 'BBQ Cuts', color: '#dc2626' },
    { name: 'Steak Cuts', color: '#ef4444' },
    { name: 'Curry Cuts', color: '#f97316' },
    { name: 'Offal (Kaleji/Gurda)', color: '#a855f7' },
    { name: 'Sausages', color: '#f59e0b' },
    { name: 'Cold Cuts', color: '#94a3b8' },
    { name: 'Marinated', color: '#eab308' },
    { name: 'Qurbani', color: '#dc2626' },
  ],
  brands: [
    { name: 'K&N\'s', description: 'Premium chicken products' },
    { name: 'Menu', description: 'Frozen chicken' },
    { name: 'Big Bird', description: 'Chicken brand' },
    { name: 'PK Meat', description: 'Halal certified' },
    { name: 'Al-Rehman Meat', description: 'Local butcher chain' },
    { name: 'Meat One', description: 'Premium meat store' },
    { name: 'Al-Shaheer', description: 'Halal meat brand' },
    { name: 'Local Butcher', description: 'Fresh cuts daily' },
  ],
  tags: [
    { name: 'Halal', color: '#10b981' },
    { name: 'Zabiha', color: '#22c55e' },
    { name: 'Fresh', color: '#f97316' },
    { name: 'Frozen', color: '#06b6d4' },
    { name: 'Boneless', color: '#8b5cf6' },
    { name: 'With Bone', color: '#78716c' },
    { name: 'Marinated', color: '#eab308' },
    { name: 'Organic', color: '#16a34a' },
    { name: 'Farm Raised', color: '#84cc16' },
    { name: 'Grass Fed', color: '#22c55e' },
    { name: 'Free Range', color: '#a855f7' },
    { name: 'Prime Cut', color: '#dc2626' },
    { name: 'Eid Special', color: '#f59e0b' },
    { name: 'Bulk Order', color: '#ef4444' },
    { name: 'Bestseller', color: '#f97316' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🛒 RETAIL / GROCERY
// ═══════════════════════════════════════════════════════════════
export const RETAIL_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Grocery', color: '#22c55e' },
    { name: 'Beverages', color: '#0ea5e9' },
    { name: 'Snacks', color: '#f97316' },
    { name: 'Biscuits', color: '#f59e0b' },
    { name: 'Chocolates', color: '#78350f' },
    { name: 'Candy & Sweets', color: '#ec4899' },
    { name: 'Chips', color: '#f97316' },
    { name: 'Rice & Grains', color: '#eab308' },
    { name: 'Flour (Aata)', color: '#fbbf24' },
    { name: 'Oil & Ghee', color: '#f59e0b' },
    { name: 'Spices (Masala)', color: '#dc2626' },
    { name: 'Sugar & Salt', color: '#e2e8f0' },
    { name: 'Tea & Coffee', color: '#78350f' },
    { name: 'Dairy', color: '#0ea5e9' },
    { name: 'Bakery', color: '#f59e0b' },
    { name: 'Frozen Foods', color: '#06b6d4' },
    { name: 'Canned Foods', color: '#94a3b8' },
    { name: 'Personal Care', color: '#8b5cf6' },
    { name: 'Baby Products', color: '#ec4899' },
    { name: 'Household', color: '#a855f7' },
    { name: 'Cleaning', color: '#3b82f6' },
    { name: 'Detergents', color: '#0ea5e9' },
    { name: 'Stationery', color: '#f97316' },
  ],
  brands: [
    { name: 'Nestle', description: 'Consumer foods giant' },
    { name: 'Unilever', description: 'Consumer goods' },
    { name: 'Coca-Cola', description: 'Beverages' },
    { name: 'Pepsi', description: 'Beverages' },
    { name: 'National Foods', description: 'Pakistani foods' },
    { name: 'Shan Foods', description: 'Spices & masala' },
    { name: 'Mehran', description: 'Spices & masala' },
    { name: 'Peek Freans', description: 'Biscuits (English Biscuit)' },
    { name: 'LU Biscuits', description: 'Continental Biscuits' },
    { name: 'Cadbury', description: 'Chocolates' },
    { name: 'Kinder', description: 'Ferrero brand' },
    { name: 'Lays', description: 'PepsiCo chips' },
    { name: 'Kurkure', description: 'PepsiCo snacks' },
    { name: 'Tapal', description: 'Tea brand' },
    { name: 'Lipton', description: 'Unilever tea' },
    { name: 'Surf Excel', description: 'Detergent' },
    { name: 'Ariel', description: 'Detergent' },
    { name: 'Bonus', description: 'Detergent' },
    { name: 'Lifebuoy', description: 'Soap' },
    { name: 'Safeguard', description: 'Antibacterial soap' },
    { name: 'Colgate', description: 'Toothpaste' },
    { name: 'Head & Shoulders', description: 'Shampoo' },
    { name: 'Sunsilk', description: 'Shampoo' },
    { name: 'Pantene', description: 'Shampoo' },
  ],
  tags: [
    { name: 'Bestseller', color: '#f97316' },
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Sale', color: '#ef4444' },
    { name: 'Deal', color: '#f59e0b' },
    { name: 'Combo', color: '#14b8a6' },
    { name: 'Family Pack', color: '#8b5cf6' },
    { name: 'Economy Pack', color: '#22c55e' },
    { name: 'Imported', color: '#a855f7' },
    { name: 'Local', color: '#f59e0b' },
    { name: 'Organic', color: '#16a34a' },
    { name: 'Halal', color: '#10b981' },
    { name: 'Sugar Free', color: '#22c55e' },
    { name: 'Gluten Free', color: '#f59e0b' },
    { name: 'Ramzan Special', color: '#a855f7' },
    { name: 'Eid Special', color: '#f59e0b' },
    { name: 'Limited Stock', color: '#ef4444' },
    { name: 'Wholesale', color: '#3b82f6' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🌾 AGRI (Agriculture)
// ═══════════════════════════════════════════════════════════════
export const AGRI_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Fertilizers', color: '#16a34a' },
    { name: 'Pesticides', color: '#ef4444' },
    { name: 'Herbicides', color: '#f97316' },
    { name: 'Fungicides', color: '#8b5cf6' },
    { name: 'Seeds', color: '#84cc16' },
    { name: 'Hybrid Seeds', color: '#22c55e' },
    { name: 'Livestock Feed', color: '#f59e0b' },
    { name: 'Poultry Feed', color: '#eab308' },
    { name: 'Cattle Feed', color: '#78716c' },
    { name: 'Farm Equipment', color: '#3b82f6' },
    { name: 'Irrigation', color: '#0ea5e9' },
    { name: 'Tools', color: '#f97316' },
    { name: 'Veterinary', color: '#a855f7' },
    { name: 'Organic Products', color: '#16a34a' },
    { name: 'Nursery Plants', color: '#22c55e' },
  ],
  brands: [
    { name: 'Fauji Fertilizer', description: 'FFC - Sona urea' },
    { name: 'Engro Fertilizers', description: 'Zarkhez, Engro Nitrophos' },
    { name: 'Fatima Fertilizer', description: 'Sarsabz, Bubber Sher' },
    { name: 'FFBL', description: 'Fauji Fertilizer Bin Qasim' },
    { name: 'ICI Pakistan', description: 'Agri chemicals' },
    { name: 'Syngenta', description: 'Swiss agri giant' },
    { name: 'Bayer CropScience', description: 'German agri' },
    { name: 'FMC', description: 'US pesticides' },
    { name: 'Ali Akbar Group', description: 'Seeds & inputs' },
    { name: 'Auriga', description: 'Agri solutions' },
    { name: 'Suncrop', description: 'Pesticides' },
    { name: 'Warble', description: 'Agri chemicals' },
    { name: 'Pioneer', description: 'Seeds' },
    { name: 'Monsanto', description: 'Seeds & biotech' },
  ],
  tags: [
    { name: 'Organic', color: '#16a34a' },
    { name: 'Bio', color: '#22c55e' },
    { name: 'Hybrid', color: '#8b5cf6' },
    { name: 'GMO Free', color: '#84cc16' },
    { name: 'Certified', color: '#3b82f6' },
    { name: 'DAP', color: '#f59e0b' },
    { name: 'Urea', color: '#eab308' },
    { name: 'NPK', color: '#f97316' },
    { name: 'Kharif Season', color: '#22c55e' },
    { name: 'Rabi Season', color: '#0ea5e9' },
    { name: 'Wheat', color: '#eab308' },
    { name: 'Cotton', color: '#e2e8f0' },
    { name: 'Rice', color: '#f59e0b' },
    { name: 'Sugarcane', color: '#84cc16' },
    { name: 'Subsidized', color: '#10b981' },
    { name: 'Bestseller', color: '#f97316' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📚 BOOKSTORE
// ═══════════════════════════════════════════════════════════════
export const BOOKSTORE_PRESETS: IndustryPresets = {
  categories: [
    { name: 'School Books', color: '#3b82f6' },
    { name: 'College Books', color: '#8b5cf6' },
    { name: 'University Books', color: '#a855f7' },
    { name: 'Islamic Books', color: '#16a34a' },
    { name: 'Novels', color: '#ec4899' },
    { name: 'Urdu Literature', color: '#dc2626' },
    { name: 'English Books', color: '#0ea5e9' },
    { name: 'Kids Books', color: '#f97316' },
    { name: 'Reference Books', color: '#f59e0b' },
    { name: 'Test Preparation', color: '#ef4444' },
    { name: 'Notebooks', color: '#22c55e' },
    { name: 'Stationery', color: '#eab308' },
    { name: 'Pens & Pencils', color: '#3b82f6' },
    { name: 'Art Supplies', color: '#ec4899' },
    { name: 'Office Supplies', color: '#78716c' },
    { name: 'Registers & Files', color: '#f59e0b' },
    { name: 'Rentals', color: '#a855f7' },
  ],
  brands: [
    { name: 'Oxford University Press', description: 'Educational publisher' },
    { name: 'Cambridge', description: 'Cambridge Assessment' },
    { name: 'Ferozsons', description: 'Pakistani publisher' },
    { name: 'Sang-e-Meel', description: 'Urdu publisher' },
    { name: 'Ilm o Irfan', description: 'Educational publisher' },
    { name: 'Kitabistan', description: 'Publisher' },
    { name: 'Dogar Publishers', description: 'Test prep' },
    { name: 'Caravan Book House', description: 'Publisher' },
    { name: 'Dawood Publishers', description: 'School books' },
    { name: 'Al-Faisal', description: 'Islamic books' },
    { name: 'Dost Publications', description: 'Urdu books' },
    { name: 'Deca Books', description: 'Notebooks' },
    { name: 'Faber-Castell', description: 'Art supplies' },
    { name: 'Pilot', description: 'Pens' },
    { name: 'Dollar', description: 'Pens & pencils' },
    { name: 'Piano', description: 'Pakistani stationery' },
  ],
  tags: [
    { name: 'New Edition', color: '#22c55e' },
    { name: 'Latest Edition', color: '#f97316' },
    { name: 'Used', color: '#78716c' },
    { name: 'Rental Available', color: '#a855f7' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'FBISE', color: '#3b82f6' },
    { name: 'Cambridge', color: '#8b5cf6' },
    { name: 'Punjab Board', color: '#22c55e' },
    { name: 'Sindh Board', color: '#0ea5e9' },
    { name: 'KPK Board', color: '#f59e0b' },
    { name: 'Balochistan Board', color: '#ef4444' },
    { name: 'Islamic', color: '#16a34a' },
    { name: 'Urdu Medium', color: '#dc2626' },
    { name: 'English Medium', color: '#3b82f6' },
    { name: 'Imported', color: '#a855f7' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL
// ═══════════════════════════════════════════════════════════════
export const HOTEL_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Room Charges', color: '#3b82f6' },
    { name: 'Food & Beverage', color: '#f97316' },
    { name: 'Laundry Service', color: '#0ea5e9' },
    { name: 'Spa & Massage', color: '#ec4899' },
    { name: 'Mini Bar', color: '#eab308' },
    { name: 'Room Service', color: '#8b5cf6' },
    { name: 'Amenities', color: '#a855f7' },
    { name: 'Transport', color: '#22c55e' },
    { name: 'Tour Packages', color: '#f59e0b' },
    { name: 'Event Services', color: '#dc2626' },
    { name: 'Business Center', color: '#475569' },
  ],
  brands: [
    { name: 'Hilton', description: 'International hotel chain' },
    { name: 'Marriott', description: 'International hotel chain' },
    { name: 'Pearl Continental', description: 'Pakistani luxury hotel' },
    { name: 'Serena Hotels', description: 'Aga Khan Fund hotels' },
    { name: 'Movenpick', description: 'International hotel' },
    { name: 'Avari', description: 'Pakistani hotel chain' },
  ],
  tags: [
    { name: 'Deluxe', color: '#f59e0b' },
    { name: 'Executive Suite', color: '#8b5cf6' },
    { name: 'Presidential Suite', color: '#dc2626' },
    { name: 'Standard Room', color: '#3b82f6' },
    { name: 'AC Room', color: '#06b6d4' },
    { name: 'Sea View', color: '#0ea5e9' },
    { name: 'Family Room', color: '#ec4899' },
    { name: 'Complimentary', color: '#22c55e' },
    { name: 'VIP', color: '#eab308' },
    { name: 'Ramzan Package', color: '#a855f7' },
    { name: 'Honeymoon Package', color: '#ec4899' },
    { name: 'Business Package', color: '#475569' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💇 SALON / BEAUTY
// ═══════════════════════════════════════════════════════════════
export const SALON_PRESETS: IndustryPresets = {
  categories: [
    { name: 'Hair Services', color: '#8b5cf6' },
    { name: 'Facial Services', color: '#ec4899' },
    { name: 'Massage', color: '#a855f7' },
    { name: 'Manicure & Pedicure', color: '#f97316' },
    { name: 'Waxing', color: '#eab308' },
    { name: 'Threading', color: '#f59e0b' },
    { name: 'Bridal Services', color: '#dc2626' },
    { name: 'Makeup Services', color: '#ec4899' },
    { name: 'Hair Coloring', color: '#a855f7' },
    { name: 'Hair Treatment', color: '#8b5cf6' },
    { name: 'Beauty Products', color: '#f97316' },
    { name: 'Skin Care Products', color: '#22c55e' },
    { name: 'Memberships', color: '#3b82f6' },
    { name: 'Packages', color: '#f59e0b' },
  ],
  brands: [
    { name: 'L\'Oreal Professional', description: 'Hair care & color' },
    { name: 'Wella', description: 'Hair products' },
    { name: 'Schwarzkopf', description: 'Hair care' },
    { name: 'Matrix', description: 'Hair products' },
    { name: 'Bio Amla', description: 'Hair care' },
    { name: 'Christine', description: 'Beauty products' },
    { name: 'Medora', description: 'Makeup' },
    { name: 'Rivaj UK', description: 'Cosmetics' },
    { name: 'Sweet Touch', description: 'Beauty products' },
    { name: 'Nabila\'s', description: 'Local salon brand' },
  ],
  tags: [
    { name: 'Bridal Package', color: '#dc2626' },
    { name: 'Party Ready', color: '#ec4899' },
    { name: 'Signature Service', color: '#8b5cf6' },
    { name: 'Premium', color: '#f59e0b' },
    { name: 'Herbal', color: '#22c55e' },
    { name: 'Organic', color: '#16a34a' },
    { name: 'Bestseller', color: '#f97316' },
    { name: 'New Service', color: '#22c55e' },
    { name: 'Deal', color: '#ef4444' },
    { name: 'Weekend Special', color: '#a855f7' },
    { name: 'Ladies Only', color: '#ec4899' },
    { name: 'Men Only', color: '#3b82f6' },
    { name: 'Home Service', color: '#0ea5e9' },
    { name: 'Membership', color: '#8b5cf6' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MASTER MAP
// ═══════════════════════════════════════════════════════════════
export const INDUSTRY_PRESETS: Record<string, IndustryPresets> = {
  carpet: CARPET_PRESETS,
  mobile: MOBILE_PRESETS,
  restaurant: RESTAURANT_PRESETS,
  jewelry: JEWELRY_PRESETS,
  autoparts: AUTOPARTS_PRESETS,
  pharmacy: PHARMACY_PRESETS,
  garments: GARMENTS_PRESETS,
  hardware: HARDWARE_PRESETS,
  dairy: DAIRY_PRESETS,
  meat: MEAT_PRESETS,
  retail: RETAIL_PRESETS,
  agri: AGRI_PRESETS,
  bookstore: BOOKSTORE_PRESETS,
  hotel: HOTEL_PRESETS,
  salon: SALON_PRESETS,
};

// ═══════════════════════════════════════════════════════════════
// GENERIC FALLBACK (for tenants without industry pack)
// ═══════════════════════════════════════════════════════════════
export const GENERIC_PRESETS: IndustryPresets = {
  categories: [
    { name: 'General Merchandise', color: '#3b82f6' },
    { name: 'Electronics', color: '#8b5cf6' },
    { name: 'Clothing', color: '#ec4899' },
    { name: 'Grocery', color: '#22c55e' },
    { name: 'Home & Kitchen', color: '#f59e0b' },
    { name: 'Beauty & Personal Care', color: '#a855f7' },
    { name: 'Sports & Outdoors', color: '#ef4444' },
    { name: 'Books & Stationery', color: '#f97316' },
    { name: 'Toys & Games', color: '#eab308' },
    { name: 'Services', color: '#0ea5e9' },
  ],
  brands: [
    { name: 'Local Brand', description: 'Local manufacturer' },
    { name: 'Imported', description: 'International brand' },
  ],
  tags: [
    { name: 'Bestseller', color: '#f97316' },
    { name: 'New Arrival', color: '#22c55e' },
    { name: 'Sale', color: '#ef4444' },
    { name: 'Premium', color: '#8b5cf6' },
    { name: 'Deal', color: '#f59e0b' },
    { name: 'Combo', color: '#14b8a6' },
    { name: 'Limited', color: '#dc2626' },
    { name: 'Wholesale', color: '#3b82f6' },
    { name: 'Retail', color: '#0ea5e9' },
    { name: 'Halal', color: '#10b981' },
    { name: 'Imported', color: '#a855f7' },
    { name: 'Local', color: '#f59e0b' },
  ],
};

/**
 * Get presets for the current industry, with fallback to generic.
 * Returns merged presets: industry-specific first, then generic (deduplicated by name).
 */
export function getIndustryPresets(industryId?: string | null): IndustryPresets {
  if (industryId && INDUSTRY_PRESETS[industryId]) {
    const industry = INDUSTRY_PRESETS[industryId];
    // Merge with generic, but industry-specific takes precedence
    const nameSet = new Set(industry.categories.map((c) => c.name.toLowerCase()));
    const tagSet = new Set(industry.tags.map((t) => t.name.toLowerCase()));
    const brandSet = new Set(industry.brands.map((b) => b.name.toLowerCase()));
    return {
      categories: [
        ...industry.categories,
        ...GENERIC_PRESETS.categories.filter((c) => !nameSet.has(c.name.toLowerCase())),
      ],
      brands: [
        ...industry.brands,
        ...GENERIC_PRESETS.brands.filter((b) => !brandSet.has(b.name.toLowerCase())),
      ],
      tags: [
        ...industry.tags,
        ...GENERIC_PRESETS.tags.filter((t) => !tagSet.has(t.name.toLowerCase())),
      ],
    };
  }
  return GENERIC_PRESETS;
}
