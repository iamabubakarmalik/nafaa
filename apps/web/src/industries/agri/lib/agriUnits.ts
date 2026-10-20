/**
 * Agri units: bag, kg, ton, litre. Stock is often counted in kg while
 * the trade runs in bags (one bag of urea = 50 kg); conversions use the
 * pack size the shop entered on the product.
 */

export interface AgriUnitDef {
  key: string;
  label: string;
  emoji: string;
  /** Weight or volume unit. */
  measured?: boolean;
  hint: string;
}

export const AGRI_UNITS: AgriUnitDef[] = [
  { key: 'bag',    label: 'Bori',   emoji: '🎒', hint: 'Sab se aam — urea, DAP, beej ki bori' },
  { key: 'kg',     label: 'Kilo',   emoji: '⚖️', measured: true, hint: 'Khula maal — beej, feed' },
  { key: 'ton',    label: 'Ton',    emoji: '🚛', measured: true, hint: 'Bara sauda — 1000 kg' },
  { key: 'gram',   label: 'Gram',   emoji: '⚖️', measured: true, hint: 'Chhoti quantity — mehnga beej, hormone' },
  { key: 'litre',  label: 'Litre',  emoji: '🧴', measured: true, hint: 'Spray, liquid fertilizer' },
  { key: 'ml',     label: 'ML',     emoji: '💧', measured: true, hint: 'Chhoti bottle — pesticide' },
  { key: 'bottle', label: 'Bottle', emoji: '🍾', hint: 'Bandh bottle — spray, dawa' },
  { key: 'packet', label: 'Packet', emoji: '📦', hint: 'Chhota packet — sabzi ka beej' },
  { key: 'pcs',    label: 'Piece',  emoji: '🔧', hint: 'Auzaar, pipe, nozzle' },
  { key: 'bundle', label: 'Bundle', emoji: '🪢', hint: 'Gattha — pipe, tarpal' },
  { key: 'custom', label: 'Apna',   emoji: '⚙️', hint: 'Jo naam aap ki dukaan par chalta hai' },
];

export const agriUnitDef = (key: string): AgriUnitDef =>
  AGRI_UNITS.find((u) => u.key === key) ?? AGRI_UNITS[0];

export function agriUnitLabel(key: string, customName?: string): string {
  if (key === 'custom') return (customName || '').trim() || 'apna naap';
  return agriUnitDef(key).label.toLowerCase();
}

export const isMeasured = (key: string) => !!agriUnitDef(key).measured;

/** Weight units in grams. */
const WEIGHT_IN_GRAM: Record<string, number> = {
  gram: 1, kg: 1000, ton: 1_000_000,
};
/** Volume units in millilitres. */
const VOLUME_IN_ML: Record<string, number> = {
  ml: 1, litre: 1000,
};

/**
 * How many base units one `fromKey` unit holds. A bag's weight comes
 * from the shop's own `packSize` + `packUnit` (for example 50 kg).
 */
export function agriRate(
  fromKey: string,
  baseKey: string,
  opts: { packSize?: number | ''; packUnit?: string } = {},
): number {
  if (fromKey === baseKey) return 1;

  const packQty = Number(opts.packSize) || 0;
  const packUnit = (opts.packUnit || 'kg').toLowerCase();

  /** Grams or millilitres in one bag, packet or bottle. */
  const packInGram = packQty > 0 && WEIGHT_IN_GRAM[packUnit]
    ? packQty * WEIGHT_IN_GRAM[packUnit] : 0;
  const packInMl = packQty > 0 && VOLUME_IN_ML[packUnit]
    ? packQty * VOLUME_IN_ML[packUnit] : 0;

  const PACKED = ['bag', 'packet', 'bottle', 'bundle', 'pcs', 'custom'];

  /* Both weight units. */
  if (WEIGHT_IN_GRAM[fromKey] && WEIGHT_IN_GRAM[baseKey]) {
    return WEIGHT_IN_GRAM[fromKey] / WEIGHT_IN_GRAM[baseKey];
  }
  /* Both volume units. */
  if (VOLUME_IN_ML[fromKey] && VOLUME_IN_ML[baseKey]) {
    return VOLUME_IN_ML[fromKey] / VOLUME_IN_ML[baseKey];
  }

  /* Pack to loose unit: 1 bag = 50 kg. */
  if (PACKED.includes(fromKey) && WEIGHT_IN_GRAM[baseKey]) {
    return packInGram > 0 ? packInGram / WEIGHT_IN_GRAM[baseKey] : 1;
  }
  if (PACKED.includes(fromKey) && VOLUME_IN_ML[baseKey]) {
    return packInMl > 0 ? packInMl / VOLUME_IN_ML[baseKey] : 1;
  }

  /* Loose unit to pack: 50 kg sold takes 1 bag from stock. */
  if (WEIGHT_IN_GRAM[fromKey] && PACKED.includes(baseKey)) {
    return packInGram > 0 ? WEIGHT_IN_GRAM[fromKey] / packInGram : 1;
  }
  if (VOLUME_IN_ML[fromKey] && PACKED.includes(baseKey)) {
    return packInMl > 0 ? VOLUME_IN_ML[fromKey] / packInMl : 1;
  }

  /* Pack to pack (bag to packet) is set by the shop on the multi-unit page. */
  return 1;
}

/** Units that make sense next to this base unit. */
export function agriExtraUnits(baseKey: string): string[] {
  const weight = ['bag', 'kg', 'gram', 'ton'];
  const volume = ['bottle', 'litre', 'ml'];
  const family = weight.includes(baseKey) ? weight
    : volume.includes(baseKey) ? volume
    : [...weight, ...volume, 'packet', 'pcs', 'bundle'];
  const all = [...new Set([...family, 'packet', 'pcs', 'bundle'])];
  return all.filter((k) => k !== baseKey);
}

/** Government registration validity; checked before sale. */
export function certStatus(expiry?: string | null): {
  state: 'none' | 'ok' | 'soon' | 'expired';
  days: number | null;
  text: string;
} {
  if (!expiry) return { state: 'none', days: null, text: 'Registration ki date nahi bhari' };
  const t = new Date(expiry).getTime();
  if (Number.isNaN(t)) return { state: 'none', days: null, text: 'Date theek nahi' };
  const days = Math.round((t - Date.now()) / 86_400_000);
  if (days < 0) return { state: 'expired', days, text: `Registration ${Math.abs(days)} din pehle khatam — bechna ghair-qanooni hai` };
  if (days <= 60) return { state: 'soon', days, text: `Registration ${days} din me khatam — renew karwa lein` };
  return { state: 'ok', days, text: `Registration ${days} din aur chalegi` };
}

/** Crop season on the Pakistani calendar. */
export const SEASONS: Array<{ v: string; l: string; e: string; hint: string }> = [
  { v: 'KHARIF', l: 'Kharif', e: '🌧️', hint: 'Mai–Oct: chawal, kapas, makai' },
  { v: 'RABI', l: 'Rabi', e: '❄️', hint: 'Nov–Apr: gandum, chana, sarson' },
  { v: 'ZAID', l: 'Zaid', e: '☀️', hint: 'Mar–Jun: tarbooz, sabzi' },
  { v: 'ALL_SEASON', l: 'Har mausam', e: '🔄', hint: 'Saal bhar chalta hai' },
];
