export const PAKISTAN_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  'Sheikhupura', 'Mirpur Khas', 'Rahim Yar Khan', 'Jhang', 'Mardan',
  'Gujrat', 'Kasur', 'Dera Ghazi Khan', 'Sahiwal', 'Nawabshah',
  'Mingora', 'Okara', 'Burewala', 'Jacobabad', 'Muzaffargarh',
  'Khanpur', 'Other',
];

export const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
  'Islamabad Capital Territory',
];

export const BUSINESS_TYPES = [
  { value: 'KIRYANA', label: 'Kiryana / General Store', emoji: '🛒', category: 'Retail' },
  { value: 'BAKERY', label: 'Bakery / Sweets', emoji: '🍰', category: 'Food' },
  { value: 'PHARMACY', label: 'Pharmacy / Medical', emoji: '💊', category: 'Healthcare' },
  { value: 'MOBILE_SHOP', label: 'Mobile / Electronics', emoji: '📱', category: 'Electronics' },
  { value: 'RESTAURANT', label: 'Restaurant / Dhaba', emoji: '🍽️', category: 'Food' },
  { value: 'COSMETICS', label: 'Cosmetics / Beauty', emoji: '💄', category: 'Lifestyle' },
  { value: 'CLOTHING', label: 'Clothing / Garments', emoji: '👕', category: 'Fashion' },
  { value: 'HARDWARE', label: 'Hardware / Tools', emoji: '🔧', category: 'Industrial' },
  { value: 'STATIONERY', label: 'Stationery / Books', emoji: '📚', category: 'Education' },
  { value: 'OTHER', label: 'Other Business', emoji: '🏪', category: 'Other' },
];

export const BUSINESS_SIZES = [
  { value: 'SMALL', label: 'Small', desc: '1-2 staff, 1 location', icon: '🏠' },
  { value: 'MEDIUM', label: 'Medium', desc: '3-10 staff, 1-2 shops', icon: '🏢' },
  { value: 'LARGE', label: 'Large', desc: '10+ staff, multi-branch', icon: '🏬' },
];

export const PREFERRED_LANGUAGES = [
  { value: 'ur', label: 'اردو', english: 'Urdu' },
  { value: 'en', label: 'English', english: 'English' },
  { value: 'roman_ur', label: 'Roman Urdu', english: 'Roman Urdu' },
];

export const RECEIPT_TEMPLATES = [
  { value: 'THERMAL_58MM', label: '58mm Thermal', desc: 'Small thermal printer (2.3")' },
  { value: 'THERMAL_80MM', label: '80mm Thermal', desc: 'Standard thermal (3.1")' },
  { value: 'BASIC', label: 'A4 Basic', desc: 'Plain A4 paper' },
  { value: 'DETAILED', label: 'A4 Detailed', desc: 'A4 with logo + footer' },
];

export const PAYMENT_METHODS_LIST = [
  { value: 'CASH', label: 'Cash', emoji: '💵', default: true },
  { value: 'JAZZCASH', label: 'JazzCash', emoji: '📱' },
  { value: 'EASYPAISA', label: 'EasyPaisa', emoji: '💚' },
  { value: 'CARD', label: 'Debit/Credit Card', emoji: '💳' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', emoji: '🏦' },
];

export const WORKING_DAYS = [
  { value: 'mon', label: 'Monday', short: 'Mon' },
  { value: 'tue', label: 'Tuesday', short: 'Tue' },
  { value: 'wed', label: 'Wednesday', short: 'Wed' },
  { value: 'thu', label: 'Thursday', short: 'Thu' },
  { value: 'fri', label: 'Friday', short: 'Fri' },
  { value: 'sat', label: 'Saturday', short: 'Sat' },
  { value: 'sun', label: 'Sunday', short: 'Sun' },
];

// Suggested categories by business type
export const SUGGESTED_CATEGORIES: Record<string, string[]> = {
  KIRYANA: ['Daal & Chawal', 'Aata & Maida', 'Tel & Ghee', 'Cheeni & Chai', 'Masala', 'Biscuits', 'Drinks', 'Soap & Surf'],
  BAKERY: ['Cakes', 'Pastries', 'Bread', 'Biscuits', 'Sweets', 'Beverages'],
  PHARMACY: ['Tablets', 'Syrups', 'Injections', 'Surgical', 'Baby Care', 'Vitamins', 'OTC'],
  MOBILE_SHOP: ['Phones', 'Accessories', 'Chargers', 'Earphones', 'Covers', 'SIM Cards', 'Repair'],
  RESTAURANT: ['Starters', 'Main Course', 'BBQ', 'Desserts', 'Beverages', 'Deals'],
  COSMETICS: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tools'],
  CLOTHING: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear'],
  HARDWARE: ['Tools', 'Paints', 'Plumbing', 'Electrical', 'Fasteners'],
  STATIONERY: ['Books', 'Pens', 'Notebooks', 'Art Supplies', 'Office'],
  OTHER: ['General'],
};

export const TOTAL_STEPS = 6;
