export const TOTAL_STEPS = 8;

export const STEP_LABELS: Record<number, { title: string; desc: string; emoji: string; estimatedMin: number }> = {
  1: { title: 'Business Type', desc: 'Apni industry select karein', emoji: '🏪', estimatedMin: 1 },
  2: { title: 'Owner Profile', desc: 'Apni tafseelat', emoji: '👤', estimatedMin: 1 },
  3: { title: 'Shop Details', desc: 'Dukaan ki jaghah aur waqt', emoji: '📍', estimatedMin: 2 },
  4: { title: 'Preferences', desc: 'Payment, receipt, categories', emoji: '⚙️', estimatedMin: 2 },
  5: { title: 'Features', desc: 'Industry-specific features toggle', emoji: '✨', estimatedMin: 1 },
  6: { title: 'First Products', desc: 'Kuch products add karein (ya samples use karein)', emoji: '📦', estimatedMin: 3 },
  7: { title: 'Team Members', desc: 'Apni team add karein', emoji: '👥', estimatedMin: 2 },
  8: { title: 'All Set!', desc: 'Software ready hai — chalo shuru karte hain', emoji: '🎉', estimatedMin: 1 },
};

export const PAKISTAN_PROVINCES = [
  { value: 'PUNJAB', label: 'Punjab' },
  { value: 'SINDH', label: 'Sindh' },
  { value: 'KPK', label: 'Khyber Pakhtunkhwa' },
  { value: 'BALOCHISTAN', label: 'Balochistan' },
  { value: 'GB', label: 'Gilgit-Baltistan' },
  { value: 'AJK', label: 'Azad Jammu & Kashmir' },
  { value: 'ICT', label: 'Islamabad Capital Territory' },
];

export const BUSINESS_SIZES = [
  { value: 'MICRO', label: 'Micro', desc: 'Ghar se, 1 person', icon: '🏠', staffRange: '1', monthlyRevenue: '< 100K' },
  { value: 'SMALL', label: 'Small', desc: '1-3 staff, 1 shop', icon: '🏪', staffRange: '1-3', monthlyRevenue: '100K - 500K' },
  { value: 'MEDIUM', label: 'Medium', desc: '4-15 staff, 1-3 shops', icon: '🏢', staffRange: '4-15', monthlyRevenue: '500K - 5M' },
  { value: 'LARGE', label: 'Large', desc: '15+ staff, multi-branch', icon: '🏬', staffRange: '15+', monthlyRevenue: '5M+' },
];

export const PREFERRED_LANGUAGES = [
  { value: 'ur', label: 'اردو', english: 'Urdu' },
  { value: 'en', label: 'English', english: 'English' },
  { value: 'roman_ur', label: 'Roman Urdu', english: 'Roman Urdu (Urdu in English letters)' },
];

export const RECEIPT_TEMPLATES = [
  { value: 'THERMAL_58MM', label: '58mm Thermal', desc: 'Small thermal printer (2.3")', icon: '🖨️' },
  { value: 'THERMAL_80MM', label: '80mm Thermal', desc: 'Standard thermal (3.1")', icon: '🖨️' },
  { value: 'A4_BASIC', label: 'A4 Basic', desc: 'Plain A4 paper', icon: '📄' },
  { value: 'A4_DETAILED', label: 'A4 Detailed', desc: 'A4 with logo + footer', icon: '📃' },
];

export const PAYMENT_METHODS_LIST = [
  { value: 'CASH', label: 'Cash', emoji: '💵', default: true },
  { value: 'JAZZCASH', label: 'JazzCash', emoji: '📱' },
  { value: 'EASYPAISA', label: 'EasyPaisa', emoji: '💚' },
  { value: 'CARD', label: 'Debit/Credit Card', emoji: '💳' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', emoji: '🏦' },
  { value: 'RAAST', label: 'Raast', emoji: '⚡' },
  { value: 'SADAPAY', label: 'SadaPay', emoji: '💜' },
  { value: 'NAYAPAY', label: 'NayaPay', emoji: '🔵' },
];

export const WORKING_DAYS = [
  { value: 'mon', label: 'Monday', short: 'Mon', urdu: 'پیر' },
  { value: 'tue', label: 'Tuesday', short: 'Tue', urdu: 'منگل' },
  { value: 'wed', label: 'Wednesday', short: 'Wed', urdu: 'بدھ' },
  { value: 'thu', label: 'Thursday', short: 'Thu', urdu: 'جمعرات' },
  { value: 'fri', label: 'Friday', short: 'Fri', urdu: 'جمعہ' },
  { value: 'sat', label: 'Saturday', short: 'Sat', urdu: 'ہفتہ' },
  { value: 'sun', label: 'Sunday', short: 'Sun', urdu: 'اتوار' },
];

export const CURRENCIES = [
  { value: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs', default: true },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
];

export const TEAM_ROLES = [
  { value: 'MANAGER', label: 'Manager', desc: 'Full access except billing', icon: '👔' },
  { value: 'CASHIER', label: 'Cashier', desc: 'POS + sales access', icon: '💰' },
  { value: 'STAFF', label: 'Staff', desc: 'Basic inventory access', icon: '👤' },
];
