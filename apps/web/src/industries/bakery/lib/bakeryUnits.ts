import type { BakerySize } from '../api/products.api';

/* ═════════════════════════════════════════════════════════════
   UNIT — EK HI SAWAL, EK HI JAGAH
   ─────────────────────────────────────────────────────────────
   Pehle wizard DO sawal poochta tha jo asal me ek hi cheez thay:

     • "Base Unit"     → pcs / kg / dozen / box …
     • "Default Size"  → ONE_POUND / HALF_KG / DOZEN / BOX / CUSTOM …

   Dono list me `dozen` aur `box` maujood thay, bas alag alfaz me.
   Dukaan-daar ko samajh hi nahi aata tha ke kis khaane me kya
   bharna hai — aur "Custom" chunne par kuch likhne ki jagah hi
   nahi thi.

   Ab sirf EK sawal hai: *ye cheez kaise bechte hain?* Baqi sab
   usi se nikal aata hai — size, wazan ka sawal, aur doosre rate
   ka conversion.
   ═════════════════════════════════════════════════════════════ */

export interface UnitDef {
  key: string;
  label: string;
  emoji: string;
  /** Ye naap wazan se chalta hai (kg/pound/gram) */
  weighed?: boolean;
  /** Is unit me kitne "piece" aate hain — conversion ke liye */
  piecesIn?: number;
  hint: string;
}

/** Jin tareeqon se bakery ka maal bikta hai */
export const UNITS: UnitDef[] = [
  { key: 'pcs',    label: 'Piece',  emoji: '🎂', piecesIn: 1,  hint: 'Ek ek kar ke — cake, patty, burger' },
  { key: 'dozen',  label: 'Dozen',  emoji: '📦', piecesIn: 12, hint: 'Barah ke hisaab se — cookies, cupcake' },
  { key: 'kg',     label: 'Kilo',   emoji: '⚖️', weighed: true, hint: 'Wazan se — mithai, barfi, rusk' },
  { key: 'pound',  label: 'Pound',  emoji: '⚖️', weighed: true, hint: 'Pound se — cake ka aam tareeqa' },
  { key: 'gram',   label: 'Gram',   emoji: '⚖️', weighed: true, hint: 'Chhoti miqdar — dry fruit, chocolate' },
  { key: 'slice',  label: 'Slice',  emoji: '🍰', hint: 'Tukron me — cake slice, pizza slice' },
  { key: 'box',    label: 'Box',    emoji: '📦', hint: 'Dabbay me — gift pack, cookies box' },
  { key: 'tray',   label: 'Tray',   emoji: '🍱', hint: 'Thaal me — mithai, catering' },
  { key: 'packet', label: 'Packet', emoji: '🛍️', hint: 'Packet me — bahar se laya maal' },
  { key: 'bottle', label: 'Bottle', emoji: '🥤', hint: 'Bottle — drinks, juice' },
  { key: 'plate',  label: 'Plate',  emoji: '🍽️', hint: 'Plate me — dessert, halwa' },
  { key: 'custom', label: 'Apna',   emoji: '⚙️', hint: 'Jo naam aap ki dukaan par chalta hai' },
];

export const unitDef = (key: string): UnitDef =>
  UNITS.find((u) => u.key === key) ?? UNITS[0];

/** Screen par dikhane wala naam — "apna" ho to dukaan-daar ka likha hua */
export function unitLabel(key: string, customName?: string): string {
  if (key === 'custom') return (customName || '').trim() || 'apna naap';
  return unitDef(key).label.toLowerCase();
}

/** Ye naap wazan se chalta hai ya nahi */
export const isWeighed = (key: string) => !!unitDef(key).weighed;

/**
 * Base unit (aur wazan) se system wali "size" khud nikal aati hai.
 *
 * Pehle ye alag poochi jati thi — wahi do-sawal wala jhagra. Ab
 * sirf andar ke kaam ke liye nikalti hai; dukaan-daar se poochi
 * nahi jati.
 */
export function deriveSize(unitKey: string, weightGrams?: number | ''): BakerySize {
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

  /* Piece wali cheez: wazan se andaza — warna medium */
  if (g > 0) {
    if (g <= 150) return 'MINI';
    if (g <= 400) return 'SMALL';
    if (g <= 900) return 'MEDIUM';
    if (g <= 1600) return 'LARGE';
    return 'EXTRA_LARGE';
  }
  return 'MEDIUM';
}

/**
 * "1 [doosra unit] = kitne [base unit]" — stock sahi ghatne ke liye.
 *
 * POS yehi hisab lagata hai; wizard me sirf dikhaya jata hai taake
 * dukaan-daar ko pehle hi pata ho ke stock kaise ghatega.
 */
export function rateBetween(
  fromKey: string,
  baseKey: string,
  opts: { weightGrams?: number | ''; slices?: number | '' } = {},
): number {
  if (fromKey === baseKey) return 1;

  const g = Number(opts.weightGrams) || 0;
  const slices = Number(opts.slices) || 0;

  /** Ek piece me kitne base unit */
  const pieceInBase =
    ['pcs', 'slice', 'box', 'tray', 'packet', 'bottle', 'plate', 'custom'].includes(baseKey) ? 1
    : baseKey === 'dozen' ? 1 / 12
    : baseKey === 'kg' && g > 0 ? g / 1000
    : baseKey === 'gram' && g > 0 ? g
    : baseKey === 'pound' && g > 0 ? g / 453.6
    : 1;

  switch (fromKey) {
    case 'pcs':   return pieceInBase;
    case 'dozen': return pieceInBase * 12;
    case 'slice': return slices > 0 ? pieceInBase / slices : pieceInBase / 8;
    case 'kg':
      return baseKey === 'kg' ? 1
        : baseKey === 'gram' ? 1000
        : baseKey === 'pound' ? 2.2046
        : g > 0 ? 1000 / g : 1;
    case 'gram':
      return baseKey === 'gram' ? 1
        : baseKey === 'kg' ? 0.001
        : baseKey === 'pound' ? 0.0022046
        : g > 0 ? 1 / g : 1;
    case 'pound':
      return baseKey === 'pound' ? 1
        : baseKey === 'kg' ? 0.4536
        : baseKey === 'gram' ? 453.6
        : g > 0 ? 453.6 / g : 1;
    /* Box aur tray me kitne aate hain, ye sirf dukaan-daar jaanta
       hai — Multi-Unit safhe se set hota hai. */
    default: return 1;
  }
}

/** Jo aur tareeqe is base unit ke sath maani rakhte hain */
export function extraUnitsFor(baseKey: string): string[] {
  const all = ['pcs', 'dozen', 'slice', 'kg', 'pound', 'box', 'tray'];
  return all.filter((k) => k !== baseKey);
}

/** Draft ke price khaane ka naam */
export const priceField: Record<string, string> = {
  pcs: 'pricePerPiece',
  dozen: 'pricePerDozen',
  slice: 'pricePerSlice',
  kg: 'pricePerKg',
  pound: 'pricePerPound',
  box: 'pricePerBox',
  tray: 'pricePerTray',
};
