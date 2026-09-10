/**
 * Electronics ki tamam categories, conditions aur unke labels — ek jagah.
 *
 * Ye values Prisma ke `ElectronicsCategoryType` / `ElectronicsConditionType`
 * enums se BILKUL match karti hain. Pehle wizard me default `SMARTPHONE`
 * aur `NEW` likha hua tha jo enum me hain hi nahi — is wajah se wizard se
 * banaya gaya har product save par fail ho jata tha.
 */

export const CATEGORY_TYPES = [
  'CABLE', 'CHARGER', 'POWER_BANK', 'HEADPHONE', 'EARBUD', 'SPEAKER',
  'BLUETOOTH_SPEAKER', 'SMARTWATCH', 'FITNESS_BAND', 'DRONE', 'CAMERA',
  'DSLR', 'ACTION_CAMERA', 'WEBCAM', 'KEYBOARD', 'MOUSE', 'MONITOR',
  'LAPTOP_ACCESSORY', 'PHONE_ACCESSORY', 'CAR_ACCESSORY', 'SMART_HOME',
  'LED_LIGHT', 'ROUTER', 'MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD',
  'ADAPTER', 'CONVERTER', 'SCREEN_PROTECTOR', 'MOBILE_CASE',
  'TABLET_ACCESSORY', 'VR_HEADSET', 'PROJECTOR', 'MICROPHONE', 'TRIPOD',
  'GIMBAL', 'OTHER',
] as const;

export type CategoryType = typeof CATEGORY_TYPES[number];

export const CONDITION_TYPES = [
  'BRAND_NEW', 'OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED', 'FOR_PARTS',
] as const;

export type ConditionType = typeof CONDITION_TYPES[number];

/** Har category ka aasaan naam + emoji (Pakistan me jo bola jata hai) */
export const CATEGORY_META: Record<CategoryType, { label: string; emoji: string; urdu?: string }> = {
  CABLE:            { label: 'Cable',            emoji: '🔌', urdu: 'Taar' },
  CHARGER:          { label: 'Charger',          emoji: '⚡', urdu: 'Charger' },
  POWER_BANK:       { label: 'Power Bank',       emoji: '🔋' },
  HEADPHONE:        { label: 'Headphones',       emoji: '🎧' },
  EARBUD:           { label: 'Earbuds',          emoji: '🎵', urdu: 'Handsfree' },
  SPEAKER:          { label: 'Speaker',          emoji: '🔊' },
  BLUETOOTH_SPEAKER:{ label: 'Bluetooth Speaker',emoji: '📻' },
  MICROPHONE:       { label: 'Microphone',       emoji: '🎤', urdu: 'Mic' },
  SMARTWATCH:       { label: 'Smart Watch',      emoji: '⌚' },
  FITNESS_BAND:     { label: 'Fitness Band',     emoji: '📿' },
  VR_HEADSET:       { label: 'VR Headset',       emoji: '🥽' },
  DRONE:            { label: 'Drone',            emoji: '🚁' },
  CAMERA:           { label: 'Camera',           emoji: '📷' },
  DSLR:             { label: 'DSLR',             emoji: '📸' },
  ACTION_CAMERA:    { label: 'Action Camera',    emoji: '🎬' },
  TRIPOD:           { label: 'Tripod',           emoji: '🦯' },
  GIMBAL:           { label: 'Gimbal',           emoji: '🎥' },
  WEBCAM:           { label: 'Webcam',           emoji: '📹' },
  KEYBOARD:         { label: 'Keyboard',         emoji: '⌨️' },
  MOUSE:            { label: 'Mouse',            emoji: '🖱️' },
  MONITOR:          { label: 'Monitor / Screen', emoji: '🖥️', urdu: 'Screen' },
  PROJECTOR:        { label: 'Projector',        emoji: '📽️' },
  LAPTOP_ACCESSORY: { label: 'Laptop Accessory', emoji: '💻' },
  ROUTER:           { label: 'Router / WiFi',    emoji: '📶' },
  MEMORY_CARD:      { label: 'Memory Card',      emoji: '💳' },
  USB_DRIVE:        { label: 'USB Drive',        emoji: '💾', urdu: 'USB' },
  HARD_DRIVE:       { label: 'Hard Drive',       emoji: '🗄️' },
  SSD:              { label: 'SSD',              emoji: '⚡' },
  PHONE_ACCESSORY:  { label: 'Phone Accessory',  emoji: '📱' },
  MOBILE_CASE:      { label: 'Mobile Cover',     emoji: '🛡️', urdu: 'Cover' },
  SCREEN_PROTECTOR: { label: 'Screen Protector', emoji: '🪟', urdu: 'Glass' },
  TABLET_ACCESSORY: { label: 'Tablet Accessory', emoji: '📲' },
  ADAPTER:          { label: 'Adapter',          emoji: '🔩' },
  CONVERTER:        { label: 'Converter',        emoji: '🔄' },
  CAR_ACCESSORY:    { label: 'Car Accessory',    emoji: '🚗' },
  SMART_HOME:       { label: 'Smart Home',       emoji: '🏠' },
  LED_LIGHT:        { label: 'LED Light',        emoji: '💡' },
  OTHER:            { label: 'Other',            emoji: '📦' },
};

