/**
 * Industry-specific expense category presets.
 *
 * Every business has different money-out patterns:
 *   • Restaurant → Kitchen gas, ingredients, delivery bike fuel
 *   • Mobile shop → Repair parts, PTA fees, technician salary
 *   • Carpet → Roll cutting, delivery van, installation labor
 *   • Pharmacy → Cold storage electric, license fees, expired disposal
 *
 * Each preset carries name, color, emoji, and typical monthly amount range
 * (for budget planning suggestions later).
 */

export interface ExpensePreset {
  name: string;
  color: string;
  emoji: string;
  typicalMonthly?: { min: number; max: number };  // PKR range
  isRecurring?: boolean;  // Monthly/weekly recurring by default
}

export interface IndustryExpensePresets {
  categories: ExpensePreset[];
}

// ═══════════════════════════════════════════════════════════════
// 🌐 COMMON (shared across all industries)
// ═══════════════════════════════════════════════════════════════
const COMMON_EXPENSES: ExpensePreset[] = [
  { name: 'Rent', color: '#ef4444', emoji: '🏠', typicalMonthly: { min: 20000, max: 150000 }, isRecurring: true },
  { name: 'Electricity Bill', color: '#eab308', emoji: '💡', typicalMonthly: { min: 5000, max: 50000 }, isRecurring: true },
  { name: 'Gas Bill', color: '#f97316', emoji: '🔥', typicalMonthly: { min: 2000, max: 20000 }, isRecurring: true },
  { name: 'Water Bill', color: '#06b6d4', emoji: '💧', typicalMonthly: { min: 500, max: 3000 }, isRecurring: true },
  { name: 'Internet & Wi-Fi', color: '#3b82f6', emoji: '📶', typicalMonthly: { min: 2000, max: 10000 }, isRecurring: true },
  { name: 'Mobile / Phone Bill', color: '#0ea5e9', emoji: '📱', typicalMonthly: { min: 500, max: 5000 }, isRecurring: true },
  { name: 'Staff Salary', color: '#8b5cf6', emoji: '👥', typicalMonthly: { min: 20000, max: 500000 }, isRecurring: true },
  { name: 'Tea & Refreshments', color: '#a855f7', emoji: '☕', typicalMonthly: { min: 2000, max: 15000 }, isRecurring: true },
  { name: 'Cleaning & Sanitation', color: '#22c55e', emoji: '🧹', typicalMonthly: { min: 1000, max: 8000 }, isRecurring: true },
  { name: 'Transportation / Fuel', color: '#f97316', emoji: '⛽', typicalMonthly: { min: 3000, max: 30000 }, isRecurring: true },
  { name: 'Repairs & Maintenance', color: '#78716c', emoji: '🔧', typicalMonthly: { min: 1000, max: 20000 } },
  { name: 'Marketing & Ads', color: '#ec4899', emoji: '📣', typicalMonthly: { min: 2000, max: 100000 } },
  { name: 'Bank Charges', color: '#64748b', emoji: '🏦', typicalMonthly: { min: 500, max: 5000 }, isRecurring: true },
  { name: 'Tax / GST', color: '#dc2626', emoji: '🧾', typicalMonthly: { min: 1000, max: 100000 }, isRecurring: true },
  { name: 'Stationery & Printing', color: '#14b8a6', emoji: '📄', typicalMonthly: { min: 500, max: 5000 } },
  { name: 'Security Guard', color: '#475569', emoji: '🛡️', typicalMonthly: { min: 15000, max: 40000 }, isRecurring: true },
  { name: 'Miscellaneous', color: '#94a3b8', emoji: '📦' },
];

