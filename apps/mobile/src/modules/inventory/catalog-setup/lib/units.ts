/** Pack type labels and quick pack presets that follow the product's base unit and the shop's industry (same as the web). */

import { msg } from '@/core/i18n';
import type { PackType } from '../api/units';

export const TYPE_LABEL: Record<PackType, string> = {
  BASE: msg('Asal unit'), PACK: msg('Pack'), BOX: msg('Box'), DOZEN: msg('Dozen'), CARTON: msg('Carton'), KG_TO_GRAM: msg('Wazan'), L_TO_ML: msg('Liquid'), CUSTOM: msg('Apna'),
};
export const TYPE_ORDER: PackType[] = ['PACK', 'DOZEN', 'BOX', 'CARTON', 'KG_TO_GRAM', 'L_TO_ML', 'CUSTOM'];

export interface Preset { name: string; rate: number; type: PackType }

const WEIGHT = /^(kg|kgs|kilo|kilogram)$/i;
const GRAM = /^(g|gm|gram|grams)$/i;
const LIQUID = /^(l|ltr|litre|liter|litres)$/i;
const LENGTH = /^(m|meter|metre|ft|feet|gaz|yard)$/i;

const PIECES: Record<string, Preset[]> = {
  pharmacy: [{ name: 'Patta (strip)', rate: 10, type: 'PACK' }, { name: 'Dabba', rate: 100, type: 'BOX' }, { name: 'Carton', rate: 1000, type: 'CARTON' }],
  bookstore: [{ name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Packet', rate: 10, type: 'PACK' }, { name: 'Ream', rate: 500, type: 'BOX' }, { name: 'Carton', rate: 100, type: 'CARTON' }],
  hardware: [{ name: 'Packet', rate: 50, type: 'PACK' }, { name: 'Dabba', rate: 100, type: 'BOX' }, { name: 'Bundle', rate: 10, type: 'CUSTOM' }, { name: 'Carton', rate: 500, type: 'CARTON' }],
  autoparts: [{ name: 'Set', rate: 4, type: 'PACK' }, { name: 'Dabba', rate: 10, type: 'BOX' }, { name: 'Carton', rate: 50, type: 'CARTON' }],
  garments: [{ name: 'Set (3)', rate: 3, type: 'PACK' }, { name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Gattha', rate: 50, type: 'CUSTOM' }],
  shoe: [{ name: 'Joda dozen', rate: 12, type: 'DOZEN' }, { name: 'Carton', rate: 24, type: 'CARTON' }],
  cosmetics: [{ name: 'Half dozen', rate: 6, type: 'PACK' }, { name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Carton', rate: 72, type: 'CARTON' }],
  bakery: [{ name: 'Half dozen', rate: 6, type: 'PACK' }, { name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Tray', rate: 24, type: 'BOX' }],
  restaurant: [{ name: 'Half dozen', rate: 6, type: 'PACK' }, { name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Crate', rate: 24, type: 'CARTON' }],
  dairy: [{ name: 'Pack (6)', rate: 6, type: 'PACK' }, { name: 'Crate', rate: 24, type: 'CARTON' }],
};

const DEFAULT_PIECES: Preset[] = [
  { name: 'Half dozen', rate: 6, type: 'PACK' }, { name: 'Dozen', rate: 12, type: 'DOZEN' }, { name: 'Pack', rate: 10, type: 'PACK' },
  { name: 'Box', rate: 24, type: 'BOX' }, { name: 'Carton', rate: 48, type: 'CARTON' },
];

/** Packs that make sense for a product sold in `baseUnit` (names are saved as typed, like the web). */
export function presetsFor(baseUnit: string, industryId?: string | null): Preset[] {
  const u = baseUnit.trim();
  if (WEIGHT.test(u)) {
    const big: Preset[] = industryId === 'agri'
      ? [{ name: 'Bori (50 kg)', rate: 50, type: 'CUSTOM' }, { name: 'Thaila (25 kg)', rate: 25, type: 'CUSTOM' }]
      : [{ name: '5 kg', rate: 5, type: 'PACK' }, { name: 'Bori (40 kg)', rate: 40, type: 'CUSTOM' }];
    return [{ name: 'Pao', rate: 0.25, type: 'KG_TO_GRAM' }, { name: 'Aadha kg', rate: 0.5, type: 'KG_TO_GRAM' }, ...big];
  }
  if (GRAM.test(u)) return [{ name: '100 gram', rate: 100, type: 'KG_TO_GRAM' }, { name: '250 gram', rate: 250, type: 'KG_TO_GRAM' }, { name: 'Kg', rate: 1000, type: 'KG_TO_GRAM' }];
  if (LIQUID.test(u)) return [{ name: 'Aadha litre', rate: 0.5, type: 'L_TO_ML' }, { name: 'Gallon (5 L)', rate: 5, type: 'L_TO_ML' }, { name: 'Drum (20 L)', rate: 20, type: 'L_TO_ML' }];
  if (LENGTH.test(u)) return [{ name: 'Roll (10)', rate: 10, type: 'CUSTOM' }, { name: 'Roll (50)', rate: 50, type: 'CUSTOM' }, { name: 'Bundle (100)', rate: 100, type: 'CUSTOM' }];
  return (industryId && PIECES[industryId]) || DEFAULT_PIECES;
}

/** Pack price from the loose price: rate × price less a percent, rounded to `step`. */
export function roundedPackPrice(base: number, rate: number, offPercent = 0, step = 1) {
  const raw = base * rate * (1 - offPercent / 100);
  return raw > 0 ? Math.max(step, Math.round(raw / step) * step) : 0;
}
