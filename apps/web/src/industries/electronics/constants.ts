/**
 * Electronics ki tamam categories, conditions aur unke labels — ek jagah.
 *
 * Ye values Prisma ke `ElectronicsCategoryType` / `ElectronicsConditionType`
 * enums se BILKUL match karti hain. Pehle wizard me default `SMARTPHONE`
 * aur `NEW` likha hua tha jo enum me hain hi nahi — is wajah se wizard se
 * banaya gaya har product save par fail ho jata tha.
 */

import { t } from '@core/i18n';
const CATEGORY_TYPES = [
  'CABLE', 'CHARGER', 'POWER_BANK', 'HEADPHONE', 'EARBUD', 'SPEAKER',
  'BLUETOOTH_SPEAKER', 'SMARTWATCH', 'FITNESS_BAND', 'DRONE', 'CAMERA',
  'DSLR', 'ACTION_CAMERA', 'WEBCAM', 'KEYBOARD', 'MOUSE', 'MONITOR',
  'LAPTOP_ACCESSORY', 'PHONE_ACCESSORY', 'CAR_ACCESSORY', 'SMART_HOME',
  'LED_LIGHT', 'ROUTER', 'MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD',
  'ADAPTER', 'CONVERTER', 'SCREEN_PROTECTOR', 'MOBILE_CASE',
  'TABLET_ACCESSORY', 'VR_HEADSET', 'PROJECTOR', 'MICROPHONE', 'TRIPOD',
  'GIMBAL', 'TV', 'LAPTOP', 'TABLET', 'DESKTOP', 'PRINTER', 'GAMING_CONSOLE',
  'HOME_THEATER', 'UPS', 'OTHER',
] as const;

export type CategoryType = typeof CATEGORY_TYPES[number];

export const CONDITION_TYPES = [
  'BRAND_NEW', 'OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED', 'FOR_PARTS',
] as const;

export type ConditionType = typeof CONDITION_TYPES[number];

/** Har category ka aasaan naam + emoji (Pakistan me jo bola jata hai) */
export const CATEGORY_META: Record<CategoryType, { label: string; emoji: string; urdu?: string }> = {
  TV:               { label: t('TV / LED'),         emoji: '📺', urdu: 'LED' },
  HOME_THEATER:     { label: t('Home Theater'),     emoji: '🔈', urdu: 'Sound system' },
  LAPTOP:           { label: t('Laptop'),           emoji: '💻' },
  DESKTOP:          { label: t('Desktop / PC'),     emoji: '🖥️', urdu: 'Computer' },
  TABLET:           { label: t('Tablet'),           emoji: '📲', urdu: 'Tab' },
  PRINTER:          { label: t('Printer'),          emoji: '🖨️' },
  GAMING_CONSOLE:   { label: t('Gaming Console'),   emoji: '🎮', urdu: 'PlayStation / Xbox' },
  UPS:              { label: t('UPS / Inverter'),   emoji: '🔋', urdu: 'UPS' },
  CABLE:            { label: t('Cable'),            emoji: '🔌', urdu: 'Taar' },
  CHARGER:          { label: t('Charger'),          emoji: '⚡', urdu: 'Charger' },
  POWER_BANK:       { label: t('Power Bank'),       emoji: '🔋' },
  HEADPHONE:        { label: t('Headphones'),       emoji: '🎧' },
  EARBUD:           { label: t('Earbuds'),          emoji: '🎵', urdu: 'Handsfree' },
  SPEAKER:          { label: t('Speaker'),          emoji: '🔊' },
  BLUETOOTH_SPEAKER:{ label: t('Bluetooth Speaker'),emoji: '📻' },
  MICROPHONE:       { label: t('Microphone'),       emoji: '🎤', urdu: 'Mic' },
  SMARTWATCH:       { label: t('Smart Watch'),      emoji: '⌚' },
  FITNESS_BAND:     { label: t('Fitness Band'),     emoji: '📿' },
  VR_HEADSET:       { label: t('VR Headset'),       emoji: '🥽' },
  DRONE:            { label: t('Drone'),            emoji: '🚁' },
  CAMERA:           { label: t('Camera'),           emoji: '📷' },
  DSLR:             { label: t('DSLR'),             emoji: '📸' },
  ACTION_CAMERA:    { label: t('Action Camera'),    emoji: '🎬' },
  TRIPOD:           { label: t('Tripod'),           emoji: '🦯' },
  GIMBAL:           { label: t('Gimbal'),           emoji: '🎥' },
  WEBCAM:           { label: t('Webcam'),           emoji: '📹' },
  KEYBOARD:         { label: t('Keyboard'),         emoji: '⌨️' },
  MOUSE:            { label: t('Mouse'),            emoji: '🖱️' },
  MONITOR:          { label: t('Monitor / Screen'), emoji: '🖥️', urdu: 'Screen' },
  PROJECTOR:        { label: t('Projector'),        emoji: '📽️' },
  LAPTOP_ACCESSORY: { label: t('Laptop Accessory'), emoji: '💻' },
  ROUTER:           { label: t('Router / WiFi'),    emoji: '📶' },
  MEMORY_CARD:      { label: t('Memory Card'),      emoji: '💳' },
  USB_DRIVE:        { label: t('USB Drive'),        emoji: '💾', urdu: 'USB' },
  HARD_DRIVE:       { label: t('Hard Drive'),       emoji: '🗄️' },
  SSD:              { label: t('SSD'),              emoji: '⚡' },
  PHONE_ACCESSORY:  { label: t('Phone Accessory'),  emoji: '📱' },
  MOBILE_CASE:      { label: t('Mobile Cover'),     emoji: '🛡️', urdu: 'Cover' },
  SCREEN_PROTECTOR: { label: t('Screen Protector'), emoji: '🪟', urdu: 'Glass' },
  TABLET_ACCESSORY: { label: t('Tablet Accessory'), emoji: '📲' },
  ADAPTER:          { label: t('Adapter'),          emoji: '🔩' },
  CONVERTER:        { label: t('Converter'),        emoji: '🔄' },
  CAR_ACCESSORY:    { label: t('Car Accessory'),    emoji: '🚗' },
  SMART_HOME:       { label: t('Smart Home'),       emoji: '🏠' },
  LED_LIGHT:        { label: t('LED Light'),        emoji: '💡' },
  OTHER:            { label: t('Other'),            emoji: '📦' },
};