// ═══════════════════════════════════════════════════════════════
// 🧶 CARPET
// ═══════════════════════════════════════════════════════════════
export const CARPET_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Roll Cutting Labor', color: '#8b5cf6', emoji: '✂️', typicalMonthly: { min: 5000, max: 30000 } },
    { name: 'Installation Labor', color: '#f59e0b', emoji: '🔨', typicalMonthly: { min: 10000, max: 80000 } },
    { name: 'Delivery Van Fuel', color: '#f97316', emoji: '🚚', typicalMonthly: { min: 5000, max: 40000 }, isRecurring: true },
    { name: 'Glue & Adhesives', color: '#84cc16', emoji: '🧪', typicalMonthly: { min: 2000, max: 20000 } },
    { name: 'Underlay & Padding', color: '#06b6d4', emoji: '🧵', typicalMonthly: { min: 3000, max: 25000 } },
    { name: 'Sample Booklets', color: '#ec4899', emoji: '📖', typicalMonthly: { min: 1000, max: 10000 } },
    { name: 'Warehouse Rent', color: '#dc2626', emoji: '🏭', typicalMonthly: { min: 15000, max: 100000 }, isRecurring: true },
    { name: 'Roll Storage Racks', color: '#78716c', emoji: '📦' },
    { name: 'Import Duties', color: '#a855f7', emoji: '🛂' },
    { name: 'Customer Freight', color: '#f59e0b', emoji: '📮' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE
// ═══════════════════════════════════════════════════════════════
export const MOBILE_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Repair Parts Purchase', color: '#3b82f6', emoji: '🔩', typicalMonthly: { min: 10000, max: 100000 } },
    { name: 'Technician Salary', color: '#8b5cf6', emoji: '🔧', typicalMonthly: { min: 25000, max: 80000 }, isRecurring: true },
    { name: 'PTA Registration Fees', color: '#ef4444', emoji: '📋' },
    { name: 'Screen Protectors Stock', color: '#0ea5e9', emoji: '📱' },
    { name: 'Repair Tools & Machines', color: '#f97316', emoji: '🛠️' },
    { name: 'Software Licenses', color: '#a855f7', emoji: '💾' },
    { name: 'IMEI Verification Fees', color: '#dc2626', emoji: '🔒' },
    { name: 'Warranty Claims', color: '#14b8a6', emoji: '🛡️' },
    { name: 'Display Counter Rent', color: '#f59e0b', emoji: '🏬', typicalMonthly: { min: 5000, max: 30000 } },
    { name: 'Insurance', color: '#22c55e', emoji: '🛡️', isRecurring: true },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🍽️ RESTAURANT
// ═══════════════════════════════════════════════════════════════
export const RESTAURANT_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Kitchen Gas Cylinders', color: '#f97316', emoji: '🔥', typicalMonthly: { min: 8000, max: 60000 }, isRecurring: true },
    { name: 'Raw Ingredients / Groceries', color: '#22c55e', emoji: '🥕', typicalMonthly: { min: 50000, max: 500000 }, isRecurring: true },
    { name: 'Meat Purchase', color: '#dc2626', emoji: '🥩', typicalMonthly: { min: 30000, max: 300000 }, isRecurring: true },
    { name: 'Dairy Purchase', color: '#0ea5e9', emoji: '🥛', typicalMonthly: { min: 10000, max: 80000 }, isRecurring: true },
    { name: 'Beverages Stock', color: '#3b82f6', emoji: '🥤', typicalMonthly: { min: 15000, max: 100000 }, isRecurring: true },
    { name: 'Chef & Kitchen Staff', color: '#8b5cf6', emoji: '👨‍🍳', typicalMonthly: { min: 50000, max: 300000 }, isRecurring: true },
    { name: 'Waiters & Service', color: '#a855f7', emoji: '🍽️', typicalMonthly: { min: 30000, max: 200000 }, isRecurring: true },
    { name: 'Delivery Rider Salary', color: '#ec4899', emoji: '🏍️', typicalMonthly: { min: 20000, max: 100000 }, isRecurring: true },
    { name: 'Bike/Rider Fuel', color: '#f59e0b', emoji: '⛽', typicalMonthly: { min: 5000, max: 40000 }, isRecurring: true },
    { name: 'Food Packaging & Boxes', color: '#84cc16', emoji: '📦', typicalMonthly: { min: 5000, max: 40000 }, isRecurring: true },
    { name: 'Disposables (Cutlery/Cups)', color: '#eab308', emoji: '🥢' },
    { name: 'Aggregator Commission (Foodpanda etc)', color: '#dc2626', emoji: '💳', typicalMonthly: { min: 10000, max: 200000 }, isRecurring: true },
    { name: 'License & Health Permits', color: '#a855f7', emoji: '📜' },
    { name: 'Menu Printing', color: '#f97316', emoji: '📖' },
    { name: 'Kitchen Equipment Repair', color: '#78716c', emoji: '🔧' },
    { name: 'Pest Control', color: '#22c55e', emoji: '🪲', isRecurring: true },
    { name: 'Interior Decoration', color: '#ec4899', emoji: '🎨' },
    { name: 'Music / Entertainment', color: '#a855f7', emoji: '🎵' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💎 JEWELRY
// ═══════════════════════════════════════════════════════════════
export const JEWELRY_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Gold Purchase', color: '#eab308', emoji: '🟨', typicalMonthly: { min: 100000, max: 5000000 } },
    { name: 'Silver Purchase', color: '#94a3b8', emoji: '⚪' },
    { name: 'Diamond & Stones', color: '#e2e8f0', emoji: '💎' },
    { name: 'Karigar / Craftsman Wages', color: '#8b5cf6', emoji: '👨‍🎨', typicalMonthly: { min: 30000, max: 200000 }, isRecurring: true },
    { name: 'Melting & Refining', color: '#f97316', emoji: '🔥' },
    { name: 'Polishing & Finishing', color: '#a855f7', emoji: '✨' },
    { name: 'Hallmarking Fees', color: '#10b981', emoji: '🏷️' },
    { name: 'Diamond Certification', color: '#0ea5e9', emoji: '📜' },
    { name: 'Safe / Vault Rent', color: '#dc2626', emoji: '🔐', typicalMonthly: { min: 5000, max: 30000 }, isRecurring: true },
    { name: 'Insurance (High Value)', color: '#22c55e', emoji: '🛡️', typicalMonthly: { min: 10000, max: 100000 }, isRecurring: true },
    { name: 'Security Guards', color: '#475569', emoji: '👮', typicalMonthly: { min: 25000, max: 80000 }, isRecurring: true },
    { name: 'CCTV & Alarm System', color: '#78716c', emoji: '📹' },
    { name: 'Display Cases', color: '#f59e0b', emoji: '🪟' },
    { name: 'Jewelry Boxes & Packaging', color: '#ec4899', emoji: '🎁' },
    { name: 'Exhibition & Trade Show', color: '#a855f7', emoji: '🎪' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🚗 AUTO PARTS
// ═══════════════════════════════════════════════════════════════
export const AUTOPARTS_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Parts Stock Purchase', color: '#3b82f6', emoji: '🔩', typicalMonthly: { min: 50000, max: 500000 } },
    { name: 'Mechanic Wages', color: '#8b5cf6', emoji: '🔧', typicalMonthly: { min: 25000, max: 120000 }, isRecurring: true },
    { name: 'Workshop Tools', color: '#f97316', emoji: '🛠️' },
    { name: 'Diagnostic Equipment', color: '#0ea5e9', emoji: '💻' },
    { name: 'Lift & Jack Maintenance', color: '#78716c', emoji: '⬆️' },
    { name: 'Oil Disposal Fees', color: '#ef4444', emoji: '🛢️' },
    { name: 'Air Compressor Service', color: '#06b6d4', emoji: '💨' },
    { name: 'Welding Gas', color: '#f97316', emoji: '🔥', isRecurring: true },
    { name: 'Workshop Rent', color: '#dc2626', emoji: '🏭', typicalMonthly: { min: 20000, max: 150000 }, isRecurring: true },
    { name: 'Tyre Machine Service', color: '#78716c', emoji: '⚙️' },
    { name: 'Vehicle Insurance', color: '#22c55e', emoji: '🛡️', isRecurring: true },
    { name: 'Sublet Repairs', color: '#a855f7', emoji: '🔗' },
    { name: 'Warranty Claims', color: '#14b8a6', emoji: '📋' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💊 PHARMACY
// ═══════════════════════════════════════════════════════════════
export const PHARMACY_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Medicine Stock Purchase', color: '#3b82f6', emoji: '💊', typicalMonthly: { min: 100000, max: 2000000 } },
    { name: 'Cold Storage Electric', color: '#0ea5e9', emoji: '❄️', typicalMonthly: { min: 5000, max: 30000 }, isRecurring: true },
    { name: 'Pharmacist Salary', color: '#8b5cf6', emoji: '👨‍⚕️', typicalMonthly: { min: 40000, max: 150000 }, isRecurring: true },
    { name: 'Refrigerator Purchase', color: '#06b6d4', emoji: '🧊' },
    { name: 'Expired Medicine Disposal', color: '#ef4444', emoji: '🗑️' },
    { name: 'Drug License Renewal', color: '#dc2626', emoji: '📜', isRecurring: true },
    { name: 'DRAP Registration Fees', color: '#a855f7', emoji: '📋' },
    { name: 'Prescription Software', color: '#0ea5e9', emoji: '💻', isRecurring: true },
    { name: 'Delivery Boy Salary', color: '#ec4899', emoji: '🏍️', isRecurring: true },
    { name: 'Delivery Fuel', color: '#f97316', emoji: '⛽', isRecurring: true },
    { name: 'Sample & Marketing', color: '#a855f7', emoji: '🎁' },
    { name: 'Continuous Education / CPD', color: '#14b8a6', emoji: '🎓' },
    { name: 'Insurance Claims Processing', color: '#22c55e', emoji: '🏥' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 👗 GARMENTS
// ═══════════════════════════════════════════════════════════════
export const GARMENTS_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Fabric Purchase', color: '#ec4899', emoji: '🧵', typicalMonthly: { min: 30000, max: 500000 } },
    { name: 'Ready-Made Stock', color: '#8b5cf6', emoji: '👗' },
    { name: 'Tailor / Master Salary', color: '#f59e0b', emoji: '✂️', typicalMonthly: { min: 20000, max: 100000 }, isRecurring: true },
    { name: 'Embroidery & Handwork', color: '#a855f7', emoji: '🪡' },
    { name: 'Sewing Machines', color: '#3b82f6', emoji: '⚙️' },
    { name: 'Thread & Buttons Stock', color: '#eab308', emoji: '🧶' },
    { name: 'Hangers & Display', color: '#78716c', emoji: '👔' },
    { name: 'Mannequins', color: '#94a3b8', emoji: '🧍' },
    { name: 'Fashion Show / Events', color: '#dc2626', emoji: '🎭' },
    { name: 'Photography (Lookbook)', color: '#f97316', emoji: '📷' },
    { name: 'Model Fees', color: '#ec4899', emoji: '💃' },
    { name: 'Alterations Labor', color: '#14b8a6', emoji: '🪡' },
    { name: 'Steaming & Ironing', color: '#0ea5e9', emoji: '💨' },
    { name: 'Shopping Bags', color: '#a855f7', emoji: '🛍️' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🔨 HARDWARE
// ═══════════════════════════════════════════════════════════════
export const HARDWARE_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Hardware Stock Purchase', color: '#f59e0b', emoji: '🔨', typicalMonthly: { min: 50000, max: 500000 } },
    { name: 'Cement & Building Material', color: '#94a3b8', emoji: '🧱' },
    { name: 'Steel & Rods Stock', color: '#78716c', emoji: '⚙️' },
    { name: 'Pipes & Fittings Stock', color: '#0ea5e9', emoji: '🚰' },
    { name: 'Paint Stock', color: '#8b5cf6', emoji: '🎨' },
    { name: 'Loading / Unloading Labor', color: '#a855f7', emoji: '💪', isRecurring: true },
    { name: 'Delivery Truck Fuel', color: '#f97316', emoji: '🚚', isRecurring: true },
    { name: 'Warehouse Rent', color: '#dc2626', emoji: '🏭', typicalMonthly: { min: 20000, max: 150000 }, isRecurring: true },
    { name: 'Forklift Maintenance', color: '#eab308', emoji: '🚜' },
    { name: 'Contractor Discount', color: '#14b8a6', emoji: '💰' },
    { name: 'Sample & Catalog', color: '#ec4899', emoji: '📖' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🐄 DAIRY
// ═══════════════════════════════════════════════════════════════
export const DAIRY_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Milk Purchase from Farmers', color: '#0ea5e9', emoji: '🥛', typicalMonthly: { min: 100000, max: 2000000 }, isRecurring: true },
    { name: 'Cattle Feed', color: '#84cc16', emoji: '🌾', typicalMonthly: { min: 20000, max: 200000 }, isRecurring: true },
    { name: 'Cold Chain Electric', color: '#06b6d4', emoji: '❄️', typicalMonthly: { min: 10000, max: 80000 }, isRecurring: true },
    { name: 'Chiller / Freezer', color: '#0ea5e9', emoji: '🧊' },
    { name: 'Delivery Route Fuel', color: '#f97316', emoji: '⛽', isRecurring: true },
    { name: 'Milk Cans / Containers', color: '#94a3b8', emoji: '🥫' },
    { name: 'Farmer Advance Payments', color: '#f59e0b', emoji: '💰' },
    { name: 'Veterinary Services', color: '#a855f7', emoji: '🩺' },
    { name: 'Quality Test Kits', color: '#22c55e', emoji: '🧪' },
    { name: 'Packaging (Pouches/Bottles)', color: '#ec4899', emoji: '📦', isRecurring: true },
    { name: 'FDA / Halal Certification', color: '#10b981', emoji: '📜' },
    { name: 'Farm Rent / Lease', color: '#dc2626', emoji: '🏞️', isRecurring: true },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🥩 MEAT
// ═══════════════════════════════════════════════════════════════
export const MEAT_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Live Animal Purchase', color: '#dc2626', emoji: '🐄', typicalMonthly: { min: 100000, max: 5000000 } },
    { name: 'Slaughterhouse Fees', color: '#ef4444', emoji: '🔪' },
    { name: 'Butcher / Cutting Labor', color: '#f97316', emoji: '👨‍🍳', typicalMonthly: { min: 25000, max: 100000 }, isRecurring: true },
    { name: 'Cold Room Electricity', color: '#06b6d4', emoji: '❄️', typicalMonthly: { min: 10000, max: 80000 }, isRecurring: true },
    { name: 'Freezer Purchase', color: '#0ea5e9', emoji: '🧊' },
    { name: 'Halal Certification', color: '#10b981', emoji: '☪️' },
    { name: 'Veterinary Inspection', color: '#a855f7', emoji: '🩺' },
    { name: 'Meat Grinder & Machines', color: '#78716c', emoji: '⚙️' },
    { name: 'Packaging (Vacuum/Wrap)', color: '#ec4899', emoji: '📦', isRecurring: true },
    { name: 'Transport (Refrigerated)', color: '#f97316', emoji: '🚛', isRecurring: true },
    { name: 'Waste Disposal', color: '#78716c', emoji: '🗑️', isRecurring: true },
    { name: 'Qurbani Season Extra Staff', color: '#a855f7', emoji: '🕌' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🛒 RETAIL / GROCERY
// ═══════════════════════════════════════════════════════════════
export const RETAIL_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Product Stock Purchase', color: '#3b82f6', emoji: '📦', typicalMonthly: { min: 100000, max: 3000000 } },
    { name: 'Cashier Salary', color: '#8b5cf6', emoji: '💰', isRecurring: true },
    { name: 'Loader / Helper Wages', color: '#a855f7', emoji: '💪', isRecurring: true },
    { name: 'Shopping Bags', color: '#22c55e', emoji: '🛍️', isRecurring: true },
    { name: 'Barcode Labels', color: '#0ea5e9', emoji: '🏷️' },
    { name: 'POS Software / Subscription', color: '#f59e0b', emoji: '💻', isRecurring: true },
    { name: 'Receipt Paper Rolls', color: '#eab308', emoji: '🧾', isRecurring: true },
    { name: 'Shelving & Racks', color: '#78716c', emoji: '📚' },
    { name: 'Freezer / Chiller Electricity', color: '#06b6d4', emoji: '❄️', isRecurring: true },
    { name: 'Expired Stock Loss', color: '#ef4444', emoji: '⏰' },
    { name: 'Shoplifting Loss', color: '#dc2626', emoji: '🚨' },
    { name: 'Distributor Trade Discount', color: '#14b8a6', emoji: '💸' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🌾 AGRI
// ═══════════════════════════════════════════════════════════════
export const AGRI_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Fertilizer Stock Purchase', color: '#16a34a', emoji: '🌾', typicalMonthly: { min: 50000, max: 1000000 } },
    { name: 'Pesticide Stock', color: '#ef4444', emoji: '🧪' },
    { name: 'Seed Stock', color: '#84cc16', emoji: '🌱' },
    { name: 'Feed Stock (Poultry/Cattle)', color: '#f59e0b', emoji: '🌽' },
    { name: 'Farmer Advance / Bill', color: '#a855f7', emoji: '📋' },
    { name: 'Government Subsidy Processing', color: '#10b981', emoji: '🏛️' },
    { name: 'Warehouse Storage', color: '#dc2626', emoji: '🏭', isRecurring: true },
    { name: 'Agricultural Consultation', color: '#3b82f6', emoji: '👨‍🌾' },
    { name: 'Sprayer / Equipment Rent', color: '#78716c', emoji: '🚜' },
    { name: 'Sample Testing', color: '#0ea5e9', emoji: '🧫' },
    { name: 'Kharif Season Extra', color: '#22c55e', emoji: '☀️' },
    { name: 'Rabi Season Extra', color: '#0ea5e9', emoji: '❄️' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📚 BOOKSTORE
// ═══════════════════════════════════════════════════════════════
export const BOOKSTORE_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Book Purchase from Publishers', color: '#3b82f6', emoji: '📚', typicalMonthly: { min: 30000, max: 500000 } },
    { name: 'Stationery Stock', color: '#f59e0b', emoji: '📄' },
    { name: 'School Books (Seasonal)', color: '#8b5cf6', emoji: '🎒' },
    { name: 'Notebooks & Registers', color: '#22c55e', emoji: '📓', isRecurring: true },
    { name: 'Photocopy Machine Toner', color: '#78716c', emoji: '🖨️', isRecurring: true },
    { name: 'Photocopy Paper Reams', color: '#94a3b8', emoji: '📃', isRecurring: true },
    { name: 'Printing (Custom Books)', color: '#ec4899', emoji: '🖨️' },
    { name: 'Book Rental Refund/Deposits', color: '#a855f7', emoji: '💰' },
    { name: 'Damaged Books Loss', color: '#ef4444', emoji: '📖' },
    { name: 'School Distribution Commission', color: '#14b8a6', emoji: '🏫' },
    { name: 'Rack & Shelving', color: '#f97316', emoji: '📚' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL
// ═══════════════════════════════════════════════════════════════
export const HOTEL_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Room Amenities (Toiletries/Towels)', color: '#3b82f6', emoji: '🧴', isRecurring: true },
    { name: 'Bed Linen & Bedding', color: '#8b5cf6', emoji: '🛏️' },
    { name: 'Laundry & Dry Cleaning', color: '#06b6d4', emoji: '🧺', isRecurring: true },
    { name: 'Housekeeping Supplies', color: '#22c55e', emoji: '🧹', isRecurring: true },
    { name: 'Restaurant Kitchen Costs', color: '#f97316', emoji: '🍳' },
    { name: 'F&B Beverages', color: '#eab308', emoji: '🍷' },
    { name: 'Front Desk / Reception Salary', color: '#a855f7', emoji: '🛎️', isRecurring: true },
    { name: 'Housekeeping Staff', color: '#ec4899', emoji: '👥', isRecurring: true },
    { name: 'Chef & Kitchen Team', color: '#f59e0b', emoji: '👨‍🍳', isRecurring: true },
    { name: 'OTA Commission (Booking.com etc)', color: '#dc2626', emoji: '💳' },
    { name: 'Pool & Gym Maintenance', color: '#0ea5e9', emoji: '🏊', isRecurring: true },
    { name: 'AC Servicing (Central)', color: '#06b6d4', emoji: '❄️', isRecurring: true },
    { name: 'Elevator Maintenance', color: '#78716c', emoji: '🛗', isRecurring: true },
    { name: 'Generator Fuel (Diesel)', color: '#f97316', emoji: '⛽', isRecurring: true },
    { name: 'Guest Amenities (Complimentary)', color: '#ec4899', emoji: '🎁' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💇 SALON
// ═══════════════════════════════════════════════════════════════
export const SALON_EXPENSES: IndustryExpensePresets = {
  categories: [
    ...COMMON_EXPENSES,
    { name: 'Hair Products Stock', color: '#8b5cf6', emoji: '💇', typicalMonthly: { min: 10000, max: 100000 } },
    { name: 'Skin Care Products', color: '#ec4899', emoji: '💄' },
    { name: 'Wax & Threading Supplies', color: '#f59e0b', emoji: '🪮', isRecurring: true },
    { name: 'Nail Polish & Manicure', color: '#a855f7', emoji: '💅' },
    { name: 'Hair Color & Chemicals', color: '#f97316', emoji: '🎨', isRecurring: true },
    { name: 'Beautician Salary', color: '#ec4899', emoji: '👩‍💼', typicalMonthly: { min: 25000, max: 100000 }, isRecurring: true },
    { name: 'Hairstylist Commission', color: '#8b5cf6', emoji: '✂️', isRecurring: true },
    { name: 'Salon Chairs / Equipment', color: '#a855f7', emoji: '💺' },
    { name: 'Hair Dryers & Tools', color: '#dc2626', emoji: '💨' },
    { name: 'Towels & Aprons', color: '#22c55e', emoji: '🧺', isRecurring: true },
    { name: 'Training / Workshops', color: '#14b8a6', emoji: '🎓' },
    { name: 'Music / Ambience Fees', color: '#eab308', emoji: '🎵', isRecurring: true },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MASTER MAP
// ═══════════════════════════════════════════════════════════════
export const INDUSTRY_EXPENSE_PRESETS: Record<string, IndustryExpensePresets> = {
  carpet: CARPET_EXPENSES,
  mobile: MOBILE_EXPENSES,
  restaurant: RESTAURANT_EXPENSES,
  jewelry: JEWELRY_EXPENSES,
  autoparts: AUTOPARTS_EXPENSES,
  pharmacy: PHARMACY_EXPENSES,
  garments: GARMENTS_EXPENSES,
  hardware: HARDWARE_EXPENSES,
  dairy: DAIRY_EXPENSES,
  meat: MEAT_EXPENSES,
  retail: RETAIL_EXPENSES,
  agri: AGRI_EXPENSES,
  bookstore: BOOKSTORE_EXPENSES,
  hotel: HOTEL_EXPENSES,
  salon: SALON_EXPENSES,
};

export const GENERIC_EXPENSES: IndustryExpensePresets = {
  categories: COMMON_EXPENSES,
};

/**
 * Get expense presets for the current industry, with fallback to generic.
 */
export function getIndustryExpensePresets(industryId?: string | null): IndustryExpensePresets {
  if (industryId && INDUSTRY_EXPENSE_PRESETS[industryId]) {
    return INDUSTRY_EXPENSE_PRESETS[industryId];
  }
  return GENERIC_EXPENSES;
}