/** Picker me categories khandaan ke hisab se — dhoondna aasan ho jata hai */
export const CATEGORY_GROUPS: { label: string; emoji: string; items: CategoryType[] }[] = [
  { label: 'Audio', emoji: '🎧', items: ['HEADPHONE', 'EARBUD', 'SPEAKER', 'BLUETOOTH_SPEAKER', 'MICROPHONE'] },
  { label: 'Power & Cables', emoji: '⚡', items: ['CHARGER', 'POWER_BANK', 'CABLE', 'ADAPTER', 'CONVERTER'] },
  { label: 'Phone & Tablet', emoji: '📱', items: ['PHONE_ACCESSORY', 'MOBILE_CASE', 'SCREEN_PROTECTOR', 'TABLET_ACCESSORY'] },
  { label: 'Computer', emoji: '💻', items: ['KEYBOARD', 'MOUSE', 'MONITOR', 'LAPTOP_ACCESSORY', 'WEBCAM', 'ROUTER'] },
  { label: 'Storage', emoji: '💾', items: ['MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD'] },
  { label: 'Camera', emoji: '📷', items: ['CAMERA', 'DSLR', 'ACTION_CAMERA', 'DRONE', 'TRIPOD', 'GIMBAL'] },
  { label: 'Wearable', emoji: '⌚', items: ['SMARTWATCH', 'FITNESS_BAND', 'VR_HEADSET'] },
  { label: 'Home & Car', emoji: '🏠', items: ['SMART_HOME', 'LED_LIGHT', 'PROJECTOR', 'CAR_ACCESSORY'] },
  { label: 'Baqi', emoji: '📦', items: ['OTHER'] },
];

export const CONDITION_META: Record<ConditionType, {
  label: string; emoji: string; hint: string; chip: string;
}> = {
  BRAND_NEW: {
    label: 'Brand New', emoji: '✨', hint: 'Seal pack, kabhi khula nahi',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  OPEN_BOX: {
    label: 'Open Box', emoji: '📦', hint: 'Dabba khula, cheez nayi',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  REFURBISHED: {
    label: 'Refurbished', emoji: '🔧', hint: 'Company ne theek karke bheja',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  USED: {
    label: 'Used', emoji: '♻️', hint: 'Istemal shuda',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  DAMAGED: {
    label: 'Damaged', emoji: '⚠️', hint: 'Kharab — kam qeemat par',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  FOR_PARTS: {
    label: 'For Parts', emoji: '🧩', hint: 'Sirf parts ke liye',
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

/** Jin categories me aam tor par serial/IMEI rakha jata hai */
export const SERIAL_SUGGESTED: CategoryType[] = [
  'SMARTWATCH', 'DRONE', 'CAMERA', 'DSLR', 'ACTION_CAMERA', 'MONITOR',
  'PROJECTOR', 'ROUTER', 'HARD_DRIVE', 'SSD', 'VR_HEADSET', 'GIMBAL',
];

/** Warranty ke aam options (mahine) */
export const WARRANTY_PRESETS = [0, 1, 3, 6, 12, 18, 24, 36] as const;

export const WARRANTY_TYPES = [
  'Manufacturer', 'Dealer', 'Shop', 'International', 'No Warranty',
] as const;

/** Connectivity ke aam options — chips me dikhane ke liye */
export const CONNECTIVITY_OPTIONS = [
  'Bluetooth 5.0', 'Bluetooth 5.3', 'WiFi', 'WiFi 6', 'USB-C', 'USB-A',
  'Micro USB', 'Lightning', 'HDMI', 'AUX 3.5mm', 'NFC', 'Wireless',
  'Type-C PD', 'Ethernet', 'SD Card',
];

/** Dabbe me kya kya aata hai — aam cheezein */
export const BOX_CONTENT_OPTIONS = [
  'Charger', 'USB Cable', 'Earphones', 'User Manual', 'Warranty Card',
  'Carry Case', 'Extra Tips', 'Screen Protector', 'Adapter', 'Remote',
  'Batteries', 'Mounting Kit',
];
