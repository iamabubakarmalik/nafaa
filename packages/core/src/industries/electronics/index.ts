/**
 * Pure rules of the electronics pack (shared by web and mobile): product
 * categories, conditions, serial lists, the warranty verdict for a unit, claim
 * stages and the category a product name points to. Labels are not here;
 * screens translate the ids.
 */

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
export const CATEGORY_IDS: readonly CategoryType[] = CATEGORY_TYPES;

export const CONDITION_TYPES = [
  'BRAND_NEW', 'OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED', 'FOR_PARTS',
] as const;
export type ConditionType = typeof CONDITION_TYPES[number];

export const CATEGORY_EMOJI: Record<CategoryType, string> = {
  TV: '📺',
  HOME_THEATER: '🔈',
  BLUETOOTH_SPEAKER: '📻',
  LAPTOP: '💻',
  DESKTOP: '🖥️',
  TABLET: '📲',
  PRINTER: '🖨️',
  GAMING_CONSOLE: '🎮',
  UPS: '🔋',
  CABLE: '🔌',
  CHARGER: '⚡',
  POWER_BANK: '🔋',
  HEADPHONE: '🎧',
  EARBUD: '🎵',
  SPEAKER: '🔊',
  MICROPHONE: '🎤',
  SMARTWATCH: '⌚',
  FITNESS_BAND: '📿',
  VR_HEADSET: '🥽',
  DRONE: '🚁',
  CAMERA: '📷',
  DSLR: '📸',
  ACTION_CAMERA: '🎬',
  TRIPOD: '🦯',
  GIMBAL: '🎥',
  WEBCAM: '📹',
  KEYBOARD: '⌨️',
  MOUSE: '🖱️',
  MONITOR: '🖥️',
  PROJECTOR: '📽️',
  LAPTOP_ACCESSORY: '💻',
  ROUTER: '📶',
  MEMORY_CARD: '💳',
  USB_DRIVE: '💾',
  HARD_DRIVE: '🗄️',
  SSD: '⚡',
  PHONE_ACCESSORY: '📱',
  MOBILE_CASE: '🛡️',
  SCREEN_PROTECTOR: '🪟',
  TABLET_ACCESSORY: '📲',
  ADAPTER: '🔩',
  CONVERTER: '🔄',
  CAR_ACCESSORY: '🚗',
  SMART_HOME: '🏠',
  LED_LIGHT: '💡',
  OTHER: '📦',
};

/** Category groups for the picker; `label` is a source key to translate. */
export const CATEGORY_GROUPS: { label: string; emoji: string; items: CategoryType[] }[] = [
  { label: 'TV & Home Theater', emoji: '📺', items: ['TV', 'HOME_THEATER', 'PROJECTOR'] },
  { label: 'Computer', emoji: '💻', items: ['LAPTOP', 'DESKTOP', 'PRINTER', 'MONITOR', 'KEYBOARD', 'MOUSE', 'LAPTOP_ACCESSORY', 'WEBCAM', 'ROUTER'] },
  { label: 'Gaming', emoji: '🎮', items: ['GAMING_CONSOLE', 'VR_HEADSET'] },
  { label: 'Audio', emoji: '🎧', items: ['HEADPHONE', 'EARBUD', 'SPEAKER', 'BLUETOOTH_SPEAKER', 'MICROPHONE'] },
  { label: 'Power & Cables', emoji: '⚡', items: ['UPS', 'CHARGER', 'POWER_BANK', 'CABLE', 'ADAPTER', 'CONVERTER'] },
  { label: 'Phone & Tablet', emoji: '📱', items: ['TABLET', 'PHONE_ACCESSORY', 'MOBILE_CASE', 'SCREEN_PROTECTOR', 'TABLET_ACCESSORY'] },
  { label: 'Storage', emoji: '💾', items: ['MEMORY_CARD', 'USB_DRIVE', 'HARD_DRIVE', 'SSD'] },
  { label: 'Camera', emoji: '📷', items: ['CAMERA', 'DSLR', 'ACTION_CAMERA', 'DRONE', 'TRIPOD', 'GIMBAL'] },
  { label: 'Wearable', emoji: '⌚', items: ['SMARTWATCH', 'FITNESS_BAND'] },
  { label: 'Home & Car', emoji: '🏠', items: ['SMART_HOME', 'LED_LIGHT', 'CAR_ACCESSORY'] },
  { label: 'Baqi', emoji: '📦', items: ['OTHER'] },
];

/** Categories where a serial or IMEI is usually kept. */
export const SERIAL_SUGGESTED: CategoryType[] = [
  'TV', 'LAPTOP', 'TABLET', 'DESKTOP', 'PRINTER', 'GAMING_CONSOLE', 'HOME_THEATER', 'UPS',
  'SMARTWATCH', 'DRONE', 'CAMERA', 'DSLR', 'ACTION_CAMERA', 'MONITOR',
  'PROJECTOR', 'ROUTER', 'HARD_DRIVE', 'SSD', 'VR_HEADSET', 'GIMBAL',
];

