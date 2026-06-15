/**
 * Business Type Templates
 * Each business type has pre-configured features, default units, suggested categories
 */

export interface BusinessFeatures {
  // Core features
  variants: boolean;
  variantImages: boolean;
  lengthWidthCalc: boolean;     // For sqft/meter calculations
  weightBased: boolean;          // Decimal weight quantities
  
  // Tracking
  imei: boolean;                 // IMEI/Serial tracking (mobile)
  expiry: boolean;               // Expiry date tracking
  batches: boolean;              // Batch number tracking
  warranty: boolean;             // Warranty tracking
  
  // Payment
  emi: boolean;                  // EMI/Installment plans
  
  // Operations
  services: boolean;             // Service items (no stock)
  tables: boolean;               // Table management (restaurant)
  appointments: boolean;         // Booking system (salon)
  kitchenPrinter: boolean;       // Kitchen order tickets
  
  // Customer
  prescriptionRequired: boolean; // Pharmacy
  
  // Inventory
  multiUnit: boolean;            // Purchase unit vs sell unit
  sizeMatrix: boolean;           // Size × color grid (clothing)
}

export interface BusinessTemplate {
  type: string;
  label: string;
  emoji: string;
  description: string;
  category: 'Retail' | 'Food' | 'Healthcare' | 'Electronics' | 'Fashion' | 'Lifestyle' | 'Industrial' | 'Education' | 'Service' | 'Other';
  defaultUnit: string;
  quickUnits: string[];
  features: BusinessFeatures;
  suggestedCategories: string[];
  highlights: string[]; // Key features to show user
}

const DEFAULT_FEATURES: BusinessFeatures = {
  variants: false,
  variantImages: false,
  lengthWidthCalc: false,
  weightBased: false,
  imei: false,
  expiry: false,
  batches: false,
  warranty: false,
  emi: false,
  services: false,
  tables: false,
  appointments: false,
  kitchenPrinter: false,
  prescriptionRequired: false,
  multiUnit: false,
  sizeMatrix: false,
};

