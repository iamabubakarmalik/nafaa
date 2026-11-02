/** Dairy item kinds and their labels; milk kinds feed deliveries and collections. */

import type { DairyProductType } from '../api/products.api';
import { t as tr } from '@core/i18n';

export const PRODUCT_TYPES: Array<{ value: DairyProductType; label: string; milk?: boolean }> = [
  { value: 'FRESH_MILK', label: tr('Doodh'), milk: true },
  { value: 'BUFFALO_MILK', label: tr('Bhains ka doodh'), milk: true },
  { value: 'COW_MILK', label: tr('Gaye ka doodh'), milk: true },
  { value: 'MIXED_MILK', label: tr('Mix doodh'), milk: true },
  { value: 'BOILED_MILK', label: tr('Garam doodh'), milk: true },
  { value: 'RAW_MILK', label: tr('Kacha doodh'), milk: true },
  { value: 'GOAT_MILK', label: tr('Bakri ka doodh') },
  { value: 'DAHI', label: tr('Dahi') },
  { value: 'YOGURT', label: tr('Yogurt') },
  { value: 'LASSI', label: tr('Lassi') },
  { value: 'BUTTER_MILK', label: tr('Chhaach') },
  { value: 'MAKHAN', label: tr('Makhan') },
  { value: 'BUTTER', label: tr('Butter') },
  { value: 'DESI_GHEE', label: tr('Desi ghee') },
  { value: 'CREAM', label: tr('Cream') },
  { value: 'MALAI', label: tr('Malai') },
  { value: 'KHOA', label: tr('Khoya') },
  { value: 'PANEER', label: tr('Paneer') },
  { value: 'KHEER', label: tr('Kheer') },
  { value: 'RABRI', label: tr('Rabri') },
  { value: 'KULFI', label: tr('Kulfi') },
  { value: 'ICE_CREAM', label: tr('Ice cream') },
  { value: 'SWEETS', label: tr('Mithai') },
  { value: 'OTHER', label: tr('Kuch aur') },
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
