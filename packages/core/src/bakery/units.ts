/**
 * How bakery goods are sold (piece, dozen, kilo, pound, slice…), the system
 * size and category derived from them, and the conversion between selling
 * units. Labels live in the apps; these are the keys and the math.
 */

export const BAKERY_UNIT_KEYS = ['pcs', 'dozen', 'kg', 'pound', 'gram', 'slice', 'box', 'tray', 'packet', 'bottle', 'plate', 'custom'] as const;
export type BakeryUnitKey = typeof BAKERY_UNIT_KEYS[number];

const WEIGHED = new Set(['kg', 'pound', 'gram']);
export const isWeighedUnit = (key: string) => WEIGHED.has(key);

export type BakerySize =
  | 'MINI' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
  | 'HALF_POUND' | 'ONE_POUND' | 'ONE_HALF_POUND' | 'TWO_POUND' | 'THREE_POUND' | 'FIVE_POUND'
  | 'HALF_KG' | 'ONE_KG' | 'ONE_HALF_KG' | 'TWO_KG' | 'THREE_KG' | 'FIVE_KG' | 'TEN_KG'
  | 'SLICE' | 'DOZEN' | 'HALF_DOZEN' | 'TRAY' | 'BOX' | 'CUSTOM';

/** System size from the selling unit and the weight of one piece. */
export function deriveSize(unitKey: string, weightGrams?: number | null): BakerySize {
  const g = Number(weightGrams) || 0;
  if (unitKey === 'slice') return 'SLICE';
  if (unitKey === 'dozen') return 'DOZEN';
  if (unitKey === 'box') return 'BOX';
  if (unitKey === 'tray') return 'TRAY';
  if (unitKey === 'pound') {
    const lb = g > 0 ? g / 453.6 : 1;
    if (lb <= 0.75) return 'HALF_POUND';
    if (lb <= 1.25) return 'ONE_POUND';
    if (lb <= 1.75) return 'ONE_HALF_POUND';
    if (lb <= 2.5) return 'TWO_POUND';
    if (lb <= 4) return 'THREE_POUND';
    return 'FIVE_POUND';
  }
  if (unitKey === 'kg' || unitKey === 'gram') {
    const kg = unitKey === 'kg' ? (g > 0 ? g / 1000 : 1) : g / 1000;
    if (kg <= 0.75) return 'HALF_KG';
    if (kg <= 1.25) return 'ONE_KG';
    if (kg <= 1.75) return 'ONE_HALF_KG';
    if (kg <= 2.5) return 'TWO_KG';
    if (kg <= 4) return 'THREE_KG';
    if (kg <= 7) return 'FIVE_KG';
    return 'TEN_KG';
  }
  if (g > 0) {
    if (g <= 150) return 'MINI';
    if (g <= 400) return 'SMALL';
    if (g <= 900) return 'MEDIUM';
    if (g <= 1600) return 'LARGE';
    return 'EXTRA_LARGE';
  }
  return 'MEDIUM';
}

/** "1 [from] = how many [base]", so stock comes down right when sold in another unit. */
export function rateBetween(fromKey: string, baseKey: string, opts: { weightGrams?: number | null; slices?: number | null } = {}): number {
  if (fromKey === baseKey) return 1;
  const g = Number(opts.weightGrams) || 0;
  const slices = Number(opts.slices) || 0;
  const pieceInBase =
    ['pcs', 'slice', 'box', 'tray', 'packet', 'bottle', 'plate', 'custom'].includes(baseKey) ? 1
      : baseKey === 'dozen' ? 1 / 12
        : baseKey === 'kg' && g > 0 ? g / 1000
          : baseKey === 'gram' && g > 0 ? g
            : baseKey === 'pound' && g > 0 ? g / 453.6
              : 1;
  switch (fromKey) {
    case 'pcs': return pieceInBase;
    case 'dozen': return pieceInBase * 12;
    case 'slice': return slices > 0 ? pieceInBase / slices : pieceInBase / 8;
    case 'kg': return baseKey === 'kg' ? 1 : baseKey === 'gram' ? 1000 : baseKey === 'pound' ? 2.2046 : g > 0 ? 1000 / g : 1;
    case 'gram': return baseKey === 'gram' ? 1 : baseKey === 'kg' ? 0.001 : baseKey === 'pound' ? 0.0022046 : g > 0 ? 1 / g : 1;
    case 'pound': return baseKey === 'pound' ? 1 : baseKey === 'kg' ? 0.4536 : baseKey === 'gram' ? 453.6 : g > 0 ? 453.6 / g : 1;
    default: return 1;
  }
}

/** Other selling units that make sense next to a base unit. */
export const extraUnitsFor = (baseKey: string) => ['pcs', 'dozen', 'slice', 'kg', 'pound', 'box', 'tray'].filter((k) => k !== baseKey);

/** Bakery profile field holding the rate of each selling unit. */
export const PRICE_FIELD: Record<string, string> = {
  pcs: 'pricePerPiece', dozen: 'pricePerDozen', slice: 'pricePerSlice', kg: 'pricePerKg', pound: 'pricePerPound', box: 'pricePerBox', tray: 'pricePerTray',
};

