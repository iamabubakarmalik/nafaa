import type { BakeryCategory } from '../api/products.api';

/* ═════════════════════════════════════════════════════════════
   CATEGORY — dukaan-daar ki apni, enum system ka apna
   ─────────────────────────────────────────────────────────────
   Pehle wizard me DO category poochi jati thin:

     1. "Bakery Category" — 36 emoji button, system ka apna enum.
     2. "Base Category" — dukaan-daar ki apni banai hui.

   Dukaan-daar ke liye ye be-maani tha. Wo "Pizza" naam ki category
   banata hai, aur phir usi cheez ke liye system ki list me se bhi
   kuch chunna parta hai — jis me pizza ho bhi sakta hai aur nahi
   bhi.

   Ab sirf EK category poochi jati hai: jo wo khud banata hai. Enum
   wali cheez system khud samajh leta hai — us ki zaroorat sirf
   andar ke kaam me hai (cake customizer chalay ya nahi, taazgi ki
   default muddat kya ho).
   ═════════════════════════════════════════════════════════════ */

/** Har qism ke liye wo alfaz jin se wo pehchani jati hai */
const RULES: Array<[BakeryCategory, string[]]> = [
  ['WEDDING_CAKE',     ['wedding', 'shadi', 'baraat', 'nikah']],
  ['BIRTHDAY_CAKE',    ['birthday', 'bday']],
  ['ANNIVERSARY_CAKE', ['anniversary', 'salgirah', 'saalgirah']],
  ['CUSTOM_CAKE',      ['custom cake', 'theme cake', 'photo cake', 'designer cake']],
  ['CHEESECAKE',       ['cheesecake', 'cheese cake']],
  ['CUPCAKE',          ['cupcake', 'cup cake']],
  ['BROWNIE',          ['brownie']],
  ['MACARON',          ['macaron', 'macaroon']],
  ['DONUT',            ['donut', 'doughnut']],
  ['MUFFIN',           ['muffin']],
  ['CROISSANT',        ['croissant']],
  ['DANISH',           ['danish']],
  ['PUFF',             ['puff']],
  ['PATTY',            ['patty', 'patties']],
  ['PIZZA',            ['pizza']],
  ['SANDWICH',         ['sandwich', 'sandwhich']],
  ['BURGER',           ['burger', 'zinger']],
  ['TART',             ['tart']],
  ['PIE',              ['pie']],
  ['BISCUIT',          ['biscuit', 'rusk', 'nan khatai', 'nankhatai']],
  ['COOKIE',           ['cookie']],
  ['BREAD',            ['bread', 'double roti', 'baguette', 'loaf']],
  ['BUN',              ['bun']],
  ['ROLL',             ['roll']],
  ['BARFI',            ['barfi', 'burfi']],
  ['LADDU',            ['laddu', 'ladoo']],
  ['GULAB_JAMUN',      ['gulab jamun', 'gulab']],
  ['RASMALAI',         ['rasmalai', 'ras malai', 'rasgulla']],
  ['KHEER',            ['kheer', 'firni']],
  ['SWEETS',           ['mithai', 'sweet', 'halwa', 'jalebi', 'gajar']],
  ['ICE_CREAM',        ['ice cream', 'icecream', 'kulfi', 'falooda']],
  ['BEVERAGE',         ['drink', 'juice', 'shake', 'coffee', 'tea', 'chai', 'beverage', 'cola', 'water']],
  ['DESSERT',          ['dessert', 'pudding', 'trifle', 'mousse']],
  ['PASTRY',           ['pastry', 'pastries']],
  /* CAKE sab se aakhir me: "cake" lafz ooper wali khaas qismon me
     bhi aata hai, un ko pehla mauqa milna chahiye. */
  ['CAKE',             ['cake', 'gateau']],
];

/**
 * Dukaan-daar ki likhi hui category (aur product ke naam) se system
 * wali qism nikalna.
 *
 * Kuch na mile to `OTHER` — ye ghalat nahi, bas "koi khaas bartao
 * nahi chahiye" ka matlab rakhta hai.
 */
export function deriveBakeryCategory(
  categoryName?: string | null,
  productName?: string | null,
): BakeryCategory {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  if (!hay.trim()) return 'OTHER';
  for (const [value, words] of RULES) {
    if (words.some((w) => hay.includes(w))) return value;
  }
  return 'OTHER';
}

/** Ye qism cake customizer ke qabil hai ya nahi */
export function isCakeLike(c: BakeryCategory): boolean {
  return ([
    'CAKE', 'CUPCAKE', 'CHEESECAKE', 'CUSTOM_CAKE',
    'WEDDING_CAKE', 'BIRTHDAY_CAKE', 'ANNIVERSARY_CAKE',
  ] as BakeryCategory[]).includes(c);
}

/** Qism ke hisaab se taazgi ki muaqool muddat (din) */
export function defaultShelfLifeDays(c: BakeryCategory): number {
  if (isCakeLike(c)) return 3;
  if (([ 'BREAD', 'BUN', 'ROLL', 'SANDWICH', 'BURGER', 'PIZZA' ] as BakeryCategory[]).includes(c)) return 2;
  if (([ 'BISCUIT', 'COOKIE' ] as BakeryCategory[]).includes(c)) return 30;
  if (([ 'SWEETS', 'BARFI', 'LADDU', 'GULAB_JAMUN' ] as BakeryCategory[]).includes(c)) return 7;
  if (([ 'RASMALAI', 'KHEER', 'DESSERT', 'ICE_CREAM' ] as BakeryCategory[]).includes(c)) return 2;
  if (c === 'BEVERAGE') return 90;
  return 5;
}

/** Ye qism fridge maangti hai ya nahi */
export function needsFridge(c: BakeryCategory): boolean {
  return isCakeLike(c)
    || ([ 'RASMALAI', 'KHEER', 'DESSERT', 'ICE_CREAM' ] as BakeryCategory[]).includes(c);
}

/** Aasani ke liye parhne layak naam */
export function prettyCategory(c: BakeryCategory): string {
  return c.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Nayi dukaan ke liye tayyar tajaweez.
 *
 * Ye SIRF tajaweez hain — click karo to isi naam ki category ban
 * jati hai. Chaho to apna bilkul naya naam likh lo; system ka koi
 * zor nahi.
 */
export const CATEGORY_SUGGESTIONS: Array<{ name: string; emoji: string }> = [
  { name: 'Cake',        emoji: '🎂' },
  { name: 'Pastry',      emoji: '🧁' },
  { name: 'Bread',       emoji: '🍞' },
  { name: 'Bun',         emoji: '🥐' },
  { name: 'Biscuit',     emoji: '🍪' },
  { name: 'Rusk',        emoji: '🥖' },
  { name: 'Patties',     emoji: '🥟' },
  { name: 'Puff',        emoji: '🥠' },
  { name: 'Pizza',       emoji: '🍕' },
  { name: 'Sandwich',    emoji: '🥪' },
  { name: 'Burger',      emoji: '🍔' },
  { name: 'Donut',       emoji: '🍩' },
  { name: 'Mithai',      emoji: '🍬' },
  { name: 'Halwa',       emoji: '🥮' },
  { name: 'Barfi',       emoji: '🍡' },
  { name: 'Gulab Jamun', emoji: '🟤' },
  { name: 'Ice Cream',   emoji: '🍨' },
  { name: 'Drinks',      emoji: '🥤' },
];
