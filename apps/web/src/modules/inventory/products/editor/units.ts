/** Unit tiles offered by the shared editor. */

import { t } from '@core/i18n';

/**
 * Common units every industry can fall back to (pieces, weight, volume,
 * packs). The editor shows an industry's own units first and adds the ones
 * it lacks from this list; see `unitChoices` in @nafaa/core/inventory.
 */
export const COMMON_UNITS = [
  { value: 'pcs', label: t('Adad (pcs)') }, { value: 'kg', label: t('Kilo') }, { value: 'gram', label: t('Gram') },
  { value: 'liter', label: t('Litre') }, { value: 'ml', label: t('ML') }, { value: 'packet', label: t('Packet') },
  { value: 'bottle', label: t('Botal') }, { value: 'dozen', label: t('Darjan') }, { value: 'box', label: t('Dabba') },
  { value: 'carton', label: t('Carton') },
];
export const RETAIL_UNITS = [
  { value: 'pcs', label: t('Adad (pcs)') }, { value: 'kg', label: t('Kilo') }, { value: 'gram', label: t('Gram') },
  { value: 'liter', label: t('Litre') }, { value: 'ml', label: t('ML') }, { value: 'packet', label: t('Packet') },
  { value: 'bottle', label: t('Botal') }, { value: 'dozen', label: t('Darjan') }, { value: 'box', label: t('Dabba') },
  { value: 'carton', label: t('Carton') }, { value: 'bag', label: t('Bori') }, { value: 'meter', label: t('Meter') },
];

export const VARIANT_PRESETS = [
  { group: t('Size'), values: [t('Chhota'), t('Darmiyana'), t('Bara'), 'XL'] },
  { group: t('Rang'), values: [t('Kaala'), t('Safed'), t('Laal'), t('Neela'), t('Hara')] },
  { group: t('Flavour'), values: [t('Sada'), t('Chocolate'), t('Strawberry'), t('Mango')] },
];
