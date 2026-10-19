/** Labels, query keys and small helpers shared by the meat shop pages. */

export const KEYS = {
  orders: 'weight-orders',
  animals: 'live-animals',
  slaughter: 'meat-slaughter',
  cutting: 'cutting-jobs',
  qurbani: 'meat-qurbani',
  subs: 'meat-subscriptions',
  wholesale: 'meat-wholesale',
  profiles: 'meat-profiles',
  daySheet: 'meat-day-sheet',
} as const;

/** Lists that change when money or stock moves, refreshed after a bill or payment. */
export const MONEY_KEYS = ['sales', 'dashboard', 'meat-dashboard', 'cash-register', 'khata', 'customers', 'products', 'pos-products', KEYS.daySheet];

export const ANIMALS = [
  { value: 'CHICKEN', label: 'Murgi', emoji: '🐔' },
  { value: 'MUTTON', label: 'Mutton (bakra)', emoji: '🐐' },
  { value: 'BEEF', label: 'Beef (gaye)', emoji: '🐄' },
  { value: 'GOAT', label: 'Bakri', emoji: '🐐' },
  { value: 'LAMB', label: 'Dumba', emoji: '🐏' },
  { value: 'BUFFALO', label: 'Bhains', emoji: '🐃' },
  { value: 'CAMEL', label: 'Oont', emoji: '🐫' },
  { value: 'DUCK', label: 'Batakh', emoji: '🦆' },
  { value: 'TURKEY', label: 'Turkey', emoji: '🦃' },
  { value: 'QUAIL', label: 'Bater', emoji: '🐦' },
  { value: 'FISH', label: 'Machhli', emoji: '🐟' },
  { value: 'PRAWN', label: 'Jheenga', emoji: '🦐' },
  { value: 'OTHER', label: 'Doosra', emoji: '🥩' },
] as const;

export const animalOf = (v?: string | null) => ANIMALS.find((a) => a.value === v) ?? { value: v ?? '', label: v || '—', emoji: '🥩' };

export const CUTS = [
  { value: 'WHOLE_ANIMAL', label: 'Poora (carcass)' }, { value: 'HALF_ANIMAL', label: 'Aadha' }, { value: 'QUARTER', label: 'Chautha' },
  { value: 'BONELESS', label: 'Boneless' }, { value: 'WITH_BONE', label: 'Haddi wala' }, { value: 'MINCE', label: 'Qeema' },
  { value: 'CHOPS', label: 'Chaanp' }, { value: 'RIBS', label: 'Pasli' }, { value: 'LEG', label: 'Raan' }, { value: 'UNDERCUT', label: 'Undercut' },
  { value: 'BREAST', label: 'Seena' }, { value: 'THIGH', label: 'Ran (thigh)' }, { value: 'WING', label: 'Wings' }, { value: 'DRUMSTICK', label: 'Drumstick' },
  { value: 'LIVER', label: 'Kaleji' }, { value: 'KIDNEY', label: 'Gurde' }, { value: 'HEART', label: 'Dil' }, { value: 'BRAIN', label: 'Maghaz' },
  { value: 'TONGUE', label: 'Zabaan' }, { value: 'TROTTERS', label: 'Paaye' }, { value: 'HEAD', label: 'Siri' }, { value: 'OFFAL', label: 'Ojhri / andar ka' },
  { value: 'BONES', label: 'Haddiyan' }, { value: 'FAT', label: 'Charbi' }, { value: 'SKIN', label: 'Khaal' }, { value: 'RETAIL_CUT', label: 'Mix gosht' },
  { value: 'PRIMAL_CUT', label: 'Bara tukra' }, { value: 'TAIL', label: 'Dum' }, { value: 'OTHER', label: 'Doosra' },
] as const;

export const cutLabel = (v?: string | null) => CUTS.find((c) => c.value === v)?.label ?? (v || '');

export const PAY_METHODS = [
  { id: 'CASH', label: 'Cash' }, { id: 'CARD', label: 'Card' }, { id: 'JAZZCASH', label: 'JazzCash' },
  { id: 'EASYPAISA', label: 'EasyPaisa' }, { id: 'BANK_TRANSFER', label: 'Bank' },
] as const;
export type PayMethod = (typeof PAY_METHODS)[number]['id'];

/** Weight with up to 3 decimals and the kg unit. */
export function kg(v: number | null | undefined, unit = 'kg') {
  const n = Math.round((Number(v) || 0) * 1000) / 1000;
  return `${n.toLocaleString('en-PK', { maximumFractionDigits: 3 })} ${unit}`;
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(Number(v) * 10) / 10}%`);

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Date and time on the shop's clock, short. */
export function dateTime(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function dateOnly(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `yyyy-mm-dd` of today on the device clock (shops run on local time). */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
