export interface BusinessFeatures {
  // Core
  variants: boolean;
  variantImages: boolean;
  lengthWidthCalc: boolean;
  weightBased: boolean;

  // Tracking
  imei: boolean;
  expiry: boolean;
  batches: boolean;
  warranty: boolean;
  serialNumber: boolean;

  // Payment
  emi: boolean;
  layaway: boolean;
  membership: boolean;
  packages: boolean;
  credit: boolean;

  // Operations
  services: boolean;
  tables: boolean;
  appointments: boolean;
  kitchenPrinter: boolean;
  rooms: boolean;
  routes: boolean;
  delivery: boolean;

  // Customer
  prescriptionRequired: boolean;
  measurements: boolean;
  vehicleTracking: boolean;
  patientRecords: boolean;

  // Inventory
  multiUnit: boolean;
  sizeMatrix: boolean;
  bulkPricing: boolean;
  combo: boolean;
  quickKeys: boolean;

  // Industry-specific
  slaughterLog: boolean;
  qualityTests: boolean;
  farmerAccounts: boolean;
  hallmark: boolean;
  purityTracking: boolean;
  liveMetalRates: boolean;
  amc: boolean;
  technicianDispatch: boolean;
  bookRentals: boolean;
  schoolLists: boolean;
  compatibilityMatrix: boolean;
  reservations: boolean;
  tailoring: boolean;
  alterations: boolean;
  qurbani: boolean;
  subscriptions: boolean;
  cropAdvisory: boolean;
  seasonalPlans: boolean;
  govtSubsidy: boolean;
  productionPlanning: boolean;
  ingredientTracking: boolean;
  customCakes: boolean;
  bodyMeasurements: boolean;
  workoutTracking: boolean;
  dietPlans: boolean;
  classSchedule: boolean;
  labTests: boolean;
  vaccinations: boolean;
  dentalCharts: boolean;
  antenatal: boolean;
  physioSessions: boolean;
  drugInteractions: boolean;
  usedItemsTrade: boolean;
  repairs: boolean;
  carpetRolls: boolean;
  cutPieces: boolean;
  projectTracking: boolean;
  quotations: boolean;
  bulkOrders: boolean;
}

export interface BusinessTemplate {
  type: string;
  label: string;
  labelUrdu: string;
  emoji: string;
  description: string;
  category: string;
  defaultUnit: string;
  quickUnits: string[];
  features: BusinessFeatures;
  suggestedCategories: string[];
  highlights: string[];
  color: string;
  popular: boolean;
  minStock: number;
  receiptSize: string;
  currency: string;
}

const DEFAULT_FEATURES: BusinessFeatures = {
  variants: false, variantImages: false, lengthWidthCalc: false, weightBased: false,
  imei: false, expiry: false, batches: false, warranty: false, serialNumber: false,
  emi: false, layaway: false, membership: false, packages: false, credit: true,
  services: false, tables: false, appointments: false, kitchenPrinter: false,
  rooms: false, routes: false, delivery: false,
  prescriptionRequired: false, measurements: false, vehicleTracking: false, patientRecords: false,
  multiUnit: false, sizeMatrix: false, bulkPricing: false, combo: false, quickKeys: false,
  slaughterLog: false, qualityTests: false, farmerAccounts: false,
  hallmark: false, purityTracking: false, liveMetalRates: false,
  amc: false, technicianDispatch: false,
  bookRentals: false, schoolLists: false,
  compatibilityMatrix: false, reservations: false,
  tailoring: false, alterations: false,
  qurbani: false, subscriptions: false,
  cropAdvisory: false, seasonalPlans: false, govtSubsidy: false,
  productionPlanning: false, ingredientTracking: false, customCakes: false,
  bodyMeasurements: false, workoutTracking: false, dietPlans: false, classSchedule: false,
  labTests: false, vaccinations: false, dentalCharts: false, antenatal: false, physioSessions: false,
  drugInteractions: false, usedItemsTrade: false, repairs: false,
  carpetRolls: false, cutPieces: false,
  projectTracking: false, quotations: false, bulkOrders: false,
};