/** Picker me categories khandaan ke hisab se — dhoondna aasan ho jata hai */
export const CATEGORY_GROUPS: { label: string; emoji: string; items: CategoryType[] }[] = [
  { label: t('TV & Home Theater'), emoji: '📺', items: ['TV', 'HOME_THEATER', 'PROJECTOR'] },
  { label: t('Computer'), emoji: '💻', items: ['LAPTOP', 'DESKTOP', 'PRINTER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'LAPTOP_ACCESSORY', 'WEBCAM', 'ROUTER'] },
  { label: t('Gaming'), emoji: '🎮', items: ['GAMING_CONSOLE', 'VR_HEADSET'] },
  { label: t('Audio'), emoji: '🎧', items: ['HEADPHONE', 'EARBUD', 'SPEAKER', 'BLUETOOTH_SPEAKER', 'MICROPHONE'] },
  { label: t('Power & Cables'), emoji: '⚡', items: ['UPS', 'CHARGER', 'POWER_BANK', 'CABLE', 'ADAPTER', 'CONVERTER'] },
  { label: t('Phone & Tablet'), emoji: '📱', items: ['TABLET', 'PHONE_ACCESSORY', 'MOBILE_CASE', 'SCREEN_PROTECTOR', 'TABLET_ACCESSORY'] },
  { label: t('Storage'), emoji: '💾', items: ['MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD'] },
  { label: t('Camera'), emoji: '📷', items: ['CAMERA', 'DSLR', 'ACTION_CAMERA', 'DRONE', 'TRIPOD', 'GIMBAL'] },
  { label: t('Wearable'), emoji: '⌚', items: ['SMARTWATCH', 'FITNESS_BAND'] },
  { label: t('Home & Car'), emoji: '🏠', items: ['SMART_HOME', 'LED_LIGHT', 'CAR_ACCESSORY'] },
  { label: t('Baqi'), emoji: '📦', items: ['OTHER'] },
];

export const CONDITION_META: Record<ConditionType, {
  label: string; emoji: string; hint: string; chip: string;
}> = {
  BRAND_NEW: {
    label: t('Brand New'), emoji: '✨', hint: t('Seal pack, kabhi khula nahi'),
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  OPEN_BOX: {
    label: t('Open Box'), emoji: '📦', hint: t('Dabba khula, cheez nayi'),
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  REFURBISHED: {
    label: t('Refurbished'), emoji: '🔧', hint: t('Company ne theek karke bheja'),
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  USED: {
    label: t('Used'), emoji: '♻️', hint: t('Istemal shuda'),
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  DAMAGED: {
    label: t('Damaged'), emoji: '⚠️', hint: t('Kharab — kam qeemat par'),
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  FOR_PARTS: {
    label: t('For Parts'), emoji: '🧩', hint: t('Sirf parts ke liye'),
    chip: 'bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-300',
  },
};

/** Jin categories me aam tor par serial/IMEI rakha jata hai */
export const SERIAL_SUGGESTED: CategoryType[] = [
  'TV', 'LAPTOP', 'TABLET', 'DESKTOP', 'PRINTER', 'GAMING_CONSOLE', 'HOME_THEATER', 'UPS',
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

/**
 * Global Category ke naam se andar wala `categoryType` khud nikal lena.
 *
 * Pehle wizard me DO category poochhi jati thin — ek hardcoded "Category
 * Type" aur ek dukandar ki apni Category. Ye confusing tha. Ab dukandar
 * sirf apni category chunta hai, aur `categoryType` (jo POS chips,
 * reports aur stock report ko chalata hai) yahan se khud lag jata hai.
 *
 * Match na ho to `OTHER` — koi nuqsan nahi, sirf grouping aam ho jati hai.
 */
const NAME_HINTS: [RegExp, CategoryType][] = [
  // Accessories first, so "laptop bag" or "tablet cover" is not taken for the device.
  [/screen\s?(protector|guard)|glass|tempered/i, 'SCREEN_PROTECTOR'],
  [/laptop\s?(bag|stand|skin|cooler|sleeve|charger|adapter|accessor)/i, 'LAPTOP_ACCESSORY'],
  [/(tablet|ipad|tab)\s?(cover|case|pen|stand|accessor)/i, 'TABLET_ACCESSORY'],
  // "LED" on its own is what people call a TV here; LED lights and monitors are not.
  [/\btv\b|television|\bleds?\b(?!\s*(lights?|bulbs?|lamps?|strips?|monitors?))/i, 'TV'],
  [/home\s?theat(er|re)|sound\s?system/i, 'HOME_THEATER'],
  [/play\s?station|\bps[45]\b|x\s?box|nintendo|console/i, 'GAMING_CONSOLE'],
  [/\bups\b|inverter/i, 'UPS'],
  [/printer|scanner|photocopier/i, 'PRINTER'],
  [/desktop|all.?in.?one|\bpc\b|\bcpu\b|\bcomputers?\b(?!\s*(accessor|parts))/i, 'DESKTOP'],
  [/laptop|notebook|macbook|chromebook/i, 'LAPTOP'],
  [/tablet|ipad|\btab\b/i, 'TABLET'],
  [/head\s?phone|headset(?!.*vr)|over.?ear/i, 'HEADPHONE'],
  [/ear\s?bud|ear\s?phone|handsfree|air\s?pod|tws/i, 'EARBUD'],
  [/bluetooth.*speak|bt.*speak/i, 'BLUETOOTH_SPEAKER'],
  [/speaker|sound\s?bar|woofer/i, 'SPEAKER'],
  [/mic(rophone)?\b/i, 'MICROPHONE'],
  [/power\s?bank|pawer\s?bank/i, 'POWER_BANK'],
  [/charger|charging|adapter\s?plug|wall\s?plug/i, 'CHARGER'],
  [/cable|taar|wire|cord/i, 'CABLE'],
  [/converter/i, 'CONVERTER'],
  [/adapter|adaptor/i, 'ADAPTER'],
  [/smart\s?watch|watch/i, 'SMARTWATCH'],
  [/fitness|band\b|tracker/i, 'FITNESS_BAND'],
  [/vr\b|virtual\s?reality/i, 'VR_HEADSET'],
  [/drone|quad\s?copter/i, 'DRONE'],
  [/dslr/i, 'DSLR'],
  [/action\s?cam|go\s?pro/i, 'ACTION_CAMERA'],
  [/web\s?cam/i, 'WEBCAM'],
  [/camera|cam\b/i, 'CAMERA'],
  [/tripod|stand\b/i, 'TRIPOD'],
  [/gimbal|stabilizer/i, 'GIMBAL'],
  [/key\s?board/i, 'KEYBOARD'],
  [/mouse|mice/i, 'MOUSE'],
  [/monitor|screen|display/i, 'MONITOR'],
  [/projector/i, 'PROJECTOR'],
  [/router|wi.?fi|modem|net\s?gear/i, 'ROUTER'],
  [/memory\s?card|sd\s?card|micro\s?sd/i, 'MEMORY_CARD'],
  [/usb\s?(drive|stick)|flash\s?drive|pen\s?drive/i, 'USB_DRIVE'],
  [/hard\s?(disk|drive)|hdd|external\s?drive/i, 'HARD_DRIVE'],
  [/ssd|solid\s?state/i, 'SSD'],
  [/cover|case\b|pouch|back\s?cover/i, 'MOBILE_CASE'],
  [/car\b|gari|dash\s?cam/i, 'CAR_ACCESSORY'],
  [/smart\s?home|alexa|google\s?home/i, 'SMART_HOME'],
  [/led|light|bulb|lamp/i, 'LED_LIGHT'],
  [/phone|mobile/i, 'PHONE_ACCESSORY'],
];

export function categoryTypeFromName(name?: string | null): CategoryType {
  const n = (name ?? '').trim();
  if (!n) return 'OTHER';
  for (const [re, type] of NAME_HINTS) {
    if (re.test(n)) return type;
  }
  return 'OTHER';
}
