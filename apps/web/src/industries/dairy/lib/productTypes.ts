/** Dairy item kinds and their labels; milk kinds feed deliveries and collections. */

import type { DairyProductType } from '../api/products.api';

export const PRODUCT_TYPES: Array<{ value: DairyProductType; label: string; milk?: boolean }> = [
  { value: 'FRESH_MILK', label: 'Doodh', milk: true },
  { value: 'BUFFALO_MILK', label: 'Bhains ka doodh', milk: true },
  { value: 'COW_MILK', label: 'Gaye ka doodh', milk: true },
  { value: 'MIXED_MILK', label: 'Mix doodh', milk: true },
  { value: 'BOILED_MILK', label: 'Garam doodh', milk: true },
  { value: 'RAW_MILK', label: 'Kacha doodh', milk: true },
  { value: 'GOAT_MILK', label: 'Bakri ka doodh' },
  { value: 'DAHI', label: 'Dahi' },
  { value: 'YOGURT', label: 'Yogurt' },
  { value: 'LASSI', label: 'Lassi' },
  { value: 'BUTTER_MILK', label: 'Chhaach' },
  { value: 'MAKHAN', label: 'Makhan' },
  { value: 'BUTTER', label: 'Butter' },
  { value: 'DESI_GHEE', label: 'Desi ghee' },
  { value: 'CREAM', label: 'Cream' },
  { value: 'MALAI', label: 'Malai' },
  { value: 'KHOA', label: 'Khoya' },
  { value: 'PANEER', label: 'Paneer' },
  { value: 'KHEER', label: 'Kheer' },
  { value: 'RABRI', label: 'Rabri' },
  { value: 'KULFI', label: 'Kulfi' },
  { value: 'ICE_CREAM', label: 'Ice cream' },
  { value: 'SWEETS', label: 'Mithai' },
  { value: 'OTHER', label: 'Kuch aur' },
];

const BY = new Map(PRODUCT_TYPES.map((t) => [t.value, t]));
export const typeLabel = (t?: string | null) => (t ? BY.get(t as DairyProductType)?.label ?? t : '');
export const isMilkType = (t?: string | null) => !!(t && BY.get(t as DairyProductType)?.milk);

/** Profile unit enum from the product's base unit. */
export const profileUnit = (unit: string) => {
  const u = unit.toLowerCase();
  if (u === 'kg') return 'KG' as const;
  if (u === 'gram' || u === 'g') return 'GRAM' as const;
  if (u === 'piece' || u === 'pcs') return 'PIECE' as const;
  if (u === 'cup') return 'CUP' as const;
  if (u === 'plate') return 'PLATE' as const;
  if (u === 'bottle') return 'BOTTLE' as const;
  if (u === 'packet') return 'PACKET' as const;
  return 'LITER' as const;
};