/* ───────────────────────── category ───────────────────────── */

export type BakeryCategory =
  | 'CAKE' | 'CUPCAKE' | 'PASTRY' | 'BREAD' | 'BUN' | 'ROLL' | 'BISCUIT' | 'COOKIE'
  | 'DONUT' | 'MUFFIN' | 'CROISSANT' | 'DANISH' | 'PATTY' | 'PUFF' | 'PIZZA'
  | 'SANDWICH' | 'BURGER' | 'TART' | 'PIE' | 'CHEESECAKE' | 'DESSERT' | 'BROWNIE'
  | 'MACARON' | 'SWEETS' | 'BARFI' | 'LADDU' | 'GULAB_JAMUN' | 'RASMALAI' | 'KHEER'
  | 'CUSTOM_CAKE' | 'WEDDING_CAKE' | 'BIRTHDAY_CAKE' | 'ANNIVERSARY_CAKE'
  | 'BEVERAGE' | 'ICE_CREAM' | 'OTHER';

const RULES: Array<[BakeryCategory, string[]]> = [
  ['WEDDING_CAKE', ['wedding', 'shadi', 'baraat', 'nikah']],
  ['BIRTHDAY_CAKE', ['birthday', 'bday']],
  ['ANNIVERSARY_CAKE', ['anniversary', 'salgirah', 'saalgirah']],
  ['CUSTOM_CAKE', ['custom cake', 'theme cake', 'photo cake', 'designer cake']],
  ['CHEESECAKE', ['cheesecake', 'cheese cake']],
  ['CUPCAKE', ['cupcake', 'cup cake']],
  ['BROWNIE', ['brownie']],
  ['MACARON', ['macaron', 'macaroon']],
  ['DONUT', ['donut', 'doughnut']],
  ['MUFFIN', ['muffin']],
  ['CROISSANT', ['croissant']],
  ['DANISH', ['danish']],
  ['PUFF', ['puff']],
  ['PATTY', ['patty', 'patties']],
  ['PIZZA', ['pizza']],
  ['SANDWICH', ['sandwich', 'sandwhich']],
  ['BURGER', ['burger', 'zinger']],
  ['TART', ['tart']],
  ['PIE', ['pie']],
  ['BISCUIT', ['biscuit', 'rusk', 'nan khatai', 'nankhatai']],
  ['COOKIE', ['cookie']],
  ['BREAD', ['bread', 'double roti', 'baguette', 'loaf']],
  ['BUN', ['bun']],
  ['ROLL', ['roll']],
  ['BARFI', ['barfi', 'burfi']],
  ['LADDU', ['laddu', 'ladoo']],
  ['GULAB_JAMUN', ['gulab jamun', 'gulab']],
  ['RASMALAI', ['rasmalai', 'ras malai', 'rasgulla']],
  ['KHEER', ['kheer', 'firni']],
  ['SWEETS', ['mithai', 'sweet', 'halwa', 'jalebi', 'gajar']],
  ['ICE_CREAM', ['ice cream', 'icecream', 'kulfi', 'falooda']],
  ['BEVERAGE', ['drink', 'juice', 'shake', 'coffee', 'tea', 'chai', 'beverage', 'cola', 'water']],
  ['DESSERT', ['dessert', 'pudding', 'trifle', 'mousse']],
  ['PASTRY', ['pastry', 'pastries']],
  // Last: "cake" also appears in the specific kinds above.
  ['CAKE', ['cake', 'gateau']],
];

/** System kind from the shop's own category name and the product name. */
export function deriveBakeryCategory(categoryName?: string | null, productName?: string | null): BakeryCategory {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  if (!hay.trim()) return 'OTHER';
  for (const [value, words] of RULES) if (words.some((w) => hay.includes(w))) return value;
  return 'OTHER';
}

const CAKES: BakeryCategory[] = ['CAKE', 'CUPCAKE', 'CHEESECAKE', 'CUSTOM_CAKE', 'WEDDING_CAKE', 'BIRTHDAY_CAKE', 'ANNIVERSARY_CAKE'];
export const isCakeLike = (c: BakeryCategory) => CAKES.includes(c);

export function defaultShelfLifeDays(c: BakeryCategory): number {
  if (isCakeLike(c)) return 3;
  if ((['BREAD', 'BUN', 'ROLL', 'SANDWICH', 'BURGER', 'PIZZA'] as BakeryCategory[]).includes(c)) return 2;
  if ((['BISCUIT', 'COOKIE'] as BakeryCategory[]).includes(c)) return 30;
  if ((['SWEETS', 'BARFI', 'LADDU', 'GULAB_JAMUN'] as BakeryCategory[]).includes(c)) return 7;
  if ((['RASMALAI', 'KHEER', 'DESSERT', 'ICE_CREAM'] as BakeryCategory[]).includes(c)) return 2;
  if (c === 'BEVERAGE') return 90;
  return 5;
}

export const needsFridge = (c: BakeryCategory) => isCakeLike(c) || (['RASMALAI', 'KHEER', 'DESSERT', 'ICE_CREAM'] as BakeryCategory[]).includes(c);