export const WARRANTY_PRESETS = [0, 1, 3, 6, 12, 18, 24, 36] as const;
export const WARRANTY_TYPES = ['Manufacturer', 'Dealer', 'Shop', 'International', 'No Warranty'] as const;
export const CONNECTIVITY_OPTIONS = ['Bluetooth 5.0', 'Bluetooth 5.3', 'WiFi', 'WiFi 6', 'USB-C', 'USB-A', 'Micro USB', 'Lightning', 'HDMI', 'AUX 3.5mm', 'NFC', 'Wireless', 'Type-C PD', 'Ethernet', 'SD Card'];
export const BOX_CONTENT_OPTIONS = ['Charger', 'USB Cable', 'Earphones', 'User Manual', 'Warranty Card', 'Carry Case', 'Extra Tips', 'Screen Protector', 'Adapter', 'Remote', 'Batteries', 'Mounting Kit'];

/** The category a product name points to; OTHER when nothing matches (grouping only). */
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
  for (const [re, type] of NAME_HINTS) if (re.test(n)) return type;
  return 'OTHER';
}

/* ───────────── serial lists ───────────── */

export interface SerialEntry { serialNumber: string; imei?: string; imei2?: string; macAddress?: string }

/** Lines of "serial, imei, imei2, mac" (comma, tab or semicolon); repeated serials are counted and left out. */
export function parseSerialLines(text: string): { entries: SerialEntry[]; repeated: number } {
  const seen = new Set<string>();
  let repeated = 0;
  const entries: SerialEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [serialNumber = '', imei, imei2, macAddress] = line.split(/[,\t;]+/).map((x) => x.trim());
    if (!serialNumber) continue;
    const k = serialNumber.toLowerCase();
    if (seen.has(k)) { repeated++; continue; }
    seen.add(k);
    entries.push({ serialNumber, imei: imei || undefined, imei2: imei2 || undefined, macAddress: macAddress || undefined });
  }
  return { entries, repeated };
}

/* ───────────── warranty ───────────── */

const DAY = 86_400_000;
export const daysLeft = (iso?: string | null, now = Date.now()) => (iso ? Math.ceil((new Date(iso).getTime() - now) / DAY) : null);
export const daysSince = (iso?: string | null, now = Date.now()) => (iso ? Math.floor((now - new Date(iso).getTime()) / DAY) : 0);

export type WarrantyVerdict = 'unknown' | 'not_sold' | 'valid' | 'expired' | 'none';

/** What the counter tells a customer who asks "is this unit under warranty?". */
export function warrantyVerdict(res: { found: boolean; serial?: { status: string } | null; warranty?: { isValid: boolean; endDate: string | null } | null }): WarrantyVerdict {
  if (!res.found || !res.serial) return 'unknown';
  if (res.serial.status !== 'SOLD') return 'not_sold';
  if (res.warranty?.isValid) return 'valid';
  return res.warranty?.endDate ? 'expired' : 'none';
}

/** Warranty end for a unit sold today. */
export function warrantyEnd(soldAt: string, months: number): string | null {
  if (!(months > 0)) return null;
  const d = new Date(soldAt);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

export type ClaimStageKey = 'resolved' | 'cancelled' | 'brand' | 'repair' | 'new';

/** Where a claim stands, from its status, resolved time and the brand flag. */
export function claimStageKey(c: { status: string; resolvedAt?: string | null; sentToBrand?: boolean }): ClaimStageKey {
  if (c.resolvedAt) return 'resolved';
  if (c.status === 'VOID' || c.status === 'EXPIRED' || c.status === 'NO_WARRANTY') return 'cancelled';
  if (c.sentToBrand) return 'brand';
  if (c.status === 'IN_REPAIR') return 'repair';
  return 'new';
}

/** Money the shop bears on a claim: repair cost and refund, less what the customer and the brand paid. */
export function claimShopBore(c: { repairCost?: unknown; refundAmount?: unknown; paidByCustomer?: unknown; paidByBrand?: unknown }) {
  const n = (v: unknown) => Number(v) || 0;
  return Math.round((n(c.repairCost) + n(c.refundAmount) - n(c.paidByCustomer) - n(c.paidByBrand)) * 100) / 100;
}

/* ───────────── bundles ───────────── */

export interface BundleLine { quantity: number; unitPrice: number }

/** Bundle price against the loose price of its pieces. */
export function bundleSavings(lines: BundleLine[], bundlePrice: number) {
  const original = Math.round(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0) * 100) / 100;
  const savings = Math.max(Math.round((original - (Number(bundlePrice) || 0)) * 100) / 100, 0);
  return { original, savings, pct: original > 0 ? Math.round((savings / original) * 1000) / 10 : 0 };
}

/** How many bundles the stock can make (the scarcest piece decides). */
export function bundlesMakeable(lines: Array<{ quantity: number; stock?: number | null }>): number {
  if (!lines.length) return 0;
  return Math.max(Math.min(...lines.map((l) => (l.quantity > 0 ? Math.floor(Math.max(Number(l.stock) || 0, 0) / l.quantity) : Infinity))), 0);
}
