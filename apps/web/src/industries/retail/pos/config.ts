/**
 * Retail POS: full catalog offline, multi-unit packs, weights, combos and
 * quick keys. Labels printed by a weighing scale (EAN-13 starting with 2:
 * "2" + one flag digit + 5-digit item code + 5-digit grams + check digit)
 * put the weighed item on the bill with its weight.
 */

import { toast } from 'sonner';
import { useComboBundles, useProductCatalog, type PosEngineApi, type PosIndustryConfig } from '@modules/pos/engine';
import { t } from '@core/i18n';

const SCALE_LABEL = /^2\d{12}$/;
const WEIGHT_UNITS: Record<string, number> = { kg: 1000, kilogram: 1000, gram: 1, g: 1, gm: 1 };

/** Reads a scale label; the item code may be saved with or without its leading zeros. */
async function scaleLabel(code: string, api: PosEngineApi) {
  if (!SCALE_LABEL.test(code) || api.findItemByCode(code)) return false;
  const plu = code.slice(2, 7);
  const item = api.findItemByCode(plu) ?? api.findItemByCode(String(Number(plu))) ?? api.findItemByCode(code.slice(0, 7));
  const perGram = item ? WEIGHT_UNITS[(item.unit || '').toLowerCase()] : undefined;
  if (!item || !perGram) return false;
  const grams = Number(code.slice(7, 12));
  if (!(grams > 0)) { toast.error(t('Tarazu ke label par wazan 0 hai')); return true; }
  api.addItem(item, { qty: Number((grams / perGram).toFixed(3)) });
  return true;
}

export const retailPos: PosIndustryConfig = {
  id: 'retail',
  label: t('Retail'),
  useCatalog: () => useProductCatalog(),
  useBundles: useComboBundles,
  quickKeys: true,
  scan: scaleLabel,
  searchHint: t('Naam, barcode ya tarazu ka label scan karein'),
};