export const BUSINESS_TEMPLATES: Record<string, BusinessTemplate> = {
  CARPET: {
    type: 'CARPET',
    label: 'Carpets / Flooring',
    emoji: '🏪',
    description: 'Carpet shops, tiles, rugs, flooring stores',
    category: 'Retail',
    defaultUnit: 'sqft',
    quickUnits: ['sqft', 'sqm', 'meter', 'roll', 'piece'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      variantImages: true,
      lengthWidthCalc: true,
      multiUnit: true,
    },
    suggestedCategories: ['Carpets', 'Floor Mats', 'Rugs', 'Tiles', 'Vinyl Flooring', 'Wood Flooring'],
    highlights: [
      '📐 Length × Width auto calculator',
      '🎨 Color codes & variants per carpet',
      '📊 sqft based pricing',
      '🧵 Multi-unit purchase support',
    ],
  },

  MOBILE: {
    type: 'MOBILE',
    label: 'Mobile / Electronics',
    emoji: '📱',
    description: 'Mobile shops, accessories, electronics retailers',
    category: 'Electronics',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'set', 'pair', 'box'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      variantImages: true,
      imei: true,
      warranty: true,
      emi: true,
      services: true,
    },
    suggestedCategories: ['Phones', 'Accessories', 'Repair Services', 'Chargers', 'Earphones', 'Covers', 'SIM Cards', 'Tablets'],
    highlights: [
      '📱 IMEI / Serial number tracking',
      '🛡️ Warranty management',
      '📅 EMI / Installment plans',
      '🔧 Repair service items',
      '🎨 Color & storage variants',
    ],
  },

  GROCERY: {
    type: 'GROCERY',
    label: 'Grocery / Kiryana',
    emoji: '🛒',
    description: 'General stores, kiryana shops, supermarkets',
    category: 'Retail',
    defaultUnit: 'kg',
    quickUnits: ['kg', 'gram', 'liter', 'pack', 'dozen', 'pcs'],
    features: {
      ...DEFAULT_FEATURES,
      weightBased: true,
      expiry: true,
      batches: true,
      multiUnit: true,
    },
    suggestedCategories: ['Atta/Rice/Daal', 'Oil/Ghee', 'Cheeni & Chai', 'Spices/Masala', 'Biscuits', 'Beverages', 'Dairy', 'Personal Care', 'Cleaning'],
    highlights: [
      '⚖️ Weight-based pricing (kg, gram)',
      '📅 Expiry date tracking',
      '📦 Batch number support',
      '🛒 Multi-unit (carton → pieces)',
    ],
  },

  PHARMACY: {
    type: 'PHARMACY',
    label: 'Pharmacy / Medical',
    emoji: '💊',
    description: 'Medical stores, pharmacies, drug stores',
    category: 'Healthcare',
    defaultUnit: 'strip',
    quickUnits: ['strip', 'tablet', 'bottle', 'sachet', 'vial', 'ml', 'pcs'],
    features: {
      ...DEFAULT_FEATURES,
      expiry: true,
      batches: true,
      prescriptionRequired: true,
      multiUnit: true,
    },
    suggestedCategories: ['Tablets', 'Syrups', 'Injections', 'Surgical', 'Baby Care', 'Vitamins', 'OTC', 'First Aid'],
    highlights: [
      '⚠️ Strict expiry tracking',
      '📦 Batch number per stock',
      '📋 Prescription marking',
      '🚨 Near-expiry alerts',
    ],
  },

  RESTAURANT: {
    type: 'RESTAURANT',
    label: 'Restaurant / Cafe',
    emoji: '🍽️',
    description: 'Restaurants, cafes, dhabas, food joints',
    category: 'Food',
    defaultUnit: 'plate',
    quickUnits: ['plate', 'cup', 'glass', 'piece', 'serving', 'bowl'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      services: true,
      tables: true,
      kitchenPrinter: true,
    },
    suggestedCategories: ['Starters', 'Main Course', 'BBQ', 'Chinese', 'Desi', 'Desserts', 'Beverages', 'Deals'],
    highlights: [
      '🪑 Table management',
      '🍳 Kitchen order tickets',
      '📏 Size variants (small/medium/large)',
      '🍽️ Service-based items',
    ],
  },

  SALON: {
    type: 'SALON',
    label: 'Salon / Beauty / Spa',
    emoji: '💇',
    description: 'Hair salons, beauty parlors, spas, barbers',
    category: 'Service',
    defaultUnit: 'service',
    quickUnits: ['service', 'session', 'piece', 'ml'],
    features: {
      ...DEFAULT_FEATURES,
      services: true,
      appointments: true,
    },
    suggestedCategories: ['Haircut', 'Hair Color', 'Facial', 'Threading', 'Massage', 'Bridal', 'Products'],
    highlights: [
      '📅 Appointment booking',
      '👤 Staff-wise time slots',
      '💆 Service-only items',
      '🛍️ Optional retail products',
    ],
  },

  CLOTHING: {
    type: 'CLOTHING',
    label: 'Clothing / Garments',
    emoji: '👕',
    description: 'Clothing stores, garments, fabric shops',
    category: 'Fashion',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'meter', 'gaj', 'yard', 'set', 'pair'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      variantImages: true,
      sizeMatrix: true,
      lengthWidthCalc: true,
      services: true,
      emi: false,
    },
    suggestedCategories: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Fabric', 'Alterations'],
    highlights: [
      '👕 Size × Color matrix',
      '🎨 Variant images per color',
      '📏 Meter/gaj for fabric',
      '✂️ Alteration services',
    ],
  },

  HARDWARE: {
    type: 'HARDWARE',
    label: 'Hardware / Construction',
    emoji: '🔧',
    description: 'Hardware stores, construction supplies, tools',
    category: 'Industrial',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'kg', 'meter', 'foot', 'bag', 'box', 'set'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      lengthWidthCalc: true,
      weightBased: true,
      services: true,
      multiUnit: true,
    },
    suggestedCategories: ['Cement', 'Steel', 'Paints', 'Tools', 'Electrical', 'Plumbing', 'Hardware', 'Installation Services'],
    highlights: [
      '📏 Length-based items (pipes, wire)',
      '⚖️ Weight-based (cement, steel)',
      '🔨 Tool variants & sizes',
      '🛠️ Installation services',
    ],
  },

  STATIONERY: {
    type: 'STATIONERY',
    label: 'Stationery / Books',
    emoji: '📚',
    description: 'Stationery shops, book stores, office supplies',
    category: 'Education',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'pack', 'box', 'ream', 'sheet', 'dozen'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      multiUnit: true,
    },
    suggestedCategories: ['Books', 'Pens & Pencils', 'Notebooks', 'Art Supplies', 'Office', 'Files & Folders'],
    highlights: [
      '📦 Pack & dozen pricing',
      '🎨 Color variants',
      '📚 Multi-unit support',
    ],
  },

  COSMETICS: {
    type: 'COSMETICS',
    label: 'Cosmetics / Beauty',
    emoji: '💄',
    description: 'Cosmetics shops, beauty product stores',
    category: 'Lifestyle',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'ml', 'gram', 'pack'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
      variantImages: true,
      expiry: true,
    },
    suggestedCategories: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tools', 'Brands'],
    highlights: [
      '🎨 Shade/color variants',
      '📅 Expiry tracking',
      '🏷️ Brand-based catalog',
    ],
  },

  BAKERY: {
    type: 'BAKERY',
    label: 'Bakery / Sweets',
    emoji: '🍰',
    description: 'Bakeries, sweet shops, confectioneries',
    category: 'Food',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'kg', 'gram', 'dozen', 'pack', 'box'],
    features: {
      ...DEFAULT_FEATURES,
      weightBased: true,
      expiry: true,
      variants: true,
    },
    suggestedCategories: ['Cakes', 'Pastries', 'Bread', 'Biscuits', 'Sweets', 'Beverages', 'Custom Orders'],
    highlights: [
      '⚖️ Weight-based (kg, gram)',
      '📅 Daily expiry (short shelf life)',
      '🎂 Size variants for cakes',
    ],
  },

  GENERAL: {
    type: 'GENERAL',
    label: 'General Retail',
    emoji: '🏬',
    description: 'Mixed retail, general stores, other businesses',
    category: 'Other',
    defaultUnit: 'pcs',
    quickUnits: ['pcs', 'pack', 'box', 'kg', 'meter'],
    features: {
      ...DEFAULT_FEATURES,
      variants: true,
    },
    suggestedCategories: ['General'],
    highlights: [
      '✅ All features available',
      '⚙️ Customize as needed',
      '🎯 Enable any feature later',
    ],
  },
};

export const BUSINESS_TYPE_OPTIONS = Object.values(BUSINESS_TEMPLATES).map((t) => ({
  value: t.type,
  label: t.label,
  emoji: t.emoji,
  description: t.description,
  category: t.category,
  highlights: t.highlights,
  defaultUnit: t.defaultUnit,
  featureCount: Object.values(t.features).filter(Boolean).length,
}));

export function getBusinessTemplate(type: string): BusinessTemplate {
  return BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.GENERAL;
}