export const BUSINESS_TEMPLATES: Record<string, BusinessTemplate> = {
  GROCERY: {
    type: 'GROCERY', label: 'Grocery / Kiryana', labelUrdu: 'کریانہ سٹور', emoji: '🛒',
    description: 'General stores, kiryana shops, supermarkets',
    category: 'Retail', defaultUnit: 'kg',
    quickUnits: ['kg', 'gram', 'liter', 'pack', 'dozen', 'pcs'],
    features: { ...DEFAULT_FEATURES, weightBased: true, expiry: true, batches: true, multiUnit: true, combo: true, quickKeys: true, bulkPricing: true },
    suggestedCategories: ['Atta/Rice/Daal', 'Oil/Ghee', 'Cheeni & Chai', 'Spices/Masala', 'Biscuits', 'Beverages', 'Dairy', 'Personal Care', 'Cleaning'],
    highlights: ['⚖️ Weight-based pricing', '📅 Expiry tracking', '📦 Batch numbers', '🛒 Multi-unit support', '🎯 Quick keys F1-F12'],
    color: '#16a34a', popular: true, minStock: 10, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  MOBILE: {
    type: 'MOBILE', label: 'Mobile / Electronics', labelUrdu: 'موبائل شاپ', emoji: '📱',
    description: 'Mobile shops, accessories, electronics',
    category: 'Electronics', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'set', 'pair', 'box'],
    features: { ...DEFAULT_FEATURES, variants: true, variantImages: true, imei: true, warranty: true, emi: true, services: true, repairs: true, usedItemsTrade: true, serialNumber: true },
    suggestedCategories: ['Phones', 'Accessories', 'Repair Services', 'Chargers', 'Earphones', 'Covers', 'SIM Cards', 'Tablets', 'Used Phones'],
    highlights: ['📱 IMEI tracking', '🛡️ Warranty', '📅 EMI plans', '🔧 Repair tickets', '🔄 Used phone trade-in'],
    color: '#2563eb', popular: true, minStock: 5, receiptSize: 'THERMAL_80MM', currency: 'PKR',
  },

  PHARMACY: {
    type: 'PHARMACY', label: 'Pharmacy / Medical Store', labelUrdu: 'میڈیکل سٹور', emoji: '💊',
    description: 'Medical stores, pharmacies',
    category: 'Healthcare', defaultUnit: 'strip',
    quickUnits: ['strip', 'tablet', 'bottle', 'sachet', 'vial', 'ml'],
    features: { ...DEFAULT_FEATURES, expiry: true, batches: true, prescriptionRequired: true, multiUnit: true, drugInteractions: true, quickKeys: true },
    suggestedCategories: ['Tablets', 'Syrups', 'Injections', 'Surgical', 'Baby Care', 'Vitamins', 'OTC'],
    highlights: ['⚠️ Expiry tracking', '📦 Batch numbers', '📋 Prescriptions', '⚕️ Drug interactions', '🚨 Near-expiry alerts'],
    color: '#dc2626', popular: true, minStock: 20, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  RESTAURANT: {
    type: 'RESTAURANT', label: 'Restaurant / Cafe', labelUrdu: 'ریسٹورنٹ', emoji: '🍽️',
    description: 'Restaurants, cafes, dhabas',
    category: 'Food', defaultUnit: 'plate',
    quickUnits: ['plate', 'cup', 'glass', 'piece', 'bowl'],
    features: { ...DEFAULT_FEATURES, variants: true, services: true, tables: true, kitchenPrinter: true, ingredientTracking: true, delivery: true, combo: true },
    suggestedCategories: ['Starters', 'Main Course', 'BBQ', 'Chinese', 'Desi', 'Desserts', 'Beverages', 'Deals'],
    highlights: ['🪑 Table management', '🍳 Kitchen tickets (KOT)', '🚴 Delivery tracking', '🥘 Recipe/ingredient tracking'],
    color: '#ea580c', popular: true, minStock: 20, receiptSize: 'THERMAL_80MM', currency: 'PKR',
  },

  SALON: {
    type: 'SALON', label: 'Salon / Beauty / Spa', labelUrdu: 'بیوٹی پارلر', emoji: '💇',
    description: 'Hair salons, beauty parlors, spas',
    category: 'Service', defaultUnit: 'service',
    quickUnits: ['service', 'session', 'piece', 'ml'],
    features: { ...DEFAULT_FEATURES, services: true, appointments: true, membership: true, packages: true },
    suggestedCategories: ['Haircut', 'Hair Color', 'Facial', 'Threading', 'Massage', 'Bridal Makeup', 'Manicure', 'Products'],
    highlights: ['📅 Appointment booking', '👤 Staff commissions', '💆 Membership plans', '🎁 Prepaid packages'],
    color: '#ec4899', popular: true, minStock: 5, receiptSize: 'THERMAL_80MM', currency: 'PKR',
  },

  CLOTHING: {
    type: 'CLOTHING', label: 'Clothing / Garments', labelUrdu: 'کپڑے کی دکان', emoji: '👕',
    description: 'Clothing stores, boutiques, tailoring',
    category: 'Fashion', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'meter', 'gaj', 'yard', 'set', 'pair'],
    features: { ...DEFAULT_FEATURES, variants: true, variantImages: true, sizeMatrix: true, lengthWidthCalc: true, tailoring: true, alterations: true, measurements: true, reservations: true, layaway: true },
    suggestedCategories: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Fabric', 'Alterations', 'Tailoring'],
    highlights: ['👕 Size × Color matrix', '📏 Meter/gaj fabric', '✂️ Tailoring orders', '📐 Custom measurements', '💰 Layaway installments'],
    color: '#7c3aed', popular: true, minStock: 5, receiptSize: 'THERMAL_80MM', currency: 'PKR',
  },

  HARDWARE: {
    type: 'HARDWARE', label: 'Hardware / Construction', labelUrdu: 'ہارڈویئر', emoji: '🔧',
    description: 'Hardware, building materials, tools',
    category: 'Industrial', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'kg', 'meter', 'foot', 'bag', 'box', 'ton'],
    features: { ...DEFAULT_FEATURES, variants: true, lengthWidthCalc: true, weightBased: true, services: true, multiUnit: true, bulkPricing: true, quotations: true, projectTracking: true, delivery: true },
    suggestedCategories: ['Cement', 'Steel', 'Paints', 'Tools', 'Electrical', 'Plumbing', 'Sanitary', 'Tiles'],
    highlights: ['📐 Length-based (pipes)', '⚖️ Weight-based (cement)', '📋 Quotations', '🏗️ Project tracking', '🚚 Bulk delivery'],
    color: '#f59e0b', popular: true, minStock: 10, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  BAKERY: {
    type: 'BAKERY', label: 'Bakery / Cake Shop', labelUrdu: 'بیکری', emoji: '🍰',
    description: 'Bakeries, sweet shops, cake shops',
    category: 'Food', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'kg', 'gram', 'dozen', 'pack', 'box'],
    features: { ...DEFAULT_FEATURES, weightBased: true, expiry: true, variants: true, customCakes: true, productionPlanning: true, ingredientTracking: true, delivery: true },
    suggestedCategories: ['Cakes', 'Pastries', 'Bread', 'Biscuits', 'Sweets', 'Beverages', 'Custom Orders'],
    highlights: ['🎂 Custom cake orders', '🥧 Production planning', '📅 Daily freshness tracking', '🥚 Ingredient management'],
    color: '#f97316', popular: false, minStock: 15, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  COSMETICS: {
    type: 'COSMETICS', label: 'Cosmetics / Beauty Products', labelUrdu: 'کاسمیٹکس', emoji: '💄',
    description: 'Cosmetics shops, beauty product stores',
    category: 'Lifestyle', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'ml', 'gram', 'pack'],
    features: { ...DEFAULT_FEATURES, variants: true, variantImages: true, expiry: true },
    suggestedCategories: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tools'],
    highlights: ['🎨 Shade variants', '📅 Expiry tracking', '🏷️ Brand catalog'],
    color: '#e11d48', popular: false, minStock: 5, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  STATIONERY: {
    type: 'STATIONERY', label: 'Stationery / Books', labelUrdu: 'اسٹیشنری', emoji: '📚',
    description: 'Stationery, bookstores, art supplies',
    category: 'Education', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'pack', 'box', 'ream', 'dozen'],
    features: { ...DEFAULT_FEATURES, variants: true, multiUnit: true, schoolLists: true, bookRentals: true },
    suggestedCategories: ['Books', 'Pens & Pencils', 'Notebooks', 'Art Supplies', 'Office', 'School Bags'],
    highlights: ['📚 School book lists', '📖 Book rentals', '📦 Bulk packs', '🎓 Grade-wise sets'],
    color: '#0891b2', popular: false, minStock: 20, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  CARPET: {
    type: 'CARPET', label: 'Carpets / Flooring', labelUrdu: 'قالین شاپ', emoji: '🏪',
    description: 'Carpet shops, tiles, rugs, flooring',
    category: 'Retail', defaultUnit: 'sqft',
    quickUnits: ['sqft', 'sqm', 'meter', 'roll', 'piece'],
    features: { ...DEFAULT_FEATURES, variants: true, variantImages: true, lengthWidthCalc: true, multiUnit: true, carpetRolls: true, cutPieces: true, reservations: true },
    suggestedCategories: ['Carpets', 'Floor Mats', 'Rugs', 'Tiles', 'Vinyl Flooring', 'Wood Flooring'],
    highlights: ['📐 Length × Width calc', '🎨 Color variants', '📊 sqft pricing', '📏 Roll & cut-piece tracking'],
    color: '#78350f', popular: false, minStock: 2, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  AUTO_PARTS: {
    type: 'AUTO_PARTS', label: 'Auto Parts / Workshop', labelUrdu: 'ورکشاپ / آٹو پارٹس', emoji: '🔩',
    description: 'Auto parts, workshops, mechanics',
    category: 'Automotive', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'set', 'liter', 'kg'],
    features: { ...DEFAULT_FEATURES, variants: true, warranty: true, services: true, vehicleTracking: true, compatibilityMatrix: true, repairs: true, quotations: true, serialNumber: true },
    suggestedCategories: ['Engine Parts', 'Brakes', 'Electrical', 'Body Parts', 'Filters', 'Oils & Fluids', 'Tires', 'Services'],
    highlights: ['🚗 Vehicle registration', '🔧 Service jobs', '🛡️ Warranty tracking', '🔗 Parts compatibility'],
    color: '#374151', popular: false, minStock: 5, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  MEAT: {
    type: 'MEAT', label: 'Meat / Butchery', labelUrdu: 'قصائی / گوشت', emoji: '🥩',
    description: 'Meat shops, butchery, halal shops',
    category: 'Food', defaultUnit: 'kg',
    quickUnits: ['kg', 'gram', 'piece', 'whole', 'half'],
    features: { ...DEFAULT_FEATURES, weightBased: true, expiry: true, slaughterLog: true, qualityTests: true, delivery: true, subscriptions: true, qurbani: true },
    suggestedCategories: ['Beef', 'Mutton', 'Chicken', 'Fish', 'Offal', 'Marinated', 'Frozen'],
    highlights: ['🐐 Live animal tracking', '⚖️ Weight orders', '🕌 Halal slaughter log', '🌙 Qurbani bookings'],
    color: '#991b1b', popular: false, minStock: 10, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  DAIRY: {
    type: 'DAIRY', label: 'Dairy / Milk Shop', labelUrdu: 'ڈیری / دودھ', emoji: '🥛',
    description: 'Milk shops, dairy products',
    category: 'Food', defaultUnit: 'liter',
    quickUnits: ['liter', 'kg', 'gram', 'piece', 'packet'],
    features: { ...DEFAULT_FEATURES, weightBased: true, expiry: true, routes: true, delivery: true, subscriptions: true, qualityTests: true, farmerAccounts: true, credit: true },
    suggestedCategories: ['Fresh Milk', 'Yogurt/Dahi', 'Butter/Ghee', 'Cream', 'Paneer', 'Sweets'],
    highlights: ['🚚 Delivery routes', '📅 Daily subscriptions', '📒 Monthly khata', '🐄 Farmer accounts'],
    color: '#0369a1', popular: false, minStock: 20, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },

  AGRI: {
    type: 'AGRI', label: 'Agri / Seeds / Fertilizer', labelUrdu: 'زرعی سٹور', emoji: '🌾',
    description: 'Seeds, fertilizers, pesticides, feed',
    category: 'Agriculture', defaultUnit: 'kg',
    quickUnits: ['kg', 'bag', 'liter', 'gram'],
    features: { ...DEFAULT_FEATURES, weightBased: true, expiry: true, batches: true, farmerAccounts: true, credit: true, bulkPricing: true, cropAdvisory: true, seasonalPlans: true, govtSubsidy: true },
    suggestedCategories: ['Seeds', 'Fertilizer', 'Pesticide', 'Animal Feed', 'Poultry Feed', 'Tools', 'Vet Medicine'],
    highlights: ['👨‍🌾 Farmer khata', '🌱 Seasonal calendar', '💰 Govt subsidies', '📊 Crop advisory'],
    color: '#65a30d', popular: false, minStock: 20, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  JEWELRY: {
    type: 'JEWELRY', label: 'Jewelry / Sunar', labelUrdu: 'زیورات / صراف', emoji: '💎',
    description: 'Jewelry shops, sunar, zargar',
    category: 'Luxury', defaultUnit: 'gram',
    quickUnits: ['gram', 'tola', 'piece', 'set'],
    features: { ...DEFAULT_FEATURES, weightBased: true, purityTracking: true, hallmark: true, liveMetalRates: true, warranty: true, layaway: true, reservations: true },
    suggestedCategories: ['Gold', 'Silver', 'Diamond', 'Bridal Sets', 'Rings', 'Necklaces', 'Earrings', 'Bangles'],
    highlights: ['⚖️ Weight × purity pricing', '📈 Live gold rates', '🏅 Hallmark tracking', '🔄 Old gold exchange'],
    color: '#ca8a04', popular: false, minStock: 1, receiptSize: 'A4_DETAILED', currency: 'PKR',
  },

  HOTEL: {
    type: 'HOTEL', label: 'Hotel / Guest House', labelUrdu: 'ہوٹل / گیسٹ ہاؤس', emoji: '🏨',
    description: 'Hotels, guest houses, motels, resorts',
    category: 'Hospitality', defaultUnit: 'night',
    quickUnits: ['night', 'day', 'hour'],
    features: { ...DEFAULT_FEATURES, rooms: true, services: true, appointments: true, membership: true, credit: true },
    suggestedCategories: ['Rooms', 'Food & Beverage', 'Laundry', 'Spa', 'Transportation'],
    highlights: ['🛏️ Room bookings', '🧹 Housekeeping', '💳 Folio charges', '📅 Rate plans'],
    color: '#0d9488', popular: false, minStock: 0, receiptSize: 'A4_DETAILED', currency: 'PKR',
  },

  GYM: {
    type: 'GYM', label: 'Gym / Fitness Center', labelUrdu: 'جم / فٹنس', emoji: '💪',
    description: 'Gyms, fitness centers, health clubs',
    category: 'Fitness', defaultUnit: 'session',
    quickUnits: ['session', 'month', 'class'],
    features: { ...DEFAULT_FEATURES, services: true, appointments: true, membership: true, packages: true, bodyMeasurements: true, workoutTracking: true, dietPlans: true, classSchedule: true },
    suggestedCategories: ['Memberships', 'Personal Training', 'Classes', 'Supplements', 'Merchandise'],
    highlights: ['🏋️ Memberships', '📅 Class schedule', '📊 Body measurements', '🥗 Diet plans'],
    color: '#0f766e', popular: false, minStock: 0, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  CLINIC: {
    type: 'CLINIC', label: 'Clinic / Doctor', labelUrdu: 'کلینک / ڈاکٹر', emoji: '⚕️',
    description: 'Clinics, doctors, healthcare',
    category: 'Healthcare', defaultUnit: 'consultation',
    quickUnits: ['consultation', 'session', 'procedure'],
    features: { ...DEFAULT_FEATURES, services: true, appointments: true, patientRecords: true, labTests: true, vaccinations: true, dentalCharts: true, antenatal: true, physioSessions: true },
    suggestedCategories: ['Consultation', 'Lab Tests', 'Procedures', 'Vaccinations', 'Physio', 'Dental'],
    highlights: ['👨‍⚕️ Doctor profiles', '📅 Appointments', '📋 Patient records', '💊 Prescriptions', '🩺 SOAP notes'],
    color: '#0891b2', popular: false, minStock: 0, receiptSize: 'A4_DETAILED', currency: 'PKR',
  },

  SERVICE: {
    type: 'SERVICE', label: 'Service Business', labelUrdu: 'سروس بزنس', emoji: '🔧',
    description: 'Electrician, plumber, AC repair, cleaning',
    category: 'Service', defaultUnit: 'job',
    quickUnits: ['job', 'hour', 'visit'],
    features: { ...DEFAULT_FEATURES, services: true, appointments: true, warranty: true, amc: true, technicianDispatch: true, quotations: true, credit: true },
    suggestedCategories: ['Installation', 'Repair', 'Maintenance', 'Cleaning', 'AMC', 'Emergency'],
    highlights: ['🚐 Technician dispatch', '📋 Quotations', '🛡️ Warranty tracking', '📆 AMC contracts'],
    color: '#4338ca', popular: false, minStock: 0, receiptSize: 'A4_BASIC', currency: 'PKR',
  },

  GENERAL: {
    type: 'GENERAL', label: 'General Retail', labelUrdu: 'جنرل سٹور', emoji: '🏬',
    description: 'Mixed retail, other businesses',
    category: 'Other', defaultUnit: 'pcs',
    quickUnits: ['pcs', 'pack', 'box', 'kg', 'meter'],
    features: { ...DEFAULT_FEATURES, variants: true },
    suggestedCategories: ['General'],
    highlights: ['✅ All features available', '⚙️ Customize as needed'],
    color: '#6b7280', popular: false, minStock: 10, receiptSize: 'THERMAL_58MM', currency: 'PKR',
  },
};

export const BUSINESS_TYPE_OPTIONS = Object.values(BUSINESS_TEMPLATES).map((t) => ({
  value: t.type,
  label: t.label,
  labelUrdu: t.labelUrdu,
  emoji: t.emoji,
  description: t.description,
  category: t.category,
  color: t.color,
  popular: t.popular,
  highlights: t.highlights,
  defaultUnit: t.defaultUnit,
  featureCount: Object.values(t.features).filter(Boolean).length,
}));

export function getBusinessTemplate(type: string): BusinessTemplate {
  return BUSINESS_TEMPLATES[type] || BUSINESS_TEMPLATES.GENERAL;
}
